//! glyph-envelope — Port of `scripts/core/emit-ast.js` — the oracle. The JS module's own summary:
//!
//!   the GlyphAST envelope: the tree serialised clean, no cycles, with a checksum of itself and of the stores it was read under.
//!
//! EMS-001 ORD-0009. `serialize_ast` is the projection and `to_ast` the one
//! call; the envelope is a `Json` value built in the JS's key order, so
//! `glyph_util::json::stringify` writes the bytes `JSON.stringify` writes. A
//! value JSON drops — the function `Object` a session word or a mood holds as
//! its gloss — is dropped here too.

use glyph_parse::{parse, Extra, Gap, Opts};
use glyph_stores::{Context, Value};
use glyph_util::json::{stringify, Json};
use glyph_util::tree::{Emotion, Gloss, Id, Segment, Thrown, Tree, LIMITS};
use glyph_version::VERSION;
use glyph_vocab::el_name;

/// The envelope's own shape version, moved apart from the engine's.
pub const AST_SCHEMA: f64 = 2.0;

/// `ck`: two FNV-1a runs over UTF-16 units, as the JS computes them — the
/// XOR on signed 32-bit integers and the product in a double, which drops the
/// low bits past 2⁵³ before `>>> 0` keeps 32 of them.
pub fn ck(s: &str) -> String {
    fn uint32(x: f64) -> u32 {
        let m = x.trunc() % 4294967296.0;
        (if m < 0.0 { m + 4294967296.0 } else { m }) as u32
    }
    let (mut a, mut b): (u32, u32) = (0x811c9dc5, 0x01000193);
    for (i, c) in s.encode_utf16().enumerate() {
        let c = c as i32;
        a = uint32(f64::from((a as i32) ^ c) * 16777619.0);
        b = uint32(f64::from((b as i32) ^ (uint32(f64::from(c) + i as f64) as i32)) * 2246822507.0);
    }
    format!("{a:08x}{b:08x}")
}

/// A store as JSON, in the key order the JS enumerates.
pub fn json_of(v: &Value) -> Json {
    match v {
        Value::Null => Json::Null,
        Value::Bool(b) => Json::Bool(*b),
        Value::Num(n) => Json::Num(*n),
        Value::Str(s) => Json::Str(s.clone()),
        Value::Arr(a) => Json::Arr(a.iter().map(json_of).collect()),
        Value::Obj(kv) => Json::Obj(kv.iter().map(|(k, v)| (k.clone(), json_of(v))).collect()),
    }
}

/// `storeCk`: a store's fingerprint by its serialised form; null when none.
pub fn store_ck(store: Option<&Value>) -> Json {
    store.map_or(Json::Null, |s| Json::Str(ck(&stringify(&json_of(s)))))
}

/// What the envelope is asked for beyond the parse.
#[derive(Debug, Clone, Default)]
pub struct AstOpts {
    /// `projection: "panel"`: the thinned shape, for the screen.
    pub panel: bool,
    pub uri: Option<String>,
    pub embed_source: bool,
}

/// `srcDescriptor`: the source by its length, checksum and line endings.
pub fn src_descriptor(t: &str, o: &AstOpts) -> Json {
    let crlf = t.contains("\r\n");
    let lone = t.as_bytes().windows(2).any(|w| w[1] == b'\n' && w[0] != b'\r');
    let newline = if crlf { if lone { "mixed" } else { "crlf" } } else { "lf" };
    let mut kv = vec![
        ("length".to_string(), Json::Num(t.encode_utf16().count() as f64)),
        ("checksum".into(), Json::Str(ck(t))),
        ("encoding".into(), Json::Str("utf-8".into())),
        ("newline".into(), Json::Str(newline.into())),
        ("uri".into(), o.uri.as_ref().filter(|u| !u.is_empty()).map_or(Json::Null, |u| Json::Str(u.clone()))),
    ];
    if o.embed_source {
        kv.push(("text".into(), Json::Str(t.to_string())));
    }
    Json::Obj(kv)
}

fn s(v: &str) -> Json {
    Json::Str(v.to_string())
}
fn opt_str(v: &Option<String>) -> Option<Json> {
    v.as_ref().map(|x| s(x))
}
/// A value JSON would write: the function `Object` is dropped.
fn gloss_json(g: &Gloss) -> Option<Json> {
    match g {
        Gloss::Text(t) => Some(s(t)),
        Gloss::Prototype => Some(Json::Obj(Vec::new())),
        Gloss::Object => None,
    }
}
fn mood_json(e: &Emotion) -> Json {
    let mut kv = vec![("name".to_string(), s(&e.name))];
    if let Some(g) = gloss_json(&e.gloss) {
        kv.push(("gloss".into(), g));
    }
    if let Some(o) = e.order {
        kv.push(("order".into(), Json::Num(o as f64)));
    }
    Json::Obj(kv)
}
/// An object literal whose `undefined` values JSON leaves out.
fn obj(kv: Vec<(&str, Option<Json>)>) -> Json {
    Json::Obj(kv.into_iter().filter_map(|(k, v)| v.map(|v| (k.to_string(), v))).collect())
}

/// `astShallow`: the node without its body.
pub fn ast_shallow(tree: &Tree<Extra>, id: Id) -> Json {
    let nd = &tree.nodes[id];
    let or_null = |v: &Option<String>| Some(v.as_ref().filter(|x| !x.is_empty()).map_or(Json::Null, |x| s(x)));
    if nd.is_literal() {
        let ty = if nd.form.as_deref() == Some("raw") { "Raw" } else { "Literal" };
        return obj(vec![("type", Some(s(ty))), ("value", opt_str(&nd.v)), ("form", opt_str(&nd.form)),
                        ("slot", or_null(&nd.bound_slot)), ("role", or_null(&nd.role))]);
    }
    if nd.text == Some(true) {
        return obj(vec![("type", Some(s("Text"))), ("value", opt_str(&nd.v))]);
    }
    if nd.mode.as_deref().is_some_and(|m| !m.is_empty()) {
        return obj(vec![("type", Some(s("ModeOff")))]);
    }
    if nd.raw_fence == Some(true) {
        return obj(vec![("type", Some(s("Verbatim"))), ("value", Some(s(nd.v.as_deref().unwrap_or(""))))]);
    }
    if nd.logic.is_some() {
        let lg = nd.extra.as_ref().expect("a logic node carries its Logic");
        let strs = |v: &[String]| Json::Arr(v.iter().map(|x| s(x)).collect());
        return obj(vec![
            ("type", Some(s("Logic"))),
            ("name", Some(if lg.name.is_empty() { Json::Null } else { s(&lg.name) })),
            ("rules", Some(Json::Arr(lg.rules.iter().map(|r| obj(vec![
                ("kind", Some(s(r.kind))), ("line", Some(Json::Num(r.line as f64))), ("name", or_null(&r.name)),
                ("source", Some(s(&r.source))), ("expr", Some(s(&r.expr))), ("then", or_null(&r.then)),
                ("reads", Some(s(&r.reads))), ("uses", Some(strs(&r.uses)))])).collect()))),
            ("missing", Some(strs(&lg.missing))),
        ]);
    }
    if nd.is_template() {
        return obj(vec![("type", Some(s("Template"))), ("name", opt_str(&nd.template)),
                        ("isDefinition", Some(Json::Bool(nd.is_def == Some(true)))),
                        ("expanded", Some(Json::Bool(nd.expanded == Some(true))))]);
    }
    let tier = nd.tier.clone().unwrap_or_default();
    let canonical = nd.canonical.clone().unwrap_or_default();
    let gloss = match &nd.gloss {
        None => Some(s("")),
        Some(Gloss::Text(t)) if t.is_empty() => Some(s("")),
        Some(g) => gloss_json(g),
    };
    let text_gloss = match &nd.gloss {
        Some(Gloss::Text(t)) => Some(t.as_str()),
        _ => None,
    };
    let element = if tier == "unknown" || tier == "empty" { Json::Null } else { s(&el_name(&canonical, &tier, text_gloss)) };
    obj(vec![
        ("type", Some(s("Command"))),
        ("raw", opt_str(&nd.raw)),
        ("canonical", opt_str(&nd.canonical)),
        ("tier", opt_str(&nd.tier)),
        ("gloss", gloss),
        ("element", Some(element)),
        ("isAlias", Some(Json::Bool(nd.alias == Some(true)))),
        ("chainElement", Some(Json::Bool(nd.chain_element == Some(true)))),
        ("origin", Some(nd.origin.clone().flatten().filter(|o| !o.is_empty()).map_or(Json::Null, |o| s(&o)))),
        ("slotName", Some(Json::Bool(nd.slot_name == Some(true)))),
        ("editorial", Some(Json::Bool(nd.editorial == Some(true)))),
        ("name", Some(nd.colon.clone().flatten().filter(|c| !c.is_empty()).map_or(Json::Null, |c| s(&c)))),
        ("depth", nd.depth.map(|d| Json::Num(d as f64))),
        ("autoClosed", Some(Json::Bool(nd.auto_closed == Some(true)))),
        ("suggestion", Some(match &nd.suggestion {
            Some(Some(g)) => s(&g.name),
            _ => Json::Null,
        })),
        ("emotions", Some(Json::Arr(nd.emotions.iter().map(mood_json).collect()))),
        ("species", Some(nd.species.as_ref().filter(|x| !x.is_empty()).map_or(Json::Null, |x| s(x)))),
        ("compositionDepth", Some(match nd.composition_depth {
            None | Some(None) => Json::Null,
            Some(Some(d)) => Json::Num(d),
        })),
    ])
}

/// `astHasBody`: a command, a template or a mode carries `body`.
pub fn ast_has_body(tree: &Tree<Extra>, id: Id) -> bool {
    let nd = &tree.nodes[id];
    nd.mode.as_deref().is_some_and(|m| !m.is_empty()) || nd.is_template()
        || (!nd.is_literal() && nd.text != Some(true) && nd.logic.is_none() && nd.raw_fence != Some(true))
}

/// `astLean`: the panel's thinning — nothing empty, and no field the
/// position already says.
pub fn ast_lean(o: Json) -> Json {
    let Json::Obj(kv) = o else { return o };
    let canonical = kv.iter().find(|(k, _)| k == "canonical").and_then(|(_, v)| v.str().map(str::to_string));
    let atom = kv.iter().any(|(k, v)| k == "species" && v.str() == Some("atom"));
    Json::Obj(kv.into_iter().filter(|(k, v)| {
        let empty = matches!(v, Json::Null | Json::Bool(false)) || v.str() == Some("") || v.arr().is_some_and(<[Json]>::is_empty);
        let raw_is_canonical = k == "raw" && canonical.as_deref().is_some_and(|c| !c.is_empty())
            && v.str().is_some_and(|r| Some(r.to_uppercase()) == canonical);
        let positional = k == "origin" && matches!(v.str(), Some("root" | "nest"));
        !(empty || raw_is_canonical || (k == "compositionDepth" && atom) || positional)
    }).collect())
}

/// `astNode`: iterative, and cut at `LIMITS.astDepth` with a marker, since
/// the tree may be as deep as the author's text.
pub fn ast_node(tree: &Tree<Extra>, root: Id, truncated: &mut usize, panel: bool) -> Json {
    enum Slot {
        Holder,
        Body(usize),
    }
    /* each object is built with an index into `built`; bodies are filled after */
    let mut built: Vec<(Json, Vec<usize>)> = Vec::new();
    let mut holder: Vec<usize> = Vec::new();
    let mut stack = vec![(root, Slot::Holder, 0usize)];
    while let Some((id, slot, d)) = stack.pop() {
        let obj = if d >= LIMITS.ast_depth {
            let omitted = tree.walk(&[id]).len();
            *truncated += omitted;
            (Json::Obj(vec![("type".into(), s("Truncated")), ("reason".into(), s("depth")),
                            ("atDepth".into(), Json::Num(LIMITS.ast_depth as f64)),
                            ("omittedNodes".into(), Json::Num(omitted as f64)), ("at".into(), Json::Null)]), None)
        } else {
            let mut o = ast_shallow(tree, id);
            if panel {
                o = ast_lean(o);
            } else if let Json::Obj(kv) = &mut o {
                kv.push(("at".into(), tree.nodes[id].tok.as_ref()
                    .map_or(Json::Null, |t| Json::Obj(vec![("s".into(), Json::Num(t.s as f64)), ("e".into(), Json::Num(t.e as f64))]))));
            }
            (o, ast_has_body(tree, id).then_some(()))
        };
        let at = built.len();
        built.push((obj.0, Vec::new()));
        match slot {
            Slot::Holder => holder.push(at),
            Slot::Body(p) => built[p].1.push(at),
        }
        if obj.1.is_some() {
            if let Json::Obj(kv) = &mut built[at].0 {
                kv.push(("body".into(), Json::Arr(Vec::new())));
            }
            for &k in tree.nodes[id].children.iter().rev() {
                stack.push((k, Slot::Body(at), d + 1));
            }
        }
    }
    /* assemble bottom-up: a body is complete once every later object is */
    let mut done: Vec<Option<Json>> = vec![None; built.len()];
    for i in (0..built.len()).rev() {
        let (mut o, kids) = std::mem::replace(&mut built[i], (Json::Null, Vec::new()));
        if let Json::Obj(kv) = &mut o {
            if let Some((_, Json::Arr(body))) = kv.iter_mut().find(|(k, _)| k == "body") {
                body.extend(kids.iter().map(|&k| done[k].take().expect("a child built")));
            }
        }
        done[i] = Some(o);
    }
    done[holder[0]].take().expect("the root built")
}

fn segment_json(tree: &Tree<Extra>, sg: &Segment, truncated: &mut usize, panel: bool) -> Json {
    let mut seg = Json::Obj(vec![
        ("type".into(), s("Segment")),
        ("mood".into(), Json::Arr(sg.mood.iter().map(mood_json).collect())),
        ("isReturn".into(), Json::Bool(sg.is_return)),
        ("continues".into(), Json::Bool(sg.continues)),
        ("breaks".into(), Json::Num(sg.breaks as f64)),
        ("autoClosedCount".into(), Json::Num(sg.auto_closed as f64)),
    ]);
    if panel {
        seg = ast_lean(seg);
    }
    if let Json::Obj(kv) = &mut seg {
        kv.push(("body".into(), Json::Arr(sg.children.iter().map(|&c| ast_node(tree, c, truncated, panel)).collect())));
    }
    seg
}

/// `serializeAST(segments, gaps, opts)`. `rules` is the rules store as the
/// parse left it; `source` is the text the envelope describes.
pub fn serialize_ast(tree: &Tree<Extra>, gaps: &[Gap], ctx: &Context, rules: Option<&Value>, source: Option<&str>, o: &AstOpts) -> Json {
    let mut truncated = 0;
    let segments: Vec<Json> = tree.segments.iter().map(|sg| segment_json(tree, sg, &mut truncated, o.panel)).collect();
    let mut diagnostics: Vec<Json> = gaps.iter().map(|g| {
        let mut kv = vec![("code".to_string(), s(&g.code)), ("severity".into(), s(&g.sev)), ("label".into(), s(&g.lab)),
                          ("message".into(), s(&g.plain))];
        if let Some((a, b)) = g.at {
            kv.push(("at".into(), Json::Obj(vec![("s".into(), Json::Num(a as f64)), ("e".into(), Json::Num(b as f64))])));
        }
        Json::Obj(kv)
    }).collect();
    let mut out = vec![
        ("type".to_string(), s("GlyphAST")),
        ("schema".into(), Json::Num(AST_SCHEMA)),
        ("version".into(), s(VERSION)),
        ("source".into(), source.map_or(Json::Null, |t| src_descriptor(t, o))),
        ("stores".into(), Json::Obj(vec![("templates".into(), store_ck(Some(&ctx.templates))), ("rules".into(), store_ck(rules)),
                                          ("expansions".into(), store_ck(ctx.expansions.as_ref()))])),
        ("projection".into(), s(if o.panel { "panel" } else { "full" })),
        ("segments".into(), Json::Arr(segments)),
    ];
    if truncated > 0 && !o.panel {
        diagnostics.push(Json::Obj(vec![
            ("code".into(), s("DepthExceeded")), ("severity".into(), s("fix")), ("label".into(), s("profundidade")),
            ("message".into(), s(&format!("a árvore passa de {} níveis e {truncated} nós foram omitidos — este envelope não está \
                                          completo e não deve ser carregado como se estivesse.", LIMITS.ast_depth))),
        ]));
    }
    out.push(("diagnostics".into(), Json::Arr(diagnostics)));
    if truncated > 0 {
        out.push(("truncatedNodes".into(), Json::Num(truncated as f64)));
    }
    Json::Obj(out)
}

/// `toAST(src, opts)`: the envelope travels, so the JS parses in en-EU unless
/// the caller names a language; here the caller's `Opts` says which.
pub fn to_ast(src: &str, o: &Opts, a: &AstOpts) -> Result<Json, Thrown> {
    let p = parse(src, o)?;
    Ok(serialize_ast(&p.tree, &p.gaps, o.ctx, p.rules.as_ref(), Some(src), a))
}
