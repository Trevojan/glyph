#!/usr/bin/env node
/**
 * seam-graph — the coupling graph the split needs and nobody had.
 *
 *   node seam-graph.js
 *
 * HGML_PLAN's D1 has been open since v1.1 and the plan for it says the cut
 * follows DEPENDENCIES, not the comment seams. The comments say where the file
 * reads as divided; they do not say where it can be divided cheaply, and the
 * difference between those two is the whole risk of the operation.
 *
 * So this measures it. For each seam: what it declares, what it uses from
 * elsewhere, and who uses what it declares. A seam that only receives is a leaf
 * and can leave first; a seam everything reaches into is the last one to move,
 * or the one that has to become shared state on purpose rather than by accident.
 *
 * Deliberately crude — a regex over declarations and identifiers, not a parser.
 * A false edge costs a careful look; a missing edge would cost a silent break,
 * so it errs toward reporting too much.
 */

"use strict";

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fs = require("fs");

const SRC = fs.readFileSync(path.join(__dirname, "glyph-parser.js"), "utf8").split("\n");

/* the seam headers, as the file itself names them */
const marks = [];
SRC.forEach((l, i) => {
  const m = l.match(/^\s{5}(\d)\.\s+(.+?)(\s+—.*)?$/);
  if (m && SRC[i - 1] && SRC[i - 1].indexOf("=====") !== -1)
    marks.push({ n: m[1], name: m[2].trim(), line: i - 1 });
});
marks.push({ n: "-", name: "CLI", line: SRC.findIndex(l => l.indexOf("/* ---------- CLI") !== -1) });

const seams = marks.map((m, i) => ({
  label: m.n + " " + m.name,
  from: m.line,
  to: (marks[i + 1] ? marks[i + 1].line : SRC.length)
})).filter(s => s.to > s.from);

/* what each seam declares at its own top level */
const DECL = /^\s{2}(?:function\s+([A-Za-z_$][\w$]*)|var\s+([A-Za-z_$][\w$]*)\s*=)/;
seams.forEach(s => {
  s.text = SRC.slice(s.from, s.to).join("\n");
  s.declares = new Set();
  SRC.slice(s.from, s.to).forEach(l => {
    const m = l.match(DECL);
    if (m) s.declares.add(m[1] || m[2]);
  });
});

/* who references whose declarations */
const owner = {};
seams.forEach(s => s.declares.forEach(d => { owner[d] = s.label; }));

seams.forEach(s => {
  s.uses = {};
  Object.keys(owner).forEach(name => {
    if (owner[name] === s.label) return;
    const re = new RegExp("\\b" + name.replace(/\$/g, "\\$") + "\\b", "g");
    const hits = (s.text.match(re) || []).length;
    if (hits) (s.uses[owner[name]] = s.uses[owner[name]] || []).push(name + "×" + hits);
  });
});

console.log("seam                          lines  declares  reaches into");
console.log("-".repeat(78));
seams.forEach(s => {
  const into = Object.keys(s.uses).sort();
  console.log("  " + s.label.padEnd(28) +
              String(s.to - s.from).padStart(5) +
              String(s.declares.size).padStart(10) + "  " +
              (into.length ? into.map(x => x.split(" ")[0]).join(" ") : "—"));
});

console.log("\nwho reaches into each seam (the cost of moving it):\n");
seams.forEach(s => {
  const callers = seams.filter(o => o.uses[s.label]);
  const names = {};
  callers.forEach(c => s.uses && (c.uses[s.label] || []).forEach(n => {
    const k = n.split("×")[0]; names[k] = (names[k] || 0) + Number(n.split("×")[1]);
  }));
  const hot = Object.keys(names).sort((a, b) => names[b] - names[a]).slice(0, 8);
  console.log("  " + s.label.padEnd(28) + callers.length + " seam(s)   " +
              (hot.length ? hot.map(h => h + "×" + names[h]).join("  ") : "nothing"));
});

console.log("\nleaves — reached into by nobody, so they can move first:");
const leaves = seams.filter(s => !seams.some(o => o.uses[s.label]));
console.log("  " + (leaves.length ? leaves.map(s => s.label).join(", ") : "none — every seam is depended on"));
