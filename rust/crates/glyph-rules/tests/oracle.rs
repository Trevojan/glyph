//! EMS-001 ORD-0006: `check_rules` against `trees.json` — every tree the JS
//! parser has once templates are expanded, for the 114 sources and the probes,
//! checked here against the repository's rules. Every diagnostic, in the order
//! raised, equals the JS's; where the JS throws, the port stops with the same
//! message, after raising what the JS raised before it.

#[path = "../../../testkit/oracle.rs"]
mod oracle;

use glyph_rules::*;
use glyph_stores::{Context, Value};
use glyph_util::json::Json;
use glyph_util::tree::Thrown;
use oracle::{diag_json, module, tree_of, Must};

#[test]
fn every_rule_diagnostic_equals_the_js() {
    let runs = module("trees").a("runs");
    assert!(runs.len() > 114, "trees.json holds {} runs — write it again: {}", runs.len(), oracle::WRITE_IT);
    let repo = Context::repository();
    let (mut checked, mut raised) = (0, 0);
    for run in runs {
        let id = run.s("id");
        let Some(want) = run.get("rules") else { continue };
        let with_rules = run.get("withRules") == Some(&Json::Bool(true));
        let ctx = Context::new(None, if with_rules { repo.rules.clone() } else { None }, None);
        let tree = tree_of(run.get("after").expect("after"));
        let mut got = Vec::new();
        let result = check_rules(&tree, &ctx, &mut |d| got.push(diag_json(&d)));
        let thrown = run.get("thrown").filter(|t| t.s("stage") == "rules").map(|t| Thrown(t.s("message").to_string()));
        assert_eq!(result.err(), thrown, "{id}: what the rules throw");
        assert_eq!(Json::Arr(got), *want, "{id}: what the rules raise");
        checked += 1;
        raised += want.arr().expect("a list").len();
    }
    println!("{checked} trees, {raised} diagnostics");
}

fn value(j: &Json) -> Value {
    match j {
        Json::Null => Value::Null,
        Json::Bool(b) => Value::Bool(*b),
        Json::Num(n) => Value::Num(*n),
        Json::Str(s) => Value::Str(s.clone()),
        Json::Arr(a) => Value::Arr(a.iter().map(value).collect()),
        Json::Obj(kv) => Value::Obj(kv.iter().map(|(k, v)| (k.clone(), value(v))).collect()),
    }
}

/// `compileRules`, as the export describes it: each part by its rule's id.
fn described(c: &Compiled) -> Json {
    let s = |v: &str| Json::Str(v.to_string());
    let id = |r: &Value| s(r.get("id").and_then(Value::str).expect("a rule's id"));
    let strs = |v: &[String]| Json::Arr(v.iter().map(|x| s(x)).collect());
    Json::Obj(vec![
        ("pairs".into(), Json::Arr(c.pairs.iter().map(|(k, r)| Json::Arr(vec![s(k), id(r)])).collect())),
        ("order".into(), Json::Arr(c.order.iter().map(|o| Json::Arr(vec![id(o.rule), s(&o.first), strs(&o.then)])).collect())),
        ("pre".into(), Json::Arr(c.pre.iter().map(|p| Json::Arr(vec![id(p.rule), s(&p.target), strs(&p.accept)])).collect())),
        ("blends".into(), Json::Arr(c.blends.iter()
            .map(|b| Json::Arr(vec![id(b.rule), strs(&b.when), s(&b.emit), s(&b.means)])).collect())),
    ])
}

#[test]
fn compile_rules_equals_the_js() {
    let trees = module("trees");
    let want = trees.get("compileRules").expect("compileRules in trees.json");
    let repo = Context::repository().rules.clone().expect("the repository's rules");
    assert_eq!(described(&compile_rules(&repo)), *want.get("repository").expect("repository"), "the repository's store");
    let probe = value(trees.get("probeRules").expect("probeRules"));
    assert_eq!(described(&compile_rules(&probe)), *want.get("probe").expect("probe"), "the probe store");
}

#[test]
fn the_pair_key_orders_by_utf16_units() {
    assert_eq!(pair_key("OPT", "MAND"), "MAND|OPT");
    /* U+10000 sorts after U+FF21 by code point, and before it by UTF-16 unit:
       its first unit is D800. What node answers: */
    assert_eq!(pair_key("\u{10000}", "\u{ff21}"), "\u{10000}|\u{ff21}");
    assert_eq!(pair_key("\u{ff21}", "\u{10000}"), "\u{10000}|\u{ff21}");
}
