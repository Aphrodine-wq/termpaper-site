//! The site's pictures, straight from the real termpaper engine.
//!
//! - `assets/sprites/<scene>.png`: each scene at Medium detail through the
//!   genuine noir filter, 96x96 grayscale frames in a vertical strip, for
//!   the live windows (pure CSS `steps()`).
//! - `assets/frames/<scene>.png`: colour strips (96x54, 24 frames) the theme
//!   gallery and studio run through a theme's look in the browser: Classic
//!   scenes on the CPU, Studio scenes on the GPU.
//!
//! ```text
//! cargo run --release --manifest-path tools/frames/Cargo.toml [sprites|previews]
//! ```
use rand::{rngs::StdRng, SeedableRng};
use std::fs::{self, File};
use std::io::BufWriter;
use termpaper::canvas::Canvas;
use termpaper::filter;
use termpaper::scene::{self, Detail, SceneOptions};

const W: usize = 96;
const H: usize = 96;
const FRAMES: usize = 360; // 6s loop at 60fps
const WARMUP: usize = 360; // 6s to get scenes mid-flow
const DT: f32 = 2.0 / 60.0; // speed = 2.0, sampled at 60fps
const OUT_DIR: &str = "assets/sprites";
const PREVIEW_DIR: &str = "assets/frames";
const PW: usize = 96;
const PH: usize = 54;
const PFRAMES: usize = 24;

fn dump(name: &str, theme: Option<&str>) {
    let opts = SceneOptions {
        theme: theme.map(|t| t.to_string()),
        detail: Detail::Medium,
        text_scale: None,
        pixels: Default::default(),
    };
    let mut s = scene::create(name, &opts, StdRng::seed_from_u64(7)).expect("scene exists");
    let mut c = Canvas::new(W, H);
    for _ in 0..WARMUP {
        s.update(DT, &mut c);
    }
    // vertical strip: W x H*FRAMES
    let mut strip = vec![0u8; W * H * FRAMES];
    for f in 0..FRAMES {
        s.update(DT, &mut c);
        filter::noir(&mut c);
        for y in 0..H {
            for x in 0..W {
                let col = c.get(x as i32, y as i32).color;
                debug_assert!(col.0 == col.1 && col.1 == col.2, "noir must be grayscale");
                strip[(f * H + y) * W + x] = col.0;
            }
        }
    }
    // seamless loop: crossfade the tail back into frame 0
    const BLEND: usize = 36; // last 0.6s eases into the first frame
    let frame0: Vec<u8> = strip[..W * H].to_vec();
    for i in 0..BLEND {
        let t = (i + 1) as f32 / BLEND as f32;
        let off = (FRAMES - BLEND + i) * W * H;
        for p in 0..W * H {
            let a = strip[off + p] as f32;
            let b = frame0[p] as f32;
            strip[off + p] = (a + (b - a) * t).round() as u8;
        }
    }
    let path = format!("{OUT_DIR}/{name}.png");
    let file = File::create(&path).unwrap();
    let mut encoder = png::Encoder::new(BufWriter::new(file), W as u32, (H * FRAMES) as u32);
    encoder.set_color(png::ColorType::Grayscale);
    encoder.set_depth(png::BitDepth::Eight);
    let mut writer = encoder.write_header().unwrap();
    writer.write_image_data(&strip).unwrap();
    println!("{name}: {} frames -> {path}", FRAMES);
}

fn write_rgb(path: &str, w: usize, h: usize, data: &[u8]) {
    let file = File::create(path).unwrap();
    let mut encoder = png::Encoder::new(BufWriter::new(file), w as u32, h as u32);
    encoder.set_color(png::ColorType::Rgb);
    encoder.set_depth(png::BitDepth::Eight);
    encoder.set_compression(png::Compression::Best);
    let mut writer = encoder.write_header().unwrap();
    writer.write_image_data(data).unwrap();
}

/// A Classic scene in colour: 24 frames, a quarter second apart.
fn preview_classic(name: &str, theme: Option<&str>) {
    let opts = SceneOptions { theme: theme.map(str::to_string), detail: Detail::Medium, text_scale: None, pixels: Default::default() };
    let mut s = scene::create(name, &opts, StdRng::seed_from_u64(7)).expect("scene exists");
    let mut c = Canvas::new(PW, PH);
    for _ in 0..240 {
        s.update(1.0 / 60.0, &mut c);
    }
    let mut strip = Vec::with_capacity(PW * PH * PFRAMES * 3);
    for _ in 0..PFRAMES {
        for _ in 0..15 {
            s.update(1.0 / 60.0, &mut c);
        }
        for y in 0..PH {
            for x in 0..PW {
                let col = c.get(x as i32, y as i32).color;
                strip.extend_from_slice(&[col.0, col.1, col.2]);
            }
        }
    }
    let path = format!("{PREVIEW_DIR}/{name}.png");
    write_rgb(&path, PW, PH * PFRAMES, &strip);
    println!("{name}: {PFRAMES} colour frames -> {path}");
}

/// A Studio scene in colour, rendered on the GPU (four samples a pixel).
fn preview_studio(g: &mut termpaper::gpu::Gpu, name: &str, theme: u32) {
    use termpaper::gpu;
    use termpaper::scene::shader;
    let spec = shader::SHADER_SCENES.iter().find(|s| s.name == name).expect("studio scene");
    let composed = shader::compose(spec);
    let mut strip = Vec::with_capacity(PW * PH * PFRAMES * 3);
    for f in 0..PFRAMES {
        let d = gpu::FrameDesc {
            view: gpu::ShaderView::for_canvas((PW, PH), (0, 0), 1.0),
            window: (PW, PH),
            time: gpu::shader_time(20_000 + f as u64 * 250, 1.0),
            speed: 1.0,
            seed: 7,
            theme,
            detail: Detail::Medium,
            spp: 4,
            mirror: false,
            kaleido: false,
            exposure: 0.0,
        };
        let px = g.render_shader_pixels(name, &composed, &gpu::uniforms(&d)).expect("render");
        for v in &px.data {
            strip.extend_from_slice(&[(v & 0xff) as u8, ((v >> 8) & 0xff) as u8, ((v >> 16) & 0xff) as u8]);
        }
    }
    let path = format!("{PREVIEW_DIR}/{name}.png");
    write_rgb(&path, PW, PH * PFRAMES, &strip);
    println!("{name}: {PFRAMES} colour frames (GPU) -> {path}");
}

fn previews() {
    fs::create_dir_all(PREVIEW_DIR).unwrap();
    preview_classic("koi", None);
    preview_classic("aurora", None);
    match termpaper::gpu::Gpu::new(1, 1, 1) {
        Some(mut g) => {
            for (name, theme) in [("tokyo", 0), ("bigsur", 0), ("lofi", 0), ("sakura", 0)] {
                preview_studio(&mut g, name, theme);
            }
        }
        None => eprintln!("no GPU: Studio previews skipped"),
    }
}

fn main() {
    if std::env::args().nth(1).as_deref() == Some("previews") {
        return previews();
    }
    fs::create_dir_all(OUT_DIR).unwrap();
    dump("koi", Some("ink"));
    dump("rain", None);
    dump("fire", None);
    dump("starfield", None);
    dump("orbits", None);
    dump("boids", None);
    dump("plasma", None);
    dump("meteors", None);
    dump("frost", None);
    dump("sonar", None);
    dump("ocean", None);
    dump("life", None);
    dump("finale", None);
}
