---
name: glyph-markup-commons
description: Common vocabulary and canonical aliases reference for Glyph Markup v1.1.0.0.
---

# Glyph Common Vocabulary & Aliases (v1.1.0.0)

Tabela unificada de comandos canônicos e vocabulário base. A referência
normativa completa é `GLOSSARIO.md`.

## Comandos Canônicos Principais

- `[CRIT]`: Criticar — comparar com o objetivo declarado
- `[VAL]`: Validar contra critério externo
- `[COND]`: Condição — gate genérico
- `[ELAB]`: Detalhar — o ato de acrescentar detalhe
- `[CLAR]`: Esclarecer — remover ambiguidade
- `[EX]`: Exemplo — o dado, o caso concreto
- `[ASK]`: Perguntar — ato dirigido a alguém
- `[DFN]`: Definir novo símbolo (2 slots)
- `[DEF]`: Valor default
- `[CORE]`: Fundamento estrutural (era `[BASE]` até a v1.0.9.3)
- `[SUM]`: Resumir
- `[VRFY]`: Verificar
- `[SCRU]`: Escrutinar (composto: context + verify + critic + ask)
- `[TRYFR]`: Tentar resultado (composto: target + verify)
- `[ERROR]`: Erro (hieróglifo, primitivo — não deriva de nada)
- `[PROB]`: Problema (composto: error + context)

## As sete fusões da v1.7, desfeitas na v1.1.0.0

Cada par tem um eixo que os separa; escrever um no lugar do outro deixou de
ser equivalente:

| par | o que cada lado é |
|---|---|
| `[EVAL]` / `[CRIT]` | contra padrão realista / contra o objetivo declarado |
| `[REV]` / `[CRIT]` | varredura de leitura / comparação formal |
| `[SPEC]` / `[ELAB]` | o artefato detalhado / o ato de detalhar |
| `[SIMP]` / `[CLAR]` | cortar complexidade / remover ambiguidade |
| `[QST]` / `[ASK]` | tipagem do bloco / ato dirigido a alguém |
| `[FOREX]` / `[EX]` | o conectivo que introduz / o dado em si |
| `[ONLYIF]` / `[COND]` | condição necessária / gate genérico |

## Vocabulário novo na v1.1.0.0

- **Contexto** — `[FIND]` buscar, `[GET]` ler e reter, `[ADD]` acrescentar,
  `[SUB]` subtrair, `[WHR]` onde
- **Intensidade** — `[HGH]` alta, `[LOW]` baixa, `[BOLD]` ênfase forte,
  `[LIGHT]` ênfase suave
- **Outros** — `[SWITCH]` alternar entre estados, `[GO]` executar

`[DONT]` nega **fazer algo** (a ação); `[DENY]` rejeita **o que leva a um
resultado** (a via). Não são intercambiáveis.

## Casa vazia não é erro

`[SUM]` sem alvo não bloqueia: vira `<needs>o que resumir</needs>` no XML, severidade `ask`. Só sintaxe ou vocabulário quebrado (comando fora da tabela, colchete sem par, `[--nome` sem definição no corpo) é severidade `fix`.

## Templates prontos (biblioteca)

`germinate`, `scientific-review`, `reinforce`, `insight`, `fertilize`, `best-of`, `track` — invocar com `[--nome'valor1','valor2',...]` (posicional, na ordem declarada) ou `[ph-nome'valor']` (por nome) expande o corpo inteiro na mensagem, não só a chamada. `best-of` aceita mais de dois candidatos repetindo `[ph-more'C'][ph-more'D']` na chamada.

## Emoções Suportadas (`/xxx/`)

`/eth/` entusiasmo, `/cnf/` confusão, `/clm/` calma, `/hop/` esperança, `/grt/` gratidão, `/cur/` curiosidade, `/frs/` frustração, `/skp/` ceticismo.
