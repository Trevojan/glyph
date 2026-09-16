/**
 * core/templates.js — a preset expanded into the tree, and the shape it promised.
 *
 * expandInvocations replaces `[--name …]` with the template's body, holes
 * bound to what the author supplied; checkTemplateConstraints then asks whether
 * the result still has the shape the preset declared. The body is Glyph, so
 * expanding it means parsing it — and parse() is the caller. Rather than the
 * two modules importing each other, parse hands itself in as `parseFn`, the
 * way it already hands in `G` for diagnostics; the graph stays a DAG.
 */

import { esc, walk } from "./util.js";
import { templateRegistry, RULES } from "./stores.js";

/* ======================================================
   3b. TEMPLATE EXPANSION

   Through v1.0.9.1 an invocation `[--name[…]]` emitted only what was written
   in the call itself: the definition's body never entered, not even in the
   same message. The human reader or the model was what connected the two
   ends. Now the engine connects them.

   Linking: the definition declares holes with `[ph-name\`question\`]`; the
   call fills them by name (`[ph-name'value']`) or by position (bare
   literals, in declaration order). Whatever isn't a fill lands as extra
   content at the end. An unfilled hole still becomes <needs> — it does not
   block.
   ====================================================== */

export function phName(nd) {
  var n = (nd.children || []).filter(function (c) { return c.slotName; })[0];
  return n ? String(n.raw) : null;
}

/* `repeatName` (lowercase) is the one param, if any, declared with
   `"repeat": true` in the template store — see bindHoles below for why it
   is collected separately from the positional/named split. */
export function collectFills(inv, repeatName) {
  var named = {}, positional = [], extra = [], slid = [];
  var repeatKey = repeatName ? String(repeatName).toLowerCase() : null;
  (inv.children || []).forEach(function (c) {
    if (c.canonical === "PH") {
      var nm = phName(c);
      if (nm) {
        var lit = (c.children || []).filter(function (k) { return k.literal; })[0];
        var val = lit ? lit.v : "";
        var key = nm.toLowerCase();
        if (repeatKey && key === repeatKey) (named[key] = named[key] || []).push(val);
        else named[key] = val;
        return;
      }
    }
    if (c.literal) { positional.push(c.v); return; }
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
    slid.push({ node:c, at:positional.length + 1 });
  });
  /* so e deslize o que tem literal depois: o resto e conteudo em excesso */
  var cut = slid.filter(function (x) { return x.at <= positional.length; });
  return { named:named, positional:positional, extra:extra, slid:cut };
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
   <needs> — the template's other fixed params already cover the minimum). */
export function bindHoles(nodes, fills, params, repeatName) {
  var order = params.filter(function (p) {
    return p !== repeatName && !(String(p).toLowerCase() in fills.named);
  });

  function valueFor(name) {
    var k = String(name).toLowerCase();
    if (k in fills.named) { var v = fills.named[k]; return Array.isArray(v) ? v[0] : v; }
    var at = order.indexOf(name);
    return (at !== -1 && at < fills.positional.length) ? fills.positional[at] : null;
  }

  function rebuild(list) {
    var out = [];
    (list || []).forEach(function (nd) {
      if (nd.canonical === "PH") {
        var nm = phName(nd);
        if (nm && repeatName && nm.toLowerCase() === String(repeatName).toLowerCase()) {
          var vals = fills.named[nm.toLowerCase()] || [];
          vals.forEach(function (v, idx) {
            if (v === null || v === undefined || !String(v).length) return;
            out.push({ literal:true, v:String(v), form:"quote",
                       boundSlot: nm + (idx ? String(idx + 1) : "") });
          });
          return;
        }
        var v2 = nm ? valueFor(nm) : null;
        if (v2 !== null && v2 !== undefined && String(v2).length) {
          out.push({ literal:true, v:String(v2), form:"quote", boundSlot:nm });
          return;
        }
      }
      if (nd.children && nd.children.length) nd.children = rebuild(nd.children);
      out.push(nd);
    });
    return out;
  }
  return rebuild(nodes);
}

export function reparent(list, parent) {
  (list || []).forEach(function (nd) {
    nd.parent = parent;
    if (nd.children && nd.children.length) reparent(nd.children, nd);
  });
}

export function expandInvocations(segments, opts, G, parseFn) {
  var registry = templateRegistry(opts);
  if (!registry) return;
  var chain = (opts && opts._expanding) || [];

  var invocations = [];
  segments.forEach(function (sg) {
    walk(sg.children, function (nd) { if (nd.template && !nd.isDef) invocations.push(nd); });
  });

  invocations.forEach(function (inv) {
    var key = String(inv.template).toLowerCase();
    var def = registry[key] || registry[inv.template];
    if (!def || !def.body) return;

    if (chain.indexOf(key) !== -1) {
      G("fix", "ciclo",
        "<code>[--" + esc(inv.template) + "</code> se expande dentro de si mesmo (" +
        esc(chain.concat(key).join(" → ")) + "). Expansão interrompida.", "TemplateCycle",
          "cycle", "<code>[--" + esc(inv.template) + "</code> expands inside itself (" + esc(chain.concat(key).join(" → ")) + "). Expansion stopped.");
      return;
    }

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

    var body = [];
    sub.segments.forEach(function (s) { body = body.concat(s.children); });

    var params = (def.params || []).map(function (p) { return p.name || p; });
    var repeatDef = (def.params || []).filter(function (p) { return p && p.repeat; })[0];
    var repeatName = repeatDef ? (repeatDef.name || repeatDef) : null;
    var fills = collectFills(inv, repeatName);
    (fills.slid || []).forEach(function (x) {
      var what = String(x.node.canonical || x.node.template || "?").toLowerCase();
      var shown = params.map(function (nm) { return "`" + nm + "`"; }).join(",");
      G("fix", "parâmetro não é literal",
        "o " + x.at + "º parâmetro de <code>[--" + esc(inv.template) +
        "</code> recebeu <code>[" + esc(what) + "</code>. Parâmetro de molde é sempre literal: " +
        "<code>[--" + esc(inv.template) + esc(shown) + "]</code>.",
        "TemplateParamNotLiteral",
        "parameter is not a literal",
        "argument " + x.at + " of <code>[--" + esc(inv.template) +
        "</code> got <code>[" + esc(what) + "</code>. A template parameter is always a literal: " +
        "<code>[--" + esc(inv.template) + esc(shown) + "]</code>.");
    });

    inv.children = bindHoles(body, fills, params, repeatName).concat(fills.extra);
    reparent(inv.children, inv);
    inv.expanded = true;
    inv.gloss = def.gloss || "";
  });
}


/* ======================================================
   3d. TEMPLATE CONSTRAINTS — the shape a preset promises

   The rules in 3c are all LOCAL: they compare two commands to each other
   (siblings, or one an ancestor of the other) or check what preceded a
   target in the same segment. None of them sees the SHAPE of a whole
   preset once it is expanded. So a template that set up an iteration
   could be handed commands that dissolve the very loop it opened, and the
   engine stayed quiet — it only knew two commands coexisted, not that one
   of them walked out of the structure the other one promised.

   A constraint travels with the template that declares it and is checked
   ONLY inside that template's own expansion — same provenance the
   [ovr]/[byp] exemption already walks, via the `parent` chain that
   reparent() builds at expansion time.

   `forbid` names a class or command that must not appear inside. The
   exemption is deliberate and is the whole point: under an explicit
   [ovr]/[byp] the departure was requested out loud. The preset
   de-limits, it does not wall in — leaving the rails stays possible, it
   just stops happening by drift.

   Severity is data, but `ask` is the right default and what the shipped
   presets use: walking out of a preset's shape is not broken syntax, the
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
  var rulesStore = (opts && opts.rules) || RULES;

  var exempt = {};
  (((rulesStore || {}).scope || {}).exemptUnder || ["OVR", "BYP"])
    .forEach(function (x) { exempt[x] = 1; });

  /* Same walk as checkRules' underExempt, but it stops at the template
     node: an [ovr] wrapping the whole invocation from outside says
     nothing about what happens inside this preset. */
  function exemptWithin(nd, stopAt) {
    var p = nd.parent, hops = 0;
    while (p && p !== stopAt && hops++ < 64) { if (exempt[p.canonical]) return true; p = p.parent; }
    return false;
  }

  segments.forEach(function (sg) {
    walk(sg.children, function (inv) {
      if (!inv.template || !inv.expanded) return;
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
