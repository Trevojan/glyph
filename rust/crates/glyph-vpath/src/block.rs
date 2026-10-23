//! Code and text: a block is the lines between a line that says
//! `@block:name` and a line that says `@endblock:name`, behind any comment
//! prefix — `//`, `#`, `--`, `<!--`, `/*`. A marker is a line of its own; the
//! same words inside a sentence are prose. Blocks do not nest, a name appears
//! once, and every block closes.

use crate::Node;

pub fn tree(text: &str) -> Result<Vec<Node>, String> {
    let mut nodes = vec![Node::whole(text)];
    let mut open: Option<(String, usize)> = None;
    let mut at = 0;
    for (n, line) in text.split_inclusive('\n').enumerate() {
        let (start, end) = (at, at + line.len());
        at = end;
        let Some((closing, name)) = marker(line) else { continue };
        match (closing, open.take()) {
            (false, None) => {
                if nodes.iter().any(|b| b.selector == format!("@block:{name}")) {
                    return Err(format!("line {}: the block `{name}` appears twice", n + 1));
                }
                open = Some((name.to_string(), end));
            }
            (false, Some((outer, _))) => {
                return Err(format!("line {}: `@block:{name}` opens inside `{outer}`, and blocks do not nest", n + 1));
            }
            (true, Some((inner, from))) if inner == name => {
                nodes.push(Node { selector: format!("@block:{name}"), start: from, end: start, depth: 1 });
            }
            (true, other) => {
                let what = other.map_or("no block is open".to_string(), |(inner, _)| format!("`{inner}` is open"));
                return Err(format!("line {}: `@endblock:{name}`, but {what}", n + 1));
            }
        }
    }
    match open {
        Some((name, _)) => Err(format!("`@block:{name}` never closes")),
        None => Ok(nodes),
    }
}

/// `(closing, name)` when the line is a marker and nothing else.
fn marker(line: &str) -> Option<(bool, &str)> {
    let prose = |c: char| c.is_alphanumeric() || c.is_whitespace() || c == '@';
    let body = line.trim().trim_start_matches(|c: char| !prose(c)).trim_start();
    let (closing, rest) = match (body.strip_prefix("@block:"), body.strip_prefix("@endblock:")) {
        (Some(rest), _) => (false, rest),
        (_, Some(rest)) => (true, rest),
        _ => return None,
    };
    let len = rest.find(|c: char| !(c.is_alphanumeric() || matches!(c, '-' | '_' | '.'))).unwrap_or(rest.len());
    let (name, tail) = rest.split_at(len);
    let tail_is_comment = tail.trim().chars().all(|c| !c.is_alphanumeric());
    (!name.is_empty() && tail_is_comment).then_some((closing, name))
}
