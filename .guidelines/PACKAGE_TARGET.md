# Package target — the `glyph-package` document

> **Normative.** The golden (E1) and the validator (E3) derive from this document
> and from the five examples, never from the emitter (lock T5, T31).
> Order `ORD-2026-08-30-01` v5, deliverable E0b. Engine 2.4.5.01.
> Architecture: `.guidelines/ORDERS/E0b-ARCHITECT-RETURN.md`.

## 0. What this is, and what it is not

`glyph-package` is **the emitted document root that succeeds `<glyph>`** — one
document per Glyph source. It is not a file tree.

The six-layer bundle of `BUNDLE_TARGET.md` is a **different artefact** that
happens to have been called by this name in `scripts/glyph-check.js:20`. Lock T0
separates them permanently; that comment is corrected in this release (K20).

`BUNDLE_TARGET.md` is still consulted here, but for **method** rather than for
shape: acceptance as a mutation test, the refusal of a self-attested gate, and
the rule that a layer earns Glyph only when one source projects into two formats
that cannot be diffed against each other.

---

## 1. Why this is a delta and not a grammar

The obvious way to specify a new emitted format is to write its full grammar.
This document deliberately does not.

`XML_REFERENCE.md` is the only document in the repository already held to the
engine by tests — `D-01` through `D-06` fail when it drifts. A complete parallel
grammar would restate all of it, would not be covered by those tests, and would
become a second description of one truth. That is precisely the defect that
produced version 5 of the order, and lock T36 forbids it.

**Therefore:** `glyph-package` is `XML_REFERENCE.md` §1–§11, with exactly the
changes in §2 through §6 below. Anything this document does not change is
unchanged and is specified there — the naming rule, attributes, `<off>`, mood,
`<needs>`, block segmentation, `<break/>`, `continues="previous"`, `<logic>`,
`<source>`, and every failure clause of §11.

E5 rewrites `XML_REFERENCE.md` against the new emitter. At that point this
document becomes the record of what changed and why, and the reference resumes
being the single grammar.

---

## 2. The root

```xml
<glyph-package engine="2.4.5.01">
  <block once="true"> … </block>
</glyph-package>
```

- **`<glyph-package>` replaces `<glyph>` unconditionally** — for every emission,
  not only where a chain or an invocation occurs (assumption S18, resolving Q8).
  A conditional root would force every consumer to branch on document shape
  before it could read anything; the empty case is the cheaper degenerate one.
- **`engine`** carries the engine version that produced the document, and is
  mandatory. The AST envelope already travels to readers that do not have this
  engine (`glyph-check.js:7–12`); a document that cannot say what produced it
  cannot be judged perishable, and lock T11 makes perishability explicit
  everywhere else.

`<block>` keeps its meaning exactly: one segment, always `once="true"`, a direct
child of the root. The positional disambiguation between the segment wrapper and
the `[block'x']` command (`XML_REFERENCE.md` §1) is unchanged and still holds,
because it depends on being a direct child of the root, not on the root's name.

---

## 3. `<chain>`

### 3.1 The grouping rule

> A maximal run of consecutive sibling elements whose first carries
> `chain="extend"` and whose remainder carries `chain="item"` is exactly one
> `<chain>`.

The run is derived from **the attribute and sibling order alone** — no re-parse,
no access to the source (lock T35, `OPERATOR_TARGET.md` §3.4). A format that
needs the source in order to be understood is not a deliverable.

```
[crit-ctx,ex'X']
```

```xml
<criticise>
  <chain>
    <context/>
    <example/>
  </chain>
  <user-input>X</user-input>
</criticise>
```

The head of the construct — `criticise` here — is **not** a member of the run.
It is the parent the run nests inside. Siblings that follow the run, such as
`<user-input>`, stay where they are.

### 3.2 The attribute does not survive the grouping

Members of a `<chain>` **do not carry `chain`**. Once the group is explicit, the
attribute is a second encoding of one fact, and position already carries it:

```
first member   ← the extend operator, `-`
every other    ← the item operator, `,`
```

The inverse is therefore total: the operator is recoverable from position, so
dropping the attribute inside the group loses nothing. Outside a `<chain>` the
attribute cannot occur at all, because a run of length one is still a run (§3.3).

This is the same repair the release already made to `chainElement`, which was
answering two independent questions and now answers one.

### 3.3 A run of one is still a run

`[crit-ctx'X']` emits a `<chain>` with a single member. Wrapping conditionally on
length would reintroduce exactly the shape-branching that §2 rejects for the
root, and would make the length-1 case unrepresentable as a group.

### 3.4 Consecutive extends open separate runs

`[rev-impr-fmt]` emits `improve` and `format` as flat siblings, both carrying
`chain="extend"` — the engine does not build a nested pipeline (finding A5). A run
is *first `extend`, remainder `item`*, so a second `extend` cannot continue the
first: it **opens a new run**.

```xml
<review>
  <chain><improve/></chain>
  <chain><format/></chain>
</review>
```

Two adjacent single-member chains looks odd, and it is correct. The alternative —
folding consecutive extends into one `<chain>` — would make `[rev-impr-fmt]` and
`[rev-impr,fmt]` emit identically, which is precisely the defect E0 was built to
remove. The shape is the price of keeping `-` distinguishable from `,`.

### 3.5 What is not a chain

Consecutive siblings that carry no `chain` attribute are not a run and are not
wrapped. A `chain="item"` with no `chain="extend"` before it is malformed (§6,
`ChainWithoutHead`) — the item operator is defined only as a continuation.

---

## 3b. `<holds>` — conjunction between bracketed siblings

> **Added 2026-09-05.** `<chain>` groups `-` and `,` between **bare** links.
> `<holds>` groups `,` between **bracketed** siblings. Same rule, different unit.

### 3b.1 Why it exists

Measured on the engine at 2.4.6.04: `[simp'X'],[core]` and `[simp'X'][core]`
emitted **byte-identical documents**, while `GLOSSARY.md` §0.1 gives them
different readings — conjunction against sequence, and §0.3 adds that in a
sequence the second item's subject is the *result* of the first.

Only one projection told them apart:

| projection | distinguishes conjunction from sequence? |
|---|---|
| AST | **yes** — `origin: "item"` against `origin: "root"` |
| `glyph-package` | no |
| `.hgml` | no |

So the emitted document rewrote a conjunction as a sequence, in silence. That is
the class this release exists to remove, and `RT-05` had it pinned as a known
loss since before the package work: *"the AST path keeps a comma the XML path
cannot."*

### 3b.2 The grouping rule

A maximal run of **a head plus every following sibling carrying `join="item"`**
at the same level is one `<holds>`.

```
[simp`X`],[core]
```

```xml
<holds>
  <simplify>
    <invoke reads="[RTNL-SUB],[CTX]" species="composite" depth="2"/>
    <user-input>X</user-input>
  </simplify>
  <core/>
</holds>
```

Where `<chain>` groups **lines** — a bare link is always one self-closing line —
`<holds>` groups **spans**, because a bracketed member runs from its open tag to
its close. The rule is the same; the unit is not.

### 3b.3 The attribute does not survive the grouping

`join="item"` is written by the emitter and removed by the grouping pass, for the
same reason §3.2 gives for `chain`: **position carries the operator.** The head
came with no operator, every later member from `,`. A `<holds>` member that
arrives carrying `join` is refused (§6, `XmlHoldsCarriesJoin`) rather than
repaired, because repairing it in silence is the fault being fixed.

### 3b.4 What is not a `<holds>`

Consecutive siblings with no `join` are a **sequence** and stay unwrapped — that
is now the difference the document carries. A chain member is never a `<holds>`
member: `chain` and `join` are written on disjoint sets, bare links against
bracketed ones.

---

## 4. `<invoke>` — the command call

> **Delivered decision (Q10).** `<invoke>` is the **command call**, and to the
> model receiving the document it must mean **function**.

### 4.1 A command is a function, and the XML never said so

The system already treats commands as functions everywhere except in what it
emits.

- `SIGNATURES.md` is a table of **arities**: 8 commands of strict arity 2, 6
  N-ary, 60 taking one slot, 44 of zero arity. That is a signature table.
- `GLOSSARY.md` §0.2 gives, under the heading **`| invocation | reading |`**, the
  body each composite decomposes into: `[prob'timeout']` reads `[ERROR[CTX]]`;
  `[vrfy'x']` reads `[CMP-TRUE[[CORE],[TGT]]]`.
- The parser computes `species` (`atom` or `composite`) and `compositionDepth`
  on every command, and `expansions.json` holds `atoms`, `composites` and
  `maxDepth`. `node scripts/glyph-cli.js PROB --expand` answers today:
  `PROB [composite] level 1, formula [ERROR[CTX]]`.

And the emitter drops all of it:

```
[prob'timeout']  →  <problem><user-input>timeout</user-input></problem>
```

`species`, `compositionDepth` and the formula are computed and never serialised.
**This is the `origin` defect exactly** — the engine knows, the document does
not, and the model downstream is left to infer what the engine already decided.
E0 repaired that for the operator; `<invoke>` repairs it for the function.

### 4.2 Shape

`<invoke>` is a **leaf, first child of the element whose call it describes**:

```xml
<problem>
  <invoke reads="[ERROR[CTX]]" species="composite" depth="1"/>
  <user-input>timeout</user-input>
</problem>
```

The precedent is `<mood>`, which is already a first-child leaf carrying a
property of its parent (`XML_REFERENCE.md` §6). Adopting the same shape means:

- the **naming rule survives** — `<problem>` is still the gloss of `PROB`, and
  §2 of the reference is untouched;
- **G1 survives** — `force="editorial"` stays on the named element, since the
  element is not replaced;
- **the inverse survives** — `<invoke>` is derived, carries no authored content,
  and is dropped on the return trip exactly as the engine-authored shapes of
  `<needs>` are (`XML_REFERENCE.md` §5). It is never read back into a bracket;
- **no depth is added to the content tree**, which a wrapping element would cost.

### 4.3 Emitted for composites only

`<invoke>` is emitted where `species="composite"`. An atom is a primitive: its
reading is its own name, and `reads="[CTX]"` inside `<context>` is a tautology
that costs tokens on every element in the document. In the handoff source, 4
commands of roughly 40 are composite, so the cost is bounded and falls exactly
where the information is non-obvious.

`depth` is `compositionDepth` verbatim — `PROB` is 1, `LRN` and `ASSM` are 2.

### 4.4 `<template>` is unchanged

An earlier draft of this section read `<invoke>` as the *template* call and
proposed retiring `expanded="true"`. That was wrong and is withdrawn.
`<template>`, `define`, `expanded`, `means` and every slot rule of
`XML_REFERENCE.md` §5 stay exactly as they are. A template is a macro over
source; a command is a function in the vocabulary. They are different things and
the format keeps them apart.

### 4.5 Divergence from `OPERATOR_TARGET.md`

That document says the root *carries* `<invoke>` and `<chain>`, which reads as
direct children of `<glyph-package>`. Neither is placed there here: both are
placed where they apply — `<chain>` around the run, `<invoke>` inside the call it
describes. A single root-level `<invoke>` has no determinate referent, because a
source has many segments and many top-level commands.

`OPERATOR_TARGET.md` §3.4 is explicit that it *"deliberately stops short"* of
designing the format, so this is read as loose phrasing rather than a competing
constraint. Recorded so the divergence is deliberate rather than silent.

---

## 5. `<schema>`

```xml
<glyph-package engine="2.4.5.01">
  <schema/>
  …
</glyph-package>
```

The element is emitted and is **empty in this release**; the five examples serve
as its base (regent decision S6). It exists as an empty element rather than being
omitted so that a consumer can distinguish *"this document declares no schema"*
from *"this document predates schemas"* — which is the same reason the root
carries `engine`.

Filling it is not in this release and not in this order.

---

## 6. Refusals

A conforming reader rejects the following. **Every refusal carries a position**
(`XML_REFERENCE.md` §11.2), and no refusal is silent — a retired or malformed
construct is named, never absorbed into `<off>`.

| # | Rejected | Code |
|---|---|---|
| 1 | the root is not `<glyph-package>` | `NotAPackage` |
| 2 | the root carries no `engine` attribute | `EngineUnstated` |
| 3 | a `chain` attribute survives on a member of a `<chain>` | `ChainDoubleEncoded` |
| 4 | a `chain` attribute occurs outside a `<chain>` | `ChainUngrouped` |
| 5 | a `<chain>` with no members | `ChainEmpty` |
| 6 | the root has no empty `<schema/>` as its first child | `SchemaMissing` |
| 7 | `<invoke>` that is not the first child of its element | `InvokeMisplaced` |
| 8 | `<invoke>` on an element whose command is an atom | `InvokeOnAtom` |
| 9 | `<invoke reads>` disagreeing with the expansion store for that command | `ReadingUnfaithful` |
| 10 | a `<block>` that is a direct child of the root without `once` | `SegmentUnmarked` |
| 11 | `<mood>` that is not the first child of its `<block>` | `MoodMisplaced` |
| 12 | a text-bearing element whose content was pretty-printed | `TextReflowed` |

`ChainWithoutHead` is **not** in this table, and the omission is deliberate. An
earlier draft listed it, carried over from `XML_REFERENCE.md` §11.3. Writing the
validator proved it undecidable here: §3.2 removes the very attribute it keys on,
so no conforming document can express it and no malformed one can be caught by it.
It is a **reader** refusal — `fromXML` is handed input the emitter never wrote —
and it belongs to `E4`, which decides whether that reader exists at all.

Clause 6 replaces it with the one §5 requires and this table had omitted: `<schema/>`
is mandatory and empty, and nothing checked it.

**Acceptance is a mutation test:** one mutation per clause, and at most one may
escape. Zero catches means the validator is decorative — the standard
`BUNDLE_TARGET.md` §5 sets, and the reason `glyph-check` is written before the
emitter it gates (lock T4).

> The order's `K8` wording says *"break ten things and catch at least nine"*,
> written when the clause list was assumed to be `BUNDLE_TARGET.md` §5's ten.
> This specification has twelve clauses, so the criterion is stated per clause
> rather than by count. Lock T17 forbids rewriting a criterion so the code
> passes — this is the opposite case, a criterion whose count was fixed before
> the clauses existed, and it is flagged rather than quietly widened.

Clause 9 is the one that makes `reads` worth emitting at all: an `<invoke>` whose
formula is not checked against `expansions.json` is decoration, and the document
would carry a second, drifting copy of the composition table — the defect that
produced version 5 of the order.

Refusal 12 is the mechanical face of guarantee G4 (§7) and is the one most easily
lost: it is violated by an emitter that indents, not by a source that is wrong.

---

## 7. The four guarantees

These are **acceptance conditions of the format**. The format is rejected if any
one of them fails to survive — this is not a wish list.

| | Guarantee | How it is checked |
|---|---|---|
| **G1** | editorial force on `ALW BYP OVR NEV FRGT` | the elements keep emitting `force="editorial"` — verified: `[alw'x']` → `<always force="editorial">`. The attribute is carried, not relocated and not dropped |
| **G2** | block segmentation: `once`, the segment separator, `<break/>`, `continues="previous"` | §2 changes the root only; every block rule is carried verbatim |
| **G3** | the `needs` element — *an empty slot does not block* | §4 changes the element that holds slots, never the slot encoding |
| **G4** | exact string fidelity, no pretty-printing inside text nodes | refusal 12; `<user-input>`, `<off>` and `<source>` are emitted by branches this format does not touch |

G3 is the one the external proposal had nowhere to put, and it is the reason
`<invoke>` inherits slot handling unchanged rather than redesigning it.

---

## 8. Round-trip

The AST is the source of truth (regent decision), and the round-trip invariant is
measured against it, not against this document.

Two invariants bind any reader of `glyph-package`, whether E4 delivers a second
reader or declares the inverse dead in writing:

- **No fabrication.** A reader never invents an element the author was not asked
  for. Finding A3 — `fromXML` of `[rtnl-go'X']` re-emitting a `<needs>` that did
  not exist — was a defect because it *invented* rather than lost. A loss can be
  pinned with a reason; an invention cannot.
- **Pinned loss.** What the format cannot carry is recorded with its reason, and
  a pin that outlives its reason fails the suite.

Under §3.2 the operator survives the trip by position, so `extend` and `item`
return distinct and re-emit identically (K2).

---

## 9. Deliberately not specified here

- **The six-layer bundle and its emitters** — a different artefact (T0), and its
  emitters are out of scope by the order.
- **What "production level" means for `_ORBITAL`** — `BUNDLE_TARGET.md` §7 item 4
  says it is ratified by reading, and the reading is not an agent task.
- **The contents of `<schema>`** — §5.
- **A fourth emitted format.** No format enters without a consumer that parses it.

---

## 10. Open

**Q10 is closed.** `<invoke>` is the command call and means *function* to the
model (§4). What remains open from it is narrow and structural, not product:

**Q11 — does `<invoke>` need a precondition deliverable of its own?** `species`,
`compositionDepth` and the formula are computed by the engine and dropped by the
emitter, which is the shape E0 existed to repair for the operator. Emitting
`<invoke>` therefore requires the same kind of carry, and the order currently
commissions no step for it. Architect reading: it is inside E1, because unlike
the operator it needs no lexer change — the store is already loaded and
`--expand` already answers. If that is wrong, it is a second precondition and
the order needs it named.

**Q12 — the order's `K8` says ten mutations and nine catches** (§6). Twelve
clauses exist. Stated per clause here; the order should say so too.

**Q9 — when the six-layer bundle is built, and under what name.** The name is now
free. Blocks nothing here.

---

## 11. Diagnostics are not carried in the document

Writing the golden (E1) proved this section missing. The method predicted it:
*writing the consumer is what proves the producer complete.*

**The document carries no diagnostic content, and never has.** Two paths exist
and neither puts a diagnostic inside the emitted tree:

- a **refusal** reaches the document as `<off>`, holding the characters the
  author typed (`XML_REFERENCE.md` §11.3), and the diagnostic itself travels
  beside it;
- an **advisory rule diagnostic** — a contradiction, a redundancy, a tension —
  reaches the document not at all.

Diagnostics travel in the AST envelope, which is the source of truth and which
`glyph-check` already validates. Putting them in the document as well would be a
second encoding of one fact, which §3.2 rejects for the operator and lock T36
forbids generally.

**This is a claim about the format, not permission to lose them.** A golden blind
to diagnostics would let a regression that silences the contradiction rules pass
unseen, so `golden.json` records the expected diagnostics per case beside the
expected document. E-05 carries four.

### 11.1 Two findings this section is built on

**Finding G1 — `A1` is stale.** The order records *"all five actual xml blocks
match v1.4.4.01 byte for byte, zero diagnostics"*. At 2.4.5.01, E-05 produces
four: `Rule:mand-dont` at `fix`, and `Rule:req-dont`, `Rule:mand-avd`,
`Rule:req-avd` at `ask`. The finding was true when measured and is not true now.

**Finding G2 — rule diagnostics carry no position.** `Rule:*` diagnostics arrive
with `code`, `severity`, `label` and `message`, and **no `at`**, while parse
diagnostics such as `SlashInChain` carry `at: {s, e}`. The order's
`Q2_diagnostic_positions` decision says a refusal with no coordinate is not
verifiable by a reader who does not have the engine. A contradiction rule fires
on two commands and therefore has two positions available to it; emitting none is
a gap, not a property of the rule. Recorded here, out of scope for E1, and named
so E5 cannot rewrite `XML_REFERENCE.md` §11 without meeting it.

> `XML_REFERENCE.md` §11.2 is also internally inconsistent: the heading says
> *"Every refusal carries a position"* while the body says `at` is *"optional and
> additive"*. E5's territory, recorded here so it is not rediscovered.

---

## 12. Status

Nothing here is implemented. It exists so the golden (E1) can be written against
something and so `glyph-check` (E3) has a specification before it has code —
the same role `BUNDLE_TARGET.md` §8 declares for itself, and the same order:
**the gate comes before the topology.**
