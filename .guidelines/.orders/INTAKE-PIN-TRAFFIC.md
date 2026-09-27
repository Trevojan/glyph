# Preliminary intake — PIN, traffic and the EMS the user drives

> **Not an order.** The design the Regent gave on 2026-09-27, in answer to
> *"Design how they fit now"*, with what it still leaves open. His words are in
> [`.decisions/`](../.decisions/README.md) under that date; the terms in
> [`GLOSSARY.md`](../GLOSSARY.md) §8.

## 1. PIN — a conditional the user writes in the editor

A PIN marks a line to **inject a snippet into the output**. It gives the user a
*try-catch* or a *switch-case* in the editor itself, without calling up a
template: a structural command under a user-oriented condition, written as
`[pin-if`reason`(...)]`.

- **Fallback.** When a block fails in its definition, the Harness follows to
  the next block, as the last PIN writes it.
- **Selection by property.** A PIN calls the property of a parameter declared
  inside another command, the way a CSS selector applies to every matching
  element rather than to one class or id; the editor shows the match in a
  tooltip on hover.
- **Shared through the EMS.** Pins travel with the series, so a loose ORD lacks
  the exception treatment an EMS gives for free, and is incomplete by nature.

This replaces the PIN of 2026-09-23, a routing mark on a section (target and
mode) that never reached an Order's body: the PIN of today reaches the output.

## 2. The EMS and the ORD, as the user drives them

The reason the EMS exists: the conventions, rules and exceptions come out of
the ORDs and into one file, the **EMS configuration**, so each ORD stays
separate and the final user does not do the classifying. It is a file of its
own, `EMS.config`, beside the series' ORDs.

- The user **starts an EMS or an ORD**. An EMS configured to create an ORD
  starts a blank ORD that inherits its destination; a **loose ORD** has a
  numbering of its own in **NEM** (*Not Emitted*), one unnumbered folder that
  belongs to no EMS, and can later be emitted into an EMS being drawn.
- A **generic EMS** holds the common ground: its default `EMS.config` carries
  the commands and pins every Order may want, so an ORD emitted there gets the
  exception treatment a loose one lacks. The Order Matrices of
  `.scope/generics/` seed it.
- An EMS is **loaded and edited**: it guards its own files and its own
  configuration. Adapting one of its ORDs to another situation is saving that
  ORD in its place and undoing the edit, so the neutral EMS stays intact.
- The **Explorer shows an EMS by its title** — *Alignment Matrix* — and not only
  by its ID.

## 3. Traffic and the paths

The paths each ORD reads and writes are declared **in `EMS.config`**, for
maintenance: file paths now, virtual paths
(`X.md#section`, [`.plan`](../.plan/README.md) §0) once they exist, so two ORDs
touching different sections of one document stop colliding.

**A path that stops resolving warns the user** — who clicks it to browse for the
new path or to read the exact diagnosis — and never blocks the emission: only a
structural error does, as `fix` has always meant.

**Repair.** When data is corrupted or paths change, the files under an EMS are
repaired from what `EMS.config` declares — the very paths each ORD reads and
writes.

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

## 5. Open, for the Regent

| | question |
|---|---|
| syntax | `[pin-if`reason`(...)]` — what the parentheses hold, and whether `pin-else` or a `case` form follows; `PIN` enters `expansions.txt` and `GLOSSARY.md` first, then the JS, then the Rust |
| selection | the selector grammar a PIN matches parameters with, and whether elements need ids of their own |
| `EMS.config` | its format, what stays in the spec `EMS-###.pgml`, and which of its fields enter the `<glyph-package>` |
| NEM and the generic EMS | where NEM sits, how its ORDs number, and the generic EMS's name and first contents |
| repair | what a repair may rewrite, and whether it asks before writing |
