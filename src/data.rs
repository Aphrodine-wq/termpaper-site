//! All site content, ported from the termpaper README and src/scene/mod.rs.

pub struct Scene {
    pub name: &'static str,
    pub desc: &'static str,
    pub icon: &'static str,
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
        desc: "Wallpaper Engine for the terminal. 47 hand-animated truecolor worlds rendered live in your terminal at up to 120 fps.",
        icon: "ph-wallpaper",
        href: "/scenes/",
        cta: "Browse scenes",
        pills: &["47 scenes", "22 filters", "120 fps"],
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

pub const FILTERS: &[&str] = &[
    "scanlines", "vignette", "grain", "warm", "cool", "hue", "crt", "bloom", "duotone",
    "pixelate", "chroma", "spectrum", "edges", "thermal", "warp", "invert", "sepia",
    "posterize", "gamma", "sharpen", "mirror", "noir",
];

pub const LIST_EXCERPT: &[(&str, &str)] = &[
    ("rain", "rain on glass, droplet trails and splashes"),
    ("starfield", "warp-speed stars flying from center"),
    ("fire", "Doom-style fire with a tuned palette"),
    ("koi", "koi pond from above: ripples, lily pads, gliding fish"),
    ("city", "rainy neon metropolis with lightning and traffic"),
    ("abyss", "deep underwater: god rays, fish schools, leviathans"),
];

pub const SCENES: &[Scene] = &[
    Scene { name: "rain", desc: "rain on glass, droplet trails and splashes", icon: "ph-cloud-rain" },
    Scene { name: "starfield", desc: "warp-speed stars flying from center", icon: "ph-star-four" },
    Scene { name: "fire", desc: "Doom-style fire with a tuned palette", icon: "ph-fire" },
    Scene { name: "pipes", desc: "Windows 95 pipes screensaver homage", icon: "ph-pipe" },
    Scene { name: "plasma", desc: "classic demoscene plasma, hue-cycling sine waves", icon: "ph-wave-sine" },
    Scene { name: "aurora", desc: "northern lights over a starry night sky", icon: "ph-sparkle" },
    Scene { name: "life", desc: "Conway's Game of Life with cooling trails, auto-reseed", icon: "ph-squares-four" },
    Scene { name: "boids", desc: "flocking birds with trails, wrap-around edges", icon: "ph-bird" },
    Scene { name: "lava", desc: "lava-lamp metaballs, deep red to yellow-hot", icon: "ph-drop" },
    Scene { name: "tunnel", desc: "texture-mapped tunnel flight, demoscene style", icon: "ph-disc" },
    Scene { name: "dvd", desc: "the bouncing DVD logo meme", icon: "ph-disc" },
    Scene { name: "bump", desc: "lo-fi deadpan TV bumpers, white on black", icon: "ph-television" },
    Scene { name: "canopy", desc: "tree canopy growing from above, organic branching", icon: "ph-tree" },
    Scene { name: "finale", desc: "grand-finale fireworks: crackle, crossettes, salvos", icon: "ph-confetti" },
    Scene { name: "ocean", desc: "night ocean swells under a moonlit glint path", icon: "ph-waves" },
    Scene { name: "circuits", desc: "circuit-board traces with zipping data pulses", icon: "ph-circuitry" },
    Scene { name: "clouds", desc: "daytime sky with drifting fractal clouds", icon: "ph-cloud" },
    Scene { name: "mandel", desc: "Mandelbrot deep zoom into seahorse valley", icon: "ph-spiral" },
    Scene { name: "meteors", desc: "meteor shower with ion trails and bolides", icon: "ph-shooting-star" },
    Scene { name: "koi", desc: "koi pond from above: ripples, lily pads, gliding fish", icon: "ph-fish" },
    Scene { name: "sand", desc: "falling-sand automaton piling stratified dunes", icon: "ph-hourglass" },
    Scene { name: "city", desc: "rainy neon metropolis with lightning and traffic", icon: "ph-city" },
    Scene { name: "abyss", desc: "deep underwater: god rays, fish schools, leviathans", icon: "ph-anchor" },
    Scene { name: "den", desc: "a cozy room with a CRT playing other scenes", icon: "ph-couch" },
    Scene { name: "traffic", desc: "aerial night traffic, long-exposure light streams", icon: "ph-car" },
    Scene { name: "nexus", desc: "glowing nodes linked into a drifting graph, pulses riding edges", icon: "ph-share-network" },
    Scene { name: "ripple", desc: "still black water: raindrop rings, drifting leaves, night breeze", icon: "ph-target" },
    Scene { name: "fireflies", desc: "amber fireflies drifting over a black meadow", icon: "ph-lightbulb" },
    Scene { name: "lanterns", desc: "paper lanterns rising through a black festival night", icon: "ph-candle" },
    Scene { name: "frost", desc: "fern-like frost crystals creeping across black glass", icon: "ph-snowflake" },
    Scene { name: "orbits", desc: "planets tracing luminous orbital trails around a star", icon: "ph-planet" },
    Scene { name: "ribbons", desc: "silk ribbons flowing across the dark", icon: "ph-wind" },
    Scene { name: "sonar", desc: "phosphor radar sweep lighting up drifting contacts", icon: "ph-radar" },
    Scene { name: "tide", desc: "luminous contour ridges morphing like a slow signal", icon: "ph-waveform" },
    Scene { name: "clockwork", desc: "interlocking brass gears turning in the dark", icon: "ph-gear" },
    Scene { name: "grid", desc: "synthwave perspective grid rolling to the horizon", icon: "ph-grid-four" },
    Scene { name: "inkdrop", desc: "ink blooming through still black water", icon: "ph-drop-half" },
    Scene { name: "mosaic", desc: "stained-glass cells breathing and flashing on black", icon: "ph-squares-four" },
    Scene { name: "harmonograph", desc: "glowing spiro curves drawing themselves, then fading", icon: "ph-spiral" },
    Scene { name: "nebula", desc: "deep-space clouds drifting in parallax layers", icon: "ph-stars" },
    Scene { name: "pendulum", desc: "pendulum-wave interference, glowing bobs on faint strings", icon: "ph-timer" },
    Scene { name: "reaction", desc: "reaction-diffusion coral growing and splitting on black", icon: "ph-atom" },
    Scene { name: "meadow", desc: "windswept night grass, dew glints, shooting stars", icon: "ph-grass" },
    Scene { name: "airspace", desc: "realistic sky over fields with planes, contrails, and low passes", icon: "ph-airplane" },
    Scene { name: "aquarium", desc: "side-view tank: caustics, fish, bubbles, drifting plants", icon: "ph-fish-simple" },
    Scene { name: "drive", desc: "driver POV at night: road scrolls, scenery rushes past", icon: "ph-steering-wheel" },
    Scene { name: "candy", desc: "saturated sugar-rush orbs on a neon gradient", icon: "ph-candy" },
];
