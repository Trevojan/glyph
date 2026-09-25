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
| layout | **in progress** — the spec lives at [`EMS-001.pgml`](EMS-001.pgml) and every pointer names that path; `--bundle`, the plugin and the bundle command do not read the series yet |
| queue | waits for the layout to bank |

## ORDs closed

None.

## Open, and why

- **The layout**, the gate of the series: the spec is in its folder; the bundle,
  the plugin and the bundle command learn the series next, one bank each.

## Measured

- **Pointers to the spec: seven, not five.** The five the handoff names, and two
  in `INTAKE-RUST-LADDER.md` that named the spec by its draft ID, `ORD-0012` —
  inside the series that ID is the Rust CLI. They name the spec of EMS-001, and
  the window as its ORD-0014.
- **`HANDOFF-2026-09-24.xml` was the exact projection of its source**, so it is
  re-emitted in the commit that rewrites the source.

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
| 1 | this commit | layout 1/5 — the spec moves into its series, the pointers follow | 2026-09-25 | — |
