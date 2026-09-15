//! Home: full-viewport desktop hero with three live scenes.

use maud::{html, Markup};

use crate::data::{INSTALL_ONE_LINER, TOOLS};
use crate::layout::{desktop, live_win, oneliner};

pub fn page() -> Markup {
    html! {
        section.hero {
            h1.visually-hidden { "Aphrodine's Terminal Tools — Rust apps that live in your terminal" }
            (desktop(html! {
                p.hero-tag { i.ph.ph-terminal-window {} "Terminal Tools" }
                (live_win("koi", true))
                (live_win("orbits", false))
                (live_win("boids", false))
                (live_win("starfield", false))
                (live_win("finale", false))
            }))
            div.hero-dock {
                div.btn-row {
                    a.btn.primary href="/install/" { i.ph.ph-download-simple {} "Install termpaper" }
                }
                (oneliner(INSTALL_ONE_LINER))
            }
        }
        section.band.tall {
            div.page {
                div.menu-panel {
                    div.menu-tabs {
                        span { "Scenes" }
                        span { "Instances" }
                        span.on { "Settings" }
                        span { "Keybinds" }
                        span { "About" }
                    }
                    (setting("Pixels", "half"))
                    (setting("Detail", "medium"))
                    (setting("Theme", "ink"))
                    (setting("Hue", "0"))
                    (setting("Saturation", "1.0"))
                    (setting("Contrast", "1.0"))
                    (setting("Speed", "2.0"))
                    (setting("FPS", "120"))
                    (setting("Link", "on"))
                    (setting("Group", "wallpaper"))
                    (setting("Clock", "on"))
                    div.menu-row {
                        span.k { "Filters" }
                        span.v { "noir · vignette · grain" }
                    }
                    div.menu-hint { "◂/▸ adjusts · Esc closes · the art never stops" }
                }
            }
        }
        section.band #tools {
            div.page {
                p.eyebrow { i.ph.ph-wrench {} "the toolbox" }
                h2.h-lg.mb-2 { "Three tools. " span.accent { "One black window." } }
                div.cards.c3 {
                    @for tool in TOOLS {
                        div.card {
                            i.ph class={(tool.icon)} {}
                            h3 { (tool.name) }
                            p { (tool.desc) }
                            div.pill-row.mt-1 {
                                @for pill in tool.pills {
                                    span.pill { (pill) }
                                }
                            }
                            div.btn-row.mt-1 {
                                a.btn href=(tool.href) { i.ph.ph-arrow-right {} (tool.cta) }
                            }
                        }
                    }
                }
            }
        }
    }
}

fn setting(key: &str, value: &str) -> Markup {
    html! {
        div.menu-row {
            span.k { (key) }
            span.v { span.arrow { "◂ " } (value) span.arrow { " ▸" } }
        }
    }
}
