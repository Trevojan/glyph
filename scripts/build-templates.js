/**
 * Generates glyph-data.js from the JSON stores.
 *
 * It exists for one reason: the webapp is opened by double-click, over file://,
 * and browsers block fetch() of .json under that scheme. The .json files remain
 * the source of truth (versioned, diffable, read by Node and by the test
 * suite); this script produces the copy a <script src> can actually load.
 *
 *   node build-templates.js
 */

"use strict";


import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fs = require("fs");
import X from "./read-expansions.js";
import G from "./glyph-parser.js";

/* Three roots since v1.3.4.01. `/scripts` holds JavaScript, `.guidelines`
   holds everything normative a human edits (the docs and the .json/.txt
   stores), and the repository root keeps only the entry points: README,
   CHANGELOG and the app itself. The rule is still the file's kind, not who
   wrote it — which is why the generated glyph-data.js is JavaScript and lands
   in HERE, while the generated expansions.json is data and lands in GUIDE
   beside expansions.txt, the source it is compiled from. */
const HERE = __dirname;
const GUIDE = path.join(__dirname, "..", ".guidelines");

/* --check: build everything in memory and compare, write nothing.
 *
 *   node build-templates.js --check
 *
 * Both outputs carry DO-NOT-EDIT banners and, until now, nothing enforced
 * them: no checksum, no staleness gate, and `fs.writeFileSync` overwriting
 * unconditionally. A banner nobody checks is a comment.
 *
 * Regenerating and comparing rather than stamping a checksum in the banner:
 * a checksum only catches a hand-edit of the thing it covers, and it is one
 * more piece of metadata that can itself go stale. Rebuilding answers the
 * question that actually matters — *would a build change anything right now* —
 * and catches the hand-edited file and the output left behind by a changed
 * source with one mechanism and no new state.
 *
 * PENDING exists because the build has two phases and the second reads what
 * the first wrote: expansions.json is an output, then an input. In check mode
 * nothing reaches disk, so phase two must see phase one's in-memory result or
 * it would validate glyph-data.js against a stale store and call it clean. */
const CHECK = process.argv.indexOf("--check") !== -1;
const PENDING = {};
const STALE = [];

function emit(full, content) {
  const name = path.basename(full);
  PENDING[name] = content;
  if (!CHECK) { fs.writeFileSync(full, content); return; }
  let disk = null;
  try { disk = fs.readFileSync(full, "utf8"); }
  catch (e) { STALE.push(name + ": missing"); return; }
  if (disk !== content) {
    /* say which kind of difference it is: a size change reads as a stale
       source, an equal-size change reads as a hand edit */
    STALE.push(name + (disk.length === content.length
      ? ": differs from a fresh build (same length — an edit in place)"
      : ": differs from a fresh build (" + disk.length + " on disk, " + content.length + " fresh)"));
  }
}

function readSource(full) {
  const name = path.basename(full);
  return Object.prototype.hasOwnProperty.call(PENDING, name)
    ? PENDING[name] : fs.readFileSync(full, "utf8");
}

/* The definitions live in GLOSSARY.md, in prose, and until v1.2.1.0 the engine
   could not reach them. That left the message unable to explain itself where it
   matters most: `made-of` describes a composite for free, but the 88
   hieroglyphs — precisely what does NOT decompose — had nothing to say beyond
   an English label. `means="Review"` adds nothing to `<review>`.

   Extracted rather than copied into a second file, because the glossary is the
   normative reference and the engine derives from it. Copying would create the
   same drift this whole version was spent closing.

   Entry shape:   `NAME` [★|⚠] [= `formula`] — Label. Definition…
   Six engine entries carry no English label, and there the whole line is the
   definition. */
const GLOSS_LINE = /^`([A-Z][A-Z0-9_]*)`\s*(?:[★⚠]\s*)*(?:=\s*`[^`]*`\s*)?—\s*(.+?)\s*$/;

function stripMd(s) {
  return String(s)
    .replace(/\*\(.*?\)\*\s*$/, "")     // trailing italic note
    .replace(/\*\*/g, "").replace(/`/g, "")
    .replace(/\s+/g, " ").trim();
}

function readGlossary() {
  const src = path.join(GUIDE, "GLOSSARY.md");
  if (!fs.existsSync(src)) { console.error("  ! GLOSSARY.md not found."); return {}; }
  const defs = {};
  fs.readFileSync(src, "utf8").split(/\r?\n/).forEach(ln => {
    const m = GLOSS_LINE.exec(ln.trim());
    if (!m) return;
    const body = stripMd(m[2]);
    /* The English label is short ("Do not.", "See also."). A long first
       segment is not a label — it is the whole definition. */
    const dot = body.indexOf(". ");
    const head = dot > 0 ? body.slice(0, dot) : "";
    const isLabel = head && head.split(/\s+/).length <= 3;
    defs[m[1]] = isLabel ? body.slice(dot + 2).trim() : body.replace(/\.$/, "").trim() + ".";
  });
  return defs;
}

/* expansions.txt is not JSON, so unlike the other two stores it cannot just be
   copied — it is compiled into expansions.json first, and THAT is what
   both Node and the browser load. The .txt stays the source a human edits:
   one entry per line beats hand-maintaining nested JSON. */
function buildExpansions() {
  const src = path.join(GUIDE, "expansions.txt");
  if (!fs.existsSync(src)) { console.error("  ! expansions.txt not found."); return null; }

  const { parsed, analysis, commands } = X.build(fs.readFileSync(src, "utf8"));

  /* A table that does not close must not reach the engine: an undefined
     dependency or a cycle means decomposition would silently stop halfway,
     and half-burnt output is worse than none. */
  if (analysis.undefinedDeps.length || analysis.cycles.length) {
    console.error("  ! expansions.txt does not close — " +
      analysis.undefinedDeps.length + " undefined, " + analysis.cycles.length + " cycles.");
    console.error("    run: node scripts/dag.js");
    process.exit(1);
  }

  /* The definition sits next to the composition because they answer the same
     question at two levels: `def` says what the command IS, `formula` says
     what it is MADE OF. An atom only has the first — which is exactly why it
     had to exist. */
  const defs = readGlossary();
  const semDef = Object.keys(commands).filter(c => !defs[c]).sort();
  Object.keys(commands).forEach(c => { if (defs[c]) commands[c].def = defs[c]; });

  /* `element` — the name this command wears in the emitted document. It is put
     in the store because glyph-check must validate a glyph-package on a machine
     that does not have this engine (glyph-check.js:7-12), and clauses 8 and 9 of
     PACKAGE_TARGET.md 6 key on element -> species and element -> formula. Without
     it the validator would have to import the parser, which is the one thing its
     rationale forbids. Derived here, where the engine IS present. */
  const byElement = G.elementCanonicalMap || {};
  const toElement = {};
  Object.keys(byElement).forEach(el => { toElement[byElement[el].canonical] = el; });
  const noElement = Object.keys(commands).filter(c => !toElement[c]).sort();
  Object.keys(commands).forEach(c => { if (toElement[c]) commands[c].element = toElement[c]; });
  if (noElement.length)
    console.log("  · " + noElement.length + " command(s) with no element name: " + noElement.join(" "));

  /* Same gate as the cycle check: a command with no definition goes back to
     being opaque in the message, and silent opacity is how drift gets in. */
  if (semDef.length) {
    console.error("  ! " + semDef.length + " command(s) with no entry in GLOSSARY.md: " + semDef.join(" "));
    console.error("    every command in expansions.txt needs a `NAME` — Definition line.");
    process.exit(1);
  }
  console.log("  ✓ GLOSSARY.md -> " + Object.keys(defs).length + " definitions");

  const store = {
    schema: 2,
    note: "GENERATED by build-templates.js from expansions.txt (composition) and " +
          "GLOSSARY.md (definitions) — DO NOT EDIT BY HAND. Every command carries " +
          "`species` (`atom` = a hieroglyph, does not decompose; `composite` = a glyph, " +
          "with the `formula` that decomposes it), `depth` (0 for an atom, 1 + the " +
          "deepest dependency otherwise) and `def`, what the command means. `def` is " +
          "the only thing an atom has to say about itself.",
    atoms: parsed.atoms.length,
    composites: Object.keys(parsed.composites).length,
    maxDepth: Math.max.apply(null, Object.keys(analysis.depth).map(k => analysis.depth[k])),
    commands: commands
  };

  const out = path.join(GUIDE, "expansions.json");
  emit(out, JSON.stringify(store, null, 2) + "\n");
  console.log("  ✓ expansions.txt -> expansions.json (" +
    store.atoms + " atoms, " + store.composites + " composites, depth " + store.maxDepth + ")");
  return store;
}

buildExpansions();

const SOURCES = [
  { file: "templates.json",   global: "GlyphTemplates" },
  { file: "rules.json",       global: "GlyphRules" },
  { file: "expansions.json",  global: "GlyphExpansions" },
  { file: "targets.json",     global: "GlyphTargets" }
];

const parts = [
  "/* GENERATED BY build-templates.js — DO NOT EDIT BY HAND.",
  "   Edit the .json sources and run: node build-templates.js */",
  "(function (root) {",
  '  "use strict";'
];

let missing = 0;
SOURCES.forEach(({ file, global }) => {
  const full = path.join(GUIDE, file);
  if (!fs.existsSync(full)) {
    console.error("  ! " + file + " not found — " + global + " will be null.");
    parts.push("  root." + global + " = null;");
    missing++;
    return;
  }
  const raw = readSource(full);
  JSON.parse(raw); // fail fast on malformed JSON
  /* Normalise CRLF: on Windows the .json files usually carry system line
     endings, and embedding the raw content made the GENERATED file come out
     mixed — LF for what this script writes, CRLF for what it copies. No effect
     at all in JS, but the file then showed as modified after every build, and
     a git status that lies about a generated file is a git status nobody
     reads any more. */
  parts.push("  root." + global + " = " + raw.replace(/\r\n/g, "\n").trim() + ";");
  console.log("  ✓ " + file + " -> " + global);
});

parts.push("})(typeof self !== \"undefined\" ? self : this);");

const out = path.join(HERE, "glyph-data.js");
const generated = parts.join("\n") + "\n";
emit(out, generated);

if (CHECK) {
  console.log("checked: expansions.json, glyph-data.js" +
              (missing ? "  [" + missing + " source(s) missing]" : ""));
  if (STALE.length) {
    console.error("\nFAILED: a generated file does not match a fresh build.");
    STALE.forEach(s => console.error("  ✗ " + s));
    console.error("\nBoth files say DO NOT EDIT BY HAND. Either a source moved and the");
    console.error("build was never re-run, or the generated file was edited directly.");
    console.error("Run: node scripts/build-templates.js");
    process.exit(1);
  }
  console.log("Every generated file matches a fresh build.");
} else {
  console.log("generated: glyph-data.js (" + fs.statSync(out).size + " bytes)" +
              (missing ? "  [" + missing + " source(s) missing]" : ""));
}
