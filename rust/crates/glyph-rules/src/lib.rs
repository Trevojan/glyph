//! glyph-rules — Port of `scripts/core/rules.js` — the oracle. The JS module's own summary:
//!
//!   contradictions: the criterion for "commands don't contradict each other", as a finite external table.
//!
//! EMS-001 ORD-0006. `compile_rules` reads the rules store; `check_rules` walks
//! the tree against it and raises through the parser's `g`. The compiled rules
//! stay in the caller's hands: the JS hangs them on the store object, which is
//! why its envelope hashes them (EMS-001/RETURN.md, question 3).
//!
//! The JS keeps its name tables in plain objects, and the port answers as they
//! do: a name `Object.prototype` holds is found in every one of them. A
//! canonical such name — `[constructor]` and `[__proto__]` are session words
//! through that same lookup (ORD-0004) — makes `checkRules` throw, and the
//! port stops there with the JS's message.

use glyph_stores::{Context, Value};
use glyph_util::json::number;
use glyph_util::tree::{Diag, Id, Thrown, Tree};
use glyph_util::{esc, inherited};
use std::collections::HashSet;

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

/// `pairKey`: the two names in JS string order, joined by `|`.
pub fn pair_key(a: &str, b: &str) -> String {
    if a.encode_utf16().lt(b.encode_utf16()) { format!("{a}|{b}") } else { format!("{b}|{a}") }
}

/// `expandNames`: `@class` resolved against the store's classes; a bare name
/// is itself.
pub fn expand_names(store: &Value, name: Option<&Value>) -> Vec<String> {
    let text = js_string(name);
    match text.strip_prefix('@') {
        None => vec![text],
        Some(class) => store.get("classes").and_then(|c| c.get(class)).and_then(Value::arr)
            .map(|a| a.iter().map(|x| js_string(Some(x))).collect()).unwrap_or_default(),
    }
}

pub struct Order<'a> {
    pub rule: &'a Value,
    pub first: String,
    pub then: Vec<String>,
}
pub struct Pre<'a> {
    pub rule: &'a Value,
    pub target: String,
    pub accept: Vec<String>,
}
pub struct Blend<'a> {
    pub rule: &'a Value,
    pub when: Vec<String>,
    pub emit: String,
    pub means: String,
}

/// The store, compiled: the pairs by key, in the order each key first appears.
pub struct Compiled<'a> {
    pub pairs: Vec<(String, &'a Value)>,
    pub order: Vec<Order<'a>>,
    pub pre: Vec<Pre<'a>>,
    pub blends: Vec<Blend<'a>>,
}

pub fn compile_rules(store: &Value) -> Compiled<'_> {
    let mut c = Compiled { pairs: Vec::new(), order: Vec::new(), pre: Vec::new(), blends: Vec::new() };
    for r in store.get("rules").and_then(Value::arr).unwrap_or(&[]) {
        match r.get("kind").and_then(Value::str) {
            Some("pair") => {
                let k = pair_key(&js_string(r.get("a")), &js_string(r.get("b")));
                match c.pairs.iter_mut().find(|(x, _)| *x == k) {
                    Some(slot) => slot.1 = r,
                    None => c.pairs.push((k, r)),
                }
            }
            /* a blend that cannot say what it means is refused here, not warned about */
            Some("blend") => {
                let when = r.get("when").and_then(Value::arr).unwrap_or(&[]);
                if truthy(r.get("means")).is_none() || truthy(r.get("emit")).is_none() || when.len() < 2 {
                    continue;
                }
                let when = when.iter().flat_map(|n| expand_names(store, Some(n))).collect();
                c.blends.push(Blend { rule: r, when, emit: js_string(r.get("emit")), means: js_string(r.get("means")) });
            }
            /* `first` never matches itself: it is usually one of the class in `then` */
            Some("order") => {
                let first = js_string(r.get("first"));
                let then = expand_names(store, r.get("then")).into_iter().filter(|n| *n != first).collect();
                c.order.push(Order { rule: r, first, then });
            }
            /* a set in the JS: each name once, where it first came */
            Some("precondition") => {
                let mut accept: Vec<String> = Vec::new();
                for x in r.get("requiresBefore").and_then(Value::arr).unwrap_or(&[]).iter().flat_map(|n| expand_names(store, Some(n))) {
                    if !accept.contains(&x) {
                        accept.push(x);
                    }
                }
                c.pre.push(Pre { rule: r, target: js_string(r.get("target")), accept });
            }
            _ => {}
        }
    }
    c
}

/// The store as the JS object stands once `checkRules` has run on it: its own
/// keys, then the `__compiled` it hangs there — a store that brings its own
/// keeps it. The envelope hashes the store in this state (EMS-001/RETURN.md,
/// question 3).
pub fn with_cache(store: &Value) -> Value {
    let Value::Obj(kv) = store else { return store.clone() };
    if store.get("__compiled").is_some_and(Value::truthy) {
        return store.clone();
    }
    let c = compile_rules(store);
    let s = |x: &str| Value::Str(x.to_string());
    let strs = |v: &[String]| Value::Arr(v.iter().map(|x| s(x)).collect());
    let compiled = Value::Obj(vec![
        ("pairs".into(), Value::Obj(c.pairs.iter().map(|(k, r)| (k.clone(), (*r).clone())).collect())),
        ("order".into(), Value::Arr(c.order.iter().map(|o| Value::Obj(vec![
            ("rule".into(), o.rule.clone()), ("first".into(), s(&o.first)), ("then".into(), strs(&o.then))])).collect())),
        ("pre".into(), Value::Arr(c.pre.iter().map(|p| Value::Obj(vec![
            ("rule".into(), p.rule.clone()), ("target".into(), s(&p.target)),
            ("accept".into(), Value::Obj(p.accept.iter().map(|a| (a.clone(), Value::Num(1.0))).collect()))])).collect())),
        ("blends".into(), Value::Arr(c.blends.iter().map(|b| Value::Obj(vec![
            ("rule".into(), b.rule.clone()), ("when".into(), strs(&b.when)), ("emit".into(), s(&b.emit)),
            ("means".into(), s(&b.means))])).collect())),
    ]);
    let mut kv: Vec<(String, Value)> = kv.iter().filter(|(k, _)| k != "__compiled").cloned().collect();
    kv.push(("__compiled".into(), compiled));
    Value::Obj(kv)
}

/// `checkRules(segments, opts, G)`.
pub fn check_rules<X: Clone>(tree: &Tree<X>, ctx: &Context, g: &mut dyn FnMut(Diag)) -> Result<(), Thrown> {
    let Some(store) = ctx.rules.as_ref() else { return Ok(()) };
    let c = compile_rules(store);
    let exempt: Vec<String> = store.get("scope").and_then(|s| s.get("exemptUnder")).and_then(Value::arr)
        .map(|a| a.iter().map(|x| js_string(Some(x))).collect()).unwrap_or_default();
    let n = |id: Id| &tree.nodes[id];
    let canon = |id: Id| n(id).canonical.clone().unwrap_or_default();
    let low = |s: &str| format!("<code>[{}</code>", esc(&s.to_lowercase()));
    let uid = |id: Id| n(id).id.unwrap_or(0);

    /* under an explicit [ovr] or [byp] the overlap was requested on purpose */
    let under_exempt = |id: Id| {
        let (mut p, mut hops) = (n(id).parent, 0);
        while let Some(pid) = p {
            hops += 1;
            if hops > 64 {
                break;
            }
            let k = n(pid).canonical.clone().unwrap_or_else(|| "undefined".into());
            if exempt.contains(&k) || inherited(&k) {
                return true;
            }
            p = n(pid).parent;
        }
        false
    };
    let mut seen: HashSet<String> = HashSet::new();
    let mut fire = |r: &Value, id: String, msg: String, en: String, g: &mut dyn FnMut(Diag)| {
        if !seen.insert(id) {
            return;
        }
        let (pt, us) = match truthy(r.get("suggest")) {
            Some(s) => (format!(" <em>Sugestão: {}</em>", esc_v(Some(s))), format!(" <em>Suggestion: {}</em>", esc_v(Some(s)))),
            None => (String::new(), String::new()),
        };
        let label = truthy(r.get("label")).map(|l| js_string(Some(l)));
        let sev = truthy(r.get("severity")).map_or("ask".into(), |s| js_string(Some(s)));
        g(Diag::new(&sev, label.as_deref().unwrap_or("regra"), msg + &pt, &format!("Rule:{}", js_string(r.get("id"))))
            .en(label.as_deref().unwrap_or("rule"), en + &us));
    };
    let report_pair = |x: Id, y: Id, fire: &mut dyn FnMut(&Value, String, String, String)| {
        let key = pair_key(&canon(x), &canon(y));
        let Some((_, r)) = c.pairs.iter().find(|(k, _)| *k == key) else { return };
        if under_exempt(x) || under_exempt(y) {
            return;
        }
        let (a, b) = (low(&canon(x)), low(&canon(y)));
        let why = esc_v(r.get("why"));
        fire(r, format!("{}@{}-{}", js_string(r.get("id")), uid(x), uid(y)),
             format!("{a} com {b} no mesmo alvo — {why}."), format!("{a} with {b} on the same target — {why}."));
    };

    for sg in &tree.segments {
        let walked = tree.walk(&sg.children);
        let flat: Vec<Id> = walked.iter().copied().filter(|&id| n(id).is_canonical()).collect();

        /* pair: siblings under one parent */
        let mut groups: Vec<&[Id]> = vec![&sg.children];
        groups.extend(walked.iter().filter(|&&id| !n(id).children.is_empty()).map(|&id| n(id).children.as_slice()));
        for kids in groups {
            let mut by_name: Vec<(String, Id)> = Vec::new();
            for &k in kids {
                if !n(k).is_canonical() {
                    continue;
                }
                /* the JS's `(byName[c.canonical] = byName[c.canonical] || []).push(c)`
                   finds the prototype's member first, and it has no push */
                if inherited(&canon(k)) {
                    return Err(Thrown("byName[c.canonical].push is not a function".into()));
                }
                if !by_name.iter().any(|(nm, _)| *nm == canon(k)) {
                    by_name.push((canon(k), k));
                }
            }
            for (_, r) in &c.pairs {
                let first = |nm: &str| by_name.iter().find(|(x, _)| x == nm).map(|(_, id)| *id);
                if let (Some(a), Some(b)) = (first(&js_string(r.get("a"))), first(&js_string(r.get("b")))) {
                    report_pair(a, b, &mut |r, id, m, e| fire(r, id, m, e, g));
                }
            }
        }

        /* pair: one is an ancestor of the other */
        for &id in &walked {
            if !n(id).is_canonical() {
                continue;
            }
            let (mut p, mut hops) = (n(id).parent, 0);
            while let Some(pid) = p {
                hops += 1;
                if hops > 32 {
                    break;
                }
                if n(pid).is_canonical() {
                    report_pair(id, pid, &mut |r, i, m, e| fire(r, i, m, e, g));
                }
                p = n(pid).parent;
            }
        }

        /* order: `then` must not come before `first` */
        for o in &c.order {
            let first_at = flat.iter().position(|&id| canon(id) == o.first);
            for (j, &id) in flat.iter().enumerate() {
                if !o.then.contains(&canon(id)) {
                    continue;
                }
                if first_at.is_some_and(|f| j > f) {
                    continue;
                }
                if first_at.is_none() {
                    break;
                }
                let (la, lb) = (low(&canon(id)), low(&o.first));
                let why = esc_v(o.rule.get("why"));
                fire(o.rule, format!("{}@{}", js_string(o.rule.get("id")), uid(id)),
                     format!("{la} vem antes de {lb} — {why}."), format!("{la} comes before {lb} — {why}."), g);
                break;
            }
        }

        /* precondition: the target must be preceded by an accepted frame */
        for p in &c.pre {
            for (i, &id) in flat.iter().enumerate() {
                if canon(id) != p.target {
                    continue;
                }
                if flat[..i].iter().any(|&k| p.accept.contains(&canon(k)) || inherited(&canon(k))) {
                    continue;
                }
                let t = low(&p.target);
                let why = esc_v(p.rule.get("why"));
                fire(p.rule, format!("{}@{}", js_string(p.rule.get("id")), uid(id)),
                     format!("{t} sem enquadramento antes — {why}."), format!("{t} with no framing before it — {why}."), g);
            }
        }
    }
    Ok(())
}
