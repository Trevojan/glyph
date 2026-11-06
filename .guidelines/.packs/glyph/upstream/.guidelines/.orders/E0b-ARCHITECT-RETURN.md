# E0b — Architect return

> Order `ORD-2026-08-30-01` v4 · deliverable E0b, the glyph-package specification
> Sub-agent: suba-architect · Topology: Development · Engine 2.4.5.01

## STATUS

**BLOCKED.**

Not on effort, and not on missing environment. On one word that names two
different artefacts in two documents this order treats as normative, with no
third source to break the tie.

---

## The finding

`glyph-package` has two incompatible referents in the repository.

**Reading A — an emitted document shape.** `OPERATOR_TARGET.md:267`:

> The later deliverable replaces the output shape with `<glyph-package>` carrying
> `<invoke>` and `<chain>`.

and `:674`:

> The `<glyph-package>` / `<chain>` output shape is a later deliverable.

Under A, `glyph-package` is a root element succeeding `<glyph>` — one document,
emitted per source, the thing `buildXml` produces.

**Reading B — a set of files.** `scripts/glyph-check.js:20`:

> The bundle mode that **BUNDLE_TARGET §5** specifies is NOT here. It validates a
> `glyph-package` bundle, and that format has no specification yet.

`BUNDLE_TARGET.md` §0 defines that bundle as:

> a set of files, each with a different consumer, generated from one Glyph source

Under B, `glyph-package` is the six-layer agent bundle — L0 identity through L5
gate — a directory whose files are consumed by the model, the sandbox, the
Harness, the validator and CI respectively.

**There is no third occurrence.** `<invoke>` and `<chain>` appear nowhere but
those two lines of `OPERATOR_TARGET.md` — not in the engine, not in the corpus,
not in the five examples, not in `ast-schema.json`.

---

## Why it blocks rather than resolves

The two readings do not produce variants of one specification. They produce
different documents with different consumers, different validators and different
goldens:

| | Reading A — document | Reading B — bundle |
|---|---|---|
| **E1 golden** | expected XML per source | expected file tree per source |
| **E3 glyph-check** | element and attribute grammar | BUNDLE_TARGET §5, the ten rejections |
| **five examples** | already the vectors: input → XML | not vectors at all; no example declares a layer |
| **four guarantees** | properties of the emitter, directly checkable | properties of one file inside the tree |
| **§3.4 chain grouping** | load-bearing: the whole point of E0 | irrelevant to a file tree |

Writing the specification under the wrong reading does not produce a document
that needs revision. It produces one with the wrong consumer, and E1 and E3
inherit the error, which is the failure the order names in lock T34.

---

## What the evidence leans toward, and why that is not enough

Reading A has the stronger circumstantial case:

- the **five examples are input→XML pairs**, and lock T4 makes the golden derive
  from them; under B they are not vectors of the format at all;
- the **four guarantees** are, in the order's own words, *"properties of
  operators, of the emitter and of the engine"* — all document properties;
- **E0 exists to make `chain` representable**, and `OPERATOR_TARGET.md` §3.4
  states its only purpose is projection into `<chain>` under the new shape. Under
  B, E0 is a precondition of nothing;
- the order's `consumer_map` and `blast_radius` are measured over emitted
  documents.

Reading B has one thing A does not: **the code says it.** `glyph-check.js` is the
gate, it was written before the thing it gates, and it names BUNDLE_TARGET §5 as
what its missing mode implements. Under the order's own method — *the gate is
written before the thing it gates* — the gate's stated intent is not weak
evidence.

An architect may resolve a structural fork. This is not one: it is which product
the format is. §11 routes that back, and here the Regent is the authority.

---

## ARCHITECTURE — what is settled under either reading

These survive the fork and are not re-decided later:

1. **The specification is normative and is not derived from the emitter.** T4 and
   T31. The golden derives from the specification and the examples.
2. **The four guarantees are acceptance conditions of the format**, not wishes:
   editorial force on `ALW BYP OVR NEV FRGT`; block-once and the segment
   separator; the `needs` element; exact string fidelity with no pretty-printing
   inside text nodes.
3. **`chain` is an attribute, and grouping is derivable from attribute plus
   sibling order alone** — no re-parse, no source access (`OPERATOR_TARGET.md`
   §3.4). This holds whether the group lands in a `<chain>` element or a layer file.
4. **The schema element stays empty this release**, the five examples serving as
   its base (regent decision S6).
5. **The validator precedes the emitter**, and acceptance is a mutation test:
   break ten things in the golden, catch at least nine (BUNDLE_TARGET §5).
6. **No self-attested gate** (I3), and **no format without a consumer that parses
   it**.

## INVARIANTS the implementation must preserve

- `I-round-trip`: the AST is the source of truth; what the format loses must be
  pinned with a reason, and a pin that outlives its reason fails the suite.
- `I-no-fabrication`: the inverse never invents an element that the author was
  not asked for. A3 was a defect precisely because it invented rather than lost.
- `I-recogniser`: a retired construct is refused by name with a position, never
  deleted into silence.

## OPEN QUESTIONS

**Q7 — which artefact is `glyph-package`?** The blocking one. Everything above is
ready the moment it is answered.

**Q8 — if Reading A: does `<glyph-package>` replace `<glyph>` as the root for
every emission, or only where a `<chain>` or `<invoke>` occurs?** A conditional
root makes every consumer branch on shape. Architect recommendation: replace
unconditionally, version the root, and let the empty case be the degenerate one.

**Q9 — if Reading B: what emits the layer files?** The order puts "the six layer
bundle emitters" explicitly *out of scope*, so under B, E1's golden would be the
expected output of something this order forbids building.

> Q9 is itself an argument for Reading A: under B, the order contradicts its own
> scope line. Under A it does not.

## PARENT ACTION

Return to DV. One decision unblocks E0b, E1 and E3; nothing else in the order is
waiting on this. By the order's own rule, answering it produces **v5**.
