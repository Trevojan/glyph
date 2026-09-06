# XML reference — where the draft diverged

`XML_REFERENCE.md` was reconciled from a hand-written draft. This is the
record of the disagreements and how each resolved, kept so the same drift is
not reintroduced later.

The two draft proposals that are **better** than what the engine does did not
come here: they are open, in `.guidelines/.plan/`.

---

## 9. Where the draft reference diverged

This file was reconciled from a hand-written draft. Of 91 bracket→element pairs
in that draft, **89 matched the engine exactly**. The rest, and the structural
disagreements, resolved as follows — recorded so the same drift is not
reintroduced later:

| Draft said | Engine emits | Resolution |
|---|---|---|
| `[BASE]` → `<base>` | `[base` is **unresolved** | Draft is stale. `GLOSSARY.md` §0.2 is normative: `BASE` is only the `expansions.txt` keyword meaning "atom", and the command was renamed **`CORE`** in v1.1.0.0 precisely to end that collision. `[core` → `<core>`. |
| `R:` → `<return>` | `<user-expectative expects="…">` | Engine. The draft's own §8 already names `<user-expectative>` as the form in use, so the draft contradicted itself. |
| `` `literal` `` → `<literal>` | `<user-input>` | Engine, same reason: the draft's §8 lists `<user-input>` as current. |
| `<emotion tone="eth prd">` | `<mood dominant="enthusiasm" also="pride">` | Engine. Carrying the gloss rather than the code keeps the deliverable readable without the vocabulary loaded, and `dominant`/`also` states the "first is dominant" rule instead of leaving it to word order. |
| `,` → `<item>` elements | repeated `<user-input>` | Engine. A wrapper element per item adds a level that carries nothing. |
| `[OFF]`→`<plain>`, `;;`→`<br/>` | `<off>`, `<break/>` | Engine — naming only, no semantic difference. |
