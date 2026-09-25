//! The parser's tree, as an arena.
//!
//! In the JS the tree is plain objects the parser makes and every later pass
//! reads and rewrites — `walk` and `valueChildren` in util.js already read
//! their shape, which is why the shape lives here, on the floor, where
//! templates, rules and the emitters can reach it without reaching the parser.
//! A node is a slot in `Tree::nodes`; `children` and `parent` are indices. What
//! only the parser carries (the Logic it read, the token, the suggestion) is
//! the payload `X`.
//!
//! Every field is optional where the JS object may lack it: a literal has no
//! `canonical`, a command has no `v`. `Some(None)` is a field the JS holds as
//! `null` (a command's `colon` before a colon arrives, a slot name's `origin`).
//!
//! `walk` and `stripTags` are util.js's; `valueChildren` arrives with the
//! parser that reads it (ORD-0007).

pub type Id = usize;

/// A mood the parser attached: `{ name, gloss, order }`.
#[derive(Debug, Clone, PartialEq)]
pub struct Emotion {
    pub name: String,
    pub gloss: String,
    pub order: usize,
}

/// A node's gloss. The JS looks a session word up in a plain object, so
/// `__proto__` finds `Object.prototype` there and keeps it as its gloss —
/// JSON writes it `{}` (EMS-001/RETURN.md, ORD-0004).
#[derive(Debug, Clone, PartialEq)]
pub enum Gloss {
    Text(String),
    Prototype,
}

/// A token's kind and span, as the node keeps it.
#[derive(Debug, Clone, PartialEq)]
pub struct Span {
    pub k: String,
    pub s: usize,
    pub e: usize,
}

#[derive(Debug, Clone, Default, PartialEq)]
pub struct Node<X> {
    pub id: Option<u64>,
    pub raw: Option<String>,
    pub tier: Option<String>,
    pub canonical: Option<String>,
    pub gloss: Option<Gloss>,
    pub alias: Option<bool>,
    pub colon: Option<Option<String>>,
    pub auto_closed: Option<bool>,
    pub editorial: Option<bool>,
    pub origin: Option<Option<String>>,
    pub chain_element: Option<bool>,
    pub slot_name: Option<bool>,
    pub depth: Option<usize>,
    pub literal: Option<bool>,
    pub v: Option<String>,
    pub form: Option<String>,
    pub role: Option<String>,
    pub text: Option<bool>,
    pub raw_fence: Option<bool>,
    pub template: Option<String>,
    pub is_def: Option<bool>,
    pub mode: Option<String>,
    pub is_definition: Option<bool>,
    pub expanded: Option<bool>,
    pub bound_slot: Option<String>,
    /// A `[logic]` node: the block's name (the parser keeps what it read in
    /// the payload).
    pub logic: Option<String>,
    pub emotions: Vec<Emotion>,
    pub tok: Option<Span>,
    pub children: Vec<Id>,
    pub parent: Option<Id>,
    pub extra: X,
}

impl<X> Node<X> {
    /// JS truthiness of a string field.
    fn has(s: &Option<String>) -> bool {
        s.as_deref().is_some_and(|s| !s.is_empty())
    }
    pub fn is_canonical(&self) -> bool {
        Self::has(&self.canonical)
    }
    pub fn is_literal(&self) -> bool {
        self.literal == Some(true)
    }
    pub fn is_template(&self) -> bool {
        Self::has(&self.template)
    }
}

/// A segment: what `;` or `;;` closes.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct Segment {
    pub children: Vec<Id>,
    pub mood: Vec<Emotion>,
    pub auto_closed: usize,
    pub breaks: usize,
    pub cause: Option<String>,
    pub continues: bool,
    pub is_return: bool,
}

#[derive(Debug, Clone, Default, PartialEq)]
pub struct Tree<X> {
    pub nodes: Vec<Node<X>>,
    pub segments: Vec<Segment>,
}

impl<X: Clone> Tree<X> {
    pub fn add(&mut self, node: Node<X>) -> Id {
        self.nodes.push(node);
        self.nodes.len() - 1
    }

    /// `walk`: pre-order, left to right, iterative. The ids are gathered
    /// first, so the visitor may read the whole tree.
    pub fn walk(&self, list: &[Id]) -> Vec<Id> {
        let mut out = Vec::new();
        let mut stack: Vec<Id> = list.iter().rev().copied().collect();
        while let Some(id) = stack.pop() {
            out.push(id);
            stack.extend(self.nodes[id].children.iter().rev());
        }
        out
    }

    /// Another tree's nodes moved into this arena: the roots of its segments,
    /// concatenated, as they now stand here.
    pub fn graft(&mut self, other: Tree<X>) -> Vec<Id> {
        let base = self.nodes.len();
        for mut nd in other.nodes {
            nd.children.iter_mut().for_each(|c| *c += base);
            nd.parent = nd.parent.map(|p| p + base);
            self.nodes.push(nd);
        }
        other.segments.iter().flat_map(|s| s.children.iter().map(|c| c + base)).collect()
    }

    /// `reparent`: every node under `list`, at any depth, points to its container.
    pub fn reparent(&mut self, list: &[Id], parent: Id) {
        let mut stack: Vec<(Id, Id)> = list.iter().map(|c| (*c, parent)).collect();
        while let Some((id, p)) = stack.pop() {
            self.nodes[id].parent = Some(p);
            stack.extend(self.nodes[id].children.iter().map(|c| (*c, id)));
        }
    }
}

/// A diagnostic, in both languages: the parser keeps the pt-BR pair unless
/// the caller asks for English.
#[derive(Debug, Clone, PartialEq)]
pub struct Diag {
    pub sev: String,
    pub lab: String,
    pub msg: String,
    pub code: String,
    pub en_lab: Option<String>,
    pub en_msg: Option<String>,
    pub at: Option<(usize, usize)>,
}

impl Diag {
    pub fn new(sev: &str, lab: &str, msg: String, code: &str) -> Diag {
        Diag { sev: sev.into(), lab: lab.into(), msg, code: code.into(), en_lab: None, en_msg: None, at: None }
    }
    pub fn en(mut self, lab: &str, msg: String) -> Diag {
        self.en_lab = Some(lab.into());
        self.en_msg = Some(msg);
        self
    }
}

/// What the JS throws, by its message as V8 words it. Where a pass of the JS
/// stops on a TypeError, the port stops at the same point and carries the
/// message; what the pass raised before it stays raised.
#[derive(Debug, Clone, PartialEq)]
pub struct Thrown(pub String);

/// `stripTags`: the tags dropped, four entities read, whitespace collapsed.
pub fn strip_tags(s: &str) -> String {
    let c: Vec<char> = s.chars().collect();
    let mut out = String::new();
    let mut i = 0;
    while i < c.len() {
        if c[i] == '<' {
            if let Some(close) = (i + 1..c.len()).find(|&k| c[k] == '>') {
                if close > i + 1 {
                    i = close + 1;
                    continue;
                }
            }
        }
        out.push(c[i]);
        i += 1;
    }
    let out = out.replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", "\"").replace("&amp;", "&");
    let space = |c: char| matches!(c, '\t' | '\n' | '\u{b}' | '\u{c}' | '\r' | ' ' | '\u{a0}' | '\u{1680}' | '\u{2000}'..='\u{200a}'
        | '\u{2028}' | '\u{2029}' | '\u{202f}' | '\u{205f}' | '\u{3000}' | '\u{feff}');
    let mut collapsed = String::new();
    let mut run = false;
    for ch in out.chars() {
        if space(ch) {
            if !run {
                collapsed.push(' ');
            }
            run = true;
        } else {
            collapsed.push(ch);
            run = false;
        }
    }
    collapsed.trim_matches(space).to_string()
}
