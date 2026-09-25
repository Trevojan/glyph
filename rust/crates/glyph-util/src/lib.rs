//! glyph-util — Port of `scripts/core/util.js` — the oracle. The JS module's own summary:
//!
//!   the layer no banner ever named.
//!
//! EMS-001 ORD-0002 ports `esc`, `xesc`, `lev` and `walk`; `tests/oracle.rs`
//! holds each to what the JS answers on everything the oracle holds. `json` is
//! the platform's `JSON.parse` and `JSON.stringify`, which the Rust lacks
//! (ORD-0003); `tests/json.rs` holds it to every file the oracle writes.
//! `tree` is the parser's tree as an arena, with `stripTags` (ORD-0006);
//! `inherited` names what a plain JS object answers for without being told.

pub mod json;
pub mod tree;

/// The names every plain JS object answers through `Object.prototype`: the
/// JS writes `obj[key]` and `key in obj` over objects that never set them.
pub const OBJECT_PROTOTYPE: [&str; 12] = [
    "constructor", "__defineGetter__", "__defineSetter__", "hasOwnProperty", "__lookupGetter__",
    "__lookupSetter__", "isPrototypeOf", "propertyIsEnumerable", "toString", "valueOf", "__proto__",
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
            cur[j] = (prev[j] + 1).min(cur[j - 1] + 1).min(prev[j - 1] + usize::from(a[i - 1] != b[j - 1]));
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
