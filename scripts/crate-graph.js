#!/usr/bin/env node
/**
 * crate-graph — the Rust workspace held to the JS core's measured seams.
 *
 *   node crate-graph.js            print every crate, its oracle, and its arrows
 *   node crate-graph.js --check    exit 1 on any breach; prints nothing on success
 *
 * The port goes one module per step, each step checked against the JS module it
 * replaces (INTAKE-RUST-LADDER.md §7). That only works while the crates keep the
 * shape of the modules they port, so the arrow is not a layer diagram drawn for
 * the occasion: a core crate may depend on exactly the crates whose oracles its
 * own oracle imports. seam-graph.js measures the JS side; this reads the
 * `import` lines again rather than trusting a copy of them.
 *
 * Read from the Cargo.toml files as text, so the check needs Node and not a
 * Rust toolchain — `npm run check` stays runnable on a machine without cargo.
 *
 *   1. every JS core module has one crate, and every crate has a known oracle
 *   2. a core crate depends only on the crates its oracle's imports map to
 *   3. no core crate depends on a tool crate (the arrow points inward)
 *   4. a tool crate depends only on core crates and on the tools it lists
 *   5. every external crate is vendored in rust/vendor/ — the Regent's norm of
 *      2026-09-24: the base that is not worth reinventing enters vendored
 *
 * How deep a tree may be is measured (INTAKE-RUST-LADDER.md §9) and not
 * refused here: the threshold is the Regent's, and a gate is not where a norm
 * gets written.
 */
"use strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CORE_DIR = path.join(HERE, "core");
const CRATES = path.join(HERE, "..", "rust", "crates");
const VENDOR = path.join(HERE, "..", "rust", "vendor");
const CHECK = process.argv.indexOf("--check") !== -1;

/* one crate per JS core module — the oracle map */
const CORE = {
  "util.js": "glyph-util",
  "vocabulary.js": "glyph-vocab",
  "version.js": "glyph-version",
  "stores.js": "glyph-stores",
  "lexer.js": "glyph-lex",
  "logic.js": "glyph-logic",
  "templates.js": "glyph-templates",
  "rules.js": "glyph-rules",
  "parser.js": "glyph-parse",
  "emit-xml.js": "glyph-xml",
  "emit-ast.js": "glyph-envelope",
  "burn.js": "glyph-burn",
  "inverse.js": "glyph-inverse"
};

/* the tools: their JS files reach the core through glyph-parser.js, so any
   core crate is allowed; another tool only when listed here */
const TOOLS = {
  "glyph-schema": { oracle: "scripts/glyph-check.js", tools: [] },
  "glyph-diff":   { oracle: "scripts/glyph-diff.js",  tools: [] },
  "glyph-trace":  { oracle: "scripts/glyph-trace.js", tools: [] },
  "glyph-bundle": { oracle: "scripts/glyph-zip.js + glyph-cli.js --bundle", tools: [] },
  "glyph-cli":    { oracle: "scripts/glyph-cli.js",
                    tools: ["glyph-schema", "glyph-diff", "glyph-trace", "glyph-bundle"] },
  "glyph-wasm":   { oracle: "glyph-engine-alias.html + glyph-ui.js, on the corpus",
                    tools: ["glyph-trace", "glyph-bundle"] },
  "glyph-lsp":    { oracle: "— (new capability; M12–M15)", tools: ["glyph-trace"] }
};

const errors = [];

/* the JS side, measured now */
const jsImports = {};
fs.readdirSync(CORE_DIR).filter(f => f.endsWith(".js")).sort().forEach(f => {
  const src = fs.readFileSync(path.join(CORE_DIR, f), "utf8");
  jsImports[f] = [...src.matchAll(/from\s+"\.\/([A-Za-z0-9_-]+\.js)"/g)].map(m => m[1]);
});
Object.keys(jsImports).forEach(f => {
  if (!CORE[f]) errors.push("core/" + f + " has no crate in the oracle map");
});

/* the Rust side, read as text */
const crates = {};
const present = fs.existsSync(CRATES) ? fs.readdirSync(CRATES).filter(d =>
  fs.existsSync(path.join(CRATES, d, "Cargo.toml"))) : [];
present.forEach(d => {
  const toml = fs.readFileSync(path.join(CRATES, d, "Cargo.toml"), "utf8");
  const name = (toml.match(/^\s*name\s*=\s*"([^"]+)"/m) || [])[1] || d;
  /* [dependencies] only: a dev-dependency may reach anywhere a test needs */
  const deps = (toml.split(/^\s*\[dependencies\]\s*$/m)[1] || "").split(/^\s*\[/m)[0];
  const local = [], external = [];
  deps.split(/\r?\n/).forEach(line => {
    const m = /^\s*([A-Za-z0-9_-]+)\s*=/.exec(line);
    if (!m) return;
    (/path\s*=/.test(line) ? local : external).push(m[1]);
  });
  crates[name] = { dir: d, local, external };
});

const coreCrates = Object.values(CORE);
const oracleOf = {};
Object.keys(CORE).forEach(f => { oracleOf[CORE[f]] = f; });

coreCrates.forEach(c => { if (!crates[c]) errors.push("missing crate " + c + " (oracle core/" + oracleOf[c] + ")"); });
Object.keys(TOOLS).forEach(c => { if (!crates[c]) errors.push("missing crate " + c + " (oracle " + TOOLS[c].oracle + ")"); });
Object.keys(crates).forEach(c => {
  if (!oracleOf[c] && !TOOLS[c]) errors.push("crate " + c + " has no oracle — add it to the map in crate-graph.js");
});

Object.keys(crates).forEach(c => {
  const deps = crates[c].local;
  if (oracleOf[c]) {
    const allowed = (jsImports[oracleOf[c]] || []).map(f => CORE[f]);
    deps.forEach(d => {
      if (TOOLS[d]) errors.push(c + " → " + d + ": a core crate depends on a tool (the arrow points inward)");
      else if (allowed.indexOf(d) === -1)
        errors.push(c + " → " + d + ": core/" + oracleOf[c] + " does not import " + (oracleOf[d] ? "core/" + oracleOf[d] : d));
    });
  } else if (TOOLS[c]) {
    deps.forEach(d => {
      if (!oracleOf[d] && TOOLS[c].tools.indexOf(d) === -1)
        errors.push(c + " → " + d + ": not a core crate and not among the tools " + c + " lists");
    });
  }
});

Object.keys(crates).forEach(c => crates[c].external.forEach(x => {
  if (!fs.existsSync(path.join(VENDOR, x)))
    errors.push(c + " → " + x + ": external and not in rust/vendor/ — adopt through cargo vendor");
}));

if (CHECK) {
  if (errors.length) {
    console.error("crate-graph: " + errors.length + " breach(es) in rust/crates/");
    errors.forEach(e => console.error("  " + e));
    process.exit(1);
  }
  process.exit(0);
}

const pad = (s, n) => { s = String(s); return s.length >= n ? s.slice(0, n - 2) + "… " : s + " ".repeat(n - s.length); };
console.log(pad("crate", 19) + pad("oracle", 32) + "depends on");
console.log("-".repeat(96));
Object.keys(crates).sort().forEach(c => {
  const o = oracleOf[c] ? "core/" + oracleOf[c] : (TOOLS[c] ? TOOLS[c].oracle : "?");
  const ext = crates[c].external.length ? "  + external: " + crates[c].external.join(", ") : "";
  console.log("  " + pad(c, 17) + pad(o, 32) + (crates[c].local.join(" ") || "—") + ext);
});
console.log("\n" + Object.keys(crates).length + " crates, " + errors.length + " breach(es)" +
            (errors.length ? ":\n  " + errors.join("\n  ") : "."));
