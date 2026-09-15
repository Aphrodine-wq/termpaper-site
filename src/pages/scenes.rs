//! Scenes: live windows + the full 47-scene catalog.

use maud::{html, Markup};

use crate::data::SCENES;
use crate::layout::live_win;

pub fn page() -> Markup {
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
        section.band {
            div.page {
                div.scene-grid {
                    @for s in SCENES {
                        div.scene-cell {
                            div.name { i class={"ph " (s.icon)} {} (s.name) }
                            div.desc { (s.desc) }
                        }
                    }
                }
            }
        }
    }
}
