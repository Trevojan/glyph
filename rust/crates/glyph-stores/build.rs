//! The three stores, made at build time from the four sources
//! `build-templates.js` reads: `templates.json` and `rules.json` as they are,
//! and the composition store compiled from `expansions.txt` and `GLOSSARY.md`
//! the way `build-templates.js` compiles it (with `read-expansions.js`), gates
//! included. Two fields of that store are `build-templates.js`'s own words
//! about its output, `schema` and `note`; they are read from that output,
//! `expansions.json`, rather than typed a second time.
//!
//! Each store is written as Rust that builds a `Value`, the shape of a JS
//! object, in the JS's property order.

use glyph_util::json::{self, Json};
use std::{env, fmt::Write as _, fs, path::Path};

#[path = "build/compose.rs"]
mod compose;
use compose::*;

/* ---------------------------------------------------------------- *
 * build-templates.js: buildExpansions, and the store it writes
 * ---------------------------------------------------------------- */

fn composition(txt: &str, glossary: &str, generated: &Json) -> Json {
    let p = read(txt);
    let depth = layers(&p);
    let g = read_glossary(glossary);
    let depth_of = |n: &str| depth.iter().find(|(k, _)| k == n).map(|(_, d)| *d);

    let mut commands: Vec<(String, Json)> = Vec::new();
    for a in &p.atoms {
        json::set(&mut commands, a.clone(), Json::Obj(vec![
            ("species".into(), Json::Str("atom".into())), ("depth".into(), Json::Num(0.0))]));
    }
    for (c, (formula, deps)) in &p.composites {
        json::set(&mut commands, c.clone(), Json::Obj(vec![
            ("species".into(), Json::Str("composite".into())),
            ("formula".into(), Json::Str(formula.clone())),
            ("deps".into(), Json::Arr(deps.iter().map(|d| Json::Str(d.clone())).collect())),
            ("depth".into(), depth_of(c).map_or(Json::Null, |d| Json::Num(d as f64)))]));
    }
    let names: Vec<String> = commands.iter().map(|(k, _)| k.clone()).collect();

    let no_def: Vec<&String> = names.iter().filter(|c| !g.defs.iter().any(|(k, d)| k == *c && !d.is_empty())).collect();
    for (c, entry) in commands.iter_mut() {
        if let (Some((_, d)), Json::Obj(kv)) = (g.defs.iter().find(|(k, d)| k == c && !d.is_empty()), entry) {
            json::set(kv, "def".into(), Json::Str(d.clone()));
        }
    }
    let disagree: Vec<&String> = g.spelled.iter().filter(|(c, f)| {
        commands.iter().find(|(k, _)| k == c)
            .and_then(|(_, e)| e.get("formula")).and_then(Json::str)
            .is_some_and(|t| !t.is_empty() && t.chars().filter(|ch| !js_space(*ch)).collect::<String>() != *f)
    }).map(|(c, _)| c).collect();
    assert!(disagree.is_empty(), "formulas spelled one way in GLOSSARY.md and another in expansions.txt: {disagree:?}");

    /* `element`: the name the command wears in the emitted document, read off
       the vocabulary's reverse map, the last element naming a canonical winning */
    let mut to_element: Vec<(&str, &str)> = Vec::new();
    for (el, named) in &glyph_vocab::derived().gloss_reverse {
        match to_element.iter_mut().find(|(k, _)| *k == named.canonical) {
            Some(slot) => slot.1 = el,
            None => to_element.push((named.canonical, el)),
        }
    }
    for (c, entry) in commands.iter_mut() {
        if let (Some((_, el)), Json::Obj(kv)) = (to_element.iter().find(|(k, _)| k == c), entry) {
            json::set(kv, "element".into(), Json::Str(el.to_string()));
        }
    }
    assert!(no_def.is_empty(), "commands with no entry in GLOSSARY.md: {no_def:?}");

    let max_depth = depth.iter().map(|(_, d)| *d).max().map_or(Json::Null, |d| Json::Num(d as f64));
    Json::Obj(vec![
        ("schema".into(), generated.get("schema").cloned().expect("expansions.json: no schema")),
        ("note".into(), generated.get("note").cloned().expect("expansions.json: no note")),
        ("atoms".into(), Json::Num(p.atoms.len() as f64)),
        ("composites".into(), Json::Num(p.composites.len() as f64)),
        ("maxDepth".into(), max_depth),
        ("commands".into(), Json::Obj(commands)),
    ])
}

/* ---------------------------------------------------------------- *
 * the stores as Rust
 * ---------------------------------------------------------------- */

fn rust(v: &Json, out: &mut String) {
    match v {
        Json::Null => out.push_str("Value::Null"),
        Json::Bool(b) => write!(out, "Value::Bool({b})").unwrap(),
        Json::Num(n) => write!(out, "Value::Num({n:?})").unwrap(),
        Json::Str(s) => write!(out, "Value::Str(String::from({s:?}))").unwrap(),
        Json::Arr(a) => {
            out.push_str("Value::Arr(vec![");
            for x in a {
                rust(x, out);
                out.push(',');
            }
            out.push_str("])");
        }
        Json::Obj(kv) => {
            out.push_str("Value::Obj(vec![");
            for (k, x) in kv {
                write!(out, "(String::from({k:?}),").unwrap();
                rust(x, out);
                out.push_str("),");
            }
            out.push_str("])");
        }
    }
}

fn main() {
    let guide = Path::new(&env::var("CARGO_MANIFEST_DIR").unwrap()).join("../../../.guidelines");
    let read = |name: &str| {
        let f = guide.join(name);
        println!("cargo:rerun-if-changed={}", f.display());
        fs::read_to_string(&f).unwrap_or_else(|e| panic!("{}: {e}", f.display()))
    };
    let parse = |name: &str| json::parse(&read(name)).unwrap_or_else(|e| panic!("{name}: {e}"));

    let templates = parse("templates.json");
    let rules = parse("rules.json");
    let expansions = composition(&read("expansions.txt"), &read("GLOSSARY.md"), &parse("expansions.json"));

    let mut out = String::from("// GENERATED by build.rs from templates.json, rules.json, expansions.txt and GLOSSARY.md.\n\n");
    for (name, v) in [("templates_json", &templates), ("rules_json", &rules), ("expansions_store", &expansions)] {
        write!(out, "fn {name}() -> Value {{ ").unwrap();
        rust(v, &mut out);
        out.push_str(" }\n");
    }
    let dir = env::var("OUT_DIR").unwrap();
    fs::write(Path::new(&dir).join("stores.rs"), out).unwrap();
    /* the store as build-templates.js writes it, for the test that compares */
    fs::write(Path::new(&dir).join("expansions.json"), json::stringify_indent(&expansions, "  ") + "\n").unwrap();
}
