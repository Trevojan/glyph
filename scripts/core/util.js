/**
 * core/util.js — the layer no banner ever named.
 *
 * `esc` is reached 91 times from every seam of the parser, `xesc` 33, `pad` 7,
 * `lev` from two; none of them is vocabulary, none is a stage of the pipeline.
 * They are what every stage stands on, and the seam graph (seam-graph.js)
 * counted them under VOCABULARY only because that is where the file kept
 * them. Moving them first removes 130 cross-seam reaches at once, which is
 * why the split (`.guidelines/.orders/INTAKE-PARSER-SPLIT.md` §4) begins
 * here. Imports nothing; is imported by everything.
 */

/* Long-block limits (v1.0.9.1).
   In Glyph every `[` without a `]` nests INSIDE the previous one, so a long
   query doesn't grow wide: it grows deep. That had three consequences, all
   fixed here — indentation grew with the square of depth (2 KB of input
   became 500 KB of XML), the recursive emitters overflowed the call stack,
   and the user got no warning at all that 40 commands had turned into 40
   levels of nested scope. */
export var LIMITS = {
  indent: 12,      // visual indent ceiling; past this the XML stops growing
  nesting: 10,     // past this depth, warn that the nesting is probably unintentional
  autoClose: 8,    // `;` closing more than this at once deserves a warning
  astDepth: 200    // AST ceiling: V8's JSON.stringify is recursive and overflows
};

export function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
export var xesc = esc;

export function pad(d) { return new Array(Math.min(d, LIMITS.indent) + 1).join("  "); }

export function lev(a, b) {
  var m = a.length, q = b.length;
  if (!m) return q; if (!q) return m;
  var prev = [], cur = [], i, j;
  for (j = 0; j <= q; j++) prev[j] = j;
  for (i = 1; i <= m; i++) {
    cur[0] = i;
    for (j = 1; j <= q; j++)
      cur[j] = Math.min(prev[j]+1, cur[j-1]+1, prev[j-1] + (a[i-1] === b[j-1] ? 0 : 1));
    var t = prev; prev = cur; cur = t;
  }
  return prev[q];
}

export function hgmlLit(v) {
  /* `'` closes a literal, `]` and a newline end one. Nothing survives them
     intact, so they are folded rather than escaped — .hgml carries the
     human's words to the engine, not their punctuation. */
  return String(v == null ? "" : v)
    .replace(/'/g, "’").replace(/]/g, ")").replace(/\s+/g, " ").trim();
}

/* Tree helpers. `walk` is what every pass over the tree is built on — the
   parser, the rules, the emitters — and it depends on nothing, so it lives
   with the rest of the floor. */
/* children that count as a filled slot */
export function valueChildren(nd) {
  return (nd.children || []).filter(function (ch) {
    return ch.canonical || ch.literal || ch.logic || ch.template || (ch.text && ch.v) || ch.mode;
  });
}


/* Iterative on purpose: in a long block the tree is deep, and the
   recursive version overflowed the stack right along with the emitters. */
export function walk(list, fn) {
  var stack = [], i;
  for (i = (list || []).length - 1; i >= 0; i--) stack.push(list[i]);
  while (stack.length) {
    var nd = stack.pop();
    fn(nd);
    var kids = nd.children;
    if (kids && kids.length) for (i = kids.length - 1; i >= 0; i--) stack.push(kids[i]);
  }
}

export function stripTags(s) {
  return String(s == null ? "" : s)
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&amp;/g, "&")
    .replace(/\s+/g, " ").trim();
}

/* What an Order declares, read off the content of its XML (EMS-002 ORD-0036,
   the Regent's X1 a and X2 c of 2026-11-21): a named section, block and part,
   a template, a name a command binds, a named logic block and each variable
   it lets. The schema the engine writes is this list, so it is a function of
   the content, and the validator reads the content the same way: what the
   two disagree on is an XML that did not come from the engine. Attribute
   values are kept as the XML writes them, escaped, so nothing is decoded
   and written back differently. A section, a block and a part bind their own
   name, which their entry already says. */
export function declarationsOf(xml) {
  var out = [], re = /<([a-z][\w-]*)((?:\s+[\w:-]+="[^"]*")*)\s*\/?>/g, m;
  while ((m = re.exec(String(xml == null ? "" : xml)))) {
    var tag = m[1], at = {}, a, ra = /([\w:-]+)="([^"]*)"/g;
    while ((a = ra.exec(m[2]))) at[a[1]] = a[2];
    var framed = tag === "section" || tag === "block" || tag === "part";
    if (framed && at.name !== undefined) out.push({ kind: tag, name: at.name });
    else if (tag === "template" && at.name !== undefined)
      out.push(at.define === "true" ? { kind: "template", name: at.name, define: true } : { kind: "template", name: at.name });
    else if (tag === "logic" && at.name !== undefined) out.push({ kind: "logic", name: at.name });
    else if (tag === "rule" && at.kind === "let" && at.var !== undefined) out.push({ kind: "variable", name: at.var });
    if (at.binds !== undefined && !framed) out.push({ kind: "binding", name: at.binds, on: tag });
  }
  return out;
}

/* one declaration as the schema writes it */
export function declaresLine(d) {
  return '<declares kind="' + d.kind + '" name="' + d.name + '"' + (d.on ? ' on="' + d.on + '"' : "") +
         (d.define ? ' define="true"' : "") + "/>";
}
