/**
 * glyph-check — the gate, and it exists before the thing it gates.
 *
 *   node glyph-check.js --ast <file.json>     validate an AST envelope
 *   node glyph-check.js --ast -               read the envelope from stdin
 *
 * Why a validator for a format this repository already produces: because the
 * point of promoting the AST to source of truth is that it travels. An envelope
 * written on one machine is read on another, by something that does not have
 * this engine — inside a container, in another account, by another model. The
 * receiving end needs a way to say "this is not a Glyph AST" that does not
 * amount to running the emitter and comparing.
 *
 * It validates against `.guidelines/.sources/ast-schema.json`, which is HAND-AUTHORED.
 * A schema generated from the engine would agree with the engine by
 * construction and catch nothing — the same trap D10 names for conformance
 * vectors. The corpus asserts the other direction, that what the engine emits
 * conforms, so the two hold each other the way XML_REFERENCE and D-03 do.
 *
 * Two things are validated, and they are different artefacts. `--ast` checks an
 * AST envelope against ast-schema.json. `--package` checks an emitted
 * glyph-package DOCUMENT against the twelve clauses of PACKAGE_TARGET.md 6.
 *
 * `--ems` (EMS-002 ORD-0038, the Regent's E6 a of 2026-11-21) checks an
 * EMS.json, the configuration a series carries, against the hand-authored
 * .guidelines/.sources/ems-schema.json; --bundle runs the same check.
 *
 * `--gate` (EMS-002 ORD-0036, the Regent's X5 b of 2026-11-21) checks every
 * bundle under .guidelines/.orders against the schema its XML carries, and holds
 * the verdict of each to .guidelines/.orders/GATE.json: it refuses a bundle whose
 * schema and content disagree, and a log that differs from a fresh run.
 * `--gate --write` writes the log. A bundle emitted before the gate, its schema
 * empty over content that declares, is read as emitted and named in the log.
 *
 * The six-layer BUNDLE of BUNDLE_TARGET.md 5 is NOT here and is NOT a
 * glyph-package. An earlier version of this comment called it one; lock T0
 * separates them permanently, and its emitters are out of scope by the order.
 */

"use strict";


import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/* "was this file run, or imported?" — `require.main === module` in the
   other module system. process.argv[1] is undefined under an import, so
   the check has to tolerate that rather than throw on it. */
const isMain = (u) => !!process.argv[1] &&
  u === "file://" + process.argv[1].replace(/\\/g, "/").replace(/^([A-Za-z]:)/, "/$1");
const fs = require("fs");

const SCHEMA = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../.guidelines/.sources/ast-schema.json"), "utf8"));

function validate(env) {
  const errs = [];
  const at = p => p || "<envelope>";

  /* rule 3/7 — the envelope itself */
  if (!env || typeof env !== "object") return ["<envelope>: not an object"];
  if (env.type !== SCHEMA.envelope.constants.type)
    errs.push("<envelope>: type is " + JSON.stringify(env.type) +
              ", expected " + JSON.stringify(SCHEMA.envelope.constants.type));
  if (!env.version) errs.push("<envelope>: no `version` — an envelope that will not say which engine produced it cannot be checked against anything");
  /* rule 4 — a thinned envelope is refused rather than validated leniently,
     because absence means six different things there */
  if (env.projection !== "full")
    errs.push("<envelope>: projection is " + JSON.stringify(env.projection) +
              ", and only `full` is validated — the panel projection is thinned for the screen");

  /* rule 11 — incomplete by its own admission */
  if (env.truncatedNodes)
    errs.push("<envelope>: truncatedNodes is " + env.truncatedNodes +
              " — the envelope omits part of the tree and cannot stand as a source of truth");

  /* rule 9 — a different shape is refused rather than read leniently */
  if (env.schema !== SCHEMA.envelope.constants.schema)
    errs.push("<envelope>: schema is " + JSON.stringify(env.schema) + ", this validator declares " +
              SCHEMA.envelope.constants.schema + " — an envelope of another shape is refused, not guessed at");

  /* rule 10 — the fingerprints that stop a silent re-import against another store */
  if (env.stores && typeof env.stores === "object") {
    SCHEMA.stores.required.forEach(k => {
      if (!(k in env.stores)) errs.push("<envelope>.stores: missing `" + k + "`");
      else if (env.stores[k] !== null && typeof env.stores[k] !== "string")
        errs.push("<envelope>.stores." + k + ": not a checksum and not null");
    });
  }

  if (env.source !== null && env.source !== undefined) {
    if (typeof env.source !== "object") errs.push("<envelope>.source: not an object and not null");
    else {
      SCHEMA.source.required.forEach(k => {
        if (!(k in env.source)) errs.push("<envelope>.source: missing `" + k + "`");
      });
      Object.keys(env.source).forEach(k => {
        if (SCHEMA.source.required.indexOf(k) === -1 && SCHEMA.source.optional.indexOf(k) === -1)
          errs.push("<envelope>.source: undeclared key `" + k + "`");
      });
      if (SCHEMA.source.newline.indexOf(env.source.newline) === -1)
        errs.push("<envelope>.source: newline " + JSON.stringify(env.source.newline) + " is not declared");
    }
  }

  SCHEMA.envelope.required.forEach(k => {
    if (!(k in env)) errs.push("<envelope>: missing required key `" + k + "`");
  });
  Object.keys(env).forEach(k => {
    if (SCHEMA.envelope.required.indexOf(k) === -1 && SCHEMA.envelope.optional.indexOf(k) === -1)
      errs.push("<envelope>: undeclared key `" + k + "`");
  });

  /* rule 6 — a coordinate that lies is worse than none */
  (env.diagnostics || []).forEach((d, i) => {
    const p = "diagnostics[" + i + "]";
    SCHEMA.diagnostic.required.forEach(k => {
      if (!(k in d)) errs.push(p + ": missing required key `" + k + "`");
    });
    Object.keys(d).forEach(k => {
      if (SCHEMA.diagnostic.required.indexOf(k) === -1 && SCHEMA.diagnostic.optional.indexOf(k) === -1)
        errs.push(p + ": undeclared key `" + k + "`");
    });
    if (SCHEMA.diagnostic.severity.indexOf(d.severity) === -1)
      errs.push(p + ": severity " + JSON.stringify(d.severity) + " is not declared");
    if ("at" in d) {
      if (!d.at || typeof d.at !== "object") errs.push(p + ".at: not an object");
      else SCHEMA.diagnostic.at.required.forEach(k => {
        if (typeof d.at[k] !== "number") errs.push(p + ".at: `" + k + "` is not a number");
      });
    }
  });

  /* rules 1, 2, 3, 5 — every node */
  (function walk(list, p) {
    (list || []).forEach((n, i) => {
      const here = p + "[" + i + "]";
      if (!n || typeof n !== "object") { errs.push(here + ": not an object"); return; }
      const spec = SCHEMA.nodes[n.type];
      if (!spec) { errs.push(here + ": type " + JSON.stringify(n.type) + " is not in the schema"); return; }
      spec.required.forEach(k => {
        if (!(k in n)) errs.push(here + " (" + n.type + "): missing required key `" + k + "`");
      });
      Object.keys(n).forEach(k => {
        if (spec.required.indexOf(k) === -1 && (spec.optional || []).indexOf(k) === -1)
          errs.push(here + " (" + n.type + "): undeclared key `" + k + "`");
      });
      if (spec.origin && "origin" in n && spec.origin.indexOf(n.origin) === -1)
        errs.push(here + ": origin " + JSON.stringify(n.origin) + " is not declared");
      if (spec.form && "form" in n && spec.form.indexOf(n.form) === -1)
        errs.push(here + ": form " + JSON.stringify(n.form) + " is not declared");
      /* rule 8 — a span that lies is worse than no span, so when `at` is
         present it must be well-formed */
      if ("at" in n && n.at !== null) {
        if (typeof n.at !== "object") errs.push(here + ".at: not an object and not null");
        else SCHEMA.at.required.forEach(k => {
          if (typeof n.at[k] !== "number") errs.push(here + ".at: `" + k + "` is not a number");
        });
      }
      if (Array.isArray(n.body)) walk(n.body, here + ".body");
    });
  })(env.segments, "segments");

  return errs;
}


/* ------------------------------------------------------------------ *
 * glyph-package — the DOCUMENT validator (E3)
 *
 * Written before the emitter it gates (lock T3). It reads
 * `.guidelines/.sources/PACKAGE_TARGET.md` §6 and nothing else: twelve clauses, each
 * carrying a position, because a refusal a reader cannot locate is not
 * verifiable by someone who does not have this engine.
 *
 * It does NOT import the parser, for the same reason the AST validator does
 * not: the receiving end may have the store and not the engine. Clauses 8 and
 * 9 need element -> species and element -> formula, and `element` is recorded
 * in expansions.json by build-templates.js precisely so this file can stay
 * standalone.
 * ------------------------------------------------------------------ */

const EXPANSIONS = (() => {
  try { return JSON.parse(fs.readFileSync(
    path.resolve(__dirname, "../.guidelines/.sources/expansions.json"), "utf8")).commands; }
  catch (e) { return null; }
})();

const BY_ELEMENT = (() => {
  if (!EXPANSIONS) return null;
  const m = {};
  Object.keys(EXPANSIONS).forEach(c => {
    const e = EXPANSIONS[c].element;
    if (e && !m[e]) m[e] = { canonical: c, ...EXPANSIONS[c] };
  });
  return m;
})();

/* text-bearing elements: their content is the author's, character for character */
const TEXT_BEARING = ["user-input", "off", "source", "needs", "rule"];

/** Tolerant scan: a tree of {name, attrs, children, text, line}. Malformed
 *  input is the point of this function, so it never throws. */
function scan(xml) {
  const root = { name: "#document", attrs: {}, children: [], line: 0 };
  const stack = [root];
  const re = /<(\/?)([a-zA-Z][\w-]*)((?:\s+[\w-]+="[^"]*")*)\s*(\/?)>|([^<]+)/g;
  const lineAt = i => xml.slice(0, i).split("\n").length;
  let m;
  while ((m = re.exec(xml))) {
    const top = stack[stack.length - 1];
    if (m[5] !== undefined) { if (m[5].trim()) top.text = (top.text || "") + m[5]; else top.ws = true; continue; }
    const [, closing, name, rawAttrs, selfClose] = m;
    if (closing) { if (stack.length > 1) stack.pop(); continue; }
    const attrs = {};
    (rawAttrs || "").replace(/([\w-]+)="([^"]*)"/g, (_, k, v) => (attrs[k] = v, ""));
    const node = { name, attrs, children: [], line: lineAt(m.index), raw: m[0] };
    top.children.push(node);
    if (!selfClose) stack.push(node);
  }
  return root;
}

/** Validate a glyph-package DOCUMENT. Returns a list of refusals, each
 *  `Code @line N: what` — the twelve clauses of PACKAGE_TARGET.md §6. */
function validatePackage(xml) {
  const errs = [];
  const say = (code, line, what) => errs.push(code + " @line " + line + ": " + what);
  const doc = scan(String(xml));
  const root = doc.children[0];

  if (!root) return ["NotAPackage @line 1: the document has no element at all"];
  if (root.name !== "glyph-package")
    say("NotAPackage", root.line, "the root is <" + root.name + ">, not <glyph-package>");
  if (!root.attrs.engine)
    say("EngineUnstated", root.line,
        "the root carries no `engine`; a document that will not say what produced it cannot be judged perishable");

  const first = root.children[0];
  if (!first || first.name !== "schema" || first.children.length || (first.text || "").trim())
    say("SchemaMissing", first ? first.line : root.line,
        "the first child of the root must be an empty <schema/> (§5), found " +
        (first ? "<" + first.name + ">" + (first.children.length ? " with children" : "") : "nothing"));

  (function walk(node, inChain, parent) {
    node.children.forEach((c, i) => {
      /* 3 / 4 — the attribute must not survive the grouping, and cannot occur outside it */
      if ("chain" in c.attrs)
        inChain ? say("ChainDoubleEncoded", c.line,
                      "<" + c.name + "> carries chain=\"" + c.attrs.chain + "\" inside a <chain>; position already says it (§3.2)")
                : say("ChainUngrouped", c.line,
                      "<" + c.name + "> carries chain=\"" + c.attrs.chain + "\" outside a <chain>; a run of one is still a run (§3.3)");

      if (c.name === "chain") {
        if (!c.children.length) say("ChainEmpty", c.line, "a <chain> with no members");
        walk(c, true, c);
        return;
      }

      if (c.name === "invoke") {
        if (i !== 0)
          say("InvokeMisplaced", c.line,
              "<invoke> is child " + (i + 1) + " of <" + node.name + ">; it must be the first (§4.2)");
        const known = BY_ELEMENT && BY_ELEMENT[node.name];
        if (known && known.species === "atom")
          say("InvokeOnAtom", c.line,
              "<" + node.name + "> is " + known.canonical + ", an atom; only composites carry <invoke> (§4.3)");
        if (known && known.species === "composite" && "reads" in c.attrs && c.attrs.reads !== known.formula)
          say("ReadingUnfaithful", c.line,
              "reads=" + JSON.stringify(c.attrs.reads) + " but the store says " +
              JSON.stringify(known.formula) + " for " + known.canonical);
        return;
      }

      /* 10 — a segment wrapper is a direct child of the root and always says so */
      if (c.name === "block" && node === root && c.attrs.once !== "true")
        say("SegmentUnmarked", c.line, "a <block> directly under the root without once=\"true\"");

      /* 11 — a mood colours its whole segment, so it comes first */
      if (c.name === "mood" && i !== 0)
        say("MoodMisplaced", c.line,
            "<mood> is child " + (i + 1) + " of <" + node.name + ">; it must be the first (XML_REFERENCE §6)");

      /* 12 — exact string fidelity: the author's text is never reflowed */
      if (TEXT_BEARING.indexOf(c.name) !== -1 && c.text !== undefined &&
          (c.text !== c.text.trim() || /\n/.test(c.text)))
        say("TextReflowed", c.line,
            "<" + c.name + "> content was pretty-printed; guarantee G4 is exact string fidelity");

      walk(c, inChain && c.name === "chain", c);
    });
  })(root, false, root);

  return errs;
}

/* An EMS.json against ems-schema.json: every breach by name, nothing guessed. */
const EMS_SCHEMA = JSON.parse(fs.readFileSync(path.join(__dirname, "..", ".guidelines", ".sources", "ems-schema.json"), "utf8"));
function validateEms(cfg) {
  const S = EMS_SCHEMA, errs = [];
  if (!cfg || typeof cfg !== "object" || Array.isArray(cfg)) return ["EMS.json: not an object"];
  const typeOf = v => Array.isArray(v) ? "array" : v === null ? "null" : typeof v;
  S.required.forEach(k => { if (!(k in cfg)) errs.push("EMS.json: missing required key `" + k + "`"); });
  Object.keys(cfg).forEach(k => {
    if (S.required.indexOf(k) === -1 && S.optional.indexOf(k) === -1) errs.push("EMS.json: undeclared key `" + k + "`");
    else if (typeOf(cfg[k]) !== S.types[k]) errs.push("EMS.json." + k + ": " + typeOf(cfg[k]) + ", declared " + S.types[k]);
  });
  Object.keys(S.patterns).forEach(k => {
    if (typeof cfg[k] === "string" && !new RegExp(S.patterns[k]).test(cfg[k])) errs.push("EMS.json." + k + ": " + JSON.stringify(cfg[k]) + " is not of the declared form");
  });
  (Array.isArray(cfg.xsd) ? cfg.xsd : []).forEach((d, i) => {
    const p = "EMS.json.xsd[" + i + "]";
    if (!d || typeof d !== "object") { errs.push(p + ": not an object"); return; }
    S.xsd.required.forEach(k => { if (typeof d[k] !== "string") errs.push(p + ": `" + k + "` is not a string"); });
    if (S.xsd.kind.indexOf(d.kind) === -1) errs.push(p + ": kind " + JSON.stringify(d.kind) + " is not declared");
  });
  if (cfg.traffic && typeOf(cfg.traffic) === "object")
    Object.keys(cfg.traffic).forEach(k => {
      const p = "EMS.json.traffic." + k;
      if (!new RegExp(S.traffic.key).test(k)) errs.push(p + ": not an Order's number");
      const t = cfg.traffic[k];
      if (!t || typeOf(t) !== "object") { errs.push(p + ": not an object"); return; }
      Object.keys(t).forEach(f => { if (S.traffic.required.indexOf(f) === -1) errs.push(p + ": undeclared key `" + f + "`, the reads are derived"); });
      if (!Array.isArray(t.writes)) errs.push(p + ".writes: not an array");
    });
  if (cfg.invoke && typeOf(cfg.invoke) === "object")
    S.invoke.required.forEach(k => { if (!Array.isArray(cfg.invoke[k])) errs.push("EMS.json.invoke." + k + ": not an array"); });
  return errs;
}

/* the bundles under .guidelines/.orders, by path, and the gate's verdict on each */
const ORDERS = path.join(__dirname, "..", ".guidelines", ".orders");
const GATE_LOG = path.join(ORDERS, "GATE.json");
function gateVerdicts(checkSchema) {
  const found = [];
  (function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(e => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/^ORD-.*\.xml$/.test(e.name)) found.push(p);
    });
  })(ORDERS);
  const out = {};
  found.map(p => path.relative(path.join(__dirname, ".."), p).replace(/\\/g, "/")).sort().forEach(rel => {
    const xml = fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
    if (!/<glyph-package[\s>]/.test(xml)) { out[rel] = "not a glyph-package"; return; }
    const d = checkSchema(xml), fixes = d.filter(x => x.sev === "fix");
    const declared = (xml.match(/<declares\s/g) || []).length;
    /* a configuration names the engine its series bundles with (E3 a): the
       manifest beside the package says which one did */
    const cfg = /<configuration of="([^"]*)" digest="([^"]*)" engine="([^"]*)">/.exec(xml);
    if (cfg) {
      let man = null;
      try { man = JSON.parse(fs.readFileSync(path.join(__dirname, "..", rel.replace(/\.xml$/, ".manifest.json")), "utf8")); } catch (e) { /* none */ }
      if (!man || man.engine !== cfg[3]) { out[rel] = "fix configuration of " + cfg[1] + " names engine " + cfg[3] + ", bundled with " + (man ? man.engine : "no manifest"); return; }
    }
    out[rel] = fixes.length ? "fix " + fixes.map(x => x.code).join(", ")
      : d.some(x => x.code === "SchemaBeforeGate") ? "emitted before the gate"
      : (declared ? "agrees, " + declared + " declared" : "declares nothing") + (cfg ? ", configuration of " + cfg[1] : "");
  });
  return out;
}
function gateLog(verdicts) {
  return JSON.stringify({
    note: "written by node scripts/glyph-check.js --gate --write (EMS-002 ORD-0036); never edited by hand. " +
          "One verdict per bundle under .guidelines/.orders: its schema against its content. npm run check refuses " +
          "a bundle whose verdict is fix, and this file when it differs from a fresh run.",
    bundles: verdicts
  }, null, 2) + "\n";
}

export { validate, validatePackage, scan, SCHEMA, gateVerdicts, gateLog, validateEms, EMS_SCHEMA };

if (isMain(import.meta.url)) {
  const argv = process.argv.slice(2);
  const mode = argv[0];
  if (mode === "--ems") {
    let cfg;
    try { cfg = JSON.parse(fs.readFileSync(argv[1], "utf8")); }
    catch (e) { console.error("EMS.json: " + e.message); process.exit(1); }
    const errs = validateEms(cfg);
    if (errs.length) { errs.forEach(e => console.error("  \u2717 " + e)); process.exit(1); }
    console.log("conforms to ems-schema.json (" + cfg.id + ", engine " + cfg.engine + ")");
    process.exit(0);
  }
  if (mode === "--gate") {
    const { default: G } = await import("./glyph-parser.js");
    const verdicts = gateVerdicts(G.checkSchema), fresh = gateLog(verdicts);
    if (argv[1] === "--write") { fs.writeFileSync(GATE_LOG, fresh); console.log(Object.keys(verdicts).length + " bundles, the log written"); process.exit(0); }
    const bad = Object.keys(verdicts).filter(k => /^fix /.test(verdicts[k]));
    let held = "";
    try { held = fs.readFileSync(GATE_LOG, "utf8").replace(/\r\n/g, "\n"); } catch (e) { /* no log yet */ }
    if (bad.length || held !== fresh) {
      console.error("glyph-check --gate: " + (bad.length ? bad.length + " bundle(s) refused" : "") +
                    (held !== fresh ? (bad.length ? "; " : "") + ".guidelines/.orders/GATE.json differs from a fresh run: node scripts/glyph-check.js --gate --write" : ""));
      bad.forEach(k => console.error("  \u2717 " + k + ": " + verdicts[k]));
      process.exit(1);
    }
    process.exit(0);
  }
  if ((mode !== "--ast" && mode !== "--package") || !argv[1]) {
    console.error("usage: node glyph-check.js --ast     <file.json|->   an AST envelope");
    console.error("       node glyph-check.js --package <file.xml|->    an emitted glyph-package");
    process.exit(2);
  }
  let raw;
  try { raw = argv[1] === "-" ? fs.readFileSync(0, "utf8") : fs.readFileSync(argv[1], "utf8"); }
  catch (e) { console.error("cannot read " + argv[1] + ": " + e.message); process.exit(2); }
  if (mode === "--package") {
    const errs = validatePackage(raw);
    if (errs.length) {
      console.error("FAILED: " + errs.length + " refusal" + (errs.length > 1 ? "s" : "") +
                    " under .guidelines/.sources/PACKAGE_TARGET.md §6");
      errs.slice(0, 20).forEach(e => console.error("  ✗ " + e));
      if (errs.length > 20) console.error("  … and " + (errs.length - 20) + " more");
      process.exit(1);
    }
    console.log("conforms to PACKAGE_TARGET.md §6 (twelve clauses)");
    process.exit(0);
  }
  let env;
  try { env = JSON.parse(raw); }
  catch (e) { console.error("not JSON: " + e.message); process.exit(1); }

  const errs = validate(env);
  if (errs.length) {
    console.error("FAILED: " + errs.length + " violation" + (errs.length > 1 ? "s" : "") +
                  " of .guidelines/.sources/ast-schema.json");
    errs.slice(0, 20).forEach(e => console.error("  ✗ " + e));
    if (errs.length > 20) console.error("  … and " + (errs.length - 20) + " more");
    process.exit(1);
  }
  console.log("conforms to ast-schema.json (engine " + env.version + ", projection " + env.projection + ")");
}
