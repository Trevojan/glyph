//! The pure half of the composition store's compiler: `read-expansions.js`
//! and `build-templates.js`'s glossary reader, ported. Included by `build.rs`,
//! which makes the store, and by `tests/compose.rs`, which holds these to the
//! JS on more than the repository's own sources exercise.

#![allow(dead_code)]

/* ---------------------------------------------------------------- *
 * JS string semantics the port needs: `\s`, `trim`, and the order
 * `Object.keys` enumerates in (json::set)
 * ---------------------------------------------------------------- */

pub fn js_space(c: char) -> bool {
    matches!(c, '\t' | '\n' | '\u{b}' | '\u{c}' | '\r' | ' ' | '\u{a0}' | '\u{1680}' | '\u{2000}'..='\u{200a}'
        | '\u{2028}' | '\u{2029}' | '\u{202f}' | '\u{205f}' | '\u{3000}' | '\u{feff}')
}
pub fn js_trim(s: &str) -> &str {
    s.trim_matches(js_space)
}
fn collapse(s: &str) -> String {
    let mut out = String::new();
    let mut run = false;
    for c in s.chars() {
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
    out
}
fn word(c: char) -> bool {
    c.is_ascii_alphanumeric() || c == '_'
}

/* ---------------------------------------------------------------- *
 * read-expansions.js
 * ---------------------------------------------------------------- */

/// `depsOf`: the formula upper-cased, the return tokens `R:` and `R-` blanked
/// where a word boundary precedes them, then every `[A-Z_]\w*`.
pub fn deps_of(formula: &str) -> Vec<String> {
    let u: Vec<char> = formula.to_uppercase().chars().collect();
    let mut blanked = String::new();
    let mut i = 0;
    while i < u.len() {
        if u[i] == 'R' && (i == 0 || !word(u[i - 1])) {
            let mut j = i + 1;
            while j < u.len() && js_space(u[j]) {
                j += 1;
            }
            if j < u.len() && (u[j] == ':' || u[j] == '-') {
                blanked.push(' ');
                i = j + 1;
                continue;
            }
        }
        blanked.push(u[i]);
        i += 1;
    }
    let c: Vec<char> = blanked.chars().collect();
    let (mut out, mut i) = (Vec::new(), 0);
    while i < c.len() {
        if c[i].is_ascii_uppercase() || c[i] == '_' {
            let start = i;
            while i < c.len() && word(c[i]) {
                i += 1;
            }
            out.push(c[start..i].iter().collect());
        } else {
            i += 1;
        }
    }
    out
}

/// `LINE`: `NAME = rhs`, the name `[A-Za-z_][\w-]*`, the rhs not empty.
fn entry(line: &str) -> Option<(String, String)> {
    let c: Vec<char> = line.chars().collect();
    if c.is_empty() || !(c[0].is_ascii_alphabetic() || c[0] == '_') {
        return None;
    }
    let mut i = 1;
    while i < c.len() && (word(c[i]) || c[i] == '-') {
        i += 1;
    }
    let name: String = c[..i].iter().collect();
    while i < c.len() && js_space(c[i]) {
        i += 1;
    }
    if c.get(i) != Some(&'=') {
        return None;
    }
    i += 1;
    while i < c.len() && js_space(c[i]) {
        i += 1;
    }
    /* `(.+)$`: the rest, not empty (the line arrives trimmed) */
    let rest: String = c[i..].iter().collect();
    (!rest.is_empty()).then_some((name, rest))
}

pub struct Parsed {
    pub atoms: Vec<String>,
    pub composites: Vec<(String, (String, Vec<String>))>,
}

pub fn read(text: &str) -> Parsed {
    let mut p = Parsed { atoms: Vec::new(), composites: Vec::new() };
    for ln in text.split('\n') {
        let s = js_trim(ln.strip_suffix('\r').unwrap_or(ln));
        if s.is_empty() || s.starts_with('#') {
            continue;
        }
        let Some((name, rhs)) = entry(s) else { continue };
        let (name, rhs) = (name.to_uppercase(), js_trim(&rhs).to_string());
        if rhs.eq_ignore_ascii_case("BASE") {
            p.atoms.push(name);
            continue;
        }
        let deps = deps_of(&rhs);
        match p.composites.iter_mut().find(|(k, _)| *k == name) {
            Some(slot) => slot.1 = (rhs, deps),
            None => p.composites.push((name, (rhs, deps))),
        }
    }
    p
}

/// `analyse`, the part the store needs: the layer of every name, refusing a
/// table with an undefined dependency or a cycle, as `build-templates.js` does.
pub fn layers(p: &Parsed) -> Vec<(String, i64)> {
    let mut def: Vec<(String, Vec<String>)> = p.atoms.iter().map(|a| (a.clone(), Vec::new())).collect();
    for (c, (_, deps)) in &p.composites {
        match def.iter_mut().find(|(k, _)| k == c) {
            Some(slot) => slot.1 = deps.clone(),
            None => def.push((c.clone(), deps.clone())),
        }
    }
    let mut names: Vec<String> = def.iter().map(|(k, _)| k.clone())
        .chain(def.iter().flat_map(|(_, d)| d.iter().cloned())).collect();
    names.sort_by(|a, b| a.encode_utf16().cmp(b.encode_utf16()));
    names.dedup();
    let undefined: Vec<&String> = names.iter().filter(|n| !def.iter().any(|(k, _)| k == *n)).collect();
    assert!(undefined.is_empty(), "expansions.txt does not close — undefined: {undefined:?}");

    fn layer(n: &str, def: &[(String, Vec<String>)], depth: &mut Vec<(String, i64)>, path: &mut Vec<String>) -> i64 {
        if let Some((_, d)) = depth.iter().find(|(k, _)| k == n) {
            return *d;
        }
        assert!(!path.iter().any(|p| p == n), "expansions.txt does not close — a cycle through {n}");
        path.push(n.to_string());
        let ds = &def.iter().find(|(k, _)| k == n).unwrap().1;
        let d = if ds.is_empty() { 0 } else { 1 + ds.iter().map(|x| layer(x, def, depth, path)).max().unwrap() };
        path.pop();
        depth.push((n.to_string(), d));
        d
    }
    let mut depth: Vec<(String, i64)> = Vec::new();
    for n in &names {
        layer(n, &def, &mut depth, &mut Vec::new());
    }
    depth
}

/* ---------------------------------------------------------------- *
 * build-templates.js: readGlossary
 * ---------------------------------------------------------------- */

/// `GLOSS_LINE` on a trimmed line: `` `NAME` `` [★|⚠]… [= `formula`] — body.
pub fn gloss_line(line: &str) -> Option<(String, Option<String>, String)> {
    let rest = line.strip_prefix('`')?;
    let close = rest.find('`')?;
    let name = &rest[..close];
    let mut ch = name.chars();
    if !ch.next().is_some_and(|c| c.is_ascii_uppercase()) || !ch.all(|c| c.is_ascii_uppercase() || c.is_ascii_digit() || c == '_') {
        return None;
    }
    let mut rest = rest[close + 1..].trim_start_matches(js_space);
    while let Some(r) = rest.strip_prefix('★').or_else(|| rest.strip_prefix('⚠')) {
        rest = r.trim_start_matches(js_space);
    }
    let mut spelled = None;
    if let Some(r) = rest.strip_prefix('=') {
        let r = r.trim_start_matches(js_space).strip_prefix('`')?;
        let close = r.find('`')?;
        spelled = Some(r[..close].to_string());
        rest = r[close + 1..].trim_start_matches(js_space);
    }
    let body = rest.strip_prefix('—')?.trim_start_matches(js_space);
    let body = body.trim_end_matches(js_space);
    (!body.is_empty()).then(|| (name.to_string(), spelled, body.to_string()))
}

/// `stripMd`: a trailing `*(…)*` note dropped, `**` and backticks dropped,
/// whitespace collapsed.
pub fn strip_md(s: &str) -> String {
    let mut s = s.to_string();
    let tail = s.trim_end_matches(js_space).len();
    if s[..tail].ends_with(")*") {
        if let Some(p) = s.match_indices("*(").map(|(p, _)| p).find(|&p| p + 2 <= tail - 2) {
            s.truncate(p);
        }
    }
    js_trim(&collapse(&s.replace("**", "").replace('`', ""))).to_string()
}

pub struct Glossary {
    pub defs: Vec<(String, String)>,
    pub spelled: Vec<(String, String)>,
}

pub fn read_glossary(text: &str) -> Glossary {
    let mut g = Glossary { defs: Vec::new(), spelled: Vec::new() };
    let put = |m: &mut Vec<(String, String)>, k: String, v: String| match m.iter_mut().find(|(x, _)| *x == k) {
        Some(slot) => slot.1 = v,
        None => m.push((k, v)),
    };
    for ln in text.split('\n') {
        let Some((name, spelled, body)) = gloss_line(js_trim(ln.strip_suffix('\r').unwrap_or(ln))) else { continue };
        if let Some(f) = spelled.filter(|f| !f.is_empty()) {
            put(&mut g.spelled, name.clone(), f.chars().filter(|c| !js_space(*c)).collect());
        }
        let body = strip_md(&body);
        let dot = body.find(". ");
        let head = dot.filter(|&d| d > 0).map(|d| &body[..d]).unwrap_or("");
        let is_label = !head.is_empty() && head.split(js_space).filter(|w| !w.is_empty()).count() <= 3;
        let def = if is_label {
            js_trim(&body[dot.unwrap() + 2..]).to_string()
        } else {
            format!("{}.", js_trim(body.strip_suffix('.').unwrap_or(&body)))
        };
        put(&mut g.defs, name, def);
    }
    g
}

