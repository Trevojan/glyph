//! glyph-templates — Port of `scripts/core/templates.js` — the oracle. The JS module's own summary:
//!
//!   a template expanded into the tree, and the shape it promised.
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

use glyph_stores::Context;
use glyph_json::Json;
use glyph_json::number;
use glyph_util::tree::{Diag, Id, Node, Thrown, Tree};
use glyph_util::{esc, inherited, inherited_text, js_trim};
use std::sync::Arc;

/// `String(v)`; `None` is `undefined`.
fn js_string(v: Option<&Json>) -> String {
    match v {
        None => "undefined".into(),
        Some(Json::Null) => "null".into(),
        Some(Json::Bool(b)) => b.to_string(),
        Some(Json::Num(n)) => number(*n),
        Some(Json::Str(s)) => s.clone(),
        Some(Json::Arr(a)) => a.iter().map(|x| match x {
            Json::Null => String::new(),
            x => js_string(Some(x)),
        }).collect::<Vec<_>>().join(","),
        Some(Json::Obj(_)) => "[object Object]".into(),
    }
}
/// `esc(v)`: null and absence read as the empty string.
fn esc_v(v: Option<&Json>) -> String {
    match v {
        None | Some(Json::Null) => String::new(),
        v => esc(&js_string(v)),
    }
}
fn truthy(v: Option<&Json>) -> Option<&Json> {
    v.filter(|v| v.truthy())
}

/// `registry[String(name).toLowerCase()] || registry[name]`: a key the
/// prototype holds answers before the name as written is tried, and it has no
/// body and no constraints.
fn definition<'a>(registry: &'a Json, name: &str) -> Option<&'a Json> {
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
    fn of(p: &Json) -> Param {
        let v = p.get("name").filter(|n| n.truthy()).unwrap_or(p);
        Param { text: js_string(Some(v)), is_str: matches!(v, Json::Str(_)), truthy: v.truthy() }
    }
}

/// `p && p.repeat`: an object's own `repeat`, and every non-empty string,
/// which answers with `String.prototype.repeat`.
fn repeats(p: &Json) -> bool {
    match p {
        Json::Str(s) => !s.is_empty(),
        Json::Obj(_) => p.get("repeat").is_some_and(Json::truthy),
        _ => false,
    }
}

/// What a named fill holds: one value, or the values of a repeat.
#[derive(Debug, Clone, PartialEq)]
pub enum Fill {
    One(Option<String>),
    Many(Vec<Option<String>>),
}

/// One named fill, the whole bracket (`fills[i]` in the JS). `kids` is what
/// it holds past its binder — for a hole filled twice, what both held, in
/// order. Its value is the first literal (`lit`); `carried` is the rest. A
/// fill of the repeatable hole is one more value, and keeps its place among
/// the repeats (`idx`).
#[derive(Debug, Clone, Default, PartialEq)]
pub struct NamedFill {
    pub key: String,
    pub name: String,
    pub kids: Vec<Id>,
    pub lit: Option<Id>,
    pub carried: Vec<Id>,
    pub idx: Option<usize>,
    pub used: bool,
}

/// One argument in written order (`items` in the JS): a named fill, a
/// literal with its position, or anything else.
#[derive(Debug, Clone, PartialEq)]
pub enum Item {
    Fill(usize),
    Pos(usize, Id),
    Node(Id),
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
    /// A bare word among the arguments, with its position as written —
    /// literals and bare words counted in order.
    pub bare: Vec<(Id, usize)>,
    /// Every named fill, in written order.
    pub entries: Vec<NamedFill>,
    /// Every argument, in written order: the order what no hole takes keeps
    /// when it lands after the body.
    pub items: Vec<Item>,
    /// `fills.usedPos`: the positional literals a hole took.
    pub used_pos: Vec<usize>,
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

/// `collectFills(inv, repeatName)`. A second fill for one hole is more of
/// the first — `[ph-x'a'][ph-x'b']` reads as `[ph-x'a''b']` — so the hole
/// binds the first value; a fill of the repeatable hole is one more value.
pub fn collect_fills<X>(tree: &Tree<X>, inv: Id, repeat: Option<&Param>) -> Result<Fills, Thrown> {
    let mut f = Fills::default();
    let mut slid = Vec::new();
    let mut written = 0;
    let repeat_key = repeat.filter(|r| r.truthy).map(|r| r.text.to_lowercase());
    for &c in &tree.nodes[inv].children {
        if is_ph(tree, c) {
            if let Some(nm) = ph_name(tree, c).filter(|n| !n.is_empty()) {
                let key = nm.to_lowercase();
                /* what the bracket holds past its `-name` binder */
                let kids: Vec<Id> = tree.nodes[c].children.iter().copied().filter(|&k| tree.nodes[k].slot_name != Some(true)).collect();
                if repeat_key.as_deref() == Some(key.as_str()) {
                    let lit = kids.iter().copied().find(|&k| tree.nodes[k].is_literal());
                    let val = match lit {
                        Some(k) => tree.nodes[k].v.clone(),
                        None => Some(String::new()),
                    };
                    let idx = match f.named.iter_mut().find(|(k, _)| *k == key) {
                        Some((_, Fill::Many(vals))) => {
                            vals.push(val);
                            vals.len() - 1
                        }
                        Some((_, Fill::One(Some(v)))) if !v.is_empty() =>
                            return Err(Thrown("named[key].push is not a function".into())),
                        Some((_, one)) => {
                            *one = Fill::Many(vec![val]);
                            0
                        }
                        None if inherited(&key) => return Err(Thrown("named[key].push is not a function".into())),
                        None => {
                            f.named.push((key.clone(), Fill::Many(vec![val])));
                            0
                        }
                    };
                    let carried = kids.iter().copied().filter(|&k| Some(k) != lit).collect();
                    f.entries.push(NamedFill { key, name: nm, lit, carried, idx: Some(idx), ..Default::default() });
                    f.items.push(Item::Fill(f.entries.len() - 1));
                } else if let Some(same) = f.entries.iter_mut().find(|e| e.key == key && e.idx.is_none()) {
                    same.kids.extend(kids);
                } else {
                    f.entries.push(NamedFill { key, name: nm, kids, ..Default::default() });
                    f.items.push(Item::Fill(f.entries.len() - 1));
                }
                continue;
            }
        }
        if tree.nodes[c].is_literal() {
            f.positional.push(tree.nodes[c].v.clone());
            f.items.push(Item::Pos(f.positional.len() - 1, c));
            written += 1;
            continue;
        }
        if tree.nodes[c].text == Some(true) && !js_trim(tree.nodes[c].v.as_deref().unwrap_or("")).is_empty() {
            written += 1;
            f.bare.push((c, written));
        }
        f.extra.push(c);
        f.items.push(Item::Node(c));
        slid.push((c, f.positional.len() + 1));
    }
    for e in f.entries.iter_mut().filter(|e| e.idx.is_none()) {
        e.lit = e.kids.iter().copied().find(|&k| tree.nodes[k].is_literal());
        e.carried = e.kids.iter().copied().filter(|&k| Some(k) != e.lit).collect();
        let val = match e.lit {
            Some(k) => tree.nodes[k].v.clone(),
            None => Some(String::new()),
        };
        /* a string assigned to `__proto__` is dropped by the JS setter */
        if e.key != "__proto__" {
            match f.named.iter_mut().find(|(k, _)| *k == e.key) {
                Some((_, fill)) => *fill = Fill::One(val),
                None => f.named.push((e.key.clone(), Fill::One(val))),
            }
        }
    }
    /* only what has a literal after it slid: the rest is surplus content */
    f.slid = slid.into_iter().filter(|&(_, at)| at <= f.positional.len()).collect();
    Ok(f)
}

/// What `valueFor` answers: a value to bind, or nothing to bind. A
/// positional literal a hole takes is marked taken.
fn value_for(fills: &mut Fills, order: &[&Param], name: &str) -> Option<String> {
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
    if at < fills.positional.len() {
        fills.used_pos.push(at);
    }
    fills.positional.get(at).cloned().flatten()
}

/// `takeFills`: the fills of a hole, each taken once — a hole the body names
/// twice takes the value twice and what the fill carried once, as the author
/// wrote it once.
fn take_fills(fills: &mut Fills, key: &str) -> Vec<usize> {
    let mut out = Vec::new();
    for (i, e) in fills.entries.iter_mut().enumerate() {
        if e.key == key && !e.used {
            e.used = true;
            out.push(i);
        }
    }
    out
}

/// `carriedOf`: what a fill carried past its value, each node marked with
/// the slot the value carries.
fn carried_of<X>(tree: &mut Tree<X>, fills: &Fills, entry: Option<usize>, slot: &str) -> Vec<Id> {
    let Some(i) = entry else { return Vec::new() };
    let ids = fills.entries[i].carried.clone();
    for &k in &ids {
        tree.nodes[k].bound_slot = Some(slot.to_string());
    }
    ids
}

/// `holdsMore`: a hole that holds more than its name and its question, the
/// <placeholder> glyph-xml's `hole_of` writes.
fn holds_more<X>(tree: &Tree<X>, kids: &[Id]) -> bool {
    let q = kids.iter().copied().find(|&c| tree.nodes[c].is_literal());
    kids.iter().any(|&c| tree.nodes[c].slot_name != Some(true) && Some(c) != q)
}

/// `carryInto`: in an unfilled hole that holds more, what the fill carried
/// goes in after the question, or after the name and the links written
/// straight after it.
fn carry_into<X>(tree: &Tree<X>, kids: Vec<Id>, carried: Vec<Id>) -> Vec<Id> {
    let at = match kids.iter().position(|&c| tree.nodes[c].is_literal()) {
        Some(q) => q + 1,
        None => match kids.iter().position(|&c| tree.nodes[c].slot_name == Some(true)) {
            Some(n) => {
                let mut at = n + 1;
                while at < kids.len() && tree.nodes[kids[at]].chain_element == Some(true) {
                    at += 1;
                }
                at
            }
            None => 0,
        },
    };
    let mut out = kids[..at].to_vec();
    out.extend(carried);
    out.extend_from_slice(&kids[at..]);
    out
}

fn bound<X: Clone + Default>(tree: &mut Tree<X>, v: String, slot: String) -> Id {
    tree.add(Node { literal: Some(true), v: Some(v), form: Some("quote".into()), bound_slot: Some(slot), ..Default::default() })
}

/// `bindHoles(nodes, fills, params, repeatName)`: each hole replaced by what
/// fills it, at any depth; a hole nothing fills stays. What the hole's named
/// fill carried past its value follows the value into the hole's place, or
/// follows the hole when the fill gave no value. In a hole that holds more (a
/// <placeholder>) it stays inside: [answer, …carried, …held]. Iterative, since
/// a body is as deep as its author wrote it.
pub fn bind_holes<X: Clone + Default>(tree: &mut Tree<X>, nodes: &[Id], fills: &mut Fills, params: &[Param],
                                      repeat: Option<&Param>) -> Result<Vec<Id>, Thrown> {
    let order: Vec<&Param> = params.iter()
        .filter(|p| repeat.is_none_or(|r| *p != r) && !fills.has(&p.text.to_lowercase())).collect();
    let repeat_low = repeat.filter(|r| r.truthy).map(|r| r.text.to_lowercase());
    fills.used_pos.clear();
    /* `carry` is the fill an unfilled hole is waiting to place: inside it
       when, rebuilt, it still holds more, after it when it does not */
    struct Frame {
        list: Vec<Id>,
        at: usize,
        out: Vec<Id>,
        owner: Option<Id>,
        carry: Option<(usize, String)>,
    }
    let mut stack = vec![Frame { list: nodes.to_vec(), at: 0, out: Vec::new(), owner: None, carry: None }];
    loop {
        let top = stack.last_mut().expect("the frame of the body");
        if top.at == top.list.len() {
            let done = stack.pop().expect("the frame just read");
            /* a frame with an owner always has one above it; the body's has neither */
            let Some(owner) = done.owner else { return Ok(done.out) };
            let (kids, after) = match &done.carry {
                Some((i, slot)) => {
                    let carried = carried_of(tree, fills, Some(*i), slot);
                    if holds_more(tree, &done.out) {
                        (if carried.is_empty() { done.out } else { carry_into(tree, done.out, carried) }, Vec::new())
                    } else {
                        (done.out, carried)
                    }
                }
                None => (done.out, Vec::new()),
            };
            tree.nodes[owner].children = kids;
            let up = stack.last_mut().expect("the frame above");
            up.out.push(owner);
            up.out.extend(after);
            continue;
        }
        let nd = top.list[top.at];
        top.at += 1;
        let mut carry: Option<(usize, String)> = None;
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
                    let each = take_fills(fills, rk);
                    for (idx, v) in vals.into_iter().enumerate() {
                        let slot = if idx > 0 { format!("{nm}{}", idx + 1) } else { nm.clone() };
                        if let Some(v) = v.filter(|v| !v.is_empty()) {
                            let lit = bound(tree, v, slot.clone());
                            stack.last_mut().expect("the frame being read").out.push(lit);
                        }
                        let carried = carried_of(tree, fills, each.get(idx).copied(), &slot);
                        stack.last_mut().expect("the frame being read").out.extend(carried);
                    }
                    continue;
                }
            }
            if let Some(nm) = nm {
                let value = value_for(fills, &order, &nm).filter(|v| !v.is_empty());
                let mine = take_fills(fills, &nm.to_lowercase()).first().copied();
                if let Some(v) = value {
                    let lit = bound(tree, v, nm.clone());
                    let carried = carried_of(tree, fills, mine, &nm);
                    /* a hole that held more keeps it when it is filled: the
                       answer takes the question's place, what the fill
                       carried follows it, and what the hole held stays */
                    let kids = tree.nodes[nd].children.clone();
                    let q = kids.iter().copied().find(|&c| tree.nodes[c].is_literal());
                    let held: Vec<Id> = kids.into_iter().filter(|&c| tree.nodes[c].slot_name != Some(true) && Some(c) != q).collect();
                    if held.is_empty() {
                        let out = &mut stack.last_mut().expect("the frame being read").out;
                        out.push(lit);
                        out.extend(carried);
                    } else {
                        let mut out = vec![lit];
                        out.extend(carried);
                        stack.push(Frame { list: held, at: 0, out, owner: Some(nd), carry: None });
                    }
                    continue;
                }
                carry = mine.map(|i| (i, nm));
            }
        }
        if tree.nodes[nd].children.is_empty() {
            let after = match carry {
                Some((i, slot)) => carried_of(tree, fills, Some(i), &slot),
                None => Vec::new(),
            };
            let out = &mut stack.last_mut().expect("the frame being read").out;
            out.push(nd);
            out.extend(after);
        } else {
            let list = tree.nodes[nd].children.clone();
            stack.push(Frame { list, at: 0, out: Vec::new(), owner: Some(nd), carry });
        }
    }
}

/// `leftovers`: what no hole took, in written order — the non-literal
/// arguments, the literals past every parameter, and each named fill no hole
/// names, its value and what it carried under its own name as `slot`.
pub fn leftovers<X>(tree: &mut Tree<X>, fills: &Fills) -> Vec<Id> {
    let mut out = Vec::new();
    for it in &fills.items {
        match *it {
            Item::Fill(i) => {
                let e = &fills.entries[i];
                if e.used {
                    continue;
                }
                for k in e.lit.into_iter().chain(e.carried.iter().copied()) {
                    tree.nodes[k].bound_slot = Some(e.name.clone());
                    out.push(k);
                }
            }
            Item::Pos(at, node) => {
                if !fills.used_pos.contains(&at) {
                    out.push(node);
                }
            }
            Item::Node(node) => out.push(node),
        }
    }
    out
}

/// `holesOf`: the parameters of a definition written in the source, its
/// holes in the order the body names them; a call nested in the body brings
/// its own. Each is a `{ name }` in the JS, so none is a repeat; `seen` is a
/// plain object, and `__proto__` never lands in it.
pub fn holes_of<X: Clone>(tree: &Tree<X>, list: &[Id]) -> Vec<Param> {
    let mut out: Vec<Param> = Vec::new();
    let mut stack: Vec<Id> = list.iter().rev().copied().collect();
    while let Some(id) = stack.pop() {
        if tree.nodes[id].is_template() {
            continue;
        }
        if is_ph(tree, id) {
            if let Some(nm) = ph_name(tree, id).filter(|n| !n.is_empty()) {
                let low = nm.to_lowercase();
                if low == "__proto__" || !out.iter().any(|p| p.text.to_lowercase() == low) {
                    out.push(Param { text: nm, is_str: true, truthy: true });
                }
            }
            continue;
        }
        stack.extend(tree.nodes[id].children.iter().rev());
    }
    out
}

/// A definition written in the source being parsed: its key, its node, and
/// the holes it declares.
struct SourceDef {
    key: String,
    node: Id,
    params: Vec<Param>,
}

/// A definition of the calling source handed to a body the store holds, as a
/// tree of its own: the JS hands the body its registry, which holds it.
#[derive(Debug, Clone)]
pub struct Inherited<X> {
    pub key: String,
    pub tree: Tree<X>,
    pub params: Vec<Param>,
}

/// What the expander hands `parse` for a body: the JS passes
/// `{ session, valency: false, templates: registry, _expanding }`, and no
/// rules and no expansions — the parse falls back to what is registered.
/// The registry is the caller's own store, which the body's context shares,
/// with the definitions written in the calling source over it (`inherited`).
pub struct SubParse<'a, X> {
    pub session: bool,
    pub valency: bool,
    pub templates: &'a Arc<Json>,
    pub expanding: Vec<String>,
    pub inherited: Vec<Inherited<X>>,
}

/// What `parse` answers for a body: its tree and its diagnostics.
pub struct Parsed<X> {
    pub tree: Tree<X>,
    pub gaps: Vec<Diag>,
}

/// Where a call's definition is: written in this source, handed down by the
/// source that called this body, or in the store (the entry and its body).
enum Def<'j> {
    Own(usize),
    Inherited(usize),
    Store(&'j Json, &'j Json),
}

/// What the parser hands the expander to parse a body with.
type ParseBody<'g, X> = dyn FnMut(&str, SubParse<X>) -> Result<Parsed<X>, Thrown> + 'g;

/// `expandOne` and the registry it reads: the store, the definitions this
/// source writes over it, and the ones the calling source handed down.
struct Expander<'a, 'g, X> {
    ctx: &'a Context,
    session: bool,
    inherited: &'a [Inherited<X>],
    sources: Vec<SourceDef>,
    g: &'g mut dyn FnMut(Diag),
    parse: &'g mut ParseBody<'g, X>,
}

impl<X: Clone + Default> Expander<'_, '_, X> {
    /// The registry a body the store holds is parsed with: this source's
    /// definitions, as trees of their own, and the inherited ones they do not
    /// write over.
    fn hand_down(&self, tree: &Tree<X>) -> Vec<Inherited<X>> {
        let mut out: Vec<Inherited<X>> = self.sources.iter().map(|d| Inherited {
            key: d.key.clone(), tree: tree.extract(&tree.nodes[d.node].children), params: d.params.clone(),
        }).collect();
        for h in self.inherited {
            if !out.iter().any(|o| o.key == h.key) {
                out.push(h.clone());
            }
        }
        out
    }

    /// A call the copy of a source definition holds expands here, inside this
    /// one's chain.
    fn expand_inside(&mut self, tree: &mut Tree<X>, body: &[Id], chain: &[String]) -> Result<(), Thrown> {
        let inner: Vec<Id> = tree.walk(body).into_iter().filter(|&id| {
            let n = &tree.nodes[id];
            n.is_template() && n.is_def != Some(true) && n.expanded != Some(true)
        }).collect();
        for x in inner {
            self.expand_one(tree, x, chain)?;
        }
        Ok(())
    }

    fn expand_one(&mut self, tree: &mut Tree<X>, inv: Id, chain: &[String]) -> Result<(), Thrown> {
        if tree.nodes[inv].expanded == Some(true) {
            return Ok(());
        }
        let name = tree.nodes[inv].template.clone().unwrap_or_default();
        let key = name.to_lowercase();
        let registry = &self.ctx.templates;
        let def = if let Some(i) = self.sources.iter().position(|d| d.key == key) {
            Def::Own(i)
        } else if let Some(i) = self.inherited.iter().position(|d| d.key == key) {
            Def::Inherited(i)
        } else {
            let Some(def) = definition(registry, &name) else { return Ok(()) };
            let Some(body) = truthy(def.get("body")) else { return Ok(()) };
            Def::Store(def, body)
        };
        let tpl = esc(&name);

        if chain.contains(&key) {
            let shown = esc(&[chain, &[key]].concat().join(" → "));
            (self.g)(Diag::new("fix", "ciclo",
                               format!("<code>[--{tpl}</code> se expande dentro de si mesmo ({shown}). Expansão interrompida."), "TemplateCycle")
                .en("cycle", format!("<code>[--{tpl}</code> expands inside itself ({shown}). Expansion stopped.")));
            return Ok(());
        }
        let next = [chain, &[key]].concat();

        let (body, params, repeat, gloss) = match def {
            /* the copy is already parsed: what the definition raised, it
               raised once, where it was written */
            Def::Own(i) => {
                let list = tree.nodes[self.sources[i].node].children.clone();
                let body = tree.copy_nodes(&list);
                self.expand_inside(tree, &body, &next)?;
                (body, self.sources[i].params.clone(), None, String::new())
            }
            Def::Inherited(i) => {
                let body = tree.graft(self.inherited[i].tree.clone());
                self.expand_inside(tree, &body, &next)?;
                (body, self.inherited[i].params.clone(), None, String::new())
            }
            Def::Store(def, body) => {
                let inherited = self.hand_down(tree);
                let sub = (self.parse)(&js_string(Some(body)), SubParse {
                    session: self.session, valency: false, templates: registry, expanding: next, inherited,
                })?;
                /* the body's own syntax errors bubble up: the outer passes run
                   over the expanded tree and do not raise them again; `ask`
                   and `note` do */
                for d in sub.gaps.iter().filter(|d| d.sev == "fix") {
                    (self.g)(Diag::new(&d.sev, &d.lab, format!("no corpo de <code>[--{tpl}</code>: {}", d.msg), &d.code));
                }
                let body = tree.graft(sub.tree);
                let raw_params = def.get("params").and_then(Json::arr).unwrap_or(&[]);
                let params: Vec<Param> = raw_params.iter().map(Param::of).collect();
                let repeat = raw_params.iter().find(|p| repeats(p)).map(Param::of);
                (body, params, repeat, truthy(def.get("gloss")).map_or(String::new(), |g| js_string(Some(g))))
            }
        };
        let source = !matches!(def, Def::Store(..));

        let mut fills = collect_fills(tree, inv, repeat.as_ref())?;
        let shown = esc(&params.iter().map(|p| format!("`{}`", p.text)).collect::<Vec<_>>().join(","));
        /* A bare word where a parameter goes is refused by name, with the
           arguments as the author wrote them, quoted (O4, decided 2026-10-25,
           in the Rust only: the JS lets a bare word with no literal after it
           fall as prose in silence, and names a displaced one `[?`). Where a
           parameter goes: a position still open, or one a literal after it
           takes. */
        let refused: Vec<(Id, usize)> = fills.bare.iter().copied()
            .filter(|&(node, at)| at <= params.len() || fills.slid.iter().any(|&(s, _)| s == node)).collect();
        let written: Vec<String> = tree.nodes[inv].children.iter().filter_map(|&c| {
            let k = &tree.nodes[c];
            if k.is_literal() {
                Some(k.v.clone().unwrap_or_default())
            } else {
                refused.iter().any(|&(r, _)| r == c).then(|| js_trim(k.v.as_deref().unwrap_or("")))
            }
        }).collect();
        let form = esc(&written.iter().map(|w| format!("`{w}`")).collect::<Vec<_>>().join(","));
        for &(node, at) in &refused {
            let word = esc(&js_trim(tree.nodes[node].v.as_deref().unwrap_or("")));
            (self.g)(Diag::new("fix", "parâmetro não é literal",
                               format!("o {at}º parâmetro de <code>[--{tpl}</code> recebeu <code>{word}</code>. \
                                        Parâmetro de template é sempre literal: <code>[--{tpl}{form}]</code>."), "TemplateParamNotLiteral")
                .en("parameter is not a literal",
                    format!("argument {at} of <code>[--{tpl}</code> got <code>{word}</code>. \
                             A template parameter is always a literal: <code>[--{tpl}{form}]</code>.")));
        }
        for &(node, at) in fills.slid.iter().filter(|&&(s, _)| !fills.bare.iter().any(|&(b, _)| b == s)) {
            let nd = &tree.nodes[node];
            let what = esc(&[&nd.canonical, &nd.template].into_iter().flatten().find(|s| !s.is_empty())
                .map_or("?".to_string(), |s| s.to_lowercase()));
            (self.g)(Diag::new("fix", "parâmetro não é literal",
                               format!("o {at}º parâmetro de <code>[--{tpl}</code> recebeu <code>[{what}</code>. \
                                        Parâmetro de template é sempre literal: <code>[--{tpl}{shown}]</code>."), "TemplateParamNotLiteral")
                .en("parameter is not a literal",
                    format!("argument {at} of <code>[--{tpl}</code> got <code>[{what}</code>. \
                             A template parameter is always a literal: <code>[--{tpl}{shown}]</code>.")));
        }

        let mut children = bind_holes(tree, &body, &mut fills, &params, repeat.as_ref())?;
        children.extend(leftovers(tree, &fills));
        /* a named fill no hole takes is refused by name, once, and what it
           holds follows the body */
        let mut named: Vec<&str> = Vec::new();
        for f in fills.entries.iter().filter(|f| !f.used) {
            if named.contains(&f.key.as_str()) {
                continue;
            }
            named.push(&f.key);
            let ph = esc(&f.name);
            (self.g)(Diag::new("fix", "parâmetro desconhecido",
                               format!("<code>[ph-{ph}</code> não nomeia buraco de <code>[--{tpl}</code> (<code>{shown}</code>). \
                                        O que ele traz segue depois do corpo."), "TemplateUnknownParam")
                .en("unknown parameter",
                    format!("<code>[ph-{ph}</code> names no hole of <code>[--{tpl}</code> (<code>{shown}</code>). \
                             What it holds follows the body.")));
        }
        tree.reparent(&children, inv);
        let node = &mut tree.nodes[inv];
        node.children = children;
        node.expanded = Some(true);
        node.gloss = Some(glyph_util::tree::Gloss::Text(gloss));
        if source {
            node.from_source = Some(true);
        }
        Ok(())
    }
}

/// `expandInvocations(segments, opts, G, parseFn)`. `session` and `expanding`
/// are what the JS reads off `opts`: `opts.session` passed on, and
/// `opts._expanding`, the templates being expanded around this parse.
/// `inherited` is what the calling source defined, when this is a body the
/// store holds. A definition written in the source (`[--name=…]`) is a
/// template of the whole package, as a binding is: a call before it or after
/// it expands it, over the store's of the same name. Two of one name leave a
/// call unable to say which, and the first holds.
pub fn expand_invocations<X: Clone + Default>(
    tree: &mut Tree<X>, ctx: &Context, session: bool, expanding: &[String], inherited: &[Inherited<X>],
    g: &mut dyn FnMut(Diag), parse: &mut dyn FnMut(&str, SubParse<X>) -> Result<Parsed<X>, Thrown>,
) -> Result<(), Thrown> {
    let all: Vec<Id> = tree.segments.iter().flat_map(|sg| tree.walk(&sg.children))
        .filter(|&id| tree.nodes[id].is_template()).collect();
    let mut sources: Vec<SourceDef> = Vec::new();
    for &d in all.iter().filter(|&&id| tree.nodes[id].is_def == Some(true)) {
        if tree.nodes[d].children.is_empty() {
            continue;
        }
        let name = tree.nodes[d].template.clone().unwrap_or_default();
        let key = name.to_lowercase();
        if sources.iter().any(|s| s.key == key) {
            let t = esc(&name);
            g(Diag::new("fix", "tpl repetido",
                        format!("<code>[--{t}=</code> é definido mais de uma vez — uma chamada não pode dizer qual. Vale a primeira."),
                        "TemplateDefinedTwice")
                .en("tpl defined twice",
                    format!("<code>[--{t}=</code> is defined more than once — a call cannot say which. The first one holds.")));
            continue;
        }
        let params = holes_of(tree, &tree.nodes[d].children);
        sources.push(SourceDef { key, node: d, params });
    }
    let invocations: Vec<Id> = all.into_iter().filter(|&id| tree.nodes[id].is_def != Some(true)).collect();
    let mut x = Expander { ctx, session, inherited, sources, g, parse };
    for inv in invocations {
        x.expand_one(tree, inv, expanding)?;
    }
    Ok(())
}

/// `constraintNames(rulesStore, spec)`: a class resolves through the rules
/// store, a bare name is itself, upper-cased. A class with no store names
/// nothing, and the constraint does not fire.
pub fn constraint_names(rules: Option<&Json>, spec: &Json) -> Result<Vec<String>, Thrown> {
    let items: Vec<&Json> = match spec {
        Json::Arr(a) => a.iter().collect(),
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
            Some(Json::Arr(a)) => out.extend(a.iter().map(|x| js_string(Some(x)).to_uppercase())),
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
    let rules = ctx.rules.as_deref();
    let exempt: Vec<String> = match rules.and_then(|r| truthy(r.get("scope"))).and_then(|s| truthy(s.get("exemptUnder"))) {
        Some(Json::Arr(a)) => a.iter().map(|x| js_string(Some(x))).collect(),
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
            /* a definition written in the source declares no constraints, and
               the store's entry of the same name is not the one it expanded */
            if !n(inv).is_template() || n(inv).expanded != Some(true) || n(inv).from_source == Some(true) {
                continue;
            }
            let def = definition(registry, n(inv).template.as_deref().unwrap_or_default());
            let Some(cons) = def.and_then(|d| truthy(d.get("constraints"))).and_then(Json::arr) else { continue };
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
