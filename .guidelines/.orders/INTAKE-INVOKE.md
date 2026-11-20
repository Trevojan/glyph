# Intake — `<invoke>`, validated by the series' configuration

> **The measured proposal for step 10 of the trail to the final Explorer**
> ([`.plan`](../.plan/README.md) §5), on the decision of 2026-10-15 alone
> ([`.decisions/`](../.decisions/README.md)): no blocking dependency may be present when
> an Order is executed; a path to a skill or to a predefined action comes validated from
> the EMS configuration; what the configuration does not resolve, the Explorer returns as
> `fix` before following the Order's spec; and the Explorer carries generic skills of its
> own to resolve an invocation faster. It opens no Order: step 10 follows step 2,
> [`INTAKE-EMS-JSON.md`](INTAKE-EMS-JSON.md). Measured at `5685486`.

## 1. What the engine emits today

| | |
|---|---|
| `<invoke>` | 68 times in the 119 declared sources, with `reads`, `species` and `depth`: what a composite command reads as it expands, never a skill or an action |
| a skill named in a source | `[skl'glyph-markup'[ins'…']]` emits `<skill imperative="true" binds="glyph-markup">`: the name binds, and nothing checks that it resolves |
| a predefined action | no command and no element |
| the Explorer's generic skills | none |

## 2. The questions

**K1. What an Order invokes a skill with.**
- a. the `[skl'name']` it already writes: `--bundle` in a series resolves its `binds`
  against the `invoke` of the `EMS.json`, and a name that does not resolve is `fix`
- b. a new form inside `<invoke>`, beside `reads`

**K2. What a predefined action is.**
- a. a named entry of the `invoke` of the `EMS.json` — its name and the path it runs —
  called by a command the vocabulary still has to name
- b. a template of the series

**K3. Where the Explorer's generic skills live.**
- a. in the `EMS.json` of `EMS-000`, *Generic*, which every Order of a series inherits
- b. inside the binary, as the basic stores are

**K4. When the check runs.**
- a. at `--bundle` only, so an Order with a blocking dependency is never emitted
- b. at `--bundle`, and again when the Harness follows the Order, as the decision words
  it: a configuration can change after an Order is emitted

**The session's recommendation:** K1 a, K2 a, K3 a, K4 b.
- **K1 a** validates what Orders already write.
- **K2 a** keeps actions where the rules already live.
- **K3 a** gives the generic skills the home the decisions gave the generic EMS.
- **K4 b** is the decision as worded, with the earlier catch added.
