# Glyph v1.7 → v1.8 — Lista de Alterações e Marcos

Data de lançamento: **2026-08-02**

## 🌟 O Trunfo do Glyph: Gerador de AST JSON Determinístico
- **Parser Standalone (`glyph-parser.js`)**: Módulo JS independente que lê a taquigrafia Glyph e gera uma **Árvore de Sintaxe Abstrata (AST) JSON estritamente tipada**.
- **Painel de AST no Motor Web**: Inclusão de visualizador e botão "Copiar AST" no motor `glyph-engine-alias.html`.

## 🧪 Suíte de Testes do Corpus (`test-corpus.js`)
- Execução automatizada dos **33 casos do corpus** (P-01..P-23 e N-01..N-10).
- **Resultado da Validação**: 23/23 casos positivos aprovados | 9/9 casos negativos rejeitados com diagnósticos previstos (`ArityError`, `UnterminatedLiteral`, `UnknownCommand`, `UnmatchedCloseBracket`).

## 📐 Gramática EBNF v1.8 (`glyph-grammar.ebnf`)
- Gramática compatível com **ISO/IEC 14977**.
- Formalização completa de produções de expressões em bloco `[logic]`: `expr`, `binary_op`, `func_call` (`pb`, `pc`, `ar`), `dice_expr` (`3d6kh2`).
- Operadores prefixos de comparação (`[gt]`, `[gte]`, `[lt]`, `[lte]`, `[eq]`, `[neq]`).
- Modificadores de polaridade e modalidade (`[pos]`, `[neg]`, `[mand]`, `[opt]`).

## 📑 Tabela de Assinaturas e Aridades (`SIGNATURES.md`)
- Definição estrita de aridades mínimas/máximas.
- Padronização dos 3 slots de `[CTX]`: `[ctx'what','where','when']`.

## 📦 Sincronização de Skills (Resolução C-07)
- Criada a estrutura oficial de skills em `skills/glyph-markup/SKILL.md` e `skills/glyph-markup-commons/SKILL.md`.
- Sincronização completa de canônicos, aliases e delimitadores `/xxx/`.
