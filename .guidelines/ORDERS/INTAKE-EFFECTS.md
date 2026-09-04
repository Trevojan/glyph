# Preliminary intake — effects

> **Not an order.** `ORD-2026-08-30-01` is open and immutable save by version; a
> second concurrent order is forbidden. This records a design conversation with
> the Regent so it is not lost, and becomes an intake once E7 closes — the same
> treatment Q9 gave the six-layer bundle.
>
> Everything below marked *measured* was run against the engine at 2.4.5.01.

## 1. What the Regent wants

An **effect**: a value that passes through a transformation and comes out
narrower. The stated purpose is not decoration — it is disambiguation. *The more
effects an item carries, the more specific it becomes*, which is the maxim
"domain avoids synthesis" applied to a single value rather than to the vocabulary.

The motivating case is a form: a list of options where **some values** need a
different treatment. An effect covers the side-case without the author writing a
nested conditional for every branch, and without the engine answering "unexpected
input, end of loop".

## 2. Where it does NOT go, and why

**Not `[A],[B]`.** That form is already normative: `GLOSSARY.md` §0.3 states
*conjunction does not change the subject*. Seven corpus vectors use it — `P-04`,
`P-07`, `P-08`, `P-15`, `N-03`, `N-09`, `N-11`. Redefining it would break the
ratified rule, the composition table and the chain work of this release at once,
in silence. That is this release's own root cause.

**Not `[CMD[A],[B]]`.** The Regent named this himself: that reads as *command with
parameters A and B*, which is a different statement.

**Not a second root.** `<glyph-package effects="…">` would be a conditional root,
which `PACKAGE_TARGET.md` §2 rejects: every consumer would have to branch on
document shape before it could read anything.

## 3. Where it does go — measured

The anonymous bracket. **The tree already exists**; only a diagnostic stands in
the way.

```
[[crit'obj'],[bold],[cond'C'[itl]],[find]]

?:root                    ← the anonymous bracket
  criticise:nest          ← first term is the SUBJECT
  bold:item               ← effect 1
  condition:item          ← effect 2, carrying its own guard
    …:nest
  find:item               ← effect 3
```

Order is positional. **The guard is local to the member it guards.** No new
operator is needed: `[cond'C'[bold]]` already parses with zero diagnostics.

Today the whole form raises `fix:EmptyCommandName`.

### 3.1 The one hard problem

`EmptyCommandName` exists for a reason, and legalising the form blindly loses the
refusal for a genuine typo — a dropped command name, `[]`, `[[`.

Promoting an error to a construct is the inverse of the method's "a retired
construct is demoted to a recogniser", and needs the same care: **the refusal must
survive for what is still an error.**

Cheapest discriminator found: the effect form requires a top-level `,` inside the
anonymous bracket. `[[A],[B]]` is an effect; `[[A]]` and `[[` stay refused.
Mechanical, no re-parse, no new vocabulary.

**Open:** if `[[A]]` must also be a valid effect, this discriminator dies and the
form needs a marker — which probably means new vocabulary.

## 4. The line: declared, never applied

Glyph describes; nothing executes. That is what carries the round-trip invariant
(E4), `<invoke reads>` and the E3 validator.

The document must say **what is under what**, and never compute the result. The
consumer applies. This is exactly how `<invoke>` works — it declares the function
and does not run it.

Consequence for the three commands the Regent proposed:

| | Verdict |
|---|---|
| `[apy]` apply | **declarative, fits.** Possibly redundant: `[[A],[B]]` already says it. Worth having if the region must be explicit. |
| `[blk]` blank | **half.** "Strips all effects" is a declaration. "Conditionals to strip specific effects" is evaluation. |
| `[res]` restore | **this is the line.** See §4.1. |

### 4.1 Restore is the only thing that breaks it

*Restore to the point it was last affected* requires the document to carry a
history of applied states. That is state and time, and to restore, something must
have applied — which ends "declared, never applied", and takes the round-trip
invariant with it.

The Regent's own example says something different from restore:

> name? has name! age? has age! adult? not an adult!

That is a **validation trace** — an object checked against conditions and failing
one. Rejection with a reason, which the engine already expresses as a diagnostic
with severity and position, and which `<logic>` already emits as
`<needs var="adult">`.

**The fork, and it is the Regent's:**

- **named checkpoint** — `[res'before-validation']` references a *declared* point,
  not a computed state. Declarative, fits the fence, cheap.
- **true rewind** — needs history, and Glyph gains an evaluator. A product
  decision, not a syntax one.

## 5. The precedent: `[logic]` was underestimated

The Regent guessed this and was right. `[logic]…[/logic]` already solves "I need a
different grammar for a special region", and solves it by **fencing**. Measured:

```xml
<logic>
  <rule kind="expr">
    <source>if hp &gt; 10 then adult = true</source>   <!-- the author's text -->
    <reads>if hp &gt; 10 then adult = true</reads>      <!-- the engine's reading -->
    <uses>hp, adult</uses>                              <!-- free variables -->
  </rule>
  <needs var="adult">usado e nunca definido</needs>     <!-- missing does not block -->
</logic>
```

Four things the effects feature needs, all already present: a fenced sub-grammar,
variables as free names, the declare-without-executing pattern, and an
unresolved-name diagnostic that does not block.

And note what it does **not** do: it never computes `hp`.

An `[effects]…[/effects]` fence following the same contract makes `[apy]` and
`[blk]` vocabulary *inside the fence* rather than global operators.

## 6. Calling a condition by name

The Regent's requirement: write `when="C"` without describing C at the point of
use; the document receives C **substituted**, so the consumer never infers.

This is not new — it is Glyph's central move, already done twice:

- **templates**: `[--insight'x']` emits the whole expanded body plus `means`;
- **`<invoke reads>`**: `[prob'x']` emits `reads="[ERROR[CTX]]"`, the definition
  substituted rather than referenced.

Two constraints it inherits:

1. **An unresolved name is incomplete, not malformed** (§11.1). `when="C"` with C
   declared nowhere emits `<needs cond="C">` and does not block — the same
   discipline as `<needs var>`. The author may call first and declare later.
2. **Substitution must not eat the abstraction.** If only the expanded body is
   carried, the inverse rebuilds the expansion and the short form is lost.
   `<template>` solves this by keeping `name` beside the body, and `F-09` pins
   exactly that return trip. So `<apply when="C">` carries **the name and the
   content**: the name for the round trip, the content so nothing is inferred.

## 7. Candidate emitted shape

```
[[obj],[e1],[e2],[cond`C`[e3]],[e4],[e5]]
```

```xml
<effect>
  <subject>…</subject>
  <apply order="1"><e1/></apply>
  <apply order="2"><e2/></apply>
  <apply order="3" when="C"><e3/></apply>
  <apply order="4"><e4/></apply>
  <apply order="5"><e5/></apply>
</effect>
```

One terse line in; numbered order and a named, substituted guard out. The
asymmetry is the point, and it is what the compiler already exists to provide.

**Why a local guard is also easier for the consumer, not only for the author:**
in nested conditionals a reader carries the state of every prior branch to know
where it stands. Here each member carries its own condition and the order is
position — there is no state to track. Exhausting for the author would have been
worse for the model too.

## 8. What is still missing before this can be an order

- **"Item" has no definition.** Glyph has commands, literals and slots — no value
  and no object. `FIND`'s own definition says *"looks a value up in the context"*,
  so the concept exists in the vocabulary and not in the structure. Defining
  context objects is the expensive half and deserves its own measurement.
- `PART` does not exist. `FOREX`, `BOLD`, `VAR`, `ITR`, `FIND`, `SECTION`, `EQ`,
  `NEQ` all do.

## 9. Cost, split

| | |
|---|---|
| **First order — small** | serialise `item` vs `root` (the `origin` defect one level up, still open); legalise the anonymous bracket behind the comma discriminator; emit `<effect>` declaratively. Nothing executes, nothing is redefined. |
| **Second order — large** | context objects: value, object, scope, conditional effects scoped by `[SECTION]`. A new semantic model. Measure before design. |

## 10. Unrelated finding, worth its own fix

`->` **does not exist and is dropped in silence.** Measured: `[a]->[b]` parses as
two root commands and the arrow vanishes with no diagnostic at all. Not part of
this feature — the Regent was only sketching — but a character sequence that
disappears without a refusal is the `also="?"` shape §11.5 removed, and it should
be refused by name.
