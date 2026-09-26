//! EMS-001 ORD-0010, the val: the chosen protocol answers the twelve calls
//! `glyph-ui.js` makes. Every request `protocol.json` records — the twelve
//! calls over the case files, the logic blocks `logic.json` holds, and the
//! lines that are not a call — answers here the bytes `glyph-protocol.js`
//! answered.

#[path = "../../../testkit/oracle.rs"]
mod oracle;

use glyph_protocol::answer;
use glyph_util::json::{parse, Json};
use oracle::{module, Must};

const TWELVE: [&str; 12] = ["tokenize", "classify", "suggest", "elName", "parseLogic", "expandExpr", "freeVars",
                            "parse", "toXML", "toAST", "toHGML", "fromXML"];

#[test]
fn every_request_answers_the_bytes_the_js_answered() {
    let lines = module("protocol").a("lines");
    assert!(!lines.is_empty(), "protocol.json records no request");
    let mut per: Vec<usize> = vec![0; TWELVE.len()];
    let mut wrong: Vec<String> = Vec::new();
    for l in lines {
        let (q, a) = (l.s("q"), l.s("a"));
        let call = parse(q).ok().and_then(|j| j.get("call").and_then(Json::str).map(str::to_string));
        if let Some(k) = call.as_deref().and_then(|c| TWELVE.iter().position(|t| *t == c)) {
            per[k] += 1;
        }
        let got = answer(q);
        if got != a {
            let at = got.bytes().zip(a.bytes()).take_while(|(x, y)| x == y).count();
            let near = |t: &str| t.get(at.saturating_sub(20)..t.len().min(at + 60)).unwrap_or("").to_string();
            wrong.push(format!("{} — at byte {at}: {:?} against {:?}", q.get(..q.len().min(90)).unwrap_or(q), near(&got), near(a)));
        }
    }
    for (k, n) in per.iter().enumerate() {
        assert!(*n > 0, "no request of `{}` in protocol.json", TWELVE[k]);
    }
    assert!(wrong.is_empty(), "{} of {} answers differ; the first:\n{}", wrong.len(), lines.len(), wrong[..wrong.len().min(5)].join("\n"));
}
