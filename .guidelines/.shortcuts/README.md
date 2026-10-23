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
| suíte | `npm run check` — verde, 34 baldes, 115 fontes declaradas no snapshot, uma com caracteres fora do BMP; `npm run check:rust` escreve o oráculo no commit sob teste e compila e testa `rust/` |
| EMS-001 | fechadas da `ORD-0001` à `ORD-0012`, cada uma com o commit e o digest no [registro da série](../.orders/EMS-001/README.md). A fila para na `ORD-0013`, o instalador, que pede uma máquina Windows limpa e o Regente |
| último marco | os caminhos virtuais (2026-10-23): `glyph-vpath` resolve `arquivo#seletor`, ou um `NodeID` que sobrevive a mover, renomear a chave, o bloco, o arquivo ou o cabeçalho sobre o mesmo corpo, para uma fatia exata, com offsets — e o que a identidade não segue, o cabeçalho renomeado com o corpo mudado, volta pelo conteúdo, como *index miss* —, sobre um índice de `.guidelines/` que o `npm run check` mantém honesto, e o `README.md` fica defasado quando as flags da CLI mudam sem ele (`EMS-002/ORD-0001` a `ORD-0004`). Antes disso: o Glyph responde em Rust (2026-09-26): o app, atrás de `?engine=relay`, dá pelo motor Rust os mesmos bytes que pelo JS nas 114 fontes, em todo painel (`ORD-0011`), e o binário `glyph` responde as flags do `glyph-cli.js` (`ORD-0012`). Antes disso: o layout das séries e as `ORD-0001` a `ORD-0010`, na nuvem (2026-09-25); o trabalho de 2026-09-24, com as stores como objeto de contexto, o oráculo das 114 fontes, o workspace `rust/`, os nomes ratificados e o plugin; o núcleo em treze módulos |
| EMS-002 | aberta em 2026-10-23, o Glyph 100% em Rust ([registro da série](../.orders/EMS-002/README.md)): da `ORD-0001` à `ORD-0013` fechadas — `glyph-vpath`, o `NodeID`, o índice de recuperação, a manutenção de ordem, a fonte declarada fora do BMP, as regras compiladas fora da store, o `glyph-json`, o registro ao lado do contexto, o `--zip`, o `classify` pela página, os stores de cada caso no snapshot, a régua das crates e o Rust que deixa de refazer a cada chamada o que o JS faz uma vez; o `.plan` §0 está construído. Nenhuma Ordem aberta |
| próximo | as decididas no [`.plan`](../.plan/README.md) §5 esperam o Regente: as que movem o emitido, a resposta sobre a versão; os três resíduos dos defeitos antigos (O4, `.plan` §3), qual resposta é a certa. Nenhuma livre. A EMS-001 espera no portão da `ORD-0013` |

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
| "qual trecho de qual arquivo?" | `npm run vpath -- resolve 'arquivo#seletor' --text` (ou um `NodeID`, `n42`), `npm run vpath -- up` para os pais, `before`, `above` e `between` para a ordem, `npm run vpath -- list arquivo` para os seletores, e `npm run vpath -- misses` para as falhas do índice — o índice está em `.virtual/` |
| "o que essa notação significa?" | [`GLOSSARY.md`](../GLOSSARY.md) §0.1, §0.3 |
| "o documento emitido pode fazer isso?" | [`PACKAGE_TARGET.md`](../PACKAGE_TARGET.md) |
| "isto é domínio ou síntese?" | [`PROMOTION_BOUNDARY.md`](../PROMOTION_BOUNDARY.md) §2 |
| "o que o motor promete e não cumpre?" | [`.orders/INTAKE-VARIABLES.md`](../.orders/INTAKE-VARIABLES.md) |
| "o que o estudo de setembro mediu e decidiu?" | [`.orders/INTAKE-FIELD-2026-09.md`](../.orders/INTAKE-FIELD-2026-09.md) §5 aponta os outros sete |
| "Rust?" | [`.orders/INTAKE-RUST.md`](../.orders/INTAKE-RUST.md) — os dois lados, pesados; o Regente decidiu migrar ([`.decisions/`](../.decisions/README.md), 2026-09-24) |
| "a escada de migração perde alguma coisa?" | [`.orders/INTAKE-RUST-LADDER.md`](../.orders/INTAKE-RUST-LADDER.md) — a escada medida contra o motor, e o que o vendoring compra (§9); §8 é o que espera o Regente |
| "o que se constrói em Rust, e em que ordem?" | [`.plan/`](../.plan/README.md) §5, as séries EMS-001 e [EMS-002](../.orders/EMS-002/README.md) |
| "duas fontes, uma intenção?" | [`HGML_CONVERGENCE.md`](../HGML_CONVERGENCE.md) |
| "como escrever um exemplo de conformidade?" | [`conformance/README.md`](../../conformance/README.md) |
| "como escrevo Glyph?" | a skill em [`.claude/skills/glyph-markup/`](../../.claude/skills/glyph-markup/) — gerada, e provada contra o motor |

## Os outros documentos

| documento | o que guarda |
|---|---|
| [`BUNDLE_TARGET.md`](../BUNDLE_TARGET.md) | o que é saída de nível de produção aqui |
| [`OPERATOR_TARGET.md`](../OPERATOR_TARGET.md) | `-` e `,` da árvore até o XML e de volta |
| [`SIGNATURES.md`](../SIGNATURES.md) | assinaturas e aridades, tabela normativa |
| [`HGML_PLAN.md`](../HGML_PLAN.md) | o `.hgml`: plano e estado |
| [`FORMULA_REVIEW.md`](../FORMULA_REVIEW.md) | o que mudou entre as duas passadas das fórmulas |
| [`PROMOTION_MEASUREMENT.md`](../PROMOTION_MEASUREMENT.md) | a medição de onde o `PROMOTION_BOUNDARY.md` saiu |
| [`DMHP_IMPORTS.md`](../DMHP_IMPORTS.md) | o que vale trazer do DMHP, e o que não |
| [`FUSIONS_WORKSHEET.md`](../FUSIONS_WORKSHEET.md) | as fusões da v1.7, documento histórico |
| [`E0b-ARCHITECT-RETURN.md`](../.orders/E0b-ARCHITECT-RETURN.md), [`E2-PLAN.md`](../.orders/E2-PLAN.md) | o retorno do arquiteto e o plano de rederivação da ordem de agosto, `ORD-2026-08-30-01` |

## Vocabulário do projeto

Em [`GLOSSARY.md`](../GLOSSARY.md) §8: quem decide (Regente, Autor da Ordem,
ADR, DC), como o trabalho se ordena (EMS, ORD, val, bank, o retorno, handoff,
intake), o app Rust (motor, visual, Glyph Explorer, oráculo) e os nomes que o
Regente ratificou (template, mould, sample, Order Matrix, snippet, layout).
