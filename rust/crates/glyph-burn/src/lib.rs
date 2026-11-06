//! glyph-burn — Port of `scripts/core/burn.js` — the oracle. The JS module's own summary:
//!
//!   .hgml — HIEROGLYPH MARKDOWN, the atomic burn.
//!
//! EMS-001 ORD-0009. The tree reduced to hieroglyphs: every composite
//! replaced by its formula, over and over, until only atoms are left, with
//! the blends of the rules store applied over the atoms. The JS keeps two
//! module globals — whether the burn was cut, and which blends fired — that
//! `toHGML` resets; here they are a `Burning` the calls pass along.

use glyph_parse::{parse, Extra, Opts};
use glyph_rules::{compiled_of, Compiled};
use glyph_stores::{entry_of, expansion_registry, Context};
use glyph_json::{stringify, Json};
use glyph_util::tree::{Id, Thrown, Tree, LIMITS};
use glyph_util::{js_space, js_trim};

/// The safety net on a formula's chain; the build already refuses cycles.
pub const BURN_LIMIT: usize = 24;

/// A node of the burnt tree: an atom with its operands, or a leaf the burn
/// keeps as the parse wrote it.
#[derive(Debug, Clone, PartialEq)]
pub enum Burnt {
    /// `subject` is what the atom works on, as `subjectKey` writes it.
    Atom { canonical: String, children: Vec<Burnt>, unburned: bool, via: Option<String>, blended: bool, subject: String },
    Literal(Option<String>),
    Text(Option<String>),
    Raw,
    Logic(String),
}

impl Burnt {
    fn canonical(&self) -> Option<&str> {
        match self {
            Burnt::Atom { canonical, .. } => Some(canonical),
            _ => None,
        }
    }
    fn subject(&self) -> &str {
        match self {
            Burnt::Atom { subject, .. } => subject,
            _ => "",
        }
    }
    fn children(&self) -> &[Burnt] {
        match self {
            Burnt::Atom { children, .. } => children,
            _ => &[],
        }
    }
}

/// `burnSame`: the same atom carrying the same operands in the same order,
/// or the same literal. Two leaves that are neither — a raw fence, a logic
/// block — have no canonical and no children, and read as the same.
pub fn burn_same(a: &Burnt, b: &Burnt) -> bool {
    if let (Burnt::Literal(x), _) | (_, Burnt::Literal(x)) = (a, b) {
        let _ = x;
        return matches!((a, b), (Burnt::Literal(x), Burnt::Literal(y)) if x == y);
    }
    if a.canonical() != b.canonical() {
        return false;
    }
    let (ac, bc) = (a.children(), b.children());
    ac.len() == bc.len() && ac.iter().zip(bc).all(|(x, y)| burn_same(x, y))
}

/// `injectSubject`: the operands become the first children of the formula's
/// head command, and an operand the formula also produces is written once.
pub fn inject_subject(mut body: Vec<Burnt>, operands: Vec<Burnt>) -> Vec<Burnt> {
    if operands.is_empty() {
        return body;
    }
    for b in body.iter_mut() {
        if let Burnt::Atom { canonical, children, .. } = b {
            if canonical.is_empty() {
                continue;
            }
            let kept: Vec<Burnt> = std::mem::take(children).into_iter().filter(|k| !operands.iter().any(|o| burn_same(o, k))).collect();
            *children = operands.into_iter().chain(kept).collect();
            return body;
        }
    }
    operands.into_iter().chain(body).collect()
}

/// What a burn carries from call to call: `burnTruncated` and `burnBlends`.
#[derive(Debug, Default)]
pub struct Burning {
    pub truncated: bool,
    /// The blends that fired, by their place in the compiled store.
    pub blends: Vec<usize>,
}

/// The options the burn reads: its parse's, and `keepText`.
pub struct BurnOpts<'a> {
    pub parse: &'a Opts<'a>,
    pub keep_text: bool,
}

/// `subjectKey`: the subject a burnt atom works on, as a key that holds
/// `burnSame`'s equality. GLOSSARY §0.3: the human's operand is the subject of
/// the whole formula, and what is nested inside an item is a standard it works
/// against — so an atom the author wrote works on its own operands, and every
/// item a composite's formula produces works on the composite's.
pub fn subject_key(list: &[Burnt]) -> String {
    fn key(n: &Burnt) -> String {
        match n {
            Burnt::Literal(v) => format!("'{}", v.as_ref().map_or_else(|| "undefined".to_string(), |s| stringify(&Json::Str(s.clone())))),
            Burnt::Atom { canonical, children, .. } => format!("{canonical}({})", children.iter().map(key).collect::<Vec<_>>().join(",")),
            _ => "·".into(),
        }
    }
    list.iter().map(key).collect::<Vec<_>>().join(",")
}

/// `applyBlends`: co-occurrence over the atoms of one list becomes the
/// richer element the store names.
pub fn apply_blends(list: Vec<Burnt>, compiled: Option<&Compiled>, st: &mut Burning) -> Vec<Burnt> {
    let Some(comp) = compiled else { return list };
    if comp.blends.is_empty() || list.is_empty() {
        return list;
    }
    let mut out = list;
    for (i, b) in comp.blends.iter().enumerate() {
        /* `scope: "sameTarget"` is checked (decided 2026-09-27): the atoms fuse
           when they work on one subject, and different subjects burn as
           separate commands */
        let in_when = |n: &Burnt| n.canonical().is_some_and(|c| b.when.iter().any(|w| w == c));
        let mut subjects: Vec<String> = Vec::new();
        for n in out.iter().filter(|n| in_when(n)) {
            if !subjects.iter().any(|s| s == n.subject()) {
                subjects.push(n.subject().to_string());
            }
        }
        for s in subjects {
            let present = b.when.iter().all(|c| out.iter().any(|n| n.canonical() == Some(c.as_str()) && n.subject() == s));
            if !present {
                continue;
            }
            let mut kids: Vec<Burnt> = Vec::new();
            let mut kept: Vec<Burnt> = Vec::new();
            for n in out {
                if in_when(&n) && n.subject() == s {
                    kids.extend(n.children().iter().cloned());
                } else {
                    kept.push(n);
                }
            }
            if !st.blends.contains(&i) {
                st.blends.push(i);
            }
            kept.push(Burnt::Atom { canonical: b.emit.clone(), children: kids, unburned: false, via: None, blended: true, subject: s });
            out = kept;
        }
    }
    out
}

fn body_of(tree: &Tree<Extra>) -> Vec<Id> {
    tree.segments.iter().flat_map(|s| s.children.iter().copied()).collect()
}

/// `burnList(list, opts, chain, depth, subject)`: `subject`, when given, is the
/// subject every item of this list works on — the list is a composite's
/// formula, and its items are the composite's.
#[allow(clippy::too_many_arguments)]
pub fn burn_list(tree: &Tree<Extra>, list: &[Id], o: &BurnOpts, compiled: Option<&Compiled>, chain: &[String], depth: usize,
                 subject: Option<&str>, st: &mut Burning) -> Result<Vec<Burnt>, Thrown> {
    let mut out: Vec<Burnt> = Vec::new();
    /* announced rather than survived: a burn that stops silently is the
       defect this release exists to remove */
    if depth > LIMITS.ast_depth {
        st.truncated = true;
        return Ok(out);
    }
    let ctx = o.parse.ctx;
    for &id in list {
        let nd = &tree.nodes[id];
        if nd.is_literal() {
            if nd.form.as_deref() != Some("raw") {
                out.push(Burnt::Literal(nd.v.clone()));
            }
            continue;
        }
        if nd.text == Some(true) {
            if o.keep_text {
                out.push(Burnt::Text(nd.v.clone()));
            }
            continue;
        }
        if nd.mode.as_deref().is_some_and(|m| !m.is_empty()) || nd.is_template() {
            out.extend(burn_list(tree, &nd.children, o, compiled, chain, depth + 1, subject, st)?);
            continue;
        }
        if nd.raw_fence == Some(true) {
            out.push(Burnt::Raw);
            continue;
        }
        if let Some(name) = &nd.logic {
            out.push(Burnt::Logic(name.clone()));
            continue;
        }
        let Some(canonical) = nd.canonical.clone().filter(|c| !c.is_empty()) else { continue };
        let e = entry_of(&canonical, ctx);
        /* the arguments first: an operand is not part of the formula it is
           passed to, so it must not inherit that formula's chain */
        let operands = burn_list(tree, &nd.children, o, compiled, chain, depth + 1, None, st)?;
        let own = subject.map_or_else(|| subject_key(&operands), str::to_string);
        if e.is_none_or(|e| e.get("species").and_then(Json::str) == Some("atom")) {
            out.push(Burnt::Atom { canonical, children: operands, unburned: false, via: None, blended: false, subject: own });
            continue;
        }
        let key = canonical.to_uppercase();
        if chain.contains(&key) || chain.len() >= BURN_LIMIT {
            let via = [chain, &[key.clone()]].concat().join(" → ");
            out.push(Burnt::Atom { canonical: key, children: operands, unburned: true, via: Some(via), blended: false, subject: own });
            continue;
        }
        /* a formula is a definition, not a request: it reads the composition
           table and nothing the Order loaded */
        /* parse takes what is not a string as tokens: none is a TypeError,
           and any other value is a list the parser finds nothing in */
        let formula = match e.and_then(|e| e.get("formula")) {
            None => return Err(Thrown("Cannot read properties of undefined (reading 'length')".into())),
            Some(Json::Null) => return Err(Thrown("Cannot read properties of null (reading 'length')".into())),
            Some(Json::Str(f)) => f.clone(),
            Some(_) => String::new(),
        };
        let fctx = Context::shared(None, None, ctx.expansions.clone());
        let sub = parse(&formula, &Opts { ctx: &fctx, session: o.parse.session, valency: false, en: false, expanding: Vec::new(),
                                          registered: o.parse.registered, inherited: &[] })?;
        let next = [chain, &[key]].concat();
        let burned = burn_list(&sub.tree, &body_of(&sub.tree), o, compiled, &next, 0, Some(&own), st)?;
        out.extend(inject_subject(burned, operands));
    }
    Ok(apply_blends(out, compiled, st))
}

/// A burnt segment.
#[derive(Debug, Clone, PartialEq)]
pub struct BurntSegment {
    pub children: Vec<Burnt>,
    pub is_return: bool,
    pub breaks: usize,
}

/// `burn(segments, opts)`: the tree reduced to hieroglyphs.
pub fn burn(tree: &Tree<Extra>, o: &BurnOpts, st: &mut Burning) -> Result<Vec<BurntSegment>, Thrown> {
    let compiled = o.parse.ctx.rules.as_ref().map(compiled_of);
    tree.segments.iter().map(|sg| Ok(BurntSegment {
        children: burn_list(tree, &sg.children, o, compiled.as_deref(), &[], 0, None, st)?, is_return: sg.is_return, breaks: sg.breaks,
    })).collect()
}

/// `hgmlLit`: `'`, `]` and line breaks fold, since nothing survives them.
pub fn hgml_lit(v: Option<&str>) -> String {
    let t = v.unwrap_or("").replace('\'', "\u{2019}").replace(']', ")");
    let mut out = String::new();
    let mut run = false;
    for c in t.chars() {
        if js_space(c) {
            if !run {
                out.push(' ');
            }
            run = true;
        } else {
            out.push(c);
            run = false;
        }
    }
    js_trim(&out)
}

/// `hgmlLines`: every tag opens without `]` and closes with `[/name]`.
pub fn hgml_lines(list: &[Burnt], d: usize, l: &mut Vec<String>) {
    let pad = |d: usize| "  ".repeat(d.min(LIMITS.indent));
    for nd in list {
        match nd {
            Burnt::Literal(v) | Burnt::Text(v) => l.push(format!("{}'{}'", pad(d), hgml_lit(v.as_deref()))),
            Burnt::Raw => l.push(format!("{}[raw[/raw]", pad(d))),
            Burnt::Logic(name) => {
                l.push(format!("{}[logic{}[/logic]", pad(d), if name.is_empty() { String::new() } else { format!("-{name}") }))
            }
            Burnt::Atom { canonical, children, .. } => {
                let name = if canonical.is_empty() { "?".to_string() } else { canonical.to_lowercase() };
                if children.is_empty() {
                    l.push(format!("{}[{name}[/{name}]", pad(d)));
                } else {
                    l.push(format!("{}[{name}", pad(d)));
                    hgml_lines(children, d + 1, l);
                    l.push(format!("{}[/{name}]", pad(d)));
                }
            }
        }
    }
}

/// `toHGML(src, opts)`: human → glyph → .hgml, in one call.
pub fn to_hgml(src: &str, o: &BurnOpts) -> Result<String, Thrown> {
    let ctx = o.parse.ctx;
    if expansion_registry(ctx).is_none() {
        return Ok("# sem tabela de composição: carregue expansions.json (useExpansions)".into());
    }
    let mut st = Burning::default();
    let p = parse(src, o.parse)?;
    let segments = burn(&p.tree, o, &mut st)?;
    let mut l: Vec<String> = Vec::new();
    for (i, sg) in segments.iter().enumerate() {
        /* `;;` keeps its mark between two blocks, where `;` writes the blank
           line, so the burn carries what the tree carries (O4, decided
           2026-10-25, in the Rust only: the JS writes the blank line for both
           until it leaves) */
        if i > 0 {
            l.push(if segments[i - 1].breaks > 0 { ";;".into() } else { String::new() });
        }
        hgml_lines(&sg.children, 0, &mut l);
    }
    /* the burn that used a blend declares it, so the output explains itself
       to a reader who does not have rules.json */
    if !st.blends.is_empty() {
        let compiled = ctx.rules.as_ref().map(compiled_of).expect("a blend fired, so the store is loaded");
        let mut decl = vec!["# patterns applied to this burn:".to_string()];
        for &i in &st.blends {
            let b = &compiled.blends[i];
            decl.push(format!("#   [{}  <- {}  {}", b.emit, b.when.join(" + "), b.means));
        }
        decl.push("#".into());
        l = decl.into_iter().chain(l).collect();
    }
    if st.truncated {
        l.insert(0, format!("# truncated at {} levels — this burn is incomplete.", LIMITS.ast_depth));
    }
    Ok(l.join("\n"))
}
