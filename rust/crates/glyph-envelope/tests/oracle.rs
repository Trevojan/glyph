//! EMS-001 ORD-0009: the AST envelope against the oracle — for each of the
//! 114 case files, `toAST` as the snapshot takes it (en-EU, the engine's
//! stamp left out) equals the case file's `ast`, and its SHA-256 the digest
//! `corpus-snapshot.json` records; and all of `ast.json`: the envelope over
//! the runs `parse.json` reads, and for the probes the panel projection,
//! pt-BR, and a source carried with its uri.

#[path = "../../../testkit/oracle.rs"]
mod oracle;

use glyph_envelope::{to_ast, AstOpts};
use glyph_parse::Opts;
use glyph_stores::Context;
use glyph_json::{stringify, Json};
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

fn without_version(j: Json) -> Json {
    match j {
        Json::Obj(kv) => Json::Obj(kv.into_iter().filter(|(k, _)| k != "version").collect()),
        j => j,
    }
}

#[test]
fn sha256_is_fips_180_4() {
    assert_eq!(sha256(b"abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    assert_eq!(sha256(b""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
}

#[test]
fn the_ast_digest_of_every_case_equals_the_snapshot() {
    let repo = Context::repository();
    for case in cases() {
        let id = case.s("id");
        let ctx = repo.with(case.get("stores").unwrap_or(&Json::Null));
        let o = Opts { en: true, ..Opts::new(&ctx) };
        let env = without_version(to_ast(case.s("src"), &o, &AstOpts::default()).unwrap_or_else(|e| panic!("{id}: {e:?}")));
        assert_eq!(env, *case.get("ast").expect("ast"), "{id}: the envelope");
        assert_eq!(&sha256(stringify(&env).as_bytes())[..16], snapshot_digest(id, "ast"), "{id}: the ast digest");
    }
    println!("{} cases", cases().len());
}

#[test]
fn every_envelope_equals_the_js() {
    let runs = module("ast").a("runs");
    assert!(runs.len() > 114, "ast.json holds {} runs — write it again: {}", runs.len(), oracle::WRITE_IT);
    let (mut n, mut thrown, mut named, mut moods) = (0, 0, 0, 0);
    for run in runs {
        let (id, src) = (run.s("id"), run.s("src"));
        let ctx = context(run);
        let session = run.get("session") != Some(&Json::Bool(false));
        let valency = run.get("valency") != Some(&Json::Bool(false));
        for (k, en, a) in [
            ("full", true, AstOpts::default()),
            ("panel", true, AstOpts { panel: true, ..AstOpts::default() }),
            ("pt", false, AstOpts::default()),
            ("embed", true, AstOpts { uri: Some("file:///x.pgml".into()), embed_source: true, panel: false }),
        ] {
            let Some(want) = run.get(k) else { continue };
            let o = Opts { ctx: &ctx, session, valency, en, expanding: Vec::new(), registered: glyph_stores::Registered::none(), inherited: &[] };
            let got = to_ast(src, &o, &a);
            match want.get("thrown") {
                Some(t) => match oracle::known::template_mood(src, "ast", k) {
                    /* the JS throws, and the Rust answers the document (2026-10-25) */
                    Some(decided) => {
                        assert_eq!(t.str(), Some(oracle::known::template_mood_js()), "{id} {k}: the JS throws something else");
                        assert_eq!(got.unwrap_or_else(|e| panic!("{id} {k}: the port throws a named source: {e:?}")), decided, "{id} {k}: the envelope");
                        moods += 1;
                    }
                    None => {
                        assert_eq!(got.err(), Some(Thrown(t.str().expect("a message").to_string())), "{id} {k}: what toAST throws");
                        thrown += 1;
                    }
                },
                None => {
                    /* a probe O4's third residual reaches carries the diagnostics
                       the decision gives it, and the JS's envelope must differ */
                    let want = match oracle::known::bare_envelope(src, if en { "en" } else { "pt" }, want) {
                        Some(decided) => {
                            assert_ne!(decided, *want, "{id} {k}: named as a known difference, and the JS already answers it");
                            named += 1;
                            decided
                        }
                        None => want.clone(),
                    };
                    assert_eq!(got.unwrap_or_else(|e| panic!("{id} {k}: {e:?}")), want, "{id} {k}: the envelope");
                }
            }
            n += 1;
        }
    }
    assert!(named > 0, "no envelope in ast.json reaches O4's third residual");
    assert_eq!(moods, 4 * oracle::known::template_mood_sources(), "a source named for the template mood is not in ast.json");
    println!("{} runs, {n} envelopes, {thrown} throws, {named} named for O4", runs.len());
}
