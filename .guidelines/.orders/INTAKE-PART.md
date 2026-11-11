# Intake — `[part]`, restored: the measured proposal

> **The proposal [`EMS-002/ORD-0033`](EMS-002/README.md) opened with.** The design is
> the Regent's, given on 2026-10-15 and kept in [`INTAKE-EFFECTS.md`](INTAKE-EFFECTS.md)
> §8.2; this file measures it against the engine and asks what the design leaves to
> decide. The Regent answered §4 on 2026-11-11, §5 holds the answers, and §6 what the
> Order built from them. §1 to §3 are measured at `5203859`, before the Order.

## 1. What the engine reads today

| written | read as | emitted |
|---|---|---|
| `[part'sa or bu'[ask'…']]` | `PT`, through the element name of `PT` | `<part n="sa or bu" imperative="true">` |
| `[part'dish-ingredients-core']` | the same | `<part n="dish-ingredients-core"/>` |
| `[part'ph-label_height_0','ph-label_height_1,label_height_2']` | the same | `<part n="ph-label_height_0">`, and the second literal as a child |
| `[item-salt]` | nothing | two `fix` `UnknownCommand`, `item` and `salt` |

`PT` is *"Part, part of. Membership relation of an object within a context."*
([`GLOSSARY.md`](../.sources/GLOSSARY.md)), an `instr` atom, and since
[`EMS-002/ORD-0017`](EMS-002/README.md) its operand is the `n` of `<part>`. So every
example of the design parses with no diagnostic, and none means what the design says:
the tier is `instr`, not `struct` beside `BLOCK` and `SECTION`; the label lands in
`n`, and nothing binds it, so no reference resolves to a part.

**What any answer costs.** No declared source of the snapshot, no case of
`conformance/`, no generic of the Regent's in `.scope/` and no Order writes `[pt` or
`[part`. Eight probes of the suite do — RO-06 to RO-09, from `ORD-0017` — with the
oracle lines they write. No `xml` and no `hgml` hash of the snapshot moves under any
answer below; P1 a rewrites the gloss of `PT`, which moves the checksum of the
expansions store, and every `ast` envelope carries it.

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

## 5. The Regent's answers

Given on 2026-11-11 ([`.decisions/`](../.decisions/README.md)): **P1 a, P2 a, P3 b,
P4 a, P5 a**, and the example of §3 reads as sibling blocks.

| | what the Order builds |
|---|---|
| P1 a | one command: `PT` is the `struct` that slices a block, its gloss rewritten in `GLOSSARY.md` |
| P2 a | the first literal is the part's name, `name` and `binds`; the `n` of `<part>` signed on 2026-09-27 retires |
| P3 b | one literal per level, `[part'h0','h1','h2']` |
| P4 a | a part outside a block emits as written and asks which block it slices: `ask`, a `<needs>` |
| P5 a | the label travels as written; resolving it waits for the Order that builds the item scheme |

The session had recommended P3 a, the labels comma-separated in one literal.

## 6. What the Order built

Closed on 2026-11-11, at `4a0cde4` (the vocabulary and the JS) and `59af450` (the
Rust, byte for byte); the row is in the [series register](EMS-002/README.md).

| written | read as | emitted |
|---|---|---|
| `[block'b'[part'core'[ask'…']]]` | `PT`, a `struct` | `<part name="core" binds="core">` inside `<block name="b">` |
| `[block'b'[part'h0','h1','h2']]` | the name, then one level per literal | `<part name="h0">` holding `<user-input>h1</user-input>` and `<user-input>h2</user-input>` |
| `[part'dish-cutlery']`, no `[block` around it | as written, and `ask` `PartOutsideBlock` | `<part name="dish-cutlery">` holding `<needs>the block it slices</needs>` |
| `[block'b'[part[ask'…']]]` | `fix` `MissingStructName` | `<part>` with no `name` |
| `<part n="1.1"/>`, an older document | `fromXML` | `[pt'1.1']` |

Four readings are the session's, where the answers of §5 did not reach, and each
waits for the Regent in [`.decisions/`](../.decisions/README.md):

| | the reading |
|---|---|
| the levels past the name | each travels as a `<user-input>` child of the `<part>`, in the order written, since P5 a keeps the label as written until the item scheme resolves it |
| what holds a part | a `[block` command anywhere above it; a `[section` alone does not, and neither does the segment wrapper |
| a part with no name | `fix`, as on a block and a section: `PT` joins `NAMED_STRUCT` |
| the palette, and the older `n` | `PT` sits in the *Frame* category, beside `SECTION` and `BLOCK`; `fromXML` reads the `n` of an older `<part>` back as a literal |
