// Bundles the site's TypeScript: the pages' scripts (web/ → dist/js) and
// the API (routes/ → api/, one Vercel Function per file; npm packages stay
// imports, Vercel installs them). Both are committed, so a deploy serves
// exactly what was tested; CI checks they match a fresh build. Also copies
// the static assets into dist/ (as `cargo run` does), which is all a
// Vercel build has to do.

import { build } from "esbuild";
import { copyFileSync, cpSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, relative } from "node:path";

mkdirSync("dist/themes", { recursive: true });
for (const [from, to] of [
  ["assets/style.css", "dist/style.css"],
  ["assets/themes.css", "dist/themes.css"],
  ["assets/catalog.json", "dist/catalog.json"],
  ["assets/themes/builtin.json", "dist/themes/builtin.json"],
]) copyFileSync(from, to);
cpSync("assets/sprites", "dist/sprites", { recursive: true });
cpSync("assets/frames", "dist/frames", { recursive: true });

const pages = ["gallery", "studio", "view"];

await build({
  entryPoints: pages.map((p) => `web/${p}.ts`),
  outdir: "dist/js",
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  legalComments: "none",
  logLevel: "warning",
});

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".ts") ? [p] : [];
  });
}

const routes = walk("routes").sort();
rmSync("api", { recursive: true, force: true });
await build({
  entryPoints: routes.map((r) => ({ in: r, out: relative("routes", r).replace(/\.ts$/, "") })),
  outdir: "api",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  packages: "external",
  banner: { js: "// Built by scripts/build.mjs from routes/ and lib/; edit those, not this." },
  logLevel: "warning",
});

console.log(`built dist/js (${pages.join(", ")}) and api/ (${routes.length} functions)`);
