# Glyph Language Support for VS Code

This local VS Code extension recognises `.pgml` and `.hgml`, highlights Glyph
syntax, formats documents, and verifies open documents with the repository's
own parser. It is editor support, not another engine: every diagnostic and
every token comes from `scripts/glyph-parser.js`.

## Diagnostics

Diagnostics refresh while editing. `fix` is an error, `ask` is information,
and `note` is a warning. A diagnostic that carries a source span is placed on
it; one without a span sits at the start of the document. The messages follow
the language VS Code is displayed in: pt-BR when it is Portuguese, en-EU
otherwise.

## Highlighting

Commands and `[/name]` closers, `ph-` placeholders, `[--template` calls, the
`[=` chain, quote and backtick literals, moods, the `R:` and `r-` return
markers, and the three fenced regions the lexer reads under another grammar:
`[raw]…[/raw]`, `[off]…[on]` and `[logic …]…[/logic]`. A literal ends where
the lexer ends it: its own quote, a `]`, and for a quote also the line end.

## Format Glyph source

Run **Format Document**. The formatter moves whitespace and nothing else: it
edits only the whitespace the lexer discards, so the formatted document has
the source's tokens, XML and diagnostics.

- A command that spans lines puts each nested command on its own line, two
  spaces deeper, and closes on its own line at its own depth.
- A run of closing brackets stays concatenated as written: `]]]`.
- A command on one line stays on it. One line break after an opener is how
  the author asks for that level to open up.
- Lines are never joined; every line that starts with a token is indented by
  its depth, and a line that starts with a close takes the depth of the
  command it ends. `[/name]` closes on its own line, as the burn writes it.
- Literal contents, prose, and the `[raw]`, `[off]` and `[logic]` regions are
  kept exactly.

The Orders under `.guidelines/.orders/EMS-001/` and their burns are already in
this layout, and formatting leaves them unchanged.

## Run locally

From the repository root, launch an Extension Development Host:

```powershell
code --extensionDevelopmentPath="$PWD\vscode-extension" .
```

Open a `.pgml` or `.hgml` file in that VS Code window. No `glyph.cmd` process,
package installation, or runtime dependency is needed. The extension reads the
parser and its three data stores from the neighbouring repository directories,
so keep this folder inside the Glyph repository.

## Verify

```powershell
npm run test:vscode-extension
```

`npm run check` runs the same test. It checks the language registrations, that
every grammar pattern compiles, the severity mapping and source spans, and,
over every `.pgml` and `.hgml` the repository keeps, that formatting holds the
XML and the diagnostics and that a second pass changes nothing.
