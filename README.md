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

### The app — nothing to install

**Double-click `glyph-engine-alias.html`.** That is all. It is built to open
over `file://`, with no server and no build step: the data is already embedded
in `scripts/glyph-data.js` precisely because `file://` blocks `fetch` of
`.json`.

All it needs is a browser.

> If the page comes up blank, see **After editing** below — it is almost always
> the cache. If that does not fix it, use the dev server.

### The command line — needs Node

```bash
node scripts/glyph-parser.js "[crit[ctx'the parser']]" --xml
```

Modes: `--xml` (default, the deliverable) · `--ast` (JSON inspection panel) ·
`--diag` (diagnostics only) · `--hgml` (the atomic burn) · `--expand` (what a
command is made of).

### `.hgml` — the atomic burn

Reduces everything to pure hieroglyphs: each composite replaced by its formula
until nothing decomposable is left.

```bash
node scripts/glyph-parser.js "[prob'timeout']" --hgml
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
node scripts/glyph-parser.js CRIT --expand
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

### The dev server

Useful when the `file://` cache gets in the way, or to open the app from another
device on the same network:

```bash
node scripts/serve-dev.js
```

Serves at `http://localhost:8731`. Nothing in the app depends on it.

---

## After editing

**Touched a `.js`?** `file://` does not revalidate `<script src>` on edit. Bump
`GLYPH_ASSET_VERSION` at the top of `glyph-engine-alias.html` and reload — that
is what it exists for.

**Touched `glyph-rules.json`, `glyph-templates.json`, `expansions.txt` or
`GLOSSARY.md`?** Run the build. Those are the sources;
`scripts/glyph-data.js` and `glyph-expansions.json` are the copies the engine
loads.

```bash
node scripts/build-templates.js
```

The build **refuses to generate** if the composition table has a cycle or an
undefined dependency, or if any command lacks a glossary entry. A silently
opaque command is how drift gets in.

---

## Verify

```bash
node scripts/test-corpus.js     # suite — 154 cases
node scripts/dag.js             # composition table — 0 cycles, 0 undefined
```

Both exit non-zero on failure, so they work in CI.

---

## Where things live

`/scripts` holds **JavaScript**; data, the app and the documents stay at the
root. The criterion is the file's kind, not who wrote it — which is why the
generated `glyph-data.js` (JS) sits in `/scripts` and the generated
`glyph-expansions.json` (data) sits at the root beside the other stores.

| file | role |
|---|---|
| `glyph-engine-alias.html` + `glyph-engine.css` | the app — interface only |
| `scripts/glyph-parser.js` | the core: lexer, tree, rules, emitters |
| `scripts/glyph-ui.js` · `glyph-moldes.js` | interface and forms (pt-BR) |
| `glyph-rules.json` · `glyph-templates.json` | data stores, hand-editable |
| `expansions.txt` | composition table: atoms and formulas |
| `scripts/glyph-data.js` · `glyph-expansions.json` | **generated** — do not edit |

## Documentation

| document | answers |
|---|---|
| [`GLOSSARY.md`](GLOSSARY.md) | **what** each command is — the normative reference |
| [`SIGNATURES.md`](SIGNATURES.md) | **how many** operands each one asks for |
| [`glyph-grammar.ebnf`](glyph-grammar.ebnf) | the syntax, formally |
| [`CHANGELOG.md`](CHANGELOG.md) | what changed and why |
| [`HGML_PLAN.md`](HGML_PLAN.md) | where this is going — the `.hgml` format |

The engine derives from `GLOSSARY.md`, not the other way round, and the suite
has checks (`X-01`, `X-14`) that fail if the two ever drift apart.

## Versioning — `a.b.c.d`

`a` frontend · `b` backend (the parser) · `c` business rules · `d` data and
constants. A digit that moves resets every digit to its right.
