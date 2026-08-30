<!-- The measurement L5 opens with, run before the promoter was built rather
     than after. It decides how much of compare-and-promote is mechanical, and
     the answer changed what gets built. -->

# Promotion — the measurement, before the promoter

> The cheapest step in the plan, and the one that decides the shape of the rest.
> Run with `node scripts/glyph-diff.js --measure`.

## Why it comes first

Comparing two Glyph sources and promoting what they share is **synthesis**, not
domain — the Regent said so plainly. The standing maxim is *domínio evita
síntese*: whatever can be fixed in code, schema or table must never be
re-inferred. So the question is not "can this be built" but **how far does the
domain reach before synthesis begins**, and that is empirical.

Two levers were available before any code was written:

1. the comparison core is the E4 round-trip oracle turned outward — built once,
   used twice;
2. **the composition DAG is already a decidable generality relation.**
   `atomsOf`, `formulaOf` and `depthOf` over `expansions.json` — 88 atoms, ~120
   layered entries, zero cycles — make "is A's command an ancestor of B's" a
   table lookup rather than an inference.

Lever 2 was the reason to expect this to be cheap. The measurement is what
tested that expectation.

## What was measured

The five authored examples, pairwise: 10 pairs, 191 divergence sites. They are
the right corpus for this — same author, same kind of task, written by hand as
claims rather than as tests.

| class | sites | share |
|---|---|---|
| arity | 53 | 27.7% |
| vocabulary | 40 | 20.9% |
| presence | 36 | 18.8% |
| shape | 33 | 17.3% |
| literal | 29 | 15.2% |

**Of the 40 vocabulary sites, the composition table decides generality on 2.**

## The result, and it is not the one that was expected

Roughly **85% of sites are structural** — arity, presence, shape, vocabulary —
so the comparer can *describe* almost everything mechanically. But the part it
can *promote* is about **1%**.

The reason is visible in the data rather than argued:

```
E-02 vs E-03:  RTNL -> REV     COND -> CTX     ALW -> PROP
```

Two sources written for different tasks use **unrelated** commands, not
ancestor/descendant pairs. The DAG answers "is one a generalisation of the
other" and the honest answer is almost always *neither* — they are siblings in
meaning, not steps on one ladder. Where it does decide, it decides cleanly:

```
E-01 vs E-03:  REF / PROP   -> REF is more general
E-03 vs E-04:  PROP / CONF  -> CONF is more general
```

But two hits in 191 sites is a lever that exists and rarely engages.

## What this changes

**The boundary document is the deliverable, and the promoter is thin.** The plan
named this as one of two possible outcomes and it is the one that happened.
Building a promoter that fires on 1% of sites would be building the expensive
half of a feature whose cheap half does the work.

What is worth building instead, in order:

1. **The report.** Describing 85% of divergences mechanically is genuinely
   useful on its own: what moved, what appeared, which command changed, which
   side the engine's own gate refuses. None of it requires deciding anything.
2. **`PROMOTION_BOUNDARY.md`**, ratified as an F0 norm by the Regent — an agent
   may not ratify a norm it wrote.
3. **The hole-template promoter**, only for the sites where the table decides,
   and explicitly marked as covering a small share.

## The gap in the sample, stated rather than papered over

These five are **different tasks**, not **two versions of one task**. The
promotion scenario is the second, and no such pair exists in this repository —
so the distribution above may not be the distribution that matters.

Two versions of one intent would plausibly diverge along literal and arity lines
with the vocabulary held constant, which is a different shape and possibly a
more promotable one. **This is the one input the Regent could supply that would
change the conclusion**: any two versions of the same Glyph source, before and
after a revision.

Until then the numbers above are what there is, and they say: describe
mechanically, decide almost nothing, and write down where the line falls.
