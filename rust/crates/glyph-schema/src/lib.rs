//! glyph-schema — Port of `scripts/glyph-check.js` — validates a `GlyphAST` envelope against `.guidelines/.sources/ast-schema.json`.
//! Imports nothing from the core, on purpose: the receiving end may have the
//! store and not the engine.
//!
//! EMS-002 ORD-0039 ports `validateEms`: an `EMS.json`, the configuration a
//! series carries, checked against the hand-authored `ems-schema.json`, every
//! breach by the name and in the order the JS gives it. The schema's patterns
//! are read with the little of a regular expression they use — literals,
//! `\.`, `[0-9]`, `{n}`, `{n,m}` and `+` — so no crate enters for them.

use glyph_json::{Json, stringify};
use std::sync::OnceLock;

/// `ems-schema.json`, as the repository holds it.
pub fn ems_schema() -> &'static Json {
    static S: OnceLock<Json> = OnceLock::new();
    S.get_or_init(|| {
        glyph_json::parse(include_str!(
            "../../../../.guidelines/.sources/ems-schema.json"
        ))
        .expect("ems-schema.json is JSON")
    })
}

/// One piece of a pattern: a character or a digit, and how many times.
struct Piece {
    digit: bool,
    ch: char,
    min: usize,
    max: usize,
}

fn pieces(pattern: &str) -> Vec<Piece> {
    let cs: Vec<char> = pattern
        .trim_start_matches('^')
        .trim_end_matches('$')
        .chars()
        .collect();
    let mut out = Vec::new();
    let mut i = 0;
    while i < cs.len() {
        let (digit, ch) = if cs[i] == '\\' && i + 1 < cs.len() {
            i += 2;
            (false, cs[i - 1])
        } else if cs[i..].starts_with(&['[', '0', '-', '9', ']']) {
            i += 5;
            (true, '0')
        } else {
            i += 1;
            (false, cs[i - 1])
        };
        let (mut min, mut max) = (1, 1);
        if i < cs.len() && cs[i] == '+' {
            max = usize::MAX;
            i += 1;
        } else if i < cs.len() && cs[i] == '{' {
            let close = cs[i..]
                .iter()
                .position(|&c| c == '}')
                .map_or(cs.len(), |p| i + p);
            let body: String = cs[i + 1..close].iter().collect();
            let (a, b) = body.split_once(',').unwrap_or((&body, &body));
            min = a.trim().parse().unwrap_or(1);
            max = b.trim().parse().unwrap_or(min);
            i = close + 1;
        }
        out.push(Piece {
            digit,
            ch,
            min,
            max,
        });
    }
    out
}

fn matches(ps: &[Piece], s: &[char]) -> bool {
    let Some((p, rest)) = ps.split_first() else {
        return s.is_empty();
    };
    let fits = |c: &char| {
        if p.digit {
            c.is_ascii_digit()
        } else {
            *c == p.ch
        }
    };
    let most = s.iter().take_while(|c| fits(c)).count().min(p.max);
    (p.min..=most).rev().any(|n| matches(rest, &s[n..]))
}

/// `new RegExp(pattern).test(s)`, for the patterns the schema writes.
pub fn fits(pattern: &str, s: &str) -> bool {
    matches(&pieces(pattern), &s.chars().collect::<Vec<_>>())
}

fn type_of(v: Option<&Json>) -> &'static str {
    match v {
        Some(Json::Arr(_)) => "array",
        Some(Json::Null) => "null",
        Some(Json::Obj(_)) => "object",
        Some(Json::Str(_)) => "string",
        Some(Json::Num(_)) => "number",
        Some(Json::Bool(_)) => "boolean",
        None => "undefined",
    }
}

fn strs(v: Option<&Json>) -> Vec<&str> {
    v.and_then(Json::arr)
        .unwrap_or(&[])
        .iter()
        .filter_map(Json::str)
        .collect()
}

/// `validateEms(cfg)`: every breach of `ems-schema.json`, by name.
pub fn validate_ems(cfg: &Json) -> Vec<String> {
    let s = ems_schema();
    let mut errs = Vec::new();
    let Json::Obj(kv) = cfg else {
        return vec!["EMS.json: not an object".into()];
    };
    let required = strs(s.get("required"));
    let optional = strs(s.get("optional"));
    for k in &required {
        if cfg.get(k).is_none() {
            errs.push(format!("EMS.json: missing required key `{k}`"));
        }
    }
    for (k, v) in kv {
        if !required.contains(&k.as_str()) && !optional.contains(&k.as_str()) {
            errs.push(format!("EMS.json: undeclared key `{k}`"));
        } else {
            let want = s
                .get("types")
                .and_then(|t| t.get(k))
                .and_then(Json::str)
                .unwrap_or("");
            if type_of(Some(v)) != want {
                errs.push(format!(
                    "EMS.json.{k}: {}, declared {want}",
                    type_of(Some(v))
                ));
            }
        }
    }
    for (k, p) in s.get("patterns").and_then(Json::obj).unwrap_or(&[]) {
        if let (Some(Json::Str(v)), Some(p)) = (cfg.get(k), p.str())
            && !fits(p, v)
        {
            errs.push(format!(
                "EMS.json.{k}: {} is not of the declared form",
                stringify(&Json::Str(v.clone()))
            ));
        }
    }
    let x = s.get("xsd");
    let kinds = strs(x.and_then(|x| x.get("kind")));
    for (i, d) in cfg
        .get("xsd")
        .and_then(Json::arr)
        .unwrap_or(&[])
        .iter()
        .enumerate()
    {
        let p = format!("EMS.json.xsd[{i}]");
        if !matches!(d, Json::Obj(_)) {
            errs.push(format!("{p}: not an object"));
            continue;
        }
        for k in strs(x.and_then(|x| x.get("required"))) {
            if !matches!(d.get(k), Some(Json::Str(_))) {
                errs.push(format!("{p}: `{k}` is not a string"));
            }
        }
        let kind = d.get("kind");
        if !kind.and_then(Json::str).is_some_and(|k| kinds.contains(&k)) {
            let said = kind.map_or("undefined".to_string(), stringify);
            errs.push(format!("{p}: kind {said} is not declared"));
        }
    }
    let t = s.get("traffic");
    if let Some(Json::Obj(orders)) = cfg.get("traffic") {
        let key = t
            .and_then(|t| t.get("key"))
            .and_then(Json::str)
            .unwrap_or("");
        let need = strs(t.and_then(|t| t.get("required")));
        for (k, v) in orders {
            let p = format!("EMS.json.traffic.{k}");
            if !fits(key, k) {
                errs.push(format!("{p}: not an Order's number"));
            }
            let Json::Obj(fields) = v else {
                errs.push(format!("{p}: not an object"));
                continue;
            };
            for (f, _) in fields {
                if !need.contains(&f.as_str()) {
                    errs.push(format!("{p}: undeclared key `{f}`, the reads are derived"));
                }
            }
            if !matches!(v.get("writes"), Some(Json::Arr(_))) {
                errs.push(format!("{p}.writes: not an array"));
            }
        }
    }
    if let Some(inv @ Json::Obj(_)) = cfg.get("invoke") {
        for k in strs(s.get("invoke").and_then(|i| i.get("required"))) {
            if !matches!(inv.get(k), Some(Json::Arr(_))) {
                errs.push(format!("EMS.json.invoke.{k}: not an array"));
            }
        }
    }
    errs
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_patterns_the_schema_writes() {
        assert!(fits("^EMS-[0-9]{3}$", "EMS-002"));
        assert!(!fits("^EMS-[0-9]{3}$", "EMS-3"));
        assert!(!fits("^EMS-[0-9]{3}$", "EMS-0021"));
        assert!(fits("^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]{2,3}$", "4.7.10.09"));
        assert!(fits(
            "^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]{2,3}$",
            "10.7.10.100"
        ));
        assert!(!fits("^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]{2,3}$", "4.7.10.9"));
        assert!(fits("^ORD-[0-9]{4}$", "ORD-0030"));
        assert!(!fits("^ORD-[0-9]{4}$", "ORD-30"));
    }

    #[test]
    fn the_drafts_conform_and_a_breach_is_named() {
        for id in ["EMS-001", "EMS-002", "EMS-003"] {
            let path = format!(
                "{}/../../../.guidelines/.orders/{id}/EMS.json",
                env!("CARGO_MANIFEST_DIR")
            );
            let cfg = glyph_json::parse(&std::fs::read_to_string(path).unwrap()).unwrap();
            assert_eq!(validate_ems(&cfg), Vec::<String>::new(), "{id}");
        }
        let bad = glyph_json::parse(r#"{"id":"EMS-3","pins":{},"colour":1}"#).unwrap();
        let errs = validate_ems(&bad);
        assert!(errs.contains(&"EMS.json: missing required key `engine`".to_string()));
        assert!(errs.contains(&"EMS.json: undeclared key `colour`".to_string()));
        assert!(errs.contains(&"EMS.json.pins: object, declared array".to_string()));
        assert!(errs.contains(&"EMS.json.id: \"EMS-3\" is not of the declared form".to_string()));
    }
}
