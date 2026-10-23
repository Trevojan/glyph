//! XML: the selector is a path of element names from the document element,
//! `/glyph-package/block`, with `[n]`, from 1, to pick among siblings of the
//! same name. A step that names more than one sibling and carries no `[n]`
//! names many nodes and is refused. An element spans its start tag to the end
//! of its end tag. Comments, processing instructions, CDATA and the doctype
//! are skipped; the reader keeps shape, not data.

use crate::Node;

pub struct Element {
    pub name: String,
    pub start: usize,
    pub end: usize,
    pub children: Vec<Element>,
}

pub fn parse(text: &str) -> Result<Vec<Element>, String> {
    let b = text.as_bytes();
    let mut stack: Vec<Element> = Vec::new();
    let mut top: Vec<Element> = Vec::new();
    let mut i = 0;
    let skip = |i: usize, close: &str| -> Result<usize, String> {
        text[i..].find(close).map(|at| i + at + close.len()).ok_or_else(|| format!("XML: `{close}` never comes, from byte {i}"))
    };
    while let Some(at) = text[i..].find('<') {
        i += at;
        let rest = &text[i..];
        if rest.starts_with("<!--") {
            i = skip(i, "-->")?;
        } else if rest.starts_with("<![CDATA[") {
            i = skip(i, "]]>")?;
        } else if rest.starts_with("<?") {
            i = skip(i, "?>")?;
        } else if rest.starts_with("<!") {
            i = skip(i, ">")?;
        } else if let Some(close) = rest.strip_prefix("</") {
            let name = close.split(|c: char| c == '>' || c.is_whitespace()).next().unwrap_or("");
            let end = skip(i, ">")?;
            let mut el = stack.pop().ok_or_else(|| format!("XML: `</{name}>` closes nothing, at byte {i}"))?;
            if el.name != name {
                return Err(format!("XML: `</{name}>` closes `<{}>`, at byte {i}", el.name));
            }
            el.end = end;
            match stack.last_mut() {
                Some(parent) => parent.children.push(el),
                None => top.push(el),
            }
            i = end;
        } else {
            let name: String = rest[1..].chars().take_while(|c| !c.is_whitespace() && *c != '>' && *c != '/').collect();
            if name.is_empty() {
                return Err(format!("XML: a `<` that opens nothing, at byte {i}"));
            }
            let mut j = i + 1 + name.len();
            let mut quote = None;
            while j < b.len() {
                match (quote, b[j]) {
                    (None, b'"' | b'\'') => quote = Some(b[j]),
                    (Some(q), c) if c == q => quote = None,
                    (None, b'>') => break,
                    _ => {}
                }
                j += 1;
            }
            if j == b.len() {
                return Err(format!("XML: `<{name}` never closes, from byte {i}"));
            }
            let el = Element { name, start: i, end: j + 1, children: Vec::new() };
            if b[j - 1] == b'/' {
                match stack.last_mut() {
                    Some(parent) => parent.children.push(el),
                    None => top.push(el),
                }
            } else {
                stack.push(el);
            }
            i = j + 1;
        }
    }
    if let Some(open) = stack.last() {
        return Err(format!("XML: `<{}>` never closes, from byte {}", open.name, open.start));
    }
    Ok(top)
}

pub fn tree(text: &str) -> Result<Vec<Node>, String> {
    let top = parse(text)?;
    let mut nodes = vec![Node::whole(text)];
    fn walk(siblings: &[Element], path: &str, depth: usize, out: &mut Vec<Node>) {
        for (k, el) in siblings.iter().enumerate() {
            let same = siblings.iter().filter(|s| s.name == el.name).count();
            let step = if same > 1 {
                format!("{}[{}]", el.name, siblings[..=k].iter().filter(|s| s.name == el.name).count())
            } else {
                el.name.clone()
            };
            let p = format!("{path}/{step}");
            out.push(Node { selector: p.clone(), start: el.start, end: el.end, depth: depth + 1 });
            walk(&el.children, &p, depth + 1, out);
        }
    }
    walk(&top, "", 0, &mut nodes);
    Ok(nodes)
}

pub fn select(text: &str, path: &str) -> Result<Node, String> {
    let Some(rest) = path.strip_prefix('/') else {
        return Err(format!("`{path}` is not an element path: it starts with `/`"));
    };
    let top = parse(text)?;
    let mut siblings = &top;
    let mut hit: Option<&Element> = None;
    let mut depth = 0;
    for step in rest.split('/') {
        let (name, nth) = match step.strip_suffix(']').and_then(|s| s.split_once('[')) {
            Some((name, n)) => (name, Some(n.parse::<usize>().map_err(|_| format!("`{path}`: `[{n}]` is not a position"))?)),
            None => (step, None),
        };
        let named: Vec<&Element> = siblings.iter().filter(|e| e.name == name).collect();
        let el = match (nth, named.len()) {
            (Some(n), _) => *named.get(n.wrapping_sub(1)).ok_or_else(|| format!("`{path}`: no `{name}[{n}]`"))?,
            (None, 1) => named[0],
            (None, 0) => return Err(format!("`{path}`: no `{name}`")),
            (None, many) => return Err(format!("`{path}`: `{name}` names {many} elements; pick one with `[n]`")),
        };
        siblings = &el.children;
        hit = Some(el);
        depth += 1;
    }
    let el = hit.ok_or_else(|| format!("`{path}` names no element"))?;
    Ok(Node { selector: path.to_string(), start: el.start, end: el.end, depth })
}
