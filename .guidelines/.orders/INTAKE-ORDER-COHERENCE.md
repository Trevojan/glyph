# Preliminary intake — coherence between emitted Orders

> **Not an order.** The Regent's question: *can Orders emitted over time
> contradict each other, and does anything in the repository prevent it?* Not
> the `|OpenOrders| ≤ 1` concurrency rule — the Orders already emitted,
> `ORD-0001` onward. Measured against the repository on 2026-09-11 at
> `49c392a`. A second, independent source of the Regent's reached the same
> conclusion as §4 before seeing it, which is noted where it lands.
>
> Formal treatment — structures, costs, invariants — in `INTAKE-FORMAL-ANALYSIS.md` §2.
>
> Step 3 of the trail is built on 2026-11-22 as [`EMS-002/ORD-0040`](EMS-002/README.md),
> in the Rust alone (C5 b): the claim read from the AST, `relates` in the manifest of the
> Rust `--bundle` and its refusal on a mismatch, and `glyph --check` over `.orders/` in
> `npm run check`. Step 4, `repair` as a queue, is built on 2026-11-22 as
> [`EMS-002/ORD-0042`](EMS-002/README.md), by the Regent's answers of that day (§12): `glyph --repair`
> for the Harness. §13 holds CO-1 measured and CO-4 asked again, and §14 what ORD-0042 left.

## 1. Between Orders — nothing. Not even informal.

*Measured:* no norm in `.constraints/`, `.decisions/`, `.plan/` or
`PACKAGE_TARGET.md` speaks of coherence between Orders. The bundle manifest
carries `order, engine, emitted, files, source, diagnostics` — **no field of
relation to any other Order.** The only "contradicts" in the repository is
intra-Order (`E0b-ARCHITECT-RETURN.md`: *the order contradicts its own…*).
And there is **one** Order inside the repository, so the problem has never had
the chance to appear.

## 2. Inside one Order — exists, disciplined, and is the mould

`ORD-2026-08-30-01.dispatch.json` already carries the shape the question asks
for, pointed inward:

```json
"supersedes": [
  { "version": 2, "reason": "S7 was knocked down by the Regent; by the order's own rule a knocked assumption produces the next version" },
  { "version": 4, "reason": "S11 and S12 were written against the wrong referent of glyph-package…" }
]
```

Seven supersessions in one Order, each with a written reason. The **form**
`{target, reason}` exists and is in use. It lacks one field: `order`. And the
vocabulary already holds the relations — `OVR` (overrides), `INSTOF` (instead
of), `DEPR` (deprecated, replacement may exist), `DRVF` (derives from), `SEEAL`
(related).

## 3. The finding nobody asked for — Orders do not share an identity

`ORD-2026-08-30-01` is numbered by date and lives in `.guidelines/.orders/`.
`ORD-0010` is sequential and was emitted at `/home/claude/work/src/` — outside
this repository. **Two numbering schemes, two homes.** The `--bundle` rule
(*highest `ORD-####` in the destination, plus one*) guarantees sequence only
when every Order is in one destination, and today they are not. Before
*semantic* coherence between Orders there is *identity* incoherence: nothing
answers "which Orders have been emitted".

## 4. Declared edges, never inferred

Two independent sources — this study and the Regent's external conversation —
arrived at the same rule before comparing notes: **an edge between Orders is
declared, never inferred or derived semantically.** General contradiction
between statements is undecidable (it reduces to program equivalence); a graph
of declared edges with cycle detection is trivial, and the repository already
runs it on the composition table. The cheapest path uses what exists at every
layer:

1. **The Order declares its relations in Glyph, in its own source** —
   `[ovr[ref'ORD-0003']]`, `[drvf[ref'ORD-0002']]`, `[seeal[ref'ORD-0007']]`.
   Existing vocabulary; goes through the parser; appears in the XML. The Order
   carries its own lineage in its own language. **A reference also names its own
   category**: `[ref'nem']` on a loose chained Order, `[ref'EMS']` on the first
   Order of a series, which is how an Order declares it belongs to a queue and
   hands the check to that series' configuration (the Regent, 2026-10-15; §9).
2. **The CLI extracts them into the manifest** as
   `relates: [{ order, kind, reason }]` — the shape `supersedes` already has,
   plus `order`. Derived from the source, never typed by hand: *domain avoids
   synthesis.*
3. **A `--check`**: every `relates[].order` names an Order that exists in the
   destination; the `supersedes`/`overrides` subgraph is acyclic. `dag.js` over
   a graph of ten nodes. Where the category is `EMS`, the destination is the
   series' `EMS.json`, and what the check compares is metadata, not presence.
4. **One home and one scheme** — decided on 2026-09-24:
   `.orders/EMS-###/ORD-####/`, the ORD count restarting in each series
   ([`.decisions/`](../.decisions/README.md), *"Responde ao `I_B1`"*). Steps 1
   to 3 are ratified on 2026-10-15.

## 5. `required`, not nullable — the distinction that changes step 1

`<needs>` is the engine's *nullable*: absence is legal, and the engine asks
at the point of use. That is the right contract for a slot the human may not
know yet. It is the **wrong** contract for the relation field: an Order with no
declared lineage is not an Order awaiting an answer, it is an Order that has
not said where it stands — and if the field is prose, the engine cannot read it
and the question returns to undecidable.

So the relation is **`required`**: every Order says where it stands. The field
is typed, in Glyph, and the claim is not optional — the slot is not information
the human lacks, it is a claim the Order must make about itself.

What the claim may be is wider than "name another Order". A loose chained Order
references its neighbour in the same directory, and `[ref'nem']` names that
category; the first Order of a series writes `[ref'EMS']` and the series'
configuration answers for it. So **"none: this is the first" is not a case**:
there is always a category to declare, and `ORD-0000` stays unreserved.

And the trigger is **mismatch, not absence**. `--bundle` does not refuse for a
missing reference; it refuses when the metadata does not match what the EMS
configuration declares — a `[ref'EMS']` in a folder whose configuration does not
hold that Order, a chain that points outside its own directory. That `fix` is
not a dead end: it is **enqueued to `repair`**, which asks to move the misplaced
ORD to its correct EMS, or to `.orders/NEM/` (§9).

## 6. The honest limit

**Inferred semantic contradiction** — "ORD-0005 says `[mand X]` and ORD-0002
said `[dont X]`" — is technically reachable: concatenate the trees, run
`checkRules`, `mand-dont` is already a rule. But Orders have different subjects
and scopes, and `[mand X]` in one and `[dont X]` in another may both be right
where they stand. Without scope, it would be mostly false positives. Second
order: *measure before design*, and the measure is "how many Orders exist and
how many declared relations run between them" — today, one and zero.

## 7. Where the relation is read from, and what that decides

**From the AST, before the burn.** The AST is the source of truth
(`CLAUDE.md`); the burn is a projection of it. `[drvf[ref'ORD-0002']]` read
from the tree is `DRVF` with a `REF` child — the dialect of `DRVF`'s formula
(`INTAKE-BURN-INVARIANCE.md` §4) never enters, because the relation is
extracted before anything expands. This is how `binds`, `ref` and `role` are
already extracted, and for the same reason.

So this intake **does not wait** on the burn-invariance decision. The nine
formulas there are a quality concern for the `.hgml` projection of an Order;
they are not on the path from source to `relates[]`.

## 8. Where this sits among the other intakes

`relates[]` is the **first** field of a kind the manifest has one embryo of:
`source` is a single-edge dependency record ("what I was compiled from").
`relates[]` makes it multi-edge. The Virtual Path resolution records of
`INTAKE-VIRTUAL-PATH.md` §15 are a third edge type in the same structure —
`kind: order, granularity: whole` here; `kind: slice, granularity: section`
there. One reference primitive, one manifest, one `--check`; two policies for
failure (`fix` here, `ask` there).

That fixes the order of work: **this before the mini-repo.** It is the small
instance of the shared mechanism — one target kind, whole-identity granularity,
no slice extraction, a graph of ten nodes — and it proves *manifest as
dependency record* on the easiest case before the Virtual Path tries it on
thirty-four documents. And it stands on its own: coherence between Orders is a
problem whether or not a mini-repo is ever built.

## 9. Ratified, and what the Regent added to it

Steps 1 to 3 are **ratified** (the Regent, 2026-10-15,
[`.decisions/`](../.decisions/README.md)), with three additions this intake did
not carry. His words are in
[`PERGUNTAS-ABERTAS.md`](../.plan/PERGUNTAS-ABERTAS.md) §8.

| addition | what it changes here |
|---|---|
| **two reference values** — `[ref'nem']` for a loose chained Order, `[ref'EMS']` to declare belonging to a series | replaces `[ref'ORD-0000']` and the explicit empty, both of which existed only to spell "I am the first". `ORD-0000` stays unreserved, and the `--check` keeps no special case for emptiness |
| **the check is delegated to the EMS configuration**, which each series carries and which is already ratified | the destination of the `--check` for a series Order is its `EMS.json`, not the folder listing. §4 step 3 reads from it |
| **`repair` becomes a queue** — every `fix` found here is enqueued to it, and it asks to move **each** misplaced ORD to its correct EMS or to `.orders/NEM/` | `repair` exists in the traffic design as *show the diff and ask before writing* ([`INTAKE-PIN-TRAFFIC.md`](INTAKE-PIN-TRAFFIC.md) §3); **it has no queue and no move**, so this is new work, not a reuse |

**The granularity is settled, and it is per Order.** *"…will ask to move **each**
misplaced ORD"* — one question per finding, not one question for the batch, which
is the same contract `repair` already has for writing: it shows the difference
and asks before it acts (2026-09-27). A batch confirmation would make one answer
move files the Regent never saw named, and that is what the existing contract
exists to prevent.

It changes the manifest and what `--bundle` refuses, so it enters as an ORD. The
gate of `FIELD-3b` — all `[ctx]` versions in a series equal the series'
declared one — lands on the same destination and follows it
([`INTAKE-FIELD-2026-09.md`](INTAKE-FIELD-2026-09.md) §3).

## 10. The measured proposal

The proposal for steps 3 and 4 of the trail to the final Explorer
([`.plan`](../.plan/README.md) §5): the coherence, and `repair` as a queue. Measured at
`5685486` over the 54 Orders of `EMS-001` to `EMS-003`, their `.pgml` and their
`.manifest.json`, the queued ones included:

| | |
|---|---|
| Orders that write a `[ref'…']` of any kind | 0 |
| manifests that carry `relates`, `supersedes` or `overrides` | 0 |
| `.orders/NEM/` | does not exist |
| the cycle check §4 step 3 reuses | `dag.js`, 68 lines, over the composition table |

So every Order owes the claim of §5, and none makes it yet. The 54 are acts, and acts
stay as emitted.

**C1. The 54 closed Orders, which make no claim.**
- a. the check reads them as emitted and asks nothing of them: it holds the Orders
  bundled after the Order that builds it
- b. `repair` asks where each one stands, once per Order, and writes the answer in its
  manifest, never in its source: 54 questions
- c. the series' `EMS.json` lists them, a fact the spec already holds
  ([`INTAKE-EMS-JSON.md`](INTAKE-EMS-JSON.md) E1 b)

**C2. Where an Order writes its claim.**
- a. anywhere in its source, read from the AST as `binds` and `ref` are (§7)
- b. as its first statement, so a reader finds it without the tree

**C3. Where the `repair` queue lives.**
- a. one file for the repository, `.orders/repair.json`: each finding names the Order,
  what did not match, and the move it proposes, and `repair` asks through it one Order
  at a time
- b. one per series, beside its `EMS.json`
- c. nowhere: the queue is the output of the `--check`, asked through when it runs

**C4. When `.orders/NEM/` is made.**
- a. by the first loose Order emitted into it
- b. now, empty, with a README that states its numbering

**C5. Which engine extracts `relates[]` and runs the check.**
- a. both, the JS first, as every Order since `EMS-002/ORD-0001`
- b. the Rust only

**The session's recommendation:** C1 a, C2 a, C3 a, C4 a, C5 a.
- **C1 a** holds the rule forward and the acts as emitted.
- **C2 a** reads the claim the way every other relation is read.
- **C3 a** gives `repair` one place to resume from, one question per Order, as ratified.
- **C4 a** makes nothing nobody asked for.
- **C5 a** follows the oracle.

## 11. The answers to §10 — 2026-11-21

In [`.decisions/`](../.decisions/README.md), round of 2026-11-21, from the sheet [`PERGUNTAS-2026-11-20.md`](../.plan/PERGUNTAS-2026-11-20.md).

| | answer | what the Orders build |
|---|---|---|
| C1 | a | the check holds the Orders bundled after the Order that builds it; the 54 closed ones are read as emitted, and nothing is asked of them |
| C2 | a | an Order writes its claim anywhere in its source, read from the AST as `binds` and `ref` are |
| C3 | b | the `repair` queue is one file per series, beside its `EMS.json`: each finding names the Order, what did not match and the move it proposes, and `repair` asks through it one Order at a time |
| C4 | a | `.orders/NEM/` is made by the first loose Order emitted into it |
| C5 | b | the Rust alone extracts `relates[]` and runs the check; the JS does neither |

## 12. The answers to the questions `ORD-0040` left — 2026-11-22

In [`.decisions/`](../.decisions/README.md), round of 2026-11-22. RP-1 to RP-4 shape step 4,
`repair` as a queue; CO-1 to CO-5 were the points `EMS-002/ORD-0040` did not decide.

| | answer | what it builds |
|---|---|---|
| RP-1 | b | `--bundle` refuses a claim that does not match, as `ORD-0040` built it, and the refusal offers `repair` as an option; the queue takes what `glyph --check` finds in Orders already written |
| RP-2 | a | a moved Order adapts to the series it lands in: the destination's next number, its five files, the manifest's `order` and the block name the series declares; the move always warns, for the Regent to confirm |
| RP-3 | both | the Harness repairs through `glyph --repair`, built first; the Regent through the Explorer. An MCP for the Harness germinates here, a line of [`STUDY.md`](../.sources/STUDY.md) |
| RP-4 | b | every finding proposes a destination; a misplaced ORD or EMS is a software mistake, kept in a category of its own and listed whole, and the user says where each goes through the Explorer's `-Repair-` menu, [`.ux/explorer/`](../.ux/explorer/README.md) |
| CO-1 | investigate | measured in §13 |
| CO-2 | now | bundling into a series moves to the Rust binary now, by J4 b: the plugin calls an installed `glyph` and refuses by name where none is installed |
| CO-3 | keep | `ORD-0040` holds itself; the suggestion the Regent invited is in §13 |
| CO-4 | asked again | §13 |
| CO-5 | a state update | the `EMS.json` row of `GLOSSARY.md` §8 names `ems-schema.json` |

`Move to category`, one of the `-Repair-` options, moves an Order among the three categories
the Regent set the same day; how they are kept is
[`INTAKE-ORDER-STATES.md`](INTAKE-ORDER-STATES.md)'s.

## 13. CO-1 measured, the suggestion for CO-3, and CO-4 asked again — 2026-11-22

### CO-1 — the diagnostic a claim raises

Measured at engine 4.7.10.09 over the working tree of 2026-11-22.

| | |
|---|---|
| what a claim raises today | `ask UnboundReference`, from `unboundRefs` in `parser.js` and its port in `glyph-parse`: `EMS`, `nem` and `ORD-####` are name-shaped literals under `REF` that nothing binds (`EMS-002/ORD-0015`) |
| what the XML carries for it | `<needs var="EMS">` beside the literal: the package says it **needs** something it in fact claims |
| a claim that points outside its directory, `EMS-001/ORD-0001` | asks nothing: the slash makes it no name |
| sources of the suite, the snapshot, the conformance and the testkit that carry a claim | 0 |
| Orders that carry one | 1, `EMS-002/ORD-0040`, an act that stays as emitted |

So no hash moves whichever answer is given; only the probes a new diagnostic adds.

**CL-1. What a claim raises in place of `ask UnboundReference`.**
- a. a `note` of its own, `OrderClaim`, one per claim, naming what it claims — the series, a loose Order, or an Order of its own directory — and that `--bundle` and `glyph --check` answer it; no `<needs>` in the XML
- b. nothing: the claim is checked where it can be answered, at `--bundle` and by `glyph --check`
- c. the `ask` stays, with words of its own for a claim

**CL-2. In which engine.**
- a. both, the JS first: the parser is the JS's too while the app reads it, and the parse oracle holds the two together
- b. the Rust only, named as a known difference in the testkit, as the walk towards Rust of D5 b and C5 b

**The session's recommendation:** CL-1 a, CL-2 a. A note says what the parse cannot check
and where it is checked, which an `ask` asks of nobody; and a parse diagnostic that differs
between the engines is a known difference in five oracle modules, not one.

### CO-3 — the suggestion

`HELD_FROM` is a moment written in the code: in a user's repository, where `ORD-0040` never
existed, it still means "bundled after 2026-11-22T20:06:46Z". Once CO-2 moves series bundling
to the Rust, every bundle the Rust writes can carry `relates`, an empty list when the source
makes no claim, and the check can hold exactly the bundles whose manifest carries `relates`:
a fact of the bundle itself, with no moment in the code. `ORD-0040`'s manifest, written by
the JS, carries no `relates`, so it would be the one Order held by name. Offered, not built:
it changes every series bundle the CLI oracle records, a known difference of the Rust.

### CO-4 — whether `deprecated` supersedes, with its detail

An Order can point at another Order in two families of ways:

- **pointing**: `[drvf]` *derives from*, `[seeal]` *see also*, a bare `[ref]`. "I build on X",
  "X is related". A cycle here is harmless: `ORD-0002` sees also `ORD-0003`, and `ORD-0003`
  sees also `ORD-0002`.
- **replacing**: `[ovr]` *overrides*, "where we disagree, I win over X"; `[instof]` *instead
  of*, "use me in place of X". A cycle here is a contradiction: `ORD-0002` replaces
  `ORD-0003` and `ORD-0003` replaces `ORD-0002`, and nobody can say which one is in force.
  `glyph --check` refuses it, `SupersessionCycle`.

`[depr]` *deprecated* sits between the two. Its formula, `[AVD[GO]],[OPT[REF[INSTOF]]]`,
reads "avoid going on with X; optionally, refer to what replaces it": it retires X, and may
or may not name the replacement. `ORD-0040` put it with the replacing family, so
`ORD-0002` deprecating `ORD-0003` while `ORD-0003` deprecates `ORD-0002` is refused too.

It matters for rework: a rework Order corrects a closed Order, and the claim it writes to
say so is one of the replacing kinds.

**CO-4. Is `deprecated` a replacing kind?**
- a. yes, as built: two Orders that deprecate each other are refused as a cycle
- b. no, it points: an Order may deprecate one that deprecates it, and only `override` and `instead-of` make the refused cycle

**The session's recommendation:** a. Two Orders that each retire the other leave neither in
force, which is the contradiction the check exists to refuse.

## 14. What `EMS-002/ORD-0042` left — 2026-11-22

`glyph --repair` is built for the Harness (RP-3), all of the `-Repair-` menu but two options.

**RQ-1. A closed Order in the queue.** The queue holds Orders bundled from `ORD-0040` on, and
some of them close: `ORD-0040` to `ORD-0042` are closed in the working tree. Until the
categories of [`INTAKE-ORDER-STATES.md`](INTAKE-ORDER-STATES.md) are kept, the binary cannot
tell a closed Order from an open one, so a move or a removal warns that it rewrites the Order,
and the Regent's confirmation is the only guard.
- a. so it stays until the categories exist; then `repair` refuses to move or remove a closed Order, and offers *rework* instead
- b. `repair` reads the series register's *Ordens fechadas* now, and refuses what it lists

**RQ-2. What *Add to EMS* does**, offered only for an ORD.
- a. it moves a loose ORD into a series the user picks, as *Move to...* does — so it is *Move to...* filtered to the series
- b. it keeps the ORD where it is and writes it into the series' spec, so the series answers for it without a move
- c. something else, in the Regent's words

**The session's recommendation:** RQ-1 a, RQ-2 a. A closed Order is an act, and a rework is
how a closed Order is corrected; and the only thing a series answers for is what lies in it.
