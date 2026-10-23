//! The frontmatter of a Markdown document: the lines between a `---` on the
//! first line and the next `---`. The one key read is `sources`, a list of
//! virtual paths, one per `- ` line, that the document is written from:
//!
//!   ---
//!   sources:
//!     - scripts/glyph-cli.js#@block:flags
//!   ---

/// `[0, end)`, both fences and the line break after the second included.
pub fn span(text: &str) -> Option<(usize, usize)> {
    let mut lines = text.split_inclusive('\n');
    if lines.next()?.trim_end() != "---" {
        return None;
    }
    let mut at = text.find('\n')? + 1;
    for line in lines {
        at += line.len();
        if line.trim_end() == "---" {
            return Some((0, at));
        }
    }
    None
}

/// The `sources` list, in the order written.
pub fn sources(text: &str) -> Vec<String> {
    let Some((_, end)) = span(text) else { return Vec::new() };
    let mut out = Vec::new();
    let mut inside = false;
    for line in text[..end].lines().skip(1) {
        let item = line.trim_start().strip_prefix("- ");
        if line.trim_end() == "sources:" {
            inside = true;
        } else if inside && line.starts_with([' ', '\t', '-']) && item.is_some() {
            out.push(item.unwrap_or_default().trim().to_string());
        } else {
            inside = false;
        }
    }
    out
}
