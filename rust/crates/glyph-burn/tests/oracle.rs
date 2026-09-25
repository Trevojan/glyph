//! EMS-001 ORD-0009: the burn against the oracle — for each of the 114 case
//! files, `toHGML` equals the case file's `hgml` and its SHA-256 the digest
//! `corpus-snapshot.json` records; and all of `hgml.json`: the burn over the
//! runs `parse.json` reads, and for the probes with the prose kept.

#[path = "../../../testkit/oracle.rs"]
mod oracle;

use glyph_burn::{to_hgml, BurnOpts};
use glyph_parse::Opts;
use glyph_stores::{Context, Value};
use glyph_util::json::Json;
use glyph_util::tree::Thrown;
use oracle::{cases, module, sha256, snapshot_digest, Must};

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

/// The stores of a run, as `parse.json`'s test reads them.
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
fn the_hgml_digest_of_every_case_equals_the_snapshot() {
    let repo = Context::repository();
    for case in cases() {
        let id = case.s("id");
        let o = Opts::new(repo);
        let got = to_hgml(case.s("src"), &BurnOpts { parse: &o, keep_text: false }).unwrap_or_else(|e| panic!("{id}: {e:?}"));
        assert_eq!(got, case.s("hgml"), "{id}: the burn");
        assert_eq!(&sha256(got.as_bytes())[..16], snapshot_digest(id, "hgml"), "{id}: the hgml digest");
    }
    println!("{} cases", cases().len());
}

#[test]
fn every_burn_equals_the_js() {
    let runs = module("hgml").a("runs");
    assert!(runs.len() > 114, "hgml.json holds {} runs — write it again: {}", runs.len(), oracle::WRITE_IT);
    let (mut n, mut thrown) = (0, 0);
    for run in runs {
        let (id, src) = (run.s("id"), run.s("src"));
        let ctx = context(run);
        let o = Opts { ctx: &ctx, session: run.get("session") != Some(&Json::Bool(false)),
                       valency: run.get("valency") != Some(&Json::Bool(false)), en: false, expanding: Vec::new() };
        for (k, keep_text) in [("hgml", false), ("keepText", true)] {
            let Some(want) = run.get(k) else { continue };
            let got = to_hgml(src, &BurnOpts { parse: &o, keep_text });
            match want {
                Json::Str(w) => assert_eq!(got.unwrap_or_else(|e| panic!("{id} {k}: {e:?}")), *w, "{id} {k}: the burn"),
                w => {
                    assert_eq!(got.err(), Some(Thrown(w.s("thrown").to_string())), "{id} {k}: what toHGML throws");
                    thrown += 1;
                }
            }
            n += 1;
        }
    }
    println!("{} runs, {n} burns, {thrown} throws", runs.len());
}
