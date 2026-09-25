//! glyph-vocab — Port of `scripts/core/vocabulary.js` — the oracle. The JS module's own summary:
//!
//!   Appendix A, one slot per command, and the maps read off it in both directions.
//!
//! EMS-001 ORD-0003. The hand-written tables come from `vocabulary.js` itself,
//! read at build time (`build.rs`); the ones the JS derives with code are
//! derived here by that code, ported. Each is a list of pairs in the order the
//! JS enumerates it, and `tests/oracle.rs` holds every table to the JS's by
//! its `JSON.stringify` text and its digest.

use std::sync::OnceLock;

/// A category of the interface's command browser: `{ id, label, note, items }`.
pub struct Cat {
    pub id: &'static str,
    pub label: &'static str,
    pub note: &'static str,
    pub items: &'static [(&'static str, &'static str)],
}

include!(concat!(env!("OUT_DIR"), "/vocab.rs"));

/// `table[key]`, as a JS object answers it.
pub fn get<V: Copy>(table: &[(&'static str, V)], key: &str) -> Option<V> {
    table.iter().find(|(k, _)| *k == key).map(|(_, v)| *v)
}

/// The name a command wears in the emitted document.
pub fn el_name(canonical: &str, tier: &str, gloss: Option<&str>) -> String {
    if tier == "session" {
        return canonical.to_string();
    }
    if tier == "blend" {
        return canonical.to_lowercase();
    }
    let g = gloss.filter(|g| !g.is_empty()).unwrap_or(canonical).to_lowercase();
    let mut out = String::new();
    let mut run = false;
    for c in g.chars() {
        if c.is_ascii_lowercase() || c.is_ascii_digit() {
            out.push(c);
            run = false;
        } else if !run {
            out.push('-');
            run = true;
        }
    }
    let out = out.strip_prefix('-').unwrap_or(&out);
    let out = out.strip_suffix('-').unwrap_or(out);
    if out.is_empty() { canonical.to_lowercase() } else { out.to_string() }
}

/// What an element name, or a spelling of one, resolves to.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Named {
    pub canonical: &'static str,
    pub tier: &'static str,
}

/// A name two entries wanted: the first writer kept it.
#[derive(Debug, Clone, PartialEq)]
pub struct Collision {
    pub key: String,
    pub kept: &'static str,
    pub dropped: &'static str,
}

/// The tables `vocabulary.js` derives with code, in the order it builds them.
pub struct Derived {
    pub ptbr: Vec<(&'static str, &'static str)>,
    pub cat_of: Vec<(&'static str, &'static str)>,
    pub alias_of: Vec<(&'static str, Vec<&'static str>)>,
    pub gloss_reverse: Vec<(String, Named)>,
    pub gloss_collisions: Vec<Collision>,
    pub element_input: Vec<(String, Named)>,
    pub element_input_collisions: Vec<Collision>,
    pub emo_reverse: Vec<(String, &'static str)>,
}

/// A JS assignment on an object kept as pairs: an existing key keeps its place.
fn put<K: PartialEq, V>(m: &mut Vec<(K, V)>, k: K, v: V) {
    match m.iter_mut().find(|(x, _)| *x == k) {
        Some(slot) => slot.1 = v,
        None => m.push((k, v)),
    }
}

pub fn derived() -> &'static Derived {
    static DERIVED: OnceLock<Derived> = OnceLock::new();
    DERIVED.get_or_init(|| {
        let (mut ptbr, mut cat_of) = (Vec::new(), Vec::new());
        for c in CATS {
            for &(k, v) in c.items {
                put(&mut ptbr, k, v);
                put(&mut cat_of, k, c.label);
            }
        }
        let mut alias_of: Vec<(&str, Vec<&str>)> = Vec::new();
        for &(a, canon) in ALIAS {
            match alias_of.iter_mut().find(|(k, _)| *k == canon) {
                Some(slot) => slot.1.push(a),
                None => alias_of.push((canon, vec![a])),
            }
        }

        /* classify() probes MODE → STRUCT → META → ALIAS → INSTR; the reverse
           map is built in that order with the first writer winning */
        let (mut gloss_reverse, mut gloss_collisions): (Vec<(String, Named)>, Vec<Collision>) = (Vec::new(), Vec::new());
        for (tier, table) in [("mode", MODE), ("struct", STRUCT), ("meta", META), ("instr", INSTR)] {
            for &(canon, gloss) in table {
                let el = el_name(canon, tier, Some(gloss));
                match gloss_reverse.iter().find(|(k, _)| *k == el) {
                    Some((_, kept)) => {
                        if kept.canonical != canon {
                            gloss_collisions.push(Collision { key: el, kept: kept.canonical, dropped: canon });
                        }
                    }
                    None => gloss_reverse.push((el, Named { canonical: canon, tier })),
                }
            }
        }

        /* the element's own name, separators squashed, as an input spelling —
           unless a table already claims it or two elements would share it */
        let claimed = |k: &str| [MODE, STRUCT, META, ALIAS, INSTR].iter().any(|t| get(t, k).is_some());
        let (mut element_input, mut element_input_collisions): (Vec<(String, Named)>, Vec<Collision>) = (Vec::new(), Vec::new());
        for (el, hit) in &gloss_reverse {
            let key: String = el.to_uppercase().chars().filter(|c| c.is_ascii_uppercase() || c.is_ascii_digit()).collect();
            if key.is_empty() || key == hit.canonical || claimed(&key) {
                continue;
            }
            match element_input.iter().find(|(k, _)| *k == key) {
                Some((_, kept)) => {
                    if kept.canonical != hit.canonical {
                        element_input_collisions.push(Collision { key, kept: kept.canonical, dropped: hit.canonical });
                    }
                }
                None => element_input.push((key, *hit)),
            }
        }
        element_input.retain(|(k, _)| !element_input_collisions.iter().any(|c| c.key == *k));

        let mut emo_reverse = Vec::new();
        for &(code, gloss) in EMO {
            put(&mut emo_reverse, gloss.to_lowercase(), code);
        }
        Derived { ptbr, cat_of, alias_of, gloss_reverse, gloss_collisions, element_input, element_input_collisions, emo_reverse }
    })
}
