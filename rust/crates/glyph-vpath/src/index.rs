//! The index: `.guidelines/.shortcuts/.virtual/index.json`, the durable state
//! `glyph-vpath build` writes and a resolver without judgement reads.
//!
//! It covers every file of `.guidelines/` — the attic, `.history/`, and the
//! index's own folder aside — with `README.md` and `CLAUDE.md`. Each file
//! carries its nodes, the whole file first, one row each:
//!
//!   [id, selector, start, end, line, lines, fingerprint, body, parent]
//!
//! Markdown and blocks to any depth, JSON and XML to depth `DEPTH`, the deeper
//! ones read from the file when asked. `id` is the NodeID (`identity`), `body`
//! the fingerprint of a section without its heading line, `parent` the NodeID
//! of the node that holds it. The index keeps the next free NodeID, the
//! aliases, the old paths of nodes that moved, and the recoveries, the old
//! paths of sections found again by their content (`recovery`). A row of six, the shape of
//! EMS-002 ORD-0001, is still read: it has no NodeID, and the next build gives
//! it one.
//!
//! A document that declares `sources` carries each source with the fingerprint
//! it was stamped at. A source is stamped when its document is built for the
//! first time, when the document changes, or when `stamp` is asked for it by
//! name. So a source that changes under a document that did not is **stale**,
//! and the check refuses it: re-stamping is a deliberate act in the commit
//! (INTAKE-VIRTUAL-PATH §19, M1 → `fix`).

use crate::identity::{self, Place};
use crate::recovery::{self, Recovered};
use crate::{fingerprint, frontmatter, join, select, split, tree, Format, Lines};
use glyph_json::{parse, stringify, Json};
use std::collections::{HashMap, HashSet};
use std::path::Path;

pub const PATH: &str = ".guidelines/.shortcuts/.virtual/index.json";
pub const DEPTH: usize = 2;
const SKIP: [&str; 3] = [".guidelines/.history", ".guidelines/.packs", ".guidelines/.shortcuts/.virtual"];
const ROOT_FILES: [&str; 2] = ["README.md", "CLAUDE.md"];

#[derive(Debug, Clone, PartialEq, Default)]
pub struct Indexed {
    pub id: String,
    pub selector: String,
    pub start: usize,
    pub end: usize,
    pub line: usize,
    pub lines: usize,
    pub fingerprint: String,
    pub body: String,
    pub parent: String,
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
    pub next: u64,
    pub files: Vec<Entry>,
    /// `(old virtual path, NodeID)`, sorted by path
    pub aliases: Vec<(String, String)>,
    /// sorted by path
    pub recovered: Vec<Recovered>,
    /// what the last build could not try, said and not written
    pub notes: Vec<String>,
}

impl Index {
    pub fn entry(&self, path: &str) -> Option<&Entry> {
        self.files.iter().find(|e| e.path == path)
    }
    pub fn alias(&self, vpath: &str) -> Option<&str> {
        self.aliases.iter().find(|(p, _)| p == vpath).map(|(_, id)| id.as_str())
    }
    /// The recovery of an old path or an old NodeID.
    pub fn recovery(&self, reference: &str) -> Option<&Recovered> {
        self.recovered.iter().find(|r| r.path == reference || r.id == reference)
    }
    /// The live virtual path of a node, from its place.
    pub fn path_of(&self, place: &Place) -> String {
        let e = &self.files[place.file];
        join(&e.path, &e.nodes[place.node].selector)
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

/// One file as it is on disk: its nodes without their NodeIDs, and each source
/// it declares with the fingerprint it has now, or why it does not resolve.
pub struct Read {
    pub entry: Entry,
    pub text: String,
    pub sources: Vec<(String, Result<String, String>)>,
}

pub fn read_entry(root: &Path, file: &str) -> Result<Read, Vec<String>> {
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
        let slice = &text[n.start..n.end];
        let body = match (format, n.selector.is_empty(), slice.split_once('\n')) {
            (Format::Markdown, false, Some((_, body))) if !body.trim().is_empty() => fingerprint(body),
            _ => String::new(),
        };
        indexed.push(Indexed { fingerprint: fingerprint(slice), body, selector: n.selector, start: n.start, end: n.end, line, lines: count, ..Indexed::default() });
    }
    let sources = if format == Format::Markdown {
        frontmatter::sources(&text).into_iter().map(|v| { let r = resolve_source(root, &v); (v, r) }).collect()
    } else {
        Vec::new()
    };
    if errors.is_empty() { Ok(Read { entry: Entry { path: file.to_string(), nodes: indexed, sources: Vec::new() }, text, sources }) } else { Err(errors) }
}

/// The whole index, every file of the universe; `restamp` names the documents
/// whose sources are stamped again even if they did not change.
pub fn build(root: &Path, previous: Option<&Index>, restamp: &[String]) -> Result<Index, Vec<String>> {
    let mut reads = Vec::new();
    let mut errors = Vec::new();
    for file in universe(root) {
        match read_entry(root, &file) {
            Ok(r) => reads.push(r),
            Err(e) => errors.extend(e),
        }
    }
    let mut files: Vec<Entry> = reads.iter().map(|r| r.entry.clone()).collect();
    let carried = identity::carry(previous, &mut files);
    let empty = Index::default();
    let prev = previous.unwrap_or(&empty);
    let texts: HashMap<String, String> = reads.iter().map(|r| (r.entry.path.clone(), r.text.clone())).collect();
    let (recovered, notes) = recovery::recover(root, prev, &files, &texts, &carried.vanished, &carried.fresh);

    // the stamps follow the document's NodeID, so a document renamed keeps them
    let live: HashMap<String, String> = files.iter()
        .flat_map(|e| e.nodes.iter().map(move |n| (n.id.clone(), join(&e.path, &n.selector)))).collect();
    let by_root: HashMap<&str, &Entry> = prev.files.iter().filter(|e| !e.nodes[0].id.is_empty()).map(|e| (e.nodes[0].id.as_str(), e)).collect();
    for (e, r) in files.iter_mut().zip(&reads) {
        let was = by_root.get(e.nodes[0].id.as_str()).copied().or_else(|| prev.entry(&e.path));
        let unchanged = was.filter(|p| !restamp.contains(&e.path) && p.fingerprint() == e.fingerprint());
        for (vpath, now) in &r.sources {
            match now {
                Ok(fp) => {
                    let kept = unchanged.and_then(|p| p.sources.iter().find(|s| &s.0 == vpath)).map(|s| s.1.clone());
                    e.sources.push((vpath.clone(), kept.unwrap_or_else(|| fp.clone())));
                }
                Err(why) => match (carried.aliases.iter().find(|(p, _)| p == vpath), recovered.iter().find(|r| &r.path == vpath)) {
                    (Some((_, id)), _) => errors.push(format!("{} declares `{vpath}`, which moved: write `{}`", e.path, live[id])),
                    (None, Some(r)) => errors.push(format!("{} declares `{vpath}`, which went; by its content it is `{}`, Jaccard 0.{:02}: \
                                                            write the path that holds what the document means", e.path, live[&r.to], r.score)),
                    (None, None) => errors.push(format!("{} declares a source that does not resolve: {why}", e.path)),
                },
            }
        }
    }
    if !errors.is_empty() {
        return Err(errors);
    }
    Ok(Index { next: carried.next, files, aliases: carried.aliases, recovered, notes })
}

/// One node per line, so a diff of the index shows which slices moved.
pub fn render(index: &Index) -> String {
    let s = |t: &str| stringify(&Json::Str(t.to_string()));
    let mut out = String::from("{\n  \"note\": \"written by glyph-vpath build, EMS-002; never edited by hand\",\n");
    out.push_str(&format!("  \"depth\": {DEPTH},\n  \"next\": {},\n  \"files\": {{", index.next));
    for (k, e) in index.files.iter().enumerate() {
        out.push_str(if k == 0 { "\n" } else { ",\n" });
        out.push_str(&format!("    {}: {{\n", s(&e.path)));
        if !e.sources.is_empty() {
            let list: Vec<String> = e.sources.iter().map(|(v, f)| format!("[{}, {}]", s(v), s(f))).collect();
            out.push_str(&format!("      \"sources\": [\n        {}\n      ],\n", list.join(",\n        ")));
        }
        let nodes: Vec<String> = e.nodes.iter()
            .map(|n| format!("[{}, {}, {}, {}, {}, {}, {}, {}, {}]", s(&n.id), s(&n.selector), n.start, n.end, n.line, n.lines,
                             s(&n.fingerprint), s(&n.body), s(&n.parent)))
            .collect();
        out.push_str(&format!("      \"nodes\": [\n        {}\n      ]\n    }}", nodes.join(",\n        ")));
    }
    out.push_str("\n  },\n  \"aliases\": {");
    for (k, (p, id)) in index.aliases.iter().enumerate() {
        out.push_str(if k == 0 { "\n" } else { ",\n" });
        out.push_str(&format!("    {}: {}", s(p), s(id)));
    }
    out.push_str(if index.aliases.is_empty() { "},\n" } else { "\n  },\n" });
    out.push_str("  \"recovered\": [");
    for (k, r) in index.recovered.iter().enumerate() {
        out.push_str(if k == 0 { "\n" } else { ",\n" });
        out.push_str(&format!("    [{}, {}, {}, {}]", s(&r.path), s(&r.id), s(&r.to), r.score));
    }
    out.push_str(if index.recovered.is_empty() { "]\n}\n" } else { "\n  ]\n}\n" });
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
            let f = n.arr().ok_or_else(bad)?;
            nodes.push(match f.len() {
                9 => Indexed { id: st(&f[0])?, selector: st(&f[1])?, start: num(&f[2])?, end: num(&f[3])?, line: num(&f[4])?, lines: num(&f[5])?,
                               fingerprint: st(&f[6])?, body: st(&f[7])?, parent: st(&f[8])? },
                // the row of ORD-0001, before the NodeID
                6 => Indexed { selector: st(&f[0])?, start: num(&f[1])?, end: num(&f[2])?, line: num(&f[3])?, lines: num(&f[4])?,
                               fingerprint: st(&f[5])?, ..Indexed::default() },
                _ => return Err(bad()),
            });
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
    let mut aliases = Vec::new();
    for (p, id) in json.get("aliases").and_then(Json::obj).unwrap_or(&[]) {
        aliases.push((p.clone(), st(id)?));
    }
    let mut recovered = Vec::new();
    for r in json.get("recovered").and_then(Json::arr).unwrap_or(&[]) {
        let f = r.arr().filter(|f| f.len() == 4).ok_or_else(bad)?;
        recovered.push(Recovered { path: st(&f[0])?, id: st(&f[1])?, to: st(&f[2])?, score: num(&f[3])? as u32 });
    }
    let next = json.get("next").map_or(Ok(0), |n| num(n).map(|n| n as u64))?;
    Ok(Index { next, files, aliases, recovered, notes: Vec::new() })
}

/// What the identity of an index promises: every NodeID once, below `next`;
/// every parent a node of the same file, before it; every alias a live
/// NodeID, on a path that is not live; every recovery a live successor, for a
/// path and a NodeID that are not, scored from 50 to 100. An index with no NodeID at all is the
/// shape of ORD-0001, and promises nothing yet.
pub fn validate(index: &Index) -> Vec<String> {
    let all: Vec<&Indexed> = index.files.iter().flat_map(|e| e.nodes.iter()).collect();
    if all.iter().all(|n| n.id.is_empty()) {
        return Vec::new();
    }
    let mut errors = Vec::new();
    let mut seen: HashSet<&str> = HashSet::new();
    for e in &index.files {
        let mut before: HashSet<&str> = HashSet::new();
        for (k, n) in e.nodes.iter().enumerate() {
            let number = n.id.strip_prefix('n').and_then(|d| d.parse::<u64>().ok());
            match number {
                Some(d) if d >= 1 && d < index.next => {}
                _ => errors.push(format!("{}: `{}` is not a NodeID below {}", join(&e.path, &n.selector), n.id, index.next)),
            }
            if !seen.insert(&n.id) {
                errors.push(format!("{}: the NodeID `{}` repeats", join(&e.path, &n.selector), n.id));
            }
            let parent_ok = if k == 0 { n.parent.is_empty() } else { before.contains(n.parent.as_str()) };
            if !parent_ok {
                errors.push(format!("{}: the parent `{}` is no node before it in {}", join(&e.path, &n.selector), n.parent, e.path));
            }
            before.insert(&n.id);
        }
    }
    let live: HashSet<String> = index.files.iter().flat_map(|e| e.nodes.iter().map(move |n| join(&e.path, &n.selector))).collect();
    for (p, id) in &index.aliases {
        if !seen.contains(id.as_str()) {
            errors.push(format!("the alias `{p}` points at `{id}`, which is no node"));
        }
        if live.contains(p) {
            errors.push(format!("the alias `{p}` is a live path"));
        }
    }
    for r in &index.recovered {
        if !seen.contains(r.to.as_str()) {
            errors.push(format!("the recovery of `{}` points at `{}`, which is no node", r.path, r.to));
        }
        if live.contains(&r.path) || seen.contains(r.id.as_str()) {
            errors.push(format!("the recovery of `{}` ({}) names a node that lives", r.path, r.id));
        }
        if !(50..=100).contains(&r.score) {
            errors.push(format!("the recovery of `{}` scores {}, outside 50 to 100", r.path, r.score));
        }
    }
    errors
}

/// The committed index, if there is one.
pub fn committed(root: &Path) -> Result<Option<(String, Index)>, String> {
    match std::fs::read_to_string(root.join(PATH)) {
        Ok(text) => load(&text).map(|i| Some((text, i))).map_err(|e| format!("{PATH}: {e}")),
        Err(_) => Ok(None),
    }
}

/// Every breach, in the order a reader fixes them: an identity that does not
/// hold, what does not build, what is missing or extra, what changed since the
/// index, what is stale, and last whatever else drifted from what `build`
/// writes.
pub fn check(root: &Path) -> Vec<String> {
    let committed = match committed(root) {
        Ok(Some(c)) => c,
        Ok(None) => return vec![format!("{PATH} does not exist: run `glyph-vpath build`")],
        Err(e) => return vec![e],
    };
    let (text, old) = committed;
    let broken = validate(&old);
    if !broken.is_empty() {
        return broken;
    }
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
