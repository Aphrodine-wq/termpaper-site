// Built by scripts/build.mjs from routes/ and lib/; edit those, not this.

// lib/http.ts
import { createHash as createHash2, timingSafeEqual as timingSafeEqual2 } from "node:crypto";

// web/theme.ts
var FORMAT = 1;
var MAX_NAME = 40;
var MAX_AUTHOR = 32;
var MAX_DESCRIPTION = 160;
var MAX_TAGS = 8;
var MAX_TAG = 20;
var MAX_COLORS = 8;
var EFFECTS = [
  "scanlines",
  "vignette",
  "grain",
  "warm",
  "cool",
  "hue",
  "crt",
  "bloom",
  "duotone",
  "pixelate",
  "chroma",
  "spectrum",
  "edges",
  "thermal",
  "warp",
  "invert",
  "sepia",
  "posterize",
  "gamma",
  "sharpen",
  "mirror",
  "noir",
  "letterbox",
  "halation",
  "dither",
  "tiltshift",
  "kaleido"
];
var defaultGrade = () => ({
  hue: 0,
  saturation: 1,
  contrast: 1,
  exposure: 0,
  vibrance: 0,
  temperature: 0,
  tint: 0,
  gamma: 1,
  fade: 0,
  shadows: { hue: 215, amount: 0 },
  midtones: { hue: 30, amount: 0 },
  highlights: { hue: 40, amount: 0 },
  balance: 0
});
var defaultLook = () => ({
  grade: defaultGrade(),
  palette: { mode: "off", colors: [], strength: 1, dither: false },
  effects: { stack: [], amounts: {} }
});
var newTheme = () => ({ format: FORMAT, name: "Untitled", author: "", description: "", tags: [], look: defaultLook() });
var num = (v, d) => typeof v === "number" && Number.isFinite(v) ? v : d;
function parseHex(s) {
  const h = s.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(h)) return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  if (/^[0-9a-fA-F]{3}$/.test(h)) return [0, 1, 2].map((i) => parseInt(h[i], 16) * 17);
  return void 0;
}
var hex = (c) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
function tone(v, d) {
  const o = v ?? {};
  return { hue: num(o.hue, d.hue), amount: num(o.amount, d.amount) };
}
function lookFrom(o) {
  const l = defaultLook();
  const g = o.grade ?? {};
  const d = l.grade;
  l.grade = {
    hue: num(g.hue, d.hue),
    saturation: num(g.saturation, d.saturation),
    contrast: num(g.contrast, d.contrast),
    exposure: num(g.exposure, d.exposure),
    vibrance: num(g.vibrance, d.vibrance),
    temperature: num(g.temperature, d.temperature),
    tint: num(g.tint, d.tint),
    gamma: num(g.gamma, d.gamma),
    fade: num(g.fade, d.fade),
    shadows: tone(g.shadows, d.shadows),
    midtones: tone(g.midtones, d.midtones),
    highlights: tone(g.highlights, d.highlights),
    balance: num(g.balance, d.balance)
  };
  const p = o.palette ?? {};
  const mode = typeof p.mode === "string" && ["off", "map", "tint", "snap"].includes(p.mode) ? p.mode : "off";
  const colors = Array.isArray(p.colors) ? p.colors.map((c) => {
    const rgb = typeof c === "string" ? parseHex(c) : void 0;
    if (!rgb) throw new Error(`not a colour: ${JSON.stringify(c)} (want #rrggbb)`);
    return rgb;
  }) : [];
  l.palette = { mode, colors, strength: num(p.strength, 1), dither: p.dither === true };
  const e = o.effects ?? {};
  const stack = Array.isArray(e.stack) ? e.stack.filter((s) => typeof s === "string") : [];
  const amounts = {};
  for (const [k, v] of Object.entries(e)) {
    if (k !== "stack" && typeof v === "number" && Number.isFinite(v)) amounts[k] = v;
  }
  l.effects = { stack, amounts };
  return l;
}
function themeFrom(o) {
  if (typeof o !== "object" || o === null || Array.isArray(o)) throw new Error("not a theme");
  const r = o;
  const t = newTheme();
  t.format = Math.round(num(r.format, FORMAT));
  if (typeof r.name === "string") t.name = r.name;
  if (typeof r.author === "string") t.author = r.author;
  if (typeof r.description === "string") t.description = r.description;
  if (Array.isArray(r.tags)) t.tags = r.tags.filter((x) => typeof x === "string");
  t.look = lookFrom(r);
  const s = r.scene;
  if (s && typeof s.name === "string") t.scene = { name: s.name, ...typeof s.variant === "string" ? { variant: s.variant } : {} };
  const dp = r.display;
  if (dp && typeof dp.dim === "number") t.display = { dim: dp.dim };
  return t;
}
var clean = (s, max) => Array.from(s.replace(new RegExp("\\p{Cc}", "gu"), "")).slice(0, max).join("").trim();
var clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
var wrap360 = (v) => (v % 360 + 360) % 360;
var round2 = (v) => Math.round(v * 100) / 100;
function sanitize(l) {
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
  const amounts = {};
  for (const [k, v] of Object.entries(l.effects.amounts)) {
    if (l.effects.stack.includes(k) || EFFECTS.includes(k)) {
      const a = round2(clamp(v, 0, 2));
      if (Math.abs(a - 1) >= 1e-4) amounts[k] = a;
    }
  }
  l.effects.amounts = amounts;
  return l;
}
function sameLook(a, b) {
  const near = (x, y) => {
    if (typeof x === "number" && typeof y === "number") return Math.abs(x - y) < 1e-4;
    if (Array.isArray(x) && Array.isArray(y)) return x.length === y.length && x.every((v, i) => near(v, y[i]));
    if (x && y && typeof x === "object" && typeof y === "object") {
      const kx = Object.keys(x);
      return kx.length === Object.keys(y).length && kx.every((k) => near(x[k], y[k]));
    }
    return x === y;
  };
  const names = /* @__PURE__ */ new Set([...Object.keys(a.effects.amounts), ...Object.keys(b.effects.amounts)]);
  const amountsOk = [...names].every((n) => Math.abs((a.effects.amounts[n] ?? 1) - (b.effects.amounts[n] ?? 1)) < 51e-4);
  return near(a.grade, b.grade) && near(a.palette, b.palette) && near(a.effects.stack, b.effects.stack) && amountsOk;
}
function validate(t, scenes2) {
  const w = [];
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
  t.look.effects.stack = t.look.effects.stack.filter((e) => EFFECTS.includes(e));
  if (t.look.effects.stack.length < before) w.push("dropped effects this termpaper does not have");
  const unclamped = structuredClone(t.look);
  sanitize(t.look);
  if (!sameLook(unclamped, t.look)) w.push("some values were out of range and were clamped");
  if (t.scene && scenes2) {
    const variants = scenes2.get(t.scene.name);
    if (!variants) {
      w.push(`scene \`${t.scene.name}\` is not in this termpaper`);
      delete t.scene;
    } else if (t.scene.variant && !variants.includes(t.scene.variant)) {
      w.push(`scene \`${t.scene.name}\` has no variant \`${t.scene.variant}\``);
      delete t.scene.variant;
    }
  }
  if (t.display?.dim !== void 0) t.display.dim = Number.isFinite(t.display.dim) ? clamp(t.display.dim, 0.2, 1) : 1;
  return w;
}
var isDefaultTone = (t) => t.amount < 1e-6;
function toPlain(t) {
  const o = { format: t.format, name: t.name };
  if (t.author) o.author = t.author;
  if (t.description) o.description = t.description;
  if (t.tags.length) o.tags = t.tags;
  const g = t.look.grade;
  const d = defaultGrade();
  const grade = {};
  for (const k of ["hue", "exposure", "vibrance", "temperature", "tint", "fade", "balance"]) {
    if (Math.abs(g[k]) >= 1e-6) grade[k] = g[k];
  }
  for (const k of ["saturation", "contrast", "gamma"]) {
    if (Math.abs(g[k] - d[k]) >= 1e-6) grade[k] = g[k];
  }
  for (const k of ["shadows", "midtones", "highlights"]) {
    if (!isDefaultTone(g[k])) grade[k] = { hue: g[k].hue, amount: g[k].amount };
  }
  if (Object.keys(grade).length) o.grade = grade;
  const p = t.look.palette;
  if (p.mode !== "off" || p.colors.length) {
    const pal = { mode: p.mode };
    if (p.colors.length) pal.colors = p.colors.map(hex);
    if (Math.abs(p.strength - 1) >= 1e-6) pal.strength = p.strength;
    if (p.dither) pal.dither = true;
    o.palette = pal;
  }
  const e = t.look.effects;
  if (e.stack.length || Object.keys(e.amounts).length) o.effects = { stack: e.stack, ...e.amounts };
  if (t.scene) o.scene = { ...t.scene };
  if (t.display && t.display.dim !== void 0) o.display = { dim: t.display.dim };
  return o;
}
var tomlString = (s) => JSON.stringify(s);
var tomlNumber = (v) => Number.isInteger(v) ? v.toFixed(1) : String(v);
var tomlValue = (v) => typeof v === "string" ? tomlString(v) : typeof v === "number" ? tomlNumber(v) : typeof v === "boolean" ? String(v) : Array.isArray(v) ? "[" + v.map(tomlValue).join(", ") + "]" : "{ " + Object.entries(v).map(([k, x]) => `${k} = ${tomlValue(x)}`).join(", ") + " }";
function toToml(t) {
  const o = toPlain(t);
  const lines = [];
  for (const k of ["format", "name", "author", "description", "tags"]) {
    if (o[k] !== void 0) lines.push(`${k} = ${k === "format" ? String(o[k]) : tomlValue(o[k])}`);
  }
  for (const table of ["grade", "palette", "effects", "scene", "display"]) {
    const v = o[table];
    if (!v) continue;
    lines.push("", `[${table}]`);
    for (const [k, x] of Object.entries(v)) lines.push(`${k} = ${tomlValue(x)}`);
  }
  return lines.join("\n") + "\n";
}
var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
function base64urlEncode(data) {
  let out = "";
  for (let i = 0; i < data.length; i += 3) {
    const n = data[i] << 16 | (data[i + 1] ?? 0) << 8 | (data[i + 2] ?? 0);
    const chars = Math.min(3, data.length - i) + 1;
    for (let k = 0; k < chars; k++) out += B64[n >> 18 - 6 * k & 63];
  }
  return out;
}
async function toCode(t, codec) {
  const json2 = new TextEncoder().encode(JSON.stringify(toPlain(t)));
  return "tp1:" + base64urlEncode(await codec.deflate(json2));
}
function slugify(name) {
  const map = { \u00E0: "a", \u00E1: "a", \u00E2: "a", \u00E3: "a", \u00E4: "a", \u00E5: "a", \u00E8: "e", \u00E9: "e", \u00EA: "e", \u00EB: "e", \u00EC: "i", \u00ED: "i", \u00EE: "i", \u00EF: "i", \u00F2: "o", \u00F3: "o", \u00F4: "o", \u00F5: "o", \u00F6: "o", \u00F8: "o", \u00F9: "u", \u00FA: "u", \u00FB: "u", \u00FC: "u", \u00F1: "n", \u00E7: "c" };
  let out = "";
  for (const ch of Array.from(name.toLowerCase())) {
    let c;
    if (/[a-z0-9]/.test(ch)) c = ch;
    else if (map[ch]) c = map[ch];
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

// lib/db.ts
var HttpError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
  status;
};
var current;
async function db() {
  if (current) return current;
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) throw new HttpError(503, "the gallery has no database connected yet");
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(url);
  current = {
    async query(text, params = []) {
      return await sql.query(text, params);
    }
  };
  return current;
}

// lib/service.ts
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { englishDataset, englishRecommendedTransformers, RegExpMatcher } from "obscenity";

// assets/catalog.json
var catalog_default = {
  scenes: [
    {
      category: "coast",
      category_label: "Coast & Water",
      description: "headlands of the Big Sur coast dropping into Pacific swells as marine fog rolls in",
      fallback: "ocean",
      name: "bigsur",
      studio: true,
      tags: [
        "ocean",
        "cliffs",
        "fog",
        "sunset",
        "california"
      ],
      title: "Big Sur Coast",
      variants: [
        "sunset",
        "fog",
        "noon",
        "moonlight"
      ]
    },
    {
      category: "coast",
      category_label: "Coast & Water",
      description: "lobster boats riding at their moorings in a misty cove of fish shacks and a wooden pier",
      fallback: "ocean",
      name: "harbor",
      studio: true,
      tags: [
        "harbor",
        "boats",
        "nova scotia",
        "maine",
        "mist",
        "reflections",
        "dawn"
      ],
      title: "Fishing Harbor at Dawn",
      variants: [
        "dawn",
        "dusk",
        "night"
      ]
    },
    {
      category: "coast",
      category_label: "Coast & Water",
      description: "blue icebergs drift in a glacier lagoon below Vatnaj\xF6kull, ice glinting on black sand",
      fallback: "frost",
      name: "icebergs",
      studio: true,
      tags: [
        "iceland",
        "glacier",
        "icebergs",
        "lagoon",
        "aurora",
        "black sand"
      ],
      title: "J\xF6kuls\xE1rl\xF3n",
      variants: [
        "day",
        "twilight",
        "aurora"
      ]
    },
    {
      category: "coast",
      category_label: "Coast & Water",
      description: "translucent moon jellies pulse and drift through the blue of an aquarium gallery tank",
      fallback: "aquarium",
      name: "jellyfish",
      studio: true,
      tags: [
        "aquarium",
        "jellyfish",
        "monterey",
        "underwater",
        "calm"
      ],
      title: "Moon Jelly Gallery",
      variants: [
        "blue",
        "sunset",
        "deep"
      ]
    },
    {
      category: "coast",
      category_label: "Coast & Water",
      description: "looking up through swaying giant kelp as sun shafts pour down and a school of fish mills",
      fallback: "abyss",
      name: "kelp",
      studio: true,
      tags: [
        "underwater",
        "kelp",
        "god rays",
        "fish",
        "california",
        "ocean"
      ],
      title: "Monterey Kelp Forest",
      variants: [
        "sunlit",
        "deep",
        "twilight"
      ]
    },
    {
      category: "coast",
      category_label: "Coast & Water",
      description: "turquoise shallows off an overwater-bungalow deck, Mount Otemanu rising across the lagoon",
      fallback: "ocean",
      name: "lagoon",
      studio: true,
      tags: [
        "tropical",
        "lagoon",
        "island",
        "bungalows",
        "turquoise",
        "polynesia"
      ],
      title: "Bora Bora Lagoon",
      variants: [
        "noon",
        "golden",
        "night"
      ]
    },
    {
      category: "coast",
      category_label: "Coast & Water",
      description: "a Maine lighthouse on a granite headland, its beam sweeping through rain, spray and storm",
      fallback: "ocean",
      name: "lighthouse",
      studio: true,
      tags: [
        "lighthouse",
        "storm",
        "maine",
        "rain",
        "night",
        "beam",
        "fog"
      ],
      title: "Lighthouse in the Storm",
      variants: [
        "storm",
        "fog",
        "dusk"
      ]
    },
    {
      category: "coast",
      category_label: "Coast & Water",
      description: "a 60 m curtain of water pours off a mossy basalt cliff into mist, a rainbow in the spray",
      fallback: "ocean",
      name: "waterfall",
      studio: true,
      tags: [
        "iceland",
        "waterfall",
        "rainbow",
        "mist",
        "cliff",
        "river"
      ],
      title: "Sk\xF3gafoss",
      variants: [
        "summer",
        "winter",
        "midnight"
      ]
    },
    {
      category: "wilds",
      category_label: "Mountains & Wild",
      description: "red and gold maples around a still lake, mist on the water, leaves drifting down",
      fallback: "alpine",
      name: "autumn",
      studio: true,
      tags: [
        "autumn",
        "maple",
        "lake",
        "reflection",
        "leaves",
        "mist",
        "fall",
        "forest"
      ],
      title: "Maple Lake",
      variants: [
        "morning",
        "golden",
        "rain"
      ]
    },
    {
      category: "wilds",
      category_label: "Mountains & Wild",
      description: "the path through Kyoto's bamboo grove, tall culms swaying and meeting overhead",
      fallback: "canopy",
      name: "bamboo",
      studio: true,
      tags: [
        "bamboo",
        "forest",
        "kyoto",
        "lanterns",
        "rain"
      ],
      title: "Arashiyama Bamboo",
      variants: [
        "day",
        "rain",
        "lantern"
      ]
    },
    {
      category: "wilds",
      category_label: "Mountains & Wild",
      description: "the Tre Cime towers above green alpine meadows and a lone hut as cloud drifts past",
      fallback: "alpine",
      name: "dolomites",
      studio: true,
      tags: [
        "mountains",
        "meadow",
        "alpenglow",
        "stars",
        "italy"
      ],
      title: "Dolomites Alpenglow",
      variants: [
        "alpenglow",
        "midday",
        "starry"
      ]
    },
    {
      category: "wilds",
      category_label: "Mountains & Wild",
      description: "knife-edged Saharan dunes, sand streaming off the crests, a camel caravan crossing",
      fallback: "sand",
      name: "dunes",
      studio: true,
      tags: [
        "desert",
        "sand",
        "dunes",
        "caravan",
        "sahara"
      ],
      title: "Sahara Dunes",
      variants: [
        "golden",
        "noon",
        "moonlit"
      ]
    },
    {
      category: "wilds",
      category_label: "Mountains & Wild",
      description: "sheer walls dropping into a still green fjord as a ferry draws its wake past the falls",
      fallback: "alpine",
      name: "fjord",
      studio: true,
      tags: [
        "fjord",
        "waterfall",
        "mountains",
        "snow",
        "aurora",
        "norway"
      ],
      title: "Norwegian Fjord",
      variants: [
        "summer",
        "winter",
        "overcast"
      ]
    },
    {
      category: "wilds",
      category_label: "Mountains & Wild",
      description: "a lava channel crossing black pahoehoe to the sea, the steam plume glowing above the surf",
      fallback: "lava",
      name: "kilauea",
      studio: true,
      tags: [
        "volcano",
        "lava",
        "ocean",
        "steam",
        "hawaii",
        "night"
      ],
      title: "Kilauea Lava",
      variants: [
        "night",
        "dusk",
        "eruption"
      ]
    },
    {
      category: "wilds",
      category_label: "Mountains & Wild",
      description: "the Mittens and Merrick Butte rising from red sand, a dirt road leading in",
      fallback: "alpine",
      name: "mesa",
      studio: true,
      tags: [
        "desert",
        "buttes",
        "red rock",
        "star trails",
        "arizona"
      ],
      title: "Monument Valley",
      variants: [
        "sunset",
        "noon",
        "night"
      ]
    },
    {
      category: "wilds",
      category_label: "Mountains & Wild",
      description: "shafts of morning sun slanting through fog between old-growth redwood trunks",
      fallback: "canopy",
      name: "redwoods",
      studio: true,
      tags: [
        "forest",
        "fog",
        "god-rays",
        "california"
      ],
      title: "Redwood Fog",
      variants: [
        "morning",
        "overcast",
        "dusk"
      ]
    },
    {
      category: "wilds",
      category_label: "Mountains & Wild",
      description: "cherry trees arching over a Meguro canal, petals drifting onto the water below",
      fallback: "canopy",
      name: "sakura",
      studio: true,
      tags: [
        "sakura",
        "cherry blossom",
        "canal",
        "petals",
        "lanterns",
        "spring",
        "japan",
        "tokyo"
      ],
      title: "Cherry Blossom Canal",
      variants: [
        "day",
        "night",
        "rain"
      ]
    },
    {
      category: "wilds",
      category_label: "Mountains & Wild",
      description: "rolling Val d'Orcia hills, a cypress-lined road up to a farmhouse, fog in the valleys",
      fallback: "meadow",
      name: "tuscany",
      studio: true,
      tags: [
        "hills",
        "cypress",
        "farmhouse",
        "fog",
        "italy"
      ],
      title: "Tuscan Hills",
      variants: [
        "dawn",
        "summer",
        "autumn"
      ]
    },
    {
      category: "wilds",
      category_label: "Mountains & Wild",
      description: "El Capitan, Half Dome and Bridalveil Fall from Tunnel View as cloud drifts up the valley",
      fallback: "alpine",
      name: "yosemite",
      studio: true,
      tags: [
        "granite",
        "valley",
        "waterfall",
        "clouds",
        "california"
      ],
      title: "Yosemite Valley",
      variants: [
        "morning",
        "sunset",
        "winter"
      ]
    },
    {
      category: "weather",
      category_label: "Weather & Sky",
      description: "sunrise from a rocky summit over a sea of cloud, far peaks standing out like islands",
      fallback: "clouds",
      name: "cloudsea",
      studio: true,
      tags: [
        "mountains",
        "clouds",
        "sunrise",
        "summit",
        "inversion"
      ],
      title: "Above the Cloud Sea",
      variants: [
        "sunrise",
        "sunset",
        "moon"
      ]
    },
    {
      category: "weather",
      category_label: "Weather & Sky",
      description: "totality over open country: the corona, the diamond ring, a sunset on every horizon",
      fallback: "starfield",
      name: "eclipse",
      studio: true,
      tags: [
        "eclipse",
        "corona",
        "totality",
        "diamond ring",
        "sky"
      ],
      title: "Total Solar Eclipse",
      variants: [
        "totality",
        "desert",
        "mountain"
      ]
    },
    {
      category: "weather",
      category_label: "Weather & Sky",
      description: "the Golden Gate's towers rising out of a rolling fog bank, the city faint beyond",
      fallback: "clouds",
      name: "goldengate",
      studio: true,
      tags: [
        "san francisco",
        "bridge",
        "fog",
        "karl the fog",
        "ocean"
      ],
      title: "Fog over the Golden Gate",
      variants: [
        "morning",
        "sunset",
        "night"
      ]
    },
    {
      category: "weather",
      category_label: "Weather & Sky",
      description: "the galactic core rising over Joshua trees and granite boulders in the Mojave",
      fallback: "starfield",
      name: "milkyway",
      studio: true,
      tags: [
        "stars",
        "milky way",
        "desert",
        "night",
        "meteors",
        "astrophotography"
      ],
      title: "Milky Way over Joshua Tree",
      variants: [
        "summer",
        "winter",
        "moonrise"
      ]
    },
    {
      category: "weather",
      category_label: "Weather & Sky",
      description: "an old lamp by a footpath in a snowy pine wood, its warm cone full of falling snow",
      fallback: "frost",
      name: "snowfall",
      studio: true,
      tags: [
        "snow",
        "forest",
        "night",
        "lamp",
        "winter",
        "pines"
      ],
      title: "Snowfall in the Pines",
      variants: [
        "night",
        "bluehour",
        "blizzard"
      ]
    },
    {
      category: "weather",
      category_label: "Weather & Sky",
      description: "a rotating supercell towers over golden wheat, rain shaft and wall cloud, a lone farm",
      fallback: "clouds",
      name: "supercell",
      studio: true,
      tags: [
        "storm",
        "supercell",
        "tornado alley",
        "wheat",
        "lightning"
      ],
      title: "Great Plains Supercell",
      variants: [
        "afternoon",
        "dusk",
        "night"
      ]
    },
    {
      category: "weather",
      category_label: "Weather & Sky",
      description: "a rain-streaked window at night, the wet city street beyond melted into bokeh",
      fallback: "rain",
      name: "windowrain",
      studio: true,
      tags: [
        "rain",
        "city",
        "night",
        "bokeh",
        "window",
        "neon"
      ],
      title: "Rain on the Window",
      variants: [
        "city",
        "dusk",
        "neon"
      ]
    },
    {
      category: "city",
      category_label: "Cities & Streets",
      description: "long-exposure light trails on a curving LA freeway, downtown towers glowing in the haze",
      fallback: "traffic",
      name: "freeway",
      studio: true,
      tags: [
        "los-angeles",
        "freeway",
        "light-trails",
        "long-exposure",
        "skyline",
        "palms"
      ],
      title: "LA Freeway Timelapse",
      variants: [
        "dusk",
        "night",
        "rain"
      ]
    },
    {
      category: "city",
      category_label: "Cities & Streets",
      description: "waves bursting over Havana's seawall at sunset, 1950s cars under faded colonial arcades",
      fallback: "city",
      name: "havana",
      studio: true,
      tags: [
        "havana",
        "cuba",
        "seawall",
        "waves",
        "sunset",
        "vintage cars"
      ],
      title: "Havana Malec\xF3n",
      variants: [
        "sunset",
        "day",
        "storm"
      ]
    },
    {
      category: "city",
      category_label: "Cities & Streets",
      description: "Hong Kong Island's towers across Victoria Harbour, lights streaking on the water",
      fallback: "city",
      name: "hongkong",
      studio: true,
      tags: [
        "hong kong",
        "skyline",
        "harbour",
        "night",
        "reflections",
        "ferry"
      ],
      title: "Victoria Harbour",
      variants: [
        "night",
        "bluehour",
        "fog"
      ]
    },
    {
      category: "city",
      category_label: "Cities & Streets",
      description: "wooden water towers over Chelsea rooftops as dusk settles on the Midtown skyline",
      fallback: "city",
      name: "manhattan",
      studio: true,
      tags: [
        "new york",
        "rooftops",
        "water towers",
        "skyline",
        "dusk",
        "empire state"
      ],
      title: "Manhattan Rooftops",
      variants: [
        "dusk",
        "night",
        "snow"
      ]
    },
    {
      category: "city",
      category_label: "Cities & Streets",
      description: "neon signs stacked over a wet Mong Kok street, red taxis and buses passing below",
      fallback: "city",
      name: "mongkok",
      studio: true,
      tags: [
        "hong kong",
        "neon",
        "signs",
        "street",
        "taxi",
        "bus",
        "rain",
        "night",
        "city"
      ],
      title: "Mong Kok Neon",
      variants: [
        "rain",
        "night",
        "fog"
      ]
    },
    {
      category: "city",
      category_label: "Cities & Streets",
      description: "a Haussmann street running to the Eiffel Tower, a caf\xE9 glowing under its awning",
      fallback: "lanterns",
      name: "paris",
      studio: true,
      tags: [
        "paris",
        "cafe",
        "eiffel tower",
        "haussmann",
        "cobblestones",
        "rain",
        "autumn"
      ],
      title: "Paris Caf\xE9 Street",
      variants: [
        "rain",
        "autumn",
        "night"
      ]
    },
    {
      category: "city",
      category_label: "Cities & Streets",
      description: "the Shibuya scramble from above: crowds surge across every stripe when the lights change",
      fallback: "city",
      name: "shibuya",
      studio: true,
      tags: [
        "tokyo",
        "crossing",
        "crowd",
        "neon",
        "screens",
        "rain",
        "night"
      ],
      title: "Shibuya Scramble",
      variants: [
        "rain",
        "night",
        "day"
      ]
    },
    {
      category: "city",
      category_label: "Cities & Streets",
      description: "a narrow Shinjuku yokocho at night: stacked signs, red lanterns, wet asphalt mirroring it",
      fallback: "city",
      name: "tokyo",
      studio: true,
      tags: [
        "tokyo",
        "alley",
        "rain",
        "lanterns",
        "signs",
        "night",
        "japan"
      ],
      title: "Shinjuku Alley in the Rain",
      variants: [
        "rain",
        "clear",
        "snow"
      ]
    },
    {
      category: "city",
      category_label: "Cities & Streets",
      description: "golden-hour countryside streaming past a train window, poles flicking by, the sun low",
      fallback: "drive",
      name: "trainwindow",
      studio: true,
      tags: [
        "train",
        "countryside",
        "golden-hour",
        "parallax",
        "travel",
        "reflection"
      ],
      title: "Train Window",
      variants: [
        "golden",
        "night",
        "snow"
      ]
    },
    {
      category: "city",
      category_label: "Cities & Streets",
      description: "a narrow Venetian rio between weathered palazzi, a gondola drifting under a stone bridge",
      fallback: "ripple",
      name: "venice",
      studio: true,
      tags: [
        "venice",
        "canal",
        "gondola",
        "bridge",
        "reflections",
        "italy"
      ],
      title: "Venice Canal",
      variants: [
        "morning",
        "sunset",
        "night"
      ]
    },
    {
      category: "cozy",
      category_label: "Cozy & Interiors",
      description: "a steaming cup at a cafe window, the rainy street outside melting into bokeh",
      fallback: "rain",
      name: "cafe",
      studio: true,
      tags: [
        "cafe",
        "coffee",
        "steam",
        "rain",
        "bokeh",
        "window",
        "interior"
      ],
      title: "Coffee Shop Window",
      variants: [
        "rain",
        "snow",
        "morning"
      ]
    },
    {
      category: "cozy",
      category_label: "Cozy & Interiors",
      description: "a crackling fire in a fieldstone hearth, snow falling past the cabin window",
      fallback: "campfire",
      name: "fireplace",
      studio: true,
      tags: [
        "fire",
        "cabin",
        "stone",
        "snow",
        "winter",
        "warm",
        "interior"
      ],
      title: "Cabin Fireplace",
      variants: [
        "snow",
        "rain",
        "autumn"
      ]
    },
    {
      category: "cozy",
      category_label: "Cozy & Interiors",
      description: "an old reading room: towering shelves, a green banker's lamp, a candle, dust in the air",
      fallback: "den",
      name: "library",
      studio: true,
      tags: [
        "library",
        "books",
        "candle",
        "lamp",
        "dust",
        "rain",
        "interior"
      ],
      title: "Candlelit Library",
      variants: [
        "candle",
        "dawn",
        "storm"
      ]
    },
    {
      category: "cozy",
      category_label: "Cozy & Interiors",
      description: "a desk lamp and a laptop's glow, a cat asleep by a rainy window over the city",
      fallback: "den",
      name: "lofi",
      studio: true,
      tags: [
        "lofi",
        "desk",
        "lamp",
        "laptop",
        "cat",
        "rain",
        "window",
        "study",
        "night"
      ],
      title: "Late Night Desk",
      variants: [
        "rain",
        "snow",
        "dawn"
      ]
    },
    {
      category: "cozy",
      category_label: "Cozy & Interiors",
      description: "an outdoor hot spring steaming among snowy rocks, stone lanterns glowing by the pines",
      fallback: "campfire",
      name: "onsen",
      studio: true,
      tags: [
        "onsen",
        "hot spring",
        "steam",
        "snow",
        "lanterns",
        "pines",
        "japan",
        "mountains"
      ],
      title: "Mountain Onsen",
      variants: [
        "snow",
        "night",
        "autumn"
      ]
    },
    {
      category: "cozy",
      category_label: "Cozy & Interiors",
      description: "a screened Southern porch at dusk: rain off the eaves, a rocking chair, fireflies after",
      fallback: "fireflies",
      name: "porch",
      studio: true,
      tags: [
        "porch",
        "south",
        "storm",
        "rain",
        "fireflies",
        "lightning",
        "dusk"
      ],
      title: "Summer Storm Porch",
      variants: [
        "storm",
        "fireflies",
        "night"
      ]
    },
    {
      category: "cozy",
      category_label: "Cozy & Interiors",
      description: "a bowl steaming on a ramen counter under paper lanterns, rain beyond the noren",
      fallback: "city",
      name: "ramen",
      studio: true,
      tags: [
        "ramen",
        "noodles",
        "steam",
        "lanterns",
        "noren",
        "rain",
        "japan",
        "night",
        "interior"
      ],
      title: "Ramen Counter",
      variants: [
        "rain",
        "night",
        "snow"
      ]
    },
    {
      category: "space",
      category_label: "Space",
      description: "a black hole's accretion disk bent around its shadow, one side Doppler-bright",
      fallback: "nebula",
      name: "blackhole",
      studio: true,
      tags: [
        "black hole",
        "accretion disk",
        "lensing",
        "relativity",
        "space"
      ],
      title: "Black Hole",
      variants: [
        "amber",
        "blue",
        "edge-on"
      ]
    },
    {
      category: "space",
      category_label: "Space",
      description: "the Earth hanging over the lunar horizon, craters stretching long shadows below",
      fallback: "starfield",
      name: "earthrise",
      studio: true,
      tags: [
        "earth",
        "moon",
        "earthrise",
        "apollo",
        "craters",
        "eclipse",
        "space"
      ],
      title: "Earthrise",
      variants: [
        "apollo",
        "crescent",
        "eclipse"
      ]
    },
    {
      category: "space",
      category_label: "Space",
      description: "the curved limb of the Earth from orbit: city lights, clouds, airglow, an orbital sunrise",
      fallback: "starfield",
      name: "iss",
      studio: true,
      tags: [
        "earth",
        "orbit",
        "iss",
        "city lights",
        "aurora",
        "sunrise"
      ],
      title: "Earth from the ISS",
      variants: [
        "night",
        "sunrise",
        "day"
      ]
    },
    {
      category: "space",
      category_label: "Space",
      description: "Jupiter's banded storms and the Great Red Spot, Io's shadow crossing the clouds",
      fallback: "orbits",
      name: "jupiter",
      studio: true,
      tags: [
        "jupiter",
        "planet",
        "storms",
        "great red spot",
        "io",
        "aurora",
        "juno",
        "space"
      ],
      title: "Jupiter",
      variants: [
        "voyager",
        "juno",
        "aurora"
      ]
    },
    {
      category: "space",
      category_label: "Space",
      description: "a huge orange moon lifting off the sea, its glittering path running in to a dark shore",
      fallback: "ocean",
      name: "moonrise",
      studio: true,
      tags: [
        "moon",
        "ocean",
        "night",
        "glitter",
        "clouds",
        "pine"
      ],
      title: "Moonrise over the Ocean",
      variants: [
        "harvest",
        "full",
        "crescent"
      ]
    },
    {
      category: "space",
      category_label: "Space",
      description: "Saturn and its rings from Cassini: ring shadows on the clouds, a moon on its orbit",
      fallback: "orbits",
      name: "saturn",
      studio: true,
      tags: [
        "saturn",
        "rings",
        "planet",
        "cassini",
        "moon",
        "space"
      ],
      title: "Cassini at Saturn",
      variants: [
        "sunlit",
        "backlit",
        "equinox"
      ]
    },
    {
      category: "space",
      category_label: "Space",
      description: "green aurora curtains rippling over a snowy Norwegian fjord and its village lights",
      fallback: "aurora",
      name: "tromso",
      studio: true,
      tags: [
        "aurora",
        "northern lights",
        "fjord",
        "norway",
        "snow",
        "night"
      ],
      title: "Aurora over Troms\xF8",
      variants: [
        "green",
        "vivid",
        "faint"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "rain on glass, droplet trails and splashes",
      fallback: null,
      name: "rain",
      studio: false,
      tags: [
        "nature",
        "landscape"
      ],
      title: "rain",
      variants: [
        "night",
        "storm",
        "neon",
        "window-day"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "warp-speed stars flying from center",
      fallback: null,
      name: "starfield",
      studio: false,
      tags: [
        "space"
      ],
      title: "starfield",
      variants: [
        "classic",
        "ice",
        "warm",
        "void"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "Doom-style fire with a tuned palette",
      fallback: null,
      name: "fire",
      studio: false,
      tags: [
        "demoscene",
        "retro"
      ],
      title: "fire",
      variants: [
        "classic",
        "inferno",
        "emerald",
        "frost"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "Windows 95 pipes screensaver homage",
      fallback: null,
      name: "pipes",
      studio: false,
      tags: [
        "demoscene",
        "retro"
      ],
      title: "pipes",
      variants: [
        "classic",
        "pastel",
        "mono",
        "hotmetal"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "classic demoscene plasma, hue-cycling sine waves",
      fallback: null,
      name: "plasma",
      studio: false,
      tags: [
        "demoscene",
        "retro"
      ],
      title: "plasma",
      variants: [
        "rainbow",
        "cool",
        "warm",
        "acid"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "northern lights over a starry night sky",
      fallback: null,
      name: "aurora",
      studio: false,
      tags: [
        "nature",
        "landscape"
      ],
      title: "aurora",
      variants: [
        "classic",
        "crimson",
        "arctic"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "Conway's Game of Life with cooling trails, auto-reseed",
      fallback: null,
      name: "life",
      studio: false,
      tags: [
        "generative",
        "simulation"
      ],
      title: "life",
      variants: [
        "classic",
        "ember",
        "ice"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "flocking birds with trails, wrap-around edges",
      fallback: null,
      name: "boids",
      studio: false,
      tags: [
        "generative",
        "simulation"
      ],
      title: "boids",
      variants: [
        "ice",
        "sunset",
        "mono"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "lava-lamp metaballs, deep red to yellow-hot",
      fallback: null,
      name: "lava",
      studio: false,
      tags: [
        "generative",
        "simulation"
      ],
      title: "lava",
      variants: [
        "classic",
        "basalt",
        "toxic"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "texture-mapped tunnel flight, demoscene style",
      fallback: null,
      name: "tunnel",
      studio: false,
      tags: [
        "demoscene",
        "retro"
      ],
      title: "tunnel",
      variants: [
        "classic",
        "inferno",
        "mono"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "the bouncing DVD logo meme",
      fallback: null,
      name: "dvd",
      studio: false,
      tags: [
        "demoscene",
        "retro"
      ],
      title: "dvd",
      variants: [
        "classic",
        "pastel",
        "hot"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "lo-fi deadpan TV bumpers, white on black",
      fallback: null,
      name: "bump",
      studio: false,
      tags: [
        "demoscene",
        "retro"
      ],
      title: "bump",
      variants: [
        "classic",
        "amber",
        "green"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "tree canopy growing from above, organic branching",
      fallback: null,
      name: "canopy",
      studio: false,
      tags: [
        "nature",
        "landscape"
      ],
      title: "canopy",
      variants: [
        "spring",
        "deep-green",
        "mono",
        "blossom"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "grand-finale fireworks: crackle, crossettes, salvos",
      fallback: null,
      name: "finale",
      studio: false,
      tags: [
        "urban",
        "night"
      ],
      title: "finale",
      variants: [
        "festive",
        "royal",
        "ember",
        "mono-gold"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "night ocean swells under a moonlit glint path",
      fallback: null,
      name: "ocean",
      studio: false,
      tags: [
        "water",
        "nature"
      ],
      title: "ocean",
      variants: [
        "moonlit",
        "storm",
        "golden"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "circuit-board traces with zipping data pulses",
      fallback: null,
      name: "circuits",
      studio: false,
      tags: [
        "machines"
      ],
      title: "circuits",
      variants: [
        "pcb",
        "blueprint",
        "dark"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "daytime sky with drifting fractal clouds",
      fallback: null,
      name: "clouds",
      studio: false,
      tags: [
        "nature",
        "landscape"
      ],
      title: "clouds",
      variants: [
        "day",
        "sunset",
        "storm"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "Mandelbrot deep zoom into seahorse valley",
      fallback: null,
      name: "mandel",
      studio: false,
      tags: [
        "demoscene",
        "retro"
      ],
      title: "mandel",
      variants: [
        "classic",
        "fire",
        "mono"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "meteor shower with ion trails and bolides",
      fallback: null,
      name: "meteors",
      studio: false,
      tags: [
        "space"
      ],
      title: "meteors",
      variants: [
        "night",
        "warm",
        "cold"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "koi pond from above: ripples, lily pads, gliding fish",
      fallback: null,
      name: "koi",
      studio: false,
      tags: [
        "water",
        "nature"
      ],
      title: "koi",
      variants: [
        "teal",
        "ink",
        "garden",
        "pond-blue",
        "midnight"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "falling-sand automaton piling stratified dunes",
      fallback: null,
      name: "sand",
      studio: false,
      tags: [
        "generative",
        "simulation"
      ],
      title: "sand",
      variants: [
        "sandstone",
        "mono",
        "ocean"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "rainy neon metropolis with lightning and traffic",
      fallback: null,
      name: "city",
      studio: false,
      tags: [
        "urban",
        "night"
      ],
      title: "city",
      variants: [
        "neon",
        "noir",
        "dusk",
        "realistic"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "deep underwater: god rays, fish schools, leviathans",
      fallback: null,
      name: "abyss",
      studio: false,
      tags: [
        "water",
        "nature"
      ],
      title: "abyss",
      variants: [
        "deep",
        "trench",
        "twilight",
        "reef"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "a cozy room with a CRT playing other scenes",
      fallback: null,
      name: "den",
      studio: false,
      tags: [
        "cozy"
      ],
      title: "den",
      variants: [
        "night",
        "evening",
        "rain-outside"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "aerial night traffic, long-exposure light streams",
      fallback: null,
      name: "traffic",
      studio: false,
      tags: [
        "urban",
        "night"
      ],
      title: "traffic",
      variants: [
        "night",
        "dusk",
        "rain-slick"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "glowing nodes linked into a drifting graph, pulses riding edges",
      fallback: null,
      name: "nexus",
      studio: false,
      tags: [
        "generative",
        "simulation"
      ],
      title: "nexus",
      variants: [
        "cyan",
        "amber",
        "violet",
        "mono"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "still black water: raindrop rings, drifting leaves, night breeze",
      fallback: null,
      name: "ripple",
      studio: false,
      tags: [
        "water",
        "nature"
      ],
      title: "ripple",
      variants: [
        "teal",
        "silver",
        "ink"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "amber fireflies drifting over a black meadow",
      fallback: null,
      name: "fireflies",
      studio: false,
      tags: [
        "nature",
        "landscape"
      ],
      title: "fireflies",
      variants: [
        "amber",
        "emerald",
        "ice"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "paper lanterns rising through a black festival night",
      fallback: null,
      name: "lanterns",
      studio: false,
      tags: [
        "cozy"
      ],
      title: "lanterns",
      variants: [
        "warm",
        "jade",
        "violet"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "a thin smoke ribbon curling up from a glowing ember",
      fallback: null,
      name: "incense",
      studio: false,
      tags: [
        "cozy"
      ],
      title: "incense",
      variants: [
        "sandalwood",
        "temple",
        "midnight",
        "zen"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "fern-like frost crystals creeping across black glass",
      fallback: null,
      name: "frost",
      studio: false,
      tags: [
        "nature",
        "landscape"
      ],
      title: "frost",
      variants: [
        "ice",
        "aurora",
        "mono"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "planets tracing luminous orbital trails around a star",
      fallback: null,
      name: "orbits",
      studio: false,
      tags: [
        "space"
      ],
      title: "orbits",
      variants: [
        "solar",
        "binary",
        "ice"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "silk ribbons flowing across the dark",
      fallback: null,
      name: "ribbons",
      studio: false,
      tags: [
        "generative",
        "simulation"
      ],
      title: "ribbons",
      variants: [
        "silk",
        "ember",
        "ocean"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "phosphor radar sweep lighting up drifting contacts",
      fallback: null,
      name: "sonar",
      studio: false,
      tags: [
        "machines"
      ],
      title: "sonar",
      variants: [
        "green",
        "amber",
        "cyan"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "luminous contour ridges morphing like a slow signal",
      fallback: null,
      name: "tide",
      studio: false,
      tags: [
        "generative",
        "simulation"
      ],
      title: "tide",
      variants: [
        "pulse",
        "ice",
        "ember"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "interlocking brass gears turning in the dark",
      fallback: null,
      name: "clockwork",
      studio: false,
      tags: [
        "machines"
      ],
      title: "clockwork",
      variants: [
        "brass",
        "steel",
        "verdigris"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "synthwave perspective grid rolling to the horizon",
      fallback: null,
      name: "grid",
      studio: false,
      tags: [
        "demoscene",
        "retro"
      ],
      title: "grid",
      variants: [
        "vapor",
        "lime",
        "mono"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "ink blooming through still black water",
      fallback: null,
      name: "inkdrop",
      studio: false,
      tags: [
        "generative",
        "simulation"
      ],
      title: "inkdrop",
      variants: [
        "indigo",
        "crimson",
        "sepia"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "stained-glass cells breathing and flashing on black",
      fallback: null,
      name: "mosaic",
      studio: false,
      tags: [
        "generative",
        "simulation"
      ],
      title: "mosaic",
      variants: [
        "cathedral",
        "ocean",
        "mono"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "glowing spiro curves drawing themselves, then fading",
      fallback: null,
      name: "harmonograph",
      studio: false,
      tags: [
        "generative",
        "simulation"
      ],
      title: "harmonograph",
      variants: [
        "prism",
        "gold",
        "ice"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "deep-space clouds drifting in parallax layers",
      fallback: null,
      name: "nebula",
      studio: false,
      tags: [
        "space"
      ],
      title: "nebula",
      variants: [
        "emission",
        "crimson",
        "void"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "pendulum-wave interference, glowing bobs on faint strings",
      fallback: null,
      name: "pendulum",
      studio: false,
      tags: [
        "generative",
        "simulation"
      ],
      title: "pendulum",
      variants: [
        "chrome",
        "amber",
        "ice"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "reaction-diffusion coral growing and splitting on black",
      fallback: null,
      name: "reaction",
      studio: false,
      tags: [
        "generative",
        "simulation"
      ],
      title: "reaction",
      variants: [
        "coral",
        "acid",
        "ice"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "windswept night grass, dew glints, shooting stars",
      fallback: null,
      name: "meadow",
      studio: false,
      tags: [
        "nature",
        "landscape"
      ],
      title: "meadow",
      variants: [
        "moonlit",
        "amber",
        "jade"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "realistic sky over fields with planes, contrails, and low passes",
      fallback: null,
      name: "airspace",
      studio: false,
      tags: [
        "nature",
        "landscape"
      ],
      title: "airspace",
      variants: [
        "day",
        "golden",
        "dusk",
        "coast",
        "storm",
        "night",
        "winter",
        "busy"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "side-view tank: caustics, fish, bubbles, drifting plants",
      fallback: null,
      name: "aquarium",
      studio: false,
      tags: [
        "water",
        "nature"
      ],
      title: "aquarium",
      variants: [
        "tropical",
        "freshwater",
        "moonlit",
        "mono"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "driver POV at night: road scrolls, scenery rushes past",
      fallback: null,
      name: "drive",
      studio: false,
      tags: [
        "urban",
        "night"
      ],
      title: "drive",
      variants: [
        "night",
        "dusk",
        "rain",
        "neon"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "saturated sugar-rush orbs on a neon gradient",
      fallback: null,
      name: "candy",
      studio: false,
      tags: [
        "generative",
        "simulation"
      ],
      title: "candy",
      variants: [
        "classic",
        "sour",
        "pastel",
        "mono"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "endless ink-wash mountain scroll unrolling upward, made for portrait screens",
      fallback: null,
      name: "scroll",
      studio: false,
      tags: [
        "nature",
        "landscape"
      ],
      title: "scroll",
      variants: [
        "sumi",
        "night",
        "indigo"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "alpine lake at dusk: parallax ridges under a sinking sun, a mirrored lake, a lone canoe",
      fallback: null,
      name: "alpine",
      studio: false,
      tags: [
        "nature",
        "landscape"
      ],
      title: "alpine",
      variants: [
        "dusk",
        "dawn",
        "storm"
      ]
    },
    {
      category: "classic",
      category_label: "Classic",
      description: "night campfire in the forest: flame, embers, smoke, and a figure poking the fire",
      fallback: null,
      name: "campfire",
      studio: false,
      tags: [
        "cozy"
      ],
      title: "campfire",
      variants: [
        "pine",
        "autumn",
        "snow"
      ]
    }
  ],
  version: "0.1.0"
};

// assets/themes/builtin.json
var builtin_default = [
  {
    slug: "clean",
    shelf: "Start",
    yours: false,
    code: "tp1:JYyxCsMwDAV_RWgOha5eu_cHSgfhPCcGWzayQltK_72GbMcd3JdTsyrO4bqwSgUHvhWI8sJy-N5sCofVLh025YoRLXfPTWe5N9pMViykjboUuJ-MlBB9BPIdNCIUhLdELx-SQdkpD1pNXnqZT5dtcHiw4nCTws_fHw",
    theme: {
      format: 1,
      name: "Clean",
      author: "termpaper",
      description: "No grade, no palette, no effects: the scene exactly as it is drawn.",
      tags: [
        "neutral"
      ]
    }
  },
  {
    slug: "bleach-bypass",
    shelf: "Cinematic",
    yours: false,
    code: "tp1:TZDBasQwDER_xeicDVvapZDj_kKPpQfhyIlZxw6SnDYs-fcq2S305tHgNyPdIRSeUKF7aSDjRNDBNRH60V3XGUWgAaw6FjZDiacZZ2Ib9iSe46yxZHM-YlqIT0yKMVPvQkxT575RRupPparzJZXKjRuRexNZGUVNEi6rk1skaQ2qOAh0n-ANYqWit9nAUXWFr_2FvfW7g6BWxkf0ub1cGvgj2hrtq2n6mYtUpt23xcLx8dye3zbzQiCvcoAU_W0PNHTMFrbEIZMqPePiI-Df3OS7McRTPqo8TybVruIppZ2BHDFbFcBgF8vFam7bLw",
    theme: {
      format: 1,
      name: "Bleach Bypass",
      author: "termpaper",
      description: "Silver-retained film: washed-out colour, hard contrast, heavy skies.",
      tags: [
        "cinematic",
        "gritty"
      ],
      grade: {
        saturation: 0.55,
        contrast: 1.35,
        exposure: 0.1,
        fade: 0.04
      },
      effects: {
        stack: [
          "grain",
          "vignette"
        ],
        grain: 0.5,
        vignette: 0.7
      },
      scene: {
        name: "supercell",
        variant: "afternoon"
      }
    }
  },
  {
    slug: "faded-film",
    shelf: "Cinematic",
    yours: false,
    code: "tp1:LZBNbsQgDIWvgrxGUTqqqja7buYSVRcuOAlq-JExncUod69hZgU8np8_-w5r5ogCy4uFhJFggSt68uYajggWsMmeWVUhjgULsYqequNQJOSkP5_J5MObwiHJYo6wipb_HOh-qzU165ONy0dubA2aG3I0DqsYTN5sjCFNGim4VVi-wIVEyhOcan8aiBvBtwX1eWW7Q0VpjI_O8_RuweUkrHH9-aE5FJWxm6grOtU6KvX6aqHu6POt9qC9qXqZ52nWIWNuaSRcztMCrSs5Ga4qOkbnGqBPkjB6v6mzOkoD67m6ghxqJ9cTe2LfX4sJzvMf",
    theme: {
      format: 1,
      name: "Faded Film",
      author: "termpaper",
      description: "An old print: lifted blacks, softer colour, a warm cast and grain.",
      tags: [
        "cinematic",
        "vintage"
      ],
      grade: {
        saturation: 0.8,
        contrast: 0.9,
        temperature: 0.1,
        fade: 0.14,
        shadows: {
          hue: 200,
          amount: 0.2
        }
      },
      effects: {
        stack: [
          "grain"
        ],
        grain: 0.6
      },
      scene: {
        name: "paris",
        variant: "autumn"
      }
    }
  },
  {
    slug: "golden-hour",
    shelf: "Cinematic",
    yours: false,
    code: "tp1:RZBLbsMwDESvQnBtGO7HXfgC7QG6K7pgZNoSqo8hUUmLwHcv5QTtbjQcDR55xSXlQILTQ4eRAuOEr8nPHOEt1YwdUhWbstrCOWy0cTNnLia7TVyKOnm3DJ6KwIVyAO9WK5AWELVn-pmAwokzWPWPWQGKMxCUtAgszgdYfbr0Wiu0Fpw-0LjICuWMeq0TPztcM81Kd0X-3lKpWfXQK_TZnTJFczwfR-3goIwk98Rzs1yUpgfV_xSty1YNPY39oHuGVG-xcd875GVhcwsVIfPVsCx5OlZWnD-tH140XwzHA-9-xMCFlP5M2VGrxVJjYcF9_wU",
    theme: {
      format: 1,
      name: "Golden Hour",
      author: "termpaper",
      description: "The last warm light of the day: amber highlights and a soft film glow.",
      tags: [
        "cinematic",
        "warm"
      ],
      grade: {
        exposure: 0.1,
        vibrance: 0.25,
        temperature: 0.45,
        tint: 0.05,
        highlights: {
          hue: 35,
          amount: 0.5
        }
      },
      effects: {
        stack: [
          "halation"
        ],
        halation: 0.6
      },
      scene: {
        name: "mesa",
        variant: "sunset"
      }
    }
  },
  {
    slug: "kodachrome",
    shelf: "Cinematic",
    yours: false,
    code: "tp1:VZBNasQwDIWvYrQ2IQnNJlfortvShcbWxAb_BNnOMAy5e-UwULrwQs9PT5_0gnvmiBXWSUPCSLDCZ7ZoHGcpNGCrLrOolTjuuBOLaKkY9nv1OcnPlzdOq4K1MVayqgRvSd19iKuyRLtiskWrB3JUTwohP6QqlXPa1C00KoNEVtwKrN9gfCLh8Ua0wx_ewo-GjdEK2QveQ6650zAvGkxOlbH0BYZp6T03xmTEPQ6zxFIU5N51KZNIxaEVhB7nmqjzOA6jLBpzS_UyLacG5zcX5NU_48fy3zcvpxiLoXSxva_n8MCEnR7ZY3eCxSec5y8",
    theme: {
      format: 1,
      name: "Kodachrome",
      author: "termpaper",
      description: "Rich, saturated slide film: deep reds, warm yellows, strong blues.",
      tags: [
        "cinematic",
        "vivid"
      ],
      grade: {
        saturation: 1.25,
        contrast: 1.15,
        vibrance: 0.2,
        temperature: 0.12,
        shadows: {
          hue: 200,
          amount: 0.15
        },
        highlights: {
          hue: 45,
          amount: 0.25
        }
      },
      scene: {
        name: "havana",
        variant: "day"
      }
    }
  },
  {
    slug: "moonlight",
    shelf: "Cinematic",
    yours: false,
    code: "tp1:LZDBbsQgDER_BflMo3SrqFWOvfcLqh5c4iRoAadgupVW-feaZE-gYXie8R1mzhEFxmcLCSPBCB_MKfhlFbCAVVbOKgrluOFGWcWJist-E89JX95DJZOafzSOOVjzUz2JNWiCFwlkJsxXytbcvKyqFp7FLIFvhpORlcwxrHRKFlwKjJ_gfCJN5Z1qjanHMQG-LCwZJ415h4JSM54p-u61OZNkLK1M179ZoL-NS81qfuq7F6VT1ALt1ykNg4Wy4sS30nhrVflyGbpee0euSRp32HclzTM5OVxF0F1bxu_AHFug83JYlecoHekey4y6zOwLaYNfzB4bFOYaAuz7Pw",
    theme: {
      format: 1,
      name: "Moonlight",
      author: "termpaper",
      description: "Blue night: cool, quiet, a little darker, with a soft glow on the lights.",
      tags: [
        "cinematic",
        "cool",
        "night"
      ],
      grade: {
        saturation: 0.7,
        contrast: 1.08,
        exposure: -0.3,
        temperature: -0.55,
        shadows: {
          hue: 225,
          amount: 0.5
        }
      },
      effects: {
        stack: [
          "bloom"
        ],
        bloom: 0.5
      },
      scene: {
        name: "moonrise",
        variant: "full"
      }
    }
  },
  {
    slug: "noir",
    shelf: "Cinematic",
    yours: false,
    code: "tp1:TY_RasMwDEV_xejZhA7GGHncB-wHxh40W0lEFznIakMp-fcqbgt91JV8zvUVhqIzGvRvEQRngh6-CytEwJNNRX020nnBhfYwU03Ki3ER33z9YzoGlBzWiY3CyjaFTLSEv31TYxgVWdoFhox6DIO6pHOS4Vih_4HEQl6Ak2dzkQK_EfxV9iZXqGgnxbvt0B0ipCKmWPe-3fsWgYaBktV2a67cic3ptDOPQmb0IHJjfLzkPn46oyaSZnv8f2XJZX1CUBnFfV7ULrBtNw",
    theme: {
      format: 1,
      name: "Noir",
      author: "termpaper",
      description: "Black and white with deep blacks, grain and a dark frame.",
      tags: [
        "cinematic",
        "mono"
      ],
      grade: {
        saturation: 0,
        contrast: 1.4
      },
      effects: {
        stack: [
          "grain",
          "vignette"
        ],
        grain: 0.6,
        vignette: 0.8
      },
      scene: {
        name: "windowrain",
        variant: "city"
      }
    }
  },
  {
    slug: "polaroid",
    shelf: "Cinematic",
    yours: false,
    code: "tp1:XZBBa8MwDIX_itE5K2mho-Qf7Lb72EFzlFgktoOtNISS_z45KRv0EBBfnp7f0wO6mDwKNOcKAnqCBj7jiClyCxXgLC4mZULJTzhRUthStokn4Rj0z0fIgkFMx6NvjOdxWM3PiHbIlUFjVwxvfSIKxmIWw8GII5MdtnFRxYLJm8WxUD6ptWCfofkCy4E0FVtldw6KCb4r6BO2mvABGWVOeCSoT7erbpLXdAVTQRcluldGLdbta_v4fLmYuFnh-Vafai3q43zIL9etAse9G_WTf-H7q25THXUd2UOkV7BDyX7nPpDIHvhv1oXimy2FvcDz1DJni2EtLTExFmfIs_d65237BQ",
    theme: {
      format: 1,
      name: "Polaroid",
      author: "termpaper",
      description: "Instant film: milky blacks, a cyan-green cast in the shadows, warm whites.",
      tags: [
        "cinematic",
        "vintage"
      ],
      grade: {
        saturation: 0.85,
        temperature: 0.2,
        tint: 0.1,
        fade: 0.1,
        shadows: {
          hue: 180,
          amount: 0.25
        },
        highlights: {
          hue: 60,
          amount: 0.2
        }
      },
      effects: {
        stack: [
          "vignette"
        ],
        vignette: 0.5
      },
      scene: {
        name: "tuscany",
        variant: "summer"
      }
    }
  },
  {
    slug: "sepia",
    shelf: "Cinematic",
    yours: false,
    code: "tp1:TZDBbsIwDIZfJTLXCsHoAPUldthx2sGkbhuN2pFjOk2Id5_T7cDN-W3__-fcYRCd0aDbN8A4E3TwTjkhNIA3m0RdMNI5YyZ1sacSNWVLwt55u_YhT2IyKuapdIEW0p8Q5So3DXZTpj6YhIvKNwfkPkQlnLduZDgW6D4gJiYHSNG1JbHL5NUsLPDZgPv2znSHKGyKpYJud6-PBjJeyWztzVJnwHzbV2u4rtabPe3bXTXetHhoXw61OuMR20ut4gnb01CrwQfjseYVU-LRJuh223ONoWGgaKXGFMP4VX0dKvGKO_LK8Afqmm-1T7o_j-5RIvEK-v_BC3GK9coFNaFDd36CcuIRHo9f",
    theme: {
      format: 1,
      name: "Sepia",
      author: "termpaper",
      description: "Old photographs: every colour turned to brown and cream.",
      tags: [
        "cinematic",
        "vintage",
        "mono"
      ],
      grade: {
        contrast: 1.05
      },
      palette: {
        mode: "tint",
        colors: [
          "#1e140c",
          "#4a3423",
          "#8a6a4b",
          "#c7a47f",
          "#f1e1c6"
        ],
        strength: 0.85
      },
      effects: {
        stack: [
          "grain",
          "vignette"
        ],
        grain: 0.4,
        vignette: 0.6
      },
      scene: {
        name: "venice",
        variant: "morning"
      }
    }
  },
  {
    slug: "super-8",
    shelf: "Cinematic",
    yours: false,
    code: "tp1:TZBBasQwDEWvYrQ2YabQMs0Juu-ydCFsxTETy8FWEsqQu1dxWpiFwf6S3__SA4ZcEgr0VwuMiaCHz2WmYm5gARcZc1FJqKQZVVbRU3UlzhIza-UjJzIpr5Fqb0bC9ceEgpGtQbNhScZhlePhsdzNUNTCIHsTprxFDmaMYZz0SO2ULRgq9F_gIpOmik61NbLKBN8WlOw14QMqylLwjHDp3i0MrXDpLrfdAg0DOamtUdDdD-KRRWEjTue3Bovc-IFJ5N9Atf7avTy1Kvb1qe00bDy9vqlfdcQt1t8C5aDodD5vBx9LRNYNQ8iTJ4Z9_wU",
    theme: {
      format: 1,
      name: "Super 8",
      author: "termpaper",
      description: "Home movies: heavy grain, a warm cast, a dark frame and glowing highlights.",
      tags: [
        "cinematic",
        "vintage"
      ],
      grade: {
        saturation: 0.9,
        fade: 0.08
      },
      effects: {
        stack: [
          "warm",
          "halation",
          "grain",
          "vignette"
        ],
        grain: 1.2,
        halation: 0.5,
        vignette: 0.9,
        warm: 0.6
      },
      scene: {
        name: "trainwindow",
        variant: "golden"
      }
    }
  },
  {
    slug: "teal-and-orange",
    shelf: "Cinematic",
    yours: false,
    code: "tp1:XZCxboQwDIZfJfLQCSFoy1Beoku3qoMJhkQEByWGG068e53r6SrdYCWxP__-nStMMa0o0LcVMK4EPXwRBvNiPhPyTFAB7uJi0oJQWjfcKGlypGyT38RHLi2OzBCiXYY9K2XmhCP1RopSdjjGS67MBdNq8uLZII_G-dkFDdEKmuBFApltZ-tqlRecM_TfYD2T2vNWc6VfDxtjgJ8KbjOgv2qCJWEuO9TtawWHH9S61VpT6_M-v5Bu12T70dSNbrXGnaUwXXdW8G_nAb49ce_dqSBNE9k_Kgvapbg8_MwkQsXW416Ulc-W-Gbz_rsu8rxo6CYHJo9FG7hMhvP8BQ",
    theme: {
      format: 1,
      name: "Teal & Orange",
      author: "termpaper",
      description: "The blockbuster grade: teal shadows, warm skin and highlights, a little punch.",
      tags: [
        "cinematic",
        "warm",
        "cool"
      ],
      grade: {
        contrast: 1.12,
        vibrance: 0.2,
        shadows: {
          hue: 190,
          amount: 0.55
        },
        highlights: {
          hue: 30,
          amount: 0.45
        }
      },
      effects: {
        stack: [
          "vignette"
        ],
        vignette: 0.5
      },
      scene: {
        name: "hongkong",
        variant: "night"
      }
    }
  },
  {
    slug: "catppuccin-mocha",
    shelf: "Terminal palettes",
    yours: false,
    code: "tp1:TZCxbsMwDER_RWBWI7ATO0m9du7UsehAy1QsxJIMim6HwP9eSe6QSQfyyHfiE0xghwJ9U4FHR9DDO8qyrFpbrz6CnhAqwFWmwKknxG7BhTgVR4qa7SI2-NT5DEbUglFoVjrMYWUVvEL1i-zUiPxQA0aqlOHglEykXjBRT-TomHYK3iP0X4VjPc4Zk2bTs6-G7wrujGPK-YSIsjLu_OZYdxWY0qmP9XnLEzOJFKcLuQ5ivaRVOR4XzKGhhk6Uaodzcz61bVbdrRuudVa3t6E1-f8HPeDFXLMynT5RUXocL6bNiaIw-btMGX1JZDKGtMSSUVA_MmqYQ3DZvIvkbJMzavIl4f_tNZqc5gfZYsraA6P1sG1_",
    theme: {
      format: 1,
      name: "Catppuccin Mocha",
      author: "termpaper",
      description: "Soft pastel colour on a warm dark base, from the Catppuccin scheme.",
      tags: [
        "terminal",
        "dark",
        "pastel"
      ],
      grade: {
        saturation: 1.05,
        fade: 0.03
      },
      palette: {
        mode: "tint",
        colors: [
          "#1e1e2e",
          "#313244",
          "#585b70",
          "#89b4fa",
          "#cba6f7",
          "#f5c2e7",
          "#cdd6f4"
        ],
        strength: 0.6
      },
      effects: {
        stack: [
          "bloom"
        ],
        bloom: 0.4
      },
      scene: {
        name: "cafe",
        variant: "rain"
      }
    }
  },
  {
    slug: "dracula",
    shelf: "Terminal palettes",
    yours: false,
    code: "tp1:LZBNjoMwDIWvErlbVE0p_WM9R5jdaBYmOBA1JMgJlaqqdx8bqizyZD_7s_0Cl3jCAu2hgogTQQvfjHYJCBXgUsbEEirE04wzsQR7ypb9XHyKkvkZyXwKTLYjTdSaeeE5kMHYm9nHuwl-GItJD2KDpke-m4HpaaKG99Kx4JCh_V0pPmJQiLjk2zrBXwUDYy_DveDhO8ZoRX_tj1LrY1F5eIsbA5Wyuqak7i1bgU0h8YrY1dcaj2eJ7ZqmuZx0y925vtTYqOr629HdVDl3udnV567yap0hF6Y4lFF5Z-GRc2RLVl4uaO8K6EJKk5o3Ic6TOLOluM71OXEefbc8Ff5A9qgrwHoOeL__AQ",
    theme: {
      format: 1,
      name: "Dracula",
      author: "termpaper",
      description: "The Dracula scheme: purple and pink light over a dark grey night.",
      tags: [
        "terminal",
        "dark",
        "purple"
      ],
      grade: {
        vibrance: 0.3,
        tint: 0.1
      },
      palette: {
        mode: "tint",
        colors: [
          "#282a36",
          "#44475a",
          "#6272a4",
          "#bd93f9",
          "#ff79c6",
          "#f8f8f2"
        ],
        strength: 0.6
      },
      effects: {
        stack: [
          "bloom"
        ],
        bloom: 0.5
      },
      scene: {
        name: "shibuya",
        variant: "night"
      }
    }
  },
  {
    slug: "everforest",
    shelf: "Terminal palettes",
    yours: false,
    code: "tp1:LZDRboMwDEV_JXJfacVKV2hfp33FtAeTuBQNEuSYTlXFv8-GPeXqJr73OC-4JR5R4PpWQMSR4AqfD2J1KQsUgLPcE6srxOOEE7GagbLnfpI-Rb35SKM-F2wHch0TxX2LmYLbMpxPQ5o5F44wP12KTu7k6En5oEmCXYbr15reRxwsHPlHjzUJvk1gUKwXZJSZcSstDxcdplF5zCVzdAPpo66yV70UMOFAIuvomCxiuy7AiHit3R1D9V616u2qcGpOwVSNzaluTDWVLy9HU1j7silNhbb19W1VlT8jGmIWptjJ3SjO2pw9xbX3_0eZwm9KIevUA7lHg1Qmjn3sYFn-AA",
    theme: {
      format: 1,
      name: "Everforest",
      author: "termpaper",
      description: "Comfortable green-based forest colours, easy on the eyes.",
      tags: [
        "terminal",
        "dark",
        "green"
      ],
      grade: {
        saturation: 0.9,
        temperature: 0.1,
        tint: -0.1
      },
      palette: {
        mode: "tint",
        colors: [
          "#2d353b",
          "#3d484d",
          "#7a8478",
          "#83c092",
          "#a7c080",
          "#dbbc7f",
          "#d3c6aa"
        ],
        strength: 0.6
      },
      scene: {
        name: "redwoods",
        variant: "morning"
      }
    }
  },
  {
    slug: "gruvbox",
    shelf: "Terminal palettes",
    yours: false,
    code: "tp1:LZDBbsIwDIZfJQrXCpWOMugL7L7rtIObuCWiSSrHhSHUd59doRzyy_nt749fdsgUgW13qGyCiLazX7Tc-_xnKwsLXzNJiZHiDDOSFD0WR2HmkJO8fCNTNiPlfMfOPICiQSC-Pg2hL5V54jTlRzGQvLgQUzE5GQ90Mz3lR9rLRIax2O5no4QEk0LEIJfOs7-VHQm8RHtZlxMTFM27r1tpxSipgBeS53rftGtlZ5iQebPHrG2WQ2KZ5vKUaSPtmrMeqe3a-ng5tqqca44Hr8qfWl_jpj4vl-agqj_3fXNShb0XqbEKE6aRr4o-CRmHAR0XJRcGd1OURA_p_QcR4vwQZ3GYtoTvnQ-BcJ7AKfQOFEACd7r_JSa7rv8",
    theme: {
      format: 1,
      name: "Gruvbox",
      author: "termpaper",
      description: "Retro groove: warm earthy reds, yellows and greens on dark brown.",
      tags: [
        "terminal",
        "dark",
        "warm"
      ],
      grade: {
        contrast: 1.05,
        temperature: 0.25
      },
      palette: {
        mode: "tint",
        colors: [
          "#282828",
          "#504945",
          "#cc241d",
          "#d65d0e",
          "#d79921",
          "#b8bb26",
          "#ebdbb2"
        ],
        strength: 0.6
      },
      effects: {
        stack: [
          "grain"
        ],
        grain: 0.3
      },
      scene: {
        name: "fireplace",
        variant: "autumn"
      }
    }
  },
  {
    slug: "kanagawa",
    shelf: "Terminal palettes",
    yours: false,
    code: "tp1:LZC9bsMwDIRfRWCGLk6QP8eNX6BD1wIdig60RNlCbMmQ6GQI_O6hhEw6kaf7DnqCDXFChvZQgceJoIVv9NjjA6ECXHgIUWZMcZpxpihDQ0lHN7MLXjY_A6mvSMjqF-_0kZQOY1hiapXzN9WNC1Xq7sJIrNAbFUazLUHqMTimneQx9gnav8JwHseMwHiTQxLgv4I-opFiT3FM8hJ5iXLd7nf7ugJbdlmvFcwoHC7eKeQ5sPMsSblULJTNwR7s8VNmmyMe8dRkVZ_r88Vk1dBVm7K91o3tijLaNB3mJokj-Z6HDLwIj6wlzSnzEqO-ZYC0df5dW4Q4T-JMmnzp9f7kDqcuBEm_Y3QoHVso9nV9AQ",
    theme: {
      format: 1,
      name: "Kanagawa",
      author: "termpaper",
      description: "The Great Wave's colours: ink blue, violet and old-paper white.",
      tags: [
        "terminal",
        "dark",
        "ink"
      ],
      grade: {
        temperature: -0.05,
        fade: 0.05
      },
      palette: {
        mode: "tint",
        colors: [
          "#1f1f28",
          "#2a2a37",
          "#54546d",
          "#7e9cd8",
          "#957fb8",
          "#dcd7ba"
        ],
        strength: 0.6
      },
      effects: {
        stack: [
          "grain"
        ],
        grain: 0.3
      },
      scene: {
        name: "bamboo",
        variant: "rain"
      }
    }
  },
  {
    slug: "nord",
    shelf: "Terminal palettes",
    yours: false,
    code: "tp1:LVDRboMwDPyVyH2liLZQMd72A_uBaQ9uYiAbJMgxm6aKf69D-5TL-ew73R36yDMKdKcCAs4EHXxEdlAArjJG1r8QzwsuxEo6Spb9Ij4GnbwHg2zF28KEyDIeb9Pq02gWnEiEOmNxmk3PMYnRESWDwRkb42QGpv9U6kXBIUH3ubv4gFM2Qf7RJ-vgq4CB0WmuOySUlfHpXZVto8s0a65Mq-BYlZcC-l1clVW9FfAKkpfnmHkQH2S_PUXefQ9nutR1pdzhcqvPzTmj2jbXK2bUUHtCm1Hb2srtOtc6oreMyFLf1zlkEqYwyJitr41aJ0thN3612n8_a_1F9qgZOvjTKFrqtj0A",
    theme: {
      format: 1,
      name: "Nord",
      author: "termpaper",
      description: "An arctic, north-bluish palette: calm frost blues and cool greys.",
      tags: [
        "terminal",
        "dark",
        "cool"
      ],
      grade: {
        saturation: 0.85,
        temperature: -0.3,
        fade: 0.04
      },
      palette: {
        mode: "tint",
        colors: [
          "#2e3440",
          "#3b4252",
          "#4c566a",
          "#5e81ac",
          "#88c0d0",
          "#d8dee9",
          "#eceff4"
        ],
        strength: 0.65
      },
      scene: {
        name: "fjord",
        variant: "winter"
      }
    }
  },
  {
    slug: "one-dark",
    shelf: "Terminal palettes",
    yours: false,
    code: "tp1:NZDNboMwEIRfxdpcUURICBHn3nvprephMQu26h-03gRFEe9eGzW30axn5pNfMEX2KNCfKgjoCXr4DKQ-kH-hAryLiZw9IfYLLsTZHClptovYGPLly5B6J1TShjz1Ssfo1Mz0TGq1YtTg7lSph42ORGEYFaoV2asnORfXYy4VnBP03_uQDejKTmH4qWBmHDPXC3QMwpgK7LFutwoWzH2y33wsb0BskBzV0UXe-w7NrdHnS_YOZ7pc2qaoVl_PXV3U9YQTTUXpa3cbx6Ko1XU3FIXD0AxTYUjCFGYx0NfHtkwnTWEf_v80j8GgCIaceyBbzBw9BDsbgW37Aw",
    theme: {
      format: 1,
      name: "One Dark",
      author: "termpaper",
      description: "The One Dark scheme: cool greys with blue, violet and a warm yellow.",
      tags: [
        "terminal",
        "dark"
      ],
      grade: {
        contrast: 1.05
      },
      palette: {
        mode: "tint",
        colors: [
          "#282c34",
          "#3e4452",
          "#5c6370",
          "#61afef",
          "#c678dd",
          "#e5c07b",
          "#abb2bf"
        ],
        strength: 0.55
      },
      scene: {
        name: "manhattan",
        variant: "night"
      }
    }
  },
  {
    slug: "rose-pine",
    shelf: "Terminal palettes",
    yours: false,
    code: "tp1:LVBBbsMwDPuKoV6DIkmDdMttPxh2HXZQHLk16tiBrBQbij5o79jHJqc9maBoktINXOIZBYamgogzwQAfKf_9mncfCSrAVc6JlRXiecGFWMmJsmW_iE9RJ28hmIiyMgaz6K_KOFy_jVvZYJwMmtGLSc7kdE7m6kfKg5lXoclwyrRpPPu8V2PBU4bhcwvzEUPJQr7oo8YX-KrgxDhpyRuIj9q63jdtBW7j6n3d31WJgUQ2zZwK_5BWYFNIvNnvmtfm2HbK7dq-PRywoJ56fOkLsh0e6VgQjaMdtynVE7muNMjCFE9yLoElj5wjK7nkZUF7KQFjSGku4gdQZafKbCluvZ6HDn5k5B-1vyJ7LPuA1XMEgvv9Hw",
    theme: {
      format: 1,
      name: "Ros\xE9 Pine",
      author: "termpaper",
      description: "All natural pine, faux fur and a bit of soho vibes: muted rose and iris.",
      tags: [
        "terminal",
        "dark",
        "pink"
      ],
      grade: {
        tint: 0.12,
        fade: 0.06
      },
      palette: {
        mode: "tint",
        colors: [
          "#191724",
          "#26233a",
          "#6e6a86",
          "#c4a7e7",
          "#ebbcba",
          "#e0def4"
        ],
        strength: 0.6
      },
      effects: {
        stack: [
          "bloom"
        ],
        bloom: 0.4
      },
      scene: {
        name: "library",
        variant: "candle"
      }
    }
  },
  {
    slug: "solarized",
    shelf: "Terminal palettes",
    yours: false,
    code: "tp1:TVBBboQwDPxK5L1GKxYKBc79QY9VDyYxEDUkKPFWalf8vQ7tobfReDwzmgfMMW3IMN40BNwIRniNHpP7Jgsa8M5rTEIypW3HnZKQlrJJbmcXw3-5esH0MSpLtCsm9GrCTFrtiYzLpCZ_p6yV-cKQFQarUC3RWwoKjaHAV3FmXDKMb2eaC-hLmJiWixjCu4YloZWSDzAxcMIszavr0B4advTEfN62WDTALrC8muhjOm0vVVVPTSfcpXpuuqe6oLrrJ_uLEG9DX9DU9kNVFUREvW0Lmu3cUVM6ZE4UFl5LdFuis_Q_g_8W9LhE2UbDpyyDUmKE4JaV4Th-AA",
    theme: {
      format: 1,
      name: "Solarized",
      author: "termpaper",
      description: "Solarized Dark: deep teal base, precise blues, cyans and a golden accent.",
      tags: [
        "terminal",
        "dark",
        "teal"
      ],
      grade: {
        contrast: 0.95
      },
      palette: {
        mode: "tint",
        colors: [
          "#002b36",
          "#073642",
          "#268bd2",
          "#2aa198",
          "#b58900",
          "#eee8d5",
          "#fdf6e3"
        ],
        strength: 0.55
      },
      scene: {
        name: "lagoon",
        variant: "night"
      }
    }
  },
  {
    slug: "tokyo-night",
    shelf: "Terminal palettes",
    yours: false,
    code: "tp1:TVG7boRADPyVla8lCLgXocsPpEoXpTCLgdXBLloM0enEv8fmrkjFaHY8MzYPaEMckaHKE_A4ElTwFW73YD5d1zMkgAv3IQrNFMcJJ4pCNjTb6CZ2wcvLh7-b2ZIn47zhnsw_BzPhQMxUmYZoMh5X0fbYhN85MfWwkEHfmNUFUZlBJ1LxZ-xmqL73TOdx0EiMN_noCPwk0EVspOwDbPAccdYN0qxMYHV1RG_lLUuLs1jRKJ2RlyjUW5bmwr0K6HgvdlVxzNJMVh3D4nkf3LYEXs1VNQYNA3ZeT2LDEOLe75BjXhcX4Q7FqSiPtaJTfiovpaIrYtFeFdX1Oz6RzSy2Z11h5ki-414DL2cJpLYly3utmdHeNKEeQhhV_QQqFeV-bdW9fhnrwcV9xehQV4CIzsO2_QE",
    theme: {
      format: 1,
      name: "Tokyo Night",
      author: "termpaper",
      description: "Any scene in the Tokyo Night palette: deep navy shadows, blue and violet light.",
      tags: [
        "terminal",
        "dark",
        "blue"
      ],
      grade: {
        contrast: 1.08,
        vibrance: 0.25,
        temperature: -0.15,
        shadows: {
          hue: 230,
          amount: 0.2
        }
      },
      palette: {
        mode: "tint",
        colors: [
          "#1a1b26",
          "#24283b",
          "#414868",
          "#7aa2f7",
          "#bb9af7",
          "#c0caf5"
        ],
        strength: 0.65
      },
      effects: {
        stack: [
          "bloom"
        ],
        bloom: 0.6
      },
      scene: {
        name: "tokyo",
        variant: "rain"
      }
    }
  },
  {
    slug: "amber-crt",
    shelf: "Retro",
    yours: false,
    code: "tp1:NVDBasMwDP0Vo15DSelGSm5jfzB2Gz0ojpKYxZaRvZZR8u-TnfVg_Cy99yy9B0wsHjP0pwYCeoIe3vxAYt4_PqEB_MkLixYziY8YSbQ4UrLiYnYcCj0YrArPge0i7KlAl1l6QzeSX5MsBTIumHnluwuzYcEwk4kLJz1yVNOMc4L-C4SysL6Lm153FA_XBiKulLOO99DOWMb0GLVveWWpwsMJ26lttXZ4tefzjmzXdTuapqF9ovHl0sJ1a4CmiWxOxTVltN_Fx0pW1rAy14930LfHS1NbBamyrlR0_6ElDliyuaE4DEqDGgps2x8",
    theme: {
      format: 1,
      name: "Amber CRT",
      author: "termpaper",
      description: "An amber monochrome monitor: every scene in glowing orange phosphor.",
      tags: [
        "retro",
        "mono",
        "warm"
      ],
      palette: {
        mode: "map",
        colors: [
          "#1a0f00",
          "#5c3300",
          "#c77700",
          "#ffb000",
          "#ffd480"
        ]
      },
      effects: {
        stack: [
          "crt",
          "bloom"
        ],
        bloom: 0.8,
        crt: 0.8
      },
      scene: {
        name: "sonar",
        variant: "amber"
      }
    }
  },
  {
    slug: "game-boy",
    shelf: "Retro",
    yours: false,
    code: "tp1:NZDBbsMgDIZfBbnXqEpXbUpy3GF7iGkHB0xBIYDAkVZVefeZdDvx89n-_csPsKmsyDBdOoi4EkzwKY96T3foADd2qQhjKmvGTEWgoaqLz-xTlMpH2oqqDoWqZFUmVLdCFDtlPDsqZBRGo7Tb4nLvVPALKeHqMg6jclJyFMxZbBlvFaYvKMQlyf9wge8OMgZilmQPWJNpCWvELB06hVSOmVNvr0NvhZ2u_dvLtW9qmFE_2TjPTYnXMxNMXDbaOyBrSXNt1pVRL80r-x8KKPva6n899edX6a-a4hHk71TBW4J9_wU",
    theme: {
      format: 1,
      name: "Game Boy",
      author: "termpaper",
      description: "Four shades of pea green, dithered and chunky, like the 1989 handheld.",
      tags: [
        "retro",
        "green"
      ],
      palette: {
        mode: "snap",
        colors: [
          "#0f380f",
          "#306230",
          "#8bac0f",
          "#9bbc0f"
        ],
        dither: true
      },
      effects: {
        stack: [
          "pixelate"
        ],
        pixelate: 0.5
      },
      scene: {
        name: "life"
      }
    }
  },
  {
    slug: "green-phosphor",
    shelf: "Retro",
    yours: false,
    code: "tp1:TVCxTsQwDP2VyKzl1LuiCnVjYmVHN_hSp41I4igJMJz679hVQUx5fn5-efYdHJeIDaZzBwkjwQSvhSiZt5VrXrlAB_jZFEzQqMSMmZScqdric_OcpPNiFp16FE6HVegThslUiyn4RLUzS-Bvg2k2aGrwy9qMKz4tdBK3hkuF6R0KtcJSR0767KZw7SBjoNYk3V1as6aMmEVgOXDZJx_6_ox9L5ygp_kXIV4uiobBuXFUdBNkR7huHZBzZFtV19rQfqjPX2DR3gJz1F_WwhE1x4Gm_jR0_6RSP29KUNozHpesnFBv9YXFY5IjHwtt2w8",
    theme: {
      format: 1,
      name: "Green Phosphor",
      author: "termpaper",
      description: "A green-screen terminal: scanlines, glow and a slight fringe.",
      tags: [
        "retro",
        "mono",
        "green"
      ],
      palette: {
        mode: "map",
        colors: [
          "#001a00",
          "#004d00",
          "#00aa22",
          "#33ff66",
          "#b3ffc6"
        ]
      },
      effects: {
        stack: [
          "scanlines",
          "bloom",
          "chroma"
        ],
        chroma: 0.3,
        scanlines: 0.8
      },
      scene: {
        name: "sonar",
        variant: "green"
      }
    }
  },
  {
    slug: "synthwave",
    shelf: "Retro",
    yours: false,
    code: "tp1:TVBBboQwDPxK5L2iFVBALZ_ooceqBwMOoEISOWZRteLvdaCH3iYzGc_YT7CeVxRoiwwcrgQtfPw4mXZ8EGSAm0yelRTiNWAgVnKg2PMcZPZOlfdNeHMmbi6SmN4vfuNo9lkmgyYKezcaR96ZcfH7Xe2CY4T2E5hU1HcS4SuDkXHQ_Cf03gljTKXuxZFBwIVETmn16QusGNSYsvgcdSvKPC8r5W5ll9v6RNgVtqkTsrayzduFXm3dXIheGkq52pHcKBO0-b3ROFKpl5jiomD_nQK6xftVbRMueO6tvovTjuU_XmdUOiP25M7CfzcdeR7U_kCe0eliioLe9Th-AQ",
    theme: {
      format: 1,
      name: "Synthwave",
      author: "termpaper",
      description: "Outrun sunset colours with a strong neon glow.",
      tags: [
        "retro",
        "neon"
      ],
      grade: {
        contrast: 1.1
      },
      palette: {
        mode: "map",
        colors: [
          "#120024",
          "#2b0f54",
          "#ab1f65",
          "#ff4f69",
          "#ff8f56",
          "#ffe36e"
        ],
        strength: 0.6
      },
      effects: {
        stack: [
          "bloom",
          "halation"
        ],
        bloom: 1.2,
        halation: 0.4
      },
      scene: {
        name: "grid",
        variant: "vapor"
      }
    }
  },
  {
    slug: "vaporwave",
    shelf: "Retro",
    yours: false,
    code: "tp1:TVDNasMwDH6VoF5DcenWQd5h113GDpotJ6aJHGQ1Y5S8--Q0jIIP8vf5-7HuELNMqNCdWmCcCDr4wDnLDy4ELeBNhywGKsk040xiYKDiJc2aMhvzjj2xYoMcGv-L3AQhnErblBy1KR55TEzlwecx36SJkri3czQzxb5A9wlCKtnuTObawpz4Cl8t9ILBSt1hSd-C7G12x5fVHuBIqhs15foENLGasmbIZnk4oXPns2GHc3DucqlTjM6hq5Nz9BrjAwun6GpcUSHudagpb5ZCMZLXUlOKor9WWz9IntB0_3-ryh013eWZ2dsWT7x13XfcSwrmsKAktNadTbZ0WNc_",
    theme: {
      format: 1,
      name: "Vaporwave",
      author: "termpaper",
      description: "Magenta and cyan dreams, soft scanlines and colour fringing.",
      tags: [
        "retro",
        "neon",
        "pink"
      ],
      grade: {
        vibrance: 0.4
      },
      palette: {
        mode: "tint",
        colors: [
          "#1a0033",
          "#3d0066",
          "#ff00a0",
          "#00e5ff",
          "#ffd1f0"
        ],
        strength: 0.7
      },
      effects: {
        stack: [
          "chroma",
          "scanlines"
        ],
        chroma: 0.6,
        scanlines: 0.4
      },
      scene: {
        name: "grid",
        variant: "vapor"
      }
    }
  },
  {
    slug: "arctic",
    shelf: "Mood",
    yours: false,
    code: "tp1:LZBLTsUwDEW3UplpeGrfh09nDFkDYuAmThspn8pxEeipe8cpzOx7bZ-b3MEXTigwDgYyJoIR3thKsGAAN1kKqyLEacWVWEVH1XJYJZSszrulLoZ5kbGzJbpuihuZbuImdZhdZyNhPume4Fxh_IBUitPWlhLh08DM6BR6h4qyMf6d7U_PNwP0vZa6MbV-0F4oaYQ2ptKjzhhYlHPgazuxbGqc-_7Ua_ZUtixt9bzvBlaMJHKAUmlAkKB2yxELH8Ee-mm4nHvVHgZ7cTds1dW_eHto-Oqe_K1VvvfofQtfhSnPsjTMVSnVUj4Y_z8ZLE3E-m4DX8gBWyBw-AP7_gs",
    theme: {
      format: 1,
      name: "Arctic",
      author: "termpaper",
      description: "Ice light: cold blue, bright and clean.",
      tags: [
        "mood",
        "cool"
      ],
      grade: {
        saturation: 0.75,
        exposure: 0.15,
        temperature: -0.7,
        highlights: {
          hue: 200,
          amount: 0.2
        }
      },
      palette: {
        mode: "tint",
        colors: [
          "#0b1320",
          "#1c3d5a",
          "#4f8fc0",
          "#a9d6f5",
          "#f0faff"
        ],
        strength: 0.4
      },
      scene: {
        name: "icebergs",
        variant: "day"
      }
    }
  },
  {
    slug: "cyberpunk",
    shelf: "Mood",
    yours: false,
    code: "tp1:PVDLboMwEPwVa3NFEVBCE6699weqHhZjwApeo_UmFYry713Tx20843loHzBGDijQVQUQBgcdvG294_VGVygAbzJHVlIchxVXx0oOLln2q_hIqrz7aRZjvWyGXKTOzFHM6ulqkAZjN6TCzMgKIwljksJMS_zyNJnkJ0pHTRScEnQfEGIc9Jlz4LOAiXHQRQ_4s-rMY3Uq4O57RrKqlcfmWcCKixPZv4aYLSCeRJNsXCLv0YdyKOu6Uu5Qt1XTvGY0tmV1GXY0vpzbZlcHV7t25y72XLo8JAk7mmTOfaeTFrpxdFZSLkyC9pob-iXGkDtnjgGz7YfRzfU_qwGt-pN1tM_9vXmafX_bUN13ZI-6vQNGT_B8fgM",
    theme: {
      format: 1,
      name: "Cyberpunk",
      author: "termpaper",
      description: "Night city neon: hot pink and cyan, hard contrast, glowing signs.",
      tags: [
        "mood",
        "neon"
      ],
      grade: {
        contrast: 1.15,
        vibrance: 0.4
      },
      palette: {
        mode: "tint",
        colors: [
          "#0d0221",
          "#261447",
          "#f6019d",
          "#ff3864",
          "#2de2e6",
          "#f9c80e"
        ],
        strength: 0.55
      },
      effects: {
        stack: [
          "bloom",
          "chroma"
        ],
        bloom: 1.2,
        chroma: 0.6
      },
      scene: {
        name: "shibuya",
        variant: "rain"
      }
    }
  },
  {
    slug: "ember",
    shelf: "Mood",
    yours: false,
    code: "tp1:TVBBTsQwDPxK5HNUbSUWUO_wCcTBJG4SbZNUjksPq_4dp6wQt2RmPDP2HebKGQWm0ULBTDDBW_4iBgu4SaysgBDnFdcT9NQcp1VSLcq8J6YlhSiT8USr2ZGzaRF93Zs1Yal7KsFEVZyqZrB4g8Yj38zMGjeopWBoMH1ArtXrt3vAp4XA6LXOHVwtwth6x2G8qp6ydkHZWOnL8KJIKtKfusMjvM_FTfnxOlx0lVy3X8nTcVigeSYnp6gJultPj7jguZWF7xQKiVBv8Qfr7Os_Sr_P6tQclbPk43azHmRd0FG3QU7YU6GVusNx_AA",
    theme: {
      format: 1,
      name: "Ember",
      author: "termpaper",
      description: "Firelight: deep warm shadows, glowing highlights and a dark frame.",
      tags: [
        "mood",
        "warm"
      ],
      grade: {
        contrast: 1.15,
        temperature: 0.7,
        tint: 0.1,
        shadows: {
          hue: 15,
          amount: 0.4
        }
      },
      effects: {
        stack: [
          "halation",
          "vignette"
        ],
        halation: 0.8,
        vignette: 0.6
      },
      scene: {
        name: "fireplace",
        variant: "snow"
      }
    }
  },
  {
    slug: "forest",
    shelf: "Mood",
    yours: false,
    code: "tp1:LZDNcoMwDIRfhVGulIFA0pZzpy_R6UFgAZ7BP5WV5JDh3Su7vX1aa71rP2EJ7FBg7Grw6AhG-AxMSaAGvMkWWBUhdhEjsYqG0sw2ig1eTz6IYvUIwaSxciGlamUin-rq52ZJqrShCQ8dDca4k6l2u27S6DWCa4LxC5x6dSw2-M6ARks84W4nRj8rt81Z963Xki-Fl7LSNu1w1BBxJ5FicSHrf6s1zGEPXDJO7dRhu6h26qjH85CpX65Tj5neJrxeCtFAr9N7rpGEya-y5ZiLpqSZfMn4_yMmU16trjuyxVxO89lbv8Jx_AI",
    theme: {
      format: 1,
      name: "Forest",
      author: "termpaper",
      description: "Deep woods: moss greens, quiet shadows, dappled light.",
      tags: [
        "mood",
        "green"
      ],
      grade: {
        vibrance: 0.2,
        tint: -0.2,
        fade: 0.04
      },
      palette: {
        mode: "tint",
        colors: [
          "#0b1a0f",
          "#1e3a24",
          "#3f6b3a",
          "#8ba65a",
          "#e4e7b9"
        ],
        strength: 0.5
      },
      scene: {
        name: "redwoods",
        variant: "morning"
      }
    }
  },
  {
    slug: "ocean",
    shelf: "Mood",
    yours: false,
    code: "tp1:LVC7boRADPwV5GsJghB0hJ9IlSpKYXYNrLIPYsylOPHv8XLXjccznpHvMCUOKDA0JUQMBAN8GMIIJeAuS2IlhDisuBIraWkz7FZxKermM1riP1RB4d28yFAIoS8w2gJ_dywLk9JjNJ6QKz0gOG8wfEFIyeqYBZlVG3yXMDNa7XCHmxsZo1FcV69dFgQtgLKzUi911XZHCSt6Ejn1IWUfiItyXvWJz5hL3TZ1Y5S71GP73r2dqL9SP2Z0nUxv-4zsNLVTnztswhRnWXJ0l2M2Q_EMeT7oh_yqlhuyQ40bYNujdwLH8Q8",
    theme: {
      format: 1,
      name: "Ocean",
      author: "termpaper",
      description: "Underwater light: teal and aqua, cool and clear.",
      tags: [
        "mood",
        "cool",
        "teal"
      ],
      grade: {
        vibrance: 0.25,
        temperature: -0.35
      },
      palette: {
        mode: "tint",
        colors: [
          "#03101c",
          "#0b3954",
          "#087e8b",
          "#7fc8d8",
          "#dff3f8"
        ],
        strength: 0.55
      },
      scene: {
        name: "kelp",
        variant: "sunlit"
      }
    }
  },
  {
    slug: "pastel-dream",
    shelf: "Mood",
    yours: false,
    code: "tp1:LZDBbsMgEER_BW2uVpRYSZP43A-o1GPVwxoW26oBa1k3raL8exfcE7vDMPPEA3zigALdsYGIgaCDN8xCs3llwgAN4CpjYtWFOCy4EKvoKFueFplS1Jv35KUxOPGvwejMPA2jdGbBmYxNc1o5Nyp6IWfyiC7ddUczUBR1DHO67zVScMjQfUBIyelaQ_RcKg18NjAwOuV7QEZZGbfuw_7SAP0sKa9MZW3PDfhqPOyP7bMEzCRSH4ZUdJApluSCxrVy1_atO7Wq7a7udkMqk_f9GS91su5sN-1KjvoCk4UpDjKWmpO2kPdkJVc8QftVYvs5pVDM26DOF3VmS7HS_H-31Q9ymVDzv5EnVLYO8hp5ygTP5x8",
    theme: {
      format: 1,
      name: "Pastel Dream",
      author: "termpaper",
      description: "Soft, airy and light: pale colours, lifted shadows, a gentle glow.",
      tags: [
        "mood",
        "light",
        "pastel"
      ],
      grade: {
        saturation: 0.7,
        exposure: 0.25,
        fade: 0.12
      },
      palette: {
        mode: "tint",
        colors: [
          "#2b2d42",
          "#8d99ae",
          "#ffb5a7",
          "#fcd5ce",
          "#f8edeb"
        ],
        strength: 0.4
      },
      effects: {
        stack: [
          "bloom"
        ],
        bloom: 0.6
      },
      scene: {
        name: "cloudsea",
        variant: "sunrise"
      }
    }
  },
  {
    slug: "sakura",
    shelf: "Mood",
    yours: false,
    code: "tp1:RVBBboQwDPxK5HOKaNFWKtc-oceqBwOBRJAYOaYSWvH3dWClPURxPDOece4wEkcUaN8tJIwOWvjBeWMEC7iJJ9aOOI4rro61Objcc1glUFLk2zvm_a1bKGeKZg1pbk2mUQxT3o0Pk1_0SLZmckkWZzAN5mxVOkxwytD-QiQa9Fnkep0w_FmYGAdNdIeMopEuz7r6UmFIUsoPC-PJqav608LLr6j8pkDTKKS7RNouSXM7DgtuHF1_0bJgP5cUugXF4nsVyr0pM_cunSGe39Nh7Ig05j9ywDITBtzhOB4",
    theme: {
      format: 1,
      name: "Sakura",
      author: "termpaper",
      description: "Cherry-blossom pink: soft rosy highlights, gentle and light.",
      tags: [
        "mood",
        "pink",
        "light"
      ],
      grade: {
        saturation: 0.9,
        tint: 0.2,
        fade: 0.06,
        highlights: {
          hue: 330,
          amount: 0.35
        }
      },
      effects: {
        stack: [
          "bloom"
        ],
        bloom: 0.5
      },
      scene: {
        name: "bamboo",
        variant: "day"
      }
    }
  },
  {
    slug: "sunset",
    shelf: "Mood",
    yours: false,
    code: "tp1:PVBJbsMwDPyKwF6NIIvjFr73BT0WPdASvSCWaFC0gyLI30u5RW9jejbNA3qWiArtqYKEkaCFjzVlUqgAVx1Z7KIkccGFxI6Bspdp0YmT_XnfSL5d9pTIobqw5lvrtolnUpdHDHzPbkrKjgXTYJwU3MBzOJiT4pCh_YTIHOzzjhLhq4JBMFiNB2xTZyJv-Hg4G52iNUBdZb9cnhUsaDm6kyMXEaiFmZfnmWU3fzl1p-OlsdvLtTtjQwX5c103vqC-fvX124563zddKZBVKA06lpTr1WKo78lrLjFZ0d-K74gz7huY4B8XgfH3OQr7b9DyYHNELeEbyoRWsoX8u_Pz-QM",
    theme: {
      format: 1,
      name: "Sunset",
      author: "termpaper",
      description: "Every scene at dusk: violet shadows into orange and gold.",
      tags: [
        "mood",
        "warm"
      ],
      grade: {
        vibrance: 0.2,
        temperature: 0.3
      },
      palette: {
        mode: "tint",
        colors: [
          "#1b1036",
          "#5b2a6e",
          "#c2446c",
          "#f47c48",
          "#ffcf6b"
        ],
        strength: 0.55
      },
      effects: {
        stack: [
          "halation"
        ],
        halation: 0.5
      },
      scene: {
        name: "goldengate",
        variant: "sunset"
      }
    }
  }
];

// lib/codec.ts
import { deflateRawSync, inflateRawSync } from "node:zlib";
var nodeCodec = {
  deflate: async (d) => new Uint8Array(deflateRawSync(d, { level: 9 })),
  inflate: async (d) => new Uint8Array(inflateRawSync(d, { maxOutputLength: 64 * 1024 }))
};

// lib/schema.ts
var SCHEMA = [
  `create table if not exists themes (
    id          text primary key,
    name        text not null,
    author      text not null default '',
    description text not null default '',
    tags        text[] not null default '{}',
    theme       jsonb not null,
    code        text not null,
    token_hash  text not null,
    ip_hash     text not null,
    installs    integer not null default 0,
    likes       integer not null default 0,
    reports     integer not null default 0,
    hidden      boolean not null default false,
    created_at  timestamptz not null default now()
  )`,
  `create unique index if not exists themes_code on themes (code)`,
  `create index if not exists themes_new on themes (created_at desc) where not hidden`,
  `create index if not exists themes_popular on themes (installs desc, likes desc, created_at desc) where not hidden`,
  // one install, like or report per theme per (hashed) address
  `create table if not exists theme_events (
    theme_id   text not null references themes (id) on delete cascade,
    kind       text not null check (kind in ('install', 'like', 'report')),
    ip_hash    text not null,
    created_at timestamptz not null default now(),
    primary key (theme_id, kind, ip_hash)
  )`,
  // publishes per address, for the hourly limit (kept a day)
  `create table if not exists publishes (
    ip_hash    text not null,
    created_at timestamptz not null default now()
  )`,
  `create index if not exists publishes_recent on publishes (ip_hash, created_at)`
];

// lib/service.ts
var PAGE = 24;
var PUBLISH_LIMIT = 5;
var HIDE_AT = 3;
var COLUMNS = "id, name, author, description, tags, code, theme, installs, likes, created_at";
var scenes = new Map(catalog_default.scenes.map((s) => [s.name, s.variants]));
var builtins = builtin_default.map((b) => ({
  id: b.slug,
  name: String(b.theme.name ?? b.slug),
  author: String(b.theme.author ?? "termpaper"),
  description: String(b.theme.description ?? ""),
  tags: b.theme.tags ?? [],
  code: b.code,
  theme: b.theme,
  installs: 0,
  likes: 0,
  builtin: true
}));
var builtin = (id) => builtins.find((b) => b.id === id);
var matcher = new RegExpMatcher({ ...englishDataset.build(), ...englishRecommendedTransformers });
var rude = (text) => matcher.hasMatch(text);
var hashIp = (ip) => createHash("sha256").update(`${process.env.IP_SALT ?? ""}:${ip}`).digest("hex").slice(0, 32);
var hashToken = (token) => createHash("sha256").update(token).digest("hex");
var ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
function newId() {
  let s = "";
  while (s.length < 8) {
    for (const b of randomBytes(12)) {
      if (b < 248 && s.length < 8) s += ALPHABET[b % 62];
    }
  }
  return s;
}
async function listThemes(db2, q) {
  const where = ["not hidden"];
  const params = [];
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
  const offset = Math.max(0, Math.min(1e4, Math.floor(q.offset ?? 0) || 0));
  params.push(PAGE + 1, offset);
  const rows = await db2.query(
    `select ${COLUMNS} from themes where ${where.join(" and ")} order by ${order}, id limit $${params.length - 1} offset $${params.length}`,
    params
  );
  return rows.length > PAGE ? { themes: rows.slice(0, PAGE), next: offset + PAGE } : { themes: rows };
}
async function getTheme(db2, id) {
  const rows = await db2.query(`select ${COLUMNS} from themes where id = $1 and not hidden`, [id]);
  return rows[0];
}
async function publishTheme(db2, body, ipHash) {
  const raw = body && typeof body === "object" && "theme" in body ? body.theme : body;
  let t;
  let warnings;
  try {
    t = themeFrom(raw);
    warnings = validate(t, scenes);
  } catch (e) {
    throw new HttpError(400, `not a theme termpaper can use: ${e.message}`);
  }
  if (/^untitled$/i.test(t.name)) throw new HttpError(400, "give the theme a name");
  if (rude([t.name, t.author, t.description, ...t.tags].join("\n"))) {
    throw new HttpError(400, "the gallery does not take some of the words in the name, author, description or tags");
  }
  const [recent] = await db2.query(
    "select count(*)::int as n from publishes where ip_hash = $1 and created_at > now() - interval '1 hour'",
    [ipHash]
  );
  if ((recent?.n ?? 0) >= PUBLISH_LIMIT) throw new HttpError(429, `${PUBLISH_LIMIT} themes an hour is the limit; try again in a while`);
  const code = await toCode(t, nodeCodec);
  const dup = await db2.query("select id from themes where code = $1", [code]);
  if (dup[0]) throw new HttpError(409, `this theme is already in the gallery: /t/${dup[0].id}`);
  const token = randomBytes(24).toString("base64url");
  let id = "";
  for (let tries = 0; !id; tries++) {
    if (tries > 5) throw new Error("no free theme id after six tries");
    const candidate = newId();
    if (builtin(candidate)) continue;
    try {
      const ins = await db2.query(
        // tags go over as JSON and become text[] in SQL, whatever the driver
        // does with JS arrays
        `insert into themes (id, name, author, description, tags, theme, code, token_hash, ip_hash)
         values ($1, $2, $3, $4, array(select jsonb_array_elements_text($5::jsonb)), $6::jsonb, $7, $8, $9)
         on conflict (id) do nothing returning id`,
        [candidate, t.name, t.author, t.description, JSON.stringify(t.tags), JSON.stringify(toPlain(t)), code, hashToken(token), ipHash]
      );
      if (ins[0]) id = candidate;
    } catch (e) {
      if (e.code === "23505") throw new HttpError(409, "this theme is already in the gallery");
      throw e;
    }
  }
  await db2.query("insert into publishes (ip_hash) values ($1)", [ipHash]);
  await db2.query("delete from publishes where created_at < now() - interval '1 day'");
  return { id, token, url: `/t/${id}`, warnings };
}
async function removeTheme(db2, id, token, admin2) {
  const [row] = await db2.query("select token_hash from themes where id = $1", [id]);
  if (!row) throw new HttpError(404, "no such theme");
  if (!admin2) {
    if (!token) throw new HttpError(401, "deleting a theme needs its edit token");
    const a = Buffer.from(hashToken(token), "hex");
    const b = Buffer.from(row.token_hash, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new HttpError(403, "that is not this theme's edit token");
  }
  await db2.query("delete from themes where id = $1", [id]);
}
var KINDS = ["install", "like", "report"];
async function record(db2, id, kind, ipHash) {
  const [live] = await db2.query("select 1 as ok from themes where id = $1 and not hidden", [id]);
  if (!live) throw new HttpError(404, "no such theme");
  const ins = await db2.query(
    "insert into theme_events (theme_id, kind, ip_hash) values ($1, $2, $3) on conflict do nothing returning kind",
    [id, kind, ipHash]
  );
  if (!ins[0]) return { counted: false };
  if (kind === "report") {
    const [r] = await db2.query(
      `update themes set reports = reports + 1, hidden = hidden or reports + 1 >= ${HIDE_AT} where id = $1 returning hidden`,
      [id]
    );
    return { counted: true, hidden: r?.hidden ?? false };
  }
  await db2.query(`update themes set ${kind === "install" ? "installs = installs + 1" : "likes = likes + 1"} where id = $1`, [id]);
  return { counted: true };
}
async function migrate(db2) {
  for (const statement of SCHEMA) await db2.query(statement);
  return SCHEMA.length;
}
async function reported(db2) {
  return db2.query(`select ${COLUMNS}, reports, hidden from themes where reports > 0 order by hidden desc, reports desc, created_at desc limit 200`);
}
async function setHidden(db2, id, hidden) {
  const rows = await db2.query(
    hidden ? "update themes set hidden = true where id = $1 returning id" : "update themes set hidden = false, reports = 0 where id = $1 returning id",
    [id]
  );
  if (!rows[0]) throw new HttpError(404, "no such theme");
  if (!hidden) await db2.query("delete from theme_events where theme_id = $1 and kind = 'report'", [id]);
}

// lib/http.ts
var BASE_HEADERS = { "x-content-type-options": "nosniff" };
var LIST_CACHE = { "cache-control": "public, max-age=0, s-maxage=15, stale-while-revalidate=60", "access-control-allow-origin": "*" };
var ITEM_CACHE = { "cache-control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300", "access-control-allow-origin": "*" };
var NO_STORE = { "cache-control": "no-store" };
function json(body, status = 200, headers = NO_STORE) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", ...BASE_HEADERS, ...headers } });
}
function wrap(fn) {
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
function clientIp(req) {
  const h = req.headers;
  const raw = h.get("x-vercel-forwarded-for") ?? h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "unknown";
  return raw.split(",")[0].trim() || "unknown";
}
var ID = /^[A-Za-z0-9-]{1,64}$/;
function segment(req, index, param) {
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
function themeId(req) {
  const id = segment(req, 2, "id");
  if (!ID.test(id)) throw new HttpError(404, "no such theme");
  return id;
}
function bearer(req) {
  const m = /^Bearer\s+(\S+)\s*$/i.exec(req.headers.get("authorization") ?? "");
  return m?.[1];
}
function isAdmin(req) {
  const want = process.env.ADMIN_TOKEN;
  const got = bearer(req);
  if (!want || want.length < 16 || !got) return false;
  return timingSafeEqual2(createHash2("sha256").update(want).digest(), createHash2("sha256").update(got).digest());
}
async function jsonBody(req, limit = 16 * 1024) {
  const text = await req.text();
  if (text.length > limit) throw new HttpError(413, "that is too big to be a theme");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'send the theme as JSON: {"theme": {...}}');
  }
}
var listThemes2 = wrap(async (req) => {
  const q = new URL(req.url).searchParams;
  const r = await listThemes(await db(), {
    q: q.get("q") ?? void 0,
    tag: q.get("tag") ?? void 0,
    sort: q.get("sort") ?? void 0,
    offset: Number(q.get("offset") ?? 0)
  });
  return json(r, 200, LIST_CACHE);
});
var publishTheme2 = wrap(async (req) => {
  const r = await publishTheme(await db(), await jsonBody(req), hashIp(clientIp(req)));
  return json(r, 201);
});
var getTheme2 = wrap(async (req) => {
  const id = themeId(req);
  const row = builtin(id) ?? await getTheme(await db(), id);
  if (!row) throw new HttpError(404, "no such theme");
  if (new URL(req.url).searchParams.get("format") === "toml") {
    const t = themeFrom(row.theme);
    return new Response(toToml(t), {
      headers: {
        "content-type": "application/toml; charset=utf-8",
        "content-disposition": `inline; filename="${slugify(t.name)}.toml"`,
        ...BASE_HEADERS,
        ...ITEM_CACHE
      }
    });
  }
  return json(row, 200, ITEM_CACHE);
});
var deleteTheme = wrap(async (req) => {
  const id = themeId(req);
  if (builtin(id)) throw new HttpError(403, "built-in themes come with termpaper and cannot be deleted");
  await removeTheme(await db(), id, bearer(req), isAdmin(req));
  return json({ deleted: id });
});
var recordEvent = wrap(async (req) => {
  const id = themeId(req);
  const action = segment(req, 3, "action");
  if (!KINDS.includes(action)) throw new HttpError(404, "no such action (install, like or report)");
  if (builtin(id)) return json({ counted: false });
  return json(await record(await db(), id, action, hashIp(clientIp(req))));
});
var admin = wrap(async (req) => {
  if (!isAdmin(req)) throw new HttpError(401, "admin only");
  const task = segment(req, 2, "task");
  const d = await db();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  switch (`${req.method} ${task}`) {
    case "POST migrate":
      return json({ statements: await migrate(d) });
    case "GET reported":
      return json({ themes: await reported(d) });
    case "POST hide":
    case "POST restore":
      if (!ID.test(id)) throw new HttpError(400, "which theme? (?id=)");
      await setHidden(d, id, task === "hide");
      return json({ [task === "hide" ? "hidden" : "restored"]: id });
    default:
      throw new HttpError(404, "admin tasks: POST migrate, GET reported, POST hide?id=, POST restore?id=");
  }
});
export {
  listThemes2 as GET,
  publishTheme2 as POST
};
