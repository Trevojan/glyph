# Glyphs and Hieroglyphs — normative glossary (v1.3.0.0)

The normative reference for the Glyph vocabulary. Organised by **species**
rather than by theme, because species is what decides whether `.hgml` may treat
something as an atom.

**The engine derives from this document, not the other way round.** The 120
entries below exist in the vocabulary, `expansions.txt` closes with 0 cycles and
0 undefined, and the suite fails (`X-01`, `X-14`) if the two ever drift apart.

**Language:** everything that reaches the deliverable is English — definitions,
slot questions, mood glosses. The interface stays pt-BR, and its strings live in
`scripts/glyph-moldes.js`, `scripts/glyph-ui.js` and the `CATS` table.

Marks: **★** entry proposed during consolidation, not in the original draft.

## Versioning — `app.front.rules.content`

| digit | layer |
|---|---|
| `app` | the application as a whole |
| `front` | the interface — HTML, CSS, UI |
| `rules` | business rules — `rules.json`, constraints, valency |
| `content` | data, constants, glosses, and where things live |

**No digit resets any other** — digits move independently and keep their place.

---

## 0. Legend — the species

Two independent axes, plus two kinds that are not vocabulary at all.

|  | **primitive** — stands alone | **operator** — needs an operand |
|---|---|---|
| **hieroglyph** — atom, does not decompose | `hieroglyph primitive` | `hieroglyph operator` |
| **glyph** — has a formula | *(empty by construction)* | `composite glyph` |

- **engine** — not user vocabulary: structure the engine interprets.
- **mode** — changes how the rest of the document is read.

Practical consequence: **every hieroglyph is one `= BASE` line in
`expansions.txt`; every glyph is a line with a formula.** That boundary is what
`.hgml` needs, and the only reason the legend exists.

## 0.1 Formula notation — normative

Four constructions, each with exactly one reading:

| form | reading |
|---|---|
| `[A[B]]` | **nesting** — B is A's operand |
| `[A],[B]` | **conjunction** — A and B hold together, no order between them |
| `[A][B]` | **sequence** — A, then B |
| `[A-B]` | **chain** — A and B applied to the same operand |

The algebraic `A + B` of the older formulas is **retired**: it was conjunction,
and is rewritten in brackets so two syntaxes do not stay alive at once.

## 0.2 `BASE` and `CORE` — the disambiguation

`BASE` used to be two things: the right-hand keyword in `expansions.txt` ("this
one is an atom") and a vocabulary command ("structural foundation"). Resolved:

- **`BASE`** — only the `expansions.txt` keyword. Not a command, never appears in
  brackets, never enters a formula.
- **`CORE`** ★ — the command. Structural foundation of a context object.

`CORE` is classified as a *hieroglyph primitive* ★ rather than *engine*: it
appears as an operand in 11 formulas, which is vocabulary-atom behaviour, not
engine structure.

## 0.3 Operand binding — normative

A formula describes operations but does not say **about what**. When a human
writes `[crit'the parser']`, something has to decide where `'the parser'` lands
inside CRIT's formula. The rule:

> **The human's operand is the subject of the whole formula.** Every item
> operates on that same subject; whatever is nested inside an item is the
> *standard* or *aspect* that item works against, not a new subject.

Combined with §0.1:

| form | subject of `B` |
|---|---|
| `[A],[B]` | the same as `A` — conjunction does not change the subject |
| `[A][B]` | the **result** of `A` — sequence chains |
| `[A[B]]` | `B` is not a subject: it is A's operand/standard |

`CRIT` = `[CMP[CTX]],[SPEC-CORE],[EVAL[ERROR]]` with `'the parser'` as subject
reads: **compare `'the parser'` against the context; specify the core of
`'the parser'`; evaluate `'the parser'` for errors.** All three items are
comma-separated, so all three speak about the parser — `CTX`, `CORE` and
`ERROR` are what they work *against*, not what they are *about*.

The rule holds across the table:

| invocation | reading |
|---|---|
| `[prob'timeout']` | `[ERROR[CTX]]` — timeout is an error, situated in a context |
| `[vrfy'the output']` | `[CMP-TRUE[[CORE],[TGT]]]` — compare the output against truth, foundation and target |
| `[alt'use a cache']` | `[NEQ[CORE]],[EQ[TGT]]` — differs in means, agrees in end |
| `[assm'the DB answers']` | `[ADD[CORE]],[NEV[VRFY]]` — enters as foundation, never verified |

**Why this had to be written down:** a prose gloss of a formula tends to supply
the subject in parentheses ("the core *of the context*") while the formula does
not say it. Without the rule each reader supplies a different subject and the
`.hgml` emitter has no way to choose. With it, decomposition is mechanical.

---

## 1. Hieroglyph operators

Atoms that act on another element.

`TRUE` — True. Comparison base: true.
`FLS` — False. Comparison base: false.
`POS` — Positive. Positive polarity, assertion or agreement.
`NGT` — Negative. Negative polarity, negation or disagreement.
`DONT` — Do not. Negates **doing something**: a direct prohibition on an action.
`DENY` — Deny. Rejects **what leads to a result**: refusal of the route, not of the act itself.
`PRIO` — Prioritise. Element that takes precedence over others in the context.
`OVR` — Override. Suspends a prior rule and writes over it.
`DFN` — Define. Establishes a definition, creates a semantic binding, introduces new concepts.
`CMP` — Compare. Evaluates the relation between values in the context.
`CNST` — Constraint. A testable rule, used as the target of a comparison.
`ASK` — Ask. The act of requesting an answer from someone; raises a question.
`ELAB` — Elaborate. Expands with detail; develops an idea.
`CLAR` — Clarify. Makes clear; removes ambiguity.
`COND` — Condition. Logical gate for conditional execution.
`FMT` — Format. Specifies output shape; presentation pattern.
`ITR` — Iterate. Controlled repetition of a process.
`CONF` — Confirm. Validates a decision already taken.
`UNLS` — Unless. Negated conditional; excludes execution under a given condition.
`ONLYIF` — Only if. Necessary condition for execution.
`ONLYW` — Only when. Temporal restriction on execution.
`INSTOF` — Instead of. Substitution of one action for another.
`AVD` — Avoid. Recommendation to steer clear where possible (weak degree).
`RDY` — Readiness. State of being ready to execute.
`INS` — Instruction. Direct command to execute.
`WARN` — Warn. Flags a relevant condition without blocking execution.
`BYP` — Bypass. Goes around a step without executing it.
`FIND` — Find. Looks a value up in the context and sets it as target or context object.
`GT` — Greater than. Numeric comparison: greater than.
`GTE` — Greater or equal than. Numeric comparison: greater or equal.
`LT` — Lesser than. Numeric comparison: less than.
`LTE` — Lesser or equal than. Numeric comparison: less or equal.
`EQ` — Equals. Equality comparison.
`NEQ` — Not equal. Inequality comparison.
`GET` — Get. Reads a value from the context and holds it until the next interaction.
`SUB` — Subtract. Removes an explicit value from the context.
`ADD` — Add. Adds a value to the context, respecting its type.
`SWITCH` — Switch. Alternation between states by conditional selection.
`GO` — Go. Executes; proceeds with the pending action.

**On the `DONT` / `DENY` pair:** the distinction is what gets negated — `DONT`
bears on the **action** ("do not do X"), `DENY` on the **route** ("I refuse the
path that leads to Y"). Consequence in `rules.json`: the `req-deny` rule
was written when `DENY` meant refusing a proposal, and under the refined reading
`REQ` (demanding something exist) and `DENY` (rejecting a route to a result) no
longer collide by construction — see §6.6.

## 2. Hieroglyph primitives

Atoms that stand on their own, with no operand.

`ERROR` — Error. Marks or signals a failure or exception.
`MAND` — Mandatory. Required, not optional.
`OPT` — Option. Optional element, may be omitted.
`ALW` — Always. Permanent behaviour, no exceptions.
`NEV` — Never. Permanence modifier applied to another rule (e.g. `NEV DONT X` = never do X).
`PT` — Part, part of. Membership relation of an object within a context.
`VAR` — Variable. Mutable element, ready to be defined or reused.
`PARAM` — Parameter. Configurable input to a command.
`PH` — Placeholder. A reserved position in an object, awaiting a value.
`DEF` — Default. Default value, base behaviour.
`TPL` ★ — Template. Named mould, defined with `[--name=` and invoked with `[--name`.
`CORE` ★ — Core. Structural foundation of a context object. *(was `BASE` — §0.2)*
`CTX` — Context. Declared scope.
`TGT` — Target. Aim, destination or objective.
`SPEC` — Specification. Detailed technical description of a requirement.
`LOGIC` — Logic. Block of mathematical or boolean operations.
`WHR` — Where. Place marker; spatial context of reference.
`HGH` — High. High intensity; raised priority.
`LOW` — Low. Low intensity; reduced priority.
`BOLD` — Bold. Strong emphasis; prominence in the output.
`LIGHT` — Light. Soft emphasis; reduced tone in the output.
`ATC` — Attach. Attaches auxiliary context or reference to a command.
`EX` — Example. The example itself — the datum, the concrete case.
`RWK` — Rework. Rebuilds the structure while keeping the original intent.
`IMPR` — Improve. Raises quality without changing the structure (incremental polish).
`REV` — Review. A reading sweep looking for error or inconsistency, with no formal comparison.
`SKEP` — Sceptic. Takes a sceptical stance towards a proposition.
`DIST` — Distinguish. Marks the difference between two elements.
`REAL` — Realistic. The practical quality standard `EVAL` measures against.
`REF` — Reference. Points at an external source.
`SEEAL` — See also. Suggests a relation to another element.
`NT` — Note. Annotation; marks a relevant point.
`EXC` — Exception. Explicit departure from the general rule.
`LIM` — Limitation. Observation that a limit exists (not an imposition).
`REQ` — Requirement. Positive demand — what has to exist.
`EXT` — External. Marks an element outside the document's scope.
`RSN` ★ — Reason. The motive underlying a decision. *(promoted from composite — §5)*
`FIN` ★ — Finally. Closing or termination marker. *(promoted from composite — §5)*

## 3. Composite glyphs

These carry a formula in hieroglyphs. Entries marked ★ are proposals; §5
explains each.

**Pre-existing:**

`VRFY` = `[CMP-TRUE[[CORE],[TGT]]]` — Verify. Compare against truth or fact.
`VAL` = `[CMP-CTX[CNST]][SUB[EQ[CMP-CTX]]][CAT-EQ]` — Validate. Compare against the constraint or rule.
`CRIT` = `[CMP[CTX],[SPEC-CORE],[EVAL[ERROR]]]` — Critique. Compare against the declared context or objective.
`EVAL` = `[REAL[CORE-CTX[DIST[SKL]]]],[REF[DEF[SPEC-CORE-CTX]]]` — Evaluate. Compare against a realistic standard of practical quality.
`SCRU` = `[DIST-RSN[TRYFR[FIND-REAL][WHR[REAL-EQ[R:[CONF]]]]][CTX-VRFY-RSN],[SUM[ASK[DIST-RSN[TRYFR[REAL]]]]]]` — Scrutinise. Examine the context under verification, criticise and question.
`TRYFR` = `[REV[REF[TGT]]][VRFY[TGT],[TRUE[CNCL[GO-LOGIC]]]]` — Try. Attempt to reach the target with verification.
`PROB` = `[ERROR[CTX]]` — Problem. An error situated inside a specific context.
`QST` = `[CTX[GET[CORE],[WHR[LOGIC-NONE]]],[ASK]]` — Question. Structural typing: marks a block as interrogative (not necessarily aimed at anyone — see `ASK`).
`DRVF` = `[RTNL-RWK[MAND-NEQ],[CTX[GO-SWITCH]]]` — Derive from. Draw a conclusion from a principle.
`FOREX` = `[GO-ALT[AVD[GET[CTX-REQ],[CTX-CNST],[CTX-EXC]]]]` — For example. The discourse connective that introduces an `EX` in the flow of text.
`FBK` = `[IF-ERROR][EQ[RMBR[CORE]],[INSTOF[TRYFR],[GO[ALT]]]]` — Fallback. Alternative plan of action on failure.
`RESTR` = `[IF[SKEP[CNST]][TRUE][LIM-GO[CTX-EQ[CNST]]]]` — Restrict. The act of limiting the scope of application.
`HYP` = `[RMBR[FBK]][IMAG[ONLYIF[CNST-REAL]][TRUE],[ADD[CTX][FOREX-CORE]],[FBK]]` — Hypothesis. A testable, unconfirmed proposition.
`SIMP` = `[RTNL-SUB],[CTX]` — Simplify. Reduce complexity — cut, do not add.
`GEN` = `[ELAB],[RWK],[SUB-CTX]` — Generalise. Categorise instances into a base pattern.
`SUM` = `[SIMP],[CORE]` — Summarise. Simplify while keeping the essential foundation.
`CAT` = `[SUM],[CORE],[ELAB]` — Categorise. Organise into classes.

**Proposed ★:**

`ALT` = `[NEQ[CORE]],[EQ[TGT]]` — Alternative. Differs in means, agrees in end.
`ASSM` = `[ADD[CORE]],[NEV[VRFY]]` — Assumption. Enters as foundation, never verified.
`DEPR` = `[AVD[GO]],[OPT[REF[INSTOF]]]` — Deprecated. Avoid executing; a replacement may exist.
`RTNL` = `[ELAB[RSN]],[REF[CNST]]` — Rationale. A reason elaborated and tied to a criterion.
`IMAG` = `[ADD[CTX[NEQ[REAL]]]]` — Imagine. Adds a non-real context.
`RMBR` = `[ALW[GET[CTX]]]` — Remember. Permanent retrieval from the context.
`FRGT` = `[NEV[GET[CTX]]]` — Forget. Never retrieved from the context again.
`LRN` = `[GEN[RMBR]],[ADD[CORE]]` — Learn. Generalises what was retained and folds it into the foundation.
`BRST` = `[ITR[ADD[ALT-IMAG]]],[NEV[CNST]]` — Brainstorm. Iterates imagined alternatives, unconstrained.
`CNSD` = `[ITR[CMP[ALT],[CNST]]],[NEV[CNCL]]` — Consider. Weighs each alternative against the rule without concluding.
`PROP` = `[GO[ALT[RTNL]]],[ASK[CONF]]` — Propose. Puts forward an alternative with its rationale and asks for assent.
`CTRD` = `[NGT[TGT]],[RTNL[DIST]]` — Contradict. Negates the target and supports it with the difference.
`CNCL` = `[FIN[DRVF[CORE-CTX]]]` — Conclude. Final derivation from the context's foundation.
`JUST` = `[GO[RTNL]],[TGT[CNCL]]` — Justify. Deploys the rationale in favour of a conclusion.
`INTN` = `[DFN[TGT[RSN]]]` — Intention. Declares the target together with its motive.

## 4. Engine and modes

**engine** — structure the engine interprets, not instruction vocabulary:

`IF` — If. Logical conditional; execution gate.
`SECTION` — Named structural division grouping related commands.
`BLOCK` — Atomic unit of execution; groups commands read as a single step.
`SKL` — Marks an installed skill, invocable inside the Glyph document.
`NONE` — None. Absence of value; the empty return of engine operations.
`TOBLOCK` — Converts a section or a loose set of commands into a `BLOCK`.
`TOSECTION` — Converts a block or a loose set of commands into a `SECTION`.
`HMN` — Human. Represents the user as a referenceable object.

**mode** — changes how the rest is read:

`QUICK` — Condensed execution directive: expands an abbreviated command into a full canonical instruction.
`OFF` — Off. Disables Glyph interpretation from this point on.
`ON` — On. Re-enables Glyph interpretation after an `OFF`.

---

## 5. The proposed formulas — the reason for each

The axis of the six original composites: **a composite names what it operates on
and against which standard** — `VRFY` against truth, `VAL` against the rule,
`CRIT` against the objective, `EVAL` against the realistic standard. The
proposals follow that. Where an entry is a noun rather than an act, the formula
describes the state, not the procedure.

**`RMBR` / `FRGT` — the pair that pays for itself.** `[ALW[GET[CTX]]]` against
`[NEV[GET[CTX]]]`: same operand, opposite quantifiers. The `rmbr-frgt`
contradiction sitting in `rules.json` as a hand-written table becomes
*derivable* from the formula. That is the strongest argument for the expansion
project as a whole: the semantic rules stop being convention and become
consequence.

**`BRST` explains a precondition that was already written.** The formula
contains no `CTX` at all — brainstorming by construction does not bring its own
frame. That is exactly why the `brst-needs-frame` rule demands a
`@subject`/`@condition` in front of it.

**`CNSD` and `BRST` differ by one negation.** `BRST` = `NEV[CNST]` (generates
without a filter); `CNSD` = `NEV[CNCL]` (filters without deciding). One opens
the fan, the other weighs it, neither closes it — `CNCL` closes it.

**`ASSM` transcribes rather than interprets.** `[ADD[CORE]],[NEV[VRFY]]` is
literally its own gloss: an unverified premise taken as foundation.

**`ALT` changed most between passes.** An alternative is not merely "different
from the foundation" — it is substitutable for it. `[NEQ[CORE]],[EQ[TGT]]` says
both: diverges in the middle, converges at the end.

**`RSN` and `FIN` left the composites.** `FIN` is a positional marker, sibling
to `PT`; `RSN` is close to irreducible — the formulas available said less than
the entry did. Forcing a formula there creates false depth in `dag.js` for no
semantic gain.

**Confidence.** High: `ASSM`, `ALT`, `IMAG`, `RMBR`, `FRGT`, `DEPR`, `INTN`,
`RTNL`, `CNSD`, `BRST`. Medium: `CNCL`, `JUST`, `LRN`, `PROP`, `CTRD` — worth
revisiting once the first ones have run against real cases.

---

## 6. Record of what was closed

### 6.1 The composition table — `expansions.txt`

88 non-expanding declarations (77 vocabulary atoms + 11 engine/mode entries that
appear inside formulas) and 32 composite formulas.

```
level 0  [hieroglyph]   88
level 1  [composite-1]  13   ALT DEPR EVAL FRGT GEN IMAG INTN PROB QST RESTR RMBR RTNL VRFY
level 2  [composite-2]   9   ASSM BRST CRIT CTRD DRVF FOREX LRN PROP SIMP
level 3  [composite-3]   2   CNCL SUM
level 4  [composite-4]   4   CAT CNSD JUST TRYFR
level 5  [composite-5]   3   FBK SCRU VAL
level 6  [composite-6]   1   HYP

120 layered, 0 undefined, 0 cycles
```

`HYP` is the deepest at 6 levels, and it follows: hypothesis depends on `FBK`,
which depends on `TRYFR`, which depends on `CNCL`, which depends on `DRVF`,
which depends on `RTNL`. Five hops to reach the atoms.

Two `dag.js` fixes were needed for that number to mean anything. The dependency
regex was `/[A-Z_][\w-]*/g`, with `-` **inside** the character class, so
`CMP-TRUE` came out as a single phantom identifier instead of CMP and TRUE — it
was written when formulas were space-separated, and the chain notation broke it
silently. And the level labels called level 1 "primitive" while `ALT`, `VRFY`
and `RMBR` sit there and are composites.

### 6.2 Twelve commands the engine did not have

`FIND` `GET` `SUB` `ADD` `WHR` `HGH` `LOW` `NONE` `SWITCH` `BOLD` `LIGHT` `GO`

Half the composition formulas referenced them and could not resolve. Two new
`CATS` categories were needed because they did not fit the existing ones:
**Context** (reading, writing and locating inside a scope) separates *operating
within* a scope from *declaring* one, which is what *Frame* already did;
**Intensity** grades a single item, whereas `PRIO` orders items against each
other.

`go` left `SESSION` as a side effect: `classify()` consults `INSTR` before
`SESSION`, so the lowercase session tag became a second, unreachable definition
of the same word — the same reason `prob` had left that table earlier.

### 6.3 Three phantom symbols

`CMD`, `R` and `THEN` were dependencies no declaration ever defined.

**`THEN` was removed, not replaced.** §0.1 defines juxtaposition `[A][B]` as
sequence, which is exactly what `THEN` marked. In `VAL` and `TRYFR` it sat
between already-juxtaposed groups, so it was pure redundancy. In `SCRU` it was
inside a comma list — where commas are conjunction, hence unordered — so it was
the only thing saying B came after A; removing it required deciding what
happened to C, and the choice was A→B in sequence with C in parallel.

**`R` was resolved in `dag.js`, not in the formula.** `R:` is the lexer's return
token, not a command. Rather than delete it from `SCRU` and lose the return
marking, `dag.js` now discards return tokens before extracting dependencies.
Composing and marking a return are different axes.

**`CMD` was removed from `FBK`.** It was a metavariable, and `ALT` already means
"the alternative": `[GO[ALT-CMD]]` → `[GO[ALT]]`.

### 6.4 `BASE` → `CORE`

Applied at four points: `CATS` and `INSTR` in the parser, the `subject` class in
`rules.json`, and three `tag:"base"` occurrences in the moulds. A negative
case (`N-13`) pins that `[base]` must now fail as unknown vocabulary — without
it the collision the rename undid could creep back through the parser unnoticed.

### 6.5 The v1.7 fusions, undone

The distinctions follow a single axis — *object vs. act*, or *standard of
comparison*:

| pair | what separates them |
|---|---|
| `EX` / `FOREX` | the datum / the connective that introduces it |
| `QST` / `ASK` | typing of the block / act aimed at someone |
| `EVAL` / `CRIT` | against a realistic standard / against the declared objective |
| `REV` / `CRIT` | reading sweep without comparison / formal comparison |
| `ONLYIF` / `COND` | necessary condition / generic gate |
| `SPEC` / `ELAB` | the detailed artefact / the act of detailing |
| `SIMP` / `CLAR` | cutting complexity / removing ambiguity |

Undoing it was deleting seven `ALIAS` lines: `classify()` consults `ALIAS`
before `INSTR`, and all seven already had their own `INSTR` entry and `FRAMES`
valency, so the line's mere existence *was* the fusion.

Three rules cited the fusion as fact and were corrected. `clar-elab` became
`simp-elab` — the real tension is cutting versus adding, and the one that cuts
is `SIMP`; `CLAR` removes ambiguity, which often *adds* words. `gen-elab` lost
its "(ELAB absorbed SPEC)" and gained a sibling, `gen-spec`, the tension the
fusion had been hiding. The `coarsen` class went from `[GEN, SUM, CLAR]` to
`[GEN, SUM, SIMP]` for the same reason.

### 6.6 `req-deny` demoted

From `fix`/contradiction to `ask`/tension. With `DENY` bearing on the *route to
a result* and `REQ` on the *existence of something*, the two stopped colliding
by construction: legitimate when the rejected route is not the only one, wrong
when it is. As `fix` the rule was failing valid input — and `fix` means "the XML
is not trustworthy", which was not the case.

### 6.7 Three unbalanced formulas

`VAL`, `EVAL` and `SCRU` were closed by hand. In Glyph source an unclosed `[` is
legal — it nests inside the previous one — but in a composition formula it makes
scope undecidable, and `.hgml` requires explicit closure.

---

## 7. Where this stands

| | step | state |
|---|---|---|
| 1 | composition table complete | ✅ 120 layered, 0 cycles |
| 2 | formulas balanced | ✅ 32/32 |
| 3 | phantom symbols resolved | ✅ 0 undefined |
| 4 | `BASE` → `CORE` in the engine | ✅ |
| 5 | twelve new commands in `INSTR` | ✅ |
| 6 | v1.7 de-fusion | ✅ |
| 7 | `req-deny` reviewed | ✅ |
| 8 | composition bridge (`useExpansions`) | ✅ |
| 9 | `.hgml` atomic burn | ✅ 30/32 clean |
| 10 | glossary definitions inside the engine | ✅ 120/120 |

### The `.hgml` emitter

`toHGML()` reduces the tree to pure hieroglyphs. §0.3 is what makes it
mechanical: the human's operand becomes the formula's subject, and from there
decomposition has no decision left to make.

```
[prob'timeout']   →   [error
                        'timeout'
                        [ctx[/ctx]
                      [/error]
```

Closed form `[name … [/name]`, opening **without** `]` — because `]` already
closes a command, so `[ctx][/ctx]` would emit `UnmatchedCloseTag`.

The burn is an **expansion, not a compression**: ~15 hieroglyphs per composite,
97 for `HYP`, roughly 25x on a short input. That is inherent to "100%
hieroglyphs" — density and full decomposition pull in opposite directions, and
this format chose decomposition.

**Two formulas the grammar cannot read**, both data problems rather than burn
bugs, and both pinned by name in case `H-09` so neither gets fixed silently:

- **`SCRU`** uses `R:` inside brackets. The return token is segment-level
  punctuation, so `[R:` parses as a command named `R`.
- **`QST`** uses `[LOGIC-NONE]`. The lexer claims any `[logic…]` as a
  calculation block and then demands `[/logic]` — meaning **the `LOGIC` command
  is unwritable inside a formula**. That is a language limitation, not a formula
  one.

### Self-describing output

`toXML(src, {describe:true})` carries the semantics into the message, so the
reader does not need the Glyph vocabulary loaded:

```xml
<review means="A reading sweep looking for error or inconsistency, with no formal comparison.">
<scrutinize means="Examine the context under verification, criticise and question."
            made-of="ask cmp cnst conf core ctx dist elab eq fin find go logic mand neq real ref rev rsn rwk sub switch tgt true whr">
```

`means` comes from the definitions in §1–§4, extracted at build time; `made-of`
from the composition table. Neither is invented, and neither is maintained
twice.

### What remains

A **pattern layer**: a rule kind that maps co-occurrence to a richer element
(`REV` + `SCRU` on one target → `<heavy-review>`). It is data, like the rules
store, and the burn is what makes it tractable — patterns written over the 88
atoms are invariant to which surface synonym the human typed. Every element such
a pattern invents must carry its own `means`, or the interpretation problem just
moves one step along.
