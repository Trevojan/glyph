# EMS-001 — the return of the first cloud session

> What the session that heard [`HANDOFF-2026-09-24.pgml`](../HANDOFF-2026-09-24.pgml)
> built, what it matched, and what waits for the Regent. Branch
> `claude/laughing-archimedes-3pf0wa`. Every bank commit carries this file
> current; the commit that carries it is the last row of the log at the foot.

## Where the session is

| section | state |
|---|---|
| environment | node v22.22.2, cargo 1.94.1 — both present, nothing installed |
| ground | read in the order the handoff names; `npm run check` (33 buckets, 41 s) and `npm run check:rust` (20 crates, 3 s) green on the clone at `ea8fc59`, before anything was touched |
| layout | **closed** — its val holds (below), five banks |
| queue | ORD-0001 to ORD-0005 closed; ORD-0006 opens next. The tag `conformance-v0` is on `030ed76` in the session's clone only — its push was refused (below) |

## Waiting for the Regent

1. **The tag `conformance-v0` is not on the remote.** The branch pushes; the
   push of the tag came back `HTTP 403` from the session's git proxy, a policy
   refusal, so it was not retried. The tag lives only in this session's clone,
   on `030ed76`. From any clone:

   ```bash
   git fetch origin claude/laughing-archimedes-3pf0wa
   git tag -a conformance-v0 030ed76 -m "ORD-0001 da EMS-001: o oráculo congelado — 114 arquivos, sha256 c00119e0f6253564f53b9d05dafc8a6833a489e27a0af7caa42d45bc4c22d828"
   git push origin conformance-v0
   ```

## Questions for the Regent

Closed questions, none answered.

1. **Does an ORD of a series also travel as a `.zip`?**
   - a. the folder alone
   - b. the folder, with the zip inside it beside the five files
   - c. the folder, and the zip only behind a flag
2. **The oracle holds no character outside the BMP. Does the corpus gain a
   source that does?** The lexer's probes now hold its spans to UTF-16 units;
   `lev` and every later projection are still held only by the corpus.
   - a. yes: a declared source with an astral character, the snapshot moved by
     decision
   - b. no: the blind spot pinned by name, as a known loss
   - c. later, when ORD-0004 opens
3. **The envelope's `stores.rules` hashes the engine's cache with the store.
   What does the Rust envelope (ORD-0009) answer?**
   - a. the JS keeps its compiled rules off the store object; the envelope then
     hashes the store, and the `ast` hashes of the snapshot move by decision
   - b. the Rust reproduces the cache's JSON, defect included, and the
     envelopes stay as they are
   - c. pinned as known until ORD-0009 opens
4. **JSON sits in `glyph-util`, which `vocabulary.js` and `stores.js` do not
   import. Where does it belong in the crate graph?**
   - a. the platform, reachable from every crate: `crate-graph.js` learns one
     exception
   - b. a crate of its own under every other, with an oracle entry in
     `crate-graph.js`
   - c. as it is: `glyph-stores` keeps its own `Value`

## ORDs closed

| ORD | delivered | commit | digest it matched |
|---|---|---|---|
| [`ORD-0001`](ORD-0001/ORD-0001.xml) | the frozen oracle: `--export-oracle` writes 114 files | `030ed76`, the tag `conformance-v0` | `c00119e0f6253564f53b9d05dafc8a6833a489e27a0af7caa42d45bc4c22d828` |
| [`ORD-0002`](ORD-0002/ORD-0002.xml) | `glyph-util` and `glyph-version`: `esc`, `xesc`, `lev`, `walk` and `VERSION` equal the JS on everything the oracle holds | `79aebbd` | `6fb833ec47e105cdc72fd515633597896e1e65d83730dcd157f67876cc927b5c`, `oracle-modules/util.json` |
| [`ORD-0003`](ORD-0003/ORD-0003.xml) | `glyph-vocab` and `glyph-stores`: the 22 tables of the vocabulary and the three stores equal the JS by digest; the composition store compiled byte for byte | `d9ea4fe` | `55ba73dad05f0811ccecf782e701e86966fe6b0ce818055cf0d99cdb2010bf25`, `oracle-modules/vocabulary.json`; `4f03181d22088569691864c88925d48bc1bbc5691df080d97d4551511541d4b1`, `oracle-modules/stores.json` |
| [`ORD-0004`](ORD-0004/ORD-0004.xml) | `glyph-lex`: the 11 008 tokens of the 114 sources equal the oracle, spans in UTF-16; and 1 688 more sources, `classify` and `suggest` | `06989f7` | `c00119e0f6253564f53b9d05dafc8a6833a489e27a0af7caa42d45bc4c22d828`, the case files; `b70bb078c74ad025507d9eebbc86239068e1cc48ef678f47df4005206d6201b8`, `oracle-modules/lexer.json` |
| [`ORD-0005`](ORD-0005/ORD-0005.xml) | `glyph-logic`: the 8 Logic nodes of the oracle equal; and `parseLogic`, `expandExpr` and `freeVars` on 1 610 blocks and 1 588 strings | `12cc408` | `c00119e0f6253564f53b9d05dafc8a6833a489e27a0af7caa42d45bc4c22d828`, the case files; `53ec4964aca68075372dd85f38e020fa571b9c8716cae8f1db26f490f895b546`, `oracle-modules/logic.json` |

**ORD-0001, the proof**, run at `02c92ee` (the commit that emitted it; the
closing commit changes no code):

```
$ rm -rf rust/target/oracle && node scripts/test-corpus.js --export-oracle
  ! oracle written: 114 cases to rust/target/oracle
All green.
$ ls rust/target/oracle | wc -l
114
$ cd rust/target/oracle && LC_ALL=C sha256sum *.json | sha256sum
c00119e0f6253564f53b9d05dafc8a6833a489e27a0af7caa42d45bc4c22d828  -
```

It needed no code: the export exists since `b127ec2`. Two exports at the same
commit are byte-identical, the 114 per-case digests equal
`corpus-snapshot.json`, and no projection throws.

**ORD-0002, the proof**, run at `79aebbd`:

```
$ rm -rf rust/target/oracle* && node scripts/test-corpus.js --export-oracle
  ! oracle written: 114 cases to rust/target/oracle
  ! module oracle written: util.json to rust/target/oracle-modules
All green.
$ cargo test --manifest-path rust/Cargo.toml -p glyph-util -p glyph-version --test oracle
test walk_visits_as_the_js ... ok
test esc_and_xesc_equal_the_js ... ok
test the_answers_cover_every_string_the_case_files_hold ... ok
test lev_equals_the_js ... ok
test result: ok. 4 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 1.76s
test version_is_the_engine_the_oracle_names ... ok
test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.11s
$ sha256sum rust/target/oracle-modules/util.json
6fb833ec47e105cdc72fd515633597896e1e65d83730dcd157f67876cc927b5c
$ cd rust/target/oracle && LC_ALL=C sha256sum *.json | sha256sum
c00119e0f6253564f53b9d05dafc8a6833a489e27a0af7caa42d45bc4c22d828  -
```

"Every string the oracle holds" is read as: `esc` and `xesc` over each of the
1 609 distinct strings; `lev` over each one whole, paired as the export
pairs it; `walk` over every tree the oracle holds, since it takes trees and
not strings.

**ORD-0003, the proof**, run at `d9ea4fe`:

```
$ rm -rf rust/target/oracle* && node scripts/test-corpus.js --export-oracle
  ! oracle written: 114 cases to rust/target/oracle
  ! module oracle written: util.json, vocabulary.json, stores.json to rust/target/oracle-modules
All green.
$ cargo test --manifest-path rust/Cargo.toml -p glyph-vocab -p glyph-stores
test deps_of_equals_the_js ... ok
test the_composition_store_is_the_one_build_templates_writes ... ok
test what_is_read_off_the_stores_equals_the_js ... ok
test a_context_reads_each_shape_as_create_context_does ... ok
test the_envelope_hashes_the_rules_with_the_engines_cache ... ok
test the_digest_of_every_generated_table_equals_the_js_store ... ok
test result: ok. 5 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.10s
test el_name_equals_the_js ... ok
test every_table_equals_the_js_table ... ok
test the_testkit_ck_is_the_envelopes ... ok
test result: ok. 3 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.11s
$ sha256sum rust/target/oracle-modules/{vocabulary,stores}.json
55ba73dad05f0811ccecf782e701e86966fe6b0ce818055cf0d99cdb2010bf25  vocabulary.json
4f03181d22088569691864c88925d48bc1bbc5691df080d97d4551511541d4b1  stores.json
$ the store digests
{"templates":"d127beace2f86000","rules":"a0805b87fcbb2c00","expansions":"2549caa003b0a400","commands":"081a4b4813895800"}
```

"Every generated table" is read as the 22 tables `vocabulary.js` exports and
the three stores; "the JS store" as the store read from disk — the envelope's
rules digest also hashes the engine's cache, pinned above.

**ORD-0004, the proof**, run at `06989f7`:

```
$ rm -rf rust/target/oracle* && node scripts/test-corpus.js --export-oracle
  ! oracle written: 114 cases to rust/target/oracle
  ! module oracle written: util.json, vocabulary.json, stores.json, lexer.json to rust/target/oracle-modules
All green.
$ cargo test --manifest-path rust/Cargo.toml -p glyph-lex -- --nocapture
test the_tokens_equal_the_js_on_every_string_and_probe ... ok
114 sources, 11008 tokens
test the_tokens_equal_the_oracle_on_every_source ... ok
test classify_and_suggest_equal_the_js ... ok
test result: ok. 3 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.15s
$ cd rust/target/oracle && LC_ALL=C sha256sum *.json | sha256sum
c00119e0f6253564f53b9d05dafc8a6833a489e27a0af7caa42d45bc4c22d828  -
$ sha256sum rust/target/oracle-modules/lexer.json
b70bb078c74ad025507d9eebbc86239068e1cc48ef678f47df4005206d6201b8
```

**ORD-0005, the proof**, run at `12cc408`:

```
$ rm -rf rust/target/oracle* && node scripts/test-corpus.js --export-oracle
  ! oracle written: 114 cases to rust/target/oracle
  ! module oracle written: util, vocabulary, stores, lexer, logic to rust/target/oracle-modules
All green.
$ cargo test --manifest-path rust/Cargo.toml -p glyph-logic -- --nocapture
8 Logic nodes
test every_logic_node_equals_the_oracle ... ok
test parse_logic_expand_expr_and_free_vars_equal_the_js ... ok
test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.26s
$ sha256sum rust/target/oracle-modules/logic.json
53ec4964aca68075372dd85f38e020fa571b9c8716cae8f1db26f490f895b546
```

"Every Logic node" is read as each node of the envelopes, projected by the
port from its `[logic]` token as `emit-ast.js` projects it, `at` included.

## Open, and why

Nothing is open. ORD-0006, `glyph-templates` and `glyph-rules`, opens next.

## ORD-0005, how it was read

- **Three JS defects the port reproduces**, measured before porting:
  - **`defined`, `used` and `seen` are plain objects.** A variable named
    `constructor` or `__proto__` reads as already defined — `DuplicateBinding`
    on its first definition — and as already seen, so it never reaches
    `uses` or `missing`.
  - **`? -> b` is an empty line.** The when-rule's regex backtracks until the
    condition is the one space before `->`; trimmed, it is empty:
    `EmptyLogicLine`, at `fix`.
  - **`a != b` reads as `a não = b`.** The negation rule rewrites the `!` of
    `!=`.

## ORD-0004, how it was read

- **Two JS defects the port reproduces**, measured before building, and left
  as the JS answers them:
  - **Lookups fall through to `Object.prototype`.** `EMO[x]` and `SESSION[x]`
    are plain objects, so `/constructor/` tokenizes as a mood — and the XML
    carries `<mood dominant="function Object() { [native code] }"/>`, the
    source text of the JS's own `Object`, into the deliverable — and
    `classify("constructor")` and `classify("__proto__")` answer `session`.
  - **`[off]` looks for `[ON]` in an upper-cased copy.** A character whose
    upper case is longer (`ß` → `SS`) moves every index after it, so
    `ß[off]x[on]y` gives a raw `x[`, an `ON` spanning 8–12 in a 12-unit
    source, and loses the `y` in silence.

## ORD-0003, how it was read

- **ORD-0003, `glyph-vocab` and `glyph-stores`.** Measured before building:
  the four sources `build-templates.js` reads — `GLOSSARY.md`,
  `expansions.txt`, `rules.json`, `templates.json`, as `CLAUDE.md` names them —
  make the three stores, not the vocabulary. Aliases, arity (`FRAMES`,
  `SLOTS`), moods, categories and the element glosses live only in
  `scripts/core/vocabulary.js`; `INSTR` does not even repeat the glossary's
  labels (`DFN` is "Define Symbol" in the engine, "Define" in the glossary).
  So `glyph-vocab`'s `build.rs` reads its tables from `vocabulary.js`, the one
  place they live, and `glyph-stores`' compiles the stores from the four
  sources. The expansions store also carries `schema` and a `note` that are
  `build-templates.js`'s own words; they are read from its output rather than
  typed a second time.

## The layout, built

| piece | state |
|---|---|
| the spec | [`EMS-001.pgml`](EMS-001.pgml), moved with `git mv`; every pointer names it |
| `--bundle` | with `--out` a folder `EMS-###`, writes the ORD as the folder `ORD-####/` holding the five files the zip holds, numbered by the ORD folders of that series alone; elsewhere, the zip. An ID is `ORD-####` followed by nothing or a dot, in every destination |
| the plugin | `--from EMS-001/ORD-0003` and the path of an ORD folder resolve the `.pgml` inside it; `ORD-####` and a bare number still find the flat file |
| the bundle command | its probes list each series and read the open ORD from `EMS-###/README.md` |
| the series README | [`README.md`](README.md), with `A Ordem aberta` and `Ordens fechadas` |
| the suite | the bundle bucket grows from 5 to 14 checks, `ZP-06` to `ZP-14`, each observed red before its code |
| the app | the `emitir ORD` button is untouched: its number stays in `localStorage` |

**The val**, run on a replica of the series beside the real one, with the dated
ID `ORD-2026-08-30-01` as a file and as a folder beside the ORDs:

```
$ ls EMS-001/   # before
EMS-001.pgml
ORD-2026-08-30-01
ORD-2026-08-30-01.pgml
README.md
$ glyph-plugin.js --from src.pgml --bundle --out .guidelines/.orders/EMS-001   # call 1
val/.guidelines/.orders/EMS-001/ORD-0001/  (2037 bytes, 5 arquivos)
$ glyph-plugin.js --from src.pgml --bundle --out .guidelines/.orders/EMS-001   # call 2
val/.guidelines/.orders/EMS-001/ORD-0002/  (2037 bytes, 5 arquivos)
$ ls EMS-001/   # after
EMS-001.pgml
ORD-0001/
ORD-0002/
ORD-2026-08-30-01/
ORD-2026-08-30-01.pgml
README.md
```

and `npm run check` passes on the commit that carries this return.

## Measured

- **Pointers to the spec: seven, not five.** The five the handoff names, and two
  in `INTAKE-RUST-LADDER.md` that named the spec by its draft ID, `ORD-0012` —
  inside the series that ID is the Rust CLI. They name the spec of EMS-001, and
  the window as its ORD-0014.
- **`HANDOFF-2026-09-24.xml` was the exact projection of its source**, so it is
  re-emitted in the commit that rewrites the source.
- **The dated ID, reproduced before the fix:** `ZP-06` put
  `ORD-2026-08-30-01.pgml` beside `ORD-0001.zip` and `ORD-0002.zip` and the
  bundle wrote `ORD-2027.zip`. It writes `ORD-0003.zip`. The row leaves
  [`.plan`](../../.plan/README.md) §3, which holds its three older defects.
- **A series counts folders, not files.** Beside the spec, a draft
  `ORD-0007.pgml` and a folder `ORD-2026-08-30-01/`, the old bundle wrote
  `ORD-0008.zip`; it writes `ORD-0001/`, then `ORD-0002/`, and a second series
  starts again at `ORD-0001/`. The three projections in the folder are
  byte-equal to the zip's for the same source.
- **An ORD folder is written beside itself and renamed** (`.ORD-####.<pid>`,
  which no count reads), so a write that fails midway leaves no half ORD to be
  counted as emitted; the failure says which folder and exits 2.
- **The plugin, before its fix:** `--from EMS-001/ORD-0002` looked for
  `.orders/EMS-001/ORD-0002.pgml` and died on `não existe`, and the folder's
  path reached the CLI as a directory and failed on `EISDIR`. `\` is accepted
  beside `/`, for the Regent's Windows. The four order leaves and the plugin
  README name the series form.
- **The bundle command's probes run without a shell in the suite.** The suite
  depends on nothing but node, and bash is not certain on Windows, so
  `ZP-13`/`ZP-14` evaluate what the probes name — the `ls` globs and the `sed`
  range — over a temporary series. Against the old leaf they saw
  `EMS-001, EMS-002` and no open line.
- **A second named fill of a template param that is not `repeat` overwrites
  the first, with no diagnostic.** `[--track [ph-item'a'][ph-item'b'] …]`
  emits `b` alone, and `a` is gone in silence. Found while choosing how a row
  enters the track of the spec; a JS defect, left as the JS answers it. The
  track takes one `--track` invocation per row, which carries every row.
- **The module oracle.** `--export-oracle` writes
  `rust/target/oracle-modules/util.json` (2.3 MB) beside the case files: the
  1 609 distinct strings the case files hold, keys included, sorted by UTF-16
  unit; `esc` of each (`xesc` is `esc` in the JS); `lev` of each string whole
  against the first 16 units of the next, both ways — the longest string is
  615 925 units, so every pair of strings would cost ~10¹¹ steps; and `walk`
  over the 116 segment trees, 1 103 visits, as the shape each tree has, since
  the envelope names children `body`. The 114 case files keep
  `c00119e0…d828`, byte for byte.
- **`npm run check:rust` writes the oracle at the commit under test** before
  `cargo test`, so a stale oracle never answers for a commit; it now takes the
  JS suite's time (~45 s) too.
- **The oracle reader, `rust/testkit/oracle.rs`**, shared by `#[path]` and not
  a crate, so `crate-graph.js` has no arrow to hold: a JSON reader of its own
  (no crate from outside), the case files held to `corpus-snapshot.json` — as
  many as it counts, each with its digest, so an oracle written at another
  commit fails instead of answering — and the module answers. Without an
  oracle, and with an empty one, the test fails naming
  `node scripts/test-corpus.js --export-oracle`; observed both ways.
- **`glyph-util`, held.** The four tests were observed red against `todo!()`
  bodies (three red; the fourth checks the oracle itself and passed), then
  green: 1 609 strings through `esc` and `xesc`, 1 609 `lev` pairs both ways,
  116 trees walked. Mutated, the test kills three of four: `esc` without `"`,
  `walk` with the children reversed, `lev` with a substitution costing 2.
- **`glyph-version` reads `VERSION` from `scripts/core/version.js`** in its
  `build.rs`, so the number stays in one place. Its test was red against an
  empty constant, green after, and a hard-coded `3.4.7.05` fails it.
- **`glyph_util::json`, the platform the Rust lacks.** `JSON.parse` and
  `JSON.stringify` as the JS has them: the escapes, the JS's placing of the
  shortest digits, and its property order — array-index keys first, a
  duplicate keeping its first place. The reader moved out of the testkit into
  `glyph-util`, where the ladder's intake put it (§9.2), and the testkit reads
  with it. Held to every file the export writes: all 115 read and write back
  to their bytes (red against a writer that wrote nothing). Numbers and key
  order, which the oracle's integers and fixed keys do not exercise, are held
  to what node answers.
- **The module answers of `vocabulary.js` and `stores.js`.** The export
  writes `vocabulary.json` — each of the 22 tables the module exports, found
  by walking its exports so a table added to the JS reaches the oracle on its
  own, as `JSON.stringify` text and `ck` digest; and `elName` over the 128
  names of the five tiers it is read through, with and without a gloss — and
  `stores.json`: the digests of the three stores (the envelope's `d127…`,
  `9778…`, `2549…`) and of the composition table alone, what `createContext`
  makes of each shape it accepts, and `speciesOf`, `depthOf`, `formulaOf`,
  `defOf`, `atomsOf` and `standsAlone` for 147 names, with the stores loaded
  and with none. `util.json` keeps `6fb833ec…`.
- **`glyph-vocab`, held.** `build.rs` reads the 14 hand-written tables out of
  `vocabulary.js` as literals, in the JS's property order, and stops the build
  on a shape it does not know; `derived()` ports the code that builds the
  other 8. All 22 equal the JS by `JSON.stringify` text and by digest, and a
  table the JS adds fails the test by name. `el_name` equals the JS on 3 018
  calls. Mutated, the test kills four of four: an empty `PTBR`, `GLOSS_REVERSE`
  letting the last writer win, `el_name` keeping a trailing hyphen — which
  survived until the export's `elName` domain took the case files' strings as
  glosses (no gloss of the tables ends in punctuation; 234 of those do) — and
  `ck` computed as an exact 32-bit FNV-1a.
- **`glyph-stores`, held.** `build.rs` makes the three stores from the four
  sources: `templates.json` and `rules.json` as read, and the composition
  store compiled from `expansions.txt` and `GLOSSARY.md` — `read-expansions.js`,
  the glossary reader, `element` through `glyph-vocab`, and the gates of
  `build-templates.js` — which comes out byte for byte the `expansions.json`
  that `build-templates.js` writes. `Context::new` is `createContext`, passed
  by reference, with no global store; the six accessors equal the JS on 147
  names, with the stores and with none. Mutated, the tests kill six of six —
  `depsOf` blanking the return tokens survived until the export answered it
  over the case files' strings (no formula carries one since H-09 closed; 7 of
  those strings do).
- **The envelope hashes the rules with the engine's cache — a JS defect, left
  as the JS answers it.** `rules.js` hangs its compiled rules on the store
  object (`store.__compiled`, enumerable), so every envelope's `stores.rules`
  is the digest of 18 258 bytes, the store and the cache, not of the 9 921 of
  `rules.json`: `9778b680…` where the store is `a0805b87…`. It is the intake's
  X9, reaching the emitted document. The Rust store has the store's digest; a
  test pins the envelope's, to be inverted when the JS moves its cache. The
  export's `stores.json` records the stores as read from disk. For ORD-0009 it
  is a question below.
- **The store value repeats the shape of `glyph_util::json::Json`.**
  `stores.js` imports only `vocabulary.js`, so `crate-graph.js` keeps
  `glyph-stores` from `glyph-util`; the stores are a `Value` of their own, and
  `glyph-util` reaches `build.rs` and the tests only. A question below.
- **The 114 sources are a weak gate for the lexer.** `glyph-lex` answered
  their 11 008 tokens at once, and seven mutations lived through them: text
  spans in UTF-8 bytes, `r:` taken for `R:`, a mood run cut at two, `[--name =`
  without the space, `[logic name]` without the space as separator, a quote
  running past a newline, and the `constructor` mood. So the export writes
  `lexer.json`: `tokenize` over every string of up to 4 096 units the case
  files hold and over 90 probes written one per branch of `lexer.js` — 1 688
  sources, characters outside the BMP among them, which holds the lexer's
  spans to UTF-16 units and not characters — and `classify`, with and without
  session words, and `suggest` over 542 names. Against it the seven die, and
  so do the two mutations that undo the reproduced defects: nine of nine.
- **`glyph-logic`, held.** Each regex of `logic.js` is a matcher of its own,
  searching as the JS searches — the when-rule's optional mark retried
  without it, its leading space longest first, its condition shortest first —
  which is what reproduces `? -> b`. `logic.json` joined the export before
  the port: `parseLogic` over the 22 `[logic]` blocks the lexer finds and over
  1 584 strings and probes, `expandExpr` and `freeVars` over the same. The
  port answered all of it, and the 8 Logic nodes of the oracle, at once.
  Mutated, eight of eight die — the negation rule excluding `!<>=` before the
  `!` survived until four probes put one there.
- **`ck` is not an exact FNV-1a, and the port says so.** The JS XORs on signed
  32-bit integers and multiplies in a double, and the product passes 2⁵³ —
  for `b`, every step — so low bits are rounded away before `>>> 0`. The
  testkit's `ck` does the same arithmetic, and equals the `source.checksum` of
  all 114 envelopes; the exact 32-bit version does not.
- **The survivor: `lev` counting `char`s instead of UTF-16 units.** No string
  in the oracle carries a character outside the BMP, so the two countings
  answer alike on all of it. 129 strings are non-ASCII, which holds bytes
  apart from units, but nothing holds units apart from characters. Closing it
  takes a declared source with such a character, and that moves the snapshot:
  a question below.
- **The version stays `3.5.8.06`.** No emitted document changes; the
  CHANGELOG entry waits for a release, as the work of 2026-09-24 does.

## The session, measured

| ORD | opened | closed | open for |
|---|---|---|---|
| ORD-0001 | `02c92ee` 01:28 | `030ed76` 01:31 | 3 min |
| ORD-0002 | `3413eb5` 01:40 | `4c4743a` 01:54 | 14 min, three work banks |
| ORD-0003 | `b05ba19` 02:02 | `51e291b` 02:30 | 28 min, four work banks |
| ORD-0004 | `2c68949` 02:34 | `e08f1f9` 02:45 | 11 min, one work bank |
| ORD-0005 | `2466cef` 02:49 | the commit after `12cc408` | ~10 min, one work bank |

| # | commit | step | UTC | checks |
|---|---|---|---|---|
| 0 | `ea8fc59` | the clone | 2026-09-25 00:57 | `check` 41 s and `check:rust` 3 s, green |
| 1 | `0588ada` | layout 1/5 — the spec moves into its series, the pointers follow | 01:03 | green |
| 2 | `bf0d687` | layout 2/5 — an ID is `ORD-####` followed by nothing or a dot | 01:08 | `ZP-06` red first (`ORD-2027.zip`), green after the regex |
| 3 | `1e70ad7` | layout 3/5 — `--bundle` writes the series folder | 01:11 | `ZP-07`–`ZP-10` red first (`ORD-0008.zip` in the series), green after |
| 4 | `b472fcf` | layout 4/5 — the plugin finds an ORD by its series | 01:15 | `ZP-11`, `ZP-12` red first (`não existe`, `EISDIR`), green after |
| 5 | `70bffd7` | layout 5/5 — the bundle command reads the series; the layout closes | 01:23 | `ZP-13`, `ZP-14` red against the old leaf; one red of the check's own (`/fechada/` matched the heading `fechadas`), fixed to the row |
| 6 | `02c92ee` | ORD-0001 emitted and open | 01:28 | green |
| 7 | `030ed76`, tagged `conformance-v0` | ORD-0001 closes | 01:31 | green; the tag push: `HTTP 403` |
| 8 | `3380a36` | ORD-0001's rows name `030ed76`, since the tag is not on the remote | 01:33 | green |
| 9 | `3413eb5` | ORD-0002 emitted and open | 01:40 | green |
| 10 | `85f5b6f` | ORD-0002 work 1/3 — the export answers `util.js`; `check:rust` writes the oracle | 01:43 | green; `check:rust` 49 s |
| 11 | `ecb85d5` | ORD-0002 work 2/3 — the oracle reader and `glyph-util` | 01:48 | red against `todo!()` first, then green; 3 of 4 mutations killed |
| 12 | `79aebbd` | ORD-0002 work 3/3 — `glyph-version`, `VERSION` read from `version.js` | 01:51 | red against an empty constant first, then green |
| 13 | `4c4743a` | ORD-0002 closes | 01:54 | green |
| 14 | `b05ba19` | ORD-0003 emitted and open | 02:02 | green |
| 15 | `a6dce20` | ORD-0003 work 1/4 — `glyph_util::json`, the testkit reads with it | 02:06 | the round trip red against an empty writer, then green on 115 files |
| 16 | `35487d4` | ORD-0003 work 2/4 — the export answers `vocabulary.js` and `stores.js` | 02:09 | green |
| 17 | `2bbcc8b` | ORD-0003 work 3/4 — `glyph-vocab` from `vocabulary.js`; `ck` in the testkit | 02:16 | green at once, so observed failing by mutation: 3 of 4 killed, then 4 of 4 once `elName` took the oracle's strings |
| 18 | `d9ea4fe` | ORD-0003 work 4/4 — `glyph-stores`: the stores compiled from the four sources, the context | 02:27 | the rules digest red first — the oracle had recorded the store with the engine's cache; 6 of 6 mutations killed |
| 19 | `51e291b` | ORD-0003 closes | 02:30 | green |
| 20 | `2c68949` | ORD-0004 emitted and open | 02:34 | green |
| 21 | `06989f7` | ORD-0004 work — `glyph-lex`, and `lexer.json` in the export | 02:42 | green at once on the 114 sources; 7 mutations survived them; 9 of 9 killed against `lexer.json` |
| 22 | `e08f1f9` | ORD-0004 closes | 02:45 | green |
| 23 | `2466cef` | ORD-0005 emitted and open | 02:49 | green |
| 24 | `12cc408` | ORD-0005 work — `glyph-logic`, and `logic.json` in the export | 02:57 | green at once; 7 of 8 mutations killed, then 8 of 8 with four negation probes |
| 25 | this commit | ORD-0005 closes | 2026-09-25 | green |
