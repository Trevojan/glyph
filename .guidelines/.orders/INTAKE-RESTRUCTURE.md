# Intake — the restructure, mapped

> **Not an order, and nothing moved.** The mapping half of the parked
> [`ORD-0011`](parked/restructure-glyph-repo/ORD-0011.pgml), `restructure-glyph-repo`:
> its `[find]` and `[nt]`, reopened when EMS-001 closed, as the Regent decided on
> 2026-10-15 (*"B now, C when EMS-001 closes"*, [`.decisions/`](../.decisions/README.md)).
> Measured on 2026-11-07 against `_ORBITAL/Docs/.guidelines/` on this machine, by its
> folder and file names only. The collisions in §4 are closed questions with no answer;
> the order's `[conf]` is the Regent's.

## 1. The premise, measured

The order, written on 2026-09-24, takes *"the folder structure of _ORBITAL"* as the
target. Regency's `library/layouts.md` §2 names two layouts today: the **dotted** one,
*"current Regent standard"*, and the **classic Orbital**. Glyph holds the dotted one,
seven axes and the attic. `_ORBITAL` holds the classic one, with its `.shortcuts/`
already dotted. The map from Glyph to `_ORBITAL` therefore moves this project from the
current standard to the classic one, and that is the first question (R1).

## 2. The two layouts, side by side

| concept | Glyph, `.guidelines/` | `_ORBITAL`, `Docs/.guidelines/` |
|---|---|---|
| entry | `.shortcuts/README.md` | `AGENTS.md`; `.shortcuts/.virtual/` holds only the ledger and the journal |
| plan | `.plan/`: `README.md`, `PERGUNTAS-ABERTAS.md`, `ladder.toml` | `PLAN/`: `BACKLOG`, `CHECKLIST`, `GRAND_PLAN`, `LADDER_PLAN_M_1`, `MINIMUM_PLAN`, `PHASES`, `PLANNING`, `README`, `ROADMAP`, `TRACE` |
| decisions | `.decisions/README.md`, one file of dated rounds | `DECISIONS/`: `ARCHITECTURE`, `BUSINESS_RULES`, `DECISIONS`, `DEPENDENCIES`, `TESTS` |
| prohibitions | `.constraints/README.md` | inside `DECISIONS/` |
| facts | `.sources/`: `COMPILER_LESSONS`, `VIRTUAL_PATHS`, `VIRTUAL_PATHS_CONVERSATION` | `SOURCES/`: `API_SURFACE`, `BRIEFING`, `CHANGELOG`, `DATA_MODEL`, `README`, `WORKFLOW.txt` |
| changelog | `.changelog/README.md`, pointing at the root `CHANGELOG.md` | `SOURCES/CHANGELOG.md` |
| orders | `.orders/`: the series `EMS-###/ORD-####/`, the parked order, the handoffs and the intakes | none; `flow.*`, `inspection.pgml` and `production_level_flow.xml` sit at the root |
| team | none: the plugin's role specs answer, `layouts.md` §3 | `TEAM/`: `TEAM`, `ORCHESTRATION`, `PO`, `DV`, `QA`, `DA` |
| attic | `.history/` | none |
| the language | 21 documents and stores at the root: `GLOSSARY.md`, `XML_REFERENCE.md`, `PACKAGE_TARGET.md`, `templates.json`, `rules.json`, `expansions.txt` and the rest | none |
| packs | `.packs/glyph/` | none |

## 3. What the order asked to find

### 3.1 Files git does not track

The four the order names — `.claude-plugin`, `commands`, `scripts/glyph-plugin.js` and
`.scope/oriented/ORD-0010` — are tracked. What git does not track is the working tree of
the round in progress and the per-machine state `.gitignore` names
(`.claude/settings.local.json`, and `.shortcuts/.virtual/` but for the index, the
ledger and its README). Nothing of it maps.

### 3.2 What the ladder asks that the repository already holds

Recorded in [`ladder.toml`](../.plan/ladder.toml), whose statuses follow the disk since
2026-11-07: M01 and M02b are done, and each crate the EMS-001 built is started, its
line naming the ORD that built it. `conformance/`, `glyph-grammar.ebnf`, the
measurements of `INTAKE-RUST.md`, `.sources/COMPILER_LESSONS.md` and the thirteen
modules of `scripts/core/` are where the order expected them.

### 3.3 The rows the order would have placed

`.scope/corpus-ledger/` is not on this machine. What the audit read of it, it read from
`~/Downloads/corpus-ledger/` (the header of
[`INTAKE-RUST-LADDER.md`](INTAKE-RUST-LADDER.md)) and folded into `.plan/ladder.toml`
and that intake. The EMS-001 spec revoked, on 2026-09-24, the rows that would place
`plan/ladder.toml`, `scripts/ladder.py` and `scripts/audit_corpus.py` into the axes,
the ladder as the plan, and the limit *zero dependencies*; those rows are not mapped.

### 3.4 What a move breaks

Counted over the tracked files on 2026-11-07, the attic, the packs and `.virtual/` aside:

| pointing into | files | lines |
|---|---|---|
| `.orders/` | 40 | 178 |
| `.decisions/` | 27 | 76 |
| `.plan/` | 27 | 56 |
| `.shortcuts/` | 14 | 29 |
| `.history/` | 22 | 27 |
| `.constraints/` | 14 | 26 |
| `.changelog/` | 12 | 24 |
| `.sources/` | 9 | 11 |
| the 21 root documents of the language | — | 318 file mentions |

Three of them are code: `glyph-vpath` writes its index under `.shortcuts/.virtual/`, and
`link-graph.js` reads it; nine scripts and tests read `templates.json`, `rules.json` and
`expansions.json` by path. And **214 of the 241 files of the acts** — the closed ORDs,
the parked order and the handoffs — point into an axis, 262 lines. Acts are never
rewritten, so a move leaves those pointers dead for good.

### 3.5 What already lives in two places

| fact | the copies | which stays |
|---|---|---|
| the whole repository as it stood on 2026-10-31 | `.packs/glyph/upstream/`, the pack regency adopted, and the repository | the repository: the deposit is the pack's, the project's walkers skip it, and the entry index's own check reads its lines as copies |
| the release record | the root `CHANGELOG.md` and `.changelog/README.md` | the root file; the axis points at it by design |
| the D1 of `HGML_PLAN.md` | the `note` of `package.json` | `HGML_PLAN.md`; the note is a pending entry of [`.plan`](../.plan/README.md) |

## 4. The collisions, as closed questions

Each option is one a measurement above supports. The Regent answered the six on
2026-11-11 ([`.decisions/`](../.decisions/README.md)): **R1 b, R2 b, R3 a, R4 a, R5 a,
R6 c**. The target is the classic Orbital with the dot kept before each folder name —
a naming exception, the inner files following `_ORBITAL`; decisions stay in one file of
dated rounds; the numbering stays per series, and regency is updated to fit it; and the
language documents move into the facts axis.

**R1. Which layout is the target?**
- a. the dotted one, which Glyph holds and regency calls the current standard: the map
  is empty, and the order ends by its own `[fin]`, the Regent refusing the map
- b. the classic Orbital, as the order wrote: every axis moves, and §3.4 is the cost,
  262 lines of acts included
- c. axis by axis: the Regent names which move

**R2. The dot before the name** (only with R1 b or c).
- a. uppercase folders, as `_ORBITAL`
- b. the dot stays, and only the inner files follow `_ORBITAL`, which keeps `.shortcuts/`
  dotted itself

**R3. Decisions in one file or in five.**
- a. one file of dated rounds, and `.constraints/` apart, as today
- b. the five of `DECISIONS/`, the rounds split by kind, and the prohibitions inside them
- c. the five, with `.constraints/` kept apart

**R4. The numbering of the Orders.** Glyph counts per series, the count restarting in
each `EMS-###/` (decided on 2026-09-25), with the loose ones in `.orders/NEM/`; the
[`.orders/README.md`](README.md) regency scaffolded says *"flat and sequential, like an
ADR"*; `_ORBITAL` keeps no orders. The id scheme the order knew as `I_B1` is settled by
the series layout.
- a. the series rule stays, and the axis README says it
- b. flat numbering across the series
- c. the README stays as regency wrote it

**R5. A home for the role specs.**
- a. none, as today: the plugin's answer
- b. the project's own, as `_ORBITAL` keeps them, under the name R2 gives

**R6. Where the language lives.** Neither layout has a row for the 21 documents and
stores at the root, and moving them breaks the 318 mentions of §3.4 and the paths nine
scripts read.
- a. the root of `.guidelines/`, as today
- b. the norms, `GLOSSARY.md` and the `*_TARGET.md` among them, into the decisions axis
- c. into the facts axis
