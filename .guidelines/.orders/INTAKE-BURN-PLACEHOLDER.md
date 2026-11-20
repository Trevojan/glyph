# Intake — a placeholder's name, through the burn

> **The measured proposal for issue #12** and the [`.plan`](../.plan/README.md) §3 row
> *o nome de um placeholder queima como comando*. The Regent answered §5 on 2026-11-20,
> and §6 holds the answers. The Order opens with them once the open slot is free
> (`EMS-003/ORD-0001` holds it). Measured at `1e58eef`, engine 4.7.10.08, with an
> experimental patch applied to `scripts/core/burn.js` and taken back out; nothing of it
> is committed.

## 1. The defect

`` [ph-x`q`] `` burns as

```
[ph
  [x[/x]
  'q'
[/ph]
```

and the reread says `[fix] UnknownCommand — [x fora do vocabulário`. The Rust binary gives
the same bytes and the same diagnostic. The hole's name has become a command.

**Where it happens.** The parser marks the name as `slotName` (`scripts/core/parser.js:178`:
the bare word straight after the `-` that touches `[ph`). `burnList`
(`scripts/core/burn.js`) keeps only `canonical`, `children` and `subject` for anything that
is not a composite, so the flag dies there, and `hgmlLines` writes the name as any atom,
`[x[/x]`, on a line of its own. A word on a line of its own after `[ph` is not touched by a
`-`, so the reread reads a command. `burn_list` and `hgml_lines` in
`rust/crates/glyph-burn/src/lib.rs` do the same: `Burnt::Atom` has no field to carry the
flag.

## 2. The form that rereads

The head line carries the name, as the source writes it:

```
[ph-x
  'q'
[/ph]
```

Measured in both engines: `[ph-x↵ 'q'↵[/ph]`, `[ph-x 'q' [/ph]` and `[ph-x[/ph]` reread as
`[ph-x`q`]` and `[ph-x]` do: the same `<needs slot="x">`, the same `PlaceholderPending`, no
`fix`. The closed form is untouched (every tag still opens without `]` and closes with
`[/name]`). Only the head line of a `[ph` changes. The name is written **as written** (§5 B2).

## 3. Measured — what the fix moves

**The snapshot.** With the patch, `npm run check` fails one check, `SN-04`, with *"3 hgml —
only the burn moved"*: `T-03`, `T-04` and `OC-10`. Their XML and AST are byte-identical
across the whole oracle; only these three burns change, each by one line per hole:

| source | hgml digest today | the burn's change |
|---|---|---|
| `T-03` `[--germinate[ph-criterio'clareza']]` | `7cbdb0d3a9f69288` | `[ph`↵`[alvo[/alvo]` → `[ph-alvo` |
| `T-04` `[--germinate]` | `e5473fa34387f91a` | the same for `alvo` and for `criterio` |
| `OC-10` `` [--reinforce[ctx],`interprete`] `` | `f1cb5dd5c28cf8fa` | the same for `why` |

**Every burn of the oracle, reread.** 116 of the 119 declared sources have a burn. Rereading
each with the repository's stores, and counting the `fix` codes the reread carries that the
source's own diagnostics do not:

| | burns that reread with no new `fix` | the rest |
|---|---|---|
| today | 111 of 116 | `T-03`, `T-04`, `OC-10` (`UnknownCommand`); `OC-12`, `R-04` |
| with the fix | **114 of 116** | `OC-12`, `R-04` |

`OC-12` and `R-04` are other defects, outside this proposal (§4).

**The Orders the issue is about.** The `UnknownCommand` count on the reread of the burn,
JS and Rust alike (the two engines give the same count on every file):

| source | `[ph-` | today | with the fix |
|---|---|---|---|
| `.scope/generics/handoff-generic.pgml` | 13 | 13 | 0 |
| `.scope/generics/production.pgml` | 16 | 9 | 0 |
| `.scope/generics/resume-generic.pgml` | 4 | 4 | 0 |
| `.scope/oriented/ORD-0010.pgml` | 12 | 3 | 0 |
| `.scope/generics/order-generic.pgml` | 9 | 1 | 0 |
| `.scope/generics/germinate-glyph-package.pgml`, `EMS-001.pgml`, `EMS-002.pgml`, `parked/…/ORD-0011.pgml` | 11, 30, 70, 2 | 0 | 0 |

After the fix, the only `fix` left on any of these rereads is the `MissingStructName` that
`production.pgml` already carries in its own source (the fork's copy, issue #6). The named
`<needs slot>` set of every source survives into its reread.

## 4. What this leaves alone

- **`OC-12` and `R-04`.** `[raw] never closed` burns as `[raw[/raw]` and rereads with
  `UnknownCommand`. `[logic-dano]…[/logic]` burns as `[logic-dano[/logic]` and rereads
  with `UnclosedLogic`. These are two more burns that do not reread clean, with different
  causes: the raw fence and the logic block, not the placeholder.
- **The `ask`s on a reread.** A burnt formula rereads with `UnfilledSlot` and numbered
  `<needs slot="1">`. For example, `[crit'y']` rereads with three `<needs>what it refers
  to</needs>`. This is already true today, with or without a placeholder. The burn parses a
  formula with valency off, and the reread parses it with valency on. Whether a reread
  should ask is its own question.
- **A chain after the name.** `[ph-a-crit]` keeps `crit` as a link, and the burn writes its
  formula as the hole's operands, as it does for every chain. Here the reread loses no
  name: `<needs slot="a">` survives.

## 5. What the Order would decide

**B1. Which engine.**
- **a.** Both engines, in one Order. The three `hgml` digests of §3 move in the snapshot,
  and the oracle moves with them. `rust/testkit/known` gains nothing.
- **b.** Rust only, with the JS left as it is until it exits. This is the precedent of
  `EMS-002/ORD-0019` to `0021`: the snapshot stays, and `rust/testkit/known` names the three
  differences.

**B2. How the name is spelt.**
- **a.** As written. The XML's `slot` keeps the author's case, so `[ph-MyName'q']` burns as
  `[ph-MyName` and rereads as `<needs slot="MyName">`.
- **b.** Lowercase, as every hieroglyph is written. `[ph-myname` rereads as
  `<needs slot="myname">`, so the name the XML carries changes on the reread (measured).

**B3. Which digit.** The `.hgml` changes form, while the XML, the AST and the grammar do
not (§3).
- **a.** `minor`.
- **b.** `release`, if the burn counts as *o documento emitido* in the
  [`.changelog`](../.changelog/README.md) table.

**B4. The pin.**
- **a.** Pin the reread in the suite, two ways:
  - an `H` case where `` [ph-x`q`] `` rereads with no `fix` and the same `<needs slot>`;
  - a count, as `H-09` pins its composites: every declared burn rereads with no `fix` its
    source lacks, 114 of 116, with `KNOWN = ["OC-12", "R-04"]`. A burn that breaks moves
    the count.
- **b.** The `H` case only.

**The session's recommendation:** B1 a, B2 a, B3 a, B4 a.
- **B1 a.** The skill and the plugin run the JS engine. Under b, every
  `/glyph-markup:hgml` an author runs keeps the defect until the JS exits. The change is
  small in both: one flag carried, one head line written. In the Rust, `Burnt::Atom` gains
  the name, and `hgml_lines` writes it.
- **B2 a.** The burn should not change what the XML says. Under b, `slot` changes on the
  reread.
- **B3 a.** Nothing a reader of the XML or the envelope sees moves.
- **B4 a.** The defect lived because the reread was checked on 32 composites and never on
  the corpus. The count closes that gap, and names `OC-12` and `R-04` while they remain.

## 6. The answers — 2026-11-20

In [`.decisions/`](../.decisions/README.md), round of 2026-11-20.

| | answer | what the Order builds |
|---|---|---|
| B1 | both engines, one Order | `burn.js` and `glyph-burn`; the three `hgml` digests of §3 move, and `rust/testkit/known` gains nothing |
| B2 | all lowercase, any case accepted | the engine writes a hole's name lowercase, in the burn and in the XML `slot`, and reads it in any case. `[ph-MyName'q']` emits `<needs slot="myname">` and burns as `[ph-myname`. The template binding already reads `[ph-CRITERIO` as `criterio`. No declared source and no Order source has an uppercase hole name, so no digest moves beyond §3 |
| B3 | `minor`, worked out by each issue | the Order counts its own move when it closes |
| B4 | a | an `H` case for `` [ph-x`q`] ``, and the count over every declared burn, 114 of 116, `KNOWN = ["OC-12", "R-04"]` |

**Size.** Measured, the change is one flag carried and one head line written in each
engine, seven lines in the JS patch of §3. Around it sit the two `H` cases, the snapshot
update, the regenerated skill and the plugin. That is days of work, not weeks.
