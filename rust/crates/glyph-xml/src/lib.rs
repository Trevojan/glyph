//! glyph-xml — Port of `scripts/core/emit-xml.js` — the oracle. The JS module's own summary:
//!
//!   the glyph-package: the message that travels to the machine.
//!
//! EMS-001 ORD-0008. `build_xml` walks the tree into lines, `package_pass`
//! turns the lines into the document PACKAGE_TARGET.md specifies — chains,
//! `<holds>`, `<invoke>` — and `to_xml` is the one call. It reads the tree
//! and the stores and writes nothing back but the binder marks the parser
//! already set.
//!
//! What the JS writes, the port writes (EMS-001/RETURN.md, ORD-0008): the
//! source of the function `Object` in a mood the prototype answers for, a
//! `ref` on any literal whose text a plain object's prototype holds, and the
//! pt-BR words of the empty document, of an unanswered hole and of a
//! variable no line defines.

use glyph_parse::{collect_bindings, binding_of, parse, Extra, Opts};
use glyph_stores::{atoms_of, def_of, depth_of, formula_of, species_of, stands_alone, Context, Value};
use glyph_util::json::number;
use glyph_util::tree::{Gloss, Id, Thrown, Tree, LIMITS};
use glyph_util::{inherited, inherited_text, js_space, js_trim, xesc};
use glyph_version::VERSION;
use glyph_vocab::{derived, el_name, get, FRAMES, SLOTS};

/// `pad`: two spaces a level, up to the ceiling.
pub fn pad(d: usize) -> String {
    "  ".repeat(d.min(LIMITS.indent))
}

/// `String(gloss)`: what a gloss writes where the JS joins it into text.
fn gloss_text(g: &Gloss) -> String {
    match g {
        Gloss::Text(t) => t.clone(),
        Gloss::Object => inherited_text("constructor"),
        Gloss::Prototype => inherited_text("__proto__"),
    }
}
/// The gloss `elName` reads; the two the prototype gives are session words,
/// which `elName` names by their canonical before it looks.
fn gloss_arg(g: &Option<Gloss>) -> Option<&str> {
    match g {
        Some(Gloss::Text(t)) => Some(t),
        _ => None,
    }
}
fn js_value(v: Option<&Value>) -> String {
    match v {
        None | Some(Value::Null) => String::new(),
        Some(Value::Str(s)) => s.clone(),
        Some(Value::Num(n)) => number(*n),
        Some(Value::Bool(b)) => b.to_string(),
        Some(Value::Arr(_) | Value::Obj(_)) => "[object Object]".into(),
    }
}

/// `SLOTS[canonical]`, a plain object: its own slots, or, for a name the
/// prototype holds, `length` slots of which none is named.
fn slots_of(canonical: &str) -> Option<(Option<usize>, &'static [&'static str])> {
    if let Some(s) = get(SLOTS, canonical) {
        return Some((Some(s.len()), s));
    }
    let len = match canonical {
        "__proto__" => None,
        "toString" | "valueOf" | "toLocaleString" => Some(0),
        "__defineGetter__" | "__defineSetter__" => Some(2),
        k if inherited(k) => Some(1),
        _ => return None,
    };
    Some((len, &[]))
}

/// `blockAttrs`
pub fn block_attrs(continues: bool) -> String {
    format!(" once=\"true\"{}", if continues { " continues=\"previous\"" } else { "" })
}

/// `collect`: the element names under a return block, and what did not resolve.
pub fn collect(tree: &Tree<Extra>, list: &[Id], acc: &mut Vec<String>, bad: &mut Vec<Id>) {
    for id in tree.walk(list) {
        let nd = &tree.nodes[id];
        if !nd.is_canonical() || nd.slot_name == Some(true) {
            continue;
        }
        let (canonical, tier) = (nd.canonical.as_deref().unwrap_or(""), nd.tier.as_deref().unwrap_or(""));
        if tier == "unknown" || tier == "empty" {
            bad.push(id);
        } else if canonical != "PH" {
            acc.push(el_name(canonical, tier, gloss_arg(&nd.gloss)));
        }
    }
}

/// `emitLogic`, for the Logic a `[logic]` node carries.
pub fn emit_logic(extra: &Extra, d: usize, l: &mut Vec<String>) {
    let lg = extra.as_ref().expect("a logic node carries its Logic");
    let name = if lg.name.is_empty() { String::new() } else { format!(" name=\"{}\"", xesc(&lg.name)) };
    l.push(format!("{}<logic{name}>", pad(d)));
    for r in &lg.rules {
        let mut at = vec![format!("kind=\"{}\"", r.kind)];
        if let Some(n) = r.name.as_deref().filter(|n| !n.is_empty()) {
            at.push(format!("var=\"{}\"", xesc(n)));
        }
        l.push(format!("{}<rule {}>", pad(d + 1), at.join(" ")));
        l.push(format!("{}<source>{}</source>", pad(d + 2), xesc(&r.source)));
        l.push(format!("{}<reads>{}</reads>", pad(d + 2), xesc(&r.reads)));
        if let Some(t) = r.then.as_deref().filter(|t| !t.is_empty()) {
            l.push(format!("{}<then>{}</then>", pad(d + 2), xesc(t)));
        }
        if !r.uses.is_empty() {
            l.push(format!("{}<uses>{}</uses>", pad(d + 2), xesc(&r.uses.join(", "))));
        }
        l.push(format!("{}</rule>", pad(d + 1)));
    }
    for v in &lg.missing {
        l.push(format!("{}<needs var=\"{}\">usado e nunca definido</needs>", pad(d + 1), xesc(v)));
    }
    l.push(format!("{}</logic>", pad(d)));
}

enum Frame {
    Node(Id, usize),
    Tail(Vec<String>),
}

/// `emit`: one node and everything under it, iteratively — a tail frame holds
/// the lines that close a node, pushed before its children so they come after.
pub fn emit(tree: &mut Tree<Extra>, root: Id, start: usize, l: &mut Vec<String>, ctx: &Context, describe: bool, binds: &[String]) {
    let mut stack = vec![Frame::Node(root, start)];
    while let Some(f) = stack.pop() {
        let (id, d) = match f {
            Frame::Tail(t) => {
                l.extend(t);
                continue;
            }
            Frame::Node(id, d) => (id, d),
        };
        let push_kids = |stack: &mut Vec<Frame>, kids: &[Id], d: usize| stack.extend(kids.iter().rev().map(|&k| Frame::Node(k, d)));
        let nd = tree.nodes[id].clone();

        if nd.is_literal() {
            let v = nd.v.clone().unwrap_or_default();
            if nd.form.as_deref() == Some("raw") {
                l.push(format!("{}<off>{}</off>", pad(d), xesc(&js_trim(&v))));
                continue;
            }
            let slot = nd.bound_slot.as_deref().filter(|s| !s.is_empty()).map_or(String::new(), |s| format!(" slot=\"{}\"", xesc(s)));
            let role = if nd.role.as_deref() == Some("result") { " role=\"result\"" } else { "" };
            /* a literal whose text is a bound name refers to it; `binds` is a
               plain object, so the prototype's names are bound too */
            let mut refer = String::new();
            if nd.is_binder != Some(true) {
                let name = js_trim(&v);
                if !name.is_empty() && (binds.contains(&name) || inherited(&name)) {
                    refer = format!(" ref=\"{}\"", xesc(&name));
                }
            }
            l.push(format!("{}<user-input{slot}{role}{refer}>{}</user-input>", pad(d), xesc(&v)));
            continue;
        }
        if nd.text == Some(true) {
            l.push(format!("{}<off>{}</off>", pad(d), xesc(nd.v.as_deref().unwrap_or(""))));
            continue;
        }
        if nd.mode.as_deref().is_some_and(|m| !m.is_empty()) {
            push_kids(&mut stack, &nd.children, d);
            continue;
        }
        if nd.raw_fence == Some(true) {
            l.push(format!("{}<raw>{}</raw>", pad(d), xesc(nd.v.as_deref().unwrap_or(""))));
            continue;
        }
        if nd.logic.is_some() {
            emit_logic(&nd.extra, d, l);
            continue;
        }
        if nd.is_template() {
            let expanded = nd.expanded == Some(true);
            let means = match (&nd.gloss, expanded) {
                (Some(g), true) if !matches!(g, Gloss::Text(t) if t.is_empty()) => format!(" means=\"{}\"", xesc(&gloss_text(g))),
                _ => String::new(),
            };
            let ta = format!(" name=\"{}\"{}{}{means}", xesc(nd.template.as_deref().unwrap_or("")),
                             if nd.is_def == Some(true) { " define=\"true\"" } else { "" }, if expanded { " expanded=\"true\"" } else { "" });
            if nd.children.is_empty() {
                l.push(format!("{}<template{ta}/>", pad(d)));
                continue;
            }
            l.push(format!("{}<template{ta}>", pad(d)));
            stack.push(Frame::Tail(vec![format!("{}</template>", pad(d))]));
            push_kids(&mut stack, &nd.children, d + 1);
            continue;
        }
        /* an empty template slot: the question travels in place of the answer */
        if nd.canonical.as_deref() == Some("PH") {
            let name = nd.children.iter().find(|&&c| tree.nodes[c].slot_name == Some(true))
                .map_or(String::new(), |&c| format!(" slot=\"{}\"", xesc(tree.nodes[c].raw.as_deref().unwrap_or(""))));
            let q = nd.children.iter().find(|&&c| tree.nodes[c].is_literal())
                .map_or("sem resposta".to_string(), |&c| tree.nodes[c].v.clone().unwrap_or_default());
            l.push(format!("{}<needs{name}>{}</needs>", pad(d), xesc(&q)));
            continue;
        }

        let bare = nd.chain_element == Some(true);
        let origin = nd.origin.clone().flatten();
        /* `chain` marks a bare link by the operator that attached it; `join`
           is the same for `,` between bracketed siblings */
        let chain = match origin.as_deref() {
            Some(o @ ("extend" | "item")) if bare => Some(format!("chain=\"{o}\"")),
            _ => None,
        };
        let join = (!bare && origin.as_deref() == Some("item")).then(|| "join=\"item\"".to_string());
        let (canonical, tier) = (nd.canonical.clone().unwrap_or_default(), nd.tier.clone().unwrap_or_default());
        let (open, close) = if tier == "unknown" || tier == "empty" {
            let mut at = vec![format!("tag=\"{}\"", xesc(nd.raw.as_deref().unwrap_or("")))];
            if let Some(Some(s)) = &nd.suggestion {
                at.push(format!("nearest=\"{}\"", xesc(&s.name.to_lowercase())));
            }
            at.extend(chain.clone());
            at.extend(join.clone());
            (format!("<unresolved {}", at.join(" ")), "unresolved".to_string())
        } else {
            let el = el_name(&canonical, &tier, gloss_arg(&nd.gloss));
            let mut attrs: Vec<String> = Vec::new();
            if nd.editorial == Some(true) {
                attrs.push("force=\"editorial\"".into());
            }
            if let Some(Some(c)) = nd.colon.as_ref().filter(|c| c.as_deref().is_some_and(|c| !c.is_empty())) {
                attrs.push(format!("name=\"{}\"", xesc(c)));
            }
            attrs.extend(chain.clone());
            attrs.extend(join.clone());
            /* a primitive that received an operand */
            if stands_alone(&canonical, ctx)
                && nd.children.iter().any(|&c| tree.nodes[c].is_canonical() && tree.nodes[c].chain_element != Some(true)) {
                attrs.push("imperative=\"true\"".into());
            }
            if let Some(b) = binding_of(tree, id) {
                attrs.push(format!("binds=\"{}\"", xesc(&b)));
            }
            if describe {
                let mean = def_of(&canonical, ctx).map(|v| js_value(Some(v)))
                    .or_else(|| nd.gloss.as_ref().map(gloss_text)).filter(|m| !m.is_empty());
                if let Some(m) = mean {
                    attrs.push(format!("means=\"{}\"", xesc(&m)));
                }
                if species_of(&canonical, ctx) == Some("composite") {
                    let mut uniq: Vec<String> = Vec::new();
                    let mut seen: Vec<String> = Vec::new();
                    for a in atoms_of(&canonical, ctx).unwrap_or_default() {
                        if !seen.contains(&a) {
                            uniq.push(a.to_lowercase());
                            seen.push(a);
                        }
                    }
                    uniq.sort_by(|a, b| a.encode_utf16().cmp(b.encode_utf16()));
                    attrs.push(format!("made-of=\"{}\"", xesc(&uniq.join(" "))));
                }
            }
            (format!("<{el}{}", if attrs.is_empty() { String::new() } else { format!(" {}", attrs.join(" ")) }), el)
        };

        let kids = tree.value_children(id);
        let colon = nd.colon.as_ref().is_some_and(|c| c.as_deref().is_some_and(|c| !c.is_empty()));
        /* ordered slots: each empty position travels as <needs slot="n"> */
        let slots = if bare { None } else { slots_of(&canonical) };
        let mut slot_needs: Vec<(usize, String)> = Vec::new();
        if let Some((len, named)) = slots {
            let got = kids.len() + usize::from(colon);
            for k in got..len.unwrap_or(0) {
                slot_needs.push((k + 1, named.get(k).copied().unwrap_or("").to_string()));
            }
        }
        let frame = if slots.is_some() { None } else { get(FRAMES, &canonical) };
        let needs = frame.filter(|_| !bare && kids.is_empty() && !colon)
            .map(|f| f.first().copied().unwrap_or("").replacen('*', "", 1));

        if nd.children.is_empty() && needs.is_none() && slot_needs.is_empty() {
            l.push(format!("{}{open}/>", pad(d)));
            continue;
        }
        l.push(format!("{}{open}>", pad(d)));
        if let Some(n) = needs {
            l.push(format!("{}<needs>{}</needs>", pad(d + 1), xesc(&n)));
        }
        let mut tail: Vec<String> = slot_needs.iter()
            .map(|(pos, want)| format!("{}<needs slot=\"{pos}\">{}</needs>", pad(d + 1), xesc(want))).collect();
        tail.push(format!("{}</{close}>", pad(d)));
        stack.push(Frame::Tail(tail));
        push_kids(&mut stack, &nd.children, d + 1);
    }
}

/* ---- the structural pass (PACKAGE_TARGET.md §3, §4), line by line ---- */

fn js_ws(c: char) -> bool {
    js_space(c)
}

/// `packageIndent`: the leading spaces.
pub fn package_indent(s: &str) -> usize {
    s.len() - s.trim_start_matches(' ').len()
}

/// Where `/\s<attr>` followed by what `after` accepts matches first: the
/// byte offset of the whitespace.
fn find_attr(line: &str, attr: &str, after: impl Fn(&str) -> bool) -> Option<usize> {
    let mut from = 0;
    while let Some(k) = line[from..].find(attr) {
        let at = from + k;
        let ws = line[..at].chars().next_back();
        if ws.is_some_and(js_ws) && after(&line[at + attr.len()..]) {
            return Some(at - ws.map_or(0, char::len_utf8));
        }
        from = at + attr.len();
    }
    None
}
/// `/\s*\/>/`, anchored where it is tried.
fn closes_self(rest: &str) -> bool {
    rest.trim_start_matches(js_ws).starts_with("/>")
}
fn chain_of(line: &str, attr: &str) -> bool {
    find_attr(line, attr, closes_self).is_some()
}
/// `.replace(/\s<attr>/, "")`: the first whitespace-led occurrence removed.
fn drop_attr(line: &str, attr: &str) -> String {
    match find_attr(line, attr, |_| true) {
        Some(at) => {
            let ws = line[at..].chars().next().map_or(0, char::len_utf8);
            format!("{}{}", &line[..at], &line[at + ws + attr.len()..])
        }
        None => line.to_string(),
    }
}
/// `/^<([a-z-]+)/`
fn tag_name(t: &str) -> Option<&str> {
    let rest = t.strip_prefix('<')?;
    let n = rest.find(|c: char| !(c.is_ascii_lowercase() || c == '-')).unwrap_or(rest.len());
    (n > 0).then(|| &rest[..n])
}

/// `packageSpan`: the last line of the element that opens at `i`.
pub fn package_span(l: &[String], i: usize) -> usize {
    let ind: Vec<usize> = l.iter().map(|s| package_indent(s)).collect();
    let t: Vec<&str> = l.iter().map(|s| s.trim_start_matches(' ')).collect();
    span(&ind, &t, i)
}
/// `packageSpan` over each line's indent and text, read once: the pass asks
/// it of every line, and a deep document holds thousands of lines at the
/// indent's ceiling, each scanned to its close.
fn span(ind: &[usize], t: &[&str], i: usize) -> usize {
    let head = t[i];
    if !head.starts_with('<') || head.starts_with("</") || head.trim_end_matches(js_ws).ends_with("/>") {
        return i;
    }
    let Some(name) = tag_name(head) else { return i };
    let close = format!("</{name}>");
    for j in i + 1..t.len() {
        if ind[j] < ind[i] {
            return i;
        }
        if ind[j] == ind[i] && t[j] == close {
            return j;
        }
    }
    i
}

/// `packagePass`: a run of bare links becomes one `<chain>`, a run of
/// bracketed conjuncts one `<holds>`, and a composite gets its `<invoke>`.
pub fn package_pass(l: Vec<String>, ctx: &Context) -> Vec<String> {
    /* 3 — a maximal run of siblings, an `extend` then `item`s, is one <chain> */
    let mut out: Vec<String> = Vec::new();
    let mut i = 0;
    while i < l.len() {
        if !chain_of(&l[i], "chain=\"extend\"") {
            out.push(l[i].clone());
            i += 1;
            continue;
        }
        let ind = package_indent(&l[i]);
        let mut j = i + 1;
        while j < l.len() && package_indent(&l[j]) == ind && chain_of(&l[j], "chain=\"item\"") {
            j += 1;
        }
        let padding = " ".repeat(ind);
        out.push(format!("{padding}<chain>"));
        for line in &l[i..j] {
            let dropped = match find_attr(line, "chain=\"extend\"", |_| true)
                .into_iter().chain(find_attr(line, "chain=\"item\"", |_| true)).min() {
                Some(at) if line[at..].trim_start_matches(js_ws).starts_with("chain=\"extend\"") => drop_attr(line, "chain=\"extend\""),
                Some(_) => drop_attr(line, "chain=\"item\""),
                None => line.clone(),
            };
            out.push(format!("  {dropped}"));
        }
        out.push(format!("{padding}</chain>"));
        i = j;
    }

    /* 3b — a head and its `join="item"` followers are one <holds> */
    let join = |line: &str| find_attr(line, "join=\"item\"", |rest| rest.starts_with(|c: char| js_ws(c) || c == '/' || c == '>')).is_some();
    let ind: Vec<usize> = out.iter().map(|s| package_indent(s)).collect();
    let text: Vec<&str> = out.iter().map(|s| s.trim_start_matches(' ')).collect();
    let mut held: Vec<String> = Vec::new();
    let mut h = 0;
    while h < out.len() {
        let head_end = span(&ind, &text, h);
        let h_ind = ind[h];
        let mut members: Vec<(usize, usize)> = Vec::new();
        let mut k = head_end + 1;
        while k < out.len() && ind[k] == h_ind && join(&out[k]) {
            let m_end = span(&ind, &text, k);
            members.push((k, m_end));
            k = m_end + 1;
        }
        if members.is_empty() {
            held.push(out[h].clone());
            h += 1;
            continue;
        }
        let hp = " ".repeat(h_ind);
        held.push(format!("{hp}<holds>"));
        for line in &out[h..=head_end] {
            held.push(format!("  {line}"));
        }
        for &(a, b) in &members {
            for line in &out[a..=b] {
                held.push(format!("  {}", drop_attr(line, "join=\"item\"")));
            }
        }
        held.push(format!("{hp}</holds>"));
        h = members.last().expect("a member").1 + 1;
    }

    /* 4 — <invoke>, first child of a composite's element */
    let mut with_invokes: Vec<String> = Vec::new();
    for line in held {
        let t = line.trim_start_matches(' ').to_string();
        let ind = package_indent(&line);
        with_invokes.push(line);
        if !t.starts_with('<') || t.starts_with("</") || t.ends_with("/>") {
            continue;
        }
        let Some(nm) = tag_name(&t).filter(|n| t[1 + n.len()..].starts_with(|c: char| js_ws(c) || c == '>')) else { continue };
        let Some((_, hit)) = derived().gloss_reverse.iter().find(|(k, _)| k == nm) else { continue };
        if species_of(hit.canonical, ctx) != Some("composite") {
            continue;
        }
        let depth = depth_of(hit.canonical, ctx).map_or("null".to_string(), number);
        with_invokes.push(format!("{}<invoke reads=\"{}\" species=\"composite\" depth=\"{depth}\"/>", " ".repeat(ind + 2),
                                  xesc(&js_value(formula_of(hit.canonical, ctx)))));
    }
    with_invokes
}

/// `buildXml(segments, opts)`.
pub fn build_xml(tree: &mut Tree<Extra>, ctx: &Context, describe: bool) -> String {
    if tree.segments.is_empty() {
        return "<!-- escolha um molde ou escreva do lado esquerdo -->".into();
    }
    /* the scope is the whole document: a reference resolves to a binding
       written later as readily as to one written earlier */
    let binds = collect_bindings(tree, &mut |_| {});
    let mut l = vec![format!("<glyph-package engine=\"{VERSION}\">"), format!("{}<schema/>", pad(1))];
    for s in 0..tree.segments.len() {
        let sg = tree.segments[s].clone();
        l.push(format!("{}<block{}>", pad(1), block_attrs(sg.continues)));
        if sg.is_return {
            let (mut exp, mut bad) = (Vec::new(), Vec::new());
            collect(tree, &sg.children, &mut exp, &mut bad);
            let head = format!("<user-expectative expects=\"{}\"", xesc(&exp.join(",")));
            if sg.children.is_empty() {
                l.push(format!("{}{head}/>", pad(2)));
            } else {
                l.push(format!("{}{head}>", pad(2)));
                for &c in &sg.children {
                    emit(tree, c, 3, &mut l, ctx, describe, &binds);
                }
                l.push(format!("{}</user-expectative>", pad(2)));
            }
        } else {
            if let Some(first) = sg.mood.first() {
                let mut a = vec![format!("dominant=\"{}\"", xesc(&gloss_text(&first.gloss)))];
                if sg.mood.len() > 1 {
                    a.push(format!("also=\"{}\"", xesc(&sg.mood[1..].iter().map(|m| gloss_text(&m.gloss)).collect::<Vec<_>>().join(","))));
                }
                l.push(format!("{}<mood {}/>", pad(2), a.join(" ")));
            }
            for &c in &sg.children {
                emit(tree, c, 2, &mut l, ctx, describe, &binds);
            }
        }
        l.push(format!("{}</block>", pad(1)));
        if sg.breaks > 0 {
            l.push(format!("{}<break/>", pad(1)));
        }
    }
    l.push("</glyph-package>".into());
    package_pass(l, ctx).join("\n")
}

/// `toXML(src, opts)`: human → glyph → XML, in one call.
pub fn to_xml(src: &str, o: &Opts, describe: bool) -> Result<String, Thrown> {
    let mut p = parse(src, o)?;
    Ok(build_xml(&mut p.tree, o.ctx, describe))
}
