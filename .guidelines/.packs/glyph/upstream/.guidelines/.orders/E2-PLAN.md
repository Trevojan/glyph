# E2 — what the rederivation actually is

> Order `ORD-2026-08-30-01` v7, deliverable E2: *the 173 vectors rederived against
> the new format, thirteen buckets.* Measured before writing. Nothing applied yet.

## 0. The headline

**Two fragments change. Both are in `P-06`.** Everything else in the eight vector
arrays survives the format change untouched.

```
vectors read from the const arrays   102
assertions on the emitted document    71
survive unchanged                     69
need rederivation                      2   ← both in P-06
```

This agrees with a measurement taken independently and by another method:
`OPERATOR_TARGET.md` §7.1 recorded *"vectors whose assertions fail: 1 — P-06"*.
Two routes, one answer.

## 1. Why so little changes

The corpus asserts with **substring containment**, not document equality. The
runner builds the document and asks `indexOf` per fragment. So `S2` (the root) and
`S5` (`<schema/>`) — which touch every document without exception — move nothing,
because no fragment reaches the root line. Only a fragment that *contains* what the
delta rewrites can break, and in practice that means a fragment carrying a `chain`
attribute.

That is a property of the suite worth knowing: it is loosely coupled to document
shape by design, and that is why a format change of this size costs two lines.

## 2. Method, and why it is not derivation from an implementation

Lock T5 forbids deriving the golden from an implementation. The same discipline
governs here, and is met like this:

1. **The golden was derived by hand first** (E1), from `PACKAGE_TARGET.md` and the
   five examples, with no emitter in existence.
2. A **document-to-document migration** was then written from the specification —
   not an emitter; it maps an old document to the one the specification defines.
3. **Its fidelity is proven, not asserted:** it reproduces all five hand-derived
   `package` documents **byte for byte**. Agreement between a hand reading and a
   mechanical reading of the same specification is evidence both read it right.
4. Only then was it applied to the corpus.

An emitter (E3b) is still forbidden until `glyph-check` exists (lock T3). This
transform is not it and does not preempt it.

## 3. The change

### P-06 — `scripts/test-corpus.js:50`

```js
xml:["<review>", "<improve chain=\"extend\"/>", "<format chain=\"extend\"/>"]
```

becomes

```js
xml:["<review>", "<chain>", "<improve/>", "<format/>"]
```

`<review>` is untouched: it is the head of the construct, not a member of the run.
`improve` and `format` are consecutive siblings both carrying `chain="extend"`, so
under §3 they are **two runs of one**, each wrapped, each losing its attribute.

> Confirm before applying: whether `improve` and `format` are one run or two. §3.1
> says a run starts at `extend` and continues through `item`. A second `extend`
> **opens a new run** rather than continuing the first. Two `<chain>` elements,
> not one. The fragment list above is order-sensitive but not adjacency-sensitive,
> so it holds either way — but the emitter (E3b) must get it right, and the
> specification should say so outright.

### D-4-07 — `scripts/test-corpus.js:963`

Not in a const array, so not covered by the sweep above; derived by hand, and it
is **the only forward vector in the corpus exercising a chain of more than one
member**.

```js
expect: x => /<instruction>\s*<rework chain="extend"\/>\s*<context chain="item"\/>\s*<\/instruction>/.test(x)
```

becomes

```js
expect: x => /<instruction>\s*<chain>\s*<rework\/>\s*<context\/>\s*<\/chain>\s*<\/instruction>/.test(x)
```

Kept as a regex, in the form it is written in.

## 4. The buckets the sweep does not reach, and what each needs

| Bucket | Asserts on XML | Verdict |
|---|---|---|
| `C` `K` `H` | 0 | diagnostics and `.hgml` only. Nothing to do. |
| `I` `R` `L` `N` `T` `P` | 71 | swept above. Two fragments change. |
| `D` | 1 | `D-4-07`, by hand, §3 above. |
| `GS` | 1 | `GS-03` is a self-relative equality — both sides move together. Nothing to do. |
| `F` | 17 | **not E2.** `fromXML` takes a document as *input*; what its input becomes is `E4`, which decides whether a second reader exists at all. |
| `RT` | 5 | **not E2.** The round-trip invariant moved to the AST, which this format does not touch. |
| `X` | 4 | vocabulary and store consistency. Re-check after E3b; no expectation to rewrite now. |
| `SN` | 1 | the snapshot pins a hash of every projection. Every `xml` hash changes. **Regenerate after E3b**, never before — regenerating now would pin the old emitter. |

## 5. What E2 does not close

`K1` — *the five examples emit the expected glyph-package byte for byte* — is a
**shape** check over a narrow slice. Measured: the five examples cover none of
multi-member chain, mood, `<break/>`, `continues`, `<off>`, template, `<logic>`,
`<needs>`, `<unresolved>`, or a multi-segment document, and carry **zero**
`origin="item"`.

So `K1` cannot reach **G2** (block segmentation) or **G3** (`<needs>`), two of the
four named guarantees. Their coverage lives in `K4`, the vectors. The two criteria
are not redundant and neither substitutes for the other, and the order does not
say so. It should.

## 6. Order of application

1. `P-06`, two fragments — after settling the one-run-or-two question in §3.
2. `D-4-07`, one regex.
3. Nothing else until `E3b` exists.
4. `SN` regenerated **after** `E3b`, as its own step.
