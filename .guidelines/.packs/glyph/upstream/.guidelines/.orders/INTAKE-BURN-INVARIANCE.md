# Preliminary intake — is the burn a canonical form?

> **Not an order.** One measurement, run because three separate ambitions share
> it as a precondition and none had checked it: clause 9 (record disagreeing
> with policy), the semantic filter for `suggest()` (1 hit in 11 today,
> `.plan/`), and the content of `<schema/>`. The common question: **does
> `--hgml` yield a form invariant to surface synonymy?** `HGML_PLAN.md` asserts
> it as premise. It had never been measured.
>
> Thresholds stamped `2026-09-11T15:06:53Z` at `49c392a`, sha256
> `b74b1ee97722…`, before the test ran. Engine 3.4.7.05. Candidate for an Order
> of its own — see §7.
>
> Formal treatment — structures, costs, invariants — in `INTAKE-FORMAL-ANALYSIS.md` §1.

## 1. What "synonymy" means in Glyph

Only equivalences the notation **declares** count. `GLOSSARY.md` §0.1 and §0.3
declare three: an alias is its canonical; case is irrelevant; `;` closes what
`]` closes. Two spellings the notation calls *different meanings* —
`[spec-core]` (chain) against `[spec[core]]` (operand), and, since 3.4.7.05,
`[A],[B]` against `[B],[A]` (§0.1: *the order is part of what is said*:
`[simp'X'],[core]` is "simplify X and treat as core", `[core],[simp'X']` is
"in core, simplify X") — are not synonyms, and collapsing them would be a
defect, not invariance.

Six spellings of one policy, "criticise the parser", plus a control on a
level-1 composite:

| | source | tests |
|---|---|---|
| V1 | `[crit'the parser']` | the canonical composite |
| V2 | `[cr'the parser']` | alias |
| V3 | `[CRIT'the parser']` | case |
| V4 | `[crit'the parser';` | auto-close |
| V5 | `[cmp'the parser'[ctx]],[spec-core],[eval[error]]` | CRIT's formula written by hand, subject in the head per §0.3 |
| V6 | `[eval[error]],[spec-core],[cmp'the parser'[ctx]]` | V5 with conjunction siblings reordered — **must differ**: §0.1 since 3.4.7.05 makes the order meaning |
| P1 | `[prob'timeout']` | control, level 1 |
| P2 | `[error'timeout'[ctx]]` | PROB's formula by hand |

## 2. Three strengths of "same", and the thresholds

**A** byte-identical `.hgml` · **B** identical after sorting siblings at every
level (one normalisation step away) · **C** identical multiset of hieroglyphs.

| outcome | verdict |
|---|---|
| all A | the burn is canonical as-is; dependents proceed |
| A fails only on V6, B passes | canonical modulo sibling order; one ~10-line emitter change, then proceed |
| A fails on V5, B fails, C passes | content preserved, **structure not**; not a normal form; structure-dependent ambitions stop |
| C fails | premise false; all three stop |

## 3. Measured

| | A | B | C | atoms |
|---|---|---|---|---|
| V1 | ✓ | ✓ | ✓ | 15 |
| V2 alias | ✓ | ✓ | ✓ | 15 |
| V3 case | ✓ | ✓ | ✓ | 15 |
| V4 auto-close | ✓ | ✓ | ✓ | 15 |
| **V5 hand expansion** | **✗** | **✗** | ✓ | 15 |
| **V6 reordered** | **✗** | **✗** | ✓ | 15 |
| P1 / P2 | ✓ | ✓ | ✓ | 2 |

By the letter of §2: **third row.** Content preserved, structure not.

## 4. Diagnosis — the brackets are the rule; one table line contradicted it

The divergence is exact. Burning `[crit'the parser']` places `spec`, `real` and
`ref` **inside** `cmp`, as its children. The hand expansion V5 places them
**beside** `cmp`, as siblings. The table wrote:

```
CRIT = [CMP[CTX],[SPEC-CORE],[EVAL[ERROR]]]
        ^                                 ^-- CMP closes HERE
```

A seventh variant faithful to those brackets —
`[cmp'the parser'[ctx],[spec-core],[eval[error]]]` — burns **byte-identical
to V1.** *Measured.* The burn did exactly what the formula wrote.

What decides between the two readings is not a new rule but §0.3 itself. It
already reads a comma **inside** a head's brackets as that head's operands —
its own table glosses `VRFY = [CMP-TRUE[[CORE],[TGT]]]` as *"compare the
output against truth, foundation and target"* — and it already writes `CRIT`
with the head **closed**: `[CMP[CTX]],[SPEC-CORE],[EVAL[ERROR]]`, *"three
comma-separated items, all speaking about the parser"*. So the brackets are the
rule at every depth, and the table's `CRIT` line was the one formula that
contradicted the norm's own spelling of it.

The audit across all 32 formulas stands as a description, not as a defect
list: **nine** put a comma inside the head (`VRFY CRIT SCRU TRYFR QST DRVF
FOREX FBK HYP`), **thirteen** at top level, `CNSD` mixed. Eight of the nine
carry n-ary heads — `CMP-TRUE`, `EQ`, `GET`, `IMAG`, `RTNL-RWK` — whose
comma-items are operands by the same reading §0.3 gives `VRFY`; the norm
states no other form for them. `CRIT` is the one whose form the norm states,
and states differently.

## 5. What this decided

**`expansions.txt` line 127 is `CRIT = [CMP[CTX]],[SPEC-CORE],[EVAL[ERROR]]`**,
the norm's spelling. Stores rebuilt; the skill's worked `<glyph-package>`
carries the new `reads=`; the corpus snapshot moved on exactly the ten cases
that invoke `CRIT` and no other. `npm run check` green. V5 now passes at
strength **A**.

**The dependents no longer wait on the table.** Clause 9, the `suggest()`
filter and `<schema/>` have a burn that is one thing under one rule.

**The gate that was missing is one line of policy, not thirty of code:** a
formula the glossary spells is the formula the table carries. Where §0 quotes
a formula, `--check` compares it to `expansions.txt`. Proposed; not built here.

## 6. V6 — measured, and read against the norm that is in force

With V5 resolved, V6 (`[eval[error]],[spec-core],[cmp'the parser'[ctx]]`,
conjunction siblings reordered) separates order from structure for the first
time: **A fails, B passes, C passes** — the burn keeps the author's order and
nothing else differs. §2's second row read that as *canonical modulo sibling
order; one ~10-line emitter change*. That row was written against §0.1's
former text, *"no order between them"*, which 3.4.7.05 removed on purpose:
§0.1 now reads **conjunction carries order** — `[simp'X'],[core]` and
`[core],[simp'X']` are two intentions, and `HGML_CONVERGENCE.md` §2.1
measured the engine already treating them so. Under the norm in force V6 is
**not a synonymy**, and A failing on it is the burn being correct.

The sort was built, run (every V byte-identical), and reverted before commit,
because it collapsed two meanings the norm keeps apart. The burn preserves
conjunction order **by requirement**, and `I_C5` holds with `canon = id`.

## 7. Why this is a candidate Order

It had a deliverable — the glossary↔table gate, now in `build-templates.js`,
and `H-09` at zero — and a verification (V1–V5 at strength A, V6 at B), a precondition it unblocks
(three ambitions at once), and it was found by measurement rather than
proposed by design. The test that found it costs one command and can be the
Order's own acceptance criterion.
