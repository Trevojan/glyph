# The study register

> **One row per question worth measuring before anyone designs**: the question, what
> would decide it, the instrument, the status, and the intake it became. Ratified by the
> Regent on 2026-11-11 ([`.decisions/`](../.decisions/README.md)). The register points,
> it never copies: each number lives where its row says.
>
> **The practice it serves:** *measure before design*
> ([`INTAKE-EFFECTS.md`](../.orders/INTAKE-EFFECTS.md) §9), and thresholds declared in a
> commit before the script that reads the number
> ([`INTAKE-VIRTUAL-PATH.md`](../.orders/INTAKE-VIRTUAL-PATH.md) §18).

## Owed or held

| question | what decides it | instrument | status | became |
|---|---|---|---|---|
| does the mini-repo of virtual paths reduce re-reading? | the re-read rate and the round-trips to first edit, against the 13-session baseline | the protocol of [`INTAKE-VIRTUAL-PATH.md`](../.orders/INTAKE-VIRTUAL-PATH.md) §8.1, stamped 2026-09-11 before counting | **owed, held**: the transcripts of the sessions after 2026-10-23 live in `~/.claude/projects/` on the Regent's machine; kept owed by the Regent, 2026-11-18 | [`INTAKE-VIRTUAL-PATH.md`](../.orders/INTAKE-VIRTUAL-PATH.md) §8 and §16 |
| does an MCP transport buy what a file does not? | the third arm of §16 | none written | **owed, held**: no MCP resources transport exists; kept owed by the Regent, 2026-11-18 | [`INTAKE-VIRTUAL-PATH.md`](../.orders/INTAKE-VIRTUAL-PATH.md) §16 |
| what must be measured before the context objects are designed? | what the engine's generated XSD declares, applied to the XML's content | none written | **held**: it waits for the XSD of step 1 of the trail ([`INTAKE-XSD.md`](../.orders/INTAKE-XSD.md)), by the Regent's word of 2026-11-18 | [`INTAKE-EFFECTS.md`](../.orders/INTAKE-EFFECTS.md) §9, the second order |

## Measured

| question | what decides it | instrument | status | became |
|---|---|---|---|---|
| which commands and pins does the generic EMS carry? | frequency over `.scope/generics/` | the engine's AST over the six `.pgml` | measured 2026-11-17: 35 commands, no pin, 39 placeholder names | [`INTAKE-PIN-TRAFFIC.md`](../.orders/INTAKE-PIN-TRAFFIC.md) §7, for the Regent's rewrite of the `EMS-000` |
| does the burn of a placeholder reread clean? | the `UnknownCommand` count on the reread of each generic's burn | the CLI's `--hgml`, then `--diag` on its output, and a prototype of the fix run through the suite | measured 2026-11-17: 27 across four generics. The fix that names the slot in the burn's head, `[ph-x`, rereads byte-equal and moves 3 `hgml` hashes (T-03, T-04, OC-10) and no other | [`.plan`](../.plan/README.md) §3, the defect still open |
| which diagnostics can carry a source span? | the AST diagnostics with no `at`, over the 119 declared sources | the oracle `check:rust` exports | measured 2026-11-17: 103 of 109 lack it, over 43 codes, `UnfilledSlot` 31 of them; giving each a span moves up to 71 `ast` hashes and no other | [`INTAKE-VSCODE-AUTHORING.md`](../.orders/INTAKE-VSCODE-AUTHORING.md) §7 |
| does a webview shell pass the crate rule? | O7's grades | `crate-weight.js --tree` over `cargo tree` for Windows and Linux | measured 2026-11-17: every candidate grades `fix` | [`INTAKE-EXPLORER.md`](../.orders/INTAKE-EXPLORER.md) §2 |
| what does the engine emit, for an XSD to describe? | the elements, pairs and attributes over the 119 sources | the oracle's XML, through a standard parser | measured 2026-11-17: 96 elements, 235 pairs, 36 attributes; `<schema>` always empty | [`INTAKE-XSD.md`](../.orders/INTAKE-XSD.md) §1 |
| which engine does each series hold to? | the version each Order names | the 54 Orders' `.pgml` and manifests | measured 2026-11-17: none in a `[ctx]`; two series span two engines | [`INTAKE-EMS-JSON.md`](../.orders/INTAKE-EMS-JSON.md) §2 |
| does the item scheme move the snapshot? | the `origin` of every command, over the 119 sources | the oracle's AST | measured 2026-11-17: 7 sources under the decision's reading, 103 under every root | [`INTAKE-EFFECTS.md`](../.orders/INTAKE-EFFECTS.md) §11 |
| does `suggest()` find what the Author of the Order wrote? | hits on the words actually written | [`COMPILER_LESSONS.md`](COMPILER_LESSONS.md) §0 | measured: 1 of 11; it needs a semantic filter, not a better threshold | [`.plan`](../.plan/README.md) §2 |
| how does the JS `toXML` grow with a source's length? | the time of L-03, L-02 and L-01 | the suite's long sources | measured: 23 ms, 0.44 s and 6.2 s, quadratic; the Rust does L-01 in 0.13 s | [`.plan`](../.plan/README.md) §3; the JS is not fixed, by question 13 of the [return](../.orders/EMS-001/RETURN.md) |
| does the coupling between documents and code pay for fingerprints? | coupling over the 202 commits, thresholds declared before the script | `scripts/measure-coupling.js` | measured; built by the `EMS-002`, `ORD-0001` to `ORD-0004` | [`INTAKE-VIRTUAL-PATH.md`](../.orders/INTAKE-VIRTUAL-PATH.md) §18 and §19 |
