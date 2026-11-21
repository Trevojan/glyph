# Intake — the raw fence and the logic block, through the burn

> **The measured proposal for the two burns `H-16` names as known**, `OC-12` and `R-04`,
> left outside [`INTAKE-BURN-PLACEHOLDER.md`](INTAKE-BURN-PLACEHOLDER.md) §4. The Regent
> answered §4 on 2026-11-21, and §5 holds the answers. The Order opens with them once the
> open slot is free. Measured at `46f47e5`, engine 4.7.10.09, with an
> experimental patch applied to `scripts/core/burn.js` and taken back out. Nothing of it
> is committed.

## 1. The defect, wider than the corpus shows

`hgmlLines` writes a raw fence as `[raw[/raw]` and a logic block as `[logic-name[/logic]`.
`hgml_lines` in Rust writes the same bytes on every case below.

| source | burn | reread |
|---|---|---|
| `[raw]`↵`anything [x] here`↵`[/raw]` | `[raw[/raw]` | `fix` `UnknownCommand`: `[raw` is not a command |
| `[raw] never closed` (`OC-12`) | `[raw[/raw]` | the same |
| `[logic-dano]`↵`hp = 3d6kh2`↵`[/logic]` (`R-04`) | `[logic-dano[/logic]` | `fix` `UnclosedLogic` |
| `[logic]`↵`x = 1`↵`[/logic]` | `[logic[/logic]` | clean, but the rules are gone |

**Every raw fence and every named logic block burns into a form the grammar refuses.**
Only one declared source has a closed raw fence and only one a named block, so `H-16`
counts two. The lexer reads a fence only in its open form, `[raw]` … `[/raw]` and
`[logic-name]` … `[/logic]`. The closed form `[x[/x]` that every command takes is not a
fence to it.

The burn also drops what a fence holds. A raw fence carries the author's text, unread on
purpose (`b82b72d`, 2026-09-05: *"the body is what the author wrote, carried into `<raw>`
and back out unread by every inverse"*). A logic block carries its rules. Neither comes
back.

## 2. Measured

Each variant was run against the suite and against the three sources of §1:

| variant | `H-16` | `hgml` hashes that move | the reread's XML equals the source's |
|---|---|---|---|
| **A**, the open fence, empty: `[raw]`↵`[/raw]`, `[logic-name]`↵`[/logic]` | 116 of 116 | 9: `N-14`, `R-04`, `R-05`, `OC-02`, `OC-03`, `OC-04`, `OC-07`, `OC-09`, `OC-12` | no: `<raw>` and `<logic>` come back empty |
| **B**, the open fence, carrying its body | 116 of 116 | the same 9 | **yes**, for all three |
| **B′**, B on the named block and the raw fence only, the unnamed block left as `[logic[/logic]` | 116 of 116 | 2: `R-04`, `OC-12` | only where the form changed. An unnamed block still loses its rules |

No XML or AST hash moves in any variant. Eight of the nine are logic blocks, unnamed
except `R-04`; they move because their form changes, from `[logic[/logic]` to the open
fence.

## 3. What this leaves alone

- **Prose.** Free prose still does not survive the burn. A fence is not prose: it is
  material the author asked to be carried verbatim, which is why it has a construct.
- **The hieroglyph promise.** A raw body may hold anything, Glyph included. Inside the
  fence the reread does not parse it, as the source's parse did not, so no command the
  body spells enters the burn.

## 4. What the Order would decide

**F1. A raw fence's body.**
- **a.** The body is carried verbatim inside the open fence, so the reread gives the
  same `<raw>`.
- **b.** The fence burns empty, as the body does today.

**F2. A logic block.**
- **a.** Every block burns as the open fence carrying its rules, named or not. Eight
  hashes move, and the reread gives the same `<logic>`.
- **b.** Only the named block changes form (variant B′). Two hashes move, and an unnamed
  block still loses its rules.

**F3. Which engine.**
- **a.** Both engines, in one Order, as `ORD-0035`.
- **b.** Rust only.

**F4. The pin.**
- **a.** `H-16`'s `KNOWN` empties, so it reads 116 of 116, and an `H` case holds that a
  fence and a block reread to the same XML.
- **b.** Only the `KNOWN` list empties.

**The session's recommendation:** F1 a, F2 a, F3 a, F4 a.
- **F1 a.** A fence exists to carry text verbatim. An empty fence answers a question
  nobody asked.
- **F2 a.** Two forms for one construct is the inconsistency this kind of fix exists to
  remove. Under b, `[logic]` and `[logic-dano]` burn differently, and only one keeps its
  rules.
- **F3 a.** It is the answer B1 gave for the same kind of defect.
- **F4 a.** With the `KNOWN` list empty, every new burn defect fails `H-16` by name.

## 5. The answers — 2026-11-21

In [`.decisions/`](../.decisions/README.md), round of 2026-11-21, from the sheet [`PERGUNTAS-2026-11-20.md`](../.plan/PERGUNTAS-2026-11-20.md).

| | answer | what the Order builds |
|---|---|---|
| F1 | a | the raw fence carries its body verbatim inside the open fence |
| F2 | a | every logic block burns as the open fence carrying its rules, named or not |
| F3 | b | the Rust only: `glyph-burn` changes, `burn.js` keeps the defect until the JS leaves, and the oracle tests name the nine `hgml` differences of §2 in `rust/testkit/known` |
| F4 | a | the `KNOWN` list empties and an `H` case holds that a fence and a block reread to the same XML. Under F3 b the pin is the Rust's: `H-16` runs the JS burn, so its `KNOWN` keeps `OC-12` and `R-04` until the JS leaves, and a Rust count over every declared burn holds 116 of 116 with none known; the Regent confirmed this reading on 2026-11-21 |
