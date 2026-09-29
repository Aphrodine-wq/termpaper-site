//! All site content, ported from the termpaper README and src/scene/mod.rs.

pub struct Scene {
    pub name: String,
    pub title: String,
    pub desc: String,
    pub icon: &'static str,
    pub category: String,
    pub studio: bool,
    pub variants: Vec<String>,
}

pub struct Tool {
    pub name: &'static str,
    pub desc: &'static str,
    pub icon: &'static str,
    pub href: &'static str,
    pub cta: &'static str,
    pub pills: &'static [&'static str],
}

pub const GITHUB: &str = "https://github.com/Aphrodine-wq/termpaper";

pub const GITHUB_PROFILE: &str = "https://github.com/Aphrodine-wq";

pub const TOOLS: &[Tool] = &[
    Tool {
        name: "termpaper",
        desc: "Wallpaper Engine for the terminal. 101 scenes, 50 of them real places rendered live on your GPU, in any terminal on Linux, macOS and Windows.",
        icon: "ph-wallpaper",
        href: "/scenes/",
        cta: "Browse scenes",
        pills: &["101 scenes", "34 themes", "27 effects"],
    },
    Tool {
        name: "tui-launcher",
        desc: "A five-column carousel application launcher for Linux desktops, with momentum physics, live icons and a built-in settings deck.",
        icon: "ph-app-window",
        href: "/launcher/",
        cta: "Take the tour",
        pills: &["ratatui", "icon carousel", "12 themes"],
    },
    Tool {
        name: "steam-tui",
        desc: "Your Steam library in the terminal — browse, install and launch without ever leaving the keyboard.",
        icon: "ph-steam-logo",
        href: GITHUB_PROFILE,
        cta: "GitHub",
        pills: &["steamcmd", "keyboard-first", "TUI"],
    },
];

pub const INSTALL_ONE_LINER: &str =
    "curl -fsSL https://raw.githubusercontent.com/Aphrodine-wq/termpaper/main/install.sh | bash";

pub const INSTALL_AND_RUN: &str =
    "curl -fsSL https://raw.githubusercontent.com/Aphrodine-wq/termpaper/main/install.sh | bash && termpaper rain";

pub const CLONE_INSTALL: &str =
    "git clone https://github.com/Aphrodine-wq/termpaper.git && cd termpaper && ./install.sh";

pub const CARGO_PATH: &str = "cargo install --path . --locked";

pub const CARGO_GIT: &str =
    "cargo install --git https://github.com/Aphrodine-wq/termpaper.git --locked";

pub const BINARY_INSTALL: &str =
    "curl -fsSL https://raw.githubusercontent.com/Aphrodine-wq/termpaper/main/install.sh | bash -s -- --binary";

pub const PATH_FIX: &str = "export PATH=\"$HOME/.cargo/bin:$PATH\"";

pub const WINDOWS_INSTALL: &str =
    "irm https://raw.githubusercontent.com/Aphrodine-wq/termpaper/main/install.ps1 | iex";

pub const FILTERS: &[&str] = &[
    "scanlines", "vignette", "grain", "warm", "cool", "hue", "crt", "bloom", "duotone",
    "pixelate", "chroma", "spectrum", "edges", "thermal", "warp", "invert", "sepia",
    "posterize", "gamma", "sharpen", "mirror", "noir", "letterbox", "halation", "dither",
    "tiltshift", "kaleido",
];

pub const LIST_EXCERPT: &[(&str, &str)] = &[
    ("rain", "rain on glass, droplet trails and splashes"),
    ("starfield", "warp-speed stars flying from center"),
    ("fire", "Doom-style fire with a tuned palette"),
    ("koi", "koi pond from above: ripples, lily pads, gliding fish"),
    ("city", "rainy neon metropolis with lightning and traffic"),
    ("abyss", "deep underwater: god rays, fish schools, leviathans"),
];

/// The scene catalog, from `termpaper list --json` (assets/catalog.json).
#[derive(serde::Deserialize)]
pub struct Catalog {
    pub version: String,
    pub scenes: Vec<CatalogScene>,
}

#[derive(serde::Deserialize)]
pub struct CatalogScene {
    pub name: String,
    pub title: String,
    pub category: String,
    pub category_label: String,
    pub description: String,
    pub variants: Vec<String>,
    pub studio: bool,
}

pub fn catalog() -> Catalog {
    serde_json::from_str(include_str!("../assets/catalog.json")).expect("assets/catalog.json")
}

/// Every scene, Studio categories first, as the site lists them.
pub fn scenes() -> Vec<Scene> {
    catalog()
        .scenes
        .into_iter()
        .map(|c| Scene {
            icon: icon_for(&c),
            name: c.name,
            title: c.title,
            desc: c.description,
            category: c.category_label,
            studio: c.studio,
            variants: c.variants,
        })
        .collect()
}

fn icon_for(c: &CatalogScene) -> &'static str {
    match c.category.as_str() {
        "coast" => "ph-waves",
        "wilds" => "ph-mountains",
        "weather" => "ph-cloud-sun",
        "city" => "ph-buildings",
        "cozy" => "ph-coffee",
        "space" => "ph-planet",
        _ => classic_icon(&c.name),
    }
}

fn classic_icon(name: &str) -> &'static str {
    match name {
        "rain" => "ph-cloud-rain",
        "starfield" => "ph-star-four",
        "fire" => "ph-fire",
        "pipes" => "ph-pipe",
        "plasma" => "ph-wave-sine",
        "aurora" => "ph-sparkle",
        "life" => "ph-squares-four",
        "boids" => "ph-bird",
        "lava" => "ph-drop",
        "tunnel" => "ph-disc",
        "dvd" => "ph-disc",
        "bump" => "ph-television",
        "canopy" => "ph-tree",
        "finale" => "ph-confetti",
        "ocean" => "ph-waves",
        "circuits" => "ph-circuitry",
        "clouds" => "ph-cloud",
        "mandel" => "ph-spiral",
        "meteors" => "ph-shooting-star",
        "koi" => "ph-fish",
        "sand" => "ph-hourglass",
        "city" => "ph-city",
        "abyss" => "ph-anchor",
        "den" => "ph-couch",
        "traffic" => "ph-car",
        "nexus" => "ph-share-network",
        "ripple" => "ph-target",
        "fireflies" => "ph-lightbulb",
        "lanterns" => "ph-candle",
        "frost" => "ph-snowflake",
        "orbits" => "ph-planet",
        "ribbons" => "ph-wind",
        "sonar" => "ph-radar",
        "tide" => "ph-waveform",
        "clockwork" => "ph-gear",
        "grid" => "ph-grid-four",
        "inkdrop" => "ph-drop-half",
        "mosaic" => "ph-squares-four",
        "harmonograph" => "ph-spiral",
        "nebula" => "ph-stars",
        "pendulum" => "ph-timer",
        "reaction" => "ph-atom",
        "meadow" => "ph-grass",
        "airspace" => "ph-airplane",
        "aquarium" => "ph-fish-simple",
        "drive" => "ph-steering-wheel",
        "candy" => "ph-candy",
        _ => "ph-sparkle",
    }
}

