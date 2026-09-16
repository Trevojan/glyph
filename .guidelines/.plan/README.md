# Plano — o que vem a seguir

> Só o que está **aberto**. O que fechou sai daqui e vira linha no
> [`.changelog/`](../.changelog/). Um plano que guarda o que já foi feito deixa
> de ser plano e vira relatório.

## Autorizado pelo Regente, ainda não construído

### 1. `<section>` de cabeçalho, irmã do `<schema/>` — **decidido, faltando fazer**

Toda ligação de variável detectada no corpo deve ser **içada** para um bloco de
cabeçalho, separado das instruções diretas, para que a inferência não precise
varrer os comandos atrás delas.

> *"é uma `<section>` à parte que conversa com o pacote do glifo → afinal, é
> racional que ele realmente seja irmão do `<schema>`. reutilizar algo já
> construído para implementar coisa nova é a base da evolução Darwiniana."*

O material já existe: `binds` marca cada ligação e `ref` resolve os usos no
pacote inteiro, desde `3.4.7.05`. Falta o içamento.

### 2. Gatilhos de re-ferência

Oferecer o comando específico em vez de deixar o Autor da Ordem adivinhar. A
pesquisa que decide o formato está em
[`.sources/COMPILER_LESSONS.md`](../.sources/COMPILER_LESSONS.md) — e ela diz
que o gatilho **não deve explicar**, deve **apontar**.

Decidíveis hoje, sem mecanismo novo:

| detecção | com o que já existe |
|---|---|
| nome ligado e nunca referenciado | subtração entre `binds` e `ref` |
| composto profundo sem operando | `depthOf`; limiar 5 dispara em 4% do corpus |
| conjunção onde sequência era mais provável | `<holds>` distingue as duas desde `3.4.7.05` |

**Antes disso:** `suggest()` acerta **1 de 11** nas palavras que o Autor da Ordem
realmente escreveu (§0 do `COMPILER_LESSONS.md`). Precisa de **filtro
semântico** — categoria, espécie, tabela de composição — não de limiar melhor.

### 3. Três defeitos antigos, medidos e não consertados

| | medido |
|---|---|
| `;;` **migra** | `[nt'a'];;[nt'b']` volta como `[nt'a'][nt'b'];;` — a quebra sai de entre os blocos e vai para o fim. E some inteira na queima. |
| `;` é **assimétrico entre aspas** | encerra um literal de crase, não encerra um de apóstrofo. As duas formas deveriam ser intercambiáveis. |
| param de template nu vira prosa | `[--germinate a,b]` → `PlaceholderPending` ×2 e os valores caem como `<off>`. Param de template é **sempre literal** — as duas aspas servem, a palavra nua não. |

### 4. `ORD-xxxxx` como pacote de quatro formatos — só na CLI

`node scripts/glyph-cli.js --file ordem.pgml --bundle` emite os quatro formatos
e o manifesto (`order, engine, emitted, files, source, diagnostics`). O botão
`baixar` do app emite **só a aba visível**, um arquivo: o emissor de bundle
existe e o app ainda não o chama.

## Aberto, esperando o Regente

| | |
|---|---|
| **estudo de setembro** | oito intakes em [`.orders/`](../.orders/): `INTAKE-VIRTUAL-PATH` (mini-repo, medido: o custo de round-trip é o tamanho de `glyph-parser.js`), `INTAKE-ORDER-COHERENCE` (`relates[]`, B antes de A), `INTAKE-BURN-INVARIANCE` (fechado), `INTAKE-FORMAL-ANALYSIS`, `INTAKE-PARSER-SPLIT` (o corte proposto, doze módulos, folhas primeiro — **próximo passo autorizado**), `INTAKE-RUST` (steelman e defeater; decisão do Regente), `INTAKE-FIELD-2026-09` (o kit de cliente; `H-09` fechou por ele). Pendentes do Regente: um esquema de ID e uma casa para as Ordens (`I_B1`); o `sameTarget` do blend que não confere o alvo; o `--check` do grafo de links |
| **Q14** | o Regente autora o sexto exemplo de conformidade. Base verificada em [`conformance/README.md`](../../conformance/README.md) |
| **Q4** | ratificar [`PROMOTION_BOUNDARY.md`](../PROMOTION_BOUNDARY.md) §5 |
| sintaxe de referência | sem ela, `<needs var>` fora da cerca `[logic]` não tem no que disparar — uma referência não resolvida é indistinguível de prosa |
| filtro / `blend` | `blend` em `rules.json` é o precedente implementado; falta decidir *não-trabalha* contra *não-sabe* |
| alarme de inferência profunda | medido; falta decidir severidade, onde aparece, e se profundidade é o sinal certo |
| duas propostas do rascunho do XML | `[pt'1.1'` → `<part n="1.1">` e `[if'cond'` → `<if cond="…">`, em vez de pôr o valor em `<user-input>`. As duas são **melhores** que o que o motor faz; as duas mudam o entregável e exigem `fromXML()` no mesmo passo. Registro em [`.history/XML_REFERENCE_DRAFT.md`](../.history/XML_REFERENCE_DRAFT.md) |

## Adiado por decisão, não por esquecimento

- **Efeitos** — [`.orders/INTAKE-EFFECTS.md`](../.orders/INTAKE-EFFECTS.md). A
  metade barata (`<effect>` declarativo) espera; a cara (objetos de contexto) é
  segunda ordem.
- **Escopos aninhados** para variáveis. O escopo é o pacote inteiro, como o
  Regente especificou. Ninguém pediu mais.
