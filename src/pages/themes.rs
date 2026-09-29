//! Themes: the gallery (built-in themes and everyone's), the studio for
//! making one, and a page per theme. The pages are shells; the TypeScript
//! in web/ fills them (web/gallery.ts, web/studio.ts, web/view.ts), and
//! renders everything people wrote as text, never as markup.

use maud::{html, Markup, PreEscaped};

use crate::layout::oneliner;

fn script(name: &str) -> Markup {
    html! { script type="module" src={"/js/" (name) ".js"} {} }
}

pub fn gallery() -> Markup {
    html! {
        section.band.first {
            div.page {
                p.eyebrow { "termpaper themes" }
                h1.h-lg { "A look for every scene." }
                p.lede.mt-1 {
                    "A theme is a colour grade, a palette and a few effects, saved in a small file that works on every scene. "
                    "Try one below, make your own in the studio, and share it with a code."
                }
                div.btn-row.mt-2 {
                    a.btn.primary href="/themes/studio/" { i.ph.ph-paint-brush {} "Make a theme" }
                    a.btn href="#how" { i.ph.ph-terminal {} "Use one" }
                }
            }
        }
        section.band {
            div.page {
                div.theme-toolbar {
                    label.visually-hidden for="q" { "Search themes" }
                    input #q type="search" placeholder="Search: name, colour, mood…" autocomplete="off";
                    div #tags .chip-row {}
                    label.visually-hidden for="sort" { "Sort" }
                    select #sort {
                        option value="featured" { "Built in first" }
                        option value="new" { "Newest" }
                        option value="popular" { "Most installed" }
                    }
                }
                p #status .dim.small {}
                div #themes .theme-grid {}
                div.center.mt-2 { button #more .btn type="button" hidden { "More" } }
            }
        }
        section.band #how {
            div.page {
                h2.h-md { "Use a theme" }
                p.dim.mt-1 { "In termpaper press " span.mono { "?" } ", then Tab to Themes, and pick one. Or from a shell:" }
                div.install-list.mt-1 {
                    (oneliner("termpaper theme install tokyo-night"))
                    (oneliner("termpaper --theme tokyo-night"))
                }
                p.dim.mt-1 {
                    "A share code (it starts with " span.mono { "tp1:" } ") works anywhere a theme name does: paste it on the Themes page (" span.mono { "i" } ") or run "
                    span.mono { "termpaper theme import tp1:…" } "."
                }
            }
        }
        (script("gallery"))
    }
}

pub fn studio() -> Markup {
    html! {
        section.band.first {
            div.page {
                p.eyebrow { "theme studio" }
                h1.h-lg { "Make a theme." }
                p.lede.mt-1 { "Every control termpaper has, on a live preview. Start from a built-in theme or from nothing; bring your terminal's colour scheme along as a palette." }
            }
        }
        section.band {
            div.page {
                div.studio {
                    div.studio-preview {
                        canvas #preview width="96" height="54" {}
                        div.chip-row #scenes {}
                        div.swatches #swatches {}
                    }
                    div.studio-controls #controls {}
                }
                div.studio-actions {
                    div.field-row {
                        label { "Name" input #name maxlength="40" placeholder="My theme"; }
                        label { "By" input #author maxlength="32" placeholder="you"; }
                    }
                    label.wide { "Description" input #description maxlength="160" placeholder="What it does, in a line"; }
                    label.wide { "Tags" input #tags-input maxlength="120" placeholder="dark, warm, film"; }
                    div.btn-row.mt-1 {
                        button #copy-code .btn type="button" { i.ph.ph-copy {} "Copy share code" }
                        button #download .btn type="button" { i.ph.ph-download-simple {} "Download .toml" }
                        button #publish .btn.primary type="button" { i.ph.ph-upload-simple {} "Publish to the gallery" }
                    }
                    p #studio-status .dim.small.mt-1 {}
                    details.mt-1 {
                        summary { "Import a share code, a theme file, or a terminal colour scheme" }
                        p.dim.small { "Paste a tp1: code, a termpaper theme (.toml), or a colour scheme from kitty, Alacritty, Ghostty, iTerm2 or Windows Terminal. A colour scheme becomes the palette." }
                        textarea #import rows="6" spellcheck="false" {}
                        div.btn-row { button #import-go .btn type="button" { "Import" } input #import-file type="file"; }
                    }
                }
            }
        }
        (script("studio"))
    }
}

pub fn view() -> Markup {
    html! {
        section.band.first {
            div.page {
                div #theme .theme-view { p.dim { "Loading…" } }
            }
        }
        (PreEscaped("<noscript><p class=\"page dim\">This page needs JavaScript to show the theme.</p></noscript>"))
        (script("view"))
    }
}
