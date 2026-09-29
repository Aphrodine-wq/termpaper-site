// The gallery API as Web-standard handlers (Vercel Functions: routes/
// re-exports them, scripts/build.mjs bundles each route into api/).
//
//   GET    /api/themes?q=&tag=&sort=new|popular&offset=   list
//   POST   /api/themes            {"theme": {...}}         publish → {id, token, url}
//   GET    /api/themes/:id        [?format=toml]           one theme (built-in slugs too)
//   DELETE /api/themes/:id        Bearer <edit token>      delete
//   POST   /api/themes/:id/install|like|report             count, once per address
//   /api/admin/migrate (POST), reported (GET), hide|restore (POST ?id=)   Bearer ADMIN_TOKEN

import { createHash, timingSafeEqual } from "node:crypto";
import { slugify, themeFrom, toToml } from "../web/theme.js";
import { db, HttpError } from "./db.js";
import * as svc from "./service.js";

type Handler = (req: Request) => Promise<Response>;

const BASE_HEADERS = { "x-content-type-options": "nosniff" };
const LIST_CACHE = { "cache-control": "public, max-age=0, s-maxage=15, stale-while-revalidate=60", "access-control-allow-origin": "*" };
const ITEM_CACHE = { "cache-control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300", "access-control-allow-origin": "*" };
const NO_STORE = { "cache-control": "no-store" };

export function json(body: unknown, status = 200, headers: Record<string, string> = NO_STORE): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", ...BASE_HEADERS, ...headers } });
}

function wrap(fn: Handler): Handler {
  return async (req) => {
    try {
      return await fn(req);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      console.error(e);
      return json({ error: "something went wrong on the gallery's side" }, 500);
    }
  };
}

/** The caller's address, as Vercel's edge reports it. */
export function clientIp(req: Request): string {
  const h = req.headers;
  const raw = h.get("x-vercel-forwarded-for") ?? h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "unknown";
  return raw.split(",")[0]!.trim() || "unknown";
}

const ID = /^[A-Za-z0-9-]{1,64}$/;

/** Path segments after /api/ (Vercel also passes dynamic ones as query
 *  parameters, used when the path does not have them). */
function segment(req: Request, index: number, param: string): string {
  const u = new URL(req.url);
  const parts = u.pathname.split("/").filter(Boolean);
  let v = parts[index] ?? u.searchParams.get(param) ?? "";
  try {
    v = decodeURIComponent(v);
  } catch {
    v = "";
  }
  return v;
}

function themeId(req: Request): string {
  const id = segment(req, 2, "id");
  if (!ID.test(id)) throw new HttpError(404, "no such theme");
  return id;
}

export function bearer(req: Request): string | undefined {
  const m = /^Bearer\s+(\S+)\s*$/i.exec(req.headers.get("authorization") ?? "");
  return m?.[1];
}

export function isAdmin(req: Request): boolean {
  const want = process.env.ADMIN_TOKEN;
  const got = bearer(req);
  if (!want || want.length < 16 || !got) return false;
  return timingSafeEqual(createHash("sha256").update(want).digest(), createHash("sha256").update(got).digest());
}

async function jsonBody(req: Request, limit = 16 * 1024): Promise<unknown> {
  const text = await req.text();
  if (text.length > limit) throw new HttpError(413, "that is too big to be a theme");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'send the theme as JSON: {"theme": {...}}');
  }
}

export const listThemes = wrap(async (req) => {
  const q = new URL(req.url).searchParams;
  const r = await svc.listThemes(await db(), {
    q: q.get("q") ?? undefined,
    tag: q.get("tag") ?? undefined,
    sort: q.get("sort") ?? undefined,
    offset: Number(q.get("offset") ?? 0),
  });
  return json(r, 200, LIST_CACHE);
});

export const publishTheme = wrap(async (req) => {
  const r = await svc.publishTheme(await db(), await jsonBody(req), svc.hashIp(clientIp(req)));
  return json(r, 201);
});

export const getTheme = wrap(async (req) => {
  const id = themeId(req);
  const row = svc.builtin(id) ?? (await svc.getTheme(await db(), id));
  if (!row) throw new HttpError(404, "no such theme");
  if (new URL(req.url).searchParams.get("format") === "toml") {
    const t = themeFrom(row.theme);
    return new Response(toToml(t), {
      headers: {
        "content-type": "application/toml; charset=utf-8",
        "content-disposition": `inline; filename="${slugify(t.name)}.toml"`,
        ...BASE_HEADERS,
        ...ITEM_CACHE,
      },
    });
  }
  return json(row, 200, ITEM_CACHE);
});

export const deleteTheme = wrap(async (req) => {
  const id = themeId(req);
  if (svc.builtin(id)) throw new HttpError(403, "built-in themes come with termpaper and cannot be deleted");
  await svc.removeTheme(await db(), id, bearer(req), isAdmin(req));
  return json({ deleted: id });
});

export const recordEvent = wrap(async (req) => {
  const id = themeId(req);
  const action = segment(req, 3, "action") as svc.Kind;
  if (!svc.KINDS.includes(action)) throw new HttpError(404, "no such action (install, like or report)");
  if (svc.builtin(id)) return json({ counted: false });
  return json(await svc.record(await db(), id, action, svc.hashIp(clientIp(req))));
});

export const admin = wrap(async (req) => {
  if (!isAdmin(req)) throw new HttpError(401, "admin only");
  const task = segment(req, 2, "task");
  const d = await db();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  switch (`${req.method} ${task}`) {
    case "POST migrate":
      return json({ statements: await svc.migrate(d) });
    case "GET reported":
      return json({ themes: await svc.reported(d) });
    case "POST hide":
    case "POST restore":
      if (!ID.test(id)) throw new HttpError(400, "which theme? (?id=)");
      await svc.setHidden(d, id, task === "hide");
      return json({ [task === "hide" ? "hidden" : "restored"]: id });
    default:
      throw new HttpError(404, "admin tasks: POST migrate, GET reported, POST hide?id=, POST restore?id=");
  }
});
