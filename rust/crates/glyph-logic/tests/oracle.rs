//! EMS-001 ORD-0005: every Logic node equals the oracle — each `[logic]` token
//! of a case, read by `parse_logic` and projected as the envelope projects it,
//! against the Logic nodes of that case's AST, in document order. Then the
//! whole of `logic.json`: parseLogic, expandExpr and freeVars on 1 606 blocks
//! and 1 584 strings.

#[path = "../../../testkit/oracle.rs"]
mod oracle;

use glyph_logic::*;
use glyph_util::json::Json;
use oracle::Must;

fn s(v: &str) -> Json {
    Json::Str(v.into())
}
fn strs(v: &[String]) -> Json {
    Json::Arr(v.iter().map(|x| s(x)).collect())
}
fn or_null(v: &Option<String>) -> Json {
    v.as_ref().filter(|x| !x.is_empty()).map_or(Json::Null, |x| s(x))
}

/// The envelope's Logic node (emit-ast.js), with the token's span as `at`.
fn envelope(lg: &Logic, at: (usize, usize)) -> Json {
    Json::Obj(vec![
        ("type".into(), s("Logic")),
        ("name".into(), if lg.name.is_empty() { Json::Null } else { s(&lg.name) }),
        ("rules".into(), Json::Arr(lg.rules.iter().map(|r| Json::Obj(vec![
            ("kind".into(), s(r.kind)), ("line".into(), Json::Num(r.line as f64)), ("name".into(), or_null(&r.name)),
            ("source".into(), s(&r.source)), ("expr".into(), s(&r.expr)), ("then".into(), or_null(&r.then)),
            ("reads".into(), s(&r.reads)), ("uses".into(), strs(&r.uses))])).collect())),
        ("missing".into(), strs(&lg.missing)),
        ("at".into(), Json::Obj(vec![("s".into(), Json::Num(at.0 as f64)), ("e".into(), Json::Num(at.1 as f64))])),
    ])
}

fn logic_nodes<'a>(v: &'a Json, out: &mut Vec<&'a Json>) {
    match v {
        Json::Arr(a) => a.iter().for_each(|x| logic_nodes(x, out)),
        Json::Obj(kv) => {
            if v.get("type").and_then(Json::str) == Some("Logic") {
                out.push(v);
            }
            kv.iter().for_each(|(_, x)| logic_nodes(x, out));
        }
        _ => {}
    }
}

#[test]
fn every_logic_node_equals_the_oracle() {
    let mut held = 0;
    for case in oracle::cases() {
        let mut want = Vec::new();
        logic_nodes(case.get("ast").unwrap(), &mut want);
        let got: Vec<Json> = glyph_lex::tokenize(case.s("src")).iter().filter(|t| t.k == "logic")
            .map(|t| envelope(&parse_logic(t.v.as_deref().unwrap_or(""), t.body.as_deref().unwrap_or("")), (t.s, t.e)))
            .collect();
        assert_eq!(got.len(), want.len(), "{}: logic tokens and Logic nodes", case.s("id"));
        for (g, w) in got.iter().zip(&want) {
            assert_eq!(g, *w, "{}", case.s("id"));
        }
        held += want.len();
    }
    assert!(held > 0, "the oracle holds no Logic node");
    println!("{held} Logic nodes");
}

/// `parseLogic`'s own answer, fields in the order the JS sets them.
fn whole(lg: &Logic) -> Json {
    let rule = |r: &Rule| {
        let mut kv = vec![("line".into(), Json::Num(r.line as f64)), ("source".into(), s(&r.source)), ("kind".into(), s(r.kind))];
        for (k, v) in [("name", &r.name), ("cond", &r.cond), ("then", &r.then)] {
            if let Some(v) = v {
                kv.push((k.into(), s(v)));
            }
        }
        kv.extend([("expr".into(), s(&r.expr)), ("reads".into(), s(&r.reads)), ("uses".into(), strs(&r.uses))]);
        Json::Obj(kv)
    };
    Json::Obj(vec![
        ("name".into(), s(&lg.name)),
        ("rules".into(), Json::Arr(lg.rules.iter().map(rule).collect())),
        ("gaps".into(), Json::Arr(lg.gaps.iter().map(|g| Json::Obj(vec![
            ("sev".into(), s(g.sev)), ("lab".into(), s(g.lab)), ("code".into(), s(g.code)), ("msg".into(), s(&g.msg))])).collect())),
        ("missing".into(), strs(&lg.missing)),
    ])
}

#[test]
fn parse_logic_expand_expr_and_free_vars_equal_the_js() {
    let m = oracle::module("logic");
    let calls = m.a("parseLogic");
    assert!(!calls.is_empty(), "logic.json: no parseLogic calls");
    for c in calls {
        let c = c.arr().unwrap();
        let (n, b) = (c[0].str().unwrap(), c[1].str().unwrap());
        assert_eq!(whole(&parse_logic(n, b)), c[2], "parseLogic({n:?}, {b:?})");
    }
    for c in m.a("expandExpr") {
        let c = c.arr().unwrap();
        assert_eq!(expand_expr(c[0].str().unwrap()), c[1].str().unwrap(), "expandExpr({:?})", c[0].str().unwrap());
    }
    for c in m.a("freeVars") {
        let c = c.arr().unwrap();
        let want: Vec<String> = c[1].arr().unwrap().iter().map(|v| v.str().unwrap().to_string()).collect();
        assert_eq!(free_vars(c[0].str().unwrap()), want, "freeVars({:?})", c[0].str().unwrap());
    }
}
