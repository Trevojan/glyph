# EMS-003 — the 2D view

The series that draws a Glyph package as icons on a plane and edits it by its
visible links. The spec is [`EMS-003.pgml`](EMS-003.pgml), the measured proposal is
[`INTAKE-2D-VIEW.md`](../INTAKE-2D-VIEW.md), and the icons the Regent delivered are in
`.scope/asset/glyph-icons/`. Each ORD is a folder `ORD-####/` holding the bundle
`--bundle` writes, and the count is this series' own.

## The open Order

- [`EMS-003/ORD-0003`](ORD-0003/ORD-0003.xml) — the graph of a package, derived from the tree alone: nodes, containers and typed connectors, with `binds` and `ref` entering the envelope first, by the signed model's V6; open since 2026-11-21

## The queue

Emitted on 2026-11-11 and out of the open slot, by the Regent's word of that day:
every Order of the feature is bundled, and one is open. A queued Order opens when
the one it depends on closes — `git mv queued/ORD-#### .` — and is emitted again as
a new version first if the signed model changed what it says.

| ORD | what it commissions | depends on |
|---|---|---|
| [`ORD-0004`](queued/ORD-0004/ORD-0004.xml) | the 2D view, read only: icons, frames and links told apart by type, tied to the source, carrying the diagnostics, walked from the keyboard | 0002, 0003 |
| [`ORD-0005`](queued/ORD-0005/ORD-0005.xml) | editing by the links: each operation one edit of the tree, written as source by the way back; refusals by name, undo, and the round trip | 0004 |
| [`ORD-0006`](queued/ORD-0006/ORD-0006.xml) | the view in the Glyph Explorer: an Order opened, edited and emitted from the plane, a series drawn as a plane of its Orders, and the positions kept in the series' `EMS.json` or a loose Order's front-matter; version 2, emitted on 2026-11-21 under the signed model's V4 | 0005, and steps 2, 3 and 11 of the [trail](../../.plan/README.md) of EMS-002 |

## Closed Orders

| ORD | what it delivered | commit | digest |
|---|---|---|---|
| [`ORD-0001`](ORD-0001/ORD-0001.xml) | the model of the 2D view, signed by the Regent on 2026-11-21 in [`INTAKE-2D-VIEW.md`](../INTAKE-2D-VIEW.md) §6: an edit changes the tree and `fromAST` writes the source; the seven connectors of §3, drawn and edited; the four frames; a normalised icon set; `binds` and `ref` in the envelope; a surface of its own; and a position kept with the series, in its `EMS.json` or a loose Order's front-matter. The queue read against it: `ORD-0002` to `ORD-0005` as signed, `ORD-0006` emitted again as version 2 | `231a739`, `907f3f7` | none: no engine byte moves |
| [`ORD-0002`](ORD-0002/ORD-0002.xml) | the icons as one set the app draws, by the Regent's word of 2026-11-21 that the generator is Rust: `glyph-icons`, a tool crate, reads the 41 delivered files, which stay as delivered, and writes `scripts/glyph-icons.js`, the sprite and table the page loads, and [`ICONS.md`](../../.sources/ICONS.md), the table for the Regent. Each tile drops its name outline and is cut to its frame, one tile of 13 by 12; white, black and the one purple paint through `--gi-face`, `--gi-ink` and `--gi-accent`. 120 commands: 39 with an icon, 81 with the dashed fallback, listed for the Regent; `pin_on` and `pin_off` declared until the PIN. The category browser draws a tile beside each command. `npm run check` runs `glyph-icons --check`, seen failing on an icon no command names, a command the table leaves out, and a file that differs from a fresh build. Measured in Edge, headless: 120 tiles, all 52 by 48 at the measured scale, in the tokens of the dark and the light theme; the page served draws 104, 36 icons and 68 fallbacks, the category browser's count | `d5d1789` and the closing commit | none: no engine byte moves |
