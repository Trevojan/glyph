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
     sabia emitir XML, só a outra rodava fora do navegador. Desde a v1.9 há
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
  if (typeof GlyphTemplates !== "undefined" && GlyphTemplates) Core.useTemplates(GlyphTemplates);
  if (typeof GlyphRules !== "undefined" && GlyphRules) Core.useRules(GlyphRules);

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
        var ttl = cl.tier === "unknown" ? "não existe" : (PTBR[cl.canonical] || cl.gloss || "");
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
    for (var i = 0; i < MOLDES.length; i++) if (MOLDES[i].id === id) return MOLDES[i];
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

  function slotLine(slot, value) {
    if (value && value.trim()) return "  [" + slot.tag + "'" + litSafe(value) + "']";
    return "  [ph-" + slot.id + "'" + litSafe(slot.q) + "']";
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
      L.push("  [nt'" + ph.label.toLowerCase() + "']");
      ph.slots.forEach(function (slot) {
        L.push(slotLine(slot, state.slots[slot.id]));
      });
      if (ph.id === "percurso" && m.steps) {
        var steps = state.steps.filter(function (s) { return s && s.trim(); });
        if (!steps.length) {
          L.push("  [ph-passos'qual o primeiro passo mínimo entre a partida e o alvo?']");
        } else {
          steps.forEach(function (st, k) {
            var letter = String.fromCharCode(65 + k);
            L.push("  [ins'" + letter + ": " + litSafe(st) + "']");
            if (k < steps.length - 1) {
              var jv = state.junctions[k] || "";
              var nextL = String.fromCharCode(65 + k + 1);
              if (jv.trim())
                L.push("  [cond'falha entre " + letter + " e " + nextL + ": " + litSafe(jv) + "']");
              else
                L.push("  [ph-erro" + letter + nextL +
                  "'condição de tratamento de erro entre passo " + letter + " e " + nextL + "']");
            }
          });
        }
      }
    });

    if (state.extras.rev)  L.push("  [rev'revisão técnica do resultado do fluxo']");
    if (state.extras.scru) L.push("  [scru'escrutínio formal da lógica de execução']");
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
  var srcEl = $("src"), lastXml = "";
  var OPTS = { session:true, valency:true };

  var state = {
    molde: "fluxo",
    slots: {},
    steps: ["", ""],
    junctions: [],
    extras: { rev:false, scru:false, save:false },
    saveName: "",
    detached: false,
    lang: "pt_BR"
  };

  var I18N = {
    pt_BR: {
      rule: "Molde pergunta, você responde o que souber. <strong>Casa vazia não bloqueia</strong>: vira <code>&lt;needs&gt;</code> no XML — mande incompleto, preencha com a resposta. Sem <kbd>shift</kbd>: humor <code>/frs/</code> · literal <code>'texto'</code> · teto e piso <code>pc[] pb[]</code> · retorno <code>r-</code>.",
      detach: "soltar do molde",
      attach: "voltar ao molde",
      detachedMsg: "Molde solto. Fonte editável à mão — <em>voltar ao molde</em> retoma as perguntas."
    },
    en: {
      rule: "Template prompts for technical input. <strong>Empty fields do not block</strong>: translated into <code>&lt;needs&gt;</code> tags in XML. Fast input: emotion <code>/frs/</code> · literal <code>'text'</code> · ceil and floor <code>pc[] pb[]</code> · return <code>r-</code>.",
      detach: "detach template",
      attach: "re-attach template",
      detachedMsg: "Template detached. Source editable manually — <em>re-attach template</em> to restore prompts."
    }
  };


  /* ---- molde ---- */
  function drawMoldePick() {
    $("moldePick").innerHTML = MOLDES.map(function (m) {
      return '<button class="chip" type="button" data-m="' + m.id + '" aria-pressed="' +
        (m.id === state.molde && !state.detached) + '">' + esc(m.label) + "</button>";
    }).join("") + '<button class="chip" type="button" id="detach">' +
      (state.detached ? "voltar ao molde" : "soltar do molde") + "</button>";
  }

  function drawMolde() {
    var m = moldeById(state.molde);
    var body = $("moldeBody");
    if (state.detached) {
      body.innerHTML = '<div class="none">Molde solto. Fonte editável à mão — <em>voltar ao molde</em> retoma as perguntas.</div>';
      $("moldeName").textContent = "molde · solto";
      return;
    }
    $("moldeName").textContent = "molde · " + m.title.toLowerCase();

    var H = [];

    H.push('<div class="where" id="whereBar"></div>');
    H.push('<p style="margin:9px 0 0;font-size:12.5px;color:var(--muted)">' + esc(m.hint) + "</p>");

    m.phases.forEach(function (ph) {
      H.push('<div class="phase"><h3>' + esc(ph.label) +
        (ph.note ? " <em>" + esc(ph.note) + "</em>" : "") + "</h3>");
      ph.slots.forEach(function (slot) {
        var val = state.slots[slot.id] || "";
        H.push('<div class="slot' + (val.trim() ? " done" : "") + '" id="slot_' + slot.id + '">' +
          '<label for="s_' + slot.id + '"><span class="dot"></span>' +
          '<span class="tg">[' + esc(slot.tag) + '</span>' + esc(slot.q) + "</label>" +
          '<textarea id="s_' + slot.id + '" rows="1" data-slot="' + slot.id +
          '" spellcheck="false" placeholder="…">' + esc(val) + "</textarea></div>");
      });

      if (ph.id === "percurso" && m.steps) {
        H.push('<div class="slot' + (state.steps.some(function (s) { return s && s.trim(); }) ? " done" : "") +
          '" id="slot_passos">' +
          '<label><span class="dot"></span><span class="tg">[ins</span>os passos mínimos, em ordem</label>' +
          '<div class="steps">');
        state.steps.forEach(function (st, k) {
          var letter = String.fromCharCode(65 + k);
          H.push('<div class="step"><span class="k">' + letter + '</span>' +
            '<input type="text" id="st_' + k + '" data-step="' + k + '" spellcheck="false" value="' + esc(st) +
            '" placeholder="o que acontece no passo ' + letter +
            '"><button class="btn mini" type="button" data-rmstep="' + k + '">−</button></div>');
          if (k < state.steps.length - 1) {
            var nextL = String.fromCharCode(65 + k + 1);
            H.push('<div class="junction"><span class="k">↳</span>' +
              '<input type="text" id="jn_' + k + '" data-junc="' + k + '" spellcheck="false" value="' +
              esc(state.junctions[k] || "") +
              '" placeholder="qual [cond] trata erro depois de ' + letter + ' e antes de ' + nextL + '?"></div>');
          }
        });
        H.push('</div><div class="stepbar"><button class="btn mini" type="button" id="addstep">+ passo</button></div></div>');
      }
      H.push("</div>");
    });

    H.push('<div class="extras">');
    EXTRAS.forEach(function (x) {
      H.push('<label><input type="checkbox" data-extra="' + x.id + '"' +
        (state.extras[x.id] ? " checked" : "") + "> " + x.q + "</label>");
    });
    if (state.extras.save)
      H.push('<label>nome: <input type="text" id="saveName" spellcheck="false" value="' +
        esc(state.saveName) + '" placeholder="meu-fluxo"></label>');
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
      return '<div class="ph ' + cls + '"><span class="n">' + esc(ph.label) + "</span>" +
        '<span class="c">' + c.filled + "/" + c.total + "</span>" +
        (ph.id === firstIncomplete ? '<span class="you">você está aqui</span>' : "") + "</div>";
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
      state.molde = id; state.detached = false;
      state.slots = {}; state.steps = ["", ""]; state.junctions = [];
      rebuild();
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
      H.push('<table class="cmds"><caption>' + esc(c.label) +
        '<span>' + esc(c.note) + "</span></caption><tbody>" +
        rows.map(function (it) {
          var al = ALIAS_OF[it[0]] ? " · " + ALIAS_OF[it[0]].map(function (a) { return "[" + a.toLowerCase(); }).join(" ") : "";
          return '<tr><td class="c"><button type="button" data-ins="[' + it[0].toLowerCase() +
            '">[' + esc(it[0].toLowerCase()) + '</button></td><td class="m">' +
            esc(it[1]) + '<span style="color:var(--muted);opacity:.7">' + esc(al) + "</span></td></tr>";
        }).join("") + "</tbody></table>");
    });

    if (!catFilter || catFilter === "conta") {
      var lrows = LOGIC_OPS.filter(function (o) { total++; return matches(o[0], o[1]); });
      if (lrows.length) {
        shown += lrows.length;
        H.push('<table class="cmds"><caption>Conta<span>só dentro de [logic]</span></caption><tbody>' +
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
        H.push('<table class="cmds"><caption>Pontuação<span>fora dos colchetes</span></caption><tbody>' +
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
        H.push('<table class="cmds"><caption>Humor<span>desambigua a ênfase quando o comando é vago</span></caption><tbody>' +
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
        H.push('<table class="cmds"><caption>Seus atalhos<span>vocabulário de sessão</span></caption><tbody>' +
          srows.map(function (k) {
            return '<tr><td class="c"><button type="button" data-ins="[' + k + '">[' +
              esc(k) + "</button></td><td class=\"m\">" + esc(SESSION[k]) + "</td></tr>";
          }).join("") + "</tbody></table>");
      }
    }

    $("cmdTbl").innerHTML = H.length ? H.join("") : '<div class="none">nada com “' + esc(q) + '”</div>';
    $("cmdCount").textContent = shown + "/" + total;
  }

  function drawCatRow() {
    var extra = [["conta","Conta"],["punct","Pontuação"],["humor","Humor"],["atalhos","Atalhos"]];
    $("catRow").innerHTML =
      '<button class="chip" type="button" data-cat="" aria-pressed="' + (!catFilter) + '">tudo</button>' +
      CATS.map(function (c) {
        return '<button class="chip" type="button" data-cat="' + c.id + '" aria-pressed="' +
          (catFilter === c.id) + '">' + esc(c.label) + "</button>";
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
    $("xmlOut").innerHTML = colorize(lastXml);
    $("litOut").innerHTML = src.trim() ? renderLit(src, tokens, OPTS) : "";

    // v1.9: os nós crus têm `parent`/`tok` e fechavam ciclo — JSON.stringify
    // estourava aqui e matava o resto de run(). O módulo serializa direito.
    $("astOut").textContent = JSON.stringify(Core.serializeAST(res.segments, res.gaps), null, 2);

    var asks = res.gaps.filter(function (g) { return g.sev === "ask"; }).length;
    var fixes = res.gaps.filter(function (g) { return g.sev === "fix"; }).length;

    if (!res.gaps.length) {
      $("gapOut").innerHTML = src.trim()
        ? '<div class="clear"><b>Completo.</b> Copie e mande.</div>'
        : '<div class="clear">Escolha um molde ou escreva à esquerda.</div>';
    } else {
      var LAB = { fix:"erro", ask:"falta", note:"nota" };
      $("gapOut").innerHTML = res.gaps.map(function (g) {
        return '<div class="gap ' + g.sev + '"><span class="bar"></span><span class="txt">' +
          '<span class="lab">' + (g.lab || LAB[g.sev]) + "</span>" + g.msg + "</span></div>";
      }).join("");
    }
    $("gapCount").textContent = res.gaps.length
      ? (fixes ? fixes + " a consertar · " : "") + (asks ? asks + " a dizer" : "") ||
        (res.gaps.length + " nota(s)")
      : "";

    var cmds = 0;
    res.segments.forEach(function (sg) { walk(sg.children, function (nd) { if (nd.canonical) cmds++; }); });
    $("stat").textContent = src.trim()
      ? res.segments.length + " bloco(s) · " + cmds + " comando(s) · " + lastXml.split("\n").length + " linhas de xml"
      : "";

    var b = $("copy"); b.className = "btn"; b.textContent = "copiar";
  }

  /* ---- presets ---- */
  $("presets").innerHTML = PRESETS.map(function (p, k) {
    return '<button class="chip" type="button" data-p="' + k + '">' + esc(p.label) + "</button>";
  }).join("");
  $("presets").addEventListener("click", function (ev) {
    var b = ev.target.closest ? ev.target.closest(".chip") : null;
    if (!b) return;
    state.detached = true;
    srcEl.readOnly = false;
    srcEl.value = PRESETS[+b.getAttribute("data-p")].src;
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

  /* ---- copiar ---- */
  $("copy").addEventListener("click", function () {
    var b = $("copy");
    function done() { b.className = "btn done"; b.textContent = "copiado"; }
    function fail() { b.className = "btn"; b.textContent = "selecione e copie"; }
    function legacy() {
      try {
        var ta = document.createElement("textarea");
        ta.value = lastXml; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        ok ? done() : fail();
      } catch (e) { fail(); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText)
      navigator.clipboard.writeText(lastXml).then(done, legacy);
    else legacy();
  });

  srcEl.addEventListener("input", function () { if (state.detached) run(); });

  drawMoldePick();
  bindMolde();
  drawCatRow();
  drawCmds();
  rebuild();   // v1.9: era sync(false), função que nunca existiu — o bootstrap
               // morria aqui e o painel de XML nascia vazio.

  window.__glyph = {
    tokenize:tokenize, parse:parse, buildXml:buildXml, colorize:colorize, renderLit:renderLit,
    parseLogic:parseLogic, expandExpr:expandExpr, freeVars:freeVars, classify:classify, walk:walk,
    buildGlyph:buildGlyph, countPhase:countPhase, moldeById:moldeById,
    MOLDES:MOLDES, CATS:CATS, PRESETS:PRESETS, INSTR:INSTR, EMO:EMO, FRAMES:FRAMES,
    SESSION:SESSION, ALIAS:ALIAS, LOGIC_OPS:LOGIC_OPS, PTBR:PTBR, CAT_OF:CAT_OF
  };
})();
