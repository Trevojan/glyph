# Signatures and arities — normative table (v1.3.0.0)

How many operands each command asks for, and what happens when it does not get
them. Complements `GLOSSARY.md`, which says **what** each command is; this says
**how much** each one asks for.

> **This table is derived from the engine, not the other way round.** Everything
> below comes from `SLOTS`, `FRAMES` and `NAMED_STRUCT` in
> `scripts/glyph-parser.js`, and the totals close against the vocabulary:
> 8 + 6 + 60 + 44 = 118 commands.

## Arity is not an error — it is a severity

A missing operand **never** invalidates the XML. The three severities:

| severity | when | effect |
|---|---|---|
| `fix` | broken syntax or vocabulary | the XML is not trustworthy |
| `ask` | an operand is missing | becomes `<needs>`, **does not block** |
| `note` | a warning about shape | does not block |

Direct consequence: `;` closes a command with an empty slot without complaining.
The empty slot travels as a question inside the XML, which is the whole point —
the incomplete message goes out and comes back filled in.

An earlier version of this document said a command whose minimum arity was
unmet had to raise an **arity error**. That contradicts the design stated in the
interface itself — *"an empty slot does not block: it becomes `<needs>` in the
XML, send it incomplete"* — and it is not what the engine does, nor has been
since v1.0.9.

---

## 1. Strict arity — 2 positions (8)

Each unfilled position becomes `<needs slot="n">` carrying the position's name.
Takes precedence over the valency in §3: where both apply, this one wins.

| command | position 1 | position 2 |
|---|---|---|
| `[gt]` `[gte]` `[lt]` `[lte]` `[eq]` `[neq]` | the first term | the second term |
| `[dfn]` | the symbol | the meaning |
| `[val]` | what to validate | the external criterion |

Comparison is **exclusively prefix**: `[gt'A','B']`, never `A > B`.

## 2. N-ary — take a list (6)

`ALT` `CAT` `CMP` `CNSD` `DIST` `SWITCH`

They ask for at least one operand (`ask` at zero) and **warn** with `note` when
given exactly one, because a list of one item is almost always a mistake. There
is no ceiling.

## 3. One slot (60)

One operand; without it, `ask` and a `<needs>` carrying the slot's question.

`ADD` `ASK` `ASSM` `AVD` `BLOCK` `BRST` `BYP` `CLAR` `CNCL` `CNST` `COND`
`CRIT` `CTX` `DENY` `DONT` `DRVF` `ELAB` `EVAL` `EX` `EXC` `FIND` `FMT`
`FOREX` `GEN` `GET` `GO` `HYP` `IF` `IMAG` `IMPR` `INS` `INSTOF` `ITR` `JUST`
`LIM` `NT` `ONLYIF` `ONLYW` `PROP` `QST` `REF` `REQ` `RESTR` `REV` `RSN`
`RTNL` `RWK` `SCRU` `SECTION` `SEEAL` `SIMP` `SKEP` `SPEC` `SUB` `SUM` `TGT`
`TRYFR` `UNLS` `VRFY` `WARN`

### `[ctx]` — three positions by convention

`[ctx'what','where','when']`: 1 the subject, 2 the scope (file, module), 3 the
version or temporal condition. Only the first is required; the other two are a
reading convention, not an enforced arity.

## 4. Zero arity (44)

They stand on their own. They never produce `<needs>` for a missing operand,
which does not stop them from receiving one.

`ALW` `ATC` `BOLD` `CONF` `CORE` `CTRD` `DEF` `DEPR` `ERROR` `EXT` `FBK` `FIN`
`FLS` `FRGT` `HGH` `HMN` `INTN` `LIGHT` `LOGIC` `LOW` `LRN` `MAND` `NEV` `NGT`
`NONE` `OPT` `OVR` `PARAM` `PH` `POS` `PRIO` `PROB` `PT` `QUICK` `RDY` `REAL`
`RMBR` `SKL` `TOBLOCK` `TOSECTION` `TPL` `TRUE` `VAR` `WHR`

This includes the four intensity primitives — `HGH` `LOW` `BOLD` `LIGHT` — and
`WHR`, which `GLOSSARY.md` classifies as primitives: "stands alone" is literally
the definition of the species.

### Where species and arity disagree

The glossary's *primitive/operator* axis is about **semantic role**; the tables
above are about **enforced arity**. They mostly agree, and where they do not the
engine is what runs. `RSN` and `FIN`, for instance, are hieroglyph primitives in
§2 of the glossary yet `RSN` carries a `FRAMES` entry, so it asks for an operand
in practice. Worth reviewing, not worth silently "fixing" in either direction.

## 5. Mandatory name (2)

`SECTION` and `BLOCK` require their **first** child to be a literal — the name.
Without it the severity is `fix`, not `ask`: an anonymous block is not missing
information, it is broken structure.

```
[section'validation',[crit],[ask]]
```

## 6. Polarity and modality

`[pos]` `[ngt]` `[mand]` `[opt]` act as prefixes modifying what follows. Zero
arity, self-closing, and they accept any number of terms: `[ngt[A],[B],[C]]`
negates all three.

- `[pos[A]]` is equivalent to `[A]`; `[ngt[A]]` is the logical negation of `[A]`.
- `[mand[A]]` makes `A` mandatory; `[opt[A]]` makes it optional.

Careful with the neighbouring pair, which is **not** polarity: `[dont]` negates
**doing something** (the action), `[deny]` rejects **what leads to a result**
(the route). Neither is `[ngt]`, which inverts a truth value.

An earlier version of this document referred to `[neg]`, which **does not exist
in the vocabulary** — the negative polarity command is `[ngt]`. The same error
survived in `glyph-grammar.ebnf` and was corrected alongside it.

## 7. Auto-closing

`;` closes every open command and ends the segment. **It closes even with empty
slots** — each becomes a `<needs>`. `;;` closes nothing: it only splits the
reply, and the engine warns (`LinebreakInsideBlock`) if a block is left open.

Closing many at once earns a `note` (`MassAutoClose`): in a long block that
usually closes more than was intended.
