//! The recovery index: layer 7 of `.plan` §0, EMS-002 ORD-0003.
//!
//! What the NodeID does not reach — a Markdown section whose heading was
//! renamed while its body changed — the build recovers by its content: the
//! section that went is compared, line set against line set, with every
//! section that came, and the one whose Jaccard is largest, at least 0.5 and
//! unique, is its successor (INTAKE-VIRTUAL-PATH §23; by the path the
//! precision was 35.7 %). A deletion has no such successor, so it is never
//! recovered; two successors that tie are not either.
//!
//! Recovery is not identity. The successor keeps its own NodeID; the old path
//! and the old NodeID point at it as **recovered**, with the score, and every
//! answer given through one is an **index miss**: it warns, never blocks, and
//! is written to the log of misses beside the index.
//!
//! The index keeps fingerprints, not text, so the old text comes from the
//! cache of the last build, then from git at HEAD — each taken only when its
//! fingerprint is the one the index holds for the file. The cache answers
//! what git cannot: a second build before a commit, and a checkout whose line
//! endings differ from the commit.

use crate::index::{Entry, Index};
use crate::{fingerprint, join, Format};
use std::collections::{BTreeMap, HashMap, HashSet};
use std::path::{Path, PathBuf};

pub const CACHE: &str = ".guidelines/.shortcuts/.virtual/cache";
pub const MISSES: &str = ".guidelines/.shortcuts/.virtual/misses.jsonl";
const JACCARD: f64 = 0.5;

/// An old path, and the NodeID it had, answered by a successor found by its
/// content: `score` is the Jaccard in hundredths.
#[derive(Debug, Clone, PartialEq)]
pub struct Recovered {
    pub path: String,
    pub id: String,
    pub to: String,
    pub score: u32,
}

/// The text a file had when the index was built, if the cache or git hold it.
pub fn previous_text(root: &Path, file: &str, expected: &str) -> Option<String> {
    let cached = std::fs::read_to_string(root.join(CACHE).join(file)).ok();
    let committed = || {
        let out = std::process::Command::new("git").arg("-C").arg(root).arg("show").arg(format!("HEAD:{file}")).output().ok()?;
        out.status.success().then(|| String::from_utf8(out.stdout).ok()).flatten()
    };
    cached.filter(|t| fingerprint(t) == expected).or_else(|| committed().filter(|t| fingerprint(t) == expected))
}

/// The lines of a section under its heading, trimmed, the blank ones out.
fn lines(section: &str) -> HashSet<&str> {
    section.split_once('\n').map_or("", |(_, body)| body).lines().map(str::trim).filter(|l| !l.is_empty()).collect()
}

fn jaccard(a: &HashSet<&str>, b: &HashSet<&str>) -> f64 {
    if a.is_empty() || b.is_empty() {
        return 0.0;
    }
    let both = a.intersection(b).count();
    both as f64 / (a.len() + b.len() - both) as f64
}

/// The recoveries of one build: the old ones carried, and one for each section
/// that went and has a successor by its content. `vanished` are the old
/// nodes no rule of the NodeID reached, `fresh` the new nodes it numbered;
/// `texts` the text of each new file. Returns the recoveries and the notes on
/// what could not be tried.
pub fn recover(
    root: &Path,
    prev: &Index,
    files: &[Entry],
    texts: &HashMap<String, String>,
    vanished: &[(usize, usize)],
    fresh: &[(usize, usize)],
) -> (Vec<Recovered>, Vec<String>) {
    let markdown = |path: &str| Format::of(path) == Format::Markdown;
    let candidates: Vec<(usize, usize, HashSet<&str>)> = fresh.iter()
        .filter(|&&(f, n)| n > 0 && markdown(&files[f].path))
        .map(|&(f, n)| {
            let node = &files[f].nodes[n];
            (f, n, lines(&texts[&files[f].path][node.start..node.end]))
        })
        .collect();

    let mut found: Vec<Recovered> = Vec::new();
    let mut notes = Vec::new();
    let mut old_texts: HashMap<usize, Option<String>> = HashMap::new();
    for &(g, n) in vanished.iter().filter(|&&(g, n)| n > 0 && markdown(&prev.files[g].path)) {
        let o = &prev.files[g];
        let text = old_texts.entry(g).or_insert_with(|| previous_text(root, &o.path, o.fingerprint()));
        let Some(text) = text.as_deref() else {
            notes.push(format!("{}: went, and the text it had is neither in the cache nor in git at HEAD; not recovered",
                               join(&o.path, &o.nodes[n].selector)));
            continue;
        };
        let node = &o.nodes[n];
        let mine = lines(&text[node.start..node.end]);
        let scores: Vec<f64> = candidates.iter().map(|c| jaccard(&mine, &c.2)).collect();
        let top = scores.iter().cloned().fold(0.0, f64::max);
        let at: Vec<usize> = (0..scores.len()).filter(|&k| scores[k] == top).collect();
        if let [k] = at[..] && top >= JACCARD {
            let (f, m, _) = &candidates[k];
            found.push(Recovered { path: join(&o.path, &node.selector), id: node.id.clone(), to: files[*f].nodes[*m].id.clone(), score: (top * 100.0).floor() as u32 });
        }
    }

    // the old recoveries: kept while their successor lives, and passed on when
    // the successor itself went and was recovered; an alias whose node went
    // and was recovered becomes a recovery too
    let live_ids: HashSet<&str> = files.iter().flat_map(|e| e.nodes.iter().map(|n| n.id.as_str())).collect();
    let live_paths: HashSet<String> = files.iter().flat_map(|e| e.nodes.iter().map(move |n| join(&e.path, &n.selector))).collect();
    let onward: HashMap<&str, (&str, u32)> = found.iter().map(|r| (r.id.as_str(), (r.to.as_str(), r.score))).collect();
    let follow = |to: &str, score: u32| -> Option<(String, u32)> {
        if live_ids.contains(to) {
            return Some((to.to_string(), score));
        }
        onward.get(to).map(|&(next, s)| (next.to_string(), score.min(s)))
    };
    let mut all: BTreeMap<String, Recovered> = BTreeMap::new();
    for r in &prev.recovered {
        if let Some((to, score)) = follow(&r.to, r.score) {
            all.insert(r.path.clone(), Recovered { to, score, ..r.clone() });
        }
    }
    for (path, id) in &prev.aliases {
        if !live_ids.contains(id.as_str()) && let Some(&(to, score)) = onward.get(id.as_str()) {
            all.insert(path.clone(), Recovered { path: path.clone(), id: id.clone(), to: to.to_string(), score });
        }
    }
    for r in found {
        all.insert(r.path.clone(), r);
    }
    all.retain(|path, r| !live_paths.contains(path) && !live_ids.contains(r.id.as_str()));
    (all.into_values().collect(), notes)
}

/// Keeps the text of every Markdown file of the index, for the next build.
pub fn write_cache(root: &Path, index: &Index) -> std::io::Result<()> {
    for e in index.files.iter().filter(|e| Format::of(&e.path) == Format::Markdown) {
        let to: PathBuf = root.join(CACHE).join(&e.path);
        if let Some(dir) = to.parent() {
            std::fs::create_dir_all(dir)?;
        }
        std::fs::copy(root.join(&e.path), to)?;
    }
    Ok(())
}

/// Writes one index miss to the log. A log that cannot be written does not
/// stop the answer: the miss was already said aloud.
pub fn log_miss(root: &Path, asked: &str, answered: &str, r: &Recovered) {
    use std::io::Write;
    let at = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_or(0, |d| d.as_secs());
    let s = |t: &str| glyph_util::json::stringify(&glyph_util::json::Json::Str(t.to_string()));
    let line = format!("{{\"at\":{at},\"asked\":{},\"answered\":{},\"to\":{},\"score\":{}}}\n", s(asked), s(answered), s(&r.to), r.score);
    let path = root.join(MISSES);
    let _ = path.parent().map(std::fs::create_dir_all);
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(path) {
        let _ = f.write_all(line.as_bytes());
    }
}
