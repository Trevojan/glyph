//! EMS-001 ORD-0004: the tokens equal the oracle on all 114 sources, spans
//! counted in UTF-16 as the JS counts them. Each token is written with the keys
//! in the order the JS object has them, and the list compared whole.

#[path = "../../../testkit/oracle.rs"]
mod oracle;

use glyph_lex::{tokenize, Token};
use glyph_util::json::{self, Json};
use oracle::Must;

pub fn token_json(t: &Token) -> Json {
    let mut kv: Vec<(String, Json)> = vec![("k".into(), Json::Str(t.k.into()))];
    let mut put = |k: &str, v: Option<Json>| {
        if let Some(v) = v {
            kv.push((k.into(), v));
        }
    };
    put("v", t.v.clone().map(Json::Str));
    put("def", t.def.map(Json::Bool));
    put("body", t.body.clone().map(Json::Str));
    put("s", Some(Json::Num(t.s as f64)));
    put("e", Some(Json::Num(t.e as f64)));
    put("closed", t.closed.map(Json::Bool));
    put("stray", t.stray.map(Json::Bool));
    put("form", t.form.map(|f| Json::Str(f.into())));
    put("closedBy", t.closed_by.map(|f| Json::Str(f.into())));
    put("order", t.order.map(|o| Json::Num(o as f64)));
    put("unterminated", t.unterminated.map(Json::Bool));
    put("delim", t.delim.map(|d| Json::Str(d.into())));
    Json::Obj(kv)
}

#[test]
fn the_tokens_equal_the_oracle_on_every_source() {
    let cases = oracle::cases();
    let mut tokens = 0;
    for case in cases {
        let want = case.get("tokens").expect("a case with no tokens");
        let got = Json::Arr(tokenize(case.s("src")).iter().map(token_json).collect());
        if &got != want {
            let (g, w) = (json::stringify(&got), json::stringify(want));
            let at = g.bytes().zip(w.bytes()).take_while(|(a, b)| a == b).count();
            panic!("{}: differs at byte {at}\n  rust: {}\n  js:   {}", case.s("id"),
                   &g[at.saturating_sub(80)..(at + 80).min(g.len())], &w[at.saturating_sub(80)..(at + 80).min(w.len())]);
        }
        tokens += want.arr().map_or(0, |a| a.len());
    }
    assert!(tokens > 0, "the oracle holds no token");
    println!("{} sources, {tokens} tokens", cases.len());
}

/* The 114 sources leave most of the lexer unread — seven mutations lived
   through them — so `lexer.json` holds the JS's tokens for every string of up
   to 4096 units the case files hold, and for probes written one per branch,
   characters outside the BMP among them. */
#[test]
fn the_tokens_equal_the_js_on_every_string_and_probe() {
    let sources = oracle::module("lexer").a("tokenize");
    assert!(!sources.is_empty(), "lexer.json: no sources");
    for s in sources {
        let s = s.arr().unwrap();
        let src = s[0].str().unwrap();
        let got = Json::Arr(tokenize(src).iter().map(token_json).collect());
        if got != s[1] {
            let (g, w) = (json::stringify(&got), json::stringify(&s[1]));
            let at = g.bytes().zip(w.bytes()).take_while(|(a, b)| a == b).count();
            panic!("{:?}: differs at byte {at}\n  rust: {}\n  js:   {}", src.chars().take(60).collect::<String>(),
                   &g[at.saturating_sub(80)..(at + 80).min(g.len())], &w[at.saturating_sub(80)..(at + 80).min(w.len())]);
        }
    }
}

fn class_json(c: &glyph_lex::Class) -> Json {
    let mut kv: Vec<(String, Json)> = vec![("tier".into(), Json::Str(c.tier.into())), ("canonical".into(), Json::Str(c.canonical.clone()))];
    if let Some(a) = c.alias {
        kv.push(("alias".into(), Json::Bool(a)));
    }
    if let Some(a) = &c.alias_of {
        kv.push(("aliasOf".into(), Json::Str(a.clone())));
    }
    match &c.gloss {
        glyph_lex::Gloss::Text(g) => kv.push(("gloss".into(), Json::Str(g.clone()))),
        glyph_lex::Gloss::Prototype => kv.push(("gloss".into(), Json::Obj(Vec::new()))),
        glyph_lex::Gloss::Absent => {}
    }
    if let Some(m) = c.merged {
        kv.push(("merged".into(), Json::Bool(m)));
    }
    if let Some(b) = &c.blend_id {
        kv.push(("blendId".into(), Json::Str(b.clone())));
    }
    Json::Obj(kv)
}

#[test]
fn classify_and_suggest_equal_the_js() {
    let ctx = glyph_stores::Context::repository();
    let calls = oracle::module("lexer").a("classify");
    assert!(!calls.is_empty(), "lexer.json: no classify calls");
    for c in calls {
        let c = c.arr().unwrap();
        let name = c[0].str().unwrap();
        assert_eq!(class_json(&glyph_lex::classify(name, ctx, true)), c[1], "classify({name:?})");
        assert_eq!(class_json(&glyph_lex::classify(name, ctx, false)), c[2], "classify({name:?}, session: false)");
    }
    for c in oracle::module("lexer").a("suggest") {
        let c = c.arr().unwrap();
        let name = c[0].str().unwrap();
        let got = glyph_lex::suggest(name).map_or(Json::Null, |s| Json::Obj(vec![
            ("name".into(), Json::Str(s.name.into())), ("dist".into(), Json::Num(0.0)), ("how".into(), Json::Str(s.how.into()))]));
        assert_eq!(got, c[1], "suggest({name:?})");
    }
}
