//! EMS-001 ORD-0008: `to_xml` against the oracle — the XML of each of the 114
//! case files, byte for byte, and all of `xml.json`: the same runs `parse.json`
//! reads and the emitter's own probes, plain and with `describe`.

#[path = "../../../testkit/oracle.rs"]
mod oracle;

use glyph_parse::Opts;
use glyph_stores::{Context, Value};
use glyph_util::json::Json;
use glyph_util::tree::Thrown;
use glyph_xml::to_xml;
use oracle::{cases, module, Must};

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
fn the_xml_of_every_case_equals_the_oracle() {
    let repo = Context::repository();
    for case in cases() {
        let got = to_xml(case.s("src"), &Opts::new(repo), false).unwrap_or_else(|e| panic!("{}: {e:?}", case.s("id")));
        assert_eq!(got, case.s("xml"), "{}: the XML", case.s("id"));
    }
    println!("{} cases", cases().len());
}

#[test]
fn every_xml_run_equals_the_js() {
    let runs = module("xml").a("runs");
    assert!(runs.len() > 114, "xml.json holds {} runs — write it again: {}", runs.len(), oracle::WRITE_IT);
    let (mut bytes, mut thrown) = (0, 0);
    for run in runs {
        let (id, src) = (run.s("id"), run.s("src"));
        let ctx = context(run);
        let o = glyph_parse::Opts {
            ctx: &ctx, session: run.get("session") != Some(&Json::Bool(false)),
            valency: run.get("valency") != Some(&Json::Bool(false)), en: false, expanding: Vec::new(),
        };
        for (k, describe) in [("xml", false), ("describe", true)] {
            let got = to_xml(src, &o, describe);
            match run.get(k).unwrap_or_else(|| panic!("{id}: no {k}")) {
                Json::Str(want) => {
                    assert_eq!(got.as_deref().map_err(|e| e.clone()), Ok(want.as_str()), "{id} {k}");
                    bytes += want.len();
                }
                want => {
                    assert_eq!(got.err(), Some(Thrown(want.s("thrown").to_string())), "{id} {k}: what toXML throws");
                    thrown += 1;
                }
            }
        }
    }
    println!("{} runs, {bytes} bytes of XML, {thrown} throws", runs.len());
}
