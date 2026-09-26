//! glyph-protocol — Port of `scripts/glyph-protocol.js` — the oracle.
//!
//! One JSON request a line in, one JSON answer a line out. The exact specification
//! is the JS `answer(line)` function: given a request line, return the exact same
//! bytes it returns.

use glyph_burn::{to_hgml, BurnOpts};
use glyph_envelope::{to_ast, AstOpts};
use glyph_inverse::from_xml;
use glyph_lex::{classify, suggest, tokenize, Token};
use glyph_logic::{expand_expr, free_vars, parse_logic};
use glyph_parse::{parse, Opts};
use glyph_stores::Context;
use glyph_util::json::{parse as parse_json, stringify, Json};
use glyph_util::tree::Thrown;
use glyph_vocab::el_name;
use glyph_xml::to_xml;

/// JSON-encode a single token for the tokenize response.
fn token_json(t: &Token) -> Json {
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

/// JSON-encode a classification result.
fn class_json(c: &glyph_lex::Class) -> Json {
    let mut kv: Vec<(String, Json)> = vec![
        ("tier".into(), Json::Str(c.tier.into())),
        ("canonical".into(), Json::Str(c.canonical.clone())),
    ];
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

/// JSON-encode a suggestion result, or null if none.
fn suggest_json(s: Option<glyph_lex::Suggestion>) -> Json {
    s.map_or(Json::Null, |s| {
        Json::Obj(vec![
            ("name".into(), Json::Str(s.name.into())),
            ("dist".into(), Json::Num(0.0)),
            ("how".into(), Json::Str(s.how.into())),
        ])
    })
}

/// JSON-encode a parseLogic result.
fn parse_logic_json(lg: &glyph_logic::Logic) -> Json {
    let rule = |r: &glyph_logic::Rule| {
        let mut kv = vec![
            ("line".into(), Json::Num(r.line as f64)),
            ("source".into(), Json::Str(r.source.clone())),
            ("kind".into(), Json::Str(r.kind.into())),
        ];
        for (k, v) in [("name", &r.name), ("cond", &r.cond), ("then", &r.then)] {
            if let Some(v) = v {
                kv.push((k.into(), Json::Str(v.clone())));
            }
        }
        kv.extend([
            ("expr".into(), Json::Str(r.expr.clone())),
            ("reads".into(), Json::Str(r.reads.clone())),
            ("uses".into(), Json::Arr(r.uses.iter().map(|u| Json::Str(u.clone())).collect())),
        ]);
        Json::Obj(kv)
    };
    Json::Obj(vec![
        ("name".into(), Json::Str(lg.name.clone())),
        (
            "rules".into(),
            Json::Arr(lg.rules.iter().map(rule).collect()),
        ),
        (
            "gaps".into(),
            Json::Arr(
                lg.gaps
                    .iter()
                    .map(|g| {
                        Json::Obj(vec![
                            ("sev".into(), Json::Str(g.sev.into())),
                            ("lab".into(), Json::Str(g.lab.into())),
                            ("code".into(), Json::Str(g.code.into())),
                            ("msg".into(), Json::Str(g.msg.clone())),
                        ])
                    })
                    .collect(),
            ),
        ),
        (
            "missing".into(),
            Json::Arr(lg.missing.iter().map(|m| Json::Str(m.clone())).collect()),
        ),
    ])
}

/// JSON-encode a parse gap result.
fn gap_json(g: &glyph_parse::Gap) -> Json {
    let s = |v: &str| Json::Str(v.to_string());
    let mut kv = vec![("sev".into(), s(&g.sev)), ("lab".into(), s(&g.lab))];
    if g.code_first {
        kv.extend([("code".into(), s(&g.code)), ("msg".into(), s(&g.msg))]);
    } else {
        kv.extend([("msg".into(), s(&g.msg)), ("code".into(), s(&g.code))]);
    }
    if let Some((a, b)) = g.at {
        kv.push((
            "at".into(),
            Json::Obj(vec![
                ("s".into(), Json::Num(a as f64)),
                ("e".into(), Json::Num(b as f64)),
            ]),
        ));
    }
    kv.push(("plain".into(), s(&g.plain)));
    Json::Obj(kv)
}

/// JSON-encode a fromXML/fromAST result.
fn back_json(b: &glyph_inverse::Back) -> Json {
    Json::Obj(vec![
        ("src".into(), Json::Str(b.src.clone())),
        (
            "diag".into(),
            Json::Arr(
                b.diag
                    .iter()
                    .map(|d| {
                        Json::Obj(vec![
                            ("sev".into(), Json::Str(d.sev.into())),
                            ("code".into(), Json::Str(d.code.into())),
                            ("msg".into(), Json::Str(d.msg.clone())),
                        ])
                    })
                    .collect(),
            ),
        ),
    ])
}

/// Extract a string field from the request, defaulting to "" if not present or not a string.
fn str_field(req: &Json, name: &str) -> String {
    req.get(name)
        .and_then(Json::str)
        .map(|s| s.to_string())
        .unwrap_or_default()
}

/// Process a single request and return the response.
fn run(req: &Json) -> Result<Json, String> {
    let ctx = Context::repository();
    let mut opts = Opts::new(&ctx);

    // Set language if specified in request
    if req.get("lang").and_then(Json::str) == Some("en") {
        opts.en = true;
    }

    let call = str_field(req, "call");
    match call.as_str() {
        "tokenize" => {
            let src = str_field(req, "src");
            Ok(Json::Arr(
                tokenize(&src).iter().map(token_json).collect(),
            ))
        }
        "classify" => {
            let name = str_field(req, "name");
            // Session defaults to true as per the JS behavior
            Ok(class_json(&classify(&name, &ctx, true)))
        }
        "suggest" => {
            let name = str_field(req, "name");
            Ok(suggest_json(suggest(&name)))
        }
        "elName" => {
            let canonical = str_field(req, "canonical");
            let tier = str_field(req, "tier");
            let gloss = str_field(req, "gloss");
            let gloss_ref = if gloss.is_empty() { None } else { Some(gloss.as_str()) };
            Ok(Json::Str(el_name(&canonical, &tier, gloss_ref)))
        }
        "parseLogic" => {
            let name = str_field(req, "name");
            let body = str_field(req, "body");
            Ok(parse_logic_json(&parse_logic(&name, &body)))
        }
        "expandExpr" => {
            let raw = str_field(req, "raw");
            Ok(Json::Str(expand_expr(&raw)))
        }
        "freeVars" => {
            let raw = str_field(req, "raw");
            Ok(Json::Arr(
                free_vars(&raw)
                    .into_iter()
                    .map(|v| Json::Str(v))
                    .collect(),
            ))
        }
        "parse" => {
            let src = str_field(req, "src");
            // For toAST, default lang to "en" when not specified (per JS behavior)
            let ast_opts = if req.get("lang").and_then(Json::str) == Some("pt") {
                Opts::new(&ctx)
            } else {
                let mut o = Opts::new(&ctx);
                o.en = true;
                o
            };
            let ast = to_ast(&src, &ast_opts, &AstOpts::default())
                .map_err(|Thrown(e)| e)?;
            let parse_result = parse(&src, &opts).map_err(|Thrown(e)| e)?;
            Ok(Json::Obj(vec![
                ("ast".into(), ast),
                (
                    "gaps".into(),
                    Json::Arr(parse_result.gaps.iter().map(gap_json).collect()),
                ),
            ]))
        }
        "toXML" => {
            let src = str_field(req, "src");
            let describe = req.get("describe") == Some(&Json::Bool(true));
            let xml = to_xml(&src, &opts, describe).map_err(|Thrown(e)| e)?;
            Ok(Json::Str(xml))
        }
        "toAST" => {
            let src = str_field(req, "src");
            let projection = str_field(req, "projection");
            let ast_opts = if projection == "panel" {
                AstOpts {
                    panel: true,
                    ..AstOpts::default()
                }
            } else {
                AstOpts::default()
            };
            // Default to en for toAST when lang not specified
            let ast_opts_lang = if req.get("lang").and_then(Json::str) == Some("pt") {
                Opts::new(&ctx)
            } else {
                let mut o = Opts::new(&ctx);
                o.en = true;
                o
            };
            to_ast(&src, &ast_opts_lang, &ast_opts).map_err(|Thrown(e)| e)
        }
        "toHGML" => {
            let src = str_field(req, "src");
            let hgml = to_hgml(&src, &BurnOpts { parse: &opts, keep_text: false })
                .map_err(|Thrown(e)| e)?;
            Ok(Json::Str(hgml))
        }
        "fromXML" => {
            let xml = str_field(req, "xml");
            let back = from_xml(&xml).map_err(|Thrown(e)| e)?;
            Ok(back_json(&back))
        }
        _ => Err("no such call".to_string()),
    }
}

/// Answer a single JSON request line, returning the exact bytes the JS returns.
pub fn answer(line: &str) -> String {
    let req = match parse_json(line) {
        Ok(r) => r,
        Err(_) => return stringify(&Json::Obj(vec![("thrown".into(), Json::Str("bad request".into()))])),
    };

    // Validate that it's a JSON object
    if !matches!(req, Json::Obj(_)) {
        return stringify(&Json::Obj(vec![("thrown".into(), Json::Str("bad request".into()))]));
    }

    match run(&req) {
        Ok(result) => stringify(&Json::Obj(vec![("ok".into(), result)])),
        Err(msg) => stringify(&Json::Obj(vec![("thrown".into(), Json::Str(msg))])),
    }
}
