//! glyph-logic — Port of `scripts/core/logic.js` — the oracle. The JS module's own summary:
//!
//!   the `[logic]` block: arithmetic and boolean rules, kept apart from the command tree.
//!
//! EMS-001 ORD-0005. Each regex of the JS is ported as a matcher of its own that
//! tries what the JS regex tries, in the order it tries it — greedy longest
//! first, lazy shortest first — so a match that only backtracking finds is
//! found here too. Three JS defects are reproduced, as the oracle answers them
//! (EMS-001/RETURN.md): `constructor` and `__proto__` read as already defined
//! and already seen, `? -> b` is an empty line, and `!=` reads as `não =`.

use glyph_util::esc;

/// A `[logic]` block, read.
#[derive(Debug, Clone, PartialEq)]
pub struct Logic {
    pub name: String,
    pub rules: Vec<Rule>,
    pub gaps: Vec<Gap>,
    pub missing: Vec<String>,
}

/// One line of the block. `name` for a `let`, `cond` and `then` for a
/// `when`/`unless`; the tests write the fields in the order the JS sets them.
#[derive(Debug, Clone, PartialEq)]
pub struct Rule {
    pub line: usize,
    pub source: String,
    pub kind: &'static str,
    pub name: Option<String>,
    pub cond: Option<String>,
    pub then: Option<String>,
    pub expr: String,
    pub reads: String,
    pub uses: Vec<String>,
}

/// A diagnostic the block raises.
#[derive(Debug, Clone, PartialEq)]
pub struct Gap {
    pub sev: &'static str,
    pub lab: &'static str,
    pub code: &'static str,
    pub msg: String,
}

/* ---------------------------------------------------------------- *
 * what the JS regexes read: \s, \w, \d, `.`, trim
 * ---------------------------------------------------------------- */

fn space(c: char) -> bool {
    matches!(c, '\t' | '\n' | '\u{b}' | '\u{c}' | '\r' | ' ' | '\u{a0}' | '\u{1680}' | '\u{2000}'..='\u{200a}'
        | '\u{2028}' | '\u{2029}' | '\u{202f}' | '\u{205f}' | '\u{3000}' | '\u{feff}')
}
fn word(c: char) -> bool {
    c.is_ascii_alphanumeric() || c == '_'
}
fn digit(c: char) -> bool {
    c.is_ascii_digit()
}
/// What `.` does not match.
fn terminator(c: char) -> bool {
    matches!(c, '\n' | '\r' | '\u{2028}' | '\u{2029}')
}
fn trim(s: &str) -> String {
    s.trim_matches(space).to_string()
}
fn st(c: &[char]) -> String {
    c.iter().collect()
}
fn ws(s: &[char], mut i: usize) -> usize {
    while i < s.len() && space(s[i]) {
        i += 1;
    }
    i
}
fn digits(s: &[char], mut i: usize) -> usize {
    while i < s.len() && digit(s[i]) {
        i += 1;
    }
    i
}
/// `word` at `i`, ASCII case-insensitive (the `/i` of a regex without `u`).
fn ci(s: &[char], i: usize, word: &str) -> Option<usize> {
    let w: Vec<char> = word.chars().collect();
    (i + w.len() <= s.len() && w.iter().enumerate().all(|(k, c)| s[i + k].eq_ignore_ascii_case(c))).then_some(i + w.len())
}
/// `[A-Za-z_][\w.]*` at `i`: its end.
fn ident_dot(s: &[char], i: usize) -> Option<usize> {
    if i >= s.len() || !(s[i].is_ascii_alphabetic() || s[i] == '_') {
        return None;
    }
    let mut j = i + 1;
    while j < s.len() && (word(s[j]) || s[j] == '.') {
        j += 1;
    }
    Some(j)
}

/// `(^|[^\w])`, then `rest` at the position after it: the alternatives in the
/// JS's order — `^` only at 0, then one non-word character — and the first that
/// lets `rest` match. Answers the character taken, the end, and `rest`'s answer.
fn lead<T>(s: &[char], i: usize, rest: impl Fn(usize) -> Option<(usize, T)>) -> Option<(Option<char>, usize, T)> {
    if i == 0 {
        if let Some((end, t)) = rest(0) {
            return Some((None, end, t));
        }
    }
    if i < s.len() && !word(s[i]) {
        if let Some((end, t)) = rest(i + 1) {
            return Some((Some(s[i]), end, t));
        }
    }
    None
}

/// `s.replace(re, …)` with a global regex that never matches empty: `at`
/// answers the end of a match at `i` and what replaces it.
fn replace_all(s: &[char], at: impl Fn(&[char], usize) -> Option<(usize, String)>) -> Vec<char> {
    let mut out = Vec::new();
    let mut i = 0;
    while i < s.len() {
        if let Some((end, rep)) = at(s, i) {
            out.extend(rep.chars());
            i = end;
        } else {
            out.push(s[i]);
            i += 1;
        }
    }
    out
}

fn p(c: Option<char>) -> String {
    c.map(String::from).unwrap_or_default()
}

/// `(\d+)\s*d\s*(\d+)` at `i`, case-insensitive `d`: the end and both counts.
fn dice(s: &[char], i: usize) -> Option<(usize, String, String)> {
    let a = digits(s, i);
    if a == i {
        return None;
    }
    let d = ci(s, ws(s, a), "d")?;
    let b0 = ws(s, d);
    let b = digits(s, b0);
    (b > b0).then(|| (b, st(&s[i..a]), st(&s[b0..b])))
}

/// `k[hl]`, case-insensitive: the end and the two letters as written.
fn keep(s: &[char], i: usize) -> Option<(usize, String)> {
    let k = ci(s, i, "k")?;
    (k < s.len() && matches!(s[k], 'h' | 'H' | 'l' | 'L')).then(|| (k + 1, st(&s[i..k + 1])))
}

/// `name\s*\[([^\]]*)\]` at `i`, `name` case-insensitive or exact.
fn bracketed(s: &[char], i: usize, name: &str, insensitive: bool) -> Option<(usize, String)> {
    let j = if insensitive { ci(s, i, name)? } else { (s.get(i) == name.chars().next().as_ref()).then_some(i + 1)? };
    let o = ws(s, j);
    if s.get(o) != Some(&'[') {
        return None;
    }
    let c = (o + 1..s.len()).find(|&k| s[k] == ']')?;
    Some((c + 1, st(&s[o + 1..c])))
}

/// `name\s+([A-Za-z_][\w.]*)` (`plus`) or `name\s*(…)` at `i`.
fn named(s: &[char], i: usize, name: &str, insensitive: bool, plus: bool) -> Option<(usize, String)> {
    let j = if insensitive { ci(s, i, name)? } else { (s.get(i) == name.chars().next().as_ref()).then_some(i + 1)? };
    let k = ws(s, j);
    if plus && k == j {
        return None;
    }
    let e = ident_dot(s, k)?;
    Some((e, st(&s[k..e])))
}

/// `\s<\s*(\d+)\s*$` (or `>`), the first place it matches: where it starts, and
/// the number.
fn postfix(s: &[char], sign: char) -> Option<(usize, String)> {
    (0..s.len().saturating_sub(1)).find_map(|i| {
        if !space(s[i]) || s[i + 1] != sign {
            return None;
        }
        let a = ws(s, i + 2);
        let b = digits(s, a);
        (b > a && ws(s, b) == s.len()).then(|| (i, st(&s[a..b])))
    })
}

/// `expandExpr`: dice and shorthand rewritten as plain expressions.
pub fn expand_expr(raw: &str) -> String {
    let mut s: Vec<char> = format!(" {raw} ").chars().collect();
    s = replace_all(&s, |s, i| {
        lead(s, i, |q| {
            let (e, nd, fc) = dice(s, q)?;
            let (e, kk) = keep(s, ws(s, e))?;
            let m0 = ws(s, e);
            let m = digits(s, m0);
            Some((m, (nd, fc, kk, st(&s[m0..m]))))
        }).map(|(c, end, (nd, fc, kk, mm))| {
            let keep = if mm.is_empty() { "1".to_string() } else { mm };
            let side = if kk.eq_ignore_ascii_case("kh") { " maior(es)" } else { " menor(es)" };
            (end, format!("{}rola {nd} dado(s) de {fc} faces, mantém o(s) {keep}{side}", p(c)))
        })
    });
    s = replace_all(&s, |s, i| {
        lead(s, i, |q| dice(s, q).map(|(e, nd, fc)| (e, (nd, fc))))
            .map(|(c, end, (nd, fc))| (end, format!("{}rola {nd} dado(s) de {fc} faces", p(c))))
    });
    for (name, f) in [("pb", "floor"), ("pc", "ceil"), ("ar", "round")] {
        s = replace_all(&s, |s, i| lead(s, i, |q| bracketed(s, q, name, true)).map(|(c, end, x)| (end, format!("{}{f}({x})", p(c)))));
    }
    for (name, f) in [("pb", "floor"), ("pc", "ceil"), ("ar", "round")] {
        s = replace_all(&s, |s, i| lead(s, i, |q| named(s, q, name, true, true)).map(|(c, end, x)| (end, format!("{}{f}({x})", p(c)))));
    }
    for (name, f) in [("^", "ceil"), ("_", "floor"), ("~", "round")] {
        s = replace_all(&s, |s, i| lead(s, i, |q| bracketed(s, q, name, false)).map(|(c, end, x)| (end, format!("{}{f}({x})", p(c)))));
    }
    for (name, f) in [("^", "ceil"), ("_", "floor"), ("~", "round")] {
        s = replace_all(&s, |s, i| lead(s, i, |q| named(s, q, name, false, false)).map(|(c, end, x)| (end, format!("{}{f}({x})", p(c)))));
    }
    for (sign, word) in [('<', "máximo"), ('>', "mínimo")] {
        if let Some((at, n)) = postfix(&s, sign) {
            s.truncate(at);
            s.extend(format!(", {word} {n}").chars());
        }
    }
    s = replace_all(&s, |s, i| {
        let dbl = ['.', 'd', 'b', 'l'];
        (i + 4 <= s.len() && s[i..i + 4] == dbl && s.get(i + 4).is_none_or(|c| !word(*c)))
            .then(|| (i + 4, ".tem_duplas".to_string()))
    });
    s = replace_all(&s, |s, i| {
        let bang = |q: usize| (s.get(q) == Some(&'!')).then(|| (ws(s, q + 1), ()));
        let first = if i == 0 { bang(0).map(|(e, _)| (None, e)) } else { None };
        first.or_else(|| {
            (i < s.len() && !word(s[i]) && !"!<>=".contains(s[i])).then(|| bang(i + 1).map(|(e, _)| (Some(s[i]), e))).flatten()
        }).map(|(c, end)| (end, format!("{}não ", p(c))))
    });
    let t = trim(&st(&s));
    let mut out = String::new();
    let mut run = false;
    for c in t.chars() {
        if space(c) {
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

const RESERVED: [&str; 30] = ["and", "or", "not", "if", "then", "else", "true", "false", "min", "max", "abs", "sum",
    "floor", "ceil", "round", "sem", "se", "senao", "entao", "no", "de", "do", "da", "pb", "pc", "ar", "kh", "kl", "e", "ou"];

/// `freeVars`: the names a rule needs from outside, in the order they appear.
pub fn free_vars(raw: &str) -> Vec<String> {
    let mut s: Vec<char> = raw.chars().collect();
    s = replace_all(&s, |s, i| {
        lead(s, i, |q| {
            let (e, _, _) = dice(s, q)?;
            let e = ws(s, e);
            Some((keep(s, e).map_or(e, |(k, _)| digits(s, ws(s, k))), ()))
        }).map(|(_, end, _)| (end, " ".to_string()))
    });
    for q in ['`', '\''] {
        s = replace_all(&s, |s, i| {
            (s[i] == q).then(|| (i + 1..s.len()).find(|&k| s[k] == q)).flatten().map(|c| (c + 1, " ".to_string()))
        });
    }
    s = replace_all(&s, |s, i| {
        let mut j = i + 1;
        while j < s.len() && word(s[j]) {
            j += 1;
        }
        (s[i] == '.' && j > i + 1).then(|| (j, " ".to_string()))
    });
    s = replace_all(&s, |s, i| {
        let mark = |q: usize| (q < s.len() && "_^~".contains(s[q]) && s.get(q + 1).is_some_and(|c| *c == '[' || space(*c))).then_some(q + 1);
        let first = if i == 0 { mark(0).map(|e| (None, e)) } else { None };
        first.or_else(|| (i < s.len() && !word(s[i])).then(|| mark(i + 1).map(|e| (Some(s[i]), e))).flatten())
            .map(|(c, end)| (end, format!("{} ", p(c))))
    });
    s = replace_all(&s, |s, i| {
        if !digit(s[i]) || (i > 0 && word(s[i - 1])) {
            return None;
        }
        let a = digits(s, i);
        let boundary = |e: usize| e == s.len() || !word(s[e]);
        let frac = (s.get(a) == Some(&'.')).then(|| digits(s, a + 1)).filter(|&b| b > a + 1);
        match frac {
            Some(b) if boundary(b) => Some(b),
            _ if boundary(a) => Some(a),
            _ => None,
        }.map(|e| (e, " ".to_string()))
    });
    let (mut out, mut seen): (Vec<String>, Vec<String>) = (Vec::new(), Vec::new());
    let mut i = 0;
    while i < s.len() {
        if !(s[i].is_ascii_alphabetic() || s[i] == '_') {
            i += 1;
            continue;
        }
        let a = i;
        while i < s.len() && (s[i].is_ascii_alphanumeric() || s[i] == '_') {
            i += 1;
        }
        let w = st(&s[a..i]);
        let low = w.to_ascii_lowercase();
        /* `seen` is a plain object: Object.prototype has these two already */
        if w == "_" || RESERVED.contains(&low.as_str()) || seen.contains(&low) || low == "constructor" || low == "__proto__" {
            continue;
        }
        seen.push(low);
        out.push(w);
    }
    out
}

/// `^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$`: the name and the expression.
fn let_rule(l: &[char]) -> Option<(String, String)> {
    if l.is_empty() || !(l[0].is_ascii_alphabetic() || l[0] == '_') {
        return None;
    }
    let mut i = 1;
    while i < l.len() && word(l[i]) {
        i += 1;
    }
    let eq = ws(l, i);
    if l.get(eq) != Some(&'=') {
        return None;
    }
    let r = ws(l, eq + 1);
    (r < l.len() && !l[r..].iter().any(|c| terminator(*c))).then(|| (st(&l[..i]), st(&l[r..])))
}

/// `^(!|\?)?\s*(.+?)\s*->\s*(.+)$`, searched as the JS searches it: the mark
/// taken or not, the leading space longest first, the condition shortest
/// first. Answers the mark, the condition and the consequent.
fn when_rule(l: &[char]) -> Option<(Option<char>, String, String)> {
    let marks: Vec<(Option<char>, usize)> = match l.first() {
        Some(c @ ('!' | '?')) => vec![(Some(*c), 1), (None, 0)],
        _ => vec![(None, 0)],
    };
    for (mark, at) in marks {
        for start in (at..=ws(l, at)).rev() {
            for end in start + 1..=l.len() {
                if terminator(l[end - 1]) {
                    break;
                }
                let arrow = ws(l, end);
                if l.get(arrow) != Some(&'-') || l.get(arrow + 1) != Some(&'>') {
                    continue;
                }
                let t = ws(l, arrow + 2);
                if t < l.len() && !l[t..].iter().any(|c| terminator(*c)) {
                    return Some((mark, st(&l[start..end]), st(&l[t..])));
                }
            }
        }
    }
    None
}

/// `\s[<>]\s*\d+\s*$` (either sign, or one).
fn capped(expr: &str, signs: &str) -> bool {
    let s: Vec<char> = expr.chars().collect();
    signs.chars().any(|c| postfix(&s, c).is_some())
}

/// `parseLogic(name, body)`.
pub fn parse_logic(name: &str, body: &str) -> Logic {
    let (mut rules, mut gaps): (Vec<Rule>, Vec<Gap>) = (Vec::new(), Vec::new());
    let mut defined: Vec<String> = Vec::new();
    let mut cap_noted = false;
    /* `defined` is a plain object: Object.prototype has these two already */
    let is_defined = |d: &[String], n: &str| d.iter().any(|x| x == n) || n == "constructor" || n == "__proto__";
    for (ln, raw) in body.split('\n').enumerate() {
        let raw = raw.strip_suffix('\r').unwrap_or(raw);
        let line = trim(raw);
        if line.is_empty() || line.starts_with('#') || line.starts_with("//") {
            continue;
        }
        let l: Vec<char> = line.chars().collect();
        let mut rule = Rule { line: ln + 1, source: line.clone(), kind: "expr", name: None, cond: None, then: None,
                              expr: String::new(), reads: String::new(), uses: Vec::new() };
        if let Some((n, expr)) = let_rule(&l) {
            rule.kind = "let";
            rule.expr = trim(&expr);
            if is_defined(&defined, &n) {
                gaps.push(Gap { sev: "ask", lab: "conflito", code: "DuplicateBinding",
                                msg: format!("<code>{}</code> definido 2x. Qual vale?", esc(&n)) });
            }
            defined.push(n.clone());
            rule.name = Some(n);
        } else if let Some((mark, cond, then)) = when_rule(&l) {
            rule.kind = if mark == Some('!') { "unless" } else { "when" };
            rule.cond = Some(trim(&cond));
            rule.then = Some(trim(&then));
            rule.expr = trim(&cond);
        } else if line.starts_with('!') || line.starts_with('?') {
            rule.kind = if line.starts_with('!') { "unless" } else { "when" };
            let cond = trim(&st(&l[1..]));
            rule.cond = Some(cond.clone());
            rule.expr = cond;
            gaps.push(Gap { sev: "ask", lab: "sem então", code: "MissingConsequent",
                            msg: format!("<code>{}</code>: consequência? Use <code>-&gt;</code>.", esc(&line)) });
        } else {
            rule.expr = line.clone();
        }
        if rule.expr.is_empty() {
            gaps.push(Gap { sev: "fix", lab: "vazio", code: "EmptyLogicLine", msg: format!("linha {} sem expressão.", rule.line) });
            continue;
        }
        let then = rule.then.clone().filter(|t| !t.is_empty());
        rule.reads = expand_expr(&rule.expr) + &then.as_ref().map(|t| format!(" → então {}", expand_expr(t))).unwrap_or_default();
        rule.uses = free_vars(&rule.expr);
        if let Some(t) = then.filter(|t| t.contains('=')) {
            rule.uses.extend(free_vars(&t));
        }
        if !cap_noted && capped(&rule.expr, "<>") {
            cap_noted = true;
            gaps.push(Gap { sev: "note", lab: "read as", code: "CapFloorNotice",
                            msg: format!("<code>{}</code> in postfix reads as a cap or a floor, not a comparison. \
                                          To compare, write <code>&lt;=</code> or <code>&gt;=</code>.",
                                         if capped(&rule.expr, "<") { "&lt;" } else { "&gt;" }) });
        }
        rules.push(rule);
    }
    let mut missing: Vec<String> = Vec::new();
    for v in rules.iter().flat_map(|r| r.uses.iter()) {
        if !is_defined(&defined, v) && !missing.contains(v) {
            missing.push(v.clone());
        }
    }
    if !missing.is_empty() {
        let names: Vec<String> = missing.iter().map(|v| format!("<code>{}</code>", esc(v))).collect();
        gaps.push(Gap { sev: "ask", lab: "undefined", code: "UndefinedVariable",
                        msg: format!("{} used and never defined. External input, or a missing line?", names.join(", ")) });
    }
    Logic { name: name.to_string(), rules, gaps, missing }
}
