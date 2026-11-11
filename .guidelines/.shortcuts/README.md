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
| versão | **4.7.10.08** |
| suíte | `npm run check` — verde, 39 baldes, 119 fontes declaradas no snapshot, uma com caracteres fora do BMP; `npm run check:rust` escreve o oráculo no commit sob teste e compila e testa `rust/` |
| EMS-001 | fechada em 2026-11-07: da `ORD-0001` à `ORD-0014`, cada uma com o commit e o digest no [registro da série](../.orders/EMS-001/README.md); a `ORD-0014`, a janela própria, fechou com o val do Regente, e a medição está no [retorno](../.orders/EMS-001/RETURN.md) |
| último marco | a reestruturação (2026-11-11): os 21 arquivos da linguagem, as 13 normas e as 8 stores, moram em `.sources/`, o eixo dos fatos, e um caminho antigo ainda resolve pelo índice (`EMS-002/ORD-0034`). Antes disso: o `[part]` restaurado (2026-11-11): `PT` é o `struct` que fatia um bloco como um bloco fatia uma seção, o primeiro literal é o nome dele, cada literal seguinte um nível do rótulo, e a parte que nenhum `[block` contém pergunta qual bloco ela fatia, nos dois motores (`EMS-002/ORD-0033`). Antes disso: a janela própria (2026-11-07): o Explorer instalado abre numa janela do Edge sem barra de endereço e sem console, e o motor para com a última janela (`EMS-001/ORD-0014`), o que fecha a EMS-001. Antes disso: os caminhos virtuais (2026-10-23): `glyph-vpath` resolve `arquivo#seletor`, ou um `NodeID` que sobrevive a mover, renomear a chave, o bloco, o arquivo ou o cabeçalho sobre o mesmo corpo, para uma fatia exata, com offsets — e o que a identidade não segue, o cabeçalho renomeado com o corpo mudado, volta pelo conteúdo, como *index miss* —, sobre um índice de `.guidelines/` que o `npm run check` mantém honesto, e o `README.md` fica defasado quando as flags da CLI mudam sem ele (`EMS-002/ORD-0001` a `ORD-0004`). Antes disso: o Glyph responde em Rust (2026-09-26): o app, atrás de `?engine=relay`, dá pelo motor Rust os mesmos bytes que pelo JS nas 114 fontes, em todo painel (`ORD-0011`), e o binário `glyph` responde as flags do `glyph-cli.js` (`ORD-0012`). Antes disso: o layout das séries e as `ORD-0001` a `ORD-0010`, na nuvem (2026-09-25); o trabalho de 2026-09-24, com as stores como objeto de contexto, o oráculo das 114 fontes, o workspace `rust/`, os nomes ratificados e o plugin; o núcleo em treze módulos |
| EMS-002 | aberta em 2026-10-23, o Glyph 100% em Rust ([registro da série](../.orders/EMS-002/README.md)): da `ORD-0001` à `ORD-0034` fechadas — `glyph-vpath`, o `NodeID`, o índice de recuperação, a manutenção de ordem, a fonte declarada fora do BMP, as regras compiladas fora da store, o `glyph-json`, o registro ao lado do contexto, o `--zip`, o `classify` pela página, os stores de cada caso no snapshot, a régua das crates o Rust que deixa de refazer a cada chamada o que o JS faz uma vez as renomeações (O8, O9, O10) a sintaxe de referência `[ref'nome']`, o alarme de inferência profunda, `<part n>` e `<if cond>`, o blend só no mesmo alvo, os três resíduos de O4 no Rust, e a página sem store próprio atrás da relay — as tabelas do motor uma vez, ao carregar, e só os templates que diferem em cada requisição, nomeados pelo digest; e o `[part]` restaurado, o `struct` que fatia um bloco; e a reestruturação, a linguagem em `.sources/`; o `.plan` §0 está construído. Nenhuma Ordem está aberta na série |
| próximo | a trilha até o Explorer final, no [`.plan`](../.plan/README.md) §5, e, enquanto um portão espera, a fila de antes do portão, no mesmo §5. O que resta esperando o Regente está em [`.plan`](../.plan/README.md), *Aberto, esperando o Regente* |
| última rodada do Regente | **2026-11-11**: as cinco respostas do `[part]`, a versão final do Explorer como a superfície de EMS mais a saída do JS, a página incluída, as seis colisões da reestruturação com o Orbital clássico como alvo, as stores numa atualização, e o conjunto de checagens de saúde ratificado — em [`.decisions/`](../.decisions/README.md) |

## Os sete eixos

| eixo | o que guarda |
|---|---|
| [`.sources/`](../.sources/) | os fatos: a linguagem, as 13 normas e as 8 stores, e as referências externas de fato usadas, com o que cada uma **decidiu** |
| [`.plan/`](../.plan/) | o que vem a seguir, e o que ficou para depois |
| [`.decisions/`](../.decisions/) | decisões tomadas, quem decidiu, e a razão |
| [`.constraints/`](../.constraints/) | o que o projeto **se proíbe** de fazer |
| [`.changelog/`](../.changelog/) | o que mudou, e como o número de versão se move |
| [`.orders/`](../.orders/) | as Ordens — o contrato do que foi entregue, exatamente uma aberta por vez, em séries `EMS-###/ORD-####/` — e os intakes que as alimentam |
| `.shortcuts/` | este arquivo; [`.virtual/`](.virtual/README.md), a pasta que o agente lê primeiro, e o que cada arquivo dela guarda; [`.virtual/ongoing.json`](.virtual/ongoing.json), o registro de trabalho dos agentes: o que está em andamento, em espera ou só na fila; e [`.virtual/index.json`](.virtual/index.json), o índice dos caminhos virtuais. `npm run vpath -- resolve '<arquivo>#<seletor>'` devolve uma fatia com o endereço e os offsets dela, e `npm run vpath -- list <arquivo>` mostra os seletores de um arquivo |

## O mapa do motor, em cinco linhas

1. **`scripts/glyph-parser.js` é a face pública do núcleo**, que vive em `scripts/core/` — treze módulos, direção estrita `util ← vocabulary ← stores ← lexer ← logic ← {templates, rules} ← parser ← emit-xml ← {emit-ast, burn}`, mais `inverse`; `node scripts/seam-graph.js` mostra. Tudo mais consome a face.
2. A fonte `.pgml` vira **AST** (fonte de verdade), e dela saem três projeções:
   `glyph-package` (XML), o envelope `GlyphAST`, e a queima `.hgml`.
3. **O `.hgml` é derivado da árvore, não anterior a ela** — e por isso não pode
   ser a fonte de verdade. Medido em [`HGML_CONVERGENCE.md`](../.sources/HGML_CONVERGENCE.md) §6.
4. Casa vazia **não é erro**: vira `<needs>`. Severidades: `fix` recusa,
   `ask` pergunta, `note` observa.
5. Toda mudança de formato passa por [`PACKAGE_TARGET.md`](../.sources/PACKAGE_TARGET.md)
   e é medida contra `conformance/`.

## Os documentos que mais se consulta

| quando a pergunta é | abra |
|---|---|
| "que elemento esse comando emite?" | [`XML_REFERENCE.md`](../.sources/XML_REFERENCE.md) |
| "qual trecho de qual arquivo?" | `npm run vpath -- resolve 'arquivo#seletor' --text` (ou um `NodeID`, `n42`), `npm run vpath -- up` para os pais, `before`, `above` e `between` para a ordem, `npm run vpath -- list arquivo` para os seletores, e `npm run vpath -- misses` para as falhas do índice — o índice está em `.virtual/` |
| "o que essa notação significa?" | [`GLOSSARY.md`](../.sources/GLOSSARY.md) §0.1, §0.3 |
| "o documento emitido pode fazer isso?" | [`PACKAGE_TARGET.md`](../.sources/PACKAGE_TARGET.md) |
| "isto é domínio ou síntese?" | [`PROMOTION_BOUNDARY.md`](../.sources/PROMOTION_BOUNDARY.md) §2 |
| "o que o motor promete e não cumpre?" | [`.orders/INTAKE-VARIABLES.md`](../.orders/INTAKE-VARIABLES.md) |
| "o que o estudo de setembro mediu e decidiu?" | [`.orders/INTAKE-FIELD-2026-09.md`](../.orders/INTAKE-FIELD-2026-09.md) §5 aponta os outros sete |
| "Rust?" | [`.orders/INTAKE-RUST.md`](../.orders/INTAKE-RUST.md) — os dois lados, pesados; o Regente decidiu migrar ([`.decisions/`](../.decisions/README.md), 2026-09-24) |
| "a escada de migração perde alguma coisa?" | [`.orders/INTAKE-RUST-LADDER.md`](../.orders/INTAKE-RUST-LADDER.md) — a escada medida contra o motor, e o que o vendoring compra (§9); §8 é o que espera o Regente |
| "o que se constrói em Rust, e em que ordem?" | [`.plan/`](../.plan/README.md) §5, as séries EMS-001 e [EMS-002](../.orders/EMS-002/README.md) |
| "duas fontes, uma intenção?" | [`HGML_CONVERGENCE.md`](../.sources/HGML_CONVERGENCE.md) |
| "como escrever um exemplo de conformidade?" | [`conformance/README.md`](../../conformance/README.md) |
| "como escrevo Glyph?" | a skill em [`.claude/skills/glyph-markup/`](../../.claude/skills/glyph-markup/) — gerada, e provada contra o motor |

## Os outros documentos

| documento | o que guarda |
|---|---|
| [`BUNDLE_TARGET.md`](../.sources/BUNDLE_TARGET.md) | o que é saída de nível de produção aqui |
| [`OPERATOR_TARGET.md`](../.sources/OPERATOR_TARGET.md) | `-` e `,` da árvore até o XML e de volta |
| [`SIGNATURES.md`](../.sources/SIGNATURES.md) | assinaturas e aridades, tabela normativa |
| [`HGML_PLAN.md`](../.sources/HGML_PLAN.md) | o `.hgml`: plano e estado |
| [`FORMULA_REVIEW.md`](../.sources/FORMULA_REVIEW.md) | o que mudou entre as duas passadas das fórmulas |
| [`PROMOTION_MEASUREMENT.md`](../.sources/PROMOTION_MEASUREMENT.md) | a medição de onde o `PROMOTION_BOUNDARY.md` saiu |
| [`DMHP_IMPORTS.md`](../.sources/DMHP_IMPORTS.md) | o que vale trazer do DMHP, e o que não |
| [`FUSIONS_WORKSHEET.md`](../.sources/FUSIONS_WORKSHEET.md) | as fusões da v1.7, documento histórico |
| [`E0b-ARCHITECT-RETURN.md`](../.orders/E0b-ARCHITECT-RETURN.md), [`E2-PLAN.md`](../.orders/E2-PLAN.md) | o retorno do arquiteto e o plano de rederivação da ordem de agosto, `ORD-2026-08-30-01` |
| [`.orders/INTAKE-VSCODE-AUTHORING.md`](../.orders/INTAKE-VSCODE-AUTHORING.md) | escopo e estado da extensão VS Code para PGML/HGML |

## Vocabulário do projeto

Em [`GLOSSARY.md`](../.sources/GLOSSARY.md) §8: quem decide (Regente, Autor da Ordem,
ADR, DC), como o trabalho se ordena (EMS, ORD, val, bank, o retorno, handoff,
intake), o app Rust (motor, visual, Glyph Explorer, oráculo) e os nomes que o
Regente ratificou (template, mould, sample, Order Matrix, snippet, layout).
