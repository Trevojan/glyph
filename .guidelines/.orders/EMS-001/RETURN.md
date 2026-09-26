# EMS-001 — the return of the first cloud session

> What the session that heard [`HANDOFF-2026-09-24.pgml`](../HANDOFF-2026-09-24.pgml)
> built, what it matched, and what waits for the Regent. Branch
> `claude/laughing-archimedes-3pf0wa`. Every bank commit carries this file
> current; the commit that carries it is the last row of the log at the foot.

## Where the session is

| section | state |
|---|---|
| environment | node v22.22.2, cargo 1.94.1 — both present, nothing installed; the local session of 2026-09-26: Windows 11, node v22.17.1, cargo 1.88.0, and Edge as the Chromium the drivers ask for |
| ground | read in the order the handoff names; `npm run check` (33 buckets, 41 s) and `npm run check:rust` (20 crates, 3 s) green on the clone at `ea8fc59`, before anything was touched |
| layout | **closed** — its val holds (below), five banks |
| queue | ORD-0001 to ORD-0011 closed, ORD-0011 at `cf3bb31`, driven locally on 2026-09-26; ORD-0012 open, with the clock read as question 16 answers it. First on the plan: the virtual paths, by the Regent's word. The tag `conformance-v0` is on `030ed76` in the session's clone only — its push was refused (below) |

## Waiting for the Regent

1. **The tag `conformance-v0` is on `030ed76` in the local clone, and not
   on the remote.** The cloud session's push of the tag came back `HTTP 403`
   from its git proxy; on 2026-09-26 the Regent had it created locally, and
   keeps the push:

   ```bash
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
5. **ORD-0006's val names diagnostics that `parser.js` raises.** Of the 23
   diagnostics of the T-, C- and K-cases, `templates.js` and `rules.js` raise
   14; `parser.js` raises the other 9 (`PlaceholderPending` six times,
   `UndefinedTemplate` three), and every one of them needs the tree the
   parser builds — ORD-0007, which opens only once ORD-0006 closes. Which
   reading holds?
   - a. as read here: the 14, each equal on the tree the JS parser builds and
     the export records; the 9 are held by ORD-0007's val, whose envelope
     carries them
   - b. the spec moves: ORD-0006's val names the two modules' diagnostics,
     and ORD-0007's names every case's
   - c. the spec moves the other way: templates and rules enter ORD-0007
6. **A template's body is parsed with the registered stores, not the
   context's** (ORD-0006, how it was read). **What does the Rust parser hand
   a body?**
   - a. the context's stores: the JS expander passes them on too, and a body
     that breaks a rule reads the same in the oracle, the CLI and the app
   - b. no rules and no composition table, as the oracle was recorded: the
     Rust answers the oracle and differs from the CLI where a body breaks a
     rule
   - c. what the caller registered, as the JS does: the Rust keeps a registry
     of its own beside the context
7. **ORD-0007's val names the envelope's digest, and the envelope is
   `emit-ast.js` — `glyph-envelope`, ORD-0009's, which opens only after
   ORD-0008.** Which reading holds?
   - a. as read here: every field the envelope reads — each node's, each
     segment's, each diagnostic's in both languages — equal on all 114
     sources; the digest itself is ORD-0009's val, which names it
   - b. the spec moves: ORD-0007's val names the tree, and ORD-0009's keeps
     the digest
   - c. `glyph-envelope` enters ORD-0007, and ORD-0009 keeps the burn and the
     inverse
8. **Which protocol does ORD-0010's ADR sign?** Answered by the Regent on
   2026-09-25: **b**, the engine on stdio, relayed by `serve-dev.js`.
9. **`run()` is synchronous, and a page's HTTP is not. How do they meet?**
   - a. a synchronous `XMLHttpRequest` inside the transport: `glyph-ui.js`
     changes only at its transport, as ORD-0011's target says, and the page
     waits out each round trip
   - b. `run()` awaits the answer: `glyph-ui.js` changes beyond its transport,
     and ORD-0011's target moves
   - c. the page paints from the JS engine, and the Rust answer replaces it
     when it arrives
10. **A keystroke makes 6 calls at p50 and 8 005 for L-01, one `classify` a
    command token. How many requests does it cost?**
    - a. one a call, as the twelve are named
    - b. one a keystroke: the transport asks once for everything `run()`
      paints, and answers the calls from that answer
    - c. one a call, and `classify` answered from the tables the page
      already loads
11. **The page merges the user's templates into the store (`useTemplates`,
    `glyph-ui.js` line 1010). Where do they live once the engine is a
    process?**
    - a. each request carries the stores it is answered with, and the engine
      keeps none
    - b. a `useTemplates` request sets them in the engine for the session,
      one page to an engine
    - c. the engine keeps the repository's stores, and a request carries only
      the templates that differ, named by their digest
12. **The Rust redoes on every call what the JS does once, or cheaper.** Every
    parse copies the rules store with its compiled cache (`with_cache`, 54% of
    an empty parse's instructions: 95 µs against the JS's 4.5 µs, which
    caches it on the store object), and every `toAST` digests the three
    stores, as the JS does too (9.3 of 9.6 ms in the Rust, 0.43 of 0.46 ms in
    the JS). Which way?
    - a. both taken once a store loads: the digest in the JS first and then
      in the Rust, the copy in the Rust alone; no emitted byte moves
    - b. only the Rust changes: the rules compiled once a context, and `ck` in
      integer arithmetic; the JS keeps digesting on every call
    - c. as it is, until the app reaches the Rust
13. **The JS `toXML` grows with the square of the lines.** L-03, L-02 and L-01
    take 23 ms, 0.44 s and 6.2 s, and 84% of L-02's is the structural pass
    (`packageSpan`, `packageIndent` and its `^ +`), which the port reads once
    a line since ORD-0008 (L-01 in 0.13 s). The defect is the JS's, so it is
    reported and not fixed inside an ORD. What becomes of it?
    - a. an ORD of its own: the JS pass reads each line once, as the port
      does, and no emitted byte moves
    - b. pinned as known, by name, in [`.plan`](../../.plan/README.md) §3
    - c. left: the app on the Rust engine answers the long sources
14. **The instruments in `rust/crates/glyph-cli/examples/` — the two
    prototypes, the relay, the baseline and the measurement — once the ADR is
    signed:**
    - a. they stay, so the numbers can be measured again
    - b. they leave, and the numbers stay in this return
    - c. the signed option's prototype becomes ORD-0011's starting point, and
      the rest leave
15. **Through the relay, the status line counts 200 commands on L-01, L-02
    and L-03, where the JS counts 8 000, 2 000 and 400.** Every panel holds
    the same bytes; the status line counts the commands of the tree, and the
    relay rebuilds its tree from the full envelope, which stops at
    `LIMITS.astDepth`, 200 levels, and marks the rest with one `Truncated`
    node. Its `omittedNodes` counts every node it cut, literals and text
    among them: on these three the cut holds commands alone, so 200 and
    `omittedNodes` give the JS's count, and no rule holds it there.
    ORD-0011's val, the same bytes as through JS, waits on this. Which way?
    - a. the transport adds the `omittedNodes` of each `Truncated` to the
      count: exact on the 114 sources, an overcount when a cut subtree holds
      a literal; the protocol and the envelope stay as they are
    - b. `parse` over the protocol answers the live tree's count of commands
      beside the envelope, in `glyph-protocol.js` first and then in the Rust;
      `protocol.json` is written again by decision
    - c. the status line under the relay is pinned as a known loss, by name,
      and ORD-0011's val names the exception

    Answered by the Regent on 2026-09-26: **b**, and the status line of
    `glyph-ui.js` reads the count the parse result carries, walking the tree
    when it carries none.
16. **ORD-0012's val asks `--bundle` for the same bytes in both engines, and
    two clocks write into them:** the manifest's `emitted`, and the zip's
    MS-DOS time and date, which `glyph-zip.js` takes in local time — a zone
    Rust's `std` cannot read without a crate from outside. How do they meet?
    - a. both engines read `SOURCE_DATE_EPOCH`, the reproducible-builds
      convention: set, it is the moment `emitted` and the zip carry; the
      zip's time is UTC in both, always; the JS first, and no crate enters
    - b. the test masks `emitted` and the zip's time fields, and the Rust's
      zip time stays UTC against the JS's local time
    - c. the Rust `--bundle` writes the series folder alone, and the flat zip
      stays the JS's

    Answered by the Regent on 2026-09-26: **a**.

## ORDs closed

| ORD | delivered | commit | digest it matched |
|---|---|---|---|
| [`ORD-0001`](ORD-0001/ORD-0001.xml) | the frozen oracle: `--export-oracle` writes 114 files | `030ed76`, the tag `conformance-v0` | `c00119e0f6253564f53b9d05dafc8a6833a489e27a0af7caa42d45bc4c22d828` |
| [`ORD-0002`](ORD-0002/ORD-0002.xml) | `glyph-util` and `glyph-version`: `esc`, `xesc`, `lev`, `walk` and `VERSION` equal the JS on everything the oracle holds | `79aebbd` | `6fb833ec47e105cdc72fd515633597896e1e65d83730dcd157f67876cc927b5c`, `oracle-modules/util.json` |
| [`ORD-0003`](ORD-0003/ORD-0003.xml) | `glyph-vocab` and `glyph-stores`: the 22 tables of the vocabulary and the three stores equal the JS by digest; the composition store compiled byte for byte | `d9ea4fe` | `55ba73dad05f0811ccecf782e701e86966fe6b0ce818055cf0d99cdb2010bf25`, `oracle-modules/vocabulary.json`; `4f03181d22088569691864c88925d48bc1bbc5691df080d97d4551511541d4b1`, `oracle-modules/stores.json` |
| [`ORD-0004`](ORD-0004/ORD-0004.xml) | `glyph-lex`: the 11 008 tokens of the 114 sources equal the oracle, spans in UTF-16; and 1 688 more sources, `classify` and `suggest` | `06989f7` | `c00119e0f6253564f53b9d05dafc8a6833a489e27a0af7caa42d45bc4c22d828`, the case files; `b70bb078c74ad025507d9eebbc86239068e1cc48ef678f47df4005206d6201b8`, `oracle-modules/lexer.json` |
| [`ORD-0005`](ORD-0005/ORD-0005.xml) | `glyph-logic`: the 8 Logic nodes of the oracle equal; and `parseLogic`, `expandExpr` and `freeVars` on 1 610 blocks and 1 588 strings | `12cc408` | `c00119e0f6253564f53b9d05dafc8a6833a489e27a0af7caa42d45bc4c22d828`, the case files; `53ec4964aca68075372dd85f38e020fa571b9c8716cae8f1db26f490f895b546`, `oracle-modules/logic.json` |
| [`ORD-0006`](ORD-0006/ORD-0006.xml) | `glyph-templates` and `glyph-rules`: the 14 diagnostics templates and rules raise in the 36 T-, C- and K-cases equal the oracle; and 163 runs over 215 levels of expansion, the JS's defects reproduced | `ca9c1a6` | `c00119e0f6253564f53b9d05dafc8a6833a489e27a0af7caa42d45bc4c22d828`, the case files; `cb065d27bb54551637ccfb07ce896557f5cc5f82797a238875af0a693c631ed3`, `oracle-modules/trees.json` |
| [`ORD-0007`](ORD-0007/ORD-0007.xml) | `glyph-parse`: every field the envelope reads — each node, each segment, each diagnostic in pt-BR and en-EU — equals the JS on the 114 sources and 159 probes, the JS's defects reproduced | `1a79b2c` | `c00119e0f6253564f53b9d05dafc8a6833a489e27a0af7caa42d45bc4c22d828`, the case files; `3fd68d651077ca5332d8bedcf6c797509ab1f3ee30ff442f9e50ea3f59c4ef9b`, `oracle-modules/parse.json` |
| [`ORD-0008`](ORD-0008/ORD-0008.xml) | `glyph-xml` and the first binary: `glyph` reads Glyph on stdin and writes the XML; the five examples byte-exact and the 114 sources as the oracle; `toXML` on 312 runs, plain and described | `97ea472` | `c00119e0f6253564f53b9d05dafc8a6833a489e27a0af7caa42d45bc4c22d828`, the case files; `cfab5a595c70e3458995474b1a01cdb08857e6a902bd5d331b6eaa99f3b02c63`, `oracle-modules/xml.json` |
| [`ORD-0009`](ORD-0009/ORD-0009.xml) | `glyph-envelope`, `glyph-burn` and `glyph-inverse`: the `ast` and `hgml` digests of the 114 sources equal `corpus-snapshot.json`, and every round trip the JS suite runs closes, step for step — 510 calls recorded as it runs | `9c943d3` | `c00119e0f6253564f53b9d05dafc8a6833a489e27a0af7caa42d45bc4c22d828`, the case files; `8f6519986e2c843458abb255874e49bd696bf0a42db9a82ac5ebc6a3397fb560`, `ast.json`; `05717e791bf4805b7cfb1f507d934efbbf0e735fbe567f4cd9ecfd26e1ba9af2`, `hgml.json`; `3ae341cc376024ffa224308c83c53b3f052b2e13c490c4cfed0aa1e140adc326`, `inverse.json` |
| [`ORD-0010`](ORD-0010/ORD-0010.xml) | the protocol: ADR B, signed by the Regent; `glyph-protocol.js` and the binary `glyph-engine` answer the twelve calls `glyph-ui.js` makes, 6 328 requests byte for byte, and `serve-dev.js` relays `POST /engine` | `7eab706` | `c00119e0f6253564f53b9d05dafc8a6833a489e27a0af7caa42d45bc4c22d828`, the case files; `6cbc1de1aed107a7017b12587355ead8cf41869a3e95260c5141ed7bbf7f9042`, `protocol.json` |
| [`ORD-0011`](ORD-0011/ORD-0011.xml) | the app on the Rust engine: behind `engine=relay`, `glyph-transport.js` swaps the twelve calls, and the 114 sources give the same bytes in every panel through Rust and through JS; `parse` answers the count of commands beside the envelope (question 15) | `cf3bb31` | `c00119e0f6253564f53b9d05dafc8a6833a489e27a0af7caa42d45bc4c22d828` (the cases) and `e95a54e563f6424c6dc93d51be781fb2c744e32f28de5e38b3dab586624b1e78`, `oracle-modules/protocol.json`, 6 634 requests — on Windows, `sha256sum -t`, since Git Bash's binary marker changes the listing |

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

**ORD-0006, the proof**, run at `ca9c1a6`:

```
$ rm -rf rust/target/oracle* && node scripts/test-corpus.js --export-oracle
  ! oracle written: 114 cases to rust/target/oracle
  ! module oracle written: util, vocabulary, stores, lexer, logic, trees to rust/target/oracle-modules
All green.
$ cargo test --manifest-path rust/Cargo.toml -p glyph-templates -p glyph-rules -- --nocapture
test the_pair_key_orders_by_utf16_units ... ok
test compile_rules_equals_the_js ... ok
160 trees, 22 diagnostics
test every_rule_diagnostic_equals_the_js ... ok
test result: ok. 3 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.81s
36 cases, 14 diagnostics of templates and rules, of 23 in all
test the_diagnostics_of_every_t_c_and_k_case_equal_the_oracle ... ok
163 runs, 215 levels of expansion, 49 invocations expanded, 27 diagnostics
test every_expansion_and_constraint_equals_the_js ... ok
test every_dump_reads_back_to_itself ... ok
test result: ok. 3 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.74s
$ sha256sum rust/target/oracle-modules/trees.json
cb065d27bb54551637ccfb07ce896557f5cc5f82797a238875af0a693c631ed3
$ cd rust/target/oracle && LC_ALL=C sha256sum *.json | sha256sum
c00119e0f6253564f53b9d05dafc8a6833a489e27a0af7caa42d45bc4c22d828  -
```

"Every T-, C- and K-case" is read as the diagnostics `templates.js` and
`rules.js` raise in them (ORD-0006, how it was read; question 5).

**ORD-0007, the proof**, run at `1a79b2c`:

```
$ rm -rf rust/target/oracle* && node scripts/test-corpus.js --export-oracle
  ! oracle written: 114 cases to rust/target/oracle
  ! module oracle written: util, vocabulary, stores, lexer, logic, trees, parse to rust/target/oracle-modules
All green.
$ cargo test --manifest-path rust/Cargo.toml -p glyph-parse -- --nocapture
273 runs, 11371 nodes, 504 diagnostics in both languages, 18 throws
test every_tree_and_diagnostic_equals_the_js ... ok
test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 1.91s
$ sha256sum rust/target/oracle-modules/parse.json
3fd68d651077ca5332d8bedcf6c797509ab1f3ee30ff442f9e50ea3f59c4ef9b
$ cd rust/target/oracle && LC_ALL=C sha256sum *.json | sha256sum
c00119e0f6253564f53b9d05dafc8a6833a489e27a0af7caa42d45bc4c22d828  -
```

"The AST envelope equals the oracle digest" is read as every field the
envelope reads (ORD-0007, how it was read; question 7).

**ORD-0008, the proof**, run at `97ea472`:

```
$ rm -rf rust/target/oracle* && node scripts/test-corpus.js --export-oracle
  ! oracle written: 114 cases to rust/target/oracle
  ! module oracle written: util, vocabulary, stores, lexer, logic, trees, parse, xml to rust/target/oracle-modules
All green.
$ cargo test --manifest-path rust/Cargo.toml -p glyph-cli -p glyph-xml -- --nocapture
test a_source_the_js_throws_on_writes_no_xml ... ok
test the_five_examples_come_out_byte_exact ... ok
114 sources
test all_114_come_out_as_the_oracle ... ok
test result: ok. 3 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 1.73s
114 cases
test the_xml_of_every_case_equals_the_oracle ... ok
312 runs, 2203421 bytes of XML, 18 throws
test every_xml_run_equals_the_js ... ok
test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 3.23s
$ printf "[crit'the parser']" | rust/target/debug/glyph
<glyph-package engine="3.5.8.06">
  <schema/>
  <block once="true">
    <criticise>
      <invoke reads="[CMP[CTX]],[SPEC-CORE],[EVAL[ERROR]]" species="composite" depth="2"/>
      <user-input>the parser</user-input>
    </criticise>
  </block>
</glyph-package>
$ sha256sum rust/target/oracle-modules/xml.json
cfab5a595c70e3458995474b1a01cdb08857e6a902bd5d331b6eaa99f3b02c63
$ cd rust/target/oracle && LC_ALL=C sha256sum *.json | sha256sum
c00119e0f6253564f53b9d05dafc8a6833a489e27a0af7caa42d45bc4c22d828  -
```

**ORD-0009, the proof**, run at `9c943d3`:

```
$ rm -rf rust/target/oracle* && node scripts/test-corpus.js --export-oracle
  ! oracle written: 114 cases to rust/target/oracle
  ! module oracle written: util, vocabulary, stores, lexer, logic, trees, parse, xml, ast, hgml to rust/target/oracle-modules
  ! round trips written: 510 calls to rust/target/oracle-modules/inverse.json
All green.
$ cargo test --manifest-path rust/Cargo.toml -p glyph-envelope -p glyph-burn -p glyph-inverse -- --nocapture
114 cases
test the_hgml_digest_of_every_case_equals_the_snapshot ... ok
284 runs, 454 burns, 22 throws
test every_burn_equals_the_js ... ok
test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 1.56s
test sha256_is_fips_180_4 ... ok
114 cases
test the_ast_digest_of_every_case_equals_the_snapshot ... ok
279 runs, 774 envelopes, 36 throws
test every_envelope_equals_the_js ... ok
test result: ok. 3 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 11.29s
test the_way_back_stops_where_the_js_stack_did ... ok
510 calls: 168 inputs made again, 199 ways back, 259 burns re-parsed, 50 over a store of the suite's own
test every_round_trip_the_suite_runs_equals_the_js ... ok
test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 2.20s
$ sha256sum rust/target/oracle-modules/{ast,hgml,inverse}.json
8f6519986e2c843458abb255874e49bd696bf0a42db9a82ac5ebc6a3397fb560  ast.json
05717e791bf4805b7cfb1f507d934efbbf0e735fbe567f4cd9ecfd26e1ba9af2  hgml.json
3ae341cc376024ffa224308c83c53b3f052b2e13c490c4cfed0aa1e140adc326  inverse.json
$ cd rust/target/oracle && LC_ALL=C sha256sum *.json | sha256sum
c00119e0f6253564f53b9d05dafc8a6833a489e27a0af7caa42d45bc4c22d828  -
```

## Open, and why

**ORD-0011, the app on the Rust engine**, closed at `cf3bb31`; opened by the commit that carries
this line. Its source carries the readings it is built on: ADR B's relay, a
transport of the same shape as `GlyphCore`, a synchronous request (question
9), the tree rebuilt from the full envelope, the repository's stores
(question 11), and the switch as one query parameter, `engine=relay`.

### ORD-0010's ADR, signed: B

| date | decision | who | reason |
|---|---|---|---|
| 2026-09-25 | **The engine answers on stdio, one JSON request a line and one JSON answer a line; `serve-dev.js`, which serves the page, spawns it and relays `POST /engine` to it** (option B) | the Regent, in the questionnaire of 2026-09-25: *"B"*; the session had proposed A | measured below: both options answer every call with the JS's bytes and add no crate; B is 16 lines shorter and keeps the page on its own origin, and its relay costs 0.1–0.3 ms a call from a page. The installed app (ORD-0013) carries node, or a second protocol |

**The two options.** A page cannot open stdio, so the browser reaches the
engine by HTTP: **A**, the engine serves HTTP itself; **B**, the engine
answers on stdio and `serve-dev.js`, which already serves the page, relays
the page's HTTP to it. Each is a std-only prototype among `glyph-cli`'s cargo
examples — instruments for this measurement, not part of the `glyph` binary
— and carries the three calls that are one call in both engines, `toXML`,
`toAST` and `toHGML`, over the repository's stores. Each is called twice:
from node's `http` on one kept-alive socket, and from a page, by `fetch`, in
a Chrome the DevTools protocol drives, the page served beside B's relay as
`serve-dev.js` would serve it. The engine with its JSON and no transport is
the floor all of them share, and B's pipe without the relay tells the
relay's hop from the pipe's.

```text
$ cargo build --release --manifest-path rust/Cargo.toml -p glyph-cli --examples
$ CHROME=<a Chrome or Chromium> node rust/crates/glyph-cli/examples/protocol_measure.mjs
```

measured 2026-09-25T06:16:41.398Z · 114 sources × 3 calls × 5 rounds after one warm-up · median per source · node v22.22.2 · Chrome/141.0.7390.37, timer 5 µs, isolated across origins · Intel(R) Xeon(R) Processor @ 2.80GHz × 4

| option | call | total for the 114 (ms) | p50 (µs) | p95 (µs) | max (µs) | over the engine alone, p50 (µs) | answers unequal to the JS |
|---|---|---|---|---|---|---|---|
| JS in process (today) | toXML | 6497.1 | 60.3 | 277.6 | 6059265.8 | — | oracle |
| JS in process (today) | toAST | 149.4 | 508.1 | 667.1 | 68871.6 | — | oracle |
| JS in process (today) | toHGML | 100.0 | 67.3 | 340.6 | 68509.3 | — | oracle |
| Rust engine alone, no transport | toXML | 172.1 | 139.9 | 325.7 | 124402.7 | — | — |
| Rust engine alone, no transport | toAST | 1208.7 | 9526.2 | 12432.2 | 93215.0 | — | — |
| Rust engine alone, no transport | toHGML | 140.1 | 224.4 | 1321.9 | 74711.1 | — | — |
| A · the engine serves HTTP | toXML | 266.0 | 620.0 | 872.4 | 160664.8 | 459.7 | 0 |
| A · the engine serves HTTP | toAST | 1315.1 | 10244.6 | 13878.8 | 103102.3 | 718.7 | 0 |
| A · the engine serves HTTP | toHGML | 203.0 | 743.1 | 1983.9 | 79495.7 | 500.0 | 0 |
| B · stdio, relayed by the dev server | toXML | 265.9 | 638.5 | 820.1 | 159586.4 | 484.3 | 0 |
| B · stdio, relayed by the dev server | toAST | 1272.7 | 10136.6 | 10959.0 | 97025.8 | 591.1 | 0 |
| B · stdio, relayed by the dev server | toHGML | 191.5 | 709.2 | 1809.3 | 75378.9 | 461.3 | 0 |
| B's pipe alone, no relay | toXML | 226.4 | 358.6 | 588.9 | 152486.5 | 206.0 | 0 |
| B's pipe alone, no relay | toAST | 1241.0 | 9891.2 | 10380.5 | 92529.5 | 358.2 | 0 |
| B's pipe alone, no relay | toHGML | 160.7 | 432.7 | 1518.3 | 73463.6 | 196.4 | 0 |
| A · from a page | toXML | 498.4 | 2500.0 | 3155.0 | 174690.0 | 2344.0 | 0 |
| A · from a page | toAST | 1568.6 | 12580.0 | 14805.0 | 106015.0 | 2993.5 | 0 |
| A · from a page | toHGML | 445.9 | 2820.0 | 4585.0 | 90460.0 | 2535.6 | 0 |
| B · from a page | toXML | 524.8 | 2840.0 | 3410.0 | 167335.0 | 2634.2 | 0 |
| B · from a page | toAST | 1567.8 | 12635.0 | 14070.0 | 98165.0 | 3093.1 | 0 |
| B · from a page | toHGML | 460.2 | 3090.0 | 4150.0 | 81025.0 | 2803.5 | 0 |

slowest source per call — JS: toXML L-01 6059.3 ms, toAST L-01 68.9 ms, toHGML L-01 68.5 ms · Rust alone: toXML L-01 124.4 ms, toAST L-01 93.2 ms, toHGML L-01 74.7 ms
calls one keystroke makes, as run() makes them (five, and one classify a command token) — p50 6, p95 12, max 8005

| option | spawn to first answer (ms) | files | lines | code lines | crates added |
|---|---|---|---|---|---|
| A | 16.3 | protocol_http.rs 56, common/mod.rs 31 | 87 | 72 | 0 |
| B | 18.9 | protocol_stdio.rs 18, common/mod.rs 31, protocol_relay.mjs 22 | 71 | 54 | 0 |

every answer is JSON.stringify's own bytes

**What the numbers say.**

- **Both are correct.** All 342 answers of each transport — A and B from
  node and from a page, and B's pipe — equal what the JS answers in the same
  process, each in `JSON.stringify`'s own bytes.
- **From a page, the transport costs 2.3 to 3.1 ms a call.** Over the
  engine alone, at p50: A 2.34–2.99 ms, B 2.63–3.09 ms, so the relay's hop
  costs B 0.1–0.3 ms. From node's client the transport costs half a
  millisecond and the two options are within the runs' spread of each
  other: over three runs the sign of A − B changed.
- **The count of requests weighs more than the option.** A keystroke makes
  6 calls at p50, 12 at p95 and 8 005 for L-01: `run()` makes five, and
  `renderLit` one `classify` a command token. From a page, at 2.5 ms a
  request, that is 15 ms a keystroke at p50 — a frame — and twenty seconds
  for L-01 (question 10).
- **The engine weighs more than either.** `toAST` costs 9.5 ms in the Rust
  engine alone, 9.3 of them digesting the three stores (question 12), and
  the page's JS spends 6.1 s on L-01's XML, which the Rust writes in 0.12 s
  (question 13).
- **Lines: A 87, B 71** (72 and 54 of code). Neither count is whole: A's
  leaves out serving the page, which is `serve-dev.js`'s work ported and
  which the installer needs; B's leaves out the line with which
  `serve-dev.js` routes `/engine` to the relay.
- **Crates: none either way.** `Cargo.lock` holds no entry with a `source`,
  the prototypes use `std` and the `glyph` crates alone, and the page is
  driven over node's own `WebSocket`, so no crate came before the filter of
  INTAKE-RUST-LADDER §9.
- **Spawn to first answer:** A 16.3 ms, B 18.9 ms, once a launch.

**The session's proposal, A.** The spec's later ORDs stand on it. ORD-0013 puts *"the binary
and the page on a clean machine"*, where no node runs `serve-dev.js` to
relay anything, and ORD-0014's path with no crate is *"the engine opens
msedge --app on its localhost page"*: a page the engine serves. Under A, the
transport ORD-0011 builds is the one the installer ships; under B, the
installed app carries node or a second protocol. A is also the faster from a
page, by the relay's hop.

**What B has, and why it is signed.** It is 16 lines shorter, the page calls its own origin from
the start, and the engine stays a filter from stdin to stdout, as the
`glyph` binary is. A reaches one origin only once the engine serves the
page; until then the page's requests stay simple — a `text/plain` body,
which the prototype reads — or A answers a preflight.

**The twelve calls, over the protocol.** Each already has its Rust, ported
by ORD-0003 to ORD-0009; what the protocol adds is the request that names
it.

| call | where `glyph-ui.js` makes it | over the protocol | the Rust that answers |
|---|---|---|---|
| `tokenize` | `run()`, every keystroke | the tokens | `glyph_lex::tokenize` |
| `classify` | `renderLit`, one a command token; the command glosses | the class | `glyph_lex::classify` |
| `parse` | `run()`; `extractPlaceholders`, on a template's body | the tree cannot travel as it is — `parent` and `tok` close a cycle — so it travels as the envelope's `full` projection, with the gaps | `glyph_parse::parse`, `glyph_envelope::serialize_ast` |
| `buildXml` | `run()`, on the tree `parse` gave | `toXML` on the same source | `glyph_xml::to_xml` |
| `serializeAST` | `run()`, the panel | `toAST` with `projection: "panel"` and the page's `lang` | `glyph_envelope::to_ast` |
| `toHGML` | `run()` | `toHGML` | `glyph_burn::to_hgml` |
| `fromXML` | `xmlApply`, the XML typed back | `fromXML` | `glyph_inverse::from_xml` |
| `suggest`, `elName` | bound, never called | the same names | `glyph_lex::suggest`, `glyph_vocab::el_name` |
| `parseLogic`, `expandExpr`, `freeVars` | exposed on `window.__glyph` | the same names | `glyph_logic` |

The stores the page registers are question 11; the tables, `esc`, `xesc`
and `walk` stay in the page, data it loads and helpers with no engine
state. What the ADR leaves open is asked above: how the synchronous `run()`
meets an HTTP answer (question 9), and how many requests a keystroke costs
(question 10).

**The 114 sources, driven locally on 2026-09-26.** `app_on_rust.mjs`, with
Edge as the Chromium, types the 114 sources into the page twice in 21.3 s,
the JS path in 3.7 s: every panel holds the same bytes through Rust as
through JS, and the JS path equals the core in node. The status line is
among them because `parse` answers the tree's count of commands beside the
envelope (question 15): the envelope stops at `LIMITS.astDepth`, and a tree
rebuilt from it counted 200 commands on L-01, L-02 and L-03, where the JS
counts 8 000, 2 000 and 400. The driver reads the platform's `.exe`, as
`serve-dev.js` does.

## ORD-0009, how it was read

- **The val, read.** As it is written: the `ast`
  and `hgml` digests of the 114 case files, and the round trips the JS suite
  runs. Measured before opening: the snapshot's pin says `toHGML` overflows
  V8's stack on L-01, and it no longer does — the burn stops at 200 levels and
  says so in its first line — so the burn reproduces no stack limit. The envelope's
  `stores.rules` hashes the rules with the engine's cache (question 3), and the
  digests the val names are those, so the port hashes the cache too, until the
  Regent answers.
- **The rules digest with the engine's cache, reproduced.** The val names the
  snapshot's `ast` digests, and they hash the rules store as `checkRules`
  leaves it, with `__compiled` on it (question 3). `emit-ast.js` imports no
  `rules.js`, so the cache reaches the envelope as a side effect; the port
  makes it an output: `glyph_rules::with_cache` is the store as the JS object
  stands after `checkRules`, and `parse` returns the rules store as it leaves
  it, which is what the envelope hashes.
- **Two JS defects of the burn the port reproduces**, measured, and left as
  the JS answers them:
  - **The `.hgml` never says a burn was not fully reduced.** A cycle in the
    composition table, or a chain past the 24-link limit, ends in a node the
    burn marks `unburned` with the chain that stopped it; `hgmlLines` writes
    neither, so `[f1'x']` over a five-cycle comes out as the plain `[f5 'x']`
    of a reduced burn.
  - **A composite with no formula makes `toHGML` throw**, `Cannot read
    properties of undefined (reading 'length')`: `parse` reads what is not a
    string as a token list, and `undefined` has no length.
- **The envelope carries pt-BR where it travels in en-EU**: `DepthExceeded`,
  the diagnostic the envelope adds when it cuts a tree, is written in pt-BR
  only.
- **"Every round trip the JS suite runs", read.** The suite's round trips sit
  in six buckets — fromXML, the corpus through the XML and through the AST,
  the examples, the raw fence, the burn re-parsed — and each compares what
  the steps answer. So the export records, as the whole suite runs, every
  `fromXML`, `fromAST` and `toHGML` call: its input and the source the suite
  made the input from, what came back and what the way back said, the JS's
  XML of what came back, and what the burn's re-parse raises at `fix`. Each
  step made again in the port equals the JS's, so each round trip closes in
  the port where it closes in the JS.
- **Five JS defects of the way back the port reproduces**, measured, and left
  as the JS answers them:
  - **An element named after a member of the prototype throws.** The reverse
    table is a plain object: `<constructor/>` or `<toString>` in a
    hand-edited document makes `fromXML` throw `Cannot read properties of
    undefined (reading 'toLowerCase')` — the reader that "never throws".
  - **A mood the prototype answers comes back as the text of a function.**
    `<mood dominant="constructor" also="focus,__proto__"/>` rebuilds as
    `/function Object() { [native code] }/[object Object]/`.
  - **A reference past U+FFFF is cut to 16 bits.** `String.fromCharCode`
    reads `&#128512;` as U+F600; a surrogate pair written as two references
    comes back whole.
  - **A chain link's children vanish.** `XmlChainHasChildren` says they are
    re-attached to the parent (*"Reanexados ao pai"*), and the way back
    writes the link alone.
  - **A block may open with a `,`.** A first `chain="item"` is promoted to
    `-` and reported inside an element; at the top of a block `fromXmlBlock`
    never looks, and `<context chain="item"/>` comes back as `,ctx`, silent.
- **V8's stack is where `fromXML` stops, and it is not a number.** The reader
  recurses once per level of the document, so L-01 and L-02 throw `Maximum
  call stack size exceeded`; measured here, 1 700 levels went through, 1 800
  threw, and 1 900 went through in the same process once it was warm. The
  suite's round trips leave the long sources out. The port walks on a thread
  with room for its own limit and stops past 1 800 levels of the document,
  with the JS's words: `[ins` written 1 797 times is the first to stop, the
  package, the block, the question and its text being the other four.
- **One input the port cannot answer as the JS does**: a reference to a lone
  surrogate (`&#xD800;`) makes a JS string no Rust string can hold, and the
  port writes U+FFFD in its place. The emitter never writes a numeric
  reference, so no round trip meets it.

## ORD-0008, how it was read

- **The binary, read.** `glyph-cli.js` takes its source as an argument or a
  `--file` and writes `console.log`'s line; the spec's binary reads stdin and
  writes "the XML, and nothing else". Read as the binary's I/O and not as an
  engine feature the JS lacks, since the XML of a source is what `toXML`
  answers either way: stdin is read as UTF-8, and stdout holds the XML's bytes
  with no line after them. Where the JS throws, the binary writes the JS's
  message to stderr and exits 1, as node does on an uncaught throw. The
  binary reads with the repository's three stores, as the suite reads the
  examples.
- **Four JS defects in the deliverable the port reproduces**, measured, and
  left as the JS answers them:
  - **A `ref` to a binding nobody made.** The bindings are a plain object, so
    a literal whose text the prototype holds — `toString`, `valueOf`,
    `constructor` — is written `ref="toString"`.
  - **The source of the function `Object` in a mood.** `/constructor/` writes
    `dominant="function Object() { [native code] }"` into the document
    (ORD-0004 measured the mood; this is where it lands).
  - **A conjunction inside a conjunction's member is lost.** `<holds>` strips
    `join="item"` from every line of a member, not from its head alone:
    `[a],[b[c],[d]]` emits `[c]` and `[d]` as a sequence.
  - **Below the indent's ceiling a conjunction can come out ill-formed.**
    Past 12 levels every line shares one indent, and `packageSpan` takes the
    first close of the same name for an element's own: at depth 13,
    `[a[a[x]]],[b]` opens `<holds>` around a lone `</unresolved>`.
- **The deliverable carries pt-BR in three places**: the empty document
  (`<!-- escolha um molde ou escreva do lado esquerdo -->`), an unanswered
  hole (`<needs>sem resposta</needs>`), and a variable no line defines
  (`usado e nunca definido`).
- **Two arms no source reaches, kept**: `means` on a template that is not
  expanded — its gloss is only ever set together with `expanded` — and a
  self-closing line that ends in whitespace, which the emitter never writes.

## ORD-0007, how it was read

- **The val, read.** "The AST envelope equals the oracle digest on all 114
  sources" names a projection `emit-ast.js` makes, and `crate-graph.js` puts
  that module in `glyph-envelope`, ORD-0009's crate, whose own val names the
  same digest. So the val is read as the tree the envelope is made from: every
  field `emit-ast.js` reads — each node's, each segment's, and each
  diagnostic's in pt-BR and in en-EU, `at` included — equal to the JS's on
  all 114 sources. The reading is question 7.
- **Five JS defects the port reproduces**, measured, and left as the JS
  answers them:
  - **The vocabulary tables are plain objects too.** `constructor` and
    `__proto__`, the two session words `Object.prototype` gives the lexer
    (ORD-0004), are editorial (`EDITORIAL_ONLY`), named structures that want a
    literal name (`NAMED_STRUCT`), and slotted commands (`SLOTS`): the function
    `Object` has one slot and names none, so `MissingOperand` reads *"Falta ."*.
    With a rules store the parse throws first (ORD-0006); without one — inside
    a template's body — these are the diagnostics the author reads.
  - **`constructor` written as prose is "in the vocabulary".** `SESSION[lw]`
    answers it, so the loose word draws `LooseCommandWord` and the advice to
    write `[constructor`.
  - **A binding named after a member of the prototype is bound twice from its
    first use.** `binds` is a plain object: `[sum'toString'[ctx]]` raises
    `DuplicateBinding` at `fix`, and so do `valueOf`, `constructor`,
    `hasOwnProperty` and the rest.
  - **`[/undefined]` closes an open template.** A closing tag is matched
    against `String(canonical).toUpperCase()`, and a template node has no
    canonical.
  - **`BackslashMood` shows `emo`, not `\emo\`.** The JS writes
    `"<code>\emo\</code>"`; `\e` and `\<` are escapes of nothing, so the
    backslashes the message is about never reach it.
- **What travels is not all en-EU.** `toAST` parses in en-EU, and three kinds
  of diagnostic carry one language into it: a template constraint's
  (*"dentro de"*), a body's syntax error raised again under its invocation
  (*"no corpo de"*), and what `logic.js` raises — pt-BR for most (*"linha 3
  sem expressão"*), English for `CapFloorNotice` and `UndefinedVariable`.
- **Two arms of `parse()` no source reaches, kept.** `TruncatedLiteral` names
  `;` when a literal is closed by one, and the lexer has not closed a literal
  at `;` since 2026-09-05; and a bare tag's `extend` fallback never decides,
  since a bare tag always follows the `-` or `,` that set its operator.

## ORD-0006, how it was read

- **The val, read.** "The diagnostics of every T-, C- and K-case equal the
  oracle" is read as the diagnostics the two modules raise: 14 of the 23
  those 36 cases hold. The other 9 are raised by `parser.js`, and every
  diagnostic of a case needs the tree the parser builds, which is ORD-0007's.
  So the export records the trees the JS parser builds, and the port is held
  to them. The reading is question 5.
- **Four JS defects the port reproduces**, measured before porting, and left
  as the JS answers them:
  - **A param written as a string is a repeat param.** `templates.js` names a
    param `p.name || p`, so a string is allowed, and asks `p && p.repeat`
    for the repeat — on a string, `String.prototype.repeat`. The first string
    param leaves the positional order: `[--strs'a''b']` over
    `params: ["alpha", "beta"]` drops the `alpha` hole, binds `a` to `beta`
    and loses `b` in silence. The repository writes every param as an
    object, so none of its templates meets it.
  - **`[constructor]` and `[__proto__]` make `parse` throw when a rules store
    is loaded.** `checkRules` groups siblings by name in a plain object, finds
    `Object.prototype`'s member there first and calls `push` on it:
    `byName[c.canonical].push is not a function`. The app and the CLI load the
    rules, so the word crashes the parse there. The port stops with the same
    message, after raising what the JS raised before it.
  - **A hole named `constructor` is filled with the text of the function
    `Object`.** The named fills are a plain object too: an unfilled
    `[ph-constructor…]` binds `function Object() { [native code] }` into the
    deliverable, as the mood did in ORD-0004; a repeat param of that name
    throws, `named[key].push is not a function` when the call fills it and
    `vals.forEach is not a function` when it does not.
  - **A template whose lower-case name `Object.prototype` holds never
    expands.** The registry is read lower-cased first, and `constructor`
    answers there before `Constructor`, as written, is tried. Without a rules
    store the constraints read their forbidden names from a plain object as
    well, so `[constructor` breaks every constraint of a template it sits in.
- **Two behaviours ORD-0007 has to answer**, measured and not decided here:
  - **A body's parse reads the registered stores, not the context's.** The
    expander hands `parse` the registry and nothing else, so a body is parsed
    with whatever `useRules` and `useExpansions` registered. The suite
    registers nothing until its last bucket, so the oracle holds a body
    parsed with no rules; the CLI and the app register the repository's.
    `[--clash]`, whose body is `[mand'x'][opt'x']`, raises `Rule:mand-opt`
    once in the oracle and twice in the CLI. Question 6.
  - **A template named `templates` is lost inside a body.** `asTemplates`
    reads a map holding that key as the file `templates.json`, so the
    registry a body is parsed with collapses to that one template:
    `[--templates]` expands at the top and stays a bare call inside another
    template's body.

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
- **The tree, on the floor.** `glyph_util::tree` is the parser's tree as an
  arena, generic over what only the parser carries: `walk`, `graft` (a body's
  parse moved into the tree), `reparent`, `Diag`, `Thrown` — what the JS
  throws, by its message — and `strip_tags`; `glyph_util::inherited` names
  the twelve keys a plain JS object answers through `Object.prototype`. A
  node's gloss is text or the prototype itself, which JSON writes `{}`.
- **`trees.json`.** The export writes the trees the JS parser builds, for the
  114 sources and 49 probes: the tree when expansion starts (the source
  parsed with no templates and no rules), each body parse the expander asks
  for — a level of its own, with the chain it is parsed under, down to depth
  2 — what each level raises and throws, the tree after, and what
  `checkRules` and `checkTemplateConstraints` raise. 163 runs, 215 levels,
  11 390 nodes before expansion, 10.7 MB. Each run is held to `parse` before
  it is written: the tree after, and the three passes' diagnostics ranked as
  `parse` ranks them, equal a whole parse's, and every level equals the
  body's parse. So the reading of the parser's pipeline is checked, not
  assumed; sabotaged — the tree before in place of the tree after, the
  diagnostics reversed — the export fails on `T-01` and on `probe-3`. Beside
  them, `compileRules` over the repository's store and a probe store. The 114
  case files keep `c00119e0…d828`.
- **`glyph-templates` and `glyph-rules`, held.** `expand_invocations` takes
  `parse` as the JS takes `parseFn`, and the test answers it with the level
  below, expanded by the port itself: every level runs with the chain the JS
  had, and the tree it builds goes up as the body's parse. The val's test
  runs the three passes over the 36 T-, C- and K-cases and matches the 14
  diagnostics their case files hold from them. Mutated, 30 of 32 die. The two
  that live cannot die: a named fill of `__proto__` kept — the lexer reads
  `[ph-__proto__` as text, so no source makes it a slot name — and the
  siblings' name table keeping repeats, which answers alike since the first
  is taken. The cycle lived until the export recorded every level: a cycle is
  only ever met one level down, and the first recording answered that level
  with the JS's.
- **`parse.json`.** The export writes the 114 sources parsed as the snapshot
  parses them, once in pt-BR and once in en-EU: the tree with every field a
  projection reads — the species pass, the binder marks, the suggestion, and
  a function kept as `{ "function": "Object" }` where JSON would drop it —
  each segment's own fields, and the diagnostics as `parse` returns them, `at`
  and `plain` included. Beside them: 100 probes, one or more per branch of
  `parse()`; 7 without the session words or without valency; the 50 template
  probes parsed whole, the real parse handed to the expander at every level,
  with and without a rules store; and 2 over a composition store whose
  entries lack a species or a numeric depth. 273 runs, 11 371 nodes, 252
  diagnostics in each language, 9 runs that throw. The export refuses a node
  or a segment holding a key its dump does not know, and a tree that moves
  with the language. `trees.json` writes the function `Object` the same way.
- **`glyph-parse`, held.** The tree grows what the projections read — species
  and composition depth, the binder mark, the suggestion, a mood's order, a
  gloss that is the function `Object` — and the segment its pending `[off]`
  node. The port answered all 273 runs at once, in both languages. Mutated,
  36 of 40 die. The four that live cannot die: the two arms no source
  reaches (ORD-0007, how it was read); `SingletonList` at `got <= 1`, the same
  as `got == 1` once `got == 0` has its branch; and the templates pass without
  `defd`'s prototype, which the registry answers the same. Two died only once
  the export had a probe for them: exactly 8 commands closed by one `;`, and
  a store entry whose depth is not a number.
- **`xml.json`.** The export writes `toXML` over the runs `parse.json` reads,
  plain and with `describe`, and over 39 probes of the emitter's own: a
  literal named after a member of the prototype, a mood the prototype
  answers, return blocks, a chain against a conjunction, an imperative,
  bindings and their references, a continuing segment, and conjunctions
  below the indent's ceiling. 312 runs, 2.2 MB of XML in all.
- **`glyph-xml` and the binary, held.** The emitter answered all of it at
  once, and the binary the five examples and the 114 sources. The structural
  pass reads each line's indent and text once: `packageSpan` is asked of every
  line and scans to the element's close, and a deep document holds thousands
  of lines at the ceiling — 312 runs in 3 s in a debug build, where reading
  them again at every step took two minutes. JS whitespace and `trim` are the
  platform, so they sit in `glyph-util` beside `inherited`. Mutated, 30 of 32
  die. The two that live cannot die: the two arms no source reaches (ORD-0008,
  how it was read). A continuing segment and a conjunction below the ceiling
  killed theirs only once the export had a probe for each.
- **`ast.json` and `hgml.json`.** The export writes `toAST` and `toHGML` over
  the runs `parse.json` reads; for the probes, the envelope in the panel
  projection, in pt-BR and with its source and uri, and the burn with the
  prose kept; beside them 6 envelope probes — line endings, a tree cut in the
  panel, the prototype's gloss where no rules store stops the parse — and 11
  burn probes: a literal the burn folds, the repository's blend at the top and
  nested, an operand the formula also writes, a burn past the cut, a
  composition store with a two-cycle, a five-cycle, a chain past the limit, a
  headless formula and a literal in a formula's head, and no store at all.
  279 envelope runs, 284 burn runs.
- **`glyph-envelope` and `glyph-burn`, held.** Both answered the 114 case
  files at once, digest for digest against `corpus-snapshot.json` — the
  testkit computes SHA-256 itself, since no crate enters from outside — and
  all of their module answers. The burn's two globals, `burnTruncated` and
  `burnBlends`, are a `Burning` the calls pass along. Mutated, the envelope
  kills 22 of 22 — three only once the export had a probe for them — and the
  burn 20 of 22: the corpus and the parse probes held it to 7 until the burn
  probes arrived, and the five-cycle killed the last reachable one, since a
  two-cycle run to the limit ends on the name it began with. The two that
  live write the same `.hgml`: an atom and an unburned node upper-cased,
  which `hgmlLines` lower-cases again.
- **`inverse.json`, and `glyph-inverse`, held.** The recorder wraps `toXML`,
  `toAST`, `fromXML`, `fromAST` and `toHGML` while the whole suite runs —
  resolving each call's stores as `stores.js` does, since a bucket after the
  registry guard runs on the registered ones — and the way back's own probes,
  22 documents and 6 envelopes, go through it: 510 distinct calls, 309 burns,
  133 `fromXML`, 68 `fromAST`. The port makes again the 168 inputs whose
  source the suite held, answers all 199 ways back and their 2 throws, and
  re-parses 259 burns; 50 burns ran over a probe store the Rust cannot
  rebuild. Mutated, 32 of 32 die; eight only once the probes arrived, one of
  them only once its probe sat inside an element.
- **Store shapes the JS never guards stay outside the port's contract.** A
  null param; `params`, `constraints` or `exemptUnder` that is not a list; a
  body that is not a string: the JS throws a TypeError in V8's words, or
  parses the value as tokens. The port reads them as absent or as text. The
  repository's stores hold none, and `build-templates.js` validates neither
  templates nor rules.
- **The protocol, measured.** Two std-only prototypes, the relay, the
  engine's baseline and the measurement are `glyph-cli`'s cargo examples
  (`protocol_*`), which the crate graph does not check, as it does not check
  dev-dependencies; the `glyph` binary does not change. The page is driven
  over the DevTools protocol with node's own `WebSocket` and isolated across
  origins, so its timer resolves 5 µs. The numbers are in the ADR, under
  *Open, and why*.
- **The Rust engine is slower than the page's JS at the median of every
  call, and faster only where the JS is quadratic.** At p50, `toXML` 140 µs
  against 60, `toHGML` 224 against 67, `toAST` 9 526 against 508; for L-01
  the Rust writes the XML in 0.12 s and the JS in 6.1 s.
- **An empty parse costs the Rust 95 µs and the JS 4.5.** Under callgrind,
  `with_cache` — the rules store copied with its compiled cache on every
  parse, so the envelope can digest it — is 54% of the instructions; the JS
  compiles once and keeps the cache on the store object.
- **`toAST`'s digests.** Of an empty source's `toAST`, the three store
  digests are 9.3 of 9.6 ms in the Rust and 0.43 of 0.46 ms in the JS: both
  digest on every call, and the Rust's `ck` pays three float remainders a
  UTF-16 unit — 18 258 units for the rules store with its cache, 17 112 for
  the composition table, 7 283 for the templates.
- **The JS `toXML` is quadratic in the lines.** L-03, L-02 and L-01 — 1 601,
  8 001 and 32 001 characters — take 23 ms, 0.44 s and 6.2 s. Profiled on
  L-02, 84% of the time is the structural pass: the `^ +` of
  `packageIndent` 31%, `packageSpan` 23%, `packageIndent` 22%,
  `packagePass` 9%. The port reads each line once since ORD-0008. The
  defect is the JS's, so it is reported here, not fixed inside an ORD
  (question 13).
- **The version stays `3.5.8.06`.** No emitted document changes; the
  CHANGELOG entry waits for a release, as the work of 2026-09-24 does.

## The session, measured

From the clone at 00:57 to the last row of the log: 42 commits, each banked
green on both checks and pushed; nine ORDs closed, and ORD-0010 open at the
gate. Eleven rows record a red before their bank, each with what turned it
green: seven are tests observed failing before the code they hold, and four
are misses the checks caught (rows 18, 27, 36 and 37). One push was
refused, the tag's (row 7). `npm run check` held at 41–42 s; `npm run
check:rust` grew from 3 s to 95 s as the oracle export and the ported
crates' tests arrived.

| ORD | opened | closed | open for |
|---|---|---|---|
| ORD-0001 | `02c92ee` 01:28 | `030ed76` 01:31 | 3 min |
| ORD-0002 | `3413eb5` 01:40 | `4c4743a` 01:54 | 14 min, three work banks |
| ORD-0003 | `b05ba19` 02:02 | `51e291b` 02:30 | 28 min, four work banks |
| ORD-0004 | `2c68949` 02:34 | `e08f1f9` 02:45 | 11 min, one work bank |
| ORD-0005 | `2466cef` 02:49 | `17658ec` 03:00 | 11 min, one work bank |
| ORD-0006 | `8f996df` 03:15 | `480268b` 03:50 | 35 min, one work bank |
| ORD-0007 | `b145777` 03:54 | `6dcf854` 04:17 | 23 min, one work bank |
| ORD-0008 | `aefc148` 04:21 | `a262233` 04:43 | 22 min, one work bank |
| ORD-0009 | `e4e6a59` 04:47 | `160d43d` 05:46 | 59 min, two work banks |
| ORD-0010 | `df25609` 05:49 | `7eab706` 2026-09-26 | across the Regent's signature: two measurement banks and two work banks |
| ORD-0011 | the commit after `7eab706` | — | open |

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
| 25 | `17658ec` | ORD-0005 closes | 03:00 | green |
| 26 | `8f996df` | ORD-0006 emitted and open | 03:15 | green |
| 27 | `ca9c1a6` | ORD-0006 work — `glyph-templates`, `glyph-rules`, the tree in `glyph-util`, `trees.json` in the export | 03:47 | green at once; 28 of 32 mutations killed, then 30 once the export recorded every level and a lower-case forbidden name; the pair-key test was red on its own expectation — by UTF-16 unit U+10000 sorts before U+FF21 — and was fixed to what node answers |
| 28 | `480268b` | ORD-0006 closes | 03:50 | green |
| 29 | `b145777` | ORD-0007 emitted and open | 03:54 | green |
| 30 | `1a79b2c` | ORD-0007 work — `glyph-parse`, `parse.json` in the export, the tree's fields for the projections | 04:13 | green at once on 273 runs; 33 of 40 mutations killed, then 36 of 40 with a probe at the auto-close limit and a store with no numeric depth, and one mutation of mine rewritten because it did not build |
| 31 | `6dcf854` | ORD-0007 closes | 04:17 | green |
| 32 | `aefc148` | ORD-0008 emitted and open | 04:21 | green |
| 33 | `97ea472` | ORD-0008 work — `glyph-xml`, the binary `glyph`, `xml.json` in the export | 04:39 | green at once; the XML tests took 126 s until the pass read each line once, 3 s after; 28 of 32 mutations killed, then 30 with a continuing segment and a deep conjunction |
| 34 | `a262233` | ORD-0008 closes | 04:43 | green |
| 35 | `e4e6a59` | ORD-0009 emitted and open | 04:47 | green |
| 36 | `54308c3` | ORD-0009 work 1/2 — `glyph-envelope` and `glyph-burn`, `ast.json` and `hgml.json` in the export | 05:08 | green at once on the 114 digests; the burn test red on a composite with no formula until the port read `undefined` as the JS does; mutations 19 of 22 (envelope) and 7 of 22 (burn), then 22 and 20 with probes; `check:rust` red once, on `ast.json` written without the one-space indent every export file keeps, which `glyph-util`'s round trip holds |
| 37 | `9c943d3` | ORD-0009 work 2/2 — `glyph-inverse`, the round trips recorded as the suite runs (`inverse.json`) | 05:41 | the recorder red on a burn after the registry guard until it read the stores `stores.js` resolves; the depth test red on its own count until it counted the question and its text; 24 of 32 mutations killed, then 32 with the way back's probes |
| 38 | `160d43d` | ORD-0009 closes | 05:46 | green |
| 39 | `df25609` | ORD-0010 emitted and open | 05:49 | green |
| 40 | `faa6a93` | ORD-0010 measured — both protocols over the 114 sources, the ADR proposed | 06:13 | green, `check` 42 s and `check:rust` 95 s; nothing red — the measurement's first run showed the Rust's `toAST` at 10 ms whatever the source, which the probes and callgrind traced to the store digests and the rules copy (question 12) |
| 41 | `1e4f2f5` | ORD-0010 measured from a page — Chrome drives both protocols; the ADR proposes A, the engine's own HTTP | 06:22 | green, `check` 42 s and `check:rust` 95 s; nothing red — the proposal of `faa6a93`, B, had been read against ORD-0010 alone, and ORD-0013 and ORD-0014 stand on the engine's own HTTP |
| 42 | `2434e6e` | the return's totals, and the queue stops at the gate | 06:26 | green, `check` 42 s and `check:rust` 95 s |
| 43 | `3c55917` | the Regent signs B; ORD-0010 stays open until B answers the twelve calls | 23:50 | green, `check` 42 s and `check:rust` 95 s |
| 44 | `c7b8110` | ORD-0010 work 1/2 — `glyph-protocol.js` answers the twelve calls on stdio, `serve-dev.js` relays `POST /engine`, `protocol.json` in the export | 00:03 | green on a clean clone of the commit, `check` and `check:rust`; the relay bucket red, 1 of 14, with its answer altered by one byte |
| 45 | `7eab706` | ORD-0010 work 2/2 — `glyph-protocol`, drafted by a Haiku agent and finished here, and the binary `glyph-engine`: the 6 328 requests of `protocol.json` answer the JS's bytes | 00:08 | red first: 15 of 6 328 — gaps of `logic.js` write `code` before `msg`, and the port wrote one order; `code_first` carries the JS's order from `Diag` to `Gap`, then green on a clean clone of the commit |
| 46 | `4935593` | ORD-0010 closes; ORD-0011 emitted and open; the virtual paths first on the plan | 00:29 | green, both checks; the independent verifier of `glyph-protocol` was stopped before its report, to keep the budget — the 6 328 requests are the only proof |
| 47 | `25cc924` | ORD-0011 work 1 — `glyph-transport.js` behind `engine=relay`; `session:false` in the protocol; `app_on_rust.mjs` drives the page in Chrome: 106 of 114 sources the same bytes in every panel through Rust, the JS path equal to the core; the eight L-cases not yet driven, so ORD-0011 stays open | 01:10 | green, both checks; the AST panel first differed on `source`, which `serializeAST` writes null |
| 48 | `86db5c1` | the handoff for the local machine, `HANDOFF-2026-09-26.pgml`: prove the eight L-cases, close ORD-0011, then ORD-0012 | 11:49 | green, `npm run check` |
| 49 | `83326af` | ORD-0011 work 2 — the eight L-cases driven locally, through Edge on Windows: five equal in every panel, three unequal on the status line alone (question 15); `app_on_rust.mjs` finds `glyph-engine.exe` | 12:04 | green, `check` and `check:rust`; the driver stopped on a missing `glyph-engine` until it read the platform's `.exe` |
| 50 | `cf3bb31` | ORD-0011 work 3 — `parse` answers the tree's count of commands, in `glyph-protocol.js` and then in the Rust; the transport carries it and the status line reads it (question 15, b); the 114 sources the same bytes in every panel | 12:23 | red first: RL-15 answered `undefined` for 260 commands, then the Rust against `protocol.json`, then the L-cases on a stale release binary; green, `check` and `check:rust` |
| 51 | `7be1812` | ORD-0011 closes | 12:26 | green, `check` and `check:rust`; the case digest first read `64b34d0f…` through Git Bash's `sha256sum`, whose `*` marks every line binary, and `c00119e0…` with `-t` |
| 52 | this commit | ORD-0012 emitted and open; question 16 answered, `SOURCE_DATE_EPOCH` and the zip in UTC | 13:36 | green, `npm run check` |
