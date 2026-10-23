//! glyph-stores — Port of `scripts/core/stores.js` — the oracle. The JS module's own summary:
//!
//!   the three stores the engine loads, and what is read off them.
//!
//! EMS-001 ORD-0003. The stores are made at build time from the four sources
//! (`build.rs`) as `Json` — what `JSON.parse` gives the JS, object keys in the
//! order the JS enumerates them, the one JSON type of the workspace
//! (`glyph-json`) — and travel in a `Context`, a struct passed by
//! reference. There is no global store: a call answers for the context it is
//! given, all three stores or none, which is what `createContext` guarantees
//! the JS. `tests/oracle.rs` holds every table's digest to the JS store's.

use glyph_json::Json;
use glyph_vocab::{get, FRAMES, NAMED_STRUCT, SLOTS};
use std::sync::OnceLock;

include!(concat!(env!("OUT_DIR"), "/stores.rs"));

/// The three stores, answering for all of them together.
#[derive(Debug, Clone, PartialEq)]
pub struct Context {
    pub templates: Json,
    pub rules: Option<Json>,
    pub expansions: Option<Json>,
}

impl Context {
    /// `createContext`: `templates.json` whole or the map inside it, the rules
    /// or none, `expansions.json` whole or its bare `commands` map.
    pub fn new(templates: Option<Json>, rules: Option<Json>, expansions: Option<Json>) -> Context {
        let templates = match templates {
            Some(t) => match t.get("templates").filter(|m| m.truthy()) {
                Some(m) => m.clone(),
                None if t.truthy() => t,
                None => Json::Obj(Vec::new()),
            },
            None => Json::Obj(Vec::new()),
        };
        let rules = rules.filter(Json::truthy);
        let expansions = expansions.filter(Json::truthy).map(|e| {
            if e.get("commands").is_some_and(Json::truthy) { e } else { Json::Obj(vec![("commands".into(), e)]) }
        });
        Context { templates, rules, expansions }
    }

    /// The stores this repository loads, made at build time.
    pub fn repository() -> &'static Context {
        static REPO: OnceLock<Context> = OnceLock::new();
        REPO.get_or_init(|| Context::new(Some(templates_json()), Some(rules_json()), Some(expansions_store())))
    }
}

/// What the caller registered with `useRules` and `useExpansions`: the stores
/// a template's body is parsed with, since the JS expander hands the body's
/// parse the call's templates alone and the rest falls to the registry. It
/// lives beside the context, never in it (EMS-002 ORD-0008): none is what the
/// suite registers until its last bucket, the repository's is what the CLI
/// and the engine register.
#[derive(Debug, Clone, PartialEq, Default)]
pub struct Registered {
    pub rules: Option<Json>,
    pub expansions: Option<Json>,
}

impl Registered {
    pub fn none() -> &'static Registered {
        static NONE: OnceLock<Registered> = OnceLock::new();
        NONE.get_or_init(Registered::default)
    }
    pub fn repository() -> &'static Registered {
        static REPO: OnceLock<Registered> = OnceLock::new();
        REPO.get_or_init(|| {
            let c = Context::repository();
            Registered { rules: c.rules.clone(), expansions: c.expansions.clone() }
        })
    }
}

/// The store as `build-templates.js` writes `expansions.json`, compiled here
/// from `expansions.txt` and `GLOSSARY.md`.
pub const EXPANSIONS_JSON: &str = include_str!(concat!(env!("OUT_DIR"), "/expansions.json"));

pub fn template_registry(ctx: &Context) -> &Json {
    &ctx.templates
}

/// The composition store, when it carries a `commands` table.
pub fn expansion_registry(ctx: &Context) -> Option<&Json> {
    ctx.expansions.as_ref().filter(|s| s.get("commands").is_some_and(Json::truthy))
}

pub fn entry_of<'a>(name: &str, ctx: &'a Context) -> Option<&'a Json> {
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
pub fn formula_of<'a>(name: &str, ctx: &'a Context) -> Option<&'a Json> {
    entry_of(name, ctx)?.get("formula").filter(|f| f.truthy())
}

/// What the command means, extracted from `GLOSSARY.md`.
pub fn def_of<'a>(name: &str, ctx: &'a Context) -> Option<&'a Json> {
    entry_of(name, ctx)?.get("def").filter(|d| d.truthy())
}

/// The transitive atom closure, in formula order, repeats kept. A name met
/// again on its own path, or past 64 hops, stands for itself.
pub fn atoms_of(name: &str, ctx: &Context) -> Option<Vec<String>> {
    let commands = expansion_registry(ctx)?.get("commands")?;
    fn down(n: &str, commands: &Json, seen: &[String], hops: usize, out: &mut Vec<String>) {
        let u = n.to_uppercase();
        if hops > 64 || seen.contains(&u) {
            out.push(u);
            return;
        }
        let e = commands.get(&u).filter(|e| e.truthy());
        if e.is_none_or(|e| e.get("species").and_then(Json::str) == Some("atom")) {
            out.push(u);
            return;
        }
        let mut next = seen.to_vec();
        next.push(u);
        for d in e.and_then(|e| e.get("deps")).and_then(Json::arr).unwrap_or(&[]) {
            down(&js_string(d), commands, &next, hops + 1, out);
        }
    }
    let mut out = Vec::new();
    down(name, commands, &[], 0, &mut out);
    Some(out)
}

/// `String(v)` for what a dependency list can hold.
fn js_string(v: &Json) -> String {
    match v {
        Json::Str(s) => s.clone(),
        Json::Num(n) => n.to_string(),
        Json::Bool(b) => b.to_string(),
        Json::Null => "null".into(),
        Json::Arr(_) | Json::Obj(_) => String::new(),
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
