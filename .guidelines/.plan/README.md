# Plano — o que vem a seguir

> Só o que está **aberto**. O que fechou sai daqui e vira linha no
> [`.changelog/`](../.changelog/). Um plano que guarda o que já foi feito deixa
> de ser plano e vira relatório.

## Autorizado pelo Regente, ainda não construído

### 0. Caminhos virtuais — `.guidelines/.shortcuts/.virtual/` — **construído, as sete camadas pela EMS-002**

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

Medido antes do código, sobre os 202 commits do histórico, com os limiares
declarados num commit anterior ao script
([`INTAKE-VIRTUAL-PATH.md`](../.orders/INTAKE-VIRTUAL-PATH.md) §18 e §19,
`scripts/measure-coupling.js`): a impressão digital defasada é `fix` no
`npm run check`; a granularidade é o nó; o `sources:` nasce com as duas linhas
propostas fora do `RETURN.md`, que é log; e a primeira ORD chaveia pelo slug,
com o `NodeID`, a manutenção de ordem e o índice de recuperação nas seguintes.

O crate `glyph-vpath` constrói as sete camadas, pelas
[`ORD-0001` a `ORD-0004` da EMS-002](../.orders/EMS-002/README.md): as árvores
por extensão; o índice (`.guidelines/.shortcuts/.virtual/index.json`, JSON e
XML até a profundidade 2), com o `NodeID` de cada nó, o pai dele, os caminhos
antigos como apelidos e as recuperações; o resolvedor; o `sources:` semeado no
`README.md` e no `XML_REFERENCE.md`; e o portão no `npm run check`. A
identidade passa de um build ao seguinte só pela estrutura — o mesmo caminho,
o mesmo texto, o mesmo corpo, o mesmo arquivo renomeado —, como o M5 decidiu
([`INTAKE-VIRTUAL-PATH.md`](../.orders/INTAKE-VIRTUAL-PATH.md) §21); o que ela
não alcança, o cabeçalho renomeado com o corpo mudado, o build recupera pelo
conteúdo, contra o texto antigo do cache ou do git, como o M6 decidiu (§23), e
cada resposta por uma recuperação é uma *index miss* no log ao lado do índice.
A ordem é a do índice, ordenada uma vez na carga: as posições ficam absolutas,
e os rótulos de Dietz–Sleator com offsets relativos não entram, porque
segurariam 42,0 % das linhas que uma edição reescreve, abaixo dos 50 %
declarados (§25); a medida está no script, e vira no dia em que passar deles.

Uma fatia se lê com `npm run vpath -- resolve 'arquivo#seletor' --text`, ou
pelo `NodeID`; `up` dá a cadeia de pais, `before` como um nó está para outro,
`above` o que vem acima dele no arquivo, `between` o que há de um ao outro, e
`misses` as falhas registradas.

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
| composto profundo sem operando | `depthOf`; limiar 5 dispara em 4% do corpus — decidido: `ask`, vira `<needs>` |
| conjunção onde sequência era mais provável | `<holds>` distingue as duas desde `3.4.7.05` |

**Antes disso:** `suggest()` acerta **1 de 11** nas palavras que o Autor da Ordem
realmente escreveu (§0 do `COMPILER_LESSONS.md`). Precisa de **filtro
semântico** — categoria, espécie, tabela de composição — não de limiar melhor.

### 3. Seis defeitos medidos: o que foi consertado nos dois motores, e o que o Rust conserta

| | estado |
|---|---|
| `;;` | consertado nos dois motores em 2026-09-06 (`1342488`): `[nt'a'];;[nt'b']` vai e volta exato, o `<break/>` entre os blocos. Na queima do Rust, `;;` é a linha `;;` entre os blocos desde a `EMS-002/ORD-0019`; a do JS dá a mesma linha em branco para `;;` e `;` até sair, e os testes do oráculo nomeiam a diferença. |
| `;` dentro de literal | consertado nos dois motores em 2026-09-06 (`f6d07ae`): dentro de um literal, só a aspa que o abriu o fecha. No lexer do Rust, só a aspa que abriu um literal o fecha, também na quebra de linha, desde a `EMS-002/ORD-0020`; o do JS encerra o apóstrofo na quebra de linha até sair, e o teste do oráculo nomeia a diferença. |
| param de template nu | o deslize é recusado desde 2026-09-06 (`03aedad`): um parâmetro que não é literal antes de um literal é `fix` `TemplateParamNotLiteral`. **Resta:** a palavra nua sem literal depois (`[--germinate a,b]`) cai como `<off>` com `PlaceholderPending` ×2, e a mensagem chama a palavra nua de `[?`, no JS até sair; no Rust, desde a `EMS-002/ORD-0021`, a palavra nua numa posição de parâmetro dá `fix` `TemplateParamNotLiteral` que a nomeia e mostra a forma entre aspas, a opção (a) do [§3 das perguntas](PERGUNTAS-ABERTAS.md), e os testes do oráculo nomeiam a diferença. |
| humor dentro de um template | `/eth/` cujo comando aberto mais interno é um template: o JS lança `TypeError` (`parser.js:263`, o nó de template não tem lista de humores) até sair; o Rust responde com o documento — o humor colore a seção, primeiro no bloco — desde a `EMS-002/ORD-0023`, e os testes do oráculo nomeiam a diferença com os bytes em `rust/testkit/known/template-moods.json`. |
| o nome de um placeholder **queima como comando** | `` [ph-x`q`] `` queima como `[ph [x[/x] 'q' [/ph]`, e a queima relida dá um `UnknownCommand` por lacuna, então a queima de uma Order Matrix nunca relê limpa. Medido em 2026-11-02 |
| o `toXML` do JS **cresce com o quadrado das linhas** | L-03, L-02 e L-01 levam 23 ms, 0,44 s e 6,2 s; 84% do L-02 é a passada estrutural (`packageSpan`, `packageIndent` e o seu `^ +`). O port em Rust lê cada linha uma vez e faz o L-01 em 0,13 s. Fixado por decisão (pergunta 13 do [retorno](../.orders/EMS-001/RETURN.md)): o JS não é consertado, e as fontes longas vão pelo Rust |

### 5. O Glyph em Rust — a série EMS-001

Um app Rust pequeno que come o território do JS, uma peça verificável por vez.
A spec da série está em
[`.orders/EMS-001/EMS-001.pgml`](../.orders/EMS-001/EMS-001.pgml), e as razões em
[`BRIEFING-2026-09-24.md`](../.orders/BRIEFING-2026-09-24.md). São 14 ORDs numa
fila, do oráculo congelado (`ORD-0001`) à janela própria (`ORD-0014`), cada uma
presa ao oráculo byte a byte.

Da `ORD-0001` à `ORD-0014`, fechadas, e a série com elas: a nuvem correu da
`ORD-0001` à `ORD-0010`, e esta máquina da `ORD-0011` à `ORD-0014`; o [registro da
série](../.orders/EMS-001/README.md) guarda o commit e o digest de cada uma. O
binário `glyph` responde as flags do `glyph-cli.js`, se instala sem crate nenhuma
e serve o app numa origem localhost sem node, com o motor respondendo pelas
stores da máquina; o Regente fez o val na máquina Windows limpa em 2026-10-21. A
`ORD-0014` abre o app numa janela própria pelo `msedge --app`, e ele fez o val dela
em 2026-11-07.
O instalador é o que torna o app **standalone** no sentido do Regente: o Glyph
Explorer mora na máquina de cada usuário, e tudo o que é pessoal — os templates
e os moulds que ele guarda — fica lá, nunca no repositório público, que entrega
só os templates básicos de exemplo. Atrás da relay a página não guarda store
próprio, desde a [`EMS-002/ORD-0032`](../.orders/EMS-002/README.md): as tabelas
vêm do motor uma vez, ao carregar, o `classify` responde delas sem requisição, e
um template que o usuário salva chega ao motor pela **opção c da pergunta 11** do
[retorno](../.orders/EMS-001/RETURN.md) — o motor guarda as stores da máquina, e
uma requisição leva só os templates que diferem, nomeados pelo digest.

**O alvo é o Glyph 100% em Rust** — o motor, o núcleo do app e a skill —, com o
JS saindo peça por peça, cada uma quando o Rust passa o oráculo nela. Até lá o
JS é a referência, e só muda onde o oráculo precisa mudar. A EMS-001 fechou como
está escrita; essa direção é a da EMS-002. O desenho do PIN, do tráfego e da
EMS que o usuário conduz está em
[`INTAKE-PIN-TRAFFIC.md`](../.orders/INTAKE-PIN-TRAFFIC.md), com o que ainda
espera o Regente no §5 dele.

A [`EMS-002/ORD-0033`](../.orders/EMS-002/README.md), o `[part]` restaurado, está
aberta e com o portão respondido em 2026-11-11: o que ela constrói está no
[`INTAKE-PART.md`](../.orders/INTAKE-PART.md) §5. O seletor do PIN vem depois dela,
porque seleciona pelos rótulos do `[part]`.

#### A trilha até o Explorer final

A **versão final do Glyph Explorer** é a superfície de EMS no app instalado mais a
saída do JS, a página incluída (o Regente, 2026-11-11). Os passos 1 a 3 estão na
ordem que ele pôs em 2026-11-07 como a que habilita o Explorer de EMS; do 4 em
diante a ordem é proposta da sessão, pelas dependências, e é dele cortar. Cada
passo abre como Ordem com a proposta medida do intake, e para no portão dele.

| # | a Ordem | depende de | o intake |
|---|---|---|---|
| 0 | o `[part]`, a `ORD-0033` | — | [`INTAKE-PART`](../.orders/INTAKE-PART.md) §5, respondido |
| 1 | o XSD gerado pelo motor e o portão que o confere contra o XML | 0 | a escrever: `INTAKE-XSD.md` (a norma está assinada, 2026-11-07) |
| 2 | a `EMS.json`: a lista de campos, o XSD primeiro, e a configuração dentro do `<glyph-package>` | 1 | a escrever: `INTAKE-EMS-JSON.md`, sobre o [`INTAKE-PIN-TRAFFIC`](../.orders/INTAKE-PIN-TRAFFIC.md) §4 e §5 |
| 3 | a coerência: `[ref'nem']`, `[ref'EMS']`, o `relates[]`, a verificação pela `EMS.json`, a NEM, e o portão do `FIELD-3b` | 2 | [`INTAKE-ORDER-COHERENCE`](../.orders/INTAKE-ORDER-COHERENCE.md) §9, ratificado e sem proposta medida |
| 4 | o `repair`: mostra a diferença e pergunta, a fila, e o mover | 3 | o mesmo, e o [`INTAKE-PIN-TRAFFIC`](../.orders/INTAKE-PIN-TRAFFIC.md) §3 |
| 5 | o esquema de item, `root-x` e `x-item-##`, que move os hashes de `xml` | 0 | [`INTAKE-EFFECTS`](../.orders/INTAKE-EFFECTS.md) §8 e §9 |
| 6 | o vocabulário do PIN: o glossário, depois o JS, depois o Rust | 0 | [`INTAKE-PIN-TRAFFIC`](../.orders/INTAKE-PIN-TRAFFIC.md) §5 |
| 7 | o seletor do PIN pelos rótulos do `[part]`, e o tooltip | 5, 6 | o mesmo |
| 8 | o tráfego na `EMS.json`; o caminho que não resolve avisa e nunca bloqueia | 2 | [`INTAKE-PIN-TRAFFIC`](../.orders/INTAKE-PIN-TRAFFIC.md) §3 |
| 9 | a `EMS-000`, *Generic*: a medição de `.scope/generics/` por frequência, que o Regente reescreve | 2, 6 | o mesmo, §5; a medição é o entregável |
| 10 | o `<invoke>` validado pela configuração da EMS, e as skills genéricas do Explorer | 2 | só o [`.decisions/`](../.decisions/README.md) de 2026-10-15; intake a escrever |
| 11 | a superfície de EMS no app: começar, carregar, editar e emitir uma EMS ou uma ORD, mostrada pelo título; a NEM; o `repair` e o aviso de caminho na tela | 2 a 4, 8 | a escrever: `INTAKE-EXPLORER.md` |
| 12 | a saída do JS: `glyph-schema`, `glyph-diff` e `glyph-trace`, a skill sobre o binário Rust, e a página | o oráculo, peça por peça | a escrever: `INTAKE-JS-EXIT.md`; a rota da página se mede no `INTAKE-EXPLORER.md` |
| 13 | a referência entre pacotes, `<needs ref="glyph://…">`, e os escopos aninhados | as duas medições devidas | [`INTAKE-VIRTUAL-PATH`](../.orders/INTAKE-VIRTUAL-PATH.md) §16 |

Duas Ordens decididas em 2026-11-11 correm fora dessa cadeia, e a posição de cada
uma na fila é do Regente:

- **a reestruturação**, a `ORD-0011` chapada de
  [`.orders/parked/restructure-glyph-repo/`](../.orders/parked/restructure-glyph-repo/):
  o Orbital clássico com o ponto mantido, as decisões num arquivo só, a numeração
  por série e a linguagem no eixo dos fatos
  ([`INTAKE-RESTRUCTURE.md`](../.orders/INTAKE-RESTRUCTURE.md) §4). Ela move 318
  menções e os caminhos de nove scripts; a sessão propõe corrê-la logo depois da
  `ORD-0033`, para que os intakes novos nasçam nos caminhos finais. O `.orders/README.md`
  que o regency montou se ajusta à numeração por série, e isso é trabalho no regency;
- **as stores numa atualização**: o `--install` traz as stores novas, a que ninguém
  editou se atualiza, e a editada pede ao usuário um de três atos — *push and
  prefix*, *overwrite with incoming changes*, ou *push and prefix the incoming
  changes (preserve edits)* —, sempre com aviso.

#### A fila de antes do portão

Só uma Ordem fica aberta por vez, e uma proposta medida é um intake, não uma
Ordem. O que segue não abre Ordem nenhuma, e é o que uma sessão faz enquanto um
portão espera, para o Regente responder os portões em lote:

1. escrever os intakes que faltam, cada um fechando em perguntas numeradas com
   opções medidas: `INTAKE-XSD.md`, `INTAKE-EMS-JSON.md`, `INTAKE-EXPLORER.md` —
   com a rota da página medida pela régua das crates: a janela do Edge com as
   vistas rendidas pelo motor, um webview, uma GUI nativa — e `INTAKE-JS-EXIT.md`;
2. dar a proposta medida aos intakes que já existem: o `repair` e a NEM, o esquema
   de item, o vocabulário do PIN, o `<invoke>`;
3. correr as medições que são entregáveis: a frequência de `.scope/generics/`, o
   instrumento dos objetos de contexto, e os dois braços devidos do
   [`INTAKE-VIRTUAL-PATH.md`](../.orders/INTAKE-VIRTUAL-PATH.md) §16;
4. pôr o `fmt` e o `clippy` com avisos negados no `check:rust`, o que a M06 espera
   para os crates construídos passarem de `started` a `done`;
5. retrabalhar o `.history/study.md`, na forma que o Regente der.

O lote das decididas em 2026-09-27 e 2026-10-25 que movem o emitido está
construído, da `EMS-002/ORD-0014` à `ORD-0031`, e a versão se moveu uma vez
quando ele fechou, para 4.7.10.08 (2026-10-30). O mapa da inclusão, posição por
posição, está no [`INTAKE-INCLUSION.md`](../.orders/INTAKE-INCLUSION.md), e nada
dela espera o Regente: o §4 dele diz o que ele respondeu.

O que a spec revoga está assinado, e entre isso está a escada como
ordem de trabalho: [`ladder.toml`](ladder.toml) fica como o registro da
auditoria, e `node scripts/ladder.js --check` segue no `npm run check`.

## Aberto, esperando o Regente

As perguntas escritas com opções medidas estão em
[`PERGUNTAS-ABERTAS.md`](PERGUNTAS-ABERTAS.md) — as sete da primeira rodada e as
vinte e três do inventário de 2026-10-15. **Todas as trinta têm resposta dele**,
e o `EFF-8` tem duas: uma para `[part]`, uma para "item" e os objetos de
contexto.

Então esta lista é curta de propósito, e o que está **decidido e não construído**
não mora aqui: mora no §5 e nos intakes, e cada peça abre como proposta medida na
ORD que a constrói, parando no portão dele — a forma que ele ratificou em
2026-09-27.

### Os dois itens dos caminhos virtuais

Nomeados pelo §0: o `.history/study.md`, vazio desde o commit inicial, se
retrabalha (o Regente, 2026-11-11), e a forma dele espera a resposta à sugestão da
sessão; e **não existe seletor para `.pgml`**, então um `.pgml` se endereça pelo
arquivo inteiro ou por `@block`.

### Duas medições devidas, e nenhuma tem instrumento escrito

Não são perguntas: são dívidas que uma decisão assumiu.

| medição | quem a devia |
|---|---|
| o braço de comparação do §8 — o mini-repo reduz releitura? — e o terceiro braço, o transporte MCP comprando o que o arquivo não compra | [`INTAKE-VIRTUAL-PATH.md`](../.orders/INTAKE-VIRTUAL-PATH.md) §16 as exigia **em ordem** antes do `resources`; o Regente decidiu por B sem elas, e elas seguem devidas |
| a medição dos objetos de contexto, antes do desenho — *measure before design* | [`INTAKE-EFFECTS.md`](../.orders/INTAKE-EFFECTS.md) §9, a segunda ordem. Com a fronteira de "item" dada, é só isto que falta antes do desenho, e o instrumento não está escrito |

### A E-06, adiada com a direção dada

O caminho é a base verificada de
[`conformance/README.md`](../../conformance/README.md) §E-06 — o Regente
respondeu *"D"* — mas ele **não ratifica como feita**: *"this needs a closer
inspection"*. Até a inspeção dele, `K1` não alcança a regra de posição do
`PACKAGE_TARGET.md` §3.2 e as garantias **G2 e G3** seguem sem cobertura.

### Pendências de registro, sem casa hoje

Achados do inventário de 2026-10-15 que não são consequência de resposta nenhuma
e que pedem uma decisão de norma — como um identificador se aposenta — que
nenhum agente pode ratificar:

| pendência | estado |
|---|---|
| a série `Q` tem seis buracos: `Q1`, `Q2`, `Q3`, `Q5`, `Q6`, `Q13` não são enunciados em lugar nenhum | nada vivo; quem contar `Q1..Q14` procura seis perguntas que não existem |
| `Q9` nomeia duas perguntas diferentes sobre o mesmo assunto — [`E0b-ARCHITECT-RETURN.md`](../.orders/E0b-ARCHITECT-RETURN.md) e [`PACKAGE_TARGET.md`](../PACKAGE_TARGET.md) §10 | as duas fechadas; a colisão está registrada nos dois |
| `O1`, `O2`, `O3` e `O6` são referenciados como resolvidos e nunca enunciados; `O2` e `O6` não têm nem descrição recuperável | todas as dez resolvidas; `O2` e `O6` são identificadores sem conteúdo |
| em [`PERGUNTAS-ABERTAS.md`](PERGUNTAS-ABERTAS.md), *"O que eu faço sem você"* fecha o documento antes da pergunta 7 | ordem de leitura, não perda |
| o `note` do `package.json` diz que o D1 do [`HGML_PLAN.md`](../HGML_PLAN.md) está *"open since v1.1"* | o D1 está **feito** — treze módulos; a linha do `package.json` é o mesmo fato defasado em segundo lugar, e não foi tocada nesta rodada |
| as linhas de [`GLOSSARY.md`](../GLOSSARY.md) §8 que `[ref'nem']`, `[ref'EMS']` e a fila do `repair` pedem | o `GLOSSARY.md` é fonte de uma cópia gerada que a skill carrega, então entram **na ORD que as constrói**, com `node scripts/build-skill.js` no mesmo passo — a ordem que o §5 do [`INTAKE-PIN-TRAFFIC.md`](../.orders/INTAKE-PIN-TRAFFIC.md) já declara: vocabulário primeiro, depois o JS, depois o Rust |

### O resto

| | |
|---|---|
| **estudo de setembro** | oito intakes em [`.orders/`](../.orders/): [`INTAKE-VIRTUAL-PATH`](../.orders/INTAKE-VIRTUAL-PATH.md) (mini-repo, medido: o custo de round-trip é o tamanho de `glyph-parser.js`), [`INTAKE-ORDER-COHERENCE`](../.orders/INTAKE-ORDER-COHERENCE.md) (a aresta declarada, ratificada em 2026-10-15 com `[ref'nem']`, `[ref'EMS']` e a fila do `repair`; não construída), [`INTAKE-BURN-INVARIANCE`](../.orders/INTAKE-BURN-INVARIANCE.md) (fechado), [`INTAKE-FORMAL-ANALYSIS`](../.orders/INTAKE-FORMAL-ANALYSIS.md), [`INTAKE-PARSER-SPLIT`](../.orders/INTAKE-PARSER-SPLIT.md) (o corte, feito: treze módulos), [`INTAKE-RUST`](../.orders/INTAKE-RUST.md) (steelman e defeater; o Regente decidiu migrar), [`INTAKE-RUST-LADDER`](../.orders/INTAKE-RUST-LADDER.md) (a escada auditada; nada nela espera o Regente — as dez perguntas `O` fecharam em 2026-09-24 e 2026-09-27, e o §8 registra quando cada uma fechou), [`INTAKE-FIELD-2026-09`](../.orders/INTAKE-FIELD-2026-09.md) (o kit de cliente; `H-09` fechou por ele, e os dois achados estruturais fecharam em 2026-10-15). |
| **EMS-001** | fechou em 2026-11-07, com a `ORD-0014`, e as perguntas do [retorno](../.orders/EMS-001/RETURN.md) têm todas resposta. A execução assíncrona da seção `queue` **passou à EMS-002** em 2026-10-15 e saiu desta lista |
| **EMS-002** | aberta em 2026-10-23, e o [registro da série](../.orders/EMS-002/README.md) guarda o que fechou, da `ORD-0001` à `ORD-0032`; a `ORD-0033`, o `[part]`, está aberta com o portão respondido em 2026-11-11; o resto do §5 segue pela trilha, cada peça como proposta medida para o Regente cortar |
| **as stores numa atualização** | o `--install` não sobrescreve as stores, e por isso uma versão nova instalada sobre uma antiga segue lendo as que vieram da instalação antiga, mesmo sem edição nenhuma. Medido em 2026-11-07, com as stores de 2026-10-18 e o motor 4.7.10.08: o `.xml` e o `.hgml` das 118 fontes não mudam; o `.json` leva os digests antigos e, no K-04, um diagnóstico diz *preset*; e o `expansions.json` nomeia `skeptic`, sem chegar ao XML delas. O Regente decidiu em 2026-11-11 que a instalação atualiza, com os três atos do §5; falta a Ordem |

## Adiado por decisão, não por esquecimento

- **Efeitos** — [`.orders/INTAKE-EFFECTS.md`](../.orders/INTAKE-EFFECTS.md). A
  metade barata (`<effect>` declarativo) tem o que lhe faltava: o `origin`
  serializa nos dois níveis, `root-x` na raiz e `x-item-##` em cada item (§9.1
  do intake), e isso move os hashes de `xml`. A cara (objetos de contexto) é
  segunda ordem e espera a definição de "item".
- **A `ORD-0011` chapada, `restructure-glyph-repo`**, estacionada em 2026-09-24 e
  guardada em [`.orders/parked/restructure-glyph-repo/`](../.orders/parked/restructure-glyph-repo/);
  não é a `EMS-001/ORD-0011`. Reestrutura o
  repositório lendo `_ORBITAL`, que só existe nesta máquina. O mapa está feito,
  sem mover arquivo nenhum, em
  [`INTAKE-RESTRUCTURE.md`](../.orders/INTAKE-RESTRUCTURE.md) (2026-11-07), e as
  seis colisões têm resposta do Regente (2026-11-11): o alvo é o Orbital clássico.
  Ela espera só a posição na fila, no §5.
- **A extensão VS Code** espera o Explorer funcionando (o Regente, 2026-11-11):
  passou como teste, pode ficar defasada até lá, e a linha do LSP é série própria,
  fora do corte da versão final.
- **Os caminhos B e C do mini-repo** saem como não justificados por medição
  (2026-10-15): se o mini-repo vier, vem pelo caminho A. Qualquer um dos dois
  reabre com medição na mão.
- **O resto da normalização na Regency**, pulado pela norma de 2026-10-16
  (*"if unnecessary and mid cost, skip it like a nonfunctional requirement"*,
  [`.constraints/`](../.constraints/README.md)). O registro de trabalho entrou;
  dos dois itens restantes, nenhum é necessário hoje:
  - **a troca dos nomes que a convenção bane** (`scripts/core/util.js` e a cópia
    dele na skill, o crate `glyph-util`, `rust/crates/glyph-cli/examples/common`):
    nada medido ou ratificado a pede, e o ganho é de nomenclatura. O custo é
    médio: move o oráculo (`oracle-modules/util.json`) e o `crate-graph.js`, e
    as ORDs fechadas da EMS-001, que são atos, seguem com o nome antigo;
  - **o manifesto de linhagem**, `.virtual/manifest.json`: ele é funcional, e não
    cosmético, porque alimenta o `vp.py code`/`slice`/`stale` e as linhas
    `STALE` dos hooks. Mesmo assim não é necessário. As funções de detectar
    defasagem e de endereçar norma e código são do `glyph-vpath`, e um manifesto
    escrito à mão ao lado dele seria um segundo índice. O custo é médio: uma fatia
    por norma, mantida à mão. Reabre quando o índice puder emiti-lo por inversão
    mecânica.
- **A tabela de prefixos de kit** não entra no motor (2026-10-15): nomear
  prefixo de kit é do autor do kit.
- **A linha paralela `ccr-25b46078-6uxsw5`**, com `plumbing` e `testing` um commit
  atrás dela, as duas só no remoto: uma sessão na nuvem que saiu de `afed370` e fez
  outra `ORD-0013`, um `.msi` com node. A `ORD-0013` da `main` a supera, e as branches
  ficam como estão, sem mesclar (2026-11-07, [`.decisions/`](../.decisions/README.md)).
  O handoff dela pede avançar a `main` até `testing`, e isso não vale para esta `main`.
  Só nela existem `scripts/build-msi.js` e o `--host` do `serve-dev.js`.

## Reaberto por decisão

- **Escopos aninhados** para variáveis. O escopo era o pacote inteiro, como o
  Regente especificou, e ninguém havia pedido mais. Em 2026-10-15 ele tomou a
  referência cruzando pacote — `<needs ref="glyph://…">`, tardia, resolvida por
  quem tem o outro pacote —, e essa é exatamente a condição que **reabre** a
  decisão. Por expectativa de demanda, não por medição: as duas medições que
  [`INTAKE-VIRTUAL-PATH.md`](../.orders/INTAKE-VIRTUAL-PATH.md) §16 exigia em
  ordem não foram feitas, e seguem devidas.
