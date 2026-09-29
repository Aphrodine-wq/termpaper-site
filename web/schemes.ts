// Terminal colour schemes into a termpaper palette: kitty, Ghostty,
// Alacritty (TOML), Windows Terminal (JSON) and iTerm2 (.itermcolors).
// The palette runs darkest to lightest, as termpaper's do: the background,
// the scheme's accents, the foreground.

import { parse as parseToml } from "smol-toml";
import { parseHex, type Rgb } from "./theme.js";

export interface Scheme {
  format: string;
  name?: string;
  background?: Rgb;
  foreground?: Rgb;
  /** ANSI 0..15 where known */
  ansi: (Rgb | undefined)[];
}

const ANSI_NAMES = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"];

function kitty(text: string): Scheme | undefined {
  const s: Scheme = { format: "kitty", ansi: [] };
  let hits = 0;
  for (const line of text.split(/\r?\n/)) {
    const m = line.trim().match(/^(background|foreground|color(\d{1,2}))\s+(#?[0-9a-fA-F]{3,6})\s*$/);
    if (!m) continue;
    const c = parseHex(m[3]!);
    if (!c) continue;
    hits++;
    if (m[1] === "background") s.background = c;
    else if (m[1] === "foreground") s.foreground = c;
    else s.ansi[Number(m[2])] = c;
  }
  return hits >= 3 ? s : undefined;
}

function ghostty(text: string): Scheme | undefined {
  const s: Scheme = { format: "Ghostty", ansi: [] };
  let hits = 0;
  for (const line of text.split(/\r?\n/)) {
    const m = line.trim().match(/^(background|foreground|palette)\s*=\s*(?:(\d{1,2})\s*=\s*)?(#?[0-9a-fA-F]{3,6})\s*$/);
    if (!m) continue;
    const c = parseHex(m[3]!);
    if (!c) continue;
    hits++;
    if (m[1] === "background") s.background = c;
    else if (m[1] === "foreground") s.foreground = c;
    else if (m[2] !== undefined) s.ansi[Number(m[2])] = c;
  }
  return hits >= 3 ? s : undefined;
}

function alacritty(text: string): Scheme | undefined {
  let doc: Record<string, unknown>;
  try {
    doc = parseToml(text) as Record<string, unknown>;
  } catch {
    return undefined;
  }
  const colors = doc.colors as Record<string, Record<string, unknown>> | undefined;
  if (!colors) return undefined;
  const hex = (v: unknown) => (typeof v === "string" ? parseHex(v.replace(/^0x/, "#")) : undefined);
  const s: Scheme = { format: "Alacritty", ansi: [] };
  s.background = hex(colors.primary?.background);
  s.foreground = hex(colors.primary?.foreground);
  ANSI_NAMES.forEach((n, i) => {
    s.ansi[i] = hex(colors.normal?.[n]);
    s.ansi[i + 8] = hex(colors.bright?.[n]);
  });
  return s.background || s.ansi.some(Boolean) ? s : undefined;
}

function windowsTerminal(text: string): Scheme | undefined {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    return undefined;
  }
  let o = doc as Record<string, unknown>;
  if (Array.isArray((o as { schemes?: unknown }).schemes)) o = ((o as { schemes: unknown[] }).schemes[0] ?? {}) as Record<string, unknown>;
  const hex = (v: unknown) => (typeof v === "string" ? parseHex(v) : undefined);
  const names = ["black", "red", "green", "yellow", "blue", "purple", "cyan", "white"];
  const s: Scheme = { format: "Windows Terminal", ansi: [], name: typeof o.name === "string" ? o.name : undefined };
  s.background = hex(o.background);
  s.foreground = hex(o.foreground);
  names.forEach((n, i) => {
    s.ansi[i] = hex(o[n]);
    s.ansi[i + 8] = hex(o["bright" + n[0]!.toUpperCase() + n.slice(1)]);
  });
  return s.background || s.ansi.some(Boolean) ? s : undefined;
}

function iterm(text: string): Scheme | undefined {
  if (!text.includes("<plist")) return undefined;
  const s: Scheme = { format: "iTerm2", ansi: [] };
  const re = /<key>([^<]+)<\/key>\s*<dict>([\s\S]*?)<\/dict>/g;
  for (const m of text.matchAll(re)) {
    const comp = (name: string) => {
      const r = new RegExp(`<key>${name} Component</key>\\s*<real>([^<]+)</real>`).exec(m[2]!);
      return r ? Math.round(Math.min(1, Math.max(0, parseFloat(r[1]!))) * 255) : 0;
    };
    const c: Rgb = [comp("Red"), comp("Green"), comp("Blue")];
    const key = m[1]!.trim();
    const ansi = /^Ansi (\d{1,2}) Color$/.exec(key);
    if (ansi) s.ansi[Number(ansi[1])] = c;
    else if (key === "Background Color") s.background = c;
    else if (key === "Foreground Color") s.foreground = c;
  }
  return s.background || s.ansi.some(Boolean) ? s : undefined;
}

/** Read any of the supported formats; undefined when none fits. */
export function parseScheme(text: string): Scheme | undefined {
  return iterm(text) ?? windowsTerminal(text) ?? ghostty(text) ?? kitty(text) ?? alacritty(text);
}

const luma = (c: Rgb) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const near = (a: Rgb, b: Rgb) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 30;

/** A termpaper palette from a scheme: background, bright black, blue,
 *  magenta, cyan, green, yellow, foreground, deduplicated, darkest first,
 *  at most eight. */
export function paletteFrom(s: Scheme): Rgb[] {
  const pick = [s.background, s.ansi[8] ?? s.ansi[0], s.ansi[4], s.ansi[5], s.ansi[6], s.ansi[2], s.ansi[3], s.foreground];
  const out: Rgb[] = [];
  for (const c of pick) {
    if (c && !out.some((o) => near(o, c))) out.push(c);
  }
  return out.sort((a, b) => luma(a) - luma(b)).slice(0, 8);
}
