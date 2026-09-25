# Preliminary intake — the Rust ladder, audited against the engine it ports

> **The ladder audited here is not the plan.** On 2026-09-24 the Regent set a
> new direction — a small Rust app that eats the JS engine's territory, not a
> port in lockstep — commissioned by the spec of EMS-001,
> [`EMS-001.pgml`](EMS-001/EMS-001.pgml), and summarised in
> [`BRIEFING-2026-09-24.md`](BRIEFING-2026-09-24.md). The measurements below stand.
>
> **Not an order.** An audit of the migration plan Opus 5.5 structured for the
> Regent — `GLYPH-DIRECTION.md`, `DECISIONS.md`, `LEDGER.md`,
> `INPUT-PROTOCOL.md` in `~/Downloads/corpus-ledger/` and `~/Downloads/ladder.toml`,
> dated 2026-09-23/24 — and the Regent's answers of 2026-09-24, recorded in
> [`.decisions/`](../.decisions/README.md). The brief: granularity is *wanted*,
> so nothing is merged for its own sake; what is hunted is **redundancy and
> duplication**. The revised ladder is [`.plan/ladder.toml`](../.plan/ladder.toml),
> checked by `scripts/ladder.js`. Engine 3.5.8.06, measured 2026-09-24.

## 1. The engine the ladder ports — measured first

| surface | today | ported by |
|---|---|---|
| core | 13 ESM modules in `scripts/core/`, ~3 700 lines, largest 595, zero cycles (`seam-graph.js`) | M07a–M10d, one crate each |
| acceptance | `test-corpus.js`, 33 buckets; 114 declared sources hashed in `corpus-snapshot.json`; `conformance/`: 5 hand-derived goldens, 5 authored examples | M01 (the oracle) |
| diagnostics | 36 codes in the core, ~13 in the inverse and validator, 26 rules in `rules.json`, severities `fix`/`ask`/`note`. **No diagnostic carries a source position**; tokens carry UTF-16 spans, the `full` AST carries `at` | M09; M02b.T04 |
| stores | `expansions.txt` (120 commands), `rules.json`, `templates.json`, `GLOSSARY.md` → `build-templates.js`; they travel as one context (`createContext`) | M07 |
| projections | XML (+ describe), `GlyphAST` envelope with a double FNV-1a `ck`, `.hgml` burn with blends, `fromXML`, `fromAST` | M10a–M10d |
| CLI | `--ast --xml --diag --expand --hgml --from-xml --file --bundle --out` | M11 |
| tools | `glyph-check` (AST schema), `glyph-diff`, `glyph-trace`, `glyph-zip` (the ORD bundle) | M10e–M10h |
| browser app — the MVP | `glyph-engine-alias.html` + `glyph-ui.js` + `glyph-moulds.js`, on the JS core; calls 12 core functions | stays JS; M11b offers the WASM core beside it |
| skill and plugin | `build-skill.js` ships the engine as readable source; `commands/`, `glyph-plugin.js` | stay JS (declared scope) |
| gates | `build-templates --check`, `build-skill --check`, `check-globals`, `dag.js`, `seam-graph --check`, `crate-graph --check`, `ladder --check` | stay JS |

## 2. The ladder as a graph

The draft holds: 24 modules, no cycle, every premise grounded by the module or
an ancestor. It carried four implied edges (`M07→M02`, `M12→M03`, `M18→M04`,
`M23→M13`) and one costly one, `M06 → M03`, which put an editor spike ahead of
every crate. The revision has 38 modules; `M06` depends on `M02` and `M04`.
`M06` is started ahead of both, by the Regent's instruction — the one thing
it waits on is ADR-001's signature.

## 3. Facts the draft states that are not true of this repository

| draft says | measured | effect |
|---|---|---|
| parser is 3 571 lines | 13 modules | the crates follow them, §7 |
| P01: 102 snapshot + 5 goldens | right on the goldens; the 31 buckets of JS-coded assertions are outside every JSON, and 13 diagnostic codes were outside the 102 sources — 8 of them without any test | 12 sources declared (`ORACLE_COVERAGE`); they found 2 undeclared node shapes in `ast-schema.json`, now declared |
| M02.T04: resolve SCRU, QST, H-09 | closed; all 120 commands burn and re-parse with no `fix` | task removed |
| `ems.js`, `audit_corpus.py`, `audit/baseline.json`, `scripts/ladder.py` | not on this machine | `ladder.py` is `scripts/ladder.js`; P11 names its prototype as absent |
| M10.T04 PGML formatter | `fromAST` is the canonical printer | one module, M10d |
| the grammar: M02 writes `SPEC.md` | `.guidelines/glyph-grammar.ebnf` exists and stopped at v1.3.0.0: no `[raw]` fence, no `[off]`/`[on]`, no `R:`/`r-`, no closed form `[x[/x]`, no comma between elements, `]` mandatory where the engine auto-closes | M02 brings the existing file up to the engine |

## 4. Redundancy and duplication

| id | the two places | resolution |
|---|---|---|
| R1 | M04's ADR/DC register · `.decisions/` + `.constraints/` · `corpus-ledger/DECISIONS.md` | an ADR is a `.decisions/` row, a DC a `.constraints/` row; the Regent signs (§8) |
| R2 | M02's `SPEC.md` · `glyph-grammar.ebnf` | M02 updates the existing grammar |
| R3 | M01's export into `conformance/` · the spec-derived `conformance/` (lock T5) | the oracle is written on demand (`test-corpus.js --export-oracle`, default `rust/target/oracle/`), never committed; `conformance/` stays the specification |
| R4 | M13.T05 snippets · M15.T04 the snippet library | all snippets in M15 |
| R5 | M10.T04 formatter · M10.T05 inverse | one module, M10d |
| R6 | M16's ORD (`<EMS>.<agent>`) · the repository's ORD (`ORD-####`, `ORD-yyyy-mm-dd-nn`, the `--bundle`) | open, by the Regent's choice: *"sem problemas por enquanto"*. §10 maps it |
| R7 | M17 registry · `INTAKE-VIRTUAL-PATH` · `.shortcuts/` · G-01 | M17.T01 decides G-01 before building |
| R8 | "template", six meanings | named: template, mould, sample, Order Matrix, snippet, layout (§11) |
| R9 | M05 bench · `INTAKE-RUST` §1 | M05 commits the bench; machine profiling moves to M20 |

## 5. Capability the draft would lose

| id | what | resolution |
|---|---|---|
| L1 | the browser app, when M11 retired the JS | the JS is not retired (M11d): the app keeps its core; M11b offers WASM beside it, behind one switch |
| L2 | the skill's readable engine | declared scope: the skill keeps the JS |
| L3 | `glyph-diff`, `glyph-trace` | M10f, M10g — `trace` is what LSP hover stands on |
| L4 | `--bundle`, `glyph-zip` | M10h, M11 |
| L5 | the plugin | stays JS, with the skill |
| L6 | the JS gates | stay JS; `crate-graph.js` and `ladder.js` join them |

## 6. Where the structure fights Rust

| id | finding | status |
|---|---|---|
| X1 | five `_ORBITAL` layers over thirteen measured seams | 20 crates in `rust/`, one per module and tool; `crate-graph.js` refuses an arrow the JS core does not have |
| X2 | three mutable global stores; loose opts fall back store by store, so a caller's templates meet the process's rules | `createContext`: frozen, no fallback, byte-identical on 16 sources × 3 projections × 2 modes and on the whole corpus (CX-01); CX-02 and CX-03 fail on the previous core. The formula parse gets a context holding only the composition table. Time: equal to the loose path, 5.8 ms for 3 Orders × 3 projections |
| X3 | the parser hands itself to the template expander | measured: `templates.js` imports no parser; `glyph-templates` sits below `glyph-parse`, `parse` passed in |
| X4 | `ck` = two 32-bit FNV-1a | ported as is (M10b); a `u64` is a format change |
| X5 | JS spans are UTF-16 | the oracle's tokens carry them; M08 compares in UTF-16 |
| X6 | PIN added during the port | enters the stores and the JS first (M16.T01) |
| X7 | the lossless tree has no oracle | its test is the round trip to source (M09) |
| X8 | diagnostics have no position | the LSP needs one; JS first (M02b.T04) |
| X9 | `compileRules` caches onto the store object; a copy carries the original's compiled rules | the Rust keeps compiled rules in the context (M09b) |
| X10 | the snapshot projects every case with the repository's stores, ignoring a case's own `opts` | M02b.T02 — it moves the T-cases' hashes, so it is a decision |

## 7. The workspace

`rust/Cargo.toml`, edition 2024, version `0.0.0` until the port produces the
engine's bytes. `npm run check` runs `crate-graph.js` (Node only, no cargo);
`npm run check:rust` writes the oracle at the commit under test and adds
`cargo test`. No external crate yet.

| crate | oracle |
|---|---|
| `glyph-util` `glyph-vocab` `glyph-version` `glyph-stores` `glyph-lex` `glyph-logic` `glyph-templates` `glyph-rules` `glyph-parse` `glyph-xml` `glyph-envelope` `glyph-burn` `glyph-inverse` | the core module of the same seam, one each |
| `glyph-schema` `glyph-diff` `glyph-trace` `glyph-bundle` | `glyph-check.js`, `glyph-diff.js`, `glyph-trace.js`, `glyph-zip.js` |
| `glyph-cli` (binary `glyph`) | `glyph-cli.js` |
| `glyph-wasm` | the page's 12 calls, on the corpus |
| `glyph-lsp` | none — new capability |

## 8. The Regent's answers, and what they leave open

Recorded with his words in [`.decisions/`](../.decisions/README.md) under
2026-09-24; the ADR norm is also a row of [`.constraints/`](../.constraints/README.md)
and is task M04.T04 verbatim.

Open, for the Regent:

| id | question | why it is his |
|---|---|---|
| O1 | **"the skill keeps the JS" and the draft's JS retirement cannot both hold.** The revision keeps the JS as reference, skill payload and app core, and runs both engines in lockstep (M11d): every change to the language lands twice, checked by the differential test. The alternative — a skill that ships `.wasm` under Node — would redefine the skill | scope |
| O2 | the browser app: stays on JS with WASM beside it (M11b's switch), or moves to WASM once M11b passes | the MVP |
| O3 | M18 bridges to `call-team`, a skill of the Orbital team system — a second product's contract inside Glyph's ladder | scope; *"se algum for de outro produto, levante"* |
| O4 | the three measured defects of `.plan` §3 — fix in JS before the port, or pin as behaviour the port reproduces | the deliverable |
| O5 | the snapshot honouring a case's own `opts` (X10) | moves hashes |
| O7 | the depth threshold of §9.2 — the numbers `crate-graph.js` would enforce | the dependency norm |
| O8 | the renames of §11.3 — the glossary fix moves every AST envelope; the others move a diagnostic, a store checksum, the empty-source XML, or a key on disk | emitted documents |
| O9 | two more uses to name: the vocabulary category `molde`, and *modelo* as data or design model outside the app (§11.1) | vocabulary |
| O10 | the spelling residue of §12: `<skeptic>` in the emitted XML, and the API names `tokenize`, `serializeAST` | emitted documents; the public face |

## 9. Dependencies — measured before adopted

The rule, in the Regent's words (2026-09-24, [`.decisions/`](../.decisions/README.md)):
what is refused is *"emprestar excessivamente funções de terceiros e até
'quarteiros' e 'quinteiros', tal qual Python, porque isso gera peso
desnecessário de build e arrumar bugs internos leva dias"*; what is accepted is
*"a base que não precisamos reinventar"*, **vendored**. The criterion is the
transitive tree, not authorship.

### 9.1 The trees, measured

Each crate alone in a scratch project, Windows host, cargo 1.88, 2026-09-24.
**crates** and **depth** come from `cargo tree -e normal,build` (depth 1 is the
crate itself; `serde`'s 4 is the `syn`/`quote`/`proc-macro2` macro chain).
**vendored lines** counts every `.rs` of every package `cargo metadata`
resolves, all platforms — what `cargo vendor` would copy. **build** is a clean
debug build on this machine.

| crate | proposed for | crates | depth | vendored `.rs` lines | build |
|---|---|---|---|---|---|
| `tower-lsp-server` + `tokio` | M12 (draft) | 52 | 6 | 781 159 | 17s |
| `tower-lsp` + `tokio` | M12 (draft) | 78 | 13 | 903 711 | 22s |
| `lsp-server` + `lsp-types` | M12, alternative | 19 | 5 | 212 035 | 13s |
| `serde` (derive) | stores, envelope | 7 | 4 | 118 823 | 6s |
| `serde` + `serde_json` | JSON in and out | 11 | 4 | 160 930 | 6s |
| `miniserde` | alternative | 8 | 4 | 87 455 | 5s |
| `nanoserde` | alternative | 2 | 2 | 9 695 | 2s |
| `wasm-bindgen` | M11b | 12 | 5 | 118 420 | 9s |
| `wasm-bindgen-cli-support` | M11b — the build tool, version-locked to it | 42 | 8 | 539 294 | — |
| `proptest` | M08, M09 (draft) | 26 | 5 | 1 357 542 | 8s |
| `quickcheck` | alternative | 13 | 6 | 344 344 | 5s |
| `quickcheck`, no default features | alternative | 5 | 4 | 157 305 | 2s |
| `rowan` | M09 lossless tree | 7 | 3 | 32 277 | 2s |
| `clap` (derive) | M11 CLI | 21 | 6 | 463 527 | 6s |
| `lexopt` | alternative | 1 | 1 | 2 423 | 1s |
| `notify` | M17 watcher | 13 | 6 | 846 339 | 3s |
| `tauri` | M22 (draft) | 236 | 16 | 7 424 631 | 75s |
| `wry` + `tao` | the native window (EMS-001, ORD-0014) | 78 | 12 | 5 259 057 | 50s |
| `candle-core` + `candle-transformers` + `tokenizers` | M20 (draft) | 143 | 10 | 2 576 927 | 59s |
| `llama-cpp-2` | M20 (draft) | 54 | 7 | 1 200 029 | **fails here**: needs libclang and cmake; bundles 730 000 lines of C/C++ |

The Glyph JS core, for scale: ~3 700 lines.

### 9.2 Classified against the criterion

| crate | reading | proposal — **none ratified** | cost of the proposal |
|---|---|---|---|
| `tower-lsp(-server)` + `tokio` | **continent.** An async runtime brought for a server that answers one editor over stdio; 52–78 crates, depth 6–13. Written here so M06 does not discover it | `lsp-server` + `lsp-types`, vendored: synchronous, the transport rust-analyzer itself uses, 19 crates, depth 5. It brings `serde` and `serde_json` — into `glyph-lsp` only | adopting it: the M03 spike as planned. Writing our own JSON-RPC over stdio plus the ~15 LSP messages Glyph uses: ~1 500 lines, one to two weeks, and every future LSP method is ours to add |
| `serde`, `serde_json` | **base**, shallow (7–11 crates, depth 4, the depth being the macro chain) — but the core does not need it | the core writes its JSON by hand, as the JS does, because it must equal `JSON.stringify` byte for byte; the stores become tables in `build.rs`; reading JSON (`glyph-schema`, `fromAST`) is one small reader in `glyph-util`. `serde_json` stays confined to `glyph-lsp`, through `lsp-types` | own reader: ~300 lines, two to three days, tested against `JSON.parse` on the oracle. `nanoserde` instead (2 crates, 9 695 lines): an hour |
| `wasm-bindgen` | **continent by its tool**: the crate is 12 crates, depth 5, but it only works with `wasm-bindgen-cli` at the same exact version — 42 crates, depth 8 — in every build | a text-only boundary by hand: the twelve calls already take and return text, and `parse`'s tree can cross as JSON. Rust exports `alloc`, `free` and the twelve functions over `(ptr, len)`; the page decodes with `TextDecoder` | ~80 lines of JS glue and ~150 of Rust, two to three days |
| `proptest` | **continent** for a test tool: 26 crates, 1.36 M vendored lines (it pulls `tempfile`, and with it `windows-sys`) | own generator: a xorshift source and a loop; the oracle already supplies the realistic cases, and "never panics, always lossless" needs no shrinking. `quickcheck` without default features (5 crates) if shrinking is ever wanted | ~200 lines, one to two days |
| `rowan` | **base**: the lossless red-green tree, 7 crates, depth 3, 32 000 lines | adopt, vendored | an hour to vendor; our own tree instead is ~500 lines and about a week |
| `clap` | **continent** for reading `argv`: 21 crates, depth 6, 463 000 lines | by hand, as `glyph-cli.js` does in ~25 lines; `lexopt` (1 crate) if it grows | hours |
| `notify` | **not needed**: 13 crates, depth 6, bindings for every OS | the editor already reports file changes (`didChangeWatchedFiles`), and the registry checks a file's sha when it reads it | zero |
| `tauri` | **continent**: 236 crates, depth 16, 7.4 M vendored lines | the standalone shell is the browser app the Regent already calls the MVP, on the M11b core | zero beyond M11b |
| `candle` + `tokenizers` / `llama-cpp-2` | **continent**, and `llama-cpp-2` does not build without a C++ toolchain: 143 crates and 2.6 M lines, or 730 000 lines of C/C++ plus libclang and cmake | the model runs as its own process — a local `llama.cpp` server or Ollama, installed beside Glyph, never inside its build; Glyph speaks HTTP to `localhost` and reads the token probabilities the server returns | an HTTP/1.1 client over `std::net`, ~150 lines, plus the JSON reader above: two to three days |

**The threshold** is the Regent's, and the data has no clean gap to hand him:
`lsp-server` stops at 19 crates and `clap` starts at 21. A line at *depth ≤ 5
and ≤ 20 crates* does **not** reproduce the classification above: it admits
`lsp-server`, `serde`, `serde_json`, `rowan` and `nanoserde`, but also
`wasm-bindgen` (12 crates, depth 5), which this section calls a continent by its
tool, and it would admit `serde` into the core, where the proposal writes JSON
by hand. A line fitted to this table that still disagrees with the table is
not a criterion; an independent review recommends not ratifying it. Today
`crate-graph.js` enforces only that an external crate is vendored.

### 9.3 Vendoring, in practice

`cargo vendor rust/vendor` and the four lines it prints, committed as
`rust/.cargo/config.toml`:

```toml
[source.crates-io]
replace-with = "vendored-sources"

[source.vendored-sources]
directory = "vendor"
```

Builds then run `--offline --locked`: nothing is fetched, and a crate that is
not in `rust/vendor/` does not resolve. `cargo vendor` over a manual copy,
because it keeps each package's `.cargo-checksum.json` — cargo refuses a
vendored file that changed — and updating is one command instead of a diff by
hand. The checksum has a consequence the Regent's *"arrumar bugs internos"*
touches directly: a fix of ours inside a vendored crate does not build. It goes
in `rust/patches/<crate>/` through `[patch.crates-io]`, so the difference from
upstream stays visible and survives the next `cargo vendor`.

**What a security fix upstream costs** — the real price, measured on the
`serde` stack: a patch-level bump (`serde` 1.0.219 → 1.0.228, `serde_json`
1.0.140 → 1.0.145) changes **4 560 lines in 44 files** of `rust/vendor/`, and
brings a crate that was not there before (`serde_core`). The steps:

1. **learn of it** — nothing tells a vendored tree. RustSec's advisory database
   is a git repository of TOML files; a zero-dependency Node check comparing it
   with `Cargo.lock` is ~100 lines, and needs the database pulled periodically.
   Without it, the fix is found by accident;
2. `cargo update -p <crate> --precise <version>`, then `cargo vendor`;
3. read the diff — thousands of lines for a patch release, as measured — and
   any crate that newly entered passes the §9.1 filter again;
4. `npm run check` and `npm run check:rust`, one commit.

Hours when the fix is a patch release; days when it moves an API or drags in a
new subtree. Every version also stays in git history for good: the vendored
`serde` stack alone is 6.2 MB in 420 files.

## 10. Interactive concepts — a registry that grows without reform

EMS, ORD, PIN and traffic are the first *conceitos interativos*, and more will
come. Proposed, not built: one table, one row per concept, fixed columns —
**id · name · is · is not · id grammar · where it lives · collides with ·
status** — kept as a store like `expansions.txt`, generated for the engine by
`build-templates.js`, so the language server can hover a concept and the
registry (M17) can validate an id against its grammar. A new concept is a new
row; nothing else changes.

Mapped against what exists:

| concept | collides with | note |
|---|---|---|
| EMS | — | new |
| ORD | `ORD-####` / `ORD-yyyy-mm-dd-nn`, the `--bundle` of four projections, `.orders/`, `glyph-plugin --from ORD-####` | one word, two objects; left open |
| PIN | nothing in the vocabulary; `PH` (placeholder) is the nearest name | a new command: `expansions.txt` and `GLOSSARY.md` first |
| Order Matrix | — | named 2026-09-24; its files are still `.scope/generics/*-generic.pgml` (§11.3) |
| traffic `reads` | `<invoke reads>` in the emitted XML (clause 9: what a command reads) | same word, different object |

## 11. "Template" — six meanings, six names

Named by the Regent on 2026-09-24 ([`.decisions/`](../.decisions/README.md)),
under the norm that technical and theoretical terms settle in English, spelt
en-EU (§12).

| # | meaning | name | values | where it lives |
|---|---|---|---|---|
| 1 | the language's macro: `[--name=` defines, `[--name` invokes, `[ph-x]` holes | **template** | 8 in `templates.json`: germinate, scientific-review, reinforce, insight, fertilize, best-of, loop, track; the user's own in `localStorage` | `TPL`, `glyph-grammar.ebnf:41-45`, `<template>` in the XML, `core/templates.js`; the app's *templates* panel |
| 2 | the app's forms: phases Alvo · Partida · Percurso, slots `{id, tag, q}` | **mould** | fluxo, decisão, laço, correção | `scripts/glyph-moulds.js` (`MOULDS`); the app's *moulds* |
| 3 | ready-made example sources | **sample** | 8, one of them demonstrating a template | `scripts/glyph-moulds.js` (`SAMPLES`) |
| 4 | an Order that assembles a formulary filled by an input pattern, chained into a "DRAWING" | **Order Matrix** | handoff, order, resume, germinate | `.scope/generics/` |
| 5 | editor completions of whole shapes | **snippet** | none yet | ladder M15 |
| 6 | the ORD render layout | **layout** | `packets.md` | ladder M18.T01 |

**Not ratified, not recommended:** if the neighbourhood with the fungus keeps
bothering, `form` or `frame` name #2 with no ambiguity at all. The cost is the
kinship with the idea of a mould the Regent already used; raised only if he
asks.

### 11.1 "modelo", measured before renaming

Every `modelo`/`modelos` in the app, read in its context:

| use | where | done |
|---|---|---|
| the template (#1) | `glyph-ui.js` 928, 961, 998, 1004, 1168, 1330, 1331, 1350, 1353, 1356, 1362, 1363, 1366, 1668, 1687; `glyph-engine-alias.html` 45, 52, 57 — every one a `tpl*` string or a comment beside one, and each `tpl*` key already reads *template* in the English table | renamed to `template` |
| the AI model | `glyph-ui.js` 794, 797, 1388 (`fModel`); `glyph-engine-alias.html:118` — the harness · model · role target, read from `targets.json` | kept: `modelo` is the AI model's |

No third use inside the app. Outside it there is one — *modelo* as data or
design model (`.decisions/README.md` *"O modelo semântico inteiro entra"*,
`.scope/GLYPH_TARGET_1.md:102` *"o nosso modelo"*) — raised in §8, not renamed.

### 11.2 Applied — nothing emitted moved

The snapshot's 114 sources are byte-identical in XML, AST and `.hgml`; the app
was opened and driven in a browser in both languages, with no console error.

- `scripts/glyph-moldes.js` → `scripts/glyph-moulds.js`; `MOLDES` → `MOULDS`, `PRESETS` → `SAMPLES`, and every `molde`/`preset` identifier in `glyph-ui.js`, the page and the stylesheet;
- the app's strings, both languages: *molde*/*form* → *mould*, *modelo* (#1) → *template*;
- `templates.json:3`: *"a preset de-limits"* → *"a template de-limits"* (the note sits outside the map the envelope checksums);
- comments in `core/templates.js` and `core/parser.js`, and the suite's labels, where *preset* or *molde* meant a template;
- `GLOSSARY.md:13` and `README.md` point at the renamed file; `.scope/generics/README.md` says *Order Matrix*.

### 11.3 Waiting — each touches an emitted document or a format on disk

| item | what moves | measured |
|---|---|---|
| `GLOSSARY.md:195`: `TPL` *"Named mould"* — right spelling, wrong sense (§12); the Regent's correction | `build-templates.js` copies the gloss into `expansions.json` as `TPL`'s `def`, and the envelope carries that store's checksum | tried on a throwaway copy: all 114 AST hashes move, envelope only; XML and `.hgml` do not |
| `core/templates.js:184`: *"Parâmetro de molde é sempre literal"* — here *molde* is a template | a diagnostic's text, which travels in every envelope that raises it | — |
| `templates.json:75`: a constraint's `why`, *"a iteração que o preset abriu"* | the template store's checksum, in every envelope | — |
| `rules.json:43`: *"preset that promised the opposite direction"* | the rule store's checksum, in every envelope | — |
| `core/emit-xml.js:28`: `<!-- escolha um molde … -->`, the XML for an empty source | the emitted XML | — |
| `localStorage` key `glyph.moldes.user.v1` | the moulds each user saved; renaming the key loses them unless the app migrates it | — |
| `.scope/generics/*-generic.pgml` | paths on disk | — |
| the vocabulary category `molde` (`core/vocabulary.js:87`: TPL, PH, VAR, PARAM, DEF, SECTION, BLOCK, LOGIC, SKL — *"peças de estrutura e template"*) | a third use of *molde*, neither the app's forms nor the template | not renamed: the name is the Regent's |
| `.claude-plugin/README.md` 26, 50-51 | *molde* for a scaffold to copy, and for the app's moulds | untracked work in progress; not touched |

## 12. Spelling — the convention, measured

`mould` is the British spelling of `mold`; both carry both senses, the cast
and the fungus, and neither disambiguates the other. So the choice is regional,
and the repository had already made it: lock **T13** of `ORD-2026-08-30-01`,
*"en-EU across the system, always"*, scoped as *"artefacts in en-EU, interface
stays pt-BR"*. The same release respelled the four element names `criticize`,
`categorize`, `generalize`, `scrutinize` to `-ise`. The app's forms are
therefore **mould**, and `GLOSSARY.md:195`'s *"Named mould"* was right in
spelling and wrong only in sense (§11.3).

Measured on the committed tree (`HEAD`), English lines only — Portuguese
*organize*, *realize* are verbs of their own — with the skill's generated copy
left out. 52 US/UK families: `-ize`/`-ise` over 26 stems, `analyze`/`analyse`,
and 25 pairs (`color`/`colour`, `behavior`/`behaviour`, `center`/`centre`,
`license`/`licence`, `artifact`/`artefact`, `judgment`/`judgement`,
`mold`/`mould`, `skeptic`/`sceptic`, …).

| where | US | UK | what the US side is |
|---|---|---|---|
| emitted: element names | 1 | 3 (+ `scrutinise`) | `<skeptic>` |
| emitted: the corpus's XML, AST and diagnostics | 5 | 113 | `skeptic`, all five |
| docs of this repository | 20 | 112 | 8 quote the four old element names (the sweep's own Order and CHANGELOG); 11 are prose residue: *organized* ×5, *recognized/recognizers* ×3, *colors* ×2, *artifact* ×1; 1 is the API name `tokenize` |
| code | 45 | 73 | public API names `tokenize` ×17 and `serializeAST`; `organized` as corpus input text; CSS `color` (the platform's word); three prose comments in `emit-ast.js` (*serialization*, *Serializes*); `GRAY` beside `colour` in one DFS; `Summarize` as test titles; the gloss `Skeptic` |
| stores | 2 | 38 | `license`, the npm field |
| `.history` | 0 | 2 | — |
| quoted or external (`.sources`, `do-gepeto.md`, studies) | 4 | 0 | not ours |
| `mold`/`mould` alone | 0 | 12 | — |

What is ours and chosen is British by a wide margin, and by decision. The
residue, none of it fixed here:

| residue | touches | status |
|---|---|---|
| `<skeptic>` and the gloss `Skeptic` — the same command's slot question already says *sceptical* (`core/vocabulary.js:234`) | the emitted XML | the Regent's; it escaped the sweep that respelled the other four |
| public API `tokenize`, `serializeAST` | every consumer of the face: the app, the skill, the CLI | the Regent's; T13 is scoped to artefacts, and an API name is not prose |
| 11 prose words in intakes and `.scope`, 3 comments, `GRAY` | nothing emitted | mechanical; closed Orders are not rewritten |
