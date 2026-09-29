// /api/themes/:id: one theme (JSON, or ?format=toml), and deleting it.
export { deleteTheme as DELETE, getTheme as GET } from "../../lib/http.js";
