//! glyph-inverse — Port of `scripts/core/inverse.js` — the oracle. The JS module's own summary:
//!
//!   XML → Glyph, and GlyphAST → Glyph: the way back.
//!
//! EMS-001 ORD-0009. `from_xml` reads the emitted document back into bracket
//! source through a reader for the emitter's own dialect, undoing the
//! structural pass first; `from_ast` reads the `full` envelope. Both answer
//! malformed input with diagnostics, never a throw — except where the JS
//! throws: an element named after a member of `Object.prototype` (the
//! reverse tables are plain objects), and a document deeper than V8's stack
//! (EMS-001/RETURN.md, ORD-0009).

use glyph_json::{number, Json};
use glyph_util::tree::Thrown;
use glyph_util::{esc, inherited, inherited_text, js_space, js_trim};
use glyph_version::VERSION;
use glyph_vocab::{derived, get, known_word, FORMER_ELEMENT, OPERAND_ATTR, SESSION};

/// Where the port stops as the JS stops when V8's stack gives out: past this
/// many levels of the document. V8's own limit is not a number — measured on
/// node 22 it threw at 1 800 levels and, warmer, went 1 900 deep — so the
/// port takes the first depth it threw at (EMS-001/RETURN.md, ORD-0009).
pub const STACK_DEPTH: usize = 1800;

/// The recursive passes run on a thread of their own, with room for every
/// level up to `STACK_DEPTH`, so the port reaches its limit before the
/// machine's.
fn deep<T: Send>(f: impl FnOnce() -> T + Send) -> T {
    std::thread::scope(|s| {
        std::thread::Builder::new().stack_size(1 << 30).spawn_scoped(s, f)
            .expect("a thread for the way back").join().expect("the way back ends")
    })
}

fn overflow() -> Thrown {
    Thrown("Maximum call stack size exceeded".into())
}

/// A diagnostic of the way back: `{ sev, code, msg }`.
#[derive(Debug, Clone, PartialEq)]
pub struct Diag {
    pub sev: &'static str,
    pub code: &'static str,
    pub msg: String,
}

/// What the way back answers: the source, and what it found on the way.
#[derive(Debug, Clone, PartialEq)]
pub struct Back {
    pub src: String,
    pub diag: Vec<Diag>,
}

/// `xmlUnescape`: the five named entities and numeric references, each
/// reference one UTF-16 unit as `String.fromCharCode` makes it.
pub fn xml_unescape(s: &str) -> String {
    let u: Vec<u16> = s.encode_utf16().collect();
    let mut out: Vec<u16> = Vec::with_capacity(u.len());
    let mut i = 0;
    let at = |k: usize, c: u8| u.get(k) == Some(&(c as u16));
    while i < u.len() {
        if u[i] != b'&' as u16 {
            out.push(u[i]);
            i += 1;
            continue;
        }
        let digits = |from: usize, hex: bool| {
            let mut k = from;
            while k < u.len() && u[k] < 128 && ((u[k] as u8).is_ascii_digit() || (hex && (u[k] as u8).is_ascii_hexdigit())) {
                k += 1;
            }
            k
        };
        let mut hit: Option<(usize, Vec<u16>)> = None;
        if at(i + 1, b'#') && at(i + 2, b'x') {
            let end = digits(i + 3, true);
            if end > i + 3 && at(end, b';') {
                let text: String = String::from_utf16_lossy(&u[i + 3..end]);
                let code = u128::from_str_radix(&text, 16).map_or_else(|_| f64::INFINITY, |v| v as f64);
                hit = Some((end + 1, vec![to_uint16(code)]));
            }
        }
        if hit.is_none() && at(i + 1, b'#') {
            let end = digits(i + 2, false);
            if end > i + 2 && at(end, b';') {
                let code: f64 = String::from_utf16_lossy(&u[i + 2..end]).parse().unwrap_or(f64::INFINITY);
                hit = Some((end + 1, vec![to_uint16(code)]));
            }
        }
        if hit.is_none() {
            for (name, ch) in [("amp;", '&'), ("lt;", '<'), ("gt;", '>'), ("quot;", '"'), ("apos;", '\'')] {
                let n: Vec<u16> = name.encode_utf16().collect();
                if u.len() >= i + 1 + n.len() && u[i + 1..i + 1 + n.len()] == n[..] {
                    hit = Some((i + 1 + n.len(), vec![ch as u16]));
                    break;
                }
            }
        }
        match hit {
            Some((next, rep)) => {
                out.extend(rep);
                i = next;
            }
            None => {
                out.push(u[i]);
                i += 1;
            }
        }
    }
    String::from_utf16_lossy(&out)
}
/// `ToUint16`, what `String.fromCharCode` does to its argument.
fn to_uint16(x: f64) -> u16 {
    if !x.is_finite() {
        return 0;
    }
    (x.trunc() % 65536.0) as u16
}

/// `xmlTagName`: `/^\s*([A-Za-z_][\w.:-]*)/`.
pub fn xml_tag_name(s: &str) -> String {
    let t = s.trim_start_matches(js_space);
    let mut c = t.char_indices();
    match c.next() {
        Some((_, f)) if f.is_ascii_alphabetic() || f == '_' => {}
        _ => return String::new(),
    }
    let end = t.char_indices().skip(1).find(|&(_, x)| !(x.is_ascii_alphanumeric() || matches!(x, '_' | '.' | ':' | '-')))
        .map_or(t.len(), |(k, _)| k);
    t[..end].to_string()
}

/// `xmlAttrs`: every `name="value"`, the value unescaped; a later one wins,
/// and a `__proto__` one goes the way the JS setter sends it.
pub fn xml_attrs(raw: &str) -> Vec<(String, String)> {
    let b = raw.as_bytes();
    let name_ch = |c: u8| c.is_ascii_alphanumeric() || matches!(c, b'_' | b'.' | b':' | b'-');
    let ws = |k: usize| raw[k..].chars().next().filter(|&c| js_space(c)).map(char::len_utf8);
    let mut out: Vec<(String, String)> = Vec::new();
    let mut i = 0;
    while i < b.len() {
        if !(b[i].is_ascii_alphabetic() || b[i] == b'_') {
            i += raw[i..].chars().next().map_or(1, char::len_utf8);
            continue;
        }
        let start = i;
        let mut k = i + 1;
        while k < b.len() && name_ch(b[k]) {
            k += 1;
        }
        let name = &raw[start..k];
        let mut j = k;
        while let Some(n) = ws(j) {
            j += n;
        }
        let matched = (|| {
            if b.get(j) != Some(&b'=') {
                return None;
            }
            let mut j = j + 1;
            while let Some(n) = ws(j) {
                j += n;
            }
            if b.get(j) != Some(&b'"') {
                return None;
            }
            let close = raw[j + 1..].find('"')? + j + 1;
            Some((raw[j + 1..close].to_string(), close + 1))
        })();
        match matched {
            Some((value, next)) => {
                if name != "__proto__" {
                    let v = xml_unescape(&value);
                    match out.iter_mut().find(|(n, _)| n == name) {
                        Some(slot) => slot.1 = v,
                        None => out.push((name.to_string(), v)),
                    }
                }
                i = next;
            }
            None => i += 1,
        }
    }
    out
}

/// An element of the document as the reader holds it.
#[derive(Debug, Clone, PartialEq)]
pub struct El {
    pub tag: String,
    pub attrs: Vec<(String, String)>,
    pub children: Vec<El>,
    /// The text of a `#text` node.
    pub v: Option<String>,
}

impl El {
    fn new(tag: &str, attrs: Vec<(String, String)>) -> El {
        El { tag: tag.into(), attrs, children: Vec::new(), v: None }
    }
    /// `el.attrs[name]`, when it holds something.
    pub fn attr(&self, name: &str) -> Option<&str> {
        self.attrs.iter().find(|(k, _)| k == name).map(|(_, v)| v.as_str())
    }
    fn truthy(&self, name: &str) -> bool {
        self.attr(name).is_some_and(|v| !v.is_empty())
    }
}

enum Tok {
    Text(String),
    Open(String, Vec<(String, String)>),
    SelfClose(String, Vec<(String, String)>),
    Close(String),
    Truncated,
}

fn xml_tokenize(xml: &str) -> Vec<Tok> {
    let mut t = Vec::new();
    let push_text = |t: &mut Vec<Tok>, raw: &str| {
        if !js_trim(raw).is_empty() {
            t.push(Tok::Text(xml_unescape(raw)));
        }
    };
    let mut i = 0;
    while i < xml.len() {
        let Some(lt) = xml[i..].find('<').map(|k| k + i) else {
            push_text(&mut t, &xml[i..]);
            break;
        };
        if lt > i {
            push_text(&mut t, &xml[i..lt]);
        }
        if xml[lt..].starts_with("<!--") {
            i = xml[lt + 4..].find("-->").map_or(xml.len(), |k| lt + 4 + k + 3);
            continue;
        }
        let Some(gt) = xml[lt..].find('>').map(|k| k + lt) else {
            t.push(Tok::Truncated);
            break;
        };
        let inner = &xml[lt + 1..gt];
        if let Some(rest) = inner.strip_prefix('/') {
            t.push(Tok::Close(xml_tag_name(rest)));
        } else if let Some(body) = inner.strip_suffix('/') {
            t.push(Tok::SelfClose(xml_tag_name(body), xml_attrs(body)));
        } else {
            t.push(Tok::Open(xml_tag_name(inner), xml_attrs(inner)));
        }
        i = gt + 1;
    }
    t
}

/// `xmlParseTree`: never throws; malformed XML comes back as diagnostics.
pub fn xml_parse_tree(xml: &str) -> (El, Vec<Diag>) {
    let mut diag = Vec::new();
    /* the elements join their parent as they open, as the JS pushes them */
    let mut stack: Vec<El> = vec![El::new("#root", Vec::new())];
    let attach_closed = |stack: &mut Vec<El>| {
        let done = stack.pop().expect("an open element");
        stack.last_mut().expect("its parent").children.push(done);
    };
    for tk in xml_tokenize(xml) {
        match tk {
            Tok::Text(v) => stack.last_mut().expect("the root").children.push(El { v: Some(v), ..El::new("#text", Vec::new()) }),
            Tok::SelfClose(tag, attrs) => stack.last_mut().expect("the root").children.push(El::new(&tag, attrs)),
            Tok::Open(tag, attrs) => stack.push(El::new(&tag, attrs)),
            Tok::Close(tag) => match (1..stack.len()).rev().find(|&d| stack[d].tag == tag) {
                Some(d) => {
                    if d < stack.len() - 1 {
                        diag.push(Diag { sev: "note", code: "XmlAutoClose",
                            msg: format!("<code>&lt;/{}&gt;</code> closed {} elemento(s) que seguiam abertos.", esc(&tag), stack.len() - 1 - d) });
                    }
                    while stack.len() > d {
                        attach_closed(&mut stack);
                    }
                }
                None => diag.push(Diag { sev: "fix", code: "XmlUnmatchedClose",
                    msg: format!("<code>&lt;/{}&gt;</code> closes an element that never opened.", esc(&tag)) }),
            },
            Tok::Truncated => diag.push(Diag { sev: "fix", code: "XmlTruncated",
                msg: "<code>&lt;</code> with no <code>&gt;</code>: the xml is truncated.".into() }),
        }
    }
    if stack.len() > 1 {
        let names = stack[1..].iter().map(|e| format!("<code>&lt;{}&gt;</code>", esc(&e.tag))).collect::<Vec<_>>().join(", ");
        diag.push(Diag { sev: "fix", code: "XmlUnclosed", msg: format!("never closed: {names}.") });
        while stack.len() > 1 {
            attach_closed(&mut stack);
        }
    }
    (stack.pop().expect("the root"), diag)
}

/// `xmlChild`
pub fn xml_child<'a>(el: &'a El, tag: &str) -> Option<&'a El> {
    el.children.iter().find(|c| c.tag == tag)
}
/// `xmlText`: the text directly under the element.
pub fn xml_text(el: &El) -> String {
    el.children.iter().filter(|c| c.tag == "#text").filter_map(|c| c.v.clone()).collect()
}

/// `litSafeXml`: what a literal cannot carry, substituted.
pub fn lit_safe_xml(s: &str) -> String {
    let t = s.replace(['\'', '`'], "\u{2019}").replace('[', "(").replace(']', ")").replace("\r\n", " ").replace('\n', " ");
    js_trim(&t)
}
/// `asLiteral`
pub fn as_literal(s: &str) -> String {
    format!("'{}'", lit_safe_xml(s))
}

/// `/^[A-Za-z]/`
fn alpha_first(s: &str) -> bool {
    s.chars().next().is_some_and(|c| c.is_ascii_alphabetic())
}

/// `linkInProse`: whether prose, written back after a command or its `]`,
/// would read as a chain link — a run of `-` that opens the prose or follows
/// whitespace in it and touches a known word, or a `-` and spaces or tabs that
/// open it before one: the two shapes the lexer takes as a link.
fn link_in_prose(s: &str) -> bool {
    let c: Vec<char> = s.chars().collect();
    let known_at = |at: usize| {
        c.get(at).is_some_and(|x| x.is_ascii_alphabetic())
            && known_word(&c[at..].iter().take_while(|&&x| x.is_ascii_alphanumeric() || x == '_' || x == '.').collect::<String>())
    };
    let run = (0..c.len()).any(|p| {
        c[p] == '-' && (p == 0 || js_space(c[p - 1])) && known_at((p..c.len()).find(|&j| c[j] != '-').unwrap_or(c.len()))
    });
    run || (c.first() == Some(&'-') && {
        let k = (1..c.len()).find(|&j| c[j] != ' ' && c[j] != '\t').unwrap_or(c.len());
        k > 1 && known_at(k)
    })
}

fn xml_kids(el: &El, diag: &mut Vec<Diag>, depth: usize) -> Result<String, Thrown> {
    if depth > STACK_DEPTH {
        return Err(overflow());
    }
    let mut out = String::new();
    let mut first_chain = true;
    for c in &el.children {
        if matches!(c.tag.as_str(), "#text" | "mood" | "break") {
            out += &from_xml_node(c, diag, depth + 1)?;
            continue;
        }
        let op = c.attr("chain");
        let mut promoted = None;
        if matches!(op, Some("extend" | "item")) {
            if first_chain && op == Some("item") {
                diag.push(Diag { sev: "fix", code: "XmlChainStartsWithItem",
                    msg: "the first link of a chain cannot be <code>chain=\"item\"</code> — <code>,</code> continua uma cadeia, \
                          não a abre. Promovido a <code>-</code>.".into() });
                promoted = Some(El { attrs: clone_with_chain(&c.attrs, "extend"), ..c.clone() });
            }
            first_chain = false;
        } else if c.tag != "user-input" {
            first_chain = true;
        }
        out += &from_xml_node(promoted.as_ref().unwrap_or(c), diag, depth + 1)?;
    }
    Ok(out)
}

/// `cloneWithChain`: the attributes with `chain` set, in its own place.
pub fn clone_with_chain(attrs: &[(String, String)], v: &str) -> Vec<(String, String)> {
    let mut o = attrs.to_vec();
    match o.iter_mut().find(|(k, _)| k == "chain") {
        Some(slot) => slot.1 = v.into(),
        None => o.push(("chain".into(), v.into())),
    }
    o
}

fn from_xml_logic(el: &El) -> String {
    let lines: Vec<String> = el.children.iter().filter(|c| c.tag == "rule")
        .filter_map(|c| xml_child(c, "source").map(xml_text)).collect();
    /* the fence is named by its first literal, and `[/logic]` closes it */
    let nm = el.attr("name").filter(|n| !n.is_empty()).map_or(String::new(), as_literal);
    format!("[logic{nm}]\n{}\n[/logic]", lines.join("\n"))
}

/// `slotFills`, once the scan is done: each slot as a named fill, in the
/// order its first run met it, when it wrote anything.
fn slot_fills(order: &[String], parts: &[(String, String)]) -> String {
    order.iter().filter_map(|n| {
        let mine: Vec<&str> = parts.iter().filter(|(k, _)| k == n).map(|(_, s)| s.as_str()).collect();
        (!mine.is_empty()).then(|| format!("{}]", apart(format!("[ph-{n}"), &mine.concat())))
    }).collect()
}

fn from_xml_template(el: &El, diag: &mut Vec<Diag>, depth: usize) -> Result<String, Thrown> {
    let head = format!("[--{}{}", el.attr("name").unwrap_or(""), if el.truthy("define") { "=" } else { "" });
    if el.truthy("expanded") {
        /* the call is what carries a slot — the bound value, and what its fill
           held past it — and a fill is a run of siblings with one slot: the
           value, or the hole's own <needs>, then what the fill carried. A slot
           already rebuilt is a hole the body names twice. The expansion is
           regenerated. */
        fn scan(list: &[El], order: &mut Vec<String>, parts: &mut Vec<(String, String)>, diag: &mut Vec<Diag>,
                depth: usize) -> Result<(), Thrown> {
            if depth > STACK_DEPTH {
                return Err(overflow());
            }
            let (mut run, mut skip): (Option<&str>, bool) = (None, false);
            for c in list {
                if c.tag == "#text" {
                    continue;
                }
                let Some(name) = c.attr("slot").filter(|s| alpha_first(s)) else {
                    run = None;
                    scan(&c.children, order, parts, diag, depth + 1)?;
                    continue;
                };
                if run != Some(name) {
                    run = Some(name);
                    skip = order.iter().any(|n| n == name);
                    if !skip {
                        order.push(name.to_string());
                    }
                }
                if skip || c.tag == "needs" {
                    continue;
                }
                let src = if c.tag == "user-input" { as_literal(&xml_text(c)) } else { from_xml_node(c, diag, depth + 1)? };
                parts.push((name.to_string(), src));
            }
            Ok(())
        }
        let (mut order, mut parts) = (Vec::new(), Vec::new());
        scan(&el.children, &mut order, &mut parts, diag, depth)?;
        return Ok(format!("{head}{}]", slot_fills(&order, &parts)));
    }
    Ok(format!("{head}{}]", xml_kids(el, diag, depth)?))
}

/// `chainOpOf`: `-` or `,` for a chain link, and a link with children said.
fn chain_op_of(el: &El, diag: &mut Vec<Diag>) -> Option<&'static str> {
    let op = el.attr("chain")?;
    if op != "extend" && op != "item" {
        return None;
    }
    if el.children.iter().any(|c| c.tag != "#text") {
        diag.push(Diag { sev: "fix", code: "XmlChainHasChildren",
            msg: format!("<code>&lt;{} chain&gt;</code> has children — a link written without <code>[</code> não tem escopo \
                          para segurá-los. Reanexados ao pai.", esc(&el.tag)) });
    }
    Some(if op == "item" { "," } else { "-" })
}

fn from_xml_node(el: &El, diag: &mut Vec<Diag>, depth: usize) -> Result<String, Thrown> {
    if depth > STACK_DEPTH {
        return Err(overflow());
    }
    let tag = el.tag.as_str();
    match tag {
        "#text" | "mood" | "break" => return Ok(String::new()),
        "user-input" => return Ok(as_literal(&xml_text(el))),
        /* an <off> with nothing in it is an `[off]` region with nothing in it */
        "off" => {
            let prose = lit_safe_xml(&xml_text(el));
            if prose.is_empty() {
                return Ok("[off][on]".into());
            }
            /* prose with a `-` that starts a word before a known word would
               come back as a chain link: it returns fenced */
            return Ok(if link_in_prose(&prose) { format!(" [off]{prose}[on] ") } else { format!(" {prose} ") });
        }
        "raw" => return Ok(format!("[raw]{}[/raw]", xml_text(el))),
        "logic" => return Ok(from_xml_logic(el)),
        /* a <template> with a name is a call or a definition; with none, the command TPL */
        "template" if el.attr("name").is_some_and(|n| !n.is_empty()) => return from_xml_template(el, diag, depth),
        "unresolved" => {
            let t = lit_safe_xml(el.attr("tag").unwrap_or(""));
            if let Some(op) = chain_op_of(el, diag) {
                return Ok(format!("{op}{t}"));
            }
            return Ok(format!("[{t}{}]", xml_kids(el, diag, depth)?));
        }
        /* a real hole carries an alpha slot; the fillers the engine asks
           again from the vocabulary are not source */
        "needs" => {
            return Ok(match el.attr("slot").filter(|s| alpha_first(s)) {
                Some(slot) if xml_text(el) == NO_ANSWER => format!("[ph-{slot}]"),
                Some(slot) => format!("[ph-{slot}`{}`]", lit_safe_xml(&xml_text(el))),
                None => String::new(),
            });
        }
        _ => {}
    }
    /* GLOSS_REVERSE is a plain object: a name the prototype holds answers
       with a member that has no canonical */
    let name = match derived().gloss_reverse.iter().find(|(k, _)| k == tag) {
        Some((_, hit)) => Some(hit.canonical.to_lowercase()),
        None if inherited(tag) => return Err(Thrown("Cannot read properties of undefined (reading 'toLowerCase')".into())),
        /* a retired element name is read, and named */
        None if get(FORMER_ELEMENT, tag).is_some() => {
            let now = get(FORMER_ELEMENT, tag).unwrap_or_default();
            let canonical = derived().gloss_reverse.iter().find(|(k, _)| k == now).map(|(_, hit)| hit.canonical.to_lowercase());
            diag.push(Diag { sev: "note", code: "XmlFormerElement",
                msg: format!("<code>&lt;{}&gt;</code> is the former name of <code>&lt;{now}&gt;</code> — lido como <code>[{}</code>.",
                             esc(tag), canonical.as_deref().unwrap_or("")) });
            canonical
        }
        None => get(SESSION, tag).filter(|g| !g.is_empty()).map(|_| tag.to_string()),
    };
    let Some(name) = name else {
        diag.push(Diag { sev: "note", code: "XmlUnknownElement",
            msg: format!("<code>&lt;{}&gt;</code> matches no command — o conteúdo foi mantido, a marca não.", esc(tag)) });
        return xml_kids(el, diag, depth);
    };
    if let Some(op) = chain_op_of(el, diag) {
        return Ok(format!("{op}{name}"));
    }
    let lead = if el.attr("join") == Some("item") { "," } else { "" };
    if name == "ph" {
        return Ok(format!("{lead}{}", from_xml_placeholder(el, diag, depth)?));
    }
    /* the number of a part, the condition of an if and the name of a block or
       a section come back as the literal they were; a `name` on any other
       element, which an older document or a hand carries, is an operand
       literal all the same, written where the name stood */
    let oa = get(OPERAND_ATTR, &name.to_uppercase());
    let named = if oa == Some("name") { String::new() }
                else { el.attr("name").filter(|n| !n.is_empty()).map_or(String::new(), as_literal) };
    let operand = oa.and_then(|a| el.attr(a)).map_or(String::new(), as_literal);
    /* a literal ends at its quote, so a link written after it is the link it is */
    Ok(format!("{lead}{}", not_switch(format!("[{name}{named}{operand}{}]", xml_kids(el, diag, depth)?))))
}

/// What the emitter writes in the `<needs>` of a hole with no question: the
/// engine asking, never an answer, so the way back writes no question for it
/// (PACKAGE_TARGET §8).
const NO_ANSWER: &str = "sem resposta";

/// `fromXmlPlaceholder`: the `<needs>` inside a `<placeholder>` is the hole —
/// an alpha `slot` is the name, its text the question, put back as a literal
/// where it stood; with no name, a link written first stands after a space.
fn from_xml_placeholder(el: &El, diag: &mut Vec<Diag>, depth: usize) -> Result<String, Thrown> {
    let at = el.children.iter().position(|c| c.tag == "needs");
    let slot = at.and_then(|i| el.children[i].attr("slot")).filter(|s| alpha_first(s));
    let named = el.attr("name").filter(|n| !n.is_empty()).map_or(String::new(), as_literal);
    let mut body = el.clone();
    if let Some(i) = at {
        let text = xml_text(&el.children[i]);
        if text == NO_ANSWER {
            body.children.remove(i);
        } else {
            body.children[i] = El { tag: "user-input".into(), attrs: Vec::new(), v: None,
                children: vec![El { tag: "#text".into(), attrs: Vec::new(), children: Vec::new(), v: Some(text) }] };
        }
    }
    let rest = xml_kids(&body, diag, depth)?;
    let gap = if slot.is_none() && named.is_empty() && rest.starts_with(['-', ',']) { " " } else { "" };
    Ok(format!("[ph{}{named}{gap}{rest}]", slot.map_or(String::new(), |s| format!("-{s}"))))
}

/// `apart`: two pieces written side by side read as one when a name ends the
/// first and a name starts the second, or the first ends a mood header —
/// `[ctx` and the prose `foo` came back as `[ctxfoo]`. A space between them is
/// what the source had, and whitespace between tokens is no node.
fn apart(a: String, b: &str) -> String {
    let name = |c: char| c.is_ascii_alphanumeric() || c == '_' || c == '.';
    if (a.ends_with(name) || a.ends_with('/')) && b.starts_with(name) { format!("{a} {b}") } else { a + b }
}

/// `notSwitch`: the command OFF with nothing inside is written `[modeoff]`,
/// the element's own name read back as input, never `[off]`, the switch that
/// opens a verbatim region.
fn not_switch(cmd: String) -> String {
    let switch = cmd.strip_prefix('[').and_then(|c| c.strip_suffix(']')).is_some_and(|c| js_trim(c).eq_ignore_ascii_case("off"));
    if switch { "[modeoff]".into() } else { cmd }
}

/// `packageUnpass`: `<chain>` and `<holds>` given back as the operators
/// their position carried; `<schema/>` and `<invoke>` dropped. `attrs` is a
/// member's attributes as the pass rewrites them.
pub fn package_unpass(el: &El, attrs: Option<Vec<(String, String)>>, diag: &mut Vec<Diag>, depth: usize) -> Result<El, Thrown> {
    if depth > STACK_DEPTH {
        return Err(overflow());
    }
    let mut out: Vec<El> = Vec::new();
    for c in &el.children {
        if c.tag == "schema" || c.tag == "invoke" {
            continue;
        }
        if c.tag == "holds" || c.tag == "chain" {
            let mut first = true;
            for m in c.children.iter().filter(|m| m.tag != "#text") {
                let rewritten = if c.tag == "holds" {
                    if let Some(j) = m.attr("join").filter(|j| !j.is_empty()) {
                        diag.push(Diag { sev: "fix", code: "XmlHoldsCarriesJoin",
                            msg: format!("a <code>&lt;holds&gt;</code> member carries <code>join=\"{}\"</code>. Dentro de um \
                                          <code>&lt;holds&gt;</code> a posição já diz o operador — remova o atributo.", esc(j)) });
                    }
                    (!first).then(|| {
                        let mut a = m.attrs.clone();
                        match a.iter_mut().find(|(k, _)| k == "join") {
                            Some(slot) => slot.1 = "item".into(),
                            None => a.push(("join".into(), "item".into())),
                        }
                        a
                    })
                } else {
                    if let Some(ch) = m.attr("chain").filter(|c| !c.is_empty()) {
                        diag.push(Diag { sev: "fix", code: "XmlChainStartsWithItem",
                            msg: format!("a <code>&lt;chain&gt;</code> member carries <code>chain=\"{}\"</code>. Dentro de um \
                                          <code>&lt;chain&gt;</code> a posição já diz o operador — remova o atributo.", esc(ch)) });
                    }
                    Some(clone_with_chain(&m.attrs, if first { "extend" } else { "item" }))
                };
                out.push(package_unpass(m, rewritten, diag, depth + 1)?);
                first = false;
            }
            continue;
        }
        out.push(package_unpass(c, None, diag, depth + 1)?);
    }
    Ok(El { tag: el.tag.clone(), attrs: attrs.unwrap_or_else(|| el.attrs.clone()), children: out, v: el.v.clone() })
}

fn from_xml_block(el: &El, diag: &mut Vec<Diag>, depth: usize) -> Result<String, Thrown> {
    let mut pre = String::new();
    if let Some(mood) = xml_child(el, "mood") {
        let also = mood.attr("also").unwrap_or("");
        let mut keys: Vec<String> = Vec::new();
        for g in std::iter::once(mood.attr("dominant").unwrap_or("")).chain(also.split(',')) {
            let k = js_trim(g).to_lowercase();
            /* EMO_REVERSE is a plain object as well */
            match derived().emo_reverse.iter().find(|(x, _)| *x == k) {
                Some((_, name)) if !name.is_empty() => keys.push(name.to_string()),
                Some(_) => {}
                None if inherited(&k) => keys.push(inherited_text(&k)),
                None => {}
            }
        }
        if !keys.is_empty() {
            pre += &format!("/{}/", keys.join("/"));
        }
    }
    /* `r-` stands apart from the mood header: a letter right after its
       closing `/` is read as one more mood code */
    if let Some(exp) = xml_child(el, "user-expectative") {
        let gap = if pre.is_empty() { "" } else { " " };
        return Ok(format!("{pre}{gap}r-{}", xml_kids(exp, diag, depth + 1)?));
    }
    let mut body = String::new();
    for c in el.children.iter().filter(|c| c.tag != "mood" && c.tag != "#text") {
        body += &from_xml_node(c, diag, depth + 1)?;
    }
    Ok(pre + &body)
}

/// `fromXML(xmlString)`: xml → glyph, within the limits the JS notes.
pub fn from_xml(xml: &str) -> Result<Back, Thrown> {
    deep(|| from_xml_here(xml))
}
fn from_xml_here(xml: &str) -> Result<Back, Thrown> {
    let (root, mut diag) = xml_parse_tree(xml);
    let Some(glyph) = xml_child(&root, "glyph-package") else {
        if xml_child(&root, "glyph").is_some() {
            diag.push(Diag { sev: "fix", code: "XmlLegacyRoot",
                msg: format!("<code>&lt;glyph&gt;</code> was replaced by <code>&lt;glyph-package&gt;</code> in this version. \
                              Re-emit the document with engine {VERSION}.") });
            return Ok(Back { src: String::new(), diag });
        }
        diag.push(Diag { sev: "fix", code: "NoGlyphRoot",
            msg: "no <code>&lt;glyph-package&gt;</code> at the root — this is not xml from this engine.".into() });
        return Ok(Back { src: String::new(), diag });
    };
    let glyph = package_unpass(glyph, None, &mut diag, 1)?;
    let mut parts: Vec<(String, bool)> = Vec::new();
    for el in glyph.children.iter().filter(|e| e.tag != "#text") {
        /* the segment's wrapper always carries `once`; a nested [block does not */
        if el.tag == "block" && el.truthy("once") {
            let src = format!("{}{}", if el.truthy("continues") { "[=" } else { "" }, from_xml_block(el, &mut diag, 1)?);
            parts.push((src, false));
            continue;
        }
        if el.tag == "break" {
            if let Some(last) = parts.last_mut() {
                last.1 = true;
            }
            continue;
        }
        diag.push(Diag { sev: "note", code: "XmlUnexpectedTop",
            msg: format!("<code>&lt;{}&gt;</code> outside a block — ignored.", esc(&el.tag)) });
    }
    /* `;;` closes the block as `;` does, so it takes the separator's place */
    let n = parts.len();
    let src = parts.iter().enumerate().map(|(i, (s, brk))| {
        if i + 1 == n { s.clone() } else { format!("{s}{}", if *brk { ";;" } else { ";" }) }
    }).collect();
    Ok(Back { src, diag })
}

/* ---- fromAST ---- */

/// `String(v)` of an envelope value; null and absence read as "".
fn text_of(v: Option<&Json>) -> String {
    match v {
        None | Some(Json::Null) => String::new(),
        Some(Json::Str(s)) => s.clone(),
        Some(Json::Num(n)) => number(*n),
        Some(Json::Bool(b)) => b.to_string(),
        Some(Json::Arr(a)) => a.iter().map(|x| text_of(Some(x))).collect::<Vec<_>>().join(","),
        Some(Json::Obj(_)) => "[object Object]".into(),
    }
}
/// `"…" + v`: what concatenation writes, `undefined` for an absent field.
fn joined(v: Option<&Json>) -> String {
    match v {
        None => "undefined".into(),
        Some(Json::Null) => "null".into(),
        v => text_of(v),
    }
}
fn truthy(v: Option<&Json>) -> bool {
    match v {
        None | Some(Json::Null) => false,
        Some(Json::Bool(b)) => *b,
        Some(Json::Num(n)) => *n != 0.0 && !n.is_nan(),
        Some(Json::Str(s)) => !s.is_empty(),
        Some(Json::Arr(_) | Json::Obj(_)) => true,
    }
}

/// `fromAST(env)`: the `full` envelope back into source.
pub fn from_ast(env: &Json) -> Back {
    let mut diag = Vec::new();
    if !matches!(env, Json::Obj(_)) || env.get("type").and_then(Json::str) != Some("GlyphAST") {
        diag.push(Diag { sev: "fix", code: "NotAnAST", msg: "not a <code>GlyphAST</code> envelope.".into() });
        return Back { src: String::new(), diag };
    }
    if let Some(p) = env.get("projection").filter(|p| truthy(Some(p))) {
        if p.str() != Some("full") {
            diag.push(Diag { sev: "fix", code: "ThinnedAST",
                msg: format!("projection <code>{}</code> — only the projection <code>full</code> pode ser reconstruída. Na \
                              projeção de painel a ausência de um campo não distingue vazio de descartado.", esc(&joined(Some(p)))) });
            return Back { src: String::new(), diag };
        }
    }
    let lit = |v: Option<&Json>, form: Option<&Json>| {
        let t = text_of(v);
        if form.and_then(Json::str) == Some("tick") && !t.contains('`') { format!("`{t}`") } else { as_literal(&t) }
    };
    /* a link written after prose keeps the space that makes its `-` start a
       word: `a-crit` is one hyphenated word, `a -crit` is a link */
    fn after_prose(prev: Option<&Json>, n: &Json, diag: &mut Vec<Diag>, lit: &dyn Fn(Option<&Json>, Option<&Json>) -> String) -> String {
        let s = node(n, diag, lit);
        if prev.and_then(|p| p.get("type")).and_then(Json::str) == Some("Text")
            && n.get("type").and_then(Json::str) == Some("Command") && truthy(n.get("chainElement"))
            && !truthy(n.get("slotName")) && n.get("origin").and_then(Json::str) != Some("item")
        {
            format!(" {s}")
        } else {
            s
        }
    }
    fn kids(list: Option<&Json>, diag: &mut Vec<Diag>, lit: &dyn Fn(Option<&Json>, Option<&Json>) -> String) -> String {
        let (mut out, mut prev) = (String::new(), None);
        for n in list.and_then(Json::arr).unwrap_or(&[]) {
            out = apart(out, &after_prose(prev, n, diag, lit));
            prev = Some(n);
        }
        out
    }
    fn node(n: &Json, diag: &mut Vec<Diag>, lit: &dyn Fn(Option<&Json>, Option<&Json>) -> String) -> String {
        /* an array is an object to the JS, and reaches the vocabulary check */
        if !matches!(n, Json::Obj(_) | Json::Arr(_)) {
            return String::new();
        }
        let ty = n.get("type");
        match ty.and_then(Json::str) {
            Some("Raw") => {
                if n.get("form").and_then(Json::str) == Some("raw") { text_of(n.get("value")) } else { lit(n.get("value"), n.get("form")) }
            }
            Some("Literal") => lit(n.get("value"), n.get("form")),
            /* prose that would read back as a chain link returns fenced, as
               fromXML returns it: the same <off>, and no invented link */
            Some("Text") => {
                let tv = text_of(n.get("value"));
                if link_in_prose(&tv) { format!("[off]{tv}[on]") } else { tv }
            }
            Some("ModeOff") => format!("[off]{}[on]", kids(n.get("body"), diag, lit)),
            Some("Template") => {
                let name = text_of(n.get("name"));
                if truthy(n.get("expanded")) {
                    /* a bound value is the call, and so is what its fill
                       carried; an unbound hole is the template's own prompt,
                       and writing that back turns a question into an answer —
                       the same rule <needs> follows. The slot of a node: a
                       hole's name, when it holds nothing but its name and its
                       question; a <placeholder> is looked inside, where what
                       the fill carried follows its question */
                    fn slot_of(c: &Json) -> Option<(String, bool)> {
                        let ty = c.get("type").and_then(Json::str);
                        if ty == Some("Command") && truthy(c.get("slotName")) {
                            return None;
                        }
                        if ty == Some("Command") && c.get("canonical").and_then(Json::str) == Some("PH") && !truthy(c.get("slot")) {
                            let hk = c.get("body").and_then(Json::arr).unwrap_or(&[]);
                            let b = hk.iter().position(|k| truthy(k.get("slotName")));
                            let q = hk.iter().position(|k| matches!(k.get("type").and_then(Json::str), Some("Literal" | "Raw")));
                            let bare = (0..hk.len()).all(|i| Some(i) == b || Some(i) == q);
                            let b = b.filter(|_| bare)?;
                            let (raw, canonical) = (hk[b].get("raw"), hk[b].get("canonical"));
                            let name = if truthy(raw) { text_of(raw) } else if truthy(canonical) { text_of(canonical) } else { String::new() };
                            return Some((name, true));
                        }
                        match c.get("slot") {
                            Some(Json::Str(s)) if !s.is_empty() => Some((s.clone(), false)),
                            Some(Json::Obj(_)) => match c.get("slot").and_then(|s| s.get("hole")) {
                                Some(Json::Str(h)) if !h.is_empty() => Some((h.clone(), true)),
                                _ => None,
                            },
                            _ => None,
                        }
                    }
                    fn scan(list: Option<&Json>, order: &mut Vec<String>, parts: &mut Vec<(String, String)>, diag: &mut Vec<Diag>,
                            lit: &dyn Fn(Option<&Json>, Option<&Json>) -> String) {
                        let (mut run, mut skip, mut prev): (Option<String>, bool, Option<&Json>) = (None, false, None);
                        for c in list.and_then(Json::arr).unwrap_or(&[]) {
                            let Some((name, hole)) = slot_of(c).filter(|(s, _)| alpha_first(s)) else {
                                run = None;
                                if matches!(c, Json::Obj(_)) {
                                    scan(c.get("body"), order, parts, diag, lit);
                                }
                                continue;
                            };
                            if run.as_deref() != Some(name.as_str()) {
                                run = Some(name.clone());
                                prev = None;
                                skip = order.contains(&name);
                                if !skip {
                                    order.push(name.clone());
                                }
                            }
                            if skip || hole {
                                continue;
                            }
                            let src = after_prose(prev, c, diag, lit);
                            parts.push((name, src));
                            prev = Some(c);
                        }
                    }
                    let (mut order, mut parts) = (Vec::new(), Vec::new());
                    scan(n.get("body"), &mut order, &mut parts, diag, lit);
                    return format!("[--{name}{}]", slot_fills(&order, &parts));
                }
                format!("[--{name}{}{}]", if truthy(n.get("isDefinition")) { "=" } else { "" }, kids(n.get("body"), diag, lit))
            }
            Some("Verbatim") => format!("[raw]{}[/raw]", text_of(n.get("value"))),
            Some("Logic") => {
                let lines: Vec<String> = n.get("rules").and_then(Json::arr).unwrap_or(&[]).iter().map(|r| text_of(r.get("source"))).collect();
                let name = if truthy(n.get("name")) { as_literal(&text_of(n.get("name"))) } else { String::new() };
                format!("[logic{name}]\n{}\n[/logic]", lines.join("\n"))
            }
            Some("Truncated") => {
                diag.push(Diag { sev: "fix", code: "TruncatedAST",
                    msg: format!("the envelope was truncated at depth {} and omitted {} nós — não há o que reconstruir a partir dele.",
                                 joined(n.get("atDepth")), joined(n.get("omittedNodes"))) });
                String::new()
            }
            Some("Command") => {
                let raw = n.get("raw").filter(|r| truthy(Some(r)));
                let name = text_of(raw.or(n.get("canonical")));
                if truthy(n.get("slotName")) {
                    return format!("-{name}");
                }
                let item = n.get("origin").and_then(Json::str) == Some("item");
                if truthy(n.get("chainElement")) {
                    return format!("{}{name}", if item { "," } else { "-" });
                }
                /* a `name` an envelope carries is an operand literal, where it stood */
                let named = if truthy(n.get("name")) { as_literal(&text_of(n.get("name"))) } else { String::new() };
                /* the `-` straight after `[ph` binds the name: a hole whose
                   first child is a link writes it after a space */
                let first = n.get("body").and_then(Json::arr).and_then(|b| b.first());
                let gap = if text_of(n.get("canonical")) == "PH" && !truthy(n.get("name"))
                    && first.is_some_and(|f| f.get("type").and_then(Json::str) == Some("Command")
                        && truthy(f.get("chainElement")) && !truthy(f.get("slotName"))) { " " } else { "" };
                format!("{}{}", if item { "," } else { "" }, not_switch(format!("{}]", apart(format!("[{name}{named}{gap}"), &kids(n.get("body"), diag, lit)))))
            }
            _ => {
                diag.push(Diag { sev: "note", code: "AstUnknownNode",
                    msg: format!("node <code>{}</code> is not in the AST vocabulary — ignored.",
                                 esc(&joined(ty))) });
                String::new()
            }
        }
    }
    let mut parts: Vec<String> = Vec::new();
    for seg in env.get("segments").and_then(Json::arr).unwrap_or(&[]) {
        let mut pre = String::new();
        if let Some(m) = seg.get("mood").and_then(Json::arr).filter(|m| !m.is_empty()) {
            pre += &format!("/{}/", m.iter().map(|x| text_of(x.get("name"))).collect::<Vec<_>>().join("/"));
        }
        if truthy(seg.get("continues")) {
            pre += "[=";
        }
        /* a letter right after the mood header is read as one more mood
           code, so `r-` stands apart from the closing `/` */
        if truthy(seg.get("isReturn")) {
            if pre.ends_with('/') {
                pre.push(' ');
            }
            pre += "r-";
        }
        parts.push(format!("{}{}", apart(pre, &kids(seg.get("body"), &mut diag, &lit)), if truthy(seg.get("breaks")) { ";;" } else { "" }));
    }
    /* `;;` already closed its segment, so it is not followed by `;` */
    let mut src = String::new();
    for (i, p) in parts.iter().enumerate() {
        if i > 0 && !src.ends_with(";;") {
            src.push(';');
        }
        src += p;
    }
    Back { src, diag }
}
