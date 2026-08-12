---
name: glyph-markup-commons
description: Common vocabulary and canonical aliases reference for Glyph Markup v1.0.9.3.
---

# Glyph Common Vocabulary & Aliases (v1.0.9.3)

Tabela unificada de comandos canônicos e vocabulário base:

## Comandos Canônicos Principais

- `[CRIT]`: Criticar / julgar (subsumiu `[eval]` e `[rev]`)
- `[VAL]`: Validar contra critério externo
- `[COND]`: Condição (subsumiu `[onlyif]`)
- `[ELAB]`: Detalhar (subsumiu `[spec]`)
- `[CLAR]`: Esclarecer (subsumiu `[simp]`)
- `[EX]`: Exemplo (subsumiu `[forex]`)
- `[ASK]`: Perguntar (subsumiu `[qst]`)
- `[DFN]`: Definir novo símbolo (2 slots)
- `[DEF]`: Valor default
- `[SUM]`: Resumir
- `[VRFY]`: Verificar
- `[SCRU]`: Escrutinar (composto: context + verify + critic + ask)
- `[TRYFR]`: Tentar resultado (composto: target + verify)
- `[ERROR]`: Erro (hieróglifo, primitivo — não deriva de nada)
- `[PROB]`: Problema (composto: error + context)

## Casa vazia não é erro

`[SUM]` sem alvo não bloqueia: vira `<needs>o que resumir</needs>` no XML, severidade `ask`. Só sintaxe ou vocabulário quebrado (comando fora da tabela, colchete sem par, `[--nome` sem definição no corpo) é severidade `fix`.

## Templates prontos (biblioteca)

`germinate`, `scientific-review`, `reinforce`, `insight`, `fertilize`, `best-of`, `track` — invocar com `[--nome'valor1','valor2',...]` (posicional, na ordem declarada) ou `[ph-nome'valor']` (por nome) expande o corpo inteiro na mensagem, não só a chamada. `best-of` aceita mais de dois candidatos repetindo `[ph-more'C'][ph-more'D']` na chamada.

## Emoções Suportadas (`/xxx/`)

`/eth/` entusiasmo, `/cnf/` confusão, `/clm/` calma, `/hop/` esperança, `/grt/` gratidão, `/cur/` curiosidade, `/frs/` frustração, `/skp/` ceticismo.
