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
| `--bundle` lê o ID datado como número | o próximo número é o maior `^ORD-(d{4})` do destino, mais um, e `ORD-2026-08-30-01` casa como 2026: emitida na `.orders/` de hoje, a próxima Ordem sai `ORD-2027`. Um rascunho `ORD-####.pgml` deixado no destino também conta. A série (§6) dá a cada ORD uma pasta que começa vazia |

### 4. `ORD-xxxxx` como pacote de quatro formatos — só na CLI

`node scripts/glyph-cli.js --file ordem.pgml --bundle` emite os quatro formatos
e o manifesto (`order, engine, emitted, files, source, diagnostics`). O botão
`baixar` do app emite **só a aba visível**, um arquivo: o emissor de bundle
existe e o app ainda não o chama.

### 5. O Glyph em Rust — a série EMS-001

Um app Rust pequeno que come o território do JS, uma peça verificável por vez.
A spec da série está em [`.orders/ORD-0012.pgml`](../.orders/ORD-0012.pgml) (o
caminho de rascunho, até o layout do §6 existir), e as razões em
[`BRIEFING-2026-09-24.md`](../.orders/BRIEFING-2026-09-24.md). São 14 ORDs numa
fila, do oráculo congelado (`ORD-0001`) à janela própria (`ORD-0014`), cada uma
presa ao oráculo byte a byte.

O portão da série espera o Regente: o destino da `ORD-0011`, a assinatura do
que a spec revoga, e o layout do §6. Entre o que ela propõe revogar está a
escada como ordem de trabalho: [`ladder.toml`](ladder.toml) fica como o registro
da auditoria, e `node scripts/ladder.js --check` segue no `npm run check`.

### 6. As Ordens em séries — `.orders/EMS-###/ORD-####/`

Decidido pelo Regente ([`.decisions/`](../.decisions/README.md), 2026-09-24),
ainda não construído. Uma EMS é uma pasta com a própria spec, que conversa com as
Guidelines: restrições, contadores, exceções, as ADR e DC que ela modifica, e
como seguir depois que fecha. Uma ORD é uma pasta dentro dela com o pacote; a
contagem reinicia em cada série. Hoje o `--bundle` escreve um `ORD-####.zip`
chapado na `.orders/`, e o plugin acha a Ordem pelo número solto: os dois
precisam aprender a série.

## Aberto, esperando o Regente

| | |
|---|---|
| **estudo de setembro** | oito intakes em [`.orders/`](../.orders/): `INTAKE-VIRTUAL-PATH` (mini-repo, medido: o custo de round-trip é o tamanho de `glyph-parser.js`), `INTAKE-ORDER-COHERENCE` (`relates[]`, B antes de A), `INTAKE-BURN-INVARIANCE` (fechado), `INTAKE-FORMAL-ANALYSIS`, `INTAKE-PARSER-SPLIT` (o corte, feito: treze módulos), `INTAKE-RUST` (steelman e defeater; o Regente decidiu migrar), `INTAKE-RUST-LADDER` (a escada auditada; §8 são as perguntas O1–O6), `INTAKE-FIELD-2026-09` (o kit de cliente; `H-09` fechou por ele). Pendentes do Regente: o `sameTarget` do blend que não confere o alvo; o `--check` do grafo de links |
| **`ORD-0011`** | emitida e nunca fechada; fechar, versionar ou estacionar. Enquanto está aberta, nenhuma outra Ordem sai, e o [`.orders/`](../.orders/) não tem registro de qual está aberta |
| **EMS-001** | assinar o que a spec revoga, e a execução assíncrona que a seção `queue` propõe: medida, economiza no máximo 4 de 14 turnos e esbarra em três restrições |
| **O4, O5, O7–O10** | [`BRIEFING-2026-09-24.md`](../.orders/BRIEFING-2026-09-24.md) §8, as que esperam sem pressa: os defeitos do §3 acima, o snapshot e o `opts` de cada caso, o limiar de profundidade, e as renomeações que movem o emitido |
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
