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

Antes do código, a medição sobre o histórico do git, com os limiares declarados
antes de rodar, está em
[`INTAKE-VIRTUAL-PATH.md`](../.orders/INTAKE-VIRTUAL-PATH.md) §18 (2026-10-16,
`scripts/measure-coupling.js`). Desde setembro, a taxa de defasagem é **4,8 %**,
abaixo da barra de parar. As edições em `.md` seguem locais, com mediana de
6,7 %, e a co-mudança código↔documento não tem nenhum par acima da barra.

**Decidido em 2026-10-16** ([`.decisions/`](../.decisions/README.md)): as
**camadas 1 a 4 vêm primeiro**, e o código mora **na base, em JS**, servindo as
duas branches. As camadas 5 e 6 ficam adiadas pela medição, e a 7 vem depois
delas. A `ORD-0013` está aberta, e duas ordens concorrentes são proibidas
([`.constraints/`](../.constraints/README.md)). Por isso as camadas 1 a 4 correm
como trabalho do plano no `main`, do mesmo jeito que o portão `CL-04`/`CL-05`, e
não como uma segunda ORD.

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

### 3. Quatro defeitos, medidos e não consertados no JS

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
flags do `glyph-cli.js`. A vaga da Ordem aberta é da **`ORD-0013`, o
instalador**, autorizada pelo Regente em 2026-10-15 com o **segundo protocolo em
vez de node** — coerente com o Glyph 100% em Rust — e a máquina Windows limpa é
dele; a medição que o `[ins]` pede corre dentro da Ordem. A `ORD-0014` já tem a
metade do portão que era do Regente: a árvore medida **aceita**, e a janela pelo
`msedge --app`. O instalador é também o que torna o app **standalone** no sentido do
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
- **uma ORD de renomeações** (O8, O9, O10): o `SKEP` do `vocabulary.js` passa a
  *Sceptic*, como o glossário já diz, e `<skeptic>` e `[skeptic` continuam lidos;
  o diagnóstico *"Parâmetro de molde"* diz template; o *preset* sai do
  `templates.json` e do `rules.json`; o comentário do XML de fonte vazia diz
  mould; a chave `glyph.moldes.user.v1` migra uma vez, sem perder mould
  nenhum; e a categoria `molde` do vocabulário vira `frame`;
- **a régua das crates no portão** (O7): o `check:rust` mede a árvore de cada crate
  externa e aplica *note*, *ask* e *fix*; `wry` + `tao` é *fix*, e a janela da
  `ORD-0014` vai pelo `msedge --app`;
- **a sintaxe de referência `[ref'nome']`**: um nome ligado que não resolve, fora
  da cerca `[logic]`, dispara `<needs var>`;
- **o alarme de inferência profunda**: composto de profundidade 5 ou mais sem
  operando pergunta (`ask`);
- **dois diagnósticos para um comando sem efeito**: *não trabalha* (`note`), um
  comando conhecido sem efeito na posição em que está; *não sabe* (`fix`), fora
  do vocabulário;
- **as duas propostas do rascunho do XML**: `[pt'1.1'` → `<part n="1.1">` e
  `[if'cond'` → `<if cond="…">`, pelo `PACKAGE_TARGET.md`, com o `fromXML` no
  mesmo passo;
- **o blend `REV` + `DIST` só no mesmo alvo**: o `sameTarget` passa a conferir o
  alvo, e alvos diferentes queimam como dois comandos;
- **os três defeitos antigos do §3, só no Rust** (O4): o Rust responde certo, e o
  teste diferencial nomeia cada um como diferença conhecida;
- **o Rust para de refazer a cada chamada o que o JS faz uma vez** (pergunta 12):
  as regras compiladas uma vez por contexto e o `ck` em aritmética inteira, só no
  Rust; o JS não é afinado.

O que a spec revoga está assinado, e entre isso está a escada como
ordem de trabalho: [`ladder.toml`](ladder.toml) fica como o registro da
auditoria, e `node scripts/ladder.js --check` segue no `npm run check`.

## Aberto, esperando o Regente

As perguntas escritas com opções medidas estão em
[`PERGUNTAS-ABERTAS.md`](PERGUNTAS-ABERTAS.md) — as sete da primeira rodada e as
vinte e três do inventário de 2026-10-15, cada uma com a resposta dele. O que
**ainda não tem resposta** está aqui, em ordem de quanto cada coisa bloqueia.

### "Item" não tem definição — a primeira da fila

[`INTAKE-EFFECTS.md`](../.orders/INTAKE-EFFECTS.md) §8. Glyph tem comandos,
literais e casas — não tem valor nem objeto. O Regente desenhou a **fronteira**
em 2026-10-15 (a inferência se apoia no XSD gerado sobre o conteúdo do XML) e
**não** a definição: o que "item" é na estrutura, e o modelo de valor, objeto e
escopo, seguem em branco.

O que ela bloqueia hoje — e é mais do que bloqueava antes do inventário:

| bloqueia | desde quando |
|---|---|
| a metade cara dos efeitos: objetos de contexto, efeito condicional por `[SECTION]` | antes |
| o **D** de [`INTAKE-VARIABLES.md`](../.orders/INTAKE-VARIABLES.md) §4 — ligações fora da cerca | antes, e **cresceu**: com a referência saindo do pacote, o D carrega o enunciado maior |
| a valência e o rótulo de **`[part]`**, cujo desenho existe e cuja peça é fatia de `[block]` | 2026-10-15 — o desenho chegou e se apoia em "item" |
| a gramática do seletor do **PIN** (`PIN-selection`) | 2026-10-15 — *"this will come along the \"item\" and \"part\" definition"* |
| o conteúdo do **`<schema>`**, que reflete seções, blocos, templates, parts e variáveis | 2026-10-15 — o conteúdo foi decidido e nomeia *parts* |
| o esquema da **`EMS.json`**, que é o XSD pelo outro lado | 2026-10-15 — pela mesma peça |

Era a chave da segunda ordem; agora é também a chave do PIN, do `<schema>` e da
`EMS.json`. Pede medição antes de desenho, e a medição ainda não tem instrumento
escrito.

### O `<invoke>` continua ou termina o XML?

Pergunta do próprio Regente em 2026-10-15, que ninguém havia feito:
*"will it go on through the Order or is the `<invoke>` the end of the XML?"*
As duas respostas comissionam trabalho diferente —
[`PACKAGE_TARGET.md`](../PACKAGE_TARGET.md) §10. A norma que veio com ela já
vale: nenhuma dependência bloqueante pode existir ao executar uma Ordem.

### Duas perguntas que as respostas de 2026-10-15 criaram

| pergunta | por que é dele |
|---|---|
| o `repair` move **por item** — cada `fix` uma pergunta e um movimento — ou **por lote**, a fila lida inteira e um diff só? | [`INTAKE-PIN-TRAFFIC.md`](../.orders/INTAKE-PIN-TRAFFIC.md) §3 dá ao `repair` uma fila e um movimento que ele não tem. A unidade do movimento decide quantas vezes o Regente é perguntado |
| entre o XSD da `EMS.json` e o conteúdo do `<schema>`, **qual peça gera qual**? | [`PACKAGE_TARGET.md`](../PACKAGE_TARGET.md) §5 e o §3 do mesmo intake dizem que são a mesma peça vista dos dois lados. Os dois documentos não dizem qual é a fonte e qual é a projeção, e o esquema da `EMS.json` se constrói *"together"* |

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
| **EMS-001** | as perguntas do [retorno](../.orders/EMS-001/RETURN.md) têm todas resposta, e os dois portões das duas últimas ORDs também. A execução assíncrona da seção `queue` **passou à EMS-002** em 2026-10-15 e saiu desta lista |
| **EMS-002** | nasce quando a `ORD-0014` fechar, e a ordem das ORDs sai de uma proposta medida, para o Regente cortar — os catorze itens do §5 esperam nela |

## Adiado por decisão, não por esquecimento

- **Efeitos** — [`.orders/INTAKE-EFFECTS.md`](../.orders/INTAKE-EFFECTS.md). A
  metade barata (`<effect>` declarativo) tem o que lhe faltava: o `origin`
  serializa nos dois níveis, `root-x` na raiz e `x-item-##` em cada item (§9.1
  do intake), e isso move os hashes de `xml`. A cara (objetos de contexto) é
  segunda ordem e espera a definição de "item".
- **A `ORD-0011` chapada, `restructure-glyph-repo`**, estacionada em 2026-09-24 e
  guardada em [`.orders/parked/restructure-glyph-repo/`](../.orders/parked/restructure-glyph-repo/);
  não é a `EMS-001/ORD-0011`. Reestrutura o
  repositório lendo `_ORBITAL`, que só existe nesta máquina. Segue estacionada
  por decisão de 2026-10-15, e **quando a EMS-001 fechar** reabre só a parte de
  **mapear** — o `[find]` e o `[nt]`, sem mover arquivo nenhum —, devolvendo uma
  tabela de colisões para o Regente ler. Mapear não gasta a vaga da Ordem
  aberta.
- **Os caminhos B e C do mini-repo** saem como não justificados por medição
  (2026-10-15): se o mini-repo vier, vem pelo caminho A. Qualquer um dos dois
  reabre com medição na mão.
- **As camadas 5 e 6 dos caminhos virtuais**, as impressões digitais e o grafo
  de invalidação, adiadas em 2026-10-16. A medição do §0 mostra que elas detectam
  um evento que o repositório deixou de produzir. Reabrem com uma medição nova,
  pelo mesmo `scripts/measure-coupling.js`.
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
    `STALE` dos hooks. Mesmo assim não é necessário. A função de detectar
    defasagem é a das camadas 5 e 6, que a medição adiou. A função de endereçar
    norma e código é a das camadas 1 a 4, que se constroem na base com cobertura
    fechada, e um manifesto escrito à mão ao lado delas seria um segundo índice.
    O custo é médio: uma fatia por norma, mantida à mão. Reabre quando o índice
    das camadas 1 a 4 puder emiti-lo por inversão mecânica.
- **A tabela de prefixos de kit** não entra no motor (2026-10-15): nomear
  prefixo de kit é do autor do kit.

## Reaberto por decisão

- **Escopos aninhados** para variáveis. O escopo era o pacote inteiro, como o
  Regente especificou, e ninguém havia pedido mais. Em 2026-10-15 ele tomou a
  referência cruzando pacote — `<needs ref="glyph://…">`, tardia, resolvida por
  quem tem o outro pacote —, e essa é exatamente a condição que **reabre** a
  decisão. Por expectativa de demanda, não por medição: as duas medições que
  [`INTAKE-VIRTUAL-PATH.md`](../.orders/INTAKE-VIRTUAL-PATH.md) §16 exigia em
  ordem não foram feitas, e seguem devidas.
