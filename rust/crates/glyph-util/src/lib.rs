//! glyph-util — Port of `scripts/core/util.js` — the oracle. The JS module's own summary:
//!
//!   the layer no banner ever named.
//!
//! EMS-001 ORD-0002 ports `esc`, `xesc`, `lev` and `walk`; `tests/oracle.rs`
//! holds each to what the JS answers on everything the oracle holds. `tree` is
//! the parser's tree as an arena, with `stripTags` (ORD-0006);
//! `inherited` names what a plain JS object answers for without being told.

pub mod tree;

/// The names every plain JS object answers through `Object.prototype`: the
/// JS writes `obj[key]` and `key in obj` over objects that never set them.
pub const OBJECT_PROTOTYPE: [&str; 12] = [
    "constructor",
    "__defineGetter__",
    "__defineSetter__",
    "hasOwnProperty",
    "__lookupGetter__",
    "__lookupSetter__",
    "isPrototypeOf",
    "propertyIsEnumerable",
    "toString",
    "valueOf",
    "__proto__",
    "toLocaleString",
];

/// A key a plain JS object answers for without holding it.
pub fn inherited(key: &str) -> bool {
    OBJECT_PROTOTYPE.contains(&key)
}

/// `String(v)` of what the object answers for `key`: the function `Object`
/// for `constructor`, the prototype itself for `__proto__`, and a method of
/// the prototype for every other.
pub fn inherited_text(key: &str) -> String {
    match key {
        "constructor" => "function Object() { [native code] }".into(),
        "__proto__" => "[object Object]".into(),
        k => format!("function {k}() {{ [native code] }}"),
    }
}

/// JS `\s`: WhiteSpace and LineTerminator.
pub fn js_space(c: char) -> bool {
    matches!(
        c,
        '\t' | '\n' | '\u{b}' | '\u{c}' | '\r' | ' ' | '\u{a0}' | '\u{1680}' | '\u{2000}'
            ..='\u{200a}'
                | '\u{2028}'
                | '\u{2029}'
                | '\u{202f}'
                | '\u{205f}'
                | '\u{3000}'
                | '\u{feff}'
    )
}

/// `String.prototype.trim`.
pub fn js_trim(s: &str) -> String {
    s.trim_matches(js_space).to_string()
}

/// `&`, `<`, `>` and `"` as entities. The JS takes any value and reads null as
/// the empty string; here the caller hands over the string.
pub fn esc(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            _ => out.push(c),
        }
    }
    out
}

/// The JS assigns `xesc = esc`: one function under two names.
pub fn xesc(s: &str) -> String {
    esc(s)
}

/// Edit distance counted in UTF-16 code units, as the JS counts a string's
/// length and compares its characters.
pub fn lev(a: &str, b: &str) -> usize {
    let a: Vec<u16> = a.encode_utf16().collect();
    let b: Vec<u16> = b.encode_utf16().collect();
    let (m, q) = (a.len(), b.len());
    if m == 0 {
        return q;
    }
    if q == 0 {
        return m;
    }
    let mut prev: Vec<usize> = (0..=q).collect();
    let mut cur = vec![0; q + 1];
    for i in 1..=m {
        cur[0] = i;
        for j in 1..=q {
            cur[j] = (prev[j] + 1)
                .min(cur[j - 1] + 1)
                .min(prev[j - 1] + usize::from(a[i - 1] != b[j - 1]));
        }
        std::mem::swap(&mut prev, &mut cur);
    }
    prev[q]
}

/// A node `walk` descends into, the way the JS reads `nd.children`.
pub trait Children: Sized {
    fn children(&self) -> &[Self];
}

/// Pre-order, left to right. Iterative on purpose: in a long block the tree is
/// deep, and the recursive version overflowed the stack.
pub fn walk<'a, T: Children>(list: &'a [T], mut f: impl FnMut(&'a T)) {
    let mut stack: Vec<&'a T> = list.iter().rev().collect();
    while let Some(nd) = stack.pop() {
        f(nd);
        stack.extend(nd.children().iter().rev());
    }
}

/// One thing an Order declares (EMS-002 ORD-0036): its kind, its name as the
/// XML writes it, the element that binds it, and whether a template is defined.
#[derive(Debug, Clone, PartialEq)]
pub struct Declared {
    pub kind: String,
    pub name: String,
    pub on: Option<String>,
    pub define: bool,
}

/// A start tag of the XML at byte `i`, as the JS reads one with
/// `<([a-z][\w-]*)((?:\s+[\w:-]+="[^"]*")*)\s*\/?>`: its name, its
/// attributes, the byte after it, and whether it closes itself.
/// A start tag: its name, its attributes, the byte after it, and whether it
/// closes itself.
pub type StartTag = (String, Vec<(String, String)>, usize, bool);

pub fn start_tag(s: &str, i: usize) -> Option<StartTag> {
    let b = s.as_bytes();
    let word = |c: u8| c.is_ascii_alphanumeric() || c == b'_';
    let mut j = i + 1;
    if j >= b.len() || !b[j].is_ascii_lowercase() {
        return None;
    }
    while j < b.len() && (word(b[j]) || b[j] == b'-') {
        j += 1;
    }
    let tag = s[i + 1..j].to_string();
    let mut attrs = Vec::new();
    loop {
        let ws = j;
        while j < b.len() && (b[j] as char).is_ascii_whitespace() {
            j += 1;
        }
        let k = j;
        while j < b.len() && (word(b[j]) || b[j] == b':' || b[j] == b'-') {
            j += 1;
        }
        if j > k && j > ws && k > ws && s[j..].starts_with("=\"") {
            let v0 = j + 2;
            let e = s[v0..].find('"')?;
            attrs.push((s[k..j].to_string(), s[v0..v0 + e].to_string()));
            j = v0 + e + 1;
            continue;
        }
        j = k;
        if s[j..].starts_with("/>") {
            return Some((tag, attrs, j + 2, true));
        }
        if s[j..].starts_with('>') {
            return Some((tag, attrs, j + 1, false));
        }
        return None;
    }
}

/// `declarationsOf(xml)`: what an Order declares, read off the content of its
/// XML, in the order the content holds it. The schema the engine writes is
/// this list; the validator reads the content the same way.
pub fn declarations_of(xml: &str) -> Vec<Declared> {
    let mut out = Vec::new();
    let mut i = 0;
    while let Some(p) = xml[i..].find('<') {
        let at = i + p;
        i = at + 1;
        let Some((tag, attrs, _, _)) = start_tag(xml, at) else {
            continue;
        };
        let get = |k: &str| attrs.iter().find(|(n, _)| n == k).map(|(_, v)| v.clone());
        let framed = tag == "section" || tag == "block" || tag == "part";
        let d = |kind: &str, name: String, define: bool| Declared {
            kind: kind.into(),
            name,
            on: None,
            define,
        };
        if framed {
            if let Some(n) = get("name") {
                out.push(d(&tag, n, false));
            }
        } else if tag == "template" {
            if let Some(n) = get("name") {
                out.push(d("template", n, get("define").as_deref() == Some("true")));
            }
        } else if tag == "logic" {
            if let Some(n) = get("name") {
                out.push(d("logic", n, false));
            }
        } else if tag == "rule"
            && get("kind").as_deref() == Some("let")
            && let Some(n) = get("var")
        {
            out.push(d("variable", n, false));
        }
        if let Some(n) = get("binds")
            && !framed
        {
            out.push(Declared {
                kind: "binding".into(),
                name: n,
                on: Some(tag.clone()),
                define: false,
            });
        }
    }
    out
}

/// `declaresLine(d)`: one declaration as the schema writes it.
pub fn declares_line(d: &Declared) -> String {
    let mut s = format!("<declares kind=\"{}\" name=\"{}\"", d.kind, d.name);
    if let Some(on) = &d.on {
        s.push_str(&format!(" on=\"{on}\""));
    }
    if d.define {
        s.push_str(" define=\"true\"");
    }
    s.push_str("/>");
    s
}
