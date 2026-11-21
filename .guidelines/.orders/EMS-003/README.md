# EMS-003 — the 2D view

The series that draws a Glyph package as icons on a plane and edits it by its
visible links. The spec is [`EMS-003.pgml`](EMS-003.pgml), the measured proposal is
[`INTAKE-2D-VIEW.md`](../INTAKE-2D-VIEW.md), and the icons the Regent delivered are in
`.scope/asset/glyph-icons/`. Each ORD is a folder `ORD-####/` holding the bundle
`--bundle` writes, and the count is this series' own.

## The open Order

- [`EMS-003/ORD-0002`](ORD-0002/ORD-0002.xml) — the icons enter the app as one set a generated table names: every command an icon or a declared fallback, in the colours of the interface, by the signed model's V5; open since 2026-11-21

## The queue

Emitted on 2026-11-11 and out of the open slot, by the Regent's word of that day:
every Order of the feature is bundled, and one is open. A queued Order opens when
the one it depends on closes — `git mv queued/ORD-#### .` — and is emitted again as
a new version first if the signed model changed what it says.

| ORD | what it commissions | depends on |
|---|---|---|
| [`ORD-0003`](queued/ORD-0003/ORD-0003.xml) | the graph of a package, derived from the tree alone: nodes, containers and typed connectors | 0001 |
| [`ORD-0004`](queued/ORD-0004/ORD-0004.xml) | the 2D view, read only: icons, frames and links told apart by type, tied to the source, carrying the diagnostics, walked from the keyboard | 0002, 0003 |
| [`ORD-0005`](queued/ORD-0005/ORD-0005.xml) | editing by the links: each operation one edit of the tree, written as source by the way back; refusals by name, undo, and the round trip | 0004 |
| [`ORD-0006`](queued/ORD-0006/ORD-0006.xml) | the view in the Glyph Explorer: an Order opened, edited and emitted from the plane, a series drawn as a plane of its Orders, and the positions kept in the series' `EMS.json` or a loose Order's front-matter; version 2, emitted on 2026-11-21 under the signed model's V4 | 0005, and steps 2, 3 and 11 of the [trail](../../.plan/README.md) of EMS-002 |

## Closed Orders

| ORD | what it delivered | commit | digest |
|---|---|---|---|
| [`ORD-0001`](ORD-0001/ORD-0001.xml) | the model of the 2D view, signed by the Regent on 2026-11-21 in [`INTAKE-2D-VIEW.md`](../INTAKE-2D-VIEW.md) §6: an edit changes the tree and `fromAST` writes the source; the seven connectors of §3, drawn and edited; the four frames; a normalised icon set; `binds` and `ref` in the envelope; a surface of its own; and a position kept with the series, in its `EMS.json` or a loose Order's front-matter. The queue read against it: `ORD-0002` to `ORD-0005` as signed, `ORD-0006` emitted again as version 2 | `231a739` and the closing commit | none: no engine byte moves |
