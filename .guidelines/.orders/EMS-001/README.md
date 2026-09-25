# EMS-001 — o Glyph em Rust

A série que leva o Glyph a um app Rust pequeno, uma peça verificável por vez.
A spec é [`EMS-001.pgml`](EMS-001.pgml), as razões estão em
[`BRIEFING-2026-09-24.md`](../BRIEFING-2026-09-24.md), e o retorno da sessão
que corre a fila é [`RETURN.md`](RETURN.md). Cada ORD é uma pasta `ORD-####/`
com o pacote que o `--bundle` escreve, e a contagem é desta série.

## A Ordem aberta

- [`EMS-001/ORD-0004`](ORD-0004/ORD-0004.xml) — `glyph-lex`; aberta em 2026-09-25

## Ordens fechadas

| ORD | o que entregou | commit | digest |
|---|---|---|---|
| [`ORD-0001`](ORD-0001/ORD-0001.xml) | o oráculo congelado: `--export-oracle` escreve 114 arquivos | `030ed76`, a tag `conformance-v0` | `c00119e0f6253564f53b9d05dafc8a6833a489e27a0af7caa42d45bc4c22d828` — `LC_ALL=C sha256sum *.json \| sha256sum` em `rust/target/oracle/` |
| [`ORD-0002`](ORD-0002/ORD-0002.xml) | `glyph-util` e `glyph-version`: `esc`, `xesc`, `lev`, `walk` e `VERSION` iguais ao JS em tudo o que o oráculo guarda | `79aebbd` | `6fb833ec47e105cdc72fd515633597896e1e65d83730dcd157f67876cc927b5c` — `sha256sum` de `rust/target/oracle-modules/util.json` |
| [`ORD-0003`](ORD-0003/ORD-0003.xml) | `glyph-vocab` e `glyph-stores`: as 22 tabelas do vocabulário e as três stores iguais ao JS pelo digest; a store de composição compilada byte a byte | `d9ea4fe` | `55ba73dad05f0811ccecf782e701e86966fe6b0ce818055cf0d99cdb2010bf25` (`vocabulary.json`) e `4f03181d22088569691864c88925d48bc1bbc5691df080d97d4551511541d4b1` (`stores.json`), de `rust/target/oracle-modules/` |
