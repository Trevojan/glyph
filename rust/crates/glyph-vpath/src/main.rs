//! glyph-vpath — the virtual paths, from the command line. EMS-002 ORD-0001
//! to ORD-0004.
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
//!   glyph-vpath before A B            how A stands to B: before, after, holds,
//!                                     inside or same
//!   glyph-vpath above REF [N]         the N nodes of its file that end where it
//!                                     starts or before, nearest first (default 3)
//!   glyph-vpath between A B           every node from A to B, in order
//!   glyph-vpath list FILE             the selectors of a file, with their lines
//!   glyph-vpath code FILE             the documents that declare FILE as a source
//!   glyph-vpath misses                the index misses logged, most asked first
//!
//!   REF           a virtual path, `file#selector`, or a NodeID, `n42`
//!   --root DIR    the repository (default: the nearest folder up that holds .guidelines/)
//!
//! A resolution reads each file once however many references name it, and
//! refuses a file whose fingerprint no longer matches the index: the offsets it
//! holds would point at other text. An old path of a node that moved answers
//! the node it became, with a warning naming the new path; an old path or
//! NodeID of a section that went answers the successor the recovery index
//! found by its content, with a warning and its score, and the miss is
//! logged. Neither ever blocks.

use glyph_util::json::{stringify, Json};
use glyph_vpath::identity::{self, Place};
use glyph_vpath::index::{self, Index};
use glyph_vpath::order::Order;
use glyph_vpath::recovery::{self, Recovered};
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
        None => return fail(&["usage: glyph-vpath build | check | stamp DOC... | resolve REF... [--text] | node REF | up REF | before A B | above REF [N] | between A B | list FILE | code FILE | misses".into()]),
    };
    let result = match cmd {
        "build" => write(&root, &[]),
        "stamp" if !rest.is_empty() => write(&root, rest),
        "check" => { let b = index::check(&root); if b.is_empty() { Ok(()) } else { Err(b) } }
        "resolve" if !rest.is_empty() => resolve(&root, rest, text),
        "node" if rest.len() == 1 => node(&root, &rest[0]),
        "up" if rest.len() == 1 => up(&root, &rest[0]),
        "before" if rest.len() == 2 => before(&root, &rest[0], &rest[1]),
        "above" if rest.len() == 1 || rest.len() == 2 => above(&root, &rest[0], rest.get(1).map(String::as_str)),
        "between" if rest.len() == 2 => between(&root, &rest[0], &rest[1]),
        "list" if rest.len() == 1 => list(&root, &rest[0]),
        "code" if rest.len() == 1 => code(&root, &rest[0]),
        "misses" => misses(&root),
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
    recovery::write_cache(root, &new).map_err(|e| vec![format!("{}: {e}", recovery::CACHE)])?;
    new.notes.iter().for_each(|n| eprintln!("glyph-vpath: note: {n}"));
    let nodes: usize = new.files.iter().map(|f| f.nodes.len()).sum();
    emit(&format!("{}: {} files, {} nodes, {} aliases, {} recovered\n", index::PATH, new.files.len(), nodes, new.aliases.len(), new.recovered.len()));
    Ok(())
}

fn is_id(s: &str) -> bool {
    s.strip_prefix('n').is_some_and(|d| !d.is_empty() && d.bytes().all(|b| b.is_ascii_digit()))
}

/// A reference, read: the live path it names, and how it got there when it
/// named the node by an alias or by a recovery.
struct Target {
    path: String,
    via: Via,
}

enum Via {
    Direct,
    Moved(String),
    Recovered(String, Recovered),
}

fn target(idx: &Index, places: &HashMap<String, Place>, reference: &str) -> Result<Target, String> {
    if let Some(place) = places.get(reference) {
        return Ok(Target { path: idx.path_of(place), via: Via::Direct });
    }
    if let Some(place) = idx.alias(reference).and_then(|id| places.get(id)) {
        return Ok(Target { path: idx.path_of(place), via: Via::Moved(reference.to_string()) });
    }
    if let Some(r) = idx.recovery(reference) {
        let place = places.get(&r.to).ok_or_else(|| format!("`{reference}` is recovered as `{}`, which is no node", r.to))?;
        return Ok(Target { path: idx.path_of(place), via: Via::Recovered(reference.to_string(), r.clone()) });
    }
    if is_id(reference) {
        return Err(format!("`{reference}` is no NodeID of the index"));
    }
    Ok(Target { path: reference.to_string(), via: Via::Direct })
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
                match &t.via {
                    Via::Direct => {}
                    Via::Moved(old) => eprintln!("glyph-vpath: `{old}` moved; it is `{}`", t.path),
                    Via::Recovered(old, rec) => {
                        eprintln!("glyph-vpath: `{old}` went; by its content it is `{}`, Jaccard 0.{:02} — an index miss", t.path, rec.score);
                        recovery::log_miss(root, old, &t.path, rec);
                    }
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
            match &t.via {
                Via::Direct => {}
                Via::Moved(old) => head.push_str(&format!(" · moved from {old}")),
                Via::Recovered(old, rec) => head.push_str(&format!(" · recovered from {old}, Jaccard 0.{:02}", rec.score)),
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
            match &t.via {
                Via::Direct => {}
                Via::Moved(old) => record.push(("moved_from".into(), Json::Str(old.clone()))),
                Via::Recovered(old, rec) => {
                    record.push(("recovered_from".into(), Json::Str(old.clone())));
                    record.push(("score".into(), Json::Num(f64::from(rec.score) / 100.0)));
                }
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

fn misses(root: &Path) -> Result<(), Vec<String>> {
    let log = std::fs::read_to_string(root.join(recovery::MISSES)).unwrap_or_default();
    let mut count: BTreeMap<(String, String), usize> = BTreeMap::new();
    for line in log.lines().filter(|l| !l.trim().is_empty()) {
        let j = glyph_util::json::parse(line).map_err(|e| vec![format!("{}: {e}", recovery::MISSES)])?;
        let field = |k: &str| j.get(k).and_then(Json::str).unwrap_or_default().to_string();
        *count.entry((field("asked"), field("answered"))).or_default() += 1;
    }
    let mut rows: Vec<_> = count.into_iter().collect();
    rows.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
    for ((asked, answered), n) in rows {
        emit(&format!("{n:>5}  {asked} → {answered}\n"));
    }
    Ok(())
}

/// The index, its places and its order, for the order queries.
fn ordered(root: &Path) -> Result<(Index, HashMap<String, Place>, Order), Vec<String>> {
    let idx = committed(root)?.unwrap_or_default();
    let places = identity::places(&idx);
    let order = Order::of(&idx);
    Ok((idx, places, order))
}

fn line_of(idx: &Index, places: &HashMap<String, Place>, id: &str) -> String {
    let p = &places[id];
    let n = &idx.files[p.file].nodes[p.node];
    format!("{id:<7} {} · lines {}+{}\n", idx.path_of(p), n.line, n.lines)
}

fn before(root: &Path, a: &str, b: &str) -> Result<(), Vec<String>> {
    let (idx, places, order) = ordered(root)?;
    let ia = id_of(&idx, &places, a).map_err(|e| vec![e])?;
    let ib = id_of(&idx, &places, b).map_err(|e| vec![e])?;
    let rel = order.relation(&idx, &ia, &ib).expect("both NodeIDs are in the order");
    emit(&format!("{}\n", rel.word()));
    Ok(())
}

fn above(root: &Path, reference: &str, count: Option<&str>) -> Result<(), Vec<String>> {
    let count = count.map_or(Ok(3), |c| c.parse::<usize>().map_err(|_| vec![format!("`{c}` is not a count")]))?;
    let (idx, places, order) = ordered(root)?;
    let id = id_of(&idx, &places, reference).map_err(|e| vec![e])?;
    for m in order.above(&idx, &id, count).expect("the NodeID is in the order") {
        emit(&line_of(&idx, &places, &m));
    }
    Ok(())
}

fn between(root: &Path, a: &str, b: &str) -> Result<(), Vec<String>> {
    let (idx, places, order) = ordered(root)?;
    let ia = id_of(&idx, &places, a).map_err(|e| vec![e])?;
    let ib = id_of(&idx, &places, b).map_err(|e| vec![e])?;
    for &(f, n) in order.between(&ia, &ib).map_err(|e| vec![e])? {
        emit(&line_of(&idx, &places, &idx.files[f].nodes[n].id));
    }
    Ok(())
}
