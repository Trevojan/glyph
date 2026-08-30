#!/usr/bin/env node
/**
 * glyph-cli — the command line, out of the core.
 *
 *   node glyph-cli.js "<source>" [--xml|--ast|--diag|--hgml|--expand|--from-xml]
 *
 * It left glyph-parser.js because it was the one part of that file that touches
 * the filesystem, and because the seam graph says it is the only piece nothing
 * else depends on. Everything else in the core is reached into by at least one
 * other seam, so this is where a split can start without a dependency analysis
 * being wrong somewhere.
 *
 * `glyph-parser.js` still answers to its documented invocation and delegates
 * here, so nothing anyone has written down stops working.
 */

"use strict";

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import G from "./glyph-parser.js";
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function main() {
  // optional stores: if absent, the engine still runs, just without expansion/contradiction checks
  [["../.guidelines/templates.json", G.useTemplates],
   ["../.guidelines/rules.json", G.useRules],
   ["../.guidelines/expansions.json", G.useExpansions]].forEach(function (pair) {
    try {
      pair[1](require(require("path").resolve(__dirname, pair[0])));
    } catch (e) { /* missing store is a valid situation */ }
  });
  var argv = process.argv.slice(2);
  var mode = "xml";
  var src = [];
  argv.forEach(function (a) {
    if (a === "--ast" || a === "--xml" || a === "--diag" ||
        a === "--expand" || a === "--hgml" || a === "--from-xml") mode = a.slice(2);
    else src.push(a);
  });
  var input = src.join(" ");
  if (!input) {
    console.error("uso: node scripts/glyph-parser.js \"[crit[ctx]]\" [--xml|--ast|--diag|--hgml]");
    console.error("     node scripts/glyph-parser.js \"<glyph>…</glyph>\" --from-xml");
    console.error("     node scripts/glyph-parser.js CRIT --expand");
    process.exit(2);
  }
  if (mode === "hgml") console.log(G.toHGML(input));
  else if (mode === "from-xml") {
    /* the inverse, for checking by hand what the XML panel does on apply */
    var back = G.fromXML(input);
    console.log(back.src);
    back.diag.forEach(function (d) {
      /* the messages carry <code> for the panel; the terminal wants them bare */
      console.error("[" + d.sev + "] " + d.code + " — " + String(d.msg).replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"));
    });
  }
  else if (mode === "expand") {
    /* --expand takes a COMMAND NAME, not Glyph source: it answers "what is
       this made of", which is the question the .hgml emitter will ask. */
    var nm = input.replace(/[\[\]']/g, "").trim().toUpperCase();
    var sp = G.speciesOf(nm);
    if (!sp) {
      console.error(nm + ": fora da tabela de composição (ou store não carregado).");
      process.exit(2);
    }
    console.log(nm + "  [" + sp + "]  nível " + G.depthOf(nm));
    if (sp === "composite") {
      console.log("  fórmula: " + G.formulaOf(nm));
      var at = G.atomsOf(nm);
      console.log("  " + at.length + " hieróglifos: " + at.join(" "));
    } else {
      console.log("  hieróglifo — não decompõe.");
    }
  }
  else if (mode === "ast") console.log(JSON.stringify(G.toAST(input), null, 2));
  else if (mode === "diag") {
    var gaps = G.parse(input).gaps;
    if (!gaps.length) console.log("sem diagnósticos.");
    gaps.forEach(function (g) { console.log("[" + g.sev + "] " + g.code + " — " + g.plain); });
  } else console.log(G.toXML(input));

}

/* "was this run, or imported?" — the ESM answer to `require.main === module`.
   The Windows path needs both a separator swap and a leading slash before the
   drive letter, or the comparison never matches on this machine. */
if (process.argv[1] && import.meta.url ===
    "file://" + process.argv[1].replace(/\\/g, "/").replace(/^([A-Za-z]:)/, "/$1")) main();
