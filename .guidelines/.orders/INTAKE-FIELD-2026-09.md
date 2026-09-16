# Field intake — the engine used on a client project

> **Not an order.** The Regent used Glyph on a professional starter kit for
> client projects — 22 series, 94 Orders authored in `.pgml`, each compiled to
> the four projections — and reported four findings. This document validates
> them against the corpus that produced them (56 `.pgml`: 51 from the kit and
> the 5 of this repository's own `exemplo/`, re-run here from disk), records
> what was fixed and what was not, and prices the one proposal. **All client
> content is generalised**: no series name, no business text, no identifying
> detail appears here or in any test derived from it — only Glyph structure.
> Engine 3.4.7.05, validated 2026-09-16.

## 1. Finding 1 — the burn does not re-read clean: **H-09, confirmed in the field**

**Reported:** `--diag` clean on the source; re-parsing the `.hgml` fails on
all 51; isolated to `qst` (`UnclosedLogic`) and `scru` (`UnknownCommand`);
identical on this repository's own `exemplo/` — *a property of the engine*.

**Measured here, at `fix` severity:** source clean on 56/56; burn re-parsed
dirty on **12/56**. The reported 51 counts `ask` — `UnfilledSlot` ×994 is
the burn emptying every slot into `<needs>`, which is the burn's contract
(*casa vazia não bloqueia*), not a defect. The 12 split into two causes:

| cause | files | code on re-read | status |
|---|---|---|---|
| `QST` — formula writes `[LOGIC-NONE]`; the lexer claims `[logic…]` as a calculation block | 4 | `UnclosedLogic`, `UnmatchedCloseTag` | **`H-09`** — pinned in `HGML_PLAN.md` and `test-corpus.js:706` since v1.1: *the `LOGIC` command is unwritable inside a formula* |
| `SCRU` — formula writes `R:` inside brackets; `R:` is segment-level punctuation | 2 | `UnmatchedCloseBracket` | **`H-09`**, same pin |
| `REV` + `DIST` blend — §2 | 9 | `UnknownCommand [heavy`, cascading `UnmatchedCloseTag` | **fixed** (§2) |

(Overlap: 12 distinct files.) Per composite in isolation: `SCRU QST` dirty,
**2 of 32** — exactly what `H-09` asserts.

**What this is and is not.** It is the field confirming a loss the plan pinned
by name so it would not be fixed silently. It is **not** the dialect theorem
(`INTAKE-FORMAL-ANALYSIS.md` §1.3): that theorem is about *comma depth*
(operands of the head vs. siblings) and changes the burn's *structure*; `H-09`
is about two *tokens* a formula cannot contain and changes whether the burn
*re-reads at all*. `QST` and `SCRU` sit on both lists, which is where the two
were conflated. Resolving the dialect question does not touch `H-09`.

**`H-09` closed, as data (delegated, 2026-09-16):** `SCRU` = `…[WHR[REAL-EQ[CONF]]]…`
— the `TRYFR` around it already means *for a result*, so `R:` said it twice,
once where it cannot be said. `QST` = `…[WHR[RSN-NONE]]…` — the formula meant
an absence of reasoning, and `LOGIC` in this glossary is the arithmetic block;
the name it used was a homonym of the thing it did not mean. A lexer rule
("`[logic` inside a formula is a name") was the alternative and was not taken:
it would make `LOGIC` mean two things by position. `H-09` pins at zero.

## 2. Finding 2 — `[rev]` + `[dist]` burn as `[heavy` — **fixed, in two halves**

**Reported:** `[rev]` and `[dist]` in one segment fire a fusion that emits
`heavy-review`; `-` is the chain operator, so the lexer re-reads `[heavy`,
outside the vocabulary. Neighbours (`eval`+`dist`, `crit`+`dist`, `rev`+`crit`,
…) clean. Fusion semantically right; defect only in the hyphen. Proposed fix:
`"emit": "heavy-review"` → a token without a hyphen.

**Measured:** confirmed on 9 of the 12 dirty files; the blend is the **only**
pattern in the layer, applied **only in the burn** (`applyBlends`, by design —
patterns match over atoms so they are invariant to surface synonyms). And the
proposed fix is **half** of it: `heavyreview`, `heavy_review`, any spelling —
all classify `unknown`, because a blend's emit is a name the vocabulary never
declares. The pattern layer invents a **third species** at burn time (neither
atom nor composite), and re-reading a burn had no way to know it.

**Done, `npm run check` green:**

| where | change |
|---|---|
| `.guidelines/rules.json` | `emit: "heavyreview"` (+ `emitNote`); `id` keeps `heavy-review` — it is not lexed |
| `scripts/glyph-parser.js` `classify` | last resort before `unknown`: `blendOf(name)` — a name equal to a blend's `emit` in the rules store is `tier: "blend"`, gloss = its `means` |
| `scripts/glyph-parser.js` `elName` | a blend's element is its emit, lowercase |
| `scripts/test-corpus.js` | `H-10b`: the burn of `[rev'x'],[dist'y']` re-parses with zero `fix` and `heavyreview` classifies as `blend`; `H-10`/`H-11` regexes follow the token |
| `.guidelines/GLOSSARY.md` "What remains" | names the emit and why it is one lexable name |
| `.guidelines/corpus-snapshot.json` | 102 `ast` hashes moved — the envelope carries the stores' checksum; no `xml`/`hgml` moved |

Field corpus after the fix: **12 → 4 dirty**, the 4 being `QST` (`H-09`).

**One thing the test exposed that was not reported:** `[rev'x'],[dist'y']`
fuses with **different** targets. `scope: "sameTarget"` does not check the
target; the blend fires on co-occurrence alone. Whether "one deep review" of
two different things is one act is the Author's call; the engine currently says
yes. Recorded, not changed.

## 3. Finding 3 — four structural problems in the kit, not in the engine

Recorded as the Regent reported them, generalised; none is an engine change,
two touch engine-adjacent decisions already open:

| item | where it lands |
|---|---|
| 27 relative references ("ORD-0003 of this series") that should be absolute (`series/ORD-0003`) now that the identifier is series + number | `INTAKE-ORDER-COHERENCE.md` §3–§4: this *is* `I_B1` (one ID scheme) and the `relates[]` edge — the field has 27 edges typed as prose that the manifest would carry typed |
| `v1.0` hard-coded in 51 `[ctx]`, nothing checks sync between them or with the series README when the series moves | the most fragile precondition found; a `--check` over a destination (all `[ctx]` versions in a series equal the series' declared one) is the same shape as `I_B1`'s gate, and the same decision precedes it |
| 4 `ORD-0001` off-pattern (a diverging prefix where the protocol name was expected) | kit convention; a `--check` on the destination could enforce a prefix table, if the Regent wants one |
| `[req]` carrying two senses — contract input vs. writing requirement — **inherited from this repository's own `exemplo/`**; a verifier demanding refusal on every `[req]` false-positives on 6 | **decided (delegated, 2026-09-16): one sense, no new command.** `REQ` is what has to exist *before* the work — the sense a verifier can refuse on; what the output must contain is `MAND`, which already means *required, not optional* on what is done. Both glossary entries now state the boundary. The kit's six writing-requirements are `[mand]`, and the `exemplo/` that taught them `[req]` is the Regent's to re-emit |

## 4. Finding 4 — an FSM in front of the model: sized, not adopted

**Proposed:** a finite-state machine pre-processes large XML before the model
sees it — context pruning by state (only the active subtree passes),
conditional logic resolved deterministically on CPU without spending tokens,
transitions locked to the FSM's valid space. Effort split proposed, unmeasured:
human 15 %, engine + FSM 60 %, model 25 %.

**Sized against the 56 field Orders:**

| promise | measured | reading |
|---|---|---|
| prune to the active subtree | median Order 12 KB of XML, 8 top-level segments, largest segment **17 %** of the tree | the ceiling is ~6× fewer **bytes per trip** — the same quantity `INTAKE-VIRTUAL-PATH.md` §16 says transport changes and trip count does not; measurable with §8's protocol, third arm |
| resolve conditional logic on CPU | **0** `[logic]` blocks in the corpus; 172 conditional *commands* (`IF GO WHR ONLYIF SWITCH`) | there is nothing for a CPU to evaluate: those are instructions *to the model*, not predicates over data. `[logic]` already is deterministic CPU where it exists — the engine has it, the field does not use it |
| lock transitions to a valid space | `rules.json` `order`/`precondition`/`pair` rules already diagnose invalid co-occurrence and ordering over the tree | the machinery exists; it diagnoses instead of gating |
| 15 / 60 / 25 | not measured, not measurable from an Order | an estimate of where effort *would* go, not where it goes |

**What is genuinely new in it — one thing:** *state*. An Order today has no
cursor; nothing says "the reader is at segment 5". Every other piece of the
proposal is A's slice extraction, `[logic]`, or `rules.json` in a different
costume. A cursor is a real gap, and it is also what `relates[]` and the
`granularity` field of the manifest were converging on from the other side.
It is not a category; it is `granularity: segment` plus a position, and it
waits on B before A like everything else in that family.

**Threshold, declared so it is not re-argued:** the FSM is worth building when
a comparison arm shows the model's *trip count* falling with pruned input —
not its bytes. Bytes per trip fall by construction; that is not the claim.

## 5. What this intake changed elsewhere

- `INTAKE-BURN-INVARIANCE.md` §4–§7 — the dialect question resolved further
  than the intake had taken it: GLOSSARY §0.3 already reads `VRFY`'s comma as
  operands and writes `CRIT` with the head closed, so the brackets are the
  rule and `CRIT` was the one table line contradicting the norm's own text.
  Aligned; V5 byte-identical; **V6 measured**: A fails, B passes — and read
  against §0.1 in force (*conjunction carries order*, since 3.4.7.05) that is
  the burn being right: the sort was built, passed, and reverted.
- `INTAKE-FORMAL-ANALYSIS.md` §1.3 — same state.
- `H-09` closed: `SCRU` drops the `R:` that `TRYFR` already means; `QST` says
  `RSN-NONE` for the absence it meant (`LOGIC` in this glossary is the
  arithmetic block). Pinned at **zero**; the 56 field Orders re-read clean.
