//! Launcher tour: authentic frames captured live from tui-launcher
//! running headless — same philosophy as the termpaper sprites.

use maud::{html, Markup, PreEscaped};

use crate::data::GITHUB_PROFILE;
use crate::layout::term_window;

/// A steady flick across the carousel, filmed at ~145 ms cadence with
/// motion verified uniform (±8%) before use. Played forward then backward
/// as a seamless ping-pong loop, pure CSS.
const FILM_MS: i32 = 270;
const SWEEP: [&str; 9] = [
    include_str!("../../assets/launcher/film/q00.html"),
    include_str!("../../assets/launcher/film/q01.html"),
    include_str!("../../assets/launcher/film/q02.html"),
    include_str!("../../assets/launcher/film/q03.html"),
    include_str!("../../assets/launcher/film/q04.html"),
    include_str!("../../assets/launcher/film/q05.html"),
    include_str!("../../assets/launcher/film/q06.html"),
    include_str!("../../assets/launcher/film/q07.html"),
    include_str!("../../assets/launcher/film/q08.html"),
];

fn film() -> Markup {
    // palindrome: rest, sweep out, sweep back — ends where it began
    let mut order: Vec<&str> = SWEEP.to_vec();
    order.extend(SWEEP[1..8].iter().rev());
    let n = order.len() as i32;
    html! {
        div.film {
            @for (i, frame) in order.iter().enumerate() {
                div.film-frame
                    style={ "animation-delay:" ((i as i32 - n) * FILM_MS) "ms" }
                {
                    (PreEscaped(frame.to_string()))
                }
            }
        }
    }
}

pub fn page() -> Markup {
    let glide = PreEscaped(include_str!("../../assets/launcher/glide.html").to_string());
    let settings =
        PreEscaped(include_str!("../../assets/launcher/settings-mono.html").to_string());

    html! {
        section.band.first {
            div.page.center {
                h1.h-xl { "Every app. " span.accent { "One keystroke." } }
                p.lede.center.mt-1 { "tui-launcher lines up your desktop applications in a five-column carousel of live icons. Flick through them with momentum physics, hit enter, get on with your day." }
                div.btn-row.mt-2 {
                    a.btn.primary href=(GITHUB_PROFILE) { i.ph.ph-github-logo {} "GitHub" }
                    a.btn href="/#tools" { i.ph.ph-arrow-left {} "All tools" }
                }
                div.shot.mt-2 {
                    (term_window("aphrodine@hyprland — tui-launcher — live", film()))
                }
            }
        }
        section.band.tall {
            div.page.center {
                h2.h-lg { "Scroll that " span.accent { "glides." } }
                p.lede.center.mt-1 { "Wheel flicks stack into momentum and ease out like a phone — fast scrolls sweep several apps before settling." }
                div.shot.mt-2 {
                    (term_window("mid-flick — the icons are still traveling", glide))
                }
            }
        }
        section.band {
            div.page {
                h2.h-lg { "A settings deck " span.accent { "built in." } }
                p.lede.mt-1.mb-2 { "Twelve themes, five accents, border styles, motion speed, live icon sizing — every knob adjustable right in the app. No config files required." }
                div.shot {
                    (term_window("press s anywhere — the deck opens over the carousel", settings))
                }
                div.pill-row.mt-2.center {
                    span.pill { "h / l — browse" }
                    span.pill { "j / k — jump by five" }
                    span.pill { "enter — open" }
                    span.pill { "s — setup" }
                    span.pill { "esc — close" }
                }
            }
        }
    }
}
