# Preliminary intake — variables, and the bracket a literal cannot hold

> **Not an order.** `ORD-2026-08-30-01` is open and immutable save by version; a
> second concurrent order is forbidden. This records the verification the Regent
> asked for (`[vrfy[atc]]`) and the design it exposes — the same treatment
> `INTAKE-EFFECTS.md` was given.
>
> Everything marked *measured* was run against the engine at **2.4.6.04**.

## 1. The attachment, verified

`glyph-variable-naming-system.pgml`, 39 lines, authored by the Regent.
**36 diagnostics, none of them the empty-slot kind.** All refusals.

| code | n | cause |
|---|---|---|
| `fix/UnterminatedLiteral` | 10 | see §1.1 |
| `fix/UnmatchedCloseBracket` | 8 | cascade from the above |
| `fix/UnknownCommand` | 17 | 10 distinct invented names |
| `note/LooseDots` | 1 | a `.` outside a separator |

### 1.1 The cause is not the escape. **A Glyph literal cannot contain `]`.**

The file writes `[EX'[sum\'organized\'[iter-core[ctx]]]']`, and `\'` is a
JavaScript convention Glyph has no notion of. That was the obvious reading, and
it is **wrong**: rewriting every literal with backticks and no backslashes still
produces **36 diagnostics** — measured. The count does not move. Only the code
changes, `UnterminatedLiteral` → `TruncatedLiteral`.

The real rule, measured one case at a time:

| source | result |
|---|---|
| a backtick literal of plain text | clean |
| a literal containing `[` | **clean** — the open bracket is content |
| a literal containing `]` | `TruncatedLiteral` ×2, `UnmatchedCloseBracket` |
| the same under `'` instead of a backtick | identical failure |

**`]` closes the command from inside a literal, under either quote.** And there
is no way out — every candidate was tried:

| escape attempt | result |
|---|---|
| backslash before the bracket | refused — no backslash escape exists |
| doubling the bracket | refused — doubling is not a construct |
| the XML entity `&#93;` | refused, **and for a second reason**: `;` is a separator, so no entity can survive either |
| `[logic]` … `[/logic]` | **carried** — see §1.3 |

So the file is not fixable by quoting it differently. **A document that quotes
Glyph cannot be written in Glyph**, because the thing it must quote ends with the
character that ends a literal.

### 1.2 The diagnostic gives advice that is already followed

> *literal cortado no `]`. Feche com* ` *antes.*

The literal **is** closed with a backtick — after the `]`, which is exactly where
an author would put it. The message describes a fix the author has already
applied, so it reads as the engine not seeing the text. The cause is `]`, and the
message never says so. Cheap to correct, and it is what turned a one-line lexer
rule into a file the Regent could not diagnose by reading it.

### 1.2b The README documents this — and gets two of the five characters wrong

`README.md:66` already names the class, inside the round-trip caveat:

> *…and text holding `' \` [ ]` is substituted rather than preserved.*

So the behaviour is not undocumented. But *substituted rather than preserved*
promises you can **write** it and it comes back changed. Measured, per character:

| | actual |
|---|---|
| `'` | substituted, `'` → `’` — as documented |
| `` ` `` | substituted, → `’` — as documented |
| `[` | substituted, → `(` — as documented |
| `\` | **preserved.** The README says substituted |
| `]` | **refused at parse.** It never reaches the round trip at all |

Two corrections in one line of README, and the `]` row is the one that matters:
the document promises a lossy write where the parser performs a refusal. That is
the same shape as the `file://` claim in G21 — a sentence that stopped being true
and no gate reads it.

### 1.3 The fence already carries a bracket, and it is the only thing that does

Source: `[logic]` wrapping `[sum'organized'[itr-core[ctx]]]`, closed with `[/logic]`.

```xml
<logic>
  <rule kind="expr">
    <source>[sum'organized'[itr-core[ctx]]]</source>   <!-- verbatim, ] and all -->
    <uses>itr, core, ctx</uses>                        <!-- misread: see below -->
  </rule>
</logic>
```

The `]` survives into `<source>`. But `[logic]` means *logic*, so it reads the
content as an expression and reports `itr`, `core`, `ctx` as undefined
variables. **A verbatim fence is the missing sibling of a construct that already
exists**, not a new mechanism — `INTAKE-EFFECTS.md` §5 already argued the fence
contract generalises, and this is the second case that needs it.

### 1.4 The vocabulary — ten names that do not exist

`DOC` `SEC` `DESC` `RULE` `NOTE` `SYNTAX` `SCOPE` `RESULT` `CMD` `CMD2`

`CMD` / `CMD2` are **metasyntax** — placeholders standing for *any command*,
inside the file's `[SYNTAX'…']` line. They are the §1.1 problem again, not a
missing word. The other eight are a documentation vocabulary that was never built.

### 1.5 `NOTE` is refused while `<note>` is emitted — measured

```
G.elementCanonicalMap["note"]  ->  { canonical: "NT", tier: "instr" }
```

`[nt'…']` emits `<note>`, and the inverse accepts `<note>` and returns `NT`. But
the **forward parser refuses `[NOTE`**: the element's own name is not an input
spelling. The Regent wrote the obvious thing and was refused by an asymmetry
rather than by a decision. Same class as `ITER` for `ITR`.

### 1.6 What the file uses correctly

`VAR` `SUM` `CTX` `GET` `FIND` `WHR` `TGT` `NEQ` `EQ` `EX` `SECTION` `BOLD`
`CORE` `ITR`. Two near-misses: **`ITER`** is spelled `ITR`, and **`PART` does not
exist** — already pinned in `INTAKE-EFFECTS.md` §8.

## 2. The claim the file makes, measured against the engine

The document's thesis: **a command's text operand names the command's result.**

> *"result is named after the input text"* — the result of `SUM` becomes the
> variable `organized`.

Run it:

```xml
<variable>
  <user-input>get_data</user-input>              <!-- the NAME -->
  <get>
    <chain><find/></chain>
    <user-input>~/weird_data.json</user-input>   <!-- a PATH -->
  </get>
</variable>
```

**Both are `<user-input>`.** The engine does not distinguish a name from a value;
nothing in the emitted document says `get_data` binds anything. And the reference
`[eval'get_data']` emits `<evaluate><user-input>get_data</user-input></evaluate>`
— nothing links the use to the definition.

**The file is not describing how Glyph works. It is specifying how it should.**

### 2.1 The machinery exists, one layer down

`[logic]if hp > 10 then adult = true[/logic]`

```xml
<uses>hp, adult</uses>
<needs var="hp">usado e nunca definido</needs>
<needs var="adult">usado e nunca definido</needs>
```

**Glyph already has variables** — free names, use-before-definition, and an
unresolved-name diagnostic that does not block. `freeVars` is real code. It is
fenced: it works *inside* `[logic]`, and `[VAR]` outside the fence is not wired
to it.

That is the precise gap, and it is smaller than "add variables to Glyph".

## 3. What this settles that was already open

The file answers two questions `INTAKE-EFFECTS.md` left open, which is why it is
worth more than its 39 lines:

| open question | this answers |
|---|---|
| **§4.1** — a checkpoint needs a name bound to a point, *"and what binds it is not decided"* | **the text operand binds it.** `[res'before-validation']` names a checkpoint by the same rule `[VAR'x']` names a variable. No new mechanism. |
| **§8** — *"'item' has no definition… Glyph has commands, literals and slots — no value and no object"* | **an item is the named result of a command.** The value the effects feature needs is the thing §2 says the engine does not yet emit. |

The effects feature and this one are the same feature seen from two ends.

## 4. `[rsn]` — "deal with files with this kind of content", split

Four separable problems, in ascending cost.

### A — the engine cannot read a file at all. *(small, independent)*

`glyph-cli.js` takes source as **argv**; there is no `readFileSync` in the CLI or
the core — measured. `node scripts/glyph-cli.js file.pgml --xml` compiles the
*string* `"file.pgml"`. "Deal with files" has no entry point regardless of
content. A path argument, a `.pgml` read, and a gate that the documented
invocation works — the AP-02 shape that caught the `file://` claim.

### B — the diagnostic in §1.2 names the wrong character. *(trivial)*

Independent of every decision below, and it is what cost the Regent the most.

### C — a verbatim fence, so Glyph can quote Glyph. *(small-to-medium)*

§1.3 shows the contract already exists and already carries `]`. The alternative
— eight documentation commands — solves one document, grows the vocabulary by 7%,
and still cannot quote a bracket. **Recommendation: the fence.**

Separately and regardless: `NOTE`→`NT`, `ITER`→`ITR` as accepted spellings (§1.5).

### D — variables that bind outside the fence. *(large. Measure before design.)*

The `<user-input>` collapse in §2 is the whole feature. Making the document
distinguish *a name being bound* from *a value being passed* is a semantic model,
not a serialisation change, and it drags in scope — the file says *"variable
exists in current glyph-package"*, a scope rule stated in one line and costing a
design. `INTAKE-EFFECTS.md` §9 split its cost the same way and put the semantic
half in a second order. This belongs beside it.

## 5. Delivered — 3.4.7.05

> The Regent chose the whole batch, D included: *"Sim, e também ligar nome a valor."*

| item | shipped |
|---|---|
| **A** the engine could not read a file | `--file`, and a bare path is refused rather than guessed. `CL-01..03` |
| **B** the diagnostic named the wrong character | `TruncatedLiteral` names `]` and no longer prescribes a fix already applied. `DG-01..03`, `DG-03` observed failing first |
| **C** Glyph could not quote Glyph | `[raw]…[/raw]`, the `[logic]` contract with no sub-grammar. `RW-01..05` |
| §1.5 spellings | closed as a class: all **98** refused element names now parse, derived from `GLOSS_REVERSE` so the two directions cannot drift. `SP-01..03` |
| §1.2b README wrong on two characters | corrected: `\` is preserved, `]` is refused at parse |
| **D** bindings outside the fence | `binds`, `ref`, `role`, `DuplicateBinding`. `BD-01..06`, `RO-01..05` |

### What D did not deliver, and why

**`<needs var>` outside the `[logic]` fence has nothing to fire on.** A reference
is recognised *because* its text matches a bound name, so an unresolved one is
indistinguishable from ordinary prose. Reporting it would require a reference
**syntax** — a way to write "this literal is a use" — which is vocabulary and
therefore the Regent's to decide. Everything else in D shipped.

Scope is the whole `glyph-package`, as the Regent's file specifies. Nested
scopes were not built and were not asked for.

**A + B + C together are the literal reading of `[rsn]`** — after them the engine
reads a file, says what is actually wrong, and can hold a document that quotes
Glyph. **D is what the file's content asks for**, and is a second order either way.

Nothing here proceeds past this record without that answer.
