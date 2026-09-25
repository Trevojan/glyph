//! glyph-stores — Port of `scripts/core/stores.js` — the oracle. The JS module's own summary:
//!
//!   the three stores the engine loads, and what is read off them.
//!
//! EMS-001 ORD-0003. The stores are made at build time from the four sources
//! (`build.rs`) as `Value`s — the shape of a JS object, since the JS reads its
//! stores as plain objects — and travel in a `Context`, a struct passed by
//! reference. There is no global store: a call answers for the context it is
//! given, all three stores or none, which is what `createContext` guarantees
//! the JS. `tests/oracle.rs` holds every table's digest to the JS store's.

use glyph_vocab::{get, FRAMES, NAMED_STRUCT, SLOTS};
use std::sync::OnceLock;

/// A store's value: what `JSON.parse` gives the JS, object keys in the order
/// the JS enumerates them.
#[derive(Debug, Clone, PartialEq)]
pub enum Value {
    Null,
    Bool(bool),
    Num(f64),
    Str(String),
    Arr(Vec<Value>),
    Obj(Vec<(String, Value)>),
}

impl Value {
    pub fn get(&self, key: &str) -> Option<&Value> {
        match self {
            Value::Obj(kv) => kv.iter().find(|(k, _)| k == key).map(|(_, v)| v),
            _ => None,
        }
    }
    pub fn str(&self) -> Option<&str> {
        if let Value::Str(s) = self { Some(s) } else { None }
    }
    pub fn num(&self) -> Option<f64> {
        if let Value::Num(n) = self { Some(*n) } else { None }
    }
    pub fn arr(&self) -> Option<&[Value]> {
        if let Value::Arr(a) = self { Some(a) } else { None }
    }
    /// JS truthiness: `null`, `false`, `0`, `NaN` and `""` are false.
    pub fn truthy(&self) -> bool {
        match self {
            Value::Null => false,
            Value::Bool(b) => *b,
            Value::Num(n) => *n != 0.0 && !n.is_nan(),
            Value::Str(s) => !s.is_empty(),
            Value::Arr(_) | Value::Obj(_) => true,
        }
    }
}

include!(concat!(env!("OUT_DIR"), "/stores.rs"));

/// The three stores, answering for all of them together.
#[derive(Debug, Clone, PartialEq)]
pub struct Context {
    pub templates: Value,
    pub rules: Option<Value>,
    pub expansions: Option<Value>,
}

impl Context {
    /// `createContext`: `templates.json` whole or the map inside it, the rules
    /// or none, `expansions.json` whole or its bare `commands` map.
    pub fn new(templates: Option<Value>, rules: Option<Value>, expansions: Option<Value>) -> Context {
        let templates = match templates {
            Some(t) => match t.get("templates").filter(|m| m.truthy()) {
                Some(m) => m.clone(),
                None if t.truthy() => t,
                None => Value::Obj(Vec::new()),
            },
            None => Value::Obj(Vec::new()),
        };
        let rules = rules.filter(Value::truthy);
        let expansions = expansions.filter(Value::truthy).map(|e| {
            if e.get("commands").is_some_and(Value::truthy) { e } else { Value::Obj(vec![("commands".into(), e)]) }
        });
        Context { templates, rules, expansions }
    }

    /// The stores this repository loads, made at build time.
    pub fn repository() -> &'static Context {
        static REPO: OnceLock<Context> = OnceLock::new();
        REPO.get_or_init(|| Context::new(Some(templates_json()), Some(rules_json()), Some(expansions_store())))
    }
}

/// The store as `build-templates.js` writes `expansions.json`, compiled here
/// from `expansions.txt` and `GLOSSARY.md`.
pub const EXPANSIONS_JSON: &str = include_str!(concat!(env!("OUT_DIR"), "/expansions.json"));

pub fn template_registry(ctx: &Context) -> &Value {
    &ctx.templates
}

/// The composition store, when it carries a `commands` table.
pub fn expansion_registry(ctx: &Context) -> Option<&Value> {
    ctx.expansions.as_ref().filter(|s| s.get("commands").is_some_and(Value::truthy))
}

pub fn entry_of<'a>(name: &str, ctx: &'a Context) -> Option<&'a Value> {
    expansion_registry(ctx)?.get("commands")?.get(&name.to_uppercase()).filter(|e| e.truthy())
}

/// `"atom"`, `"composite"`, or none: no store, or outside the table.
pub fn species_of<'a>(name: &str, ctx: &'a Context) -> Option<&'a str> {
    entry_of(name, ctx)?.get("species")?.str()
}

/// The composition layer: 0 for an atom, 1 + the deepest dependency otherwise.
pub fn depth_of(name: &str, ctx: &Context) -> Option<f64> {
    entry_of(name, ctx)?.get("depth")?.num()
}

/// The formula of a composite; none for an atom.
pub fn formula_of<'a>(name: &str, ctx: &'a Context) -> Option<&'a Value> {
    entry_of(name, ctx)?.get("formula").filter(|f| f.truthy())
}

/// What the command means, extracted from `GLOSSARY.md`.
pub fn def_of<'a>(name: &str, ctx: &'a Context) -> Option<&'a Value> {
    entry_of(name, ctx)?.get("def").filter(|d| d.truthy())
}

/// The transitive atom closure, in formula order, repeats kept. A name met
/// again on its own path, or past 64 hops, stands for itself.
pub fn atoms_of(name: &str, ctx: &Context) -> Option<Vec<String>> {
    let commands = expansion_registry(ctx)?.get("commands")?;
    fn down(n: &str, commands: &Value, seen: &[String], hops: usize, out: &mut Vec<String>) {
        let u = n.to_uppercase();
        if hops > 64 || seen.contains(&u) {
            out.push(u);
            return;
        }
        let e = commands.get(&u).filter(|e| e.truthy());
        if e.is_none_or(|e| e.get("species").and_then(Value::str) == Some("atom")) {
            out.push(u);
            return;
        }
        let mut next = seen.to_vec();
        next.push(u);
        for d in e.and_then(|e| e.get("deps")).and_then(Value::arr).unwrap_or(&[]) {
            down(&js_string(d), commands, &next, hops + 1, out);
        }
    }
    let mut out = Vec::new();
    down(name, commands, &[], 0, &mut out);
    Some(out)
}

/// `String(v)` for what a dependency list can hold.
fn js_string(v: &Value) -> String {
    match v {
        Value::Str(s) => s.clone(),
        Value::Num(n) => n.to_string(),
        Value::Bool(b) => b.to_string(),
        Value::Null => "null".into(),
        Value::Arr(_) | Value::Obj(_) => String::new(),
    }
}

/// Primitive, not operator: an atom no valency table asks an operand of.
/// Derived, never transcribed.
pub fn stands_alone(canonical: &str, ctx: &Context) -> bool {
    let u = canonical.to_uppercase();
    if u.is_empty() || get(FRAMES, &u).is_some() || get(SLOTS, &u).is_some() || get(NAMED_STRUCT, &u).is_some() {
        return false;
    }
    species_of(&u, ctx) == Some("atom")
}
