//! glyph-lex — Port of `scripts/core/lexer.js` — the oracle. The JS module's own summary:
//!
//!   text into tokens, and a name into what the engine knows it as.
//!
//! EMS-001 ORD-0004. The source is read as UTF-16 code units, as the JS reads a
//! string, so every span is the JS's span. Each regex of the JS is ported by
//! what it matches, backtracking included; and two JS defects are reproduced,
//! because the oracle is what the JS answers (EMS-001/RETURN.md):
//! `Object.prototype` answering a lookup in `EMO` and `SESSION`, and `[off]`
//! finding `[ON]` in an upper-cased copy whose indices can drift.

use glyph_stores::{Context, Value};
use glyph_vocab::{derived, get, ALIAS, EMO, INSTR, META, MODE, SESSION, STRUCT};

/// One token. The fields a kind does not carry stay `None`; `to_json` in the
/// tests writes the rest in the order the JS object has them.
#[derive(Debug, Clone, PartialEq, Default)]
pub struct Token {
    pub k: &'static str,
    pub v: Option<String>,
    pub def: Option<bool>,
    pub body: Option<String>,
    pub s: usize,
    pub e: usize,
    pub closed: Option<bool>,
    pub stray: Option<bool>,
    pub form: Option<&'static str>,
    pub closed_by: Option<&'static str>,
    pub order: Option<usize>,
    pub unterminated: Option<bool>,
    pub delim: Option<&'static str>,
}

fn tok(k: &'static str, v: String, s: usize, e: usize) -> Token {
    Token { k, v: Some(v), s, e, ..Token::default() }
}

/// JS `\s` on one UTF-16 unit: WhiteSpace and LineTerminator.
pub fn js_space(c: u16) -> bool {
    matches!(c, 0x09..=0x0d | 0x20 | 0xa0 | 0x1680 | 0x2000..=0x200a | 0x2028 | 0x2029 | 0x202f | 0x205f | 0x3000 | 0xfeff)
}
fn alpha(c: u16) -> bool {
    (c as u8 as u16 == c) && (c as u8).is_ascii_alphabetic()
}
fn alnum(c: u16) -> bool {
    (c as u8 as u16 == c) && (c as u8).is_ascii_alphanumeric()
}
/// `NAME_CH`: `[A-Za-z0-9_.]`.
pub fn name_ch(c: u16) -> bool {
    alnum(c) || c == b'_' as u16 || c == b'.' as u16
}
fn is(c: Option<&u16>, ch: u8) -> bool {
    c == Some(&(ch as u16))
}

/// A JS `slice(a, b)` of the units, as a string.
fn slice(u: &[u16], a: usize, b: usize) -> String {
    let (a, b) = (a.min(u.len()), b.min(u.len()));
    if a >= b {
        return String::new();
    }
    String::from_utf16(&u[a..b]).expect("a slice that splits a surrogate pair")
}

/// `\s*` from `i`: the first unit that is not whitespace.
fn ws(u: &[u16], mut i: usize) -> usize {
    while i < u.len() && js_space(u[i]) {
        i += 1;
    }
    i
}

/// `word` at `i`, ASCII case-insensitive, as `/word/i` compares without `u`.
fn word_ci(u: &[u16], i: usize, word: &str) -> Option<usize> {
    let w = word.as_bytes();
    (i + w.len() <= u.len() && w.iter().enumerate().all(|(k, b)| {
        let c = u[i + k];
        c < 128 && (c as u8).eq_ignore_ascii_case(b)
    })).then_some(i + w.len())
}

/// `/^\[\s*word\s*\]/i` at `i`: the end of the match.
fn fence_open(u: &[u16], i: usize, word: &str) -> Option<usize> {
    let j = word_ci(u, ws(u, i + 1), word)?;
    let j = ws(u, j);
    is(u.get(j), b']').then_some(j + 1)
}

/// `/\[\s*\/\s*word\s*\]/i` from `from`: where it starts, and where it ends.
fn fence_close(u: &[u16], from: usize, word: &str) -> Option<(usize, usize)> {
    (from..u.len()).filter(|&k| u[k] == b'[' as u16).find_map(|k| {
        let j = ws(u, k + 1);
        if !is(u.get(j), b'/') {
            return None;
        }
        let j = ws(u, word_ci(u, ws(u, j + 1), word)?);
        is(u.get(j), b']').then_some((k, j + 1))
    })
}

/// `/^\[\s*logic\s*(?:[:\-\s]\s*([^\]]*?))?\s*\]/i` at `i`: the end of the
/// match and the name. The match ends at the first `]`; what lies between
/// `logic` and it must be whitespace, or a separator — `:`, `-`, or the last
/// whitespace before a word — then the name.
fn logic_open(u: &[u16], i: usize) -> Option<(usize, String)> {
    let after = word_ci(u, ws(u, i + 1), "logic")?;
    let close = (after..u.len()).find(|&k| u[k] == b']' as u16)?;
    let lead = ws(u, after).min(close);
    let name = if lead == close {
        String::new()
    } else if u[lead] == b':' as u16 || u[lead] == b'-' as u16 {
        slice(u, lead + 1, close)
    } else if lead > after {
        slice(u, lead, close)
    } else {
        return None;
    };
    Some((close + 1, js_trim(&name)))
}

/// JS `trim()`.
pub fn js_trim(s: &str) -> String {
    let u: Vec<u16> = s.encode_utf16().collect();
    let a = u.iter().position(|&c| !js_space(c)).unwrap_or(u.len());
    let b = u.iter().rposition(|&c| !js_space(c)).map_or(a, |p| p + 1);
    slice(&u, a, b)
}

/// `EMO[x]` as the JS object answers it: the table, or `Object.prototype`,
/// whose one all-letter lower-case property is `constructor`.
fn emo_has(lower: &str) -> bool {
    get(EMO, lower).is_some() || lower == "constructor"
}

/// `/^\s*R\s*$/` (or `[Rr]` with `lower`) on the text gathered so far.
fn return_mark(buf: &[u16], lower: bool) -> bool {
    let a = buf.iter().position(|&c| !js_space(c));
    let b = buf.iter().rposition(|&c| !js_space(c));
    matches!((a, b), (Some(a), Some(b)) if a == b && (buf[a] == b'R' as u16 || (lower && buf[a] == b'r' as u16)))
}

pub fn tokenize(src: &str) -> Vec<Token> {
    let u: Vec<u16> = src.encode_utf16().collect();
    let n = u.len();
    let mut t: Vec<Token> = Vec::new();
    let mut i = 0;
    let (mut off, mut expect_bare) = (false, false);
    let mut text: Vec<u16> = Vec::new();
    let mut text_start: Option<usize> = None;
    let mut upper: Option<Vec<u16>> = None;

    fn flush(t: &mut Vec<Token>, text: &mut Vec<u16>, text_start: &mut Option<usize>) {
        if !text.is_empty() {
            if text.iter().any(|&c| !js_space(c)) {
                let s = text_start.unwrap();
                t.push(tok("text", String::from_utf16(text).expect("text that splits a surrogate pair"), s, s + text.len()));
            }
            text.clear();
            *text_start = None;
        }
    }
    macro_rules! add {
        ($units:expr) => {{
            if text_start.is_none() {
                text_start = Some(i);
            }
            text.extend_from_slice($units);
        }};
    }

    while i < n {
        if off {
            /* the JS upper-cases the whole source and reads its index back into
               the original: a character that changes length moves the rest */
            let up = upper.get_or_insert_with(|| {
                String::from_utf16_lossy(&u).to_uppercase().encode_utf16().collect()
            });
            let pat: Vec<u16> = "[ON]".encode_utf16().collect();
            let idx = (i..up.len().saturating_sub(3)).find(|&k| up[k..k + 4] == pat[..]);
            let end = idx.unwrap_or(n);
            if end > i {
                t.push(tok("raw", slice(&u, i, end), i, end));
            }
            i = end;
            match idx {
                Some(_) => {
                    t.push(tok("mode", "ON".into(), i, i + 4));
                    i += 4;
                    off = false;
                }
                None => t.push(tok("modeUnclosed", String::new(), n, n)),
            }
            continue;
        }

        let c = u[i];
        let want_bare = expect_bare;
        expect_bare = false;
        if want_bare {
            if js_space(c) {
                expect_bare = true;
                i += 1;
                continue;
            }
            if alpha(c) {
                let bs = i;
                while i < n && name_ch(u[i]) {
                    i += 1;
                }
                t.push(tok("bareTag", slice(&u, bs, i), bs, i));
                continue;
            }
        }

        if c == b'[' as u16 {
            flush(&mut t, &mut text, &mut text_start);
            /* [--name and [--name= */
            if is(u.get(i + 1), b'-') && is(u.get(i + 2), b'-') {
                let ns = ws(&u, i + 3);
                let mut ne = ns;
                while ne < n && (name_ch(u[ne]) || u[ne] == b'-' as u16) {
                    ne += 1;
                }
                if ne > ns {
                    let mut e = ws(&u, ne);
                    let def = is(u.get(e), b'=');
                    if def {
                        e += 1;
                    }
                    t.push(Token { k: "tpl", v: Some(slice(&u, ns, ne)), def: Some(def), s: i, e, ..Token::default() });
                    i = e;
                    continue;
                }
            }
            if is(u.get(i + 1), b'=') {
                t.push(tok("chain", "[=".into(), i, i + 2));
                i += 2;
                continue;
            }
            if let Some((body_start, name)) = logic_open(&u, i) {
                let close = fence_close(&u, body_start, "logic");
                let body_end = close.map_or(n, |(k, _)| k);
                let e = close.map_or(n, |(_, end)| end);
                t.push(Token { k: "logic", v: Some(name), body: Some(slice(&u, body_start, body_end)), s: i, e,
                               closed: Some(close.is_some()), ..Token::default() });
                i = e;
                continue;
            }
            if let Some(body_start) = fence_open(&u, i, "raw") {
                let close = fence_close(&u, body_start, "raw");
                let body_end = close.map_or(n, |(k, _)| k);
                let e = close.map_or(n, |(_, end)| end);
                t.push(Token { k: "rawfence", body: Some(slice(&u, body_start, body_end)), s: i, e,
                               closed: Some(close.is_some()), ..Token::default() });
                i = e;
                continue;
            }
            if let Some(e) = fence_open(&u, i, "off") {
                t.push(tok("mode", "OFF".into(), i, e));
                i = e;
                off = true;
                continue;
            }
            if let Some(e) = fence_open(&u, i, "on") {
                t.push(Token { stray: Some(true), ..tok("mode", "ON".into(), i, e) });
                i = e;
                continue;
            }
            if is(u.get(i + 1), b'/') {
                let (ns, mut j) = (i + 2, i + 2);
                while j < n && name_ch(u[j]) {
                    j += 1;
                }
                let ce = if is(u.get(j), b']') { j + 1 } else { j };
                t.push(tok("closeTag", slice(&u, ns, j), i, ce));
                i = ce;
                continue;
            }
            let (ns, mut j) = (i + 1, i + 1);
            while j < n && name_ch(u[j]) {
                j += 1;
            }
            t.push(tok("open", slice(&u, ns, j), i, j));
            i = j;
            continue;
        }

        if c == b']' as u16 {
            flush(&mut t, &mut text, &mut text_start);
            t.push(tok("close", "]".into(), i, i + 1));
            i += 1;
            continue;
        }

        if c == b'`' as u16 {
            flush(&mut t, &mut text, &mut text_start);
            let (ls, mut j) = (i + 1, i + 1);
            let mut by = "eof";
            while j < n {
                if u[j] == b'`' as u16 {
                    by = "tick";
                    break;
                }
                if u[j] == b']' as u16 {
                    by = "bracket";
                    break;
                }
                j += 1;
            }
            let e = if by == "tick" { j + 1 } else { j };
            t.push(Token { form: Some("tick"), closed_by: Some(by), ..tok("literal", slice(&u, ls, j), i, e) });
            i = e;
            continue;
        }

        if c == b'\'' as u16 {
            flush(&mut t, &mut text, &mut text_start);
            let (qs, mut j) = (i + 1, i + 1);
            let mut closed = false;
            while j < n {
                if u[j] == b'\'' as u16 {
                    closed = true;
                    break;
                }
                if u[j] == b']' as u16 || u[j] == b'\n' as u16 {
                    break;
                }
                j += 1;
            }
            let e = if closed { j + 1 } else { j };
            t.push(Token { form: Some("quote"), closed_by: Some(if closed { "quote" } else { "unterminated" }),
                           ..tok("literal", slice(&u, qs, j), i, e) });
            i = e;
            continue;
        }

        if c == b'\\' as u16 {
            let (bs, mut bj) = (i, i + 1);
            while bj < n && (alpha(u[bj]) || u[bj] == b'\\' as u16) {
                bj += 1;
            }
            if bj > bs + 1 {
                add!(&u[bs..bj]);
                flush(&mut t, &mut text, &mut text_start);
                t.push(tok("badmood", slice(&u, bs, bj), bs, bj));
                i = bj;
                continue;
            }
            add!(&[c]);
            i += 1;
            continue;
        }

        if c == b';' as u16 {
            flush(&mut t, &mut text, &mut text_start);
            if is(u.get(i + 1), b';') {
                t.push(tok("linebreak", ";;".into(), i, i + 2));
                i += 2;
            } else {
                t.push(tok("semi", ";".into(), i, i + 1));
                i += 1;
            }
            continue;
        }

        if c == b',' as u16 {
            let pv_bare = t.last().is_some_and(|p| p.k == "bareTag");
            flush(&mut t, &mut text, &mut text_start);
            t.push(tok("comma", ",".into(), i, i + 1));
            i += 1;
            if pv_bare {
                expect_bare = true;
            }
            continue;
        }

        if c == b'-' as u16 && return_mark(&text, true) && !u.get(i + 1).is_some_and(|&x| alnum(x)) {
            t.push(tok("return", "r-".into(), text_start.unwrap(), i + 1));
            text.clear();
            text_start = None;
            i += 1;
            continue;
        }

        if c == b':' as u16 {
            if return_mark(&text, false) {
                t.push(tok("return", "R:".into(), text_start.unwrap(), i + 1));
                text.clear();
                text_start = None;
                i += 1;
                continue;
            }
            flush(&mut t, &mut text, &mut text_start);
            t.push(tok("colon", ":".into(), i, i + 1));
            i += 1;
            continue;
        }

        if c == b'=' as u16 {
            flush(&mut t, &mut text, &mut text_start);
            t.push(tok("equals", "=".into(), i, i + 1));
            i += 1;
            continue;
        }

        if c == b'-' as u16 {
            if text.is_empty() && t.last().is_some_and(|p| p.k == "open" || p.k == "bareTag") {
                t.push(tok("extend", "-".into(), i, i + 1));
                i += 1;
                expect_bare = true;
                continue;
            }
            add!(&[c]);
            i += 1;
            continue;
        }

        if c == b'/' as u16 {
            let in_chain = text.is_empty() && t.last().is_some_and(|p| matches!(p.k, "extend" | "bareTag" | "comma"));
            if in_chain {
                let (rs, mut rj) = (i, i + 1);
                while rj < n && (alpha(u[rj]) || u[rj] == b'/' as u16) {
                    rj += 1;
                }
                add!(&u[rs..rj]);
                flush(&mut t, &mut text, &mut text_start);
                t.push(tok("badslash", slice(&u, rs, rj), rs, rj));
                i = rj;
                continue;
            }
            let (ps, mut pb) = (i + 1, i + 1);
            while pb < n && alpha(u[pb]) {
                pb += 1;
            }
            let first = slice(&u, ps, pb);
            if !first.is_empty() && is(u.get(pb), b'/') && emo_has(&first.to_lowercase()) {
                flush(&mut t, &mut text, &mut text_start);
                let st = i;
                i += 1;
                let (mut ord, mut guard) = (0, 0);
                while i < n && {
                    guard += 1;
                    guard <= 64
                } {
                    let es = i;
                    while i < n && alpha(u[i]) {
                        i += 1;
                    }
                    if i == es {
                        break;
                    }
                    let had = is(u.get(i), b'/');
                    let o = ord;
                    ord += 1;
                    t.push(Token { order: Some(o), unterminated: Some(!had), delim: Some("/"),
                                   ..tok("emotion", slice(&u, es, i), if o == 0 { st } else { es - 1 }, i + usize::from(had)) });
                    if had {
                        i += 1;
                        if !(i < n && alpha(u[i])) {
                            break;
                        }
                    } else {
                        break;
                    }
                }
                continue;
            }
            add!(&[c]);
            i += 1;
            continue;
        }

        add!(&[c]);
        i += 1;
    }
    flush(&mut t, &mut text, &mut text_start);
    t
}

/// What the engine knows a name as.
#[derive(Debug, Clone, PartialEq)]
pub struct Class {
    pub tier: &'static str,
    pub canonical: String,
    pub alias: Option<bool>,
    pub alias_of: Option<String>,
    pub gloss: Gloss,
    pub merged: Option<bool>,
    pub blend_id: Option<String>,
}

/// A gloss, as the JS object holds it: text; or a value `JSON.stringify`
/// drops, `undefined` or — through `Object.prototype` — a function; or
/// `Object.prototype` itself, written `{}`.
#[derive(Debug, Clone, PartialEq)]
pub enum Gloss {
    Text(String),
    Absent,
    Prototype,
}

fn class(tier: &'static str, canonical: &str, gloss: &str) -> Class {
    Class { tier, canonical: canonical.to_string(), alias: None, alias_of: None, gloss: Gloss::Text(gloss.to_string()),
            merged: None, blend_id: None }
}

/// `classify(name, opts)`, with the context's rules for the blends and
/// `session: false` refusing the session words.
pub fn classify(name: &str, ctx: &Context, session: bool) -> Class {
    if name.is_empty() {
        return class("empty", "", "");
    }
    let (up, low) = (name.to_uppercase(), name.to_lowercase());
    for (tier, table) in [("mode", MODE), ("struct", STRUCT), ("meta", META)] {
        if let Some(g) = get(table, &up) {
            return class(tier, &up, g);
        }
    }
    if let Some(f) = get(ALIAS, &up) {
        return Class { alias: Some(true), alias_of: Some(f.to_string()), merged: Some(get(INSTR, &up).is_some()),
                       gloss: get(INSTR, f).map_or(Gloss::Absent, |g| Gloss::Text(g.into())), ..class("instr", f, "") };
    }
    if let Some(g) = get(INSTR, &up) {
        return class("instr", &up, g);
    }
    let squashed: String = up.chars().filter(|c| c.is_ascii_uppercase() || c.is_ascii_digit()).collect();
    if let Some((_, hit)) = derived().element_input.iter().find(|(k, _)| *k == squashed) {
        let table = match hit.tier { "mode" => MODE, "struct" => STRUCT, "meta" => META, _ => INSTR };
        return Class { alias: Some(true), alias_of: Some(hit.canonical.into()),
                       ..class(hit.tier, hit.canonical, get(table, hit.canonical).unwrap_or("")) };
    }
    if session {
        if let Some(g) = get(SESSION, &low) {
            return class("session", &low, g);
        }
        /* Object.prototype answers SESSION[L] for these two */
        if low == "constructor" || low == "__proto__" {
            return Class { gloss: if low == "constructor" { Gloss::Absent } else { Gloss::Prototype }, ..class("session", &low, "") };
        }
    }
    if let Some(b) = blend_of(&up, ctx) {
        let id = b.get("id").map(js_string).unwrap_or_default();
        let gloss = b.get("means").filter(|m| m.truthy()).map_or(id.clone(), js_string);
        return Class { blend_id: Some(id), ..class("blend", &up, &gloss) };
    }
    class("unknown", &up, "")
}

fn js_string(v: &Value) -> String {
    match v {
        Value::Str(s) => s.clone(),
        Value::Num(n) => n.to_string(),
        Value::Bool(b) => b.to_string(),
        Value::Null => "null".into(),
        Value::Arr(_) | Value::Obj(_) => String::new(),
    }
}

/// A blend's `emit`, a name only the rules store knows.
pub fn blend_of<'a>(up: &str, ctx: &'a Context) -> Option<&'a Value> {
    ctx.rules.as_ref()?.get("rules")?.arr()?.iter().find(|r| {
        r.get("kind").and_then(Value::str) == Some("blend")
            && r.get("emit").filter(|e| e.truthy()).map(js_string).unwrap_or_default().to_uppercase() == up
    })
}

/// A neighbour the author may have meant.
#[derive(Debug, Clone, PartialEq)]
pub struct Suggestion {
    pub name: &'static str,
    pub how: &'static str,
}

/// `suggest`: the one canonical whose gloss the name begins, else the one
/// canonical (three letters or more) that is a subsequence of the name, else
/// silence. Two answers are silence too.
pub fn suggest(name: &str) -> Option<Suggestion> {
    let squash = |s: &str| -> String { s.to_uppercase().chars().filter(|c| c.is_ascii_uppercase() || c.is_ascii_digit()).collect() };
    let u = squash(name);
    if u.is_empty() {
        return None;
    }
    let mut glosses: Vec<(&'static str, String)> = Vec::new();
    for (el, hit) in &derived().gloss_reverse {
        let g = squash(el);
        match glosses.iter_mut().find(|(k, _)| *k == hit.canonical) {
            Some(slot) => slot.1 = g,
            None => glosses.push((hit.canonical, g)),
        }
    }
    let pre: Vec<&str> = glosses.iter().filter(|(_, g)| g.starts_with(&u)).map(|(k, _)| *k).collect();
    match pre.len() {
        1 => return Some(Suggestion { name: pre[0], how: "gloss-prefix" }),
        0 => {}
        _ => return None,
    }
    let sub: Vec<&str> = glosses.iter().map(|(k, _)| *k).filter(|k| {
        let k: Vec<char> = k.chars().collect();
        if k.len() < 3 {
            return false;
        }
        let mut at = 0;
        for c in u.chars() {
            if at < k.len() && c == k[at] {
                at += 1;
            }
        }
        at == k.len()
    }).collect();
    (sub.len() == 1).then(|| Suggestion { name: sub[0], how: "subsequence" })
}
