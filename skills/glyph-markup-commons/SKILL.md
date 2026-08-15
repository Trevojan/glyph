---
name: glyph-markup-commons
description: Common vocabulary and canonical aliases reference for Glyph Markup v1.3.0.0.
---

# Glyph — common vocabulary and aliases (v1.3.0.0)

The pocket table. The full normative reference is `GLOSSARY.md`; arities are in
`SIGNATURES.md`.

## The minimum to get going

```
[crit'the parser']                        criticise this
[crit'the parser'][ctx'api/orders.py']    …in this context
[rw-cr'the module']                       rework AND criticise (chain)
/frs/[crit'this parser beat me']          with the mood stated
```

**An empty slot does not block.** `[sum]` with no target is not an error: it
becomes `<needs>what to summarise</needs>` in the XML and the message stays
usable. Only broken syntax or vocabulary is `fix`.

## Punctuation

| symbol | what it does |
|---|---|
| `'text'` | literal — no shift key needed |
| `;` | closes the block (closes even with an empty slot) |
| `;;` | splits the reply in two — closes **nothing** |
| `,` | lists items / continues a chain |
| `-` | chains: `[rw-cr]` |
| `r-` | what I should hand back |
| `[--name` | invokes a template · `[--name=` defines one |
| `[=` | this block continues from the previous |
| `[logic-name]` | opens a calculation block |
| `[off]` … `[on]` | turns Glyph reading off and back on |

## Two species

- **hieroglyph** (88) — atom, does not decompose. `[ctx]`, `[error]`, `[core]`,
  `[tgt]`
- **composite glyph** (32) — has a formula reducing it to hieroglyphs. `[crit]`,
  `[scru]`, `[prob]`, `[hyp]`

To see what a command is made of:
`node scripts/glyph-parser.js CRIT --expand`

## Main canonical commands

- `[CRIT]` criticise — compare against the declared objective
- `[EVAL]` evaluate — compare against a realistic quality standard
- `[REV]` review — reading sweep, no formal comparison
- `[VAL]` validate against an external criterion *(2 required slots)*
- `[VRFY]` verify — compare against truth or fact
- `[SCRU]` scrutinise *(composite: context + verify + criticise + ask)*
- `[COND]` condition — generic gate · `[ONLYIF]` necessary condition
- `[ELAB]` elaborate (the act) · `[SPEC]` the specification (the artefact)
- `[CLAR]` remove ambiguity · `[SIMP]` cut complexity
- `[EX]` the example itself · `[FOREX]` the connective that introduces one
- `[ASK]` ask someone · `[QST]` mark the block as interrogative
- `[DFN]` define a symbol *(2 slots)* · `[DEF]` default value
- `[CORE]` structural foundation *(was `[BASE]` until v1.0.9.3)*
- `[ERROR]` error *(hieroglyph)* · `[PROB]` an error situated in a context *(composite)*
- `[SUM]` summarise · `[TRYFR]` try to reach the target with verification

## Pairs that get confused

| pair | what separates them |
|---|---|
| `[EVAL]` / `[CRIT]` | against a realistic standard / against the declared objective |
| `[REV]` / `[CRIT]` | reading sweep / formal comparison |
| `[SPEC]` / `[ELAB]` | the detailed artefact / the act of detailing |
| `[SIMP]` / `[CLAR]` | cutting complexity / removing ambiguity |
| `[QST]` / `[ASK]` | typing of the block / act aimed at someone |
| `[FOREX]` / `[EX]` | the connective that introduces / the datum itself |
| `[ONLYIF]` / `[COND]` | necessary condition / generic gate |
| `[DONT]` / `[DENY]` | negates **the action** / rejects **the route to a result** |
| `[LIM]` / `[RESTR]` | observes a limit / imposes one |
| `[NGT]` / `[DONT]` | inverts a truth value / forbids doing |

*(The first seven were fused in v1.7 and separated again in v1.1.0.0 —
`GLOSSARY.md` §6.5.)*

## Vocabulary added in v1.1.0.0

- **Context** — `[FIND]` find · `[GET]` read and hold · `[ADD]` add ·
  `[SUB]` subtract · `[WHR]` where
- **Intensity** — `[HGH]` high · `[LOW]` low · `[BOLD]` strong emphasis ·
  `[LIGHT]` soft emphasis
- **Others** — `[SWITCH]` alternate between states · `[GO]` execute

The four intensity ones and `[WHR]` are primitives: they stand alone and never
ask for an operand.

## Short aliases

`[IN]`→`[INS]` · `[AS]`→`[ASSM]` · `[CX]`→`[CTX]` · `[PR]`→`[PRIO]` ·
`[TG]`→`[TGT]` · `[RY]`→`[RDY]` · `[VL]`→`[VAL]` · `[RQ]`→`[REQ]` ·
`[CR]`→`[CRIT]` · `[RW]`→`[RWK]` · `[RV]`→`[REV]` · `[FM]`→`[FMT]` ·
`[IM]`→`[IMPR]` · `[FN]`→`[FIN]` · `[CL]`→`[CLAR]` · `[RT]`→`[RTNL]` ·
`[CN]`→`[CNST]` · `[WN]`→`[WARN]` · `[SM]`→`[SUM]`

## Ready-made templates

`germinate`, `scientific-review`, `reinforce`, `insight`, `fertilize`,
`best-of`, `loop`, `track`. Invoking with `[--name'value1','value2',…]`
(positional) or `[ph-name'value']` (by name) expands the whole body into the
message. `best-of` takes further candidates by repeating
`[ph-more'C'][ph-more'D']`.

## Moods (`/xxx/`)

`/eth/` enthusiasm · `/cnf/` confusion · `/clm/` calm · `/hop/` hope ·
`/grt/` gratitude · `/cur/` curiosity · `/frs/` frustration · `/skp/` scepticism

*(These reach the XML as `<mood dominant="enthusiasm">`, hence English. The
interface that lists them is pt-BR.)*
