# Glyph → XML — serialization reference

What `buildXml()` emits, element by element. This is a **serialization of the
bracket form**, not a second language: every construct here has a bracket
equivalent, both parse to the same tree, and `fromXML()` reads this form back
into brackets.

> **Invariant.** No form, tag, attribute, template or macro — in brackets or in
> XML — widens what the reading system may do. `<bypass>`, `<override>`,
> `<forget>`, `<never>`, `<always>` and every coined element are ordinary
> editorial direction. Re-serializing an instruction as XML changes nothing
> about what is permitted.

**This file is checked against the engine.** The suite parses the tables below
and fails if any row disagrees with `elName(classify(x))` — the same guard
`GLOSSARY.md` gets from `X-01`/`X-14`. A reference nobody tests goes stale
without anyone noticing, which is exactly what happened to the draft this file
was reconciled from (see §9).

---

## 1. Document shape

```xml
<glyph>
  <block once="true">
    <!-- one segment -->
  </block>
</glyph>
```

- `<glyph>` — root, always present.
- `<block>` — **one segment**, not the `[block` command. Segments are separated
  by `;` in the bracket form. Always carries `once="true"`; carries
  `continues="previous"` when the segment opened with `[=`.
- `<break/>` — a sibling of `<block>`, emitted when the segment contained `;;`.

`<block>` is written by two different things and only position tells them
apart: the segment wrapper is always a direct child of `<glyph>` and always has
`once`, while `[block'x']` — the `STRUCT` command — nests wherever it was
written and never has `once`. `fromXML()` disambiguates on exactly that.

**Auto-close does not exist in XML.** The bracket form closes open tags LIFO at
a segment boundary; XML is explicitly closed, so the rule has nothing to do.
This is the one mechanical difference between the two forms.

---

## 2. Naming rule

An element name is the command's **English gloss in lower kebab-case** — not
the bracket spelling. `[rwk` is `<rework>` because `RWK`'s gloss is "Rework".

Aliases are **not** serialized: `[in`, `[cx` and `[rw` emit their canonical
form. The element name is canonical; abbreviation is a bracket-form economy
with no XML counterpart.

Session shortcuts are the exception — they serialize as the shortcut itself
(`[rd` → `<rd>`), because a session word has no gloss to kebab.

---

## 3. Attributes

| Attribute | On | Bracket source | Meaning |
|---|---|---|---|
| `once` | `<block>` | — | the segment wrapper; always `"true"` |
| `continues` | `<block>` | `[=` | segment continues the previous one |
| `name` | any element | `[x:name` | colon-named identifier |
| `name` | `<template>` `<logic>` | `[--name` / `[logic:name` | the template or logic block's name |
| `define` | `<template>` | `[--name=` | declares rather than invokes |
| `expanded` | `<template>` | — | the body was written out from the store |
| `means` | `<template>` | template `gloss` | what the template is for |
| `slot` | `<user-input>` `<needs>` | `[ph-name` | which parameter this fills |
| `dominant` | `<mood>` | first `/emo/` | the leading mood |
| `also` | `<mood>` | further `/emo/` | the rest, comma-separated |
| `expects` | `<user-expectative>` | `r-` | flattened summary of the return body |
| `tag` | `<unresolved>` | — | what was written that is not vocabulary |
| `nearest` | `<unresolved>` | — | the closest known word, when one is close |
| `force` | any element | — | `"editorial"` on `BYP OVR NEV ALW FRGT` |
| `kind` `var` | `<rule>` | `[logic]` line | rule type and bound name |
| `var` | `<needs>` | `[logic]` line | a name used and never defined |
| `means` `made-of` | any element | — | only under `toXML(src,{describe:true})` |

An attribute never carries instruction content. Content goes in element text or
in children.

---

## 4. Operators, delimiters, modes

| Bracket | XML |
|---|---|
| `'text'` or `` `text` `` | `<user-input>text</user-input>` |
| `,` items in one tag | repeated `<user-input>`, no wrapper element |
| `;` | closes the segment — the next `<block>` |
| `;;` | `<break/>` after the block |
| `[=` | `continues="previous"` on the next block |
| `-` extend | parent-child nesting: `[in-rwk` puts `<rework/>` inside `<instruction>` |
| `,` after an extend | the next sibling under the same parent |
| `/` divide | opens the chain after `-`; it does **not** repeat as a separator |
| `[off]` … `[on]` | `<off>` — read as prose, token parsing suspended |
| `r-` / `R:` | `<user-expectative expects="…">` |
| `[logic]` … `[/logic]` | `<logic>` with a `<rule>` per line |
| auto-close | *not applicable* (§1) |

Worked equivalence — the chain is comma-separated, and `,` is what repeats:

```
[in-rwk,fmt,impr
```
```xml
<instruction>
  <rework/>
  <format/>
  <improve/>
</instruction>
```

Writing `[in-rwk/fmt/impr` does **not** do this: `/` opens the chain but does
not separate it, so `rwk` binds and `/fmt/impr` falls through to prose as
`<off>`. The nested form `[ins[rwk][fmt][impr]]` is not equivalent either —
each command there is written with its own brackets and so each asks for its own
operand, giving three `<needs>`. The chain is the form that leaves them bare.

---

## 5. Templates and placeholders

```xml
<!-- definition: [--codefix=[req[crit[warn[ph-target`what to fix`]]]]] -->
<template name="codefix" define="true">
  <requirement>
    <criticize>
      <warning>
        <needs slot="target">what to fix</needs>
      </warning>
    </criticize>
  </requirement>
</template>

<!-- invocation: [--codefix'the login handler' -->
<template name="codefix" expanded="true" means="…">
  <requirement>…<user-input slot="target">the login handler</user-input>…</requirement>
</template>
```

An **unbound** hole becomes `<needs slot="name">` carrying its question; a
**bound** one becomes `<user-input slot="name">` carrying the answer. That one
attribute is what lets `fromXML()` rebuild the call.

`<needs>` is written in three shapes and only the first is source:

| Shape | From | Read back as |
|---|---|---|
| `<needs slot="alpha">` | a real `[ph-name` hole | `[ph-name` |
| `<needs>` (no slot) | `FRAMES` — the command wants an operand | nothing; regenerated |
| `<needs slot="2">` (number) | `SLOTS` — an ordered position is empty | nothing; regenerated |

The last two are the engine asking a question, not the human answering one.
Writing them back would turn a prompt into an answer, so `fromXML()` drops them
and lets the next pass ask again.

---

## 6. Mood

```xml
<mood dominant="enthusiasm"/>                      <!-- /eth/ -->
<mood dominant="enthusiasm" also="pride,hope"/>    <!-- /eth/prd/hop/ -->
```

`<mood>` is a **child of `<block>`**, first among its children: a mood colours
the whole segment, not one command. The attributes carry the English gloss, not
the code — the code is bracket-form shorthand, and what reaches the deliverable
is the word. Mood colours tone only; it never alters permissions.

Both `/eth/` and `\eth\` are accepted on input.

---

## 7. Vocabulary

Generated from the engine. Every row is asserted by the suite.

### Instructions (105)

The bulk of the vocabulary. `*` in the aliases column is a bracket-form economy only.

| bracket | element | aliases |
|---|---|---|
| `[add` | `<add>` | — |
| `[alt` | `<alternative>` | — |
| `[alw` | `<always>` | — |
| `[ask` | `<ask>` | — |
| `[assm` | `<assumption>` | `[as` |
| `[avd` | `<avoid>` | — |
| `[bold` | `<bold>` | — |
| `[brst` | `<brainstorm>` | — |
| `[byp` | `<bypass>` | — |
| `[cat` | `<categorize>` | — |
| `[clar` | `<clarification>` | `[cl` |
| `[cmp` | `<compare>` | — |
| `[cncl` | `<conclude>` | — |
| `[cnsd` | `<consider>` | — |
| `[cnst` | `<constraint>` | `[cn` |
| `[cond` | `<condition>` | — |
| `[conf` | `<confirmation>` | — |
| `[core` | `<core>` | — |
| `[crit` | `<criticize>` | `[cr` |
| `[ctrd` | `<contradict>` | — |
| `[ctx` | `<context>` | `[cx` |
| `[deny` | `<deny>` | — |
| `[depr` | `<deprecated>` | — |
| `[dfn` | `<define-symbol>` | — |
| `[dist` | `<distinguish>` | — |
| `[dont` | `<do-not>` | — |
| `[drvf` | `<derive-from>` | — |
| `[elab` | `<elaborate>` | — |
| `[eq` | `<equal>` | — |
| `[error` | `<error>` | — |
| `[eval` | `<evaluate>` | — |
| `[ex` | `<example>` | — |
| `[exc` | `<exception>` | — |
| `[fbk` | `<fallback>` | — |
| `[fin` | `<finally>` | `[fn` |
| `[find` | `<find>` | — |
| `[fls` | `<false>` | — |
| `[fmt` | `<format>` | `[fm` |
| `[forex` | `<for-example>` | — |
| `[frgt` | `<forget>` | — |
| `[gen` | `<generalize>` | — |
| `[get` | `<get>` | — |
| `[go` | `<go>` | — |
| `[gt` | `<greater-than>` | — |
| `[gte` | `<greater-than-equal>` | — |
| `[hgh` | `<high>` | — |
| `[hyp` | `<hypothesis>` | — |
| `[imag` | `<imagine>` | — |
| `[impr` | `<improve>` | `[im` |
| `[ins` | `<instruction>` | `[in` |
| `[instof` | `<instead-of>` | — |
| `[intn` | `<intention>` | — |
| `[itr` | `<iterate>` | — |
| `[just` | `<justify>` | — |
| `[light` | `<light>` | — |
| `[lim` | `<limitation>` | — |
| `[low` | `<low>` | — |
| `[lrn` | `<learn>` | — |
| `[lt` | `<less-than>` | — |
| `[lte` | `<less-than-equal>` | — |
| `[mand` | `<mandatory>` | — |
| `[neq` | `<not-equal>` | — |
| `[nev` | `<never>` | — |
| `[ngt` | `<negative>` | — |
| `[nt` | `<note>` | — |
| `[onlyif` | `<only-if>` | — |
| `[onlyw` | `<only-when>` | — |
| `[opt` | `<optional>` | — |
| `[ovr` | `<override>` | — |
| `[param` | `<parameter>` | — |
| `[ph` | `<placeholder>` | — |
| `[pos` | `<positive>` | — |
| `[prio` | `<priority>` | `[pr` |
| `[prob` | `<problem>` | — |
| `[prop` | `<propose>` | — |
| `[pt` | `<part>` | — |
| `[qst` | `<question>` | — |
| `[rdy` | `<ready>` | `[ry` |
| `[real` | `<realistic>` | — |
| `[ref` | `<reference>` | — |
| `[req` | `<requirement>` | `[rq` |
| `[restr` | `<restriction>` | — |
| `[rev` | `<review>` | `[rv` |
| `[rmbr` | `<remember>` | — |
| `[rsn` | `<reason>` | — |
| `[rtnl` | `<rationale>` | `[rt` |
| `[rwk` | `<rework>` | `[rw` |
| `[scru` | `<scrutinize>` | — |
| `[seeal` | `<see-also>` | — |
| `[simp` | `<simplify>` | — |
| `[skep` | `<skeptic>` | — |
| `[spec` | `<specify>` | — |
| `[sub` | `<subtract>` | — |
| `[sum` | `<summary>` | `[sm` |
| `[switch` | `<switch>` | — |
| `[tgt` | `<target>` | `[tg` |
| `[tpl` | `<template>` | — |
| `[true` | `<true>` | — |
| `[tryfr` | `<try-for-result>` | — |
| `[unls` | `<unless>` | — |
| `[val` | `<validate>` | `[vl` |
| `[var` | `<variable>` | — |
| `[vrfy` | `<verify>` | — |
| `[warn` | `<warning>` | `[wn` |
| `[whr` | `<where>` | — |

### Structural (9)

Open a named block or bind a name. Never redefine these.

| bracket | element | aliases |
|---|---|---|
| `[block` | `<block>` | — |
| `[def` | `<define>` | — |
| `[if` | `<if>` | — |
| `[logic` | `<logic>` | — |
| `[ph` | `<placeholder>` | — |
| `[section` | `<section>` | — |
| `[skl` | `<skill>` | — |
| `[tpl` | `<template>` | — |
| `[unls` | `<unless>` | — |

### Meta (7)

About the message rather than its content.

| bracket | element | aliases |
|---|---|---|
| `[atc` | `<attachment>` | — |
| `[ext` | `<external>` | — |
| `[hmn` | `<human>` | — |
| `[none` | `<none>` | — |
| `[quick` | `<quick>` | — |
| `[toblock` | `<to-block>` | — |
| `[tosection` | `<to-section>` | — |

### Session shortcuts (5)

Serialize as themselves — a session word has no gloss to kebab.

| bracket | element | aliases |
|---|---|---|
| `[dtl` | `<dtl>` | — |
| `[info` | `<info>` | — |
| `[ok` | `<ok>` | — |
| `[org` | `<org>` | — |
| `[rd` | `<rd>` | — |

---

## 8. Coined elements

Two elements are this engine's own, not general Glyph vocabulary:

| Element | Reading |
|---|---|
| `<user-input>` | verbatim human content; never parsed as markup |
| `<user-expectative expects="…">` | the form the human expects the answer to take |

`expects` is a flattened summary of the element names inside the return body;
the body itself travels alongside it, so nothing is lost to the summary.

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

Two draft proposals are **better than what the engine does** and are not yet
implemented, because both change the deliverable and would need `fromXML()`
updated in step:

- `[pt'1.1'` → `<part n="1.1">` instead of putting the number in `<user-input>`.
- `[if'cond'…` → `<if cond="…">` instead of putting the condition in `<user-input>`.

---

## 10. Round-trip

```
[block:review[req[crit[tgt'the launchpad prompt']]]];[rwk[val'usefulness']];[sum]
```

```xml
<glyph>
  <block once="true">
    <block name="review">
      <requirement>
        <criticize>
          <target>
            <user-input>the launchpad prompt</user-input>
          </target>
        </criticize>
      </requirement>
    </block>
  </block>
  <block once="true">
    <rework>
      <validate>
        <user-input>usefulness</user-input>
        <needs slot="2">the external criterion</needs>
      </validate>
    </rework>
  </block>
  <block once="true">
    <summary>
      <needs>what to summarise</needs>
    </summary>
  </block>
</glyph>
```

Three segments, because `;` closes one. `<validate>` takes two operands and
got one, so position 2 comes back as a numbered `<needs>` (§5). The inner `<block name="review">` is the
`STRUCT` command; the outer three are segment wrappers — `once` and position
tell them apart. `<summary>` picked up a `<needs>` because `SUM` wants an
operand and none was given: the empty field does not block, it asks.

```bash
node scripts/glyph-parser.js "<the xml above>" --from-xml
```
