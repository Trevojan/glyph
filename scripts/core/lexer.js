/**
 * core/lexer.js — text into tokens, and a name into what the engine knows it as.
 *
 * tokenize cuts the source; classify answers `mode | struct | meta | instr |
 * session | blend | unknown` for a name, probing the vocabulary tables in a
 * fixed order (GLOSS_REVERSE in vocabulary.js is that same order read
 * backwards, which is what makes it the inverse and not a lookup that merely
 * agrees); blendOf is the last resort, a name the rules store invents at burn
 * time; suggest points at a neighbour, or stays silent. Reads the vocabulary
 * and the rules store; reaches into nothing that parses.
 */

import { INSTR, ALIAS, STRUCT, META, MODE, EMO, SESSION, GLOSS_REVERSE, ELEMENT_INPUT } from "./vocabulary.js";
import { RULES } from "./stores.js";

/* ======================================================
   2. LEXER
   ====================================================== */

export var NAME_CH = /[A-Za-z0-9_.]/;

export function tokenize(src) {
  var T = [], i = 0, n = src.length;
  var off = false, textStart = -1, textBuf = "", expectBare = false;

  function flushText() {
    if (textBuf.length) {
      if (textBuf.trim().length) T.push({ k:"text", v:textBuf, s:textStart, e:textStart + textBuf.length });
      textBuf = ""; textStart = -1;
    }
  }
  function addText(ch) { if (textStart < 0) textStart = i; textBuf += ch; }

  while (i < n) {
    if (off) {
      var up = src.toUpperCase(), idx = up.indexOf("[ON]", i);
      var end = idx === -1 ? n : idx;
      if (end > i) T.push({ k:"raw", v:src.slice(i, end), s:i, e:end });
      i = end;
      if (idx !== -1) { T.push({ k:"mode", v:"ON", s:i, e:i+4 }); i += 4; off = false; }
      else T.push({ k:"modeUnclosed", v:"", s:n, e:n });
      continue;
    }

    var c = src[i];

    var wantBare = expectBare; expectBare = false;
    if (wantBare) {
      if (/\s/.test(c)) { expectBare = true; i++; continue; }
      if (/[A-Za-z]/.test(c)) {
        var bs = i;
        while (i < n && NAME_CH.test(src[i])) i++;
        T.push({ k:"bareTag", v:src.slice(bs, i), s:bs, e:i });
        continue;
      }
    }

    if (c === "[") {
      flushText();
      var rest = src.slice(i);

      var mTpl = /^\[--\s*([A-Za-z0-9_.-]+)\s*(=)?/.exec(rest);
      if (mTpl) { T.push({ k:"tpl", v:mTpl[1], def:!!mTpl[2], s:i, e:i+mTpl[0].length }); i += mTpl[0].length; continue; }

      var mChain = /^\[=/.exec(rest);
      if (mChain) { T.push({ k:"chain", v:"[=", s:i, e:i+2 }); i += 2; continue; }

      var mLog = /^\[\s*logic\s*(?:[:\-\s]\s*([^\]]*?))?\s*\]/i.exec(rest);
      if (mLog) {
        var lname = (mLog[1] || "").trim();
        var bodyStart = i + mLog[0].length;
        var mClose = /\[\s*\/\s*logic\s*\]/i.exec(src.slice(bodyStart));
        var bodyEnd = mClose ? bodyStart + mClose.index : n;
        T.push({ k:"logic", v:lname, body:src.slice(bodyStart, bodyEnd), s:i,
                 e: mClose ? bodyEnd + mClose[0].length : n, closed:!!mClose });
        i = mClose ? bodyEnd + mClose[0].length : n;
        continue;
      }

      /* The verbatim fence. `[logic]` proved the shape: fence a region and
         read it under a different grammar. This one reads it under NO
         grammar — the body is carried as written.

         It exists because a Glyph document cannot quote Glyph: `]` ends a
         literal from inside, under either quote, and no escape exists
         (backslash, doubling and `&#93;` were each measured and each
         refused; the entity dies on the `;`, which is a separator). So the
         only construct that could carry a bracket was `[logic]`, which then
         misread the content as an expression and reported its commands as
         undefined variables. */
      var mRaw = /^\[\s*raw\s*\]/i.exec(rest);
      if (mRaw) {
        var rBodyStart = i + mRaw[0].length;
        var mRawClose = /\[\s*\/\s*raw\s*\]/i.exec(src.slice(rBodyStart));
        var rBodyEnd = mRawClose ? rBodyStart + mRawClose.index : n;
        T.push({ k:"rawfence", body:src.slice(rBodyStart, rBodyEnd), s:i,
                 e: mRawClose ? rBodyEnd + mRawClose[0].length : n, closed:!!mRawClose });
        i = mRawClose ? rBodyEnd + mRawClose[0].length : n;
        continue;
      }

      var mOff = /^\[\s*off\s*\]/i.exec(rest);
      if (mOff) { T.push({ k:"mode", v:"OFF", s:i, e:i+mOff[0].length }); i += mOff[0].length; off = true; continue; }
      var mOn = /^\[\s*on\s*\]/i.exec(rest);
      if (mOn) { T.push({ k:"mode", v:"ON", s:i, e:i+mOn[0].length, stray:true }); i += mOn[0].length; continue; }

      if (src[i+1] === "/") {
        var j = i + 2, ns = j;
        while (j < n && NAME_CH.test(src[j])) j++;
        var ce = j; if (src[ce] === "]") ce++;
        T.push({ k:"closeTag", v:src.slice(ns, j), s:i, e:ce });
        i = ce; continue;
      }

      var j2 = i + 1, ns2 = j2;
      while (j2 < n && NAME_CH.test(src[j2])) j2++;
      T.push({ k:"open", v:src.slice(ns2, j2), s:i, e:j2 });
      i = j2; continue;
    }

    if (c === "]") { flushText(); T.push({ k:"close", v:"]", s:i, e:i+1 }); i++; continue; }

    if (c === "`") {
      flushText();
      var ls = i + 1, j3 = ls, by = "eof";
      while (j3 < n) {
        if (src[j3] === "`") { by = "tick"; break; }
        if (src[j3] === "]") { by = "bracket"; break; }
        /* `;` DELIBERADAMENTE ausente daqui desde 2026-09-05. Ele encerrava um
           literal de crase e nao encerrava um de apostrofo, entao as duas aspas
           tinham gramaticas diferentes -- e a crase existe justamente para se
           poder escrever apostrofo dentro, e vice-versa.

           A regra do Regente: "jamais algo estrutural pode causar problema na
           escrita de literais". Lista de topicos usa `;` ao fim de cada ponto
           por convencao, e o Autor da Ordem nao pode perder isso para um
           separador. Dentro de um literal, so a aspa que o abriu o fecha.

           Foi tambem o que matou a entidade `&#93;` quando os escapes foram
           medidos: ela morria no `;`, e o sintoma foi visto sem a assimetria. */
        j3++;
      }
      var e3 = by === "tick" ? j3 + 1 : j3;
      T.push({ k:"literal", v:src.slice(ls, j3), s:i, e:e3, form:"tick", closedBy:by });
      i = e3; continue;
    }

    if (c === "'") {
      flushText();
      var qs = i + 1, j4 = qs, qc = false;
      while (j4 < n) {
        if (src[j4] === "'") { qc = true; break; }
        if (src[j4] === "]" || src[j4] === "\n") break;
        j4++;
      }
      var e4 = qc ? j4 + 1 : j4;
      T.push({ k:"literal", v:src.slice(qs, j4), s:i, e:e4, form:"quote",
               closedBy: qc ? "quote" : "unterminated" });
      i = e4; continue;
    }

    /* The backslash emotion delimiter was replaced by the slash at resolution
       I-19. The grammar carries only the slash (glyph-grammar.ebnf:13) and
       the inverse has only ever written the slash — but the lexer still
       accepted both, so an abandoned spelling stayed alive and undocumented,
       and the installed skill still taught it.

       DEMOTED TO A RECOGNISER, not deleted. Deleting the branch makes `\eth\`
       fall through to addText and emit <off>\eth\</off> in silence — the very
       defect this work exists to abolish, re-created in the act of removing a
       different instance of it. So the shape is still matched, still refused
       by name, and the characters survive as <off>. Nothing is fabricated,
       nothing vanishes, and the author is told which spelling to use. */
    if (c === "\\") {
      var bs = i, bj = i + 1;
      while (bj < n && /[A-Za-z\\]/.test(src[bj])) bj++;
      if (bj > bs + 1) {
        addText(src.slice(bs, bj));
        flushText();
        T.push({ k:"badmood", v:src.slice(bs, bj), s:bs, e:bj });
        i = bj; continue;
      }
      /* a lone `\` in prose is not a delimiter and must stay prose */
      addText("\\"); i++; continue;
    }

    if (c === ";") {
      flushText();
      if (src[i+1] === ";") { T.push({ k:"linebreak", v:";;", s:i, e:i+2 }); i += 2; }
      else { T.push({ k:"semi", v:";", s:i, e:i+1 }); i++; }
      continue;
    }

    if (c === ",") {
      var pv = T[T.length-1];
      flushText();
      T.push({ k:"comma", v:",", s:i, e:i+1 }); i++;
      if (pv && pv.k === "bareTag") expectBare = true;
      continue;
    }

    if (c === "-" && /^\s*[Rr]\s*$/.test(textBuf) && !/[A-Za-z0-9]/.test(src[i+1] || "")) {
      T.push({ k:"return", v:"r-", s:textStart, e:i+1 });
      textBuf = ""; textStart = -1; i++; continue;
    }

    if (c === ":") {
      if (/^\s*R\s*$/.test(textBuf)) {
        T.push({ k:"return", v:"R:", s:textStart, e:i+1 });
        textBuf = ""; textStart = -1; i++; continue;
      }
      flushText(); T.push({ k:"colon", v:":", s:i, e:i+1 }); i++; continue;
    }

    if (c === "=") { flushText(); T.push({ k:"equals", v:"=", s:i, e:i+1 }); i++; continue; }

    if (c === "-") {
      var prev = T[T.length-1];
      if (!textBuf.length && prev && (prev.k === "open" || prev.k === "bareTag")) {
        T.push({ k:"extend", v:"-", s:i, e:i+1 }); i++; expectBare = true; continue;
      }
      addText(c); i++; continue;
    }

    if (c === "/") {
      var prevT = T[T.length-1];
      /* The divide operator was removed by resolution C-01 — the grammar has
         said so since v1.7 (glyph-grammar.ebnf:37) while the engine went on
         emitting a `divide` token and XML_REFERENCE went on documenting it.
         This is the propagation, not a new decision.

         Deleting the branch outright would not be safe, because `/` is not a
         free character: EMO holds `ins` and `cmp`, INSTR holds INS and CMP,
         and the emotion branch below fires on /name/ regardless of what
         precedes it. So `[in-rwk/ins/fmt]` fabricated a <mood> from a chain,
         hoisted it to block level, and dropped `fmt`. In a chain position the
         emotion branch must not be entered at all. */
      var inChain = !textBuf.length && prevT &&
                    (prevT.k === "extend" || prevT.k === "bareTag" || prevT.k === "comma");
      if (inChain) {
        var rs = i, rj = i + 1;
        while (rj < n && /[A-Za-z\/]/.test(src[rj])) rj++;   /* the whole run, so nothing is left for EMO */
        addText(src.slice(rs, rj));
        flushText();
        T.push({ k:"badslash", v:src.slice(rs, rj), s:rs, e:rj });
        i = rj; continue;
      }
      var pb2 = i + 1, ps2 = pb2;
      while (pb2 < n && /[A-Za-z]/.test(src[pb2])) pb2++;
      var first = src.slice(ps2, pb2);
      if (first && src[pb2] === "/" && EMO[first.toLowerCase()]) {
        flushText();
        var st2 = i; i++;
        var ord2 = 0, gd2 = 0;
        while (i < n && gd2++ < 64) {
          var es2 = i;
          while (i < n && /[A-Za-z]/.test(src[i])) i++;
          var en2 = src.slice(es2, i);
          if (!en2) break;
          var had2 = src[i] === "/";
          var o2 = ord2++;
          T.push({ k:"emotion", v:en2, s: o2 === 0 ? st2 : es2 - 1,
                   e:i + (had2?1:0), order:o2, unterminated:!had2, delim:"/" });
          if (had2) { i++; if (!(i < n && /[A-Za-z]/.test(src[i]))) break; } else break;
        }
        continue;
      }
      addText(c); i++; continue;
    }

    addText(c); i++;
  }
  flushText();
  return T;
}

export function classify(name, opts) {
  opts = opts || {};
  var U = String(name || "").toUpperCase(), L = String(name || "").toLowerCase();
  if (!name) return { tier:"empty", canonical:"", gloss:"" };
  if (MODE[U]) return { tier:"mode", canonical:U, gloss:MODE[U] };
  if (STRUCT[U]) return { tier:"struct", canonical:U, gloss:STRUCT[U] };
  if (META[U]) return { tier:"meta", canonical:U, gloss:META[U] };
  if (ALIAS[U]) { var f = ALIAS[U];
    return { tier:"instr", canonical:f, alias:true, aliasOf:f, gloss:INSTR[f], merged: !!INSTR[U] }; }
  if (INSTR[U]) return { tier:"instr", canonical:U, gloss:INSTR[U] };
  /* The element's own name, read back as input. Consulted AFTER every
     existing table so nothing already recognised shifts meaning, and marked
     as an alias so the round trip returns the canonical spelling — the same
     treatment `[in` already gets on its way back as `[ins`. */
  var byEl = ELEMENT_INPUT[U.replace(/[^A-Z0-9]+/g, "")];
  if (byEl) {
    var tb = byEl.tier === "mode" ? MODE : byEl.tier === "struct" ? STRUCT
           : byEl.tier === "meta" ? META : INSTR;
    return { tier:byEl.tier, canonical:byEl.canonical, alias:true, aliasOf:byEl.canonical,
             gloss:tb[byEl.canonical] };
  }
  if (opts.session !== false && SESSION[L]) return { tier:"session", canonical:L, gloss:SESSION[L] };
  var bl = blendOf(U, opts);
  if (bl) return { tier:"blend", canonical:U, gloss:bl.means || bl.id, blendId:bl.id };
  return { tier:"unknown", canonical:U, gloss:"" };
}
/* A blend's `emit` is a name the burn writes and nothing else declares: the
   vocabulary has atoms and composites, and the pattern layer invents a third
   species at burn time. Re-reading a burn must know it, or every pattern that
   fired reports as a stranger. The rules store is the only place it lives. */
export function blendOf(U, opts) {
  var store = (opts && opts.rules) || RULES;
  var rs = store && store.rules;
  if (!rs) return null;
  for (var i = 0; i < rs.length; i++)
    if (rs[i].kind === "blend" && String(rs[i].emit || "").toUpperCase() === U) return rs[i];
  return null;
}

/* ------------------------------------------------------------------ *
 * suggest — aponta, ou cala
 *
 * Media contra as ONZE palavras que o Autor da Ordem escreveu de verdade em
 * glyph-variable-naming-system.pgml, a versão por distância de edição pura
 * acertava UMA: 1 acerto, 8 palpites errados, 2 silêncios. O pior deles era
 * RULE -> TRUE, que é distância ortográfica sem nenhuma semântica: nada em
 * `rule` significa `true`, os dois só se parecem. rust#147595 documenta
 * exatamente esse defeito no próprio rustc.
 *
 * E um palpite errado aqui não é ruído. O motor encontra o Autor da Ordem
 * ENQUANTO a intenção ainda está se formando, então uma sugestão errada
 * puxa a intenção para o lado errado enquanto ela ainda é maleável.
 * `.guidelines/.sources/COMPILER_LESSONS.md` §1: conter a resposta certa não
 * basta, e explicar melhor não substitui apontar certo.
 *
 * A observação que resolve: o vocabulário do Glyph é feito de ABREVIAÇÕES de
 * glosas -- ITR de Iterate, CMP de Compare, TGT de Target. Então a busca certa
 * não é distância contra o canônico, é PREFIXO contra a glosa. `ITER` é
 * prefixo de `ITERATE`; `RULE` não é prefixo de nada, e a resposta honesta
 * para `RULE` é que ele não existe -- não que talvez fosse `TRUE`.
 *
 * Medido depois: 3 respostas úteis, 8 silêncios, ZERO palpites errados. E
 * `SEC` passou a devolver `SECTION`, que é o que o Autor da Ordem queria
 * dizer, contra o `SPEC` de antes.
 * ------------------------------------------------------------------ */
export function suggest(name) {
  var U = String(name || "").toUpperCase().replace(/[^A-Z0-9]+/g, "");
  if (!U) return null;

  /* a glosa de cada canônico, sem separadores: `instead-of` -> INSTEADOF */
  var glosses = {};
  Object.keys(GLOSS_REVERSE).forEach(function (el) {
    glosses[GLOSS_REVERSE[el].canonical] = el.toUpperCase().replace(/[^A-Z0-9]+/g, "");
  });

  /* 1 — a entrada é o começo de uma glosa. É a forma que uma abreviação tem,
     e é como este vocabulário inteiro foi construído. */
  var pre = Object.keys(glosses).filter(function (k) { return glosses[k].indexOf(U) === 0; });
  if (pre.length === 1) return { name: pre[0], dist: 0, how: "gloss-prefix" };
  /* ambíguo é pior que silêncio: duas respostas não apontam para lugar nenhum */
  if (pre.length > 1) return null;

  /* 2 — o canônico é uma subsequência da entrada: ITR dentro de ITER. Só a
     partir de três letras, porque com duas qualquer coisa casa. */
  var sub = Object.keys(glosses).filter(function (k) {
    if (k.length < 3) return false;
    var i = 0;
    for (var c = 0; c < U.length; c++) if (U.charAt(c) === k.charAt(i)) i++;
    return i === k.length;
  });
  if (sub.length === 1) return { name: sub[0], dist: 0, how: "subsequence" };

  /* 3 — silêncio. `[RULE` fora do vocabulário é a resposta inteira; inventar
     um vizinho ortográfico seria responder outra pergunta com confiança. */
  return null;
}
