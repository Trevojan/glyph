//! EMS-001 ORD-0003: the digest of every generated table equals the JS store.
//! The JS answers are `rust/target/oracle-modules/stores.json` and the `stores`
//! digests every envelope of the oracle records.

#[path = "../../../testkit/oracle.rs"]
mod oracle;

use glyph_stores::*;
use glyph_json::{self as json, Json};
use oracle::Must;

fn to_json(v: &Json) -> Json {
    match v {
        Json::Null => Json::Null,
        Json::Bool(b) => Json::Bool(*b),
        Json::Num(n) => Json::Num(*n),
        Json::Str(s) => Json::Str(s.clone()),
        Json::Arr(a) => Json::Arr(a.iter().map(to_json).collect()),
        Json::Obj(kv) => {
            let mut o = Vec::new();
            kv.iter().for_each(|(k, v)| json::set(&mut o, k.clone(), to_json(v)));
            Json::Obj(o)
        }
    }
}
fn digest(v: &Json) -> String {
    oracle::ck(&json::stringify(&to_json(v)))
}
fn stores() -> &'static Json {
    oracle::module("stores")
}

#[test]
fn the_digest_of_every_generated_table_equals_the_js_store() {
    let repo = Context::repository();
    let js = stores().get("digests").expect("stores.json: no digests");
    let exp = repo.expansions.as_ref().expect("no composition store");
    let mine = [("templates", digest(&repo.templates)), ("rules", digest(repo.rules.as_ref().expect("no rules"))),
                ("expansions", digest(exp)), ("commands", digest(exp.get("commands").unwrap()))];
    for (name, d) in &mine {
        assert_eq!(d, js.s(name), "{name}");
    }
    /* and what every envelope of the oracle says it was read under — the
       templates and the composition store; the rules, below */
    for case in oracle::cases() {
        let Some(recorded) = case.get("ast").and_then(|a| a.get("stores")) else { continue };
        for (name, d) in [&mine[0], &mine[2]] {
            assert_eq!(d, recorded.s(name), "{}: stores.{name}", case.s("id"));
        }
    }
}

/* Inverted, with the reason. The JS hung its compiled rules on the rules store
   itself (`store.__compiled`, rules.js), enumerable, so the envelope's
   `stores.rules` was the digest of the store and the engine's cache together:
   9 921 bytes of rules.json became 18 258 hashed. Since EMS-002 ORD-0006 the
   JS keeps them beside the store, keyed by it, and every envelope hashes the
   store alone; a cache that comes back onto the store fails this. */
#[test]
fn the_envelope_hashes_the_rules_store_alone() {
    let store = digest(Context::repository().rules.as_ref().unwrap());
    let recorded: std::collections::BTreeSet<&str> = oracle::cases().iter()
        .filter_map(|c| c.get("ast").and_then(|a| a.get("stores")))
        .map(|s| s.s("rules")).collect();
    assert_eq!(recorded.len(), 1, "the envelopes disagree on the rules: {recorded:?}");
    assert!(recorded.contains(store.as_str()), "the envelope hashes something besides the rules store: {recorded:?} against {store}");
}

#[test]
fn the_composition_store_is_the_one_build_templates_writes() {
    let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../../../.guidelines/expansions.json");
    let written = std::fs::read_to_string(path).expect(path);
    let at = EXPANSIONS_JSON.bytes().zip(written.bytes()).take_while(|(a, b)| a == b).count();
    assert!(EXPANSIONS_JSON == written, "compiled from expansions.txt and GLOSSARY.md, it differs from expansions.json at byte {at}: {:?}",
            &EXPANSIONS_JSON[at.saturating_sub(60)..(at + 60).min(EXPANSIONS_JSON.len())]);
}

#[test]
fn a_context_reads_each_shape_as_create_context_does() {
    let js = stores().get("context").expect("stores.json: no context");
    let repo = Context::repository();
    let whole = Context::new(Some(templates_value(repo)), None, None);
    let map = Context::new(Some(repo.templates.clone()), None, None);
    let commands = Context::new(None, None, Some(repo.expansions.as_ref().unwrap().get("commands").unwrap().clone()));
    assert_eq!(digest(&whole.templates), js.s("templatesFromWhole"));
    assert_eq!(digest(&map.templates), js.s("templatesFromMap"));
    assert_eq!(digest(commands.expansions.as_ref().unwrap()), js.s("expansionsFromCommands"));
    let empty = Context::new(None, None, None);
    let got = Json::Arr(vec![to_json(&empty.templates), empty.rules.as_ref().map_or(Json::Null, to_json),
                             empty.expansions.as_ref().map_or(Json::Null, to_json)]);
    assert_eq!(&got, js.get("empty").unwrap());
}

/// `templates.json` whole: the map back under its key, with the file's other fields.
fn templates_value(repo: &Context) -> Json {
    Json::Obj(vec![("templates".into(), repo.templates.clone())])
}

#[test]
fn what_is_read_off_the_stores_equals_the_js() {
    let bare = Context::new(None, None, None);
    for (key, ctx) in [("loaded", Context::repository()), ("bare", &bare)] {
        let rows = stores().a(key);
        assert!(!rows.is_empty(), "stores.json: no {key} rows");
        for row in rows {
            let r = row.arr().unwrap();
            let n = r[0].str().unwrap();
            let got = [
                species_of(n, ctx).map_or(Json::Null, |s| Json::Str(s.into())),
                depth_of(n, ctx).map_or(Json::Null, Json::Num),
                formula_of(n, ctx).map_or(Json::Null, to_json),
                def_of(n, ctx).map_or(Json::Null, to_json),
                atoms_of(n, ctx).map_or(Json::Null, |a| Json::Arr(a.into_iter().map(Json::Str).collect())),
                Json::Bool(stands_alone(n, ctx)),
            ];
            for (i, (what, g)) in ["speciesOf", "depthOf", "formulaOf", "defOf", "atomsOf", "standsAlone"].iter().zip(&got).enumerate() {
                assert_eq!(g, &r[i + 1], "{key}: {what}({n:?})");
            }
        }
    }
}
