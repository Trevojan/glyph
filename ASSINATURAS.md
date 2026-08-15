# Assinaturas e aridades — tabela normativa (v1.1.0.1)

Quantos operandos cada comando pede, e o que acontece quando não os recebe.
Complementa o `GLOSSARIO.md`, que diz **o que** cada comando é; aqui está
**quanto** cada um pede.

> **Esta tabela é derivada do motor, não o contrário.** Tudo abaixo sai de
> `SLOTS`, `FRAMES` e `NAMED_STRUCT` em `scripts/glyph-parser.js`, e os totais
> fecham com o vocabulário: 8 + 6 + 60 + 44 = 118 comandos.

## O que mudou desde a v1.7

A versão anterior deste documento dizia que um comando com aridade mínima não
satisfeita devia emitir **erro de aridade**. Isso contradiz o desenho declarado
na própria interface — *"casa vazia não bloqueia: vira `<needs>` no XML, mande
incompleto"* — e não é o que o motor faz nem nunca fez desde a v1.0.9.

Também corrigido: a §4 falava de `[neg]`, que **não existe no vocabulário** — o
comando de polaridade negativa é `[ngt]`. O erro estava em dois documentos
normativos ao mesmo tempo; `glyph-grammar.ebnf` foi corrigido junto.

## Aridade não é erro — é severidade

Faltar operando **nunca** invalida o XML. As três severidades:

| severidade | quando | efeito |
|---|---|---|
| `fix` | sintaxe ou vocabulário quebrado | o XML não é confiável |
| `ask` | falta operando | vira `<needs>`, **não bloqueia** |
| `note` | aviso de forma | não bloqueia |

Consequência direta: `;` fecha um comando com casa vazia sem reclamar. A casa
vazia viaja como pergunta dentro do XML, que é o ponto — o incompleto vai junto
e volta preenchido.

---

## 1. Aridade estrita — 2 posições (8)

Cada posição não preenchida vira `<needs slot="n">` com o nome da posição.
Tem precedência sobre a valência da §3: onde os dois se aplicam, vale este.

| comando | posição 1 | posição 2 |
|---|---|---|
| `[gt]` `[gte]` `[lt]` `[lte]` `[eq]` `[neq]` | o primeiro termo | o segundo termo |
| `[dfn]` | o símbolo | o significado |
| `[val]` | o que validar | o critério externo |

Comparação é **exclusivamente prefixa**: `[gt'A','B']`, nunca `A > B`.

## 2. N-ários — aceitam lista (6)

`ALT` `CAT` `CMP` `CNSD` `DIST` `SWITCH`

Pedem pelo menos um operando (`ask` em zero) e **avisam** com `note` ao receber
exatamente um, porque uma lista de um item quase sempre é engano. Não há teto.

## 3. Um slot (60)

Um operando; sem ele, `ask` e `<needs>` com a pergunta do slot.

`ADD` `ASK` `ASSM` `AVD` `BLOCK` `BRST` `BYP` `CLAR` `CNCL` `CNST` `COND`
`CRIT` `CTX` `DENY` `DONT` `DRVF` `ELAB` `EVAL` `EX` `EXC` `FIND` `FMT`
`FOREX` `GEN` `GET` `GO` `HYP` `IF` `IMAG` `IMPR` `INS` `INSTOF` `ITR` `JUST`
`LIM` `NT` `ONLYIF` `ONLYW` `PROP` `QST` `REF` `REQ` `RESTR` `REV` `RSN`
`RTNL` `RWK` `SCRU` `SECTION` `SEEAL` `SIMP` `SKEP` `SPEC` `SUB` `SUM` `TGT`
`TRYFR` `UNLS` `VRFY` `WARN`

### `[ctx]` — três posições por convenção

`[ctx'what','where','when']`: 1 o assunto, 2 o escopo (arquivo, módulo), 3 a
versão ou condição temporal. Só a primeira é exigida; as outras duas são
convenção de leitura, não aridade imposta.

## 4. Aridade zero (44)

Valem sozinhos. Nunca geram `<needs>` por falta de operando — o que não impede
que recebam um.

`ALW` `ATC` `BOLD` `CONF` `CORE` `CTRD` `DEF` `DEPR` `ERROR` `EXT` `FBK` `FIN`
`FLS` `FRGT` `HGH` `HMN` `INTN` `LIGHT` `LOGIC` `LOW` `LRN` `MAND` `NEV` `NGT`
`NONE` `OPT` `OVR` `PARAM` `PH` `POS` `PRIO` `PROB` `PT` `QUICK` `RDY` `REAL`
`RMBR` `SKL` `TOBLOCK` `TOSECTION` `TPL` `TRUE` `VAR` `WHR`

Isto inclui os cinco primitivos de intensidade da v1.1.0.0 — `HGH` `LOW`
`BOLD` `LIGHT` — e `WHR`, que o `GLOSSARIO.md` classifica como primitivos:
"valem sozinhos" é literalmente a definição da espécie.

## 5. Nome obrigatório (2)

`SECTION` e `BLOCK` exigem que o **primeiro** filho seja um literal — o nome.
Sem ele é `fix`, não `ask`: um bloco anônimo não é informação faltando, é
estrutura quebrada.

```
[section'validação',[crit],[ask]]
```

## 6. Polaridade e modalidade

`[pos]` `[ngt]` `[mand]` `[opt]` funcionam como prefixos que modificam o que
vem depois. Aridade zero, auto-fecháveis, e aceitam qualquer número de termos:
`[ngt[A],[B],[C]]` nega os três.

- `[pos[A]]` equivale a `[A]`; `[ngt[A]]` é a negação lógica de `[A]`.
- `[mand[A]]` torna `A` obrigatório; `[opt[A]]`, opcional.

Cuidado com o par vizinho, que **não** é polaridade: `[dont]` nega **fazer
algo** (a ação), `[deny]` rejeita **o que leva a um resultado** (a via). Nenhum
dos dois é `[ngt]`, que inverte valor de verdade.

## 7. Auto-fechamento

`;` fecha todos os comandos abertos e encerra o segmento. **Fecha mesmo com
casas vazias** — cada uma vira `<needs>`. `;;` não fecha nada: só divide a
resposta, e o motor avisa (`LinebreakInsideBlock`) se houver bloco aberto.

Fechar muitos de uma vez rende um `note` (`MassAutoClose`): em bloco longo
costuma fechar mais do que se pretendia.
