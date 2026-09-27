# Plano — o que vem a seguir

> Só o que está **aberto**. O que fechou sai daqui e vira linha no
> [`.changelog/`](../.changelog/). Um plano que guarda o que já foi feito deixa
> de ser plano e vira relatório.

## Autorizado pelo Regente, ainda não construído

### 0. Caminhos virtuais — `.guidelines/.shortcuts/.virtual/` — **decidido, primeiro da fila**

> *"quero que seja feito um sistema que implemente `.guidelines/.shortcuts/.virtual/`
> e defina os caminhos virtuais com offsets e tudo o mais […] a síntese deve
> diminuir."* — e, em 2026-09-26: *"ponha no topo da lista. é uma mão na roda bem
> otimizada para o Harness."*

Um caminho virtual é `[arquivo][delimitador][seletor]` e resolve para uma fatia
exata, com offsets. **O índice guarda posições semânticas em estruturas
ordenadas, não textos**: a identidade de um trecho é estrutural, e sobrevive
quando o trecho muda de lugar. As fontes: [`VIRTUAL_PATHS.md`](../.sources/VIRTUAL_PATHS.md),
a conversa que desenhou o endereçamento e o índice,
[`VIRTUAL_PATHS_CONVERSATION.md`](../.sources/VIRTUAL_PATHS_CONVERSATION.md), e a
que desenhou a identidade, a ordem e a recuperação,
[`.scope/do-gepeto.md`](../../.scope/do-gepeto.md) (§4, §5, §8, §14 e §15).

O que o motor passa a fazer, em sete camadas:

1. **árvore por formato**, com despacho pela extensão, e o resto é seletor:
   `.md#slug`, `.json` por JSON Pointer (RFC 6901, um nó só), `.xml` por caminho
   de elementos, e código por `@block:nome` … `@endblock:nome`, sem aninhamento,
   com qualquer prefixo de comentário;
2. **identidade estável**: cada nó estrutural recebe um `NodeID` persistente, com
   `parent`, `prev`, `next`, `depth` e o intervalo `[início, fim)` — metadado de
   identidade, nunca o conteúdo; um trecho movido de lugar é o mesmo nó;
3. **manutenção de ordem**: `before(a, b)` responde sob inserção, movimento e
   remoção (Dietz–Sleator), e "o que vem acima de X" vira consulta de ordem e de
   intervalo, não busca textual;
4. **mapa de offsets**: `NodeID → [início, fim)`, e a extração devolve offsets,
   porque a âncora também é coordenada de escrita;
5. **impressões digitais**: o hash de cada fatia — a fatia mudou e o documento
   não, o documento está defasado;
6. **grafo de dependência**: **o documento declara as próprias fontes**
   (`sources:` no frontmatter), o índice código→documento sai por inversão
   mecânica, e a invalidação se propaga por ele; a Ordem carrega só a projeção
   do que toca;
7. **índice de recuperação**, só quando a identidade estrutural falhar: busca por
   q-grama ou FM-index, e cada uso fica registrado como *index miss*.

O que vale em todas as camadas:

- **cardinalidade 1**: um seletor que resolve para zero ou para vários nós é erro,
  nunca fatia vazia;
- **o índice é JSON**, estado durável que o motor escreve e um resolvedor sem
  julgamento lê;
- **cobertura fechada**: todo arquivo de `.guidelines/` aparece no índice, e toda
  entrada resolve para conteúdo não vazio;
- **a complexidade-alvo**: `NodeID → nó` e `before(a, b)` em O(1), predecessor em
  O(log n), extração em O(log n + L) para L bytes devolvidos, e atualização em
  O(k log n) para k nós afetados pela edição, nunca pelo tamanho do repositório.

Antes do código, medido sobre o histórico do git, com os limiares declarados
antes de rodar: a taxa de defasagem, a localidade das edições em `.md` e a
co-mudança código↔documento, que também semeia o `sources:`. A primeira ORD
nasce na série seguinte à EMS-001, ou avulsa, quando o Regente chamar.

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

### 3. Quatro defeitos, medidos e não consertados

| | medido |
|---|---|
| `;;` **migra** | `[nt'a'];;[nt'b']` volta como `[nt'a'][nt'b'];;` — a quebra sai de entre os blocos e vai para o fim. E some inteira na queima. |
| `;` é **assimétrico entre aspas** | encerra um literal de crase, não encerra um de apóstrofo. As duas formas deveriam ser intercambiáveis. |
| param de template nu vira prosa | `[--germinate a,b]` → `PlaceholderPending` ×2 e os valores caem como `<off>`. Param de template é **sempre literal** — as duas aspas servem, a palavra nua não. |
| o `toXML` do JS **cresce com o quadrado das linhas** | L-03, L-02 e L-01 levam 23 ms, 0,44 s e 6,2 s; 84% do L-02 é a passada estrutural (`packageSpan`, `packageIndent` e o seu `^ +`). O port em Rust lê cada linha uma vez e faz o L-01 em 0,13 s. Fixado por decisão (pergunta 13 do [retorno](../.orders/EMS-001/RETURN.md)): o JS não é consertado, e as fontes longas vão pelo Rust |

### 5. O Glyph em Rust — a série EMS-001

Um app Rust pequeno que come o território do JS, uma peça verificável por vez.
A spec da série está em
[`.orders/EMS-001/EMS-001.pgml`](../.orders/EMS-001/EMS-001.pgml), e as razões em
[`BRIEFING-2026-09-24.md`](../.orders/BRIEFING-2026-09-24.md). São 14 ORDs numa
fila, do oráculo congelado (`ORD-0001`) à janela própria (`ORD-0014`), cada uma
presa ao oráculo byte a byte.

Da `ORD-0001` à `ORD-0012`, fechadas: a nuvem correu da `ORD-0001` à `ORD-0010`,
e esta máquina a `ORD-0011` e a `ORD-0012`; o [registro da
série](../.orders/EMS-001/README.md) guarda o commit e o digest de cada uma. O
app roda no motor Rust atrás de `?engine=relay`, e o binário `glyph` responde as
flags do `glyph-cli.js`. A fila para na `ORD-0013`, o instalador: pede uma
máquina Windows limpa e o Regente, e sob a ADR B leva node ou um segundo
protocolo. O instalador é também o que torna o app **standalone** no sentido do
Regente: o Glyph Explorer mora na máquina de cada usuário, e tudo o que é
pessoal — os templates e os moulds que ele guarda — fica lá, nunca no
repositório público, que entrega só os templates básicos de exemplo. O motor
Rust responde com as stores da máquina do usuário; hoje, atrás de
`?engine=relay`, ele responde só com as do repositório, e os templates que a
página guarda ficam no caminho JS (pergunta 11 do retorno).

**O alvo é o Glyph 100% em Rust** — o motor, o núcleo do app e a skill —, com o
JS saindo peça por peça, cada uma quando o Rust passa o oráculo nela. Até lá o
JS é a referência, e só muda onde o oráculo precisa mudar. A EMS-001 fecha como
está escrita; essa direção abre a EMS-002. O desenho do PIN, do tráfego e da
EMS que o usuário conduz está em
[`INTAKE-PIN-TRAFFIC.md`](../.orders/INTAKE-PIN-TRAFFIC.md), com o que ainda
espera o Regente no §5 dele.

Decidido em 2026-09-27, ainda não construído — cada item uma ORD quando o
Regente chamar, o JS primeiro onde o oráculo muda:

- **uma fonte declarada com caractere fora do BMP** (pergunta 2): o snapshot se
  move por decisão, e `lev` e as projeções seguintes passam a ser provados nela;
- **o cache das regras sai de cima da store** (pergunta 3): o JS guarda as regras
  compiladas fora do objeto, o envelope hashea só a store, os hashes de `ast` se
  movem por decisão, e o `glyph_rules::with_cache` do Rust sai;
- **JSON num crate próprio** (pergunta 4), abaixo de todos, com entrada de oráculo
  no `crate-graph.js`, no lugar do `glyph_util::json` e do `Value` do
  `glyph-stores`;
- **o corpo de um template lê o que o chamador registrou** (pergunta 6): o Rust
  guarda um registro ao lado do contexto, e um corpo que quebra uma regra lê igual
  na CLI e no app pelos dois motores;
- **o zip de uma ORD de série só atrás de uma flag** (pergunta 1): o `--bundle`
  escreve a pasta, e o zip quando pedido;
- **o `classify` pelas tabelas da página** (pergunta 10): atrás de
  `?engine=relay`, uma requisição por chamada, menos o `classify`, que a página
  responde com as tabelas que já carrega — o L-01 deixa de fazer 8 000 idas;
- **o snapshot respeita os stores de cada caso** (O5): os hashes dos casos T se
  movem por decisão, e o `TemplateCycle` entra no oráculo;
- **`<sceptic>`, não `<skeptic>`** (O10): o `SKEP` do `vocabulary.js` passa a
  *Sceptic*, como o glossário já diz; `<skeptic>` e `[skeptic` continuam lidos;
- **o Rust para de refazer a cada chamada o que o JS faz uma vez** (pergunta 12):
  as regras compiladas uma vez por contexto e o `ck` em aritmética inteira, só no
  Rust; o JS não é afinado.

O que a spec revoga está assinado, e entre isso está a escada como
ordem de trabalho: [`ladder.toml`](ladder.toml) fica como o registro da
auditoria, e `node scripts/ladder.js --check` segue no `npm run check`.

## Aberto, esperando o Regente

| | |
|---|---|
| **estudo de setembro** | oito intakes em [`.orders/`](../.orders/): `INTAKE-VIRTUAL-PATH` (mini-repo, medido: o custo de round-trip é o tamanho de `glyph-parser.js`), `INTAKE-ORDER-COHERENCE` (`relates[]`, B antes de A), `INTAKE-BURN-INVARIANCE` (fechado), `INTAKE-FORMAL-ANALYSIS`, `INTAKE-PARSER-SPLIT` (o corte, feito: treze módulos), `INTAKE-RUST` (steelman e defeater; o Regente decidiu migrar), `INTAKE-RUST-LADDER` (a escada auditada; §8 guarda o que espera, O4, O5 e O7 a O10), `INTAKE-FIELD-2026-09` (o kit de cliente; `H-09` fechou por ele). Pendentes do Regente: o `sameTarget` do blend que não confere o alvo; o `--check` do grafo de links |
| **EMS-001** | a execução assíncrona que a seção `queue` da spec propõe: medida, economiza no máximo 4 de 14 turnos e esbarra em três restrições; a série fecha como está escrita, e com o tráfego da [`EMS.config`](../.orders/INTAKE-PIN-TRAFFIC.md) a pergunta passa à EMS-002. As perguntas do [retorno](../.orders/EMS-001/RETURN.md) têm todas resposta |
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
- **A `ORD-0011` chapada, `restructure-glyph-repo`**, estacionada em 2026-09-24 e
  guardada em [`.orders/parked/restructure-glyph-repo/`](../.orders/parked/restructure-glyph-repo/);
  não é a `EMS-001/ORD-0011`. Reestrutura o
  repositório lendo `_ORBITAL`, que só existe nesta máquina, e reabre aqui quando
  o Regente chamar.
- **Escopos aninhados** para variáveis. O escopo é o pacote inteiro, como o
  Regente especificou. Ninguém pediu mais.
