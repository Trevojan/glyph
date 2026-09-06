#!/usr/bin/env node
/**
 * glyph-cli — the command line, out of the core.
 *
 *   node glyph-cli.js "<source>" [--xml|--ast|--diag|--hgml|--expand|--from-xml]
 *
 * It left glyph-parser.js because it was the one part of that file that touches
 * the filesystem, and because the seam graph says it is the only piece nothing
 * else depends on. Everything else in the core is reached into by at least one
 * other seam, so this is where a split can start without a dependency analysis
 * being wrong somewhere.
 *
 * `glyph-parser.js` still answers to its documented invocation and delegates
 * here, so nothing anyone has written down stops working.
 */

"use strict";

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import G from "./glyph-parser.js";
import { zipStore } from "./glyph-zip.js";
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* Something that carries no bracket and wears an extension or a separator is a
   path an author meant to compile, not a source. Used only to REFUSE — the way
   in is `--file`, and guessing is what this check exists to prevent. */
const LOOKS_LIKE_PATH = /^[^[\]]+(\.(pgml|glyph|gly|txt|md|hgml|xml|json)|[\/\\][^[\]]*)$/i;

export function main() {
  // optional stores: if absent, the engine still runs, just without expansion/contradiction checks
  [["../.guidelines/templates.json", G.useTemplates],
   ["../.guidelines/rules.json", G.useRules],
   ["../.guidelines/expansions.json", G.useExpansions]].forEach(function (pair) {
    try {
      pair[1](require(require("path").resolve(__dirname, pair[0])));
    } catch (e) { /* missing store is a valid situation */ }
  });
  var argv = process.argv.slice(2);
  var mode = "xml";
  var src = [];
  var file = null, bundle = false, outDir = null;
  for (var ai = 0; ai < argv.length; ai++) {
    var a = argv[ai];
    if (a === "--ast" || a === "--xml" || a === "--diag" ||
        a === "--expand" || a === "--hgml" || a === "--from-xml") { mode = a.slice(2); continue; }
    /* `--file` is the ONLY way in from disk. Until it existed the engine had no
       filesystem entry point at all: source arrived as argv, so
       `glyph-cli.js order.pgml` compiled the seven-character STRING
       "order.pgml" and answered about that. */
    if (a === "--file" || a === "-f") { file = argv[++ai]; continue; }
    if (a === "--bundle") { bundle = true; continue; }
    if (a === "--out") { outDir = argv[++ai]; continue; }
    if (a.slice(0, 7) === "--file=") { file = a.slice(7); continue; }
    src.push(a);
  }
  var input = src.join(" ");

  if (file != null) {
    if (input) {
      console.error("--file e uma fonte na linha de comando ao mesmo tempo: escolha uma.");
      process.exit(2);
    }
    if (!file) { console.error("--file sem caminho."); process.exit(2); }
    try {
      input = fs.readFileSync(file, "utf8");
    } catch (e) {
      console.error("não consegui ler " + file + ": " + e.message);
      process.exit(2);
    }
    /* A BOM survives readFileSync and would reach the tokenizer as content. */
    if (input.charCodeAt(0) === 0xFEFF) input = input.slice(1);
  } else if (mode !== "expand" && input && LOOKS_LIKE_PATH.test(input) && fs.existsSync(input)) {
    /* Refuse rather than guess. Compiling the path as source is the silent
       wrong answer this repository exists to remove — it produces a document
       ABOUT the filename, and nothing says so. */
    console.error(input + " é um arquivo que existe, e uma fonte Glyph não se parece com isso.");
    console.error("para compilar o arquivo:  node scripts/glyph-cli.js --file " + input + " --xml");
    process.exit(2);
  }

  if (!input) {
    console.error("uso: node scripts/glyph-cli.js \"[crit[ctx]]\" [--xml|--ast|--diag|--hgml]");
    console.error("     node scripts/glyph-cli.js --file caminho.pgml [--xml|--ast|--diag|--hgml]");
    console.error("     node scripts/glyph-cli.js \"<glyph-package>…</glyph-package>\" --from-xml");
    console.error("     node scripts/glyph-cli.js CRIT --expand");
    process.exit(2);
  }
  /* ------------------------------------------------------------------ *
   * --bundle: a Ordem inteira, numerada como um ADR
   *
   * Numeracao chapada e sequencial -- ORD-0001, ORD-0002 -- e AQUI ela e de
   * verdade, porque a linha de comando enxerga a pasta: o proximo numero e o
   * maior ORD-#### que ja existe no destino, mais um. E a mesma coisa que se
   * faz com um ADR, e pela mesma razao.
   *
   * O app nao consegue fazer isso -- o navegador nao enxerga pasta -- entao la
   * o numero vem do localStorage e o campo fica editavel. A diferenca e
   * declarada em vez de disfarcada.
   * ------------------------------------------------------------------ */
  if (bundle) {
    var dir = outDir || ".";
    var next = 1;
    try {
      fs.readdirSync(dir).forEach(function (name) {
        var m = /^ORD-(\d{4})/.exec(name);
        if (m) next = Math.max(next, parseInt(m[1], 10) + 1);
      });
    } catch (e) {
      console.error("nao consegui ler " + dir + ": " + e.message);
      process.exit(2);
    }
    var id = "ORD-" + String(next).padStart(4, "0");
    var xml, ast, hgml;
    try {
      xml = G.toXML(input); ast = JSON.stringify(G.toAST(input), null, 2); hgml = G.toHGML(input);
    } catch (e) {
      console.error("a fonte nao compilou: " + e.message);
      process.exit(1);
    }
    var gaps = G.parse(input).gaps || [];
    var refused = gaps.filter(function (g) { return g.sev === "fix"; });
    var zip = zipStore([
      { name: id + ".pgml", text: input },
      { name: id + ".xml",  text: xml },
      { name: id + ".json", text: ast },
      { name: id + ".hgml", text: hgml },
      { name: id + ".manifest.json", text: JSON.stringify({
          order: id, engine: G.VERSION, emitted: new Date().toISOString(),
          files: [id + ".pgml", id + ".xml", id + ".json", id + ".hgml"],
          source: file || null,
          diagnostics: { fix: refused.length, total: gaps.length }
        }, null, 2) + String.fromCharCode(10) }
    ]);
    var dest = path.join(dir, id + ".zip");
    fs.writeFileSync(dest, zip);
    console.log(dest + "  (" + zip.length + " bytes, 5 arquivos)");
    /* recusa nao impede emitir -- casa vazia vira <needs> e a Ordem viaja
       incompleta de proposito -- mas o Autor da Ordem tem de saber. */
    if (refused.length)
      console.error(refused.length + " diagnostico(s) `fix` nesta Ordem. Rode --diag para ver.");
    return;
  }

  if (mode === "hgml") console.log(G.toHGML(input));
  else if (mode === "from-xml") {
    /* the inverse, for checking by hand what the XML panel does on apply */
    var back = G.fromXML(input);
    console.log(back.src);
    back.diag.forEach(function (d) {
      /* the messages carry <code> for the panel; the terminal wants them bare */
      console.error("[" + d.sev + "] " + d.code + " — " + String(d.msg).replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"));
    });
  }
  else if (mode === "expand") {
    /* --expand takes a COMMAND NAME, not Glyph source: it answers "what is
       this made of", which is the question the .hgml emitter will ask. */
    var nm = input.replace(/[\[\]']/g, "").trim().toUpperCase();
    var sp = G.speciesOf(nm);
    if (!sp) {
      console.error(nm + ": fora da tabela de composição (ou store não carregado).");
      process.exit(2);
    }
    console.log(nm + "  [" + sp + "]  nível " + G.depthOf(nm));
    if (sp === "composite") {
      console.log("  fórmula: " + G.formulaOf(nm));
      var at = G.atomsOf(nm);
      console.log("  " + at.length + " hieróglifos: " + at.join(" "));
    } else {
      console.log("  hieróglifo — não decompõe.");
    }
  }
  else if (mode === "ast") console.log(JSON.stringify(G.toAST(input), null, 2));
  else if (mode === "diag") {
    var gaps = G.parse(input).gaps;
    if (!gaps.length) console.log("sem diagnósticos.");
    gaps.forEach(function (g) { console.log("[" + g.sev + "] " + g.code + " — " + g.plain); });
  } else console.log(G.toXML(input));

}

/* "was this run, or imported?" — the ESM answer to `require.main === module`.
   The Windows path needs both a separator swap and a leading slash before the
   drive letter, or the comparison never matches on this machine. */
if (process.argv[1] && import.meta.url ===
    "file://" + process.argv[1].replace(/\\/g, "/").replace(/^([A-Za-z]:)/, "/$1")) main();
