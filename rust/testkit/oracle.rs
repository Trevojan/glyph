//! The oracle, read by the tests of every crate.
//!
//! `node scripts/test-corpus.js --export-oracle` writes it at the commit under
//! test — `npm run check:rust` does, before `cargo test`: one JSON file per
//! declared source in `rust/target/oracle/`, and the answers of one JS module
//! per file in `rust/target/oracle-modules/`. A test that finds none fails and
//! names that command; it never passes empty.
//!
//! Shared by `#[path]` and not by a crate: it is test scaffolding, not the
//! engine, so `crate-graph.js` has no arrow to hold it to. The JSON reader is
//! written here because no crate from outside the repository enters without the
//! Regent (INTAKE-RUST-LADDER.md §9).

#![allow(dead_code)]

use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};

/// The command that writes the oracle, named by every failure to find it.
pub const WRITE_IT: &str = "node scripts/test-corpus.js --export-oracle";

/// A JSON value. Object keys keep the order they were written in.
#[derive(Debug, Clone, PartialEq)]
pub enum Json {
    Null,
    Bool(bool),
    Num(f64),
    Str(String),
    Arr(Vec<Json>),
    Obj(Vec<(String, Json)>),
}

impl Json {
    pub fn get(&self, key: &str) -> Option<&Json> {
        match self {
            Json::Obj(kv) => kv.iter().find(|(k, _)| k == key).map(|(_, v)| v),
            _ => None,
        }
    }
    pub fn str(&self) -> Option<&str> {
        if let Json::Str(s) = self { Some(s) } else { None }
    }
    pub fn arr(&self) -> Option<&[Json]> {
        if let Json::Arr(a) = self { Some(a) } else { None }
    }
    pub fn num(&self) -> Option<f64> {
        if let Json::Num(n) = self { Some(*n) } else { None }
    }
    /// The string at `key`, or a failure naming the key.
    pub fn s(&self, key: &str) -> &str {
        self.get(key).and_then(Json::str).unwrap_or_else(|| panic!("no string at {key:?}"))
    }
    /// The array at `key`, or a failure naming the key.
    pub fn a(&self, key: &str) -> &[Json] {
        self.get(key).and_then(Json::arr).unwrap_or_else(|| panic!("no array at {key:?}"))
    }
    /// Every string this value holds, object keys included — what the JS
    /// export gathers when it answers a module over the case files.
    pub fn strings<'a>(&'a self, out: &mut Vec<&'a str>) {
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

/// Reads one JSON text. A lone surrogate is refused rather than replaced: a
/// Rust string cannot hold one, and nothing disappears in silence.
pub fn parse(text: &str) -> Result<Json, String> {
    let mut p = Reader { b: text.as_bytes(), i: 0 };
    let v = p.value()?;
    p.ws();
    if p.i == p.b.len() { Ok(v) } else { p.fail("text after the value") }
}

struct Reader<'a> {
    b: &'a [u8],
    i: usize,
}

impl Reader<'_> {
    fn fail<T>(&self, what: &str) -> Result<T, String> {
        Err(format!("{what} at byte {}", self.i))
    }
    fn ws(&mut self) {
        while let Some(b' ' | b'\t' | b'\n' | b'\r') = self.b.get(self.i) {
            self.i += 1;
        }
    }
    fn at(&mut self, c: u8) -> bool {
        self.ws();
        if self.b.get(self.i) == Some(&c) {
            self.i += 1;
            true
        } else {
            false
        }
    }
    fn value(&mut self) -> Result<Json, String> {
        self.ws();
        match self.b.get(self.i).copied() {
            Some(b'{') => {
                self.i += 1;
                let mut kv = Vec::new();
                if self.at(b'}') {
                    return Ok(Json::Obj(kv));
                }
                loop {
                    self.ws();
                    if self.b.get(self.i) != Some(&b'"') {
                        return self.fail("a key expected");
                    }
                    let k = self.string()?;
                    if !self.at(b':') {
                        return self.fail("`:` expected");
                    }
                    kv.push((k, self.value()?));
                    if self.at(b'}') {
                        return Ok(Json::Obj(kv));
                    }
                    if !self.at(b',') {
                        return self.fail("`,` or `}` expected");
                    }
                }
            }
            Some(b'[') => {
                self.i += 1;
                let mut a = Vec::new();
                if self.at(b']') {
                    return Ok(Json::Arr(a));
                }
                loop {
                    a.push(self.value()?);
                    if self.at(b']') {
                        return Ok(Json::Arr(a));
                    }
                    if !self.at(b',') {
                        return self.fail("`,` or `]` expected");
                    }
                }
            }
            Some(b'"') => self.string().map(Json::Str),
            Some(b't') => self.word("true", Json::Bool(true)),
            Some(b'f') => self.word("false", Json::Bool(false)),
            Some(b'n') => self.word("null", Json::Null),
            Some(b'-' | b'0'..=b'9') => {
                let start = self.i;
                while let Some(b'-' | b'+' | b'.' | b'e' | b'E' | b'0'..=b'9') = self.b.get(self.i) {
                    self.i += 1;
                }
                match std::str::from_utf8(&self.b[start..self.i]).ok().and_then(|t| t.parse().ok()) {
                    Some(n) => Ok(Json::Num(n)),
                    None => self.fail("a malformed number"),
                }
            }
            _ => self.fail("a value expected"),
        }
    }
    fn word(&mut self, w: &str, v: Json) -> Result<Json, String> {
        if self.b[self.i..].starts_with(w.as_bytes()) {
            self.i += w.len();
            Ok(v)
        } else {
            self.fail("a value expected")
        }
    }
    fn hex4(&mut self) -> Result<u32, String> {
        let h = self.b.get(self.i..self.i + 4)
            .and_then(|h| std::str::from_utf8(h).ok())
            .and_then(|h| u32::from_str_radix(h, 16).ok());
        match h {
            Some(u) => {
                self.i += 4;
                Ok(u)
            }
            None => self.fail("a malformed \\u escape"),
        }
    }
    fn string(&mut self) -> Result<String, String> {
        self.i += 1;
        let mut out = String::new();
        loop {
            /* a run of plain bytes ends only at an ASCII byte, so it is whole UTF-8 */
            let start = self.i;
            while let Some(&c) = self.b.get(self.i) {
                if c == b'"' || c == b'\\' {
                    break;
                }
                self.i += 1;
            }
            out.push_str(std::str::from_utf8(&self.b[start..self.i]).map_err(|e| e.to_string())?);
            match self.b.get(self.i).copied() {
                Some(b'"') => {
                    self.i += 1;
                    return Ok(out);
                }
                Some(b'\\') => {
                    let Some(&c) = self.b.get(self.i + 1) else { return self.fail("an unterminated escape") };
                    self.i += 2;
                    match c {
                        b'"' => out.push('"'),
                        b'\\' => out.push('\\'),
                        b'/' => out.push('/'),
                        b'b' => out.push('\u{8}'),
                        b'f' => out.push('\u{c}'),
                        b'n' => out.push('\n'),
                        b'r' => out.push('\r'),
                        b't' => out.push('\t'),
                        b'u' => {
                            let hi = self.hex4()?;
                            let code = if (0xD800..0xDC00).contains(&hi) {
                                if self.b.get(self.i..self.i + 2) != Some(b"\\u".as_slice()) {
                                    return self.fail("a lone surrogate");
                                }
                                self.i += 2;
                                let lo = self.hex4()?;
                                if !(0xDC00..0xE000).contains(&lo) {
                                    return self.fail("a lone surrogate");
                                }
                                0x10000 + ((hi - 0xD800) << 10) + (lo - 0xDC00)
                            } else {
                                hi
                            };
                            match char::from_u32(code) {
                                Some(ch) => out.push(ch),
                                None => return self.fail("a lone surrogate"),
                            }
                        }
                        _ => return self.fail("an unknown escape"),
                    }
                }
                _ => return self.fail("an unterminated string"),
            }
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
