# VS Code authoring support for Glyph

> A VS Code extension for `.pgml` and `.hgml`: file recognition, syntax
> highlighting, syntax verification and formatting, without starting
> `glyph.cmd`. It lives in [`vscode-extension/`](../../vscode-extension/README.md),
> written by the Regent with Copilot on 2026-10-27 and absorbed into this
> repository as an official feature at the Regent's request.

## 1. The goal

Make Glyph source easier to author directly in VS Code. A writer opens a
`.pgml` Order or an `.hgml` burn and gets highlighting and syntax verification
without starting the Glyph app.

The first release asked for file recognition, syntax highlighting and syntax
verification for both file types. Formatting joined it as an authoring
requirement.

## 2. What exists

- `.pgml` is the human-authored source. The AST is the source of truth; XML and
  HGML are projections.
- `.hgml` is the expanded, atomic Glyph form produced from the parsed tree.
- `glyph.cmd` starts the app; editing source files does not need it.
- The repository has a zero-dependency constraint for its JavaScript artefacts.

## 3. Delivered functionality

The extension uses VS Code's built-in extension APIs and one TextMate grammar:

1. Registers the `pgml` and `hgml` language IDs for `*.pgml` and `*.hgml`.
2. Highlights Glyph structure, command names and closers, placeholders,
   template calls, the chain, literals, moods, return markers, and the
   `[raw]`, `[off]` and `[logic]` regions, ending each literal where the lexer
   ends it.
3. Verifies documents with the repository's parser and shows its diagnostics,
   keeping `fix`, `ask` and `note` apart, on the source span when the
   diagnostic carries one, in the language VS Code is displayed in.
4. Formats documents through **Format Document**, editing only the whitespace
   the lexer discards: a command that spans lines puts each nested command on
   its own line with two-space indentation, a run of closing brackets stays
   concatenated, a command on one line stays on it, lines are never joined,
   and literal contents are kept exactly.

## 4. Boundary

The extension is editor support, not another Glyph engine. It does not
reimplement parsing, compile XML, burn HGML, provide Order snippets, or invoke
`glyph.cmd`.

It ships without runtime dependencies, lives in an isolated directory of this
repository, and is used locally; Marketplace preparation is deferred.

## 5. Acceptance

- Opening a `.pgml` or `.hgml` file selects its language mode.
- Glyph structure and the key source tokens are distinguishable through
  syntax highlighting.
- The parser's diagnostics appear in VS Code for both file types, with source
  locations when available and severities mapped without treating `ask` or
  `note` as `fix`.
- Formatting holds the XML and the diagnostics of every `.pgml` and `.hgml`
  the repository keeps, a second pass changes nothing, and the Orders of
  `EMS-001` with their burns are already in the layout.
- File recognition, highlighting and verification work without starting
  `glyph.cmd`.
- The extension introduces no runtime dependency into the Glyph engine.

`npm run test:vscode-extension` checks all of it except what only the editor
shows, and `npm run check` runs it. The fixture it was written against is the
Order Matrix [`.scope/generics/production.pgml`](../../.scope/generics/production.pgml).

## 6. Decisions

1. **Target editor: VS Code itself.** Confirmed by the Regent on 2026-10-27.
2. **Placement: isolated directory in this repository.** Confirmed by the
   Regent on 2026-10-27.
3. **Distribution: local-first.** Marketplace preparation is deferred.
   Confirmed by the Regent on 2026-10-27.
4. The verifier uses the parser's severity contract: `fix` is an error, `ask`
   is information, and `note` is a warning; the source span is shown when one
   is available.
5. **Layout: the one the repository's Orders already follow.** The rules in
   §3.4 are read from the 43 `.pgml` and `.hgml` sources the repository
   keeps: a run of closing brackets that starts a line is indented at the
   depth of the innermost command it closes, and a command written on one
   line is not opened up. Ratified by the Regent on 2026-11-02.

## 7. Open

- **Positions.** Of the engine's diagnostic codes, three carry a source span
  (`SlashInChain`, `BackslashMood`, `UnknownEmotion`); the rest show at the
  start of the document. Giving them spans is an engine change: it reaches
  the `GlyphAST` envelope and the snapshot.
