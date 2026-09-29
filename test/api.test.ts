// The gallery API end to end against a real Postgres (PGlite, in memory):
// the handlers exactly as Vercel runs them, with Request in, Response out.

import { PGlite } from "@electric-sql/pglite";
import { parse as parseToml } from "smol-toml";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { nodeCodec } from "../lib/codec.js";
import { useDb } from "../lib/db.js";
import * as http from "../lib/http.js";
import { HIDE_AT, PUBLISH_LIMIT } from "../lib/service.js";
import { fromCode, newTheme, themeFrom, toPlain, type Theme } from "../web/theme.js";

const ADMIN = "admin-token-for-the-tests-0123456789";
const BASE = "https://gallery.test";
let pg: PGlite;
let n = 0;

function req(method: string, path: string, opts: { body?: unknown; ip?: string; token?: string } = {}): Request {
  const headers: Record<string, string> = { "x-forwarded-for": opts.ip ?? "10.0.0.1" };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  return new Request(BASE + path, {
    method,
    headers,
    body: opts.body === undefined ? undefined : typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body),
  });
}

async function call(handler: (r: Request) => Promise<Response>, r: Request): Promise<{ status: number; body: any; res: Response }> {
  const res = await handler(r);
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* toml */
  }
  return { status: res.status, body, res };
}

/** A distinct, valid theme each call, as the studio sends it. */
function sample(over: Partial<Theme> = {}): Record<string, any> {
  n++;
  const t = newTheme();
  t.name = `Harbour Dusk ${n}`;
  t.author = "tester";
  t.description = "Teal shadows, warm lamps.";
  t.tags = ["warm", "film"];
  t.look.grade.contrast = 1.1 + n / 1000;
  t.look.grade.shadows = { hue: 190, amount: 0.5 };
  t.look.palette = { mode: "map", colors: [[10, 20, 40], [200, 120, 60], [250, 230, 200]], strength: 0.8, dither: false };
  t.look.effects = { stack: ["vignette", "grain"], amounts: { grain: 0.5 } };
  Object.assign(t, over);
  return toPlain(t);
}

async function publishOne(ip = `10.1.0.${n + 1}`, over: Partial<Theme> = {}) {
  const r = await call(http.publishTheme, req("POST", "/api/themes", { body: { theme: sample(over) }, ip }));
  expect(r.status, JSON.stringify(r.body)).toBe(201);
  return r.body as { id: string; token: string; url: string };
}

beforeAll(async () => {
  process.env.ADMIN_TOKEN = ADMIN;
  process.env.IP_SALT = "salt";
  pg = new PGlite();
  useDb({ query: async (text, params) => (await pg.query(text, params as unknown[])).rows as never[] });
  const m = await call(http.admin, req("POST", "/api/admin/migrate", { token: ADMIN }));
  expect(m.status).toBe(200);
  // twice: migrations are safe to repeat
  expect((await call(http.admin, req("POST", "/api/admin/migrate", { token: ADMIN }))).status).toBe(200);
});

afterAll(async () => {
  useDb(undefined);
  await pg.close();
});

describe("publishing", () => {
  it("publishes, and the theme comes back whole", async () => {
    const p = await publishOne();
    expect(p.id).toMatch(/^[A-Za-z0-9]{8}$/);
    expect(p.url).toBe(`/t/${p.id}`);
    expect(p.token.length).toBeGreaterThan(20);
    const g = await call(http.getTheme, req("GET", `/api/themes/${p.id}`));
    expect(g.status).toBe(200);
    expect(g.body.name).toMatch(/^Harbour Dusk/);
    expect(g.body.tags).toEqual(["warm", "film"]);
    expect(g.body.installs).toBe(0);
    expect(g.body.token_hash).toBeUndefined();
    expect(g.body.ip_hash).toBeUndefined();
    // the share code is the theme
    const decoded = await fromCode(g.body.code, nodeCodec);
    expect(decoded.theme.name).toBe(g.body.name);
    expect(decoded.theme.look.palette.colors).toEqual([[10, 20, 40], [200, 120, 60], [250, 230, 200]]);
    expect(themeFrom(g.body.theme).look.effects.amounts).toEqual({ grain: 0.5 });
  });

  it("serves a theme as a TOML file termpaper reads", async () => {
    const p = await publishOne();
    const g = await call(http.getTheme, req("GET", `/api/themes/${p.id}?format=toml`));
    expect(g.status).toBe(200);
    expect(g.res.headers.get("content-type")).toContain("application/toml");
    const t = themeFrom(parseToml(g.body as string));
    expect(t.name).toMatch(/^Harbour Dusk/);
    expect(t.look.grade.shadows).toEqual({ hue: 190, amount: 0.5 });
  });

  it("clamps what is out of range and says so", async () => {
    const t = sample();
    t.grade.saturation = 9;
    const r = await call(http.publishTheme, req("POST", "/api/themes", { body: { theme: t }, ip: "10.2.0.1" }));
    expect(r.status).toBe(201);
    expect(r.body.warnings.join(" ")).toContain("clamped");
    const g = await call(http.getTheme, req("GET", `/api/themes/${r.body.id}`));
    expect(themeFrom(g.body.theme).look.grade.saturation).toBe(2.5);
  });

  it("turns away what is not a theme", async () => {
    const cases: [unknown, number, string][] = [
      ["not json", 400, "JSON"],
      [{ theme: [1, 2] }, 400, "not a theme"],
      [{ theme: { ...sample(), name: "" } }, 400, "name"],
      [{ theme: { ...sample(), name: "Untitled" } }, 400, "name"],
      [{ theme: { ...sample(), format: 9 } }, 400, "format"],
      [{ theme: { ...sample(), palette: { mode: "map", colors: ["blue", "#fff"] } } }, 400, "colour"],
      [{ theme: { ...sample(), name: "shit theme" } }, 400, "words"],
      [{ theme: { ...sample(), description: "x".repeat(20_000) } }, 413, "big"],
    ];
    for (const [body, status, says] of cases) {
      const r = await call(http.publishTheme, req("POST", "/api/themes", { body, ip: "10.3.0.1" }));
      expect(r.status, JSON.stringify(body).slice(0, 80)).toBe(status);
      expect(r.body.error).toContain(says);
    }
  });

  it("refuses the same theme twice", async () => {
    const t = sample();
    const a = await call(http.publishTheme, req("POST", "/api/themes", { body: { theme: t }, ip: "10.4.0.1" }));
    expect(a.status).toBe(201);
    const b = await call(http.publishTheme, req("POST", "/api/themes", { body: { theme: t }, ip: "10.4.0.2" }));
    expect(b.status).toBe(409);
    expect(b.body.error).toContain(a.body.id);
  });

  it(`takes at most ${PUBLISH_LIMIT} an hour from one address`, async () => {
    for (let i = 0; i < PUBLISH_LIMIT; i++) await publishOne("10.5.0.1");
    const r = await call(http.publishTheme, req("POST", "/api/themes", { body: { theme: sample() }, ip: "10.5.0.1" }));
    expect(r.status).toBe(429);
    await publishOne("10.5.0.2");
  });
});

describe("listing", () => {
  it("lists newest first, searches every word, filters by tag, pages", async () => {
    const a = await publishOne("10.6.0.1", { name: "Glacier Morning", tags: ["cold", "blue"], description: "Ice and pale sky." });
    await publishOne("10.6.0.2", { name: "Ember Night", tags: ["warm"], description: "Coals and smoke." });
    const all = await call(http.listThemes, req("GET", "/api/themes"));
    expect(all.status).toBe(200);
    expect(all.body.themes[0].name).toBe("Ember Night");
    expect(all.res.headers.get("cache-control")).toContain("s-maxage");
    const hit = await call(http.listThemes, req("GET", "/api/themes?q=glacier+SKY"));
    expect(hit.body.themes.map((t: { id: string }) => t.id)).toEqual([a.id]);
    const none = await call(http.listThemes, req("GET", "/api/themes?q=glacier+coals"));
    expect(none.body.themes).toEqual([]);
    const tag = await call(http.listThemes, req("GET", "/api/themes?tag=cold"));
    expect(tag.body.themes.map((t: { id: string }) => t.id)).toEqual([a.id]);
    // wildcards are text, not patterns
    const pct = await call(http.listThemes, req("GET", "/api/themes?q=%25"));
    expect(pct.body.themes).toEqual([]);
    // pages of 24, with where to go next
    const first = await call(http.listThemes, req("GET", "/api/themes"));
    const total = (await pg.query<{ n: number }>("select count(*)::int as n from themes where not hidden")).rows[0]!.n;
    if (total > 24) {
      expect(first.body.next).toBe(24);
      const second = await call(http.listThemes, req("GET", "/api/themes?offset=24"));
      expect(second.body.themes.length).toBe(total - 24);
      expect(second.body.next).toBeUndefined();
    } else {
      expect(first.body.next).toBeUndefined();
    }
  });

  it("sorts by installs", async () => {
    const a = await publishOne("10.7.0.1", { name: "Popular One" });
    for (const ip of ["1.1.1.1", "1.1.1.2", "1.1.1.3"]) {
      expect((await call(http.recordEvent, req("POST", `/api/themes/${a.id}/install`, { ip }))).body.counted).toBe(true);
    }
    const top = await call(http.listThemes, req("GET", "/api/themes?sort=popular"));
    expect(top.body.themes[0].id).toBe(a.id);
    expect(top.body.themes[0].installs).toBe(3);
  });
});

describe("counting and moderation", () => {
  it("counts a like once per address", async () => {
    const a = await publishOne();
    expect((await call(http.recordEvent, req("POST", `/api/themes/${a.id}/like`, { ip: "2.2.2.2" }))).body.counted).toBe(true);
    expect((await call(http.recordEvent, req("POST", `/api/themes/${a.id}/like`, { ip: "2.2.2.2" }))).body.counted).toBe(false);
    expect((await call(http.recordEvent, req("POST", `/api/themes/${a.id}/like`, { ip: "2.2.2.3" }))).body.counted).toBe(true);
    const g = await call(http.getTheme, req("GET", `/api/themes/${a.id}`));
    expect(g.body.likes).toBe(2);
    expect((await call(http.recordEvent, req("POST", `/api/themes/${a.id}/frobnicate`))).status).toBe(404);
    expect((await call(http.recordEvent, req("POST", "/api/themes/nope1234/like"))).status).toBe(404);
  });

  it(`hides a theme after ${HIDE_AT} reports; an admin can bring it back`, async () => {
    const a = await publishOne();
    for (let i = 0; i < HIDE_AT; i++) {
      const r = await call(http.recordEvent, req("POST", `/api/themes/${a.id}/report`, { ip: `3.3.3.${i}` }));
      expect(r.body.counted).toBe(true);
      expect(r.body.hidden).toBe(i === HIDE_AT - 1);
    }
    expect((await call(http.getTheme, req("GET", `/api/themes/${a.id}`))).status).toBe(404);
    const listed = await call(http.listThemes, req("GET", "/api/themes?q=" + encodeURIComponent((await pg.query<{ name: string }>("select name from themes where id = $1", [a.id])).rows[0]!.name)));
    expect(listed.body.themes).toEqual([]);
    expect((await call(http.admin, req("GET", "/api/admin/reported"))).status).toBe(401);
    const rep = await call(http.admin, req("GET", "/api/admin/reported", { token: ADMIN }));
    expect(rep.body.themes[0].id).toBe(a.id);
    expect(rep.body.themes[0].hidden).toBe(true);
    expect((await call(http.admin, req("POST", `/api/admin/restore?id=${a.id}`, { token: ADMIN }))).status).toBe(200);
    expect((await call(http.getTheme, req("GET", `/api/themes/${a.id}`))).status).toBe(200);
    // reports start over: the same people can report again
    expect((await call(http.recordEvent, req("POST", `/api/themes/${a.id}/report`, { ip: "3.3.3.0" }))).body.counted).toBe(true);
    expect((await call(http.admin, req("POST", `/api/admin/hide?id=${a.id}`, { token: ADMIN }))).status).toBe(200);
    expect((await call(http.getTheme, req("GET", `/api/themes/${a.id}`))).status).toBe(404);
  });

  it("deletes with the edit token, or as an admin, and not otherwise", async () => {
    const a = await publishOne();
    expect((await call(http.deleteTheme, req("DELETE", `/api/themes/${a.id}`))).status).toBe(401);
    expect((await call(http.deleteTheme, req("DELETE", `/api/themes/${a.id}`, { token: "wrong" }))).status).toBe(403);
    const b = await publishOne();
    expect((await call(http.deleteTheme, req("DELETE", `/api/themes/${a.id}`, { token: b.token }))).status).toBe(403);
    expect((await call(http.deleteTheme, req("DELETE", `/api/themes/${a.id}`, { token: a.token }))).status).toBe(200);
    expect((await call(http.getTheme, req("GET", `/api/themes/${a.id}`))).status).toBe(404);
    expect((await call(http.deleteTheme, req("DELETE", `/api/themes/${b.id}`, { token: ADMIN }))).status).toBe(200);
    expect((await call(http.deleteTheme, req("DELETE", "/api/themes/tokyo-night", { token: ADMIN }))).status).toBe(403);
  });

  it("guards the admin tasks", async () => {
    expect((await call(http.admin, req("POST", "/api/admin/migrate", { token: "nope" }))).status).toBe(401);
    expect((await call(http.admin, req("POST", "/api/admin/frob", { token: ADMIN }))).status).toBe(404);
    const saved = process.env.ADMIN_TOKEN;
    process.env.ADMIN_TOKEN = "short";
    expect((await call(http.admin, req("POST", "/api/admin/migrate", { token: "short" }))).status).toBe(401);
    process.env.ADMIN_TOKEN = saved;
  });
});

describe("built-in themes", () => {
  it("serves termpaper's own themes by slug, without a database", async () => {
    useDb(undefined);
    const saved = { d: process.env.DATABASE_URL, p: process.env.POSTGRES_URL };
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_URL;
    try {
      const g = await call(http.getTheme, req("GET", "/api/themes/tokyo-night"));
      expect(g.status).toBe(200);
      expect(g.body.builtin).toBe(true);
      expect(g.body.name).toBe("Tokyo Night");
      expect((await fromCode(g.body.code, nodeCodec)).theme.name).toBe("Tokyo Night");
      const toml = await call(http.getTheme, req("GET", "/api/themes/tokyo-night?format=toml"));
      expect(themeFrom(parseToml(toml.body as string)).name).toBe("Tokyo Night");
      // everything else needs the database, and says so
      const l = await call(http.listThemes, req("GET", "/api/themes"));
      expect(l.status).toBe(503);
      expect(l.body.error).toContain("database");
      expect((await call(http.recordEvent, req("POST", "/api/themes/tokyo-night/like"))).body.counted).toBe(false);
    } finally {
      if (saved.d !== undefined) process.env.DATABASE_URL = saved.d;
      if (saved.p !== undefined) process.env.POSTGRES_URL = saved.p;
      useDb({ query: async (text, params) => (await pg.query(text, params as unknown[])).rows as never[] });
    }
  });

  it("answers 404 for ids that cannot be ids", async () => {
    for (const id of ["..%2F..%2Fetc", "a%20b", "x".repeat(65)]) {
      expect((await call(http.getTheme, req("GET", `/api/themes/${id}`))).status).toBe(404);
    }
  });
});
