# Glyph

A shorthand command notation that describes a logical flow down to the smallest
detail. You write `[crit'the parser'][ctx'api/orders.py']`, the engine returns
structured XML to paste into a chat.

The design principle: **an empty slot does not block.** Missing information
becomes `<needs>` in the XML instead of an error — send it incomplete, get it
back filled in.

> **Language.** Everything that reaches the deliverable is English — the
> vocabulary, the definitions, the slot questions, the XML. The interface is
> pt-BR and stays that way.

---

## Run it

### The app — one click

**Double-click `glyph.cmd`.** It starts the server and opens the browser. That
is the whole procedure; there is still nothing to install and no build step.

Or, the same thing by hand:

```bash
node scripts/serve-dev.js
```

> **`file://` no longer works, and this is the one thing to know.** The app used
> to open by double-clicking `glyph-engine-alias.html`. That stopped when the
> module system moved to ESM: `glyph-engine-alias.html` loads the parser and the
> UI as `type="module"`, and a browser refuses a module over `file://` on CORS.
>
> Because the HTML and the CSS still load, the page draws and nothing responds —
> **it looks like a frozen app rather than a load error.** If you see that, you
> opened the file instead of serving it.

### The command line — needs Node

```bash
node scripts/glyph-cli.js "[crit[ctx'the parser']]" --xml
```

Modes: `--xml` (default, the deliverable) · `--ast` (JSON inspection panel) ·
`--diag` (diagnostics only) · `--hgml` (the atomic burn) · `--expand` (what a
command is made of) · `--from-xml` (the way back).

### `--from-xml` — the way back

The chain runs both ways since v1.2.3.00. `fromXML()` reads the emitter's own
output back into bracket source, which is what makes the XML panel in the app
editable rather than a display.

```bash
node scripts/glyph-cli.js "$(node scripts/glyph-cli.js "[crit'teste']" --xml)" --from-xml
```
```
[crit'teste']
```

It never throws: bad XML comes back as diagnostics, the way `parse()` answers
bad Glyph with gaps. Three things do not survive the trip and are pinned by
tests so none gets "fixed" silently — `[tpl:name]` always returns as the
`[--name` invocation, content appended past a template's declared params is
dropped, and text holding `' \` [ ]` is substituted rather than preserved.
`<needs>` written by `FRAMES`/`SLOTS` deliberately returns as *nothing* and is
regenerated: it is the engine's question, not the human's answer.

### `.hgml` — the atomic burn

Reduces everything to pure hieroglyphs: each composite replaced by its formula
until nothing decomposable is left.

```bash
node scripts/glyph-cli.js "[prob'timeout']" --hgml
```
```
[error
  'timeout'
  [ctx[/ctx]
[/error]
```

It is an **expansion, not a compression** — a composite is worth ~15
hieroglyphs and `[hyp]` reaches 97. The output is still valid Glyph, so it can
be fed back in.

```bash
node scripts/glyph-cli.js CRIT --expand
```
```
CRIT  [composite]  level 2
  formula: [CMP[CTX],[SPEC-CORE],[EVAL[ERROR]]]
  15 hieroglyphs: CMP CTX SPEC CORE REAL CORE CTX DIST SKL REF DEF SPEC CORE CTX ERROR
```

### Self-describing XML

`describe` makes the message carry its own semantics, so whoever reads it does
not need the Glyph vocabulary loaded:

```xml
<review means="A reading sweep looking for error or inconsistency, with no formal comparison.">
  <user-input>the diff</user-input>
</review>
```

Off by default — it changes the deliverable and costs about 59% more XML.

### The server

Not development-only any more: it is how the app is opened, for the reason above.
`glyph.cmd` is a two-line wrapper around it.

```bash
node scripts/serve-dev.js            # serves and opens the browser
node scripts/serve-dev.js --no-open  # serves only
```

Serves at `http://localhost:8731`, and reaches another device on the same
network.

---

## After editing

**Touched a `.js`?** Just reload. The server sends `Cache-Control: no-store`, so
there is nothing to bust — `GLYPH_ASSET_VERSION` in `glyph-engine-alias.html` is
a leftover from the `file://` days and no longer earns a bump.

**Touched anything in `.guidelines/`** — `rules.json`, `templates.json`,
`expansions.txt` or `GLOSSARY.md`? Run the build. Those are the sources;
`scripts/glyph-data.js` and `.guidelines/expansions.json` are the copies the
engine loads.

```bash
node scripts/build-templates.js
```

The build **refuses to generate** if the composition table has a cycle or an
undefined dependency, or if any command lacks a glossary entry. A silently
opaque command is how drift gets in.

---

## Verify

```bash
node scripts/test-corpus.js     # suite — 173 cases
node scripts/dag.js             # composition table — 0 cycles, 0 undefined
```

Both exit non-zero on failure, so they work in CI.

---

## Where things live

Three places, by kind. `/scripts` holds **JavaScript**. `.guidelines/` holds
everything **normative** a human edits — the documents and the data stores. The
root keeps only the **entry points**: this file, the changelog and the app.

The criterion is the file's kind, not who wrote it — which is why the generated
`glyph-data.js` (JS) sits in `/scripts`, while the generated `expansions.json`
(data) sits in `.guidelines/` beside `expansions.txt`, the source it is compiled
from. Same base name, different extension: the `.txt` is written, the `.json` is
built.

| file | role |
|---|---|
| `glyph-engine-alias.html` + `glyph-engine.css` | the app — interface only |
| `scripts/glyph-parser.js` | the core: lexer, tree, rules, emitters |
| `scripts/glyph-ui.js` · `glyph-moldes.js` | interface and forms (pt-BR) |
| `scripts/serve-dev.js` | static server, for driving the app in a real browser |
| `.guidelines/rules.json` · `templates.json` | data stores, hand-editable |
| `.guidelines/expansions.txt` | composition table: atoms and formulas |
| `.guidelines/history/` | superseded records, kept for provenance |
| `scripts/glyph-data.js` · `.guidelines/expansions.json` | **generated** — do not edit |

## Documentation

| document | answers |
|---|---|
| [`GLOSSARY.md`](.guidelines/GLOSSARY.md) | **what** each command is — the normative reference |
| [`SIGNATURES.md`](.guidelines/SIGNATURES.md) | **how many** operands each one asks for |
| [`glyph-grammar.ebnf`](.guidelines/glyph-grammar.ebnf) | the syntax, formally |
| [`CHANGELOG.md`](CHANGELOG.md) | what changed and why |
| [`XML_REFERENCE.md`](.guidelines/XML_REFERENCE.md) | **bracket → XML**, element by element — checked by the suite |
| [`HGML_PLAN.md`](.guidelines/HGML_PLAN.md) | where this is going — the `.hgml` format |

The engine derives from `GLOSSARY.md`, not the other way round, and the suite
has checks (`X-01`, `X-14`) that fail if the two ever drift apart.
`XML_REFERENCE.md` is held to the emitter the same way (`D-03`, `D-06`): its
tables are parsed and every row compared against `elName(classify(x))`, so the
reference cannot quietly fall behind the engine.

## Versioning — `app.front.rules.content`

`app` the application as a whole · `front` the interface · `rules` the business
rules · `content` data, constants and where things live.

**No digit resets any other.** Digits move independently and keep their place —
touching the interface alone must not discard the number the engine earned. See
the versioning note at the top of [`CHANGELOG.md`](CHANGELOG.md) for why the
earlier resetting scheme was dropped.
