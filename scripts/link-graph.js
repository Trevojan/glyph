#!/usr/bin/env node
/**
 * link-graph — the documents of the guidelines, held together by their links.
 *
 *   node link-graph.js            print the graph: documents, edges, depth from .shortcuts
 *   node link-graph.js --check    exit 1 on a breach; prints nothing on success
 *
 * The index points and never copies, so a document nobody links to is a
 * document nobody finds, and a link that resolves to nothing is a pointer into
 * the dark. This reads every Markdown document of `.guidelines/` (the attic,
 * `.history/`, aside), `README.md` and `CLAUDE.md`, and refuses:
 *
 *   1. an internal link whose file or folder does not exist
 *   2. a document of `.guidelines/` farther than two links from
 *      `.guidelines/.shortcuts/README.md`, the entry point
 *
 * A link to a folder reaches the folder's `README.md`. Links out of the
 * repository (`http:`, `https:`, `mailto:`) and anchors are not followed; the
 * anchor is cut and the file it names must exist. Decided by the Regent on
 * 2026-09-27 (`.guidelines/.decisions/`).
 */
"use strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.indexOf("--check") !== -1;
const ENTRY = ".guidelines/.shortcuts/README.md";
const DEPTH = 2;

const rel = p => path.relative(ROOT, p).split(path.sep).join("/");
const docs = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== ".history") walk(p); }
    else if (e.name.endsWith(".md")) docs.push(rel(p));
  }
})(path.join(ROOT, ".guidelines"));
docs.push("README.md", "CLAUDE.md");

const LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const errors = [], edges = {};
for (const d of docs) {
  const text = fs.readFileSync(path.join(ROOT, d), "utf8").replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, m => m.includes("](") ? "" : m);
  edges[d] = [];
  for (const m of text.matchAll(LINK)) {
    let target = m[1];
    if (/^[a-z]+:/i.test(target) || target.startsWith("#")) continue;
    target = decodeURIComponent(target.split("#")[0]);
    if (!target) continue;
    const abs = path.resolve(path.dirname(path.join(ROOT, d)), target);
    if (!fs.existsSync(abs)) { errors.push(d + " → " + m[1] + ": resolves to nothing"); continue; }
    const hit = fs.statSync(abs).isDirectory() ? path.join(abs, "README.md") : abs;
    if (fs.existsSync(hit) && hit.endsWith(".md")) edges[d].push(rel(hit));
  }
}

/* breadth-first from the entry point */
const depth = { [ENTRY]: 0 }, queue = [ENTRY];
while (queue.length) {
  const d = queue.shift();
  for (const n of edges[d] || []) if (!(n in depth)) { depth[n] = depth[d] + 1; queue.push(n); }
}
for (const d of docs) {
  if (!d.startsWith(".guidelines/")) continue;
  if (!(d in depth)) errors.push(d + ": no path from " + ENTRY);
  else if (depth[d] > DEPTH) errors.push(d + ": " + depth[d] + " links from " + ENTRY + ", more than " + DEPTH);
}

if (CHECK) {
  if (errors.length) {
    console.error("link-graph: " + errors.length + " breach(es)");
    errors.forEach(e => console.error("  " + e));
    process.exit(1);
  }
  process.exit(0);
}
const nEdges = Object.values(edges).reduce((s, e) => s + e.length, 0);
docs.slice().sort((a, b) => (depth[a] ?? 99) - (depth[b] ?? 99) || a.localeCompare(b))
  .forEach(d => console.log("  " + String(d in depth ? depth[d] : "—").padStart(2) + "  " + d));
console.log("\n" + docs.length + " documents, " + nEdges + " edges, " + errors.length + " breach(es)" +
            (errors.length ? ":\n  " + errors.join("\n  ") : "."));
