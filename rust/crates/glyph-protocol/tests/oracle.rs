//! EMS-001 ORD-0010, the val: the chosen protocol answers the calls
//! `glyph-ui.js` makes. Every request `protocol.json` records — the calls over
//! the case files, the logic blocks `logic.json` holds, what a request brings
//! over the engine's templates, and the lines that are not a call — answers here
//! the bytes `glyph-protocol.js` answered.

#[path = "../../../testkit/oracle.rs"]
mod oracle;

use glyph_protocol::answer;
use glyph_json::{parse, Json};
use oracle::{module, Must};

const CALLS: [&str; 13] = ["tables", "tokenize", "classify", "suggest", "elName", "parseLogic", "expandExpr", "freeVars",
                           "parse", "toXML", "toAST", "toHGML", "fromXML"];

#[test]
fn every_request_answers_the_bytes_the_js_answered() {
    let lines = module("protocol").a("lines");
    assert!(!lines.is_empty(), "protocol.json records no request");
    let mut per: Vec<usize> = vec![0; CALLS.len()];
    let (mut brought, mut refused) = (0, 0);
    let mut wrong: Vec<String> = Vec::new();
    for l in lines {
        let (q, a) = (l.s("q"), l.s("a"));
        let request = parse(q).ok();
        let call = request.as_ref().and_then(|j| j.get("call").and_then(Json::str).map(str::to_string));
        if let Some(k) = call.as_deref().and_then(|c| CALLS.iter().position(|t| *t == c)) {
            per[k] += 1;
        }
        if request.as_ref().is_some_and(|j| j.get("differ").is_some()) {
            brought += 1;
            refused += usize::from(a.starts_with("{\"thrown\":\"differ: "));
        }
        let got = answer(q);
        let got = if call.as_deref() == Some("toHGML") { oracle::known::semicolons_json(&got) } else { got };
        if got != a {
            let at = got.bytes().zip(a.bytes()).take_while(|(x, y)| x == y).count();
            let near = |t: &str| t.get(at.saturating_sub(20)..t.len().min(at + 60)).unwrap_or("").to_string();
            wrong.push(format!("{} — at byte {at}: {:?} against {:?}", q.get(..q.len().min(90)).unwrap_or(q), near(&got), near(a)));
        }
    }
    for (k, n) in per.iter().enumerate() {
        assert!(*n > 0, "no request of `{}` in protocol.json", CALLS[k]);
    }
    assert!(brought > 0 && refused > 0, "protocol.json brings {brought} sets of templates and refuses {refused}");
    assert!(wrong.is_empty(), "{} of {} answers differ; the first:\n{}", wrong.len(), lines.len(), wrong[..wrong.len().min(5)].join("\n"));
}
