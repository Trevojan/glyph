# EMS-001 — the return of the first cloud session

> What the session that heard [`HANDOFF-2026-09-24.pgml`](../HANDOFF-2026-09-24.pgml)
> built, what it matched, and what waits for the Regent. Branch
> `claude/laughing-archimedes-3pf0wa`. Every bank commit carries this file
> current; the commit that carries it is the last row of the log at the foot.

## Where the session is

| section | state |
|---|---|
| environment | node v22.22.2, cargo 1.94.1 — both present, nothing installed |
| ground | read in the order the handoff names; `npm run check` (33 buckets, 41 s) and `npm run check:rust` (20 crates, 3 s) green on the clone at `ea8fc59`, before anything was touched |
| layout | **in progress, 3 of 5 banked** — the spec lives at [`EMS-001.pgml`](EMS-001.pgml); `--bundle` reads an ID only as `ORD-####` followed by nothing or a dot, in every destination, and with `--out` a folder `EMS-###` it writes the folder `ORD-####/` numbered by the ORD folders of that series alone. The plugin and the bundle command do not read the series yet |
| queue | waits for the layout to bank |

## ORDs closed

None.

## Open, and why

- **The layout**, the gate of the series: the plugin learns the series, then
  the bundle command and the series README, one bank each.

## Measured

- **Pointers to the spec: seven, not five.** The five the handoff names, and two
  in `INTAKE-RUST-LADDER.md` that named the spec by its draft ID, `ORD-0012` —
  inside the series that ID is the Rust CLI. They name the spec of EMS-001, and
  the window as its ORD-0014.
- **`HANDOFF-2026-09-24.xml` was the exact projection of its source**, so it is
  re-emitted in the commit that rewrites the source.
- **The dated ID, reproduced before the fix:** `ZP-06` put
  `ORD-2026-08-30-01.pgml` beside `ORD-0001.zip` and `ORD-0002.zip` and the
  bundle wrote `ORD-2027.zip`. It writes `ORD-0003.zip`. The row leaves
  [`.plan`](../../.plan/README.md) §3, which holds its three older defects.
- **A series counts folders, not files.** Beside the spec, a draft
  `ORD-0007.pgml` and a folder `ORD-2026-08-30-01/`, the old bundle wrote
  `ORD-0008.zip`; it writes `ORD-0001/`, then `ORD-0002/`, and a second series
  starts again at `ORD-0001/`. The folder holds the five files the zip holds,
  and the three projections are byte-equal to the zip's for the same source.
- **An ORD folder is written beside itself and renamed** (`.ORD-####.<pid>`,
  which no count reads), so a write that fails midway leaves no half ORD to be
  counted as emitted; the failure says which folder and exits 2.

## Questions for the Regent

Closed questions, none answered.

1. **Does an ORD of a series also travel as a `.zip`?**
   - a. the folder alone
   - b. the folder, with the zip inside it beside the five files
   - c. the folder, and the zip only behind a flag

## The session, measured

| # | commit | step | UTC | checks |
|---|---|---|---|---|
| 0 | `ea8fc59` | the clone | 2026-09-25 00:57 | `check` 41 s and `check:rust` 3 s, green |
| 1 | `0588ada` | layout 1/5 — the spec moves into its series, the pointers follow | 01:03 | green |
| 2 | `bf0d687` | layout 2/5 — an ID is `ORD-####` followed by nothing or a dot | 01:08 | `ZP-06` red first (`ORD-2027.zip`), green after the regex |
| 3 | this commit | layout 3/5 — `--bundle` writes the series folder | 2026-09-25 | `ZP-07`–`ZP-10` red first (`ORD-0008.zip` in the series), green after |
