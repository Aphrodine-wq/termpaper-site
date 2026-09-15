//! About: same minimal language as home — black space, one floating
//! window, plain lines. No cards, no tables, no chrome.

use maud::{html, Markup};

use crate::data::GITHUB;
use crate::layout::live_win;

pub fn page() -> Markup {
    html! {
        section.about-hero {
            div.page.about-split {
                (live_win("orbits", false))
                div {
                    h1.h-xl { "Wallpaper Engine, " span.accent { "minus the GUI." } }
                    div.btn-row.mt-2 {
                        a.btn href=(GITHUB) { i.ph.ph-github-logo {} "GitHub" }
                        a.btn href={(GITHUB) "/blob/main/LICENSE"} { i.ph.ph-scales {} "MIT License" }
                    }
                }
            }
        }
        section.band.tall {
            div.page.about-facts {
                p { i.ph.ph-stack {} strong { "Depth" } " — background, midground, foreground. Layers you feel, not flat loops." }
                p { i.ph.ph-trend-up {} strong { "Eased motion" } " — gravity, drag, sine breath. Nothing snaps, nothing pops." }
                p { i.ph.ph-lightning {} strong { "Events" } " — anticipation, payoff, decay. Something always happens." }
                p { i.ph.ph-eyedropper {} strong { "Palette discipline" } " — backgrounds stay dark so accents hit hard." }
            }
        }
        section.band.tall {
            div.page.center {
                p.mono.dim { "22 stackable filters — noir · vignette · grain · scanlines · bloom · chroma · …" }
            }
        }
    }
}
