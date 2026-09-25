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
| versão | **3.5.8.06** |
| suíte | `npm run check` — verde, 33 baldes, 114 fontes declaradas no snapshot; `npm run check:rust` compila e testa `rust/` |
| EMS-001 | fechada: `ORD-0001`, o oráculo congelado, em `030ed76`, a tag `conformance-v0`, digest `c00119e0…d828`. Aberta: nenhuma; a próxima é a `ORD-0002`. O registro é o [README da série](../.orders/EMS-001/README.md) |
| último marco | o layout das séries existe (2026-09-25, `0588ada` em diante): a spec da EMS-001 mora em [`.orders/EMS-001/`](../.orders/EMS-001/README.md), o `--bundle` escreve a ORD como a pasta `ORD-####/` numerada pela série, e o plugin a acha por `EMS-###/ORD-####`. Antes disso, o trabalho de 2026-09-24, `82befb4` a `4a907e3`: as stores viajam como um objeto de contexto (`createContext`), `--export-oracle` escreve o oráculo das 114 fontes, o workspace Rust existe em `rust/` com 20 crates presos às costuras do núcleo por `crate-graph.js`, os nomes ratificados (`mould`, `sample`, `Order Matrix`) e o motor como plugin de comandos de barra. Antes disso: o núcleo em treze módulos, `H-09` fechou pelo kit de cliente, `CRIT` soletra o §0.3, `REQ`/`MAND` com fronteira |
| próximo | a série **EMS-001** ([`.plan/`](../.plan/README.md) §5): um app Rust pequeno que come o território do JS, em 14 ORDs numa fila. A spec está em [`.orders/EMS-001/EMS-001.pgml`](../.orders/EMS-001/EMS-001.pgml), as razões em [`BRIEFING-2026-09-24.md`](../.orders/BRIEFING-2026-09-24.md). A primeira sessão na nuvem corre a fila, da `ORD-0001` em diante: [`HANDOFF-2026-09-24.pgml`](../.orders/HANDOFF-2026-09-24.pgml), com o retorno em [`EMS-001/RETURN.md`](../.orders/EMS-001/RETURN.md) e a Ordem aberta em [`EMS-001/README.md`](../.orders/EMS-001/README.md) |

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

- **Regente** — quem decide.
- **Autor da Ordem** — quem escreve a fonte `.pgml`. O motor existe para trocar
  a **inferência** dele por **re-ferência**.
- **queima** — o `.hgml`, redução a hieróglifos puros.
- **domínio evita síntese** — o que couber em código, esquema ou tabela nunca
  deve ser re-inferido.
