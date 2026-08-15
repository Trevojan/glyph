/**
 * read-expansoes.js — the single reader of the expansoes.txt format.
 *
 * Three things need to understand this file: `dag.js` (which reports layers
 * and cycles), `build-templates.js` (which turns it into a store the engine
 * can load), and by extension the engine itself. Through v1.1.0.0 only dag.js
 * knew the format, and the knowledge was about to be copied — which is how the
 * chain-regex bug got in and stayed invisible: `-` sat inside the character
 * class, so `CMP-TRUE` came out as one phantom identifier instead of CMP and
 * TRUE. One reader, one place to be wrong.
 *
 * Format, one entry per line:
 *   CMD = BASE          atom — does not expand
 *   CMD = <formula>     composite — expands
 * Blank lines and lines starting with # are ignored.
 *
 * `BASE` on the right-hand side is a KEYWORD, not a command. The command that
 * used to be called BASE is `CORE` since v1.1.0.0, precisely so this word can
 * mean only one thing here.
 *
 * UMD: Node (require) and browser (window.GlyphExpansoes).
 */

(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GlyphExpansoes = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* Dependency extraction from a formula.

     `-` is deliberately OUT of the character class: in the chain notation
     (`[CMP-TRUE]`) the hyphen separates two commands applied to the same
     operand, so `CMP-TRUE` has to come out as CMP and TRUE. No command in the
     vocabulary has a hyphen in its name, so splitting here is always right.

     The return tokens (`R:` and `r-`) are stripped first: they are lexer
     punctuation, not commands, and marking a return is orthogonal to
     composing. Without this the `R:` in SCRU counted as a dependency that
     could never resolve. */
  function depsOf(formula) {
    return String(formula).toUpperCase()
      .replace(/\bR\s*[:-]/g, " ")
      .match(/[A-Z_]\w*/g) || [];
  }

  var LINE = /^([A-Za-z_][\w-]*)\s*=\s*(.+)$/;

  /**
   * read(text) -> {
   *   atoms:      [NAME…]                    declared `= BASE`
   *   composites: { NAME: {formula, deps} }  declared with a formula
   *   order:      [NAME…]                    declaration order, for stable output
   *   malformed:  [{line, text}]             lines that are not blank/comment/entry
   * }
   */
  function read(text) {
    var atoms = [], composites = {}, order = [], malformed = [];
    String(text).split(/\r?\n/).forEach(function (ln, i) {
      var s = ln.trim();
      if (!s || s.charAt(0) === "#") return;
      var m = LINE.exec(s);
      if (!m) { malformed.push({ line: i + 1, text: s }); return; }
      var name = m[1].toUpperCase(), rhs = m[2].trim();
      order.push(name);
      if (/^BASE$/i.test(rhs)) { atoms.push(name); return; }
      composites[name] = { formula: rhs, deps: depsOf(rhs) };
    });
    return { atoms: atoms, composites: composites, order: order, malformed: malformed };
  }

  /**
   * analyse(parsed) -> { defined, undefinedDeps, cycles, depth, unlayered }
   *
   * `depth` is the layer: an atom is 0, a composite is 1 + the deepest of its
   * dependencies. A command inside a cycle, or depending on something never
   * declared, gets no layer at all rather than a wrong one.
   */
  function analyse(p) {
    var def = {};
    p.atoms.forEach(function (a) { def[a] = []; });
    Object.keys(p.composites).forEach(function (c) { def[c] = p.composites[c].deps; });

    var all = {};
    Object.keys(def).forEach(function (c) { all[c] = 1; });
    Object.keys(def).forEach(function (c) { def[c].forEach(function (d) { all[d] = 1; }); });
    var names = Object.keys(all).sort();

    var undefinedDeps = names.filter(function (c) { return !(c in def); });

    // cycles: DFS with an explicit colour marker
    var WHITE = 0, GRAY = 1, BLACK = 2, colour = {}, cycles = [];
    names.forEach(function (c) { colour[c] = WHITE; });
    function dfs(node, path) {
      if (colour[node] === GRAY) {
        cycles.push(path.slice(path.indexOf(node)).concat(node));
        return;
      }
      if (colour[node] === BLACK) return;
      colour[node] = GRAY; path.push(node);
      (def[node] || []).forEach(function (d) { dfs(d, path); });
      path.pop(); colour[node] = BLACK;
    }
    names.forEach(function (c) { if (colour[c] === WHITE) dfs(c, []); });

    var inCycle = {};
    cycles.forEach(function (c) { c.forEach(function (x) { inCycle[x] = 1; }); });

    var depth = {};
    function layer(node, seen) {
      if (node in depth) return depth[node];
      if (inCycle[node] || !(node in def)) return null;
      seen = seen || {};
      if (seen[node]) return null;
      seen[node] = 1;
      var ds = def[node];
      if (!ds.length) return (depth[node] = 0);
      var mx = -1;
      for (var i = 0; i < ds.length; i++) {
        var v = layer(ds[i], seen);
        if (v === null) return null;
        if (v > mx) mx = v;
      }
      return (depth[node] = mx + 1);
    }
    names.forEach(function (c) { layer(c); });

    return {
      defined: names.filter(function (c) { return c in def; }),
      undefinedDeps: undefinedDeps,
      cycles: cycles,
      depth: depth,
      unlayered: names.filter(function (c) { return !(c in depth); })
    };
  }

  /** read + analyse in one call, plus the store shape the engine loads. */
  function build(text) {
    var p = read(text);
    var a = analyse(p);
    var commands = {};
    p.atoms.forEach(function (n) {
      commands[n] = { species: "atom", depth: 0 };
    });
    Object.keys(p.composites).forEach(function (n) {
      commands[n] = {
        species: "composite",
        formula: p.composites[n].formula,
        deps: p.composites[n].deps,
        depth: (n in a.depth) ? a.depth[n] : null
      };
    });
    return { parsed: p, analysis: a, commands: commands };
  }

  return { read: read, analyse: analyse, build: build, depsOf: depsOf };
});
