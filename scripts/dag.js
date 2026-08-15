#!/usr/bin/env node
/**
 * dag.js — reports the composition layers of the Glyph vocabulary.
 *
 *   node dag.js [expansions.txt]
 *
 * Reading the format is `read-expansions.js`'s job; this file only reports.
 * Through v1.1.0.0 the two were the same file, which meant the format was
 * about to be understood in two places at once — see the header there.
 *
 * Exits non-zero when the table does not close: an undefined dependency or a
 * cycle means no `.hgml` emitter can decompose reliably, so this is a build
 * gate, not just a printout.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const X = require("./read-expansions.js");

/* Default resolves against the repository root, not the caller's cwd: the
   table is data and lives one level up from the scripts. */
const file = process.argv[2] || path.join(__dirname, "..", "expansions.txt");
const { parsed, analysis } = X.build(fs.readFileSync(file, "utf8"));

parsed.malformed.forEach(m =>
  console.error("line " + m.line + " skipped (bad format): " + m.text));

/* Level 0 is the atom; every level above is a composite, the number is its depth.
   The old labels called level 1 "primitive", which contradicts the glossary
   taxonomy: ALT, VRFY and RMBR sit at level 1 and are composites. */
const NAMES = { 0: "hieroglyph" };
const byDepth = {};
Object.keys(analysis.depth).sort()
  .forEach(c => { (byDepth[analysis.depth[c]] = byDepth[analysis.depth[c]] || []).push(c); });

console.log("=== LAYERS (topological order) ===");
Object.keys(byDepth).map(Number).sort((a, b) => a - b).forEach(k => {
  console.log("\nlevel " + k + "  [" + (NAMES[k] || ("composite-" + k)) + "]  (" + byDepth[k].length + ")");
  console.log("  " + byDepth[k].join(" "));
});

if (analysis.undefinedDeps.length) {
  console.log("\n=== DEPENDENCIAS NUNCA DEFINIDAS (" + analysis.undefinedDeps.length + ") ===");
  console.log("  " + analysis.undefinedDeps.join(" "));
  console.log("  -> either they are hieroglyphs (declare '= BASE') or expansions are missing.");
}
if (analysis.cycles.length) {
  console.log("\n=== CICLOS (" + analysis.cycles.length + ") — layer undefinable ===");
  analysis.cycles.forEach(c => console.log("  " + c.join(" -> ")));
  console.log("  -> break each cycle by promoting one member to '= BASE'.");
}
if (analysis.unlayered.length) {
  console.log("\n=== SEM CAMADA ATRIBUIVEL (" + analysis.unlayered.length + ") ===");
  console.log("  " + analysis.unlayered.join(" "));
}

console.log("\nsummary: " + Object.keys(analysis.depth).length + " layered, " +
  analysis.undefinedDeps.length + " undefined, " + analysis.cycles.length + " cycles.");

process.exit(analysis.undefinedDeps.length || analysis.cycles.length ? 1 : 0);
