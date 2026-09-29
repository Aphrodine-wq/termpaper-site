//! Install: minimal — fire window, headline, and plain command rows.

use maud::{html, Markup};

use crate::data::{BINARY_INSTALL, CARGO_GIT, CARGO_PATH, CLONE_INSTALL, INSTALL_AND_RUN, PATH_FIX, WINDOWS_INSTALL};
use crate::layout::{live_win, oneliner};

pub fn page() -> Markup {
    html! {
        section.about-hero {
            div.page.about-split {
                (live_win("fire", false))
                div {
                    h1.h-xl { "One line. " span.accent { "One word." } }
                    (oneliner(INSTALL_AND_RUN))
                    p.dim.mt-1.mono.small { "macOS and Linux. On Windows, in PowerShell:" }
                    div.mt-1 { (oneliner(WINDOWS_INSTALL)) }
                    p.dim.mt-2.mono.small {
                        "Best in a truecolor terminal: Windows Terminal, iTerm2, Ghostty, kitty, WezTerm, Alacritty, foot. "
                        "Terminal.app and the classic Windows console get 256 colours. Rust only when building from source."
                    }
                }
            }
        }
        section.band.tall {
            div.page.install-list {
                (method("windows (powershell)", WINDOWS_INSTALL))
                (method("quick install from a clone", CLONE_INSTALL))
                (method("cargo, local clone", CARGO_PATH))
                (method("cargo, from git", CARGO_GIT))
                (method("prebuilt binary", BINARY_INSTALL))
                (method("arch linux", "cd packaging/arch && makepkg -si"))
                (method("command not found? (macOS, Linux; on Windows open a new terminal)", PATH_FIX))
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
