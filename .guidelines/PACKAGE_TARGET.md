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

### 3.4 What is not a chain

Consecutive siblings that carry no `chain` attribute are not a run and are not
wrapped. A `chain="item"` with no `chain="extend"` before it is malformed (§6,
`ChainWithoutHead`) — the item operator is defined only as a continuation.

---

## 4. `<invoke>`

> **Architect inference, not a delivered decision.** `OPERATOR_TARGET.md` names
> `<invoke>` as a child of the root and defines it nowhere; there is no other
> occurrence in the repository. §8 records this as Q10. What follows is the
> reading with a structural argument behind it; knock it down and the order
> becomes v6.

Today `<template>` answers two independent questions with one element name:

```xml
<template name="codefix" define="true">   <!-- this is a definition -->
<template name="codefix" expanded="true"> <!-- this is a call -->
```

A reader must inspect an attribute to learn which kind of thing it is holding.
That is the `chainElement` defect in another place, and the release has already
paid to remove it once.

**Therefore:** the call becomes `<invoke>`, the definition keeps `<template>`.

```xml
<template name="codefix">
  <requirement>…<needs slot="target">what to fix</needs>…</requirement>
</template>

<invoke name="codefix" means="…">
  <requirement>…<user-input slot="target">the login handler</user-input>…</requirement>
</invoke>
```

- `define="true"` and `expanded="true"` both disappear; the element name carries
  what they carried.
- `means` stays on `<invoke>` only, because only a call has one — and it is
  **optional**, because only a *registered* template expands. Verified:
  `[--insight'the billing bug']` emits `expanded="true"` and `means`, while a
  template defined locally with `[--name=…]` and called in the same source emits
  neither. An `<invoke>` without `means` is a call the engine could not expand,
  which is a legitimate document and not a refusal.
- Slot binding is unchanged: an unbound hole is `<needs slot="name">` carrying
  its question, a bound one is `<user-input slot="name">` carrying the answer,
  and that attribute is still what lets the inverse rebuild the call
  (`XML_REFERENCE.md` §5).
- The three shapes of `<needs>` and their read-back rules are unchanged.

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
| 6 | a `<chain>` whose first member came from an item operator | `ChainWithoutHead` |
| 7 | `<invoke>` carrying `define`, or `<template>` carrying `means` | `InvocationConfused` |
| 8 | a `<block>` that is a direct child of the root without `once` | `SegmentUnmarked` |
| 9 | `<mood>` that is not the first child of its `<block>` | `MoodMisplaced` |
| 10 | a text-bearing element whose content was pretty-printed | `TextReflowed` |

**Acceptance is a mutation test.** Break ten things in the golden and catch at
least nine. Zero catches means the validator is decorative — the standard
`BUNDLE_TARGET.md` §5 sets, and the reason `glyph-check` is written before the
emitter it gates (lock T4).

Refusal 10 is the mechanical face of guarantee G4 (§7) and is the one most easily
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
| **G4** | exact string fidelity, no pretty-printing inside text nodes | refusal 10; `<user-input>`, `<off>` and `<source>` are emitted by branches this format does not touch |

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

**Q10 — is `<invoke>` the template call?** §4 is an architect inference with a
structural argument, not a delivered decision. The alternative readings are that
`<invoke>` denotes a tool call, or an agent invocation belonging to the bundle
rather than to this document. Knocking §4 down changes §4 and refusal 7, and
nothing else in this specification.

**Q9 — when the six-layer bundle is built, and under what name.** The name is now
free. Blocks nothing here.

---

## 11. Status

Nothing here is implemented. It exists so the golden (E1) can be written against
something and so `glyph-check` (E3) has a specification before it has code —
the same role `BUNDLE_TARGET.md` §8 declares for itself, and the same order:
**the gate comes before the topology.**
