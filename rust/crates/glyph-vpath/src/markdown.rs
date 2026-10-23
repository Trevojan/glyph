//! Markdown: a section is a heading and everything under it, up to the next
//! heading of the same level or higher. The selector is the heading's slug as
//! GitHub writes it, so a link that works on GitHub works here; a repeated slug
//! takes `-1`, `-2`, in document order. Headings inside a code fence and in the
//! frontmatter are not headings.

use crate::{frontmatter, Node};

pub fn tree(text: &str) -> Vec<Node> {
    let body = frontmatter::span(text).map_or(0, |(_, end)| end);
    let mut heads: Vec<(usize, &str, usize)> = Vec::new();
    let mut fence: Option<(u8, usize)> = None;
    let mut at = 0;
    for line in text.split_inclusive('\n') {
        let start = at;
        at += line.len();
        if start < body {
            continue;
        }
        let line = line.trim_end_matches(['\n', '\r']);
        let trimmed = line.trim_start_matches(' ');
        if line.len() - trimmed.len() > 3 {
            continue;
        }
        if let Some(mark) = fence_mark(trimmed) {
            fence = match fence {
                None => Some(mark),
                Some((c, n)) if c == mark.0 && mark.1 >= n && trimmed[mark.1..].trim().is_empty() => None,
                open => open,
            };
            continue;
        }
        if fence.is_some() {
            continue;
        }
        if let Some((level, title)) = heading(trimmed) {
            heads.push((level, title, start));
        }
    }

    let mut nodes = vec![Node::whole(text)];
    let mut seen: Vec<(String, usize)> = Vec::new();
    for (j, &(level, title, start)) in heads.iter().enumerate() {
        let end = heads[j + 1..].iter().find(|h| h.0 <= level).map_or(text.len(), |h| h.2);
        let base = slug(title);
        let n = match seen.iter_mut().find(|(s, _)| *s == base) {
            Some((_, n)) => { *n += 1; *n }
            None => { seen.push((base.clone(), 0)); 0 }
        };
        let selector = if n == 0 { base } else { format!("{base}-{n}") };
        nodes.push(Node { selector, start, end, depth: level });
    }
    nodes
}

fn fence_mark(line: &str) -> Option<(u8, usize)> {
    let c = *line.as_bytes().first()?;
    if c != b'`' && c != b'~' {
        return None;
    }
    let n = line.bytes().take_while(|&b| b == c).count();
    (n >= 3).then_some((c, n))
}

fn heading(line: &str) -> Option<(usize, &str)> {
    let level = line.bytes().take_while(|&b| b == b'#').count();
    if !(1..=6).contains(&level) {
        return None;
    }
    let rest = &line[level..];
    if !rest.is_empty() && !rest.starts_with([' ', '\t']) {
        return None;
    }
    let title = rest.trim();
    let bare = title.trim_end_matches('#');
    let title = if bare.len() < title.len() && (bare.is_empty() || bare.ends_with([' ', '\t'])) { bare.trim_end() } else { title };
    Some((level, title))
}

/// GitHub's slug: links read as their text, lower case, every character that
/// is not a letter, a digit, a space, `-` or `_` dropped, and each space a `-`.
pub fn slug(title: &str) -> String {
    unlink(title)
        .to_lowercase()
        .chars()
        .filter(|c| c.is_alphanumeric() || matches!(c, ' ' | '-' | '_'))
        .map(|c| if c == ' ' { '-' } else { c })
        .collect()
}

/// `[text](url)` and `![text](url)` as `text`.
fn unlink(s: &str) -> String {
    let mut out = String::new();
    let mut rest = s;
    while let Some(open) = rest.find('[') {
        let tail = &rest[open + 1..];
        let link = tail.find("](").and_then(|close| tail[close + 2..].find(')').map(|end| (close, close + 2 + end)));
        match link {
            Some((close, end)) => {
                out.push_str(rest[..open].strip_suffix('!').unwrap_or(&rest[..open]));
                out.push_str(&tail[..close]);
                rest = &tail[end + 1..];
            }
            None => {
                out.push_str(&rest[..=open]);
                rest = tail;
            }
        }
    }
    out.push_str(rest);
    out
}
