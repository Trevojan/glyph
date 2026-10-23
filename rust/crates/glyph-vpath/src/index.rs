//! The index: `.guidelines/.shortcuts/.virtual/index.json`, the durable state
//! `glyph-vpath build` writes and a resolver without judgement reads.
//!
//! It covers every file of `.guidelines/` — the attic, `.history/`, and the
//! index's own folder aside — with `README.md` and `CLAUDE.md`. Each file
//! carries its nodes, `[selector, start, end, line, lines, fingerprint]`, the
//! whole file first: Markdown and blocks to any depth, JSON and XML to depth
//! `DEPTH`, the deeper ones read from the file when asked. A document that
//! declares `sources` carries each source with the fingerprint it was stamped
//! at.
//!
//! A source is stamped when its document is built for the first time, when the
//! document changes, or when `stamp` is asked for it by name. So a source that
//! changes under a document that did not is **stale**, and the check refuses
//! it: re-stamping is a deliberate act in the commit (INTAKE-VIRTUAL-PATH §19,
//! M1 → `fix`).

use crate::{fingerprint, frontmatter, join, select, split, tree, Format, Lines};
use glyph_util::json::{parse, stringify, Json};
use std::path::Path;

pub const PATH: &str = ".guidelines/.shortcuts/.virtual/index.json";
pub const DEPTH: usize = 2;
const SKIP: [&str; 2] = [".guidelines/.history", ".guidelines/.shortcuts/.virtual"];
const ROOT_FILES: [&str; 2] = ["README.md", "CLAUDE.md"];

#[derive(Debug, Clone, PartialEq)]
pub struct Indexed {
    pub selector: String,
    pub start: usize,
    pub end: usize,
    pub line: usize,
    pub lines: usize,
    pub fingerprint: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Entry {
    pub path: String,
    pub nodes: Vec<Indexed>,
    /// `(virtual path, fingerprint when stamped)`
    pub sources: Vec<(String, String)>,
}

impl Entry {
    pub fn fingerprint(&self) -> &str {
        &self.nodes[0].fingerprint
    }
    pub fn node(&self, selector: &str) -> Option<&Indexed> {
        self.nodes.iter().find(|n| n.selector == selector)
    }
}

#[derive(Debug, Clone, PartialEq, Default)]
pub struct Index {
    pub files: Vec<Entry>,
}

impl Index {
    pub fn entry(&self, path: &str) -> Option<&Entry> {
        self.files.iter().find(|e| e.path == path)
    }
}

/// Every file the index covers, sorted, with `/` as the separator.
pub fn universe(root: &Path) -> Vec<String> {
    fn walk(root: &Path, dir: &Path, out: &mut Vec<String>) {
        let Ok(read) = std::fs::read_dir(dir) else { return };
        for e in read.flatten() {
            let p = e.path();
            let rel = rel(root, &p);
            if SKIP.contains(&rel.as_str()) {
                continue;
            }
            if p.is_dir() { walk(root, &p, out) } else { out.push(rel) }
        }
    }
    let mut out = Vec::new();
    walk(root, &root.join(".guidelines"), &mut out);
    out.extend(ROOT_FILES.iter().filter(|f| root.join(f).is_file()).map(|f| f.to_string()));
    out.sort();
    out
}

fn rel(root: &Path, p: &Path) -> String {
    p.strip_prefix(root).unwrap_or(p).components().map(|c| c.as_os_str().to_string_lossy()).collect::<Vec<_>>().join("/")
}

pub fn read(root: &Path, file: &str) -> Result<String, String> {
    std::fs::read_to_string(root.join(file)).map_err(|e| format!("{file}: {e}"))
}

/// A log co-changes with everything by design, so it is never a source.
pub fn is_log(file: &str) -> bool {
    let name = file.rsplit('/').next().unwrap_or(file);
    name == "CHANGELOG.md" || name.starts_with("CHANGELIST") || (name == "RETURN.md" && file.contains(".orders/"))
}

/// The current fingerprint of a source, read from the repository.
pub fn resolve_source(root: &Path, vpath: &str) -> Result<String, String> {
    let (file, selector) = split(vpath);
    if is_log(file) {
        return Err(format!("`{vpath}`: {file} is a log, and a log is never a source"));
    }
    let text = read(root, file)?;
    let node = select(Format::of(file), &text, selector).map_err(|e| format!("`{vpath}`: {e}"))?;
    if node.end <= node.start {
        return Err(format!("`{vpath}` resolves to an empty slice"));
    }
    Ok(fingerprint(&text[node.start..node.end]))
}

/// The entry of one file: its nodes, and its sources stamped by the rule above.
pub fn entry(root: &Path, file: &str, previous: Option<&Entry>, restamp: bool) -> Result<Entry, Vec<String>> {
    let text = read(root, file).map_err(|e| vec![e])?;
    let format = Format::of(file);
    let mut errors = Vec::new();
    let nodes = tree(format, &text).map_err(|e| vec![format!("{file}: {e}")])?;
    let deep = matches!(format, Format::Json | Format::Xml);
    let lines = Lines::of(&text);
    let mut indexed: Vec<Indexed> = Vec::new();
    for n in nodes.into_iter().filter(|n| !deep || n.depth <= DEPTH) {
        if n.end <= n.start {
            errors.push(format!("{}: resolves to an empty slice", join(file, &n.selector)));
        }
        if indexed.iter().any(|m| m.selector == n.selector) {
            errors.push(format!("{}: names more than one node", join(file, &n.selector)));
        }
        let (line, count) = lines.range(n.start, n.end);
        indexed.push(Indexed { fingerprint: fingerprint(&text[n.start..n.end]), selector: n.selector, start: n.start, end: n.end, line, lines: count });
    }
    let unchanged = previous.filter(|p| !restamp && p.fingerprint() == indexed[0].fingerprint);
    let mut sources = Vec::new();
    if format == Format::Markdown {
        for vpath in frontmatter::sources(&text) {
            let now = match resolve_source(root, &vpath) {
                Ok(fp) => fp,
                Err(e) => { errors.push(format!("{file} declares a source that does not resolve: {e}")); continue; }
            };
            let kept = unchanged.and_then(|p| p.sources.iter().find(|s| s.0 == vpath)).map(|s| s.1.clone());
            sources.push((vpath, kept.unwrap_or(now)));
        }
    }
    if errors.is_empty() { Ok(Entry { path: file.to_string(), nodes: indexed, sources }) } else { Err(errors) }
}

/// The whole index, every file of the universe; `restamp` names the documents
/// whose sources are stamped again even if they did not change.
pub fn build(root: &Path, previous: Option<&Index>, restamp: &[String]) -> Result<Index, Vec<String>> {
    let mut files = Vec::new();
    let mut errors = Vec::new();
    for file in universe(root) {
        let prev = previous.and_then(|p| p.entry(&file));
        match entry(root, &file, prev, restamp.contains(&file)) {
            Ok(e) => files.push(e),
            Err(e) => errors.extend(e),
        }
    }
    if errors.is_empty() { Ok(Index { files }) } else { Err(errors) }
}

/// One node per line, so a diff of the index shows which slices moved.
pub fn render(index: &Index) -> String {
    let s = |t: &str| stringify(&Json::Str(t.to_string()));
    let mut out = String::from("{\n  \"note\": \"written by glyph-vpath build, EMS-002 ORD-0001; never edited by hand\",\n");
    out.push_str(&format!("  \"depth\": {DEPTH},\n  \"files\": {{"));
    for (k, e) in index.files.iter().enumerate() {
        out.push_str(if k == 0 { "\n" } else { ",\n" });
        out.push_str(&format!("    {}: {{\n", s(&e.path)));
        if !e.sources.is_empty() {
            let list: Vec<String> = e.sources.iter().map(|(v, f)| format!("[{}, {}]", s(v), s(f))).collect();
            out.push_str(&format!("      \"sources\": [\n        {}\n      ],\n", list.join(",\n        ")));
        }
        let nodes: Vec<String> = e.nodes.iter()
            .map(|n| format!("[{}, {}, {}, {}, {}, {}]", s(&n.selector), n.start, n.end, n.line, n.lines, s(&n.fingerprint)))
            .collect();
        out.push_str(&format!("      \"nodes\": [\n        {}\n      ]\n    }}", nodes.join(",\n        ")));
    }
    out.push_str("\n  }\n}\n");
    out
}

pub fn load(text: &str) -> Result<Index, String> {
    let json = parse(text)?;
    let bad = || "the index is not in the shape build writes".to_string();
    let num = |v: &Json| v.num().map(|n| n as usize).ok_or_else(bad);
    let st = |v: &Json| v.str().map(str::to_string).ok_or_else(bad);
    let mut files = Vec::new();
    for (path, e) in json.get("files").and_then(Json::obj).ok_or_else(bad)? {
        let mut nodes = Vec::new();
        for n in e.get("nodes").and_then(Json::arr).ok_or_else(bad)? {
            let f = n.arr().filter(|f| f.len() == 6).ok_or_else(bad)?;
            nodes.push(Indexed { selector: st(&f[0])?, start: num(&f[1])?, end: num(&f[2])?, line: num(&f[3])?, lines: num(&f[4])?, fingerprint: st(&f[5])? });
        }
        if nodes.is_empty() {
            return Err(bad());
        }
        let mut sources = Vec::new();
        for s in e.get("sources").and_then(Json::arr).unwrap_or(&[]) {
            let f = s.arr().filter(|f| f.len() == 2).ok_or_else(bad)?;
            sources.push((st(&f[0])?, st(&f[1])?));
        }
        files.push(Entry { path: path.clone(), nodes, sources });
    }
    Ok(Index { files })
}

/// The committed index, if there is one.
pub fn committed(root: &Path) -> Result<Option<(String, Index)>, String> {
    match std::fs::read_to_string(root.join(PATH)) {
        Ok(text) => load(&text).map(|i| Some((text, i))).map_err(|e| format!("{PATH}: {e}")),
        Err(_) => Ok(None),
    }
}

/// Every breach, in the order a reader fixes them: what does not build, what
/// is missing or extra, what changed since the index, what is stale, and last
/// whatever else drifted from what `build` writes.
pub fn check(root: &Path) -> Vec<String> {
    let committed = match committed(root) {
        Ok(Some(c)) => c,
        Ok(None) => return vec![format!("{PATH} does not exist: run `glyph-vpath build`")],
        Err(e) => return vec![e],
    };
    let (text, old) = committed;
    let new = match build(root, Some(&old), &[]) {
        Ok(i) => i,
        Err(e) => return e,
    };
    let (mut breaches, mut stale) = (Vec::new(), Vec::new());
    for e in &new.files {
        match old.entry(&e.path) {
            None => breaches.push(format!("{}: not in the index", e.path)),
            Some(o) if o.fingerprint() != e.fingerprint() => breaches.push(format!("{}: changed since the index was built", e.path)),
            Some(o) => {
                let moved = o.sources.iter().filter(|(v, at)| resolve_source(root, v).is_ok_and(|now| &now != at));
                for (vpath, _) in moved {
                    stale.push(format!("{}: stale — its source `{vpath}` changed and the document did not; \
                                        bring the document up to date, or `glyph-vpath stamp {}`", e.path, e.path));
                }
            }
        }
    }
    for o in &old.files {
        if new.entry(&o.path).is_none() {
            breaches.push(format!("{}: in the index, gone from the disk", o.path));
        }
    }
    if breaches.is_empty() && render(&new) != text {
        breaches.push(format!("{PATH} drifted from what `glyph-vpath build` writes"));
    }
    if !breaches.is_empty() {
        breaches.push("run `glyph-vpath build` after a change to what the index covers".to_string());
    }
    breaches.extend(stale);
    breaches
}
