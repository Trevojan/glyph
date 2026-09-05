# Changelog

All notable changes to Glyph are documented here, most recent first.

> **Language.** Entries from v1.3.0.0 onward are in English, following the
> boundary that version drew: everything reaching the deliverable is English,
> the interface stays pt-BR. Earlier entries are left in Portuguese as they
> were written — a changelog is a record of what happened, and rewriting it
> after the fact would make it a worse record, not a better one.

> **Versioning.** From `1.2.3.00` onward the number is
> `release.frontend.rules.minor` — the 1st digit the release line, the 2nd the
> frontend (HTML/CSS/UI), the 3rd the rules (`.guidelines/rules.json`, constraints,
> valency, vocabulary), and the 4th a two-digit counter (`00`, `11`, `24`, `42`)
> for everything small. **No digit resets any other.**
>
> That last rule is why the scheme changed. Under the old `a.b.c.d`, a digit
> that moved reset every digit to its right, so touching the interface alone
> discarded the number the engine had earned: this release would have read
> `2.0.0.0`, announcing a new product line for what is a batch of panels and one
> new function. Digits now move independently and keep their place.
>
> The backend has no digit of its own. Parser work rides in `release` when it
> changes what Glyph *is* — `1.2.3.00` added `fromXML`, the inverse of the
> emitter — and in `minor` when it does not.
>
> Versions through `1.3.0.0` used the old `a.b.c.d` scheme (`a` frontend, `b`
> backend, `c` business rules, `d` data) and keep the numbers they were released
> under. They are not renumbered: a changelog records what happened, and
> rewriting it after the fact makes it a worse record, not a better one — the
> same reason the pt-BR entries below were left as they were written.
>
> The `1.0.9.x` versions were previously identified as `1.9`, `1.9.1`, `1.9.2` and
> `1.9.3`; the content is the same, only the numbering changed. Earlier versions
> (`v1.7`, `v1.8`) keep their historical numbering — see
> `.guidelines/history/`.

---

## [3.4.7.05] — o documento reescrevia conjunção como sequência, e ninguém via

`release` move porque o documento emitido mudou de forma **e** a gramática ganhou um
construto: `<holds>`, `binds`, `ref`, `role` e a cerca `[raw]`. É a mesma razão que levou
`1.2.3.00` e `2.4.5.01` a moverem esse dígito. `rules` move porque `GLOSSARY.md` §0.1 —
texto normativo — perdeu uma cláusula, e porque 98 grafias entraram no vocabulário de
entrada. `minor` carrega `--file` e a redação de um diagnóstico. Nenhum dígito zera outro.

### O defeito central, e por que nenhum portão o via

`GLOSSARY.md` §0.1 dá leituras **diferentes** a `[A],[B]` e `[A][B]` — conjunção contra
sequência — e §0.3 acrescenta que numa sequência o sujeito do segundo é o *resultado* do
primeiro. Medido em 2.4.6.04, só uma projeção distinguia as duas:

| projeção | distingue? |
|---|---|
| AST | **sim**, `origin: "item"` contra `origin: "root"` |
| `glyph-package` | não, byte a byte idêntico |
| `.hgml` | não, byte a byte idêntico |

O documento entregue reescrevia conjunção como sequência, em silêncio. `RT-05` tinha isso
**fixado como perda conhecida** desde antes do trabalho de pacote — *"o caminho do AST
guarda uma vírgula que o do XML não guarda"*. `<holds>` fecha, e a asserção foi invertida
em vez de apagada: uma suíte que descarta um pino aposentado perde a memória do que ele
protegia.

### A ordem passa a ser significado

§0.1 dizia *"sem ordem entre eles"*. O Regente aposentou a cláusula: *"antigamente eu dizia
que não havia diferença na ordem. isso se provou ineficaz."* A razão é gramatical e
generaliza — **o que se faz é declarado antes do sujeito**, *red ball*, *thin air*. Então
`[simp'X'],[core]` é "simplifique X e trate como núcleo" e `[core],[simp'X']` é "em núcleo,
simplifique X". Duas intenções, não uma dita duas vezes.

Consequência na queima: some o `sort`, **fica o `uniq`**. `[CRIT[CTX]]` queimava para
`[cmp [ctx] [ctx] …]` — o operando do autor mais o que a própria fórmula do CRIT produz —
e portanto **afirmava que o contexto é consultado duas vezes**, coisa que a fonte nunca
disse. Os glifos diziam A e os hieróglifos diziam B.

### Glyph não conseguia citar Glyph

`]` encerra um literal por dentro, sob **as duas** aspas, e não há escape: contrabarra,
duplicação e `&#93;` foram medidos um a um e recusados — a entidade morre no `;`, que é
separador. Um documento *sobre* Glyph era, por isso, impossível de escrever em Glyph.
`[logic]` era o único construto que carregava um colchete, e então lia o conteúdo como
expressão e reportava os comandos de dentro como variáveis indefinidas.

`[raw]…[/raw]` é a mesma cerca sem gramática nenhuma. E o diagnóstico deixou de dar um
conselho já seguido: `TruncatedLiteral` dizia *"Feche com ` antes"* num ponto onde a crase
de fechamento **já estava lá**, um caractere à direita.

### O nome e o valor eram o mesmo elemento

`[var'get_data'[…]]` e um caminho de arquivo emitiam o mesmo `<user-input>`: nada no
documento dizia que `get_data` ligava coisa alguma, e nada ligava um uso à sua definição.
A regra é do Regente — *"o resultado é nomeado a partir do texto de entrada"* — e é
decidível: um comando liga quando tem operando literal **e** aninhado entre colchetes.

Um nome tem **forma de nome**. A primeira tentativa ligava o que fosse, e `[--germinate]`
expande para `[skill'tree logic structure'[…]]` — uma frase virou pseudo-nome. `T-01` pegou.

E o literal ganhou papel: `[alw'X'[get[ctx]]]` contra `[alw[get[ctx]]'X']` emitiam o mesmo
`<user-input>` e diferiam só por ordem de irmãos, obrigando o consumidor a **inferir**
"antes do aninhado = operando, depois = resultado". Uma cadeia não conta — §0.1 diz que
`[A-B]` aplica os dois ao **mesmo** operando —, e foi `E-01`..`E-04` que pegaram isso.

### Duas colisões, ambas minhas, ambas da mesma forma

Reusar um nome que já significava algo:

- `k:"raw"` **já era** o tipo de token da prosa dentro de `[off]…[on]`, então a cerca nova
  sequestrou o modo off e `[off]hello[on]` emitia `<raw></raw>`. Pego pelo probe `4-09`.
- `"Raw"` **já era** o tipo de nó do AST para prosa sem aspas, então o escritor da cerca
  ficou sombreado e `fromAST` substituía exatamente os caracteres que ela existe para levar.

### E o motor não lia arquivo

`glyph-cli.js` recebia fonte por argv e nada mais, então `glyph-cli.js order.pgml` compilava
a string de dez caracteres `"order.pgml"` e respondia, com confiança, sobre um nome de
arquivo. `--file` é a entrada; um caminho nu é **recusado**, nunca adivinhado.

### Portões

`CL-01..03` (linha de comando), `DG-01..03` (o diagnóstico nomeia a causa), `SP-01..03`
(grafias), `RW-01..05` (cerca verbatim), `RO-01..05` (papel do literal), `BD-01..06`
(ligações), `RT-07` e `H-13..14`. `CL-02` e `DG-03` foram **observados falhando** contra o
comportamento antigo antes de serem mantidos.

### A assimetria que ninguém tinha contado

O inverso aceitava `<note>` e devolvia `NT`; o parser direto recusava `[NOTE`. Medido:
**98 de 98** nomes de elemento cuja grafia difere do canônico eram recusados. Fechado como
classe — `ELEMENT_INPUT` é *derivado* de `GLOSS_REVERSE`, então as duas direções não podem
divergir: são a mesma tabela lida pelas duas pontas.

---

## [2.4.6.04] — the store gained a field after the digit that covers it had moved

`rules` moves because `expansions.json` gained an `element` on all 120 commands, and it landed
*after* `2.4.5.01` was set — the vocabulary store changed once the digit that covers it had
already been spent. `release` does not move again: `glyph-package` and `<invoke>` are exactly what
took it from 1 to 2, and effects are designed rather than built. `minor` carries the rest.

> Corrects an earlier reading that put this at `2.4.5.02` on the grounds that nothing but small
> things had changed since the release closed. That was measured from the wrong boundary: the
> `element` field landed inside the release, after its number was fixed.

### The build is all-or-nothing

`build-templates.js` emits two artefacts where phase two reads what phase one
wrote, and every write site was a bare `writeFileSync`. Two exposures neither
`--check` nor the DO-NOT-EDIT banner covers: a torn write leaves a truncated
store the next run reads as *content* rather than as damage, and a crash between
the two leaves the repository in a state no commit represents.

All three sites now stage to a sibling `.tmp` and rename together — the build (2
files), the skill (4 files) and the corpus snapshot. Observed rather than
claimed: a disk failure simulated on the second staged file left both outputs
unchanged and no stray `.tmp`.

### The id is a label; the digest is the identity

Conformance cases carry a `digest` over their source, and a pin carries
`pinnedTo` so it binds to the **source it excuses** rather than to a position. A
pin bound to a position starts excusing a different vector the moment a case is
inserted, and the existing rule only catches a pin whose *reason* expired, never
one that changed subject.

Separating **duplicate** (same id, same content — idempotence) from
**conflicting** (same id, different content — a collision) found a live one on
its first run. `N-13` named two different vectors. Both ran and both passed, but
the snapshot is keyed by id, so one silently replaced the other and
`[BASE'…']` had **no byte-for-byte coverage at all** — 102 vectors against 101
snapshot cases, with nothing comparing the two. Renamed to `N-22`; the snapshot
is 102 now.

### The snapshot says what kind of change it was

It already answered *which* sources moved. It never said *what kind*, which is
the first question every time — and was computed by hand three separate times
over the previous release. `SN-04` now names it: all three projections moved
reads as the parser, `xml` as the emitter, `ast` alone as a store or a
diagnostic.

### Also

- `PROMOTION_BOUNDARY.md` drafted from the measurement, with the ratification
  block left empty. An agent may not ratify a norm it wrote.
- A finding retracted: `->` is **not** dropped in silence. It reaches the
  deliverable as `<off>-&gt;</off>`, which is the documented treatment of prose
  between commands. `XML_REFERENCE` §11.4 now says so — the omission is what
  produced the false finding.
- The corpus no longer hardcodes the engine version in live expectations; they
  derive it, so a bump costs nothing.
- `I1b` recorded beside `I1`: when a generated file first needs an authored
  field, regeneration refreshes the machine-derived ones and preserves the
  human-owned ones by content identity. No store needs it yet.

---


## [2.4.5.01] — the operator reaches the XML, and two removals finally land

The release digit moves because the emitted XML changed shape and two constructs
left the grammar. Under `release.frontend.rules.minor`, parser work rides in
`release` when it changes what Glyph *is* — the same reason `1.2.3.00` earned it
for `fromXML`. No digit resets any other, so the counter stays at `01`.

### The defect, and why it was invisible

`[in[rtnl-go`cover X`]]` emitted `<rationale><go/><user-input>…`, came back
from `fromXML` as `[ins[rtnl[go]'cover X']]`, and re-emitted with
`<needs>what to execute</needs>` — **a question the author had never been asked**,
appearing on the second lap. In an engine whose founding rule is that an empty
slot becomes a question, a spontaneously generated one is indistinguishable from
a legitimate one. That is the worst defect class the design admits.

The cause was one field going unexported. `origin` at `:1242` has always recorded
which operator produced each edge — `extend` for a hyphen, `item` for a comma —
and two consumers dropped it: `astShallow` never wrote it out and `buildXml`
never read it. So `[a-b-c]` and `[a-b,c]` serialised to one identical AST, and
nothing downstream could tell them apart.

Nothing new was threaded from the lexer. The repair is to stop discarding what
was already computed.

### `chainElement` answered two questions and could only carry one

It meant "written bare" *and* "attached by an operator". Those are independent:
`[in-rwk]` and `[in-[rwk]]` share an `origin` and differ in bareness. Conflated,
a hyphen before a bracket silently cancelled the `<needs>` a bracketed command
asks for — `[in[rwk]]` gave `<needs>what to rework</needs>` while `[in-[rwk]]`
gave `<rework/>`. It now answers bareness alone, and the `<needs>` is back.

### `chain="extend" | "item"`, on bare elements only

A bracketed child announces its own scope, so marking it too would force the
inverse to decide whether `chain="extend"` meant `-rwk` or `-[rwk]` — a second
bit smuggled into one attribute. `-[` normalises to `[` instead. `fromXML`
returns `-` or `,` plus the name, with no brackets and no recursion: writing
`[name…]` is exactly what fabricated the `<needs>`, because the bracket gave the
command a scope to want an operand in.

The AST carries `origin` on every node; the XML marks only the bare ones. Of the
corpus sources that moved, all use `,` or `-`, and only one moved in `xml` — the
rest use `,` between bracketed siblings, which is AST-visible and XML-silent by
design.

### Two removals, seven versions late

Resolution **C-01** removed the `/` divider and **I-19** replaced `\emo\` with
`/emo/`. Both reached `glyph-grammar.ebnf` and stopped there. The engine went on
implementing the first at six sites and accepting the second; `XML_REFERENCE`
went on documenting both. This release is the propagation, not a new decision.

Neither could simply be deleted. `/` is not a free character — `EMO` holds `ins`
and `cmp` while `INSTR` holds `INS` and `CMP` — so `[in-rwk/ins/fmt]` fabricated
`<mood dominant="insecurity" also="?"/>`, hoisted it to block level and dropped
`fmt`. And deleting the backslash branch would have made `\eth\` fall to
`<off>` in silence: the defect abolished here, re-created in the act of removing
a different instance of it. So the branch is **demoted to a recogniser** — it
refuses the abandoned shape by name and lets the characters survive as `<off>`.

### No placeholder character reaches the deliverable

`also="?"` printed a literal question mark into the XML whenever a mood code was
off-table, announced by a `note` that said the code had been *ignored* — while
it had reached the output. A misleading low-severity diagnostic is worse than an
absent one, because it reads as handled. Off-table codes are now discarded at
`fix`, with a position.

### Diagnostics can say where

`at: {s, e}`, optional and additive. Every token already carried the span, and a
refusal without a coordinate cannot be located by a reader who does not have the
engine.

### The gate came first, and it found things

Written before any of the above, and each observed failing before it counted:

- **`D-07`/`D-08`** probe every operator row in `XML_REFERENCE` §4 — the one
  table nothing asserted, which is why a documented operator could contradict
  the grammar for seven versions. `D-08` found a twelfth row on its first run:
  auto-close, which had no probe.
- **`check-globals.js`** found `GlyphExpansions` published by two files — the
  expansions *store* and the expansions *reader*. They had never collided only
  because the reader was never loaded in a browser.
- **The projection snapshot** (101 sources × 3) found `toHGML` overflowing the
  stack past ~1600 levels of nesting, while the XML emitter is hardened to 8000
  and the AST truncates with a marker. Nothing had ever crossed the `LONG`
  sources with the `.hgml` projection. Pinned with its reason, not hidden.
- **`build-templates --check`** makes the DO-NOT-EDIT banner mean something: it
  rebuilds in memory and compares, catching both a hand-edited generated file
  and one left stale by a changed source.
- **`GS-01`…`GS-03`** exercise global store registration, which no bucket
  touched because they all route stores through `opts` — the seam a future
  split of the core is most likely to break silently.

### `XML_REFERENCE` §11 — failure

The reference had ten sections and all of them described what works. Three
defects lived for versions in the space where §11 should have been: a document
tested against the engine cannot catch a fabrication it has no place to
describe. §11 states the distinction the defects came from — **an empty slot
does not block** protects information that is *missing*, never information that
is *malformed* — lists the five refusals with their repairs, and is held to the
engine by `D-09` and `D-10` the way §7 is held by `D-03` and `D-04`.

### Vectors

`fromXML` goes from 12 to 23. The bucket had no extend case at all, which is how
the inverse could break mid-release and still read 12/12 — it did, between two
commits, and `F-13` is the vector that catches it. Bucket `N` gains four
refusals. Blast radius on the existing suite: **one**, `P-06`, which asserted
the literal string `<improve/>`.

### The format itself — `glyph-package`

The entry above records the precondition. This is what it was a precondition
*for*: `<glyph>` is retired and the emitted document is now
`<glyph-package engine="…">`, unconditionally — a conditional root would make
every consumer branch on shape before it could read anything.

- **`<schema/>`**, empty, first child. Empty rather than absent so a consumer can
  tell *"declares no schema"* from *"predates schemas"*.
- **`<chain>`** groups the run, and **its members carry no attribute**. The first
  came from `-` and the rest from `,`, so position carries the operator and an
  attribute would be a second encoding of one fact. A second `-` opens a **new**
  run, which is what keeps `[a-b-c]` distinct from `[a-b,c]` — folding them would
  re-create the defect this release opened to remove.
- **`<invoke>`** on composites only, first child, carrying the formula the command
  decomposes into. The system already treated commands as functions everywhere
  except in what it emitted: `SIGNATURES.md` is an arity table, `GLOSSARY.md`
  heads its decomposition table *invocation | reading*, and the parser computed
  `species` and `compositionDepth` while the emitter dropped all of it. That is
  the `origin` defect one level up, and `<invoke>` is its repair.

Declared, never executed — the document says *which* function, it does not run
it, which is what keeps the round trip and the validator possible.

### The order in which it was built, because it is the part that transfers

The specification was written first, by hand. The **golden was derived from it by
hand before any emitter existed** — a golden derived from an implementation
records what the code does rather than what the format is. Then the validator,
then the emitter, which had to *meet* the golden: 5/5 byte for byte, plus 105
corpus sources emitted and accepted by `glyph-check --package`.

`glyph-check` gains a `--package` mode: twelve clauses, each refusal carrying a
line. It does not import the parser, for the same reason the AST validator does
not — the receiving end may have the store and not the engine — so
`build-templates.js` now records an `element` field on all 120 commands.
Acceptance is a mutation test: one per clause, 12/12 caught, and it was observed
failing on two blinded clauses before it counted.

### `fromXML` gets a second reader

The exact inverse: `<schema/>` and `<invoke>` are dropped, `<chain>` is expanded,
and position gives the operator back. **`<invoke>` is never read back** —
reconstructing a command from it would be the engine answering its own question,
which is the fabrication the entry above describes. A loss can be pinned; an
invention cannot.

`<glyph>` is refused by name as `XmlLegacyRoot`, the treatment the divide operator
and the backslash mood got. `XmlChainHasChildren` and `XmlChainStartsWithItem`
keep their documented names and change trigger: inside a `<chain>` position
decides, so a member still carrying the attribute is **reported, not
overwritten** — the reader does not repair in silence.

### Language

The boundary this release drew, and the one the note at the top of this file
follows: **what travels is en-EU, the interface stays pt-BR.** The AST envelope
is read on another machine by something without this engine, so its diagnostics
default to English; `parse()` keeps pt-BR for the panel. `rules.json` already
held `why` and `suggest` in English — the pt-BR came from the assembly in the
parser, which is why a rule diagnostic used to read half in each language.

### What the order found in itself

Four times, the same shape: **a decision referenced everywhere and commissioned
nowhere.** The specification `E1` derived from was never ordered. The name
`glyph-package` meant two different artefacts in two normative documents. The
emitter every criterion depended on had no deliverable. And
`PROMOTION_BOUNDARY.md`, listed as awaiting ratification, had never been written.

Each was found by a gate written before the thing it gates.

---

## [1.4.4.01] — four formats, one card, and the engine says where it is going

The four output formats lived in four places. `.xml` sat in the right column,
`.json` under it, `.hgml` under that, and `.pgml` was not with them at all — its
download button hung off the source card, on the other side of the page.
Finding a format meant hunting the screen, and each card repeated its own
copy/download pair.

### One card, four tabs, one action bar

`.pgml · .xml · .json · .hgml` are now tabs of a single card. The action bar has
**one** copy and **one** download, and they ask the active tab what to hand
over — the button *is* that tab's button without needing to exist four times.
Eight per-format buttons became two.

`edit` shows only on `.xml`, because it is the only format with a way back
(`fromXML()`). Switching away mid-edit keeps the edit: the textarea persists and
returns as it was.

`what is left to say` deliberately did **not** become a tab. It is diagnostics,
not an artifact, and it has to stay readable *while* a format is on screen.

### Painting became lazy

`run()` painted all three panels on every keystroke. Computing the four formats
is cheap; `colorize()` and a large `innerHTML` are not. Now the formats are all
computed, the panels are marked dirty, and **only the visible one gets ink** —
the rest wait for the tab switch.

### `destination` — the engine stops emitting into the dark

Harness, model and role decide which file a bundle will be written to, and they
lived only in a plan document. They are now three selects above the output card,
showing the exact path (`.claude/agents/dv.md`) and the header the bundle will
carry, before anything is emitted.

The roster is data — `.guidelines/targets.json`, the same pattern as `rules.json`
and `templates.json`. Model ids change on someone else's schedule, so they are
not compiled into the engine. A harness marked `available:false` is listed and
disabled: **a listed-and-off harness informs, an invented one lies.**

The card states plainly that the selection does not yet change `.xml`, `.json` or
`.hgml` — the bundle emitter is what will read it. A control that pretends to act
is worse than no control.

### Housekeeping

Seven i18n keys (`copyXml`, `dlXml`, `copyAst`, `dlAst`, `copyHgml`, `dlHgml`,
`dlPgml`) collapsed into two (`copy`, `download`) plus four tab labels — the tab
label already says which format it is. Three panel-title keys went with the
panels.

---

## [1.3.4.01] — the root holds entry points only

Thirteen files sat loose in the repository root. The rule now: the root keeps
`README.md`, `CHANGELOG.md` and the app; `/scripts` keeps JavaScript;
`.guidelines/` keeps everything normative — the documents and the data stores.

Moved with `git mv`, so every one is recorded as a rename and `git log --follow`
still reaches its history. Superseded records (the v1.7/v1.8 changelists, the
triage material) went to `.guidelines/history/`.

The stores dropped the `glyph-` prefix on the way in — the folder supplies the
context that the prefix used to. `expansions.txt` now sits beside
`expansions.json`: same base name, and the extension says which one is written
and which one is built.

`build-templates.js` traded its `ROOT` for a `GUIDE` constant; the suite, the
parser CLI and `dag.js` had their paths repointed. No logic changed, and the
173-case suite proves it.

**One correction on the way through.** The versioning definition was restated as
`app.front.rules.content`, and both `README.md` and `GLOSSARY.md` still carried
the abandoned rule that *a digit resets every digit to its right*. That rule was
dropped for a reason recorded at the top of this file — under it, a batch of
panels would have announced itself as `2.0.0.0`. Both documents now say what
this one says: **no digit resets any other.**

---

## [1.3.4.00] — the XML has a reference, and the reference has a test

Reconciled from a hand-written draft of the bracket→XML mapping. The repository
had `GLOSSARY.md` for *what a command is* and `SIGNATURES.md` for *how many
operands it takes*, but nothing said *what it becomes in the XML* — the one
question the deliverable actually turns on.

### The draft was 89/91 right

Of 91 bracket→element pairs, 89 matched the engine exactly, and **no element
name disagreed**. The two that failed are both instructive:

- **`[BASE]` → `<base>`.** Stale by two versions. `GLOSSARY.md` §0.2 is
  normative and says `BASE` is *only* the `expansions.txt` keyword meaning "this
  one is an atom"; the command was renamed **`CORE`** in `1.1.0.0` precisely to
  end the collision where one word was both. The draft was written before that
  and nothing had told it since. **Not** resurrected as an alias — doing so
  would re-open the collision the rename closed, and contradict the document the
  engine derives from.
- **`R:` → `<return>`.** The engine emits `<user-expectative expects="…">`, and
  the draft's own §8 already listed `<user-expectative>` as the form in use — it
  disagreed with itself, one section to the next.

Four structural disagreements resolved in the engine's favour and recorded in
§9 of the new file rather than left to be rediscovered: `<literal>` vs
`<user-input>`, `<emotion tone="eth prd">` vs `<mood dominant="enthusiasm"
also="pride">`, `<item>` wrappers for comma-separated operands, and the
`<plain>`/`<br/>` spellings of `<off>`/`<break/>`.

### The test is the point

`XML_REFERENCE.md` would go stale the same way the draft did, so the suite reads
it. `D-03` parses the vocabulary tables and holds every row against
`elName(classify(x))`; `D-04` catches the reverse gap, a command in the engine
that the reference never mentions; `D-06` pins `BASE` by name so the specific
stale row cannot come back. This is the guard `GLOSSARY.md` already has from
`X-01`/`X-14`, pointed at the other end of the pipeline.

Checked by breaking it on purpose: renaming one element in the file and adding a
`[base` row makes `D-03` and `D-06` fail and the suite exit non-zero.

### Two things the draft got right that are not built

Both improve the deliverable and both would need `fromXML()` changed in step, so
they are recorded in §9 and left for a decision rather than folded in quietly:

- `[pt'1.1'` → `<part n="1.1">`, instead of the number arriving as `<user-input>`.
- `[if'cond'…` → `<if cond="…">`, instead of the condition arriving as `<user-input>`.

### Corrected while writing it

Two examples in the new reference were wrong when first drafted and were caught
by running them, which is the only reason they are not wrong now:

- `[in-rwk/fmt/impr` does **not** chain three siblings. `/` opens a chain after
  `-` but does not repeat as a separator, so `rwk` binds and `/fmt/impr` falls
  through to prose as `<off>`. The chaining operator is `,` — `[in-rwk,fmt,impr`.
- `[ins[rwk][fmt][impr]]` is not equivalent to the chain either: each bracketed
  command asks for its own operand, so it yields three `<needs>` where the chain
  yields three bare elements.

---

## [1.3.3.00] — EN-EU does something now

The `EN-EU` chip had been in the header since the beginning with nobody
listening to the click: the markup was there, the listener never was, and a
half-filled `I18N` table with four keys sat next to it. Switching language did
nothing. It does now, and the second digit moves alone — the frontend changed,
so nothing to its right resets.

### The part that did not need translating

`INSTR`, `STRUCT`, `META`, `EMO` and `SESSION` are **already English**, because
they reach the deliverable — an `INSTR` gloss is what becomes `<criticize>` in
the XML. So in EN the command browser stops showing the pt-BR gloss from `CATS`
and shows the engine's own, through `classify()`. That is 104 command glosses
that never had to be written twice, and it means the table on screen says
exactly what the XML will say.

Only the twelve `CATS` category labels and notes needed an English side, and
they live in the interface layer where `CATS` already belonged.

### The part that reaches the deliverable

A form's field question becomes `<needs>` in the XML, so it was pt-BR text
crossing into an English artefact — an inconsistency the language boundary
of `1.3.0.0` named but did not reach. In EN it now comes out English, along
with `[nt'target']`, the step and error-condition placeholders, and the `[rev]`
/ `[scru]` texts. Same for the form's `title` and `hint`.

The English form data is an **overlay keyed by id** (`MOLDES_EN`), not `_en`
fields threaded through the pt-BR structure: the original table is untouched,
and a missing key falls back to pt-BR for that piece alone instead of blanking
it.

### The engine's own diagnostics

`G()` takes a second language. The English label and message arrive as the 5th
and 6th arguments and `opts.lang` picks; with no English twin the pt-BR one
still shows, so a call site missed in some future edit surfaces in the wrong
language rather than empty. All 27 diagnostics have both, and the UI passes
`OPTS.lang` so the "what is left to say" panel follows the chip.

### Mechanics

- Static screen text is tagged in the HTML (`data-i18n`, `-html`, `-ph`) and
  filled by one loop, so the dictionary does not keep a list of element ids
  that drifts from the markup.
- The choice persists (`glyph.ui.lang.v1`) and is restored **before the first
  paint** — restored after, the screen would be built in pt-BR and flash into
  English in front of someone who had already chosen English.
- `t()` falls back to pt-BR for a missing key, then to the key itself: a raw
  key on screen is easier to find than a blank.
- Preset chips and the open editor's parameter summary are redrawn on switch.
  Both were rendered once and would otherwise have kept the language they were
  born in — the preset row was doing exactly that until it was caught.

The preset examples are translated **source and all**. A pt-BR example under an
English screen teaches the syntax and obstructs the reading at the same time.
What does not change is the shape: same commands, same order, same diagnostics
— only the human words move (the block name, the literals, and the two
Portuguese variable names, `marg`/`dif`, which became `margin`/`difficulty`).
Checked rather than assumed: all four parse to an identical command sequence and
an identical set of diagnostic codes in both languages, so each example still
demonstrates precisely what it demonstrated.

---

## [1.2.3.00] — the XML comes back, and the screen learns to keep things

The panels stopped being a one-way display. The XML is editable and returns to
source, the burn has its own panel, every representation can be saved to a file,
and the templates and moulds a person writes survive the reload.

**The version scheme changed with this release**, and this release is why. Under
the old `a.b.c.d` a moving digit reset everything to its right, so a batch of
buttons would have carried `1.3.0.0` to `2.0.0.0` — a number that announces a
new product line for an afternoon of interface work. The number now reads
`release.frontend.rules.minor`, no digit resets any other, and the frontend
moving from `1` to `2` costs the engine nothing it had earned. See the note at
the top of this file.

### The inverse — `fromXML()`

The chain was `human → glyph → xml → machine` and it only ran one way. Editing
the XML meant editing the deliverable and abandoning the source that produced
it. `fromXML(xml, opts)` reads the emitter's own output back into bracket
source and returns `{ src, diag }`, never throwing — a hand-edited panel is one
of its inputs, so malformed XML has to answer with diagnostics the way `parse()`
answers bad Glyph with gaps.

Two pieces make it work, and both are consequences of how `buildXml` already
writes:

- **A reverse vocabulary map.** `elName()` kebab-cases the English *gloss*, not
  the canonical, so `<criticize>` has to find its way back to `CRIT`. The map
  is built by walking `MODE → STRUCT → META → INSTR` in the same order
  `classify()` probes them, first writer winning. That order is not a detail:
  `PH`, `TPL` and `UNLS` each sit in two tables, and `classify()` can never
  reach the `INSTR` copy. `glossCollisions` is exported and asserted empty, so
  a later vocabulary edit cannot introduce a real ambiguity in silence.
- **A hand-written XML reader.** `DOMParser` exists only in the browser, and the
  CLI and the test suite run on plain Node with no dependencies — using it would
  put the inverse behind a wall the tests cannot reach and split the engine in
  two again, which is what v1.0.9 closed. The dialect is small and self-imposed
  (`buildXml` escapes `& < > "`, writes no namespaces, CDATA or DTD), so this
  reads that dialect and says so, rather than pretending to be an XML parser.

**Three things do not come back, each pinned by a test so none is "fixed" by
accident:**

| what | why | reading chosen |
|---|---|---|
| `[tpl:name'…']` vs `[--name…]` | both emit `<template name="…">`, nothing separates them | always the `[--` invocation — a repo-wide grep found no `[tpl:` in real use |
| content appended past a template's declared params | `collectFills`' `extra` carries no slot once expanded | dropped; the declared fills return by name |
| text holding `' \` [ ]` or newlines | `esc`/`xesc` never escaped them and the literal grammar ends on them | `litSafeXml()`, the same substitution the interface already made for form fields |

`<needs>` is written in three shapes and only one of them is source: a real
`[ph-name]` hole carries an alpha `slot`, while the `FRAMES` and `SLOTS` fillers
carry none or a bare number. The fillers rebuild to **nothing** and are
regenerated by the next pass — writing them back would turn the engine's
question into the human's answer.

`<block>` is the other trap: the segment wrapper and the `STRUCT` command
`[block'…']` share an element name, and only position plus the `once` attribute
tell them apart. Case `F-06` holds that line.

Also new: `--from-xml` on the CLI, and 12 cases under `fromXML` in
`test-corpus.js`. The oracle is the `.hgml` one turned around — the XML is
regenerated from the reconstructed source and compared against the XML it came
from. Equality on the *source* would be the wrong test, because aliases
normalise (`[rw` → `[rwk`), positional template fills return named, and `;;`
moves to the end of its segment. All of those are the same message.

### The screen

- **The XML panel edits.** A toggle swaps it for a textarea; applying runs
  `fromXML` and, on success, replaces the source and detaches the mould. That
  is deliberately the *same* authority "soltar do molde" already granted the
  source box — one concept with two doors, rather than a second, competing idea
  of which panel is in charge. A `fix`-level diagnostic refuses the apply and
  says why, instead of trading working source for broken XML.
- **A `.hgml` panel**, fed live from the same `run()` pass as the XML and the AST.
- **Download** for `.pgml`, `.xml`, `.json` and `.hgml`, off one `downloadText()`
  helper that the Markdown exports reuse.
- **Every card folds.** `<section class="card">` became
  `<details class="card">` and `.hd` became `<summary class="hd">` — the same
  first child, so `.card > .hd` and `.card > .bd` never had to change. Open and
  closed persists. A guard on the summary cancels the fold when the click landed
  on a button, since the buttons live in the header.
- **`copiar ast` works.** It had been markup with no listener since it was
  written: it clicked and did nothing. The clipboard logic is now one
  `wireCopyButton()` shared by all three copy buttons.

### Kept things

Templates and moulds a person writes now persist, in `localStorage`, layered
over the built-ins at load — the committed `glyph-templates.json` and
`glyph-moldes.js` stay the source of truth and are never written to, so **no
`build-templates.js` rebuild is part of this change.** A user template shadows a
built-in of the same name, and `refreshTemplates()` re-registers the merged set
with the *engine*, not just the list, or `[--my-template` would look right on
screen and refuse to expand.

Import and export are Markdown: a `#` name, a paragraph, and the body in a
fenced block. **The parameters are not written in the file.** They are read out
of the body by `extractPlaceholders()`, which parses it with the real parser and
collects the `PH` nodes — whoever writes `[ph-alvo` has already said the name,
and a header repeating it is the same list in two places, which is how two
copies of one thing drift apart. For a mould the wrapping command comes along
too, because a mould's slot *is* `[tgt[ph-x`…`]]`; `## Rótulo` starts a phase,
and fences are tolerated so one text serves both the editor and the file.

Three `localStorage` keys, not one: the fold writes on every click, and the kept
things write rarely and carry their own schema. Bundled, a schema change in
either would drag the other through a migration it did not need.

**Known limit, stated rather than discovered later:** a mould written this way
is fixed-phase. The built-in `fluxo` mould's open-ended step sequence is a
bespoke piece of the interface and is not representable from generic Markdown.

---

## [1.3.0.0] — English across the engine; pt-BR stays in the interface

A language boundary, drawn where the artefacts already split. **Everything that
reaches the deliverable is English; everything that is screen text stays
pt-BR.** The point is that operator and model reason in the same terms, so
nothing is lost in a translation neither of them asked for.

| what | goes where | language |
|---|---|---|
| `FRAMES` / `SLOTS` | `<needs>what to criticise</needs>` in the **XML** | **EN** |
| `EMO` | `<mood dominant="enthusiasm">` in the **XML** | **EN** |
| `SESSION` | XML element names | **EN** |
| glossary definitions | `means="…"` under `describe` | **EN** |
| `CATS` labels and glosses | command browser, search, tooltip | **pt-BR** |
| diagnostic messages | the "o que falta dizer" panel | **pt-BR** |
| moulds, presets, UI strings | the interface itself | **pt-BR** |

### Renamed

- `GLOSSARY.md` → **`GLOSSARY.md`**, rewritten in English. Still the normative
  reference the engine derives from, and still what `build-templates.js` reads
  to fill `def`. All 120 definitions translated; section numbering was kept so
  `§0.3`, `§6.5` and the rest still resolve.
- `SIGNATURES.md` → **`SIGNATURES.md`**, likewise. Gained a short section on
  where species and arity disagree — `RSN` and `FIN` are primitives in the
  glossary yet `RSN` carries a `FRAMES` entry, so it asks for an operand in
  practice. Recorded rather than silently "fixed" in either direction.

### Marked

`CATS` now carries an explicit **language-boundary comment** saying it is
interface data and pt-BR by design, so the next reader does not "finish" the
translation and break the UI. Separating it out is the next data-engineering
step and is deliberately not taken here: moving `CATS` means giving
`glyph-ui.js` its own vocabulary table, which changes the interface contract and
wants to be its own commit.

### Still pt-BR, by omission rather than design

The prose documents — `README.md`, this changelog, `HGML_PLAN.md`,
`FORMULA_REVIEW.md`, `FUSIONS_WORKSHEET.md`, `GLOSSARY.md` and the two
skills. They are documentation, not interface, so by the rule above they should
be English; they are simply not done yet.

---

## [1.2.1.0] — As definições do glossário entram no motor

Fecha a limitação registrada na v1.2.0.1. `means` vinha de `INSTR`, que guarda o
**rótulo** em inglês e não a definição, então `means="Review"` não acrescentava
nada a `<review>`. E `made-of` só existe para composto — ou seja, os 88
hieróglifos, que são justamente o que **não** decompõe, nada tinham a dizer de si.

`build-templates.js` passou a extrair as 120 definições do glossário e gravá-las
em `glyph-expansions.json` como `def`. **Extraídas, não copiadas** para um
segundo arquivo: o glossário é a referência normativa e o motor deriva dela —
copiar recriaria exatamente a divergência que esta série de versões gastou
fechando.

`def` fica ao lado de `formula` porque respondem à mesma pergunta em dois níveis:
`def` diz o que o comando **é**, `formula` diz do que ele é **feito**. Um átomo
só tem a primeira, e é exatamente por isso que ela precisava existir.

Portão de build igual ao do ciclo: comando sem verbete no glossário derruba a
geração. Comando opaco em silêncio é como a divergência entra.

`defOf()` exposto no motor.

---


## [1.2.0.1] — A AST emagrece; o XML pode se explicar

Duas mudanças na forma da saída, nenhuma no que o motor entende.

### Alterado

- **A AST não carrega mais campos vazios.** Todo nó levava os dezesseis campos
  dissesse ele algo ou não, e **43% deles eram `false`, `null` ou `[]`**. Uma
  entrada de 321 caracteres produzia 23 KB de AST — e painel desse tamanho é
  painel que ninguém lê. Agora sai 45% menor.

  Descartado: o que está vazio, mais `raw` quando ele só repete `canonical` em
  minúscula, e `compositionDepth` num átomo (é sempre 0). **Não** descartado,
  ainda que derivável: `element` (é o contrato com o emissor de XML), `depth` e
  `type` — são baratos e algo lá fora pode ligar neles. Emagrecer payload não
  vale quebrar consumidor.

  `toAST(src, {verbose:true})` devolve a forma antiga inteira.

### Adicionado

- **`toXML(src, {describe:true})` — o XML carrega a própria semântica.** Cada
  comando ganha `means` (a glosa) e, se for composto, `made-of` com os
  hieróglifos de que é feito. Quem lê a mensagem deixa de precisar do
  vocabulário Glyph carregado para saber o que `<scrutinize>` quer dizer.

  Nada aqui é inventado: sai da tabela de composição e das glosas que já
  existiam. `made-of` vai **único e ordenado**, não na sequência crua — como
  assinatura do que o comando *é*, `ctx` quatro vezes não diz mais que uma, e a
  queima crua de `SCRU` tem 64 itens.

  **Desligado por padrão**, porque muda o entregável e a forma simples é a que
  toda a documentação e todos os testes descrevem. Custo quando ligado: ~59% a
  mais de XML.

### Limitação conhecida

`means` vem de `INSTR`, que guarda o **rótulo** em inglês, não a definição:
`means="Review"` não acrescenta nada a `<review>`. O valor real está em
`made-of` — e ele só existe para compostos. Ou seja, **os 88 hieróglifos, que
são justamente o que não se pode decompor, continuam sem definição legível na
mensagem.** As definições existem, mas em prosa no `GLOSSARY.md`, fora do
alcance do motor. Levá-las para dentro é trabalho de dado, não de código.

---

## [1.2.0.0] — `.hgml`: a queima atômica existe e funciona

O emissor que faltava. `toHGML()` reduz a árvore a **hieróglifos puros**: todo
composto trocado pela sua fórmula, repetidamente, até não sobrar nada que
decomponha.

```bash
node scripts/glyph-parser.js "[prob'timeout']" --hgml
```
```
[error
  'timeout'
  [ctx[/ctx]
[/error]
```

Duas coisas fazem disso um emissor barato em vez de uma segunda linguagem: uma
fórmula **é** Glyph válido, então `parse()` a lê sem gramática nova; e a saída
também é Glyph válido, então pode ser reparseada — o que dá um **oráculo de
correção de graça**, em vez de uma expectativa escrita à mão por caso.

**A queima é expansão, não compressão.** Um composto vale ~15 hieróglifos em
média e `HYP` chega a 97; uma entrada curta cresce cerca de 25x. Isso é inerente
a "100% hieróglifos" — densidade e decomposição total puxam para lados opostos, e
este formato escolheu decomposição.

### Adicionado

- **`toHGML(src, opts)` e `burn(segments, opts)`**, mais o modo `--hgml` no CLI.
  Somativo: nenhum diagnóstico e nenhum XML mudaram.
- **Forma fechada** `[nome … [/nome]`. Não é decoração: `]` já fecha um comando,
  então `[ctx][/ctx]` emitiria `UnmatchedCloseTag`. A forma fechada abre **sem**
  `]`.
- **Bucket `H` na suíte — 9 casos.** O oráculo é o próprio formato: reparseia a
  saída e cobra dois invariantes que não precisam de expectativa escrita à mão —
  toda tag é átomo, e nada virou `fix`.

### Corrigido

- **A guarda de ciclo confundia *fórmula contém* com *argumento aninhado*.**
  `[rmbr[fbk]]` dentro da fórmula de `HYP` é `RMBR` **recebendo** `FBK` como
  argumento. Como os argumentos eram injetados antes de queimar, herdavam a
  cadeia da fórmula — e como a fórmula de `FBK` menciona `RMBR`, a guarda lia um
  ciclo que não existe (`HYP → RMBR → FBK → RMBR`) e parava com `RMBR` inteiro.
  Agora os argumentos queimam **antes** da fórmula abrir, sob a cadeia corrente:
  conter estende a cadeia, receber como argumento não. `HYP` passou de 95 tags
  com resíduo para 97 totalmente reduzidas.

### Pendente — duas fórmulas que a gramática não consegue ler

Ambas são problemas de **dado**, não do queimador, e nenhuma foi corrigida em
silêncio: o caso `H-09` fixa as duas pelo nome, então consertar qualquer uma
falha o teste de propósito.

- **`SCRU`** usa `R:` dentro de colchetes. O token de retorno é pontuação de
  segmento, então `[R:` parseia como um comando chamado `R` → `UnknownCommand`.
- **`QST`** usa `[LOGIC-NONE]`. O lexer reivindica qualquer `[logic…]` como bloco
  de conta e depois exige `[/logic]` — ou seja, **o comando `LOGIC` é
  inescrevível dentro de uma fórmula**. Isto é limitação da linguagem, não da
  fórmula.

30 dos 32 compostos queimam limpo.

---

## [1.1.0.1] — Granulação: todo JavaScript em `/scripts`

A raiz tinha nove `.js` misturados com dados, documentos e o app. Agora não tem
nenhum.

**Regra de layout:** `/scripts` guarda JavaScript; dados (`.json`, `.txt`), o app
(`.html`, `.css`) e os documentos ficam na raiz. O critério é o **tipo do arquivo,
não quem o escreveu** — por isso o gerado `glyph-data.js` (JS) fica em `/scripts`
e o gerado `glyph-expansions.json` (dados) fica na raiz, ao lado dos outros stores.

Movidos com `git mv`, então `git log --follow` continua funcionando em cada um:
`glyph-parser.js`, `glyph-ui.js`, `glyph-moldes.js`, `glyph-data.js`,
`read-expansions.js`, `build-templates.js`, `dag.js`, `test-corpus.js`,
`serve-dev.js`.

Caminhos corrigidos em seis lugares: os quatro `<script src>` do HTML (agora
`scripts/…`), os stores que o `glyph-parser.js` carrega no CLI, os `require` da
suíte, as duas raízes do `build-templates.js` (`HERE` para JS gerado, `ROOT` para
dados), o default do `dag.js` — que agora resolve contra a raiz do repositório e
não contra o `cwd`, para funcionar chamado de qualquer lugar — e o `serve-dev.js`,
que serve o repositório inteiro e não só `scripts/`.

Verificado nos dois ambientes, porque um caminho errado quebra em silêncio:
`node scripts/test-corpus.js` fecha 137/137, `node scripts/dag.js` fecha 120/0/0
tanto da raiz quanto de dentro de `scripts/`, e a página carrega no navegador com
os quatro scripts em `scripts/…`, os três stores e zero erro de console.

**Não incluído:** a partição interna do `glyph-parser.js` em módulos
(`HGML_PLAN.md`, passos 6-9). Ela depende da decisão D1 — bundler novo ou
namespace por ordem de carga — e misturar refatoração de fiação interna com uma
mudança de caminho no mesmo passo é como um bug silencioso entra sem ninguém
saber de qual das duas veio.

---

## [1.1.0.1] — O motor passa a saber do que as coisas são feitas

A ponte para o `.hgml`. Até aqui `expansions.txt` era uma tabela que só o `dag.js`
lia: o motor conhecia os 120 comandos mas não sabia quais eram átomos, quais eram
compostos, nem a fórmula de nenhum. Agora sabe. Dígito `d` porque é dado e constante —
nenhuma regra de negócio mudou, nenhum diagnóstico mudou, nenhum XML mudou.

### Adicionado

- **`read-expansions.js` — o leitor único do formato.** Três coisas precisam entender
  `expansions.txt`: o `dag.js` (que reporta camadas e ciclos), o `build-templates.js`
  (que o compila para o motor) e por extensão o próprio motor. Até aqui só o `dag.js`
  sabia, e o conhecimento estava prestes a ser copiado — que é exatamente como o bug do
  regex de cadeia entrou e ficou invisível. Um leitor, um lugar para errar.
- **`glyph-expansions.json`** (gerado) e `GlyphExpansions` em `glyph-data.js`. Mapeia
  cada comando para `atom` ou `composite`, com fórmula, dependências e camada.
  `expansions.txt` segue sendo a fonte que um humano edita — uma entrada por linha é
  melhor que JSON aninhado à mão.
- **`useExpansions()` no motor**, irmão opcional de `useTemplates()` e `useRules()`:
  sem store carregado o motor roda idêntico, só não sabe do que as coisas são feitas.
  Com ele vêm `speciesOf()`, `depthOf()`, `formulaOf()` e `atomsOf()` — este último
  devolve o fecho transitivo em hieróglifos, mantendo repetições (um comando que chega
  a `CTX` por dois caminhos é feito dele duas vezes, e colapsar isso mentiria sobre o
  custo da composição).
- **`species` e `compositionDepth` na AST.** Cuidado com o par homônimo: `depth` é a
  profundidade do nó *no texto do usuário*; `compositionDepth` é a do comando *no
  vocabulário*.
- **`--expand` no CLI.** Recebe um nome de comando, não fonte Glyph, e responde do que
  ele é feito. `HYP` queima até 101 hieróglifos.
- **Bucket `X` na suíte — 8 checagens de integridade.** A que importa é `X-01`: todo
  comando do motor tem de estar em `expansions.txt` e vice-versa. Glossário e motor já
  divergiram uma vez — doze comandos declarados que o motor nunca ouviu falar, metade
  das fórmulas incapaz de resolver — e nada pegou porque nada comparava as duas listas.
  Verificado que a asserção morde nas duas direções antes de dar por pronta.

### Alterado

- **`dag.js` virou um CLI fino sobre o leitor**, e passou a **sair com código diferente
  de zero** quando a tabela não fecha. Uma dependência indefinida ou um ciclo significa
  que a decomposição pararia no meio em silêncio, e saída meio queimada é pior que
  nenhuma — então isso é portão de build, não relatório.
- **`build-templates.js` recusa gerar** se a tabela não fechar, pelo mesmo motivo.

### Pendente

- **`toHGML()` precisa de uma decisão que a tabela não resolve.** Ao queimar
  `[crit'o parser']`, o literal `'o parser'` é operando de qual peça da fórmula de
  `CRIT`? A tabela diz do que `CRIT` é feito, não onde o argumento do usuário se encaixa
  depois de decomposto. Primeira pergunta do passo 17 do `HGML_PLAN.md`.

---

## [1.1.0.0] — O glossário vira a fonte, o motor deriva dele

Salto de *backend*: `GLOSSARY.md` passa a ser a referência normativa do vocabulário, e
o parser foi alinhado a ele. `expansions.txt` deixa de ser um esboço de 6 fórmulas e
passa a descrever o vocabulário inteiro — **120 verbetes, 0 ciclos, 0 dependências
indefinidas**, verificável com `node dag.js expansions.txt`. A suíte vai de 110 para
**129 casos**, todos verdes.

### Adicionado

- **Doze comandos que o glossário declarava e o motor não conhecia.** `FIND`, `GET`,
  `ADD`, `SUB`, `WHR` (contexto), `HGH`, `LOW`, `BOLD`, `LIGHT` (intensidade), `SWITCH`
  (condição), `GO` (rumo) e `NONE` (engine, em `META`). Metade das fórmulas de
  composição os referenciava e não resolvia. Duas categorias novas em `CATS` porque não
  cabiam nas existentes: **Contexto** separa *operar dentro* de um escopo de *declará-lo*
  (que é o que `Enquadre` já fazia); **Intensidade** gradua *um* item, enquanto `PRIO`
  ordena *entre* itens. Os seis operadores ganharam valência em `FRAMES`; os cinco
  primitivos não, porque "valem sozinhos" e portanto não geram `<needs>`.
- **`expansions.txt` completo.** 88 declarações não-expansivas (77 átomos de vocabulário
  + 11 de engine/modo, que aparecem em fórmulas) e 32 fórmulas de composto. `HYP` é o
  comando mais caro do vocabulário, com 6 níveis de profundidade — informação que a
  tabela não tinha como dar antes.
- **19 casos novos na suíte.** `P-26`..`P-29` cobrem o vocabulário novo, `P-30`..`P-34`
  fixam cada par des-fundido como distinto, e `N-13` fixa que `[base]` *tem* que falhar.

### Alterado

- **`BASE` o comando virou `CORE`.** A palavra era duas coisas: a palavra-chave do lado
  direito em `expansions.txt` ("isto é um átomo") e um comando do vocabulário
  ("fundamento estrutural"). Enquanto colidiam, nenhuma tabela de expansão podia
  desambiguar as duas. `BASE` fica como palavra-chave; o comando é `CORE`. Aplicado em
  `CATS`, `INSTR`, na classe `subject` de `glyph-rules.json` e nos três moldes que
  usavam `tag:"base"`.
- **As sete fusões da v1.7 foram desfeitas.** `EVAL`, `REV`, `SPEC`, `SIMP`, `QST`,
  `FOREX` e `ONLYIF` voltam a ser comandos próprios. Cada par tinha um eixo real
  separando os dois lados — o dado vs. o conectivo que o introduz, a tipagem do bloco
  vs. o ato dirigido a alguém, o padrão contra o qual se compara — e a fusão apagava o
  eixo junto com o comando. Os sete já tinham verbete em `INSTR` e valência em `FRAMES`;
  como `classify()` consulta `ALIAS` antes de `INSTR`, a existência da linha era a fusão
  inteira, e apagar as 7 linhas foi a de-fusão completa.
- **`req-deny` rebaixada de `fix`/contradição para `ask`/tensão.** Foi escrita quando
  `DENY` significava recusar uma proposta. Com `DENY` incidindo sobre a *via até um
  resultado* e `REQ` sobre a *existência de algo*, os dois deixaram de colidir por
  construção. Como `fix` a regra reprovava entrada válida — e `fix` significa "o XML não
  é confiável", o que não era o caso.
- **`clar-elab` virou `simp-elab`; nasceu `gen-spec`.** A tensão real é cortar ×
  acrescentar, e quem corta é `SIMP` — `CLAR` remove ambiguidade, o que muitas vezes
  *adiciona* palavras. Pelo mesmo motivo a classe `coarsen` deixou de ser
  `[GEN, SUM, CLAR]` e virou `[GEN, SUM, SIMP]`. `gen-spec` é a tensão que a fusão
  `SPEC`→`ELAB` vinha escondendo.
- **`GLYPH_ASSET_VERSION` passou a seguir `VERSION`.** Dizia `"1.9.3"` enquanto o parser
  dizia `"1.0.9.3"` — dois esquemas de versão para um build só.

### Corrigido

- **`dag.js` comia as cadeias.** O regex de dependências era `/[A-Z_][\w-]*/g`, com `-`
  *dentro* da classe de caracteres — então `CMP-TRUE` saía como um identificador
  fantasma único em vez de `CMP` e `TRUE`. Foi escrito quando as fórmulas eram separadas
  por espaço (`VRFY = CMP TRUE`); a notação de cadeia o quebrava em silêncio. Também
  passou a descartar os tokens de retorno (`R:`, `r-`) antes de extrair dependências:
  são pontuação do lexer, e compor é ortogonal a marcar retorno.
- **Os rótulos de nível do `dag.js` contradiziam a taxonomia.** Chamava o nível 1 de
  "primitivo", mas `ALT`, `VRFY` e `RMBR` estão no nível 1 e são compostos. Nível 0 é
  `hieroglifo`; todo nível acima é `composto-N`.
- **`SESSION.go` removido.** Com `GO` resolvendo em `INSTR`, `classify()` nunca mais
  alcançaria a entrada de sessão — mesmo motivo pelo qual `SESSION.prob` saiu na
  `1.0.9.3`.
- **Três fórmulas com colchetes desbalanceados** (`VAL`, `EVAL`, `SCRU`). Em
  Glyph-fonte é legal, mas numa fórmula de composição torna impossível dizer qual
  hieróglifo é operando de qual — e o `.hgml` exige fechamento explícito.

### Pendente

- **O parser ainda não sabe o que `expansions.txt` sabe.** Conhece os 120 comandos, mas
  não quais são átomos, quais são compostos, nem a fórmula de cada composto — que é
  exatamente o que um emissor `.hgml` precisa. O caminho tem precedente: o mesmo
  `build-templates.js` que gera `glyph-data.js` pode gerar a tabela de composição, e o
  parser consumi-la por um `useExpansions()`, irmão opcional de `useTemplates()` e
  `useRules()`. Ver `HGML_PLAN.md`.

---

## [1.0.9.3] — Pendências fechadas

Todas as seis pendências conhecidas listadas ao final da `1.0.9.2` foram resolvidas
nesta passagem.

### Corrigido

- **`ERROR` e `PROB` sem entrada em `INSTR`.** `ERROR` registrado como hieróglifo
  (nível 0, `= BASE` em `expansions.txt`); `PROB` corrigido para `ERROR + CTX` (era
  `FLS + TRYFR`, derivação errada). Ambos entram em `CATS`/`INSTR` seguindo o padrão
  de `CRIT`/`SCRU`/`TRYFR` — vocabulário sem entrada em `FRAMES`, livre de aridade.
  `SESSION.prob` ("problema") foi removido: com `PROB` resolvendo em `INSTR`,
  `classify()` nunca mais alcançaria aquela entrada — ficaria vocabulário morto.
  Casos `P-24`/`P-25` na suíte; `N-11` trocou de `ERROR` (agora válido) para `BOGUS`.
- **`glyph-grammar.ebnf` divergia da implementação.** `segment_break` e o operador
  renomeado `line_break` trocados de lugar — `;` fecha o segmento, `;;` só quebra a
  resposta sem fechar nada, casando com o motor e a tabela `PUNCT`.
- **Cache de `file://` não invalidava `<script src>` ao editar.**
  `glyph-engine-alias.html` ganhou um `GLYPH_ASSET_VERSION` único que vira `?v=` nos
  quatro `<script src>`, via `document.write` preservando a ordem de carga. Verificado
  no navegador: sem erro de console, ordem de carga correta.

### Adicionado

- **`best-of` com N candidatos.** O ligador de templates ganhou um tipo de casa nova
  — `"repeat": true` num `param`, no máximo um por template. Sai da ordem posicional
  (um param fixo declarado depois, como o `criterion` do `best-of`, colidiria com a
  posição de candidatos extras) e só se preenche por chamada nomeada repetida:
  `[ph-more'C'][ph-more'D']`. Zero chamadas remove a casa da expansão em vez de virar
  `<needs>` — é pluralidade opcional sobre o que os params fixos já garantem, não uma
  casa obrigatória. `best-of` ganhou o param `more` nessas condições; chamada
  posicional de 2 candidatos continua idêntica a antes.

### Alterado

- **`skills/*/SKILL.md`** bumped para `v1.0.9.3`; conteúdo atualizado com o contrato
  de severidade (`fix`/`ask`/`note`), ligação de templates (casas nomeadas,
  posicionais e a casa repetível nova), regras semânticas (`pair`/`order`/
  `precondition`) e o vocabulário `ERROR`/`PROB`.
- **Comentários de código traduzidos para inglês.** `glyph-parser.js` convertido —
  comentários de código, não a tabela de vocabulário, glosas e mensagens de
  diagnóstico, que continuam PT-BR/EN-EU por serem interface, não comentário.
  `test-corpus.js` convertido por inteiro (é ferramenta de desenvolvimento, não
  interface do produto). `glyph-rules.json` e `build-templates.js` conferidos: já
  estavam 100% convertidos.
- `VERSION` em `glyph-parser.js` estava parado em `"1.0.9.1"` mesmo depois da
  `1.0.9.2` ter entregado templates e regras semânticas — bumped para `1.0.9.3`
  junto com esta passagem.

---

## [1.0.9.2] — Templates que expandem, regras semânticas, arquivos separados

### Adicionado

- **Templates deixaram de ser casca.** Até a `1.0.9.1`, `[--nome[…]]` emitia só o que
  estava escrito na chamada: o corpo da definição não entrava, nem na mesma
  mensagem — quem ligava as duas pontas era o leitor humano ou o modelo. Agora o
  motor liga: a definição declara casas com `` [ph-nome`pergunta`] ``; a chamada
  preenche **por nome** (`[ph-nome'valor']`) ou **por posição** (literais soltos, na
  ordem de declaração). Casa não preenchida continua virando `<needs>`. Conteúdo
  extra da chamada entra no fim da expansão.
  - Ciclos diretos e indiretos são interrompidos com a cadeia visível (`TemplateCycle`).
  - Erro de sintaxe no corpo armazenado sobe prefixado com o nome do template.
  - A glosa viaja como `means="…"` no XML.
  - **Store**: `glyph-templates.json` é a fonte de verdade. O navegador abre em
    `file://`, onde `fetch` de `.json` é bloqueado, então `node build-templates.js`
    gera `glyph-data.js` para o `<script src>`. Editou um `.json`, rode o build.
- **Regras semânticas — o critério que faltava.** `glyph-rules.json`, esquema 2. Três
  tipos de regra, com **classes** (`@thinking`, `@subject`, `@condition`) e, em cada
  uma, o **reparo sugerido** — não só a queixa.

  | tipo | dispara quando |
  |---|---|
  | `pair` | dois comandos caem no mesmo alvo (irmãos, ou um ancestral do outro) |
  | `order` | `then` aparece antes de `first` entre irmãos |
  | `precondition` | `target` não é precedido por nenhum dos `requiresBefore` |

  Isenção sob `[ovr]` / `[byp]`: ali a sobreposição foi pedida de propósito. Revisão
  do operador sobre a base `1.0.9.1`: `req + dont` desceu de `fix` para `ask` (é
  redundância enfática, não incoerência — reparo `prio + dont`), e `hyp + assm` saiu
  de "não é contradição" para tensão com pré-condição de sujeito.
- **Seis compostos na biblioteca**: `scientific-review`, `reinforce`, `insight`,
  `fertilize`, `best-of`, `track` — somando-se a `germinate`. A tabela de regras
  pegou dois erros de modelagem nos corpos enquanto eram escritos (`gen`+`elab` e
  `[alt]` com um item só), o que é o melhor argumento disponível a favor dela.
  **Limitação conhecida**: `best-of` fixava dois candidatos, porque `[cmp]` exige
  aridade 2 e o conteúdo extra da chamada entra no fim da expansão, não dentro do
  `[cmp]` — resolvido em `1.0.9.3`.

### Alterado

- **Arquivos separados.** O HTML tinha 1.014 linhas misturando estilo, dados e
  comportamento; agora:

  | arquivo | linhas | papel |
  |---|---|---|
  | `glyph-engine-alias.html` | **85** | só marcação e 4 `<script>` |
  | `glyph-engine.css` | 274 | apresentação |
  | `glyph-moldes.js` | 110 | dados: MOLDES, EXTRAS, PRESETS |
  | `glyph-ui.js` | 563 | app |
  | `glyph-parser.js` | 1.555 | núcleo: léxico, parser, regras, XML |
- **Regra de idioma formalizada.** Conversa em pt-BR; código, comentários,
  identificadores e dados de regra em inglês. Mensagens de diagnóstico são interface
  (o app tem alternância PT-BR / EN-EU) e seguem em português. `glyph-rules.json` e
  `build-templates.js` já convertidos nesta versão; `glyph-parser.js` e a suíte
  ficaram devendo até `1.0.9.3`.

### Testes

- Suíte cresceu para **95 casos**: novos baldes **Templates** (10) e **Regras**
  (15), mais o balde **Guarda** — todo o corpus positivo re-executado com os stores
  carregados, exigindo zero `fix`. Sem ele, uma regra nova poderia transformar uso
  normal em erro sem a suíte notar.

### Pendências conhecidas (fechadas em [1.0.9.3](#1093--pendências-fechadas))

- `ERROR` e `PROB` em `expansions.txt` derivados no DAG mas nunca registrados em `INSTR`.
- `glyph-grammar.ebnf` divergindo da implementação quanto a `;` e `;;`.
- `skills/*/SKILL.md` ainda anunciando v1.8.
- `best-of` limitado a dois candidatos.
- Comentários de `glyph-parser.js` e da suíte ainda em português.
- Cache de `file://` não invalidando `<script src>` ao editar.

---

## [1.0.9.1] — Blocos longos

Revisão pedida sobre a query `better_logic_constraints`, cujo próprio `[intn]` dizia:
*"foresee semantics and logic problems when the user writes a long glyph query"*. A
engine não previa nada — devolvia `diagnostics: []` e quebrava.

### Causa raiz

Em Glyph, todo `[` sem `]` entra dentro do anterior. Uma query longa não fica larga,
fica **funda**. Três consequências, todas medidas antes de corrigir:

1. **A indentação era O(profundidade²).** `pad(d)` emitia `2×d` espaços por linha, e
   a profundidade crescia com o tamanho da query — numa ferramenta cujo rodapé diz
   "xml pra colar no chat":

   | profundidade | XML antes | XML depois |
   |---|---|---|
   | 100 | 23 KB | 7,5 KB |
   | 500 | 518 KB | 38 KB |
   | 1000 | **2 MB** | 77 KB |
   | 8000 | estourava | 616 KB |

   Corrigido com teto de recuo em `LIMITS.indent = 12`; a estrutura continua legível
   pelas tags.
2. **Os emissores recursivos estouravam a pilha.** `buildXml` morria com `RangeError`
   a partir de ~2000 níveis; `serializeAST`, a partir de ~1000 (`parse` sobrevivia por
   já ser iterativo). `emit`, `walk`, `collect` e `astNode` agora usam pilha explícita
   — `emit` empilha as linhas de fechamento num frame `tail`, para saírem depois dos
   filhos. Caso à parte: mesmo com a AST construída iterativamente, `JSON.stringify`
   do V8 recursa internamente e estoura — como a AST é painel de inspeção e o
   entregável é o XML, ela trunca em `LIMITS.astDepth = 200` com marcador explícito
   (`{"type":"Truncated","omittedNodes":N}` + `truncatedNodes` na raiz). **O XML não
   tem teto.**
3. **O bloco `r-` descartava todo o conteúdo.** `collect()` só coletava nomes de
   comando; o retorno saía como
   `<user-expectative expects="target,skeptic,criticize,scrutinize"/>` e o texto
   `user command blocks` evaporava. Agora `expects` continua sendo o sumário
   achatado, mas o corpo real viaja junto.

### Adicionado

| code | severidade | dispara quando |
|---|---|---|
| `DeepNesting` | `note` | ≥ 10 níveis; mostra a cadeia e lembra que `[` sem `]` aninha |
| `MassAutoClose` | `note` | um `;` fecha > 8 comandos de uma vez |
| `LooseCommandWord` | `ask` | palavra solta que existe no vocabulário, escrita sem `[` |

`LooseCommandWord` veio direto da query original: o `rd` do segundo bloco estava no
vocabulário como tag de sessão ("ler"), mas foi escrito sem colchete e virou
`<off>rd</off>` — prosa inerte, sem aviso. Os limiares de profundidade ficam acima do
que a query original escrevia, de propósito, para não virar ruído.

### Testes

Novo balde **L** com 8 casos, incluindo teto de bytes do XML (pega a volta da
indentação quadrática), truncamento marcado da AST, e um caso de falso positivo para
`LooseCommandWord`. Total: **50 casos**.

---

## [1.0.9.0] — Unificação do Pipeline

Data de lançamento: **2026-08-08**

Tema da versão: **uma implementação só**. A cadeia `humano → glifo → xml → máquina`
existia inteira apenas dentro do navegador; fora dele parava no JSON.

### O diagnóstico que motivou a versão

A v1.8 tinha **dois parsers divergentes**:

| | `glyph-parser.js` (v1.8) | engine embutido no HTML |
|---|---|---|
| Emite AST JSON | ✓ | — |
| Emite XML | ✗ (o cabeçalho prometia, o módulo não exportava) | ✓ |
| Roda fora do navegador | ✓ | ✗ |
| Trata texto livre, cadeias, `[logic]`, `;;` | ✗ | ✓ |

O módulo standalone tratava apenas 6 das 16 classes de token; as outras eram
**descartadas em silêncio** — sem erro, sem diagnóstico:

| Entrada | AST v1.8 | AST 1.0.9.0 |
|---|---|---|
| `[REV-IMPR-FMT]` | só `CRIT` | `CRIT` + `IMPR` + `FMT` |
| `[INS] escreva isto` | texto perdido | `<off>escreva isto</off>` |
| `[logic]hp = 3d6kh2[/logic]` | `segments: []` | bloco `<logic>` completo |
| `[SUM];;[LIM]` | 1 segmento | 2 blocos + `<break/>` |

A suíte de testes também não conseguia falhar: `test-corpus.js` da v1.8 incrementava
`negPassed++` nos três ramos — inclusive no `catch` e no ramo "nenhum erro
encontrado". O placar `9/9` era verdade por construção. Os positivos só checavam
`segments.length > 0`, então `P-06` (cadeia) passava com dois terços da AST faltando.
Os diagnósticos prometidos também não conferiam: `N-01` reportava `UnknownCommand` em
vez de erro de aridade, e `N-06` ("template inexistente") reportava
`UnmatchedCloseBracket`.

### Adicionado

- **`glyph-parser.js` — núcleo único** (UMD, 1144 linhas). Vocabulário, lexer, bloco
  `[logic]`, parser e **emissor XML** num só módulo, que roda em Node (`require`) e
  no navegador (`window.GlyphCore`).

  ```bash
  node glyph-parser.js "[crit[ctx'parser']]" --xml
  node glyph-parser.js "[gt'A']" --diag
  node glyph-parser.js "[sum]" --ast
  ```

  - `toXML(src)` — a cadeia inteira em uma chamada.
  - `serializeAST(segments, gaps)` / `toAST(src)` — AST limpa, sem ciclos.
  - Diagnósticos ganham `code` tipado e `plain` (texto sem HTML, para CLI).
- **Aridade posicional de verdade (`SLOTS`)**. `SIGNATURES.md` §3 exigia 2
  argumentos para as comparações prefixas, `[DFN]` e `[VAL]` — o engine nunca
  checou. `[gt'A']`, `[DFN'símbolo']` e `[VAL'alvo']` passavam sem um único
  diagnóstico; agora cada posição vazia viaja no XML:

  ```xml
  <greater-than>
    <user-input>A</user-input>
    <needs slot="2">o segundo termo</needs>
  </greater-than>
  ```

  `SECTION` e `BLOCK` entraram em `FRAMES` e passaram a exigir nome literal
  (`MissingStructName`), casando com a aridade mínima que `SIGNATURES.md` já lhes
  dava.

### Corrigido

1. **`sync is not defined`** — o bootstrap do HTML chamava uma função inexistente e
   morria antes de `window.__glyph`. O painel de XML nascia vazio a cada
   carregamento. Era `rebuild()`.
2. **Painel de AST estourava** — `JSON.stringify` sobre os nós crus fecha ciclo em
   `parent`. O "trunfo do Glyph" da v1.8 nunca renderizou no navegador; o erro
   estava mascarado pelo bug do `sync`.
3. **`4d6kh3` vazava `kh3`** como variável indefinida — `freeVars` removia a rolagem
   mas deixava o sufixo `kh`/`kl` para trás, poluindo o XML com um
   `<needs var="kh3">` falso.

### Alterado

- **`glyph-engine-alias.html` — agora consumidor** (1907 → 1007 linhas). 894 linhas
  de duplicação removidas; o HTML mantém só o que é interface (`MOLDES`, `colorize`,
  `renderLit` e o app). Requer `glyph-parser.js` na mesma pasta.
- **Renomeações de diagnóstico.** `ArityError` era um nome mentiroso: `[SUM]` sem
  alvo o disparava, mas casa vazia **não é erro** neste desenho — vira `<needs>`. A
  severidade é o contrato:

  | severidade | significado |
  |---|---|
  | `fix` | sintaxe ou vocabulário quebrado; o XML não é confiável |
  | `ask` | falta informação; vira `<needs>` e **não bloqueia** |
  | `note` | aviso |

  `ArityError` → `UnfilledSlot` · `ArityWarning` → `SingletonList` · novo
  `MissingOperand`.

### Testes

Suíte nova — **42 casos, 4 baldes, sai com exit code**:

| balde | casos | critério |
|---|---|---|
| **P** positivos | 20 | parseiam com zero diagnósticos `fix` |
| **I** incompletos | 6 | produzem o `code` esperado, viram `<needs>`, não bloqueiam |
| **N** inválidos | 11 | produzem o `code` esperado com severidade `fix` |
| **R** regressões | 5 | os buracos da v1.8, travados contra volta |

A separação **incompleto ≠ inválido** é nova: a v1.8 amontoava as duas coisas em
"negativo", contra o próprio princípio de "casa vazia não bloqueia". Três casos que a
v1.8 listava como positivos foram reclassificados: `P-09`, `P-11` e `P-12` usam
`FAIL`, `ERROR` e `ABREV`, que não existiam no vocabulário — produzem `<unresolved>`.
