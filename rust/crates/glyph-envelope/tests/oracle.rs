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
use glyph_stores::{Context, Value};
use glyph_util::json::{stringify, Json};
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
        let o = Opts { en: true, ..Opts::new(repo) };
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
    let (mut n, mut thrown) = (0, 0);
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
            let o = Opts { ctx: &ctx, session, valency, en, expanding: Vec::new() };
            let got = to_ast(src, &o, &a);
            match want.get("thrown") {
                Some(t) => {
                    assert_eq!(got.err(), Some(Thrown(t.str().expect("a message").to_string())), "{id} {k}: what toAST throws");
                    thrown += 1;
                }
                None => assert_eq!(got.unwrap_or_else(|e| panic!("{id} {k}: {e:?}")), *want, "{id} {k}: the envelope"),
            }
            n += 1;
        }
    }
    println!("{} runs, {n} envelopes, {thrown} throws", runs.len());
}
