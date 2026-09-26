/**
 * glyph-transport.js — the page's engine, behind one switch (EMS-001 ORD-0011).
 *
 * With `engine=relay` in the page's address, the twelve calls glyph-ui.js
 * makes go to `POST /engine` on the page's own origin, which serve-dev.js
 * relays to the Rust `glyph-engine` (`--engine rust`) or to glyph-protocol.js
 * (ADR B). Without it the page runs on the JS core, untouched. Only the calls
 * are swapped, on the same GlyphCore object and before glyph-ui.js reads it;
 * the tables, `esc`, `xesc` and `walk` stay the JS core's.
 *
 * `run()` is synchronous, so each call is a synchronous request. `parse`
 * cannot receive the live tree: it answers the full envelope, and the
 * segments are rebuilt from it with the fields the page reads; the source
 * they came from is remembered, so `buildXml` and `serializeAST` ask `toXML`
 * and `toAST` of that source. The engine answers with the repository's
 * stores, so templates a page merges stay on the JS path.
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

export function relayCore() {
  const from = new WeakMap();           /* tokens or segments → the source and its options */
  const lang = o => (o && o.lang) || "pt";
  const session = o => (o && o.session === false ? { session: false } : {});
  return {
    tokenize(src) {
      const text = String(src == null ? "" : src), t = ask({ call: "tokenize", src: text });
      from.set(t, { src: text });
      return t;
    },
    classify: (name, o) => ask({ call: "classify", name: name, lang: lang(o), ...session(o) }),
    suggest: name => ask({ call: "suggest", name: name }),
    elName: (canonical, tier, gloss) => ask({ call: "elName", canonical: canonical, tier: tier, gloss: gloss }),
    parseLogic: (name, body) => ask({ call: "parseLogic", name: name, body: body }),
    expandExpr: raw => ask({ call: "expandExpr", raw: raw }),
    freeVars: raw => ask({ call: "freeVars", raw: raw }),
    parse(input, o) {
      const src = typeof input === "string" ? input : (from.get(input) || { src: "" }).src;
      const r = ask({ call: "parse", src: src, lang: lang(o), ...session(o) });
      const segments = r.ast.segments.map(sg => {
        const s = node(sg);
        delete s.children;
        return { ...s, children: (sg.body || []).map(node) };
      });
      from.set(segments, { src: src, o: { lang: lang(o), ...session(o) } });
      return { segments: segments, gaps: r.gaps, tokens: Array.isArray(input) ? input : [] };
    },
    buildXml: (segments, o) => ask({ call: "toXML", src: (from.get(segments) || { src: "" }).src,
                                     describe: !!(o && o.describe === true) }),
    serializeAST(segments, gaps, o) {
      const f = from.get(segments) || { src: "", o: {} };
      const a = ask({ call: "toAST", src: f.src, projection: o && o.projection, ...f.o });
      a.source = null;                  /* serializeAST is handed no source, so it describes none */
      return a;
    },
    toHGML: (src, o) => ask({ call: "toHGML", src: src, lang: lang(o) }),
    fromXML: (xml, o) => ask({ call: "fromXML", xml: xml, lang: lang(o) })
  };
}

if (RELAY && globalThis.GlyphCore) Object.assign(globalThis.GlyphCore, relayCore());
