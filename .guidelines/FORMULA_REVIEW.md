# Formula review — what changed between the two passes

The consolidated glossary lives in [GLOSSARY.md](GLOSSARY.md). This file is only
the record of what was revised and why — useful if a correction needs reverting,
useless once the formulas are stable.

## Mistakes in the first pass

**Redundancy in three formulas.** Hieroglyphs stacked that say the same thing,
which inflates depth in `dag.js` without adding meaning:

| was | became | why |
|---|---|---|
| `RMBR = [ALW[MAND[GET[CTX]]]]` | `[ALW[GET[CTX]]]` | `ALW` and `MAND` are the same force here |
| `RTNL = [SPEC[ELAB[RSN]]],[REF[CNST]]` | `[ELAB[RSN]],[REF[CNST]]` | `SPEC`+`ELAB` is detail said twice |
| `ALT = [DIST[NEQ[BASE]]]` | `[NEQ[CORE]],[EQ[TGT]]` | `DIST`+`NEQ` is difference said twice |

**One genuine semantic error: `DEPR`.** It read `[NEV[GO]]` — "never execute".
Wrong: that is `DONT`/`DENY`. Something deprecated still works, it just should
not be used, and it does not always have a replacement. The entry for `AVD`
("steer clear where possible, weak degree") was exactly the right piece and went
unused. It became `[AVD[GO]],[OPT[REF[INSTOF]]]`.

**Simplifications that improved the reading**, with no change of meaning: `FRGT`
lost a superfluous `[SUB[CTX]]`; `JUST` and `CTRD` each lost a level of nesting;
`LRN` lost a `[PT]`.

**A side benefit:** cutting `[SUB[CTX]]` from `FRGT` turned the `RMBR`/`FRGT`
pair into `[ALW[GET[CTX]]]` against `[NEV[GET[CTX]]]` — a perfect minimal pair,
same operand and opposite quantifiers. That is what makes the `rmbr-frgt`
contradiction in `rules.json` *derivable*. The redundant version hid it.

## Two formulas withdrawn

`RSN` and `FIN` left the composites and became hieroglyph primitives. The
formulas available (`[CORE[CTX-GO]]` and `[PT[NEV[ADD[PT]]]]`) said less than the
prose entry did and created false depth in `dag.js`. Recorded here in case
keeping them as composites is preferred.

## What the first pass missed

**The real gap was not the formulas — it was the undeclared atoms.**
`expansions.txt` declared 28; the v1.1 glossary declared 77. That was ~49 `= BASE`
lines missing: mechanical work, no content decision, and the thing blocking
`dag.js` from computing anything. The 15 formulas had been treated as the
bottleneck. They were not — the mechanical part was three times larger and came
first.

**The notation carried an unresolved ambiguity.** `[A],[B]` (conjunction),
`[A][B]` (sequence) and `A + B` (old algebraic) coexisted with no declared rule.
The rule was ratified — comma is conjunction, juxtaposition is sequence — and is
normative in `GLOSSARY.md` §0.1. The algebraic form is retired.

**`BASE` was overloaded** — both the `expansions.txt` keyword and a vocabulary
command. Resolved: the command became `CORE`, the keyword stayed `BASE`. Four
code points, zero test cases.

**The v1.7 de-fusions follow a single axis**, which had been treated as seven
separate decisions: in all seven the split is *object vs. act*, or *standard of
comparison*. That is an argument for the de-fusion, not against it — the table
is in `GLOSSARY.md` §6.5.
