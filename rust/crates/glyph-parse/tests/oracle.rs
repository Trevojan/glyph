//! EMS-001 ORD-0007: `parse` against `parse.json` — each of the 114 sources,
//! parsed as the snapshot parses it, and probes one or more per branch of
//! parse(), some without the session words or without valency. The tree, with
//! every field a projection reads and the segments' own, equals the JS's; the
//! diagnostics equal the JS's in pt-BR and in en-EU, in order, with `at` and
//! the stripped text; where the JS throws, the port stops with its message.

#[path = "../../../testkit/oracle.rs"]
mod oracle;

use glyph_parse::*;
use glyph_stores::{Context, Value};
use glyph_util::json::Json;
use glyph_util::tree::Thrown;
use oracle::{dump_of, module, Must};

fn gap_json(g: &Gap) -> Json {
    let s = |v: &str| Json::Str(v.to_string());
    Json::Obj(vec![("sev".into(), s(&g.sev)), ("lab".into(), s(&g.lab)), ("msg".into(), s(&g.msg)), ("code".into(), s(&g.code)),
                   ("at".into(), g.at.map_or(Json::Null, |(a, b)| Json::Obj(vec![("s".into(), Json::Num(a as f64)),
                                                                                  ("e".into(), Json::Num(b as f64))]))),
                   ("plain".into(), s(&g.plain))])
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

/// The stores of a run: the repository's, with the probe templates of
/// `trees.json` over its templates (`{ ...TPL.templates, ...PROBE_TEMPLATES }`)
/// and without the rules or with a composition store of its own where the run
/// says so.
fn context(run: &Json) -> Context {
    let repo = Context::repository();
    let mut map = match &repo.templates {
        Value::Obj(kv) => kv.clone(),
        v => panic!("the repository's templates are not a map: {v:?}"),
    };
    if run.get("probeTemplates") == Some(&Json::Bool(true)) {
        for (k, v) in module("trees").get("probeTemplates").and_then(Json::obj).expect("the probe templates") {
            match map.iter_mut().find(|(x, _)| x == k) {
                Some(slot) => slot.1 = value(v),
                None => map.push((k.clone(), value(v))),
            }
        }
    }
    let rules = if run.get("withRules") == Some(&Json::Bool(false)) { None } else { repo.rules.clone() };
    let expansions = run.get("expansions").map_or(repo.expansions.clone(), |e| Some(value(e)));
    Context::new(Some(Value::Obj(map)), rules, expansions)
}

#[test]
fn every_tree_and_diagnostic_equals_the_js() {
    let runs = module("parse").a("runs");
    assert!(runs.len() > 114, "parse.json holds {} runs — write it again: {}", runs.len(), oracle::WRITE_IT);
    let (mut nodes, mut gaps, mut thrown) = (0, 0, 0);
    for run in runs {
        let ctx = context(run);
        let (id, src) = (run.s("id"), run.s("src"));
        let session = run.get("session") != Some(&Json::Bool(false));
        let valency = run.get("valency") != Some(&Json::Bool(false));
        for (lang, en) in [("pt", false), ("en", true)] {
            let want = run.get(lang).unwrap_or_else(|| panic!("{id}: no {lang}"));
            let got = parse(src, &Opts { ctx: &ctx, session, valency, en, expanding: Vec::new() });
            if let Some(t) = want.get("thrown") {
                assert_eq!(got.err(), Some(Thrown(t.str().expect("a message").to_string())), "{id} {lang}: what parse throws");
                thrown += 1;
                continue;
            }
            let p = got.unwrap_or_else(|e| panic!("{id} {lang}: the JS does not throw, the port does: {e:?}"));
            if !en {
                assert_eq!(dump_of(&p.tree, true), *run.get("tree").expect("tree"), "{id}: the tree");
                nodes += run.get("tree").map_or(0, |t| t.a("nodes").len());
            }
            assert_eq!(Json::Arr(p.gaps.iter().map(gap_json).collect()), *want, "{id} {lang}: the diagnostics");
            gaps += p.gaps.len();
        }
    }
    println!("{} runs, {nodes} nodes, {gaps} diagnostics in both languages, {thrown} throws", runs.len());
}
