# Intake — `[part]`, restored: the measured proposal

> **The proposal [`EMS-002/ORD-0033`](EMS-002/README.md) opens with.** The design is
> the Regent's, given on 2026-10-15 and kept in [`INTAKE-EFFECTS.md`](INTAKE-EFFECTS.md)
> §8.2; this file measures it against the engine and asks what the design leaves to
> decide. The Order builds nothing before the Regent answers §4, as he ratified on
> 2026-09-27 for the pieces that are settled when built. Measured at `5203859`.

## 1. What the engine reads today

| written | read as | emitted |
|---|---|---|
| `[part'sa or bu'[ask'…']]` | `PT`, through the element name of `PT` | `<part n="sa or bu" imperative="true">` |
| `[part'dish-ingredients-core']` | the same | `<part n="dish-ingredients-core"/>` |
| `[part'ph-label_height_0','ph-label_height_1,label_height_2']` | the same | `<part n="ph-label_height_0">`, and the second literal as a child |
| `[item-salt]` | nothing | two `fix` `UnknownCommand`, `item` and `salt` |

`PT` is *"Part, part of. Membership relation of an object within a context."*
([`GLOSSARY.md`](../GLOSSARY.md)), an `instr` atom, and since
[`EMS-002/ORD-0017`](EMS-002/README.md) its operand is the `n` of `<part>`. So every
example of the design parses with no diagnostic, and none means what the design says:
the tier is `instr`, not `struct` beside `BLOCK` and `SECTION`; the label lands in
`n`, and nothing binds it, so no reference resolves to a part.

**What any answer costs.** No declared source of the snapshot, no case of
`conformance/`, no generic of the Regent's in `.scope/` and no Order writes `[pt` or
`[part`. Eight probes of the suite do — RO-06 to RO-09, from `ORD-0017` — with the
oracle lines they write. No hash of the snapshot moves under any answer below.

## 2. Where it was lost

On 2026-09-04 the effects intake measured *"`PART` does not exist"*, a word the Order
Author had written in `glyph-variable-naming-system.pgml`. On 2026-09-05 the table of
[`COMPILER_LESSONS.md`](../.sources/COMPILER_LESSONS.md) §0, the eleven words the
engine refused, marked it *"resolve desde 3.4.7.05 ✅"*: the release that let every
element spelling be read as input had made `[part` an alias of `PT`. The word stopped
failing, so it stopped being looked at, and the meaning the plans gave it was neither
built nor refused. When the source entered the repository on 2026-09-16, it no longer
carried `PART`.

## 3. Observed in the design's example

As written, the example nests `[block'prepare'` inside `[block'ingredients'`: the line
after the first `[part` closes the `[ask` and the `[part`, and not the block. The
second block reads as a sibling only with one more `]` there. The Order's checks take
the sibling reading, unless the Regent says the nesting is meant.

## 4. The questions

**P1. One command or two?**
- a. **one**: `[part]` is `PT`, and `PT` becomes what the design says, a `struct` that
  slices a block, its gloss rewritten in `GLOSSARY.md`. No one writes the membership
  relation today (§1), and one command keeps one element, `<part>`
- b. **two**: a new structural `PART`, and `PT` stays the membership relation. Both
  glosses say *Part*, so the new one needs another element name, and `[part` stops
  reading as `PT`

**P2. What the first literal is.**
- a. **the part's name**, as on a block or a section: `name` and `binds`, so a reference
  resolves to it and the `<schema>` can declare it, as the decision of 2026-10-15 on
  the `<schema>` lists parts beside sections and blocks. This retires the `n` of
  `<part>` that the Regent signed on 2026-09-27 (`ORD-0017`)
- b. **the `n` the Regent signed**, read as the label, with nothing binding it
- c. **`n` for a number, `name` for anything else**

**P3. The second literal of `[part'ph-label_height_0','ph-label_height_1,label_height_2']`.**
- a. the labels below the part, comma-separated in one literal: one literal required,
  one optional
- b. one literal per level: `[part'h0','h1','h2']`
- c. one literal only; a deeper level is a part nested inside this one

**P4. A part outside a block.** The design says a block holds its parts.
- a. it emits as written, and asks which block it slices (`ask`, a `<needs>`)
- b. it emits as written, with a `note`
- c. anywhere is fine, and nothing is said

**P5. The label as a pointer.** `[part'pantry-item-salt']` points through the item
naming scheme, `root-x` and `x-item-##`, decided on 2026-10-15 and not built (the first
order of the effects).
- a. this Order carries the label as written, and resolving it waits for the Order that
  builds the item scheme, together with `[item-…]`
- b. this Order builds the item scheme too: the `xml` hashes move, and it grows

**The session's recommendation:** P1 a, P2 a, P3 a, P4 a, P5 a. They keep one word for
one thing, make a part declarable and referable like the structures it lives among,
leave nothing to vanish, and keep this Order small. P2 a reverses a signed reading, so
it is the Regent's alone.
