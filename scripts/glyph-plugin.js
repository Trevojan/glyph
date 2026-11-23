#!/usr/bin/env node
/**
 * glyph-plugin — the plugin's way in to glyph-cli.
 *
 *   node glyph-plugin.js [--from <ORD-####|EMS-###/ORD-####|name|path>] [--root <dir>]
 *                        [--fallback "<glyph>"] [--keep] <engine flags…>  < source
 *
 * A slash command cannot do three things the CLI needs: hand over a source that
 * carries quotes, newlines and `;` without a shell mangling it; know where THIS
 * repository keeps its `.guidelines/`; and turn `ORD-0011` into the file it
 * names. This script does exactly those three, then calls `glyph-cli.js` with
 * `--file` — or, for a bundle into a series, the installed Rust `glyph`. The engine stays untouched: everything here is
 * glue between a `commands/*.md` leaf and the CLI it already has.
 *
 *   source     stdin, always (a quoted heredoc from the leaf). Blank stdin
 *              compiles `--fallback` instead, when one is given.
 *   --from     an order by number (`ORD-0011`, `0011`), by series
 *              (`EMS-001/ORD-0003`, the .pgml inside that ORD's folder), by
 *              name (`ORD-0009.v2`) or by path, an ORD folder's included;
 *              replaces stdin.
 *   --root     the repository whose `.guidelines/` is meant. Default: cwd.
 *              `Docs/.guidelines/` and `.guidelines/` are both tried.
 *   --keep     keep the temp file the stdin source was written to, and print
 *              its path first — so a later step can `--from` it without the
 *              source travelling through a model.
 *   --bundle   without `--out`, the resolved `.orders/` becomes the `--out`.
 *              Into a series, `EMS-###/`, the bundle is the Rust binary's
 *              (EMS-002 ORD-0041, CO-2 of 2026-11-22): an installed `glyph` of
 *              this version — GLYPH_BIN, or the place `glyph --install` writes —
 *              runs it with the same flags, and checks the Order's claim before
 *              it writes; with none, the plugin refuses by name (J4 b).
 *
 * Claude Code escapes `!` after whitespace in a command's arguments (`\!`);
 * Glyph never writes `\!`, so the escape is undone here.
 */

"use strict";

import cp from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { main } from "./glyph-cli.js";
import { VERSION } from "./core/version.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(HERE, "glyph-cli.js");

const argv = process.argv.slice(2);
let from = null, root = process.cwd(), fallback = null, keep = false;
const engine = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--from") { from = argv[++i]; continue; }
  if (a === "--root") { root = argv[++i]; continue; }
  if (a === "--fallback") { fallback = argv[++i]; continue; }
  if (a === "--keep") { keep = true; continue; }
  engine.push(a);
}

/* the guidelines root: the two layouts in use, first one that exists wins */
function guidelines() {
  for (const rel of ["Docs/.guidelines", ".guidelines"]) {
    const dir = path.join(root, rel);
    if (fs.existsSync(dir)) return dir;
  }
  return null;
}

function die(msg) { console.error(msg); process.exit(2); }

/* the ORD of a series is a folder, and its source is the .pgml of its own name */
const inFolder = dir => path.join(dir, path.basename(dir) + ".pgml");

let file = null;
if (from != null) {
  if (!from) die("--from sem valor: ORD-####, EMS-###/ORD-####, um nome, ou um caminho.");
  if (fs.existsSync(from)) file = fs.statSync(from).isDirectory() ? inFolder(from) : from;
  else {
    const g = guidelines();
    if (!g) die("nenhum Docs/.guidelines/ nem .guidelines/ em " + root);
    const ser = /^(EMS-\d{3})[\/\\](ORD-\d{4})[\/\\]?$/.exec(from);
    if (ser) file = inFolder(path.join(g, ".orders", ser[1], ser[2]));
    else {
      let name = /^\d{4}$/.test(from) ? "ORD-" + from : from;
      if (!/\.pgml$/i.test(name)) name += ".pgml";
      file = path.join(g, ".orders", name);
    }
  }
  if (!fs.existsSync(file)) die("não existe: " + file);
} else {
  let src = "";
  try { src = fs.readFileSync(0, "utf8"); } catch (e) { /* no stdin: stays blank */ }
  src = src.replace(/\\!/g, "!");
  if (!src.trim()) {
    if (fallback == null) die("fonte vazia: passe Glyph na entrada, ou --from ORD-####.");
    src = fallback;
  }
  const dir = path.join(os.tmpdir(), "glyph-plugin");
  fs.mkdirSync(dir, { recursive: true });
  file = path.join(dir, new Date().toISOString().replace(/[:.]/g, "-") + "-" + process.pid + ".pgml");
  fs.writeFileSync(file, src);
  if (keep) console.log("fonte: " + file);
  else process.on("exit", () => { try { fs.unlinkSync(file); } catch (e) { /* already gone */ } });
}

if (engine.includes("--bundle") && !engine.includes("--out")) {
  const g = guidelines();
  if (!g) die("--bundle sem --out, e nenhum .guidelines/ em " + root);
  engine.push("--out", path.join(g, ".orders"));
}

/* the installed glyph a series bundle runs: GLYPH_BIN, or the place the
   install writes; refused by name when it is missing or another version */
function installed() {
  const local = process.env.LOCALAPPDATA;
  const bin = process.env.GLYPH_BIN ||
    (process.platform === "win32" && local ? path.join(local, "Programs", "Glyph", "glyph.exe") : null);
  const why = "bundling into a series runs the installed glyph, version " + VERSION + " (EMS-002 ORD-0041)";
  if (!bin) die(why + ": none is installed on " + process.platform + ", and GLYPH_BIN is not set. Nothing written.");
  if (!fs.existsSync(bin)) die(why + ": " + bin + " does not exist. Install it with glyph --install, or set GLYPH_BIN. Nothing written.");
  const asked = cp.spawnSync(bin, ["--version"], { encoding: "utf8" });
  const said = String(asked.stdout || "").trim();
  if (asked.status !== 0 || said !== VERSION)
    die(why + ": " + bin + " answers " + (/^\d+(\.\d+)+$/.test(said) ? said : "no version") +
        ". Install this version with glyph --install, or set GLYPH_BIN. Nothing written.");
  return bin;
}

const out = engine.indexOf("--out") >= 0 ? engine[engine.indexOf("--out") + 1] : null;
if (engine.includes("--bundle") && out && /^EMS-\d{3}$/.test(path.basename(path.resolve(out)))) {
  const run = cp.spawnSync(installed(), ["--file", file, ...engine], { stdio: "inherit" });
  process.exit(run.status == null ? 1 : run.status);
}

/* glyph-cli.main() reads process.argv and guards on argv[1], so it did not run
   on import; it runs now, on the argv a leaf could not have written by hand. */
process.argv = [process.argv[0], CLI, "--file", file, ...engine];
main();
