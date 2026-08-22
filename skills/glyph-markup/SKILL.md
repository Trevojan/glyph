---
name: glyph-markup
description: Glyph Shorthand Markup Language v1.3.0.0 Specification & Parser Integration. Use when writing or reading Glyph compact structured notation.
---

# Glyph Shorthand Markup Language (v1.3.0.0)

Glyph is a shorthand command notation, between delimiters, describing a logical
flow scalable to the smallest detail. The reference implementation is
`scripts/glyph-parser.js`: a single core (Node via `require`, browser via
`window.GlyphCore`) doing lexing, parsing, arity checking, semantic rules and
**XML** emission — the XML is the deliverable, not the AST (which is only an
inspection panel).

`GLOSSARY.md` is the normative reference for the vocabulary. The engine derives
from it, and the suite fails (`X-01`, `X-14`) if the two drift apart.

**Language boundary:** everything reaching the deliverable is English — the
vocabulary, definitions, slot questions, mood glosses. The interface is pt-BR:
the `CATS` labels, the diagnostic messages and every string in `glyph-ui.js`
and `glyph-moldes.js`.

## Normative rules

1. **Emotion** uses slashes exclusively: `/eth/`, `/cnf/`, `/clm/`. Backslash
   was removed.
2. **Chaining** is exclusively by hyphen: `[CMD1-CMD2-CMD3]`. The old `/`
   divider was removed.
3. **Symbol definition**: `[DFN'symbol','meaning']`. `[DEF]` is reserved for
   the default value.
4. **Comparison is prefix**, always 2 arguments: `[gt'A','B']`, `[gte]`, `[lt]`,
   `[lte]`, `[eq]`, `[neq]`.
5. **Template**: invoke with `[--name` or `[--name'parameter']`; define with
   `[--name=…`.
6. **`;` closes, `;;` does not.** `;` closes every open command and ends the
   segment — and it closes **even with empty slots**, which become `<needs>`.
   `;;` only splits the reply; open commands stay open (the engine warns with
   `LinebreakInsideBlock`).
7. **Negative polarity is `[ngt]`, not `[neg]`.** `NEG` never existed in the
   vocabulary.

## Severity — the contract

An empty slot **is not an error** in this design:

| severity | meaning | effect on the XML |
|---|---|---|
| `fix` | broken syntax or vocabulary | the XML is not trustworthy |
| `ask` | missing information | becomes `<needs>`, **does not block** |
| `note` | a warning about shape | does not block |

## Arity — four classes

Full detail in `SIGNATURES.md`; the operational summary:

| class | behaviour |
|---|---|
| **strict, 2 positions** (8) | `GT GTE LT LTE EQ NEQ DFN VAL` — each empty position becomes `<needs slot="n">` |
| **n-ary** (6) | `ALT CAT CMP CNSD DIST SWITCH` — `note` when given only 1 item |
| **one slot** (60) | `<needs>` carrying the slot's question when empty |
| **zero arity** (44) | stand alone, never produce `<needs>` |

`SECTION` and `BLOCK` require a literal as first child (the name) — without it
the severity is `fix`, not `ask`: an anonymous block is broken structure, not
missing information.

## Two species: hieroglyph and glyph

The central distinction, and what `.hgml` consumes:

- **hieroglyph** — atom. Does not decompose. 88 of them.
- **composite glyph** — has a formula reducing it to hieroglyphs. 32 of them.

The table lives in `expansions.txt` (atoms declared `= BASE`, composites with a
formula) and is compiled into `expansions.json`. The engine consumes it
through `useExpansions()`, optional like the other stores:

```js
G.speciesOf("CRIT")   // "composite"
G.depthOf("CRIT")     // 2
G.formulaOf("CRIT")   // "[CMP[CTX],[SPEC-CORE],[EVAL[ERROR]]]"
G.atomsOf("CRIT")     // 15 hieroglyphs
G.defOf("CRIT")       // what it means, from GLOSSARY.md
```

In the AST every command carries `species` and `compositionDepth`. **Careful
with the homonymous pair:** `depth` is how deep the node sits in the user's
text; `compositionDepth` is how deep the command sits in the vocabulary.
Different axes.

```bash
node scripts/glyph-parser.js CRIT --expand
```

## Formula notation

Four constructions, each with exactly one reading:

| form | reading |
|---|---|
| `[A[B]]` | nesting — B is A's operand |
| `[A],[B]` | conjunction — A and B hold together, no order between them |
| `[A][B]` | sequence — A, then B |
| `[A-B]` | chain — A and B applied to the same operand |

**Operand binding** (`GLOSSARY.md` §0.3): the human's operand is the **subject
of the whole formula**. A comma does not change the subject; juxtaposition
chains on the result; what is nested is the *standard* being worked against, not
a new subject.

`[crit'the parser']` reads: compare *'the parser'* against the context; specify
the core of *'the parser'*; evaluate *'the parser'* for errors.

## `.hgml` — the atomic burn

`toHGML()` reduces the tree to pure hieroglyphs: each composite swapped for its
formula until nothing decomposable is left. Closed form `[name … [/name]`,
opening **without** `]` (because `]` already closes, and `[ctx][/ctx]` would
yield `UnmatchedCloseTag`).

```bash
node scripts/glyph-parser.js "[prob'timeout']" --hgml
```

It is **expansion, not compression**: ~15 hieroglyphs per composite, 97 for
`[hyp]`, roughly 25x on a short input. The output is still valid Glyph, so it
re-parses — which is what gives the suite its correctness oracle.

30 of the 32 composites burn clean. `SCRU` (uses `R:` inside brackets) and `QST`
(uses `[LOGIC-…]`, which the lexer claims as a calculation block) do not — data
problems, pinned by name in case `H-09`.

## Self-describing XML

`toXML(src, {describe:true})` carries the semantics into the message: `means`
(the glossary definition) on every command, and `made-of` on composites. Off by
default — it changes the deliverable and costs ~59% more XML.

## Templates that expand

`[--name=body]` defines; `[--name[…]]` invokes **and expands** — the body enters
the message, not just the shell. The body declares holes with
`` [ph-name`question`] ``; the call fills them by name (`[ph-name'value']`) or
by position (loose literals, in `params` order). An unfilled hole becomes
`<needs>`. A `param` may be `"repeat": true` (at most one per template): it
leaves the positional order and fills only through repeated named calls, adding
one sibling node per occurrence. Cycles are barred (`TemplateCycle`).

## Semantic rules

`rules.json` checks **coherence** beyond syntax: `pair` (two commands on
the same target — siblings, or one an ancestor of the other), `order` (`then`
before `first`) and `precondition` (a target with none of its `requiresBefore`
ahead of it in the same segment). Under `[ovr]` or `[byp]` the overlap is
exempt — it was requested on purpose.

## Aliases

Short forms (the long one is canonical): `[IN]`→`[INS]`, `[AS]`→`[ASSM]`,
`[CX]`→`[CTX]`, `[PR]`→`[PRIO]`, `[TG]`→`[TGT]`, `[RY]`→`[RDY]`, `[VL]`→`[VAL]`,
`[RQ]`→`[REQ]`, `[CR]`→`[CRIT]`, `[RW]`→`[RWK]`, `[RV]`→`[REV]`, `[FM]`→`[FMT]`,
`[IM]`→`[IMPR]`, `[FN]`→`[FIN]`, `[CL]`→`[CLAR]`, `[RT]`→`[RTNL]`,
`[CN]`→`[CNST]`, `[WN]`→`[WARN]`, `[SM]`→`[SUM]`

**The seven v1.7 fusions were undone.** `[EVAL]`, `[REV]`, `[SPEC]`, `[SIMP]`,
`[QST]`, `[FOREX]` and `[ONLYIF]` are commands in their own right again — see
the axis table in `glyph-markup-commons`.

## `[ctx]` — three positions

`[ctx'what','where','when']`: 1 the subject, 2 the scope (file, module), 3 the
version or temporal condition. Only the first is required.

## Files

`/scripts` holds **JavaScript**; data (`.json`, `.txt`), the app (`.html`,
`.css`) and the documents stay at the root. The criterion is the file's kind,
not who wrote it.

| file | role |
|---|---|
| `GLOSSARY.md` | normative vocabulary reference |
| `SIGNATURES.md` | arities, derived from the engine |
| `expansions.txt` | composition table (source, editable) |
| `scripts/glyph-parser.js` | the core |
| `rules.json` · `templates.json` | stores, editable |
| `scripts/glyph-data.js` · `expansions.json` | **generated** |

Edited a `.json`, the `.txt` or `GLOSSARY.md`? Run
`node scripts/build-templates.js`. Verify with `node scripts/test-corpus.js`
and `node scripts/dag.js`.

## Versioning — `a.b.c.d`

`a` frontend · `b` backend (parser) · `c` business rules · `d` data and
constants. A digit that moves resets every digit to its right.
