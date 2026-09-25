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

/* ---- the parser's tree, as the export writes it (trees.json, ORD-0006) ----
   A tree is `{ nodes, segments }`: every node reachable from the segments,
   once, in the order a pre-order walk first meets it, each with its fields in
   the order `fieldsOf` names them, then `children` and `parent` as indices. */

use glyph_util::tree::{Diag, Emotion, Gloss, Id, Node, Segment, Span, Tree};

const FIELDS: [&str; 25] = ["id", "raw", "tier", "canonical", "gloss", "alias", "colon", "autoClosed", "editorial",
    "origin", "chainElement", "slotName", "depth", "literal", "v", "form", "role", "text", "rawFence", "template",
    "isDef", "mode", "isDefinition", "expanded", "boundSlot"];

fn index(v: &Json) -> usize {
    v.num().filter(|n| *n >= 0.0).unwrap_or_else(|| panic!("not an index: {v:?}")) as usize
}

/// The tree a dump describes; node `i` is the dump's node `i`.
pub fn tree_of(dump: &Json) -> Tree<()> {
    let text = |v: &Json| v.str().unwrap_or_else(|| panic!("not a string: {v:?}")).to_string();
    let flag = |v: &Json| match v {
        Json::Bool(b) => *b,
        v => panic!("not a boolean: {v:?}"),
    };
    let maybe = |v: &Json| if *v == Json::Null { None } else { Some(text(v)) };
    let nodes = dump.a("nodes").iter().map(|n| {
        let mut nd: Node<()> = Node::default();
        for (k, v) in n.obj().expect("a node is an object") {
            match k.as_str() {
                "id" => nd.id = Some(index(v) as u64),
                "raw" => nd.raw = Some(text(v)),
                "tier" => nd.tier = Some(text(v)),
                "canonical" => nd.canonical = Some(text(v)),
                "gloss" => nd.gloss = Some(match v {
                    Json::Obj(kv) if kv.is_empty() => Gloss::Prototype,
                    v => Gloss::Text(text(v)),
                }),
                "alias" => nd.alias = Some(flag(v)),
                "colon" => nd.colon = Some(maybe(v)),
                "autoClosed" => nd.auto_closed = Some(flag(v)),
                "editorial" => nd.editorial = Some(flag(v)),
                "origin" => nd.origin = Some(maybe(v)),
                "chainElement" => nd.chain_element = Some(flag(v)),
                "slotName" => nd.slot_name = Some(flag(v)),
                "depth" => nd.depth = Some(index(v)),
                "literal" => nd.literal = Some(flag(v)),
                "v" => nd.v = Some(text(v)),
                "form" => nd.form = Some(text(v)),
                "role" => nd.role = Some(text(v)),
                "text" => nd.text = Some(flag(v)),
                "rawFence" => nd.raw_fence = Some(flag(v)),
                "template" => nd.template = Some(text(v)),
                "isDef" => nd.is_def = Some(flag(v)),
                "mode" => nd.mode = Some(text(v)),
                "isDefinition" => nd.is_definition = Some(flag(v)),
                "expanded" => nd.expanded = Some(flag(v)),
                "boundSlot" => nd.bound_slot = Some(text(v)),
                "logic" => nd.logic = Some(text(v)),
                "emotions" => nd.emotions = v.arr().expect("emotions are a list").iter().map(|e| Emotion {
                    name: text(e.get("name").expect("an emotion's name")),
                    gloss: text(e.get("gloss").expect("an emotion's gloss")),
                    order: index(e.get("order").expect("an emotion's order")),
                }).collect(),
                "tok" => nd.tok = Some(Span { k: text(v.get("k").expect("tok.k")), s: index(v.get("s").expect("tok.s")),
                                              e: index(v.get("e").expect("tok.e")) }),
                "children" => nd.children = v.arr().expect("children are a list").iter().map(index).collect(),
                "parent" => nd.parent = if *v == Json::Null { None } else { Some(index(v)) },
                k => panic!("a field the tree does not know: {k}"),
            }
        }
        nd
    }).collect();
    let segments = dump.a("segments").iter()
        .map(|s| Segment { children: s.arr().expect("a segment is a list").iter().map(index).collect(), ..Default::default() })
        .collect();
    Tree { nodes, segments }
}

/// The dump of a tree, as the export writes one.
pub fn dump_of<X: Clone>(tree: &Tree<X>) -> Json {
    let mut order: Vec<Id> = Vec::new();
    let mut at: HashMap<Id, usize> = HashMap::new();
    for sg in &tree.segments {
        let mut stack: Vec<Id> = sg.children.iter().rev().copied().collect();
        while let Some(id) = stack.pop() {
            if at.contains_key(&id) {
                continue;
            }
            at.insert(id, order.len());
            order.push(id);
            stack.extend(tree.nodes[id].children.iter().rev());
        }
    }
    let s = |v: &str| Json::Str(v.to_string());
    let num = |n: usize| Json::Num(n as f64);
    let nodes = order.iter().map(|&id| {
        let nd = &tree.nodes[id];
        let mut kv: Vec<(String, Json)> = Vec::new();
        for f in FIELDS {
            let v = match f {
                "id" => nd.id.map(|i| Json::Num(i as f64)),
                "raw" => nd.raw.as_deref().map(s),
                "tier" => nd.tier.as_deref().map(s),
                "canonical" => nd.canonical.as_deref().map(s),
                "gloss" => nd.gloss.as_ref().map(|g| match g {
                    Gloss::Text(t) => s(t),
                    Gloss::Prototype => Json::Obj(Vec::new()),
                }),
                "alias" => nd.alias.map(Json::Bool),
                "colon" => nd.colon.as_ref().map(|c| c.as_deref().map_or(Json::Null, s)),
                "autoClosed" => nd.auto_closed.map(Json::Bool),
                "editorial" => nd.editorial.map(Json::Bool),
                "origin" => nd.origin.as_ref().map(|o| o.as_deref().map_or(Json::Null, s)),
                "chainElement" => nd.chain_element.map(Json::Bool),
                "slotName" => nd.slot_name.map(Json::Bool),
                "depth" => nd.depth.map(num),
                "literal" => nd.literal.map(Json::Bool),
                "v" => nd.v.as_deref().map(s),
                "form" => nd.form.as_deref().map(s),
                "role" => nd.role.as_deref().map(s),
                "text" => nd.text.map(Json::Bool),
                "rawFence" => nd.raw_fence.map(Json::Bool),
                "template" => nd.template.as_deref().map(s),
                "isDef" => nd.is_def.map(Json::Bool),
                "mode" => nd.mode.as_deref().map(s),
                "isDefinition" => nd.is_definition.map(Json::Bool),
                "expanded" => nd.expanded.map(Json::Bool),
                "boundSlot" => nd.bound_slot.as_deref().map(s),
                _ => unreachable!(),
            };
            if let Some(v) = v {
                kv.push((f.to_string(), v));
            }
        }
        if let Some(l) = &nd.logic {
            kv.push(("logic".into(), s(l)));
        }
        if !nd.emotions.is_empty() {
            kv.push(("emotions".into(), Json::Arr(nd.emotions.iter().map(|e| Json::Obj(vec![
                ("name".into(), s(&e.name)), ("gloss".into(), s(&e.gloss)), ("order".into(), num(e.order))])).collect())));
        }
        if let Some(t) = &nd.tok {
            kv.push(("tok".into(), Json::Obj(vec![("k".into(), s(&t.k)), ("s".into(), num(t.s)), ("e".into(), num(t.e))])));
        }
        kv.push(("children".into(), Json::Arr(nd.children.iter().map(|c| num(at[c])).collect())));
        kv.push(("parent".into(), nd.parent.map_or(Json::Null, |p| at.get(&p).map_or(Json::Num(-1.0), |&i| num(i)))));
        Json::Obj(kv)
    }).collect();
    let segments = tree.segments.iter().map(|sg| Json::Arr(sg.children.iter().map(|c| num(at[c])).collect())).collect();
    Json::Obj(vec![("nodes".into(), Json::Arr(nodes)), ("segments".into(), Json::Arr(segments))])
}

/// A diagnostic as the export records what a pass raised: the pt-BR pair,
/// the code, and the English pair or null.
pub fn diag_json(d: &Diag) -> Json {
    let s = |v: &str| Json::Str(v.to_string());
    let or_null = |v: &Option<String>| v.as_deref().map_or(Json::Null, s);
    Json::Obj(vec![("sev".into(), s(&d.sev)), ("lab".into(), s(&d.lab)), ("msg".into(), s(&d.msg)),
                   ("code".into(), s(&d.code)), ("enLab".into(), or_null(&d.en_lab)), ("enMsg".into(), or_null(&d.en_msg))])
}

/// A diagnostic of a body's parse, as the export records it: the JS hands the
/// expander `{ sev, lab, msg, code }`.
pub fn diag_of(v: &Json) -> Diag {
    Diag::new(v.s("sev"), v.s("lab"), v.s("msg").to_string(), v.s("code"))
}
