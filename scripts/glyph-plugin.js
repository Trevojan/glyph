#!/usr/bin/env node
/**
 * glyph-plugin — the plugin's way in to glyph-cli.
 *
 *   node glyph-plugin.js [--from <ORD-####|name|path>] [--root <dir>]
 *                        [--fallback "<glyph>"] [--keep] <engine flags…>  < source
 *
 * A slash command cannot do three things the CLI needs: hand over a source that
 * carries quotes, newlines and `;` without a shell mangling it; know where THIS
 * repository keeps its `.guidelines/`; and turn `ORD-0011` into the file it
 * names. This script does exactly those three and nothing else, then calls
 * `glyph-cli.js` with `--file`. The engine stays untouched: everything here is
 * glue between a `commands/*.md` leaf and the CLI it already has.
 *
 *   source     stdin, always (a quoted heredoc from the leaf). Blank stdin
 *              compiles `--fallback` instead, when one is given.
 *   --from     an order by number (`ORD-0011`, `0011`), by name
 *              (`ORD-0009.v2`) or by path; replaces stdin.
 *   --root     the repository whose `.guidelines/` is meant. Default: cwd.
 *              `Docs/.guidelines/` and `.guidelines/` are both tried.
 *   --keep     keep the temp file the stdin source was written to, and print
 *              its path first — so a later step can `--from` it without the
 *              source travelling through a model.
 *   --bundle   without `--out`, the resolved `.orders/` becomes the `--out`.
 *
 * Claude Code escapes `!` after whitespace in a command's arguments (`\!`);
 * Glyph never writes `\!`, so the escape is undone here.
 */

"use strict";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { main } from "./glyph-cli.js";

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

let file = null;
if (from != null) {
  if (!from) die("--from sem valor: ORD-####, um nome, ou um caminho.");
  if (fs.existsSync(from)) file = from;
  else {
    const g = guidelines();
    if (!g) die("nenhum Docs/.guidelines/ nem .guidelines/ em " + root);
    let name = /^\d{4}$/.test(from) ? "ORD-" + from : from;
    if (!/\.pgml$/i.test(name)) name += ".pgml";
    file = path.join(g, ".orders", name);
    if (!fs.existsSync(file)) die("não existe: " + file);
  }
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

/* glyph-cli.main() reads process.argv and guards on argv[1], so it did not run
   on import; it runs now, on the argv a leaf could not have written by hand. */
process.argv = [process.argv[0], CLI, "--file", file, ...engine];
main();
