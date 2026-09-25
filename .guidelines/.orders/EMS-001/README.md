# EMS-001 — o Glyph em Rust

A série que leva o Glyph a um app Rust pequeno, uma peça verificável por vez.
A spec é [`EMS-001.pgml`](EMS-001.pgml), as razões estão em
[`BRIEFING-2026-09-24.md`](../BRIEFING-2026-09-24.md), e o retorno da sessão
que corre a fila é [`RETURN.md`](RETURN.md). Cada ORD é uma pasta `ORD-####/`
com o pacote que o `--bundle` escreve, e a contagem é desta série.

## A Ordem aberta

- [`EMS-001/ORD-0009`](ORD-0009/ORD-0009.xml) — `glyph-envelope`, `glyph-burn` e `glyph-inverse`; aberta em 2026-09-25

## Ordens fechadas

| ORD | o que entregou | commit | digest |
|---|---|---|---|
| [`ORD-0001`](ORD-0001/ORD-0001.xml) | o oráculo congelado: `--export-oracle` escreve 114 arquivos | `030ed76`, a tag `conformance-v0` | `c00119e0f6253564f53b9d05dafc8a6833a489e27a0af7caa42d45bc4c22d828` — `LC_ALL=C sha256sum *.json \| sha256sum` em `rust/target/oracle/` |
| [`ORD-0002`](ORD-0002/ORD-0002.xml) | `glyph-util` e `glyph-version`: `esc`, `xesc`, `lev`, `walk` e `VERSION` iguais ao JS em tudo o que o oráculo guarda | `79aebbd` | `6fb833ec47e105cdc72fd515633597896e1e65d83730dcd157f67876cc927b5c` — `sha256sum` de `rust/target/oracle-modules/util.json` |
| [`ORD-0003`](ORD-0003/ORD-0003.xml) | `glyph-vocab` e `glyph-stores`: as 22 tabelas do vocabulário e as três stores iguais ao JS pelo digest; a store de composição compilada byte a byte | `d9ea4fe` | `55ba73dad05f0811ccecf782e701e86966fe6b0ce818055cf0d99cdb2010bf25` (`vocabulary.json`) e `4f03181d22088569691864c88925d48bc1bbc5691df080d97d4551511541d4b1` (`stores.json`), de `rust/target/oracle-modules/` |
| [`ORD-0004`](ORD-0004/ORD-0004.xml) | `glyph-lex`: os 11 008 tokens das 114 fontes iguais ao oráculo, spans em UTF-16; e mais 1 688 fontes, `classify` e `suggest` | `06989f7` | `c00119e0f6253564f53b9d05dafc8a6833a489e27a0af7caa42d45bc4c22d828` (os casos) e `b70bb078c74ad025507d9eebbc86239068e1cc48ef678f47df4005206d6201b8` (`lexer.json`) |
| [`ORD-0005`](ORD-0005/ORD-0005.xml) | `glyph-logic`: os 8 nós Logic do oráculo iguais; e `parseLogic`, `expandExpr` e `freeVars` em 1 610 blocos e 1 588 strings | `12cc408` | `c00119e0f6253564f53b9d05dafc8a6833a489e27a0af7caa42d45bc4c22d828` (os casos) e `53ec4964aca68075372dd85f38e020fa571b9c8716cae8f1db26f490f895b546` (`logic.json`) |
| [`ORD-0006`](ORD-0006/ORD-0006.xml) | `glyph-templates` e `glyph-rules`: os 14 diagnósticos de molde e regra dos 36 casos T, C e K iguais ao oráculo; e 163 corridas em 215 níveis de expansão, os defeitos do JS reproduzidos | `ca9c1a6` | `c00119e0f6253564f53b9d05dafc8a6833a489e27a0af7caa42d45bc4c22d828` (os casos) e `cb065d27bb54551637ccfb07ce896557f5cc5f82797a238875af0a693c631ed3` (`trees.json`) |
| [`ORD-0007`](ORD-0007/ORD-0007.xml) | `glyph-parse`: todo campo que o envelope lê — de cada nó, de cada segmento, de cada diagnóstico em pt-BR e en-EU — igual ao JS nas 114 fontes e em 159 sondas | `1a79b2c` | `c00119e0f6253564f53b9d05dafc8a6833a489e27a0af7caa42d45bc4c22d828` (os casos) e `3fd68d651077ca5332d8bedcf6c797509ab1f3ee30ff442f9e50ea3f59c4ef9b` (`parse.json`) |
| [`ORD-0008`](ORD-0008/ORD-0008.xml) | `glyph-xml` e o primeiro binário: `glyph` lê Glyph no stdin e escreve o XML; os cinco exemplos de `conformance/examples.json` byte a byte, e as 114 fontes iguais ao oráculo | `97ea472` | `c00119e0f6253564f53b9d05dafc8a6833a489e27a0af7caa42d45bc4c22d828` (os casos) e `cfab5a595c70e3458995474b1a01cdb08857e6a902bd5d331b6eaa99f3b02c63` (`xml.json`) |
