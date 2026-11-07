/**
 * glyph-transport.js — the page's engine, behind one switch (EMS-001 ORD-0011).
 *
 * With `engine=relay` in the page's address, the calls glyph-ui.js makes go to
 * `POST /engine` on the page's own origin, one request each, which serve-dev.js
 * relays to the Rust `glyph-engine` (`--engine rust`) or to glyph-protocol.js
 * (ADR B). Without it the page runs on the JS core, untouched. Only the calls and
 * the tables are swapped, on the same GlyphCore object and before glyph-ui.js
 * reads it; `esc`, `xesc` and `walk` stay the JS core's.
 *
 * The tables are the engine's, asked once, at load (EMS-002 ORD-0032, the Regent
 * on 2026-10-21), and `classify` answers from them with no request — one a
 * command token, it was 8 005 requests a keystroke on L-01 (EMS-002 ORD-0010).
 * The calls are swapped first, so a page whose engine does not answer throws on
 * every call, and none falls to the JS.
 *
 * `run()` is synchronous, so each call is a synchronous request. `parse`
 * cannot receive the live tree: it answers the full envelope, and the
 * segments are rebuilt from it with the fields the page reads, and the count
 * of commands travels beside them, since the envelope stops at
 * LIMITS.astDepth and the tree it rebuilds stops there too; the source
 * they came from is remembered, so `buildXml` and `serializeAST` ask `toXML`
 * and `toAST` of that source.
 *
 * The engine answers with the stores of its machine. `useTemplates` asks nothing:
 * it remembers the templates the page merged that differ from the engine's, and a
 * request that reads templates carries them, named by their digest (question 11
 * of the EMS-001 return, answered c).
 */
"use strict";

export const RELAY = typeof location !== "undefined" &&
  new URLSearchParams(location.search).get("engine") === "relay";

/* one request line, one answer; what the engine throws is thrown here */
export function ask(q) {
  const x = new XMLHttpRequest();
  x.open("POST", "/engine", false);
  x.send(JSON.stringify(q));
  const a = JSON.parse(x.responseText);
  if ("thrown" in a) throw new Error(a.thrown);
  return a.ok;
}

/* an envelope node as the live tree spells it: `body` is `children`, a
   literal's `value` is `v` */
export function node(n) {
  const o = {};
  for (const k in n) if (k !== "type" && k !== "body" && k !== "value") o[k] = n[k];
  if (n.type === "Literal" || n.type === "Raw") { o.literal = true; o.v = n.value; if (n.type === "Raw") o.form = "raw"; }
  if (n.type === "Text") { o.text = true; o.v = n.value; }
  o.children = (n.body || []).map(node);
  return o;
}

/* the engine's tables, asked once; a request that failed is asked again */
let held = null;
const engineTables = () => held || (held = ask({ call: "tables" }));

/* lexer.js's classify over the tables the engine answered: the JS stays the
   reference until it leaves, so the core does not change for this, and RL-18 holds
   the two equal on every name */
function classifyFrom(t, name, opts) {
  opts = opts || {};
  const U = String(name || "").toUpperCase(), L = String(name || "").toLowerCase();
  if (!name) return { tier: "empty", canonical: "", gloss: "" };
  if (t.MODE[U]) return { tier: "mode", canonical: U, gloss: t.MODE[U] };
  if (t.STRUCT[U]) return { tier: "struct", canonical: U, gloss: t.STRUCT[U] };
  if (t.META[U]) return { tier: "meta", canonical: U, gloss: t.META[U] };
  if (t.ALIAS[U]) {
    const f = t.ALIAS[U];
    return { tier: "instr", canonical: f, alias: true, aliasOf: f, gloss: t.INSTR[f], merged: !!t.INSTR[U] };
  }
  if (t.INSTR[U]) return { tier: "instr", canonical: U, gloss: t.INSTR[U] };
  const byEl = t.ELEMENT_INPUT[U.replace(/[^A-Z0-9]+/g, "")];
  if (byEl) {
    const tb = byEl.tier === "mode" ? t.MODE : byEl.tier === "struct" ? t.STRUCT : byEl.tier === "meta" ? t.META : t.INSTR;
    return { tier: byEl.tier, canonical: byEl.canonical, alias: true, aliasOf: byEl.canonical, gloss: tb[byEl.canonical] };
  }
  if (opts.session !== false && t.SESSION[L]) return { tier: "session", canonical: L, gloss: t.SESSION[L] };
  const bl = t.BLENDS.find(r => String(r.emit || "").toUpperCase() === U);
  if (bl) return { tier: "blend", canonical: U, gloss: bl.means || bl.id, blendId: bl.id };
  return { tier: "unknown", canonical: U, gloss: "" };
}

/* `given` and `send` are what a test hands in; the page has neither */
export function relayCore(given, send) {
  const request = send || ask;
  const tables = () => given || engineTables();
  const from = new WeakMap();           /* tokens or segments → the source and its options */
  let differ = null;                    /* what the page merged that the engine holds otherwise */
  const lang = o => (o && o.lang) || "pt";
  const session = o => (o && o.session === false ? { session: false } : {});
  const stores = q => (differ ? { ...q, differ: differ } : q);
  return {
    classify: (name, o) => classifyFrom(tables(), name, o),
    useTemplates(store) {
      const all = (store && store.templates) || store || {}, engine = tables().templates, kept = {};
      Object.keys(all).forEach(k => {
        if (JSON.stringify(all[k]) !== JSON.stringify(engine[k])) kept[k] = all[k];
      });
      differ = Object.keys(kept).length ? { digest: globalThis.GlyphCore.ck(JSON.stringify(kept)), templates: kept } : null;
      return all;
    },
    tokenize(src) {
      const text = String(src == null ? "" : src), t = request({ call: "tokenize", src: text });
      from.set(t, { src: text });
      return t;
    },
    suggest: name => request({ call: "suggest", name: name }),
    elName: (canonical, tier, gloss) => request({ call: "elName", canonical: canonical, tier: tier, gloss: gloss }),
    parseLogic: (name, body) => request({ call: "parseLogic", name: name, body: body }),
    expandExpr: raw => request({ call: "expandExpr", raw: raw }),
    freeVars: raw => request({ call: "freeVars", raw: raw }),
    parse(input, o) {
      const src = typeof input === "string" ? input : (from.get(input) || { src: "" }).src;
      const r = request(stores({ call: "parse", src: src, lang: lang(o), ...session(o) }));
      const segments = r.ast.segments.map(sg => {
        const s = node(sg);
        delete s.children;
        return { ...s, children: (sg.body || []).map(node) };
      });
      from.set(segments, { src: src, o: { lang: lang(o), ...session(o) } });
      return { segments: segments, gaps: r.gaps, tokens: Array.isArray(input) ? input : [], commands: r.commands };
    },
    buildXml: (segments, o) => request(stores({ call: "toXML", src: (from.get(segments) || { src: "" }).src,
                                                describe: !!(o && o.describe === true) })),
    serializeAST(segments, gaps, o) {
      const f = from.get(segments) || { src: "", o: {} };
      const a = request(stores({ call: "toAST", src: f.src, projection: o && o.projection, ...f.o }));
      a.source = null;                  /* serializeAST is handed no source, so it describes none */
      return a;
    },
    toHGML: (src, o) => request(stores({ call: "toHGML", src: src, lang: lang(o) })),
    fromXML: (xml, o) => request({ call: "fromXML", xml: xml, lang: lang(o) })
  };
}

if (RELAY && globalThis.GlyphCore) {
  Object.assign(globalThis.GlyphCore, relayCore());
  const { ELEMENT_INPUT, BLENDS, templates, ...read } = engineTables();
  Object.assign(globalThis.GlyphCore, read);
  /* the list the page offers and merges over is the engine's */
  if (globalThis.GlyphTemplates) globalThis.GlyphTemplates.templates = templates;
}
