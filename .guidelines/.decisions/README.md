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
