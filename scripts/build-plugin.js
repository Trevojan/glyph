#!/usr/bin/env node
/**
 * build-plugin.js — the glyph-markup plugin as one installable `.plugin` file.
 *
 *   node scripts/build-plugin.js                 write .scope/dist/glyph-markup.plugin
 *   node scripts/build-plugin.js --out <file>    write it elsewhere
 *   node scripts/build-plugin.js --check         build in memory, verify, write nothing
 *
 * A `.plugin` is a zip the Claude app shows as a card with an install button.
 * Handing it over that way is the delivery: no script to run, no folder to
 * pick, so no folder to get wrong.
 *
 * Nothing in the package is chosen by hand. Every file is derived:
 *
 *   commands/           whole, as the repository has it
 *   skills/glyph-markup the skill `.claude/skills/glyph-markup/` — the copy
 *                       build-skill.js writes and `npm run check` holds to the
 *                       engine — placed where a plugin loads skills from
 *   scripts/            the import closure of every script a command executes
 *                       (`${CLAUDE_PLUGIN_ROOT}/scripts/x.js` on a `!` line),
 *                       followed through relative imports
 *   .guidelines/…       every store a packaged script loads by a literal
 *                       `../.guidelines/…` path, and every other path a
 *                       command executes against `${CLAUDE_PLUGIN_ROOT}/`
 *
 * Three files are generated, because a package carries content, not
 * references: `.claude-plugin/plugin.json` (the repository's manifest at the
 * engine's version), `package.json` (`type: module` — the scripts are ES
 * modules and the installed plugin has no repository package.json above them)
 * and `README.md`.
 *
 * Both modes refuse when:
 *   - `package.json` or `.claude-plugin/plugin.json` does not carry the
 *     engine's version (V1: `a.b.c.dd` everywhere, the manifest included);
 *   - a path a command executes is not in the package;
 *   - a packaged file is not text;
 *   - the packaged engine, run from a scratch copy of the package, does not
 *     compile a probe, or the packaged skill declares another version.
 *
 * The zip is store-only (glyph-zip.js), entries sorted, line endings LF, and
 * its timestamp is SOURCE_DATE_EPOCH when set: the same commit gives the same
 * bytes.
 */

"use strict";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import GlyphCore from "./glyph-parser.js";
import { zipStore } from "./glyph-zip.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const NAME = "glyph-markup";
const SKILL_SRC = ".claude/skills/" + NAME;
const DEFAULT_OUT = ".scope/dist/" + NAME + ".plugin";
const VERSION = GlyphCore.VERSION;
const PROBE = "[block'probe'[ctx'a'][ins'b']]";

const argv = process.argv.slice(2);
const CHECK = argv.includes("--check");
const OUT = argv.includes("--out") ? path.resolve(argv[argv.indexOf("--out") + 1]) : path.join(ROOT, DEFAULT_OUT);
const FAIL = [];

/* ---- reading the repository -------------------------------------------- */

const posix = rel => rel.split(path.sep).join("/");
const abs = rel => path.join(ROOT, rel);
const exists = rel => fs.existsSync(abs(rel));
const isDir = rel => exists(rel) && fs.statSync(abs(rel)).isDirectory();

/** every file below a repository-relative folder, as repository-relative paths */
function walk(rel) {
  return fs.readdirSync(abs(rel), { withFileTypes: true }).flatMap(e => {
    const child = posix(path.join(rel, e.name));
    return e.isDirectory() ? walk(child) : [child];
  });
}

/** a repository file as packaged text: LF endings, refused when it is not text */
function text(rel) {
  const buf = fs.readFileSync(abs(rel));
  if (buf.includes(0)) FAIL.push(rel + " is not text; the package carries text only");
  return buf.toString("utf8").replace(/\r\n/g, "\n");
}

/* ---- deriving the package ---------------------------------------------- */

/** the paths a command executes: `${CLAUDE_PLUGIN_ROOT}/…` on its `!` lines */
function executedPaths(commandFiles) {
  const found = new Set();
  commandFiles.forEach(rel => {
    text(rel).split("\n").filter(l => l.includes("!`")).forEach(line => {
      for (const m of line.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/([^"'\s`)]+)/g))
        found.add(m[1].replace(/\/+$/, ""));
    });
  });
  return [...found].sort();
}

/** a script and everything it imports through relative paths, plus the
    `../.guidelines/…` stores it loads by literal path */
function closure(entry, seen = new Set(), stores = new Set()) {
  if (seen.has(entry)) return { seen, stores };
  if (!exists(entry)) { FAIL.push("a command executes " + entry + ", which does not exist"); return { seen, stores }; }
  seen.add(entry);
  const src = text(entry), dir = path.posix.dirname(entry);
  for (const m of src.matchAll(/(?:import|export)\s[^;]*?from\s*["'](\.{1,2}\/[^"']+)["']|import\s*\(?\s*["'](\.{1,2}\/[^"']+)["']/g))
    closure(path.posix.normalize(path.posix.join(dir, m[1] || m[2])), seen, stores);
  for (const m of src.matchAll(/["'](\.\.\/\.guidelines\/[^"']+)["']/g))
    stores.add(path.posix.normalize(path.posix.join(dir, m[1])));
  return { seen, stores };
}

function manifest() {
  const repo = JSON.parse(text(".claude-plugin/plugin.json"));
  if (repo.version !== VERSION)
    FAIL.push(".claude-plugin/plugin.json declares " + repo.version + ", the engine is " + VERSION);
  const pkg = JSON.parse(text("package.json"));
  if (pkg.version !== VERSION)
    FAIL.push("package.json declares " + pkg.version + ", the engine is " + VERSION);
  return JSON.stringify(Object.assign({}, repo, { version: VERSION }), null, 2) + "\n";
}

function readme(commandFiles) {
  const names = commandFiles.map(rel => "/" + NAME + ":" +
    rel.replace(/^commands\//, "").replace(/\.md$/, "").split("/").join(":"));
  return [
    "# " + NAME + " " + VERSION,
    "",
    "The Glyph engine as a skill and as slash commands.",
    "",
    "- **Skill `" + NAME + "`** — reads, writes and validates Glyph shorthand (`.pgml`, `.hgml`,",
    "  `glyph-package` XML, `GlyphAST` JSON). It carries the engine, so behaviour is proven by",
    "  running it, not described.",
    "- **Commands** — compile Glyph inline, or walk to an axis of a repository's `.guidelines/`",
    "  and let the engine ask:",
    "",
    ...names.map(n => "  - `" + n + "`"),
    "",
    "Requires `node` ≥ 18. No dependencies.",
    "",
    "Generated by `scripts/build-plugin.js` in the Glyph repository — edit the sources there.",
    ""
  ].join("\n");
}

/** the package as { name → text }, every file derived from the repository */
function derive() {
  const files = new Map();
  const put = (name, content) => files.set(name, content);

  const commandFiles = walk("commands").filter(rel => rel.endsWith(".md")).sort();
  commandFiles.forEach(rel => put(rel, text(rel)));

  walk(SKILL_SRC).forEach(rel => put("skills/" + NAME + "/" + rel.slice(SKILL_SRC.length + 1), text(rel)));

  const executed = executedPaths(commandFiles);
  const seen = new Set(), stores = new Set();
  executed.filter(p => p.endsWith(".js")).forEach(p => closure(p, seen, stores));
  [...seen, ...stores].forEach(rel => exists(rel)
    ? put(rel, text(rel))
    : FAIL.push(rel + " is loaded by a packaged script and does not exist"));
  executed.filter(p => !p.endsWith(".js")).forEach(p => {
    if (isDir(p)) walk(p).forEach(rel => put(rel, text(rel)));
    else if (exists(p)) put(p, text(p));
  });

  put(".claude-plugin/plugin.json", manifest());
  put("package.json", '{\n  "type": "module"\n}\n');
  put("README.md", readme(commandFiles));

  /* every executed path must resolve inside the package, as a file or a folder */
  executed.forEach(p => {
    if (!files.has(p) && ![...files.keys()].some(k => k.startsWith(p + "/")))
      FAIL.push("a command executes ${CLAUDE_PLUGIN_ROOT}/" + p + ", which the package does not carry");
  });
  return files;
}

/* ---- proving the package ----------------------------------------------- */

/** unpack into a scratch folder and run the packaged engine and skill there */
async function prove(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), NAME + "-"));
  try {
    files.forEach((content, name) => {
      fs.mkdirSync(path.join(dir, path.dirname(name)), { recursive: true });
      fs.writeFileSync(path.join(dir, name), content);
    });
    const run = flag => spawnSync(process.execPath, [path.join(dir, "scripts", "glyph-plugin.js"), flag],
                                  { input: PROBE, encoding: "utf8", cwd: dir });
    const diag = run("--diag"), xml = run("--xml");
    if (diag.status !== 0) FAIL.push("the packaged engine fails --diag: " + (diag.stderr || diag.stdout).trim());
    if (xml.status !== 0 || !xml.stdout.includes('engine="' + VERSION + '"'))
      FAIL.push("the packaged engine does not answer --xml at " + VERSION + ": " + (xml.stderr || xml.stdout).trim().slice(0, 200));
    const skill = await import(pathToFileURL(path.join(dir, "skills", NAME, "scripts", "glyph-parser.js")).href);
    const skillVersion = (skill.default || skill).VERSION;
    if (skillVersion !== VERSION) FAIL.push("the packaged skill's engine is " + skillVersion + ", not " + VERSION);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/* ---- the goal ---------------------------------------------------------- */

const files = derive();
await prove(files);

if (FAIL.length) {
  console.error("FAILED: the plugin cannot be built from this repository.");
  FAIL.forEach(f => console.error("  ✗ " + f));
  process.exit(1);
}

const when = process.env.SOURCE_DATE_EPOCH ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000) : new Date();
const entries = [...files.keys()].sort().map(name => ({ name, text: files.get(name) }));
const zip = zipStore(entries, when);

if (CHECK) {
  console.log("  ✓ " + NAME + " " + VERSION + ": " + entries.length + " files, every executed path carried, engine and skill answer");
} else {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, zip);
  const shown = path.relative(ROOT, OUT);
  console.log("  ✓ " + (shown.startsWith("..") ? OUT : posix(shown)) + " — " + NAME + " " + VERSION + ", " +
              entries.length + " files, " + zip.length + " bytes");
}
