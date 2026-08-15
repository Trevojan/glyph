# `.hgml` — plan and state

The plan that produced v1.1 through v1.3. Most of it has been executed; what
follows is the record of what was decided and the short list of what is left.

## State

| # | step | state |
|---|---|---|
| 1 | all JavaScript into `/scripts` | ✅ v1.1.0.1 |
| 2 | composition table complete (`expansions.txt`) | ✅ 120 layered, 0 cycles |
| 3 | composition bridge in the engine (`useExpansions`) | ✅ v1.1.0.1 |
| 4 | operand-binding rule normalised | ✅ `GLOSSARY.md` §0.3 |
| 5 | `.hgml` atomic burn (`toHGML`) | ✅ v1.2.0.0, 30/32 clean |
| 6 | AST slimmed, `describe` on the XML | ✅ v1.2.0.1 |
| 7 | glossary definitions inside the engine | ✅ v1.2.1.0, 120/120 |
| 8 | English across the engine | ✅ v1.3.0.0 |

## Decisions taken along the way

**D1 — split `glyph-parser.js` internally?** Not yet. The file has six seams
already commented in it (VOCABULARY, LEXER, LOGIC BLOCK, PARSER, XML EMITTER,
AST JSON), so where to cut is not the question. The obstacle is that the browser
has no `require`: the file is loaded by a plain `<script src>`, so splitting it
into CommonJS modules keeps Node working and **breaks the browser**. The way out
is a bundler (`build-core.js`, in the same spirit as `build-templates.js`) that
concatenates the modules back into one file, which extends a pattern the
repository already accepts rather than inventing one. Still open.

**D3 — canonical reprint or full atomic decomposition?** Full atomic. The cost
was measured before choosing: a composite averages ~15 hieroglyphs, `HYP`
reaches 97, and a short input grows roughly 25x. Density and full decomposition
pull in opposite directions, and this format chose decomposition.

**D4 — tag names for `.hgml`.** The existing canonical names, no new vocabulary
to maintain. The closed form is `[name … [/name]`, opening **without** `]` —
because `]` already closes a command, so `[ctx][/ctx]` would emit
`UnmatchedCloseTag`.

**D5 — what the dense filter discards.** Free prose disappears; the human's
literals survive. Literals are what was actually said, and `.hgml` is
hieroglyphs plus what they operate on.

## What is left

### Two formulas the grammar cannot read

Both are data problems, not burn bugs, and both are pinned by name in case
`H-09` so neither gets fixed silently:

- **`SCRU`** uses `R:` inside brackets. The return token is segment-level
  punctuation, so `[R:` parses as a command named `R`.
- **`QST`** uses `[LOGIC-NONE]`. The lexer claims any `[logic…]` as a
  calculation block and then demands `[/logic]` — meaning **the `LOGIC` command
  is unwritable inside a formula**. A language limitation, not a formula one.

### The pattern layer

The next real step. A rule kind that maps co-occurrence to a richer element:

```json
{ "id": "heavy-review", "kind": "blend",
  "when": ["REV", "SCRU"], "scope": "sameTarget",
  "emit": "heavy-review",
  "why": "reviewing and scrutinising together is one deep review, not two" }
```

It is data, like the rules store, and `glyph-rules.json` already has the
matching machinery — `pair`, `order` and `precondition` all match co-occurrence
over the tree; they simply diagnose instead of emitting.

Two things make it tractable. The burn gives a **canonical form**, so a pattern
written over the 88 atoms is invariant to which surface synonym the human typed.
And the LLM belongs at **authoring** time, not run time: real inputs in,
proposed patterns out, patterns into the data file, engine stays deterministic.

One trap: every element such a pattern invents must carry its own `means`, or
the interpretation problem just moves one step along.

### Separating interface data from engine data

`CATS` lives in `glyph-parser.js` and is pt-BR by design — it drives the command
browser, the search box and the tooltip. Engine data and interface data sharing
a file is the next data-engineering step; moving it means giving `glyph-ui.js`
its own vocabulary table, which changes the interface contract and wants its own
commit.
