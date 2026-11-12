# Glyph Explorer — screens

Eight Figma exports from the Regent, 2026-11-12: one Order (`ORD-0001`, series
*Parser review*) walked from draft to saved, through the workspace and the
visual flow. They are design input for step 11 of the track to the final
Explorer — the EMS surface in the app, whose intake is still to be written
(`INTAKE-EXPLORER.md`, [`.plan`](../../.plan/README.md) §5). Nothing here is
ratified as a norm: the screens show intent, and the engine stays the oracle
for every value they display.

Each file is a 1512 px wide frame with its text outlined to paths, so the text
in them can be neither searched nor edited. `glyph_explorer.svg` is the whole
window, top bar included (1512 × 1060); the other seven are the area below the
top bar (1512 × 966).

## The sequence

| # | file | view | state | what the screen adds |
|---|---|---|---|---|
| 1 | `glyph_explorer.svg` | workspace | Draft · 2 of 3 slots | the mould fills `[rev]` and `[ctx]`; `[fmt]` stays an open slot and emits `<needs slot="output">` |
| 2 | `visualflow_analyzer.svg` | visual flow | Draft · 2 of 3 | the Order as symbols (CTX → REV → FMT → ORD) and pointers; *Flow analysis* lists the structural checks, the format one missing |
| 3 | `visualflow_edit_format.svg` | visual flow | Draft | *Symbol inspector* on FMT: a suggested value, *Concise list of findings*, and the binding |
| 4 | `visualflow_ord_update.svg` | visual flow | Saved · 3 of 3 | the format applied; every check passes; the ORD preview carries `[fmt'concise list of findings']` |
| 5 | `visualflow_edit_point.svg` | visual flow | Saved | *Pointer inspector* on CTX → REV: *Context binding*, with *Requires context* offered |
| 6 | `ws_relationship_updated.svg` | visual flow | Saved | the pointer becomes *requires* (dashed); *Changes saved to the ORD* |
| 7 | `ws_format_saved.svg` | workspace | Saved · 3 of 3 | *Order complete*, 0 open slots |
| 8 | `ws_relationship_saved.svg` | workspace | Saved | the same picture as 7 — see open point 2 |

## Checked against the engine (4.7.10.08)

| what the screens show | the engine | |
|---|---|---|
| the XML of screen 1, 14 lines | `node scripts/glyph-cli.js --file <src> --xml` on `[rev'the parser']` `[ctx'api/orders.py']` `` [fmt[ph-output`the output format`]] `` | byte for byte |
| the XML of screen 7 | the same with `[fmt'concise list of findings']` | byte for byte |
| *1 open slot* | `--diag` answers `[ask] PlaceholderPending — output the output format` | agrees |
| *0 open slots* | `--diag` answers no diagnostics | agrees |
| *Vocabulary · 120 entries* | `expansions.json`: 120 commands, 88 atoms and 32 composites | agrees |
| CRIT, *Compare against the declared context or objective.* | the `def` of `CRIT` | agrees |

## Open points, for the Regent

1. **The mould *Review* does not exist in the engine.** `glyph-moulds.js` has
   *flow*, *decision*, *loop* and *fix*, and their phases are Target, Start and
   **Path**; screen 1 shows TARGET, START and **PROCESS**, the third bound to
   `[fmt]`.
2. **A relationship saved "in the ORD" has no Glyph form.** Screens 5 and 6
   turn CTX → REV from *context binding* into *requires context*, and say the
   ORD keeps it; the ORD preview and the Glyph source do not change, and
   screen 8 is the same picture as screen 7 (the two files differ only in
   clip-path ids). Where the relationship lives — the source, the `relates[]`
   of [`INTAKE-ORDER-COHERENCE`](../../.orders/INTAKE-ORDER-COHERENCE.md), or
   the `EMS.json` — is not decided.
3. **REV's description is shortened.** The screens read *A reading sweep for
   error or inconsistency.*; the engine's `def` is *A reading sweep looking for
   error or inconsistency, with no formal comparison.*
4. **Screens 7 and 8 have no background.** Their frames carry no fill, so they
   render transparent.
5. **The palette against U1.** Most secondary text is a greyish lilac
   (`#8D879B`, `#B3ADBF`) and the primary text an off-white (`#E7E3DC`); the
   code conventions ask for black, with cyan, purple, dark-green and light-blue
   text, and nothing greyish.
