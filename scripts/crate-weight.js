#!/usr/bin/env node
/**
 * crate-weight — the ruler every external crate is held to (EMS-002 ORD-0012).
 *
 *   node crate-weight.js                 print every external crate, its tree and its grade
 *   node crate-weight.js --check         exit 1 on a breach; prints nothing on success
 *   node crate-weight.js --tree NAME F   grade the recorded `cargo tree` of NAME in file F
 *
 * The norm is the Regent's, in `.guidelines/.constraints/` (O7, 2026-09-27):
 *
 *   note   depth up to 4 and up to 12 crates — enters, vendored
 *   ask    depth 5 to 6, or 13 to 40 crates  — enters only with an ADR the Regent signed
 *   fix    depth 7 or more, or more than 40  — refused
 *
 * A tree is measured as INTAKE-RUST-LADDER.md §9 measures it: `cargo tree -e
 * normal,build`, depth 1 the crate itself, crates the distinct packages. An
 * ADR the Regent signed is a row of `.guidelines/.decisions/README.md` whose
 * decision names the crate between backticks and says ADR; this reads it and
 * never writes one. `crate-graph.js` refuses an external crate that is not
 * vendored; this says how deep the one that is goes. It needs cargo, so it
 * runs in `npm run check:rust`.
 */
"use strict";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CRATES = path.join(ROOT, "rust", "crates");
const DECISIONS = path.join(ROOT, ".guidelines", ".decisions", "README.md");
const argv = process.argv.slice(2);
const CHECK = argv.includes("--check");

/* the tree `cargo tree --prefix depth` prints: a depth, a name, a version */
export function measure(text) {
  const seen = new Set();
  let deepest = -1;
  for (const line of text.split(/\r?\n/)) {
    const m = /^(\d+)(\S+) (v\S+)/.exec(line);
    if (!m) continue;
    deepest = Math.max(deepest, Number(m[1]));
    seen.add(m[2] + " " + m[3]);
  }
  return { crates: seen.size, depth: deepest + 1 };
}

export function grade({ crates, depth }) {
  if (depth >= 7 || crates > 40) return "fix";
  if (depth >= 5 || crates > 12) return "ask";
  return "note";
}

/* the external crates the workspace names, in [dependencies] and
   [build-dependencies], read as crate-graph.js reads them */
function externals() {
  const out = new Set();
  if (!fs.existsSync(CRATES)) return [];
  for (const d of fs.readdirSync(CRATES)) {
    const toml = path.join(CRATES, d, "Cargo.toml");
    if (!fs.existsSync(toml)) continue;
    const text = fs.readFileSync(toml, "utf8");
    for (const head of ["dependencies", "build-dependencies"]) {
      const body = (text.split(new RegExp("^\\s*\\[" + head + "\\]\\s*$", "m"))[1] || "").split(/^\s*\[/m)[0];
      for (const line of body.split(/\r?\n/)) {
        const m = /^\s*([A-Za-z0-9_-]+)\s*=/.exec(line);
        if (m && !/path\s*=/.test(line)) out.add(m[1]);
      }
    }
  }
  return [...out].sort();
}

function signed(name) {
  const rows = fs.existsSync(DECISIONS) ? fs.readFileSync(DECISIONS, "utf8").split(/\r?\n/) : [];
  return rows.some(r => r.startsWith("|") && (r.split("|")[1] || "").includes("`" + name + "`") && /\bADR\b/.test(r.split("|")[1]));
}

function judge(name, tree) {
  const m = measure(tree), g = grade(m);
  const breach = g === "fix" ? name + ": " + m.crates + " crates, depth " + m.depth + " — fix, refused"
    : g === "ask" && !signed(name) ? name + ": " + m.crates + " crates, depth " + m.depth + " — ask, and no ADR the Regent signed names it"
    : null;
  return { name, ...m, grade: g, breach };
}

let judged;
const at = argv.indexOf("--tree");
if (at !== -1) {
  judged = [judge(argv[at + 1], fs.readFileSync(argv[at + 2], "utf8"))];
} else {
  judged = externals().map(name => judge(name, execFileSync("cargo",
    ["tree", "--manifest-path", path.join(ROOT, "rust", "Cargo.toml"), "-e", "normal,build", "--prefix", "depth", "-p", name],
    { encoding: "utf8" })));
}

const breaches = judged.filter(j => j.breach).map(j => j.breach);
if (CHECK) {
  if (breaches.length) {
    console.error("crate-weight: " + breaches.length + " breach(es)");
    breaches.forEach(b => console.error("  " + b));
    process.exit(1);
  }
  process.exit(0);
}
judged.forEach(j => console.log("  " + j.name.padEnd(24) + String(j.crates).padStart(4) + " crates  depth " + j.depth + "  " + j.grade));
console.log(judged.length + " external crate(s), " + breaches.length + " breach(es)" + (breaches.length ? ":\n  " + breaches.join("\n  ") : "."));
