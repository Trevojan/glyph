/**
 * core/templates.js — a template expanded into the tree, and the shape it promised.
 *
 * expandInvocations replaces `[--name …]` with the template's body, holes
 * bound to what the author supplied; checkTemplateConstraints then asks whether
 * the result still has the shape the template declared. The body is Glyph, so
 * expanding it means parsing it — and parse() is the caller. Rather than the
 * two modules importing each other, parse hands itself in as `parseFn`, the
 * way it already hands in `G` for diagnostics; the graph stays a DAG.
 */

import { esc, walk } from "./util.js";
import { templateRegistry, rulesOf } from "./stores.js";


/* ======================================================
   3b. TEMPLATE EXPANSION

   Through v1.0.9.1 an invocation `[--name[…]]` emitted only what was written
   in the call itself: the definition's body never entered, not even in the
   same message. The human reader or the model was what connected the two
   ends. Now the engine connects them, for a definition in the template store
   and for one written in the same source (`[--name=…]`).

   Linking: the definition declares holes with `[ph-name\`question\`]`; the
   call fills them by name (`[ph-name'value']`) or by position (bare
   literals, in declaration order). Whatever isn't a fill lands as extra
   content at the end. An unfilled hole still becomes <needs> — it does not
   block.

   Everything the call wrote reaches the expansion (decided 2026-10-25: a
   known command never vanishes). A named fill is the whole bracket: its first
   literal is the value, and what it holds past the value travels with it into
   the hole's place, carrying the hole's `slot` — GLOSSARY §0.3, what is nested
   inside an item belongs to that item. A named fill that no hole takes, and a
   literal written past every parameter, land with the extra content; the
   named one keeps its name as its `slot`.
   ====================================================== */

export function phName(nd) {
  var n = (nd.children || []).filter(function (c) { return c.slotName; })[0];
  return n ? String(n.raw) : null;
}

/* what a fill's bracket holds past its `-name` binder, in written order */
function fillKids(c) {
  return (c.children || []).filter(function (k) { return !k.slotName; });
}

/* the parameter a carried node was written for travels on it, as it does
   on a bound value */
function marked(kids, slot) {
  (kids || []).forEach(function (k) { k.boundSlot = slot; });
  return kids || [];
}

/* `repeatName` (lowercase) is the one param, if any, declared with
   `"repeat": true` in the template store — see bindHoles below for why it
   is collected separately from the positional/named split.

   `fills` holds every named fill in written order: `lit` is its value, the
   first literal it holds; `carried` is the rest of it. A second fill for the
   same hole is more of the first — `[ph-x'a'][ph-x'b']` reads as
   `[ph-x'a''b']` — except for the repeatable hole, where each call is one
   more value. `items` is every argument in written order, the order what no
   hole takes keeps when it lands after the body. */
export function collectFills(inv, repeatName) {
  var named = {}, positional = [], extra = [], slid = [];
  var fills = [], items = [];
  var repeatKey = repeatName ? String(repeatName).toLowerCase() : null;
  (inv.children || []).forEach(function (c) {
    if (c.canonical === "PH") {
      var nm = phName(c);
      if (nm) {
        var key = nm.toLowerCase(), kids = fillKids(c);
        if (repeatKey && key === repeatKey) {
          var lit = kids.filter(function (k) { return k.literal; })[0];
          (named[key] = named[key] || []).push(lit ? lit.v : "");
          var one = { key:key, name:nm, lit:lit || null, idx:named[key].length - 1, used:false,
                      carried:kids.filter(function (k) { return k !== lit; }) };
          fills.push(one); items.push({ fill:one });
          return;
        }
        var same = fills.filter(function (f) { return f.key === key && f.idx === undefined; })[0];
        if (same) { same.kids = same.kids.concat(kids); return; }
        var f = { key:key, name:nm, kids:kids, used:false };
        fills.push(f); items.push({ fill:f });
        return;
      }
    }
    if (c.literal) { positional.push(c.v); items.push({ pos:positional.length - 1, node:c }); return; }
    /* Nao-literal na lista de argumentos. Ele NAO conta como parametro, e
       ate 2026-09-05 escorregava para `extra` em silencio -- reaparecendo
       como irmao orfao depois da expansao e empurrando todo literal seguinte
       uma casa a esquerda.

       Medido em [--reinforce[ctx]`b`]: o `b`, escrito como SEGUNDO argumento,
       era ligado ao PRIMEIRO buraco (`rule`), e o motor entao reclamava que
       faltava o `why` -- descrevendo a coisa errada enquanto escondia a que
       aconteceu. Resposta errada com interface confiante.

       `extra` continua sendo o destino legitimo do conteudo escrito DEPOIS
       de todos os argumentos, que o README ja fixa como perda conhecida. A
       diferenca e posicional e decidivel: se ainda vem literal depois dele,
       ele deslocou algo. O indice e gravado para a mensagem poder dizer QUAL
       posicao, que e a unica informacao que o autor precisa. */
    extra.push(c);
    items.push({ node:c });
    slid.push({ node:c, at:positional.length + 1 });
  });
  fills.forEach(function (f) {
    if (f.idx !== undefined) return;
    var lit = f.kids.filter(function (k) { return k.literal; })[0];
    f.lit = lit || null;
    f.carried = f.kids.filter(function (k) { return k !== lit; });
    named[f.key] = lit ? lit.v : "";
  });
  /* so e deslize o que tem literal depois: o resto e conteudo em excesso */
  var cut = slid.filter(function (x) { return x.at <= positional.length; });
  return { named:named, positional:positional, extra:extra, slid:cut, fills:fills, items:items };
}

/* What a hole's named fill carried past its value follows the value into
   the hole's place, or follows the hole itself when the fill gave no value,
   under the slot the value would carry. A hole that holds more than its name
   and its question is a <placeholder>, and there the carried content stays
   inside it, right after the answer or the question and before what the hole
   held: [answer, …carried, …held]. A fill is taken once: a hole the body names
   twice takes the value twice and the carried content once, as the author
   wrote it once. A fill no hole takes is one `leftovers` puts after the body.
   Kept apart from bindHoles, which only calls these. */
export function takeFills(fills, key) {
  return (fills.fills || []).filter(function (f) {
    if (f.key !== key || f.used) return false;
    f.used = true;
    return true;
  });
}
export function carriedOf(fill, slot) {
  return fill ? marked(fill.carried, slot) : [];
}
export function pushCarried(out, fill, slot) {
  carriedOf(fill, slot).forEach(function (k) { out.push(k); });
}
/* a hole that holds more than its name and its question — the <placeholder>
   emit-xml's holeOf writes */
export function holdsMore(nd) {
  var kids = nd.children || [];
  var q = kids.filter(function (c) { return c.literal; })[0];
  return kids.some(function (c) { return !c.slotName && c !== q; });
}
/* an unfilled hole that holds more: what the fill carried goes in after the
   question, or after the name and the links written straight after it */
export function carryInto(nd, fill, slot) {
  var carried = carriedOf(fill, slot);
  if (!carried.length) return;
  var kids = nd.children || [];
  var q = kids.filter(function (c) { return c.literal; })[0];
  var at = q ? kids.indexOf(q) + 1 : 0;
  if (!q) {
    var name = kids.filter(function (c) { return c.slotName; })[0];
    at = name ? kids.indexOf(name) + 1 : 0;
    while (name && at < kids.length && kids[at].chainElement) at++;
  }
  nd.children = kids.slice(0, at).concat(carried, kids.slice(at));
}

/* A repeatable hole (at most one per template, marked `repeat` on its
   param) does not fit the position-by-declaration-order scheme: a fixed
   param declared after it (e.g. best-of's `criterion`) would collide with
   whatever positional index the repeats push it to. So the repeatable
   hole binds only through repeated named calls — `[ph-more'x'][ph-more'y']`
   — and is excluded from positional `order` entirely. Each call beyond the
   first adds one more sibling node where the hole sat, instead of
   overwriting a single value; zero calls drops the hole from the output
   (it is optional plurality, not a required slot, so it does not become
   <needs> — the template's other fixed params already cover the minimum).
   `fills.usedPos` records which positional literals a hole took. */
export function bindHoles(nodes, fills, params, repeatName) {
  var order = params.filter(function (p) {
    return p !== repeatName && !(String(p).toLowerCase() in fills.named);
  });
  fills.usedPos = {};

  function valueFor(name) {
    var k = String(name).toLowerCase();
    if (k in fills.named) { var v = fills.named[k]; return Array.isArray(v) ? v[0] : v; }
    var at = order.indexOf(name);
    if (at !== -1 && at < fills.positional.length) { fills.usedPos[at] = true; return fills.positional[at]; }
    return null;
  }

  function rebuild(list) {
    var out = [];
    (list || []).forEach(function (nd) {
      var mine = null, nm = null;
      if (nd.canonical === "PH") {
        nm = phName(nd);
        if (nm && repeatName && nm.toLowerCase() === String(repeatName).toLowerCase()) {
          var vals = fills.named[nm.toLowerCase()] || [];
          var each = takeFills(fills, nm.toLowerCase());
          vals.forEach(function (v, idx) {
            var slot = nm + (idx ? String(idx + 1) : "");
            if (!(v === null || v === undefined || !String(v).length))
              out.push({ literal:true, v:String(v), form:"quote", boundSlot:slot });
            pushCarried(out, each[idx], slot);
          });
          return;
        }
        var v2 = nm ? valueFor(nm) : null;
        mine = nm ? takeFills(fills, nm.toLowerCase())[0] : null;
        if (v2 !== null && v2 !== undefined && String(v2).length) {
          var bound = { literal:true, v:String(v2), form:"quote", boundSlot:nm };
          /* A hole that holds more than its name and its question keeps it
             when it is filled: the answer takes the question's place and what
             the hole held stays beside it, inside the hole — the same
             <placeholder> the unfilled hole is, never dropped by the fill. */
          var q = (nd.children || []).filter(function (c) { return c.literal; })[0];
          var held = (nd.children || []).filter(function (c) { return !c.slotName && c !== q; });
          if (held.length) {
            nd.children = [bound].concat(carriedOf(mine, nm), rebuild(held));
            out.push(nd);
            return;
          }
          out.push(bound);
          pushCarried(out, mine, nm);
          return;
        }
      }
      if (nd.children && nd.children.length) nd.children = rebuild(nd.children);
      if (mine && holdsMore(nd)) { carryInto(nd, mine, nm); mine = null; }
      out.push(nd);
      pushCarried(out, mine, nm);
    });
    return out;
  }
  return rebuild(nodes);
}

/* What no hole took, in written order: the non-literal arguments, the
   literals past every parameter, and each named fill no hole names — its
   value and what it carried, under its own name as `slot`. */
export function leftovers(fills) {
  var out = [];
  (fills.items || []).forEach(function (it) {
    if (it.fill) {
      if (it.fill.used) return;
      if (it.fill.lit) out.push(marked([it.fill.lit], it.fill.name)[0]);
      out = out.concat(marked(it.fill.carried, it.fill.name));
      return;
    }
    if (it.pos !== undefined) { if (!(fills.usedPos || {})[it.pos]) out.push(it.node); return; }
    out.push(it.node);
  });
  return out;
}

export function reparent(list, parent) {
  (list || []).forEach(function (nd) {
    nd.parent = parent;
    if (nd.children && nd.children.length) reparent(nd.children, nd);
  });
}

/* A copy of a definition written in the source, for one call: the call's
   holes are bound into the copy, never into the definition. */
export function copyNodes(list) {
  return (list || []).map(function (nd) {
    var c = {};
    for (var k in nd) if (Object.prototype.hasOwnProperty.call(nd, k) && k !== "parent") c[k] = nd[k];
    if (nd.children) c.children = copyNodes(nd.children);
    return c;
  });
}

/* The parameters of a definition written in the source are its holes, in
   the order the body names them: the declaration order the call's bare
   literals follow. A call nested in the body brings its own holes, and they
   are not this definition's. Each is a `{ name }`, as the store writes them:
   a bare string would answer `p.repeat` with `String.prototype.repeat`. */
export function holesOf(list) {
  var out = [], seen = {};
  (function scan(xs) {
    (xs || []).forEach(function (nd) {
      if (nd.template) return;
      if (nd.canonical === "PH") {
        var nm = phName(nd);
        if (nm && !Object.prototype.hasOwnProperty.call(seen, nm.toLowerCase())) {
          seen[nm.toLowerCase()] = 1;
          out.push({ name:nm });
        }
        return;
      }
      scan(nd.children);
    });
  })(list);
  return out;
}

export function expandInvocations(segments, opts, G, parseFn) {
  var store = templateRegistry(opts);
  if (!store) return;
  var chain = (opts && opts._expanding) || [];

  var invocations = [], defs = [];
  segments.forEach(function (sg) {
    walk(sg.children, function (nd) {
      if (!nd.template) return;
      if (nd.isDef) defs.push(nd); else invocations.push(nd);
    });
  });

  /* A definition written in the source is a template of the whole package,
     as a binding is: a call before it or after it expands it. Over the store,
     the source's own definition is the one the call reads. Two definitions
     of one name leave every call unable to say which it means, and the first
     is the one kept. */
  var registry = store;
  if (defs.length) {
    registry = {};
    for (var sk in store) if (Object.prototype.hasOwnProperty.call(store, sk)) registry[sk] = store[sk];
    var own = {};
    defs.forEach(function (d) {
      if (!(d.children || []).length) return;
      var dk = String(d.template).toLowerCase();
      if (Object.prototype.hasOwnProperty.call(own, dk)) {
        G("fix", "tpl repetido",
          "<code>[--" + esc(d.template) + "=</code> é definido mais de uma vez — uma chamada não pode dizer qual. Vale a primeira.",
          "TemplateDefinedTwice",
          "tpl defined twice",
          "<code>[--" + esc(d.template) + "=</code> is defined more than once — a call cannot say which. The first one holds.");
        return;
      }
      own[dk] = true;
      registry[dk] = { source:true, nodes:d.children, params:holesOf(d.children), gloss:"" };
    });
  }

  invocations.forEach(function (inv) { expandOne(inv, chain); });

  function expandOne(inv, chain) {
    if (inv.expanded) return;
    var key = String(inv.template).toLowerCase();
    var def = registry[key] || registry[inv.template];
    if (!def || !(def.source || def.body)) return;

    if (chain.indexOf(key) !== -1) {
      G("fix", "ciclo",
        "<code>[--" + esc(inv.template) + "</code> se expande dentro de si mesmo (" +
        esc(chain.concat(key).join(" → ")) + "). Expansão interrompida.", "TemplateCycle",
          "cycle", "<code>[--" + esc(inv.template) + "</code> expands inside itself (" + esc(chain.concat(key).join(" → ")) + "). Expansion stopped.");
      return;
    }

    var body = [];
    if (def.source) {
      /* the copy is already parsed: what the definition raised, it raised
         once, where it was written. A call the copy holds expands here,
         inside this one's chain. */
      body = copyNodes(def.nodes);
      var inner = [];
      walk(body, function (nd) { if (nd.template && !nd.isDef && !nd.expanded) inner.push(nd); });
      inner.forEach(function (x) { expandOne(x, chain.concat(key)); });
    } else {
      var sub = parseFn(def.body, {
        session: opts.session,
        valency: false,                       // valency is judged in the final context
        templates: registry,
        _expanding: chain.concat(key)
      });

      /* Syntax errors (and cycles) from the stored body need to bubble up:
         the outer passes run over the already-expanded tree and do not
         reproduce them. `ask`/`note` stay out because they get regenerated. */
      sub.gaps.forEach(function (g) {
        if (g.sev === "fix")
          G(g.sev, g.lab, "no corpo de <code>[--" + esc(inv.template) + "</code>: " + g.msg, g.code);
      });

      sub.segments.forEach(function (s) { body = body.concat(s.children); });
    }

    var params = (def.params || []).map(function (p) { return p.name || p; });
    var repeatDef = (def.params || []).filter(function (p) { return p && p.repeat; })[0];
    var repeatName = repeatDef ? (repeatDef.name || repeatDef) : null;
    var fills = collectFills(inv, repeatName);
    var shown = params.map(function (nm) { return "`" + nm + "`"; }).join(",");
    (fills.slid || []).forEach(function (x) {
      var what = String(x.node.canonical || x.node.template || "?").toLowerCase();
      G("fix", "parâmetro não é literal",
        "o " + x.at + "º parâmetro de <code>[--" + esc(inv.template) +
        "</code> recebeu <code>[" + esc(what) + "</code>. Parâmetro de template é sempre literal: " +
        "<code>[--" + esc(inv.template) + esc(shown) + "]</code>.",
        "TemplateParamNotLiteral",
        "parameter is not a literal",
        "argument " + x.at + " of <code>[--" + esc(inv.template) +
        "</code> got <code>[" + esc(what) + "</code>. A template parameter is always a literal: " +
        "<code>[--" + esc(inv.template) + esc(shown) + "]</code>.");
    });

    var bound = bindHoles(body, fills, params, repeatName);
    var rest = leftovers(fills);
    var named = {};
    fills.fills.forEach(function (f) {
      if (f.used || Object.prototype.hasOwnProperty.call(named, f.key)) return;
      named[f.key] = true;
      G("fix", "parâmetro desconhecido",
        "<code>[ph-" + esc(f.name) + "</code> não nomeia buraco de <code>[--" + esc(inv.template) +
        "</code> (<code>" + esc(shown) + "</code>). O que ele traz segue depois do corpo.",
        "TemplateUnknownParam",
        "unknown parameter",
        "<code>[ph-" + esc(f.name) + "</code> names no hole of <code>[--" + esc(inv.template) +
        "</code> (<code>" + esc(shown) + "</code>). What it holds follows the body.");
    });

    inv.children = bound.concat(rest);
    reparent(inv.children, inv);
    inv.expanded = true;
    inv.gloss = def.gloss || "";
    if (def.source) inv.fromSource = true;
  }
}



/* ======================================================
   3d. TEMPLATE CONSTRAINTS — the shape a template promises

   The rules in 3c are all LOCAL: they compare two commands to each other
   (siblings, or one an ancestor of the other) or check what preceded a
   target in the same segment. None of them sees the SHAPE of a whole
   template once it is expanded. So a template that set up an iteration
   could be handed commands that dissolve the very loop it opened, and the
   engine stayed quiet — it only knew two commands coexisted, not that one
   of them walked out of the structure the other one promised.

   A constraint travels with the template that declares it and is checked
   ONLY inside that template's own expansion — same provenance the
   [ovr]/[byp] exemption already walks, via the `parent` chain that
   reparent() builds at expansion time.

   `forbid` names a class or command that must not appear inside. The
   exemption is deliberate and is the whole point: under an explicit
   [ovr]/[byp] the departure was requested out loud. The template
   de-limits, it does not wall in — leaving the rails stays possible, it
   just stops happening by drift.

   Severity is data, but `ask` is the right default and what the shipped
   templates use: walking out of a template's shape is not broken syntax, the
   XML stays trustworthy, so it must not be `fix` (that would also make
   any such template fail the Guard bucket).
   ====================================================== */

/* A class ("@name") resolves through the rules store; a bare name is
   itself. Returns [] for a class naming a store that is not loaded —
   the constraint then simply does not fire, matching C-09's "no store
   loaded, nothing gets checked". */
export function constraintNames(rulesStore, spec) {
  var out = [];
  (Array.isArray(spec) ? spec : [spec]).forEach(function (n) {
    if (String(n).charAt(0) === "@") {
      var cls = ((rulesStore && rulesStore.classes) || {})[String(n).slice(1)];
      if (cls) cls.forEach(function (x) { out.push(String(x).toUpperCase()); });
    } else out.push(String(n).toUpperCase());
  });
  return out;
}

export function checkTemplateConstraints(segments, opts, G) {
  var registry = templateRegistry(opts);
  if (!registry) return;
  var rulesStore = rulesOf(opts);

  var exempt = {};
  (((rulesStore || {}).scope || {}).exemptUnder || ["OVR", "BYP"])
    .forEach(function (x) { exempt[x] = 1; });

  /* Same walk as checkRules' underExempt, but it stops at the template
     node: an [ovr] wrapping the whole invocation from outside says
     nothing about what happens inside this template. */
  function exemptWithin(nd, stopAt) {
    var p = nd.parent, hops = 0;
    while (p && p !== stopAt && hops++ < 64) { if (exempt[p.canonical]) return true; p = p.parent; }
    return false;
  }

  segments.forEach(function (sg) {
    walk(sg.children, function (inv) {
      /* a definition written in the source declares no constraints, and the
         store's entry of the same name is not the one it expanded */
      if (!inv.template || !inv.expanded || inv.fromSource) return;
      var def = registry[String(inv.template).toLowerCase()] || registry[inv.template];
      var cons = (def && def.constraints) || [];
      if (!cons.length) return;

      var inside = [];
      walk(inv.children || [], function (nd) { if (nd.canonical) inside.push(nd); });

      cons.forEach(function (c) {
        if (!c.forbid) return;
        var names = {};
        constraintNames(rulesStore, c.forbid).forEach(function (n) { names[n] = 1; });

        for (var i = 0; i < inside.length; i++) {
          var nd = inside[i];
          if (!names[nd.canonical] || exemptWithin(nd, inv)) continue;
          G(c.severity || "ask", c.label || "fora do trilho",
            "<code>[" + esc(String(nd.canonical).toLowerCase()) + "</code> dentro de <code>[--" +
            esc(inv.template) + "</code>" + (c.why ? " — " + esc(c.why) : "") + "." +
            (c.suggest ? " <em>Sugestão: " + esc(c.suggest) + ".</em>" : "") +
            " Se a saída for proposital, marque com <code>[ovr</code>.",
            "TemplateConstraint:" + c.id);
          return;                 // one report per constraint, not per offender
        }
      });
    });
  });
}
