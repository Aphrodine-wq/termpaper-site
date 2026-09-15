//! Install: minimal — fire window, headline, and plain command rows.

use maud::{html, Markup};

use crate::data::{BINARY_INSTALL, CARGO_GIT, CARGO_PATH, CLONE_INSTALL, INSTALL_AND_RUN, PATH_FIX};
use crate::layout::{live_win, oneliner};

pub fn page() -> Markup {
    html! {
        section.about-hero {
            div.page.about-split {
                (live_win("fire", false))
                div {
                    h1.h-xl { "One line. " span.accent { "One word." } }
                    (oneliner(INSTALL_AND_RUN))
                    p.dim.mt-2.mono.small {
                        "needs a truecolor terminal — kitty, ghostty, alacritty, foot, wezterm. Rust only when building from source."
                    }
                }
            }
        }
        section.band.tall {
            div.page.install-list {
                (method("quick install", CLONE_INSTALL))
                (method("cargo, local clone", CARGO_PATH))
                (method("cargo, from git", CARGO_GIT))
                (method("prebuilt binary", BINARY_INSTALL))
                (method("arch linux", "cd packaging/arch && makepkg -si"))
                (method("command not found?", PATH_FIX))
            }
        }
    }
}

fn method(label: &str, cmd: &str) -> Markup {
    html! {
        div.method {
            p.mono.method-label { (label) }
            (oneliner(cmd))
        }
    }
}
