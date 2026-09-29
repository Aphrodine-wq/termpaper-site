// A theme's own page (/t/<id>, or /themes/view/?id=<id> for built-in ones):
// the preview on every scene, what is in it, and ways to take it home.

import { act, getTheme, remove, type Listed } from "./api.js";
import { EFFECT_HELP } from "./effects.js";
import { Preview, PREVIEW_SCENES, sceneFor } from "./preview.js";
import { hex, slugify } from "./theme.js";
import { copy, download, el, idFromLocation, swatchRow } from "./ui.js";

const root = document.getElementById("theme")!;

function oneliner(cmd: string): HTMLElement {
  const btn = el("button", { class: "copy-btn", type: "button", "data-copy": cmd, title: "Copy to clipboard", "aria-label": "Copy to clipboard" }, el("i", { class: "ph ph-copy" }));
  return el("div", { class: "oneliner" }, el("code", {}, el("span", { class: "prompt", text: "$" }), el("span", { text: cmd })), btn);
}

function storedToken(id: string): string | undefined {
  try {
    return (JSON.parse(localStorage.getItem("termpaper-tokens") ?? "{}") as Record<string, string>)[id];
  } catch {
    return undefined;
  }
}

function forgetToken(id: string) {
  try {
    const all = JSON.parse(localStorage.getItem("termpaper-tokens") ?? "{}") as Record<string, string>;
    delete all[id];
    localStorage.setItem("termpaper-tokens", JSON.stringify(all));
  } catch {
    /* fine */
  }
}

function details(t: Listed): HTMLElement {
  const look = t.theme.look;
  const g = look.grade;
  const dl = el("dl", { class: "kv" });
  const add = (k: string, v: string) => dl.append(el("dt", { text: k }), el("dd", { text: v }));
  const grade: string[] = [];
  if (Math.abs(g.exposure) > 1e-3) grade.push(`exposure ${g.exposure > 0 ? "+" : ""}${g.exposure.toFixed(2)}`);
  if (Math.abs(g.contrast - 1) > 1e-3) grade.push(`contrast ×${g.contrast.toFixed(2)}`);
  if (Math.abs(g.saturation - 1) > 1e-3) grade.push(`saturation ${Math.round(g.saturation * 100)}%`);
  if (Math.abs(g.vibrance) > 1e-3) grade.push(`vibrance ${g.vibrance.toFixed(2)}`);
  if (Math.abs(g.temperature) > 1e-3) grade.push(g.temperature > 0 ? "warmer" : "cooler");
  if (Math.abs(g.tint) > 1e-3) grade.push(g.tint > 0 ? "toward magenta" : "toward green");
  if (Math.abs(g.hue) > 1e-3) grade.push(`hue ${Math.round(g.hue)}°`);
  if (Math.abs(g.gamma - 1) > 1e-3) grade.push(`gamma ${g.gamma.toFixed(2)}`);
  if (g.fade > 1e-3) grade.push(`matte ${Math.round(g.fade * 100)}%`);
  const tones = (["shadows", "midtones", "highlights"] as const).filter((k) => g[k].amount > 1e-3).map((k) => `${k} ${Math.round(g[k].hue)}°`);
  if (tones.length) grade.push(`tone wheels: ${tones.join(", ")}`);
  add("Grade", grade.length ? grade.join(" · ") : "neutral");
  const p = look.palette;
  add("Palette", p.mode === "off" ? "none" : `${p.mode}, ${p.colors.length} colours${p.strength < 1 ? `, ${Math.round(p.strength * 100)}%` : ""}${p.dither ? ", dithered" : ""}`);
  if (p.mode !== "off") {
    const row = el("dd", { class: "swatches", title: p.colors.map(hex).join(" ") });
    for (const c of p.colors) {
      const s = el("span");
      s.style.background = hex(c);
      row.append(s);
    }
    dl.append(el("dt"), row);
  }
  const fx = look.effects.stack.map((n) => {
    const a = look.effects.amounts[n];
    return a !== undefined && Math.abs(a - 1) > 1e-3 ? `${n} ${Math.round(a * 100)}%` : n;
  });
  add("Effects", fx.length ? fx.join(", ") : "none");
  if (t.theme.scene) add("Made for", `${t.theme.scene.name}${t.theme.scene.variant ? ` (${t.theme.scene.variant})` : ""}`);
  if (t.theme.display?.dim !== undefined) add("Brightness", `${Math.round(t.theme.display.dim * 100)}%`);
  if (t.tags.length) add("Tags", t.tags.join(", "));
  if (!t.builtin) {
    add("Installs", String(t.installs));
    add("Likes", String(t.likes));
    if (t.created_at) add("Shared", new Date(t.created_at).toLocaleDateString());
  }
  return dl;
}

function render(t: Listed) {
  document.title = `${t.name} · termpaper themes`;
  const canvas = el("canvas", { "aria-label": `${t.name} on a scene` });
  let scene = sceneFor(t.id, t.theme.scene?.name);
  const preview = new Preview(canvas, t.theme.look, scene);
  const chips = el("div", { class: "chip-row" });
  const drawChips = () =>
    chips.replaceChildren(
      ...PREVIEW_SCENES.map((s) => {
        const b = el("button", { class: `chip${s === scene ? " on" : ""}`, type: "button", text: s });
        b.onclick = () => {
          scene = s;
          preview.load(s).catch(() => {});
          drawChips();
        };
        return b;
      }),
    );
  drawChips();
  preview.load(scene).then(() => preview.play()).catch(() => {});

  const code = el("div", { class: "code", text: t.code });
  const copyCode = el("button", { class: "btn", type: "button" }, el("i", { class: "ph ph-copy" }), "Copy share code");
  copyCode.onclick = () => copy(t.code, copyCode);
  const toml = el("button", { class: "btn", type: "button" }, el("i", { class: "ph ph-download-simple" }), "Download .toml");
  toml.onclick = () => download(t.theme, slugify(t.name));
  const edit = el("a", { class: "btn", href: `/themes/studio/?id=${encodeURIComponent(t.id)}` }, el("i", { class: "ph ph-paint-brush" }), "Open in the studio");
  const buttons = el("div", { class: "btn-row mt-1" }, copyCode, toml, edit);
  const note = el("p", { class: "dim small" });

  if (!t.builtin) {
    const like = el("button", { class: "icon-btn", type: "button", text: "♥ like" });
    like.onclick = () =>
      act(t.id, "like")
        .then(() => like.classList.add("done"))
        .catch((e: Error) => (note.textContent = e.message));
    const report = el("button", { class: "icon-btn", type: "button", text: "report", title: "Three reports hide a theme until someone looks at it" });
    report.onclick = () => {
      if (!confirm(`Report “${t.name}”? Three reports hide a theme until someone looks at it.`)) return;
      act(t.id, "report")
        .then(() => {
          report.classList.add("done");
          note.textContent = "Reported. Thank you.";
        })
        .catch((e: Error) => (note.textContent = e.message));
    };
    buttons.append(like, report);
    const token = storedToken(t.id);
    if (token) {
      const del = el("button", { class: "icon-btn", type: "button", text: "delete", title: "You published this theme from this browser" });
      del.onclick = async () => {
        if (!confirm(`Delete “${t.name}” from the gallery? Its code and any copies people installed keep working.`)) return;
        try {
          await remove(t.id, token);
          forgetToken(t.id);
          root.replaceChildren(el("p", { class: "dim", text: `Deleted ${t.name}.` }), el("p", {}, el("a", { href: "/themes/", text: "Back to the gallery" })));
        } catch (e) {
          note.textContent = (e as Error).message;
        }
      };
      buttons.append(del);
    }
  }

  const install = oneliner(`termpaper theme install ${t.id}`);
  install.querySelector(".copy-btn")?.addEventListener("click", () => {
    if (!t.builtin) act(t.id, "install").catch(() => {});
  });

  const help = EFFECT_HELP.filter(([n]) => t.theme.look.effects.stack.includes(n)).map(([n, h]) => el("li", {}, el("span", { class: "mono", text: n }), ` ${h}`));

  root.replaceChildren(
    el("div", {}, canvas, el("div", { class: "mt-1" }, chips), swatchRow(t.theme)),
    el(
      "div",
      {},
      el("p", { class: "eyebrow", text: t.builtin ? "built-in theme" : "community theme" }),
      el("h1", { text: t.name }),
      el("p", { class: "dim", text: t.builtin ? "Comes with termpaper." : `by ${t.author || "someone"}` }),
      ...(t.description ? [el("p", { class: "lede mt-1", text: t.description })] : []),
      el("div", { class: "install-list mt-1" }, install, oneliner(`termpaper --theme ${t.builtin ? t.id : slugify(t.name)}`)),
      el("p", { class: "dim small mt-1", text: t.builtin ? "Already in termpaper: pick it on the Themes page, or run the second line." : "The first line fetches it once; after that it is yours, and the second line (or the Themes page) uses it." }),
      buttons,
      note,
      el("h3", { class: "mt-2", text: "What is in it" }),
      details(t),
      ...(help.length ? [el("ul", { class: "dim small mt-1" }, ...help)] : []),
      el("h3", { class: "mt-2", text: "Share code" }),
      el("p", { class: "dim small", text: "Paste it on termpaper's Themes page (i), or run termpaper theme import followed by the code." }),
      code,
    ),
  );
}

(async () => {
  const id = idFromLocation();
  if (!id) {
    root.replaceChildren(el("p", { class: "dim", text: "No theme named. " }), el("a", { href: "/themes/", text: "See them all" }));
    return;
  }
  try {
    render(await getTheme(id));
  } catch (e) {
    root.replaceChildren(
      el("h1", { text: "No such theme" }),
      el("p", { class: "dim", text: `${(e as Error).message}. It may have been deleted, or hidden after reports.` }),
      el("p", {}, el("a", { href: "/themes/", text: "Back to the gallery" })),
    );
  }
})();
