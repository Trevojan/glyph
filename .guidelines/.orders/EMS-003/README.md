# EMS-003 — the 2D view

The series that draws a Glyph package as icons on a plane and edits it by its
visible links. The spec is [`EMS-003.pgml`](EMS-003.pgml), the measured proposal is
[`INTAKE-2D-VIEW.md`](../INTAKE-2D-VIEW.md), and the icons the Regent delivered are in
`.scope/asset/glyph-icons/`. Each ORD is a folder `ORD-####/` holding the bundle
`--bundle` writes, and the count is this series' own.

## The open Order

- [`EMS-003/ORD-0001`](ORD-0001/ORD-0001.xml) — the model of the 2D view: what a node, a container and a connector are, which operator each connector writes, where a position lives and what an edit changes; it opens with the measured proposal of [`INTAKE-2D-VIEW.md`](../INTAKE-2D-VIEW.md) and stops at the gate of the Regent, the questions V1 to V7 of its §5; open since 2026-11-11

## The queue

Emitted on 2026-11-11 and out of the open slot, by the Regent's word of that day:
every Order of the feature is bundled, and one is open. A queued Order opens when
the one it depends on closes — `git mv queued/ORD-#### .` — and is emitted again as
a new version first if the signed model changed what it says.

| ORD | what it commissions | depends on |
|---|---|---|
| [`ORD-0002`](queued/ORD-0002/ORD-0002.xml) | the icons enter the app as one set a generated table names: every command an icon or a declared fallback, in the colours of the interface | 0001 |
| [`ORD-0003`](queued/ORD-0003/ORD-0003.xml) | the graph of a package, derived from the tree alone: nodes, containers and typed connectors | 0001 |
| [`ORD-0004`](queued/ORD-0004/ORD-0004.xml) | the 2D view, read only: icons, frames and links told apart by type, tied to the source, carrying the diagnostics, walked from the keyboard | 0002, 0003 |
| [`ORD-0005`](queued/ORD-0005/ORD-0005.xml) | editing by the links: each operation one edit of the tree, written as source by the way back; refusals by name, undo, and the round trip | 0004 |
| [`ORD-0006`](queued/ORD-0006/ORD-0006.xml) | the view in the Glyph Explorer: an Order opened, edited and emitted from the plane, and a series drawn as a plane of its Orders | 0005, and steps 3 and 11 of the [trail](../../.plan/README.md) of EMS-002 |

## Closed Orders

| ORD | what it delivered | commit | digest |
|---|---|---|---|
