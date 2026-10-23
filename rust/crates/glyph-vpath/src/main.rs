//! glyph-vpath — the virtual paths, from the command line. EMS-002 ORD-0001
//! and ORD-0002.
//!
//!   glyph-vpath build                 write the index
//!   glyph-vpath check                 exit 1 on a breach; prints nothing on success
//!   glyph-vpath stamp DOC...          stamp the sources of these documents again
//!   glyph-vpath resolve REF... [--text]
//!                                     one line of JSON per reference: path, NodeID,
//!                                     parent, bytes, line, lines, fingerprint; with
//!                                     --text, the slice under its own virtual path
//!   glyph-vpath node REF              the record of a node: path, parent, previous,
//!                                     next and depth
//!   glyph-vpath up REF                the chain of parents, the node first
//!   glyph-vpath list FILE             the selectors of a file, with their lines
//!   glyph-vpath code FILE             the documents that declare FILE as a source
//!
//!   REF           a virtual path, `file#selector`, or a NodeID, `n42`
//!   --root DIR    the repository (default: the nearest folder up that holds .guidelines/)
//!
//! A resolution reads each file once however many references name it, and
//! refuses a file whose fingerprint no longer matches the index: the offsets it
//! holds would point at other text. An old path of a node that moved answers
//! the node it became, with a warning naming the new path; it never blocks.

use glyph_util::json::{stringify, Json};
use glyph_vpath::identity::{self, Place};
use glyph_vpath::index::{self, Index};
use glyph_vpath::{fingerprint, join, select, split, tree, Format, Lines};
use std::collections::{BTreeMap, HashMap};
use std::path::{Path, PathBuf};
use std::process::ExitCode;

fn main() -> ExitCode {
    let mut args: Vec<String> = std::env::args().skip(1).collect();
    let root = match args.iter().position(|a| a == "--root") {
        Some(i) if i + 1 < args.len() => { let r = PathBuf::from(args.remove(i + 1)); args.remove(i); r }
        _ => match find_root() {
            Some(r) => r,
            None => return fail(&["no .guidelines/ here or above; pass --root".into()]),
        },
    };
    let text = args.iter().position(|a| a == "--text").map(|i| args.remove(i)).is_some();
    let (cmd, rest) = match args.split_first() {
        Some((c, r)) => (c.as_str(), r),
        None => return fail(&["usage: glyph-vpath build | check | stamp DOC... | resolve REF... [--text] | node REF | up REF | list FILE | code FILE".into()]),
    };
    let result = match cmd {
        "build" => write(&root, &[]),
        "stamp" if !rest.is_empty() => write(&root, rest),
        "check" => { let b = index::check(&root); if b.is_empty() { Ok(()) } else { Err(b) } }
        "resolve" if !rest.is_empty() => resolve(&root, rest, text),
        "node" if rest.len() == 1 => node(&root, &rest[0]),
        "up" if rest.len() == 1 => up(&root, &rest[0]),
        "list" if rest.len() == 1 => list(&root, &rest[0]),
        "code" if rest.len() == 1 => code(&root, &rest[0]),
        _ => Err(vec![format!("`{cmd}`: not a command, or its arguments are missing")]),
    };
    match result {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => fail(&e),
    }
}

fn fail(lines: &[String]) -> ExitCode {
    eprintln!("glyph-vpath: {} breach(es)", lines.len());
    lines.iter().for_each(|l| eprintln!("  {l}"));
    ExitCode::FAILURE
}

/// Stdout, closed early by a reader like `head`, ends the run quietly.
fn emit(s: &str) {
    use std::io::Write;
    if std::io::stdout().write_all(s.as_bytes()).is_err() {
        std::process::exit(0);
    }
}

fn find_root() -> Option<PathBuf> {
    let here = std::env::current_dir().ok()?;
    here.ancestors().find(|p| p.join(".guidelines").is_dir()).map(Path::to_path_buf)
}

fn committed(root: &Path) -> Result<Option<Index>, Vec<String>> {
    let idx = index::committed(root).map(|c| c.map(|(_, i)| i)).map_err(|e| vec![e])?;
    match idx.as_ref().map(index::validate) {
        Some(broken) if !broken.is_empty() => Err(broken),
        _ => Ok(idx),
    }
}

fn write(root: &Path, restamp: &[String]) -> Result<(), Vec<String>> {
    let old = committed(root)?;
    for doc in restamp {
        if old.as_ref().and_then(|o| o.entry(doc)).is_none_or(|e| e.sources.is_empty()) {
            return Err(vec![format!("{doc}: not a document in the index that declares sources")]);
        }
    }
    let new = index::build(root, old.as_ref(), restamp)?;
    let path = root.join(index::PATH);
    std::fs::create_dir_all(path.parent().expect("the index lives in a folder")).map_err(|e| vec![e.to_string()])?;
    std::fs::write(&path, index::render(&new)).map_err(|e| vec![e.to_string()])?;
    let nodes: usize = new.files.iter().map(|f| f.nodes.len()).sum();
    emit(&format!("{}: {} files, {} nodes, {} aliases\n", index::PATH, new.files.len(), nodes, new.aliases.len()));
    Ok(())
}

fn is_id(s: &str) -> bool {
    s.strip_prefix('n').is_some_and(|d| !d.is_empty() && d.bytes().all(|b| b.is_ascii_digit()))
}

/// A reference, read: the live path it names, and the old path when it named
/// the node by an alias.
struct Target {
    path: String,
    moved_from: Option<String>,
}

fn target(idx: &Index, places: &HashMap<String, Place>, reference: &str) -> Result<Target, String> {
    if is_id(reference) {
        let place = places.get(reference).ok_or_else(|| format!("`{reference}` is no NodeID of the index"))?;
        return Ok(Target { path: idx.path_of(place), moved_from: None });
    }
    match idx.alias(reference).and_then(|id| places.get(id)) {
        Some(place) => Ok(Target { path: idx.path_of(place), moved_from: Some(reference.to_string()) }),
        None => Ok(Target { path: reference.to_string(), moved_from: None }),
    }
}

/// The NodeID a reference names: the node must be in the index.
fn id_of(idx: &Index, places: &HashMap<String, Place>, reference: &str) -> Result<String, String> {
    let t = target(idx, places, reference)?;
    let (file, selector) = split(&t.path);
    idx.entry(file).and_then(|e| e.node(selector)).map(|n| n.id.clone())
        .ok_or_else(|| format!("`{reference}` names no node of the index"))
}

fn resolve(root: &Path, references: &[String], text: bool) -> Result<(), Vec<String>> {
    let idx = committed(root)?.unwrap_or_default();
    let places = identity::places(&idx);
    let mut errors = Vec::new();
    let mut targets: Vec<Option<Target>> = Vec::new();
    for r in references {
        match target(&idx, &places, r) {
            Ok(t) => {
                if let Some(old) = &t.moved_from {
                    eprintln!("glyph-vpath: `{old}` moved; it is `{}`", t.path);
                }
                targets.push(Some(t));
            }
            Err(e) => { errors.push(e); targets.push(None); }
        }
    }
    let mut by_file: BTreeMap<&str, Vec<&str>> = BTreeMap::new();
    for t in targets.iter().flatten() {
        let (file, selector) = split(&t.path);
        by_file.entry(file).or_default().push(selector);
    }
    let mut answers: HashMap<String, (usize, usize, String)> = HashMap::new();
    let mut contents: HashMap<&str, String> = HashMap::new();
    for (file, selectors) in by_file {
        let content = match index::read(root, file) {
            Ok(c) => c,
            Err(e) => { errors.push(e); continue; }
        };
        let entry = idx.entry(file);
        if let Some(e) = entry.filter(|e| e.fingerprint() != fingerprint(&content)) {
            errors.push(format!("{}: changed since the index was built; run `glyph-vpath build`", e.path));
            continue;
        }
        for selector in selectors {
            let vpath = join(file, selector);
            let found = match entry.and_then(|e| e.node(selector)) {
                Some(n) => Ok((n.start, n.end, n.id.clone())),
                None => select(Format::of(file), &content, selector).map(|n| (n.start, n.end, String::new())),
            };
            match found {
                Ok(r) if r.1 > r.0 => { answers.insert(vpath, r); }
                Ok(_) => errors.push(format!("{vpath}: resolves to an empty slice")),
                Err(e) => errors.push(format!("{vpath}: {e}")),
            }
        }
        contents.insert(file, content);
    }
    for t in targets.iter().flatten() {
        let Some((start, end, id)) = answers.get(&t.path) else { continue };
        let (file, selector) = split(&t.path);
        let content = &contents[file];
        let slice = &content[*start..*end];
        let (line, count) = Lines::of(content).range(*start, *end);
        let parent = places.get(id).map(|p| idx.files[p.file].nodes[p.node].parent.clone()).unwrap_or_default();
        if text {
            let mut head = format!("--- {}", t.path);
            if !id.is_empty() {
                head.push_str(&format!(" · {id}"));
            }
            head.push_str(&format!(" · lines {line}+{count} · bytes {start}..{end}"));
            if let Some(old) = &t.moved_from {
                head.push_str(&format!(" · moved from {old}"));
            }
            emit(&format!("{head}\n{slice}{}", if slice.ends_with('\n') { "" } else { "\n" }));
        } else {
            let opt = |s: &str| if s.is_empty() { Json::Null } else { Json::Str(s.to_string()) };
            let mut record = vec![
                ("path".into(), Json::Str(t.path.clone())),
                ("id".into(), opt(id)),
                ("parent".into(), opt(&parent)),
                ("file".into(), Json::Str(file.into())),
                ("selector".into(), Json::Str(selector.into())),
                ("bytes".into(), Json::Arr(vec![Json::Num(*start as f64), Json::Num(*end as f64)])),
                ("line".into(), Json::Num(line as f64)),
                ("lines".into(), Json::Num(count as f64)),
                ("fingerprint".into(), Json::Str(fingerprint(slice))),
            ];
            if let Some(old) = &t.moved_from {
                record.push(("moved_from".into(), Json::Str(old.clone())));
            }
            emit(&(stringify(&Json::Obj(record)) + "\n"));
        }
    }
    if errors.is_empty() { Ok(()) } else { Err(errors) }
}

fn node(root: &Path, reference: &str) -> Result<(), Vec<String>> {
    let idx = committed(root)?.unwrap_or_default();
    let places = identity::places(&idx);
    let id = id_of(&idx, &places, reference).map_err(|e| vec![e])?;
    let place = &places[&id];
    let n = &idx.files[place.file].nodes[place.node];
    let path_of = |id: &str| places.get(id).map_or(Json::Null, |p| Json::Str(idx.path_of(p)));
    let opt = |s: Option<&String>| s.map_or(Json::Null, |s| Json::Str(s.clone()));
    emit(&(stringify(&Json::Obj(vec![
        ("id".into(), Json::Str(id.clone())),
        ("path".into(), Json::Str(idx.path_of(place))),
        ("parent".into(), opt(Some(&n.parent).filter(|p| !p.is_empty()))),
        ("parent_path".into(), path_of(&n.parent)),
        ("prev".into(), opt(place.prev.as_ref())),
        ("next".into(), opt(place.next.as_ref())),
        ("depth".into(), Json::Num(place.depth as f64)),
        ("line".into(), Json::Num(n.line as f64)),
        ("lines".into(), Json::Num(n.lines as f64)),
    ])) + "\n"));
    Ok(())
}

fn up(root: &Path, reference: &str) -> Result<(), Vec<String>> {
    let idx = committed(root)?.unwrap_or_default();
    let places = identity::places(&idx);
    let mut id = id_of(&idx, &places, reference).map_err(|e| vec![e])?;
    loop {
        let place = &places[&id];
        emit(&format!("{id:<7} {}\n", idx.path_of(place)));
        let parent = &idx.files[place.file].nodes[place.node].parent;
        if parent.is_empty() {
            return Ok(());
        }
        id = parent.clone();
    }
}

fn list(root: &Path, file: &str) -> Result<(), Vec<String>> {
    let content = index::read(root, file).map_err(|e| vec![e])?;
    let nodes = tree(Format::of(file), &content).map_err(|e| vec![format!("{file}: {e}")])?;
    let lines = Lines::of(&content);
    for n in nodes {
        let (line, count) = lines.range(n.start, n.end);
        emit(&format!("{:>6} +{:<5} {}\n", line, count, join(file, &n.selector)));
    }
    Ok(())
}

fn code(root: &Path, file: &str) -> Result<(), Vec<String>> {
    let idx = committed(root)?.ok_or_else(|| vec![format!("{} does not exist: run `glyph-vpath build`", index::PATH)])?;
    for e in &idx.files {
        for (vpath, _) in e.sources.iter().filter(|(v, _)| split(v).0 == file) {
            emit(&format!("{} ← {vpath}\n", e.path));
        }
    }
    Ok(())
}
