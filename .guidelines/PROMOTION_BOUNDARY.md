<!-- DRAFT. Written by an agent from PROMOTION_MEASUREMENT.md, and NOT in force.
     An agent may not ratify a norm it wrote; §5 is the Regent's to sign. -->

# Promotion boundary — where domain ends and synthesis begins

> **Status: DRAFT, awaiting ratification as an F0 norm.** Nothing here binds
> until §5 is signed.
>
> Q4 asked the Regent to ratify this document. It did not exist: it was listed in
> `PROMOTION_MEASUREMENT.md` §"What this changes" as item 2 — a deliverable to be
> written — and the open question read as though it had been. This is the fourth
> occurrence of the release's own root cause: **a thing referenced everywhere and
> commissioned nowhere.** So it is written first, and then offered.

## 0. What the norm is for

The standing maxim is *domínio evita síntese*: whatever can be fixed in code,
schema or table must never be re-inferred. Comparing two Glyph sources and
promoting what they share is **synthesis**. The question is not whether a
promoter can be built, but **how far the domain reaches before synthesis begins**
— and that was measured before anything was built.

This document writes the answer down so it is not re-litigated per feature.

## 1. The measurement this rests on

Five authored examples, pairwise: 10 pairs, **191 divergence sites**.

| class | sites | share |
|---|---|---|
| arity | 53 | 27.7% |
| vocabulary | 40 | 20.9% |
| presence | 36 | 18.8% |
| shape | 33 | 17.3% |
| literal | 29 | 15.2% |

**Of the 40 vocabulary sites, the composition table decides generality on 2.**

Roughly **85% of sites are describable mechanically**. The share that is
**promotable is about 1%**.

The reason is in the data, not in an argument: two sources written for different
tasks use *unrelated* commands rather than ancestor/descendant pairs. The DAG
answers *"is one a generalisation of the other"*, and the honest answer is almost
always **neither** — they are siblings in meaning, not steps on one ladder.

## 2. The boundary — three tiers

### Tier D — domain. Mechanical, and never inferred.

A divergence may be **described automatically** when the description follows from
a table, a schema or the AST without a judgement:

- **arity** — a command took a different number of operands;
- **presence** — something appears on one side and not the other;
- **shape** — nesting, chain membership, segment position;
- **literal** — the operand text differs;
- **vocabulary identity** — which command was used, by canonical name.

None of this decides which side is better. It says what moved.

### Tier P — promotable. Only where the table decides.

A divergence may be **promoted to a more general form only when the composition
DAG answers the generality question by lookup** — `atomsOf`, `formulaOf`,
`depthOf` over `expansions.json`, 88 atoms and no cycles.

Measured: this fires on **2 of 191 sites**.

```
E-01 vs E-03:  REF / PROP   -> REF is more general
E-03 vs E-04:  PROP / CONF  -> CONF is more general
```

**A promoter that fires here is thin by construction, and must declare its
coverage.** Building one that fires more widely means it started inferring.

### Tier S — synthesis. Refused.

Everything else, and the refusal is the point:

- deciding that two **unrelated** commands are "really the same thing";
- choosing a winner between siblings in meaning;
- generalising a literal by resemblance;
- inferring intent from the shape of a divergence.

A tool that does any of this is guessing with a confident interface, which is
worse than not having the tool.

## 3. The consequence already applied

`PROMOTION_MEASUREMENT.md` states it and this norm makes it binding: **the
boundary document is the deliverable and the promoter is thin.** Build order:

1. the **descriptive report** — 85% of sites, decides nothing, useful alone;
2. **this norm**, ratified;
3. the **hole-template promoter**, only for Tier P, marked as covering a small share.

## 4. The declared gap in the sample

Stated rather than papered over, and it is the honest limit of §1.

The five examples are **different tasks**, not **two versions of one task**. The
promotion scenario is the second, and **no such pair exists in this repository**,
so the distribution in §1 may not be the distribution that matters.

Two versions of one intent would plausibly diverge along **literal and arity**
lines with the vocabulary held constant — a different shape, and possibly a more
promotable one.

**This is the one input that would change the conclusion:** any two versions of
the same Glyph source, before and after a revision. Until it exists, §1 is what
there is, and §2 stands on it.

If that pair arrives and moves the numbers, this norm is re-measured and
re-ratified rather than quietly widened.

## 5. Ratification — the Regent's

An agent may not ratify a norm it wrote. This section is empty until the Regent
fills it.

```
ratified-by:
date:
force: F0
notes:
```

Until then, §2 is a **recommendation drawn from a measurement**, not a norm, and
nothing may cite it as binding.
