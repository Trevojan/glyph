# Bundle target — what production-level output means here

> Draft. The layer contract is settled; four decisions marked **[Regent]** are
> not, and the golden that ratifies this document does not exist yet.

A **bundle** is what the engine emits when the deliverable is not one message
but an agent: a set of files, each with a different consumer, generated from one
Glyph source.

This is not the `.xml` deliverable and does not replace it. `buildXml()` emits a
*serialisation of the bracket form* — every construct round-trips through
`fromXML()`, and `XML_REFERENCE.md` holds it to that. A bundle is a **projection**:
one-way, lossy by design, shaped by its consumer rather than by the source tree.
The precedent is `toHGML()`, which is also one-way and also not `fromXML()`-able.

---

## 0. Why a compiler and not a YAML file

The honest defeater first: for a layer that is written once and read forever,
bracket syntax adds nothing and costs a parser. If that were all a bundle is,
this document should not exist.

What justifies it is a defect class that no single declarative file removes.
In the production prompt this target was drawn from, `<tool><parameters>` holds
a JSON Schema — and that same schema is registered with the Harness, outside the
prompt. **Two places, one truth.** Every parameter change needs both edited, and
eventually one is not.

So the rule that decides what belongs in a bundle:

> A layer earns Glyph when **one source must project into two or more formats
> that cannot be diffed against each other** — or when authoring frequency is
> high enough that typing cost matters.

**Consequence:** static environment configuration does not earn it. A list of
paths read by a sandbox is a list of paths. That is YAML, and a bundle may
reference it rather than generate it.

---

## 1. The six layers

| Layer | Question it answers | Consumer | Projection |
|---|---|---|---|
| **L0** identity | who this agent is, and what it is **not** | model | agent body |
| **L1** scope | what exists; what may be touched | model **and** sandbox | body + permissions |
| **L2** tools | what may be invoked, in what shape | Harness (registration) **and** model (policy) | frontmatter + body |
| **L3** procedure | in what order; retry budget; named terminal states | model | body |
| **L4** output | what the agent is obliged to emit | parser / validator | JSON Schema |
| **L5** gate | what is checked, by whom, mechanically | CI — **never the agent** | runner config |

**L0 and L3 are mandatory.** An agent with no identity is a prompt; an agent
with no procedure and no named terminal state either loops or improvises an
exit. **[Regent]** — confirm, or name a different minimum.

**L2 makes L4 mandatory.** If the agent can invoke anything, the shape of what
it returns has to be checkable, or the Harness is parsing prose.

---

## 2. Three invariants

**I1 — one source, N projections.** No emitted file is edited by hand. Every
generated artefact carries `GENERATED — do not edit` and a diff in one is a gate
failure, not a review item. Without this, six artefacts per role across N roles
drown the review capacity that `ORCHESTRATION.md` §0 names as the binding
resource.

**I2 — enforcement never lives only in the prompt.** `forbidden_paths` in an XML
document is a *request to the model*. The prohibition is the sandbox. L1 and L5
therefore emit two faces each — the declarative one so the model understands,
and the executable one so the environment prevents. **A layer with only its
declarative face is marked `applied: false` and the validator says so.** An
unenforced rule that reads as enforced is worse than an absent one.

**I3 — the gate is never self-attested.** The production example this target was
drawn from has the agent that wrote the code tick "coverage maintained at 100%".
`ORCHESTRATION.md` §2.1 (F6) and §4 forbid exactly that. **In this dimension the
existing model is stricter than the example and is not lowered to match it.**
Whatever is machine-checkable in L5 runs outside the model; what remains is a QA
risk opinion, never a producer's verdict.

---

## 3. How a source declares a layer

With `[section'name']` and a reserved name. **No new command enters the core** —
`SECTION` already exists in `STRUCT`, already parses, and already requires a
literal name.

```
[section'identity'[core'you review billing code and nothing else']]
[section'scope'[lim'src/modules/billing/ and its tests']]
```

Reserved names live in `.guidelines/sections.json`, mapping name → layer. A
section whose name is not reserved is a diagnostic, not a guess.

**Nesting ceiling: 3.** XML helps because it *delimits*, not because it is XML.
Depth past three costs tokens and attention and buys nothing. The engine already
proved the cost is real — indentation was `O(depth²)` until `1.0.9.1`.

---

## 4. Worked example — what `flow.pgml` is missing

The file exists today in `_ORBITAL/Docs/.guidelines/`. Its XML is one flat
`<instruction>` holding twenty `<user-input>` prose strings, and its author
simulated section headers with `[nt'alvo']`, `[nt'partida']`, `[nt'percurso']` —
which is the clearest possible evidence that the language wanted sections and
did not have them.

The same content, declared:

```
[section'identity'[core'follow logical structures to finish tasks']];
[section'scope'[tgt'TEAM: step 7 of 9, ends when all modules complete']
               [lim'never review a phase without citing its module objective']];
[section'procedure'[ins'A: starts a task']
                   [cond'A→B: milestone — checklist the task architecture']
                   [ins'B: set problem, effort, resources, actions, goal']];
[section'gate'[rev'technical review of the flow result']
              [scru'formal scrutiny of the execution logic']];
```

Nothing about the vocabulary changed. What changed is that a consumer can now
tell an identity from a limit from a step from a check — which is the whole
distance between an instruction and a system prompt.

**[Regent]** — the `[cond'A→B: …']` lines encode failure transitions between
steps. Whether those belong to L3 (procedure) or L5 (gate) is a real fork:
L3 says "the model decides"; L5 says "something outside the model checks". They
read the same on the page and behave differently in production.

---

## 5. What the validator must reject

`glyph-check` is written **before** any emitter. An engine that emits four
formats and validates none produces garbage faster.

| # | Rejected |
|---|---|
| 1 | a section name not in `sections.json` |
| 2 | a mandatory layer absent (L0, L3) |
| 3 | a tool declared with no L4 output contract |
| 4 | a procedure with no named terminal state |
| 5 | a procedure with a retry budget that is not a number |
| 6 | a path in L1 outside the declared root |
| 7 | an L5 check whose verifier is the agent itself (I3) |
| 8 | nesting deeper than 3 |
| 9 | an L2 pair — registration and policy — that disagrees |
| 10 | a generated file whose banner is missing or whose content was hand-edited |

**Acceptance is a mutation test:** break ten things in the golden, catch at
least nine. Zero catches means the validator is decorative.

---

## 6. What is deliberately not copied

- **The self-attested gate** — I3.
- **`<step sequence="N">` as narrative.** Numbered prose diverges from what the
  code does by the third week. L3 is generated from the same declaration that
  names the terminal states, or it is not generated at all.
- **Decorative nesting** — §3.
- **A fourth format for its own sake.** `.pgml` is the source and `.hgml` is the
  atomic burn; both already have a consumer. No format enters a bundle without
  one that parses it.

---

## 7. Open — **[Regent]**

1. **Minimum layers.** L0 + L3, or something else?
2. **Failure transitions** — L3 or L5? (§4)
3. **Role roster.** `.guidelines/targets.json` currently lists `dv/qa/po/da/custom`,
   taken from `_ORBITAL/Docs/.guidelines/TEAM/`. Is that the roster, or does the
   bundle target something narrower first?
4. **What "production level" means for `_ORBITAL`.** This is the P0 gate itself
   and cannot be inferred from here: the golden is ratified by reading it, and
   the reading is the Regent's.

---

## 8. Status

Nothing in this document is implemented. It exists so the golden can be written
against something, and so `glyph-check` has a specification before it has code.
Order is fixed by `ORCHESTRATION.md` §8 — **the gate comes before the topology**,
which here means the validator comes before the emitters.
