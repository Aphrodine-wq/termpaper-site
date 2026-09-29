// /themes/: termpaper's own themes and everyone's, searchable, each on a
// live preview.

import { act, builtinThemes, listThemes, type Listed } from "./api.js";
import { Preview, sceneFor } from "./preview.js";
import { slugify } from "./theme.js";
import { copy, download, el, swatchRow } from "./ui.js";

const grid = document.getElementById("themes")!;
const status = document.getElementById("status")!;
const q = document.getElementById("q") as HTMLInputElement;
const sort = document.getElementById("sort") as HTMLSelectElement;
const tagsRow = document.getElementById("tags")!;
const more = document.getElementById("more") as HTMLButtonElement;

let tag = "";
let community: Listed[] = [];
let next: number | undefined;
let reachable = true;
/** Answers can come back out of order (typing fast); only the latest
 *  request's is shown. */
let asked = 0;

const seen = new IntersectionObserver((entries) => {
  for (const e of entries) {
    const card = e.target as HTMLElement & { preview?: Preview };
    if (e.isIntersecting && !card.preview) {
      const t = (card as unknown as { theme: Listed }).theme;
      const canvas = card.querySelector("canvas")!;
      card.preview = new Preview(canvas, t.theme.look, sceneFor(t.id, t.theme.scene?.name));
      card.preview.load().catch(() => {});
    }
  }
}, { rootMargin: "200px" });

function card(t: Listed): HTMLElement {
  const href = t.builtin ? `/themes/view/?id=${encodeURIComponent(t.id)}` : `/t/${encodeURIComponent(t.id)}`;
  const canvas = el("canvas", { "aria-label": `${t.name} on a scene` });
  const title = el("h3", {}, el("a", { href, text: t.name }));
  const by = el("div", { class: "by", text: t.builtin ? "built in" : `by ${t.author || "someone"}` });
  const desc = el("p", { class: "desc", text: t.description });
  const meta = el("div", { class: "meta", text: [t.tags.join(" · "), t.builtin ? "" : `${t.installs} installs · ${t.likes} likes`].filter(Boolean).join("  ·  ") });
  const codeBtn = el("button", { class: "icon-btn", type: "button", text: "copy code", title: "Copy the share code" });
  codeBtn.onclick = () => copy(t.code, codeBtn);
  const installBtn = el("button", { class: "icon-btn", type: "button", text: "copy install", title: "Copy the command that installs it" });
  installBtn.onclick = () => {
    copy(`termpaper theme install ${t.id}`, installBtn);
    if (!t.builtin) act(t.id, "install").catch(() => {});
  };
  const tomlBtn = el("button", { class: "icon-btn", type: "button", text: ".toml", title: "Download the theme file" });
  tomlBtn.onclick = () => download(t.theme, slugify(t.name));
  const studio = el("a", { class: "icon-btn", href: `/themes/studio/?id=${encodeURIComponent(t.id)}`, text: "edit" });
  const actions = el("div", { class: "actions" }, codeBtn, installBtn, tomlBtn, studio);
  if (!t.builtin) {
    const like = el("button", { class: "icon-btn", type: "button", text: "♥ like" });
    like.onclick = () => act(t.id, "like").then(() => like.classList.add("done")).catch(() => {});
    const report = el("button", { class: "icon-btn", type: "button", text: "report", title: "Report it: three reports hide a theme until someone looks" });
    report.onclick = () => {
      if (confirm(`Report “${t.name}”? Three reports hide a theme.`)) act(t.id, "report").then(() => report.classList.add("done")).catch(() => {});
    };
    actions.append(like, report);
  }
  const c = el("article", { class: "theme-card" }, canvas, swatchRow(t.theme), title, by, desc, meta, actions);
  (c as unknown as { theme: Listed }).theme = t;
  const play = () => (c as HTMLElement & { preview?: Preview }).preview?.play();
  const stop = () => (c as HTMLElement & { preview?: Preview }).preview?.still();
  c.addEventListener("mouseenter", play);
  c.addEventListener("mouseleave", stop);
  c.addEventListener("focusin", play);
  c.addEventListener("focusout", stop);
  seen.observe(c);
  return c;
}

function matches(t: Listed, words: string[]): boolean {
  const hay = `${t.name} ${t.description} ${t.tags.join(" ")} ${t.author}`.toLowerCase();
  return words.every((w) => hay.includes(w)) && (!tag || t.tags.includes(tag));
}

async function render() {
  const words = q.value.toLowerCase().split(/\s+/).filter(Boolean);
  const built = (await builtinThemes()).filter((t) => matches(t, words));
  const list = sort.value === "featured" ? [...built, ...community] : [...community, ...built];
  grid.replaceChildren(...list.map(card));
  status.textContent = reachable
    ? `${list.length} themes${community.length ? `, ${community.length} from the community` : ""}`
    : `${list.length} built-in themes. The community gallery is not reachable right now.`;
  more.hidden = next === undefined;
}

/** Fetch the community themes; false when a newer request took over. */
async function loadCommunity(append = false): Promise<boolean> {
  const mine = ++asked;
  try {
    const r = await listThemes({ q: q.value.trim(), tag, sort: sort.value === "popular" ? "popular" : "new", offset: append ? next : 0 });
    if (mine !== asked) return false;
    community = append ? [...community, ...r.themes] : r.themes;
    next = r.next;
    reachable = true;
  } catch {
    if (mine !== asked) return false;
    if (!append) community = [];
    next = undefined;
    reachable = false;
  }
  return true;
}

async function tags() {
  const counts = new Map<string, number>();
  for (const t of [...(await builtinThemes()), ...community]) for (const g of t.tags) counts.set(g, (counts.get(g) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([g]) => g);
  tagsRow.replaceChildren(
    ...top.map((g) => {
      const b = el("button", { class: `chip${g === tag ? " on" : ""}`, type: "button", text: g });
      b.onclick = async () => {
        tag = tag === g ? "" : g;
        if (!(await loadCommunity())) return;
        await tags();
        await render();
      };
      return b;
    }),
  );
}

let debounce: number | undefined;
q.addEventListener("input", () => {
  window.clearTimeout(debounce);
  debounce = window.setTimeout(async () => {
    if (await loadCommunity()) await render();
  }, 250);
});
sort.addEventListener("change", async () => {
  if (await loadCommunity()) await render();
});
more.addEventListener("click", async () => {
  if (await loadCommunity(true)) await render();
});

(async () => {
  status.textContent = "Loading…";
  await loadCommunity();
  await tags();
  await render();
})();
