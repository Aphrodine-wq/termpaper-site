// Theme previews: a scene's frames (colour strips the frame tool dumps from
// the real engine, 96x54, 24 frames) run through a look in the browser.
// Colour stages are exact (web/theme.ts); of the effects, the ones that
// read at this size are drawn: vignette, scanlines, letterbox, grain.

import { graded, type Look, type Rgb } from "./theme.js";

export const W = 96;
export const H = 54;
export const FRAMES = 24;
export const PREVIEW_SCENES = ["tokyo", "bigsur", "lofi", "sakura", "koi", "aurora"] as const;

const strips = new Map<string, Promise<ImageData[]>>();

/** The frames of a scene's strip (cached). */
export function frames(scene: string): Promise<ImageData[]> {
  let p = strips.get(scene);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = W;
        c.height = H * FRAMES;
        const g = c.getContext("2d", { willReadFrequently: true })!;
        g.drawImage(img, 0, 0);
        resolve(Array.from({ length: FRAMES }, (_, i) => g.getImageData(0, i * H, W, H)));
      };
      img.onerror = () => reject(new Error(`no preview frames for ${scene}`));
      img.src = `/frames/${scene}.png`;
    });
    strips.set(scene, p);
  }
  return p;
}

/** A scene that suits a theme: the one it was made for when there is a
 *  preview of it, else one picked by its name. */
export function sceneFor(name: string, hint?: string): string {
  if (hint && (PREVIEW_SCENES as readonly string[]).includes(hint)) return hint;
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PREVIEW_SCENES[h % PREVIEW_SCENES.length]!;
}

/** Draws a look over frames; colours are cached per look. */
export class Renderer {
  private cache = new Map<number, Rgb>();
  private key = "";

  constructor(private look: Look) {}

  setLook(look: Look) {
    const k = JSON.stringify(look);
    if (k !== this.key) {
      this.key = k;
      this.cache.clear();
    }
    this.look = look;
  }

  /** One frame of `src` into `dst` (same size). */
  draw(src: ImageData, dst: ImageData) {
    const look = this.look;
    const e = look.effects;
    const on = (n: string) => e.stack.includes(n);
    const amount = (n: string) => (on(n) ? e.amounts[n] ?? 1 : 0);
    const vig = amount("vignette");
    const scan = amount("scanlines");
    const bars = amount("letterbox");
    const grain = amount("grain");
    const dither = look.palette.mode === "snap" && look.palette.dither;
    const s = src.data;
    const d = dst.data;
    const barH = Math.round(H * 0.12 * Math.min(bars, 2));
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        let c: Rgb;
        if (dither) {
          c = graded([s[i]!, s[i + 1]!, s[i + 2]!], look, [x, y]);
        } else {
          const key = (s[i]! << 16) | (s[i + 1]! << 8) | s[i + 2]!;
          let hit = this.cache.get(key);
          if (!hit) {
            hit = graded([s[i]!, s[i + 1]!, s[i + 2]!], look);
            this.cache.set(key, hit);
          }
          c = hit;
        }
        let k = 1;
        if (vig > 0) {
          const dx = (x - W / 2) / (W / 2), dy = (y - H / 2) / (H / 2);
          k *= 1 - Math.min(0.9, 0.35 * vig * (dx * dx + dy * dy));
        }
        if (scan > 0 && y % 2 === 1) k *= 1 - 0.25 * Math.min(scan, 2);
        let n = 0;
        if (grain > 0) {
          const hsh = Math.imul(x * 374761393 + y * 668265263, 1274126177) >>> 0;
          n = ((hsh % 29) - 14) * Math.min(grain, 2) * 0.6;
        }
        const bar = barH > 0 && (y < barH || y >= H - barH);
        d[i] = bar ? 0 : Math.max(0, Math.min(255, c[0] * k + n));
        d[i + 1] = bar ? 0 : Math.max(0, Math.min(255, c[1] * k + n));
        d[i + 2] = bar ? 0 : Math.max(0, Math.min(255, c[2] * k + n));
        d[i + 3] = 255;
      }
    }
  }
}

/** A canvas showing a look over a scene; `play` animates it (4 frames a
 *  second), `still` holds the first frame. */
export class Preview {
  private renderer: Renderer;
  private out: ImageData;
  private timer: number | undefined;
  private frame = 0;
  private list: ImageData[] = [];

  constructor(private canvas: HTMLCanvasElement, look: Look, private scene: string) {
    canvas.width = W;
    canvas.height = H;
    this.renderer = new Renderer(look);
    this.out = new ImageData(W, H);
  }

  async load(scene = this.scene) {
    this.scene = scene;
    this.list = await frames(scene);
    this.frame = 0;
    this.paint();
  }

  setLook(look: Look) {
    this.renderer.setLook(look);
    this.paint();
  }

  paint() {
    const f = this.list[this.frame % Math.max(this.list.length, 1)];
    if (!f) return;
    this.renderer.draw(f, this.out);
    this.canvas.getContext("2d")!.putImageData(this.out, 0, 0);
  }

  play() {
    if (this.timer !== undefined) return;
    this.timer = window.setInterval(() => {
      this.frame = (this.frame + 1) % FRAMES;
      this.paint();
    }, 250);
  }

  still() {
    if (this.timer !== undefined) window.clearInterval(this.timer);
    this.timer = undefined;
  }
}
