//! termpaper-site — a Rust static site generator.
//! `cargo run` renders every page into dist/.
//!
//! The site doubles as Aphrodine's Terminal Tools hub: home showcases all
//! three tools, while /scenes /install /about remain termpaper's pages.

mod data;
mod layout;
mod pages {
    pub mod about;
    pub mod home;
    pub mod launcher;
    pub mod install;
    pub mod scenes;
}

use std::fs;
use std::path::Path;

use layout::Page;

fn write_page(dir: &Path, rel: &str, page: Page) {
    let out_dir = dir.join(rel);
    fs::create_dir_all(&out_dir).unwrap();
    fs::write(out_dir.join("index.html"), layout::render(page).into_string()).unwrap();
    println!("wrote {}", out_dir.join("index.html").display());
}

fn copy_dir(src: &Path, dst: &Path) {
    fs::create_dir_all(dst).unwrap();
    for entry in fs::read_dir(src).unwrap() {
        let entry = entry.unwrap();
        if entry.file_type().unwrap().is_file() {
            fs::copy(entry.path(), dst.join(entry.file_name())).unwrap();
        }
    }
}

fn main() {
    let dist = Path::new("dist");
    fs::create_dir_all(dist).unwrap();

    write_page(dist, "", Page { title: "Aphrodine's Terminal Tools", active: "home", content: pages::home::page() });
    write_page(dist, "launcher", Page { title: "tui-launcher — Aphrodine's Terminal Tools", active: "launcher", content: pages::launcher::page() });
    write_page(dist, "about", Page { title: "About — termpaper", active: "about", content: pages::about::page() });
    write_page(dist, "install", Page { title: "Install — termpaper", active: "install", content: pages::install::page() });
    write_page(dist, "scenes", Page { title: "Scenes — termpaper", active: "scenes", content: pages::scenes::page() });

    fs::copy("assets/style.css", dist.join("style.css")).unwrap();
    copy_dir(Path::new("assets/sprites"), &dist.join("sprites"));
    println!("done -> dist/");
}
