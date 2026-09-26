#!/usr/bin/env node
/**
 * glyph-protocol.js — the engine as a process: EMS-001 ORD-0010, ADR B.
 *
 * One JSON request a line in, one JSON answer a line out, over the
 * repository's three stores. `serve-dev.js` relays the page's `POST /engine`
 * to a process that speaks this, and the Rust engine (`glyph-engine`) answers
 * the same bytes: this file is its oracle.
 *
 *   node scripts/glyph-protocol.js < requests.jsonl
 *
 * The twelve calls `glyph-ui.js` makes, by the name the request carries:
 *
 *   {"call":"tokenize","src":S}
 *   {"call":"classify","name":N}
 *   {"call":"suggest","name":N}
 *   {"call":"elName","canonical":C,"tier":T,"gloss":G}
 *   {"call":"parseLogic","name":N,"body":B}
 *   {"call":"expandExpr","raw":R}          {"call":"freeVars","raw":R}
 *   {"call":"parse","src":S}               the tree cannot travel, so it
 *                                          answers {ast, gaps, commands}:
 *                                          the full envelope, the parse's
 *                                          gaps, and the tree's commands —
 *                                          the envelope stops at
 *                                          LIMITS.astDepth, the count does not
 *   {"call":"toXML","src":S,"describe":true?}   for buildXml
 *   {"call":"toAST","src":S,"projection":"panel"?}   for serializeAST
 *   {"call":"toHGML","src":S}
 *   {"call":"fromXML","xml":X}
 *
 * Any request may carry "lang": "pt" or "en", and "session": false, which the
 * page's template bodies parse with. A field that is not a string
 * reads as "". The answer is {"ok": value}, or {"thrown": message} where the
 * engine throws; a line that is not a JSON object answers
 * {"thrown":"bad request"}, and an unknown call {"thrown":"no such call"}.
 */
"use strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import readline from "node:readline";
import G from "./glyph-parser.js";
const require = createRequire(import.meta.url);

export const STORES = {
  templates: require("../.guidelines/templates.json").templates,
  rules: require("../.guidelines/rules.json"),
  expansions: require("../.guidelines/expansions.json")
};

export const CALLS = ["tokenize", "classify", "suggest", "elName", "parseLogic", "expandExpr", "freeVars",
                      "parse", "toXML", "toAST", "toHGML", "fromXML"];

const BAD = JSON.stringify({ thrown: "bad request" });

function run(q) {
  const o = { templates: STORES.templates, rules: STORES.rules, expansions: STORES.expansions };
  if (q.lang === "pt" || q.lang === "en") o.lang = q.lang;
  if (q.session === false) o.session = false;
  const str = k => (typeof q[k] === "string" ? q[k] : "");
  switch (q.call) {
    case "tokenize":   return G.tokenize(str("src"));
    case "classify":   return G.classify(str("name"), o);
    case "suggest":    return G.suggest(str("name"));
    case "elName":     return G.elName(str("canonical"), str("tier"), str("gloss"));
    case "parseLogic": return G.parseLogic(str("name"), str("body"));
    case "expandExpr": return G.expandExpr(str("raw"));
    case "freeVars":   return G.freeVars(str("raw"));
    case "parse": {
      const p = G.parse(str("src"), o);
      let commands = 0;
      p.segments.forEach(sg => G.walk(sg.children, nd => { if (nd.canonical) commands++; }));
      return { ast: G.toAST(str("src"), o), gaps: p.gaps, commands: commands };
    }
    case "toXML":      return G.toXML(str("src"), q.describe === true ? { ...o, describe: true } : o);
    case "toAST":      return G.toAST(str("src"), q.projection === "panel" ? { ...o, projection: "panel" } : o);
    case "toHGML":     return G.toHGML(str("src"), o);
    case "fromXML":    return G.fromXML(str("xml"), o);
    default:           throw new Error("no such call");
  }
}

/* one request line, one answer line */
export function answer(line) {
  let q;
  try { q = JSON.parse(line); } catch (e) { return BAD; }
  if (q === null || typeof q !== "object" || Array.isArray(q)) return BAD;
  try { return JSON.stringify({ ok: run(q) }); } catch (e) { return JSON.stringify({ thrown: e.message }); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = process.stdout;
  readline.createInterface({ input: process.stdin, crlfDelay: Infinity })
    .on("line", line => { out.write(answer(line) + "\n"); });
}
