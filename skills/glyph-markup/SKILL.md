---
name: glyph-markup
description: Glyph Shorthand Markup Language v1.8 Specification & Parser Integration. Use when writing or reading Glyph compact structured notation.
---

# Glyph Shorthand Markup Language (v1.8 Specification)

Glyph é uma notação de comandos abreviados, entre delimitadores, que descreve um fluxo lógico escalável até os mínimos detalhes.

## Regras Normativas v1.8

1. **Delimitadores de Emoção**: Emoções usam exclusivamente slashes `/`: `/eth/`, `/cnf/`, `/clm/`. O uso de backslashes `\` foi totalmente removido.
2. **Operador de Encadamento**: Encadear comandos é feito **exclusivamente por hífen `-`**: `[CMD1-CMD2-CMD3]`. O antigo operador `/` divisor foi removido.
3. **Definição de Símbolos**: `[DFN'símbolo','significado']` define novos símbolos. `[DEF]` é reservado para valor padrão (default).
4. **Operadores de Comparação Prefixos**: Comparações usam forma prefixa de 2 argumentos: `[gt'A','B']`, `[gte'A','B']`, `[lt'A','B']`, `[lte'A','B']`, `[eq'A','B']`, `[neq'A','B']`.
5. **Invocação de Templates**: Invocação de template usa `[--nome` ou `[--nome'parâmetro']`. Definição usa `[--nome=...`.
6. **Auto-fechamento (`;)**: O operador `;` auto-fecha blocos abertos apenas se a aridade mínima do comando já tiver sido satisfeita.

## Tabela de Aliases v1.8

- `[EVAL]` e `[REV]` resolvem para `[CRIT]`
- `[ONLYIF]` resolve para `[COND]`
- `[SPEC]` resolve para `[ELAB]`
- `[SIMP]` resolve para `[CLAR]`
- `[FOREX]` resolve para `[EX]`
- `[QST]` resolve para `[ASK]`

## Estrutura de Slots de Contexto (`[CTX]`)

`[ctx'what','where','when']` aceita 3 slots posicionais opcionais:
1. `what`: O assunto ou entidade principal.
2. `where`: O arquivo, módulo ou escopo.
3. `when`: A versão ou condição temporal.
