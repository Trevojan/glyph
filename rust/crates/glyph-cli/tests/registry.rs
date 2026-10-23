//! EMS-002 ORD-0008: a template's body reads what the caller registered.
//!
//! `registry.json` holds what the JS answers for each probe twice: with
//! nothing registered, the state the suite writes every other file in, and
//! with the repository's stores registered, as the CLI and the engine run.
//! The Rust answers both from the same context, the registry beside it.

#[path = "../../../testkit/oracle.rs"]
mod oracle;

use glyph_burn::{to_hgml, BurnOpts};
use glyph_parse::{parse, Opts};
use glyph_stores::{Context, Registered};
use glyph_xml::to_xml;
use oracle::{module, Json, Must};

fn gaps(src: &str, o: &Opts) -> Json {
    match parse(src, o) {
        Ok(p) => Json::Arr(p.gaps.into_iter().map(|g| Json::Obj(vec![
            ("sev".into(), Json::Str(g.sev)), ("code".into(), Json::Str(g.code)), ("plain".into(), Json::Str(g.plain))])).collect()),
        Err(t) => Json::Obj(vec![("thrown".into(), Json::Str(t.0))]),
    }
}

fn guarded(r: Result<String, glyph_util::tree::Thrown>) -> Json {
    r.map_or_else(|t| Json::Obj(vec![("threw".into(), Json::Str(t.0))]), Json::Str)
}

fn answer(src: &str, ctx: &Context, registered: &Registered) -> Json {
    let pt = Opts { registered, ..Opts::new(ctx) };
    let en = Opts { en: true, registered, ..Opts::new(ctx) };
    Json::Obj(vec![
        ("pt".into(), gaps(src, &pt)),
        ("en".into(), gaps(src, &en)),
        ("xml".into(), guarded(to_xml(src, &pt, false))),
        ("hgml".into(), guarded(to_hgml(src, &BurnOpts { parse: &pt, keep_text: false }))),
    ])
}

#[test]
fn a_body_reads_what_the_caller_registered_as_the_js_body_does() {
    let r = module("registry");
    let repo = Context::repository();
    let mut templates = match &repo.templates {
        Json::Obj(kv) => kv.clone(),
        other => panic!("the repository's templates are not a map: {other:?}"),
    };
    for (k, v) in r.get("templates").and_then(Json::obj).expect("registry.json: no templates") {
        glyph_json::set(&mut templates, k.clone(), v.clone());
    }
    let ctx = Context::new(Some(Json::Obj(templates)), repo.rules.clone(), repo.expansions.clone());
    let sources = r.a("sources");
    let (none, registered) = (r.a("none"), r.a("registered"));
    assert!(sources.len() > 50 && sources.len() == none.len() && none.len() == registered.len(), "registry.json: the probes do not line up");
    let mut differ = 0;
    for (k, s) in sources.iter().enumerate() {
        let src = s.str().expect("a source is a string");
        assert_eq!(answer(src, &ctx, Registered::none()), none[k], "{src}: with nothing registered");
        assert_eq!(answer(src, &ctx, Registered::repository()), registered[k], "{src}: with the repository registered");
        differ += usize::from(none[k] != registered[k]);
    }
    assert!(differ >= 5, "registry.json: only {differ} probes read the registry; the oracle no longer tells the two apart");
}
