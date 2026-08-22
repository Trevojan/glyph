/* Glyph engine — interface layer.
   Parsing, [logic], the XML emitter and the vocabulary all live in
   glyph-parser.js; the rule and template stores in glyph-data.js; the form
   data in glyph-moldes.js. What is left here is only the app. */

(function () {
  "use strict";

  /* ======================================================
     1. NÚCLEO — carregado de glyph-parser.js

     Vocabulário, lexer, bloco [logic], parser e emissor XML moravam aqui
     dentro até a v1.8, em cópia divergente da do módulo standalone: só esta
     sabia emitir XML, só a outra rodava fora do navegador. Desde a v1.0.9 há
     uma implementação só, e este arquivo é consumidor dela.
     ====================================================== */

  var Core = (typeof GlyphCore !== "undefined") ? GlyphCore : null;
  if (!Core) {
    document.body.innerHTML =
      '<p style="font:14px ui-monospace,monospace;padding:2rem;line-height:1.6">' +
      '<strong>glyph-parser.js não carregou.</strong><br>' +
      'Este arquivo depende do módulo. Mantenha os dois na mesma pasta.</p>';
    return;
  }

  var CATS = Core.CATS, INSTR = Core.INSTR, ALIAS = Core.ALIAS, ALIAS_OF = Core.ALIAS_OF,
      STRUCT = Core.STRUCT, META = Core.META, MODE = Core.MODE, EMO = Core.EMO,
      SESSION = Core.SESSION, FRAMES = Core.FRAMES, EDITORIAL_ONLY = Core.EDITORIAL_ONLY,
      PTBR = Core.PTBR, CAT_OF = Core.CAT_OF, LOGIC_OPS = Core.LOGIC_OPS, PUNCT = Core.PUNCT;

  /* stores de dados (glyph-data.js, gerado dos .json por build-templates.js).
     Ausentes, o motor roda igual — só sem expandir template nem apontar
     contradição. */
  /* registrado mais abaixo por refreshTemplates(), que sobrepõe os guardados
     do usuário aos embutidos — aqui só sobraria o embutido. */
  if (typeof GlyphRules !== "undefined" && GlyphRules) Core.useRules(GlyphRules);
  /* v1.1.0.0: tabela de composição (átomo x composto), compilada de
     expansions.txt. Alimenta `species`/`compositionDepth` na AST — sem ela a
     AST sai igual, só com esses dois campos em null. */
  if (typeof GlyphExpansions !== "undefined" && GlyphExpansions &&
      Core.useExpansions) Core.useExpansions(GlyphExpansions);

  var tokenize = Core.tokenize, classify = Core.classify, suggest = Core.suggest,
      elName = Core.elName, expandExpr = Core.expandExpr, freeVars = Core.freeVars,
      parseLogic = Core.parseLogic, parse = Core.parse, walk = Core.walk,
      buildXml = Core.buildXml, esc = Core.esc, xesc = Core.xesc;


  function colorize(xml) {
    return xesc(xml)
      .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="cm">$1</span>')
      .replace(/(&lt;\/?)([a-zA-Z][\w-]*)/g, '$1<span class="el">$2</span>')
      .replace(/([\w-]+)=(&quot;)([^&]*?)(&quot;)/g,
        '<span class="at">$1</span>=$2<span class="va">$3</span>$4');
  }
  function renderLit(src, tokens, opts) {
    var out = [], pos = 0;
    tokens.forEach(function (tk) {
      if (tk.s > pos) out.push('<span class="x">' + esc(src.slice(pos, tk.s)) + "</span>");
      var frag = src.slice(tk.s, tk.e);
      if (tk.k === "open" || tk.k === "bareTag") {
        var cl = classify(tk.v, opts);
        var bad = (cl.tier === "unknown" || cl.tier === "empty") ? " unk" : "";
        var ttl = cl.tier === "unknown" ? t("notExist") : (cmdGloss(cl.canonical) || cl.gloss || "");
        if (tk.k === "open") out.push('<span class="b">[</span><span class="c' + bad + '" title="' + esc(ttl) + '">' + esc(tk.v) + "</span>");
        else out.push('<span class="c' + bad + '" title="' + esc(ttl) + '">' + esc(frag) + "</span>");
      }
      else if (tk.k === "logic") out.push('<span class="lg">' + esc(frag) + "</span>");
      else if (tk.k === "tpl" || tk.k === "chain") out.push('<span class="tp">' + esc(frag) + "</span>");
      else if (tk.k === "close" || tk.k === "closeTag") out.push('<span class="b">' + esc(frag) + "</span>");
      else if (tk.k === "literal") out.push('<span class="t">' + esc(frag) + "</span>");
      else if (tk.k === "emotion") out.push('<span class="e" title="' + esc(EMO[tk.v.toLowerCase()] || "?") + '">' + esc(frag) + "</span>");
      else if (tk.k === "raw" || tk.k === "text") out.push('<span class="x">' + esc(frag) + "</span>");
      else out.push('<span class="b">' + esc(frag) + "</span>");
      pos = Math.max(pos, tk.e);
    });
    if (pos < src.length) out.push('<span class="x">' + esc(src.slice(pos)) + "</span>");
    return out.join("");
  }

  /* ======================================================
     7. MOLDE → GLYPH
     ====================================================== */

  function moldeById(id) {
    /* embutidos e guardados na mesma busca: assim buildGlyph, drawMolde e
       countPhase passam a servir molde do usuário sem saber que existe. */
    var all = mergedMoldes();
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }

  // um literal 'assim' termina no próximo ' ] ou fim de linha — então esses três
  // caracteres não podem entrar cru, ou o literal é cortado no meio.
  function litSafe(s) {
    return String(s == null ? "" : s)
      .replace(/'/g, "’")
      .replace(/`/g, "’")
      .replace(/\[/g, "(")
      .replace(/\]/g, ")")
      .replace(/\r?\n/g, " ")
      .trim();
  }

  /* A pergunta da casa vira <needs> no XML, então ela CHEGA ao entregável —
     por isso segue a língua da tela, e não o pt-BR fixo de glyph-moldes.js.
     Precisa do molde junto: a pergunta inglesa mora no overlay, não no slot. */
  function slotLine(m, slot, value) {
    if (value && value.trim()) return "  [" + slot.tag + "'" + litSafe(value) + "']";
    return "  [ph-" + slot.id + "'" + litSafe(slotQ(m, slot)) + "']";
  }

  function buildGlyph(state) {
    var m = moldeById(state.molde);
    if (!m) return "";
    var L = [];
    var head = state.extras.save && state.saveName.trim()
      ? "[--" + state.saveName.trim().replace(/[^A-Za-z0-9_.-]/g, "-") + "=[in"
      : "[in";
    L.push(head);

    m.phases.forEach(function (ph) {
      L.push("  [nt'" + phLabel(m, ph).toLowerCase() + "']");
      ph.slots.forEach(function (slot) {
        L.push(slotLine(m, slot, state.slots[slot.id]));
      });
      if (ph.id === "percurso" && m.steps) {
        var steps = state.steps.filter(function (s) { return s && s.trim(); });
        if (!steps.length) {
          L.push("  [ph-passos'" + t("phSteps") + "']");
        } else {
          steps.forEach(function (st, k) {
            var letter = String.fromCharCode(65 + k);
            L.push("  [ins'" + letter + ": " + litSafe(st) + "']");
            if (k < steps.length - 1) {
              var jv = state.junctions[k] || "";
              var nextL = String.fromCharCode(65 + k + 1);
              if (jv.trim())
                L.push("  [cond'" + t("condFail", letter, nextL) + ": " + litSafe(jv) + "']");
              else
                L.push("  [ph-erro" + letter + nextL +
                  "'" + t("phErr", letter, nextL) + "']");
            }
          });
        }
      }
    });

    if (state.extras.rev)  L.push("  [rev'" + t("revText") + "']");
    if (state.extras.scru) L.push("  [scru'" + t("scruText") + "']");
    return L.join("\n");
  }

  function countPhase(m, ph, state) {
    var total = ph.slots.length, filled = 0;
    ph.slots.forEach(function (s) { if ((state.slots[s.id] || "").trim()) filled++; });
    if (ph.id === "percurso" && m.steps) {
      var steps = state.steps.filter(function (s) { return s && s.trim(); });
      total += 1; if (steps.length) filled += 1;
      if (steps.length > 1) {
        total += steps.length - 1;
        for (var k = 0; k < steps.length - 1; k++)
          if ((state.junctions[k] || "").trim()) filled++;
      }
    }
    return { filled:filled, total:total };
  }

  /* ======================================================
     8. APP
     ====================================================== */

  var $ = function (id) { return document.getElementById(id); };
  var srcEl = $("src"), lastXml = "", lastAst = "", lastHgml = "";
  var OPTS = { session:true, valency:true, lang:"pt" };

  var state = {
    molde: "fluxo",
    slots: {},
    steps: ["", ""],
    junctions: [],
    extras: { rev:false, scru:false, save:false },
    saveName: "",
    detached: false,
    xmlEditing: false,
    tab: "xml",              /* aba de saida ativa; trocada por lsGet(LS.tab) no arranque */
    lang: "pt_BR"          /* trocado por lsGet(LS.lang) no arranque */
  };



  /* ---- molde ---- */
  function drawMoldePick() {
    $("moldePick").innerHTML = MOLDES.map(function (m) {
      return '<button class="chip" type="button" data-m="' + m.id + '" aria-pressed="' +
        (m.id === state.molde && !state.detached) + '">' + esc(mLabel(m)) + "</button>";
    }).join("") + '<button class="chip" type="button" id="detach">' +
      (state.detached ? t("attach") : t("detach")) + "</button>";
  }

  function drawMolde() {
    var m = moldeById(state.molde);
    var body = $("moldeBody");
    if (state.detached) {
      body.innerHTML = '<div class="none">' + t("detachedMsg") + "</div>";
      $("moldeName").textContent = t("detachedName");
      return;
    }
    $("moldeName").textContent = t("moldeWord") + " · " + mTitle(m).toLowerCase();

    var H = [];

    H.push('<div class="where" id="whereBar"></div>');
    H.push('<p style="margin:9px 0 0;font-size:12.5px;color:var(--muted)">' + esc(mHint(m)) + "</p>");

    m.phases.forEach(function (ph) {
      H.push('<div class="phase"><h3>' + esc(phLabel(m, ph)) +
        (phNote(m, ph) ? " <em>" + esc(phNote(m, ph)) + "</em>" : "") + "</h3>");
      ph.slots.forEach(function (slot) {
        var val = state.slots[slot.id] || "";
        H.push('<div class="slot' + (val.trim() ? " done" : "") + '" id="slot_' + slot.id + '">' +
          '<label for="s_' + slot.id + '"><span class="dot"></span>' +
          '<span class="tg">[' + esc(slot.tag) + '</span>' + esc(slotQ(m, slot)) + "</label>" +
          '<textarea id="s_' + slot.id + '" rows="1" data-slot="' + slot.id +
          '" spellcheck="false" placeholder="…">' + esc(val) + "</textarea></div>");
      });

      if (ph.id === "percurso" && m.steps) {
        H.push('<div class="slot' + (state.steps.some(function (s) { return s && s.trim(); }) ? " done" : "") +
          '" id="slot_passos">' +
          '<label><span class="dot"></span><span class="tg">[ins</span>' + esc(t("stepsLabel")) + "</label>" +
          '<div class="steps">');
        state.steps.forEach(function (st, k) {
          var letter = String.fromCharCode(65 + k);
          H.push('<div class="step"><span class="k">' + letter + '</span>' +
            '<input type="text" id="st_' + k + '" data-step="' + k + '" spellcheck="false" value="' + esc(st) +
            '" placeholder="' + esc(t("stepPh", letter)) + '"><button class="btn mini" type="button" data-rmstep="' + k + '">−</button></div>');
          if (k < state.steps.length - 1) {
            var nextL = String.fromCharCode(65 + k + 1);
            H.push('<div class="junction"><span class="k">↳</span>' +
              '<input type="text" id="jn_' + k + '" data-junc="' + k + '" spellcheck="false" value="' +
              esc(state.junctions[k] || "") +
              '" placeholder="' + esc(t("juncPh", letter, nextL)) + '"></div>');
          }
        });
        H.push('</div><div class="stepbar"><button class="btn mini" type="button" id="addstep">' + esc(t("addStep")) + "</button></div></div>");
      }
      H.push("</div>");
    });

    H.push('<div class="extras">');
    EXTRAS.forEach(function (x) {
      H.push('<label><input type="checkbox" data-extra="' + x.id + '"' +
        (state.extras[x.id] ? " checked" : "") + "> " + extraQ(x) + "</label>");
    });
    if (state.extras.save)
      H.push("<label>" + esc(t("saveName")) + '<input type="text" id="saveName" spellcheck="false" value="' +
        esc(state.saveName) + '" placeholder="' + esc(t("saveNamePh")) + '"></label>');
    H.push("</div>");

    body.innerHTML = H.join("");
    drawWhere();
  }

  // barra "você está aqui" — redesenhada sozinha, sem tocar nos campos
  function drawWhere() {
    var bar = $("whereBar");
    if (!bar) return;
    var m = moldeById(state.molde);
    var firstIncomplete = null;
    var counts = m.phases.map(function (ph) {
      var c = countPhase(m, ph, state);
      if (!firstIncomplete && c.filled < c.total) firstIncomplete = ph.id;
      return c;
    });
    bar.innerHTML = m.phases.map(function (ph, k) {
      var c = counts[k];
      var cls = c.filled >= c.total ? "full" : (ph.id === firstIncomplete ? "here" : "");
      return '<div class="ph ' + cls + '"><span class="n">' + esc(phLabel(m, ph)) + "</span>" +
        '<span class="c">' + c.filled + "/" + c.total + "</span>" +
        (ph.id === firstIncomplete ? '<span class="you">' + esc(t("youAreHere")) + "</span>" : "") + "</div>";
    }).join("");
  }

  // marca as casas preenchidas sem recriar os campos
  function drawDone() {
    var m = moldeById(state.molde);
    m.phases.forEach(function (ph) {
      ph.slots.forEach(function (slot) {
        var el = $("slot_" + slot.id);
        if (el) el.className = "slot" + ((state.slots[slot.id] || "").trim() ? " done" : "");
      });
    });
    var sp = $("slot_passos");
    if (sp) sp.className = "slot" + (state.steps.some(function (s) { return s && s.trim(); }) ? " done" : "");
  }

  function bindMolde() {
    var body = $("moldeBody");
    body.addEventListener("input", function (ev) {
      var t = ev.target;
      if (t.hasAttribute("data-slot")) { state.slots[t.getAttribute("data-slot")] = t.value; live(); }
      else if (t.hasAttribute("data-step")) { state.steps[+t.getAttribute("data-step")] = t.value; live(); }
      else if (t.hasAttribute("data-junc")) { state.junctions[+t.getAttribute("data-junc")] = t.value; live(); }
      else if (t.id === "saveName") { state.saveName = t.value; live(); }
    });
    body.addEventListener("change", function (ev) {
      var t = ev.target;
      if (t.hasAttribute("data-extra")) {
        state.extras[t.getAttribute("data-extra")] = t.checked;
        rebuild();   // "salvar" faz aparecer o campo de nome — é estrutural
      }
    });
    body.addEventListener("click", function (ev) {
      var t = ev.target;
      if (t.id === "addstep") {
        if (state.steps.length < 8) { state.steps.push(""); rebuild(); }
      } else if (t.hasAttribute("data-rmstep")) {
        var k = +t.getAttribute("data-rmstep");
        if (state.steps.length > 1) {
          state.steps.splice(k, 1);
          state.junctions.splice(k, 1);
          rebuild();
        }
      }
    });
    $("moldePick").addEventListener("click", function (ev) {
      var b = ev.target.closest ? ev.target.closest(".chip") : null;
      if (!b) return;
      if (b.id === "detach") { state.detached = !state.detached; rebuild(); return; }
      var id = b.getAttribute("data-m");
      if (!id) return;
      activateMolde(id);
    });
  }

  /* ---- tabela de comandos ---- */
  var catFilter = null;

  function drawCmds() {
    var q = $("find").value.trim().toLowerCase();
    var shown = 0, total = 0;
    var H = [];

    function matches(tag, mean) {
      if (!q) return true;
      return tag.toLowerCase().indexOf(q) !== -1 || mean.toLowerCase().indexOf(q) !== -1;
    }

    CATS.forEach(function (c) {
      if (catFilter && catFilter !== c.id) { total += c.items.length; return; }
      var rows = c.items.filter(function (it) { total++; return matches(it[0], it[1]); });
      if (!rows.length) return;
      shown += rows.length;
      H.push('<table class="cmds"><caption>' + esc(catLabel(c)) +
        '<span>' + esc(catNote(c)) + "</span></caption><tbody>" +
        rows.map(function (it) {
          var al = ALIAS_OF[it[0]] ? " · " + ALIAS_OF[it[0]].map(function (a) { return "[" + a.toLowerCase(); }).join(" ") : "";
          return '<tr><td class="c"><button type="button" data-ins="[' + it[0].toLowerCase() +
            '">[' + esc(it[0].toLowerCase()) + '</button></td><td class="m">' +
            esc(cmdGloss(it[0]) || it[1]) + '<span style="color:var(--muted);opacity:.7">' + esc(al) + "</span></td></tr>";
        }).join("") + "</tbody></table>");
    });

    if (!catFilter || catFilter === "conta") {
      var lrows = LOGIC_OPS.filter(function (o) { total++; return matches(o[0], o[1]); });
      if (lrows.length) {
        shown += lrows.length;
        H.push('<table class="cmds"><caption>' + esc(t("catConta")) + "<span>" + esc(t("capConta")) + "</span></caption><tbody>" +
          lrows.map(function (o) {
            return '<tr><td class="c"><button type="button" data-ins="' + esc(o[0]) + '">' +
              esc(o[0]) + "</button></td><td class=\"m\">" + esc(o[1]) + "</td></tr>";
          }).join("") + "</tbody></table>");
      }
    }
    if (!catFilter || catFilter === "punct") {
      var prows = PUNCT.filter(function (o) { total++; return matches(o[0], o[1]); });
      if (prows.length) {
        shown += prows.length;
        H.push('<table class="cmds"><caption>' + esc(t("catPunct")) + "<span>" + esc(t("capPunct")) + "</span></caption><tbody>" +
          prows.map(function (o) {
            return '<tr><td class="c"><button type="button" data-ins="' + esc(o[0]) + '">' +
              esc(o[0]) + "</button></td><td class=\"m\">" + esc(o[1]) + "</td></tr>";
          }).join("") + "</tbody></table>");
      }
    }
    if (!catFilter || catFilter === "humor") {
      var erows = Object.keys(EMO).filter(function (k) { total++; return matches(k, EMO[k]); });
      if (erows.length) {
        shown += erows.length;
        H.push('<table class="cmds"><caption>' + esc(t("catHumor")) + "<span>" + esc(t("capHumor")) + "</span></caption><tbody>" +
          erows.map(function (k) {
            return '<tr><td class="c"><button type="button" data-ins="/' + k + '/">/' +
              esc(k) + "/</button></td><td class=\"m\">" + esc(EMO[k]) + "</td></tr>";
          }).join("") + "</tbody></table>");
      }
    }
    if (!catFilter || catFilter === "atalhos") {
      var srows = Object.keys(SESSION).filter(function (k) { total++; return matches(k, SESSION[k]); });
      if (srows.length) {
        shown += srows.length;
        H.push('<table class="cmds"><caption>' + esc(t("capSession")) + "<span>" + esc(t("capSessionNote")) + "</span></caption><tbody>" +
          srows.map(function (k) {
            return '<tr><td class="c"><button type="button" data-ins="[' + k + '">[' +
              esc(k) + "</button></td><td class=\"m\">" + esc(SESSION[k]) + "</td></tr>";
          }).join("") + "</tbody></table>");
      }
    }

    $("cmdTbl").innerHTML = H.length ? H.join("") : '<div class="none">' + t("nothingFor", esc(q)) + "</div>";
    $("cmdCount").textContent = shown + "/" + total;
  }

  function drawCatRow() {
    var extra = [["conta", t("catConta")], ["punct", t("catPunct")], ["humor", t("catHumor")], ["atalhos", t("catAtalhos")]];
    $("catRow").innerHTML =
      '<button class="chip" type="button" data-cat="" aria-pressed="' + (!catFilter) + '">' + esc(t("all")) + "</button>" +
      CATS.map(function (c) {
        return '<button class="chip" type="button" data-cat="' + c.id + '" aria-pressed="' +
          (catFilter === c.id) + '">' + esc(catLabel(c)) + "</button>";
      }).join("") +
      extra.map(function (e) {
        return '<button class="chip" type="button" data-cat="' + e[0] + '" aria-pressed="' +
          (catFilter === e[0]) + '">' + esc(e[1]) + "</button>";
      }).join("");
  }

  /* ---- núcleo ---- */
  // digitar numa casa: só regenera a fonte e atualiza os marcadores.
  // Os campos não são recriados, então o foco e o cursor ficam onde estão.
  function live() {
    if (state.detached) { run(); return; }
    srcEl.value = buildGlyph(state);
    drawWhere();
    drawDone();
    run();
  }

  // mudança de estrutura: trocar molde, somar/remover passo, ligar extra.
  function rebuild() {
    srcEl.readOnly = !state.detached;
    if (!state.detached) srcEl.value = buildGlyph(state);
    drawMolde();
    drawMoldePick();
    run();
  }

  function run() {
    var src = srcEl.value;
    var tokens = tokenize(src);
    var res = parse(tokens, OPTS);

    lastXml = buildXml(res.segments);
    $("litOut").innerHTML = src.trim() ? renderLit(src, tokens, OPTS) : "";

    // v1.0.9: os nós crus têm `parent`/`tok` e fechavam ciclo — JSON.stringify
    // estourava aqui e matava o resto de run(). O módulo serializa direito.
    lastAst = JSON.stringify(Core.serializeAST(res.segments, res.gaps), null, 2);

    /* a queima roda com a mesma fonte; sem a tabela de composição carregada
       toHGML devolve o aviso em vez de quebrar, e o painel mostra o aviso. */
    lastHgml = Core.toHGML ? Core.toHGML(src, OPTS) : "";

    /* v1.4.4.01: calcular os quatro é barato, pintar não é — colorize() e um
       innerHTML grande rodavam três vezes a cada tecla digitada. Agora só a
       aba visível recebe tinta; as outras ficam sujas e esperam a troca. */
    markDirty();
    paintTab(state.tab);

    var asks = res.gaps.filter(function (g) { return g.sev === "ask"; }).length;
    var fixes = res.gaps.filter(function (g) { return g.sev === "fix"; }).length;

    if (!res.gaps.length) {
      $("gapOut").innerHTML = src.trim()
        ? '<div class="clear">' + t("complete") + "</div>"
        : '<div class="clear">' + t("pickOne") + "</div>";
    } else {
      var LAB = { fix:t("labFix"), ask:t("labAsk"), note:t("labNote") };
      $("gapOut").innerHTML = res.gaps.map(function (g) {
        return '<div class="gap ' + g.sev + '"><span class="bar"></span><span class="txt">' +
          '<span class="lab">' + (g.lab || LAB[g.sev]) + "</span>" + g.msg + "</span></div>";
      }).join("");
    }
    $("gapCount").textContent = res.gaps.length
      ? (fixes ? t("toFix", fixes) : "") + (asks ? t("toSay", asks) : "") ||
        t("notes", res.gaps.length)
      : "";

    var cmds = 0;
    res.segments.forEach(function (sg) { walk(sg.children, function (nd) { if (nd.canonical) cmds++; }); });
    $("stat").textContent = src.trim()
      ? t("stat", res.segments.length, cmds, lastXml.split("\n").length)
      : "";

    resetCopyButtons();
  }

  /* ---- presets ---- */
  /* virou função porque a troca de língua precisa redesenhar: no lugar antigo
     rodava uma vez só e as fichas ficavam na língua do arranque. */
  function drawPresets() {
    $("presets").innerHTML = PRESETS.map(function (p, k) {
      return '<button class="chip" type="button" data-p="' + k + '">' + esc(presetLabel(p, k)) + "</button>";
    }).join("");
  }
  $("presets").addEventListener("click", function (ev) {
    var b = ev.target.closest ? ev.target.closest(".chip") : null;
    if (!b) return;
    state.detached = true;
    srcEl.readOnly = false;
    var pk = +b.getAttribute("data-p");
    srcEl.value = presetSrc(PRESETS[pk], pk);
    drawMolde(); drawMoldePick(); run();
  });

  /* ---- inserção da tabela ---- */
  $("cmdTbl").addEventListener("click", function (ev) {
    var b = ev.target.closest ? ev.target.closest("button[data-ins]") : null;
    if (!b) return;
    if (!state.detached) { state.detached = true; srcEl.readOnly = false; drawMolde(); drawMoldePick(); }
    var ins = b.getAttribute("data-ins");
    var a = srcEl.selectionStart, z = srcEl.selectionEnd, v = srcEl.value;
    srcEl.value = v.slice(0, a) + ins + v.slice(z);
    srcEl.focus();
    var caret = a + ins.length;
    srcEl.setSelectionRange(caret, caret);
    run();
  });
  $("catRow").addEventListener("click", function (ev) {
    var b = ev.target.closest ? ev.target.closest(".chip") : null;
    if (!b) return;
    catFilter = b.getAttribute("data-cat") || null;
    drawCatRow(); drawCmds();
  });
  $("find").addEventListener("input", drawCmds);

  srcEl.addEventListener("input", function () { if (state.detached) run(); });


  /* ======================================================
     9. LEVAR E TRAZER — baixar, copiar, dobrar

     Até aqui a única saída era a área de transferência. O arquivo é a outra
     metade: o .pgml é o que se escreve, o .xml é o recado, a .ast é o trunfo
     e o .hgml é a queima. Todos saem do mesmo estado já calculado em run(),
     nenhum recalcula nada.
     ====================================================== */

  function downloadText(filename, mime, content) {
    var blob = new Blob([content], { type: mime + ";charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    // revogar na hora cancela o download em alguns navegadores
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function stamp(ext) {
    var n = (state.saveName || "").trim().replace(/[^A-Za-z0-9_.-]/g, "-");
    return (n || "glyph") + "." + ext;
  }

  /* O botão de copiar existia só para o XML e o do AST estava no HTML sem
     ouvinte nenhum desde que foi escrito — clicava e não fazia nada. */
  var COPY_IDLE = {};
  function wireCopyButton(id, idleLabel, getText) {
    var b = $(id);
    if (!b) return;
    COPY_IDLE[id] = idleLabel;
    function done() { b.className = "btn done"; b.textContent = t("copied"); }
    function fail() { b.className = "btn"; b.textContent = t("copyFail"); }
    function legacy(t) {
      try {
        var ta = document.createElement("textarea");
        ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        var okc = document.execCommand("copy");
        document.body.removeChild(ta);
        okc ? done() : fail();
      } catch (e) { fail(); }
    }
    b.addEventListener("click", function (ev) {
      ev.preventDefault();   // o botão mora dentro do <summary>: não dobrar o painel
      ev.stopPropagation();
      var t = getText();
      if (navigator.clipboard && navigator.clipboard.writeText)
        navigator.clipboard.writeText(t).then(done, function () { legacy(t); });
      else legacy(t);
    });
  }
  function resetCopyButtons() {
    Object.keys(COPY_IDLE).forEach(function (id) {
      var b = $(id);
      if (b) { b.className = "btn"; b.textContent = t(COPY_IDLE[id]); }
    });
  }

  /* Botão dentro de <summary> alterna a dobra junto com a ação. */
  function onBtn(id, fn) {
    var b = $(id);
    if (!b) return;
    b.addEventListener("click", function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      fn(ev);
    });
  }

  /* Os botões moram dentro do <summary>, que é o gatilho da dobra: clicar em
     "copiar" abria ou fechava o painel junto com a cópia. preventDefault no
     próprio botão não basta — quem dispara a dobra é o comportamento de
     ativação do summary, e ele decide antes de o clique subir. O guarda fica
     no summary e cancela quando o alvo é um controle, não o cabeçalho. */
  function bindSummaryGuard() {
    var all = document.querySelectorAll("details.card > summary.hd");
    for (var i = 0; i < all.length; i++) {
      all[i].addEventListener("click", function (ev) {
        var t = ev.target;
        if (t.closest && t.closest("button, input, label, textarea, select"))
          ev.preventDefault();
      });
    }
  }

  /* ---- dobra ---- */
  function restoreCollapse() {
    var st = lsGet(LS.collapse, {});
    var all = document.querySelectorAll("details.card[data-lsid]");
    for (var i = 0; i < all.length; i++) {
      var id = all[i].getAttribute("data-lsid");
      if (id in st) all[i].open = !!st[id];
    }
  }
  function bindCollapse() {
    var all = document.querySelectorAll("details.card[data-lsid]");
    for (var i = 0; i < all.length; i++) {
      // toggle não borbulha, então cada painel ouve o seu
      all[i].addEventListener("toggle", function (ev) {
        var st = lsGet(LS.collapse, {});
        st[ev.target.getAttribute("data-lsid")] = ev.target.open;
        lsSet(LS.collapse, st);
      });
    }
  }

  /* ======================================================
     9b. ABAS DE SAÍDA E DESTINO

     Os quatro formatos moravam em lugares diferentes da página — .xml no
     bloco lateral, .json embaixo dele, .hgml embaixo do .json, e o .pgml
     longe de todos, junto da caixa de fonte. Achar um exigia percorrer a
     tela, e cada card repetia seu próprio par copiar/baixar.
     ====================================================== */

  var TABS = {
    pgml: { el:"pgmlOut", ext:"pgml", mime:"text/plain",
            get:function () { return srcEl.value; } },
    xml:  { el:"xmlOut",  ext:"xml",  mime:"application/xml",
            get:function () { return lastXml; } },
    ast:  { el:"astOut",  ext:"json", mime:"application/json",
            get:function () { return lastAst; } },
    hgml: { el:"hgmlOut", ext:"hgml", mime:"text/plain",
            get:function () { return lastHgml; } }
  };

  var tabDirty = { pgml:true, xml:true, ast:true, hgml:true };
  function markDirty() {
    for (var k in tabDirty) if (tabDirty.hasOwnProperty(k)) tabDirty[k] = true;
  }

  function paintTab(id) {
    if (!TABS[id] || !tabDirty[id]) return;
    /* enquanto o painel de xml está aberto para edição ele é a fonte, não o
       destino: repintar apagaria o que está sendo digitado. */
    if (id === "xml" && state.xmlEditing) return;
    tabDirty[id] = false;
    if (id === "xml") { $("xmlOut").innerHTML = colorize(lastXml); return; }
    var el = $(TABS[id].el);
    if (el) el.textContent = TABS[id].get();
  }

  function setTab(id) {
    if (!TABS[id]) id = "xml";
    state.tab = id;
    lsSet(LS.tab, id);

    var tabs = document.querySelectorAll("#outTabs .tab");
    for (var i = 0; i < tabs.length; i++)
      tabs[i].setAttribute("aria-selected",
        tabs[i].getAttribute("data-tab") === id ? "true" : "false");

    var panels = document.querySelectorAll(".tabpanel");
    for (var j = 0; j < panels.length; j++)
      panels[j].hidden = panels[j].getAttribute("data-panel") !== id;

    /* editar só existe no .xml: é o único com volta por fromXML(). */
    var ed = $("xmlEdit");
    if (ed) ed.style.display = (id === "xml") ? "" : "none";

    paintTab(id);
  }

  function bindTabs() {
    var tabs = document.querySelectorAll("#outTabs .tab");
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener("click", function (ev) {
        ev.preventDefault(); ev.stopPropagation();   /* o botão mora no <summary> */
        setTab(this.getAttribute("data-tab"));
      });
    }
  }

  /* ---- destino ----
     O motor emitia sem dizer para onde. Harness, modelo e papel decidem o
     arquivo que o bundle vai escrever, e viviam só no plano. Aqui ficam
     visíveis antes de qualquer emissão. A lista é dados (targets.json), não
     código: id de modelo muda na agenda de outra pessoa. */
  function targetStore() {
    return (typeof GlyphTargets !== "undefined" && GlyphTargets) || null;
  }
  function harnessById(id) {
    var st = targetStore(); if (!st) return null;
    var hs = st.harnesses || [];
    for (var i = 0; i < hs.length; i++) if (hs[i].id === id) return hs[i];
    return hs[0] || null;
  }
  function fillSelect(el, items, chosen, labelOf) {
    if (!el) return;
    el.innerHTML = "";
    items.forEach(function (it) {
      var o = document.createElement("option");
      o.value = it.id;
      o.textContent = labelOf ? labelOf(it) : it.label;
      if (it.available === false) o.disabled = true;   /* listado e desligado informa */
      if (it.id === chosen) o.selected = true;
      el.appendChild(o);
    });
  }

  function drawTarget() {
    var st = targetStore();
    if (!st) return;
    var h = harnessById(state.target.harness);
    if (!h) return;
    state.target.harness = h.id;

    fillSelect($("tgHarness"), st.harnesses, h.id, function (x) {
      return x.label + (x.available === false ? " · " + t("tgSoon") : "");
    });

    var models = (h.models && h.models.length) ? h.models : [{ id:"inherit", label:"—" }];
    var known = false;
    models.forEach(function (m) { if (m.id === state.target.model) known = true; });
    if (!known) state.target.model = models[0].id;
    fillSelect($("tgModel"), models, state.target.model);

    fillSelect($("tgRole"), st.roles || [], state.target.role);

    var path = String(h.writes || "—").replace("<role>", state.target.role);
    $("targetPath").textContent = path;

    var L = [];
    L.push('<span class="k">' + t("tgWrites") + ":</span> " + esc(path));
    L.push('<span class="k">' + t("tgRegisters") + ":</span> " + esc(h.registers || "—"));
    if (h.id === "claude-code") {
      var model = state.target.model === "inherit" ? null : state.target.model;
      L.push('<span class="k">' + t("tgHeader") + ":</span> ---" +
             "\nname: " + esc(state.target.role) +
             (model ? "\nmodel: " + esc(model) : "") +
             "\ntools: …\n---");
    }
    L.push('<span class="warn">' + esc(t("tgPending")) + "</span>");
    $("targetPreview").innerHTML = L.join("\n");
  }

  function bindTarget() {
    ["tgHarness", "tgModel", "tgRole"].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener("change", function () {
        var key = id === "tgHarness" ? "harness" : (id === "tgModel" ? "model" : "role");
        state.target[key] = this.value;
        lsSet(LS.target, state.target);
        drawTarget();
      });
    });
  }

  /* ======================================================
     10. XML EDITÁVEL

     O painel de XML era só vitrine. Agora ele volta: fromXML() reconstrói a
     fonte e o resto da tela se refaz a partir dela. Ao aplicar, o molde se
     solta — é a mesma autoridade que "soltar do molde" já dava à caixa de
     fonte, só que acionada do outro lado. Duas portas, um conceito.
     ====================================================== */

  function xmlEditOn() {
    state.xmlEditing = true;
    var pre = $("xmlOut");
    var ta = document.createElement("textarea");
    ta.id = "xmlOut"; ta.className = "xml editbox"; ta.spellcheck = false;
    ta.value = lastXml;
    pre.parentNode.replaceChild(ta, pre);
    $("xmlEdit").textContent = t("xmlApply");
    $("xmlEdit").className = "btn done";
    ta.focus();
  }

  function xmlEditOff(newXmlPanelSource) {
    state.xmlEditing = false;
    var ta = $("xmlOut");
    var pre = document.createElement("pre");
    pre.id = "xmlOut"; pre.className = "xml";
    ta.parentNode.replaceChild(pre, ta);
    $("xmlEdit").textContent = t("xmlEdit");
    $("xmlEdit").className = "btn";
    if (newXmlPanelSource) pre.innerHTML = colorize(newXmlPanelSource);
  }

  function xmlApply() {
    var typed = $("xmlOut").value;
    var back = Core.fromXML(typed, OPTS);
    var fixes = back.diag.filter(function (d) { return d.sev === "fix"; });
    if (fixes.length) {
      // não aplica: trocar a fonte por um xml quebrado apagaria o que está lá
      $("xmlDiag").innerHTML = fixes.map(function (d) {
        return '<div class="gap fix"><span class="bar"></span><span class="txt">' +
          '<span class="lab">xml</span>' + d.msg + "</span></div>";
      }).join("");
      return;
    }
    $("xmlDiag").innerHTML = back.diag.length
      ? back.diag.map(function (d) {
          return '<div class="gap ' + d.sev + '"><span class="bar"></span><span class="txt">' +
            '<span class="lab">xml</span>' + d.msg + "</span></div>";
        }).join("")
      : "";
    xmlEditOff(null);
    srcEl.value = back.src;
    state.detached = true;
    srcEl.readOnly = false;
    drawMolde(); drawMoldePick();
    run();
  }

  /* ======================================================
     11. GUARDADOS — modelos e moldes do usuário

     templates.json e glyph-moldes.js continuam sendo a fonte de
     verdade e não são tocados daqui: a página abre em file:// e não escreve
     no projeto. O que o usuário cria fica no localStorage e é sobreposto aos
     embutidos na carga — mesmo formato, origem diferente, e o nome do usuário
     ganha do embutido quando os dois coincidem.
     ====================================================== */

  /* Três chaves, não uma. A dobra grava a cada clique e os guardados gravam
     raramente e com esquema próprio; juntos, um esquema novo em qualquer um
     obrigaria a migrar os três. */
  var LS = {
    collapse:  "glyph.ui.collapse.v1",
    templates: "glyph.templates.user.v1",
    moldes:    "glyph.moldes.user.v1",
    lang:      "glyph.ui.lang.v1",
    tab:       "glyph.ui.tab.v1",
    target:    "glyph.ui.target.v1"
  };
  function lsGet(key, fb) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; }
    catch (e) { return fb; }          // aba anônima, cota cheia, json torto
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { return false; }
  }

  /* O parâmetro sai do corpo, não de uma lista escrita à mão ao lado dele.
     Quem escreve [ph-alvo já disse o nome; repetir isso num cabeçalho é a
     mesma informação em dois lugares, que é como as duas versões divergem.
     `tag` é o comando que embrulha o buraco — é o que separa um molde (onde
     a casa É [tgt[ph-x]]) de um modelo (onde o buraco basta). */
  function extractPlaceholders(bodySrc) {
    var res = parse(String(bodySrc || ""), { session:false });
    var out = [], seen = {};
    function scan(list, parentCanon) {
      (list || []).forEach(function (nd) {
        if (nd.canonical === "PH") {
          var nameNode = (nd.children || []).filter(function (c) { return c.slotName; })[0];
          var askNode = (nd.children || []).filter(function (c) { return c.literal; })[0];
          if (nameNode) {
            var key = String(nameNode.raw).toLowerCase();
            if (!seen[key]) {
              seen[key] = 1;
              out.push({ name:key, ask:askNode ? String(askNode.v) : "", tag:parentCanon || null });
            }
            return;
          }
        }
        if (nd.children && nd.children.length) scan(nd.children, nd.canonical || parentCanon);
      });
    }
    res.segments.forEach(function (sg) { scan(sg.children, null); });
    return out;
  }

  /* Vira <needs> no XML, e o que chega ao entregável é inglês. */
  function defaultAsk(name) {
    return "the " + String(name).replace(/[-_]+/g, " ").trim();
  }
  function slug(s) {
    /* sem tirar o acento primeiro, "Revisão" vira "revis-o": o acento cai no
       [^a-z0-9] e abre um hífen no meio da palavra. */
    return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  /* ---- modelos ---- */
  function builtinTemplates() {
    return (typeof GlyphTemplates !== "undefined" && GlyphTemplates && GlyphTemplates.templates) || {};
  }
  function userTemplates() { return lsGet(LS.templates, {}); }

  /* O motor precisa ser reavisado, não só a lista: sem isto um [--meu-modelo
     não expande, ele só aparece bonito na tela. */
  function refreshTemplates() {
    var merged = {}, bi = builtinTemplates(), us = userTemplates();
    Object.keys(bi).forEach(function (k) { merged[k] = bi[k]; });
    Object.keys(us).forEach(function (k) { merged[k] = us[k]; });
    Core.useTemplates({ templates: merged });
    return merged;
  }
  function saveUserTemplate(name, def) {
    var all = userTemplates();
    all[name] = def;
    if (!lsSet(LS.templates, all)) return false;
    refreshTemplates(); return true;
  }
  function deleteUserTemplate(name) {
    var all = userTemplates();
    delete all[name];
    lsSet(LS.templates, all);
    refreshTemplates();
  }

  /* O .md carrega o corpo numa cerca e nada além disso: o nome é o # e a
     descrição é o parágrafo. Os parâmetros NÃO viajam no arquivo — são lidos
     do corpo na importação, que é o mesmo caminho do editor. Um cabeçalho de
     parâmetros seria a terceira cópia da mesma lista. */
  function templateFromMarkdown(md) {
    var title = "", intro = [], code = [], fence = null;
    String(md || "").replace(/\r\n?/g, "\n").split("\n").forEach(function (ln) {
      if (/^\s*```/.test(ln)) {
        if (fence === null) { fence = []; return; }
        code.push(fence.join("\n")); fence = null; return;
      }
      if (fence !== null) { fence.push(ln); return; }
      var h1 = /^#\s+(.+)$/.exec(ln);
      if (h1 && !title) { title = h1[1].trim(); return; }
      if (/^#{2,}\s+/.test(ln)) return;
      if (ln.trim()) intro.push(ln.trim());
    });
    if (fence !== null && fence.length) code.push(fence.join("\n"));
    if (!title) return { error:t("mdNoTitle") };
    var body = code.join("\n").trim();
    if (!body) return { error:t("mdNoBody") };
    return { name:slug(title), gloss:intro.join(" "), body:body };
  }

  function templateToMarkdown(name, def) {
    return "# " + name + "\n\n" + (def.gloss || "") + "\n\n```glyph\n" + (def.body || "") + "\n```\n";
  }

  /* ---- moldes ---- */
  function userMoldes() { return lsGet(LS.moldes, []); }
  function mergedMoldes() { return MOLDES.concat(userMoldes()); }
  function saveUserMolde(def) {
    var all = userMoldes(), at = -1;
    all.forEach(function (m, i) { if (m.id === def.id) at = i; });
    if (at >= 0) all[at] = def; else all.push(def);
    if (!lsSet(LS.moldes, all)) return false;
    return true;
  }
  function deleteUserMolde(id) {
    lsSet(LS.moldes, userMoldes().filter(function (m) { return m.id !== id; }));
  }

  /* Uma fase é "## Rótulo" e o que vem abaixo dela. As cercas ``` são
     toleradas e ignoradas, para que o mesmo texto sirva no editor da tela e
     dentro do .md sem duas gramáticas. */
  function parseMoldePhases(text) {
    var blocks = [], cur = null;
    String(text || "").replace(/\r\n?/g, "\n").split("\n").forEach(function (ln) {
      var h = /^##\s+(.+)$/.exec(ln);
      if (h) { cur = { label:h[1].trim(), lines:[] }; blocks.push(cur); return; }
      if (/^\s*```/.test(ln)) return;
      if (!ln.trim()) return;
      if (!cur) { cur = { label:"Fase", lines:[] }; blocks.push(cur); }
      cur.lines.push(ln);
    });
    return blocks;
  }

  function moldeFromText(title, hint, bodyText) {
    if (!String(title || "").trim()) return { error:t("mldNoTitle") };
    var blocks = parseMoldePhases(bodyText);
    if (!blocks.length) return { error:t("mldNoPhase") };
    var warn = [], phases = [], total = 0, usedIds = {};
    blocks.forEach(function (b, k) {
      var holes = extractPlaceholders(b.lines.join("\n"));
      var slots = holes.map(function (h) {
        if (!h.tag) warn.push(t("mldLooseHole", esc(h.name)));
        var id = h.name;
        while (usedIds[id]) id = id + "-2";
        usedIds[id] = 1;
        return { id:id, tag:(h.tag || "INS").toLowerCase(), q:h.ask || defaultAsk(h.name) };
      });
      total += slots.length;
      phases.push({ id:slug(b.label) || ("fase-" + (k + 1)), label:b.label, note:"", slots:slots });
    });
    if (!total) return { error:t("mldNoSlot") };
    var id = slug(title) || "molde";
    var taken = {};
    mergedMoldes().forEach(function (m) { taken[m.id] = 1; });
    while (taken[id]) id = id + "-2";
    return {
      molde: { id:id, label:String(title).trim().toLowerCase().slice(0, 18), title:String(title).trim(),
               hint:String(hint || "").trim(), steps:false, phases:phases, user:true },
      warn: warn
    };
  }

  function moldeFromMarkdown(md) {
    var title = "", intro = [], rest = [], seen = false;
    String(md || "").replace(/\r\n?/g, "\n").split("\n").forEach(function (ln) {
      var h1 = /^#\s+(.+)$/.exec(ln);
      if (h1 && !title) { title = h1[1].trim(); return; }
      if (/^##\s+/.test(ln)) seen = true;
      if (seen) rest.push(ln);
      else if (ln.trim() && !/^\s*```/.test(ln)) intro.push(ln.trim());
    });
    return moldeFromText(title, intro.join(" "), rest.join("\n"));
  }

  function moldeToMarkdown(m) {
    var L = ["# " + (m.title || m.label), "", (m.hint || ""), ""];
    (m.phases || []).forEach(function (ph) {
      L.push("## " + ph.label, "", "```glyph");
      (ph.slots || []).forEach(function (s) {
        L.push("[" + s.tag + "[ph-" + s.id + "`" + String(s.q).replace(/`/g, "’") + "`]]");
      });
      L.push("```", "");
    });
    return L.join("\n");
  }
  function moldeToEditorText(m) {
    var L = [];
    (m.phases || []).forEach(function (ph) {
      L.push("## " + ph.label);
      (ph.slots || []).forEach(function (s) {
        L.push("[" + s.tag + "[ph-" + s.id + "`" + String(s.q).replace(/`/g, "’") + "`]]");
      });
      L.push("");
    });
    return L.join("\n").trim();
  }

  /* ---- ler um .md do disco ---- */
  function readMd(inputEl, onText) {
    var f = inputEl.files && inputEl.files[0];
    if (!f) return;
    var fr = new FileReader();
    fr.onload = function () { onText(String(fr.result)); inputEl.value = ""; };
    fr.onerror = function () { inputEl.value = ""; };
    fr.readAsText(f);
  }

  function showDiag(id, items, sev) {
    var el = $(id);
    if (!el) return;
    if (!items || !items.length) { el.innerHTML = ""; return; }
    el.innerHTML = items.map(function (m) {
      return '<div class="gap ' + (sev || "ask") + '"><span class="bar"></span>' +
        '<span class="txt">' + m + "</span></div>";
    }).join("");
  }

  /* ---- a lista de modelos ---- */
  function drawTplList() {
    var bi = builtinTemplates(), us = userTemplates();
    var names = Object.keys(bi).concat(Object.keys(us).filter(function (k) { return !(k in bi); })).sort();
    $("tplCount").textContent = t("counts", names.length, Object.keys(us).length);
    $("tplList").innerHTML = names.map(function (n) {
      var def = us[n] || bi[n], mine = !!us[n];
      return '<div class="libRow" data-tpl="' + esc(n) + '">' +
        '<span class="nm">' + esc(n) + "</span>" +
        (mine ? '<span class="own">' + esc(t("mine")) + "</span>" : "") +
        '<span class="gl">' + esc(def.gloss || "") + "</span>" +
        '<span class="acts">' +
          '<button class="btn mini" type="button" data-act="use">' + esc(t("use")) + "</button>" +
          '<button class="btn mini" type="button" data-act="edit">' + esc(t("open")) + "</button>" +
          (mine ? '<button class="btn mini" type="button" data-act="del">' + esc(t("del")) + "</button>" : "") +
        "</span></div>";
    }).join("") || '<div class="none">' + t("noTemplates") + "</div>";
  }

  var tplEditing = null;
  function tplOpen(name) {
    var bi = builtinTemplates(), us = userTemplates();
    var def = (name && (us[name] || bi[name])) || { gloss:"", body:"" };
    tplEditing = name || null;
    $("tplName").value = name || "";
    $("tplGloss").value = def.gloss || "";
    $("tplBody").value = def.body || "";
    $("tplEditor").hidden = false;
    showDiag("tplDiag", []);
    tplPreview();
  }
  function tplPreview() {
    var holes = extractPlaceholders($("tplBody").value);
    $("tplParams").innerHTML = holes.length
      ? t("paramsRead", holes.map(function (h) {
          return "<code>" + esc(h.name) + "</code>"; }).join(" · "))
      : t("paramsNone");
  }
  function tplSave() {
    var name = slug($("tplName").value);
    var body = $("tplBody").value;
    if (!name) { showDiag("tplDiag", [t("needName")], "fix"); return; }
    if (!body.trim()) { showDiag("tplDiag", [t("needBody")], "fix"); return; }
    var holes = extractPlaceholders(body);
    var def = {
      gloss: $("tplGloss").value.trim(),
      params: holes.map(function (h) { return { name:h.name, ask:h.ask || defaultAsk(h.name) }; }),
      body: body.trim()
    };
    if (tplEditing && tplEditing !== name) deleteUserTemplate(tplEditing);
    if (!saveUserTemplate(name, def)) {
      showDiag("tplDiag", [t("noWrite")], "fix");
      return;
    }
    tplEditing = name;
    $("tplName").value = name;
    drawTplList();
    showDiag("tplDiag", [t("savedTpl", esc(name))], "note");
    run();
  }

  /* ---- a lista de moldes ---- */
  function drawMldList() {
    var us = userMoldes();
    var all = mergedMoldes();
    $("mldCount").textContent = t("counts", all.length, us.length);
    $("mldList").innerHTML = all.map(function (m) {
      var mine = !!m.user;
      return '<div class="libRow" data-mld="' + esc(m.id) + '">' +
        '<span class="nm">' + esc(mLabel(m)) + "</span>" +
        (mine ? '<span class="own">' + esc(t("mine")) + "</span>" : "") +
        '<span class="gl">' + esc(mTitle(m) || "") + "</span>" +
        '<span class="acts">' +
          '<button class="btn mini" type="button" data-act="use">' + esc(t("use")) + "</button>" +
          '<button class="btn mini" type="button" data-act="edit">' + esc(t("open")) + "</button>" +
          (mine ? '<button class="btn mini" type="button" data-act="del">' + esc(t("del")) + "</button>" : "") +
        "</span></div>";
    }).join("") || '<div class="none">' + t("noMoldes") + "</div>";
  }

  var mldEditing = null;
  function mldOpen(id) {
    var m = id ? moldeById(id) : null;
    mldEditing = (m && m.user) ? m.id : null;
    $("mldTitle").value = m ? (m.title || "") : "";
    $("mldHint").value = m ? (m.hint || "") : "";
    $("mldBody").value = m ? moldeToEditorText(m) : "";
    $("mldEditor").hidden = false;
    showDiag("mldDiag", m && !m.user ? [t("builtinCopy")] : [], "note");
    mldPreview();
  }
  function mldPreview() {
    var blocks = parseMoldePhases($("mldBody").value);
    var n = 0;
    blocks.forEach(function (b) { n += extractPlaceholders(b.lines.join("\n")).length; });
    $("mldParams").innerHTML = blocks.length
      ? t("phasesRead", blocks.length, n)
      : t("phasesNone");
  }
  function mldSave() {
    var built = moldeFromText($("mldTitle").value, $("mldHint").value, $("mldBody").value);
    if (built.error) { showDiag("mldDiag", [built.error], "fix"); return; }
    if (mldEditing) built.molde.id = mldEditing;      // editar não duplica
    if (!saveUserMolde(built.molde)) {
      showDiag("mldDiag", [t("noWrite")], "fix");
      return;
    }
    mldEditing = built.molde.id;
    drawMldList();
    showDiag("mldDiag", (built.warn || []).concat([t("saved")]), built.warn.length ? "ask" : "note");
  }

  /* Trocar de molde é a mesma coisa vinda de dois lugares: as fichas de cima
     (só os embutidos, para a fileira não crescer sem fim) e a lista de baixo. */
  function activateMolde(id) {
    if (!moldeById(id)) return;
    state.molde = id; state.detached = false;
    state.slots = {}; state.steps = ["", ""]; state.junctions = [];
    rebuild();
  }

  /* ======================================================
     12. AS DUAS LÍNGUAS

     A ficha EN-EU existia no HTML desde sempre, sem ninguém escutando o
     clique: trocar de língua não fazia nada. O dicionário abaixo é a tela
     inteira, e o motor não entra nele — INSTR, STRUCT, META, EMO e SESSION
     já são inglês porque chegam ao entregável, então em EN a tabela de
     comandos passa a mostrar a glosa do próprio motor em vez da tradução
     pt-BR de CATS. A tradução que não precisa existir é a melhor.

     Vale notar o efeito colateral bom: a pergunta de cada casa do molde vira
     <needs> no XML, ou seja, chega ao entregável. Em EN ela finalmente sai em
     inglês, que é o que a fronteira de língua sempre pediu.
     ====================================================== */

  var I18N = {
    pt_BR: {
      docTitle: "Glyph — molde e motor",
      rule: "Molde pergunta, você responde o que souber. <strong>Casa vazia não bloqueia</strong>: vira <code>&lt;needs&gt;</code> no XML — mande incompleto, preencha com a resposta. Sem <kbd>shift</kbd>: humor <code>/frs/</code> · literal <code>'texto'</code> · teto e piso <code>pc[] pb[]</code> · retorno <code>r-</code>.",

      moldeWord: "molde",
      detach: "soltar do molde",
      attach: "voltar ao molde",
      detachedName: "molde · solto",
      detachedMsg: "Molde solto. Fonte editável à mão — <em>voltar ao molde</em> retoma as perguntas.",
      youAreHere: "você está aqui",
      stepsLabel: "os passos mínimos, em ordem",
      addStep: "+ passo",
      stepPh: "o que acontece no passo {0}",
      juncPh: "qual [cond] trata erro depois de {0} e antes de {1}?",
      saveName: "nome: ",
      saveNamePh: "meu-fluxo",
      phSteps: "qual o primeiro passo mínimo entre a partida e o alvo?",
      phErr: "condição de tratamento de erro entre passo {0} e {1}",
      condFail: "falha entre {0} e {1}",
      revText: "revisão técnica do resultado do fluxo",
      scruText: "escrutínio formal da lógica de execução",

      srcTitle: "fonte glyph",
      srcPh: "[rw[cr'api/pedidos.py'",

      tplTitle: "modelos",
      tplHelp: "Modelos com buracos <code>[ph-nome</code>. Os parâmetros saem do próprio corpo — não se declara nada duas vezes.",
      mldTitle: "meus moldes",
      mldHelp: "Cada fase é um <code>## Rótulo</code> seguido das casas, uma por linha, na forma <code>[tag[ph-id`a pergunta`]]</code>.",
      newOne: "novo",
      importMd: "importar .md",
      exportMd: "exportar .md",
      save: "salvar",
      close: "fechar",
      use: "usar",
      open: "abrir",
      del: "apagar",
      mine: "seu",
      counts: "{0} · {1} seus",
      fName: "nome",
      fGloss: "o que faz",
      fBody: "corpo (glyph)",
      fTitle: "título",
      fHint: "dica",
      fPhases: "fases e casas",
      tplNamePh: "meu-modelo",
      mldTitlePh: "Revisão de contrato",
      paramsRead: "parâmetros lidos do corpo: {0}",
      paramsNone: "nenhum <code>[ph-</code> no corpo — o modelo não tem buraco para preencher.",
      phasesRead: "{0} fase(s), {1} casa(s) lidas do corpo.",
      phasesNone: "nenhuma fase — comece uma linha com <code>## </code>.",
      noTemplates: "nenhum modelo.",
      noMoldes: "nenhum molde.",
      savedTpl: "gravado. <code>[--{0}</code> já expande.",
      saved: "gravado.",
      readFromFile: "lido do arquivo. Confira e salve.",
      builtinCopy: "este é embutido: salvar cria uma cópia sua.",
      needName: "falta o nome do modelo.",
      needBody: "falta o corpo do modelo.",
      noWrite: "o navegador não deixou gravar (cota ou aba anônima).",
      mdNoTitle: "falta o título: a primeira linha precisa ser <code># nome</code>.",
      mdNoBody: "falta o corpo: um bloco cercado por <code>```</code> com o glyph do modelo.",
      mldNoTitle: "falta o título do molde.",
      mldNoPhase: "nenhuma fase: comece uma linha com <code>## </code> e o rótulo.",
      mldNoSlot: "nenhuma casa: cada linha é <code>[tag[ph-id`a pergunta`]]</code>.",
      mldLooseHole: "<code>[ph-{0}</code> sem comando em volta — virou <code>[ins</code>.",

      cmdsTitle: "comandos por categoria",
      findPh: "buscar por sentido: revisar, condição, arredonda…",
      all: "tudo",
      catConta: "Conta", catPunct: "Pontuação", catHumor: "Humor", catAtalhos: "Atalhos",
      capConta: "só dentro de [logic]",
      capPunct: "fora dos colchetes",
      capHumor: "desambigua a ênfase quando o comando é vago",
      capSession: "Seus atalhos",
      capSessionNote: "vocabulário de sessão",
      nothingFor: "nada com “{0}”",
      notExist: "não existe",

      xmlEdit: "editar", xmlApply: "aplicar",
      copy: "copiar", download: "baixar",
      gapsTitle: "o que falta dizer",
      targetTitle: "destino",
      fHarness: "harness", fModel: "modelo", fRole: "papel",
      tgWrites: "escreve", tgRegisters: "registra", tgHeader: "cabeçalho",
      tgSoon: "ainda não ligado",
      tgPending: "A seleção é lembrada e mostra para onde o bundle vai. Ela ainda não altera .xml, .json nem .hgml — quem passa a lê-la é o emissor de bundle.",
      copied: "copiado", copyFail: "selecione e copie",

      labFix: "erro", labAsk: "falta", labNote: "nota",
      complete: "<b>Completo.</b> Copie e mande.",
      pickOne: "Escolha um molde ou escreva à esquerda.",
      toFix: "{0} a consertar · ", toSay: "{0} a dizer", notes: "{0} nota(s)",
      stat: "{0} bloco(s) · {1} comando(s) · {2} linhas de xml",
      footer: "o xml não faz nada sozinho — ele é o recado pra mim"
    },

    en: {
      docTitle: "Glyph — form and engine",
      rule: "The form asks, you answer what you know. <strong>An empty field does not block</strong>: it becomes <code>&lt;needs&gt;</code> in the XML — send it incomplete and let the answer fill it. No <kbd>shift</kbd> needed: mood <code>/frs/</code> · literal <code>'text'</code> · ceiling and floor <code>pc[] pb[]</code> · return <code>r-</code>.",

      moldeWord: "form",
      detach: "detach form",
      attach: "re-attach form",
      detachedName: "form · detached",
      detachedMsg: "Form detached. The source is yours to edit — <em>re-attach form</em> brings the questions back.",
      youAreHere: "you are here",
      stepsLabel: "the smallest steps, in order",
      addStep: "+ step",
      stepPh: "what happens at step {0}",
      juncPh: "which [cond] handles failure after {0} and before {1}?",
      saveName: "name: ",
      saveNamePh: "my-flow",
      phSteps: "what is the smallest first step between start and target?",
      phErr: "error-handling condition between step {0} and {1}",
      condFail: "failure between {0} and {1}",
      revText: "technical review of the flow's result",
      scruText: "formal scrutiny of the execution logic",

      srcTitle: "glyph source",
      srcPh: "[rw[cr'api/orders.py'",

      tplTitle: "templates",
      tplHelp: "Templates with <code>[ph-name</code> holes. The parameters come from the body itself — nothing is declared twice.",
      mldTitle: "my forms",
      mldHelp: "Each phase is a <code>## Label</code> followed by its fields, one per line, written <code>[tag[ph-id`the question`]]</code>.",
      newOne: "new",
      importMd: "import .md",
      exportMd: "export .md",
      save: "save",
      close: "close",
      use: "use",
      open: "open",
      del: "delete",
      mine: "yours",
      counts: "{0} · {1} yours",
      fName: "name",
      fGloss: "what it does",
      fBody: "body (glyph)",
      fTitle: "title",
      fHint: "hint",
      fPhases: "phases and fields",
      tplNamePh: "my-template",
      mldTitlePh: "Contract review",
      paramsRead: "parameters read from the body: {0}",
      paramsNone: "no <code>[ph-</code> in the body — this template has no hole to fill.",
      phasesRead: "{0} phase(s), {1} field(s) read from the body.",
      phasesNone: "no phase yet — start a line with <code>## </code>.",
      noTemplates: "no templates.",
      noMoldes: "no forms.",
      savedTpl: "saved. <code>[--{0}</code> expands now.",
      saved: "saved.",
      readFromFile: "read from the file. Check it and save.",
      builtinCopy: "this one is built in: saving makes a copy of your own.",
      needName: "the template needs a name.",
      needBody: "the template needs a body.",
      noWrite: "the browser refused to store it (quota, or a private window).",
      mdNoTitle: "no title: the first line must be <code># name</code>.",
      mdNoBody: "no body: a block fenced with <code>```</code> holding the glyph.",
      mldNoTitle: "the form needs a title.",
      mldNoPhase: "no phase: start a line with <code>## </code> and the label.",
      mldNoSlot: "no fields: each line is <code>[tag[ph-id`the question`]]</code>.",
      mldLooseHole: "<code>[ph-{0}</code> has no command around it — it became <code>[ins</code>.",

      cmdsTitle: "commands by category",
      findPh: "search by meaning: review, condition, round…",
      all: "all",
      catConta: "Maths", catPunct: "Punctuation", catHumor: "Mood", catAtalhos: "Shortcuts",
      capConta: "inside [logic] only",
      capPunct: "outside the brackets",
      capHumor: "settles the emphasis when the command is vague",
      capSession: "Your shortcuts",
      capSessionNote: "session vocabulary",
      nothingFor: "nothing matching “{0}”",
      notExist: "does not exist",

      xmlEdit: "edit", xmlApply: "apply",
      copy: "copy", download: "download",
      gapsTitle: "what is left to say",
      targetTitle: "destination",
      fHarness: "harness", fModel: "model", fRole: "role",
      tgWrites: "writes", tgRegisters: "registers", tgHeader: "header",
      tgSoon: "not wired yet",
      tgPending: "The selection is remembered and shows where the bundle will land. It does not yet change .xml, .json or .hgml — the bundle emitter is what will read it.",
      copied: "copied", copyFail: "select it and copy",

      labFix: "error", labAsk: "missing", labNote: "note",
      complete: "<b>Complete.</b> Copy it and send.",
      pickOne: "Pick a form, or write on the left.",
      toFix: "{0} to fix · ", toSay: "{0} to say", notes: "{0} note(s)",
      stat: "{0} block(s) · {1} command(s) · {2} lines of xml",
      footer: "the xml does nothing on its own — it is the message to me"
    }
  };

  /* t("chave", a, b) — {0} e {1} saem dos argumentos. Sem língua achada,
     devolve a chave: aparecer cru na tela é melhor que sumir sem rastro. */
  function t(key) {
    var dict = I18N[state.lang] || I18N.pt_BR;
    var s = dict[key];
    if (s === undefined) s = I18N.pt_BR[key];
    if (s === undefined) return key;
    var args = arguments;
    return String(s).replace(/\{(\d+)\}/g, function (m, i) {
      var v = args[Number(i) + 1];
      return v === undefined ? m : v;
    });
  }

  /* A tela estática pede tradução por atributo, não por getElementById em
     lista: o HTML diz qual chave é a sua e este laço não precisa saber quantos
     painéis existem. */
  function applyStaticLang() {
    document.documentElement.lang = (state.lang === "en") ? "en" : "pt-BR";
    document.title = t("docTitle");
    var el;
    var byText = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < byText.length; i++) {
      el = byText[i]; el.textContent = t(el.getAttribute("data-i18n"));
    }
    var byHtml = document.querySelectorAll("[data-i18n-html]");
    for (i = 0; i < byHtml.length; i++) {
      el = byHtml[i]; el.innerHTML = t(el.getAttribute("data-i18n-html"));
    }
    var byPh = document.querySelectorAll("[data-i18n-ph]");
    for (i = 0; i < byPh.length; i++) {
      el = byPh[i]; el.placeholder = t(el.getAttribute("data-i18n-ph"));
    }
  }


  /* ---- de qual língua sai cada dado ----
     O overlay MOLDES_EN é consultado por id; faltando a chave, cai no pt-BR
     daquele pedaço em vez de sumir. Molde do usuário nunca tem overlay — foi
     ele quem escreveu, na língua que quis. */
  function enOn() { return state.lang === "en"; }
  function moldeEn(m) {
    return (enOn() && typeof MOLDES_EN !== "undefined" && MOLDES_EN && m) ? MOLDES_EN[m.id] : null;
  }
  function mLabel(m) { var e = moldeEn(m); return (e && e.label) || m.label; }
  function mTitle(m) { var e = moldeEn(m); return (e && e.title) || m.title || m.label; }
  function mHint(m)  { var e = moldeEn(m); return (e && e.hint)  || m.hint || ""; }
  function phLabel(m, ph) {
    var e = moldeEn(m);
    return (e && e.phases && e.phases[ph.id] && e.phases[ph.id].label) || ph.label;
  }
  function phNote(m, ph) {
    var e = moldeEn(m);
    if (e && e.phases && e.phases[ph.id]) return e.phases[ph.id].note;
    return ph.note;
  }
  function slotQ(m, slot) {
    var e = moldeEn(m);
    return (e && e.slots && e.slots[slot.id]) || slot.q;
  }
  function extraQ(x) {
    return (enOn() && typeof EXTRAS_EN !== "undefined" && EXTRAS_EN && EXTRAS_EN[x.id]) || x.q;
  }
  function presetEn(k) {
    return (enOn() && typeof PRESETS_EN !== "undefined" && PRESETS_EN) ? PRESETS_EN[k] : null;
  }
  function presetLabel(p, k) { var e = presetEn(k); return (e && e.label) || p.label; }
  /* a fonte do exemplo também: um exemplo em pt-BR numa tela em inglês ensina
     a sintaxe e atrapalha a leitura ao mesmo tempo. */
  function presetSrc(p, k) { var e = presetEn(k); return (e && e.src) || p.src; }

  /* CATS é dado de interface e pt-BR por desenho (o comentário no motor diz
     isso). Aqui está só a metade inglesa: rótulo e nota da categoria. As 104
     glosas de comando NÃO estão — INSTR, STRUCT e META já as têm em inglês
     porque viram nome de elemento no XML, e cmdGloss() vai buscar lá. Uma
     tradução que já existe não se escreve de novo. */
  var CATS_EN = {
    acao:       ["Action",    "operate on something that already exists"],
    juizo:      ["Judgement", "measure something that already exists"],
    pergunta:   ["Question",  "ask for what is not there yet"],
    enquadre:   ["Framing",   "say what kind of thing this is"],
    contexto:   ["Context",   "what surrounds the request"],
    condicao:   ["Condition", "when it applies and when it does not"],
    limite:     ["Limit",     "where it must not go"],
    raciocinio: ["Reasoning", "how to get there"],
    rumo:       ["Course",    "where it is heading"],
    intensidade:["Intensity", "how strongly"],
    molde:      ["Form",      "shape the answer must take"],
    marca:      ["Mark",      "notes on the message itself"]
  };
  function catLabel(c) { var e = enOn() && CATS_EN[c.id]; return e ? e[0] : c.label; }
  function catNote(c)  { var e = enOn() && CATS_EN[c.id]; return e ? e[1] : c.note; }

  /* Em EN a glosa vem do próprio motor: classify() devolve o texto que já
     virou <criticize> no XML, então a tabela de comandos passa a falar a
     mesma língua que o entregável. Em pt-BR segue PTBR, que é CATS. */
  function cmdGloss(canonical) {
    if (!enOn()) return PTBR[canonical] || "";
    var cl = classify(canonical, OPTS);
    return (cl && cl.gloss) || PTBR[canonical] || "";
  }

  function drawLangPick() {
    var chips = $("langPicker").querySelectorAll(".chip");
    for (var i = 0; i < chips.length; i++)
      chips[i].setAttribute("aria-pressed", String(chips[i].getAttribute("data-lang") === state.lang));
  }

  function syncOptsLang() { OPTS.lang = (state.lang === "en") ? "en" : "pt"; }

  function setLang(lang) {
    if (!I18N[lang] || lang === state.lang) return;
    state.lang = lang;
    syncOptsLang();
    lsSet(LS.lang, lang);
    applyStaticLang();
    drawLangPick();
    /* tudo que é desenhado por JS precisa ser redesenhado: o dicionário só
       alcança o que passar por t() de novo. */
    drawCatRow(); drawCmds(); drawPresets();
    drawTplList(); drawMldList(); drawTarget();
    /* o resumo dos parâmetros é texto traduzido dentro de um editor que pode
       estar aberto na hora da troca — sem isto ele fica na língua anterior. */
    if (!$("tplEditor").hidden) tplPreview();
    if (!$("mldEditor").hidden) mldPreview();
    drawMoldePick(); drawMolde();
    if (!state.detached) srcEl.value = buildGlyph(state);
    run();
  }

  /* a língua entra antes do primeiro desenho: restaurada depois, a tela
     nasceria em pt-BR e piscaria para o inglês na frente de quem escolheu EN. */
  state.lang = lsGet(LS.lang, "pt_BR");
  if (!I18N[state.lang]) state.lang = "pt_BR";
  syncOptsLang();

  /* destino e aba ativa saem do localStorage pelo mesmo motivo da lingua:
     restaurados depois do primeiro desenho, a tela piscaria. */
  state.target = lsGet(LS.target, { harness:"claude-code", model:"inherit", role:"dv" });
  state.tab = lsGet(LS.tab, "xml");

  drawPresets();
  drawMoldePick();
  bindMolde();
  drawCatRow();
  drawCmds();
  bindTabs();
  bindTarget();
  drawTarget();
  rebuild();   // v1.0.9: era sync(false), função que nunca existiu — o bootstrap
               // morria aqui e o painel de XML nascia vazio.
  setTab(state.tab);   // depois de rebuild(): pinta a aba com conteudo ja calculado


  /* ---- baixar e copiar: uma barra, agindo sobre a aba ativa ----
     Eram oito botões, dois por formato, espalhados por três cards. O par
     agora é um só e pergunta à aba qual conteúdo entregar — o botão É o
     botão daquela aba sem precisar existir quatro vezes. */
  onBtn("outDl", function () {
    var tab = TABS[state.tab];
    downloadText(stamp(tab.ext), tab.mime, tab.get());
  });
  wireCopyButton("outCopy", "copy", function () { return TABS[state.tab].get(); });

  /* ---- xml editável ---- */
  onBtn("xmlEdit", function () { state.xmlEditing ? xmlApply() : xmlEditOn(); });

  /* ---- modelos ---- */
  onBtn("tplNew", function () { tplOpen(null); });
  onBtn("tplImport", function () { $("tplFile").click(); });
  $("tplFile").addEventListener("change", function () {
    readMd($("tplFile"), function (md) {
      var got = templateFromMarkdown(md);
      if (got.error) { $("tplEditor").hidden = false; showDiag("tplDiag", [got.error], "fix"); return; }
      tplEditing = null;
      $("tplName").value = got.name;
      $("tplGloss").value = got.gloss;
      $("tplBody").value = got.body;
      $("tplEditor").hidden = false;
      tplPreview();
      showDiag("tplDiag", [t("readFromFile")], "note");
    });
  });
  onBtn("tplSave", tplSave);
  onBtn("tplCancel", function () { $("tplEditor").hidden = true; tplEditing = null; });
  onBtn("tplExport", function () {
    var name = slug($("tplName").value) || "modelo";
    downloadText(name + ".md", "text/markdown",
      templateToMarkdown(name, { gloss:$("tplGloss").value, body:$("tplBody").value }));
  });
  $("tplBody").addEventListener("input", tplPreview);
  $("tplList").addEventListener("click", function (ev) {
    var b = ev.target.closest ? ev.target.closest("button[data-act]") : null;
    if (!b) return;
    var row = b.closest(".libRow"), name = row && row.getAttribute("data-tpl");
    if (!name) return;
    var act = b.getAttribute("data-act");
    if (act === "use") {
      if (!state.detached) { state.detached = true; srcEl.readOnly = false; drawMolde(); drawMoldePick(); }
      var ins = "[--" + name;
      var a = srcEl.selectionStart, z = srcEl.selectionEnd, v = srcEl.value;
      srcEl.value = v.slice(0, a) + ins + v.slice(z);
      srcEl.focus();
      srcEl.setSelectionRange(a + ins.length, a + ins.length);
      run();
    } else if (act === "edit") tplOpen(name);
    else if (act === "del") { deleteUserTemplate(name); drawTplList(); run(); }
  });

  /* ---- moldes ---- */
  onBtn("mldNew", function () { mldOpen(null); });
  onBtn("mldImport", function () { $("mldFile").click(); });
  $("mldFile").addEventListener("change", function () {
    readMd($("mldFile"), function (md) {
      var got = moldeFromMarkdown(md);
      if (got.error) { $("mldEditor").hidden = false; showDiag("mldDiag", [got.error], "fix"); return; }
      mldEditing = null;
      $("mldTitle").value = got.molde.title;
      $("mldHint").value = got.molde.hint;
      $("mldBody").value = moldeToEditorText(got.molde);
      $("mldEditor").hidden = false;
      mldPreview();
      showDiag("mldDiag", (got.warn || []).concat([t("readFromFile")]),
        got.warn.length ? "ask" : "note");
    });
  });
  onBtn("mldSave", mldSave);
  onBtn("mldCancel", function () { $("mldEditor").hidden = true; mldEditing = null; });
  onBtn("mldExport", function () {
    var built = moldeFromText($("mldTitle").value, $("mldHint").value, $("mldBody").value);
    if (built.error) { showDiag("mldDiag", [built.error], "fix"); return; }
    downloadText(built.molde.id + ".md", "text/markdown", moldeToMarkdown(built.molde));
  });
  $("mldBody").addEventListener("input", mldPreview);
  $("mldList").addEventListener("click", function (ev) {
    var b = ev.target.closest ? ev.target.closest("button[data-act]") : null;
    if (!b) return;
    var row = b.closest(".libRow"), id = row && row.getAttribute("data-mld");
    if (!id) return;
    var act = b.getAttribute("data-act");
    if (act === "use") activateMolde(id);
    else if (act === "edit") mldOpen(id);
    else if (act === "del") {
      deleteUserMolde(id);
      if (state.molde === id) { state.molde = MOLDES[0].id; state.slots = {}; }
      drawMldList(); rebuild();
    }
  });

  /* a ficha EN-EU estava no HTML desde o começo sem ninguém escutando */
  $("langPicker").addEventListener("click", function (ev) {
    var b = ev.target.closest ? ev.target.closest(".chip") : null;
    if (!b) return;
    setLang(b.getAttribute("data-lang"));
  });

  refreshTemplates();
  drawTplList();
  drawMldList();
  restoreCollapse();
  bindCollapse();
  bindSummaryGuard();
  drawLangPick();
  applyStaticLang();


  window.__glyph = {
    setTab:setTab, drawTarget:drawTarget, TABS:TABS,
    tokenize:tokenize, parse:parse, buildXml:buildXml, colorize:colorize, renderLit:renderLit,
    parseLogic:parseLogic, expandExpr:expandExpr, freeVars:freeVars, classify:classify, walk:walk,
    buildGlyph:buildGlyph, countPhase:countPhase, moldeById:moldeById,
    MOLDES:MOLDES, CATS:CATS, PRESETS:PRESETS, INSTR:INSTR, EMO:EMO, FRAMES:FRAMES,
    SESSION:SESSION, ALIAS:ALIAS, LOGIC_OPS:LOGIC_OPS, PTBR:PTBR, CAT_OF:CAT_OF
  };
})();
