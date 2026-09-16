/**
 * core/burn.js — the .hgml: the tree reduced to hieroglyphs.
 *
 * burnList substitutes every composite by its formula, operands burnt first
 * and then injected into the formula's head (GLOSSARY §0.3); applyBlends
 * folds co-occurring atoms into the one element rules.json declares; hgmlLines
 * writes the closed form `[name … [/name]`. β terminates because the
 * composition DAG is acyclic and every expansion strictly lowers depth
 * (INTAKE-FORMAL-ANALYSIS.md §1.1); it is linear in the output, and the
 * output is at most 97× the input. A projection: reads the tree, never
 * writes the one parse() returned — the formula bodies it rewrites are its
 * own fresh parses.
 */

import { LIMITS, pad, hgmlLit } from "./util.js";
import { EXPANSIONS, RULES, expansionRegistry, entryOf } from "./stores.js";
import { parse } from "./parser.js";
import { compileRules } from "./rules.js";

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

export var BURN_LIMIT = 24;          // safety net; the build already refuses cycles

/* The human's operand is the subject of the whole formula (GLOSSARY.md §0.3).
   Concretely: it becomes the first child of the formula's head command. The
   rule has to be mechanical or the burn cannot be automated at all. */
/* Structural equality on BURNT nodes — after reduction, so it compares
   meaning and not spelling. Two nodes are the same when they are the same
   atom carrying the same operands in the same order, or the same literal. */
export function burnSame(a, b) {
  if (!a || !b) return false;
  if (a.literal || b.literal) return !!(a.literal && b.literal) && a.v === b.v;
  if (a.canonical !== b.canonical) return false;
  var ac = a.children || [], bc = b.children || [];
  if (ac.length !== bc.length) return false;
  for (var i = 0; i < ac.length; i++) if (!burnSame(ac[i], bc[i])) return false;
  return true;
}

export function injectSubject(body, operands) {
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

export var burnTruncated = false;
export var burnBlends = [];        /* what fired, so the output can declare itself */

/* Co-occurrence among siblings in the burnt form. The burn is a canonical
   form, so this asks a question about MEANING and not about spelling. */
export function applyBlends(list, opts) {
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

export function burnList(list, opts, chain, depth) {
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
export function burnStats(list, acc) {
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

export function hgmlLines(list, d, L) {
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
export function burn(segments, opts) {
  opts = opts || {};
  var out = (segments || []).map(function (sg) {
    return { children: burnList(sg.children, opts, []), isReturn: !!sg.isReturn, breaks: sg.breaks };
  });
  var acc = { atoms:0, literals:0, unburned:0, via:[] };
  out.forEach(function (sg) { burnStats(sg.children, acc); });
  return { segments: out, stats: acc };
}

/** human → glyph → .hgml, in one call. */
export function toHGML(src, opts) {
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
