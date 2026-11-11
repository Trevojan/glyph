# Intake — the restructure, mapped

> **Nothing moved.** The mapping half of the parked
> [`ORD-0011`](parked/restructure-glyph-repo/ORD-0011.pgml), `restructure-glyph-repo`:
> its `[find]` and `[nt]`, reopened when EMS-001 closed, as the Regent decided on
> 2026-10-15 (*"B now, C when EMS-001 closes"*, [`.decisions/`](../.decisions/README.md)).
> §1 to §3 are measured on 2026-11-07 against `_ORBITAL/Docs/.guidelines/` on the
> Regent's machine, by its folder and file names only. The Regent answered the
> collisions of §4 on 2026-11-11 and ratified the emit of the Order that moves,
> [`EMS-002/ORD-0034`](EMS-002/README.md), the same day; §5 is the map it opens with,
> measured at `3d0ee4d`, and §6 what the map leaves to the Regent before a file moves.

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

## 5. The map

One row group per commit, `git mv` for every move, each broken pointer rewritten
in the commit of the move that broke it. A count is the number of times the name
is written in the tracked files, the attic, the packs and `.virtual/` aside.

### 5.1 What the answers move

| group | current path | target path | by | pointers the move breaks |
|---|---|---|---|---|
| A | the 13 documents of the language at the root of `.guidelines/`: `GLOSSARY.md`, `XML_REFERENCE.md`, `PACKAGE_TARGET.md`, `BUNDLE_TARGET.md`, `OPERATOR_TARGET.md`, `SIGNATURES.md`, `HGML_PLAN.md`, `HGML_CONVERGENCE.md`, `PROMOTION_BOUNDARY.md`, `PROMOTION_MEASUREMENT.md`, `FORMULA_REVIEW.md`, `FUSIONS_WORKSHEET.md`, `DMHP_IMPORTS.md` | `.guidelines/.sources/`, same names | R6 c | 269 mentions in documents and 65 in code, `scripts/build-skill.js` and `scripts/build-templates.js` among them; 56 in the generated skill and plugin, rebuilt by `npm run build`; 63 in the acts, which stay as emitted |
| B | the 8 stores and machine-read files at the same root: `templates.json`, `rules.json`, `expansions.txt`, `expansions.json`, `targets.json`, `ast-schema.json`, `corpus-snapshot.json`, `glyph-grammar.ebnf` | `.guidelines/.sources/`, same names | R6 c | 154 mentions in documents and 189 in code: the core, the CLI, the suite, `glyph-stores/build.rs`, `glyph-vocab/build.rs`, `glyph-cli/src/app.rs` and the VS Code extension; 62 in the generated skill and plugin; 38 in the acts |
| C | the text of [`.orders/README.md`](README.md) | the same file, saying the series rule: `EMS-###/ORD-####/`, the count restarting in each series, the loose ones in `NEM/` | R4 a | none: no path moves. The scaffold regency wrote is its own to fit, in regency |

### 5.2 What the answers keep

| path | by |
|---|---|
| `.decisions/README.md`, one file of dated rounds, and `.constraints/README.md` apart | R3 a |
| `.orders/`, its series, the parked order, the handoffs and the intakes | R4 a; `_ORBITAL` keeps no orders |
| no folder for the role specs | R5 a |
| `.history/` and `.packs/` | `_ORBITAL` has no row for either, and the order forbids inventing one |
| `.shortcuts/` and `.shortcuts/.virtual/` | `_ORBITAL` keeps them dotted itself |

### 5.3 What group B reaches outside the repository

The installed engine reads the stores of the machine, which `--install` wrote from
these paths, and `glyph-cli/src/app.rs` names them. Group B changes where the
repository keeps them, and the path the installed app reads moves or stays by M4.

## 6. What the map leaves to the Regent

R2 b says the inner files follow `_ORBITAL`. Where a Glyph file and an `_ORBITAL`
file answer the same question under two names, the rename is a decision, and no
answer of §4 names it. The session reads `_ORBITAL` by the names of §2 alone.

**M1. The plan's inner files.** `.plan/` holds `README.md`, `PERGUNTAS-ABERTAS.md`
(12 lines in 7 files point at it) and `ladder.toml` (28 lines in 12 files, and
`scripts/ladder.js` reads it). `_ORBITAL` holds `BACKLOG`, `CHECKLIST`, `GRAND_PLAN`,
`LADDER_PLAN_M_1`, `MINIMUM_PLAN`, `PHASES`, `PLANNING`, `README`, `ROADMAP`, `TRACE`.
- a. the three names stay: no `_ORBITAL` file is the same document
- b. `PERGUNTAS-ABERTAS.md` becomes `BACKLOG.md`, and `ladder.toml` stays, being code-read
- c. the Regent names the pairs

**M2. The changelog axis.** `.changelog/README.md` holds the version rule and points at
the root `CHANGELOG.md`; 26 lines in 13 files point into the axis. `_ORBITAL` keeps
`SOURCES/CHANGELOG.md` and no changelog folder.
- a. the axis stays, as the seven axes stand
- b. it becomes `.sources/CHANGELOG.md`, and the folder goes
- c. b, and the root `CHANGELOG.md` moves there too, one record in one place

**M3. The entry.** `_ORBITAL` enters by `AGENTS.md`; Glyph enters by
`.shortcuts/README.md`, which `CLAUDE.md` and `AGENTS.md` point at (15 lines in 13
files). `AGENTS.md` and `CLAUDE.md` are tracked here, and gitignored in `_ORBITAL`.
- a. `.shortcuts/README.md` stays the entry, and the two root files keep pointing
- b. `AGENTS.md` becomes the entry and the index folds into it

**M4. The stores.** Group B is 189 of the 254 mentions in code, and the only group
the installed app feels (§5.3).
- a. the 21 move together, as R6 c reads: groups A and B
- b. the documents move and the 8 machine-read files stay at the root of
  `.guidelines/`: group A alone, and no code path of a store changes
- c. a, with the installed app reading the stores where it reads them today

**M5. The pointers of the acts.** 101 mentions in the 251 files of the acts name a
path group A or B moves, and an act is never rewritten.
- a. they stay dead, and the series register says from which commit
- b. `glyph-vpath` records each old path as an alias of the new one, so an old
  pointer still resolves by `npm run vpath -- resolve`, and the acts stay as emitted

The session recommends **M1 a, M2 a, M3 a, M4 a and M5 b**: the renames of M1 to M3
buy no reader anything the measurements show, R6 c already decided M4, and the index
holds one alias today, so M5 b is a mechanism the repository has.
