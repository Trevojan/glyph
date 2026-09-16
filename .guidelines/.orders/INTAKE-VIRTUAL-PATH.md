# Preliminary intake — the computed context (mini-repo) and Virtual Path

> **Not an order, and not an implementation.** The Regent brought five things
> for study — a sequence diagram, a Virtual Path specification, a critique
> signed "Gepeto", a conversation with "Cláudio", and `ORD0010linkedin.zip` —
> and stated the goal they serve. This is the evaluation against what exists,
> **including three measurements against the repository's own git history**,
> with the decision thresholds declared and stamped before any number was
> produced. It proposes; it does not ratify. Everything in it that is vocabulary
> or scope is the Regent's.
>
> Engine 3.4.7.05. Repository at `49c392a`, 101 commits, 2026-08-10 →
> 2026-09-06. Measured 2026-09-11.
>
> Formal treatment — structures, costs, invariants — in `INTAKE-FORMAL-ANALYSIS.md` §3–§4.

## 1. The goal, as the Regent states it

**Reduce the round-trip of reading context.** The engine maintains a
**mini-repo** — a materialised, optimised version of the context: the emitted
Orders plus the standardised `.guidelines/` — and the harness and the model
consume that, in XML or JSON, instead of re-reading and re-processing raw files
every time. The premise underneath: **Glyph reads and tracks `.guidelines/`**,
as part of what the engine already does.

## 2. The cost model — corrected by Cláudio, and adopted

`grep` is not expensive in tokens. It is expensive in **round-trips**: each
call is a decision point where the model must judge "did I find enough?". An
index does not save bytes; it saves **decisions**. The metric is therefore
*round-trips to the first correct edit*, and it is instrumentable — but **not
from git**. Nothing in this document measures it. §7 says what git *can*
answer and §12 says how the round-trip question would have to be asked.

`grep` also has a property an index lacks: **it self-corrects.** A renamed
heading makes a Virtual Path return empty *silently*, and the harness proceeds
believing it read the constraint; `grep` finds the text regardless. So the
index is primary, search is the audited fallback, and an index-miss **emits an
explicit signal**. This is the repository's own constraint — *nothing
disappears in silence* — applied to the read path, and it is not negotiable.

## 3. "Glyph reads and tracks `.guidelines/`" — already true, three times

| what reads `.guidelines/` today | reads | emits | gate |
|---|---|---|---|
| `build-templates.js` | `rules.json`, `templates.json`, `expansions.txt`, `GLOSSARY.md` | `glyph-data.js`, `expansions.json` | `--check`: rebuild in memory, compare, fail on drift |
| `build-skill.js` | `XML_REFERENCE.md`, the engine, the conformance examples | `.claude/skills/glyph-markup/` — self-contained, for the harness | same `--check` — *"a skill has to be self-contained … so it must carry content, not references"* |
| `glyph-cli.js --bundle` | one `.pgml` | four projections plus a manifest | — |

The skill **is a mini-repo**: the repository read, computed into a form one
consumer loads whole, stamped, refused when stale. The proposal is the same
artefact for a second reader. **Natural extension**, not scope change.

## 4. Who triggers the recompute — the build gate

`npm run check` runs both `--check`s before the DAG and the suite. With the
process constraint — *one step per commit, `npm run check` green on each* — a
generated artefact **cannot be committed stale**. Staleness is a commit-time
failure. No watcher, no daemon, nothing executing. Gepeto's event is the commit.

## 5. XML or JSON

No document in the repository records a measurement of one against the other.
What is measured, on `ORD-0010`: `.xml` 10,637 bytes; `.json` (the AST
envelope, an inspection panel, verbose by design) 81,108 — **7.6×**. A JSON
designed for the harness would be tighter; the one the engine emits today is
not. The 59% is `describe` — XML-plain against XML-self-describing — and it is
the round-trip-reduction knob with its price attached, not a JSON comparison.

## 6. Thresholds — declared before measuring

Stamped `2026-09-11T14:18:25Z` at `49c392a`, file `thresholds.md`, sha256
`f0609dd5dcc2…`, before `measure.js` ran. Reproduced here verbatim in intent.

**Universe.** 101 commits, chronological. *Code* = `*.js`. *Doc* = `*.md`
except `CHANGELOG.md` and the `CHANGELIST` files (a log co-changes with
everything by design). Files by **basename**, because every file moved at
least once.

**M1 — staleness base rate.** For each commit touching code: *co-updated* if
it also touches a doc; *lagged* if not, and a doc-only commit follows within
k=3; *unpaired* otherwise (reported, never folded — history cannot tell "no
update needed" from "still stale"). Rate = lagged / (co-updated + lagged).
**< 10 %** → machinery detects an event that does not happen; stop. **≥ 25 %**
→ justified in principle. **10–25 %** → M2 decides.

**M2 — edit locality.** For each doc edit where the file pre-existed with ≥ 5
lines: (added + deleted) / lines before. Distribution, never the mean.
**Median < 20 %** → anchors buy scope. **> 50 %** → anchors are dead metadata.

**M3 — co-change coupling.** For each (code, doc) pair: support = commits
touching both; lift = P(both) / (P(code)·P(doc)). **≥ 1 pair with lift > 2 and
support ≥ 3** → an empirical code→doc coupling exists to index.

## 7. Measured

### M1 — 23.4 %. Ambiguous band, 1.6 points under the bar.

73 of 101 commits touch code. Co-updated 36, lagged 11, unpaired 26.

The 11 lagged commits are real staleness-then-repair events, not artefacts —
*"the module system moves to ESM"* lands, `PACKAGE_TARGET.md` catches up three
commits later; *"E7: the artefact speaks one language"* lands,
`PROMOTION_BOUNDARY.md` and `XML_REFERENCE.md` two commits later. The event
the fingerprint layer would detect **does happen** here.

**The number is fragile to the window** and this is reported, not resolved by
re-picking the window: k=1 → 10.0 %, k=2 → 18.2 %, **k=3 → 23.4 %**, k=5 →
34.5 %, k=8 → 37.9 %. The declared k was 3; 23.4 % is the verdict. It did not
clear the 25 % bar set for "justified", and it is far above the 10 % bar for
"stop". By the declared rule, **M2 decides.**

The 26 unpaired — 36 % of code commits — are the honest unknown. Some are
refactors and test-only changes that needed no doc; some may be stale to this
day. Git cannot separate them.

### M2 — median 8 %. Decisively local, and bimodal.

122 samples. Quartiles: q1 3 %, **median 8 %**, q3 48 %, max 237 %. **68 %** of
doc edits touch under a fifth of the file; **24 %** are wholesale rewrites
above half. A section anchor holds across roughly two edits in three and is
dead in one in four — the rewrites are the language migration and the
`.guidelines/` reorganisation, both of this period.

**Verdict for the ambiguous M1: anchors buy scope. The problem exists.**

### M3 — 35 pairs raw; **3 real** after two confounds are removed.

The raw graph was dominated by `glyph-data.js`, which is generated and
rebuilt in most commits, and by six mass commits (> 15 files: the moves and
renames) in which unrelated files co-changed by being carried together.
Excluding both — a **post-hoc** refinement of the graph, not of the threshold,
which was met either way — leaves:

| pair | lift | support | what it is |
|---|---|---|---|
| `glyph-cli.js ↔ README.md` | 10.56 | 3 | the CLI's modes are documented in the README |
| `glyph-ui.js ↔ SKILL.md` | 3.65 | 3 | version bumps touch both |
| `glyph-parser.js ↔ GLOSSARY.md` | 2.26 | 6 | the engine derives from the glossary |

A fourth, `glyph-parser.js ↔ EXAMPLES.md`, is `build-skill.js` output and
belongs with `glyph-data.js`.

**The finding that matters:** two of the three couplings the history can find
are **already gated**. `parser ↔ GLOSSARY` is `X-01` and `X-14` in the suite;
`ui ↔ SKILL` is `build-skill.js --check` on the version stamp. The one
coupling with **no gate** is `glyph-cli.js ↔ README.md` — *measured:* the README
names eight CLI modes and nothing checks them against `glyph-cli.js`. That is
the whole of the staleness surface the history can locate that is not already
covered.

## 8. What the measurements decide — and the round-trip baseline

**The fingerprint / staleness machinery is sized for a problem this repository
has at the scale of one file pair** (§7): staleness happens, anchors would
hold, but the coupling graph has three edges and two are gated.

**The round-trip goal is a different question, and git cannot answer it.** It
is answered by the harness's own transcripts — thirteen sessions on this
repository, all before any mini-repo existed, sitting in
`~/.claude/projects/…/*.jsonl`. That is the baseline, and it has been counted.

### 8.1 Protocol — declared before counting

Stamped `2026-09-11T15:56:10Z`, `rt-protocol.md`, sha256 `a0ea5c9fc1e9…`.

- **Context-acquisition call (CAC)**: `Read`, `Grep`, `Glob`, or a `Bash`
  whose command is read-only (`cat head tail ls find grep wc git log|show|diff|status`).
  Each is a decision point — *"did I find enough?"* — which is Cláudio's cost
  model (§2). `Bash` that runs or writes, `Edit`, `Write` are not CACs.
- **RTFE** — round-trips to first edit: CACs before the first `Edit`/`Write`.
  A **proxy** for round-trips to first *correct* edit; correctness is not in
  a transcript, and the proxy is named as one.
- **Re-read rate** — of all `Read`s in a session, the share whose path was
  already `Read` earlier in that session. **The purest signal the mini-repo
  promises to remove**: a context loaded once is not read twice.
- Sessions with fewer than five tool calls excluded. This session — the one
  that designed the mini-repo — excluded from the baseline and reported apart,
  because it is the confounder Cláudio named.

**Baseline thresholds:** median re-read `< 10 %` → nothing to eliminate, stop;
`≥ 25 %` → a real recurring cost; between → median RTFE `≥ 8` decides.

**Comparison thresholds, for when a mini-repo exists:** `K ≥ 8` sessions per
arm, **interleaved** (A B A B), matched task class, tasks not discussed in this
conversation. Justified if median RTFE drops `≥ 30 %` **and** re-read rate
drops `≥ 50 %`; not justified below a `15 %` RTFE drop; between → re-read
decides.

### 8.2 Measured — eleven sessions

| | median | aggregate |
|---|---|---|
| tool calls per session | 161 | 1,985 |
| CAC share | 24 % | — |
| **RTFE** | **17** | — |
| `Read`s per session | 13 | 166 |
| **re-read rate** | **38 %** | **77 of 166 — 46 %** |

Four of the eleven sessions re-read above 50 %; two edit-heavy sessions re-read
nothing. This session, apart: 40 `Read`s, 14 re-reads, 35 % — consistent with
the baseline it is excluded from.

**Verdict: `≥ 25 %`, decisively.** Nearly half of all file reads in real work on
this repository re-read something already read in the same session. The
problem the mini-repo targets exists, is measured, and is not borderline.

**Where the re-reads land** (`rt-files.js`, same 11 sessions): all 77 fall on
five files, and **69 of them are windowed reads (`offset`/`limit`) of two
files too large for one `Read`** — `glyph-parser.js` (49; 3 569 lines today)
and the retired `glyph-engine-alias.html` (22). No `.guidelines/*.md` was read
twice in any session. So the baseline's 38 % measures **file size**, not
forgotten context: the model re-reads because it cannot hold the file, not
because it lost what it held. Two consequences. The mini-repo's promise —
`.guidelines` loaded once — addresses **zero** of the measured re-reads; a
comparison arm would have to show a gain the baseline does not predict. And
the cheapest reduction of the measured cost is not a feature at all: it is the
size of `glyph-parser.js`, which the granulation into `/scripts` left whole.

### 8.3 What it does not say

It does not say the mini-repo *would* reduce it — that is the comparison arm,
which needs the mini-repo to exist and the interleaved protocol above. It does
not say the re-reads were wasteful: some are the model re-checking a file it
edited, which a mini-repo would not and should not prevent. And it says
nothing about correctness. What it says is that the *quantity* the mini-repo
promises to reduce is large enough to measure a reduction against, with the
thresholds fixed in advance.

## 9. Ownership inversion — evaluated

Cláudio's proposal: the *document* declares its sources in its own frontmatter
(`sources: [src/A.js#@block:api-surface]`), and the code→doc index falls out
by mechanical inversion. Docs are few, are the thing that rots, and are the
natural owner of their own claim.

Against this repository: **no `.md` under `.guidelines/` has frontmatter.**
The convention would be new. And the empirical graph it would seed is the three
edges above, two already gated. The proposal is sound where documentation is
plentiful and code is the moving part; here the ratio is inverted — 34 docs,
one engine file — and the couplings are few enough to gate by hand, which is
what the repository has been doing.

## 10. Virtual Path — nine holes, held as backlog

Only if external files (`.md`, `.json`, `.ts` outside the engine) ever enter
scope. Recorded so the design does not repeat them:

1. `#` for heading and `#@` for block collide; the discriminator is the file
   extension, not the delimiter.
2. `$.theme.colors` is JSONPath; JSON Pointer is `/theme/colors` and resolves
   to exactly one node. The two are different grammars.
3. No assembly rule for multi-match.
4. No heading-slug normalisation.
5. No explicit block-end marker for `@block`.
6. **No failure contract** — an empty slice returned silently is the worst
   failure mode. The fingerprint in the manifest is the contract.
7. No write contract — resolving reads; writing back needs offsets, not text.
8. Reloads the same file once per path instead of grouping by file.
9. The injected slice loses provenance — it must arrive prefixed with its own
   Virtual Path.

## 11. What survives of Gepeto

The **materialised view** is the mini-repo; the **fingerprint** is the one
piece that would be central if the mini-repo were built; **stable identity**
is `binds` for a `.pgml` and the heading for a `.md`; **offsets** already sit
on every node. Order maintenance, ropes, FM-index and the event-driven
pipeline are out — the first three by size (34 files, 292 KB), the last by
substitution with the build gate.

## 12. The smallest verifiable step, and what it is not

| step | touches | kind | closes |
|---|---|---|---|
| a `--check` that the README's documented CLI modes match `glyph-cli.js` | `check-globals.js` or a sibling | ~20 lines, engine | the one ungated coupling M3 found |
| ~~a baseline of round-trips~~ **captured** — 11 sessions, median re-read 38 %, §8.2 | — | done | the confounder in §8 is now excluded by protocol |
| — then, if the baseline says reading is the bottleneck — the mini-repo, path **A** (heading-tree wrap, fingerprinted, one more `SOURCES` entry under the existing `--check`) | the build | ~40 lines | the round-trip goal, measurably |

Path **B** (a Markdown model in the engine) and path **C** (guidelines in
`.pgml`) remain the Regent's, and neither is justified by anything measured.

## 13. The ChatGPT proposal — sized against the repository

A sixth input, weighed as an opinion. It scales the design well past anything
above: `.shortcuts` as a compiled layer (semantic graph plus binary index),
SAT/SMT validation of the rule set, a lattice of authority, Datalog as the
internal relational language, succinct bit-packed storage. The same filter
applies — the repository's real size — and three of its claims were checked
against the repository rather than argued. *Measured 2026-09-11 at `49c392a`:*

| | |
|---|---|
| internal link graph, `.guidelines/` + `README` + `CLAUDE.md` | 36 documents, **45 edges, 0 broken** |
| `Reachable(.shortcuts, k)` | k=1 → 13 docs, **k=2 → 17, k=3 → 17**; the 21 unreachable are `.history/` and `.orders/` — the archive, by design |
| `.decisions/` | 26 rows, columns `data · decisão · quem · razão` — **the author is already recorded** |
| `.shortcuts` "where am I" | version matches the engine; the suite figure is hand-typed in a unit nothing else uses, and **no gate compares it** |

### Survives the size filter

**"The AI decides less", not "reads less".** The same reformulation as §2,
sharper. Adopted there already.

**`Reachable(context, current, k)` — as a check on `.shortcuts`, not as an
index.** The principle *"only the previous, current and next step need
deciphering"* is already the entry file's stated purpose, and the graph
confirms it does that: one hop reaches the live corpus, the archive is
correctly out of reach, and the frontier closes at k=2. What the
formalisation adds is **verifiability**: a gate that every non-archive
document sits within k=2 of `.shortcuts`, and that every link resolves. ~30
lines, zero dependencies, one more `--check`. Passes today; would have caught
a rename mid-way through the last release.

**The G-gates — as names for what `--check` already does, plus one.** "Every
node unique, every reference resolves, no stale reference" is `--check` on
generated files, `X-01`/`X-14` on vocabulary, `dag.js` on composition, the
build gate on definitions. Naming them as properties costs nothing. The one
gate the list adds that does not exist is **link resolution** — the same 30
lines as above.

**The authority invariant — as a one-line predicate, not a lattice.** *"An
agent does not ratify a norm it wrote"* is already a constraint and
`.decisions/` already records `quem`. The check is: for every row, the
ratifier is the Regent. Two principals form a chain, not a lattice; the word
adds structure the data does not have. The predicate is worth running because
the column exists to be read.

**`.shortcuts` compiled — as the `build-skill.js` pattern applied to the
index.** The entry file is hand-maintained and *"points, never copies"*, yet
it states a version, a suite size and a last milestone — facts that live
elsewhere. *Measured:* the version happens to match; the suite figure is in a
unit nothing derives. Generating "where am I" from `package.json`, the suite's
own count and the changelog head, under `--check`, is what the repository
already does for the skill and for exactly the same reason. **Semantic graph,
yes — it is the 45-edge link graph above. Binary index, no** — the harness
reads Markdown, and 45 edges do not need packing.

**Euler-tour `tin`/`tout` — correct, and unmotivated.** It answers "is B under
A?" in O(1) after O(n) preprocessing, replacing a parent-walk. *Measured:* the
engine's ancestor check (`checkRules`, "one is an ancestor of the other") walks
`parent` with a 32-hop guard, and `LIMITS.nesting` warns at depth 10; an
Order's tree is tens of nodes. The technique is ten lines and harmless, and
there is no measured path where the walk it replaces costs anything. It does
not apply to `atomsOf`/`burn`, which expand a DAG, not a tree. Recorded so it
is not re-proposed as new; not built, because nothing asks for it.

### Solution looking for a problem

**SAT/SMT for rule contradiction.** *Measured:* `rules.json` holds 25 pair
rules, 1 order rule, 3 preconditions, 6 non-rules. Consistency of that set is
an enumeration over 35 entries. Contradiction *detection in a document* is
already pairwise over the tree. What a solver would buy — search over an
exponential space — has no space here to search. The one genuinely
interesting inference, deriving `rmbr-frgt` from the formulas
`[ALW[GET[CTX]]]` / `[NEV[GET[CTX]]]` (same operand, opposite quantifier), is
pattern matching over the composition table, twenty lines, and was noted in
`GLOSSARY.md` §5 as the strongest argument for the table. It is not
satisfiability.

**Datalog as the internal language.** The relational queries the engine runs
— class membership, transitive atom closure, vocabulary-against-glossary — are
set operations over at most 120 items with recursion depth ≤ 6. `atomsOf` is
fifteen lines. Datalog buys recursive queries over large relations, and under
*zero dependencies* it would have to be written, which is a project. Nothing
measured is relational at a size that needs a language.

**Succinct / bit-packed structures.** *Measured:* `.guidelines/` is 292 KB
of Markdown; the vocabulary is 120 entries; the largest artefact the engine
emits is an 81 KB JSON. All of it fits in a processor cache. Succinct
structures exist to hold gigabytes in memory at a rank/select cost. Three
orders of magnitude, in the same direction as Gepeto's `N = 10⁶`.

### What this adds to §12

One row, and it is the cheapest in the table:

| step | touches | kind | closes |
|---|---|---|---|
| a `--check` over the link graph: every internal link resolves; every non-archive document is within k=2 of `.shortcuts`; `.decisions/` ratifier is the Regent on every row | a sibling of `check-globals.js` | ~40 lines | three of the ten G-gates that are not already gated, on data that already exists |

## 14. Effect on `HGML_PLAN.md` and `HGML_CONVERGENCE.md`

Reinforced, untouched. The burn is vocabulary; the mini-repo is data.

## 15. Timing — the Regent's counterpoint, and the split it forces

The Regent changes the unit of analysis: *"even though Glyph does not hold much
today, applying it to a very complex and long problem-situation may make this
feature necessary."* The engine is general-purpose; `Unlucky-Tide` and
`Herança` are situations outside this repository. So §7 measured the need of
**this repository**, which is small, and the question that remains is one of
**investment timing**, not technical merit: design now while small and calm,
or defer until a real large situation demands it and risk building for a
scenario that never arrives, or arrives differently.

The honest answer is asymmetric, because the architecture is not one thing.
Part of it is **independent of size** and part of it **is size**, and the cut
between them is exactly where the repository already cuts — *the gate comes
before the thing it guards* (`.constraints/`), `PACKAGE_TARGET.md` as norm
before emitter, and `INTAKE-EFFECTS.md`'s *"the cheap half waits; the expensive
half is second order — measure before design."*

### Design now — the contract. A winning bet.

These are **correctness properties**, and correctness does not change with N.
Designing them at 30 documents produces the same page as designing them at
30,000, and pins the invariants before any implementation can violate them.
Cost: a normative page in the `PACKAGE_TARGET.md` style, one conformance
example authored by the Regent.

| contract | what it fixes | size-dependent? |
|---|---|---|
| **reference syntax** | how a `.pgml` names a slice — the Regent's vocabulary decision | no |
| **resolution record** in the manifest: `{ ref, kind, target, selector, fingerprint, granularity, resolvedAt, engine }` | what a consumer needs to know whether what it holds is still what was pointed at | no |
| **failure contract**: an empty or missing resolution is `<needs ref="…">` at `ask`, never an empty slice | Cláudio's worst failure mode, and *nothing disappears in silence* applied to the read path | no |
| **provenance**: an injected slice carries its own reference | so the model knows where a paragraph came from and can say so | no |
| **the nine holes** (§10) closed in the spec | extension discriminates format, Pointer not JSONPath, slug normalisation, block-end marker, multi-match rule, group-by-file, write contract | no |
| **the gates as named properties**: every reference resolves, no stale fingerprint, every node addressable, ratifier ≠ author | so that when machinery exists it has something to be checked against | no |

One forward-compatibility detail costs a field and buys the deferral:
`granularity` in the resolution record — `file` today, `section` or `node`
later — so a per-file fingerprint and a per-node one share a schema and a
consumer written against the first keeps working under the second.

### Defer — the mechanism. Early design is a losing bet.

Order maintenance, an incremental index, a sidecar node store, a recovery
index: their **shape depends on the target's profile**, and the profile is
learnable only from the target.

- A large repository that is **large but static** (documents rarely edited)
  needs fingerprints and a full rebuild, and nothing incremental.
- One that is **large and churning** needs incremental update, and *which*
  incremental structure depends on whether edits are local (M2) or wholesale.
- One where **the engine is the editor** can keep offsets exact; one edited
  externally must re-locate by fingerprint and fall back to search.

Designing the mechanism now means designing it for *this* repository's
profile — local edits, low churn, engine not the editor — which may be
exactly wrong for `Herança`. And this repository's own rule makes the mistake
permanent: *a retired construct becomes a recogniser, never deleted in
silence*. Speculative machinery, once built here, is carried forever as a
recogniser of a scenario that did not arrive.

### The bridge — the measurement is portable, and the target exists

The three measures in §6 are not about Glyph. `measure.js` takes a repository
path; nothing in M1/M2/M3 knows what a `.pgml` is. *Measured:* `AutoRpg` is
present on the same disk. The Regent's counterpoint is therefore **itself
testable**, today, at no cost: run the three measures against the real target's
history with the **same thresholds already declared** in §6, and "may become
necessary" becomes a number.

That is the actual timing instrument. Not "build when a big situation appears"
— *measure the big situation when it appears, with thresholds fixed in advance,
and build what its profile says.* A `scripts/measure-coupling.js` that any
repository path can be handed is the one artefact worth adding **now** for the
sake of **later**: it makes the deferred decision cheap to make. It is not run
here against `AutoRpg` because that repository is not this Order's, and
retaking it is work in another repository.

### The honest risk of the split

A contract designed before its mechanism can be designed without a constraint
the mechanism would have imposed. The `granularity` field is the known case.
The unknown cases are why the contract is a *page* and not a *system*: a page
is cheap to amend when the first real target contradicts it, and
`PACKAGE_TARGET.md` has already been amended by version for exactly that
reason. What cannot be cheaply amended is machinery — which is the whole
argument for not building it yet.

## 16. MCP `resources` — the same primitive at a different binding time

`About_MCP.md` places `resources` as the one MCP primitive with no Glyph
counterpart — *"stable addressing outside the package"* — and prices it:
*"available, and expensive: adopting URI means cross-package reference, and the
scope is the whole package by decision."* Read against A and B, three things
follow.

**It is not a different category.** A is stable addressing — `path#heading`
is a URI in all but scheme. B is stable addressing — `ORD-0003` is an
identifier. Both are declared in Glyph, resolved by the CLI, recorded in the
manifest, checked by `--check`. What `resources` adds is not the reference;
it is **the binding time**. A and B bind at emission — the CLI resolves, the
manifest carries the fingerprint, the content is fixed. `resources/read` binds
at session — the client asks the server for the content at a URI, live. That is
the criterion `About_MCP.md` itself closes on: *"Binding time decides. What
MCP resolves before the session, Glyph can absorb; what it resolves per
session, it cannot — and `<needs>` is the frontier."*

**It is a transport for the mini-repo, not a competitor to it.** The manifest
is already `resources/list` in shape: an enumeration of what a package
references, each with a fingerprint. A read-only MCP server over the mini-repo
— Cláudio's S0, *"a couple of hundred lines with no import outside the
stdlib"*, so inside the zero-dependency rule — would expose exactly those
records as resources, and the fingerprint is what tells the client whether to
`resources/read` (changed) or keep the slice it holds (unchanged). Nothing new
is authored; the mini-repo is served.

**It does not, by itself, reduce round-trips.** One `Read` is one round-trip;
one `resources/read` is one round-trip. What changes is *bytes per trip* — a
section instead of a file — not the count. The count falls when the context is
loaded **once**, which is A's value and is transport-independent: the skill is
already loaded once, as Markdown, with no server. So `resources` is justified
only after two measurements, in order: the comparison arm of §8 shows the
mini-repo reduces re-reads at all; and a **third arm** — mini-repo served over
MCP against mini-repo served as a file — shows the transport buys something
the file does not. Same instrument, same thresholds, one more arm.

**Cross-package is where "expensive" is exact, and it has a name here.** A
reference into another package cannot satisfy `I_A1` — *every reference
resolves at emission* — because the other package may not be present when
this one is emitted. It needs a **late-bound** reference: declared at
authoring, resolved by whoever holds the other package, at session. The
repository already has that construct: `<needs>`. A cross-package `resources`
URI is `<needs ref="glyph://…">` — the slot the human could not fill because
the answer lives elsewhere, filled at runtime by an MCP client instead of by a
human. That is `About_MCP.md`'s closing line applied literally: *"every runtime
concept of MCP that looks tempting is probably a `<needs>` with a different
filler."* Not a new category; a `<needs>` whose filler is a server. And it
reopens the deferred nested-scope decision only if the Regent wants references
to leave the package — which is the decision `About_MCP.md` says not to make by
analogy.

## 17. Housekeeping, outside the study

`.plan/` §4 states the `ORD-xxxxx` bundle **does not exist**. *Measured:* it
does — `ORD-0010.manifest.json`, 3.4.7.05, 2026-09-08. By the plan's own rule
the item has closed and belongs in `.changelog/`. Recorded, not moved.
