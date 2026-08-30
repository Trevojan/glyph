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
 * It validates against `.guidelines/ast-schema.json`, which is HAND-AUTHORED.
 * A schema generated from the engine would agree with the engine by
 * construction and catch nothing — the same trap D10 names for conformance
 * vectors. The corpus asserts the other direction, that what the engine emits
 * conforms, so the two hold each other the way XML_REFERENCE and D-03 do.
 *
 * The bundle mode that BUNDLE_TARGET §5 specifies is NOT here. It validates a
 * `glyph-package` bundle, and that format has no specification yet; a stub
 * would be the decorative gate this phase exists to avoid. It lands with E1.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const SCHEMA = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../.guidelines/ast-schema.json"), "utf8"));

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

module.exports = { validate: validate, schema: SCHEMA };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const mode = argv[0];
  if (mode !== "--ast" || !argv[1]) {
    console.error("usage: node glyph-check.js --ast <file.json|->");
    console.error("       the bundle mode of BUNDLE_TARGET §5 lands with E1, when the format has a specification.");
    process.exit(2);
  }
  let raw;
  try { raw = argv[1] === "-" ? fs.readFileSync(0, "utf8") : fs.readFileSync(argv[1], "utf8"); }
  catch (e) { console.error("cannot read " + argv[1] + ": " + e.message); process.exit(2); }
  let env;
  try { env = JSON.parse(raw); }
  catch (e) { console.error("not JSON: " + e.message); process.exit(1); }

  const errs = validate(env);
  if (errs.length) {
    console.error("FAILED: " + errs.length + " violation" + (errs.length > 1 ? "s" : "") +
                  " of .guidelines/ast-schema.json");
    errs.slice(0, 20).forEach(e => console.error("  ✗ " + e));
    if (errs.length > 20) console.error("  … and " + (errs.length - 20) + " more");
    process.exit(1);
  }
  console.log("conforms to ast-schema.json (engine " + env.version + ", projection " + env.projection + ")");
}
