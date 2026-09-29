// What each effect does, in a line (termpaper's menu help), and which ones
// have a strength. Order is how the studio lists them: colour first, then
// light, texture, lens, geometry.

export const EFFECT_HELP: [string, string][] = [
  ["warm", "Warm amber cast."],
  ["cool", "Cool blue cast."],
  ["sepia", "Old-photo brown tone."],
  ["noir", "Black and white with deep contrast."],
  ["duotone", "Brightness mapped onto a black-to-accent ramp."],
  ["thermal", "False-colour heat map."],
  ["invert", "Photographic negative."],
  ["hue", "Turns every colour round the wheel (120° at full strength)."],
  ["spectrum", "Colours drift round the wheel, once every ~12 s."],
  ["gamma", "Deeper midtones and shadows."],
  ["posterize", "Flattens colour into a few bands."],
  ["bloom", "Bright areas bleed light."],
  ["halation", "A warm film glow around highlights."],
  ["vignette", "Darkens toward the edges."],
  ["grain", "Animated film grain."],
  ["scanlines", "Darkens every other pixel row."],
  ["crt", "Scanlines, vignette and colour fringing."],
  ["chroma", "Colour fringing toward the edges."],
  ["dither", "Few colours, ordered dithering: 8-bit graphics."],
  ["letterbox", "Cinema bars top and bottom."],
  ["tiltshift", "Sharp band across the middle, blur above and below: a miniature."],
  ["pixelate", "Chunky mosaic."],
  ["warp", "Rows ripple side to side."],
  ["mirror", "Flips the picture left to right."],
  ["kaleido", "Four-fold mirror symmetry."],
  ["edges", "Only outlines glow, on black."],
  ["sharpen", "Crisper detail."],
];

/** `filter::has_amount`. */
export const hasAmount = (name: string): boolean => name !== "mirror" && name !== "kaleido";

/** The effects the preview draws; the rest show in termpaper only. */
export const PREVIEWED = new Set(["vignette", "scanlines", "letterbox", "grain"]);
