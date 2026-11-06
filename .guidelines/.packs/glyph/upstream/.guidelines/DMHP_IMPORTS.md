# DMHP — what is worth taking, and what is not

> Read of `dmh-protocol` (erosbnk/dmh-protocol, 939 lines of Python), against Glyph
> 2.4.5.01. Nothing here is commissioned. It is the deferred queue of
> `ORD-2026-08-30-01`, recorded after E7 and not before.

## 0. The honest comparison first

DMHP is a smaller machine, and the Regent's own reading is right: no DSL, a
regex-only command parser with no positions and no diagnostics, and no reason to
trust an output it cannot describe. Glyph passes it on every axis DMHP was built
to work on.

But DMHP was built against a problem Glyph has not had to solve: **a mutation
that reaches disk before anyone approved it.** Glyph emits; DMHP *applies*. Four
of the five imports below come from that difference, not from the language.

The fifth is a bug, and it is DMHP's, returned below.

---

## 1. What is worth taking

### D-01 — Atomic writes, and an all-or-nothing build

**Value: high. Cost: low. The best import in the set.**

`build-templates.js` emits two artefacts, and the second phase reads what the
first wrote — `expansions.json` is an output and then an input. Both go through
`emit()`, which in write mode is a bare `fs.writeFileSync` (`:60`). So is
`build-skill.js:70`, and so is the corpus snapshot (`test-corpus.js:1450`).

Two failure modes, neither addressed:

- **a torn write** — a crash or a full disk mid-write leaves a truncated store,
  and the next run reads it as content rather than as damage;
- **a half-applied build** — phase one lands, phase two does not, and the
  repository sits in a state no commit represents.

`--check` does not cover either. It answers *would a build change anything right
now*, which catches staleness and hand-edits — a different question, well
solved, and explicitly reasoned about at `build-templates.js:35–51`.

DMHP's shape, `worker_queue.py:75–81`:

```python
temporary_path = self._state_path.with_suffix(self._state_path.suffix + ".tmp")
temporary_path.write_text(...)
temporary_path.replace(self._state_path)     # atomic rename
```

For Glyph the import is that, plus one thing DMHP also has and Glyph does not:
`IntegrationGate.apply_all_validated()` stages every validated result and applies
them as a batch. Write both build outputs to `.tmp`, then rename both. A crash
leaves either the old pair or the new pair, never a mixture.

### D-02 — Content-addressed identity for conformance vectors

**Value: medium-high. Cost: low. Touches E2.**

`conformance/examples.json` keys its cases `E-01` to `E-05` — positional. The
pinned `roundTripNote` on E-01 (the apostrophe substitution) is attached to *the
position*, not to *the source it excuses*. Insert a case, reorder the file, and a
pin silently starts excusing a different vector. Lock T10 says a pin that
outlives its reason must fail the suite; a pin that migrates to another case does
not outlive its reason, it acquires a false one, and nothing catches that.

DMHP hashes identity out of content (`indexer.py:84–87`):

```python
identity = f"{source}:{symbol}:{signature}".encode("utf-8")
return f"CODE-{sha256(identity).hexdigest()[:10].upper()}"
```

For Glyph the identity is the source itself. `E-01` stays as a human label; the
pin binds to the digest. E2 rederives 173 vectors across thirteen buckets, which
is exactly when positional identity is cheapest to leave behind.

### D-03 — A generated/authored split at field level, not only at file level

**Value: medium. Cost: zero today — it is a rule, not code.**

Invariant I1 is file-granular: an artefact carries `GENERATED — do not edit` and
any diff is a gate failure. That works while every field of a generated file is
machine-derived. `expansions.json` is compiled from `expansions.txt` and
`GLOSSARY.md`, and the first time a command needs a human annotation the
file-level rule offers only two bad answers: a second file, or lose the
annotation on the next build.

DMHP already had that problem and answered it (`indexer.py:93–100`): reindexing
refreshes the machine-derived fields and **preserves the human-owned ones**
(`status`, `tests`, `d1`), matched by content identity rather than by position.

Worth writing down as a named pattern before it is needed, so the answer is not
improvised under pressure.

### D-04 — "Duplicate" and "conflicting" are different words

**Value: medium. Cost: low.**

`worker_queue.py:52–57` splits one condition Glyph collapses:

```python
if existing and existing != result:  raise ValueError("conflicting work result")
if existing:                         raise ValueError("duplicate work result")
```

Same id and same content is idempotence, and re-running a build should be free.
Same id and different content is a collision, and it is the only one that is a
defect. `Graph.add` in DMHP's own domain, and Glyph's stores, treat both as one
error — which makes a re-run indistinguishable from a real clash.

### D-05 — An output diff across the corpus, before the emitter changes

**Value: high. Cost: the largest here. Last in the queue.**

`glyph-diff.js` compares two Glyph **sources** and has `--measure` over the
corpus. Nothing compares two **emitter versions** over the same corpus.

The order measured blast radius once — *"one vector, measured by parsing all 98
corpus sources rather than estimated"* — by hand, for one change. DMHP makes that
a standing operation: `preview()` snapshots, applies, diffs, restores, and holds
the result pending an explicit `approve()`.

For Glyph the useful form is narrower: given a change to the emitter, print what
each of the 98 sources emits before and after, grouped by kind of divergence. It
is the measurement discipline the order already lives by, made repeatable instead
of re-improvised per release.

---

## 2. What is not worth taking

- **The capability index, the D3/D2/D1 graph, the worker queue, effort
  transfer.** They solve DMHP's problem. Glyph has no capability discovery
  problem, and importing the vocabulary would add a second one.
- **The command parser.** Twenty-two regexes, `re.fullmatch`, and
  `raise ValueError("invalid command")` — no position, no code, no suggested
  repair. Glyph's refusals name the construct, carry a span and state the repair.
  This is the axis on which Glyph is years ahead, and there is nothing to take.
- **`PREVIEW → DIFF → APPROVAL → MUTATION` as a whole.** Only its diff half (D-05)
  transfers. Glyph emits documents rather than applying mutations, so approval
  has nothing to gate; the git working tree already plays that role.

---

## 3. Returned to the Regent — a defect in DMHP

Not a Glyph matter, and worth more to you than anything above.

**`PREVIEW` leaves a persistent mutation, and its own diff cannot see it.**

`Harness.preview()` (`harness.py:160–167`) calls `execute()`, which really runs
the command, then calls `restore(before)`. But `snapshot()` (`:262`) covers only
`graph` and `constraints`, while `_generate` (`:227–232`) writes to
`CAPABILITY_INDEX.json` through `_save_capabilities`. The file is never restored.

Reproduced on the archive as received, Python 3.13.5:

```text
capabilities before:                  0
preview('GENERATE ALGORITHM FOR detect duplicate rows')
  diff reported:                      {'added': [], 'removed': []}
reject()
capabilities after PREVIEW+REJECT:    1     ← ALG-00001, status GENERATED
```

This breaks two of the seven active contracts in `docs/CONTRACT_SPEC.md`:
**2. `PREVIEW` não deixa mutação persistente** and **4. Operação rejeitada
preserva snapshot anterior**.

The diff reporting `added: []` is the worse half. A gate that reports "nothing
changed" while something changed is the failure `BUNDLE_TARGET.md` I2 names —
*an unenforced rule that reads as enforced is worse than an absent one* — and the
same shape as the `also="?"` placeholder Glyph removed in `XML_REFERENCE.md`
§11.5.

**The smallest fix is one line of scope, not one of logic:** `snapshot()` and
`restore()` must cover the capability index, or `preview()` must run against a
copy of it. Everything downstream — the diff, `reject()`, contract 4 — becomes
correct once the snapshot covers what the command can actually change.

*(Tested on an extraction in a scratchpad directory. Your repository was not
touched.)*
