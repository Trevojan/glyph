/**
 * core/logic.js — the `[logic]` block: arithmetic and boolean rules, kept
 * apart from the command tree.
 *
 * parseLogic reads the block into rules, expandExpr rewrites dice and
 * shorthand into plain expressions, freeVars names what a rule needs from
 * outside. This is the one deterministic-CPU corner of the engine, and the
 * lexer claims any `[logic` for it — which is why the LOGIC command cannot be
 * written inside a formula (H-09, closed by data). Reads esc; nothing else.
 */

import { esc } from "./util.js";

/* ======================================================
   3. [logic] BLOCK
   ====================================================== */

export var RESERVED_WORDS = /^(and|or|not|if|then|else|true|false|min|max|abs|sum|floor|ceil|round|sem|se|senao|entao|no|de|do|da|pb|pc|ar|kh|kl|e|ou)$/i;

export function expandExpr(raw) {
  var s = " " + raw + " ";
  s = s.replace(/(^|[^\w])(\d+)\s*d\s*(\d+)\s*(k[hl])\s*(\d*)/gi, function (_, p, nd, fc, kk, mm) {
    var keep = mm || "1";
    return p + "rola " + nd + " dado(s) de " + fc + " faces, mantém o(s) " + keep +
      (kk.toLowerCase() === "kh" ? " maior(es)" : " menor(es)");
  });
  s = s.replace(/(^|[^\w])(\d+)\s*d\s*(\d+)/gi, "$1rola $2 dado(s) de $3 faces");
  s = s.replace(/(^|[^\w])pb\s*\[([^\]]*)\]/gi, "$1floor($2)");
  s = s.replace(/(^|[^\w])pc\s*\[([^\]]*)\]/gi, "$1ceil($2)");
  s = s.replace(/(^|[^\w])ar\s*\[([^\]]*)\]/gi, "$1round($2)");
  s = s.replace(/(^|[^\w])pb\s+([A-Za-z_][\w.]*)/gi, "$1floor($2)");
  s = s.replace(/(^|[^\w])pc\s+([A-Za-z_][\w.]*)/gi, "$1ceil($2)");
  s = s.replace(/(^|[^\w])ar\s+([A-Za-z_][\w.]*)/gi, "$1round($2)");
  s = s.replace(/(^|[^\w])\^\s*\[([^\]]*)\]/g, "$1ceil($2)");
  s = s.replace(/(^|[^\w])_\s*\[([^\]]*)\]/g, "$1floor($2)");
  s = s.replace(/(^|[^\w])~\s*\[([^\]]*)\]/g, "$1round($2)");
  s = s.replace(/(^|[^\w])\^\s*([A-Za-z_][\w.]*)/g, "$1ceil($2)");
  s = s.replace(/(^|[^\w])_\s*([A-Za-z_][\w.]*)/g, "$1floor($2)");
  s = s.replace(/(^|[^\w])~\s*([A-Za-z_][\w.]*)/g, "$1round($2)");
  s = s.replace(/\s<\s*(\d+)\s*$/, ", máximo $1");
  s = s.replace(/\s>\s*(\d+)\s*$/, ", mínimo $1");
  s = s.replace(/\.dbl\b/g, ".tem_duplas");
  s = s.replace(/(^|[^\w!<>=])!\s*/g, "$1não ");
  return s.trim().replace(/\s+/g, " ");
}

export function freeVars(raw) {
  var s = raw
    /* the whole roll comes out, including the kh/kl suffix — otherwise
       "4d6kh3" leaves "kh3" behind and it leaks out as an undefined variable */
    .replace(/(^|[^\w])\d+\s*d\s*\d+\s*(?:k[hl]\s*\d*)?/gi, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/'[^']*'/g, " ")
    .replace(/\.\w+/g, " ")
    .replace(/(^|[^\w])[_^~](?=[\[\s])/g, "$1 ")
    .replace(/\b\d+(\.\d+)?\b/g, " ");
  var out = [], seen = {}, m, re = /[A-Za-z_][A-Za-z0-9_]*/g;
  while ((m = re.exec(s))) {
    var w = m[0];
    if (w === "_") continue;
    if (RESERVED_WORDS.test(w)) continue;
    if (seen[w.toLowerCase()]) continue;
    seen[w.toLowerCase()] = 1;
    out.push(w);
  }
  return out;
}

export function parseLogic(name, body) {
  var rules = [], gaps = [], defined = {}, capNoted = false;
  String(body || "").split(/\r?\n/).forEach(function (lineRaw, ln) {
    var line = lineRaw.trim();
    if (!line || /^(#|\/\/)/.test(line)) return;
    var rule = { line: ln + 1, source: line };
    var mLet = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/.exec(line);
    var mWhen = /^(!|\?)?\s*(.+?)\s*->\s*(.+)$/.exec(line);

    if (mLet) {
      rule.kind = "let"; rule.name = mLet[1]; rule.expr = mLet[2].trim();
      if (defined[rule.name])
        gaps.push({ sev:"ask", lab:"conflito", code:"DuplicateBinding",
          msg:"<code>" + esc(rule.name) + "</code> definido 2x. Qual vale?" });
      defined[rule.name] = true;
    } else if (mWhen) {
      rule.kind = mWhen[1] === "!" ? "unless" : "when";
      rule.cond = mWhen[2].trim(); rule.then = mWhen[3].trim(); rule.expr = rule.cond;
    } else if (/^(!|\?)/.test(line)) {
      rule.kind = line[0] === "!" ? "unless" : "when";
      rule.cond = line.slice(1).trim(); rule.expr = rule.cond;
      gaps.push({ sev:"ask", lab:"sem então", code:"MissingConsequent",
        msg:"<code>" + esc(line) + "</code>: consequência? Use <code>-&gt;</code>." });
    } else { rule.kind = "expr"; rule.expr = line; }

    if (!rule.expr) {
      gaps.push({ sev:"fix", lab:"vazio", code:"EmptyLogicLine",
        msg:"linha " + rule.line + " sem expressão." });
      return;
    }
    rule.reads = expandExpr(rule.expr) + (rule.then ? " → então " + expandExpr(rule.then) : "");
    rule.uses = freeVars(rule.expr);
    if (rule.then && /=/.test(rule.then)) rule.uses = rule.uses.concat(freeVars(rule.then));

    if (!capNoted && /\s[<>]\s*\d+\s*$/.test(rule.expr)) {
      capNoted = true;
      gaps.push({ sev:"note", lab:"read as", code:"CapFloorNotice",
        msg:"<code>" + (/\s<\s*\d+\s*$/.test(rule.expr) ? "&lt;" : "&gt;") +
            "</code> in postfix reads as a cap or a floor, not a comparison. " +
            "To compare, write <code>&lt;=</code> or <code>&gt;=</code>." });
    }
    rules.push(rule);
  });

  var used = {};
  rules.forEach(function (r) { (r.uses || []).forEach(function (v) { if (!defined[v]) used[v] = true; }); });
  var missing = Object.keys(used);
  if (missing.length)
    gaps.push({ sev:"ask", lab:"undefined", code:"UndefinedVariable",
      msg: missing.map(function (v) { return "<code>" + esc(v) + "</code>"; }).join(", ") +
          (missing.length === 1 ? " used and never defined." : " used and never defined.") +
          " External input, or a missing line?" });

  return { name:name, rules:rules, gaps:gaps, missing:missing };
}
