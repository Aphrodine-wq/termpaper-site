//! Shared page chrome: <head>, nav, footer, the Hyprland desktop shell,
//! live-scene windows, and small building blocks (buttons, one-liners).

use maud::{html, Markup, PreEscaped, DOCTYPE};

use crate::data::{GITHUB, GITHUB_PROFILE};

pub struct Page<'a> {
    pub title: &'a str,
    pub active: &'a str,
    pub content: Markup,
}

pub fn render(page: Page) -> Markup {
    html! {
        (DOCTYPE)
        html lang="en" {
            head {
                meta charset="utf-8";
                meta name="viewport" content="width=device-width, initial-scale=1";
                title { (page.title) }
                meta name="description" content="Aphrodine's terminal tools — termpaper, tui-launcher, steam-tui. Rust apps that live in your terminal.";
                link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23080a10'/%3E%3Cpath d='M6 16c4-5 9-7 14-6 3 1 5 3 6 6-1 3-3 5-6 6-5 1-10-1-14-6z' fill='%23c9cedb'/%3E%3Ccircle cx='21' cy='14.5' r='1.4' fill='%23080a10'/%3E%3C/svg%3E";
                link rel="preconnect" href="https://fonts.googleapis.com";
                link rel="preconnect" href="https://fonts.gstatic.com" crossorigin;
                link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;600;700&display=swap" rel="stylesheet";
                link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css";
                link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/fill/style.css";
                link rel="stylesheet" href="/style.css";
            }
            body {
                (nav(page.active))
                main { (page.content) }
                (footer())
                (copy_script())
            }
        }
    }
}

fn nav(active: &str) -> Markup {
    let link = |href: &str, route: &str, icon: &str, label: &str| -> Markup {
        html! {
            li {
                a href=(href) class={ @if route == active { "active" } } {
                    i class={(icon)} {}
                    span.lbl { (label) }
                }
            }
        }
    };
    html! {
        nav.nav {
            div.nav-inner {
                a.wordmark href="/" { i.ph.ph-terminal-window {} "aphrodine" }
                ul.nav-links {
                    (link("/", "home", "ph ph-house", "home"))
                    (link("/#tools", "tools", "ph ph-wrench", "tools"))
                    (link("/launcher/", "launcher", "ph ph-rocket-launch", "launcher"))
                    (link("/scenes/", "scenes", "ph ph-film-strip", "scenes"))
                    (link("/install/", "install", "ph ph-download-simple", "install"))
                    (link("/about/", "about", "ph ph-info", "about"))
                }
                a.nav-gh href=(GITHUB_PROFILE) aria-label="GitHub profile" { i.ph.ph-github-logo {} }
            }
        }
    }
}

fn footer() -> Markup {
    html! {
        footer.footer {
            div.footer-inner {
                div {
                    a.wordmark href="/" { i.ph.ph-terminal-window {} "aphrodine" }
                    p.dim.mt-1 { "Terminal tools, forged in Rust." }
                }
                div {
                    h4 { "Tools" }
                    ul {
                        li { a href="/scenes/" { "termpaper" } }
                        li { a href=(GITHUB_PROFILE) { "tui-launcher" } }
                        li { a href=(GITHUB_PROFILE) { "steam-tui" } }
                    }
                }
                div {
                    h4 { "Project" }
                    ul {
                        li { a href=(GITHUB) { "termpaper GitHub" } }
                        li { a href={(GITHUB) "/blob/main/LICENSE"} { "MIT License" } }
                        li { a href=(GITHUB_PROFILE) { "@Aphrodine-wq" } }
                    }
                }
            }
            div.footer-bottom { "aphrodine's terminal tools — your terminal never had to be boring. Built with Rust, like the engines." }
        }
    }
}

/// A live scene window: a square div animated by pure CSS steps() over a
/// vertical sprite strip dumped from the real engine. `active` draws the
/// silver focused-window border.
pub fn live_win(scene: &str, active: bool) -> Markup {
    html! {
        div.win class={ @if active { "active" } } {
            div.scene style={"background-image:url('/sprites/" (scene) ".png')"} {}
        }
    }
}

/// The Hyprland desktop shell: just windows on the void.
pub fn desktop(windows: Markup) -> Markup {
    html! {
        div.desktop {
            div.wins.scatter { (windows) }
        }
    }
}

/// Copy-to-clipboard one-liner.
pub fn oneliner(cmd: &str) -> Markup {
    html! {
        div.oneliner {
            code { span.prompt { "$" } span { (cmd) } }
            button.copy-btn type="button" data-copy=(cmd) title="Copy to clipboard" aria-label="Copy to clipboard" {
                i.ph.ph-copy {}
            }
        }
    }
}

/// `$ command` line for static terminal listings.
pub fn cmd_line(cmd: &str, comment: Option<&str>) -> Markup {
    html! {
        div {
            span.prompt { "$ " }
            span.cmd { (cmd) }
            @if let Some(c) = comment {
                span.comment { "   # " (c) }
            }
        }
    }
}

/// A fake terminal window for static command output.
pub fn term_window(title: &str, body: Markup) -> Markup {
    html! {
        div.term {
            div.term-bar {
                span.dot.r {}
                span.dot.y {}
                span.dot.g {}
                span.term-title { (title) }
            }
            div.term-body { (body) }
        }
    }
}

fn copy_script() -> Markup {
    PreEscaped(
        r#"<script>
document.addEventListener("click", function (e) {
  var btn = e.target.closest(".copy-btn");
  if (!btn) return;
  var text = btn.getAttribute("data-copy");
  function done() {
    btn.classList.add("copied");
    var icon = btn.querySelector(".ph");
    var prev = icon ? icon.className : null;
    if (icon) icon.className = "ph ph-check";
    setTimeout(function () {
      btn.classList.remove("copied");
      if (icon && prev) icon.className = prev;
    }, 1400);
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, done);
  } else { done(); }
});
</script>"#
            .to_string(),
    )
}
