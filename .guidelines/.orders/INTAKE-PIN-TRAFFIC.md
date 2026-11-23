# Preliminary intake — PIN, traffic and the EMS the user drives

> **Not an order.** The design the Regent gave on 2026-09-27, in answer to
> *"Design how they fit now"*, with what it still leaves open. His words are in
> [`.decisions/`](../.decisions/README.md) under that date; the terms in
> [`GLOSSARY.md`](../.sources/GLOSSARY.md) §8.

## 1. PIN — a conditional the user writes in the editor

A PIN marks a line to **inject a snippet into the output**. It gives the user a
*try-catch* or a *switch-case* in the editor itself, without calling up a
template: a structural command under a user-oriented condition. Three forms:

- `[pin-if`reason` …]` — the first parameter is the **alias of the validation**,
  and the validation itself runs inside the `pin-if`; the commands that follow
  are its body;
- `[pin-else …]` — after a `pin-if`, what holds when it does not;
- `[pin-case`value` …]` — in a list, one per case, as a switch.

- **Fallback.** When a block fails in its definition, the Harness follows to
  the next block, as the last PIN writes it.
- **Selection by property.** A PIN calls the property of a parameter declared
  inside another command by the command's **type**, the way a CSS selector
  applies to every matching element; an element may carry an **optional id**
  for when the type is not enough; the editor shows the match in a
  tooltip on hover.
- **Shared through the EMS.** Pins travel with the series, so a loose ORD lacks
  the exception treatment an EMS gives for free, and is incomplete by nature.

This replaces the PIN of 2026-09-23, a routing mark on a section (target and
mode) that never reached an Order's body: the PIN of today reaches the output.

## 2. The EMS and the ORD, as the user drives them

The reason the EMS exists: the conventions, rules and exceptions come out of
the ORDs and into one file, the **EMS configuration**, so each ORD stays
separate and the final user does not do the classifying. It is a file of its
own, `EMS.json`, in JSON, beside the series' ORDs. The spec `EMS-###.pgml`
keeps the ORDs — the direction and one section per ORD, its `tgt` and `val`;
`EMS.json` keeps the rules — conventions, exceptions, pins and traffic — and
it is `EMS.json` that enters every ORD's `<glyph-package>`.

- The user **starts an EMS or an ORD**. An EMS configured to create an ORD
  starts a blank ORD that inherits its destination; a **loose ORD** has a
  numbering of its own in **NEM** (*Not Emitted*), `.orders/NEM/`, one
  unnumbered folder beside the EMS folders, and can later be emitted into an EMS being drawn.
- A **generic EMS**, `EMS-000`, titled *Generic*, holds the common ground: its default `EMS.json` carries
  the commands and pins every Order may want, so an ORD emitted there gets the
  exception treatment a loose one lacks. The Order Matrices of
  `.scope/generics/` seed it.
- An EMS is **loaded and edited**: it guards its own files and its own
  configuration. Adapting one of its ORDs to another situation is saving that
  ORD in its place and undoing the edit, so the neutral EMS stays intact.
- The **Explorer shows an EMS by its title** — *Alignment Matrix* — and not only
  by its ID.

## 3. Traffic and the paths

The paths each ORD reads and writes are declared **in `EMS.json`**, for
maintenance: file paths now, virtual paths
(`X.md#section`, [`.plan`](../.plan/README.md) §0) once they exist, so two ORDs
touching different sections of one document stop colliding.

**A path that stops resolving warns the user** — who clicks it to browse for the
new path or to read the exact diagnosis — and never blocks the emission: only a
structural error does, as `fix` has always meant.

**Repair.** When data is corrupted or paths change, the files under an EMS are
repaired from what `EMS.json` declares — the very paths each ORD reads and
writes. It may rewrite **everything traffic declares**, the source included, and
it shows the diff and asks before it writes anything.

**Repair is also a queue, and placement is one of its cases** (the Regent,
2026-10-15). Every `fix` the declared-edge check raises — an Order whose metadata
does not match the EMS configuration it claims — is enqueued to `repair`, which
asks to move **each** misplaced ORD to its correct EMS, or to `.orders/NEM/`:
one question per finding, the same *show and ask* contract this section already
states. So `repair` grows two things it does not have today: a **queue** of
findings, and a **move** among its operations. Design and reason:
[`INTAKE-ORDER-COHERENCE.md`](INTAKE-ORDER-COHERENCE.md) §9.

## 4. The EMS configuration, inside every ORD's package

The rules and the configuration of an EMS travel **inside the `<glyph-package>`
of each of its ORDs**, pointed by the EMS configuration. The Harness then
reads what is doable and what is not straight from the package, section by
section and block by block; nothing is re-derived, and two Orders cannot be
confused. This is the contract O3 of
[`INTAKE-RUST-LADDER.md`](INTAKE-RUST-LADDER.md) named — the Harness consuming
Glyph's output — held inside Glyph's own format. It changes the deliverable, so
it passes through [`PACKAGE_TARGET.md`](../.sources/PACKAGE_TARGET.md) and is measured
against `conformance/`.

## 5. Settled when built

Each item opens as a measured proposal in the ORD that builds it, and that ORD
stops at the Regent's gate until he signs it (2026-09-27). On 2026-10-15 the
Regent gave each of the four its substance; his words are in
[`PERGUNTAS-ABERTAS.md`](../.plan/PERGUNTAS-ABERTAS.md) §8 and the decisions in
[`.decisions/`](../.decisions/README.md).

| | what is settled, and what the ORD still has to do |
|---|---|
| vocabulary | **What a PIN means is settled: it declares explicitly an attribute of a `[CMD]`, so the attribute is not left to inference** — *"a pinned attribute on a `[CMD]` is a way to declare it explicitly so it may be handled in many different forms without aching about inference effort"*. Measured example from him: given `[rev'filepath.txt']`, `[pin-rev]` takes the **last input** of that type and fixes it for every PIN call of the same type. The canonical names and the valency of each form still enter `expansions.txt` and `GLOSSARY.md` first, then the JS, then the Rust |
| selection | **What is PINned is settled: an attribute of a declared *object*, a characteristic of a declared *subject*, or the formula of a specified *value*** — all of it writable in the XML, and still needing inference for the whole meaning. The exact grammar of the type selector comes **along with** the definition of *item* and *part*, by his word: *"this will come along the \"item\" and \"part\" definition"* — and both arrived in the same round: `[part]` with its design and pointer labels, and *item* with its frontier ([`INTAKE-EFFECTS.md`](INTAKE-EFFECTS.md) §8.1 and §8.2). So the grammar is no longer waiting on a word: it is proposed, measured, in the ORD that builds the PIN, together with the `[part]` label form it has to select through |
| `EMS.json` | **The first field is settled: the EMS carries the basic XSD structure the ORDs follow**, so that when a specific declaration appears inside an Order the Emission answers from its spec rather than from the input XML or from pure inference — *"the EMS configuration will serve as a map and will hold very low cost to be used: just call where it matches the EMS' XSD pattern pointing to the current ORD being read and proceed the reasoning."* The rest of the schema is built **with** the Regent, against what is already ratified and immutable in the current version: *"let's build it together."* **The relation to `<schema>` is not an open question:** the XSD in `EMS.json` is the **pattern the ORDs of a series follow**, part of a configuration the user owns and edits, and `<schema>` is what one ORD **declares**, derived from its own tree and never hand-written — the Harness *"call[s] where it matches the EMS' XSD pattern pointing to the current ORD being read"*, so one is the convention and the other the instance ([`PACKAGE_TARGET.md`](../.sources/PACKAGE_TARGET.md) §5). What waits is the field list, which this ORD proposes measured |
| the generic EMS | **Settled: the code session measures `.scope/generics/` and returns the commands and pins by frequency, and the Regent rewrites the `EMS-000` over that list** — *"A, and i rewrite to make it fit. this will be quite an artisan handswork."* The measurement is the deliverable; the contents stay his |

## 6. The PIN vocabulary, the measured proposal

The proposal for step 6 of the trail to the final Explorer
([`.plan`](../.plan/README.md) §5): the vocabulary only. The type selector's grammar — the
optional id, the `[part]` labels it selects through — waits for steps 5 and 7, as §5 says.
Measured at `5685486`:

| | |
|---|---|
| `[pin-rev]`, `[pin]` | `fix` `UnknownCommand`: PIN is not in the vocabulary |
| `IF` | a command since `EMS-002/ORD-0017`: `[if'ok'…]` emits `<if cond="ok" binds="ok">` |
| `else`, `case` | not in the vocabulary: `[else` and `[case` are `UnknownCommand` |
| the two readings this file settles | the conditional of §1 — `[pin-if`…`]`, `[pin-else …]`, `[pin-case`…`]` — and the pinned attribute of §5, `[pin-rev]` fixing the last `[rev'…']` input for every PIN of that type |

Both readings write PIN chained to one command, so one grammar can carry them.

**N1. How many commands.**
- a. one, `PIN`, whose chained operand chooses the form: `if`, `else` and `case` are its
  three conditional forms, and any other command is the type whose attribute it pins
- b. two: `PIN` for the pinned attribute, and the conditional forms as commands of their
  own

**N2. `else` and `case`.**
- a. words of `PIN`'s own, valid only chained to it, the way a slot's name is valid only
  in its placeholder
- b. commands of the vocabulary, valid anywhere

**N3. The element.**
- a. one `<pin>`, its form an attribute: `<pin form="if" alias="…">`,
  `<pin form="case" value="…">`, `<pin form="else">`, `<pin type="rev">`
- b. one element per form

**N4. Its place in the palette.**
- a. *Frame*, beside `SECTION`, `BLOCK` and `PT`: structure under a condition
- b. a category of its own

**The session's recommendation:** N1 a, N2 a, N3 a, N4 a. One word for one idea; no
command that means nothing outside a PIN; one element a reader learns once; and the
structure palette where `PT` already sits. Each form enters `expansions.txt` and
`GLOSSARY.md` first, then the JS, then the Rust.

## 7. The generics, measured — the list the `EMS-000` is rewritten over

The deliverable of the generic EMS (§5, *"A, and i rewrite to make it fit"*), for step 9
of the trail to the final Explorer ([`.plan`](../.plan/README.md) §5). Measured at
`5685486`: the six `.pgml` of `.scope/generics/`, each read through the engine's AST
with the repository's stores, every command counted once per occurrence; *files* is how
many of the six use it.

| file | commands | diagnostics |
|---|---|---|
| `germinate-glyph-package.pgml` | 22 | 12 |
| `glyph-variable-naming-system.pgml` | 31 | 35 |
| `handoff-generic.pgml` | 59 | 13 |
| `order-generic.pgml` | 32 | 10 |
| `production.pgml` | 47 | 18 |
| `resume-generic.pgml` | 55 | 4 |

**Commands, by frequency** — 35 distinct, 177 uses, written *uses/files*:
`PH` 53/5 · `SECTION` 17/4 · `DFN` 13/3 · `NT` 13/3 · `WHR` 11/5 · `DONT` 5/3 · `EX` 5/2 ·
`GET` 5/5 · `GO` 5/3 · `INS` 5/4 · `BLOCK` 4/4 · `CNST` 4/2 · `CTX` 4/4 · `SKL` 4/4 ·
`VAR` 4/1 · `REF` 3/3 · `HMN` 2/2 · `LIM` 2/2 · `TGT` 2/1 · and once each, in one file:
`ASK`, `ASSM`, `COND`, `CORE`, `EQ`, `EXT`, `FIN`, `FIND`, `LRN`, `NEQ`, `NEV`, `ONLYIF`,
`PROB`, `QST`, `RDY`, `WARN`.

**Pins:** none. No generic writes `[pin`, and PIN is not in the vocabulary (§6).

**Words outside the vocabulary** — 16 uses, all in `glyph-variable-naming-system.pgml`:
`sec` 4, `rule` 3, `desc` 2, `doc` 2, `cmd`, `cmd2`, `result`, `scope`, `syntax`.

**Placeholder names** — 39 distinct, 53 uses: `ramo` 5, `suposicao` 3, `alvo`, `branch`,
`criterio`, `esforco`, `fruto`, `limite`, `proximo`, `trava` 2 each; and once each
`aberto`, `author`, `caso`, `causa`, `criteria`, `deadline`, `effort`, `estado`,
`fechado`, `fruit`, `goal`, `licao`, `limit`, `livre`, `lock`, `marco`, `medida`,
`metodo`, `name`, `plano`, `porta`, `position`, `repo`, `step`, `suite`, `suposition`,
`target`, `valor`, `versao`.

**For the rewrite.** Eight concepts are named in both languages across the generics:
`ramo` and `branch`, `criterio` and `criteria`, `esforco` and `effort`, `fruto` and
`fruit`, `limite` and `limit`, `trava` and `lock`, `suposicao` and `suposition`, `alvo`
and `target` or `goal`. One `EMS-000` holds one name for each. The burn of every generic
that uses a placeholder rereads with an `UnknownCommand` per placeholder name until the
defect of [`.plan`](../.plan/README.md) §3 is fixed — 27 across four of them, measured
on 2026-11-17.

## 8. The answers to §6 — 2026-11-21

In [`.decisions/`](../.decisions/README.md), round of 2026-11-21, from the sheet [`PERGUNTAS-2026-11-20.md`](../.plan/PERGUNTAS-2026-11-20.md).

| | answer | what the Order builds |
|---|---|---|
| N1 | a | one command, `PIN`, whose chained operand chooses the form: `if`, `else` and `case`, and any other command the type whose attribute it pins |
| N2 | a | `else` and `case` are words of `PIN`'s own, valid only chained to it |
| N3 | a | one element, `<pin form="…">` |
| N4 | a | the PIN sits in *Frame*, beside `SECTION`, `BLOCK` and `PT` |

## 9. What `EMS-002/ORD-0044` left — 2026-11-22

The vocabulary is built (N1 a to N4 a): `PIN`, its three form words, and one element. Three
points it does not decide:

**PN-1. The icon of `PIN`.** The set the Regent drew holds `pin_on.svg` and `pin_off.svg`, the
two files no command named; `PIN` now stands on the fallback tile
([`ICONS.md`](../.sources/ICONS.md)).
- a. `PIN` takes `pin_on`, and `pin_off` stays for the selector of step 7, a PIN that does not apply
- b. both wait for step 7, and `PIN` keeps the tile
- c. another pairing, in the Regent's words

**PN-2. A PIN with no form.** `[pin]` and `[pin[nt'x']]` emit `<pin>` and ask nothing.
- a. it asks, `ask PinWithoutForm`, with a `<needs>` for the form: a PIN that says neither a condition nor a type pins nothing
- b. it stays as built

**PN-3. A type with items.** `[pin-rev,fmt]` is not read as a type: the run of two is a chain,
`<pin><chain>…</chain></pin>`, because one `type` cannot name two commands.
- a. so it stays, and the selector of step 7 decides whether a PIN pins more than one type
- b. it is refused, `fix PinTypeIsOne`

**The session's recommendation:** PN-1 a, PN-2 a, PN-3 a.
