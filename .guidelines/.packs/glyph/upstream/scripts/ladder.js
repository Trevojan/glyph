#!/usr/bin/env node
/**
 * ladder — the Rust port's plan, checked rather than trusted.
 *
 *   node ladder.js            print the ladder: module, status, what it waits on
 *   node ladder.js --check    exit 1 on a breach; prints nothing on success
 *
 * The plan lives in .guidelines/.plan/ladder.toml. Its draft cited a validator
 * (`scripts/ladder.py`) that was never in this repository, so its one rule —
 * no module relies on a premise its ancestors have not grounded — was a claim.
 * This reads the file and refuses:
 *
 *   1. a duplicate id, or a dependency, premise or if_false that names nothing
 *   2. a cycle among the modules
 *   3. a module relying on a premise grounded neither by itself nor by an ancestor
 *   4. a status outside open · started · done
 *   5. a module marked done while one of its dependencies is not
 *
 * The file is read with the subset of TOML it is written in — tables of
 * arrays, strings and string arrays — because zero dependencies holds for the
 * JS side of this repository.
 */
"use strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, "..", ".guidelines", ".plan", "ladder.toml");
const CHECK = process.argv.indexOf("--check") !== -1;
const STATUS = ["open", "started", "done"];

/* ---- the TOML subset ---------------------------------------------------- */
function read(text) {
  const out = { module: [], premise: [] };
  let cur = null;
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].replace(/^\s+/, "");
    if (!line || line[0] === "#") continue;
    const table = /^\[\[(\w+)\]\]\s*$/.exec(line);
    if (table) { cur = {}; (out[table[1]] = out[table[1]] || []).push(cur); continue; }
    if (/^\[\w+\]\s*$/.test(line)) { cur = null; continue; }
    const kv = /^(\w+)\s*=\s*(.*)$/.exec(line);
    if (!kv || !cur) continue;
    let val = kv[2];
    if (val[0] === "[") {
      while (!/\]\s*(#.*)?$/.test(val.replace(/"(?:[^"\\]|\\.)*"/g, "")) && i + 1 < lines.length)
        val += "\n" + lines[++i];
      cur[kv[1]] = [...val.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(m => JSON.parse('"' + m[1] + '"'));
    } else {
      const s = /^"((?:[^"\\]|\\.)*)"/.exec(val);
      cur[kv[1]] = s ? JSON.parse('"' + s[1] + '"') : val.trim();
    }
  }
  return out;
}

const L = read(fs.readFileSync(FILE, "utf8"));
const errors = [];
const M = {}, P = {};
L.module.forEach(m => { if (M[m.id]) errors.push("duplicate module " + m.id); M[m.id] = m; });
L.premise.forEach(p => { if (P[p.id]) errors.push("duplicate premise " + p.id); P[p.id] = p; });

L.module.forEach(m => {
  (m.depends || []).forEach(d => { if (!M[d]) errors.push(m.id + " depends on " + d + ", which is not a module"); });
  (m.relies_on || []).forEach(p => { if (!P[p]) errors.push(m.id + " relies on " + p + ", which is not a premise"); });
  if (STATUS.indexOf(m.status) === -1) errors.push(m.id + " has status " + JSON.stringify(m.status));
});
L.premise.forEach(p => {
  if (!M[p.grounded_by]) errors.push(p.id + " is grounded by " + p.grounded_by + ", which is not a module");
  (p.if_false || []).forEach(x => { if (!M[x]) errors.push(p.id + " replans " + x + ", which is not a module"); });
});

/* cycles: DFS with a grey set, as seam-graph.js does */
const colour = {};
function visit(id, trail) {
  if (colour[id] === "grey") { errors.push("cycle: " + trail.slice(trail.indexOf(id)).concat(id).join(" → ")); return; }
  if (colour[id] === "black" || !M[id]) return;
  colour[id] = "grey";
  (M[id].depends || []).forEach(d => visit(d, trail.concat(id)));
  colour[id] = "black";
}
Object.keys(M).forEach(id => visit(id, []));

const ancestors = id => {
  const seen = new Set(), stack = [...((M[id] && M[id].depends) || [])];
  while (stack.length) { const x = stack.pop(); if (!seen.has(x) && M[x]) { seen.add(x); stack.push(...(M[x].depends || [])); } }
  return seen;
};
L.module.forEach(m => {
  const anc = ancestors(m.id);
  (m.relies_on || []).forEach(p => {
    const g = P[p] && P[p].grounded_by;
    if (g && g !== m.id && !anc.has(g))
      errors.push(m.id + " relies on " + p + ", grounded by " + g + ", which is not an ancestor");
  });
  if (m.status === "done")
    (m.depends || []).forEach(d => { if (M[d] && M[d].status !== "done")
      errors.push(m.id + " is done but " + d + " is " + M[d].status); });
});

if (CHECK) {
  if (errors.length) {
    console.error("ladder: " + errors.length + " breach(es) in .guidelines/.plan/ladder.toml");
    errors.forEach(e => console.error("  " + e));
    process.exit(1);
  }
  process.exit(0);
}

const count = s => L.module.filter(m => m.status === s).length;
L.module.forEach(m => {
  const waiting = (m.depends || []).filter(d => M[d] && M[d].status !== "done");
  const ahead = m.status !== "open" && waiting.length ? "  (started ahead of " + waiting.join(", ") + ")" : "";
  console.log("  " + (m.id + "      ").slice(0, 6) + (m.status + "        ").slice(0, 9) + m.title + ahead);
});
console.log("\n" + L.module.length + " modules — " + count("done") + " done, " + count("started") +
            " started, " + count("open") + " open; " + L.premise.length + " premises; " +
            errors.length + " breach(es)" + (errors.length ? ":\n  " + errors.join("\n  ") : "."));
