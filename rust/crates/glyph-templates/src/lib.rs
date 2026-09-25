//! glyph-templates — Port of `scripts/core/templates.js` — the oracle. The JS module's own summary:
//!
//!   a preset expanded into the tree, and the shape it promised.
//!
//! EMS-001 ORD-0006. `expand_invocations` replaces each `[--name …]` with the
//! template's body, holes bound to what the author supplied, and
//! `check_template_constraints` asks whether the result keeps the shape the
//! template declared. The body is Glyph, so expanding it means parsing it: the
//! parser hands itself in as `parse`, as the JS parser hands itself in as
//! `parseFn`, and the crate graph stays a DAG.
//!
//! The JS answers some names through `Object.prototype`, and so does the port
//! (EMS-001/RETURN.md, ORD-0006): a hole named `constructor` that no call fills
//! by name is filled with the text of the function `Object`; a template whose
//! lower-case name the prototype holds never expands; and a param written as a
//! string is a repeat param, because `"x".repeat` is `String.prototype.repeat`.

use glyph_stores::{Context, Value};
use glyph_util::json::number;
use glyph_util::tree::{Diag, Id, Node, Thrown, Tree};
use glyph_util::{esc, inherited, inherited_text};

/// `String(v)`; `None` is `undefined`.
fn js_string(v: Option<&Value>) -> String {
    match v {
        None => "undefined".into(),
        Some(Value::Null) => "null".into(),
        Some(Value::Bool(b)) => b.to_string(),
        Some(Value::Num(n)) => number(*n),
        Some(Value::Str(s)) => s.clone(),
        Some(Value::Arr(a)) => a.iter().map(|x| match x {
            Value::Null => String::new(),
            x => js_string(Some(x)),
        }).collect::<Vec<_>>().join(","),
        Some(Value::Obj(_)) => "[object Object]".into(),
    }
}
/// `esc(v)`: null and absence read as the empty string.
fn esc_v(v: Option<&Value>) -> String {
    match v {
        None | Some(Value::Null) => String::new(),
        v => esc(&js_string(v)),
    }
}
fn truthy(v: Option<&Value>) -> Option<&Value> {
    v.filter(|v| v.truthy())
}

/// `registry[String(name).toLowerCase()] || registry[name]`: a key the
/// prototype holds answers before the name as written is tried, and it has no
/// body and no constraints.
fn definition<'a>(registry: &'a Value, name: &str) -> Option<&'a Value> {
    for key in [name.to_lowercase(), name.to_string()] {
        match registry.get(&key) {
            Some(d) if d.truthy() => return Some(d),
            None if inherited(&key) => return None,
            _ => {}
        }
    }
    None
}

/// A param as `p.name || p` names it: its text, and whether the JS compares
/// it as a string — a hole's name only ever equals a string param.
#[derive(Debug, Clone, PartialEq)]
pub struct Param {
    pub text: String,
    pub is_str: bool,
    pub truthy: bool,
}

impl Param {
    fn of(p: &Value) -> Param {
        let v = p.get("name").filter(|n| n.truthy()).unwrap_or(p);
        Param { text: js_string(Some(v)), is_str: matches!(v, Value::Str(_)), truthy: v.truthy() }
    }
}

/// `p && p.repeat`: an object's own `repeat`, and every non-empty string,
/// which answers with `String.prototype.repeat`.
fn repeats(p: &Value) -> bool {
    match p {
        Value::Str(s) => !s.is_empty(),
        Value::Obj(_) => p.get("repeat").is_some_and(Value::truthy),
        _ => false,
    }
}

/// What a named fill holds: one value, or the values of a repeat.
#[derive(Debug, Clone, PartialEq)]
pub enum Fill {
    One(Option<String>),
    Many(Vec<Option<String>>),
}

/// What an invocation supplied. `named` is a plain object in the JS, and
/// answers for the prototype's names as one; a value `None` is `undefined`.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct Fills {
    pub named: Vec<(String, Fill)>,
    pub positional: Vec<Option<String>>,
    pub extra: Vec<Id>,
    /// A non-literal argument with a literal after it: it displaced one.
    pub slid: Vec<(Id, usize)>,
}

enum Got<'a> {
    Own(&'a Fill),
    Inherited(String),
    Absent,
}

impl Fills {
    fn own(&self, key: &str) -> Option<&Fill> {
        self.named.iter().find(|(k, _)| k == key).map(|(_, f)| f)
    }
    /// `key in named`.
    fn has(&self, key: &str) -> bool {
        self.own(key).is_some() || inherited(key)
    }
    /// `named[key]`.
    fn get(&self, key: &str) -> Got<'_> {
        match self.own(key) {
            Some(f) => Got::Own(f),
            None if inherited(key) => Got::Inherited(inherited_text(key)),
            None => Got::Absent,
        }
    }
}

/// `phName`: the raw name of the hole's slot-name child.
pub fn ph_name<X>(tree: &Tree<X>, id: Id) -> Option<String> {
    tree.nodes[id].children.iter().find(|&&c| tree.nodes[c].slot_name == Some(true))
        .map(|&c| tree.nodes[c].raw.clone().unwrap_or_else(|| "undefined".into()))
}

fn is_ph<X>(tree: &Tree<X>, id: Id) -> bool {
    tree.nodes[id].canonical.as_deref() == Some("PH")
}

/// `collectFills(inv, repeatName)`.
pub fn collect_fills<X>(tree: &Tree<X>, inv: Id, repeat: Option<&Param>) -> Result<Fills, Thrown> {
    let mut f = Fills::default();
    let mut slid = Vec::new();
    let repeat_key = repeat.filter(|r| r.truthy).map(|r| r.text.to_lowercase());
    for &c in &tree.nodes[inv].children {
        if is_ph(tree, c) {
            if let Some(nm) = ph_name(tree, c).filter(|n| !n.is_empty()) {
                let lit = tree.nodes[c].children.iter().find(|&&k| tree.nodes[k].is_literal());
                let val = match lit {
                    Some(&k) => tree.nodes[k].v.clone(),
                    None => Some(String::new()),
                };
                let key = nm.to_lowercase();
                if repeat_key.as_deref() == Some(key.as_str()) {
                    match f.named.iter_mut().find(|(k, _)| *k == key) {
                        Some((_, Fill::Many(vals))) => vals.push(val),
                        Some((_, Fill::One(Some(v)))) if !v.is_empty() =>
                            return Err(Thrown("named[key].push is not a function".into())),
                        Some((_, one)) => *one = Fill::Many(vec![val]),
                        None if inherited(&key) => return Err(Thrown("named[key].push is not a function".into())),
                        None => f.named.push((key, Fill::Many(vec![val]))),
                    }
                } else if key != "__proto__" {
                    /* a string assigned to `__proto__` is dropped by the JS setter */
                    match f.named.iter_mut().find(|(k, _)| *k == key) {
                        Some((_, fill)) => *fill = Fill::One(val),
                        None => f.named.push((key, Fill::One(val))),
                    }
                }
                continue;
            }
        }
        if tree.nodes[c].is_literal() {
            f.positional.push(tree.nodes[c].v.clone());
            continue;
        }
        f.extra.push(c);
        slid.push((c, f.positional.len() + 1));
    }
    /* only what has a literal after it slid: the rest is surplus content */
    f.slid = slid.into_iter().filter(|&(_, at)| at <= f.positional.len()).collect();
    Ok(f)
}

/// What `valueFor` answers: a value to bind, or nothing to bind.
fn value_for(fills: &Fills, order: &[&Param], name: &str) -> Option<String> {
    let k = name.to_lowercase();
    if fills.has(&k) {
        return match fills.get(&k) {
            Got::Own(Fill::One(v)) => v.clone(),
            Got::Own(Fill::Many(vals)) => vals.first().cloned().flatten(),
            Got::Inherited(text) => Some(text),
            Got::Absent => None,
        };
    }
    let at = order.iter().position(|p| p.is_str && p.text == name)?;
    fills.positional.get(at).cloned().flatten()
}

fn bound<X: Clone + Default>(tree: &mut Tree<X>, v: String, slot: String) -> Id {
    tree.add(Node { literal: Some(true), v: Some(v), form: Some("quote".into()), bound_slot: Some(slot), ..Default::default() })
}

/// `bindHoles(nodes, fills, params, repeatName)`: each hole replaced by what
/// fills it, at any depth; a hole nothing fills stays. Iterative, since a body
/// is as deep as its author wrote it.
pub fn bind_holes<X: Clone + Default>(tree: &mut Tree<X>, nodes: &[Id], fills: &Fills, params: &[Param],
                                      repeat: Option<&Param>) -> Result<Vec<Id>, Thrown> {
    let order: Vec<&Param> = params.iter()
        .filter(|p| repeat.is_none_or(|r| *p != r) && !fills.has(&p.text.to_lowercase())).collect();
    let repeat_low = repeat.filter(|r| r.truthy).map(|r| r.text.to_lowercase());
    struct Frame {
        list: Vec<Id>,
        at: usize,
        out: Vec<Id>,
        owner: Option<Id>,
    }
    let mut stack = vec![Frame { list: nodes.to_vec(), at: 0, out: Vec::new(), owner: None }];
    loop {
        let top = stack.last_mut().expect("the frame of the body");
        if top.at == top.list.len() {
            let done = stack.pop().expect("the frame just read");
            match (done.owner, stack.last_mut()) {
                (Some(owner), Some(up)) => {
                    tree.nodes[owner].children = done.out;
                    up.out.push(owner);
                }
                _ => return Ok(done.out),
            }
            continue;
        }
        let nd = top.list[top.at];
        top.at += 1;
        if is_ph(tree, nd) {
            let nm = ph_name(tree, nd).filter(|n| !n.is_empty());
            if let (Some(nm), Some(rk)) = (&nm, &repeat_low) {
                if nm.to_lowercase() == *rk {
                    let vals = match fills.get(rk) {
                        Got::Own(Fill::Many(vals)) => vals.clone(),
                        Got::Own(Fill::One(None)) | Got::Absent => Vec::new(),
                        Got::Own(Fill::One(Some(v))) if v.is_empty() => Vec::new(),
                        Got::Own(Fill::One(Some(_))) | Got::Inherited(_) =>
                            return Err(Thrown("vals.forEach is not a function".into())),
                    };
                    for (idx, v) in vals.into_iter().enumerate() {
                        let Some(v) = v.filter(|v| !v.is_empty()) else { continue };
                        let slot = if idx > 0 { format!("{nm}{}", idx + 1) } else { nm.clone() };
                        let lit = bound(tree, v, slot);
                        stack.last_mut().expect("the frame being read").out.push(lit);
                    }
                    continue;
                }
            }
            if let Some(nm) = nm {
                if let Some(v) = value_for(fills, &order, &nm).filter(|v| !v.is_empty()) {
                    let lit = bound(tree, v, nm);
                    stack.last_mut().expect("the frame being read").out.push(lit);
                    continue;
                }
            }
        }
        if tree.nodes[nd].children.is_empty() {
            stack.last_mut().expect("the frame being read").out.push(nd);
        } else {
            let list = tree.nodes[nd].children.clone();
            stack.push(Frame { list, at: 0, out: Vec::new(), owner: Some(nd) });
        }
    }
}

/// What the expander hands `parse` for a body: the JS passes
/// `{ session, valency: false, templates: registry, _expanding }`, and no
/// rules and no expansions — the parse falls back to what is registered.
pub struct SubParse<'a> {
    pub session: bool,
    pub valency: bool,
    pub templates: &'a Value,
    pub expanding: Vec<String>,
}

/// What `parse` answers for a body: its tree and its diagnostics.
pub struct Parsed<X> {
    pub tree: Tree<X>,
    pub gaps: Vec<Diag>,
}

/// `expandInvocations(segments, opts, G, parseFn)`. `session` and `expanding`
/// are what the JS reads off `opts`: `opts.session` passed on, and
/// `opts._expanding`, the templates being expanded around this parse.
pub fn expand_invocations<X: Clone + Default>(
    tree: &mut Tree<X>, ctx: &Context, session: bool, expanding: &[String], g: &mut dyn FnMut(Diag),
    parse: &mut dyn FnMut(&str, SubParse) -> Result<Parsed<X>, Thrown>,
) -> Result<(), Thrown> {
    let registry = &ctx.templates;
    let invocations: Vec<Id> = tree.segments.iter().flat_map(|sg| tree.walk(&sg.children))
        .filter(|&id| tree.nodes[id].is_template() && tree.nodes[id].is_def != Some(true)).collect();

    for inv in invocations {
        let name = tree.nodes[inv].template.clone().unwrap_or_default();
        let key = name.to_lowercase();
        let Some(def) = definition(registry, &name) else { continue };
        let Some(body) = truthy(def.get("body")) else { continue };
        let tpl = esc(&name);

        if expanding.contains(&key) {
            let chain = esc(&[expanding, &[key]].concat().join(" → "));
            g(Diag::new("fix", "ciclo",
                        format!("<code>[--{tpl}</code> se expande dentro de si mesmo ({chain}). Expansão interrompida."), "TemplateCycle")
                .en("cycle", format!("<code>[--{tpl}</code> expands inside itself ({chain}). Expansion stopped.")));
            continue;
        }

        let sub = parse(&js_string(Some(body)), SubParse {
            session, valency: false, templates: registry, expanding: [expanding, &[key]].concat(),
        })?;
        /* the body's own syntax errors bubble up: the outer passes run over the
           expanded tree and do not raise them again; `ask` and `note` do */
        for d in sub.gaps.iter().filter(|d| d.sev == "fix") {
            g(Diag::new(&d.sev, &d.lab, format!("no corpo de <code>[--{tpl}</code>: {}", d.msg), &d.code));
        }
        let body = tree.graft(sub.tree);

        let raw_params = def.get("params").and_then(Value::arr).unwrap_or(&[]);
        let params: Vec<Param> = raw_params.iter().map(Param::of).collect();
        let repeat = raw_params.iter().find(|p| repeats(p)).map(Param::of);
        let fills = collect_fills(tree, inv, repeat.as_ref())?;
        let shown = esc(&params.iter().map(|p| format!("`{}`", p.text)).collect::<Vec<_>>().join(","));
        for &(node, at) in &fills.slid {
            let nd = &tree.nodes[node];
            let what = esc(&[&nd.canonical, &nd.template].into_iter().flatten().find(|s| !s.is_empty())
                .map_or("?".to_string(), |s| s.to_lowercase()));
            g(Diag::new("fix", "parâmetro não é literal",
                        format!("o {at}º parâmetro de <code>[--{tpl}</code> recebeu <code>[{what}</code>. \
                                 Parâmetro de molde é sempre literal: <code>[--{tpl}{shown}]</code>."), "TemplateParamNotLiteral")
                .en("parameter is not a literal",
                    format!("argument {at} of <code>[--{tpl}</code> got <code>[{what}</code>. \
                             A template parameter is always a literal: <code>[--{tpl}{shown}]</code>.")));
        }

        let mut children = bind_holes(tree, &body, &fills, &params, repeat.as_ref())?;
        children.extend(&fills.extra);
        tree.reparent(&children, inv);
        let node = &mut tree.nodes[inv];
        node.children = children;
        node.expanded = Some(true);
        node.gloss = Some(glyph_util::tree::Gloss::Text(truthy(def.get("gloss")).map_or(String::new(), |g| js_string(Some(g)))));
    }
    Ok(())
}

/// `constraintNames(rulesStore, spec)`: a class resolves through the rules
/// store, a bare name is itself, upper-cased. A class with no store names
/// nothing, and the constraint does not fire.
pub fn constraint_names(rules: Option<&Value>, spec: &Value) -> Result<Vec<String>, Thrown> {
    let items: Vec<&Value> = match spec {
        Value::Arr(a) => a.iter().collect(),
        v => vec![v],
    };
    let mut out = Vec::new();
    for n in items {
        let text = js_string(Some(n));
        let Some(class) = text.strip_prefix('@') else {
            out.push(text.to_uppercase());
            continue;
        };
        let classes = rules.and_then(|r| truthy(r.get("classes")));
        match classes.and_then(|c| c.get(class)) {
            Some(Value::Arr(a)) => out.extend(a.iter().map(|x| js_string(Some(x)).to_uppercase())),
            Some(v) if v.truthy() => return Err(Thrown("cls.forEach is not a function".into())),
            None if inherited(class) => return Err(Thrown("cls.forEach is not a function".into())),
            _ => {}
        }
    }
    Ok(out)
}

/// `checkTemplateConstraints(segments, opts, G)`.
pub fn check_template_constraints<X: Clone>(tree: &Tree<X>, ctx: &Context, g: &mut dyn FnMut(Diag)) -> Result<(), Thrown> {
    let registry = &ctx.templates;
    let rules = ctx.rules.as_ref();
    let exempt: Vec<String> = match rules.and_then(|r| truthy(r.get("scope"))).and_then(|s| truthy(s.get("exemptUnder"))) {
        Some(Value::Arr(a)) => a.iter().map(|x| js_string(Some(x))).collect(),
        Some(_) => Vec::new(),
        None => vec!["OVR".into(), "BYP".into()],
    };
    let n = |id: Id| &tree.nodes[id];
    let canon = |id: Id| n(id).canonical.clone().unwrap_or_else(|| "undefined".into());

    /* the walk of checkRules' underExempt, stopping at the template node: an
       [ovr] around the whole invocation says nothing about its inside */
    let exempt_within = |id: Id, stop: Id| {
        let (mut p, mut hops) = (n(id).parent, 0);
        while let Some(pid) = p {
            if pid == stop {
                break;
            }
            hops += 1;
            if hops > 64 {
                break;
            }
            if exempt.contains(&canon(pid)) || inherited(&canon(pid)) {
                return true;
            }
            p = n(pid).parent;
        }
        false
    };

    for sg in &tree.segments {
        for inv in tree.walk(&sg.children) {
            if !n(inv).is_template() || n(inv).expanded != Some(true) {
                continue;
            }
            let def = definition(registry, n(inv).template.as_deref().unwrap_or_default());
            let Some(cons) = def.and_then(|d| truthy(d.get("constraints"))).and_then(Value::arr) else { continue };
            if cons.is_empty() {
                continue;
            }
            let inside: Vec<Id> = tree.walk(&n(inv).children).into_iter().filter(|&id| n(id).is_canonical()).collect();
            for c in cons {
                let Some(forbid) = truthy(c.get("forbid")) else { continue };
                let names = constraint_names(rules, forbid)?;
                let Some(&nd) = inside.iter().find(|&&nd| {
                    (names.contains(&canon(nd)) || inherited(&canon(nd))) && !exempt_within(nd, inv)
                }) else { continue };
                let why = truthy(c.get("why")).map_or(String::new(), |w| format!(" — {}", esc_v(Some(w))));
                let suggest = truthy(c.get("suggest")).map_or(String::new(), |s| format!(" <em>Sugestão: {}.</em>", esc_v(Some(s))));
                g(Diag::new(&truthy(c.get("severity")).map_or("ask".into(), |s| js_string(Some(s))),
                            &truthy(c.get("label")).map_or("fora do trilho".into(), |l| js_string(Some(l))),
                            format!("<code>[{}</code> dentro de <code>[--{}</code>{why}.{suggest} Se a saída for proposital, \
                                     marque com <code>[ovr</code>.", esc(&canon(nd).to_lowercase()), esc(n(inv).template.as_deref().unwrap_or_default())),
                            &format!("TemplateConstraint:{}", js_string(c.get("id")))));
            }
        }
    }
    Ok(())
}
