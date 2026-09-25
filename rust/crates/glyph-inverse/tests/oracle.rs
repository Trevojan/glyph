//! EMS-001 ORD-0009, the round trips: every `fromXML`, `fromAST` and `toHGML`
//! call the JS suite makes, recorded in `inverse.json` as the suite runs, is
//! made again here step by step — the input from the source the suite made
//! it from, the way back, and the XML of what came back — each step equal to
//! the JS's. Every round trip the suite runs is a comparison over those
//! steps, so each closes here where it closes there.

#[path = "../../../testkit/oracle.rs"]
mod oracle;

use glyph_burn::{to_hgml, BurnOpts};
use glyph_envelope::{to_ast, AstOpts};
use glyph_inverse::{from_ast, from_xml, Back, STACK_DEPTH};
use glyph_parse::{parse, Opts};
use glyph_stores::Context;
use glyph_util::json::Json;
use glyph_util::tree::Thrown;
use glyph_xml::to_xml;
use oracle::{module, Must};

/// The stores a recorded call named; `None` for a store of the suite's own.
fn context(flags: &Json) -> Option<Context> {
    let repo = Context::repository();
    let pick = |k: &str| flags.get(k).and_then(Json::str);
    if [pick("templates"), pick("rules"), pick("expansions")].contains(&Some("other")) {
        return None;
    }
    Some(Context::new(
        (pick("templates") == Some("repo")).then(|| repo.templates.clone()),
        if pick("rules") == Some("repo") { repo.rules.clone() } else { None },
        if pick("expansions") == Some("repo") { repo.expansions.clone() } else { None },
    ))
}
fn opts<'a>(ctx: &'a Context, flags: &Json) -> Opts<'a> {
    Opts { ctx, session: flags.get("session") != Some(&Json::Bool(false)), valency: flags.get("valency") != Some(&Json::Bool(false)),
           en: false, expanding: Vec::new() }
}
fn back_json(b: &Back) -> (Json, Json) {
    (Json::Str(b.src.clone()), Json::Arr(b.diag.iter().map(|d| Json::Obj(vec![
        ("sev".into(), Json::Str(d.sev.into())), ("code".into(), Json::Str(d.code.into())), ("msg".into(), Json::Str(d.msg.clone()))])).collect()))
}
fn reemit(src: &str) -> Json {
    match to_xml(src, &Opts::new(Context::repository()), false) {
        Ok(x) => Json::Str(x),
        Err(Thrown(m)) => Json::Obj(vec![("thrown".into(), Json::Str(m))]),
    }
}

#[test]
fn every_round_trip_the_suite_runs_equals_the_js() {
    let trips = module("inverse").a("trips");
    assert!(!trips.is_empty(), "inverse.json holds no call — write it: {}", oracle::WRITE_IT);
    let (mut made, mut back, mut burns, mut skipped) = (0, 0, 0, 0);
    for (n, t) in trips.iter().enumerate() {
        let fname = t.s("fn");
        match fname {
            "fromXML" | "fromAST" => {
                /* the input, made again from the source the suite made it from */
                if let Some(from) = t.get("from").filter(|f| **f != Json::Null) {
                    match context(from.get("opts").expect("opts")) {
                        None => skipped += 1,
                        Some(ctx) => {
                            let f = from.get("opts").expect("opts");
                            let mut o = opts(&ctx, f);
                            let src = from.s("src");
                            if fname == "fromXML" {
                                let x = to_xml(src, &o, false).unwrap_or_else(|e| panic!("#{n}: {e:?}"));
                                assert_eq!(Json::Str(x), *t.get("input").expect("input"), "#{n}: the XML the suite made");
                            } else {
                                o.en = f.get("lang").and_then(Json::str).is_none_or(|l| l == "en");
                                let a = AstOpts { panel: f.get("projection").and_then(Json::str) == Some("panel"), ..AstOpts::default() };
                                let env = to_ast(src, &o, &a).unwrap_or_else(|e| panic!("#{n}: {e:?}"));
                                assert_eq!(env, *t.get("input").expect("input"), "#{n}: the envelope the suite made");
                            }
                            made += 1;
                        }
                    }
                }
                let got = if fname == "fromXML" { from_xml(t.s("input")) } else { Ok(from_ast(t.get("input").expect("input"))) };
                if let Some(m) = t.get("thrown") {
                    assert_eq!(got.err(), Some(Thrown(m.str().expect("a message").into())), "#{n} {fname}: what it throws");
                    continue;
                }
                let b = got.unwrap_or_else(|e| panic!("#{n} {fname}: {e:?}"));
                let (src, diag) = back_json(&b);
                assert_eq!(src, *t.get("src").expect("src"), "#{n} {fname}: the source that came back");
                assert_eq!(diag, *t.get("diag").expect("diag"), "#{n} {fname}: what the way back said");
                assert_eq!(reemit(&b.src), *t.get("reemit").expect("reemit"), "#{n} {fname}: the XML of what came back");
                back += 1;
            }
            "toHGML" => {
                let flags = t.get("opts").expect("opts");
                let Some(ctx) = context(flags) else {
                    skipped += 1;
                    continue;
                };
                let o = opts(&ctx, flags);
                let out = to_hgml(t.s("src"), &BurnOpts { parse: &o, keep_text: false }).unwrap_or_else(|e| panic!("#{n}: {e:?}"));
                assert_eq!(out, t.s("out"), "#{n}: the burn");
                let fix = match parse(&out, &o) {
                    Ok(p) => Json::Arr(p.gaps.iter().filter(|g| g.sev == "fix").map(|g| Json::Str(g.code.clone())).collect()),
                    Err(Thrown(m)) => Json::Obj(vec![("thrown".into(), Json::Str(m))]),
                };
                assert_eq!(fix, *t.get("reparseFix").expect("reparseFix"), "#{n}: what the burn's re-parse raises at fix");
                burns += 1;
            }
            f => panic!("#{n}: a call the recorder does not make: {f}"),
        }
    }
    println!("{} calls: {made} inputs made again, {back} ways back, {burns} burns re-parsed, {skipped} over a store of the suite's own",
             trips.len());
}

/// The port's limit, counted as the JS's `packageUnpass` walks the document:
/// `<glyph-package>`, the block, and under the last `[ins` its question and
/// the question's text are four levels past the source's nesting.
#[test]
fn the_way_back_stops_where_the_js_stack_did() {
    let repo = Context::repository();
    let x = |n: usize| to_xml(&"[ins".repeat(n), &Opts::new(repo), false).expect("the XML");
    assert!(from_xml(&x(STACK_DEPTH - 4)).is_ok());
    assert_eq!(from_xml(&x(STACK_DEPTH - 3)).err(), Some(Thrown("Maximum call stack size exceeded".into())));
}
