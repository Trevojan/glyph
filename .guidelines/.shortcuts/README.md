# Atalhos — comece por aqui

> **O ponto de entrada.** Quem retoma o Glyph lê este arquivo primeiro e só
> então abre o que precisa. O objetivo é que apenas **o passo anterior, o atual
> e o próximo** precisem ser decifrados; todo o resto se alcança por atalho em
> vez de ser reconstruído por inferência.
>
> Este índice **aponta**. Nunca copia. Se um fato está em dois lugares, um dos
> dois está errado e ninguém sabe qual.

## Onde estou

| | |
|---|---|
| versão | **3.6.9.07** |
| suíte | `npm run check` — verde, 34 baldes, 114 fontes declaradas no snapshot; `npm run check:rust` escreve o oráculo no commit sob teste e compila e testa `rust/` |
| EMS-001 | fechadas da `ORD-0001` à `ORD-0012`, cada uma com o commit e o digest no [registro da série](../.orders/EMS-001/README.md). A fila para na `ORD-0013`, o instalador, que pede uma máquina Windows limpa e o Regente |
| último marco | o Glyph responde em Rust (2026-09-26): o app, atrás de `?engine=relay`, dá pelo motor Rust os mesmos bytes que pelo JS nas 114 fontes, em todo painel (`ORD-0011`), e o binário `glyph` responde as flags do `glyph-cli.js` (`ORD-0012`). Antes disso: o layout das séries e as `ORD-0001` a `ORD-0010`, na nuvem (2026-09-25); o trabalho de 2026-09-24, com as stores como objeto de contexto, o oráculo das 114 fontes, o workspace `rust/`, os nomes ratificados e o plugin; o núcleo em treze módulos |
| próximo | primeiro do plano, os caminhos virtuais ([`.plan`](../.plan/README.md) §0), quando o Regente os chamar. A EMS-001 espera no portão da `ORD-0013` (§5), e o que espera o Regente está no [retorno](../.orders/EMS-001/RETURN.md) |

## Os sete eixos

| eixo | o que guarda |
|---|---|
| [`.sources/`](../.sources/) | referências externas de fato usadas, e o que cada uma **decidiu** |
| [`.plan/`](../.plan/) | o que vem a seguir, e o que ficou para depois |
| [`.decisions/`](../.decisions/) | decisões tomadas, quem decidiu, e a razão |
| [`.constraints/`](../.constraints/) | o que o projeto **se proíbe** de fazer |
| [`.changelog/`](../.changelog/) | o que mudou, e como o número de versão se move |
| [`.orders/`](../.orders/) | as Ordens — o contrato do que foi entregue, exatamente uma aberta por vez, em séries `EMS-###/ORD-####/` — e os intakes que as alimentam |
| `.shortcuts/` | este arquivo |

## O mapa do motor, em cinco linhas

1. **`scripts/glyph-parser.js` é a face pública do núcleo**, que vive em `scripts/core/` — treze módulos, direção estrita `util ← vocabulary ← stores ← lexer ← logic ← {templates, rules} ← parser ← emit-xml ← {emit-ast, burn}`, mais `inverse`; `node scripts/seam-graph.js` mostra. Tudo mais consome a face.
2. A fonte `.pgml` vira **AST** (fonte de verdade), e dela saem três projeções:
   `glyph-package` (XML), o envelope `GlyphAST`, e a queima `.hgml`.
3. **O `.hgml` é derivado da árvore, não anterior a ela** — e por isso não pode
   ser a fonte de verdade. Medido em [`HGML_CONVERGENCE.md`](../HGML_CONVERGENCE.md) §6.
4. Casa vazia **não é erro**: vira `<needs>`. Severidades: `fix` recusa,
   `ask` pergunta, `note` observa.
5. Toda mudança de formato passa por [`PACKAGE_TARGET.md`](../PACKAGE_TARGET.md)
   e é medida contra `conformance/`.

## Os documentos que mais se consulta

| quando a pergunta é | abra |
|---|---|
| "que elemento esse comando emite?" | [`XML_REFERENCE.md`](../XML_REFERENCE.md) |
| "o que essa notação significa?" | [`GLOSSARY.md`](../GLOSSARY.md) §0.1, §0.3 |
| "o documento emitido pode fazer isso?" | [`PACKAGE_TARGET.md`](../PACKAGE_TARGET.md) |
| "isto é domínio ou síntese?" | [`PROMOTION_BOUNDARY.md`](../PROMOTION_BOUNDARY.md) §2 |
| "o que o motor promete e não cumpre?" | [`.orders/INTAKE-VARIABLES.md`](../.orders/INTAKE-VARIABLES.md) |
| "o que o estudo de setembro mediu e decidiu?" | [`.orders/INTAKE-FIELD-2026-09.md`](../.orders/INTAKE-FIELD-2026-09.md) §5 aponta os outros sete |
| "Rust?" | [`.orders/INTAKE-RUST.md`](../.orders/INTAKE-RUST.md) — os dois lados, pesados; o Regente decidiu migrar ([`.decisions/`](../.decisions/README.md), 2026-09-24) |
| "a escada de migração perde alguma coisa?" | [`.orders/INTAKE-RUST-LADDER.md`](../.orders/INTAKE-RUST-LADDER.md) — a escada medida contra o motor, e o que o vendoring compra (§9); §8 é o que espera o Regente |
| "o que se constrói em Rust, e em que ordem?" | [`.plan/`](../.plan/README.md) §5, a série EMS-001 |
| "duas fontes, uma intenção?" | [`HGML_CONVERGENCE.md`](../HGML_CONVERGENCE.md) |
| "como escrever um exemplo de conformidade?" | [`conformance/README.md`](../../conformance/README.md) |
| "como escrevo Glyph?" | a skill em [`.claude/skills/glyph-markup/`](../../.claude/skills/glyph-markup/) — gerada, e provada contra o motor |

## Vocabulário do projeto

Em [`GLOSSARY.md`](../GLOSSARY.md) §8: quem decide (Regente, Autor da Ordem,
ADR, DC), como o trabalho se ordena (EMS, ORD, val, bank, o retorno, handoff,
intake), o app Rust (motor, visual, Glyph Explorer, oráculo) e os nomes que o
Regente ratificou (template, mould, sample, Order Matrix, snippet, layout).
