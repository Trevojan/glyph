/**
 * glyph-trace — the substrate a trace is built on, and nothing above it.
 *
 *   node glyph-trace.js "[crit'the parser'][ctx'api/orders.py']"
 *   node glyph-trace.js "<source>" --at 12
 *
 * The question this answers is the plain one: **which part of the output came
 * from which part of what you typed.** Every use people mean by "tracing" sits
 * on that and differs only in what it stacks on top —
 *
 *   debugging     the output went wrong; which construct caused it
 *   attribution   this block of the prompt cost that much
 *   obedience     the model answered THIS instruction, not that one
 *
 * — so the map is built now and the format is not, which is the right order:
 * there is no point choosing how to present something that does not exist.
 *
 * It reads the `full` AST, where `at` is a span into the source. Nothing here
 * is inferred; every position was computed by the lexer and carried by the
 * node. The engine has always known this and had no way to say it.
 */

"use strict";

const G = require("./glyph-parser.js");

/* Given a source, an index in both directions.
 *
 *   byOffset(i)   the innermost command covering character i, or null
 *   spans()       every node with its span, in source order
 *
 * Innermost wins because that is what a reader means: in `[crit[ctx'x']]` the
 * character under `x` belongs to CTX, and saying CRIT would be true and
 * useless. */
function trace(src, opts) {
  const env = G.toAST(src, opts || {});
  const spans = [];

  (function walk(list, path) {
    (list || []).forEach((n, i) => {
      const here = path.concat([n.canonical || n.type]);
      if (n.at && typeof n.at.s === "number")
        spans.push({
          path: here.join(" > "),
          type: n.type,
          canonical: n.canonical || null,
          element: n.element || null,
          s: n.at.s, e: n.at.e,
          text: src.slice(n.at.s, n.at.e),
          depth: here.length - 1
        });
      if (Array.isArray(n.body)) walk(n.body, here);
    });
  })((env.segments || []).reduce((a, s) => a.concat(s.body || []), []), []);

  return {
    env: env,
    spans: spans,
    byOffset: function (i) {
      let best = null;
      spans.forEach(sp => {
        if (i >= sp.s && i < sp.e && (!best || sp.depth > best.depth)) best = sp;
      });
      return best;
    },
    /* every diagnostic that carries a coordinate, with the text it points at —
       which is the whole reason `at` exists on a diagnostic: a refusal a reader
       cannot locate is a refusal they cannot act on */
    diagnostics: (env.diagnostics || []).map(d => Object.assign({}, d, {
      text: d.at ? src.slice(d.at.s, d.at.e) : null
    }))
  };
}

module.exports = { trace: trace };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const src = argv[0];
  if (!src) { console.error('usage: node glyph-trace.js "<glyph source>" [--at N]'); process.exit(2); }

  let opts = {};
  try {
    opts = {
      templates: require("../.guidelines/templates.json").templates,
      rules: require("../.guidelines/rules.json"),
      expansions: require("../.guidelines/expansions.json")
    };
  } catch (e) { /* stores are optional */ }

  const t = trace(src, opts);
  const ix = argv.indexOf("--at");

  if (ix !== -1) {
    const i = parseInt(argv[ix + 1], 10);
    const hit = t.byOffset(i);
    console.log("source : " + JSON.stringify(src));
    console.log("         " + " ".repeat(i + 1) + "^ offset " + i);
    console.log(hit ? "under  : " + hit.path + "   <" + hit.element + ">   " + JSON.stringify(hit.text)
                    : "under  : nothing — that offset is between nodes");
    process.exit(0);
  }

  console.log("source: " + JSON.stringify(src) + "\n");
  const w = Math.max.apply(null, t.spans.map(s => s.path.length));
  t.spans.forEach(s => {
    console.log("  " + String(s.s).padStart(3) + "–" + String(s.e).padEnd(4) +
                s.path.padEnd(w + 2) +
                (s.element ? "<" + s.element + ">" : "").padEnd(16) +
                JSON.stringify(s.text));
  });
  if (t.diagnostics.length) {
    console.log("\n  diagnostics:");
    t.diagnostics.forEach(d => console.log("  " + (d.at ? String(d.at.s) + "–" + d.at.e : "  —  ") +
      "  [" + d.severity + "] " + d.code + (d.text !== null ? "  " + JSON.stringify(d.text) : "")));
  }
}
