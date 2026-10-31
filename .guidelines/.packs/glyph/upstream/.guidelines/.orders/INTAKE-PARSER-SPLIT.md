# Preliminary intake — splitting `glyph-parser.js` into a directory

> **Done — 2026-09-17, twelve cuts, one commit each, `npm run check` green at
> every one, corpus byte-identical throughout.** §6 records what the cut
> measured against this proposal. Decided 2026-09-16: the parser is
> fragmented into a directory of its own. Measured
> today: 49 of 77 re-reads across 11 sessions were windowed reads of this one
> file (`INTAKE-VIRTUAL-PATH.md` §8.2) — the only round-trip cost that exists.
> The cut follows **dependencies, not comment banners**, which is what
> `scripts/seam-graph.js` was written to measure (HGML_PLAN D1, open since v1.1).
> Engine 3.4.7.05 at `49c392a`.

## 1. What the file is, measured

3 569 lines, one ESM module, one IIFE returning the `GlyphCore` object (44
exports), plus `globalThis.GlyphCore` for the browser. Eight banner seams —
`seam-graph.js` saw seven until 2026-09-16, because two were numbered "7."
and its end marker (`/* ---------- CLI`) had left with the CLI, so the last
seam ran to line −1 and out of the table. Both repaired; this is the full run:

| seam | lines | declares | reaches into | reached by |
|---|---|---|---|---|
| 1 vocabulary + registries | 401 | 34 | 2 | **7 seams** — `esc`×91 `xesc`×33 `INSTR`×18 `STRUCT`×13 |
| 2 lexer | 379 | 7 | 1 4 5 7 8 | 5 seams — `suggest`×10 `classify`×8 `elName`×7 |
| 3 `[logic]` | 111 | 4 | 1 | 2 seams — `parseLogic`×4 `expandExpr`×3 |
| 4 parser (+3b templates, 3c rules, 3d constraints) | 955 | 16 | 1 2 3 5 | 5 seams — `parse`×10 `walk`×5 `RULES`×3 |
| 5 XML emitter (+package pass) | 426 | 13 | 1 2 4 7 8 | 5 seams — `emit`×13 `buildXml`×8 `pad`×7 |
| 6 AST JSON (+`ck`) | 321 | 11 | 1 2 4 5 8 | 1 seam — `toAST`×2 `serializeAST`×2, from the inverse |
| 7 `.hgml` burn | 250 | 12 | 1 4 5 | 3 seams — `burn`×6 `toHGML`×3 |
| 8 inverse `fromXML`/`fromAST` | 680 | 22 | **1 2 3 4 5 6 7** | 3 seams — `GLOSS_REVERSE`×3 `ELEMENT_INPUT`×1 `fromXML`×2 `fromAST`×2 |

**No seam is a leaf.** Three facts decide the shape. `esc`/`xesc`/`pad`/`lev`
are reached 130 times from everywhere and are not vocabulary — they are a
**utility layer** the banner never named. The three mutable stores
(`TEMPLATES`, `RULES`, `EXPANSIONS`, set by `useTemplates`/`useRules`/
`useExpansions`) are module-level state every seam reads — `check-globals.js`
exists because of them. And `GLOSS_REVERSE` / `ELEMENT_INPUT` — the
element→canonical maps — are declared in the inverse's section but are
vocabulary: the lexer's `classify` and the emitter read them. Moved to
`vocabulary.js`, the inverse loses its three inbound edges and **becomes a
leaf**; `emit-ast` is then reached only by the inverse. The move order below
follows the graph *after* those two relocations, which is why they go first.

## 2. Consumers — what must not notice

| consumer | how it uses the file | after the split |
|---|---|---|
| `glyph-cli.js`, `glyph-diff.js`, `glyph-trace.js`, `build-templates.js`, `build-skill.js` | `import G from "./glyph-parser.js"` | unchanged |
| `glyph-engine-alias.html` | `<script type="module" src="scripts/glyph-parser.js">`, then `globalThis.GlyphCore` | unchanged; relative `import`s resolve exactly as the module tag does today |
| `check-globals.js` | knows the `GlyphCore` shape | unchanged shape, same 44 names |
| `build-skill.js:116` | **copies the file verbatim** into the skill | copies the directory — same `emit`, one loop |
| `test-corpus.js` | pins outputs | the acceptance: **byte-identical** XML / AST / `.hgml` on the whole corpus at every step |

`scripts/glyph-parser.js` **stays**, as the entry: ~20 lines that import the
modules and assemble the `GlyphCore` object. Every consumer above then needs
zero change, the browser tag stays, the skill's copy stays addressable. It is
not a compatibility shim left behind — it is the module's public face, and the
seam graph says the face is the one thing everything reaches.

## 3. Proposed layout

```
scripts/
  glyph-parser.js            entry — assembles GlyphCore from core/, exports it  (~20)
  core/
    util.js                  esc xesc pad lev hgmlLit — reached by all, reaches nothing  (~60)
    vocabulary.js            CATS INSTR ALIAS STRUCT META MODE EMO SESSION FRAMES PTBR CAT_OF LIMITS, standsAlone, GLOSS_REVERSE ELEMENT_INPUT  (~380)
    stores.js                TEMPLATES RULES EXPANSIONS + use*/ *Registry, speciesOf depthOf formulaOf atomsOf defOf  (~120)
    lexer.js                 tokenize classify suggest elName  (~360)
    logic.js                 parseLogic expandExpr freeVars  (~110)
    templates.js             expandInvocations bindHoles collectFills, checkTemplateConstraints  (~250)
    rules.js                 compileRules checkRules pairKey expandNames  (~180)
    parser.js                parse walk stripTags — the tree  (~500)
    emit-xml.js              buildXml toXML packagePass collectBindings  (~430)
    emit-ast.js              toAST serializeAST ck  (~320)
    burn.js                  burn burnList injectSubject applyBlends toHGML hgmlLines  (~250)
    inverse.js               fromXML fromAST xmlParseTree packageUnpass  (~640)
```

Twelve files, largest ~680 lines, every one inside a single `Read`. The
dependency direction is strict and matches the measured graph once the two
relocations of §1 are made: `util ← vocabulary ← stores ← lexer ← logic ←
{templates, rules} ← parser ← emit-xml ← {emit-ast, burn} ← inverse`. No
cycles: seam 5 reaching into seam 7 today is `hgmlLit`/`pad`, which move to
`util.js` — that edge disappears rather than being carried.

## 4. Order of moves — leaves first, one module per commit, green at each

The repaired seam graph names the order; nothing else needs to be decided:

1. `util.js` — the layer with no banner; moving it first removes 130 cross-seam reaches at once.
2. `vocabulary.js`, taking `GLOSS_REVERSE` and `ELEMENT_INPUT` out of the inverse's section — after this the inverse is reached by nobody.
3. `inverse.js` — now a leaf; and then `emit-ast.js`, reached only by it.
4. `burn.js` — three inbound edges (`burn`, `toHGML`), which move with it.
5. `logic.js`, `lexer.js`, `stores.js` — bottom of the graph.
6. `templates.js`, `rules.js` — the 3b/3c/3d sub-seams, out of the parser's 955.
7. `parser.js`, `emit-xml.js` — last, because everything reaches them; by then they are what is left.
8. `glyph-parser.js` becomes the assembler; `build-skill.js` copies `core/`; `seam-graph.js` reads the new layout or retires.

Each step: `npm run check` green (corpus byte-identical), one commit. Twelve
to fourteen commits. No behaviour changes ride along — not the burn memo, not
the stores-as-context refactor (§5); they are each their own step **after** the
split, when the module they touch is 250 lines.

## 5. What the split makes cheap, and is not the split

Once `stores.js` exists, the three globals can become one context object
passed down — the pattern the `opts.expansions` parameter already half-uses.
That is the change that would let two stores coexist in one process (a server
holding several packages), and it is also the one structural fact
`INTAKE-RUST.md` §3 names as JS's real weakness here. It is a separate step,
proposed there, decided by the Regent.

## 6. What the cut measured — the state after

Thirteen modules (the twelve proposed plus `version.js`, one line, because
the inverse compares an incoming `engine=` against it and the entry exports
it), **zero cycles**, the largest 594 lines, the entry 85:

```
module        lines  imports                                       imported by
burn            260  util stores parser rules                      the entry
emit-ast        338  util vocabulary stores parser version         the entry
emit-xml        381  util vocabulary stores parser version         the entry
inverse         595  util vocabulary version                       the entry
lexer           373  vocabulary stores                             parser
logic           124  util                                          parser
parser          585  util vocabulary stores lexer logic templates rules   burn emit-ast emit-xml
rules           167  util stores                                   burn parser
stores          132  vocabulary                                    seven modules
templates       292  util stores                                   parser
util             88  —                                             eight modules
version          10  —                                             three modules
vocabulary      351  —                                             six modules
```

Three things the proposal did not have and the cut found:

- **The extraction order is by outgoing dependencies, not by who is reached.**
  A module can only import what is already a module, so the bottom of the
  graph goes first — `util`, `vocabulary`, `stores`, `lexer`, `logic` — and
  the projections last. The inverse went third only because, with the two
  reverse maps relocated, it reads nothing above `vocabulary`. §4's "leaves
  first" was the right instinct in the wrong direction.
- **Two would-be cycles, both dissolved by moving a fact to where it is
  about.** `walk`/`stripTags`/`valueChildren` are tree helpers with no
  dependency and went to `util`; `collectBindings` lived in the emitter's
  section and was reached from `parse` — it is a fact about the tree, so it
  lives in `parser.js`, and `emit-xml` imports it from there. The one true
  cycle — the template expander must parse a template's body, and `parse`
  runs the expander — is broken by injection: `expandInvocations(segments,
  opts, G, parseFn)`, the shape it already had for diagnostics.
- **The stores are live bindings.** `export var RULES` reassigned inside
  `stores.js` by `useRules` is seen by every importer; `classify` reads
  `RULES` to recognise a blend and sees it filled after the CLI called
  `useRules`. That is what made the three globals movable without the context
  refactor of §5 — which is now the next step, and cheap, because
  `stores.js` is the only module that assigns them.

`seam-graph.js` reads `import` lines instead of comment banners and refuses a
cycle under `npm run check`. `build-skill.js` copies `scripts/core/` beside
the entry; the skill's copy runs. The 56 field Orders re-read clean; the
full pipeline of an Order is unchanged at ~4 ms.
