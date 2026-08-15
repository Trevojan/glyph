---
name: glyph-markup
description: Glyph Shorthand Markup Language v1.2.0.0 Specification & Parser Integration. Use when writing or reading Glyph compact structured notation.
---

# Glyph Shorthand Markup Language (v1.2.0.0)

Glyph é uma notação de comandos abreviados, entre delimitadores, que descreve um
fluxo lógico escalável até os mínimos detalhes. A implementação de referência é
`scripts/glyph-parser.js`: um núcleo único (Node via `require`, navegador via
`window.GlyphCore`) que faz lexer, parser, checagem de aridade, regras semânticas
e emissão de **XML** — o XML é o entregável, não a AST (que é só painel de
inspeção).

`GLOSSARIO.md` é a referência normativa do vocabulário. O motor deriva dele, e a
suíte tem uma checagem (`X-01`) que falha se os dois divergirem.

## Regras Normativas

1. **Emoção** usa exclusivamente slashes: `/eth/`, `/cnf/`, `/clm/`. Backslash
   foi removido.
2. **Encadeamento** é exclusivamente por hífen: `[CMD1-CMD2-CMD3]`. O antigo
   divisor `/` foi removido.
3. **Definição de símbolo**: `[DFN'símbolo','significado']`. `[DEF]` é reservado
   para valor padrão.
4. **Comparação é prefixa**, sempre 2 argumentos: `[gt'A','B']`, `[gte]`, `[lt]`,
   `[lte]`, `[eq]`, `[neq]`.
5. **Template**: invoca com `[--nome` ou `[--nome'parâmetro']`; define com
   `[--nome=…`.
6. **`;` fecha, `;;` não.** `;` fecha todos os comandos abertos e encerra o
   segmento — e fecha **mesmo com casas vazias**, que viram `<needs>`. `;;` só
   divide a resposta; os comandos abertos continuam abertos (o motor avisa com
   `LinebreakInsideBlock`).
7. **Polaridade negativa é `[ngt]`, não `[neg]`.** `NEG` nunca existiu no
   vocabulário.

## Severidade — o contrato

Casa vazia **não é erro** neste desenho:

| severidade | significado | efeito no XML |
|---|---|---|
| `fix` | sintaxe ou vocabulário quebrado | o XML não é confiável |
| `ask` | falta informação | vira `<needs>`, **não bloqueia** |
| `note` | aviso de forma | não bloqueia |

## Aridade — quatro classes

Detalhe completo em `ASSINATURAS.md`; o resumo operacional:

| classe | comportamento |
|---|---|
| **estrita, 2 posições** (8) | `GT GTE LT LTE EQ NEQ DFN VAL` — cada posição vazia vira `<needs slot="n">` |
| **n-ária** (6) | `ALT CAT CMP CNSD DIST SWITCH` — `note` ao receber só 1 item |
| **um slot** (60) | `<needs>` com a pergunta do slot quando vazio |
| **aridade zero** (44) | valem sozinhos, nunca geram `<needs>` |

`SECTION` e `BLOCK` exigem literal como primeiro filho (o nome) — sem ele é
`fix`, não `ask`: bloco anônimo é estrutura quebrada, não informação faltando.

## Duas espécies: hieróglifo e glifo

Distinção central da v1.1.0.0, e é ela que o `.hgml` vai consumir:

- **hieróglifo** — átomo. Não decompõe. 88 deles.
- **glifo composto** — tem fórmula que o reduz a hieróglifos. 32 deles.

A tabela vive em `expansoes.txt` (átomos declarados `= BASE`, compostos com
fórmula) e é compilada para `glyph-expansions.json`. O motor a consome por
`useExpansions()`, opcional como os outros stores:

```js
G.speciesOf("CRIT")   // "composite"
G.depthOf("CRIT")     // 2
G.formulaOf("CRIT")   // "[CMP[CTX],[SPEC-CORE],[EVAL[ERROR]]]"
G.atomsOf("CRIT")     // 15 hieróglifos
```

Na AST cada comando traz `species` e `compositionDepth`. **Cuidado com o par
homônimo:** `depth` é a profundidade do nó no texto do usuário;
`compositionDepth` é a do comando no vocabulário. Eixos diferentes.

```bash
node scripts/glyph-parser.js CRIT --expand
```

## Notação das fórmulas

Quatro construções, cada uma com uma leitura só:

| forma | leitura |
|---|---|
| `[A[B]]` | aninhamento — B é operando de A |
| `[A],[B]` | conjunção — A e B valem juntos, sem ordem entre si |
| `[A][B]` | sequência — A, depois B |
| `[A-B]` | cadeia — A e B aplicados ao mesmo operando |

**Ligação do operando** (`GLOSSARIO.md` §0.3): o operando do humano é o
**sujeito da fórmula inteira**. Vírgula não troca o sujeito; justaposição
encadeia no resultado; o que está aninhado é o *padrão* contra o qual se opera,
não sujeito novo.

`[crit'o parser']` lê-se: compare *'o parser'* com o contexto; especifique o
núcleo de *'o parser'*; avalie *'o parser'* quanto a erros.

## Templates que expandem

`[--nome=corpo]` define; `[--nome[…]]` invoca **e expande** — o corpo entra na
mensagem, não só a casca. O corpo declara casas com `` [ph-nome`pergunta`] ``; a
chamada preenche por nome (`[ph-nome'valor']`) ou por posição (literais soltos,
na ordem de `params`). Casa não preenchida vira `<needs>`. Um `param` pode ser
`"repeat": true` (no máximo um por template): sai da ordem posicional e só se
preenche por chamada nomeada repetida, virando um nó a mais por ocorrência.
Ciclos são barrados (`TemplateCycle`).

## Regras semânticas

`glyph-rules.json` checa **coerência** além da sintaxe: `pair` (dois comandos no
mesmo alvo — irmãos ou um ancestral do outro), `order` (`then` antes de `first`)
e `precondition` (alvo sem nenhum dos `requiresBefore` antes dele no mesmo
segmento). Sob `[ovr]` ou `[byp]` a sobreposição é isenta — foi pedida de
propósito.

## Aliases

Formas curtas (a longa é a canônica): `[IN]`→`[INS]`, `[AS]`→`[ASSM]`,
`[CX]`→`[CTX]`, `[PR]`→`[PRIO]`, `[TG]`→`[TGT]`, `[RY]`→`[RDY]`, `[VL]`→`[VAL]`,
`[RQ]`→`[REQ]`, `[CR]`→`[CRIT]`, `[RW]`→`[RWK]`, `[RV]`→`[REV]`, `[FM]`→`[FMT]`,
`[IM]`→`[IMPR]`, `[FN]`→`[FIN]`, `[CL]`→`[CLAR]`, `[RT]`→`[RTNL]`,
`[CN]`→`[CNST]`, `[WN]`→`[WARN]`, `[SM]`→`[SUM]`

**As sete fusões da v1.7 foram desfeitas.** `[EVAL]`, `[REV]`, `[SPEC]`,
`[SIMP]`, `[QST]`, `[FOREX]` e `[ONLYIF]` são comandos próprios de novo — ver a
tabela de eixos em `glyph-markup-commons`.

## `[ctx]` — três posições

`[ctx'what','where','when']`: 1 o assunto, 2 o escopo (arquivo, módulo), 3 a
versão ou condição temporal. Só a primeira é exigida.

## Arquivos

`/scripts` guarda **JavaScript**; dados (`.json`, `.txt`), o app (`.html`,
`.css`) e os documentos ficam na raiz. O critério é o tipo do arquivo, não quem
o escreveu — por isso o gerado `glyph-data.js` (JS) fica em `/scripts` e o
gerado `glyph-expansions.json` (dados) fica na raiz.

| arquivo | papel |
|---|---|
| `GLOSSARIO.md` | referência normativa do vocabulário |
| `ASSINATURAS.md` | aridades, derivadas do motor |
| `expansoes.txt` | tabela de composição (fonte, editável) |
| `scripts/glyph-parser.js` | o núcleo |
| `glyph-rules.json` · `glyph-templates.json` | stores, editáveis |
| `scripts/glyph-data.js` · `glyph-expansions.json` | **gerados** |

Editou um `.json` ou o `.txt`? Rode `node scripts/build-templates.js`.
Verificação: `node scripts/test-corpus.js` e `node scripts/dag.js`.

## Versionamento — `a.b.c.d`

`a` frontend · `b` backend (parser) · `c` business rules · `d` dados e
constantes. Um dígito que anda zera todos à direita.

## `.hgml` — a queima atômica

`toHGML()` reduz a árvore a hieróglifos puros: cada composto trocado pela sua
fórmula, até não sobrar nada que decomponha. Forma fechada `[nome … [/nome]`,
abrindo **sem** `]` (porque `]` já fecha, e `[ctx][/ctx]` daria
`UnmatchedCloseTag`).

```bash
node scripts/glyph-parser.js "[prob'timeout']" --hgml
```

É **expansão, não compressão**: ~15 hieróglifos por composto, 97 para `[hyp]`,
cerca de 25x numa entrada curta. A saída continua Glyph válido, então reparseia —
o que dá o oráculo de correção da suíte.

30 dos 32 compostos queimam limpo. `SCRU` (usa `R:` dentro de colchetes) e `QST`
(usa `[LOGIC-…]`, que o lexer reivindica como bloco de conta) não — são
problemas de dado, fixados pelo nome no caso `H-09`.
