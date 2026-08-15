---
name: glyph-markup-commons
description: Common vocabulary and canonical aliases reference for Glyph Markup v1.2.0.0.
---

# Glyph — vocabulário comum e aliases (v1.2.0.0)

Tabela de bolso. A referência normativa completa é `GLOSSARY.md`; as aridades
estão em `SIGNATURES.md`.

## O mínimo para começar

```
[crit'o parser']                    critique isto
[crit'o parser'][ctx'api/pedidos.py']   …neste contexto
[rw-cr'o módulo']                   retrabalhe E critique (cadeia)
/frs/[crit'esse parser me venceu']  com humor declarado
```

**Casa vazia não bloqueia.** `[sum]` sem alvo não é erro: vira
`<needs>o que resumir</needs>` no XML e a mensagem segue utilizável. Só sintaxe
ou vocabulário quebrado é `fix`.

## Pontuação

| símbolo | o quê |
|---|---|
| `'texto'` | literal — sem precisar de shift |
| `;` | fecha o bloco (fecha mesmo com casa vazia) |
| `;;` | quebra a resposta em duas — **não** fecha nada |
| `,` | lista itens / continua cadeia |
| `-` | encadeia: `[rw-cr]` |
| `r-` | o que eu devo devolver |
| `[--nome` | chama template · `[--nome=` define |
| `[=` | este bloco continua do anterior |
| `[logic-nome]` | abre bloco de conta |
| `[off]` … `[on]` | desliga e religa a leitura de Glyph |

## Duas espécies

- **hieróglifo** (88) — átomo, não decompõe. `[ctx]`, `[error]`, `[core]`, `[tgt]`
- **glifo composto** (32) — tem fórmula que o reduz a hieróglifos. `[crit]`,
  `[scru]`, `[prob]`, `[hyp]`

Para ver do que um comando é feito:
`node scripts/glyph-parser.js CRIT --expand`

## Comandos canônicos principais

- `[CRIT]` criticar — comparar com o objetivo declarado
- `[EVAL]` avaliar — comparar com padrão realista de qualidade
- `[REV]` revisar — varredura de leitura, sem comparação formal
- `[VAL]` validar contra critério externo *(2 slots obrigatórios)*
- `[VRFY]` verificar — comparar com a verdade/fato
- `[SCRU]` escrutinar *(composto: contexto + verificar + criticar + perguntar)*
- `[COND]` condição — gate genérico · `[ONLYIF]` condição necessária
- `[ELAB]` detalhar (o ato) · `[SPEC]` a especificação (o artefato)
- `[CLAR]` remover ambiguidade · `[SIMP]` cortar complexidade
- `[EX]` o exemplo em si · `[FOREX]` o conectivo que introduz um
- `[ASK]` perguntar a alguém · `[QST]` marcar o bloco como interrogativo
- `[DFN]` definir símbolo *(2 slots)* · `[DEF]` valor padrão
- `[CORE]` fundamento estrutural *(era `[BASE]` até a v1.0.9.3)*
- `[ERROR]` erro *(hieróglifo)* · `[PROB]` erro situado num contexto *(composto)*
- `[SUM]` resumir · `[TRYFR]` tentar atingir o alvo com verificação

## Pares que se confundem

| par | o que separa |
|---|---|
| `[EVAL]` / `[CRIT]` | contra padrão realista / contra o objetivo declarado |
| `[REV]` / `[CRIT]` | varredura de leitura / comparação formal |
| `[SPEC]` / `[ELAB]` | o artefato detalhado / o ato de detalhar |
| `[SIMP]` / `[CLAR]` | cortar complexidade / remover ambiguidade |
| `[QST]` / `[ASK]` | tipagem do bloco / ato dirigido a alguém |
| `[FOREX]` / `[EX]` | o conectivo que introduz / o dado em si |
| `[ONLYIF]` / `[COND]` | condição necessária / gate genérico |
| `[DONT]` / `[DENY]` | nega **a ação** / rejeita **a via até um resultado** |
| `[LIM]` / `[RESTR]` | constata um limite / impõe um limite |
| `[NGT]` / `[DONT]` | inverte valor de verdade / proíbe fazer |

*(Os sete primeiros foram fundidos na v1.7 e separados de novo na v1.1.0.0 —
`GLOSSARY.md` §6.5.)*

## Vocabulário da v1.1.0.0

- **Contexto** — `[FIND]` buscar · `[GET]` ler e reter · `[ADD]` acrescentar ·
  `[SUB]` subtrair · `[WHR]` onde
- **Intensidade** — `[HGH]` alta · `[LOW]` baixa · `[BOLD]` ênfase forte ·
  `[LIGHT]` ênfase suave
- **Outros** — `[SWITCH]` alternar entre estados · `[GO]` executar

Os quatro de intensidade e o `[WHR]` são primitivos: valem sozinhos, nunca
pedem operando.

## Aliases curtos

`[IN]`→`[INS]` · `[AS]`→`[ASSM]` · `[CX]`→`[CTX]` · `[PR]`→`[PRIO]` ·
`[TG]`→`[TGT]` · `[RY]`→`[RDY]` · `[VL]`→`[VAL]` · `[RQ]`→`[REQ]` ·
`[CR]`→`[CRIT]` · `[RW]`→`[RWK]` · `[RV]`→`[REV]` · `[FM]`→`[FMT]` ·
`[IM]`→`[IMPR]` · `[FN]`→`[FIN]` · `[CL]`→`[CLAR]` · `[RT]`→`[RTNL]` ·
`[CN]`→`[CNST]` · `[WN]`→`[WARN]` · `[SM]`→`[SUM]`

## Templates prontos

`germinate`, `scientific-review`, `reinforce`, `insight`, `fertilize`,
`best-of`, `loop`, `track`. Invocar com `[--nome'valor1','valor2',…]`
(posicional) ou `[ph-nome'valor']` (por nome) expande o corpo inteiro na
mensagem. `best-of` aceita mais candidatos repetindo `[ph-more'C'][ph-more'D']`.

## Emoções (`/xxx/`)

`/eth/` entusiasmo · `/cnf/` confusão · `/clm/` calma · `/hop/` esperança ·
`/grt/` gratidão · `/cur/` curiosidade · `/frs/` frustração · `/skp/` ceticismo
