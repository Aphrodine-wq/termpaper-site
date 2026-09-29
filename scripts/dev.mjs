// The whole site on your machine: dist/ as Vercel serves it, /t/<id>
// pages, and the gallery API on an in-memory Postgres (PGlite), or on your
// DATABASE_URL when it is set. Rebuilds the page scripts first.
//
//   npm run dev            http://localhost:5173
//   PORT=8080 npm run dev

import { build } from "esbuild";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { pathToFileURL } from "node:url";

await import("./build.mjs");
const bundle = "node_modules/.cache/termpaper-dev-api.mjs";
await build({ entryPoints: ["scripts/dev-api.ts"], outfile: bundle, bundle: true, platform: "node", format: "esm", packages: "external", logLevel: "warning" });
const api = await import(pathToFileURL(bundle).href);

let where = "DATABASE_URL";
if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = new PGlite();
  api.useDb({ query: async (text, params) => (await pg.query(text, params)).rows });
  await api.migrate({ query: async (text, params) => (await pg.query(text, params)).rows });
  where = "an in-memory database (gone when this stops)";
}

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webp": "image/webp",
};

function route(path, method) {
  const p = path.split("/").filter(Boolean);
  if (p[0] !== "api") return undefined;
  if (p[1] === "themes" && p.length === 2) return { GET: api.http.listThemes, POST: api.http.publishTheme }[method];
  if (p[1] === "themes" && p.length === 3) return { GET: api.http.getTheme, DELETE: api.http.deleteTheme }[method];
  if (p[1] === "themes" && p.length === 4) return { POST: api.http.recordEvent }[method];
  if (p[1] === "admin" && p.length === 3) return api.http.admin;
  return undefined;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  if (url.pathname.startsWith("/api/")) {
    const handler = route(url.pathname, req.method);
    if (!handler) {
      res.writeHead(404, { "content-type": "application/json" }).end('{"error":"no such endpoint"}');
      return;
    }
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
    headers.set("x-forwarded-for", req.socket.remoteAddress ?? "127.0.0.1");
    const r = await handler(new Request(url, { method: req.method, headers, body: chunks.length ? Buffer.concat(chunks) : undefined }));
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(Buffer.from(await r.arrayBuffer()));
    return;
  }
  let path = url.pathname.startsWith("/t/") ? "/themes/view/" : decodeURIComponent(url.pathname);
  let file = normalize(join("dist", path));
  if (!file.startsWith("dist")) {
    res.writeHead(403).end();
    return;
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) {
    res.writeHead(404, { "content-type": "text/plain" }).end("not found");
    return;
  }
  res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
  createReadStream(file).pipe(res);
});

const port = Number(process.env.PORT ?? 5173);
server.listen(port, () => console.log(`termpaper site on http://localhost:${port}/ (gallery on ${where})`));
