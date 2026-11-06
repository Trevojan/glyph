#!/usr/bin/env node
/**
 * seam-graph — the dependency graph of scripts/core/, and the gate that keeps
 * it a DAG.
 *
 *   node seam-graph.js            print the graph: who imports whom, who is imported
 *   node seam-graph.js --check    exit 1 on a cycle; prints nothing else on success
 *
 * Until 3.5.8.06 the core was one file and this tool measured the coupling
 * between its comment seams — the map the split followed (HGML_PLAN D1,
 * INTAKE-PARSER-SPLIT.md). The split is done; the seams are files, and the
 * coupling is now written in `import` lines rather than inferred from
 * identifiers. What remains worth measuring is the one property the split
 * promised and a reader cannot see from any single file: no module imports
 * one that imports it back. parse() hands itself to the template expander as
 * an argument for exactly that reason, and this is what refuses the day
 * somebody replaces the argument with an import.
 */

"use strict";

import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CORE = path.join(HERE, "core");
const CHECK = process.argv.indexOf("--check") !== -1;

const graph = {};
fs.readdirSync(CORE).filter(f => f.endsWith(".js")).sort().forEach(f => {
  const src = fs.readFileSync(path.join(CORE, f), "utf8");
  graph[f] = [...src.matchAll(/from\s+"\.\/([A-Za-z0-9_-]+\.js)"/g)].map(m => m[1]);
});

/* cycle detection: DFS with a grey set */
const colour = {}, cycles = [];
function visit(n, trail) {
  if (colour[n] === "grey") { cycles.push(trail.slice(trail.indexOf(n)).concat(n)); return; }
  if (colour[n] === "black") return;
  colour[n] = "grey";
  (graph[n] || []).forEach(m => visit(m, trail.concat(n)));
  colour[n] = "black";
}
Object.keys(graph).forEach(n => visit(n, []));

if (CHECK) {
  if (cycles.length) {
    console.error("seam-graph: " + cycles.length + " cycle(s) in scripts/core/");
    cycles.forEach(c => console.error("  " + c.join(" → ")));
    process.exit(1);
  }
  process.exit(0);
}

const importedBy = {};
Object.keys(graph).forEach(n => graph[n].forEach(m => { (importedBy[m] = importedBy[m] || []).push(n); }));
const lines = f => fs.readFileSync(path.join(CORE, f), "utf8").split("\n").length;

console.log("module            lines  imports                                     imported by");
console.log("-".repeat(96));
Object.keys(graph).forEach(n => {
  console.log("  " + n.replace(".js", "").padEnd(14) + String(lines(n)).padStart(6) + "  " +
    (graph[n].map(m => m.replace(".js", "")).join(" ") || "—").padEnd(42) + "  " +
    ((importedBy[n] || []).map(m => m.replace(".js", "")).join(" ") || "— (the entry only)"));
});
console.log("\n" + Object.keys(graph).length + " modules, " + cycles.length + " cycle(s)" +
  (cycles.length ? ":\n  " + cycles.map(c => c.join(" → ")).join("\n  ") : "."));
