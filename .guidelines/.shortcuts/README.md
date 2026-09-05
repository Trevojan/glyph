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
| versão | **3.4.7.05** |
| suíte | `npm run check` — verde, ~250 asserções em 25 baldes |
| último marco | grafo de nomes: `binds` / `ref` / `role`, cerca `[raw]`, `<holds>` |
| próximo | `.plan/` |

## Os seis eixos

| eixo | o que guarda |
|---|---|
| [`.sources/`](../.sources/) | referências externas de fato usadas, e o que cada uma **decidiu** |
| [`.plan/`](../.plan/) | o que vem a seguir, e o que ficou para depois |
| [`.decisions/`](../.decisions/) | decisões tomadas, quem decidiu, e a razão |
| [`.constraints/`](../.constraints/) | o que o projeto **se proíbe** de fazer |
| [`.changelog/`](../.changelog/) | o que mudou, e como o número de versão se move |
| `.shortcuts/` | este arquivo |

## O mapa do motor, em cinco linhas

1. **`scripts/glyph-parser.js` é o núcleo único.** Tudo mais consome.
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
| "o que o motor promete e não cumpre?" | [`ORDERS/INTAKE-VARIABLES.md`](../ORDERS/INTAKE-VARIABLES.md) |
| "duas fontes, uma intenção?" | [`HGML_CONVERGENCE.md`](../HGML_CONVERGENCE.md) |
| "como escrever um exemplo de conformidade?" | [`conformance/README.md`](../../conformance/README.md) |

## Vocabulário do projeto

- **Regente** — quem decide.
- **Autor da Ordem** — quem escreve a fonte `.pgml`. O motor existe para trocar
  a **inferência** dele por **re-ferência**.
- **queima** — o `.hgml`, redução a hieróglifos puros.
- **domínio evita síntese** — o que couber em código, esquema ou tabela nunca
  deve ser re-inferido.
