/**
 * glyph-diff — a structural comparison of two Glyph sources, and an honest
 * account of what it can and cannot decide.
 *
 *   node glyph-diff.js "<source A>" "<source B>"
 *   node glyph-diff.js --measure            classify the divergences in the repo's own corpus
 *
 * The comparison core is the round-trip oracle turned outward: an ordered-tree
 * comparison with an exclusion set. It was built once for E4 and is used twice.
 *
 * The point of this file is NOT to decide which side is better. It cannot, and
 * the boundary is the deliverable: everything below is classified as decidable
 * or not, and the not-decidable list is written down rather than guessed at.
 *
 * The one lever that makes any of this cheap is already in the repository: the
 * composition DAG. `speciesOf`, `depthOf` and `formulaOf` over expansions.json
 * make "is A's command an ancestor of B's" a table lookup, not an inference.
 * That is what "expand domain over synthesis" means here — the generality
 * relation between commands is already written down, so it is never re-derived.
 */

"use strict";

const G = require("./glyph-parser.js");

/* Fields that record HOW a source was written rather than what it says. Same
   set the round-trip invariant excludes, and for the same reason. */
const SPELLING = { raw: 1, isAlias: 1, form: 1, autoClosed: 1, autoClosedCount: 1, at: 1, source: 1 };

function strip(o) {
  if (Array.isArray(o)) return o.map(strip);
  if (!o || typeof o !== "object") return o;
  const out = {};
  Object.keys(o).forEach(k => { if (!SPELLING[k]) out[k] = strip(o[k]); });
  return out;
}

/* Node identity for the ordered-tree comparison. Order is meaning in Glyph — a
   `,` run, segment order, text interleaving — so this is an ORDERED diff and
   not a set difference. */
function ident(n) {
  return [n.type, n.canonical || "", n.name || "", n.origin || "", n.chainElement ? "b" : ""].join("|");
}

/* Is `a` an ancestor of `b` in the composition table? This is the only place
   the comparer can decide GENERALITY, and it can decide it for vocabulary
   alone. For literals it is undecidable and says so. */
function generality(a, b, opts) {
  if (!a || !b || a === b) return null;
  const fa = G.formulaOf(a, opts), fb = G.formulaOf(b, opts);
  const atomsA = G.atomsOf(a, opts) || [], atomsB = G.atomsOf(b, opts) || [];
  if (!atomsA.length || !atomsB.length) return null;
  const has = (set, x) => set.indexOf(x) !== -1;
  const aInB = atomsA.every(x => has(atomsB, x)) && atomsA.length < atomsB.length;
  const bInA = atomsB.every(x => has(atomsA, x)) && atomsB.length < atomsA.length;
  if (aInB) return { relation: "A is more general", by: "composition", a: a, b: b, fa: fa, fb: fb };
  if (bInA) return { relation: "B is more general", by: "composition", a: a, b: b, fa: fa, fb: fb };
  return null;
}

function flatten(env) {
  const out = [];
  (function walk(list, path) {
    (list || []).forEach(n => {
      const here = path.concat([ident(n)]);
      out.push({ node: n, path: here.join("/"), depth: here.length });
      if (Array.isArray(n.body)) walk(n.body, here);
    });
  })((env.segments || []).reduce((a, s) => a.concat(s.body || []), []), []);
  return out;
}

/* Nine classes, and every one of them says what it cannot conclude. */
function diff(srcA, srcB, opts) {
  opts = opts || {};
  const A = strip(G.toAST(srcA, opts)), B = strip(G.toAST(srcB, opts));
  const fa = flatten(A), fb = flatten(B);
  const sites = [];

  /* 1 — shape: the ordered walk, paired by position */
  const n = Math.max(fa.length, fb.length);
  for (let i = 0; i < n; i++) {
    const a = fa[i], b = fb[i];
    if (!a) { sites.push({ cls: "presence", side: "B only", at: b.path }); continue; }
    if (!b) { sites.push({ cls: "presence", side: "A only", at: a.path }); continue; }
    if (a.node.type !== b.node.type) { sites.push({ cls: "shape", at: a.path, a: a.node.type, b: b.node.type }); continue; }

    /* 2 — vocabulary, and the one place generality is decidable */
    if ((a.node.canonical || null) !== (b.node.canonical || null)) {
      const g = generality(a.node.canonical, b.node.canonical, opts);
      sites.push({ cls: "vocabulary", at: a.path, a: a.node.canonical, b: b.node.canonical, generality: g });
      continue;
    }
    /* 3 — literal: decides DIFFERENT, never typo vs refinement vs contradiction */
    if ((a.node.value || null) !== (b.node.value || null)) {
      sites.push({ cls: "literal", at: a.path, a: a.node.value, b: b.node.value });
      continue;
    }
    /* 4 — ordering, as recorded by the operator that attached the node */
    if ((a.node.origin || null) !== (b.node.origin || null))
      sites.push({ cls: "ordering", at: a.path, a: a.node.origin, b: b.node.origin });
  }

  /* 5 — arity: how many operands each side gives the same command */
  const arity = (f) => f.filter(x => x.node.type === "Command")
    .map(x => (x.node.canonical || "") + ":" + ((x.node.body || []).filter(c => c.type === "Literal" || c.type === "Raw").length));
  const ar = arity(fa), br = arity(fb);
  ar.forEach((x, i) => { if (br[i] && br[i] !== x) sites.push({ cls: "arity", at: i, a: x, b: br[i] }); });

  /* 6 — the diagnostics delta, and the ONLY mechanically decidable quality
     verdict in this file. It is honest precisely because "worse" is defined by
     the engine's own gate rather than by taste. */
  const fixes = e => (e.diagnostics || []).filter(d => d.severity === "fix").map(d => d.code);
  const fA = fixes(A), fB = fixes(B);
  const verdict = (!fA.length && fB.length) ? "A is clean, B is refused"
                : (fA.length && !fB.length) ? "B is clean, A is refused" : null;

  return { sites, fixes: { A: fA, B: fB }, verdict,
           counts: sites.reduce((m, s) => { m[s.cls] = (m[s.cls] || 0) + 1; return m; }, {}) };
}

module.exports = { diff: diff, generality: generality, strip: strip };

if (require.main === module) {
  let opts = {};
  try {
    opts = { templates: require("../.guidelines/templates.json").templates,
             rules: require("../.guidelines/rules.json"),
             expansions: require("../.guidelines/expansions.json") };
  } catch (e) { /* optional */ }

  const argv = process.argv.slice(2);

  if (argv[0] === "--measure") {
    const fs = require("fs"), path = require("path");
    const sources = [];
    const ex = require("../conformance/examples.json");
    ex.cases.forEach(c => sources.push({ name: c.id, src: c.src }));
    [["flow", "../../../_ORBITAL/Docs/.guidelines/flow.pgml"],
     ["inspection", "../../../_ORBITAL/Docs/.guidelines/inspection.pgml"]].forEach(p => {
      try { sources.push({ name: p[0], src: fs.readFileSync(path.resolve(__dirname, p[1]), "utf8").trim() }); }
      catch (e) { /* the corpus outside this repo is optional */ }
    });
    try { sources.push({ name: "ORDER", src: fs.readFileSync(
      path.resolve(__dirname, "../.guidelines/ORDERS/ORD-2026-08-30-01.pgml"), "utf8").trim() }); } catch (e) {}

    const total = {}; let pairs = 0, withGenerality = 0;
    for (let i = 0; i < sources.length; i++)
      for (let j = i + 1; j < sources.length; j++) {
        const d = diff(sources[i].src, sources[j].src, opts);
        pairs++;
        Object.keys(d.counts).forEach(k => total[k] = (total[k] || 0) + d.counts[k]);
        withGenerality += d.sites.filter(s => s.generality).length;
      }

    const sum = Object.keys(total).reduce((a, k) => a + total[k], 0);
    console.log("sources: " + sources.length + " (" + sources.map(s => s.name).join(", ") + ")");
    console.log("pairs:   " + pairs + "\nsites:   " + sum + "\n");
    Object.keys(total).sort((a, b) => total[b] - total[a]).forEach(k =>
      console.log("  " + k.padEnd(12) + String(total[k]).padStart(6) +
                  "  " + (100 * total[k] / sum).toFixed(1).padStart(5) + "%"));
    console.log("\n  of the vocabulary sites, " + withGenerality +
                " have a decidable generality relation in the composition table.");
    process.exit(0);
  }

  if (argv.length < 2) { console.error('usage: node glyph-diff.js "<A>" "<B>"   |   --measure'); process.exit(2); }
  const d = diff(argv[0], argv[1], opts);
  console.log("sites: " + d.sites.length + "   " + JSON.stringify(d.counts));
  if (d.verdict) console.log("verdict (diagnostics only): " + d.verdict);
  d.sites.slice(0, 25).forEach(s => console.log("  " + s.cls.padEnd(11) +
    JSON.stringify(s.a) + " -> " + JSON.stringify(s.b) +
    (s.generality ? "   [" + s.generality.relation + "]" : "")));
}
