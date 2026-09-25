/**
 * core/stores.js — the three stores the engine loads, and what is read off them.
 *
 * TEMPLATES, EXPANSIONS and RULES are filled by useTemplates / useExpansions /
 * useRules: Node loads them from .guidelines/*.json, the browser from the
 * generated glyph-data.js. They are the only mutable module-level state the
 * core has — check-globals.js exists because of them — and this is the one
 * module allowed to assign them; every other module reads them through the
 * live binding an ESM export gives. speciesOf, depthOf, formulaOf, defOf and
 * atomsOf are the composition table read one entry at a time; standsAlone is
 * derived from it and from the valency tables, never transcribed from prose
 * (`domínio evita síntese`).
 *
 * The three also travel as one CONTEXT (createContext): a frozen object that
 * is passed as `opts` or as `opts.context`, and that answers for all three
 * stores with no fallback to the globals. A call that passes loose
 * `opts.templates/rules/expansions` still falls back store by store, so a
 * caller who brings only its templates gets the global rules — which is how
 * two packages in one process contaminate each other, and why the context
 * exists (INTAKE-PARSER-SPLIT.md §5). templatesOf / rulesOf / expansionsOf
 * are the one place either resolution happens; no other module reads the
 * globals.
 */

import { FRAMES, SLOTS, NAMED_STRUCT } from "./vocabulary.js";

/* ------------------------------------------------------------------ *
 * standsAlone -- o eixo primitivo/operador, DERIVADO
 *
 * GLOSSARY §0 declara dois eixos independentes: hieroglifo/glifo (decompoe?)
 * e primitivo/operador (precisa de operando?). O segundo nunca virou tabela:
 * vive na prosa da §2 e num comentario dentro de FRAMES nomeando cinco
 * comandos.
 *
 * E a prosa da §2 nao serve como fonte. Medido: dos 38 comandos que ela
 * lista como "atoms that stand on their own, with no operand", QUINZE estao
 * so ali e mesmo assim exigem operando pelo FRAMES -- CTX, NT, REV, RSN, REQ
 * entre eles -- e REQ aparece nas duas secoes ao mesmo tempo. A §2 contradiz
 * a §0 no proprio corpo do documento.
 *
 * Entao a tabela e DERIVADA do que o motor ja segura: e primitivo o atomo
 * de que nenhuma tabela de valencia cobra operando. Nada de transcrever
 * prosa -- dominio evita sintese, e derivar de FRAMES/SLOTS significa que a
 * classificacao nao pode divergir do que o motor de fato faz.
 * ------------------------------------------------------------------ */
export function standsAlone(canonical, opts) {
  var U = String(canonical || "").toUpperCase();
  if (!U || FRAMES[U] || SLOTS[U] || NAMED_STRUCT[U]) return false;
  return speciesOf(U, opts) === "atom";
}

/* ---- template registry ----------------------------------------------
   Filled by useTemplates(). Node loads it from templates.json;
   the browser, from the generated glyph-data.js (file:// blocks fetch). */
export var TEMPLATES = {};
export function useTemplates(store) {
  TEMPLATES = asTemplates(store);
  return TEMPLATES;
}
export function templateRegistry(opts) {
  return templatesOf(opts);
}
/* templates.json itself or the map inside it — one reading for both doors */
function asTemplates(s) { return (s && s.templates) || s || {}; }

/* ---- composition registry (v1.1.0.0) --------------------------------
   What GLOSSARY.md knows and the engine did not: which commands are
   hieroglyphs (atoms, they do not decompose) and which are glyphs
   (composites, with a formula that reduces them to atoms).

   Generated from expansions.txt into expansions.json by
   build-templates.js. Optional, exactly like the template and rule stores:
   with no store loaded the engine parses and emits the same as before, it
   just cannot say what anything is made of.

   This is the table an .hgml emitter burns down to — the reason it exists.
   Nothing in the XML path reads it yet: species is inspection data, and it
   travels in the AST. */
export var EXPANSIONS = null;
export function useExpansions(store) {
  EXPANSIONS = asExpansions(store);
  return EXPANSIONS;
}
export function expansionRegistry(opts) {
  var s = expansionsOf(opts);
  return (s && s.commands) ? s : null;
}
/* expansions.json itself or its bare `commands` map */
function asExpansions(s) { return (s && s.commands) ? s : (s ? { commands: s } : null); }
export function entryOf(name, opts) {
  var reg = expansionRegistry(opts);
  if (!reg) return null;
  return reg.commands[String(name || "").toUpperCase()] || null;
}

/** "atom" | "composite" | null (no store, or outside the table) */
export function speciesOf(name, opts) {
  var e = entryOf(name, opts);
  return e ? e.species : null;
}
/** composition layer: 0 for an atom, 1 + the deepest dependency otherwise */
export function depthOf(name, opts) {
  var e = entryOf(name, opts);
  return e && typeof e.depth === "number" ? e.depth : null;
}
/** the formula, for a composite; null for an atom */
export function formulaOf(name, opts) {
  var e = entryOf(name, opts);
  return (e && e.formula) || null;
}
/** what the command MEANS — extracted from GLOSSARY.md at build time.
    `formulaOf` says what a composite is made OF; this says what any command
    IS, and for the 88 hieroglyphs it is the only thing there is to say. */
export function defOf(name, opts) {
  var e = entryOf(name, opts);
  return (e && e.def) || null;
}

/**
 * atomsOf(name) — the transitive atom closure, in formula order.
 *
 * Repeats are kept: a command that reaches CTX by two routes is made of it
 * twice, and collapsing that would misreport what the composition costs.
 * The build gate in build-templates.js already refuses a table with cycles,
 * so `seen` here is belt-and-braces against a hand-edited store.
 */
export function atomsOf(name, opts) {
  var reg = expansionRegistry(opts);
  if (!reg) return null;
  var out = [];
  (function walkDown(n, seen, hops) {
    var U = String(n).toUpperCase();
    if (hops > 64 || seen[U]) { out.push(U); return; }
    var e = reg.commands[U];
    if (!e || e.species === "atom") { out.push(U); return; }
    var next = {}; for (var k in seen) next[k] = 1; next[U] = 1;
    (e.deps || []).forEach(function (d) { walkDown(d, next, hops + 1); });
  })(name, {}, 0);
  return out;
}


export var RULES = null;
export function useRules(store) { RULES = store || null; return RULES; }


/* ---- the context -----------------------------------------------------
   Made here and only here, so `contextOf` can tell a context from an opts
   object that merely has the same three keys: the loose keys fall back to
   the globals, a context never does. */
var CONTEXTS = new WeakSet();
export function createContext(stores) {
  var c = Object.freeze({
    templates: asTemplates(stores && stores.templates),
    rules: (stores && stores.rules) || null,
    expansions: asExpansions(stores && stores.expansions)
  });
  CONTEXTS.add(c);
  return c;
}
export function contextOf(opts) {
  if (!opts || typeof opts !== "object") return null;
  if (CONTEXTS.has(opts)) return opts;
  var c = opts.context;
  return (c && typeof c === "object" && CONTEXTS.has(c)) ? c : null;
}
/* A formula is a definition, not a request: its parse reads the composition
   table and nothing the Order loaded. From a context that is one more
   context, made once per context rather than once per formula. */
var FORMULA_CONTEXTS = new WeakMap();
export function formulaContextOf(opts) {
  var c = contextOf(opts);
  if (!c) return null;
  var f = FORMULA_CONTEXTS.get(c);
  if (!f) { f = createContext({ expansions: c.expansions }); FORMULA_CONTEXTS.set(c, f); }
  return f;
}
export function templatesOf(opts) {
  var c = contextOf(opts);
  if (c) return c.templates;
  return (opts && opts.templates) ? asTemplates(opts.templates) : TEMPLATES;
}
export function rulesOf(opts) {
  var c = contextOf(opts);
  if (c) return c.rules;
  return (opts && opts.rules) || RULES;
}
export function expansionsOf(opts) {
  var c = contextOf(opts);
  if (c) return c.expansions;
  return (opts && opts.expansions) ? asExpansions(opts.expansions) : EXPANSIONS;
}
