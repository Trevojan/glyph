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
| queue | ORD-0001 and ORD-0002 closed; ORD-0003 opens next. The tag `conformance-v0` is on `030ed76` in the session's clone only — its push was refused (below) |

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

## ORDs closed

| ORD | delivered | commit | digest it matched |
|---|---|---|---|
| [`ORD-0001`](ORD-0001/ORD-0001.xml) | the frozen oracle: `--export-oracle` writes 114 files | `030ed76`, the tag `conformance-v0` | `c00119e0f6253564f53b9d05dafc8a6833a489e27a0af7caa42d45bc4c22d828` |
| [`ORD-0002`](ORD-0002/ORD-0002.xml) | `glyph-util` and `glyph-version`: `esc`, `xesc`, `lev`, `walk` and `VERSION` equal the JS on everything the oracle holds | `79aebbd` | `6fb833ec47e105cdc72fd515633597896e1e65d83730dcd157f67876cc927b5c`, `oracle-modules/util.json` |

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

## Open, and why

Nothing is open. ORD-0003, `glyph-vocab` and `glyph-stores`, opens next.

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
- **The survivor: `lev` counting `char`s instead of UTF-16 units.** No string
  in the oracle carries a character outside the BMP, so the two countings
  answer alike on all of it. 129 strings are non-ASCII, which holds bytes
  apart from units, but nothing holds units apart from characters. Closing it
  takes a declared source with such a character, and that moves the snapshot:
  a question below.
- **The version stays `3.5.8.06`.** No emitted document changes; the
  CHANGELOG entry waits for a release, as the work of 2026-09-24 does.

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
   source that does?** It is what would hold `lev`, and the UTF-16 spans of
   ORD-0004, to UTF-16 units rather than characters.
   - a. yes: a declared source with an astral character, the snapshot moved by
     decision
   - b. no: the blind spot pinned by name, as a known loss
   - c. later, when ORD-0004 opens

## The session, measured

| ORD | opened | closed | open for |
|---|---|---|---|
| ORD-0001 | `02c92ee` 01:28 | `030ed76` 01:31 | 3 min |
| ORD-0002 | `3413eb5` 01:40 | the commit after `79aebbd` | ~13 min, three work banks |

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
| 13 | this commit | ORD-0002 closes | 2026-09-25 | green |
