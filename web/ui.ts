// Small DOM helpers shared by the pages. Everything people wrote goes in as
// text, never as markup.

import { swatches, toToml, type Theme } from "./theme.js";

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, string> = {}, ...children: (Node | string)[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") e.className = v;
    else if (k === "text") e.textContent = v;
    else e.setAttribute(k, v);
  }
  for (const c of children) e.append(typeof c === "string" ? document.createTextNode(c) : c);
  return e;
}

export async function copy(text: string, button?: HTMLElement) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* no clipboard: the text is on the page anyway */
  }
  if (button) {
    button.classList.add("done");
    setTimeout(() => button.classList.remove("done"), 1200);
  }
}

export function download(theme: Theme, slug: string) {
  const blob = new Blob([toToml(theme)], { type: "application/toml" });
  const a = el("a", { href: URL.createObjectURL(blob), download: `${slug}.toml` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function swatchRow(theme: Theme): HTMLElement {
  const row = el("div", { class: "swatches", "aria-hidden": "true" });
  for (const c of swatches(theme.look)) {
    const s = el("span");
    s.style.background = `rgb(${c[0]},${c[1]},${c[2]})`;
    row.append(s);
  }
  return row;
}

export function idFromLocation(): string | undefined {
  const m = location.pathname.match(/^\/t\/([^/]+)/);
  return m ? decodeURIComponent(m[1]!) : new URLSearchParams(location.search).get("id") ?? undefined;
}
