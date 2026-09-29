// The gallery's API, and the built-in themes shipped with the site.

import { themeFrom, type Theme } from "./theme.js";

/** A theme as the gallery lists it. */
export interface Listed {
  id: string;
  name: string;
  author: string;
  description: string;
  tags: string[];
  code: string;
  theme: Theme;
  installs: number;
  likes: number;
  created_at?: string;
  builtin: boolean;
}

interface Row {
  id: string;
  name: string;
  author: string;
  description: string;
  tags: string[];
  code: string;
  theme: unknown;
  installs: number;
  likes: number;
  created_at?: string;
}

const fromRow = (r: Row, builtin: boolean): Listed => ({ ...r, theme: themeFrom(r.theme), builtin });

let builtins: Promise<Listed[]> | undefined;

/** termpaper's own themes (`termpaper theme list --json` at build time). */
export function builtinThemes(): Promise<Listed[]> {
  builtins ??= fetch("/themes/builtin.json")
    .then((r) => r.json() as Promise<{ slug: string; shelf: string; code: string; theme: Record<string, unknown> }[]>)
    .then((list) =>
      list.map((b) => ({
        id: b.slug,
        name: String(b.theme.name ?? b.slug),
        author: String(b.theme.author ?? "termpaper"),
        description: String(b.theme.description ?? ""),
        tags: (b.theme.tags as string[] | undefined) ?? [],
        code: b.code,
        theme: themeFrom(b.theme),
        installs: 0,
        likes: 0,
        builtin: true,
      })),
    )
    .catch(() => {
      // try again next time; meanwhile the pages go on without them
      builtins = undefined;
      return [];
    });
  return builtins;
}

async function json<T>(r: Response): Promise<T> {
  const body = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) throw new Error(body.error ?? `the gallery answered ${r.status}`);
  return body;
}

export async function listThemes(q: { q?: string; tag?: string; sort?: string; offset?: number }): Promise<{ themes: Listed[]; next?: number }> {
  const u = new URLSearchParams();
  if (q.q) u.set("q", q.q);
  if (q.tag) u.set("tag", q.tag);
  if (q.sort) u.set("sort", q.sort);
  if (q.offset) u.set("offset", String(q.offset));
  const body = await json<{ themes: Row[]; next?: number }>(await fetch(`/api/themes?${u}`));
  return { themes: body.themes.map((r) => fromRow(r, false)), next: body.next };
}

export async function getTheme(id: string): Promise<Listed> {
  const b = (await builtinThemes()).find((t) => t.id === id);
  if (b) return b;
  return fromRow(await json<Row>(await fetch(`/api/themes/${encodeURIComponent(id)}`)), false);
}

export async function publish(theme: Record<string, unknown>): Promise<{ id: string; token: string; url: string }> {
  return json(await fetch("/api/themes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ theme }) }));
}

export async function act(id: string, action: "install" | "like" | "report"): Promise<void> {
  await json(await fetch(`/api/themes/${encodeURIComponent(id)}/${action}`, { method: "POST" }));
}

/** Delete a theme you published, with the edit token you were given. */
export async function remove(id: string, token: string): Promise<void> {
  await json(await fetch(`/api/themes/${encodeURIComponent(id)}`, { method: "DELETE", headers: { authorization: `Bearer ${token}` } }));
}
