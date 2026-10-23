# EMS-002 — o Glyph 100% em Rust

A série que leva o motor, o núcleo do app e a skill para o Rust, o JS saindo
peça por peça, cada uma quando o Rust passa o oráculo nela. A spec é
[`EMS-002.pgml`](EMS-002.pgml), e as candidatas da fila estão no
[`.plan`](../../.plan/README.md) §5. Cada ORD é uma pasta `ORD-####/` com o
pacote que o `--bundle` escreve, e a contagem é desta série.

## A Ordem aberta

- [`EMS-002/ORD-0002`](ORD-0002/ORD-0002.xml) — o `NodeID` dos caminhos virtuais, a identidade só pela estrutura; aberta em 2026-10-23

## Ordens fechadas

| ORD | o que entregou | commit | digest |
|---|---|---|---|
| [`ORD-0001`](ORD-0001/ORD-0001.xml) | `glyph-vpath`, os caminhos virtuais, camadas 1, 4, 5 e 6 do `.plan` §0, chaveadas pelo slug: as árvores por extensão, o índice dos 134 arquivos em 1 750 nós com bytes, linhas e impressão digital, o resolvedor, o `sources:` semeado e o portão no `npm run check`, cada brecha vista falhando | `b8bcbe3` e `6f8a1c2` | `fc5b4f241ff9b345cdb7d9ef994e9c51211683a0a4543b186dca31160b2f9c69` — `sha256sum` do `index.json` em `6f8a1c2` |
