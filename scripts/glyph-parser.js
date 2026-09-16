/**
 * Glyph Core v1.2.0 (glyph-parser.js)
 *
 * Single core of the chain  human → glyph → xml → machine.
 *
 * Through v1.8 there were two divergent parsers: this module (which only
 * emitted AST and dropped free text, chains, [logic] and ;;) and the parser
 * embedded in glyph-engine-alias.html (complete, but browser-locked, the
 * only one able to emit XML). v1.0.9 unified them: this file is the reference
 * implementation, and the HTML is a consumer of it.
 *
 * VERSION SCHEME — release.frontend.rules.minor, from v1.2.3.00 onward:
 *   1st  release   the line itself; moves when the whole thing is another thing
 *   2nd  frontend  the HTML/CSS/UI consumer
 *   3rd  rules     rules.json, template constraints, valency, vocabulary
 *   4th  minor     two digits (00, 11, 24, 42) for everything small
 * No digit resets any other. That is the whole point of the change: under the
 * old a.b.c.d, where a digit moving reset everything to its right, touching the
 * interface alone threw away the number the engine had earned — v1.3.0.0 plus a
 * batch of panels would have read v2.0.0.0, which says "new product" about an
 * afternoon of buttons. Digits now move on their own and stay where they are.
 *
 * The backend has no digit of its own. Parser work rides in `release` when it
 * changes what Glyph IS (v1.2.3.00 added fromXML, the inverse) and in `minor`
 * when it does not.
 *
 * Versions through v1.3.0.0 used the old a.b.c.d scheme and keep their numbers;
 * they are not renumbered, because a changelog records what happened.
 *
 * v1.1.0.0 — the vocabulary is now aligned to GLOSSARY.md, which is the
 * normative reference from here on. Three changes, all backend:
 *
 *   1. `BASE` the command became `CORE`. `BASE` stayed as the keyword in
 *      expansions.txt meaning "this is an atom" — the two used to collide on
 *      the same word and no expansion table could disambiguate them.
 *   2. Twelve commands the glossary declared but the engine never knew:
 *      FIND GET ADD SUB WHR (context ops), HGH LOW BOLD LIGHT (intensity),
 *      SWITCH (condition), GO (execution). Half the composition formulas in
 *      expansions.txt referenced them and could not resolve.
 *   3. The v1.7 fusions are undone. EVAL, REV, SPEC, SIMP, QST, FOREX and
 *      ONLYIF are commands in their own right again, each separated from the
 *      one it was folded into by a stated axis (object vs. act, or standard
 *      of comparison) — see .guidelines/.history/GLOSSARY_CLOSED.md §6.5.
 *
 * UMD: works in Node (require) and in the browser (window.GlyphCore).
 * As a CLI:  node glyph-parser.js "[crit[ctx]]" [--ast|--xml|--diag|--hgml|--from-xml]
 */

/* The UMD wrapper is gone. It existed so one file could serve Node through
   `require` and the browser through a bare `<script src>`, and the price was
   that the core had to stay ONE file — the browser has no `require`, so a
   split needed a bundler. That is D1 in HGML_PLAN, open since v1.1.

   ESM removes the reason for the bundler: the same `import` works in Node and
   in the browser. The global assignment below is kept anyway, because
   glyph-ui.js finds the core that way and rewriting the interface is not this
   change. */
import { LIMITS, esc, xesc, pad, lev, hgmlLit, walk, stripTags, valueChildren } from "./core/util.js";

import { CATS, INSTR, PTBR, CAT_OF, EDITORIAL_ONLY, ALIAS, ALIAS_OF, STRUCT, META, MODE, EMO, SESSION, LOGIC_OPS, PUNCT, FRAMES, NAMED_STRUCT, SLOTS, elName, GLOSS_REVERSE, GLOSS_COLLISIONS, ELEMENT_INPUT, ELEMENT_INPUT_COLLISIONS, EMO_REVERSE } from "./core/vocabulary.js";
import { VERSION } from "./core/version.js";

import { fromXML, fromAST } from "./core/inverse.js";
import { TEMPLATES, useTemplates, templateRegistry, EXPANSIONS, useExpansions, expansionRegistry, entryOf, speciesOf, depthOf, formulaOf, defOf, atomsOf, standsAlone, RULES, useRules } from "./core/stores.js";
import { NAME_CH, tokenize, classify, blendOf, suggest } from "./core/lexer.js";
import { RESERVED_WORDS, expandExpr, freeVars, parseLogic } from "./core/logic.js";
import { phName, collectFills, bindHoles, reparent, expandInvocations, constraintNames, checkTemplateConstraints } from "./core/templates.js";
import { pairKey, expandNames, compileRules, checkRules } from "./core/rules.js";
import { parse, BIND_NAME, bindingOf, collectBindings } from "./core/parser.js";
const GlyphCore = (function () {
  "use strict";

  /* ======================================================
     5. XML EMITTER — the message that travels to the machine
     ====================================================== */

  /* Ceilinged indent. Without the ceiling the XML grows with the SQUARE of
     depth: 500 levels turned into ~500 KB of whitespace, and the XML is
     exactly the thing that gets copied into the chat. Past the ceiling the
     structure stays readable through the tags themselves. */
  function buildXml(segments, opts) {
    if (!segments.length) return "<!-- escolha um molde ou escreva do lado esquerdo -->";
    /* one pass over the whole document, because the scope IS the whole
       document: a reference resolves to a binding written later as readily
       as to one written earlier */
    var o2 = {}, ok2;
    for (ok2 in (opts || {})) if (Object.prototype.hasOwnProperty.call(opts, ok2)) o2[ok2] = opts[ok2];
    o2.__binds = collectBindings(segments, null);
    opts = o2;
    var L = ["<glyph-package engine=\"" + VERSION + "\">", pad(1) + "<schema/>"];
    segments.forEach(function (sg) {
      if (sg.isReturn) {
        var exp = [], bad = [];
        collect(sg.children, exp, bad);
        L.push(pad(1) + "<block" + blockAttrs(sg) + ">");
        var head = '<user-expectative expects="' + xesc(exp.join(",")) + '"';
        /* `expects` is only the flattened summary. Through v1.0.9 it was ALL the
           return block emitted, so literals and nesting were discarded:
           `r-[tgt\`user command blocks\`` lost the whole text. The real body
           travels along with it now. */
        if (!sg.children.length) L.push(pad(2) + head + "/>");
        else {
          L.push(pad(2) + head + ">");
          // emit() already renders an unknown tier as <unresolved>, so `bad`
          // only serves to decide the summary — nothing gets emitted twice.
          sg.children.forEach(function (nd) { emit(nd, 3, L, opts); });
          L.push(pad(2) + "</user-expectative>");
        }
        L.push(pad(1) + "</block>");
        if (sg.breaks) L.push(pad(1) + "<break/>");
        return;
      }
      L.push(pad(1) + "<block" + blockAttrs(sg) + ">");
      if (sg.mood.length) {
        var a = ['dominant="' + xesc(sg.mood[0].gloss) + '"'];
        if (sg.mood.length > 1)
          a.push('also="' + xesc(sg.mood.slice(1).map(function (m) { return m.gloss; }).join(",")) + '"');
        L.push(pad(2) + "<mood " + a.join(" ") + "/>");
      }
      sg.children.forEach(function (nd) { emit(nd, 2, L, opts); });
      L.push(pad(1) + "</block>");
      if (sg.breaks) L.push(pad(1) + "<break/>");
    });
    L.push("</glyph-package>");
    return packagePass(L, opts).join("\n");
  }


  /* ---- glyph-package, the structural pass (E3b) ------------------------
     Sections 3 and 4 of PACKAGE_TARGET.md are shape, not content, so they run
     as one pass over the emitted lines rather than threading through `emit`.
     The same algorithm was validated against the hand-derived golden byte for
     byte BEFORE any emitter existed, which is the direction lock T5 demands.  */
  function packageIndent(s) { return s.length - s.replace(/^ +/, "").length; }

  /* The last line of the element that opens at L[i]: itself when the tag is
     self-closing, otherwise its matching close at the same indent. Used by the
     <holds> pass, which groups elements rather than lines. */
  function packageSpan(L, i) {
    var t = L[i].replace(/^ +/, "");
    if (t.charAt(0) !== "<" || t.indexOf("</") === 0 || /\/>\s*$/.test(t)) return i;
    var m = t.match(/^<([a-z-]+)/);
    if (!m) return i;
    var close = "</" + m[1] + ">", ind = packageIndent(L[i]);
    for (var j = i + 1; j < L.length; j++) {
      var ji = packageIndent(L[j]);
      if (ji < ind) return i;                                   /* left the element unclosed */
      if (ji === ind && L[j].replace(/^ +/, "") === close) return j;
    }
    return i;
  }

  function packagePass(L, opts) {
    /* 3 — a maximal run of siblings, first `extend` then `item`s, is one
       <chain>, and the attribute does not survive it: position carries it.
       A second `extend` opens a NEW run (3.4), which is what keeps `-`
       distinguishable from `,`. */
    var out = [];
    for (var i = 0; i < L.length; i++) {
      var line = L[i];
      if (!/\schain="extend"\s*\/>/.test(line)) { out.push(line); continue; }
      var ind = packageIndent(line), run = [line], j = i + 1;
      while (j < L.length && packageIndent(L[j]) === ind && /\schain="item"\s*\/>/.test(L[j])) {
        run.push(L[j]); j++;
      }
      var padding = new Array(ind + 1).join(" ");
      out.push(padding + "<chain>");
      for (var r = 0; r < run.length; r++)
        out.push("  " + run[r].replace(/\schain="(extend|item)"/, ""));
      out.push(padding + "</chain>");
      i = j - 1;
    }

    /* 3b — the same rule for `,` between BRACKETED siblings: a maximal run of
       a head plus its `join="item"` followers is one <holds>, and the attribute
       does not survive it because position carries the operator.

       It cannot reuse the loop above. A chain link is always a bare,
       self-closing line, so a run there is a run of LINES. A conjunction member
       is a bracketed element and spans from its open tag to its close, so this
       one groups SPANS. Same rule, different unit. */
    var held = [];
    for (var h = 0; h < out.length; h++) {
      var headStart = h, headEnd = packageSpan(out, h);
      var hInd = packageIndent(out[h]);
      /* only an element can head a run, and only a following sibling at the
         same indent carrying join="item" can continue it */
      var members = [], k = headEnd + 1;
      while (k < out.length && packageIndent(out[k]) === hInd && /\sjoin="item"[\s/>]/.test(out[k])) {
        var mEnd = packageSpan(out, k);
        members.push([k, mEnd]);
        k = mEnd + 1;
      }
      if (!members.length) { held.push(out[h]); continue; }
      var hp = new Array(hInd + 1).join(" ");
      held.push(hp + "<holds>");
      for (var q = headStart; q <= headEnd; q++) held.push("  " + out[q]);
      members.forEach(function (span) {
        for (var s = span[0]; s <= span[1]; s++)
          held.push("  " + out[s].replace(/\sjoin="item"/, ""));
      });
      held.push(hp + "</holds>");
      h = members[members.length - 1][1];
    }
    out = held;

    /* 4 — <invoke> is a leaf, first child of the element whose call it
       describes, and only where the command is composite: an atom's reading is
       its own name, and saying so on every element is a tautology with a cost. */
    var withInvokes = [];
    for (var m = 0; m < out.length; m++) {
      var l = out[m], t = l.replace(/^ +/, "");
      withInvokes.push(l);
      if (t.charAt(0) !== "<" || t.indexOf("</") === 0 || /\/>$/.test(t)) continue;
      var nm = (t.match(/^<([a-z-]+)[\s>]/) || [])[1];
      var hit = nm && GLOSS_REVERSE[nm];
      if (!hit || speciesOf(hit.canonical, opts) !== "composite") continue;
      withInvokes.push(new Array(packageIndent(l) + 3).join(" ") +
        '<invoke reads="' + xesc(formulaOf(hit.canonical, opts)) + '" species="composite" depth="' +
        depthOf(hit.canonical, opts) + '"/>');
    }
    return withInvokes;
  }


  function blockAttrs(sg) {
    return ' once="true"' + (sg.continues ? ' continues="previous"' : "");
  }

  function collect(list, acc, bad) {
    walk(list, function (nd) {
      if (!nd.canonical || nd.slotName) return;
      if (nd.tier === "unknown" || nd.tier === "empty") { if (bad) bad.push(nd); }
      else if (nd.canonical !== "PH") acc.push(elName(nd.canonical, nd.tier, nd.gloss));
    });
  }

  /* Iterative with an explicit stack. The recursive version overflowed the
     JS call stack around 2000 levels, and in Glyph depth grows with the
     query's size (every `[` without a `]` nests). A frame with `tail` holds
     the lines that close the node, pushed before the children so they come
     out after them. */
  function emit(root, startDepth, L, opts) {
    var stack = [{ nd:root, d:startDepth }];

    function pushKids(kids, d) {
      for (var i = kids.length - 1; i >= 0; i--) stack.push({ nd:kids[i], d:d });
    }

    while (stack.length) {
      var f = stack.pop();
      if (f.tail) { for (var t = 0; t < f.tail.length; t++) L.push(f.tail[t]); continue; }

      var nd = f.nd, d = f.d;

      if (nd.literal) {
        if (nd.form === "raw") { L.push(pad(d) + "<off>" + xesc(nd.v.trim()) + "</off>"); continue; }
        // value bound to a template slot: the slot's name travels along with it
        var slotAt = nd.boundSlot ? ' slot="' + xesc(nd.boundSlot) + '"' : "";
        var roleAt = nd.role === "result" ? ' role="result"' : "";
        /* A literal whose text IS a bound name is a reference to it. This is a
           table lookup, not an inference: the name exists because some command
           in this document bound it. The binding literal itself is excluded —
           it declares the name rather than referring to it. */
        var refAt = "";
        if (opts && opts.__binds && !nd.isBinder) {
          var refName = String(nd.v == null ? "" : nd.v).trim();
          if (refName && opts.__binds[refName]) refAt = ' ref="' + xesc(refName) + '"';
        }

        L.push(pad(d) + "<user-input" + slotAt + roleAt + refAt + ">" + xesc(nd.v) + "</user-input>");
        continue;
      }
      if (nd.text) { L.push(pad(d) + "<off>" + xesc(nd.v) + "</off>"); continue; }
      if (nd.mode) { pushKids(nd.children || [], d); continue; }
      /* verbatim: the body is text, and the element carries no children */
      if (nd.rawFence) { L.push(pad(d) + "<raw>" + xesc(nd.v || "") + "</raw>"); continue; }
      if (nd.logic) { emitLogic(nd.logic, d, L); continue; }

      if (nd.template) {
        var ta = ' name="' + xesc(nd.template) + '"' + (nd.isDef ? ' define="true"' : "") +
                 (nd.expanded ? ' expanded="true"' : "") +
                 (nd.expanded && nd.gloss ? ' means="' + xesc(nd.gloss) + '"' : "");
        var tkids = nd.children || [];
        if (!tkids.length) { L.push(pad(d) + "<template" + ta + "/>"); continue; }
        L.push(pad(d) + "<template" + ta + ">");
        stack.push({ tail:[pad(d) + "</template>"] });
        pushKids(tkids, d + 1);
        continue;
      }

      // empty template slot: the question travels in place of the answer
      if (nd.canonical === "PH") {
        var nameNode = (nd.children || []).filter(function (c) { return c.slotName; })[0];
        var qNode = (nd.children || []).filter(function (c) { return c.literal; })[0];
        L.push(pad(d) + "<needs" + (nameNode ? ' slot="' + xesc(nameNode.raw) + '"' : "") + ">" +
          xesc(qNode ? qNode.v : "sem resposta") + "</needs>");
        continue;
      }

      var open, closeName;
      /* `chain` records the operator that attached a BARE element, and only a
         bare one. A bracketed child already announces its own scope, so marking
         it too would force fromXML() to decide whether chain="extend" meant
         `-rwk` or `-[rwk]` — a second bit smuggled into one attribute. `-[`
         normalises to `[` instead, and the attribute means exactly one thing:
         this element was written bare, by this operator. */
      var chainAttr = (nd.chainElement && (nd.origin === "extend" || nd.origin === "item"))
        ? 'chain="' + nd.origin + '"' : null;

      /* `join` is to `,` between BRACKETED siblings what `chain` is to `-` and
         `,` between bare links. It existed nowhere, and the consequence was
         measured: `[simp'X'],[core]` and `[simp'X'][core]` — conjunction and
         sequence, which GLOSSARY §0.1 gives different readings — emitted the
         same bytes. The AST told them apart by `origin` and both derived
         projections threw the difference away.

         Like `chain`, it does not survive packagePass: <holds> groups the run
         and position carries the operator from there. */
      var joinAttr = (!nd.chainElement && nd.origin === "item") ? 'join="item"' : null;

      if (nd.tier === "unknown" || nd.tier === "empty") {
        var at = ['tag="' + xesc(nd.raw || "") + '"'];
        if (nd.suggestion) at.push('nearest="' + xesc(nd.suggestion.name.toLowerCase()) + '"');
        if (chainAttr) at.push(chainAttr);   /* so [in-zzz reads back as a chain link */
        if (joinAttr) at.push(joinAttr);     /* and [a],[zzz] as a conjunction member */
        open = "<unresolved " + at.join(" ");
        closeName = "unresolved";
      } else {
        var el = elName(nd.canonical, nd.tier, nd.gloss);
        var attrs = [];
        if (nd.editorial) attrs.push('force="editorial"');
        if (nd.colon) attrs.push('name="' + xesc(nd.colon) + '"');
        if (chainAttr) attrs.push(chainAttr);
        if (joinAttr) attrs.push(joinAttr);
        /* the name this command's result answers to, from its own operand */
        /* IMPERATIVO -- um primitivo que RECEBEU operando.

           Nao e especie nova: GLOSSARY §0 tem duas especies em dois eixos e
           uma celula vazia por construcao, entao um terceiro valor quebraria a
           legenda. E POSICAO, como `origin` e `role`.

           `[bold]` sozinho e uma marca. `[bold[ctx]]` e um primitivo mandando
           num operando, e ate agora o documento nao dizia isso -- saia com zero
           diagnosticos e nenhuma marca, aceitando em silencio um filho que o
           comando nunca foi declarado a receber.

           A vizinhanca nao basta: `[bold][ctx]` sao dois irmaos e nao ha
           imperativo ali. E a contencao que faz. */
        if (standsAlone(nd.canonical, opts) &&
            (nd.children || []).some(function (c) { return !!c.canonical && !c.chainElement; }))
          attrs.push('imperative="true"');
        var bindName = bindingOf(nd);
        if (bindName) attrs.push('binds="' + xesc(bindName) + '"');
        /* `describe` makes the message carry its own semantics, so whoever
           reads it does not need the Glyph vocabulary loaded to know what
           `<scrutinise>` means. Nothing here is invented: `means` is the gloss
           and `made-of` is the composition table, both already in the engine.

           Off by default — it changes the deliverable, and the plain form is
           the one every doc and every test describes. */
        if (opts && opts.describe) {
          /* A definição do glossário, não o rótulo do INSTR: `means="Review"`
             não acrescentava nada a `<review>`. Cai no rótulo só se a tabela
             de composição não estiver carregada. */
          var mean = defOf(nd.canonical, opts) || nd.gloss;
          if (mean) attrs.push('means="' + xesc(mean) + '"');
          var sp = speciesOf(nd.canonical, opts);
          if (sp === "composite") {
            /* Unique and sorted, not the raw sequence: as a signature of what
               the command IS, `ctx` appearing four times says nothing more
               than it appearing once — and the raw burn of SCRU is 64 items. */
            var seen = {}, uniq = [];
            (atomsOf(nd.canonical, opts) || []).forEach(function (a) {
              if (!seen[a]) { seen[a] = 1; uniq.push(a.toLowerCase()); }
            });
            attrs.push('made-of="' + xesc(uniq.sort().join(" ")) + '"');
          }
        }
        open = "<" + el + (attrs.length ? " " + attrs.join(" ") : "");
        closeName = el;
      }

      var kids = valueChildren(nd);

      /* ordered slots: each empty position travels as <needs slot="n"> */
      var slots = nd.chainElement ? null : SLOTS[nd.canonical];
      var slotNeeds = [];
      if (slots) {
        var got = kids.length + (nd.colon ? 1 : 0);
        for (var k = got; k < slots.length; k++) slotNeeds.push({ pos:k + 1, want:slots[k] });
      }

      var frame = slots ? null : FRAMES[nd.canonical];
      var needs = (frame && !nd.chainElement && kids.length === 0 && !nd.colon) ? frame[0].replace("*", "") : null;
      var allKids = nd.children || [];

      if (!allKids.length && !needs && !slotNeeds.length) { L.push(pad(d) + open + "/>"); continue; }

      L.push(pad(d) + open + ">");
      if (needs) L.push(pad(d + 1) + "<needs>" + xesc(needs) + "</needs>");

      var tail = [];
      slotNeeds.forEach(function (s) {
        tail.push(pad(d + 1) + '<needs slot="' + s.pos + '">' + xesc(s.want) + "</needs>");
      });
      tail.push(pad(d) + "</" + closeName + ">");
      stack.push({ tail:tail });
      pushKids(allKids, d + 1);
    }
  }

  function emitLogic(lg, d, L) {
    L.push(pad(d) + "<logic" + (lg.name ? ' name="' + xesc(lg.name) + '"' : "") + ">");
    lg.rules.forEach(function (r) {
      var at = ['kind="' + r.kind + '"'];
      if (r.name) at.push('var="' + xesc(r.name) + '"');
      L.push(pad(d+1) + "<rule " + at.join(" ") + ">");
      L.push(pad(d+2) + "<source>" + xesc(r.source) + "</source>");
      L.push(pad(d+2) + "<reads>" + xesc(r.reads) + "</reads>");
      if (r.then) L.push(pad(d+2) + "<then>" + xesc(r.then) + "</then>");
      if (r.uses && r.uses.length) L.push(pad(d+2) + "<uses>" + xesc(r.uses.join(", ")) + "</uses>");
      L.push(pad(d+1) + "</rule>");
    });
    lg.missing.forEach(function (v) {
      L.push(pad(d+1) + '<needs var="' + xesc(v) + '">usado e nunca definido</needs>');
    });
    L.push(pad(d) + "</logic>");
  }

  /** human → glyph → XML, in one call. */
  function toXML(src, opts) {
    return buildXml(parse(src, opts).segments, opts);
  }

  /* ======================================================
     6. AST JSON — clean serialization, no cycles
     ====================================================== */

  /* The shallow node, without `body` — the body gets filled by the iterative loop below. */
  /* ------------------------------------------------------------------ *
   * ck — a 64-bit checksum, in-core and declared
   *
   * Node's crypto is not reachable from the browser half of this engine, and
   * SubtleCrypto is async, which fights a synchronous serialiser. A hand-rolled
   * hash deserves a conscious yes, and this is it: two independent FNV-1a runs
   * over UTF-16 code units, different offset bases, concatenated. Declared here
   * so a port reproduces it bit for bit rather than inventing its own and
   * silently disagreeing about whether two stores are the same.
   * ------------------------------------------------------------------ */
  /* the AST envelope's own shape version, moved independently of the engine.
     Bumped when a field is added, removed or changes meaning — 2 because the
     `full`/`panel` split, `origin`, `at`, `slot` and `expanded` all landed at
     once and a reader of a v1 envelope must not be told it understands them. */
  var AST_SCHEMA = 2;

  /* A store is fingerprinted by its serialised form. Deterministic because the
     stores are parsed from files and JSON.stringify preserves that order; null
     when no store is loaded, which is itself the fact a receiver needs. */
  function storeCk(store) { return store ? ck(JSON.stringify(store)) : null; }

  function srcDescriptor(opts) {
    var t = (opts && typeof opts.__source === "string") ? opts.__source : null;
    if (t === null) return null;          /* serializeAST called without a source */
    var d = {
      length: t.length,
      checksum: ck(t),
      encoding: "utf-8",
      /* a receiver that rewrites line endings on the way in would invalidate
         every offset in the envelope, so the descriptor records which it was */
      newline: (t.indexOf("\r\n") !== -1)
        ? (new RegExp("[^\r]\n").test(t) ? "mixed" : "crlf") : "lf",
      uri: (opts && opts.uri) || null
    };
    if (opts && opts.embedSource === true) d.text = t;
    return d;
  }

  function ck(str) {
    var s = String(str == null ? "" : str);
    var a = 0x811c9dc5, b = 0x01000193, i, c;
    for (i = 0; i < s.length; i++) {
      c = s.charCodeAt(i);
      a ^= c; a = (a * 0x01000193) >>> 0;
      b ^= c + i; b = (b * 0x85ebca6b) >>> 0;
    }
    return ("00000000" + a.toString(16)).slice(-8) + ("00000000" + b.toString(16)).slice(-8);
  }

  function astShallow(nd) {
    /* `slot` is the template parameter this literal was bound to. It reached
       the XML as `<user-input slot="…">` and never reached the AST, so an
       expanded invocation could not be told from its own expansion — the second
       field fromAST proved missing from a projection called `full`. */
    /* `role` travels in the envelope too: the AST is the source of truth,
       and a fact the emitted document carries must not be one the envelope
       makes a reader re-derive. */
    if (nd.literal) return { type: nd.form === "raw" ? "Raw" : "Literal", value: nd.v,
                             form: nd.form, slot: nd.boundSlot || null,
                             role: nd.role || null };
    if (nd.text) return { type:"Text", value:nd.v };
    if (nd.mode) return { type:"ModeOff" };
    if (nd.rawFence) return { type:"Verbatim", value:String(nd.v == null ? "" : nd.v) };
    if (nd.logic) {
      return {
        type:"Logic",
        name: nd.logic.name || null,
        rules: nd.logic.rules.map(function (r) {
          return { kind:r.kind, line:r.line, name:r.name || null, source:r.source,
                   expr:r.expr, then:r.then || null, reads:r.reads, uses:r.uses || [] };
        }),
        missing: nd.logic.missing
      };
    }
    /* `expanded` was in the XML and not in the AST, which made an expanded
       invocation indistinguishable from a definition body — writing fromAST is
       what surfaced it: the reconstruction wrote out the whole expansion where
       the author had typed `[--germinate]`. A projection called `full` that is
       missing a field the XML carries is not full. */
    if (nd.template) return { type:"Template", name:nd.template,
                              isDefinition:!!nd.isDef, expanded:!!nd.expanded };
    return {
      type:"Command",
      raw: nd.raw,
      canonical: nd.canonical,
      tier: nd.tier,
      gloss: nd.gloss || "",
      element: (nd.tier === "unknown" || nd.tier === "empty") ? null : elName(nd.canonical, nd.tier, nd.gloss),
      isAlias: !!nd.alias,
      chainElement: !!nd.chainElement,
      /* The operator that produced the edge to the parent. The parser has
         always computed it; it was simply never exported, which is what made
         `[a-b,c]` and `[a-b-c]` serialise to one identical AST and left
         fromXML() unable to tell them apart. */
      origin: nd.origin || null,
      slotName: !!nd.slotName,
      editorial: !!nd.editorial,
      name: nd.colon || null,
      depth: nd.depth,
      autoClosed: !!nd.autoClosed,
      suggestion: nd.suggestion ? nd.suggestion.name : null,
      emotions: nd.emotions || [],
      /* v1.1.0.0 — null unless the expansion store is loaded. `depth` above is
         how deep this node sits in the USER's text; `compositionDepth` is how
         deep the command sits in the vocabulary. Different axes, both useful. */
      species: nd.species || null,
      compositionDepth: (nd.compositionDepth === undefined) ? null : nd.compositionDepth
    };
  }

  /* Nodes that carry `body`. Logic holds rules, not children. */
  function astHasBody(nd) { return !!(nd.mode || nd.template || (!nd.literal && !nd.text && !nd.logic && !nd.rawFence)); }

  /* Every node used to carry all sixteen fields whether or not they said
     anything: 43% of them were `false`, `null` or `[]`. A 321-character input
     produced 23 KB of AST, and a panel that long is a panel nobody reads.

     Dropped: anything empty, plus `raw` when it only repeats `canonical` in
     lower case. NOT dropped, even though derivable: `element` (the contract
     with the XML emitter), `depth` and `type`. Those are cheap and something
     downstream may switch on them — thinning a payload is not worth breaking
     a consumer over.

     The thinning applies to the `panel` projection only; the exported
     `full` projection keeps every field. See projectionOf(). */
  /* Two named projections, replacing a boolean.
   *
   *   full   every declared field, always present, no drop rules
   *   panel  the thinned shape, for the screen
   *
   * The distinction is load-bearing now that the AST is the source of truth
   * (T23). Under thinning, a field's ABSENCE means null, false, "" or [] — and
   * also "dropped because it repeated the canonical", and also "dropped because
   * this is an atom", and also "an older engine never had it". Six states in
   * one signal. That is survivable in a panel a human skims and fatal in a
   * payload that must be diffed against another machine's, or read back into
   * source: a reconstructor cannot tell a missing operand from a dropped one.
   *
   * So the EXPORT is `full` by default and `panel` is asked for explicitly, by
   * the screen, which is the only consumer that ever wanted it. `verbose:true`
   * kept as an alias for one release. */
  function projectionOf(opts) {
    if (opts && opts.projection === "panel") return "panel";
    if (opts && opts.projection === "full") return "full";
    if (opts && opts.verbose === true) return "full";   /* deprecated alias */
    if (opts && opts.verbose === false) return "panel"; /* deprecated alias */
    return "full";
  }

  function astLean(o) {
    var out = {}, k, v;
    for (k in o) {
      if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
      v = o[k];
      if (v === null || v === false || v === "" || (Array.isArray(v) && !v.length)) continue;
      if (k === "raw" && o.canonical && String(v).toUpperCase() === o.canonical) continue;
      if (k === "compositionDepth" && o.species === "atom") continue;   // átomo é sempre 0
      /* `origin` is a non-empty string on every node, so exporting it naively
         would put "root" or "nest" on the great majority of them and undo the
         thinning this function exists for. Both are derivable from position —
         root is a child of the segment, nest is a child of a command — while
         `extend` and `item` are not, and they are the whole reason the field
         is exported. The `full` projection keeps them, as it keeps everything. */
      if (k === "origin" && (v === "root" || v === "nest")) continue;
      out[k] = v;
    }
    return out;
  }

  /* Iterative for the same reason as emit: in a long block the tree is deep.

     The depth ceiling isn't a whim: even with iterative construction, V8's
     `JSON.stringify` recurses internally and overflows around a thousand
     levels. Since the AST is an inspection panel (the deliverable is the
     XML, which has no ceiling), truncating with an explicit marker beats
     bringing down the whole serialization. */
  function astNode(root, stats, opts) {
    var holder = [];
    var stack = [{ nd:root, arr:holder, d:0 }];
    while (stack.length) {
      var f = stack.pop();

      if (f.d >= LIMITS.astDepth) {
        var omitted = 0;
        walk([f.nd], function () { omitted++; });
        f.arr.push({ type:"Truncated", reason:"depth", atDepth:LIMITS.astDepth, omittedNodes:omitted, at:null });
        if (stats) stats.truncated += omitted;
        continue;
      }

      var obj = astShallow(f.nd);
      if (projectionOf(opts) === "panel") obj = astLean(obj);
      else {
        /* The span in the source that produced this node. Every token has
           carried `s`/`e` since the lexer was written and every node has
           carried its token — this is the same shape as `origin`: computed
           from the start, discarded at serialisation, and missed only once
           something outside the engine needed to read the result.

           It is what makes a diagnostic locatable by a reader who does not
           have the engine, and it is the substrate a trace is built on: given
           a span, which command; given a command, which span. `panel` does not
           get it, because the screen has the source in front of it. */
        obj.at = (f.nd.tok && typeof f.nd.tok.s === "number")
          ? { s: f.nd.tok.s, e: f.nd.tok.e } : null;
      }
      f.arr.push(obj);
      if (astHasBody(f.nd)) {
        obj.body = [];
        var kids = f.nd.children || [];
        for (var i = kids.length - 1; i >= 0; i--) stack.push({ nd:kids[i], arr:obj.body, d:f.d + 1 });
      }
    }
    return holder[0];
  }

  /* Serializes already-parsed segments. The raw nodes carry `parent` and
     `tok`, which close cycles — JSON.stringify straight on them overflows. */
  function serializeAST(segments, gaps, opts) {
    var stats = { truncated: 0 };
    var out = {
      type: "GlyphAST",
      /* `schema` is the SHAPE of this envelope; `version` is the engine that
         produced it. They were one field, and a reader had to pin an engine
         build to say "I understand this" — which is the wrong question. The
         repository already separates them elsewhere: expansions.json carries
         `schema: 2`, the dispatch carries `schema: 1`. */
      schema: AST_SCHEMA,
      version: VERSION,
      /* Store fingerprints, and this is the field most easily forgotten and
         the one that breaks a hand-off outright. `species`, `compositionDepth`
         and `def` are FUNCTIONS of expansions.json; `name` resolution is a
         function of templates.json. Re-import against a different store yields
         a different meaning for the same tree, silently — the exact defect
         class this order is named after. A receiver compares these and refuses,
         instead of discovering it later by being wrong. */
      /* A DESCRIPTOR, never the text. T12 keeps the source out of the general
         export — the surface where the XML is pasted does not read Glyph — but
         offsets with no anchor are unresolvable on arrival: a receiver cannot
         tell whether `at: {s:11,e:16}` belongs to the source in front of it.
         The descriptor lets it assert that and refuse otherwise, which makes
         T12's carve-out mechanical instead of a convention. `{embedSource:true}`
         adds the text, for the examples and teaching models T12 allows. */
      source: srcDescriptor(opts),
      stores: {
        templates: storeCk(opts && opts.templates ? opts.templates : TEMPLATES),
        rules: storeCk(opts && opts.rules ? opts.rules : RULES),
        expansions: storeCk(opts && opts.expansions ? opts.expansions : EXPANSIONS)
      },
      /* A reader must never have to infer which projection it was handed by
         noticing which fields happen to be absent — that inference is exactly
         what the thinning made impossible. The envelope says so. */
      projection: projectionOf(opts),
      segments: segments.map(function (s) {
        var seg = {
          type: "Segment",
          mood: s.mood,
          isReturn: !!s.isReturn,
          continues: !!s.continues,
          breaks: s.breaks,
          autoClosedCount: s.autoClosed
        };
        if (projectionOf(opts) === "panel") seg = astLean(seg);
        // not map(astNode) directly: map passes the index as the 2nd argument
        seg.body = s.children.map(function (nd) { return astNode(nd, stats, opts); });
        return seg;
      }),
      diagnostics: (gaps || []).map(function (g) {
        /* `at` was added to the gap record and stopped here, which is the same
           shape as `origin` and the same shape as the propagation failure this
           whole release is named after: the value existed, one consumer did not
           carry it, and the omission was invisible because nothing downstream
           could ask. A refusal a reader cannot locate is a refusal they cannot
           act on. */
        var d = { code:g.code, severity:g.sev, label:g.lab, message:g.plain };
        if (g.at && typeof g.at.s === "number") d.at = { s:g.at.s, e:g.at.e };
        return d;
      })
    };
    if (stats.truncated) {
      out.truncatedNodes = stats.truncated;
      /* The ceiling was justified in-comment by the AST being "an inspection
         panel": truncating a panel with a marker beats bringing the whole
         serialisation down. T23 retired that premise. A source of truth that
         silently omits part of itself is not one, and the marker sits deep in
         the tree where a reader has to already suspect it to find it.
         So in `full` the omission is announced at the envelope, at `fix`,
         where glyph-check refuses it and a human sees it first. `panel` keeps
         the quiet marker: the screen has the source next to it. */
      if (projectionOf(opts) === "full")
        out.diagnostics.push({
          code: "DepthExceeded", severity: "fix", label: "profundidade",
          message: "a árvore passa de " + LIMITS.astDepth + " níveis e " + stats.truncated +
                   " nós foram omitidos — este envelope não está completo e não deve ser " +
                   "carregado como se estivesse."
        });
    }
    return out;
  }

  function toAST(src, opts) {
    /* The envelope TRAVELS: it is read on another machine, by something that
       does not have this engine. So its diagnostics default to en-EU, and a
       caller that wants the pt-BR interface strings asks for them by name.
       The interface keeps pt-BR; the artefact does not. */
    var o0 = {};
    for (var k0 in (opts || {})) if (Object.prototype.hasOwnProperty.call(opts, k0)) o0[k0] = opts[k0];
    if (!o0.lang) o0.lang = "en";
    opts = o0;
    var r = parse(src, opts);
    var o = {};
    for (var k in (opts || {})) if (Object.prototype.hasOwnProperty.call(opts, k)) o[k] = opts[k];
    o.__source = String(src == null ? "" : src);
    return serializeAST(r.segments, r.gaps, o);
  }

  /* ======================================================
     7. .hgml — HIEROGLYPH MARKDOWN, the atomic burn

     What the XML emitter does NOT do: reduce. `<criticise>` travels as one
     tag, and whatever CRIT is *made of* stays implicit. .hgml burns the tree
     down to pure matter — every composite replaced by its formula, over and
     over, until only hieroglyphs are left.

     Two things make this cheap instead of a second language:

       1. A formula IS valid Glyph, so `parse()` reads it. No second grammar.
       2. The output is valid Glyph too, so it can be re-parsed — which gives
          a correctness oracle for free (see the round-trip bucket in the
          suite) instead of a hand-written expectation per case.

     Form: every tag opens WITHOUT `]` and closes with `[/name]`. That is not
     decoration — `]` already closes a command, so `[ctx][/ctx]` would emit an
     UnmatchedCloseTag. `[ctx[/ctx]` is the closed form.

     Cost: the burn is an EXPANSION, not a compression. A composite averages
     ~15 hieroglyphs and HYP reaches 101, so a short input grows about 25x.
     That is inherent to "100% hieroglyphs" — density and full decomposition
     pull in opposite directions, and this format chose decomposition.
     ====================================================== */

  var BURN_LIMIT = 24;          // safety net; the build already refuses cycles

  /* The human's operand is the subject of the whole formula (GLOSSARY.md §0.3).
     Concretely: it becomes the first child of the formula's head command. The
     rule has to be mechanical or the burn cannot be automated at all. */
  /* Structural equality on BURNT nodes — after reduction, so it compares
     meaning and not spelling. Two nodes are the same when they are the same
     atom carrying the same operands in the same order, or the same literal. */
  function burnSame(a, b) {
    if (!a || !b) return false;
    if (a.literal || b.literal) return !!(a.literal && b.literal) && a.v === b.v;
    if (a.canonical !== b.canonical) return false;
    var ac = a.children || [], bc = b.children || [];
    if (ac.length !== bc.length) return false;
    for (var i = 0; i < ac.length; i++) if (!burnSame(ac[i], bc[i])) return false;
    return true;
  }

  function injectSubject(body, operands) {
    if (!operands || !operands.length) return body;
    for (var i = 0; i < body.length; i++) {
      if (body[i].canonical) {
        /* An operand the formula ALSO produces is written once, not twice.
           `[rmbr[get[ctx]]'X']` burnt to `[alw [get[ctx]] 'X' [get[ctx]]]` —
           the author's copy plus RMBR's own `[ALW[GET[CTX]]]` — so the burn
           asserted the context is fetched twice, which the source never said.
           The glyphs said A and the hieroglyphs said B.

           Only the formula's copy is dropped, and the operands keep their
           position: `,` carries order (GLOSSARY §0.1, changed 2026-09-05), so
           collapsing two orders into one would trade a duplication for a
           different lie. This is the `uniq` half of the `made-of` rule at
           buildXml; the `sort` half deliberately does NOT apply here. */
        body[i].children = operands.concat(
          (body[i].children || []).filter(function (k) {
            return !operands.some(function (o) { return burnSame(o, k); });
          }));
        return body;
      }
    }
    return operands.concat(body);   // formula with no command head: prepend
  }

  var burnTruncated = false;
  var burnBlends = [];        /* what fired, so the output can declare itself */

  /* Co-occurrence among siblings in the burnt form. The burn is a canonical
     form, so this asks a question about MEANING and not about spelling. */
  function applyBlends(list, opts) {
    var store = (opts && opts.rules) || RULES;
    if (!store) return list;
    var comp = store.__compiled || (store.__compiled = compileRules(store));
    if (!comp || !comp.blends.length || !list.length) return list;
    var out = list, i;
    for (i = 0; i < comp.blends.length; i++) {
      var b = comp.blends[i];
      var present = b.when.every(function (c) {
        return out.some(function (n) { return n.canonical === c; });
      });
      if (!present) continue;
      var kids = [];
      var kept = out.filter(function (n) {
        if (b.when.indexOf(n.canonical) !== -1) {
          (n.children || []).forEach(function (k) { kids.push(k); });
          return false;
        }
        return true;
      });
      if (burnBlends.indexOf(b) === -1) burnBlends.push(b);
      kept.push({ canonical: b.emit, blended: true, children: kids });
      out = kept;
    }
    return out;
  }

  function burnList(list, opts, chain, depth) {
    var out = [];
    depth = depth || 0;
    /* the same ceiling the AST uses, so the three projections agree on what
       deep means. Announced rather than survived: a burn that stops silently
       is the class of defect this release exists to remove. */
    if (depth > LIMITS.astDepth) { burnTruncated = true; return out; }
    (list || []).forEach(function (nd) {
      /* Literals are what the human actually said — they survive. Free prose
         does not: it is not vocabulary, and .hgml is hieroglyphs only. */
      if (nd.literal) { if (nd.form !== "raw") out.push(nd); return; }
      if (nd.text)    { if (opts && opts.keepText) out.push(nd); return; }
      if (nd.mode)    { out = out.concat(burnList(nd.children, opts, chain, depth + 1)); return; }
      if (nd.rawFence){ out.push(nd); return; }
      if (nd.logic)   { out.push(nd); return; }
      /* A template invocation already expanded during parse(); what is left
         is the shell, so the burn walks straight through it. */
      if (nd.template) { out = out.concat(burnList(nd.children, opts, chain, depth + 1)); return; }
      if (!nd.canonical) return;

      var e = entryOf(nd.canonical, opts);

      /* The operands are burnt FIRST, under the CURRENT chain — before the
         formula is opened. This is not an optimisation, it is the difference
         between working and not: an operand is not part of the formula it is
         passed to, so it must not inherit that formula's chain.

         `[rmbr[fbk]]` inside HYP's formula is RMBR receiving FBK as argument.
         Burning the argument after injecting it made FBK look like something
         RMBR's formula contains, and since FBK's formula does mention RMBR,
         the guard read a cycle that is not there — HYP → RMBR → FBK → RMBR —
         and stopped with RMBR unreduced. Burning arguments first keeps the two
         relationships apart: containment extends the chain, argument does not. */
      var operands = burnList(nd.children || [], opts, chain, depth + 1);

      if (!e || e.species === "atom") {
        out.push({ canonical: nd.canonical, children: operands });
        return;
      }

      var key = String(nd.canonical).toUpperCase();
      if (chain.indexOf(key) !== -1 || chain.length >= BURN_LIMIT) {
        /* Only reachable from a hand-edited store: build-templates.js refuses
           to generate a table with cycles. Emitting the node unburned beats
           looping, and the marker says the output is not fully reduced. */
        out.push({ canonical: key, children: operands, unburned: true,
                   via: chain.concat(key).join(" → ") });
        return;
      }

      var sub = parse(e.formula, {
        session: opts && opts.session,
        valency: false,          // a formula is a definition, not a request
        expansions: (opts && opts.expansions) || EXPANSIONS
      });
      var body = [];
      sub.segments.forEach(function (s) { body = body.concat(s.children); });

      /* Burn the formula body, then inject the already-atomic operands. */
      var burnedBody = burnList(body, opts, chain.concat(key));
      out = out.concat(injectSubject(burnedBody, operands));
    });
    return applyBlends(out, opts);
  }

  /* Walks the burnt tree and reports what came out of it. Counted here rather
     than during the burn because operands are burnt before their formula, so
     an in-flight counter double-counts them. */
  function burnStats(list, acc) {
    acc = acc || { atoms:0, literals:0, unburned:0, via:[] };
    (list || []).forEach(function (nd) {
      if (nd.literal || nd.text) acc.literals++;
      else if (nd.canonical) {
        if (nd.unburned) { acc.unburned++; acc.via.push(nd.via); }
        else acc.atoms++;
      }
      burnStats(nd.children, acc);
    });
    return acc;
  }

  function hgmlLines(list, d, L) {
    (list || []).forEach(function (nd) {
      if (nd.literal) { L.push(pad(d) + "'" + hgmlLit(nd.v) + "'"); return; }
      if (nd.text)    { L.push(pad(d) + "'" + hgmlLit(nd.v) + "'"); return; }
      if (nd.rawFence){ L.push(pad(d) + "[raw[/raw]"); return; }
      if (nd.logic)   { L.push(pad(d) + "[logic" + (nd.logic.name ? "-" + nd.logic.name : "") + "[/logic]"); return; }
      var name = String(nd.canonical || "?").toLowerCase();
      var kids = nd.children || [];
      if (!kids.length) { L.push(pad(d) + "[" + name + "[/" + name + "]"); return; }
      L.push(pad(d) + "[" + name);
      hgmlLines(kids, d + 1, L);
      L.push(pad(d) + "[/" + name + "]");
    });
  }

  /**
   * burn(segments, opts) — the tree reduced to hieroglyphs.
   * Returns { segments:[{children}], stats }.
   */
  function burn(segments, opts) {
    opts = opts || {};
    var out = (segments || []).map(function (sg) {
      return { children: burnList(sg.children, opts, []), isReturn: !!sg.isReturn, breaks: sg.breaks };
    });
    var acc = { atoms:0, literals:0, unburned:0, via:[] };
    out.forEach(function (sg) { burnStats(sg.children, acc); });
    return { segments: out, stats: acc };
  }

  /** human → glyph → .hgml, in one call. */
  function toHGML(src, opts) {
    opts = opts || {};
    if (!expansionRegistry(opts))
      return "# sem tabela de composição: carregue expansions.json (useExpansions)";
    burnTruncated = false;
    burnBlends = [];
    var b = burn(parse(src, opts).segments, opts);
    var L = [];
    b.segments.forEach(function (sg, i) {
      if (i) L.push("");
      hgmlLines(sg.children, 0, L);
    });
    /* An invented element that cannot say what it means moves the
       interpretation problem one step along instead of solving it — the trap
       HGML_PLAN names. A blend is refused at compile time without a `means`,
       and the burn that used one declares it here, so the output explains
       itself to a reader who does not have rules.json. */
    if (burnBlends.length) {
      var decl = ["# patterns applied to this burn:"];
      burnBlends.forEach(function (b) {
        decl.push("#   [" + b.emit + "  <- " + b.when.join(" + ") + "  " + b.means);
      });
      decl.push("#");
      L = decl.concat(L);
    }
    if (burnTruncated)
      L.unshift("# truncated at " + LIMITS.astDepth + " levels — this burn is incomplete.");
    return L.join("\n");
  }



  return {
    VERSION: VERSION,
    CATS: CATS, INSTR: INSTR, ALIAS: ALIAS, ALIAS_OF: ALIAS_OF, STRUCT: STRUCT,
    META: META, MODE: MODE, EMO: EMO, SESSION: SESSION, FRAMES: FRAMES,
    EDITORIAL_ONLY: EDITORIAL_ONLY, PTBR: PTBR, CAT_OF: CAT_OF,
    LOGIC_OPS: LOGIC_OPS, PUNCT: PUNCT, NAMED_STRUCT: NAMED_STRUCT,
    tokenize: tokenize, classify: classify, suggest: suggest, lev: lev, elName: elName,
    expandExpr: expandExpr, freeVars: freeVars, parseLogic: parseLogic,
    parse: parse, walk: walk,
    useTemplates: useTemplates, templateRegistry: templateRegistry,
    useRules: useRules,
    useExpansions: useExpansions, expansionRegistry: expansionRegistry,
    speciesOf: speciesOf, depthOf: depthOf, formulaOf: formulaOf, atomsOf: atomsOf,
    standsAlone: standsAlone,
    defOf: defOf,
    buildXml: buildXml, toXML: toXML, toAST: toAST, serializeAST: serializeAST,
    burn: burn, toHGML: toHGML,
    fromXML: fromXML, fromAST: fromAST, elementCanonicalMap: GLOSS_REVERSE, glossCollisions: GLOSS_COLLISIONS,
    esc: esc, xesc: xesc
  };
})();

export default GlyphCore;
/* the browser reads it as a global, and check-globals.js knows this shape */
globalThis.GlyphCore = GlyphCore;

/* Run directly, this file used to be the command line. The CLI moved to
   glyph-cli.js — it was the only part of the core that touched the filesystem,
   and the seam graph says it is the only piece nothing else depends on.
   Delegating to it from here would import a module that imports this one, so
   the pointer is a message rather than a cycle. */
if (typeof process !== "undefined" && process.argv && process.argv[1] &&
    import.meta.url === "file://" + process.argv[1].replace(/\\/g, "/").replace(/^([A-Za-z]:)/, "/$1")) {
  console.error("the command line moved to glyph-cli.js:\n  node scripts/glyph-cli.js " +
                (process.argv.slice(2).map(a => JSON.stringify(a)).join(" ") || '"<source>" --xml'));
  process.exit(2);
}
