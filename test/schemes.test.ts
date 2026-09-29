import { describe, expect, it } from "vitest";
import { paletteFrom, parseScheme } from "../web/schemes.js";

const kitty = `# Tokyo Night
background #1a1b26
foreground #c0caf5
color0 #15161e
color4 #7aa2f7
color5 #bb9af7
color6 #7dcfff
color8 #414868
`;

const ghostty = `background = 1a1b26
foreground = c0caf5
palette = 0=#15161e
palette = 4=#7aa2f7
palette = 5=#bb9af7`;

const alacritty = `[colors.primary]
background = '#1a1b26'
foreground = '#c0caf5'
[colors.normal]
black = '#15161e'
blue = '#7aa2f7'
magenta = '#bb9af7'
[colors.bright]
black = '#414868'`;

const wt = JSON.stringify({ schemes: [{ name: "Tokyo Night", background: "#1A1B26", foreground: "#C0CAF5", black: "#15161E", blue: "#7AA2F7", purple: "#BB9AF7", brightBlack: "#414868" }] });

const iterm = `<?xml version="1.0"?><plist version="1.0"><dict>
<key>Background Color</key><dict><key>Blue Component</key><real>0.149</real><key>Green Component</key><real>0.106</real><key>Red Component</key><real>0.102</real></dict>
<key>Ansi 4 Color</key><dict><key>Blue Component</key><real>0.969</real><key>Green Component</key><real>0.635</real><key>Red Component</key><real>0.478</real></dict>
<key>Foreground Color</key><dict><key>Blue Component</key><real>0.961</real><key>Green Component</key><real>0.792</real><key>Red Component</key><real>0.753</real></dict>
</dict></plist>`;

describe("terminal colour schemes", () => {
  for (const [name, text, format] of [["kitty", kitty, "kitty"], ["ghostty", ghostty, "Ghostty"], ["alacritty", alacritty, "Alacritty"], ["windows terminal", wt, "Windows Terminal"], ["iterm2", iterm, "iTerm2"]] as const) {
    it(`reads ${name}`, () => {
      const s = parseScheme(text);
      expect(s?.format).toBe(format);
      expect(s?.background).toEqual([0x1a, 0x1b, 0x26]);
      const p = paletteFrom(s!);
      expect(p.length).toBeGreaterThanOrEqual(3);
      // darkest first: the background leads, the foreground (or a bright accent) ends
      expect(p[0]).toEqual([0x1a, 0x1b, 0x26]);
    });
  }
  it("refuses what is not a scheme", () => {
    expect(parseScheme("hello there")).toBeUndefined();
    expect(parseScheme("{}")).toBeUndefined();
  });
});
