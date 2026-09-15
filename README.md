# termpaper-site

The website for [Aphrodine's terminal tools](https://github.com/Aphrodine-wq) —
a hub for **termpaper**, **tui-launcher** and **steam-tui**. Written in
**Rust**: a static site generator (typed HTML via
[maud](https://maud.lambda.xyz)) plus a frame dumper that captures authentic
previews straight from the termpaper source.

No gradients. Phosphor Icons. Dark noir palette with a single silver accent.

## Pages

- `/` — full-viewport desktop: five scattered live windows (koi, orbits,
  boids, starfield, fireworks) around the tagline, the settings-menu panel,
  and the toolbox: cards for all three tools
- `/launcher/` — tui-launcher tour: authentic frames captured from the real
  binary running headless (carousel, mid-flick glide, settings deck)
- `/about/` — termpaper: minimal headline + live orbits window
- `/install/` — termpaper: live fire window + plain command rows
- `/scenes/` — termpaper: 12 live windows + all 47 scenes

## The live windows are the real engine

`src/bin/dump_frames.rs` links termpaper as a path dependency, runs each
scene at Medium detail through the genuine `filter::noir`, and captures
72 frames of 96×96 pixels as a vertical grayscale PNG strip
(`assets/sprites/*.png`). The site animates the strips with **pure CSS**
(`steps(71)` over `background-position`) — zero JavaScript for the
terminals. The only JS on the site is the copy-to-clipboard helper.

## Develop

```sh
cargo run --release                 # renders dist/
python3 -m http.server 8931 -d dist # serve
```

## Regenerate sprites (after changing termpaper scenes)

```sh
cargo run --release --bin dump_frames
cargo run --release                 # re-render dist to copy them in
```

## Layout

```
src/main.rs            entry: renders all pages into dist/
src/layout.rs          head, nav, footer, desktop shell, live windows
src/pages/home.rs      hero, settings panel, tool cards
src/pages/{about,install,scenes}.rs   termpaper subpages
src/data.rs            tool catalog, 47 scenes, 22 filters, install commands
src/bin/dump_frames.rs authentic frame capture from the termpaper engine
assets/style.css       the noir design system
assets/sprites/        vertical-strip PNGs (generated)
dist/                  the deployable static site (generated)
```
