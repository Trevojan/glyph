# Glyphs and Hieroglyphs — normative glossary (v3.6.9.07)

The normative reference for the Glyph vocabulary. Organised by **species**
rather than by theme, because species is what decides whether `.hgml` may treat
something as an atom.

**The engine derives from this document, not the other way round.** The 120
entries below exist in the vocabulary, `expansions.txt` closes with 0 cycles and
0 undefined, and the suite fails (`X-01`, `X-14`) if the two ever drift apart.

**Language:** everything that reaches the deliverable is English — definitions,
slot questions, mood glosses. The interface stays pt-BR, and its strings live in
`scripts/glyph-moulds.js`, `scripts/glyph-ui.js` and the `CATS` table.

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
| `[A],[B]` | **conjunction** — A and B hold together, **and the order is part of what is said** |
| `[A][B]` | **sequence** — A, then B |
| `[A-B]` | **chain** — A and B applied to the same operand |

Conjunction is written in brackets, never as an algebraic `A + B`: two syntaxes
for one construction do not stay alive at once.

### Why conjunction carries order

The reason is grammatical, and it generalises: **what is to be done is declared
before the subject** — *red ball*, *thin air*, *heavy stuff*. So

| form | reading |
|---|---|
| `[simp'X'],[core]` | simplify X **and treat as** core |
| `[core],[simp'X']` | **in** core, simplify X |

Two intentions, not one intention twice. Conjunction does not change the
**subject** — §0.3 says a different thing — but it does carry order.

Conjunction and sequence are distinguished in the emitted document and not only
in the AST: `<holds>` is the element that carries it, measured in
`.guidelines/HGML_CONVERGENCE.md` §2.1b.

## 0.2 `BASE` and `CORE` — the disambiguation

Two words a reader collides, and they sit on different axes:

- **`BASE`** — only the `expansions.txt` keyword, meaning "this one is an atom".
  Not a command, never appears in brackets, never enters a formula; `[base` is
  unknown vocabulary, pinned so by `N-13`.
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
`CTX` — Context. Declared scope.
`TGT` — Target. Aim, destination or objective.
`SPEC` — Specification. Detailed technical description of a requirement.
`EX` — Example. The example itself — the datum, the concrete case.
`RWK` — Rework. Rebuilds the structure while keeping the original intent.
`IMPR` — Improve. Raises quality without changing the structure (incremental polish).
`REV` — Review. A reading sweep looking for error or inconsistency, with no formal comparison.
`SKEP` — Sceptic. Takes a sceptical stance towards a proposition.
`DIST` — Distinguish. Marks the difference between two elements.
`REF` — Reference. Points at an external source.
`SEEAL` — See also. Suggests a relation to another element.
`NT` — Note. Annotation; marks a relevant point.
`EXC` — Exception. Explicit departure from the general rule.
`LIM` — Limitation. Observation that a limit exists (not an imposition).
`REQ` — Requirement. Positive demand — what has to exist **before** the work: an input, a precondition, a thing the reader may refuse to proceed without. What the *output* must contain is `MAND`.
`RSN` ★ — Reason. The motive underlying a decision. *(promoted from composite — §5)*
longer collide by construction — see `.guidelines/.history/GLOSSARY_CLOSED.md` §6.6.

## 2. Hieroglyph primitives

Atoms that stand on their own, with no operand.

`ERROR` — Error. Marks or signals a failure or exception.
`MAND` — Mandatory. Required, not optional — an obligation on what is produced or done. A demand on what must already exist is `REQ`.
`OPT` — Option. Optional element, may be omitted.
`ALW` — Always. Permanent behaviour, no exceptions.
`NEV` — Never. Permanence modifier applied to another rule (e.g. `NEV DONT X` = never do X).
`PT` — Part, part of. Membership relation of an object within a context.
`VAR` — Variable. Mutable element, ready to be defined or reused.
`PARAM` — Parameter. Configurable input to a command.
`PH` — Placeholder. A reserved position in an object, awaiting a value.
`DEF` — Default. Default value, base behaviour.
`TPL` ★ — Template. Named, reusable body with `[ph-]` holes, defined with `[--name=` and invoked with `[--name`.
`CORE` ★ — Core. Structural foundation of a context object. *(was `BASE` — §0.2)*
`LOGIC` — Logic. Block of mathematical or boolean operations.
`WHR` — Where. Place marker; spatial context of reference.
`HGH` — High. High intensity; raised priority.
`LOW` — Low. Low intensity; reduced priority.
`BOLD` — Bold. Strong emphasis; prominence in the output.
`LIGHT` — Light. Soft emphasis; reduced tone in the output.
`ATC` — Attach. Attaches auxiliary context or reference to a command.
`REAL` — Realistic. The practical quality standard `EVAL` measures against.
`EXT` — External. Marks an element outside the document's scope.
`FIN` ★ — Finally. Closing or termination marker. *(promoted from composite — §5)*

## 3. Composite glyphs

These carry a formula in hieroglyphs. Entries marked ★ are proposals; §5
explains each.

**Pre-existing:**

`VRFY` = `[CMP-TRUE[[CORE],[TGT]]]` — Verify. Compare against truth or fact.
`VAL` = `[CMP-CTX[CNST]][SUB[EQ[CMP-CTX]]][CAT-EQ]` — Validate. Compare against the constraint or rule.
`CRIT` = `[CMP[CTX]],[SPEC-CORE],[EVAL[ERROR]]` — Critique. Compare against the declared context or objective.
`EVAL` = `[REAL[CORE-CTX[DIST[SKL]]]],[REF[DEF[SPEC-CORE-CTX]]]` — Evaluate. Compare against a realistic standard of practical quality.
`SCRU` = `[DIST-RSN[TRYFR[FIND-REAL][WHR[REAL-EQ[CONF]]]][CTX-VRFY-RSN],[SUM[ASK[DIST-RSN[TRYFR[REAL]]]]]]` — Scrutinise. Examine the context under verification, criticise and question.
`TRYFR` = `[REV[REF[TGT]]][VRFY[TGT],[TRUE[CNCL[GO-LOGIC]]]]` — Try. Attempt to reach the target with verification.
`PROB` = `[ERROR[CTX]]` — Problem. An error situated inside a specific context.
`QST` = `[CTX[GET[CORE],[WHR[RSN-NONE]]],[ASK]]` — Question. Structural typing: marks a block as interrogative (not necessarily aimed at anyone — see `ASK`).
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

## 6. The record of what was closed

What a command **used to be** is a different question from what it is, and it
has a different home: `.guidelines/.history/GLOSSARY_CLOSED.md`, where the
`§6.x` numbering is kept so every pointer into it still resolves.

This file states the vocabulary as it stands.

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

**Every composite burns and re-reads clean** — `H-09` holds it at 32 of 32.
Two spellings the grammar cannot read are kept out of the table by that case
and by the norm↔table gate in `build-templates.js`: `R:` inside brackets (the
return token is segment-level punctuation, so `[R:` parses as a command named
`R`) and `[LOGIC…]` inside a formula (the lexer claims it as a calculation
block and demands `[/logic]` — the `LOGIC` command is the block, and is not
writable as a name). `SCRU` once carried `R:` and `QST` once carried
`[LOGIC-NONE]`; a client kit re-reading its own burns found both, six Orders
in fifty-one. `SCRU` says "where the realistic equals a confirmation" — the
`TRYFR` around it already means *for a result*. `QST` says "where reason:
none" — what it meant was an absence of reasoning, and `LOGIC` in this
glossary is arithmetic.

### Self-describing output

`toXML(src, {describe:true})` carries the semantics into the message, so the
reader does not need the Glyph vocabulary loaded:

```xml
<review means="A reading sweep looking for error or inconsistency, with no formal comparison.">
<scrutinise means="Examine the context under verification, criticise and question."
            made-of="ask cmp cnst conf core ctx dist elab eq fin find go logic mand neq real ref rev rsn rwk sub switch tgt true whr">
```

`means` comes from the definitions in §1–§4, extracted at build time; `made-of`
from the composition table. Neither is invented, and neither is maintained
twice.

### What remains

A **pattern layer**: a rule kind that maps co-occurrence to a richer element
(`REV` + `DIST` on one target → `heavyreview`; the emit is one lexable name, because the burn is read back and `-` is the chain operator). It is data, like the rules
store, and the burn is what makes it tractable — patterns written over the 88
atoms are invariant to which surface synonym the human typed. Every element such
a pattern invents must carry its own `means`, or the interpretation problem just
moves one step along.

## 8. Project vocabulary — the terms outside the language

Sections 0 to 7 define what the engine reads. This section defines the words
the project itself is run with: who decides, how work is ordered, what the Rust
app is made of, and the names the Regent ratified. None of them is a command,
and none reaches the deliverable. Each row points to where it was decided.

**Norm:** technical and theoretical terms settle in English, also in the
Portuguese interface, spelt en-EU (lock T13) — see
[`.constraints/`](.constraints/README.md).

### Who decides

| term | is | is not | decided in |
|---|---|---|---|
| **Regente** | who decides; an agent measures, proposes and refuses, and never ratifies a norm it wrote | an agent | [`.decisions/`](.decisions/README.md) |
| **Autor da Ordem** | who writes the `.pgml` source; the engine exists to trade that author's inference for re-ference | the Regent, necessarily | [`.decisions/`](.decisions/README.md), 2026-09-05 |
| **ADR** | a decision record: a `.decisions/` row with its reversibility and what it supersedes; it binds once the Regent signs, and changing a signed one costs one questionnaire session | a rule for a case | [`.constraints/`](.constraints/README.md) |
| **DC** | case handling, "when this occurs, do this": a `.constraints/` row naming the gate that checks it and the ADR it enforces | a decision's reason | stated in the EMS definition; none written yet |
| **domínio evita síntese** | what fits in code, schema or table is never re-inferred | a style preference | [`.constraints/`](.constraints/README.md) |

### How work is ordered

| term | is | is not | decided in |
|---|---|---|---|
| **EMS** | a series of Orders kept in one folder, `.orders/EMS-###/`, whose conventions, rules and exceptions live in one file, the **EMS configuration**, so each ORD stays separate and the user does not classify; with a spec that talks to the guidelines: constraints, counters, exceptions, the ADR and DC it modifies, its pins, and how to proceed after it closes; it grows as a queue, and the user loads, edits and emits it, the Explorer showing it by its title | a version | [`.decisions/`](.decisions/README.md), 2026-09-25 and 2026-09-27; [`EMS-001.pgml`](.orders/EMS-001/EMS-001.pgml) |
| **ORD** (Order, *Ordem*) | one Order: the XML is the Order, and the `.pgml`, `.json`, `.hgml` and manifest beside it let it validate itself; in a series, `.orders/EMS-###/ORD-####/`, carrying the EMS's rules and configuration inside its `<glyph-package>`; a loose ORD numbers itself in **NEM**, and lacks what an EMS gives for free; exactly one open at a time | the parked flat `ORD-0011`, `restructure-glyph-repo`, kept in `.orders/parked/` — not `EMS-001/ORD-0011` | [`.decisions/`](.decisions/README.md), 2026-09-25 and 2026-09-27 |
| **EMS.json** | the EMS configuration, in JSON: one file per series holding its conventions, rules, exceptions, pins and traffic, so each ORD stays separate; its rules travel inside every ORD's `<glyph-package>` | the spec | [`.decisions/`](.decisions/README.md), 2026-09-27; format open |
| **NEM** (*Not Emitted*) | the one folder of loose ORDs, `.orders/NEM/` beside the EMS folders, unnumbered, its ORDs numbered `ORD-####` on their own | a series; a group | as **EMS.json** |
| **generic EMS** | the series of common ground: its default `EMS.json` carries the commands and pins every Order may want; the Order Matrices of `.scope/generics/` seed it | a loose folder | as **EMS.json** |
| **spec** | a series' own `EMS-###.pgml` | an Order | [`EMS-001.pgml`](.orders/EMS-001/EMS-001.pgml) |
| **Degraus** | the ORDs of EMS-001 | the revoked 2026-09-24 ladder | [`.decisions/`](.decisions/README.md), 2026-09-25 |
| **val** | the proof of done an ORD names: what is validated, and the external criterion | a test written after the fact | every ORD source |
| **close an ORD** | its val holds, its work is banked, and its row is written in the spec's track, the series register and `.shortcuts` | merging a branch | [`HANDOFF-2026-09-24.pgml`](.orders/HANDOFF-2026-09-24.pgml) |
| **bank** | a commit that passes `npm run check` and `npm run check:rust`, pushed, with the return updated in the same commit | a commit alone | [`HANDOFF-2026-09-26.pgml`](.orders/HANDOFF-2026-09-26.pgml) |
| **the return** | `EMS-###/RETURN.md`: what the sessions built and matched, and what waits for the Regent; its log names every commit and its checks | a changelog | [`HANDOFF-2026-09-26.pgml`](.orders/HANDOFF-2026-09-26.pgml) |
| **handoff** | `HANDOFF-yyyy-mm-dd.pgml`: the Order a new session hears to resume where another stopped | the return | `.orders/` |
| **intake** | material that arrives while an Order is open; it waits in `.orders/` as `INTAKE-*.md` and never becomes a second Order | an Order | [`.constraints/`](.constraints/README.md) |
| **Order Matrix** | an Order that assembles a formulary filled by an input pattern, and chains into a "DRAWING" | a generic template | [`.decisions/`](.decisions/README.md), 2026-09-24; `.scope/generics/` |
| **PIN** | a mark on a line that injects a snippet into the output: a structural command under a user-oriented condition, `[pin-if`reason`(...)]`, giving a *try-catch* or *switch-case* in the editor without a template; when a block fails, the Harness follows to the next, as the last PIN writes it; shared through the EMS | a routing mark on a section — the reading of 2026-09-23; a template | [`.decisions/`](.decisions/README.md), 2026-09-27; [`INTAKE-PIN-TRAFFIC.md`](.orders/INTAKE-PIN-TRAFFIC.md); not built |
| **traffic** | the paths an ORD reads and writes, declared in `EMS.json` — files now, virtual paths later; a path that stops resolving warns the user and never blocks the emission, and **repair** rewrites the files under an EMS from these paths when data is corrupted or paths change, showing the diff and asking first | `<invoke reads>` in the XML, which names what a command reads | as **PIN** |
| **layout** | the render layout of an ORD (`packets.md`) | the repository's folder layout | [`.decisions/`](.decisions/README.md), 2026-09-24 |

### The Rust app

| term | is | is not | decided in |
|---|---|---|---|
| **engine** | the Rust binary `glyph-engine`: it reads Glyph and answers the projections, a process of its own, on stdio (ADR B), relayed by `serve-dev.js` | linked into the page | [`.decisions/`](.decisions/README.md), 2026-09-25 |
| **visual** | the browser app, `glyph-engine-alias.html` with `scripts/glyph-ui.js`: the MVP; behind `?engine=relay` it talks to the engine | a rewrite | [`EMS-001.pgml`](.orders/EMS-001/EMS-001.pgml) |
| **Glyph Explorer** | the app installed on each user's machine, where everything personal lives | anything stored in the public repository | [`.decisions/`](.decisions/README.md), 2026-09-27 |
| **standalone** | the app serving each user individually, as a whole thing of its own | an app without a server process | [`.decisions/`](.decisions/README.md), 2026-09-27 |
| **oracle** | what the JS engine answers at the same commit, written by `node scripts/test-corpus.js --export-oracle`, never committed; frozen by the tag `conformance-v0` | `conformance/`, which derives from the specification | [`EMS-001.pgml`](.orders/EMS-001/EMS-001.pgml) |
| **byte-exact** | the Rust answer equals the oracle as bytes, not as meaning | equivalent | [`EMS-001.pgml`](.orders/EMS-001/EMS-001.pgml) |
| **queima** | the `.hgml`, the reduction to pure hieroglyphs | the source of truth | §0 |

### The names the Regent ratified

| term | is | is not | decided in |
|---|---|---|---|
| **template** | the language's macro: `[--name=` defines, `[--name` invokes, `[ph-x]` are its holes (`TPL`) | a mould | [`.decisions/`](.decisions/README.md), 2026-09-24 |
| **mould** | the app's forms: phases Alvo · Partida · Percurso, slots `{id, tag, q}` (`scripts/glyph-moulds.js`) | a template | as **template** |
| **sample** | a ready-made example source in the app (`SAMPLES`) | a preset — the word is retired; a conformance example | as **template** |
| **snippet** | an editor completion of a whole shape | a template | as **template** |
| **virtual path** | `[file][delimiter][selector]`, resolving to one exact slice with offsets, over a structural identity that survives a move | a text search | [`.plan`](.plan/README.md) §0 |
