# Orders — the contract that dispatches the work

> An Order is neither a plan nor a decision. A decision **authorises**, a plan **schedules**, an Order
> **commissions**: it says what is to be done, under which constraints, and which deliverables come back.
>
> **An open Order is immutable except by version.** New material that arrives while an Order is open
> becomes *intake*, never an amendment. **Two concurrent Orders are forbidden:** exactly one stays open at
> a time.

## Numbering

Per series (the Regent, 2026-09-25, kept on 2026-11-11): an Order lives in
`EMS-###/ORD-####/`, a folder holding the four projections and the manifest that
`--bundle` writes, and the count restarts in each series — the next one is the
largest `ORD-####/` of that series, plus one. A loose Order, emitted in no
series, lives in `NEM/`. No branching by subject, no reusing the number of a
cancelled Order.

```
EMS-###/ORD-####/ORD-####.{pgml,xml,json,hgml,manifest.json}
```

## The open Order

> One, or none. If there are two, one of them is wrong.

It is named in the register of its series: [`EMS-003/README.md`](EMS-003/README.md),
*The open Order*. An Order emitted and waiting its turn sits in the `queued/` folder
of its series, out of the open slot.

## Closed Orders

> They stay. A closed Order is the contract of what was delivered, and it is how "was this asked for this
> way?" gets answered — so it does **not** leave this folder when it closes, unlike what is in
> [`.plan/`](../.plan/).

| series | what it is | the register |
|---|---|---|
| `EMS-001` | the Rust engine behind the app, closed on 2026-11-07 | [`EMS-001/README.md`](EMS-001/README.md) |
| `EMS-002` | Glyph 100% in Rust, open | [`EMS-002/README.md`](EMS-002/README.md) |
| `EMS-003` | the 2D view: a package as icons on a plane, edited by its links; open | [`EMS-003/README.md`](EMS-003/README.md) |
| before the series | `ORD-2026-08-30-01`, the order of August, and the handoffs `HANDOFF-*.pgml` | this folder |
| parked | `ORD-0011`, `restructure-glyph-repo`, carried out by `EMS-002/ORD-0034` | [`parked/restructure-glyph-repo/`](parked/restructure-glyph-repo/ORD-0011.pgml) |

## Intake — what arrived while an Order was open

> Not a queue of ideas: material that **would have amended** an immutable Order. Each line waits to
> become an Order of its own or to enter [`.plan/`](../.plan/).

| | |
|---|---|
| [`INTAKE-2D-VIEW.md`](INTAKE-2D-VIEW.md) | Intake — the 2D view: the measured proposal |
| [`INTAKE-BURN-INVARIANCE.md`](INTAKE-BURN-INVARIANCE.md) | Preliminary intake — is the burn a canonical form? |
| [`INTAKE-EFFECTS.md`](INTAKE-EFFECTS.md) | Preliminary intake — effects |
| [`INTAKE-FIELD-2026-09.md`](INTAKE-FIELD-2026-09.md) | Field intake — the engine used on a client project |
| [`INTAKE-FORMAL-ANALYSIS.md`](INTAKE-FORMAL-ANALYSIS.md) | Formal analysis — intakes A, B and C |
| [`INTAKE-INCLUSION.md`](INTAKE-INCLUSION.md) | Inclusion — a known command never vanishes |
| [`INTAKE-ORDER-COHERENCE.md`](INTAKE-ORDER-COHERENCE.md) | Preliminary intake — coherence between emitted Orders |
| [`INTAKE-PARSER-SPLIT.md`](INTAKE-PARSER-SPLIT.md) | Preliminary intake — splitting `glyph-parser.js` into a directory |
| [`INTAKE-PART.md`](INTAKE-PART.md) | Intake — `[part]`, restored: the measured proposal |
| [`INTAKE-PIN-TRAFFIC.md`](INTAKE-PIN-TRAFFIC.md) | Preliminary intake — PIN, traffic and the EMS the user drives |
| [`INTAKE-RESTRUCTURE.md`](INTAKE-RESTRUCTURE.md) | Intake — the restructure, mapped |
| [`INTAKE-RUST-LADDER.md`](INTAKE-RUST-LADDER.md) | Preliminary intake — the Rust ladder, audited against the engine it ports |
| [`INTAKE-RUST.md`](INTAKE-RUST.md) | Preliminary intake — migrating the engine to Rust |
| [`INTAKE-VARIABLES.md`](INTAKE-VARIABLES.md) | Preliminary intake — variables, and the bracket a literal cannot hold |
| [`INTAKE-VIRTUAL-PATH.md`](INTAKE-VIRTUAL-PATH.md) | Preliminary intake — the computed context (mini-repo) and Virtual Path |
| [`INTAKE-VSCODE-AUTHORING.md`](INTAKE-VSCODE-AUTHORING.md) | VS Code authoring support for Glyph |