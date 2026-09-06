# Decisões — quem decidiu, e por quê

> Uma decisão sem razão registrada volta a ser discutida. Uma decisão sem autor
> registrado é re-decidida por quem não tinha autoridade.
>
> **Só o Regente decide.** Um agente pode medir, propor e recusar — nunca
> ratificar norma que ele próprio escreveu.

## Formato

| data | decisão | quem | razão |
|---|---|---|---|

---

## 2026-09-06

| decisão | razão |
|---|---|
| **A prosa declara o estado, nunca a correção** | *"você adiciona um 'não é mais A, agora é B', quando na verdade o texto que dizia 'isto é A' deve simplesmente tornar-se 'isto é B' — para não acumular micro-correções e gerar resíduo, coisa que o modelo vai inferir e descartar por não auxiliar no estado final da resposta, que é o contexto em si"* |
| **A skill vive em `.claude/skills/glyph-markup/`** | a pasta que o harness lê e a pasta que se publica passam a ser uma só. A causa-raiz mais repetida deste repositório é uma decisão que não chegou às outras cópias, e a skill instalada foi onde ela custou mais caro |
| **`XML_REFERENCE.md` ganha portão de versão** | as tabelas eram provadas pela suíte e o `engine="…"` dentro dos exemplos não era. Ficou em `2.4.5.01` por duas releases, no único lugar de onde se copia |
| **O ponto na frente do nome marca caminho de baixo nível** | lido pelo harness, não por quem abre o repositório para ver o que o projeto faz. `ORDERS/` → `.orders/` e `history/` → `.history/`. A raiz fica com as portas de entrada |
| **`.orders` é eixo próprio**, não cabe em `.plan` nem em `.decisions` | os dois teriam de quebrar a própria regra: `.plan` apaga o que fecha, e uma Ordem fechada é o contrato do que foi entregue; `.decisions` é append-only sem estado, e exatamente uma Ordem fica aberta por vez |
| **`.history` não é eixo** | eixo responde a uma pergunta de quem retoma o trabalho; o sótão não responde a nenhuma. Existe para que remover não seja apagar |
| **`GLOSSARY.md` §6 e `XML_REFERENCE.md` §9 vão para o sótão** | eram 138 linhas narrando o que foi fechado, dentro das duas referências que a skill carrega inteiras a cada sessão — §6 sozinho era 20% do glossário. A numeração `§6.x` foi mantida no sótão, então os apontadores do motor resolvem |
| **Snapshot regenerado**: 102 hashes de AST | a `note` de `req-deny` em `rules.json` narrava a própria correção e viaja no envelope de toda projeção. Reescrita para declarar o estado; o snapshot moveu por **decisão**, não para ficar verde. `xml` e `hgml` não se moveram |

## 2026-09-05

| decisão | razão |
|---|---|
| **`,` carrega ordem.** `GLOSSARY.md` §0.1 perdeu *"sem ordem entre eles"* | *"antigamente eu dizia que não havia diferença na ordem. isso se provou ineficaz."* A razão generaliza: **o que se faz é declarado antes do sujeito** — *red ball*, *thin air*. Então `[simp'X'],[core]` é "simplifique X e trate como núcleo" e `[core],[simp'X']` é "em núcleo, simplifique X" |
| **`<holds>` ganha elemento próprio**, não atributo nem reuso de `<chain>` | cadeia significa "aplicados ao mesmo operando"; conjunção significa "valem juntos". Fundir as duas seria o defeito sendo consertado, por outra porta |
| **O modelo semântico inteiro entra** — nome ligado a valor, não só o papel | *"Sim, e também ligar nome a valor"* |
| **A `<section>` de cabeçalho é irmã do `<schema/>`** | *"reutilizar algo já construído para implementar coisa nova é a base da evolução Darwiniana"* |
| **Servir o app é o futuro; abrir custa 1 clique, no máximo 2** | *"se uma evolução de arquitetura depende de servir o app, é o futuro - sem menos"* |
| **Sem worktrees.** Trabalhar direto no repositório | pedido explícito |
| **"Autor da Ordem"** é quem escreve a fonte | o motor existe para trocar a inferência dele por re-ferência |
| **`.guidelines` guarda atalhos de pensamento**, em seis eixos | reduzir síntese conforme a carga do projeto cresce; ao retomar, decifrar só o passo anterior, o atual e o próximo |

## Anteriores, ainda em vigor

| decisão | razão |
|---|---|
| **`[res]` é checkpoint nomeado**, não rebobinagem | rebobinar exigiria o documento carregar histórico de estados aplicados — isso é estado e tempo, e acabaria com "declarado, nunca aplicado" |
| **A parte legível é o `.pgml`, não o XML** | *"análise humana de xml é cirurgia de código"* |
| **`glyph-package` é raiz única**, sem forma condicional | um consumidor não pode ter de ramificar na forma do documento antes de conseguir lê-lo |
| **`<invoke>` significa *função*** para o modelo que recebe o documento | um comando é uma função; o documento declara a leitura dela e não a executa |
| **Zero dependências**, e nunca haverá | é propriedade do repositório, não acidente |
| **O golden deriva da especificação**, nunca de uma implementação | lock T5 |

## Decisões que um agente tomou e o Regente ainda não ratificou

- [`PROMOTION_BOUNDARY.md`](../PROMOTION_BOUNDARY.md) §5 está **vazia**. Até ser
  assinada, §2 é recomendação tirada de medição — **não é norma**, e nada pode
  citá-la como vinculante.
