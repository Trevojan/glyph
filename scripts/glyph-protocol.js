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
 * The twelve calls `glyph-ui.js` makes, by the name the request carries, and
 * `tables`, what the page asks once, at load (EMS-002 ORD-0032):
 *
 *   {"call":"tables"}                      VERSION, the tables the page reads,
 *                                          ELEMENT_INPUT, BLENDS and templates:
 *                                          what classify answers from, and the
 *                                          templates the page merges over
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
 *
 * Any request may carry "differ": {"digest":D,"templates":T}, the templates that
 * differ from the engine's, laid over its own for that request, and D is `ck` of
 * T's JSON text (question 11 of the EMS-001 return, answered c). The engine keeps
 * nothing of them. A digest that does not match answers {"thrown":"differ: the
 * templates do not match their digest"}, and a shape that is not this one
 * {"thrown":"differ: not a digest and templates"}.
 *
 * Run as the engine, it registers the stores it answers with, as the CLI and
 * the page do: a template's body is parsed with what is registered, so a body
 * that breaks a rule reads the same here as in the page (EMS-002 ORD-0008).
 * Imported, it registers nothing, and the importer's registry is its own.
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

export const CALLS = ["tables", "tokenize", "classify", "suggest", "elName", "parseLogic", "expandExpr", "freeVars",
                      "parse", "toXML", "toAST", "toHGML", "fromXML"];

const BAD = JSON.stringify({ thrown: "bad request" });

/* the page reads these off GlyphCore; classify reads ELEMENT_INPUT and BLENDS too */
function tables() {
  return { VERSION: G.VERSION, CATS: G.CATS, INSTR: G.INSTR, ALIAS: G.ALIAS, ALIAS_OF: G.ALIAS_OF, STRUCT: G.STRUCT,
           META: G.META, MODE: G.MODE, EMO: G.EMO, SESSION: G.SESSION, FRAMES: G.FRAMES,
           EDITORIAL_ONLY: G.EDITORIAL_ONLY, PTBR: G.PTBR, CAT_OF: G.CAT_OF, LOGIC_OPS: G.LOGIC_OPS, PUNCT: G.PUNCT,
           ELEMENT_INPUT: G.ELEMENT_INPUT, BLENDS: (STORES.rules.rules || []).filter(r => r.kind === "blend"),
           templates: STORES.templates };
}

/* what a request brings, over the engine's own: under a `templates` key, so a
   template named `templates` stays a template */
function over(differ) {
  const shaped = differ !== null && typeof differ === "object" && !Array.isArray(differ) && typeof differ.digest === "string" &&
    differ.templates !== null && typeof differ.templates === "object" && !Array.isArray(differ.templates);
  if (!shaped) throw new Error("differ: not a digest and templates");
  if (G.ck(JSON.stringify(differ.templates)) !== differ.digest) throw new Error("differ: the templates do not match their digest");
  return { templates: { ...STORES.templates, ...differ.templates } };
}

function run(q) {
  const o = { templates: q.differ === undefined ? STORES.templates : over(q.differ), rules: STORES.rules, expansions: STORES.expansions };
  if (q.lang === "pt" || q.lang === "en") o.lang = q.lang;
  if (q.session === false) o.session = false;
  const str = k => (typeof q[k] === "string" ? q[k] : "");
  switch (q.call) {
    case "tables":     return tables();
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
  G.useTemplates({ templates: STORES.templates });
  G.useRules(STORES.rules);
  G.useExpansions(STORES.expansions);
  const out = process.stdout;
  readline.createInterface({ input: process.stdin, crlfDelay: Infinity })
    .on("line", line => { out.write(answer(line) + "\n"); });
}
