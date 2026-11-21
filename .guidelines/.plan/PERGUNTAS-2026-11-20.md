# Perguntas de 2026-11-20 — para o Regente preencher

> **Como usar:** cada pergunta está como o intake dela escreve, com a recomendação da
> sessão e a razão. Preencha a linha `RESPOSTA` com a letra, ou com texto livre. Se a
> recomendação servir, escreva só `ok`; um intake inteiro se responde com `ok` na
> linha **Todas** do topo dele. As medições que cada pergunta pesa estão no intake, pelo
> link. Devolva quando quiser, inteira ou em parte: cada intake respondido abre as
> Ordens dele.

| intake | perguntas | o que abre |
|---|---|---|
| [INTAKE-2D-VIEW](#intake-2d-view) | V1 a V7 | a vista 2D — a série EMS-003, 6 Ordens |
| [INTAKE-XSD](#intake-xsd) | X1 a X6 | o XSD gerado e o portão — passo 1 da trilha, que abre os passos 2, 3, 4, 8, 10 e 11 |
| [INTAKE-EMS-JSON](#intake-ems-json) | E1 a E7 | a `EMS.json` — passo 2 |
| [INTAKE-ORDER-COHERENCE](#intake-order-coherence) | C1 a C5 | a coerência entre Ordens e o `repair` — passos 3 e 4 |
| [INTAKE-EFFECTS](#intake-effects) | I1 a I4 | o esquema de item — passo 5, e depois o 7 |
| [INTAKE-PIN-TRAFFIC](#intake-pin-traffic) | N1 a N4 | o vocabulário do PIN — passo 6 |
| [INTAKE-INVOKE](#intake-invoke) | K1 a K4 | o `<invoke>` e as skills genéricas — passo 10 |
| [INTAKE-EXPLORER](#intake-explorer) | S1 a S4 | a casca do Explorer — passo 11, com a ADR que emenda a O7 |
| [INTAKE-JS-EXIT](#intake-js-exit) | J1 a J4 | a saída do JS — passo 12 |
| [INTAKE-BURN-FENCES](#intake-burn-fences) | F1 a F4 | a cerca `[raw]` e o bloco `[logic` na queima — 1 Ordem |
| [INTAKE-DIAG-SPANS](#intake-diag-spans) | D1 a D5 | um intervalo de fonte em todo diagnóstico, issue #13 — 1 ou 2 Ordens |

**54 perguntas.**

---

## INTAKE-2D-VIEW

**O que abre:** a vista 2D — a série EMS-003, 6 Ordens. **Medições:** [`INTAKE-2D-VIEW.md`](../.orders/INTAKE-2D-VIEW.md) §5.

**Recomendação da sessão:** V1 a, V2 a, V3 a, V4 b, V5 a, V6 b, V7 b. *V1 a and V6 b keep one owner for each fact; V4 b keeps the Order free of what is personal; and V7 b because a plane edited by links needs the source in sight, which a tab hides.*

**Todas:** 

**V1. What an edit on the plane changes.**
- a. the tree, and `fromAST` writes the source: the AST is the source of truth, and
  the way back is held by the suite
- b. the source text, by the span of the node: no dependence on the way back, and
  whitespace and layout of the source survive an edit

*Recomendação: a.*

**RESPOSTA V1:** a.

**V2. Which connectors the plane draws and edits.**
- a. the seven of §3
- b. the four the tree writes as edges and order — nest, chain, item, sequence — and
  the other three drawn but not editable
- c. the four only

*Recomendação: a.*

**RESPOSTA V2:** a.

**V3. How a section, a block and a part show.**
- a. frames that hold their nodes, as §3
- b. nodes like any other, tied to what they hold by nest connectors

*Recomendação: a.*

**RESPOSTA V3:** a.

**V4. Where a position lives.**
- a. nowhere: the layout is computed from the graph, and the same source is the same
  picture
- b. on the user's machine, per Order, beside the Explorer's personal data, with the
  computed layout as the default
- c. in the Order itself: it travels with the source, and moves what is emitted

*Recomendação: b.*

**RESPOSTA V4:** b, per EMS. when the ORD is NEM, then it's in the ORD. the EMS config file handles position; the ORD front-matter handles position.

**V5. The icons on the plane.**
- a. a normalised set generated from the delivered files: one size, the colours of
  the interface, the name drawn by the page
- b. as delivered, on a light tile over the black plane

*Recomendação: a.*

**RESPOSTA V5:** a.

**V6. Where the graph is computed.**
- a. on the page, from the JSON envelope, `binds` and `ref` recomputed there
- b. on the page, from the envelope, after `binds` and `ref` enter the envelope: the
  `ast` hashes move by decision
- c. a call of the engine, answered byte for byte by the JS and the Rust

*Recomendação: b.*

**RESPOSTA V6:** b.

**V7. Where the plane shows.**
- a. a fifth tab of the page, beside `.pgml`, `.xml`, `.json` and `.hgml`
- b. a surface of its own, with the source beside it

*Recomendação: b.*

**RESPOSTA V7:** b.

---

## INTAKE-XSD

**O que abre:** o XSD gerado e o portão — passo 1 da trilha, que abre os passos 2, 3, 4, 8, 10 e 11. **Medições:** [`INTAKE-XSD.md`](../.orders/INTAKE-XSD.md) §4.

**Recomendação da sessão:** X1 a, X2 c, X3 a, X4 a, X5 b, X6 a.

**Todas:** 

**X1. What the generated XSD describes.**
- a. **the ORD's declaration**: its sections, blocks, parts, templates and variables, as
  the norm and the `<schema>` decision of 2026-10-15 say. The language's schema stays in
  `XML_REFERENCE.md`
- b. **the language**: every element and attribute a package may hold, generated from
  the vocabulary. The AST's precedent says a schema derived from the engine cannot catch
  the engine
- c. **both**: the language's schema by hand, as the base, and the ORD's declaration
  generated as a restriction over it

*Recomendação: a.* is the norm's own reading.

**RESPOSTA X1:** a.

**X2. Its notation.**
- a. **W3C XSD**, only the subset the engine needs: `xs:element`, `xs:complexType`,
  `xs:sequence` and `xs:choice`, `xs:attribute`, `minOccurs` and `maxOccurs`. Any XML
  tool reads it
- b. **Glyph's own declaration inside `<schema>`**, the form of 2026-10-15, with *XSD*
  naming that declaration
- c. **both**: `<schema>` declares, and the XSD is generated from it as a projection

*Recomendação: c.* keeps one source, the declaration, and makes the Regent's *XSD* its projection. That projection is written only when a tool asks for it, since no format enters without a consumer that parses it.

**RESPOSTA X2:** c.

**X3. Where it travels.** The three rows of §3.
- a. inside the package, in `<schema>`
- b. beside it in the bundle, as `ORD-####.xsd`
- c. only on request, from a flag

*Recomendação: a.* lets the gate read the schema from the document it checks; under it, 30 hashes move and 89 stay.

**RESPOSTA X3:** a.

**X4. What validates the XML against it**, at `fix` as signed.
- a. **the engine's own validator**, for the subset the engine generates, in both
  engines and held by the oracle: no dependency
- b. **an external validator** such as `xmllint`, run by `npm run check` when it is
  installed: the zero-dependency rule holds for the engine, not for the check
- c. **a Rust crate**, graded by O7 in `crate-weight.js` before it enters

*Recomendação: a.* keeps the zero-dependency rule whole.

**RESPOSTA X4:** a. we need to keep caution here. it is needed to build JS and Rust validators, and this may fit two new ORDs.

**X5. Where the gate runs.**
- a. where an XML enters from outside the engine: `fromXML`, and a bundle read back
- b. a, and also over every bundle under `.orders/` in `npm run check`
- c. only on request

*Recomendação: b.* catches a bundle that drifts while it sits in the repository.

**RESPOSTA X5:** b. logging would also be helpful; may it be inside `.orders/`.

**X6. Which engine builds it.**
- a. both, the JS first, as the reference, as every Order since `EMS-002/ORD-0001`
- b. the Rust only, held by conformance vectors written from the spec (T2), since the
  JS is leaving piece by piece

*Recomendação: a.* follows the oracle until the JS leaves.

**RESPOSTA X6:** a. let's confirm JS will leave correctly and Rust will take over.

---

## INTAKE-EMS-JSON

**O que abre:** a `EMS.json` — passo 2. **Medições:** [`INTAKE-EMS-JSON.md`](../.orders/INTAKE-EMS-JSON.md) §4.

**Recomendação da sessão:** E1 a, E2 a, E3 a, E4 a, E5 a, E6 a, E7 a.

**Todas:** 

**E1. The field list.**
- a. the ratified fields only, as in §3; the Orders stay in the spec
- b. a, and the list of the series' Orders, so the `--check` needs no spec. The spec
  already holds them, and a fact in two places is one wrong
- c. a, and `creates`: the blank Order a series configured to create one starts, which
  inherits its destination ([`INTAKE-PIN-TRAFFIC.md`](../.orders/INTAKE-PIN-TRAFFIC.md) §2)

*Recomendação: a.* keeps every fact in one place.

**RESPOSTA E1:** a.

**E2. How the configuration enters each package.**
- a. **whole**, as an element beside `<schema>`, with the digest of the `EMS.json` it
  came from
- b. **the slices the Order uses**: its traffic, its pins, the rules and exceptions its
  commands touch, with the digest of the whole
- c. **the pointer only**, the path and the digest, the Harness reading the file. This
  reads against the decision, which puts the rules inside the package

*Recomendação: a.* is the simplest reading of the decision, and the digest says which configuration an Order was bundled under.

**RESPOSTA E2:** a,

**E3. The version a series holds to** (`FIELD-3b`), against §2.
- a. `engine` names the version new Orders are bundled with, and the gate compares the
  manifest's `engine`, not a `[ctx]`, for Orders bundled after the field exists
- b. `engine` per range of Orders, so the whole history checks: `EMS-001` and `EMS-002`
  each declare two
- c. the gate as `FIELD-3b` wrote it, on `[ctx]` versions, so every new Order writes one

*Recomendação: a.* holds the series forward only and leaves the acts as emitted.

**RESPOSTA E3:** a.

**E4. The traffic's read half.**
- a. derived from each Order's `[ctx]` paths, so only the write half is typed in
  `EMS.json`
- b. both halves typed in `EMS.json`

*Recomendação: a.* keeps what the source already declares out of a second file.

**RESPOSTA E4:** a.

**E5. The first `EMS.json` of the three series.**
- a. the session drafts one per series from what each already declares — the title from
  the spec, the engine from the manifests, the read paths from `[ctx]` — and the Regent
  rewrites it
- b. the Regent writes the first, and the session reviews it
- c. only a new series gets one

*Recomendação: a.* is the "together" of the Regent's word.

**RESPOSTA E5:** a.

**E6. How a user's `EMS.json` is validated**, at the trust boundary.
- a. against a hand-authored `ems-schema.json` beside
  [`ast-schema.json`](../.sources/ast-schema.json), as the AST's precedent
- b. by the engine's code alone, with no schema file

*Recomendação: a.* checks a user's file with something the engine did not derive.

**RESPOSTA E6:** a.

**E7. The notation of `xsd`.**
- a. the notation of the ORD's declaration, whatever [`INTAKE-XSD.md`](../.orders/INTAKE-XSD.md) X2
  settles, so the gate compares like with like
- b. W3C XSD, whatever X2 settles

*Recomendação: a.* keeps one notation.

**RESPOSTA E7:** a.

---

## INTAKE-ORDER-COHERENCE

**O que abre:** a coerência entre Ordens e o `repair` — passos 3 e 4. **Medições:** [`INTAKE-ORDER-COHERENCE.md`](../.orders/INTAKE-ORDER-COHERENCE.md) §10.

**Recomendação da sessão:** C1 a, C2 a, C3 a, C4 a, C5 a.

**Todas:** 

**C1. The 54 closed Orders, which make no claim.**
- a. the check reads them as emitted and asks nothing of them: it holds the Orders
  bundled after the Order that builds it
- b. `repair` asks where each one stands, once per Order, and writes the answer in its
  manifest, never in its source: 54 questions
- c. the series' `EMS.json` lists them, a fact the spec already holds
  ([`INTAKE-EMS-JSON.md`](../.orders/INTAKE-EMS-JSON.md) E1 b)

*Recomendação: a.* holds the rule forward and the acts as emitted.

**RESPOSTA C1:** a.

**C2. Where an Order writes its claim.**
- a. anywhere in its source, read from the AST as `binds` and `ref` are (§7)
- b. as its first statement, so a reader finds it without the tree

*Recomendação: a.* reads the claim the way every other relation is read.

**RESPOSTA C2:** a.

**C3. Where the `repair` queue lives.**
- a. one file for the repository, `.orders/repair.json`: each finding names the Order,
  what did not match, and the move it proposes, and `repair` asks through it one Order
  at a time
- b. one per series, beside its `EMS.json`
- c. nowhere: the queue is the output of the `--check`, asked through when it runs

*Recomendação: a.* gives `repair` one place to resume from, one question per Order, as ratified.

**RESPOSTA C3:** b.

**C4. When `.orders/NEM/` is made.**
- a. by the first loose Order emitted into it
- b. now, empty, with a README that states its numbering

*Recomendação: a.* makes nothing nobody asked for.

**RESPOSTA C4:** a.

**C5. Which engine extracts `relates[]` and runs the check.**
- a. both, the JS first, as every Order since `EMS-002/ORD-0001`
- b. the Rust only

*Recomendação: a.* follows the oracle.

**RESPOSTA C5:** b.

---

## INTAKE-EFFECTS

**O que abre:** o esquema de item — passo 5, e depois o 7. **Medições:** [`INTAKE-EFFECTS.md`](../.orders/INTAKE-EFFECTS.md) §11.

**Recomendação da sessão:** I1 a, I2 a, I3 a, I4 a.

**Todas:** 

**I1. Which roots carry `root-x`.**
- a. only a root that has items — *"the root of a series of items"*, the decision's
  words: the `xml` hash of 7 sources moves
- b. every root command: 103 sources move

*Recomendação: a.* is the decision's own reading, and the cheapest by far.

**RESPOSTA I1:** a.

**I2. What `x` is.**
- a. the root's own name where it has one — a section's, a block's, a part's, the
  `binds` of a command — and its element name otherwise: `root-section`, then
  `section-item-01`
- b. the element name, always

*Recomendação: a.* names a subject the way the reader names it.

**RESPOSTA I2:** a.

**I3. Where it is written.**
- a. an attribute `origin`, on the root and on each item, and `join="item"` stays
- b. the same, and `origin` replaces `join="item"`, which `fromXML` then reads from
  both, for the documents emitted before

*Recomendação: a.* removes nothing an older reader relies on.

**RESPOSTA I3:** a.

**I4. The number past 99.**
- a. two digits, three past 99, as the `dd` of the version grows
- b. as many digits as the count needs, unpadded

*Recomendação: a.* follows a rule the project already keeps.

**RESPOSTA I4:** a.

---

## INTAKE-PIN-TRAFFIC

**O que abre:** o vocabulário do PIN — passo 6. **Medições:** [`INTAKE-PIN-TRAFFIC.md`](../.orders/INTAKE-PIN-TRAFFIC.md) §6.

**Recomendação da sessão:** N1 a, N2 a, N3 a, N4 a. *One word for one idea; no command that means nothing outside a PIN; one element a reader learns once; and the structure palette where `PT` already sits. Each form enters `expansions.txt` and `GLOSSARY.md` first, then the JS, then the Rust.*

**Todas:** 

**N1. How many commands.**
- a. one, `PIN`, whose chained operand chooses the form: `if`, `else` and `case` are its
  three conditional forms, and any other command is the type whose attribute it pins
- b. two: `PIN` for the pinned attribute, and the conditional forms as commands of their
  own

*Recomendação: a.*

**RESPOSTA N1:** a.

**N2. `else` and `case`.**
- a. words of `PIN`'s own, valid only chained to it, the way a slot's name is valid only
  in its placeholder
- b. commands of the vocabulary, valid anywhere

*Recomendação: a.*

**RESPOSTA N2:** a.

**N3. The element.**
- a. one `<pin>`, its form an attribute: `<pin form="if" alias="…">`,
  `<pin form="case" value="…">`, `<pin form="else">`, `<pin type="rev">`
- b. one element per form

*Recomendação: a.*

**RESPOSTA N3:** a.

**N4. Its place in the palette.**
- a. *Frame*, beside `SECTION`, `BLOCK` and `PT`: structure under a condition
- b. a category of its own

*Recomendação: a.*

**RESPOSTA N4:** a.

---

## INTAKE-INVOKE

**O que abre:** o `<invoke>` e as skills genéricas — passo 10. **Medições:** [`INTAKE-INVOKE.md`](../.orders/INTAKE-INVOKE.md).

**Recomendação da sessão:** K1 a, K2 a, K3 a, K4 b.

**Todas:** 

**K1. What an Order invokes a skill with.**
- a. the `[skl'name']` it already writes: `--bundle` in a series resolves its `binds`
  against the `invoke` of the `EMS.json`, and a name that does not resolve is `fix`
- b. a new form inside `<invoke>`, beside `reads`

*Recomendação: a.* validates what Orders already write.

**RESPOSTA K1:** a.

**K2. What a predefined action is.**
- a. a named entry of the `invoke` of the `EMS.json` — its name and the path it runs —
  called by a command the vocabulary still has to name
- b. a template of the series

*Recomendação: a.* keeps actions where the rules already live.

**RESPOSTA K2:** a. it may add an attribute `source=""` to `<invoke>` so to solve this problem.

**K3. Where the Explorer's generic skills live.**
- a. in the `EMS.json` of `EMS-000`, *Generic*, which every Order of a series inherits
- b. inside the binary, as the basic stores are

*Recomendação: a.* gives the generic skills the home the decisions gave the generic EMS.

**RESPOSTA K3:** b. needs to be immutable and inaccessible to the Explorer itself. any changes may break the engine, and it could result in the need of a regeneration of EMS-000, which is a concern we don't want the final user to face. also, when emitted, the generic skills must also come with the bundle, so any Harness may read and follow the XML directly on input.

**K4. When the check runs.**
- a. at `--bundle` only, so an Order with a blocking dependency is never emitted
- b. at `--bundle`, and again when the Harness follows the Order, as the decision words
  it: a configuration can change after an Order is emitted

*Recomendação: b.* is the decision as worded, with the earlier catch added.

**RESPOSTA K4:** b.

---

## INTAKE-EXPLORER

**O que abre:** a casca do Explorer — passo 11, com a ADR que emenda a O7. **Medições:** [`INTAKE-EXPLORER.md`](../.orders/INTAKE-EXPLORER.md).

**Recomendação da sessão:** S1 b, S2 a, S3 a, S4 a.

**Todas:** 

**S1. The shell.**
- a. `tauri`, the Regent's first candidate
- b. `wry` + `tao`, the two crates Tauri is built on, for a shell that only opens a
  window: 78 crates on Windows against 209
- c. no crate: a Chromium-family browser in app mode on every system, and the default
  browser where none is installed. It no longer depends on Edge, and it still depends
  on a browser

*Recomendação: b.* gives the window the Regent asked for with the part of Tauri that opens it.

**RESPOSTA S1:** a, but not sure. "no dependencies" is proven something nearly impossible to maintain strictly. let's hope `tauri` is the only or kind of dependencies `Glyph's Explorer` will rely on.

**S2. Where the shell lives**, for S1 a or b.
- a. a binary of its own, `glyph-shell`, in a workspace outside `rust/`, as the ADR of §3
  drafts it: the engine's ruler stays as it is
- b. inside `glyph`, behind a feature: one binary, and O7 amended for the engine itself

*Recomendação: a.* keeps the engine's dependency rule exactly where it is.

**RESPOSTA S2:** a.

**S3. The ADR of §3.**
- a. signed as drafted, naming the crate S1 chose
- b. signed with the crate vendored, as O7 vendors the crates it admits: 20.6 MB
  compressed for S1 b, 34.2 MB for S1 a, on Windows alone
- c. not signed: S1 c

*Recomendação: a.* pins the tree without carrying it.

**RESPOSTA S3:** a.

**S4. The page's route.** The four rows of §4.
- a. the relay only, now; views rendered by the engine next, panel by panel
- b. views rendered by the engine, at once
- c. the engine in WebAssembly
- d. a native Rust UI

*Recomendação: a.* takes 6,130 lines out of the page at the cost of one route, the page opened from disk, which the installed app does not use; it then moves the interface into the engine one panel at a time, each held by the oracle.

**RESPOSTA S4:** a.

---

## INTAKE-JS-EXIT

**O que abre:** a saída do JS — passo 12. **Medições:** [`INTAKE-JS-EXIT.md`](../.orders/INTAKE-JS-EXIT.md).

**Recomendação da sessão:** J1 a, J2 c, J3 a, J4 b.

**Todas:** 

**J1. What leaves.**
- a. the engine, the three tools, the slash commands and the skill; the repository's
  tooling stays JS, so node stays for whoever builds the repository and never for
  whoever uses Glyph
- b. everything, the tooling included: 6,733 lines, `test-corpus.js` among them
- c. a, and each tooling script leaves when an Order touches it

*Recomendação: a.* takes node away from the user, which is what the target is for, and leaves the builders alone, since nothing measured asks for them to move.

**RESPOSTA J1:** b.

**J2. What holds the Rust once the JS engine is gone.**
- a. **the oracle frozen**: the last export is committed beside the Rust tests, and a
  change to the expected bytes is an edit of those files, made by the Order that moves
  them
- b. **conformance vectors written from the spec** (T2): `conformance/golden.json` grows
  until it covers what the oracle covered
- c. **both**: frozen when the JS leaves, and vectors written from the spec as each
  Order touches a source

*Recomendação: c.* keeps a byte-for-byte guard from the first day, and grows the guard the spec owns (T2).

**RESPOSTA J2:** b.

**J3. The order of the exit.**
- a. the three tools first (M10e, M10f, M10g: 642 lines, the criterion of each already
  written); then the skill and the slash commands; then the page; the engine last, when
  nothing loads it
- b. the page first, since it carries the engine to the user; then the tools, the
  skill, and the engine

*Recomendação: a.* starts where the criterion is written and the cost is smallest.

**RESPOSTA J3:** a.

**J4. How the skill reaches the binary.**
- a. the plugin carries one `glyph` per system, built for each by a pipeline the
  repository does not have yet
- b. the skill calls an installed `glyph`, and refuses by name where none is installed;
  the install grows to Linux and macOS in the same Order
- c. the skill stays on the JS until the engine leaves (J3)

*Recomendação: b.* needs no pipeline. The binary already links no crate and installs itself, and Windows is where the Regent runs it.

**RESPOSTA J4:** b. the installer must check and ask for installation of the plugin.

---

## INTAKE-BURN-FENCES

**O que abre:** a cerca `[raw]` e o bloco `[logic` na queima — 1 Ordem. **Medições:** [`INTAKE-BURN-FENCES.md`](../.orders/INTAKE-BURN-FENCES.md) §4.

**Recomendação da sessão:** F1 a, F2 a, F3 a, F4 a.

**Todas:** 

**F1. A raw fence's body.**
- **a.** The body is carried verbatim inside the open fence, so the reread gives the
  same `<raw>`.
- **b.** The fence burns empty, as the body does today.

*Recomendação: a.* A fence exists to carry text verbatim. An empty fence answers a question nobody asked.

**RESPOSTA F1:** a.

**F2. A logic block.**
- **a.** Every block burns as the open fence carrying its rules, named or not. Eight
  hashes move, and the reread gives the same `<logic>`.
- **b.** Only the named block changes form (variant B′). Two hashes move, and an unnamed
  block still loses its rules.

*Recomendação: a.* Two forms for one construct is the inconsistency this kind of fix exists to remove. Under b, `[logic]` and `[logic-dano]` burn differently, and only one keeps its rules.

**RESPOSTA F2:** a.

**F3. Which engine.**
- **a.** Both engines, in one Order, as `ORD-0035`.
- **b.** Rust only.

*Recomendação: a.* It is the answer B1 gave for the same kind of defect.

**RESPOSTA F3:** b.

**F4. The pin.**
- **a.** `H-16`'s `KNOWN` empties, so it reads 116 of 116, and an `H` case holds that a
  fence and a block reread to the same XML.
- **b.** Only the `KNOWN` list empties.

*Recomendação: a.* With the `KNOWN` list empty, every new burn defect fails `H-16` by name.

**RESPOSTA F4:** a.

---

## INTAKE-DIAG-SPANS

**O que abre:** um intervalo de fonte em todo diagnóstico, issue #13 — 1 ou 2 Ordens. **Medições:** [`INTAKE-DIAG-SPANS.md`](../.orders/INTAKE-DIAG-SPANS.md) §4.

**Recomendação da sessão:** D1 b, D2 a, D3 a, D4 a, D5 a.

**Todas:** 

**D1. How far.**
- **a.** Every group, T, N, R, P, L and D, in one Order.
- **b.** T and N first, 22 codes and 269 of the 358 diagnostics that lack a span. R, P, L and D follow in an Order of their own.

*Recomendação: b.* T and N cover 75% of the diagnostics that lack a span, and they need no new plumbing: the token or the node is already there. R, P and L each carry a question of their own, and D2 and D3 are two of them.

**RESPOSTA D1:** b.

**D2. A diagnostic about two nodes** (the pair rules, a duplicate binding).
- **a.** The span of the second node, where the conflict is written.
- **b.** The first node's span.
- **c.** One span from the first to the second.

*Recomendação: a.* A reader fixes the second node, the one written against the first.

**RESPOSTA D2:** a.

**D3. A diagnostic raised inside a template's expanded body.**
- **a.** The invocation's span.
- **b.** None.

*Recomendação: a.* The body's text is not in the document, and the invocation is what the author wrote.

**RESPOSTA D3:** a.

**D4. A diagnostic about the document** (`MassAutoClose`, `DeepNesting`, a literal that
runs off).
- **a.** The span of the culprit: the opener left unclosed, the deepest node, the
  literal from its quote to the end.
- **b.** None.

*Recomendação: a.* A coordinate at the start of the document is the absence this proposal removes.

**RESPOSTA D4:** a.

**D5. Which engine.**
- **a.** Both, in one Order. The 77 AST hashes move, and so does the oracle's
  `parse.json`. The `minor` digit moves.
- **b.** Rust only.

*Recomendação: a.* The extension, the skill and the plugin all read the JS engine.

**RESPOSTA D5:** a. treat it to walk towards Rust-only in the following versions.
