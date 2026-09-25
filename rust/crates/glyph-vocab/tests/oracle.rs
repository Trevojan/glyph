//! EMS-001 ORD-0003: the digest of every generated table equals the JS's. Each
//! table `vocabulary.js` exports is in `rust/target/oracle-modules/vocabulary.json`
//! as its `JSON.stringify` text and its `ck`; the port answers with its own.

#[path = "../../../testkit/oracle.rs"]
mod oracle;

use glyph_util::json::{self, Json};
use glyph_vocab::*;
use oracle::Must;
use std::collections::BTreeSet;

fn s(v: &str) -> Json {
    Json::Str(v.to_string())
}
fn obj(rows: impl IntoIterator<Item = (String, Json)>) -> Json {
    let mut kv = Vec::new();
    rows.into_iter().for_each(|(k, v)| json::set(&mut kv, k, v));
    Json::Obj(kv)
}
fn strings(t: &[(&str, &str)]) -> Json {
    obj(t.iter().map(|(k, v)| (k.to_string(), s(v))))
}
fn numbers(t: &[(&str, f64)]) -> Json {
    obj(t.iter().map(|(k, v)| (k.to_string(), Json::Num(*v))))
}
fn pairs(t: &[(&str, &str)]) -> Json {
    Json::Arr(t.iter().map(|(a, b)| Json::Arr(vec![s(a), s(b)])).collect())
}
fn lists(t: &[(&str, &[&str])]) -> Json {
    obj(t.iter().map(|(k, v)| (k.to_string(), Json::Arr(v.iter().map(|x| s(x)).collect()))))
}
fn named(t: &[(String, Named)]) -> Json {
    obj(t.iter().map(|(k, n)| (k.clone(), obj([("canonical".into(), s(n.canonical)), ("tier".into(), s(n.tier))]))))
}
fn collisions(t: &[Collision], key: &str) -> Json {
    Json::Arr(t.iter().map(|c| obj([(key.into(), s(&c.key)), ("kept".into(), s(c.kept)), ("dropped".into(), s(c.dropped))])).collect())
}

/// Every table of the port, under the name the JS exports it by.
fn tables() -> Vec<(&'static str, Json)> {
    let d = derived();
    vec![
        ("CATS", Json::Arr(CATS.iter().map(|c| obj([
            ("id".into(), s(c.id)), ("label".into(), s(c.label)), ("note".into(), s(c.note)),
            ("items".into(), pairs(c.items))])).collect())),
        ("INSTR", strings(INSTR)), ("ALIAS", strings(ALIAS)), ("STRUCT", strings(STRUCT)),
        ("META", strings(META)), ("MODE", strings(MODE)), ("EMO", strings(EMO)), ("SESSION", strings(SESSION)),
        ("EDITORIAL_ONLY", numbers(EDITORIAL_ONLY)), ("NAMED_STRUCT", numbers(NAMED_STRUCT)),
        ("LOGIC_OPS", pairs(LOGIC_OPS)), ("PUNCT", pairs(PUNCT)), ("FRAMES", lists(FRAMES)), ("SLOTS", lists(SLOTS)),
        ("PTBR", strings(&d.ptbr)), ("CAT_OF", strings(&d.cat_of)),
        ("ALIAS_OF", obj(d.alias_of.iter().map(|(k, v)| (k.to_string(), Json::Arr(v.iter().map(|a| s(a)).collect()))))),
        ("GLOSS_REVERSE", named(&d.gloss_reverse)), ("GLOSS_COLLISIONS", collisions(&d.gloss_collisions, "element")),
        ("ELEMENT_INPUT", named(&d.element_input)),
        ("ELEMENT_INPUT_COLLISIONS", collisions(&d.element_input_collisions, "spelling")),
        ("EMO_REVERSE", obj(d.emo_reverse.iter().map(|(k, v)| (k.clone(), s(v))))),
    ]
}

#[test]
fn every_table_equals_the_js_table() {
    let js = oracle::module("vocabulary").get("tables").and_then(Json::obj).expect("vocabulary.json: no tables");
    let mine = tables();
    let (theirs, ours): (BTreeSet<&str>, BTreeSet<&str>) = (js.iter().map(|(k, _)| k.as_str()).collect(), mine.iter().map(|(k, _)| *k).collect());
    assert!(theirs == ours, "vocabulary.js exports {theirs:?}; the port has {ours:?}");
    for (name, table) in &mine {
        let js = &js.iter().find(|(k, _)| k == name).unwrap().1;
        let text = json::stringify(table);
        let at = text.bytes().zip(js.s("json").bytes()).take_while(|(a, b)| a == b).count();
        assert_eq!(oracle::ck(&text), js.s("digest"), "{name}: differs from the JS at byte {at}: {:?}",
                   &text[at.saturating_sub(40)..(at + 40).min(text.len())]);
        assert_eq!(text, js.s("json"), "{name}");
    }
}

#[test]
fn el_name_equals_the_js() {
    let calls = oracle::module("vocabulary").a("elName");
    assert!(!calls.is_empty(), "vocabulary.json: no elName calls");
    for c in calls {
        let c = c.arr().unwrap();
        let (k, tier, gloss, want) = (c[0].str().unwrap(), c[1].str().unwrap(), c[2].str(), c[3].str().unwrap());
        assert_eq!(el_name(k, tier, gloss), want, "elName({k:?}, {tier:?}, {gloss:?})");
    }
}

#[test]
fn the_testkit_ck_is_the_envelopes() {
    let mut held = 0;
    for case in oracle::cases() {
        if let Some(sum) = case.get("ast").and_then(|a| a.get("source")).and_then(|s| s.get("checksum")).and_then(Json::str) {
            assert_eq!(oracle::ck(case.s("src")), sum, "{}", case.s("id"));
            held += 1;
        }
    }
    assert!(held > 0, "no envelope carries a source checksum");
}
