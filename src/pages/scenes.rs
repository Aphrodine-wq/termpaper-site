//! Scenes: live windows + the full catalog, by category.

use maud::{html, Markup};

use crate::data::scenes;
use crate::layout::live_win;

pub fn page() -> Markup {
    let all = scenes();
    let mut cats: Vec<String> = Vec::new();
    for s in &all {
        if !cats.contains(&s.category) {
            cats.push(s.category.clone());
        }
    }
    html! {
        section.band.first {
            div.page {
                div.live-grid {
                    (live_win("koi", true))
                    (live_win("rain", false))
                    (live_win("fire", false))
                    (live_win("starfield", false))
                    (live_win("orbits", false))
                    (live_win("boids", false))
                    (live_win("plasma", false))
                    (live_win("meteors", false))
                    (live_win("frost", false))
                    (live_win("sonar", false))
                    (live_win("ocean", false))
                    (live_win("life", false))
                }
            }
        }
        @for cat in &cats {
            section.band {
                div.page {
                    h2.cat-title { (cat) " " span.dim { "(" (all.iter().filter(|s| &s.category == cat).count()) ")" } }
                    div.scene-grid {
                        @for s in all.iter().filter(|s| &s.category == cat) {
                            div.scene-cell {
                                div.name {
                                    i class={"ph " (s.icon)} {}
                                    (s.name)
                                    @if s.studio { span.badge { "Studio" } }
                                }
                                @if s.title != s.name { div.title { (s.title) } }
                                div.desc { (s.desc) }
                                @if !s.variants.is_empty() { div.variants { (s.variants.join(" · ")) } }
                            }
                        }
                    }
                }
            }
        }
    }
}

