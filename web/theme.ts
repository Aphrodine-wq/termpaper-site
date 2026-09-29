// termpaper themes, in TypeScript: the file format, share codes, and the
// look's per-pixel colour stages. A port of termpaper's src/theme.rs and
// src/look.rs (plus src/color_grade.rs), checked against golden vectors the
// Rust writes (examples/theme_vectors.rs): every colour within one step.
//
// Pure: no DOM, no Node. Compression (share codes) is passed in, so the
// browser can use CompressionStream and the server node:zlib.

export const FORMAT = 1;
export const MAX_NAME = 40;
export const MAX_AUTHOR = 32;
export const MAX_DESCRIPTION = 160;
export const MAX_TAGS = 8;
export const MAX_TAG = 20;
export const MAX_COLORS = 8;

/** Every effect termpaper has (`filter::FILTER_CYCLE`). */
export const EFFECTS = [
  "scanlines", "vignette", "grain", "warm", "cool", "hue", "crt", "bloom", "duotone", "pixelate",
  "chroma", "spectrum", "edges", "thermal", "warp", "invert", "sepia", "posterize", "gamma",
  "sharpen", "mirror", "noir", "letterbox", "halation", "dither", "tiltshift", "kaleido",
] as const;

export type Rgb = [number, number, number];

export interface Tone { hue: number; amount: number }

export interface Grade {
  hue: number; saturation: number; contrast: number; exposure: number; vibrance: number;
  temperature: number; tint: number; gamma: number; fade: number;
  shadows: Tone; midtones: Tone; highlights: Tone; balance: number;
}

export type PaletteMode = "off" | "map" | "tint" | "snap";

export interface Palette { mode: PaletteMode; colors: Rgb[]; strength: number; dither: boolean }

export interface Effects { stack: string[]; amounts: Record<string, number> }

export interface Look { grade: Grade; palette: Palette; effects: Effects }

export interface SceneHint { name: string; variant?: string }

export interface Theme {
  format: number;
  name: string;
  author: string;
  description: string;
  tags: string[];
  look: Look;
  scene?: SceneHint;
  display?: { dim?: number };
}

export const defaultGrade = (): Grade => ({
  hue: 0, saturation: 1, contrast: 1, exposure: 0, vibrance: 0, temperature: 0, tint: 0, gamma: 1, fade: 0,
  shadows: { hue: 215, amount: 0 }, midtones: { hue: 30, amount: 0 }, highlights: { hue: 40, amount: 0 }, balance: 0,
});

export const defaultLook = (): Look => ({
  grade: defaultGrade(),
  palette: { mode: "off", colors: [], strength: 1, dither: false },
  effects: { stack: [], amounts: {} },
});

export const newTheme = (): Theme => ({ format: FORMAT, name: "Untitled", author: "", description: "", tags: [], look: defaultLook() });

// ------------------------------------------------------------------ parsing

const num = (v: unknown, d: number): number => (typeof v === "number" && Number.isFinite(v) ? v : d);

export function parseHex(s: string): Rgb | undefined {
  const h = s.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(h)) return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
  if (/^[0-9a-fA-F]{3}$/.test(h)) return [0, 1, 2].map((i) => parseInt(h[i]!, 16) * 17) as Rgb;
  return undefined;
}

export const hex = (c: Rgb): string => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");

function tone(v: unknown, d: Tone): Tone {
  const o = (v ?? {}) as Record<string, unknown>;
  return { hue: num(o.hue, d.hue), amount: num(o.amount, d.amount) };
}

/** A Look from its serde shape (JSON or parsed TOML): missing fields are
 *  the defaults. Throws on colours that are not colours. */
export function lookFrom(o: Record<string, unknown>): Look {
  const l = defaultLook();
  const g = (o.grade ?? {}) as Record<string, unknown>;
  const d = l.grade;
  l.grade = {
    hue: num(g.hue, d.hue), saturation: num(g.saturation, d.saturation), contrast: num(g.contrast, d.contrast),
    exposure: num(g.exposure, d.exposure), vibrance: num(g.vibrance, d.vibrance), temperature: num(g.temperature, d.temperature),
    tint: num(g.tint, d.tint), gamma: num(g.gamma, d.gamma), fade: num(g.fade, d.fade),
    shadows: tone(g.shadows, d.shadows), midtones: tone(g.midtones, d.midtones), highlights: tone(g.highlights, d.highlights),
    balance: num(g.balance, d.balance),
  };
  const p = (o.palette ?? {}) as Record<string, unknown>;
  const mode = typeof p.mode === "string" && ["off", "map", "tint", "snap"].includes(p.mode) ? (p.mode as PaletteMode) : "off";
  const colors = Array.isArray(p.colors)
    ? p.colors.map((c) => {
        const rgb = typeof c === "string" ? parseHex(c) : undefined;
        if (!rgb) throw new Error(`not a colour: ${JSON.stringify(c)} (want #rrggbb)`);
        return rgb;
      })
    : [];
  l.palette = { mode, colors, strength: num(p.strength, 1), dither: p.dither === true };
  const e = (o.effects ?? {}) as Record<string, unknown>;
  const stack = Array.isArray(e.stack) ? e.stack.filter((s): s is string => typeof s === "string") : [];
  const amounts: Record<string, number> = {};
  for (const [k, v] of Object.entries(e)) {
    if (k !== "stack" && typeof v === "number" && Number.isFinite(v)) amounts[k] = v;
  }
  l.effects = { stack, amounts };
  return l;
}

/** A theme from its serde shape. Throws when it cannot be one. */
export function themeFrom(o: unknown): Theme {
  if (typeof o !== "object" || o === null || Array.isArray(o)) throw new Error("not a theme");
  const r = o as Record<string, unknown>;
  const t = newTheme();
  t.format = Math.round(num(r.format, FORMAT));
  if (typeof r.name === "string") t.name = r.name;
  if (typeof r.author === "string") t.author = r.author;
  if (typeof r.description === "string") t.description = r.description;
  if (Array.isArray(r.tags)) t.tags = r.tags.filter((x): x is string => typeof x === "string");
  t.look = lookFrom(r);
  const s = r.scene as Record<string, unknown> | undefined;
  if (s && typeof s.name === "string") t.scene = { name: s.name, ...(typeof s.variant === "string" ? { variant: s.variant } : {}) };
  const dp = r.display as Record<string, unknown> | undefined;
  if (dp && typeof dp.dim === "number") t.display = { dim: dp.dim };
  return t;
}

// ------------------------------------------------------------------ cleaning

const clean = (s: string, max: number): string =>
  Array.from(s.replace(/\p{Cc}/gu, "")).slice(0, max).join("").trim();

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const wrap360 = (v: number) => ((v % 360) + 360) % 360;
const round2 = (v: number) => Math.round(v * 100) / 100;

/** `Look::sanitize`: everything in range. */
export function sanitize(l: Look): Look {
  const g = l.grade;
  g.hue = wrap360(g.hue);
  g.saturation = clamp(g.saturation, 0, 2.5);
  g.contrast = clamp(g.contrast, 0.5, 2.5);
  g.exposure = clamp(g.exposure, -2, 2);
  g.vibrance = clamp(g.vibrance, -1, 1);
  g.temperature = clamp(g.temperature, -1, 1);
  g.tint = clamp(g.tint, -1, 1);
  g.gamma = clamp(g.gamma, 0.5, 2);
  g.fade = clamp(g.fade, 0, 0.5);
  g.balance = clamp(g.balance, -1, 1);
  for (const t of [g.shadows, g.midtones, g.highlights]) {
    t.hue = wrap360(t.hue);
    t.amount = clamp(t.amount, 0, 1);
  }
  const p = l.palette;
  p.colors = p.colors.slice(0, MAX_COLORS);
  p.strength = clamp(p.strength, 0, 1);
  if (p.colors.length < 2 && p.mode !== "off") p.mode = "off";
  l.effects.stack = l.effects.stack.filter((s) => s.trim() !== "").slice(0, 16);
  const amounts: Record<string, number> = {};
  for (const [k, v] of Object.entries(l.effects.amounts)) {
    if (l.effects.stack.includes(k) || (EFFECTS as readonly string[]).includes(k)) {
      const a = round2(clamp(v, 0, 2));
      if (Math.abs(a - 1) >= 1e-4) amounts[k] = a;
    }
  }
  l.effects.amounts = amounts;
  return l;
}

/** Equal but for float noise (an f32 written out as f64 differs in the
 *  eighth place), effect strengths rounded to hundredths, and strengths of
 *  1 left out: what sanitize does to a look that was already in range. */
function sameLook(a: Look, b: Look): boolean {
  const near = (x: unknown, y: unknown): boolean => {
    if (typeof x === "number" && typeof y === "number") return Math.abs(x - y) < 1e-4;
    if (Array.isArray(x) && Array.isArray(y)) return x.length === y.length && x.every((v, i) => near(v, y[i]));
    if (x && y && typeof x === "object" && typeof y === "object") {
      const kx = Object.keys(x);
      return kx.length === Object.keys(y).length && kx.every((k) => near((x as Record<string, unknown>)[k], (y as Record<string, unknown>)[k]));
    }
    return x === y;
  };
  const names = new Set([...Object.keys(a.effects.amounts), ...Object.keys(b.effects.amounts)]);
  const amountsOk = [...names].every((n) => Math.abs((a.effects.amounts[n] ?? 1) - (b.effects.amounts[n] ?? 1)) < 0.0051);
  return near(a.grade, b.grade) && near(a.palette, b.palette) && near(a.effects.stack, b.effects.stack) && amountsOk;
}

/** `Theme::validate`: clean the theme up for use, returning what changed.
 *  Throws for what cannot be fixed: a newer format, no name. `scenes`, when
 *  given, is every scene and its variants (from the catalog). */
export function validate(t: Theme, scenes?: Map<string, string[]>): string[] {
  const w: string[] = [];
  if (t.format > FORMAT) throw new Error(`made for theme format ${t.format} (this reads ${FORMAT})`);
  t.format = FORMAT;
  const name = clean(t.name, MAX_NAME);
  if (!name) throw new Error("a theme needs a name");
  if (Array.from(name).length < Array.from(t.name.trim()).length) w.push(`name shortened to ${MAX_NAME} characters`);
  t.name = name;
  t.author = clean(t.author, MAX_AUTHOR);
  const desc = clean(t.description, MAX_DESCRIPTION);
  if (Array.from(desc).length < Array.from(t.description.trim()).length) w.push(`description shortened to ${MAX_DESCRIPTION} characters`);
  t.description = desc;
  const tags = t.tags.map((x) => clean(x.toLowerCase(), MAX_TAG)).filter((x) => x).slice(0, MAX_TAGS);
  if (tags.length < t.tags.length) w.push(`kept ${tags.length} tags`);
  t.tags = tags;
  const before = t.look.effects.stack.length;
  t.look.effects.stack = t.look.effects.stack.filter((e) => (EFFECTS as readonly string[]).includes(e));
  if (t.look.effects.stack.length < before) w.push("dropped effects this termpaper does not have");
  const unclamped = structuredClone(t.look);
  sanitize(t.look);
  if (!sameLook(unclamped, t.look)) w.push("some values were out of range and were clamped");
  if (t.scene && scenes) {
    const variants = scenes.get(t.scene.name);
    if (!variants) {
      w.push(`scene \`${t.scene.name}\` is not in this termpaper`);
      delete t.scene;
    } else if (t.scene.variant && !variants.includes(t.scene.variant)) {
      w.push(`scene \`${t.scene.name}\` has no variant \`${t.scene.variant}\``);
      delete t.scene.variant;
    }
  }
  if (t.display?.dim !== undefined) t.display.dim = Number.isFinite(t.display.dim) ? clamp(t.display.dim, 0.2, 1) : 1;
  return w;
}

// ------------------------------------------------------------------ writing

const isDefaultTone = (t: Tone) => t.amount < 1e-6;

/** The serde shape of a theme, carrying only what differs from neutral
 *  (what termpaper writes). */
export function toPlain(t: Theme): Record<string, unknown> {
  const o: Record<string, unknown> = { format: t.format, name: t.name };
  if (t.author) o.author = t.author;
  if (t.description) o.description = t.description;
  if (t.tags.length) o.tags = t.tags;
  const g = t.look.grade;
  const d = defaultGrade();
  const grade: Record<string, unknown> = {};
  for (const k of ["hue", "exposure", "vibrance", "temperature", "tint", "fade", "balance"] as const) {
    if (Math.abs(g[k]) >= 1e-6) grade[k] = g[k];
  }
  for (const k of ["saturation", "contrast", "gamma"] as const) {
    if (Math.abs(g[k] - d[k]) >= 1e-6) grade[k] = g[k];
  }
  for (const k of ["shadows", "midtones", "highlights"] as const) {
    if (!isDefaultTone(g[k])) grade[k] = { hue: g[k].hue, amount: g[k].amount };
  }
  if (Object.keys(grade).length) o.grade = grade;
  const p = t.look.palette;
  if (p.mode !== "off" || p.colors.length) {
    const pal: Record<string, unknown> = { mode: p.mode };
    if (p.colors.length) pal.colors = p.colors.map(hex);
    if (Math.abs(p.strength - 1) >= 1e-6) pal.strength = p.strength;
    if (p.dither) pal.dither = true;
    o.palette = pal;
  }
  const e = t.look.effects;
  if (e.stack.length || Object.keys(e.amounts).length) o.effects = { stack: e.stack, ...e.amounts };
  if (t.scene) o.scene = { ...t.scene };
  if (t.display && t.display.dim !== undefined) o.display = { dim: t.display.dim };
  return o;
}

const tomlString = (s: string) => JSON.stringify(s);
const tomlNumber = (v: number) => (Number.isInteger(v) ? v.toFixed(1) : String(v));
const tomlValue = (v: unknown): string =>
  typeof v === "string" ? tomlString(v)
  : typeof v === "number" ? tomlNumber(v)
  : typeof v === "boolean" ? String(v)
  : Array.isArray(v) ? "[" + v.map(tomlValue).join(", ") + "]"
  : "{ " + Object.entries(v as Record<string, unknown>).map(([k, x]) => `${k} = ${tomlValue(x)}`).join(", ") + " }";

/** The theme as a TOML file termpaper reads. */
export function toToml(t: Theme): string {
  const o = toPlain(t);
  const lines: string[] = [];
  for (const k of ["format", "name", "author", "description", "tags"]) {
    if (o[k] !== undefined) lines.push(`${k} = ${k === "format" ? String(o[k]) : tomlValue(o[k])}`);
  }
  for (const table of ["grade", "palette", "effects", "scene", "display"]) {
    const v = o[table] as Record<string, unknown> | undefined;
    if (!v) continue;
    lines.push("", `[${table}]`);
    for (const [k, x] of Object.entries(v)) lines.push(`${k} = ${tomlValue(x)}`);
  }
  return lines.join("\n") + "\n";
}

// ------------------------------------------------------------------ share codes

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function base64urlEncode(data: Uint8Array): string {
  let out = "";
  for (let i = 0; i < data.length; i += 3) {
    const n = (data[i]! << 16) | ((data[i + 1] ?? 0) << 8) | (data[i + 2] ?? 0);
    const chars = Math.min(3, data.length - i) + 1;
    for (let k = 0; k < chars; k++) out += B64[(n >> (18 - 6 * k)) & 63];
  }
  return out;
}

export function base64urlDecode(text: string): Uint8Array | undefined {
  const s = text.replace(/=+$/, "");
  if (s.length % 4 === 1) return undefined;
  const out: number[] = [];
  for (let i = 0; i < s.length; i += 4) {
    const chunk = s.slice(i, i + 4);
    let n = 0;
    for (let k = 0; k < chunk.length; k++) {
      const v = B64.indexOf(chunk[k]!);
      if (v < 0) return undefined;
      n |= v << (18 - 6 * k);
    }
    for (let k = 0; k < chunk.length - 1; k++) out.push((n >> (16 - 8 * k)) & 255);
  }
  return new Uint8Array(out);
}

/** Raw DEFLATE both ways (the browser's CompressionStream("deflate-raw"),
 *  or node:zlib's deflateRawSync / inflateRawSync). */
export interface Codec {
  deflate(data: Uint8Array): Promise<Uint8Array>;
  inflate(data: Uint8Array): Promise<Uint8Array>;
}

/** `tp1:` + base64url(deflate(JSON)). */
export async function toCode(t: Theme, codec: Codec): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(toPlain(t)));
  return "tp1:" + base64urlEncode(await codec.deflate(json));
}

/** A share code back to a theme (surrounding whitespace and line breaks are
 *  fine), validated. */
export async function fromCode(code: string, codec: Codec, scenes?: Map<string, string[]>): Promise<{ theme: Theme; warnings: string[] }> {
  const c = code.replace(/\s+/g, "");
  if (!c.startsWith("tp1:")) throw new Error("not a termpaper theme code (they start with tp1:)");
  const packed = base64urlDecode(c.slice(4));
  if (!packed || packed.length === 0) throw new Error("the code is damaged (not base64url)");
  let json: string;
  try {
    const raw = await codec.inflate(packed);
    if (raw.length > 64 * 1024) throw new Error("too big");
    json = new TextDecoder().decode(raw);
  } catch {
    throw new Error("the code is damaged (does not unpack)");
  }
  let o: unknown;
  try {
    o = JSON.parse(json);
  } catch {
    throw new Error("the code does not hold a theme");
  }
  const theme = themeFrom(o);
  const warnings = validate(theme, scenes);
  return { theme, warnings };
}

/** `slugify`: "Rosé Pine" → "rose-pine". */
export function slugify(name: string): string {
  const map: Record<string, string> = { à: "a", á: "a", â: "a", ã: "a", ä: "a", å: "a", è: "e", é: "e", ê: "e", ë: "e", ì: "i", í: "i", î: "i", ï: "i", ò: "o", ó: "o", ô: "o", õ: "o", ö: "o", ø: "o", ù: "u", ú: "u", û: "u", ü: "u", ñ: "n", ç: "c" };
  let out = "";
  for (const ch of Array.from(name.toLowerCase())) {
    let c: string;
    if (/[a-z0-9]/.test(ch)) c = ch;
    else if (map[ch]) c = map[ch]!;
    else if (ch === "&") {
      if (out && !out.endsWith("-")) out += "-";
      out += "and";
      continue;
    } else c = "-";
    if (c === "-" && (!out || out.endsWith("-"))) continue;
    out += c;
  }
  out = out.replace(/^-+|-+$/g, "");
  return out ? Array.from(out).slice(0, 48).join("") : "theme";
}

// ------------------------------------------------------------------ the look

const srgbToLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const linearToSrgb = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);
const luma = (c: number[]) => 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;

function hueRgb(deg: number): number[] {
  const h = (((deg / 60) % 6) + 6) % 6;
  const x = 1 - Math.abs((h % 2) - 1);
  switch (Math.floor(h)) {
    case 0: return [1, x, 0];
    case 1: return [x, 1, 0];
    case 2: return [0, 1, x];
    case 3: return [0, x, 1];
    case 4: return [x, 0, 1];
    default: return [1, 0, x];
  }
}

function gradient(colors: Rgb[], t: number): number[] {
  const n = colors.length;
  if (n === 1) return colors[0]!.map((v) => v / 255);
  const x = clamp(t, 0, 1) * (n - 1);
  const i = Math.min(Math.floor(x), n - 2);
  const f = x - i;
  const a = colors[i]!.map((v) => v / 255);
  const b = colors[i + 1]!.map((v) => v / 255);
  return [a[0]! + (b[0]! - a[0]!) * f, a[1]! + (b[1]! - a[1]!) * f, a[2]! + (b[2]! - a[2]!) * f];
}

/** `Look::transform`: exposure and white balance in linear light, gamma,
 *  vibrance, tone wheels, fade, palette map or tint. sRGB 0..1 in and out. */
export function transform(look: Look, c: number[]): number[] {
  const g = look.grade;
  let lin = [srgbToLinear(c[0]!), srgbToLinear(c[1]!), srgbToLinear(c[2]!)];
  const ev = 2 ** g.exposure;
  const gains = [1 + 0.22 * g.temperature + 0.06 * g.tint, 1 - 0.14 * g.tint, 1 - 0.22 * g.temperature + 0.06 * g.tint];
  const norm = Math.max(luma(gains), 1e-6);
  lin = lin.map((v, k) => Math.max(v * ev * gains[k]! / norm, 0));
  let s = lin.map((v) => linearToSrgb(Math.min(v, 1)));
  if (Math.abs(g.gamma - 1) > 1e-6) s = s.map((v) => Math.max(v, 0) ** (1 / g.gamma));
  if (Math.abs(g.vibrance) > 1e-6) {
    const l = luma(s);
    const hi = Math.max(...s);
    const lo = Math.min(...s);
    const sat = hi > 1e-6 ? (hi - lo) / hi : 0;
    const k = 1 + g.vibrance * (1 - sat);
    s = s.map((v) => l + (v - l) * k);
  }
  const pivot = clamp(0.5 + 0.35 * g.balance, 0.1, 0.9);
  const l = clamp(luma(s), 0, 1);
  const loW = clamp((pivot - l) / pivot, 0, 1) ** 2;
  const hiW = clamp((l - pivot) / (1 - pivot), 0, 1) ** 2;
  const midW = clamp(1 - loW - hiW, 0, 1) * clamp(4 * l * (1 - l), 0, 1);
  for (const [tone, w] of [[g.shadows, loW], [g.midtones, midW], [g.highlights, hiW]] as const) {
    if (tone.amount > 1e-6 && w > 0) {
      const h = hueRgb(tone.hue);
      const hl = luma(h);
      const a = tone.amount * w * 0.35;
      s = s.map((v, k) => v + (h[k]! - hl) * a);
    }
  }
  if (g.fade > 1e-6) s = s.map((v) => g.fade + (1 - g.fade) * v);
  const p = look.palette;
  if (p.colors.length >= 2 && (p.mode === "map" || p.mode === "tint")) {
    const lum = clamp(luma(s), 0, 1);
    let target = gradient(p.colors, lum);
    if (p.mode === "tint") {
      const tl = luma(target);
      const k = tl > 1e-4 ? lum / tl : 0;
      target = target.map((v) => Math.min(v * k, 1));
      if (tl <= 1e-4) target = [lum, lum, lum];
    }
    s = s.map((v, k) => v + (target[k]! - v) * p.strength);
  }
  return s.map((v) => clamp(v, 0, 1));
}

const f32 = Math.fround;

/** `color_grade::apply` for one pixel: hue rotation, saturation and
 *  contrast, in the f32 arithmetic the Rust uses. */
export function grade(c: Rgb, hueDeg: number, saturation: number, contrast: number): Rgb {
  const hueOn = hueDeg >= 0.5;
  const satOn = Math.abs(saturation - 1) > 0.02;
  const conOn = Math.abs(contrast - 1) > 0.02;
  if (!hueOn && !satOn && !conOn) return c;
  const con = (v: number): number => {
    if (!conOn) return v;
    const f = f32(v / 255);
    return Math.trunc(f32(clamp(f32(f32(f32(f - 0.5) * f32(contrast)) + 0.5), 0, 1) * 255));
  };
  const [r, g, b] = c;
  if (!hueOn) {
    const hi = Math.max(r, g, b);
    const lo = Math.min(r, g, b);
    if (hi === lo) return [con(r), con(g), con(b)];
    const mid = Math.min(Math.max(r, g), Math.max(r, b), Math.max(g, b));
    const sat = clamp(f32(f32((hi - lo) / hi) * f32(saturation)), 0, 1);
    const newLo = f32(hi * f32(1 - sat));
    const newMid = f32(newLo + f32(f32(hi - newLo) * f32((mid - lo) / (hi - lo))));
    const vMid = Math.trunc(newMid);
    const vLo = Math.trunc(newLo);
    const pick = (v: number) => (v === hi ? hi : v === lo ? vLo : vMid);
    return [con(pick(r)), con(pick(g)), con(pick(b))];
  }
  const rf = f32(r / 255), gf = f32(g / 255), bf = f32(b / 255);
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  const d = f32(max - min);
  let hue: number;
  if (d < 1e-6) hue = 0;
  else if (max === rf) hue = f32((((f32((gf - bf) / d) % 6) + 6) % 6) / 6);
  else if (max === gf) hue = f32(f32(f32((bf - rf) / d) + 2) / 6);
  else hue = f32(f32(f32((rf - gf) / d) + 4) / 6);
  let sat = max < 1e-6 ? 0 : f32(d / max);
  const val = max;
  if (sat < 0.1 && val > 0.015) sat = 0.1;
  hue = f32(hue + f32(hueDeg / 360));
  hue = hue - Math.floor(hue);
  if (satOn) sat = clamp(f32(sat * f32(saturation)), 0, 1);
  const [hr, hg, hb] = hsv(hue, sat, val);
  return [con(hr), con(hg), con(hb)];
}

function hsv(h0: number, s: number, v: number): Rgb {
  const h = f32((((h0 % 1) + 1) % 1) * 6);
  const i = Math.floor(h);
  const f = f32(h - i);
  const p = f32(v * f32(1 - s));
  const q = f32(v * f32(1 - f32(s * f)));
  const t = f32(v * f32(1 - f32(s * f32(1 - f))));
  const [r, g, b] = i === 0 ? [v, t, p] : i === 1 ? [q, v, p] : i === 2 ? [p, v, t] : i === 3 ? [p, q, v] : i === 4 ? [t, p, v] : [v, p, q];
  const to = (x: number) => Math.trunc(clamp(f32(x * 255), 0, 255));
  return [to(r), to(g), to(b)];
}

const BAYER4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

const dist2 = (a: Rgb, b: Rgb) => {
  const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
  return 2 * dr * dr + 4 * dg * dg + 3 * db * db;
};

/** `snap_pixel`: the nearest palette colour, or with `dither` an ordered
 *  choice between the two nearest at wall pixel (gx, gy). */
export function snap(c: Rgb, colors: Rgb[], dither: boolean, gx: number, gy: number): Rgb {
  let best = [Infinity, 0];
  let second = [Infinity, 0];
  colors.forEach((p, i) => {
    const d = dist2(c, p);
    if (d < best[0]!) {
      second = best;
      best = [d, i];
    } else if (d < second[0]!) second = [d, i];
  });
  if (!dither || second[0] === Infinity) return colors[best[1]!]!;
  const d1 = Math.sqrt(best[0]!), d2 = Math.sqrt(second[0]!);
  const t = d1 + d2 > 0 ? d1 / (d1 + d2) : 0;
  const threshold = (BAYER4[((gy % 4) + 4) % 4]![((gx % 4) + 4) % 4]! + 0.5) / 16;
  return t > threshold ? colors[second[1]!]! : colors[best[1]!]!;
}

/** One colour through the look's colour stages (`studio::graded`): the
 *  hue/saturation/contrast grade, the transform, the palette snap. A snap
 *  that dithers needs the pixel's position `at`; without one it takes the
 *  nearest colour, as `graded` does. */
export function graded(c: Rgb, look: Look, at?: [number, number]): Rgb {
  const g = look.grade;
  const a = grade(c, g.hue, g.saturation, g.contrast);
  const t = transform(look, [a[0] / 255, a[1] / 255, a[2] / 255]);
  const out: Rgb = [Math.round(t[0]! * 255), Math.round(t[1]! * 255), Math.round(t[2]! * 255)];
  const p = look.palette;
  return p.mode === "snap" && p.colors.length >= 2 ? snap(out, p.colors, p.dither && at !== undefined, at?.[0] ?? 0, at?.[1] ?? 0) : out;
}

/** Reference colours (sky, foliage, amber, magenta, skin, shadow) through
 *  a look, or its palette: what a theme's swatches show. */
export const REFS: Rgb[] = [
  [232, 186, 160], [112, 162, 222], [72, 132, 62], [242, 142, 62], [212, 64, 162],
  [248, 248, 242], [128, 128, 128], [40, 42, 50], [200, 44, 44], [250, 220, 92],
];

export function swatches(look: Look): Rgb[] {
  const c = look.palette.colors;
  if (c.length >= 2 && look.palette.mode !== "off") {
    const k = Math.min(c.length, 6);
    return Array.from({ length: k }, (_, i) => c[Math.floor((i * (c.length - 1)) / (k - 1))]!);
  }
  return [1, 2, 3, 4, 0, 7].map((i) => graded(REFS[i]!, look));
}
