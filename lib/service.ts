// The gallery: list, fetch, publish, count and moderate themes. Nothing
// here knows about HTTP; lib/http.ts puts it on the web.
//
// People are counted by a salted hash of their address (IP_SALT), never
// the address itself: one install, like and report each per theme, and at
// most PUBLISH_LIMIT publishes an hour. HIDE_AT reports hide a theme until
// an admin looks.

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { englishDataset, englishRecommendedTransformers, RegExpMatcher } from "obscenity";
import catalog from "../assets/catalog.json" with { type: "json" };
import builtinList from "../assets/themes/builtin.json" with { type: "json" };
import { themeFrom, toCode, toPlain, validate, type Theme } from "../web/theme.js";
import { nodeCodec } from "./codec.js";
import { HttpError, type Db } from "./db.js";
import { SCHEMA } from "./schema.js";

export const PAGE = 24;
export const PUBLISH_LIMIT = 5;
export const HIDE_AT = 3;

/** A theme as the API returns it. */
export interface Row {
  id: string;
  name: string;
  author: string;
  description: string;
  tags: string[];
  code: string;
  theme: Record<string, unknown>;
  installs: number;
  likes: number;
  created_at?: string | Date;
  builtin?: boolean;
}

const COLUMNS = "id, name, author, description, tags, code, theme, installs, likes, created_at";

/** Every scene termpaper has and its variants, for checking scene hints. */
const scenes = new Map(catalog.scenes.map((s) => [s.name, s.variants]));

interface Builtin {
  slug: string;
  code: string;
  theme: Record<string, unknown>;
}

const builtins: Row[] = (builtinList as unknown as Builtin[]).map((b) => ({
  id: b.slug,
  name: String(b.theme.name ?? b.slug),
  author: String(b.theme.author ?? "termpaper"),
  description: String(b.theme.description ?? ""),
  tags: (b.theme.tags as string[] | undefined) ?? [],
  code: b.code,
  theme: b.theme,
  installs: 0,
  likes: 0,
  builtin: true,
}));

/** One of termpaper's own themes, by slug. */
export const builtin = (id: string): Row | undefined => builtins.find((b) => b.id === id);

const matcher = new RegExpMatcher({ ...englishDataset.build(), ...englishRecommendedTransformers });

/** Words the gallery does not take (whole words, common disguises too). */
export const rude = (text: string): boolean => matcher.hasMatch(text);

export const hashIp = (ip: string): string =>
  createHash("sha256").update(`${process.env.IP_SALT ?? ""}:${ip}`).digest("hex").slice(0, 32);

const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** Eight random base62 characters. */
function newId(): string {
  let s = "";
  while (s.length < 8) {
    for (const b of randomBytes(12)) {
      if (b < 248 && s.length < 8) s += ALPHABET[b % 62];
    }
  }
  return s;
}

// ------------------------------------------------------------------ reading

export interface ListQuery {
  q?: string;
  tag?: string;
  sort?: string;
  offset?: number;
}

/** Themes people shared, newest or most installed first, PAGE at a time;
 *  every word of `q` must appear in the name, description, author or tags. */
export async function listThemes(db: Db, q: ListQuery): Promise<{ themes: Row[]; next?: number }> {
  const where = ["not hidden"];
  const params: unknown[] = [];
  const words = (q.q ?? "").toLowerCase().split(/\s+/).filter(Boolean).slice(0, 8);
  for (const w of words) {
    params.push(`%${w.slice(0, 40).replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    where.push(`(name || ' ' || description || ' ' || author || ' ' || array_to_string(tags, ' ')) ilike $${params.length}`);
  }
  if (q.tag) {
    params.push(q.tag.toLowerCase().slice(0, 20));
    where.push(`$${params.length} = any(tags)`);
  }
  const order = q.sort === "popular" ? "installs desc, likes desc, created_at desc" : "created_at desc";
  const offset = Math.max(0, Math.min(10_000, Math.floor(q.offset ?? 0) || 0));
  params.push(PAGE + 1, offset);
  const rows = await db.query<Row>(
    `select ${COLUMNS} from themes where ${where.join(" and ")} order by ${order}, id limit $${params.length - 1} offset $${params.length}`,
    params,
  );
  return rows.length > PAGE ? { themes: rows.slice(0, PAGE), next: offset + PAGE } : { themes: rows };
}

/** A shared theme, unless it is hidden. */
export async function getTheme(db: Db, id: string): Promise<Row | undefined> {
  const rows = await db.query<Row>(`select ${COLUMNS} from themes where id = $1 and not hidden`, [id]);
  return rows[0];
}

// ------------------------------------------------------------------ publishing

/** Check a theme and share it. `body` is `{theme: {...}}` (or the theme
 *  itself) in termpaper's format. */
export async function publishTheme(db: Db, body: unknown, ipHash: string): Promise<{ id: string; token: string; url: string; warnings: string[] }> {
  const raw = body && typeof body === "object" && "theme" in body ? (body as { theme: unknown }).theme : body;
  let t: Theme;
  let warnings: string[];
  try {
    t = themeFrom(raw);
    warnings = validate(t, scenes);
  } catch (e) {
    throw new HttpError(400, `not a theme termpaper can use: ${(e as Error).message}`);
  }
  if (/^untitled$/i.test(t.name)) throw new HttpError(400, "give the theme a name");
  if (rude([t.name, t.author, t.description, ...t.tags].join("\n"))) {
    throw new HttpError(400, "the gallery does not take some of the words in the name, author, description or tags");
  }
  const [recent] = await db.query<{ n: number }>(
    "select count(*)::int as n from publishes where ip_hash = $1 and created_at > now() - interval '1 hour'",
    [ipHash],
  );
  if ((recent?.n ?? 0) >= PUBLISH_LIMIT) throw new HttpError(429, `${PUBLISH_LIMIT} themes an hour is the limit; try again in a while`);
  const code = await toCode(t, nodeCodec);
  const dup = await db.query<{ id: string }>("select id from themes where code = $1", [code]);
  if (dup[0]) throw new HttpError(409, `this theme is already in the gallery: /t/${dup[0].id}`);
  const token = randomBytes(24).toString("base64url");
  let id = "";
  for (let tries = 0; !id; tries++) {
    if (tries > 5) throw new Error("no free theme id after six tries");
    const candidate = newId();
    if (builtin(candidate)) continue;
    try {
      const ins = await db.query<{ id: string }>(
        `insert into themes (id, name, author, description, tags, theme, code, token_hash, ip_hash)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9) on conflict (id) do nothing returning id`,
        [candidate, t.name, t.author, t.description, t.tags, JSON.stringify(toPlain(t)), code, hashToken(token), ipHash],
      );
      if (ins[0]) id = candidate;
    } catch (e) {
      if ((e as { code?: string }).code === "23505") throw new HttpError(409, "this theme is already in the gallery");
      throw e;
    }
  }
  await db.query("insert into publishes (ip_hash) values ($1)", [ipHash]);
  await db.query("delete from publishes where created_at < now() - interval '1 day'");
  return { id, token, url: `/t/${id}`, warnings };
}

/** Delete a shared theme: with its edit token, or as an admin. */
export async function removeTheme(db: Db, id: string, token: string | undefined, admin: boolean): Promise<void> {
  const [row] = await db.query<{ token_hash: string }>("select token_hash from themes where id = $1", [id]);
  if (!row) throw new HttpError(404, "no such theme");
  if (!admin) {
    if (!token) throw new HttpError(401, "deleting a theme needs its edit token");
    const a = Buffer.from(hashToken(token), "hex");
    const b = Buffer.from(row.token_hash, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new HttpError(403, "that is not this theme's edit token");
  }
  await db.query("delete from themes where id = $1", [id]);
}

// ------------------------------------------------------------------ counting

export type Kind = "install" | "like" | "report";
export const KINDS: Kind[] = ["install", "like", "report"];

/** Count an install, like or report, once per address. A theme reported
 *  HIDE_AT times is hidden. */
export async function record(db: Db, id: string, kind: Kind, ipHash: string): Promise<{ counted: boolean; hidden?: boolean }> {
  const [live] = await db.query("select 1 as ok from themes where id = $1 and not hidden", [id]);
  if (!live) throw new HttpError(404, "no such theme");
  const ins = await db.query(
    "insert into theme_events (theme_id, kind, ip_hash) values ($1, $2, $3) on conflict do nothing returning kind",
    [id, kind, ipHash],
  );
  if (!ins[0]) return { counted: false };
  if (kind === "report") {
    const [r] = await db.query<{ hidden: boolean }>(
      `update themes set reports = reports + 1, hidden = hidden or reports + 1 >= ${HIDE_AT} where id = $1 returning hidden`,
      [id],
    );
    return { counted: true, hidden: r?.hidden ?? false };
  }
  await db.query(`update themes set ${kind === "install" ? "installs = installs + 1" : "likes = likes + 1"} where id = $1`, [id]);
  return { counted: true };
}

// ------------------------------------------------------------------ admin

export async function migrate(db: Db): Promise<number> {
  for (const statement of SCHEMA) await db.query(statement);
  return SCHEMA.length;
}

/** Themes with reports, hidden ones first. */
export async function reported(db: Db): Promise<(Row & { reports: number; hidden: boolean })[]> {
  return db.query(`select ${COLUMNS}, reports, hidden from themes where reports > 0 order by hidden desc, reports desc, created_at desc limit 200`);
}

/** Hide a theme, or bring it back (clearing its reports). */
export async function setHidden(db: Db, id: string, hidden: boolean): Promise<void> {
  const rows = await db.query(
    hidden ? "update themes set hidden = true where id = $1 returning id" : "update themes set hidden = false, reports = 0 where id = $1 returning id",
    [id],
  );
  if (!rows[0]) throw new HttpError(404, "no such theme");
  if (!hidden) await db.query("delete from theme_events where theme_id = $1 and kind = 'report'", [id]);
}
