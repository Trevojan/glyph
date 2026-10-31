# Glossary — the record of what was closed

The vocabulary's closure record, carved out of `GLOSSARY.md` so the normative
reference states what the vocabulary **is** and nothing else. The `§6.x`
numbering is kept: the pointers in `scripts/glyph-parser.js`, `rules.json`,
the suite and `FUSIONS_WORKSHEET.md` resolve into this file.

Everything here is closed. Nothing waits on a decision.

---

## 6. Record of what was closed

### 6.1 The composition table — `expansions.txt`

88 non-expanding declarations (77 vocabulary atoms + 11 engine/mode entries that
appear inside formulas) and 32 composite formulas.

```
level 0  [hieroglyph]   88
level 1  [composite-1]  13   ALT DEPR EVAL FRGT GEN IMAG INTN PROB QST RESTR RMBR RTNL VRFY
level 2  [composite-2]   9   ASSM BRST CRIT CTRD DRVF FOREX LRN PROP SIMP
level 3  [composite-3]   2   CNCL SUM
level 4  [composite-4]   4   CAT CNSD JUST TRYFR
level 5  [composite-5]   3   FBK SCRU VAL
level 6  [composite-6]   1   HYP

120 layered, 0 undefined, 0 cycles
```

`HYP` is the deepest at 6 levels, and it follows: hypothesis depends on `FBK`,
which depends on `TRYFR`, which depends on `CNCL`, which depends on `DRVF`,
which depends on `RTNL`. Five hops to reach the atoms.

Two `dag.js` fixes were needed for that number to mean anything. The dependency
regex was `/[A-Z_][\w-]*/g`, with `-` **inside** the character class, so
`CMP-TRUE` came out as a single phantom identifier instead of CMP and TRUE — it
was written when formulas were space-separated, and the chain notation broke it
silently. And the level labels called level 1 "primitive" while `ALT`, `VRFY`
and `RMBR` sit there and are composites.

### 6.2 Twelve commands the engine did not have

`FIND` `GET` `SUB` `ADD` `WHR` `HGH` `LOW` `NONE` `SWITCH` `BOLD` `LIGHT` `GO`

Half the composition formulas referenced them and could not resolve. Two new
`CATS` categories were needed because they did not fit the existing ones:
**Context** (reading, writing and locating inside a scope) separates *operating
within* a scope from *declaring* one, which is what *Frame* already did;
**Intensity** grades a single item, whereas `PRIO` orders items against each
other.

`go` left `SESSION` as a side effect: `classify()` consults `INSTR` before
`SESSION`, so the lowercase session tag became a second, unreachable definition
of the same word — the same reason `prob` had left that table earlier.

### 6.3 Three phantom symbols

`CMD`, `R` and `THEN` were dependencies no declaration ever defined.

**`THEN` was removed, not replaced.** §0.1 defines juxtaposition `[A][B]` as
sequence, which is exactly what `THEN` marked. In `VAL` and `TRYFR` it sat
between already-juxtaposed groups, so it was pure redundancy. In `SCRU` it was
inside a comma list — where commas are conjunction, hence unordered — so it was
the only thing saying B came after A; removing it required deciding what
happened to C, and the choice was A→B in sequence with C in parallel.

**`R` was resolved in `dag.js`, not in the formula.** `R:` is the lexer's return
token, not a command. Rather than delete it from `SCRU` and lose the return
marking, `dag.js` now discards return tokens before extracting dependencies.
Composing and marking a return are different axes.

**`CMD` was removed from `FBK`.** It was a metavariable, and `ALT` already means
"the alternative": `[GO[ALT-CMD]]` → `[GO[ALT]]`.

### 6.4 `BASE` → `CORE`

Applied at four points: `CATS` and `INSTR` in the parser, the `subject` class in
`rules.json`, and three `tag:"base"` occurrences in the moulds. A negative
case (`N-13`) pins that `[base]` must now fail as unknown vocabulary — without
it the collision the rename undid could creep back through the parser unnoticed.

### 6.5 The v1.7 fusions, undone

The distinctions follow a single axis — *object vs. act*, or *standard of
comparison*:

| pair | what separates them |
|---|---|
| `EX` / `FOREX` | the datum / the connective that introduces it |
| `QST` / `ASK` | typing of the block / act aimed at someone |
| `EVAL` / `CRIT` | against a realistic standard / against the declared objective |
| `REV` / `CRIT` | reading sweep without comparison / formal comparison |
| `ONLYIF` / `COND` | necessary condition / generic gate |
| `SPEC` / `ELAB` | the detailed artefact / the act of detailing |
| `SIMP` / `CLAR` | cutting complexity / removing ambiguity |

Undoing it was deleting seven `ALIAS` lines: `classify()` consults `ALIAS`
before `INSTR`, and all seven already had their own `INSTR` entry and `FRAMES`
valency, so the line's mere existence *was* the fusion.

Three rules cited the fusion as fact and were corrected. `clar-elab` became
`simp-elab` — the real tension is cutting versus adding, and the one that cuts
is `SIMP`; `CLAR` removes ambiguity, which often *adds* words. `gen-elab` lost
its "(ELAB absorbed SPEC)" and gained a sibling, `gen-spec`, the tension the
fusion had been hiding. The `coarsen` class went from `[GEN, SUM, CLAR]` to
`[GEN, SUM, SIMP]` for the same reason.

### 6.6 `req-deny` demoted

From `fix`/contradiction to `ask`/tension. With `DENY` bearing on the *route to
a result* and `REQ` on the *existence of something*, the two stopped colliding
by construction: legitimate when the rejected route is not the only one, wrong
when it is. As `fix` the rule was failing valid input — and `fix` means "the XML
is not trustworthy", which was not the case.

### 6.7 Three unbalanced formulas

`VAL`, `EVAL` and `SCRU` were closed by hand. In Glyph source an unclosed `[` is
legal — it nests inside the previous one — but in a composition formula it makes
scope undecidable, and `.hgml` requires explicit closure.

---
