# Intake — several open Orders, and the three categories

> **Not an order.** Two rules the Regent set on 2026-11-22
> ([`.decisions/`](../.decisions/README.md)), measured against the working tree of that day,
> engine 4.7.10.09, so the session can propose how they are kept. It closes in numbered
> questions with measured options.

## 1. The two rules

**Several open Orders.** *"the convention rule of only one ORD open at a time must be
revisited. a better strategy is to work on how many ORDs are possible as long as no blocking
questions are met."*

**Three categories.** *"the NEM's and EMS's Orders must be separated in 3 categories for
better adoption of sudden changes ("open" -> ORD is open and being worked on; "closed" -> the
ORD is treated as finished and won't be worked on; "rework" -> this ORD is in the queue as a
correction to an already closed Order; the same categories apply to Emissions)."*

The `-Repair-` menu the Regent drew the same day moves an EMS or a loose ORD among them,
`∙ Move to category` ([`.ux/explorer/`](../.ux/explorer/README.md)).

## 2. What is there today

| | |
|---|---|
| Orders | 61: `EMS-001` 14, `EMS-002` 40, `EMS-003` 5 at its top and 1 in `queued/`, and the flat `ORD-0011` in `parked/` |
| where "open" lives | the section *A Ordem aberta* of each series register; empty in all three |
| where "closed" lives | the table *Ordens fechadas* of each register, and the `--track` of each spec |
| two states no rule names | `queued/` — emitted, waiting for its turn (`EMS-003/ORD-0006`, waiting for steps 2, 3 and 11 of the trail); `parked/` — set aside (`ORD-0011`, the restructure, its work done by `EMS-002/ORD-0034`) |
| rework | none by that name; a correction to a closed Order has been a new Order — `EMS-002/ORD-0035` fixed what `EMS-003/ORD-0001` set aside — or a new version of a queued one, `EMS-003/ORD-0006` version 3 |
| Emissions | `EMS-001` closed on 2026-11-07; `EMS-002` and `EMS-003` open; the state is written in each register and in the shortcuts index, nowhere a program reads it |
| the one-open rule, stated | [`.constraints/`](../.constraints/README.md), [`.orders/README.md`](README.md), [`GLOSSARY.md`](../.sources/GLOSSARY.md) §8 (**ORD**), `CLAUDE.md`, the shortcuts index, the `.plan` and the spec of `EMS-003`; no program enforces it |
| the count of a series | `--bundle`, in both engines, numbers a series from the `ORD-####/` at its top only. **A defect today:** with `queued/ORD-0002` beside `ORD-0001`, it writes a second `ORD-0002`, seen on 2026-11-22 in a scratch folder; `EMS-003`'s next bundle would write a second `ORD-0006` |
| what a folder per category would move | 672 mentions of a path `EMS-00#/ORD-####` in 76 files, generated copies and the index cache left out; the acts among them stay as emitted, and the path index keeps an old path as an alias, as `EMS-002/ORD-0034` left the moved sources |

## 3. Several open Orders — what the old rule also did

The constraint reads *"an open order is immutable save by version, and two concurrent orders
are forbidden — which is why new material becomes an intake"*. It did three things: it kept
an open Order fixed, it sent what arrived meanwhile to an intake, and it kept two Orders off
the same files.

**OR-1. What the new rule keeps.**
- a. an open Order stays immutable save by version, and what arrives while it is open is still an intake; only the count of open Orders goes, bounded by the blocking questions
- b. the count goes and so does the intake rule: what arrives may enter an open Order that has not started

**OR-2. Two open Orders on the same files.**
- a. allowed: each Order is its own commit in the cycle, and the second rebuilds on the first
- b. refused: an Order declares the paths it writes, the traffic's write half of the `EMS.json`, and two open Orders may not share one

**OR-3. A blocking question.** The rule holds Orders open "as long as no blocking questions
are met".
- a. a question only the Regent can answer that changes what the Order builds; an Order behind one stays out of *open* until it is answered
- b. any open question named in the Order's intake

## 4. The three categories

**ST-1. How an Order's category is kept.**
- a. a folder per category inside the series and inside `NEM/`: `open/`, `rework/`, and the closed Orders where they are, at the top; closing an Order moves it up, as `EMS-003/ORD-0005` moved up from `queued/` on 2026-11-21; no closed Order and no mention moves
- b. a folder for each of the three, the closed Orders moved into `closed/`: 59 bundles and the mentions of §2
- c. no folder: the category is written in the series register and the spec, which a program would then parse

**ST-2. What `queued/` and `parked/` become.**
- a. `queued/` is *open* — emitted, in the queue, its blocker named in the register — and `parked/` is *closed*, set aside and not worked on
- b. both stay, as two states beside the three
- c. `queued/` is *rework* when it corrects a closed Order and *open* otherwise; `parked/` stays

**ST-3. What makes an Order rework.**
- a. where it is bundled, `rework/`, and `glyph --check` refuses a rework Order whose claim does not replace a closed Order of its series — `override`, `instead-of` or `deprecated`, CO-4 of [`INTAKE-ORDER-COHERENCE.md`](INTAKE-ORDER-COHERENCE.md) §13
- b. its claim alone: an Order that replaces a closed Order is rework wherever it lies

**ST-4. An Emission's category.**
- a. a field of its `EMS.json`, `state`, one of the three, required by `ems-schema.json`; no series folder moves, and `glyph --check` reads it
- b. a folder per category under `.orders/`: every path of §2 moves
- c. the register and the shortcuts index, as today

**ST-5. The count of a series.**
- a. both engines number a series from every category it holds, `queued/` included while it exists, which ends the defect of §2; the JS first, the oracle holding the Rust to it
- b. the Rust only, as bundling into a series moves to the Rust binary (CO-2), the JS left with the defect until it leaves

**The session's recommendation:** OR-1 a, OR-2 a, OR-3 a, ST-1 a, ST-2 a, ST-3 a, ST-4 a, ST-5 a.
- **OR-1 a** drops only what the Regent named, the count.
- **OR-2 a** is what the cycle's commits already do: one commit per Order, each green.
- **OR-3 a** makes "blocking" a fact the Regent's answer settles, not a judgement.
- **ST-1 a** moves nothing that exists and grows the one precedent the series has, `queued/`.
- **ST-2 a** fits what is there into the three without a fourth.
- **ST-3 a** gives rework a place and holds the place to the claim, so neither is the only source.
- **ST-4 a** puts the state where the check already reads a series, and moves no path.
- **ST-5 a** fixes a defect both engines carry today, while the JS still bundles.
