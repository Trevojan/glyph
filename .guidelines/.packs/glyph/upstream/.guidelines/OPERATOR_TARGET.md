# Operator target — carrying `-` and `,` from the parse tree to the XML and back

> **Delivered at 2.4.5.01.** The design record for how `-` and `,` reach the XML
> and come back, and for the two removals that landed with them (§5) — both
> decided at v1.7 and, until this document, never propagated past the grammar.
> One decision marked **[Regent]** is still open (§9). Every reproduction below
> is an output of the engine at `v1.4.4.01`, which is where the defects were
> measured.

---

## 0. The honest defeater

The whole of this change is **two deletions and two export lines**. The
temptation — which the first draft of this document did not resist — is to
thread a new field from the lexer through the parser to the emitter. That would
be building machinery to carry a value the engine already carries.

`scripts/glyph-parser.js:1242` writes `origin` onto every command node, and it
already holds the operator:

```
[rtnl-go,nt`X`]  →  RTNL origin="root"  GO origin="extend"  NT origin="item"
[rtnl-go-nt`X`]  →  RTNL origin="root"  GO origin="extend"  NT origin="extend"
```

Reproduce by walking `G.parse(src).segments[0].children` and reading `n.origin`
— **not** with `--ast`, which is the serialised form and is exactly where the
value is lost. Across the corpus `origin` takes four values: `root` (169),
`nest` (75), `item` (12), `extend` (11).

So the defeater against this document is: *if the field is already there, this is
a two-line patch and not a target.* The answer is that the field being there is
what makes the change small, and three things still have to be decided rather
than typed:

1. **`origin` is not sufficient on its own.** It says which operator made the
   edge; it does not say whether the child was written bare. `[in-rwk]` and
   `[in-[rwk]]` both give `origin="extend"`, and they must not serialise the same
   way. The second fact is needed, and §2 shows where it already lives.
2. **`chainElement` at `:1243` conflates the two facts**, which is why `-` before
   a `[` currently cancels the `<needs>` of a bracketed command:

   ```
   [in[rwk]]     →  <rework><needs>what to rework</needs></rework>
   [in-[rwk]]    →  <rework/>
   ```

3. **The two deletions are not free**, because deleting from the documentation
   alone leaves ten live sites in the parser (§5.3, §5.4) and relocates the
   silence rather than ending it (§5.5).

The second defeater is smaller and is accepted rather than answered: this design
makes `-[` and `[` synonyms. `[in-[rwk]]` will parse as `[in[rwk]]` and
`fromXML()` will write back the plain bracket. That loses a character the author
typed, on the precedent recorded at `scripts/test-corpus.js:647` — the round-trip
invariant is **XML equality, not source equality**, and aliases (`[rw` → `[rwk`)
already normalise the same way.

### 0.1 Where the first draft of this document diverged

Recorded so the same reasoning is not repeated, in the manner of
`XML_REFERENCE.md` §9:

| Draft v1 said | Correct | Resolution |
|---|---|---|
| the parser discards which operator produced a child | the parser records it in `origin` (`:1242`); two **consumers** drop it | the proposed `chainOp` field is withdrawn — §2 |
| `/` divide should become a positioned diagnostic, kept and marked | `/` is deleted | superseded — `C-01` decided this at v1.7 and it reached the grammar only |
| `\eth\` is a supported alternative spelling, and the author can be told to use it | `\` is an **abandoned** spelling, replaced by `/` under `I-19` | it is removed in the same release, §5.4; the former **[Regent]** question about it is answered |
| the mood fabrication is a divide-operator problem | two independent defects, one of which reaches the deliverable through `\eth\` too | §6 |

---

## 1. Where the operator is discarded

Not in the lexer, and not in the parser.

The lexer emits three distinct tokens, verified with `G.tokenize()`:

| Token | Site | Emitted when |
|---|---|---|
| `comma` | `scripts/glyph-parser.js:573–579` | `,` anywhere; sets `expectBare` if the previous token was a `bareTag` |
| `extend` | `scripts/glyph-parser.js:596–602` | `-` with an empty text buffer, directly after `open` or `bareTag` |
| `divide` | `scripts/glyph-parser.js:604–608` | `/` with an empty text buffer, directly after `extend` — and only there. **Deleted by §5.3.** |

The parser carries them forward: `pendingOrigin` takes `"extend"` (`:1349`),
`"divide"` (`:1362`) and `"item"` (`:1363`), and `:1242` writes the value onto the
node as `origin`.

**The discard is in two consumers, and nowhere else:**

| Site | What it drops |
|---|---|
| `astShallow()` — `:1798–1819` | serialises the node field by field; `origin` is not among the fields, so the AST JSON cannot see it |
| `emit()` — `:1685–1750` | builds the element and its attributes without ever reading `origin`, so the XML cannot carry it |

`fromXML()` (`:2293–2327`) is then a victim rather than a cause: there is nothing
in the XML for it to read.

Reproduced — identical serialisations from different trees:

```bash
node scripts/glyph-parser.js "[rtnl-go-nt'X']" --ast > a.json
node scripts/glyph-parser.js "[rtnl-go,nt'X']" --ast > b.json   # a.json === b.json
```

And the fabrication that follows, in three steps:

```
[in[rtnl-go`cover X`]]
  →  <rationale><go/><user-input>cover X</user-input></rationale>
  →  fromXML  →  [ins[rtnl[go]'cover X']]
  →  <rationale><go><needs>what to execute</needs></go>…
```

`<needs>what to execute</needs>` was written by the engine, about a question the
human already answered. Under the engine's own principle — an empty slot does not
block, it becomes `<needs>` — a fabricated question is indistinguishable from a
real one. **That is the defect class this document exists for.**

---

## 2. How the AST carries it

### 2.1 `origin` is exported; no new field is added

`astShallow()` gains one line, and the node keeps the field it already had:

```js
origin: nd.origin || null,
```

`chainOp` from the first draft is **withdrawn**. It would have duplicated
`origin` under a second name.

### 2.2 `chainElement` is narrowed, and is *not* derivable from `origin`

The two facts are independent, and this is the measurement that proves it:

| Source | `origin` | `tok.k` | `chainElement` today |
|---|---|---|---|
| `[in-rwk]` | `extend` | `bareTag` | true |
| `[in-[rwk]]` | `extend` | `open` | true |
| `[in[rwk]]` | `nest` | `open` | false |
| `[crit[ctx],[ask]]` → ASK | `item` | `open` | false |

Rows one and two share an `origin` and differ in bareness, so **bareness cannot
be recovered from `origin`** and `chainElement` cannot be dropped. It does not
need a new field either: bareness is `nd.tok.k === "bareTag"`, which the node
already carries. So `:1243` narrows to the question it is actually asked:

```js
chainElement: tk.k === "bareTag",          // was: || pendingOrigin === "extend" || === "divide"
```

| Field | Type | Answers | Source |
|---|---|---|---|
| `chainElement` | boolean | was this written **bare**, with no `[` of its own — and therefore cannot hold an operand | `tok.k` |
| `origin` | `"root"` \| `"nest"` \| `"extend"` \| `"item"` | which operator produced the edge to the parent | already present at `:1242` |

`"divide"` leaves the value set with §5.3.

### 2.3 What follows inside the engine

`:1728` and `:1736` keep reading `chainElement`, unchanged in text and changed in
meaning: a bracketed command that follows `-` now gets the `<needs>` its valency
asks for, because the bracket gave it a scope to receive an operand in. That is
the `[in-[rwk]]` line of §0.

### 2.4 `astLean` must drop the uninformative values

`astLean()` (`:1836–1847`) drops `null`, `false`, `""` and `[]`. `origin` is a
non-empty string on **every** node, so exporting it naively would put
`"origin":"root"` or `"origin":"nest"` on 244 of the corpus's 267 command nodes
and undo the thinning the header comment at `:1825–1835` was written to defend.

`root` and `nest` are derivable from position — root is a child of the segment,
nest is a child of a command. `extend` and `item` are not. So `origin` joins the
two existing value-dependent drops at `:1842–1843`:

```js
if (k === "origin" && (v === "root" || v === "nest")) continue;
```

`{verbose:true}` keeps them, as it already keeps everything else.

### 2.5 `origin` is suppressed on a placeholder name

`[ph-alvo` uses `-` as a **name binder**, not a chain operator: the bareTag
becomes the placeholder's name (`slotName`, `:1244`) and is never emitted as an
element — the `PH` branch at `:1677` consumes it. Its `origin` is `"extend"`,
which is an artefact of the shared lexer path and not an operator. Set it to
`null` when `slotName` is true, so `[ph-x` is never read as a chain link and no
`chain` attribute can reach a `<needs slot="x">`.

---

## 3. How the XML carries it

### 3.1 One attribute, on bare elements only

```
chain="extend" | "item"
```

The value set is exactly the chain-bearing subset of `origin`. Emitted at
`:1693–1695`, appended to the existing `attrs` array **after** `force` and
`name`:

```js
if (nd.editorial) attrs.push('force="editorial"');
if (nd.colon)     attrs.push('name="' + xesc(nd.colon) + '"');
if (nd.chainElement && (nd.origin === "extend" || nd.origin === "item"))
  attrs.push('chain="' + nd.origin + '"');
```

and identically in the `unresolved` branch at `:1686–1690`, so `[in-zzz` comes
back as a chain link rather than as a nested command.

`name` and `chain` are mutually exclusive in practice: `case "colon"` (`:1297`)
writes onto `top()`, the innermost **open** node, and a bare tag is never pushed
onto the stack (`:1257`). `[in-rwk:foo]` puts `name="foo"` on `<instruction>`,
not on `<rework>`.

### 3.2 Why the attribute is **not** emitted on bracketed children

A bracketed child already announces its own scope. Marking it too would force
`fromXML()` to decide whether `chain="extend"` means `-rwk` or `-[rwk]`, which is
a second bit smuggled into one attribute. Instead `-[` normalises to `[` (§0) and
the attribute means exactly one thing: **this element was written bare, by this
operator.**

| Source | XML | Reads back as |
|---|---|---|
| `[in-rwk]` | `<rework chain="extend"/>` | `[ins-rwk]` |
| `[in-rwk,fmt]` | `<rework chain="extend"/><format chain="item"/>` | `[ins-rwk,fmt]` |
| `[in-[rwk]]` | `<rework><needs>what to rework</needs></rework>` | `[ins[rwk]]` |
| `[in[rwk]]` | identical to the row above | `[ins[rwk]]` |

### 3.3 The four guarantees, one at a time

**`force="editorial"` on ALW/BYP/OVR/NEV/FRGT.** Untouched. `EDITORIAL_ONLY`
(`:174`) is keyed by canonical and read at `:1241`; `chain` is appended after it,
so `force` stays the first attribute wherever it appears:

```
[ins-alw,nev]  →  <always force="editorial" chain="extend"/>
                  <never  force="editorial" chain="item"/>
```

**`<block once="true">` and `;` segmentation.** Untouched. `blockAttrs()`
(`:1623–1625`) is not on this path, and `closeSeg()` clears `pendingOrigin` at
`:1225`, so a chain cannot cross a segment boundary — it already cannot, and
nothing here changes that. `[in-rwk;[in-fmt]` stays two blocks.

**`<needs>`.** The predicate at `:1728`/`:1736` still reads `chainElement`, and
`chainElement` still means "cannot receive an operand". The set of elements
carrying `<needs>` **grows** by exactly one case — the bracketed child of `-` —
and that growth is the repair, not a side effect. No `<needs>` is removed, and
none is added to a node that has an operand.

**Exact string fidelity, no pretty-printing inside text nodes.** `chain` is an
attribute on the element tag. `<user-input>`, `<off>`, `<source>` and every other
text-bearing element are emitted by branches this design does not touch
(`:1653–1660`, `:1754–1770`).

### 3.4 Projection into `<chain>` later

The later deliverable replaces the output shape with `<glyph-package>` carrying
`<invoke>` and `<chain>`. This attribute is sufficient for that projection and is
not a competitor to it: a maximal run of consecutive siblings whose first carries
`chain="extend"` and whose remainder carries `chain="item"` is exactly one
`<chain>`. The grouping is derivable from the attribute and sibling order alone,
with no re-parse and no access to the source. That is the whole of the
precondition; the format is not designed here.

---

## 4. How `fromXML()` reads it back

One branch in `fromXmlNode()` (`:2293–2327`), before the `head` construction at
`:2325`:

```js
var op = el.attrs.chain;
if (op === "extend" || op === "item") return (op === "item" ? "," : "-") + name;
```

Three properties, each load-bearing:

1. **No brackets and no `xmlKids()` recursion.** A bare tag has no scope. Writing
   `[name…]` is what produces the fabricated `<needs>`; writing `name` is what
   lets the following `<user-input>` land on the parent, where the author put it.
2. **It runs after `GLOSS_REVERSE` resolution**, so an aliased or session-tier
   element rebuilds under its canonical name, as the bracketed path already does.
   `<unresolved tag="zzz" chain="extend"/>` takes the same treatment in the
   `unresolved` branch at `:2301`.
3. **It is the only writer of `-` and `,` in the reconstruction**, so a run of
   siblings rebuilds in source order with no reordering pass.

Idempotence, on the case that motivated the work:

```
[in[rtnl-go`cover X`]]
  →  <rationale><go chain="extend"/><user-input>cover X</user-input></rationale>
  →  [ins[rtnl-go'cover X']]
  →  the same XML.        <needs>what to execute</needs> is never written.
```

And the distinction that did not survive before:

```
[a-b-c]   →  <b chain="extend"/><c chain="extend"/>   →  [a-b-c]
[a-b,c]   →  <b chain="extend"/><c chain="item"/>     →  [a-b,c]
```

### 4.1 Two malformed inputs the reader must name, not repair silently

The XML panel is hand-editable, so `fromXML()` is handed input the emitter never
wrote. Both must produce a diagnostic, because the alternative is the silent
repair this document exists to abolish:

| Input | Code | Reading |
|---|---|---|
| a `chain` element with children | `XmlChainHasChildren` (`fix`) | a bare tag cannot hold children; they are re-attached to the parent — which is what the bracket form would have done — and the reader says so |
| a run whose **first** element carries `chain="item"` | `XmlChainStartsWithItem` (`fix`) | `[in,rwk` does not open a chain; the first is promoted to `-` and the promotion is reported |

---

## 5. Two removals — finishing a deletion decided at v1.7

### 5.1 This is propagation, not change

Neither removal is a new decision. Both were taken during Etapa 1, recorded in
`.guidelines/.history/`, and carried into the grammar — and stopped there. The
engine and `XML_REFERENCE.md` are the laggards.

| Removal | Decided | Grammar shows it | Engine | Reference |
|---|---|---|---|---|
| the `/` divide operator | `C-01`, marked 🔴 blocking at `glyph_etapa1_carta_e_etapa2_corpus.md:87`; **RESOLVIDO — divisor eliminado; `/` é exclusivo de emoção** at `GLYPH_v1.7_CHANGELIST.md:101` | `glyph-grammar.ebnf:37` — `(* … C-01: the "/" divider was removed *)`, and `chained_command` uses only `-` | still lexes it (`:604–608`) | still documents it (`XML_REFERENCE.md:101`) |
| the `\` emotion delimiter | `I-19` at `glyph_etapa1_carta_e_etapa2_corpus.md:80` — "Emoções usam `/` como delimitador (**substituiu** `\`)" | `glyph-grammar.ebnf:13` — `emotion_header = "/" , emo_code , "/" , { emo_code , "/" }`; the backslash appears nowhere in the file | still lexes it (`:547–564`) | still documents it (`XML_REFERENCE.md:178`) |

**This changes the risk profile.** Nothing live is being taken away. What is
being removed is residue of two features already retired, which two files kept
honouring because nothing checked them (§5.6). `\` is not an undocumented
alternative spelling — it is an **abandoned** one.

Neither removal costs expressive power. `-` opens the chain and `,` continues it;
`/` never did anything else — verified, `[in-/rwk]` and `[in-rwk]` emit
byte-identical XML. And `/eth/` says everything `\eth\` said — verified,
`[ins'x']/eth/` and `[ins'x']\eth\` emit the same `<mood dominant="enthusiasm"/>`.
`glyph-ui.js:395` already writes only the slash form, so the interface loses
nothing either.

### 5.2 Why the two travel together

They are one decision seen twice. `C-01` was blocking precisely *because* `/` had
two jobs; `I-19` gave `/` the emotion job and `C-01` took the divider job away.
Removing one without the other leaves `/` still ambiguous in the engine, or
leaves two spellings for a delimiter that was unified in order to end an
ambiguity. Same class, same release, and — because of §5.5 — the same commit as
§6.

### 5.3 Inventory — the divide operator

Complete, from `grep -n "divide" scripts/glyph-parser.js`. `glyph-ui.js` contains
no reference to it.

| Site | Code | Removal |
|---|---|---|
| `:604–608` | the `if (!textBuf.length && prevT && prevT.k === "extend")` guard, `T.push({ k:"divide", … })`, `expectBare = true` | delete the guard block; `/` then reaches the emotion branch at `:609–628` and, failing it, `addText` |
| `:1243` | `\|\| pendingOrigin === "divide"` inside `chainElement` | removed by the §2.2 narrowing, which deletes the whole disjunction |
| `:1307` | `if (nx.k === "divide") { parts.push("/"); … }` in the colon parts loop | **dead code.** A `divide` token needs `prev.k === "extend"`, and an `extend` token needs `prev.k` to be `open` or `bareTag`; after a `colon` the `-` is lexed as text. Verified: `[cmp:-/b]` tokenises as `open \| colon \| text:-/b \| close`. Delete; the `text` branch at `:1305` already absorbs `/` in every colon body |
| `:1351` | `nx2.k !== "divide"` in the `DanglingChain` lookahead | drop the clause |
| `:1354–1359` | the nested `if (nx2.k === "divide")` second lookahead | delete the block |
| `:1362` | `case "divide": pendingOrigin = "divide"; break;` | delete the case |

### 5.4 Inventory — the backslash emotion delimiter

Complete, from `grep -n '\\\\' scripts/glyph-parser.js`. `glyph-ui.js` contains no
backslash literal and its emotion picker (`:395`) writes `/code/`.

| Site | Code | Removal |
|---|---|---|
| `:547` | `if (c === "\\") {` — the branch entry | **demoted, not deleted** — see below |
| `:556` | `var had = src[i] === "\\";` — the closing-delimiter probe | folded into the demoted branch |
| `:558–559` | `T.push({ k:"emotion", … delim:"\\" })` — the token push | stops producing `emotion`; produces the refusal token instead |
| `:562` | `if (i === start + 1) addText("\\")` — a lone backslash becomes text | **keep.** A stray `\` in prose is not a delimiter and must stay prose |
| `fromXmlBlock` `:2339` | writes `"/" + keys.join("/") + "/"` | **already correct** — the inverse has only ever written the slash form |

**Demoted rather than deleted.** Deleting the branch outright makes `\eth\` fall
to `addText` and emit `<off>\eth\</off>` — silently. That is the defect this
document exists to abolish, re-created in the act of removing a different
instance of it. So the branch stays as a *recogniser*: it matches the abandoned
shape, pushes a refusal token carrying the run and its span, and the parser turns
that into `BackslashMood` at `fix` severity naming the replacement (`/eth/`). The
characters survive as `<off>`. Nothing is fabricated; nothing vanishes; the
author is told which spelling to use.

### 5.5 What the deletions leave behind, and why §6 is mandatory

After the divide removals, `[in-/rwk]` falls through to `addText` and emits
`<instruction><off>/rwk</off></instruction>`. The `DanglingChain` check at `:1351`
does not fire, because `nx2.k` is then `text`, which is in its allowed list.

That is the same silent swallow the deletion was meant to end, relocated. **The
removals are only safe once §6 lands**, and they ship in one commit.

### 5.6 Why nothing caught this — the doc test's blind spot

`XML_REFERENCE.md:101` has contradicted `glyph-grammar.ebnf:37` since v1.7, and
`:178` has contradicted `:13` for just as long. `D-01`…`D-06` read the reference
on every run and saw neither, because the row regex at
`scripts/test-corpus.js:782` matches only `` | `[bracket` | `<element>` | `` —
**bracket-to-element pairs, and never an operator or a delimiter.**

That is the same blind spot that let the operator defects live: §4 of the
reference, the table that describes `-`, `,`, `/`, `;`, `;;` and `[=`, is the one
table nothing asserts. Extending the doc test to §4 is therefore **load-bearing,
not tidy** — without it, this release's own §4 edits become the next stale rows,
and the failure mode is exactly the one that produced this document.

The new check, `D-07`: every operator and delimiter documented in §4 must be one
the lexer emits a token for, and every token kind the lexer emits for punctuation
must appear in §4. Acceptance is that **`D-07` fails today** on the `/` divide
row, and fails again if either removal is reverted in the engine without the
reference following.

### 5.7 `XML_REFERENCE.md`

`:101` — `` | `/` divide | opens the chain after `-`; it does **not** repeat as a
separator | `` — is **deleted**, not edited. It is not merely stale: it documents
a construct the grammar removed.

`:120–124` — the prose explaining that `[in-rwk/fmt/impr` falls through to `<off>`
— is replaced by the error treatment of §6.

`:178` — "Both `/eth/` and `\eth\` are accepted on input." — is **deleted** and
replaced by a line stating that `\eth\` is refused with a diagnostic naming
`/eth/`.

`:75–76` (`dominant`, `also` on `<mood>`) and the rest of §6 Mood (`:166–177`)
**stay**. `/` keeps its one job.

---

## 6. `/` in a chain position is invalid — bucket N, not bucket I

### 6.1 The verified behaviour

```
[in-rwk/ins/fmt]  →  <mood dominant="insecurity" also="?"/>   hoisted to block level
                     fmt is gone
                     [note] UnknownEmotion — /fmt/ fora da tabela. Ignorado.
```

`EMO` (`:213–230`) contains `ins:"insecurity"` and `cmp:"compassion"`; `INSTR`
contains `INS` and `CMP`. The mood branch at `:612` fires on `/name/` whenever
`name` is in `EMO`, regardless of what precedes it.

**"An empty slot does not block" protects information that is MISSING. It does
not protect information that is MALFORMED.** Conflating the two is what produced
this. Severity is `fix`, and the vectors belong in bucket `N`.

### 6.2 Three defects, three required behaviours

**D1 — a `<mood>` is fabricated from input that was never an emotion.**
Required: when `/` is reached and the previous token is `bareTag`, `extend` or
`comma`, the cursor is inside a chain and the emotion branch at `:609–628` must
not be entered at all. No `<mood>` is emitted. The run is reported as
`SlashInChain` (`fix`), carrying its position and naming what it contained. The
characters survive as `<off>` — which is what `[in-rwk/ctx]` already does, minus
the silence. The author's repair is to close the chain first: `[in-rwk]/eth/`.

**D2 — `also="?"` prints a literal question mark into the deliverable.**
Independent of chains and wider than them. `:1342` sets `gloss: EMO[key] || "?"`,
and `buildXml` at `:1611–1612` joins those glosses into `also`. Verified, with no
chain anywhere and in both spellings:

```
/eth/xyz/[ins'x']    →  <mood dominant="enthusiasm" also="?"/>
\eth\xyz\[ins'x']    →  <mood dominant="enthusiasm" also="?"/>
```

`dominant="?"` is **not** reachable — the branch requires the first code to be in
`EMO`, so `/xyz/[ins'x']` correctly falls through to `<off>`. Only `also` is
exposed.

Required: a code outside `EMO` never enters `nd.emotions` or `seg.mood` at
`:1342–1344`, so it cannot reach `also`. `"?"` is removed as a gloss fallback.
**No `?` may reach the XML under any input.** The identical-looking fallback at
`glyph-ui.js:73` is a tooltip, not the deliverable, and stays.

**D3 — the only diagnostic is a `note` that reports the wrong thing.**
`:1340` raises `UnknownEmotion` at `note` severity saying `Ignorado` — and it was
not ignored; it reached the deliverable as `?`. A misleading low-severity note is
worse than none, because it reads as handled. Required: severity `fix`, a message
saying the code was **discarded**, and a position.

**D4 — the abandoned spelling must be refused, not swallowed.** §5.4:
`BackslashMood` at `fix`, naming `/eth/`, characters preserved as `<off>`.

### 6.3 What the diagnostics need that does not exist yet

The gap record is `{ sev, lab, msg, code }` (`:1206–1209`), with `plain` added at
`:1569`. A positioned diagnostic needs the token span, which every token already
carries as `s`/`e`. The smallest sufficient change is an optional trailing field:

```js
gaps.push({ …, at: tk ? { s: tk.s, e: tk.e } : null });
```

Additive, so `glyph-ui.js:481` (which reads `sev`, `lab`, `msg`) is unaffected.
`serializeAST`'s diagnostic projection at `:1904` gains one key if the AST panel
should show positions — see §9.

---

## 7. Blast radius

### 7.1 The 173 vectors — still **1**, with both removals in place

Re-measured against this design, by tokenising and parsing every `src:` string in
`scripts/test-corpus.js` (98 sources) and then sweeping the whole file textually,
so the `F`/`H`/`D` buckets' inline sources are counted too.

| | Count | Which |
|---|---|---|
| vectors whose **assertions fail** | **1** | `P-06` (`scripts/test-corpus.js:50`) |
| vectors whose XML changes shape but still pass | 2 | `R-01` (`:169`), `L-04` (`:190`) |
| vectors using the `divide` token | **0** | — |
| vectors using `-/` anywhere in the file | **0** | textual sweep |
| vectors using the **backslash** emotion delimiter | **0** | textual sweep; the suite's only two emotion usages are `/eth/` (`:59`, P-14) and `/frs/` (`:701`, F-05), both slash |
| vectors with a `/` in a chain position | **0** | — |
| vectors with an emotion code outside `EMO` | **0** | — |
| vectors with `,` between **bracketed** commands | 7 | `P-04`, `P-07`, `P-08`, `P-15`, `N-03`, `N-09`, `N-11` — `origin="item"`, `chainElement` false, no attribute, unchanged |
| bare chain nodes in `[ph-` position | 4 | `T-03`, `T-04`, `T-07`, `T-12` — suppressed by §2.5 |
| everything else | 159 | unchanged |

**Both removals cost zero vectors.** That is the measurement, not an estimate,
and it is what §5.1's "residue, not a live feature" claim rests on.

**`P-06`** asserts `xml:["<review>","<improve/>","<format/>"]` and must become
`["<review>", "<improve chain=\"extend\"/>", "<format chain=\"extend\"/>"]`. Its
guard twin `P-06+R` (generated at `:312`) carries neither `xml` nor `cmds` and is
unaffected.

**`R-01`** is the same source asserting only `cmds`; the command list does not
move.

**`L-04`** holds `[crit-[scru`, the corpus's one bracketed-after-operator node.
`<scrutinize>` gains `<needs>what to scrutinise</needs>` — the §0 repair. Its two
assertions, the `<user-input>` text and
`expects="target,skeptic,criticize,scrutinize"`, both survive, because `expects`
is built by `collect()` (`:1627`) from canonicals rather than from element shape.

**One vector to edit, two to re-read, 170 untouched.** The suite also **grows**:
`D-07` (§5.6) and the seventeen negative vectors of §8.

### 7.2 `XML_REFERENCE.md` rows

| Section | Line | Change |
|---|---|---|
| §3 attributes | `64–86` | **add** one row: `chain` \| any element written bare \| `-` `,` \| which operator attached this link to its parent |
| §4 operators | `99` (`-` extend) | **restate**: the child is emitted bare with `chain="extend"`, and `-[` is a synonym of `[` |
| §4 operators | `100` (`,` after an extend) | **restate**: add `chain="item"` |
| §4 operators | `101` (`/` divide) | **delete the row** — it contradicts `glyph-grammar.ebnf:37` (§5.7) |
| §4 prose | `120–124` | **replace** with the §6 error treatment |
| §6 Mood | `178` | **delete** "Both `/eth/` and `\eth\` are accepted on input"; state that `\eth\` is refused, naming `/eth/` |
| §6 Mood | `166–177` | **add**: a code outside `EMO` is discarded with a `fix` and never reaches `also` |
| §10 round trip | `381–424` | **add** a chain example; the round trip is what this release changes |
| §3 attributes | `75–76` | **unchanged** — `dominant` and `also` keep their meaning |

> **Warning to whoever edits the file.** `D-03`/`D-04` parse the reference with
> the row regex at `scripts/test-corpus.js:782`:
>
> ```js
> /^\|\s*`\[([a-z0-9_.-]+)`\s*\|\s*`<([a-z0-9-]+)>`\s*\|/gm
> ```
>
> Any new example row in the shape `` | `[x` | `<y>` | `` is claimed as a
> **vocabulary** row and held against `elName(classify(x))`. Write chain examples
> as fenced blocks, not as rows in that shape.

### 7.3 Not in the blast radius

`glyph-ui.js` reads gaps by key (`:481`) and the AST by field; both changes are
additive, it contains no reference to `divide`, no backslash literal, and its
emotion picker (`:395`) already writes `/code/`. `toHGML()` and the `H` bucket do
not read `chainElement`. `rules.json`, `templates.json` and `expansions.json` are
untouched. `glyph-grammar.ebnf` already describes the target state and needs no
edit — it is the oracle, not the patient.

---

## 8. Negative vectors this change requires

### 8.1 Bucket `F` — round trip is the invariant

| # | Failure mode it forbids | Vector | Must hold |
|---|---|---|---|
| 1 | the fabricated `<needs>` — the defect of §1 | `[in[rtnl-go\`cover X\`]]` through `toXML → fromXML → toXML` | the two XMLs are equal **and** `what to execute` appears in neither |
| 2 | `-` and `,` collapsing again | `[a-b-c]` and `[a-b,c]` | the two XMLs differ, and each round-trips to itself |
| 3 | `chain` leaking onto a bracketed child | `[in-[rwk]]` | `<rework>` carries **no** `chain`, and carries `<needs>what to rework</needs>` |
| 4 | the `<needs>` suppression returning | `[in-[rwk]]` vs `[in[rwk]]` | byte-identical XML — `-[` is a synonym of `[` |
| 5 | `chain` leaking onto a placeholder name | `[--germinate]` | no `chain` on any `<needs slot="…">` |
| 6 | a chain element acquiring children on the way back | XML hand-edited to `<rework chain="extend"><user-input>x</user-input></rework>` | `XmlChainHasChildren` at `fix`, no exception |
| 7 | a run starting with `,` | XML hand-edited so the first sibling carries `chain="item"` | `XmlChainStartsWithItem` at `fix`, and the reconstruction is valid Glyph |
| 8 | `force="editorial"` displaced by the new attribute | `[ins-alw,nev]` | `<always force="editorial" chain="extend"/>` — `force` first, both present |
| 9 | a chain crossing a segment boundary | `[in-rwk;[in-fmt]` | two `<block once="true">`, no `chain` on the second `<instruction>` |
| 10 | an unknown bare tag losing its chain | `[in-zzz]` | `<unresolved tag="zzz" chain="extend"/>`, round-tripping to `[ins-zzz]` |
| 11 | the inverse re-introducing the abandoned spelling | `/eth/[crit'x']` round-tripped | `fromXML` writes `/eth/`, never `\eth\` |

### 8.2 Bucket `N` — each requires a `fix` diagnostic

| # | Failure mode it forbids | Vector | Must hold |
|---|---|---|---|
| 12 | the mood fabrication — D1 | `[in-rwk/ins/fmt]` | `SlashInChain` at `fix`, with a position; **no `<mood>` in the XML**; `ins` and `fmt` both named in the message |
| 13 | the silent swallow the divide removal relocates — §5.5 | `[in-/rwk]` | `SlashInChain` at `fix`; `<off>/rwk</off>` may stay, silence may not |
| 14 | `?` reaching the deliverable — D2 | `/eth/xyz/[ins'x']` | `<mood dominant="enthusiasm"/>` with **no `also`**; `fix`; no `?` anywhere in the XML |
| 15 | the misleading note — D3 | #14 | `UnknownEmotion` is `fix`, not `note`, and its message says *discarded*, not *ignored* |
| 16 | the abandoned spelling swallowed instead of refused — D4 | `\eth\[ins'x']` | `BackslashMood` at `fix` naming `/eth/`; **no `<mood>`**; the characters survive as `<off>` |
| 17 | a stray backslash in prose being refused | `[ins'x'] a \ b` | no diagnostic; `\` stays prose — `:562` is kept for exactly this |

### 8.3 Bucket `D` — the blind spot itself

| # | Failure mode it forbids | Vector | Must hold |
|---|---|---|---|
| 18 | §4 of the reference going stale unobserved — §5.6 | `D-07` | every operator and delimiter documented in §4 is one the lexer emits a token for, and vice versa; it **fails today** on the `/` divide row |

### 8.4 Guard

| # | Failure mode it forbids | Vector | Must hold |
|---|---|---|---|
| 19 | either removal creeping back into the engine | `[in-/rwk]`, `[cmp:-/b]`, `\eth\[ins]` | `G.tokenize()` emits no `divide` token and no `emotion` token with `delim === "\\"` for any of them |

Every one of the nineteen fails today. All are written and failing before the
emitter is touched.

---

## 9. Open — **[Regent]**

1. **Does the AST JSON expose diagnostic positions?** §6.3. The parser can carry
   `at` either way; whether `serializeAST` (`:1904`) projects it is a
   consumer-contract question, not a structural one.

Two items that were open in the first draft are now closed and are not
re-litigated here: the divide operator is **deleted** (`C-01`, ratified again by
the Regent), and `\eth\` is an **abandoned** spelling removed in the same release
(`I-19`).

---

## 10. Status

**Delivered at 2.4.5.01** — CHANGELOG, *"the operator reaches the XML, and two
removals finally land"*. The operator survives to the XML and back, and both
removals are recognizers rather than silent deletions: `SlashInChain` and
`BackslashMood`, `XML_REFERENCE.md` §11.3.

What the document is for now is the reasoning behind the shape and the
reproductions that justified it. `XML_REFERENCE.md` §4 is normative for the
result; §9 above still holds one open question for the Regent.

The counts in §7 come from parsing and sweeping the corpus rather than from
estimation.

The `<glyph-package>` / `<chain>` output shape was a later deliverable, and it
is `PACKAGE_TARGET.md`.
