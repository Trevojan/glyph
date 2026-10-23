//! glyph-vpath — the virtual paths, from the command line. EMS-002 ORD-0001.
//!
//!   glyph-vpath build                 write the index
//!   glyph-vpath check                 exit 1 on a breach; prints nothing on success
//!   glyph-vpath stamp DOC...          stamp the sources of these documents again
//!   glyph-vpath resolve VPATH... [--text]
//!                                     one line of JSON per path: file, selector,
//!                                     bytes, line, lines, fingerprint; with --text,
//!                                     the slice under its own virtual path
//!   glyph-vpath list FILE             the selectors of a file, with their lines
//!   glyph-vpath code FILE             the documents that declare FILE as a source
//!
//!   --root DIR    the repository (default: the nearest folder up that holds .guidelines/)
//!
//! A resolution reads each file once however many paths name it, and refuses a
//! file whose fingerprint no longer matches the index: the offsets it holds
//! would point at other text.

use glyph_util::json::{stringify, Json};
use glyph_vpath::index::{self, Index};
use glyph_vpath::{fingerprint, join, select, split, tree, Format, Lines};
use std::collections::BTreeMap;
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
        None => return fail(&["usage: glyph-vpath build | check | stamp DOC... | resolve VPATH... [--text] | list FILE | code FILE".into()]),
    };
    let result = match cmd {
        "build" => write(&root, &[]),
        "stamp" if !rest.is_empty() => write(&root, rest),
        "check" => { let b = index::check(&root); if b.is_empty() { Ok(()) } else { Err(b) } }
        "resolve" if !rest.is_empty() => resolve(&root, rest, text),
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
    index::committed(root).map(|c| c.map(|(_, i)| i)).map_err(|e| vec![e])
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
    emit(&format!("{}: {} files, {} nodes\n", index::PATH, new.files.len(), nodes));
    Ok(())
}

fn resolve(root: &Path, vpaths: &[String], text: bool) -> Result<(), Vec<String>> {
    let idx = committed(root)?.unwrap_or_default();
    let mut by_file: BTreeMap<&str, Vec<&str>> = BTreeMap::new();
    for v in vpaths {
        let (file, selector) = split(v);
        by_file.entry(file).or_default().push(selector);
    }
    let mut answers: BTreeMap<String, String> = BTreeMap::new();
    let mut errors = Vec::new();
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
        let lines = Lines::of(&content);
        for selector in selectors {
            let vpath = join(file, selector);
            let found = match entry.and_then(|e| e.node(selector)) {
                Some(n) => Ok((n.start, n.end)),
                None => select(Format::of(file), &content, selector).map(|n| (n.start, n.end)),
            };
            let (start, end) = match found {
                Ok(r) if r.1 > r.0 => r,
                Ok(_) => { errors.push(format!("{vpath}: resolves to an empty slice")); continue; }
                Err(e) => { errors.push(format!("{vpath}: {e}")); continue; }
            };
            let slice = &content[start..end];
            let (line, count) = lines.range(start, end);
            let answer = if text {
                format!("--- {vpath} · lines {line}+{count} · bytes {start}..{end}\n{slice}{}", if slice.ends_with('\n') { "" } else { "\n" })
            } else {
                stringify(&Json::Obj(vec![
                    ("path".into(), Json::Str(vpath.clone())),
                    ("file".into(), Json::Str(file.into())),
                    ("selector".into(), Json::Str(selector.into())),
                    ("bytes".into(), Json::Arr(vec![Json::Num(start as f64), Json::Num(end as f64)])),
                    ("line".into(), Json::Num(line as f64)),
                    ("lines".into(), Json::Num(count as f64)),
                    ("fingerprint".into(), Json::Str(fingerprint(slice))),
                ])) + "\n"
            };
            answers.insert(vpath, answer);
        }
    }
    for v in vpaths {
        if let Some(a) = answers.get(&join(split(v).0, split(v).1)) {
            emit(a);
        }
    }
    if errors.is_empty() { Ok(()) } else { Err(errors) }
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
