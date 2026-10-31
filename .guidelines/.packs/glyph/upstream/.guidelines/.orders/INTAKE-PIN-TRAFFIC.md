# Preliminary intake — PIN, traffic and the EMS the user drives

> **Not an order.** The design the Regent gave on 2026-09-27, in answer to
> *"Design how they fit now"*, with what it still leaves open. His words are in
> [`.decisions/`](../.decisions/README.md) under that date; the terms in
> [`GLOSSARY.md`](../GLOSSARY.md) §8.

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

## 4. The EMS configuration, inside every ORD's package

The rules and the configuration of an EMS travel **inside the `<glyph-package>`
of each of its ORDs**, pointed by the EMS configuration. The Harness then
reads what is doable and what is not straight from the package, section by
section and block by block; nothing is re-derived, and two Orders cannot be
confused. This is the contract O3 of
[`INTAKE-RUST-LADDER.md`](INTAKE-RUST-LADDER.md) named — the Harness consuming
Glyph's output — held inside Glyph's own format. It changes the deliverable, so
it passes through [`PACKAGE_TARGET.md`](../PACKAGE_TARGET.md) and is measured
against `conformance/`.

## 5. Settled when built

Each item opens as a measured proposal in the ORD that builds it, and that ORD
stops at the Regent's gate until he signs it (2026-09-27).

| | question |
|---|---|
| vocabulary | `PIN` and its three forms enter `expansions.txt` and `GLOSSARY.md` first, then the JS, then the Rust — the canonical names and the valency of each |
| selection | the exact grammar of the type selector, and the spelling of the optional id |
| `EMS.json` | its schema: the fields and their shapes |
| the generic EMS | its first contents, from the Order Matrices of `.scope/generics/` |
