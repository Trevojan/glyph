#!/usr/bin/env node
/**
 * dag.js — reports the composition layers of the Glyph vocabulary.
 *
 *   node dag.js [expansoes.txt]
 *
 * Reading the format is `read-expansoes.js`'s job; this file only reports.
 * Through v1.1.0.0 the two were the same file, which meant the format was
 * about to be understood in two places at once — see the header there.
 *
 * Exits non-zero when the table does not close: an undefined dependency or a
 * cycle means no `.hgml` emitter can decompose reliably, so this is a build
 * gate, not just a printout.
 */

"use strict";

const fs = require("fs");
const X = require("./read-expansoes.js");

const file = process.argv[2] || "expansoes.txt";
const { parsed, analysis } = X.build(fs.readFileSync(file, "utf8"));

parsed.malformed.forEach(m =>
  console.error("linha " + m.line + " ignorada (formato): " + m.text));

/* Nivel 0 e atomo; todo nivel acima e composto, e o numero e a profundidade.
   Os rotulos antigos chamavam o nivel 1 de "primitivo", o que contradiz a
   taxonomia do GLOSSARIO: ALT, VRFY e RMBR estao no nivel 1 e sao compostos. */
const NAMES = { 0: "hieroglifo" };
const byDepth = {};
Object.keys(analysis.depth).sort()
  .forEach(c => { (byDepth[analysis.depth[c]] = byDepth[analysis.depth[c]] || []).push(c); });

console.log("=== CAMADAS (por ordenacao topologica) ===");
Object.keys(byDepth).map(Number).sort((a, b) => a - b).forEach(k => {
  console.log("\nnivel " + k + "  [" + (NAMES[k] || ("composto-" + k)) + "]  (" + byDepth[k].length + ")");
  console.log("  " + byDepth[k].join(" "));
});

if (analysis.undefinedDeps.length) {
  console.log("\n=== DEPENDENCIAS NUNCA DEFINIDAS (" + analysis.undefinedDeps.length + ") ===");
  console.log("  " + analysis.undefinedDeps.join(" "));
  console.log("  -> ou sao hieroglifos (declare '= BASE') ou faltam expansoes.");
}
if (analysis.cycles.length) {
  console.log("\n=== CICLOS (" + analysis.cycles.length + ") — camada indefinivel ===");
  analysis.cycles.forEach(c => console.log("  " + c.join(" -> ")));
  console.log("  -> quebre cada ciclo promovendo um dos membros a '= BASE'.");
}
if (analysis.unlayered.length) {
  console.log("\n=== SEM CAMADA ATRIBUIVEL (" + analysis.unlayered.length + ") ===");
  console.log("  " + analysis.unlayered.join(" "));
}

console.log("\nresumo: " + Object.keys(analysis.depth).length + " com camada, " +
  analysis.undefinedDeps.length + " indefinidos, " + analysis.cycles.length + " ciclos.");

process.exit(analysis.undefinedDeps.length || analysis.cycles.length ? 1 : 0);
