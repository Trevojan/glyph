# Preliminary intake — coherence between emitted Orders

> **Not an order.** The Regent's question: *can Orders emitted over time
> contradict each other, and does anything in the repository prevent it?* Not
> the `|OpenOrders| ≤ 1` concurrency rule — the Orders already emitted,
> `ORD-0001` onward. Measured against the repository on 2026-09-11 at
> `49c392a`. A second, independent source of the Regent's reached the same
> conclusion as §4 before seeing it, which is noted where it lands.
>
> Formal treatment — structures, costs, invariants — in `INTAKE-FORMAL-ANALYSIS.md` §2.

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
   carries its own lineage in its own language.
2. **The CLI extracts them into the manifest** as
   `relates: [{ order, kind, reason }]` — the shape `supersedes` already has,
   plus `order`. Derived from the source, never typed by hand: *domain avoids
   synthesis.*
3. **A `--check`**: every `relates[].order` names an Order that exists in the
   destination; the `supersedes`/`overrides` subgraph is acyclic. `dag.js` over
   a graph of ten nodes.
4. **One home and one scheme** — the Regent's decision, and the precondition
   of the other three.

## 5. `required`, not nullable — the distinction that changes step 1

`<needs>` is the engine's *nullable*: absence is legal, and the engine asks
at the point of use. That is the right contract for a slot the human may not
know yet. It is the **wrong** contract for the relation field: an Order with no
declared lineage is not an Order awaiting an answer, it is an Order that has
not said where it stands — and if the field is prose, the engine cannot read it
and the question returns to undecidable.

So the relation is **`required`**: absence **prevents emission**. `--bundle`
refuses an Order that declares no `relates` — where "none: this is the first"
is itself a declaration, `[ref'ORD-0000']` or an explicit empty. The field is
typed, in Glyph, and its absence is a `fix`, not an `ask`. This is the one
place in the engine where an empty slot *does* block, and the reason is
stated: the slot is not information the human lacks, it is a claim the Order
must make about itself.

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
