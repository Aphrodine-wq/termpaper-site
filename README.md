# termpaper-site

The website for [Aphrodine's terminal tools](https://github.com/Aphrodine-wq) —
a hub for **termpaper**, **tui-launcher** and **steam-tui**, and the home of
**termpaper themes**: a gallery anyone can publish to, and a studio for
making a theme in the browser.

The pages are rendered by a small **Rust** static site generator (typed HTML
via [maud](https://maud.lambda.xyz)). The themes pages and the gallery API
are **TypeScript**: the browser scripts in `web/`, the API in `lib/` on
Vercel Functions with Neon Postgres.

No gradients. Phosphor Icons. Dark noir palette with a single silver accent.

## Pages

- `/` — full-viewport desktop: five scattered live windows (koi, orbits,
  boids, starfield, fireworks) around the tagline, the settings-menu panel,
  and the toolbox: cards for all three tools
- `/launcher/` — tui-launcher tour: authentic frames captured from the real
  binary running headless (carousel, mid-flick glide, settings deck)
- `/about/` — termpaper: minimal headline + live orbits window
- `/install/` — termpaper: macOS, Linux and Windows install lines
- `/scenes/` — termpaper: every scene by category, from `assets/catalog.json`
- `/themes/` — the theme gallery: termpaper's own themes and everyone's,
  each previewed live on a real scene; search, tags, install, like, report
- `/themes/studio/` — make a theme: every look control, palettes (import a
  kitty, Ghostty, Alacritty, iTerm2 or Windows Terminal scheme), effects
  with strengths; copy a share code, download the `.toml`, or publish
- `/t/<id>` — one theme's page

## How the previews stay honest

The live windows are the real engine: `tools/frames` links termpaper as a
path dependency and dumps frames from the genuine scene code. Scene sprites
(`assets/sprites/*.png`) are grayscale strips animated with pure CSS; theme
previews (`assets/frames/*.png`, 24 colour frames of 96×54) are run through
a theme's look in the browser by `web/theme.ts`, a port of termpaper's
`look.rs` that is checked against golden vectors termpaper writes
(`cargo run --example theme_vectors` in termpaper): every colour within one
step.

## Develop

```sh
npm install
cargo run --release     # render the pages into dist/
npm run dev             # http://localhost:5173, the API on an in-memory Postgres
npm test                # theme port, scheme import, and the API against PGlite
npm run typecheck
```

`npm run dev` uses your `DATABASE_URL` instead when it is set.

## Data from termpaper (after changing its scenes or themes)

```sh
termpaper list --json > assets/catalog.json
termpaper theme list --json > assets/themes/builtin.json
cargo run --release --manifest-path tools/frames/Cargo.toml             # scene sprites
cargo run --release --manifest-path tools/frames/Cargo.toml -- previews # theme preview frames
cargo run --release && npm run build
```

## Deploy

Vercel serves `dist/` and runs `api/` as functions. Both are **committed**:
`cargo run --release` renders the pages and `npm run build` bundles the
scripts (`web/` → `dist/js`, `routes/` + `lib/` → `api/`), so a deploy needs
neither Rust nor anything but copying assets (`npm run build`, which Vercel
runs). CI fails when the committed output is not what the source builds.

Environment: `DATABASE_URL` (Neon; the Vercel integration sets it),
`ADMIN_TOKEN` (16+ characters) and `IP_SALT`. After connecting a new
database, create the tables once:

```sh
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" https://<site>/api/admin/migrate
```

## The gallery API

```
GET    /api/themes?q=&tag=&sort=new|popular&offset=   list, 24 at a time
POST   /api/themes            {"theme": {...}}         publish → {id, token, url}
GET    /api/themes/:id        [?format=toml]           one theme (built-in slugs too)
DELETE /api/themes/:id        Bearer <edit token>      delete your theme
POST   /api/themes/:id/install|like|report             counted once per address
GET    /api/admin/reported ; POST /api/admin/hide|restore?id= ; POST /api/admin/migrate
```

Themes are checked on the server with the same code the studio uses
(`web/theme.ts`), text goes through a profanity filter, and pages render
what people wrote as text only. Addresses are never stored: installs, likes
and reports are counted per salted hash, five publishes an hour per
address, and three reports hide a theme until an admin looks
(`/api/admin/reported`).

## Layout

```
src/main.rs            entry: renders all pages into dist/
src/layout.rs          head, nav, footer, desktop shell, live windows
src/pages/             home, launcher, about, install, scenes, themes
src/data.rs            tool catalog, scene catalog, effects, install commands
web/                   browser TypeScript: theme format and look (theme.ts),
                       share codes, colour schemes, previews, the three pages
lib/                   the gallery API: service (rules), http (handlers), db
routes/                one file per API route (bundled into api/)
test/                  vitest: theme port vs golden vectors, schemes, API
tools/frames/          frame capture from the termpaper engine
assets/                style, sprites, preview frames, catalog, built-in themes
dist/                  the deployable static site (pages and scripts committed)
api/                   the bundled functions (generated, committed)
```
