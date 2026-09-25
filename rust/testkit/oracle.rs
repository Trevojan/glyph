//! The oracle, read by the tests of every crate.
//!
//! `node scripts/test-corpus.js --export-oracle` writes it at the commit under
//! test — `npm run check:rust` does, before `cargo test`: one JSON file per
//! declared source in `rust/target/oracle/`, and the answers of one JS module
//! per file in `rust/target/oracle-modules/`. A test that finds none fails and
//! names that command; it never passes empty.
//!
//! Shared by `#[path]` and not by a crate: it is test scaffolding, not the
//! engine, so `crate-graph.js` has no arrow to hold it to. It reads with
//! `glyph_util::json`, so every crate that includes it has `glyph-util` among
//! its dev-dependencies.

#![allow(dead_code)]

use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};

/// The command that writes the oracle, named by every failure to find it.
pub const WRITE_IT: &str = "node scripts/test-corpus.js --export-oracle";

pub use glyph_util::json::{parse, Json};

/// What a test asks of a value it trusts: the answer, or a failure naming
/// the key.
pub trait Must {
    /// The string at `key`.
    fn s(&self, key: &str) -> &str;
    /// The array at `key`.
    fn a(&self, key: &str) -> &[Json];
    /// Every string this value holds, object keys included — what the JS
    /// export gathers when it answers a module over the case files.
    fn strings<'a>(&'a self, out: &mut Vec<&'a str>);
}

impl Must for Json {
    fn s(&self, key: &str) -> &str {
        self.get(key).and_then(Json::str).unwrap_or_else(|| panic!("no string at {key:?}"))
    }
    fn a(&self, key: &str) -> &[Json] {
        self.get(key).and_then(Json::arr).unwrap_or_else(|| panic!("no array at {key:?}"))
    }
    fn strings<'a>(&'a self, out: &mut Vec<&'a str>) {
        match self {
            Json::Str(s) => out.push(s),
            Json::Arr(a) => a.iter().for_each(|v| v.strings(out)),
            Json::Obj(kv) => kv.iter().for_each(|(k, v)| {
                out.push(k);
                v.strings(out);
            }),
            _ => {}
        }
    }
}

/// The repository, from the crate whose test includes this file.
fn repo() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("..").join("..").join("..")
}

fn read(path: &Path) -> Json {
    let text = fs::read_to_string(path)
        .unwrap_or_else(|e| panic!("no oracle at {}: {e} — write it: {WRITE_IT}", path.display()));
    parse(&text).unwrap_or_else(|e| panic!("{}: {e}", path.display()))
}

/// Every case of the oracle, sorted by file name, held to
/// `.guidelines/corpus-snapshot.json`: as many cases as it counts, each with the
/// digest it records. An oracle written at another commit fails here instead of
/// answering for this one.
pub fn cases() -> &'static [Json] {
    static CASES: OnceLock<Vec<Json>> = OnceLock::new();
    CASES.get_or_init(|| {
        let dir = repo().join("rust").join("target").join("oracle");
        let mut files: Vec<PathBuf> = fs::read_dir(&dir)
            .unwrap_or_else(|e| panic!("no oracle at {}: {e} — write it: {WRITE_IT}", dir.display()))
            .filter_map(|e| e.ok().map(|e| e.path()))
            .filter(|p| p.extension().is_some_and(|x| x == "json"))
            .collect();
        files.sort();
        assert!(!files.is_empty(), "the oracle at {} is empty — write it: {WRITE_IT}", dir.display());
        let snap = read(&repo().join(".guidelines").join("corpus-snapshot.json"));
        let count = snap.get("count").and_then(Json::num).expect("the snapshot has no count") as usize;
        assert_eq!(files.len(), count,
                   "the oracle holds {} cases and the snapshot counts {count} — write it again: {WRITE_IT}",
                   files.len());
        let recorded = snap.get("cases").expect("the snapshot has no cases");
        files.iter().map(|f| {
            let case = read(f);
            let id = case.s("id").to_string();
            let (got, want) = (case.get("digest"), recorded.get(&id));
            for k in ["xml", "ast", "hgml"] {
                assert_eq!(got.and_then(|d| d.get(k)), want.and_then(|d| d.get(k)),
                           "{id}.{k}: the oracle is not the snapshot's — write it again: {WRITE_IT}");
            }
            case
        }).collect()
    })
}

/// The answers of one JS module: `rust/target/oracle-modules/<name>.json`.
pub fn module(name: &str) -> &'static Json {
    static MODULES: OnceLock<Mutex<HashMap<String, &'static Json>>> = OnceLock::new();
    let mut held = MODULES.get_or_init(Default::default).lock().unwrap_or_else(|e| e.into_inner());
    held.entry(name.to_string()).or_insert_with(|| {
        let file = repo().join("rust").join("target").join("oracle-modules").join(format!("{name}.json"));
        Box::leak(Box::new(read(&file)))
    })
}

/// Every file the export writes — the case files, then the module answers —
/// with its text, for a test that holds the JSON reader and writer to them.
pub fn files() -> Vec<(PathBuf, String)> {
    let mut out = Vec::new();
    for dir in ["oracle", "oracle-modules"] {
        let dir = repo().join("rust").join("target").join(dir);
        let mut names: Vec<PathBuf> = fs::read_dir(&dir)
            .unwrap_or_else(|e| panic!("no oracle at {}: {e} — write it: {WRITE_IT}", dir.display()))
            .filter_map(|e| e.ok().map(|e| e.path()))
            .filter(|p| p.extension().is_some_and(|x| x == "json"))
            .collect();
        names.sort();
        assert!(!names.is_empty(), "the oracle at {} is empty — write it: {WRITE_IT}", dir.display());
        for f in names {
            let text = fs::read_to_string(&f).unwrap_or_else(|e| panic!("{}: {e}", f.display()));
            out.push((f, text));
        }
    }
    out
}

/// The envelope's checksum (`ck` in `scripts/core/emit-ast.js`): two FNV-1a
/// runs over UTF-16 code units, as the JS computes them — the XOR on signed
/// 32-bit integers and the product in a double, which drops low bits past
/// 2⁵³ before `>>> 0` keeps 32 of them. For the digests the tests compare;
/// glyph-envelope ports it for the engine.
pub fn ck(s: &str) -> String {
    fn uint32(x: f64) -> u32 {
        let m = x.trunc() % 4294967296.0;
        (if m < 0.0 { m + 4294967296.0 } else { m }) as u32
    }
    let (mut a, mut b): (u32, u32) = (0x811c9dc5, 0x01000193);
    for (i, c) in s.encode_utf16().enumerate() {
        let c = c as i32;
        a = uint32(f64::from((a as i32) ^ c) * 16777619.0);
        b = uint32(f64::from((b as i32) ^ (uint32(f64::from(c) + i as f64) as i32)) * 2246822507.0);
    }
    format!("{a:08x}{b:08x}")
}
