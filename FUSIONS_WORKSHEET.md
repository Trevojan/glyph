# Fusions worksheet — historical document (v1.7)

> ## ⚠ The fusions decided here were UNDONE in v1.1.0.0
>
> The seven aliases decided below left the engine. `[eval]`, `[rev]`, `[spec]`,
> `[simp]`, `[qst]`, `[forex]` and `[onlyif]` are commands in their own right
> again. See `GLOSSARY.md` §6.5.
>
> The document stays as a **record of the method and of the mistake**, not as
> norm. What holds today about each pair:
>
> | pair | the axis that separates them |
> |---|---|
> | `[eval]` / `[crit]` | against a realistic quality standard / against the declared objective |
> | `[rev]` / `[crit]` | reading sweep, no formal comparison / formal comparison |
> | `[spec]` / `[elab]` | the detailed artefact (noun) / the act of detailing (verb) |
> | `[simp]` / `[clar]` | cutting complexity / removing ambiguity |
> | `[qst]` / `[ask]` | typing the block as interrogative / act aimed at someone |
> | `[forex]` / `[ex]` | the connective that introduces / the datum itself |
> | `[onlyif]` / `[cond]` | necessary condition / generic gate |
>
> ### What the method got wrong
>
> Test **P2** ("do you know which to use as you type, without stopping?")
> treated **hesitation** as proof of **identity**. They are not the same:
> hesitating says the distinction is hard to remember, not that it does not
> exist. All seven pairs had a real axis — the seven are in the table above, and
> none of them is a later invention; every one was derivable from glosses that
> already existed.
>
> The symptom that P2 was measuring the wrong thing is in the document itself.
> The rule said "passed all three → keep both, **and write the difference
> criterion into the documentation (if you cannot write it, it failed P2)**".
> The criterion was writable in all seven cases. Nobody tried to write it before
> fusing.
>
> **Lesson for the next worksheet:** replace P2 with "can I write the difference
> criterion in one line?". If you can, both live and the line becomes
> documentation. If you cannot, then fuse.

---

Goal: for each house, pick **one canonical survivor** and turn the rest into
aliases. Nothing is removed. An alias stays accepted on input; the engine emits
the canonical form.

## How to fill it in

For each pair, answer three questions. Write the answer out, not just yes/no —
writing is what exposes rationalisation.

**P1 — Consequence.** Write the whole sentence each command produces. If both
sentences ask the reader for the same thing, **fail** → fuse.

**P2 — Decidable in the act.** Do you know which to use *as you type*, without
stopping? If you hesitate, **fail** → fuse. This is the only question only you
can answer.

**P3 — Non-recoverability.** Is the difference already in the argument you pass
anyway? If it is, **fail** → fuse.

**Rule:** failed any one → fuse. Passed all three → keep both, and write the
difference criterion into the documentation (if you cannot write it, it failed
P2).

Acting on a fusion is **one line** in `ALIAS`:
```js
ALIAS = { ..., LOSER:"WINNER" }
```
`ALIAS` is consulted before `INSTR` in `classify()`, so the fusion takes effect
immediately and the command keeps parsing.

---

## House 1 — DIR + Evaluation (4 commands)

`[crit]` criticise · `[eval]` evaluate · `[rev]` review · `[val]` validate

| | P1 consequence | P2 decide in the act? | P3 already in the arg? | verdict |
|---|---|---|---|---|
| `[crit]` vs `[eval]` | "point out the defects" / "give a verdict of worth" | ✗ hesitates — both ask for judgement | ✗ the argument is the same | **FUSE** `EVAL:"CRIT"` |
| `[eval]` vs `[rev]` | "judge the worth" / "walk through and comment" | ✗ hesitates | ✗ "walking through" is the method, not the result | **FUSE** `REV:"CRIT"` |
| `[val]` vs the other three | "check against **this external criterion**" / the others require no criterion | ✓ knows in the act: is there a criterion? `[val]` | ✓ the criterion is the parameter | **KEEP** |

> Result: **`[crit]` and `[val]` survive.** `[eval]` and `[rev]` become aliases
> of `[crit]`. Documentable criterion: `[val]` requires an external criterion as
> parameter; `[crit]` does not.

## House 2 — ASS + Background (4 commands)

`[assm]` assumption · `[ctx]` context · `[hyp]` hypothesis · `[ref]` reference

| | P1 consequence | P2 decide in the act? | P3 already in the arg? | verdict |
|---|---|---|---|---|
| `[assm]` vs `[hyp]` | "I take it as a given premise" / "I propose it for testing" | ✓ knows: going to test it? `[hyp]` | ✓ the intent to test is distinct | **KEEP** |
| `[ctx]` vs `[ref]` | "conceptual frame or scenario" / "direct pointer to an external source" | ✓ knows: is it a link/source? `[ref]` | ✓ ref's argument is a URI/source | **KEEP** |

> Result: **all four survive.** Each has a clear semantic role, distinguishable
> in the act.

## House 3 — ASS + Elaboration (3 commands)

`[ex]` example · `[forex]` for example · `[seeal]` see also

| | P1 consequence | P2 decide in the act? | P3 already in the arg? | verdict |
|---|---|---|---|---|
| `[ex]` vs `[forex]` | identical | ✗ hesitates | — | **FUSE** `FOREX:"EX"` |
| `[ex]` vs `[seeal]` | "illustrates the concept" / "points at a related, lateral topic" | ✓ knows in the act | ✓ lateral relation ≠ exemplification | **KEEP** |

> Result: **`[ex]` and `[seeal]` survive.** `[forex]` becomes an alias of `[ex]`.

## House 4 — DIR + Solutionhood

`[ask]` ask · `[qst]` question

| | P1 consequence | P2 decide in the act? | P3 already in the arg? | verdict |
|---|---|---|---|---|
| `[ask]` vs `[qst]` | the act of asking / the content of the question (recoverable) | ✗ hesitates | ✗ redundant | **FUSE** `QST:"ASK"` |

> Result: **`[ask]` survives.** `[qst]` becomes an alias of `[ask]`.

---

## Houses 5 to 12 — complete resolutions

| # | House | Commands | P1 consequence | P2 | P3 | verdict | Aliases |
|---|---|---|---|---|---|---|---|
| 5 | `-` + Unconditional | `[alw]` `[nev]` | "always" / "never" | ✓ | ✓ | **KEEP** | — |
| 6 | `-` + Condition | `[cond]` `[onlyif]` | "under this condition" / "exclusively if" | ✗ hesitates | ✗ redundant in the arg | **FUSE** | `ONLYIF:"COND"` |
| 7 | `-` + Otherwise | `[exc]` `[instof]` | "exception to the rule" / "active substitution" | ✓ | ✓ | **KEEP** | — |
| 8 | DIR + Elaboration | `[elab]` `[spec]` | "more detail" / "more precision" | ✗ hesitates | ✗ overlap in the act | **FUSE** | `SPEC:"ELAB"` |
| 9 | DIR + Restatement | `[clar]` `[simp]` | "make it clearer" / "make it simpler" | ✗ hesitates | ✗ same practical intent | **FUSE** | `SIMP:"CLAR"` |
| 10 | DIR + Contrast | `[cmp]` `[dist]` | similarities and differences / differences only | ✓ | ✓ | **KEEP** | — |
| 11 | DIR + Antithesis | `[ctrd]` `[skep]` | "assert the opposite" / "cast doubt on it" | ✓ | ✓ | **KEEP** | — |
| 12 | DIR + List | `[brst]` `[cat]` | "generate new items" / "group existing items" | ✓ | ✓ | **KEEP** | — |

> **Summary of the fusions applied:** `EVAL:"CRIT"`, `REV:"CRIT"`,
> `ONLYIF:"COND"`, `SPEC:"ELAB"`, `SIMP:"CLAR"`, plus `FOREX:"EX"` and
> `QST:"ASK"`.

---

## After filling it in

*(The v1.7 procedure, kept as a record. `test-lexer.js` no longer exists — the
suite is `scripts/test-corpus.js`, and the layer table is already complete in
`expansions.txt`, verifiable with `node scripts/dag.js`.)*

1. Add up the fusions. Each is one line in `ALIAS`.
2. Run the suite. It should keep passing — if it breaks, the alias collided with
   something.
3. For each pair **kept**, write one line of criterion into the documentation. If
   you stall while writing, the pair failed P2 and you found out late. Go back
   and fuse.
4. The canonical survivors go into `expansions.txt` for `dag.js` to compute the
   layers.

> Step 3 was the safeguard, and it is the one v1.7 skipped. Writing the criterion
> **before** fusing would have shown that all seven pairs had one — see the
> warning at the top.
