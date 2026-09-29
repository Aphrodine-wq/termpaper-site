import { describe, expect, it } from "vitest";
import vectors from "../web/test/fixtures/theme_vectors.json" with { type: "json" };
import { nodeCodec } from "../lib/codec.js";
import {
  base64urlDecode, base64urlEncode, fromCode, graded, lookFrom, slugify, themeFrom, toCode, toPlain, toToml, validate,
  type Rgb,
} from "../web/theme.js";
import { parse as parseToml } from "smol-toml";

describe("the look, against the Rust", () => {
  for (const v of vectors.looks) {
    it(`${v.name}: every colour within one step`, () => {
      const look = lookFrom(v.look as Record<string, unknown>);
      let worst = 0;
      vectors.inputs.forEach((c, i) => {
        const got = graded(c as Rgb, look);
        const want = v.out[i]!;
        for (let k = 0; k < 3; k++) worst = Math.max(worst, Math.abs(got[k]! - want[k]!));
      });
      expect(worst).toBeLessThanOrEqual(1);
    });
  }
});

/** f32 values arrive as 1.35 from one side and 1.350000023841858 from the
 *  other: compare to five places. */
const norm = (v: unknown): unknown =>
  typeof v === "number" ? Math.round(v * 1e5) / 1e5
  : Array.isArray(v) ? v.map(norm)
  : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, norm(x)]))
  : v;

describe("share codes", () => {
  it("every built-in theme's Rust code decodes to its theme", async () => {
    for (const c of vectors.codes) {
      const { theme, warnings } = await fromCode(c.code, nodeCodec);
      expect(warnings).toEqual([]);
      const want = themeFrom(c.theme);
      validate(want);
      expect(norm(toPlain(theme))).toEqual(norm(toPlain(want)));
    }
  });

  it("round-trips through our own codes", async () => {
    for (const c of vectors.codes) {
      const t = themeFrom(c.theme);
      validate(t);
      const back = await fromCode(await toCode(t, nodeCodec), nodeCodec);
      expect(toPlain(back.theme)).toEqual(toPlain(t));
    }
  });

  it("refuses what is not a code", async () => {
    for (const bad of vectors.bad_codes) {
      await expect(fromCode(bad, nodeCodec)).rejects.toThrow();
    }
  });

  it("base64url matches the Rust alphabet, unpadded", () => {
    const data = new Uint8Array([0, 1, 2, 250, 251, 252, 253]);
    const s = base64urlEncode(data);
    expect(s).not.toContain("=");
    expect(Array.from(base64urlDecode(s)!)).toEqual(Array.from(data));
  });
});

describe("files and names", () => {
  it("TOML written here reads back to the same theme", () => {
    for (const c of vectors.codes) {
      const t = themeFrom(c.theme);
      validate(t);
      const back = themeFrom(parseToml(toToml(t)));
      validate(back);
      expect(toPlain(back)).toEqual(toPlain(t));
    }
  });

  it("validation cleans up and refuses the unfixable", () => {
    const t = themeFrom({ name: "  x\u0007y  ", tags: ["A", "", "b"], grade: { exposure: 9 }, effects: { stack: ["bloom", "nope"] } });
    const w = validate(t);
    expect(t.name).toBe("xy");
    expect(t.tags).toEqual(["a", "b"]);
    expect(t.look.grade.exposure).toBe(2);
    expect(t.look.effects.stack).toEqual(["bloom"]);
    expect(w.length).toBeGreaterThan(0);
    expect(() => validate(themeFrom({ name: "   " }))).toThrow(/name/);
    expect(() => validate(themeFrom({ name: "x", format: 9 }))).toThrow(/format/);
    const scenes = new Map([["hongkong", ["night", "bluehour"]]]);
    const s = themeFrom({ name: "x", scene: { name: "hongkong", variant: "noon" } });
    expect(validate(s, scenes)).toContain("scene `hongkong` has no variant `noon`");
    expect(s.scene).toEqual({ name: "hongkong" });
  });

  it("slugs like the Rust", () => {
    expect(slugify("Rosé Pine")).toBe("rose-pine");
    expect(slugify("Teal & Orange")).toBe("teal-and-orange");
    expect(slugify("  !!  ")).toBe("theme");
  });
});
