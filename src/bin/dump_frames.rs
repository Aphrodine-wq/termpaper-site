//! Regenerate the site's live-preview sprites straight from the real
//! termpaper engine: each scene runs at Medium detail through the genuine
//! noir filter, captured as 96x96 grayscale frames and written as a
//! vertical PNG strip (one column, 72 frames) so the site can animate it
//! with pure CSS steps().
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

fn dump(name: &str, theme: Option<&str>) {
    let opts = SceneOptions {
        theme: theme.map(|t| t.to_string()),
        detail: Detail::Medium,
        text_scale: None,
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

fn main() {
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
