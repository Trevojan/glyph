//! The vocabulary's tables, read from `scripts/core/vocabulary.js` at build time.
//!
//! They live there and nowhere else: not in `GLOSSARY.md` (which names the
//! commands but not their aliases, arity or moods, and labels `DFN` "Define"
//! where the engine glosses it "Define Symbol"), and not in the stores. So the
//! one place stays the JS file, and this reads each hand-written table out of
//! it as a literal — objects, arrays, strings, numbers, comments — and writes
//! it as Rust. The tables the JS derives with code (PTBR, ALIAS_OF,
//! GLOSS_REVERSE, …) are derived in `src/lib.rs` by the same code, ported.
//!
//! An object keeps the JS's property order, array-index keys first, so every
//! table enumerates here as `Object.keys` enumerates it there. A table whose
//! shape the port does not know stops the build and says which.

use std::{env, fmt::Write as _, fs, path::Path};

enum Lit {
    Str(String),
    Num(f64),
    Arr(Vec<Lit>),
    Obj(Vec<(String, Lit)>),
}

struct Reader<'a> {
    s: &'a [u8],
    i: usize,
    table: &'a str,
}

impl Reader<'_> {
    fn fail(&self, what: &str) -> ! {
        panic!("vocabulary.js, {}: {what} at byte {}", self.table, self.i)
    }
    fn skip(&mut self) {
        loop {
            while self.i < self.s.len() && self.s[self.i].is_ascii_whitespace() {
                self.i += 1;
            }
            if self.s[self.i..].starts_with(b"/*") {
                match self.s[self.i + 2..].windows(2).position(|w| w == b"*/") {
                    Some(n) => self.i += n + 4,
                    None => self.fail("an unclosed comment"),
                }
            } else if self.s[self.i..].starts_with(b"//") {
                while self.i < self.s.len() && self.s[self.i] != b'\n' {
                    self.i += 1;
                }
            } else {
                return;
            }
        }
    }
    fn eat(&mut self, c: u8) -> bool {
        self.skip();
        if self.s.get(self.i) == Some(&c) {
            self.i += 1;
            true
        } else {
            false
        }
    }
    fn lit(&mut self) -> Lit {
        self.skip();
        match self.s.get(self.i).copied() {
            Some(b'{') => {
                self.i += 1;
                let mut kv: Vec<(String, Lit)> = Vec::new();
                loop {
                    if self.eat(b'}') {
                        return Lit::Obj(kv);
                    }
                    self.skip();
                    let key = match self.s.get(self.i).copied() {
                        Some(q @ (b'"' | b'\'')) => self.string(q),
                        _ => {
                            let start = self.i;
                            while self.i < self.s.len()
                                && (self.s[self.i].is_ascii_alphanumeric() || b"_$".contains(&self.s[self.i])) {
                                self.i += 1;
                            }
                            if start == self.i {
                                self.fail("a key expected");
                            }
                            String::from_utf8(self.s[start..self.i].to_vec()).unwrap()
                        }
                    };
                    if !self.eat(b':') {
                        self.fail("`:` expected");
                    }
                    let v = self.lit();
                    set(&mut kv, key, v);
                    if !self.eat(b',') && !self.eat(b'}') {
                        self.fail("`,` or `}` expected");
                    } else if self.s[self.i - 1] == b'}' {
                        return Lit::Obj(kv);
                    }
                }
            }
            Some(b'[') => {
                self.i += 1;
                let mut a = Vec::new();
                loop {
                    if self.eat(b']') {
                        return Lit::Arr(a);
                    }
                    a.push(self.lit());
                    if !self.eat(b',') && !self.eat(b']') {
                        self.fail("`,` or `]` expected");
                    } else if self.s[self.i - 1] == b']' {
                        return Lit::Arr(a);
                    }
                }
            }
            Some(q @ (b'"' | b'\'')) => Lit::Str(self.string(q)),
            Some(b'-' | b'0'..=b'9') => {
                let start = self.i;
                while self.i < self.s.len() && (self.s[self.i].is_ascii_digit() || b"-+.eE".contains(&self.s[self.i])) {
                    self.i += 1;
                }
                match std::str::from_utf8(&self.s[start..self.i]).unwrap().parse() {
                    Ok(n) => Lit::Num(n),
                    Err(_) => self.fail("a malformed number"),
                }
            }
            _ => self.fail("a literal expected"),
        }
    }
    fn string(&mut self, q: u8) -> String {
        self.i += 1;
        let mut out: Vec<u8> = Vec::new();
        loop {
            match self.s.get(self.i).copied() {
                None | Some(b'\n') => self.fail("an unterminated string"),
                Some(c) if c == q => {
                    self.i += 1;
                    return String::from_utf8(out).unwrap();
                }
                Some(b'\\') => {
                    let c = self.s[self.i + 1];
                    self.i += 2;
                    match c {
                        b'n' => out.push(b'\n'),
                        b't' => out.push(b'\t'),
                        b'r' => out.push(b'\r'),
                        b'u' => {
                            let h = std::str::from_utf8(&self.s[self.i..self.i + 4]).unwrap();
                            let ch = u32::from_str_radix(h, 16).ok().and_then(char::from_u32)
                                .unwrap_or_else(|| self.fail("a \\u escape the port cannot hold"));
                            self.i += 4;
                            out.extend_from_slice(ch.to_string().as_bytes());
                        }
                        c => out.push(c),
                    }
                }
                Some(c) => {
                    out.push(c);
                    self.i += 1;
                }
            }
        }
    }
}

/// A JS assignment: an existing key keeps its place, a new array-index key
/// goes among the index keys in ascending order, any other new key goes last.
fn set(kv: &mut Vec<(String, Lit)>, key: String, value: Lit) {
    if let Some(slot) = kv.iter_mut().find(|(k, _)| *k == key) {
        slot.1 = value;
        return;
    }
    let index = |k: &str| (k == "0" || (!k.starts_with('0') && !k.is_empty() && k.bytes().all(|b| b.is_ascii_digit())))
        .then(|| k.parse::<u32>().ok()).flatten().filter(|&n| n != u32::MAX);
    match index(&key) {
        Some(n) => {
            let at = kv.iter().position(|(k, _)| index(k).is_none_or(|m| m > n)).unwrap_or(kv.len());
            kv.insert(at, (key, value));
        }
        None => kv.push((key, value)),
    }
}

fn table<'a>(src: &'a str, name: &'a str) -> Lit {
    let head = format!("export var {name} = ");
    let at = src.find(&head).unwrap_or_else(|| panic!("vocabulary.js: no `{head}…`"));
    Reader { s: src.as_bytes(), i: at + head.len(), table: name }.lit()
}

fn string(l: &Lit, table: &str) -> String {
    match l {
        Lit::Str(s) => format!("{s:?}"),
        _ => panic!("vocabulary.js, {table}: a string expected"),
    }
}

fn main() {
    let js = Path::new(&env::var("CARGO_MANIFEST_DIR").unwrap()).join("../../../scripts/core/vocabulary.js");
    println!("cargo:rerun-if-changed={}", js.display());
    let src = fs::read_to_string(&js).unwrap_or_else(|e| panic!("{}: {e}", js.display()));
    let mut out = String::from("// GENERATED by build.rs from scripts/core/vocabulary.js — the tables it writes by hand.\n\n");

    /* name → string */
    for name in ["INSTR", "ALIAS", "STRUCT", "META", "MODE", "EMO", "SESSION"] {
        let Lit::Obj(kv) = table(&src, name) else { panic!("vocabulary.js, {name}: an object expected") };
        let rows: Vec<String> = kv.iter().map(|(k, v)| format!("({k:?}, {})", string(v, name))).collect();
        writeln!(out, "pub static {name}: &[(&str, &str)] = &[{}];", rows.join(", ")).unwrap();
    }
    /* name → number */
    for name in ["EDITORIAL_ONLY", "NAMED_STRUCT"] {
        let Lit::Obj(kv) = table(&src, name) else { panic!("vocabulary.js, {name}: an object expected") };
        let rows: Vec<String> = kv.iter().map(|(k, v)| match v {
            Lit::Num(n) => format!("({k:?}, {n:?})"),
            _ => panic!("vocabulary.js, {name}: a number expected"),
        }).collect();
        writeln!(out, "pub static {name}: &[(&str, f64)] = &[{}];", rows.join(", ")).unwrap();
    }
    /* [[a, b], …] */
    for name in ["LOGIC_OPS", "PUNCT"] {
        let Lit::Arr(rows) = table(&src, name) else { panic!("vocabulary.js, {name}: an array expected") };
        let rows: Vec<String> = rows.iter().map(|r| match r {
            Lit::Arr(p) if p.len() == 2 => format!("({}, {})", string(&p[0], name), string(&p[1], name)),
            _ => panic!("vocabulary.js, {name}: pairs expected"),
        }).collect();
        writeln!(out, "pub static {name}: &[(&str, &str)] = &[{}];", rows.join(", ")).unwrap();
    }
    /* name → [string, …] */
    for name in ["FRAMES", "SLOTS"] {
        let Lit::Obj(kv) = table(&src, name) else { panic!("vocabulary.js, {name}: an object expected") };
        let rows: Vec<String> = kv.iter().map(|(k, v)| match v {
            Lit::Arr(a) => format!("({k:?}, &[{}])", a.iter().map(|s| string(s, name)).collect::<Vec<_>>().join(", ")),
            _ => panic!("vocabulary.js, {name}: a list expected"),
        }).collect();
        writeln!(out, "pub static {name}: &[(&str, &[&str])] = &[{}];", rows.join(", ")).unwrap();
    }
    /* CATS: [{id, label, note, items: [[canonical, pt-BR], …]}, …] */
    let Lit::Arr(cats) = table(&src, "CATS") else { panic!("vocabulary.js, CATS: an array expected") };
    let rows: Vec<String> = cats.iter().map(|c| {
        let Lit::Obj(kv) = c else { panic!("vocabulary.js, CATS: objects expected") };
        let keys: Vec<&str> = kv.iter().map(|(k, _)| k.as_str()).collect();
        assert_eq!(keys, ["id", "label", "note", "items"], "vocabulary.js, CATS: a category the port does not know");
        let Lit::Arr(items) = &kv[3].1 else { panic!("vocabulary.js, CATS: items expected") };
        let items: Vec<String> = items.iter().map(|it| match it {
            Lit::Arr(p) if p.len() == 2 => format!("({}, {})", string(&p[0], "CATS"), string(&p[1], "CATS")),
            _ => panic!("vocabulary.js, CATS: item pairs expected"),
        }).collect();
        format!("Cat {{ id: {}, label: {}, note: {}, items: &[{}] }}",
                string(&kv[0].1, "CATS"), string(&kv[1].1, "CATS"), string(&kv[2].1, "CATS"), items.join(", "))
    }).collect();
    writeln!(out, "pub static CATS: &[Cat] = &[{}];", rows.join(",\n    ")).unwrap();

    fs::write(Path::new(&env::var("OUT_DIR").unwrap()).join("vocab.rs"), out).unwrap();
}
