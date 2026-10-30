//! EMS-001 ORD-0009: the burn against the oracle — for each of the 114 case
//! files, `toHGML` equals the case file's `hgml` and its SHA-256 the digest
//! `corpus-snapshot.json` records; and all of `hgml.json`: the burn over the
//! runs `parse.json` reads, and for the probes with the prose kept.

#[path = "../../../testkit/oracle.rs"]
mod oracle;

use glyph_burn::{to_hgml, BurnOpts};
use glyph_parse::Opts;
use glyph_stores::Context;
use glyph_json::Json;
use glyph_util::tree::Thrown;
use oracle::{cases, module, sha256, snapshot_digest, Must};
use std::sync::Arc;

fn value(j: &Json) -> Json {
    match j {
        Json::Null => Json::Null,
        Json::Bool(b) => Json::Bool(*b),
        Json::Num(n) => Json::Num(*n),
        Json::Str(s) => Json::Str(s.clone()),
        Json::Arr(a) => Json::Arr(a.iter().map(value).collect()),
        Json::Obj(kv) => Json::Obj(kv.iter().map(|(k, v)| (k.clone(), value(v))).collect()),
    }
}

/// The stores of a run, as `parse.json`'s test reads them.
fn context(run: &Json) -> Context {
    let repo = Context::repository();
    let mut map = match &*repo.templates {
        Json::Obj(kv) => kv.clone(),
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
    let expansions = run.get("expansions").map_or(repo.expansions.clone(), |e| Some(Arc::new(value(e))));
    // a case's own templates, whole (O5, EMS-002 ORD-0011)
    if let Some(own) = run.get("templates") {
        return Context::shared(Some(Arc::new(own.clone())), rules, expansions);
    }
    Context::shared(Some(Arc::new(Json::Obj(map))), rules, expansions)
}

#[test]
fn the_hgml_digest_of_every_case_equals_the_snapshot() {
    let repo = Context::repository();
    for case in cases() {
        let id = case.s("id");
        let ctx = repo.with(case.get("stores").unwrap_or(&Json::Null));
        let o = Opts::new(&ctx);
        let got = to_hgml(case.s("src"), &BurnOpts { parse: &o, keep_text: false }).unwrap_or_else(|e| panic!("{id}: {e:?}"));
        let got = oracle::known::semicolons(&got);
        assert_eq!(got, case.s("hgml"), "{id}: the burn");
        assert_eq!(&sha256(got.as_bytes())[..16], snapshot_digest(id, "hgml"), "{id}: the hgml digest");
    }
    println!("{} cases", cases().len());
}

#[test]
fn every_burn_equals_the_js() {
    let runs = module("hgml").a("runs");
    assert!(runs.len() > 114, "hgml.json holds {} runs — write it again: {}", runs.len(), oracle::WRITE_IT);
    let (mut n, mut thrown, mut undone, mut moods) = (0, 0, 0, 0);
    for run in runs {
        let (id, src) = (run.s("id"), run.s("src"));
        let ctx = context(run);
        let o = Opts { ctx: &ctx, session: run.get("session") != Some(&Json::Bool(false)),
                       valency: run.get("valency") != Some(&Json::Bool(false)), en: false, expanding: Vec::new(), registered: glyph_stores::Registered::none(),
                       inherited: &[] };
        for (k, keep_text) in [("hgml", false), ("keepText", true)] {
            let Some(want) = run.get(k) else { continue };
            let got = to_hgml(src, &BurnOpts { parse: &o, keep_text });
            match want {
                Json::Str(w) => {
                    let got = got.unwrap_or_else(|e| panic!("{id} {k}: {e:?}"));
                    let back = oracle::known::semicolons(&got);
                    undone += usize::from(back != got);
                    assert_eq!(back, *w, "{id} {k}: the burn");
                }
                w => match oracle::known::template_mood(src, "hgml", k) {
                    /* the JS throws, and the Rust answers the document (2026-10-25) */
                    Some(decided) => {
                        assert_eq!(w.s("thrown"), oracle::known::template_mood_js(), "{id} {k}: the JS throws something else");
                        assert_eq!(got.unwrap_or_else(|e| panic!("{id} {k}: the port throws a named source: {e:?}")), decided.str().expect("the burn"), "{id} {k}: the burn");
                        moods += 1;
                    }
                    None => {
                        assert_eq!(got.err(), Some(Thrown(w.s("thrown").to_string())), "{id} {k}: what toHGML throws");
                        thrown += 1;
                    }
                },
            }
            n += 1;
        }
    }
    /* the known difference is reached, so the undo is not undoing nothing */
    assert!(undone > 0, "no burn in hgml.json writes `;;` between two blocks");
    assert_eq!(moods, 2 * oracle::known::template_mood_sources(), "a source named for the template mood is not in hgml.json");
    println!("{} runs, {n} burns, {thrown} throws, {undone} with `;;` between blocks (O4)", runs.len());
}
