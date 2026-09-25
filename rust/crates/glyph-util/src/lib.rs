//! glyph-util — Port of `scripts/core/util.js` — the oracle. The JS module's own summary:
//!
//!   the layer no banner ever named.
//!
//! EMS-001 ORD-0002 ports `esc`, `xesc`, `lev` and `walk`; `tests/oracle.rs`
//! holds each to what the JS answers on everything the oracle holds.

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
