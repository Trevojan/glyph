//! glyph-vpath — the virtual paths of `.guidelines/.plan/README.md` §0.
//!
//! EMS-002 ORD-0001. A virtual path is `file#selector` and resolves to one
//! exact slice, with offsets. The extension decides how the selector reads,
//! never the delimiter:
//!
//!   .md      the heading slug, as GitHub writes it      GLOSSARY.md#8-project-vocabulary
//!   .json    a JSON Pointer, RFC 6901                    rules.json#/pairs/0
//!   .xml     an element path, `[n]` among same names     ORD-0001.xml#/glyph-package/block
//!   other    a block, `@block:name` … `@endblock:name`   glyph-cli.js#@block:flags
//!
//! An empty selector is the whole file. A selector that names zero nodes or
//! many is an error, never an empty slice. The index (`index`) keeps every
//! node's byte range, line range and fingerprint, and its NodeID (`identity`,
//! EMS-002 ORD-0002), the identity a node keeps when its path changes; what the
//! identity does not reach, the recovery index (`recovery`, ORD-0003) finds by
//! its content. Order maintenance is an ORD of its own.

pub mod block;
pub mod frontmatter;
pub mod identity;
pub mod index;
pub mod json;
pub mod markdown;
pub mod recovery;
pub mod xml;

/// One node of a file's tree: its selector, its byte range `[start, end)` and
/// its depth, the whole file at 0.
#[derive(Debug, Clone, PartialEq)]
pub struct Node {
    pub selector: String,
    pub start: usize,
    pub end: usize,
    pub depth: usize,
}

impl Node {
    pub fn whole(text: &str) -> Node {
        Node { selector: String::new(), start: 0, end: text.len(), depth: 0 }
    }
}

/// How a file's selector reads, decided by the extension.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Format {
    Markdown,
    Json,
    Xml,
    Text,
}

impl Format {
    pub fn of(path: &str) -> Format {
        let name = path.rsplit('/').next().unwrap_or(path);
        match name.rsplit_once('.').map(|(_, ext)| ext.to_ascii_lowercase()).as_deref() {
            Some("md") => Format::Markdown,
            Some("json") => Format::Json,
            Some("xml") => Format::Xml,
            _ => Format::Text,
        }
    }
}

/// Every node of `text`, the whole file first, in document order.
pub fn tree(format: Format, text: &str) -> Result<Vec<Node>, String> {
    match format {
        Format::Markdown => Ok(markdown::tree(text)),
        Format::Json => json::tree(text),
        Format::Xml => xml::tree(text),
        Format::Text => block::tree(text),
    }
}

/// The one node `selector` names in `text`.
pub fn select(format: Format, text: &str, selector: &str) -> Result<Node, String> {
    if selector.is_empty() {
        return Ok(Node::whole(text));
    }
    match format {
        Format::Json => json::select(text, selector),
        Format::Xml => xml::select(text, selector),
        Format::Markdown | Format::Text => one(tree(format, text)?, selector),
    }
}

/// The single node carrying `selector`: none or many is the error.
pub fn one(nodes: Vec<Node>, selector: &str) -> Result<Node, String> {
    let mut hits = nodes.into_iter().filter(|n| n.selector == selector);
    match (hits.next(), hits.next()) {
        (Some(n), None) => Ok(n),
        (None, _) => Err(format!("`{selector}` names no node")),
        (Some(_), Some(_)) => Err(format!("`{selector}` names more than one node")),
    }
}

/// `file#selector`, split at the first `#`; no `#` is the whole file.
pub fn split(vpath: &str) -> (&str, &str) {
    vpath.split_once('#').unwrap_or((vpath, ""))
}

/// `file#selector`, the selector left off when it is the whole file.
pub fn join(file: &str, selector: &str) -> String {
    if selector.is_empty() { file.to_string() } else { format!("{file}#{selector}") }
}

/// The fingerprint of a slice: `ck`, the engine's declared 64-bit checksum.
pub fn fingerprint(slice: &str) -> String {
    glyph_envelope::ck(slice)
}

/// Where each line of a text starts, for line ranges in O(log n).
pub struct Lines {
    starts: Vec<usize>,
}

impl Lines {
    pub fn of(text: &str) -> Lines {
        let mut starts = vec![0];
        starts.extend(text.match_indices('\n').map(|(i, _)| i + 1));
        Lines { starts }
    }

    /// The first line of `[start, end)`, from 1, and how many lines it spans —
    /// the offset and the limit a windowed read takes.
    pub fn range(&self, start: usize, end: usize) -> (usize, usize) {
        let first = self.starts.partition_point(|&s| s <= start);
        if end <= start {
            return (first, 0);
        }
        let last = self.starts.partition_point(|&s| s < end);
        (first, last - first + 1)
    }
}
