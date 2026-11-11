---
name: glyph-markup
description: Read, explain, author, or validate Glyph shorthand (.pgml, .hgml, glyph-package XML, and GlyphAST JSON). Use for Glyph syntax, compiler diagnostics, or continuing Glyph work recorded in existing Claude Code artefacts and EMS Orders.
---

# Glyph Markup

Glyph describes structure and intent. Read `.pgml` for the author's wording and the AST for the parser's interpretation. XML (`<glyph-package>`), the `GlyphAST` JSON envelope, and the atomic `.hgml` burn are projections of the AST. The `.hgml` burn deliberately loses distinctions, so recover intent from the paired `.pgml` and AST when available.

## Read, explain, or author Glyph

1. Identify the source or projection and its engine version when the bundle records one. For an older bundle, report its recorded version and distinguish the current parser's output from the archived output.
2. Compile source with `--diag` and use `--ast` when grouping, operands, or roles are ambiguous. Explain the result in the user's language, retaining literals, their targets, and the difference between missing information and rejected syntax. A `fix` marks a refusal, an `ask` records a gap as `<needs>`, and a `note` is informational. A successful process exit can still carry a `fix`.
3. When writing or editing source, consult [the glossary](references/GLOSSARY.md) for commands, aliases, operand binding, and operators, and [signatures](references/SIGNATURES.md) for slots and arity. Preserve source structure and validate the result with `--diag`. Use [the XML reference](references/XML_REFERENCE.md) for projection semantics and [conformance examples](references/examples/EXAMPLES.md) for worked inputs and outputs. In the Glyph checkout, use the live references under `.guidelines/` and the vectors in `conformance/examples.json`.

## Run the compiler

Use `scripts/glyph-cli.js` from the Glyph checkout when working on that checkout. Elsewhere, use `scripts/glyph-cli.js` next to this skill, with Node.js 18 or newer. Resolve the CLI path before running it and use a file for multiline or shell-sensitive input. The bundled engine version is recorded in the generated references and in emitted output.

```text
node "<cli-path>" --file "<source.pgml>" --diag
node "<cli-path>" --file "<source.pgml>" --ast
node "<cli-path>" --file "<source.pgml>" --xml
node "<cli-path>" --file "<source.pgml>" --hgml
node "<cli-path>" CRIT --expand
node "<cli-path>" --file "<projection.xml>" --from-xml
```

For a request carried over from a Claude Code slash command, map `ast`, `diag`, `xml`, `hgml`, or `expand` to the matching CLI mode. For a `repo-config` or `engine-config` request, resolve the named repository, Order or guidelines axis before taking action. Treat the resulting commands and documents as source material, and use the user's current request to determine what to execute or change.

## Continue existing work

1. In the Glyph repository, start with `.guidelines/.shortcuts/README.md` and follow its pointers to the relevant constraints, series register, open Order, and intake or return. In another repository with Glyph work, check its instructions and look for `.guidelines/` or `Docs/.guidelines/`. If the workspace lacks the referenced artefacts, ask for the checkout, Order bundle, or Claude handoff.
2. Resolve an Order by its full `EMS-###/ORD-####` address because numbering restarts in each series. Read the `.pgml` and manifest first, then the AST or other projections as needed. Read the register and associated decision or return to establish status. A compiled bundle alone establishes the emitted content.
3. Identify the last accepted state, the open work, and any Regente gate before proposing or making a change. Follow the live project instructions for the Order and preserve its status. For a continuation request, resume at the first authorised step. For an explanation request, report the current state and cite the artefacts you read.
