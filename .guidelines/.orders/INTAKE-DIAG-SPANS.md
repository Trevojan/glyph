# Intake — a source span on every diagnostic

> **The measured proposal for issue #13**, which
> [`INTAKE-VSCODE-AUTHORING.md`](INTAKE-VSCODE-AUTHORING.md) §7 left open. It opens no
> Order: the Order opens with the answers to §4 once the open slot is free
> (`EMS-003/ORD-0001` holds it). Measured at `46f47e5`, engine 4.7.10.09, over the 485
> runs of the parse oracle that `npm run check:rust` exports
> (`rust/target/oracle-modules/parse.json`, 456 distinct sources).

## 1. What carries a span today

A gap carries `at: {s, e}` when its emitter passes a token. `G` in
`scripts/core/parser.js:44` reads it from its seventh argument. The envelope carries
`at` whenever the gap has one, and the VS Code extension
(`vscode-extension/extension.cjs:46`) underlines that range. Without `at`, the
extension puts the diagnostic at line 0, column 0.

| | |
|---|---|
| codes emitted by the oracle | 51 |
| codes that always carry a span | 5: `RetiredColon`, `UnmatchedOnMode`, `SlashInChain`, `BackslashMood`, `UnknownEmotion` |
| codes that never do | **46** |
| diagnostics emitted | 407, **49 with a span** (12%) |
| the most frequent without one | `UnfilledSlot` 107, `PlaceholderPending` 64, `UnknownCommand` 12, `MissingStructName` 12 |

The issue named three codes that carry a span. Five do now: `RetiredColon` and
`UnmatchedOnMode` gained theirs since.

## 2. What each emitter has in scope

| group | where it is raised | codes | what the span can be |
|---|---|---|---|
| **T**, the token loop | `parser.js` 147 to ~400, with `tk` in scope | `UnknownCommand`, `EmptyCommandName`, `FormerElementName`, `UnclosedRaw`, `UnclosedLogic`, `UnmatchedCloseBracket`, `UnmatchedCloseTag`, `DanglingChain` | the token. Passing `tk` is the whole change |
| **N**, the passes over nodes | `parser.js` 415 to 760 | `UnfilledSlot`, `PlaceholderPending`, `MissingStructName`, `MissingOperand`, `PartOutsideBlock`, `DeepInference`, `SingletonList`, `UnboundReference`, `EmptyTemplateDefinition`, `UndefinedTemplate`, `UnclosedOffMode`, `LooseKeyword`, `LooseCommandWord`, `LooseDots` | the node's `tok`, which every node holds |
| **R**, the rules | `rules.js`, over co-occurring nodes | `Rule:*`, nine ids in the oracle | one of two nodes, or both (§4 D2) |
| **P**, the templates | `templates.js`, on an invocation | `TemplateCycle`, `TemplateParamNotLiteral`, `TemplateUnknownParam`, `TemplateDefinedTwice`, `TemplateConstraint:*` | the invocation. A body from the store has no place in the source (§4 D3) |
| **L**, a logic block's body | `logic.js`, line by line | `UndefinedVariable`, `MissingConsequent`, `CapFloorNotice`, `EmptyLogicLine`, `DuplicateBinding` | the line, once `parseLogic` knows where the body starts. It reads the body as a string today |
| **D**, the document | `parser.js` 93 to 140 and 495 | `TruncatedLiteral`, `UnterminatedLiteral`, `MassAutoClose`, `DeepNesting` | the literal that runs off, the opener left unclosed, the deepest node (§4 D4) |

**What moves.** 77 of the 119 declared sources raise a diagnostic, and every one of the 77
raises at least one without a span, so their AST hash moves. No XML hash and no `.hgml`
hash moves, because neither carries a diagnostic. The oracle's `parse.json` moves, and
the Rust parser gives the same spans by the same rule.

## 3. What this leaves alone

- **The shape of `at`.** It stays `{s, e}`, in source offsets, as
  [`ast-schema.json`](../.sources/ast-schema.json) declares it. The schema already makes
  it optional and requires it to be well formed. Of its note, *"a coordinate that lies is
  worse than none"* is the rule each group's span answers to.
- **The message text.** Only the coordinate is added.

## 4. What the Order would decide

**D1. How far.**
- **a.** Every group, T, N, R, P, L and D, in one Order.
- **b.** T and N first, 22 codes and 269 of the 358 diagnostics that lack a span. R, P,
  L and D follow in an Order of their own.

**D2. A diagnostic about two nodes** (the pair rules, a duplicate binding).
- **a.** The span of the second node, where the conflict is written.
- **b.** The first node's span.
- **c.** One span from the first to the second.

**D3. A diagnostic raised inside a template's expanded body.**
- **a.** The invocation's span.
- **b.** None.

**D4. A diagnostic about the document** (`MassAutoClose`, `DeepNesting`, a literal that
runs off).
- **a.** The span of the culprit: the opener left unclosed, the deepest node, the
  literal from its quote to the end.
- **b.** None.

**D5. Which engine.**
- **a.** Both, in one Order. The 77 AST hashes move, and so does the oracle's
  `parse.json`. The `minor` digit moves.
- **b.** Rust only.

**The session's recommendation:** D1 b, D2 a, D3 a, D4 a, D5 a.
- **D1 b.** T and N cover 75% of the diagnostics that lack a span, and they need no new
  plumbing: the token or the node is already there. R, P and L each carry a question of
  their own, and D2 and D3 are two of them.
- **D2 a.** A reader fixes the second node, the one written against the first.
- **D3 a.** The body's text is not in the document, and the invocation is what the
  author wrote.
- **D4 a.** A coordinate at the start of the document is the absence this proposal
  removes.
- **D5 a.** The extension, the skill and the plugin all read the JS engine.
