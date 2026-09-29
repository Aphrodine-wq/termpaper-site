// /themes/studio/: build a theme on a live preview, then take it away as a
// share code or a file, or publish it to the gallery. Opens on a theme with
// ?id= (built in or from the gallery), ?code=tp1:… or ?from=<built-in>;
// otherwise on the last draft.

import { parse as parseToml } from "smol-toml";
import { builtinThemes, getTheme, publish } from "./api.js";
import { browserCodec } from "./codec.js";
import { EFFECT_HELP, hasAmount, PREVIEWED } from "./effects.js";
import { PALETTES } from "./palettes.js";
import { Preview, PREVIEW_SCENES } from "./preview.js";
import { paletteFrom, parseScheme } from "./schemes.js";
import {
  defaultLook, fromCode, hex, MAX_COLORS, newTheme, parseHex, sanitize, slugify, themeFrom, toCode, toPlain, validate,
  type Look, type PaletteMode, type Rgb, type Theme, type Tone,
} from "./theme.js";
import { copy, download, el, swatchRow } from "./ui.js";

const DRAFT = "termpaper-studio-draft";
const TOKENS = "termpaper-tokens";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const controls = $<HTMLDivElement>("controls");
const status = $<HTMLParagraphElement>("studio-status");
const fields = {
  name: $<HTMLInputElement>("name"),
  author: $<HTMLInputElement>("author"),
  description: $<HTMLInputElement>("description"),
  tags: $<HTMLInputElement>("tags-input"),
};

let theme: Theme = newTheme();
/** The name was filled in for them (from a starting point), not typed. */
let autoName = true;
/** Every scene and its variants, for checking scene hints. */
let scenes = new Map<string, string[]>();
interface CatalogScene { name: string; title: string; category_label: string; variants: string[] }
let catalog: CatalogScene[] = [];

// ------------------------------------------------------------------ status

function say(text: string, bad = false, extra?: Node) {
  status.replaceChildren(text, ...(extra ? [extra] : []));
  status.classList.toggle("bad", bad);
}

function tokens(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(TOKENS) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function keepToken(id: string, token: string) {
  try {
    localStorage.setItem(TOKENS, JSON.stringify({ ...tokens(), [id]: token }));
  } catch {
    /* private window: the token is on screen */
  }
}

// ------------------------------------------------------------------ preview

const canvas = $<HTMLCanvasElement>("preview");
const preview = new Preview(canvas, defaultLook(), "tokyo");
let previewScene = "tokyo";
let comparing = false;

/** The look as termpaper would use it: in range, palette off below two
 *  colours. */
const shown = (): Look => sanitize(structuredClone(theme.look));

function paint() {
  if (!comparing) preview.setLook(shown());
  $("swatches").replaceChildren(...Array.from(swatchRow({ ...theme, look: shown() }).childNodes));
}

function sceneChips() {
  const row = $("scenes");
  row.replaceChildren(
    ...PREVIEW_SCENES.map((s) => {
      const title = catalog.find((c) => c.name === s)?.title ?? s;
      const b = el("button", { class: `chip${s === previewScene ? " on" : ""}`, type: "button", text: title });
      b.onclick = () => {
        previewScene = s;
        preview.load(s).catch(() => say("That preview did not load.", true));
        sceneChips();
      };
      return b;
    }),
  );
}

canvas.title = "Hold to see the scene without the theme";
const compare = (on: boolean) => {
  comparing = on;
  preview.setLook(on ? defaultLook() : shown());
};
canvas.addEventListener("pointerdown", () => compare(true));
for (const ev of ["pointerup", "pointerleave", "pointercancel"]) canvas.addEventListener(ev, () => comparing && compare(false));

// ------------------------------------------------------------------ history

const past: string[] = [];
const future: string[] = [];
let last = "";
let draftTimer: number | undefined;

/** A finished change: undo point and draft. */
function commit() {
  const s = JSON.stringify(theme);
  if (s === last) return;
  if (last) past.push(last);
  if (past.length > 200) past.shift();
  last = s;
  future.length = 0;
  window.clearTimeout(draftTimer);
  draftTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(DRAFT, s);
    } catch {
      /* no storage: the draft lives as long as the tab */
    }
  }, 300);
}

function restore(s: string) {
  theme = themeFrom(JSON.parse(s));
  syncAll();
}

function undo() {
  const p = past.pop();
  if (p === undefined) return;
  future.push(last);
  last = p;
  restore(p);
}

function redo() {
  const f = future.pop();
  if (f === undefined) return;
  past.push(last);
  last = f;
  restore(f);
}

document.addEventListener("keydown", (e) => {
  const t = e.target as HTMLElement;
  if (t.matches("input[type=text], input:not([type]), textarea")) return;
  const k = e.key.toLowerCase();
  if (!(e.ctrlKey || e.metaKey) || (k !== "z" && k !== "y")) return;
  e.preventDefault();
  if (k === "y" || e.shiftKey) redo();
  else undo();
});

// ------------------------------------------------------------------ controls

const syncs: (() => void)[] = [];

function syncAll() {
  for (const s of syncs) s();
  fields.name.value = theme.name === "Untitled" ? "" : theme.name;
  fields.author.value = theme.author;
  fields.description.value = theme.description;
  fields.tags.value = theme.tags.join(", ");
  paint();
}

/** A live change (a slider moving): repaint only. */
const live = () => paint();

let uid = 0;

function group(title: string, note: string | undefined, ...rows: HTMLElement[]): HTMLElement {
  return el("div", { class: "control-group" }, el("h3", { text: title }), ...(note ? [el("p", { class: "dim small note", text: note })] : []), ...rows);
}

interface SliderSpec {
  label: string;
  help: string;
  min: number;
  max: number;
  step: number;
  neutral: number;
  get: () => number;
  set: (v: number) => void;
  fmt: (v: number) => string;
  /** a hue: the readout shows the colour */
  hue?: boolean;
}

function slider(s: SliderSpec): HTMLElement {
  const id = `c${uid++}`;
  const input = el("input", { type: "range", id, min: String(s.min), max: String(s.max), step: String(s.step) });
  const out = el("output", { for: id });
  const label = el("label", { for: id, text: s.label, title: `${s.help} Double-click to reset.` });
  const show = (v: number) => {
    out.textContent = s.fmt(v);
    if (s.hue) out.style.color = `hsl(${v}deg 80% 62%)`;
  };
  input.addEventListener("input", () => {
    s.set(Number(input.value));
    show(Number(input.value));
    live();
  });
  input.addEventListener("change", commit);
  const reset = () => {
    s.set(s.neutral);
    input.value = String(s.neutral);
    show(s.neutral);
    paint();
    commit();
  };
  label.addEventListener("dblclick", reset);
  out.addEventListener("dblclick", reset);
  syncs.push(() => {
    input.value = String(s.get());
    show(s.get());
  });
  return el("div", { class: "control" }, label, input, out);
}

function choice(label: string, help: string, options: [string, string][], get: () => string, set: (v: string) => void): HTMLElement {
  const id = `c${uid++}`;
  const select = el("select", { id });
  for (const [value, text] of options) select.append(el("option", { value, text }));
  select.addEventListener("change", () => {
    set(select.value);
    paint();
    commit();
  });
  syncs.push(() => {
    select.value = get();
  });
  return el("div", { class: "control" }, el("label", { for: id, text: label, title: help }), select, el("span"));
}

const signed = (v: number) => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(2);
const pct = (v: number) => `${Math.round(v * 100)}%`;
const times = (v: number) => `×${v.toFixed(2)}`;
const deg = (v: number) => `${Math.round(v)}°`;
const leaning = (neg: string, pos: string) => (v: number) => (Math.abs(v) < 0.005 ? "0" : `${Math.round(Math.abs(v) * 100)} ${v < 0 ? neg : pos}`);

const g = () => theme.look.grade;

function toneSliders(label: string, key: "shadows" | "midtones" | "highlights", help: string): HTMLElement[] {
  const t = (): Tone => g()[key];
  return [
    slider({ label: `${label} hue`, help, min: 0, max: 359, step: 1, neutral: t().hue, get: () => t().hue, set: (v) => (t().hue = v), fmt: deg, hue: true }),
    slider({ label: `${label} amount`, help, min: 0, max: 1, step: 0.01, neutral: 0, get: () => t().amount, set: (v) => (t().amount = v), fmt: pct }),
  ];
}

function gradeControls(): HTMLElement[] {
  return [
    group(
      "Light",
      undefined,
      slider({ label: "Exposure", help: "Brighter or darker, in photographic stops.", min: -2, max: 2, step: 0.05, neutral: 0, get: () => g().exposure, set: (v) => (g().exposure = v), fmt: (v) => `${signed(v)} EV` }),
      slider({ label: "Contrast", help: "Punchier or flatter.", min: 0.5, max: 2.5, step: 0.05, neutral: 1, get: () => g().contrast, set: (v) => (g().contrast = v), fmt: times }),
      slider({ label: "Gamma", help: "Above 1 lifts the midtones; below 1 deepens them.", min: 0.5, max: 2, step: 0.05, neutral: 1, get: () => g().gamma, set: (v) => (g().gamma = v), fmt: (v) => v.toFixed(2) }),
      slider({ label: "Matte", help: "Lifts the blacks toward grey: a faded-film look.", min: 0, max: 0.5, step: 0.01, neutral: 0, get: () => g().fade, set: (v) => (g().fade = v), fmt: pct }),
    ),
    group(
      "Colour",
      undefined,
      slider({ label: "Saturation", help: "Stronger or softer colour; 0% is black and white.", min: 0, max: 2.5, step: 0.05, neutral: 1, get: () => g().saturation, set: (v) => (g().saturation = v), fmt: pct }),
      slider({ label: "Vibrance", help: "Lifts muted colours more than vivid ones: richer without neon.", min: -1, max: 1, step: 0.05, neutral: 0, get: () => g().vibrance, set: (v) => (g().vibrance = v), fmt: signed }),
      slider({ label: "Temperature", help: "Cooler blue light or warmer amber light.", min: -1, max: 1, step: 0.05, neutral: 0, get: () => g().temperature, set: (v) => (g().temperature = v), fmt: leaning("cool", "warm") }),
      slider({ label: "Tint", help: "Toward green or toward magenta.", min: -1, max: 1, step: 0.05, neutral: 0, get: () => g().tint, set: (v) => (g().tint = v), fmt: leaning("green", "magenta") }),
      slider({ label: "Hue shift", help: "Turns every colour round the colour wheel.", min: 0, max: 359, step: 1, neutral: 0, get: () => g().hue, set: (v) => (g().hue = v), fmt: deg, hue: true }),
    ),
    group(
      "Tone wheels",
      "Push the shadows, midtones and highlights toward a colour, the way a colourist does: teal shadows and warm highlights is the classic.",
      ...toneSliders("Shadows", "shadows", "The colour the dark parts lean toward."),
      ...toneSliders("Midtones", "midtones", "The colour the middle tones lean toward."),
      ...toneSliders("Highlights", "highlights", "The colour the bright parts lean toward."),
      slider({ label: "Balance", help: "Where shadows end and highlights begin.", min: -1, max: 1, step: 0.05, neutral: 0, get: () => g().balance, set: (v) => (g().balance = v), fmt: leaning("shadows", "highlights") }),
    ),
  ];
}

// ------------------------------------------------------------------ palette

const p = () => theme.look.palette;

function paletteControls(): HTMLElement {
  const colours = el("div", { class: "palette-editor" });
  const dither = el("input", { type: "checkbox", id: `c${uid++}` });
  const named = el("select", { "aria-label": "Load a named palette" });
  named.append(el("option", { value: "", text: "Load a palette…" }));
  for (const [name] of PALETTES) named.append(el("option", { value: name, text: name }));
  named.addEventListener("change", () => {
    const hit = PALETTES.find(([n]) => n === named.value);
    named.value = "";
    if (!hit) return;
    setColours(hit[1].map((h) => parseHex(h)!), `the ${hit[0]} palette`);
  });

  const draw = () => {
    const list = p().colors;
    const items: HTMLElement[] = list.map((c, i) => {
      const pick = el("input", { type: "color", value: hex(c), "aria-label": `Colour ${i + 1}` });
      pick.addEventListener("input", () => {
        list[i] = parseHex(pick.value)!;
        live();
      });
      pick.addEventListener("change", commit);
      const drop = el("button", { class: "icon-btn", type: "button", text: "×", title: "Remove this colour", "aria-label": `Remove colour ${i + 1}` });
      drop.onclick = () => {
        list.splice(i, 1);
        if (list.length < 2 && p().mode !== "off") say("A palette needs two colours or more; it is off until then.");
        draw();
        paint();
        commit();
      };
      return el("span", { class: "palette-colour" }, pick, drop);
    });
    const add = el("button", { class: "icon-btn", type: "button", text: "+ colour", title: "Add a colour" });
    add.disabled = list.length >= MAX_COLORS;
    add.onclick = () => {
      const lastC = list[list.length - 1] ?? [40, 40, 60];
      list.push(lastC.map((v) => Math.min(255, v + 60)) as Rgb);
      if (p().mode === "off" && list.length >= 2) p().mode = "map";
      syncAll();
      commit();
    };
    const flip = el("button", { class: "icon-btn", type: "button", text: "reverse", title: "Reverse the order: map runs darkest colour first" });
    flip.disabled = list.length < 2;
    flip.onclick = () => {
      list.reverse();
      draw();
      paint();
      commit();
    };
    colours.replaceChildren(...items, add, flip);
    dither.disabled = p().mode !== "snap";
  };
  syncs.push(() => {
    draw();
    dither.checked = p().dither;
  });
  dither.addEventListener("change", () => {
    p().dither = dither.checked;
    paint();
    commit();
  });

  return group(
    "Palette",
    "Recolour the scene with a palette: your terminal's colours, a film stock, a mood. Import a terminal colour scheme below to use it here.",
    choice(
      "Mode",
      "Map recolours by brightness, darkest colour to lightest; tint washes toward the nearest colour; snap uses only these colours.",
      [["off", "Off"], ["map", "Map: by brightness"], ["tint", "Tint: wash toward it"], ["snap", "Snap: only these colours"]],
      () => p().mode,
      (v) => {
        p().mode = v as PaletteMode;
        if (v !== "off" && p().colors.length < 2) setColours(PALETTES[0]![1].map((h) => parseHex(h)!), "a palette to start from");
        dither.disabled = v !== "snap";
      },
    ),
    el("div", { class: "control" }, el("label", { text: "Colours" }), named, el("span")),
    colours,
    slider({ label: "Strength", help: "How far toward the palette's colours.", min: 0, max: 1, step: 0.01, neutral: 1, get: () => p().strength, set: (v) => (p().strength = v), fmt: pct }),
    el("div", { class: "control" }, el("label", { for: dither.id, text: "Dither", title: "Snap only: ordered dithering between the two nearest colours, for smoother gradients." }), dither, el("span")),
  );
}

function setColours(colors: Rgb[], what: string) {
  p().colors = colors.slice(0, MAX_COLORS);
  if (p().mode === "off") p().mode = "map";
  syncAll();
  commit();
  say(`Palette: ${what}, ${p().colors.length} colours.`);
}

// ------------------------------------------------------------------ effects

const e = () => theme.look.effects;

function effectControls(): HTMLElement {
  const order = el("p", { class: "dim small" });
  const rows = EFFECT_HELP.map(([name, help]) => {
    const id = `c${uid++}`;
    const box = el("input", { type: "checkbox", id });
    const amount = el("input", { type: "range", min: "0.05", max: "2", step: "0.05", "aria-label": `${name} strength`, title: "Strength" });
    const label = el("label", { for: id, text: name + (PREVIEWED.has(name) ? "" : " ·"), title: help });
    box.addEventListener("change", () => {
      const stack = e().stack.filter((s) => s !== name);
      if (box.checked) stack.push(name);
      e().stack = stack;
      amount.disabled = !box.checked || !hasAmount(name);
      showOrder();
      paint();
      commit();
    });
    amount.addEventListener("input", () => {
      e().amounts[name] = Number(amount.value);
      live();
    });
    amount.addEventListener("change", commit);
    syncs.push(() => {
      const on = e().stack.includes(name);
      box.checked = on;
      amount.value = String(e().amounts[name] ?? 1);
      amount.disabled = !on || !hasAmount(name);
      amount.hidden = !hasAmount(name);
    });
    return el("div", { class: "effect" }, box, label, amount);
  });
  const showOrder = () => {
    order.textContent = e().stack.length ? `Applied in this order: ${e().stack.join(" → ")}` : "No effects.";
  };
  syncs.push(showOrder);
  return group(
    "Effects",
    "Stacked in the order you switch them on; the slider is each one's strength (1 is its usual). Effects marked · show in termpaper but not in this small preview.",
    el("div", { class: "effects-list" }, ...rows),
    order,
  );
}

// ------------------------------------------------------------------ scene

function sceneControls(): HTMLElement {
  const sceneSel = el("select", { id: `c${uid++}` });
  const variantSel = el("select", { id: `c${uid++}` });
  const fill = () => {
    sceneSel.replaceChildren(el("option", { value: "", text: "Any scene" }));
    const byCat = new Map<string, CatalogScene[]>();
    for (const s of catalog) byCat.set(s.category_label, [...(byCat.get(s.category_label) ?? []), s]);
    for (const [cat, list] of byCat) {
      const og = el("optgroup", { label: cat });
      for (const s of list) og.append(el("option", { value: s.name, text: `${s.title} (${s.name})` }));
      sceneSel.append(og);
    }
  };
  const fillVariants = () => {
    const vs = theme.scene ? scenes.get(theme.scene.name) ?? [] : [];
    variantSel.replaceChildren(el("option", { value: "", text: vs.length ? "Its usual" : "—" }), ...vs.map((v) => el("option", { value: v, text: v })));
    variantSel.disabled = vs.length === 0;
    variantSel.value = theme.scene?.variant ?? "";
  };
  sceneSel.addEventListener("change", () => {
    theme.scene = sceneSel.value ? { name: sceneSel.value } : undefined;
    if (!theme.scene) delete theme.scene;
    fillVariants();
    if (theme.scene && (PREVIEW_SCENES as readonly string[]).includes(theme.scene.name) && theme.scene.name !== previewScene) {
      previewScene = theme.scene.name;
      preview.load(previewScene).catch(() => {});
      sceneChips();
    }
    commit();
  });
  variantSel.addEventListener("change", () => {
    if (!theme.scene) return;
    if (variantSel.value) theme.scene.variant = variantSel.value;
    else delete theme.scene.variant;
    commit();
  });
  syncs.push(() => {
    if (sceneSel.options.length <= 1) fill();
    sceneSel.value = theme.scene?.name ?? "";
    fillVariants();
  });
  const dim = slider({
    label: "Brightness",
    help: "Suggest a brightness for the wallpaper when the theme is applied; 100% leaves it as it is.",
    min: 0.2,
    max: 1,
    step: 0.05,
    neutral: 1,
    get: () => theme.display?.dim ?? 1,
    set: (v) => {
      if (v >= 0.999) delete theme.display;
      else theme.display = { dim: v };
    },
    fmt: (v) => (v >= 0.999 ? "as is" : pct(v)),
  });
  return group(
    "Scene",
    "Optional: a scene the theme was made for. termpaper offers to switch to it when the theme is applied; the theme still works everywhere.",
    el("div", { class: "control" }, el("label", { for: sceneSel.id, text: "Made for" }), sceneSel, el("span")),
    el("div", { class: "control" }, el("label", { for: variantSel.id, text: "Variant" }), variantSel, el("span")),
    dim,
  );
}

// ------------------------------------------------------------------ start from

function startControls(builtins: { id: string; name: string; theme: Theme }[]): HTMLElement {
  const sel = el("select", { "aria-label": "Start from a theme" });
  sel.append(el("option", { value: "", text: "Start from…" }), el("option", { value: "-", text: "Neutral: nothing changed" }));
  for (const b of builtins) sel.append(el("option", { value: b.id, text: b.name }));
  sel.addEventListener("change", () => {
    const v = sel.value;
    sel.value = "";
    if (!v) return;
    const from = v === "-" ? undefined : builtins.find((b) => b.id === v);
    const t = from ? structuredClone(from.theme) : newTheme();
    const keep = autoName ? undefined : { name: theme.name, author: theme.author, description: theme.description, tags: theme.tags };
    theme = { ...t, ...(keep ?? { name: from ? `${from.name} remix` : "Untitled", author: theme.author, description: "", tags: [] }) };
    syncAll();
    commit();
    say(from ? `Started from ${from.name}.` : "Back to neutral.");
  });
  const undoBtn = el("button", { class: "icon-btn", type: "button", text: "undo", title: "Undo (Ctrl+Z)" });
  undoBtn.onclick = undo;
  const redoBtn = el("button", { class: "icon-btn", type: "button", text: "redo", title: "Redo (Ctrl+Shift+Z)" });
  redoBtn.onclick = redo;
  return el("div", { class: "control-group" }, el("div", { class: "btn-row" }, sel, undoBtn, redoBtn));
}

// ------------------------------------------------------------------ text fields

fields.name.addEventListener("input", () => {
  theme.name = fields.name.value || "Untitled";
  autoName = false;
});
fields.author.addEventListener("input", () => {
  theme.author = fields.author.value;
  try {
    localStorage.setItem("termpaper-author", fields.author.value);
  } catch {
    /* fine */
  }
});
fields.description.addEventListener("input", () => (theme.description = fields.description.value));
fields.tags.addEventListener("input", () => (theme.tags = fields.tags.value.split(",").map((s) => s.trim()).filter(Boolean)));
for (const f of Object.values(fields)) f.addEventListener("change", commit);

// ------------------------------------------------------------------ out

/** The theme as it would be saved, or undefined (and a message) when it
 *  cannot be. */
function finished(): { theme: Theme; warnings: string[] } | undefined {
  const t = structuredClone(theme);
  if (!t.name.trim() || t.name === "Untitled") {
    say("Give it a name first.", true);
    fields.name.focus();
    return undefined;
  }
  try {
    return { theme: t, warnings: validate(t, scenes) };
  } catch (err) {
    say((err as Error).message, true);
    return undefined;
  }
}

$("copy-code").addEventListener("click", async () => {
  const f = finished();
  if (!f) return;
  const code = await toCode(f.theme, browserCodec);
  await copy(code, $("copy-code"));
  say("Share code copied. Paste it on termpaper's Themes page (i), or run: ", false, el("span", { class: "mono", text: "termpaper theme import tp1:…" }));
});

$("download").addEventListener("click", () => {
  const f = finished();
  if (!f) return;
  download(f.theme, slugify(f.theme.name));
  say(`Saved ${slugify(f.theme.name)}.toml. Put it in termpaper's themes folder, or run: termpaper theme import ${slugify(f.theme.name)}.toml`);
});

$("publish").addEventListener("click", async () => {
  const f = finished();
  if (!f) return;
  if (!confirm(`Publish “${f.theme.name}” to the gallery? Anyone will be able to see and install it.`)) return;
  const btn = $<HTMLButtonElement>("publish");
  btn.disabled = true;
  say("Publishing…");
  try {
    const r = await publish(toPlain(f.theme));
    keepToken(r.id, r.token);
    const link = el("a", { href: r.url, text: new URL(r.url, location.href).href });
    const box = el(
      "div",
      {},
      el("p", {}, "Published: ", link),
      el("p", { class: "dim small", text: "Its edit token is below. This browser remembers it, which lets you delete the theme from its page; keep a copy if you want to do that from somewhere else. It is not shown again." }),
      el("div", { class: "token", text: r.token }),
    );
    status.replaceChildren(box);
    status.classList.remove("bad");
  } catch (err) {
    say(`Not published: ${(err as Error).message}`, true);
  } finally {
    btn.disabled = false;
  }
});

// ------------------------------------------------------------------ in

function load(t: Theme, warnings: string[], from: string) {
  theme = t;
  autoName = false;
  syncAll();
  commit();
  if (t.scene && (PREVIEW_SCENES as readonly string[]).includes(t.scene.name) && t.scene.name !== previewScene) {
    previewScene = t.scene.name;
    preview.load(previewScene).catch(() => {});
    sceneChips();
  }
  say(`Loaded ${t.name} from ${from}.${warnings.length ? ` Note: ${warnings.join("; ")}.` : ""}`);
}

async function importText(text: string, from: string) {
  const s = text.trim();
  if (!s) {
    say("Paste a share code, a theme file or a colour scheme first.", true);
    return;
  }
  try {
    if (s.startsWith("tp1:")) {
      const r = await fromCode(s, browserCodec, scenes);
      load(r.theme, r.warnings, "the share code");
      return;
    }
    const scheme = parseScheme(s);
    if (scheme) {
      const colors = paletteFrom(scheme);
      if (colors.length < 2) throw new Error(`that ${scheme.format} scheme has fewer than two distinct colours`);
      setColours(colors, `from the ${scheme.format} scheme${scheme.name ? ` ${scheme.name}` : ""}`);
      return;
    }
    let o: unknown;
    try {
      o = JSON.parse(s);
    } catch {
      o = parseToml(s);
    }
    const inner = o && typeof o === "object" && "theme" in o && typeof (o as { theme: unknown }).theme === "object" ? (o as { theme: unknown }).theme : o;
    const t = themeFrom(inner);
    load(t, validate(t, scenes), from);
  } catch (err) {
    say(`Could not import that: ${(err as Error).message}`, true);
  }
}

$("import-go").addEventListener("click", () => importText($<HTMLTextAreaElement>("import").value, "what you pasted"));
$<HTMLInputElement>("import-file").addEventListener("change", async (ev) => {
  const file = (ev.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (file.size > 256 * 1024) {
    say("That file is too big to be a theme or a colour scheme.", true);
    return;
  }
  await importText(await file.text(), file.name);
});

// ------------------------------------------------------------------ start

async function opening(): Promise<{ theme: Theme; from: string; warnings: string[] } | undefined> {
  const q = new URLSearchParams(location.search);
  const code = q.get("code");
  if (code) {
    const r = await fromCode(code, browserCodec, scenes);
    return { theme: r.theme, from: "the share code", warnings: r.warnings };
  }
  const id = q.get("id") ?? q.get("from");
  if (id) {
    const t = await getTheme(id);
    return { theme: structuredClone(t.theme), from: t.builtin ? "the built-in themes" : "the gallery", warnings: [] };
  }
  try {
    const d = localStorage.getItem(DRAFT);
    if (d) return { theme: themeFrom(JSON.parse(d)), from: "your last visit", warnings: [] };
  } catch {
    /* no draft */
  }
  return undefined;
}

(async () => {
  try {
    const c = (await (await fetch("/catalog.json")).json()) as { scenes: CatalogScene[] };
    catalog = c.scenes;
    scenes = new Map(catalog.map((s) => [s.name, s.variants]));
  } catch {
    /* scene hints go unchecked */
  }
  const builtins = await builtinThemes().catch(() => []);
  controls.replaceChildren(startControls(builtins), ...gradeControls(), paletteControls(), effectControls(), sceneControls());
  const hint = el("p", { class: "dim small", text: "Hold the picture to compare with the scene as it is." });
  canvas.parentElement?.append(hint);
  try {
    fields.author.value = localStorage.getItem("termpaper-author") ?? "";
  } catch {
    /* fine */
  }
  let start: Awaited<ReturnType<typeof opening>>;
  try {
    start = await opening();
  } catch (err) {
    say(`Could not open that theme: ${(err as Error).message}`, true);
  }
  if (start) {
    theme = start.theme;
    autoName = false;
    if (start.from === "the built-in themes" || start.from === "the gallery") {
      theme.name = `${theme.name} remix`;
      theme.author = fields.author.value;
      autoName = true;
    }
  } else {
    theme.author = fields.author.value;
  }
  if (theme.scene && (PREVIEW_SCENES as readonly string[]).includes(theme.scene.name)) previewScene = theme.scene.name;
  sceneChips();
  syncAll();
  last = JSON.stringify(theme);
  await preview.load(previewScene).catch(() => say("The preview frames did not load.", true));
  preview.play();
  paint();
  if (start) say(`Opened ${start.theme.name.replace(/ remix$/, "")} from ${start.from}.${start.warnings.length ? ` Note: ${start.warnings.join("; ")}.` : ""}`);
})();
