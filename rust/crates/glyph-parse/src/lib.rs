//! glyph-parse — Port of `scripts/core/parser.js` — the oracle. The JS module's own summary:
//!
//!   tokens into the tree, and the tree into a fact.
//!
//! EMS-001 ORD-0007. `parse` takes the lexer's tokens, nests by `[` and `]`,
//! attaches operators (`origin`: nest, item, extend, root), expands templates
//! — handing itself to the expander, as the JS parser does — runs the rules
//! and the constraints, and collects the bindings. Every diagnostic carries
//! both languages until the end, where `lang` picks one; the rank and the
//! stripped text are the JS's.
//!
//! The JS reads its vocabulary tables as plain objects, and the port answers
//! as they do (EMS-001/RETURN.md, ORD-0007): `constructor` and `__proto__`,
//! the two session words `Object.prototype` gives the lexer, are editorial,
//! named structures and slotted commands here; `constructor` read as prose is
//! a command word; a binding named after a member of the prototype is bound
//! twice from the start; and `[/undefined]` closes an open template, whose
//! canonical `String()` reads as `undefined`.

use glyph_lex::{classify, js_trim, suggest, tokenize, Token};
use glyph_logic::{parse_logic, Logic};
use glyph_rules::check_rules;
use glyph_stores::{entry_of, expansion_registry, Context, Value};
use glyph_templates::{check_template_constraints, expand_invocations, Parsed, SubParse};
use glyph_util::tree::{strip_tags, Diag, Emotion, Gloss, Id, Node, Segment, Span, Suggestion, Thrown, Tree, LIMITS};
use glyph_util::{esc, inherited};
use glyph_vocab::{derived, get, ALIAS, EDITORIAL_ONLY, EMO, FRAMES, INSTR, META, NAMED_STRUCT, SESSION, SLOTS, STRUCT};

/// What the parser carries beyond the shared node: the Logic a `[logic]`
/// block read.
pub type Extra = Option<Logic>;

/// `opts`: the stores, and what the JS reads off the rest of the object.
pub struct Opts<'a> {
    pub ctx: &'a Context,
    /// `opts.session !== false`
    pub session: bool,
    /// `opts.valency !== false`
    pub valency: bool,
    /// `opts.lang === "en"`
    pub en: bool,
    /// `opts._expanding`: the templates being expanded around this parse.
    pub expanding: Vec<String>,
}

impl<'a> Opts<'a> {
    pub fn new(ctx: &'a Context) -> Opts<'a> {
        Opts { ctx, session: true, valency: true, en: false, expanding: Vec::new() }
    }
}

/// A diagnostic as `parse` returns it: in the language asked for, with the
/// span when a token caused it, and stripped of its markup.
#[derive(Debug, Clone, PartialEq)]
pub struct Gap {
    pub sev: String,
    pub lab: String,
    pub msg: String,
    pub code: String,
    pub at: Option<(usize, usize)>,
    pub plain: String,
}

pub struct Parse {
    pub tree: Tree<Extra>,
    pub gaps: Vec<Gap>,
    pub tokens: Vec<Token>,
}

/// A table the JS reads as `TABLE[key]`: a key of its own, or one
/// `Object.prototype` answers.
fn has_text(table: &[(&'static str, &'static str)], key: &str) -> bool {
    get(table, key).is_some_and(|g| !g.is_empty()) || inherited(key)
}
fn has_num(table: &[(&'static str, f64)], key: &str) -> bool {
    get(table, key).is_some_and(|n| n != 0.0 && !n.is_nan()) || inherited(key)
}

/// `SLOTS[canonical]`: the slots of its own; or, for a name the prototype
/// answers, a function or the prototype — `length` slots, none of them named.
enum Slots {
    Own(&'static [&'static str]),
    Unnamed(Option<usize>),
}
fn slots_of(canonical: &str) -> Option<Slots> {
    if let Some(s) = get(SLOTS, canonical) {
        return Some(Slots::Own(s));
    }
    let len = match canonical {
        "__proto__" => None,
        "toString" | "valueOf" | "toLocaleString" => Some(0),
        "__defineGetter__" | "__defineSetter__" => Some(2),
        k if inherited(k) => Some(1),
        _ => return None,
    };
    Some(Slots::Unnamed(len))
}

/// `String(v)` of a token's value; `undefined` when there is none.
fn js_str(v: &Option<String>) -> String {
    v.clone().unwrap_or_else(|| "undefined".into())
}

/// `.replace(/\s+,/g, ",")`
fn tighten_commas(s: &str) -> String {
    let c: Vec<char> = s.chars().collect();
    let mut out = String::new();
    let mut i = 0;
    while i < c.len() {
        if js_space(c[i]) {
            let mut j = i;
            while j < c.len() && js_space(c[j]) {
                j += 1;
            }
            if j < c.len() && c[j] == ',' {
                out.push(',');
                i = j + 1;
                continue;
            }
            out.extend(&c[i..j]);
            i = j;
            continue;
        }
        out.push(c[i]);
        i += 1;
    }
    out
}
fn js_space(c: char) -> bool {
    u16::try_from(c as u32).is_ok_and(glyph_lex::js_space)
}

/// `/^[A-Za-z_][A-Za-z0-9_.-]*$/`: a binding is a name, not prose.
fn bind_name(v: &str) -> bool {
    let mut c = v.chars();
    c.next().is_some_and(|f| f.is_ascii_alphabetic() || f == '_')
        && c.all(|x| x.is_ascii_alphanumeric() || matches!(x, '_' | '.' | '-'))
}

struct State<'t, 'o> {
    tokens: &'t [Token],
    o: &'o Opts<'o>,
    tree: Tree<Extra>,
    diags: Vec<Diag>,
    stack: Vec<Id>,
    uid: u64,
    seg: Segment,
    pending: Option<&'static str>,
}

impl State<'_, '_> {
    fn g(&mut self, d: Diag) {
        self.diags.push(d);
    }
    fn fix(&mut self, lab: &str, msg: String, code: &str, en_lab: &str, en: String) {
        self.g(Diag::new("fix", lab, msg, code).en(en_lab, en));
    }
    fn at(d: Diag, tk: &Token) -> Diag {
        Diag { at: Some((tk.s, tk.e)), ..d }
    }
    fn top(&self) -> Option<Id> {
        self.stack.last().copied()
    }
    fn add(&mut self, nd: Node<Extra>) -> Id {
        self.tree.add(nd)
    }
    /// `attach`: under the open command, with its parent; or at the segment's
    /// top, with none.
    fn attach(&mut self, id: Id) {
        match self.top() {
            Some(t) => {
                self.tree.nodes[t].children.push(id);
                self.tree.nodes[id].parent = Some(t);
            }
            None => self.seg.children.push(id),
        }
    }
    /// What a literal, a text or a mode joins: the open command's children,
    /// with no parent set — the JS pushes them without `attach`.
    fn push_loose(&mut self, id: Id) {
        match self.top() {
            Some(t) => self.tree.nodes[t].children.push(id),
            None => self.seg.children.push(id),
        }
    }
    fn span(tk: &Token) -> Option<Span> {
        Some(Span { k: tk.k.to_string(), s: tk.s, e: tk.e })
    }

    fn close_seg(&mut self, cause: &str) {
        let mut names: Vec<String> = Vec::new();
        while let Some(closing) = self.stack.pop() {
            let nd = &mut self.tree.nodes[closing];
            nd.auto_closed = Some(true);
            self.seg.auto_closed += 1;
            if names.len() < 4 {
                let name = [&nd.canonical, &nd.template].into_iter().flatten().find(|s| !s.is_empty())
                    .map_or("?".to_string(), |s| s.clone());
                names.push(name.to_lowercase());
            }
        }
        if cause == "semi" && self.seg.auto_closed > LIMITS.auto_close {
            let n = self.seg.auto_closed;
            let list = names.iter().map(|x| format!("<code>[{}</code>", esc(x))).collect::<Vec<_>>().join(", ");
            self.g(Diag::new("note", "fecha tudo",
                format!("<code>;</code> fechou {n} comandos de uma vez ({list}…). Em bloco longo isso costuma fechar mais do \
                         que se pretendia — feche com <code>]</code> o que for parcial."), "MassAutoClose")
                .en("closed everything", format!("<code>;</code> closed {n} commands at once ({list}…). In a long block that \
                                                  usually closes more than intended — close what is partial with <code>]</code>.")));
        }
        self.seg.cause = Some(cause.to_string());
        let seg = std::mem::take(&mut self.seg);
        if !seg.children.is_empty() || !seg.mood.is_empty() || seg.breaks > 0 {
            self.tree.segments.push(seg);
        }
        self.pending = None;
    }

    fn command(&mut self, tk: &Token) {
        let v = tk.v.as_deref().unwrap_or("");
        let cl = classify(v, self.o.ctx, self.o.session);
        let parent = self.top();
        let in_ph = parent.is_some_and(|p| self.tree.nodes[p].canonical.as_deref() == Some("PH"));
        let bare = tk.k == "bareTag";
        if tk.k == "open" && v.is_empty() {
            self.fix("sem nome", "<code>[</code> sem nome. Um <code>[</code> = um comando.".into(), "EmptyCommandName",
                     "no name", "<code>[</code> with no name. One <code>[</code> is one command.".into());
        }
        /* `[ph-alvo`: the bare tag is the hole's name, not a chain link */
        let slot_name = in_ph && bare;
        let gloss = match cl.gloss {
            glyph_lex::Gloss::Text(t) => Some(Gloss::Text(t)),
            glyph_lex::Gloss::Prototype => Some(Gloss::Prototype),
            glyph_lex::Gloss::Absent if cl.tier == "session" && cl.canonical == "constructor" => Some(Gloss::Object),
            glyph_lex::Gloss::Absent => None,
        };
        self.uid += 1;
        let origin = if slot_name {
            None
        } else {
            Some(self.pending.unwrap_or(if bare { "extend" } else if parent.is_some() { "nest" } else { "root" }).to_string())
        };
        let mut nd = Node {
            id: Some(self.uid), raw: tk.v.clone(), tier: Some(cl.tier.into()), canonical: Some(cl.canonical.clone()), gloss,
            alias: Some(cl.alias == Some(true)), colon: Some(None), auto_closed: Some(false), tok: Self::span(tk),
            editorial: Some(has_num(EDITORIAL_ONLY, &cl.canonical)), origin: Some(origin), chain_element: Some(bare),
            slot_name: Some(slot_name), depth: Some(self.stack.len()), ..Default::default()
        };
        if cl.tier == "unknown" && !slot_name {
            let sg = suggest(v);
            let ptbr = &derived().ptbr;
            let (pt, en) = match &sg {
                Some(s) => {
                    let lower = s.name.to_lowercase();
                    (format!(" → <code>[{lower}</code>{}?", get(ptbr, s.name).filter(|p| !p.is_empty()).map_or(String::new(), |p| format!(" ({p})"))),
                     format!(" → <code>[{lower}</code>{}?", get(INSTR, s.name).filter(|g| !g.is_empty()).map_or(String::new(), |p| format!(" ({p})"))))
                }
                None => (" Veja a tabela.".into(), " See the table.".into()),
            };
            nd.suggestion = Some(sg.map(|s| Suggestion { name: s.name.into(), how: s.how.into() }));
            self.fix("não existe", format!("<code>[{}</code> fora do vocabulário.{pt}", esc(v)), "UnknownCommand",
                     "does not exist", format!("<code>[{}</code> is outside the vocabulary.{en}", esc(v)));
        }
        let id = self.add(nd);
        self.attach(id);
        if tk.k == "open" {
            self.stack.push(id);
        }
        self.pending = None;
    }

    fn colon(&mut self, i: usize) -> usize {
        let Some(t2) = self.top() else { return i };
        let (mut parts, mut j, mut saw_comma) = (Vec::new(), i + 1, false);
        while j < self.tokens.len() {
            let nx = &self.tokens[j];
            match nx.k {
                "close" | "semi" | "open" | "linebreak" | "logic" => break,
                "comma" => {
                    saw_comma = true;
                    parts.push(",".to_string());
                }
                "literal" | "text" => parts.push(js_trim(&js_str(&nx.v))),
                "equals" => parts.push("=".into()),
                "extend" => parts.push("-".into()),
                _ => break,
            }
            j += 1;
        }
        let colon = js_trim(&tighten_commas(&parts.join(" ")));
        let nd = &mut self.tree.nodes[t2];
        nd.colon = Some(Some(colon));
        let canonical = nd.canonical.clone().unwrap_or_else(|| "undefined".into());
        let raw = esc(nd.raw.as_deref().unwrap_or(""));
        if saw_comma && !has_text(STRUCT, &canonical) {
            self.g(Diag::new("ask", "ordem incerta", format!("<code>[{raw}: a,b,c]</code> ordem não inferível. Aninhe."), "AmbiguousSlotOrder")
                .en("order unclear", format!("<code>[{raw}: a,b,c]</code> order cannot be inferred. Nest them.")));
        }
        j - 1
    }

    fn literal(&mut self, tk: &Token) {
        let t3 = self.top();
        let mut lit = Node { literal: Some(true), v: tk.v.clone(), form: tk.form.map(str::to_string), tok: Self::span(tk), ..Default::default() };
        /* a literal written after a bracketed nest names what came back */
        if let Some(t) = t3 {
            let after_nest = self.tree.nodes[t].children.iter()
                .any(|&c| self.tree.nodes[c].is_canonical() && self.tree.nodes[c].chain_element != Some(true));
            lit.role = Some(if after_nest { "result" } else { "operand" }.into());
        }
        let id = self.add(lit);
        self.push_loose(id);
        match tk.closed_by {
            Some(by @ ("bracket" | "semi")) => {
                let ch = if by == "bracket" { "]" } else { ";" };
                self.fix("texto cortado", format!("<code>{ch}</code> encerra o literal aqui, e não há escape para ele. \
                                                   Reescreva o texto sem esse caractere."), "TruncatedLiteral",
                         "text cut", format!("<code>{ch}</code> ends the literal here, and there is no escape for it. \
                                              Rewrite the text without that character."));
            }
            Some("eof") => self.fix("texto aberto", "<code>`</code> sem fechar.".into(), "UnterminatedLiteral",
                                    "text left open", "<code>`</code> never closed.".into()),
            Some("unterminated") if tk.form == Some("quote") =>
                self.fix("texto aberto", "<code>'</code> sem fechar.".into(), "UnterminatedLiteral",
                         "text left open", "<code>'</code> never closed.".into()),
            _ => {}
        }
        self.pending = None;
    }

    fn emotion(&mut self, tk: &Token) {
        let raw = tk.v.as_deref().unwrap_or("");
        let key = raw.to_lowercase();
        let gloss = match get(EMO, &key) {
            Some(g) if !g.is_empty() => Gloss::Text(g.into()),
            _ if key == "__proto__" => Gloss::Prototype,
            _ if inherited(&key) => Gloss::Object,
            _ => {
                let d = Diag::new("fix", "humor fora da tabela",
                                  format!("<code>/{}/</code> não está na tabela de emoções. Descartado.", esc(raw)), "UnknownEmotion")
                    .en("mood off-table", format!("<code>/{}/</code> is not in the emotion table. Discarded.", esc(raw)));
                self.g(Self::at(d, tk));
                return;
            }
        };
        let rec = Emotion { name: key, gloss, order: tk.order };
        if let Some(t) = self.top() {
            self.tree.nodes[t].emotions.push(rec.clone());
        }
        self.seg.mood.push(rec);
    }

    fn text(&mut self, tk: &Token) {
        let v = js_trim(&js_str(&tk.v));
        if v.is_empty() {
            return;
        }
        let txt = Node { text: Some(true), v: Some(v.clone()), tok: Self::span(tk), ..Default::default() };
        let id = self.add(txt);
        self.push_loose(id);
        const KEYWORDS: [&str; 10] = ["if", "or", "else", "and", "then", "unless", "se", "ou", "senao", "entao"];
        let word = |c: char| c.is_ascii_alphanumeric() || c == '_' || c == '.';
        if KEYWORDS.iter().any(|k| k.eq_ignore_ascii_case(&v)) {
            self.g(Diag::new("note", "palavra solta",
                             format!("<code>{}</code> solto. Lógica: <code>[if</code> <code>[unls</code> <code>[logic]</code>.", esc(&v)), "LooseKeyword")
                .en("loose word", format!("<code>{}</code> on its own. Logic: <code>[if</code> <code>[unls</code> <code>[logic]</code>.", esc(&v))));
        } else if v.chars().next().is_some_and(|c| c.is_ascii_alphabetic()) && v.chars().all(word) {
            let (uw, lw) = (v.to_uppercase(), v.to_lowercase());
            let known = has_text(INSTR, &uw) || has_text(ALIAS, &uw) || has_text(STRUCT, &uw) || has_text(META, &uw)
                || (self.o.session && has_text(SESSION, &lw));
            if known {
                self.g(Diag::new("ask", "comando solto",
                    format!("<code>{}</code> está no vocabulário mas foi escrito sem <code>[</code> — virou prosa \
                             (<code>&lt;off&gt;</code>), não comando. Queria <code>[{}</code>?", esc(&v), esc(&lw)), "LooseCommandWord")
                    .en("loose command", format!("<code>{}</code> is in the vocabulary but was written without <code>[</code> — \
                                                  it became prose (<code>&lt;off&gt;</code>), not a command. Did you mean <code>[{}</code>?",
                                                 esc(&v), esc(&lw))));
            }
        }
        if v.chars().all(|c| c == '.') {
            self.g(Diag::new("note", "ponto solto",
                             "<code>.</code> sem função. Separadores: <code>,</code> <code>;</code> <code>;;</code>.".into(), "LooseDots")
                .en("loose dot", "<code>.</code> has no function here. Separators: <code>,</code> <code>;</code> <code>;;</code>.".into()));
        }
    }

    fn token(&mut self, i: usize) -> usize {
        let tk = &self.tokens[i];
        match tk.k {
            "open" | "bareTag" => self.command(tk),
            "rawfence" => {
                let origin = self.pending.unwrap_or("nest").to_string();
                let id = self.add(Node { raw_fence: Some(true), v: tk.body.clone(), tok: Self::span(tk), origin: Some(Some(origin)),
                                         ..Default::default() });
                self.attach(id);
                if tk.closed != Some(true) {
                    self.fix("não fechou", "<code>[raw]</code> sem <code>[/raw]</code>.".into(), "UnclosedRaw",
                             "not closed", "<code>[raw]</code> without <code>[/raw]</code>.".into());
                }
                self.pending = None;
            }
            "logic" => {
                let lg = parse_logic(tk.v.as_deref().unwrap_or(""), tk.body.as_deref().unwrap_or(""));
                let origin = self.pending.unwrap_or("nest").to_string();
                let gaps: Vec<Diag> = lg.gaps.iter().map(|g| Diag::new(g.sev, g.lab, g.msg.clone(), g.code)).collect();
                let id = self.add(Node { logic: Some(lg.name.clone()), tok: Self::span(tk), origin: Some(Some(origin)),
                                         extra: Some(lg), ..Default::default() });
                self.attach(id);
                self.diags.extend(gaps);
                if tk.closed != Some(true) {
                    self.fix("não fechou", "<code>[logic]</code> sem <code>[/logic]</code>.".into(), "UnclosedLogic",
                             "not closed", "<code>[logic]</code> without <code>[/logic]</code>.".into());
                }
                self.pending = None;
            }
            "tpl" => {
                let origin = self.pending.unwrap_or(if self.top().is_some() { "nest" } else { "root" }).to_string();
                let id = self.add(Node { template: tk.v.clone(), is_def: Some(tk.def == Some(true)), tok: Self::span(tk),
                                         origin: Some(Some(origin)), ..Default::default() });
                self.attach(id);
                self.stack.push(id);
                self.pending = None;
            }
            "chain" => self.seg.continues = true,
            "close" => {
                if self.stack.pop().is_none() {
                    self.fix("sobrando", "<code>]</code> sem comando aberto.".into(), "UnmatchedCloseBracket",
                             "spare", "<code>]</code> with no command open.".into());
                }
                self.pending = None;
            }
            "closeTag" => {
                let want = js_str(&tk.v).to_uppercase();
                let found = self.stack.iter().rposition(|&s| js_str(&self.tree.nodes[s].canonical).to_uppercase() == want);
                match found {
                    Some(f) => self.stack.truncate(f),
                    None => {
                        let v = esc(tk.v.as_deref().unwrap_or(""));
                        self.fix("sobrando", format!("<code>[/{v}]</code> fecha comando não aberto."), "UnmatchedCloseTag",
                                 "spare", format!("<code>[/{v}]</code> closes a command that never opened."));
                    }
                }
            }
            "colon" => return self.colon(i),
            "literal" => self.literal(tk),
            "emotion" => self.emotion(tk),
            "extend" => {
                self.pending = Some("extend");
                let next = self.tokens.get(i + 1).map(|t| t.k);
                if !matches!(next, Some("open" | "bareTag" | "literal" | "text")) {
                    self.fix("pendurado", "<code>-</code> sem cadeia. Ex.: <code>[rw-cr</code>.".into(), "DanglingChain",
                             "dangling", "<code>-</code> with no chain. E.g. <code>[rw-cr</code>.".into());
                }
            }
            "badslash" => {
                let d = Diag::new("fix", "barra na cadeia",
                    "<code>/</code> dentro de uma cadeia. O divisor foi removido em v1.7 (C-01) e <code>/</code> agora delimita \
                     apenas emoção. Feche a cadeia antes: <code>[in-rwk]/eth/</code>.".into(), "SlashInChain")
                    .en("slash in chain", "<code>/</code> inside a chain. The divider was removed in v1.7 (C-01) and <code>/</code> \
                                           now delimits emotion only. Close the chain first: <code>[in-rwk]/eth/</code>.".into());
                self.g(Self::at(d, tk));
            }
            /* the JS writes `\emo\` in a string literal, where `\e` and `\<`
               are escapes of nothing: the message shows `emo` */
            "badmood" => {
                let d = Diag::new("fix", "grafia abandonada",
                    "<code>emo</code> foi substituída por <code>/emo/</code> em v1.7 (I-19). Escreva <code>/eth/</code>.".into(), "BackslashMood")
                    .en("abandoned spelling", "<code>emo</code> was replaced by <code>/emo/</code> in v1.7 (I-19). Write <code>/eth/</code>.".into());
                self.g(Self::at(d, tk));
            }
            "comma" => self.pending = Some("item"),
            "equals" => {
                if let Some(t) = self.top() {
                    self.tree.nodes[t].is_definition = Some(true);
                }
            }
            "semi" => self.close_seg("semi"),
            "linebreak" => {
                self.seg.breaks += 1;
                self.close_seg("linebreak");
            }
            "mode" => {
                if tk.v.as_deref() == Some("OFF") {
                    let id = self.add(Node { mode: Some("off".into()), tok: Self::span(tk), ..Default::default() });
                    self.push_loose(id);
                    self.seg.pending_mode = Some(Some(id));
                } else {
                    self.seg.pending_mode = Some(None);
                }
            }
            "modeUnclosed" => self.g(Diag::new("note", "modo texto", "<code>[off]</code> sem <code>[on]</code>. Resto lido como prosa.".into(),
                                               "UnclosedOffMode")
                .en("text mode", "<code>[off]</code> without <code>[on]</code>. The rest is read as prose.".into())),
            "raw" => {
                let id = self.add(Node { literal: Some(true), v: tk.v.clone(), form: Some("raw".into()), tok: Self::span(tk),
                                         ..Default::default() });
                match self.seg.pending_mode {
                    Some(Some(m)) => self.tree.nodes[m].children.push(id),
                    _ => self.seg.children.push(id),
                }
            }
            "return" => self.seg.is_return = true,
            "text" => self.text(tk),
            _ => {}
        }
        i
    }
}

/// `bindingOf`: the name a command's operand literal gives its result, when
/// the command has both that literal and a bracketed nest. The literal is
/// marked as the binder.
pub fn binding_of<X: Clone>(tree: &mut Tree<X>, id: Id) -> Option<String> {
    let nd = &tree.nodes[id];
    if !nd.is_canonical() || nd.slot_name == Some(true) {
        return None;
    }
    let (mut lit, mut nest) = (None, false);
    for &c in &nd.children {
        let k = &tree.nodes[c];
        if k.is_literal() && k.form.as_deref() != Some("raw") && lit.is_none() && k.role.as_deref() != Some("result") {
            lit = Some(c);
        } else if k.is_canonical() && k.chain_element != Some(true) {
            nest = true;
        }
    }
    let lit = lit?;
    let v = js_trim(tree.nodes[lit].v.as_deref().unwrap_or(""));
    if !nest || v.is_empty() || !bind_name(&v) {
        return None;
    }
    tree.nodes[lit].is_binder = Some(true);
    Some(v)
}

/// `collectBindings`: one name, one result, over the whole package.
pub fn collect_bindings<X: Clone>(tree: &mut Tree<X>, g: &mut dyn FnMut(Diag)) -> Vec<String> {
    let mut order: Vec<String> = Vec::new();
    let ids: Vec<Id> = tree.segments.iter().flat_map(|sg| tree.walk(&sg.children)).collect();
    for id in ids {
        let Some(name) = binding_of(tree, id) else { continue };
        /* `binds` is a plain object: a member of the prototype is there already */
        if order.contains(&name) || inherited(&name) {
            g(Diag::new("fix", "nome repetido",
                        format!("<code>{}</code> nomeia mais de um resultado — uma referência não pode dizer qual.", esc(&name)),
                        "DuplicateBinding")
                .en("name bound twice", format!("<code>{}</code> names more than one result — a reference cannot say which.", esc(&name))));
        } else {
            order.push(name);
        }
    }
    order
}

/// `parse(input, opts)`.
pub fn parse(src: &str, o: &Opts) -> Result<Parse, Thrown> {
    let tokens = tokenize(src);
    let mut st = State { tokens: &tokens, o, tree: Tree { nodes: Vec::new(), segments: Vec::new() }, diags: Vec::new(),
                         stack: Vec::new(), uid: 0, seg: Segment::default(), pending: None };
    let mut i = 0;
    while i < tokens.len() {
        i = st.token(i) + 1;
    }
    st.close_seg("eof");
    let State { mut tree, mut diags, .. } = st;
    let ctx = o.ctx;
    let mut g = |d: Diag| diags.push(d);

    /* expansion first: every later pass must see the body, not the bare call */
    expand_invocations(&mut tree, ctx, o.session, &o.expanding, &mut g, &mut |body, sub: SubParse| {
        /* the JS hands parse the registry alone, and the rules and the
           composition table fall to what is registered, which here is none */
        let sub_ctx = Context::new(Some(sub.templates.clone()), None, None);
        let r = parse(body, &Opts { ctx: &sub_ctx, session: sub.session, valency: sub.valency, en: false, expanding: sub.expanding })?;
        Ok(Parsed { tree: r.tree, gaps: r.gaps.into_iter().map(|p| Diag { at: p.at, ..Diag::new(&p.sev, &p.lab, p.msg, &p.code) }).collect() })
    })?;

    let n = |t: &Tree<Extra>, id: Id| t.nodes[id].clone();
    let lower = |s: &Option<String>| js_str(s).to_lowercase();

    /* an empty template slot */
    for id in tree.segments.iter().flat_map(|sg| tree.walk(&sg.children)).collect::<Vec<_>>() {
        if tree.nodes[id].canonical.as_deref() != Some("PH") {
            continue;
        }
        let kids = &tree.nodes[id].children;
        let name = kids.iter().find(|&&c| tree.nodes[c].slot_name == Some(true))
            .map(|&c| format!("<code>{}</code> ", esc(tree.nodes[c].raw.as_deref().unwrap_or(""))));
        let q = kids.iter().find(|&&c| tree.nodes[c].is_literal()).map(|&c| esc(tree.nodes[c].v.as_deref().unwrap_or("")));
        let name = name.unwrap_or_default();
        g(Diag::new("ask", "casa vazia", format!("{name}{}", q.clone().unwrap_or_else(|| "sem resposta".into())), "PlaceholderPending")
            .en("empty field", format!("{name}{}", q.unwrap_or_else(|| "no answer".into()))));
    }

    /* deep nesting in a long block */
    for sg in 0..tree.segments.len() {
        let mut deepest: Option<Id> = None;
        for id in tree.walk(&tree.segments[sg].children) {
            let Some(d) = tree.nodes[id].depth else { continue };
            if deepest.is_none_or(|x| d > tree.nodes[x].depth.unwrap_or(0)) {
                deepest = Some(id);
            }
        }
        let Some(dn) = deepest else { continue };
        let depth = tree.nodes[dn].depth.unwrap_or(0);
        if depth < LIMITS.nesting {
            continue;
        }
        let (mut chain, mut p) = (Vec::new(), Some(dn));
        while let Some(pid) = p {
            if chain.len() >= 4 {
                break;
            }
            let c = &tree.nodes[pid].canonical;
            chain.insert(0, c.clone().filter(|c| !c.is_empty()).unwrap_or_else(|| "?".into()).to_lowercase());
            p = tree.nodes[pid].parent;
        }
        let path = chain.iter().map(|x| format!("<code>[{}</code>", esc(x))).collect::<Vec<_>>().join(" › ");
        let levels = depth + 1;
        g(Diag::new("note", "muito fundo",
                    format!("{levels} níveis de aninhamento (…{path}). Cada <code>[</code> sem <code>]</code> entra dentro do anterior — \
                             se a intenção era sequência e não escopo, feche com <code>]</code> ou separe com <code>,</code>."), "DeepNesting")
            .en("very deep", format!("{levels} levels of nesting (…{path}). Every <code>[</code> without <code>]</code> goes inside the \
                                      previous one — if you meant a sequence and not a scope, close it with <code>]</code> or separate \
                                      with <code>,</code>.")));
    }

    /* a SECTION or a BLOCK is named by a literal first */
    for id in tree.segments.iter().flat_map(|sg| tree.walk(&sg.children)).collect::<Vec<_>>() {
        let nd = n(&tree, id);
        if !has_num(NAMED_STRUCT, &js_str(&nd.canonical)) {
            continue;
        }
        let first = nd.children.iter().map(|&c| &tree.nodes[c]).find(|c| {
            c.is_literal() || c.is_canonical() || c.logic.is_some() || c.is_template() || (c.text == Some(true) && c.v.as_deref().is_some_and(|v| !v.is_empty()))
        });
        if first.is_none_or(|f| !f.is_literal()) {
            let c = esc(&lower(&nd.canonical));
            g(Diag::new("fix", "sem nome",
                        format!("<code>[{c}</code> exige um nome literal como primeiro slot. Ex.: <code>[{c}'nome',…</code>."), "MissingStructName")
                .en("no name", format!("<code>[{c}</code> needs a literal name as its first slot. E.g. <code>[{c}'name',…</code>.")));
        }
    }

    /* valency */
    if o.valency {
        for id in tree.segments.iter().flat_map(|sg| tree.walk(&sg.children)).collect::<Vec<_>>() {
            let nd = n(&tree, id);
            if !nd.is_canonical() || nd.chain_element == Some(true) || nd.slot_name == Some(true) {
                continue;
            }
            let canonical = nd.canonical.clone().unwrap_or_default();
            let tier = nd.tier.as_deref().unwrap_or("");
            if canonical == "PH" || tier == "unknown" || tier == "empty" {
                continue;
            }
            let c = esc(&canonical.to_lowercase());
            let got = tree.value_children(id).len() + usize::from(nd.colon.as_ref().is_some_and(|c| c.as_deref().is_some_and(|c| !c.is_empty())));
            /* strict positional arity comes before the frame */
            if let Some(slots) = slots_of(&canonical) {
                let (len, named): (Option<usize>, &[&str]) = match slots {
                    Slots::Own(s) => (Some(s.len()), s),
                    Slots::Unnamed(l) => (l, &[]),
                };
                for k in got..len.unwrap_or(0) {
                    let slot = esc(named.get(k).copied().unwrap_or(""));
                    let l = len.unwrap_or(0);
                    g(Diag::new("ask", "falta operando",
                                format!("<code>[{c}</code> exige {l} termos, recebeu {got}. Falta <strong>{slot}</strong>."), "MissingOperand")
                        .en("operand missing", format!("<code>[{c}</code> takes {l} terms, got {got}. Missing <strong>{slot}</strong>.")));
                }
                continue;
            }
            let Some(frame) = get(FRAMES, &canonical) else { continue };
            let want = frame.first().copied().unwrap_or("");
            if got == 0 {
                let pt = get(&derived().ptbr, &canonical).filter(|p| !p.is_empty()).map_or(String::new(), |p| format!(" ({p})"));
                let en = get(INSTR, &canonical).filter(|p| !p.is_empty()).map_or(String::new(), |p| format!(" ({p})"));
                let w = esc(&want.replacen('*', "", 1));
                g(Diag::new("ask", "sem alvo", format!("<code>[{c}</code>{pt}: <strong>{w}</strong>?"), "UnfilledSlot")
                    .en("no target", format!("<code>[{c}</code>{en}: <strong>{w}</strong>?")));
            } else if want.ends_with('*') && got == 1 {
                g(Diag::new("note", "lista de um",
                            format!("<code>[{c}</code> aceita n itens, recebeu 1. Liste com <code>,</code>."), "SingletonList")
                    .en("list of one", format!("<code>[{c}</code> takes n items, got 1. List them with <code>,</code>.")));
            }
        }
    }

    /* composition species: annotation only */
    if expansion_registry(ctx).is_some() {
        for id in tree.segments.iter().flat_map(|sg| tree.walk(&sg.children)).collect::<Vec<_>>() {
            let Some(canonical) = tree.nodes[id].canonical.clone().filter(|c| !c.is_empty()) else { continue };
            let Some(e) = entry_of(&canonical, ctx) else { continue };
            let nd = &mut tree.nodes[id];
            nd.species = e.get("species").and_then(Value::str).map(str::to_string);
            nd.composition_depth = Some(e.get("depth").and_then(Value::num));
        }
    }

    check_rules(&tree, ctx, &mut g)?;
    check_template_constraints(&tree, ctx, &mut g)?;
    collect_bindings(&mut tree, &mut g);

    /* templates: a definition with no body, an invocation of nothing known */
    let mut defined: Vec<String> = Vec::new();
    let mut invoked: Vec<String> = Vec::new();
    for id in tree.segments.iter().flat_map(|sg| tree.walk(&sg.children)).collect::<Vec<_>>() {
        let nd = &tree.nodes[id];
        let Some(name) = nd.template.clone().filter(|t| !t.is_empty()) else { continue };
        if nd.is_def == Some(true) {
            defined.push(name.to_lowercase());
            if nd.children.is_empty() {
                let t = esc(&name);
                g(Diag::new("fix", "tpl vazio", format!("<code>[--{t}=</code> sem corpo."), "EmptyTemplateDefinition")
                    .en("empty tpl", format!("<code>[--{t}=</code> has no body.")));
            }
        } else {
            invoked.push(name);
        }
    }
    let known = |k: &str| match ctx.templates.get(k) {
        Some(v) => v.truthy(),
        None => inherited(k),
    };
    for name in invoked {
        let low = name.to_lowercase();
        if defined.contains(&low) || inherited(&low) || known(&low) || known(&name) {
            continue;
        }
        let t = esc(&name);
        g(Diag::new("note", "tpl indefinido",
                    format!("<code>[--{t}</code> não definido aqui. TPL não persiste entre sessões. Redefina: <code>[--{t}=…</code>."), "UndefinedTemplate")
            .en("tpl undefined", format!("<code>[--{t}</code> is not defined here. TPL does not persist between sessions. \
                                          Redefine it: <code>[--{t}=…</code>.")));
    }

    let rank = |s: &str| ["fix", "ask", "note"].iter().position(|r| *r == s).unwrap_or(3);
    diags.sort_by_key(|d| rank(&d.sev));
    let gaps = diags.into_iter().map(|d| {
        let (lab, msg) = match (o.en, d.en_lab, d.en_msg) {
            (true, Some(l), Some(m)) => (if l.is_empty() { d.lab } else { l }, if m.is_empty() { d.msg } else { m }),
            (true, Some(l), None) => (if l.is_empty() { d.lab } else { l }, d.msg),
            (true, None, Some(m)) => (d.lab, if m.is_empty() { d.msg } else { m }),
            _ => (d.lab, d.msg),
        };
        Gap { plain: strip_tags(&msg), sev: d.sev, lab, msg, code: if d.code.is_empty() { "Note".into() } else { d.code }, at: d.at }
    }).collect();
    Ok(Parse { tree, gaps, tokens })
}
