/**
 * core/rules.js — contradictions: the criterion for "commands don't contradict
 * each other", as a finite external table.
 *
 * compileRules reads rules.json once (pair, order, precondition, blend);
 * checkRules walks the tree against it. `hard` becomes `fix`, `tension`
 * becomes `ask`. Editing the file changes the rule without touching code —
 * the blend that fires in the burn is compiled here too, and read there.
 */

import { esc, walk } from "./util.js";
import { rulesOf } from "./stores.js";


/* ======================================================
   3c. CONTRADICTIONS

   The criterion that was missing for "commands don't contradict each
   other". Finite, external table (rules.json): editing the file
   changes the rule, without touching code. `hard` becomes `fix`, `tension`
   becomes `ask`.
   ====================================================== */

export function pairKey(a, b) { return a < b ? a + "|" + b : b + "|" + a; }

/* Resolves "@className" against the classes table; a bare name is itself. */
export function expandNames(store, name) {
  if (String(name).charAt(0) !== "@") return [name];
  return ((store.classes || {})[String(name).slice(1)] || []).slice();
}

export function compileRules(store) {
  var c = { pairs:{}, order:[], pre:[], blends:[] };
  (store.rules || []).forEach(function (r) {
    if (r.kind === "pair") { c.pairs[pairKey(r.a, r.b)] = r; return; }
    /* `blend` is the pattern layer: co-occurrence in the BURNT form maps to
       one richer element. It matches the way `pair` does and emits instead
       of diagnosing, and it is written over the 88 atoms — so a pattern is
       invariant to which surface synonym the author happened to type, which
       is the property that makes it tractable at all.

       HGML_PLAN names one trap: an invented element that cannot say what it
       means moves the interpretation problem one step along instead of
       solving it. So a blend with no `means` is REFUSED at compile time
       rather than warned about. A trap you can walk into is not closed. */
    if (r.kind === "blend") {
      if (!r.means || !r.emit || !(r.when && r.when.length >= 2)) return;
      var when = [];
      r.when.forEach(function (nm) {
        expandNames(store, nm).forEach(function (x) { when.push(x); });
      });
      c.blends.push({ rule:r, when:when, emit:r.emit, means:r.means });
      return;
    }
    if (r.kind === "order") {
      /* `first` must not match itself: it is usually a member of the very
         class named in `then` (ELAB is part of @thinking). */
      var then = expandNames(store, r.then).filter(function (n) { return n !== r.first; });
      c.order.push({ rule:r, first:r.first, then:then });
      return;
    }
    if (r.kind === "precondition") {
      var accept = {};
      (r.requiresBefore || []).forEach(function (n) {
        expandNames(store, n).forEach(function (x) { accept[x] = 1; });
      });
      c.pre.push({ rule:r, target:r.target, accept:accept });
    }
  });
  return c;
}

export function checkRules(segments, opts, G) {
  var store = rulesOf(opts);
  if (!store) return;
  var C = store.__compiled || (store.__compiled = compileRules(store));
  var exempt = {};
  ((store.scope && store.scope.exemptUnder) || []).forEach(function (x) { exempt[x] = 1; });
  var seen = {};

  /* Under an explicit [ovr] or [byp] the overlap was requested on purpose. */
  function underExempt(nd) {
    var p = nd.parent, hops = 0;
    while (p && hops++ < 64) { if (exempt[p.canonical]) return true; p = p.parent; }
    return false;
  }

  /* `why` and `suggest` are already en-EU in rules.json; only this assembly
     was pt-BR, which is why a rule diagnostic read half in each language.
     Both are built, and `opts.lang` picks — the artefact travels in en-EU
     while the interface keeps pt-BR. */
  function fire(r, id, msg, enMsg) {
    if (seen[id]) return;
    seen[id] = 1;
    G(r.severity || "ask", r.label || "regra",
      msg + (r.suggest ? " <em>Sugestão: " + esc(r.suggest) + "</em>" : ""),
      "Rule:" + r.id, r.label || "rule",
      (enMsg || msg) + (r.suggest ? " <em>Suggestion: " + esc(r.suggest) + "</em>" : ""));
  }

  function reportPair(x, y) {
    var r = C.pairs[pairKey(x.canonical, y.canonical)];
    if (!r || underExempt(x) || underExempt(y)) return;
    var a = "<code>[" + esc(String(x.canonical).toLowerCase()) + "</code>",
        b = "<code>[" + esc(String(y.canonical).toLowerCase()) + "</code>";
    fire(r, r.id + "@" + (x.id || 0) + "-" + (y.id || 0),
      a + " com " + b + " no mesmo alvo — " + esc(r.why) + ".",
      a + " with " + b + " on the same target — " + esc(r.why) + ".");
  }

  segments.forEach(function (sg) {
    /* document order within the segment, for `order` and `precondition` */
    var flat = [];
    walk(sg.children, function (nd) { if (nd.canonical) flat.push(nd); });

    // --- pair: siblings under one parent ---
    var groups = [sg.children];
    walk(sg.children, function (nd) { if (nd.children && nd.children.length) groups.push(nd.children); });
    groups.forEach(function (kids) {
      var byName = {};
      kids.forEach(function (c) { if (c.canonical) (byName[c.canonical] = byName[c.canonical] || []).push(c); });
      Object.keys(C.pairs).forEach(function (k) {
        var r = C.pairs[k];
        if (byName[r.a] && byName[r.b]) reportPair(byName[r.a][0], byName[r.b][0]);
      });
    });

    // --- pair: one is an ancestor of the other ---
    walk(sg.children, function (nd) {
      if (!nd.canonical) return;
      var p = nd.parent, hops = 0;
      while (p && hops++ < 32) { if (p.canonical) reportPair(nd, p); p = p.parent; }
    });

    // --- order: `then` must not come before `first` ---
    C.order.forEach(function (o) {
      var firstAt = -1, i, j;
      for (i = 0; i < flat.length; i++) if (flat[i].canonical === o.first) { firstAt = i; break; }
      for (j = 0; j < flat.length; j++) {
        if (o.then.indexOf(flat[j].canonical) === -1) continue;
        if (firstAt !== -1 && j > firstAt) continue;      // correct order, nothing to say
        if (firstAt === -1) return;                        // `first` absent: rule does not apply
        var la = "<code>[" + esc(String(flat[j].canonical).toLowerCase()) + "</code>",
            lb = "<code>[" + esc(String(o.first).toLowerCase()) + "</code>";
        fire(o.rule, o.rule.id + "@" + (flat[j].id || 0),
          la + " vem antes de " + lb + " — " + esc(o.rule.why) + ".",
          la + " comes before " + lb + " — " + esc(o.rule.why) + ".");
        return;
      }
    });

    // --- precondition: target must be preceded by an accepted frame ---
    C.pre.forEach(function (p) {
      for (var i = 0; i < flat.length; i++) {
        if (flat[i].canonical !== p.target) continue;
        var framed = false;
        for (var k = 0; k < i; k++) if (p.accept[flat[k].canonical]) { framed = true; break; }
        if (framed) continue;
        var t = "<code>[" + esc(String(p.target).toLowerCase()) + "</code>";
        fire(p.rule, p.rule.id + "@" + (flat[i].id || 0),
          t + " sem enquadramento antes — " + esc(p.rule.why) + ".",
          t + " with no framing before it — " + esc(p.rule.why) + ".");
      }
    });
  });
}
