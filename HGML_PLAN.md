# Plano — granulação em `/scripts` + formato `.hgml`

Documento de planejamento. Nenhum arquivo foi movido, nenhum código foi escrito.
Serve pra decidir o formato antes de mexer em qualquer coisa — o `glyph-parser.js`
tem 1694 linhas e alimenta os 110 casos de `test-corpus.js`; a suíte é o único
jeito confiável de saber se uma mudança quebrou algo, e nada aqui deve andar
sem rodar `node test-corpus.js` (ou `node scripts/test-corpus.js`, depois do
passo 5) logo em seguida.

## O que me diz — avaliação honesta

**Granulação (Parte A): mecânica de mover é fácil, partir o `glyph-parser.js` é o
trabalho de verdade.** Os outros quatro arquivos JS (`dag.js`, `glyph-moldes.js`,
`build-templates.js`, `test-corpus.js`) são movidas triviais — o risco inteiro
está em atualizar os caminhos relativos que apontam pra eles (4 lugares:
`glyph-engine-alias.html`, `build-templates.js`, `test-corpus.js`,
`skills/glyph-markup/SKILL.md`). Isso dá pra fazer num passo só e verificar.

O `glyph-parser.js` é outra categoria de problema. Ele já tem 6 costuras
comentadas no próprio arquivo (VOCABULARY, LEXER, LOGIC BLOCK, PARSER — que
inclui TEMPLATE EXPANSION/RULES/CONSTRAINTS —, XML EMITTER, AST JSON), então
a divisão em módulos não é uma escolha arbitrária minha, é seguir o desenho que
já existe. O que não é trivial: hoje tudo isso é uma função-fábrica UMD única, e
as seções conversam por **closure compartilhada** — `VERSION`, `CATS`/`INSTR`/
`ALIAS`/`STRUCT`/`META`/`EMO`/`SESSION`/`FRAMES`/`SLOTS`/`LIMITS`, o registro de
templates (`useTemplates`/`TEMPLATES`) e o de regras (`useRules`/`RULES`), além
de helpers como `esc`, `walk`, `classify`. Partir em arquivos de verdade obriga
a trocar essa closure por parâmetros explícitos ou um objeto de contexto — é
refatoração de fiação interna, não corte-e-cola, e é onde um bug silencioso
pode entrar (a suíte testa o pipeline inteiro via `GlyphCore`, não cada função
interna isolada — uma fiação errada só aparece se o caso de teste certo passar
por ali).

**Tem uma pegadinha que decide o formato todo: o navegador não tem `require`.**
`glyph-parser.js` é carregado hoje por `<script src="glyph-parser.js">` puro,
sem bundler. Se eu simplesmente partir o arquivo em módulos CommonJS e fizer
o núcleo dar `require()` neles, o Node continua funcionando mas **o navegador
quebra** — não existe `require` em `file://`. Duas saídas, e é uma decisão sua
(passo 1): (A) não partir o `glyph-parser.js` por dentro, só mover os arquivos
irmãos pra `/scripts`; ou (B) partir de verdade em `scripts/core/*.js` e
escrever um bundler novo (`build-core.js`, no mesmo espírito do
`build-templates.js` que já existe) que concatena tudo de volta num
`glyph-parser.js` único pro navegador consumir — o Node passa a rodar direto
contra os módulos-fonte, sem precisar do bundle. A opção B entrega o que você
pediu ("granule o máximo"); a A é mais barata e mais segura. Minha recomendação
é B, porque o repositório já tem o padrão de "fonte editável + gerado por
build script" (`glyph-templates.json`/`glyph-rules.json` → `glyph-data.js`) —
isso só estende um padrão que você já aceitou, não inventa um novo.

**`.hgml`: a boa notícia é que a gramática já tem o que você pediu.** O
`[FECHAMENTO][/FECHAMENTO]` que você descreveu como exemplo já existe como
sintaxe válida — `glyph-grammar.ebnf` e o lexer (`closeTag`, em
`glyph-parser.js`) já suportam `[tag]...[/tag]` explícito como alternativa ao
auto-fechamento (`;`) e ao aninhamento por `]`. Isso muda o problema: a forma
mais barata e mais segura de construir `.hgml` não é inventar uma quarta
sintaxe do zero — é definir uma **forma canônica do próprio Glyph**: sempre
fechamento explícito, sem texto livre, sem atalhos. Uma reimpressão do AST já
existente (`parse()` → nova função `toHGML()`, irmã de `toXML()`/`toAST()`),
não um novo lexer/parser. Isso também dá um oráculo de correção de graça: como
`.hgml` continua sendo Glyph válido, dá pra reprocessar a própria saída e
comparar a AST resultante com a original (round-trip) — é um teste melhor do
que qualquer suíte escrita à mão.

Só que tem uma leitura mais literal do seu pedido — "montado 100% de
hieróglifos" — que é outro nível de esforço, e vale nomear separado. O
`expansoes.txt` só decompõe ~10 comandos derivados (`VRFY`, `VAL`, `CRIT`,
`SCRU`, `TRYFR`, `PROB`) nos 18 hieróglifos-base. O vocabulário inteiro em
`glyph-parser.js` tem quase 100 comandos (`RWK`, `FMT`, `SUM`, `COND`, toda a
categoria de raciocínio...). Pra `.hgml` ser **literalmente** só hieróglifos-
átomo, alguém precisa primeiro terminar essa tabela de expansão pros ~90
comandos que faltam — isso é trabalho de conteúdo/linguística (decidir o que
cada comando *é*, composicionalmente), não de código, e é decisão sua, não
minha. Recomendo tratar isso como uma segunda fase opcional, depois que a
forma canônica-fechada (mais barata) estiver rodando e validada.

**Resumo da minha leitura:** granulação é factível e o `glyph-parser.js` já diz
onde cortar; o risco real está em não quebrar o caminho do navegador e em
threading do estado compartilhado — mitigável rodando a suíte a cada extração,
nunca num commit só. `.hgml` como reimpressão canônica fechada é barato,
testável por round-trip, e não exige gramática nova. `.hgml` como decomposição
total em átomos-hieróglifo é um projeto de conteúdo separado e maior, que eu
não recomendaria começar antes da forma canônica estar de pé.

---

## Decisões — suas, não minhas

| # | Decisão | Onde entra | Minha recomendação |
|---|---|---|---|
| D1 | Partir o `glyph-parser.js` por dentro (B) ou só mover arquivos irmãos (A)? | Passo 1 | B — mas só se você topar manter um bundler novo |
| D2 | Nomes de arquivo dos módulos internos, se D1=B | Passo 6 | proposta abaixo, ajustável sem custo |
| D3 | `.hgml` = reimpressão canônica (Opção 1) ou decomposição total em átomos (Opção 2)? | Passo 13 | Opção 1 primeiro, Opção 2 como fase posterior opcional |
| D4 | Nomes das tags `.hgml`: reaproveitar os canônicos existentes (`crit`, `ctx`...) ou vocabulário novo tipo `[FECHAMENTO]`? | Passo 14 | reaproveitar os existentes — zero vocabulário novo pra manter |
| D5 | O que o "filtro denso" descarta: texto livre desaparece de vez, ou vira literal condensado? | Passo 15 | desaparece por padrão, com flag pra preservar |
| D6 | Se Opção 2 for adiante: quem escreve as ~90 expansões que faltam em `expansoes.txt`? | Passo 21 | você, com meu apoio verificando ciclos via `dag.js` |

---

## Parte A — granulação em `/scripts`

| # | Passo | Toca | Impacto em `test-corpus.js` | Tipo |
|---|---|---|---|---|
| 1 | Decidir D1 (A ou B) antes de tocar em qualquer arquivo | — | nenhum ainda | **decisão sua** |
| 2 | Criar `/scripts` vazio | — | nenhum | mecânico |
| 3 | Mover `dag.js` e `glyph-moldes.js` pra `/scripts` — nenhum dos dois é `require`d por outro arquivo do jeito que muda com a mudança de pasta (`dag.js` recebe o caminho de `expansoes.txt` por argumento; `glyph-moldes.js` só é carregado via `<script src>`) | `glyph-engine-alias.html` (path do `<script src="glyph-moldes.js">`) | nenhum — não fazem parte do require graph de `test-corpus.js` | mecânico |
| 4 | Mover `build-templates.js` pra `/scripts`; ajustar `SOURCES` pra `../glyph-templates.json` e `../glyph-rules.json`; manter a saída `glyph-data.js` na raiz (é o que o HTML carrega) | `build-templates.js` | nenhum direto — rodar depois e diferenciar o `glyph-data.js` gerado contra o atual pra confirmar saída idêntica | mecânico, checkpoint: diff do output |
| 5 | Mover `test-corpus.js` pra `/scripts`; ajustar os três `require("./...")` pra `require("../glyph-parser.js")` etc. Rodar. | `test-corpus.js` | **é o teste** — rodar e confirmar 110/110 antes de seguir | mecânico, **checkpoint obrigatório** |
| 6 | *(só se D1=B)* Criar `scripts/core/` com um arquivo por seção já comentada no `glyph-parser.js` atual: `vocabulary.js`, `lexer.js`, `logic-block.js`, `template-expansion.js`, `rules-engine.js`, `template-constraints.js`, `parser.js`, `xml-emitter.js`, `ast-serializer.js`, mais um `context.js` pro estado hoje compartilhado por closure (D2 nomes ajustáveis) | novo diretório | nenhum ainda — só criação, sem mover código | proposta minha, ajustável |
| 7 | *(só se D1=B)* Extrair **um módulo por vez**, começando pelos que menos dependem de estado mutável (`ast-serializer.js` e `xml-emitter.js` só precisam de `esc`, `elName`, `LIMITS`, `walk` — não tocam `RULES`/`TEMPLATES`) e subindo até `parser.js` por último (é quem orquestra tudo). Rodar `node scripts/test-corpus.js` depois de **cada** extração, não no final. | `glyph-parser.js` inteiro, em 8-9 sub-passos | risco real de regressão silenciosa por fiação errada — é por isso que cada sub-passo roda a suíte sozinho | mecânico na forma, mas exige atenção — **checkpoint a cada sub-passo** |
| 8 | *(só se D1=B)* Decidir o padrão de estado compartilhado antes do passo 7 ir pra valer: objeto de contexto único importado por todo módulo (recomendo) vs. parâmetros explícitos em cada função exportada | design interno | nenhum se decidido antes de extrair | **decisão sua** (proposta: contexto único) |
| 9 | *(só se D1=B)* Criar `scripts/build-core.js` — concatenador que gera `glyph-parser.js` (bundle, comentário "GENERATED — DO NOT EDIT BY HAND", mesmo espírito do `build-templates.js`) a partir de `scripts/core/*.js`, escrito na raiz | novo build script + `glyph-parser.js` (agora gerado) | rodar a suíte contra o bundle gerado, não só contra os módulos-fonte | mecânico, checkpoint: diff comportamental via suíte |
| 10 | Atualizar `glyph-engine-alias.html`: se os assets carregados pelo navegador (bundle final, `glyph-data.js`, `glyph-moldes.js`, `glyph-ui.js`) continuarem na raiz, só o `GLYPH_ASSET_VERSION` muda; se você preferir que também morem em `/scripts`, ajustar os 4 caminhos do array `<script src>` | `glyph-engine-alias.html` | nenhum (fora do require graph do Node) | mecânico, **checkpoint manual**: abrir no navegador via `file://`, checar console sem erro |
| 11 | Atualizar `skills/glyph-markup/SKILL.md` (seção "Arquivos da implementação") e `skills/glyph-markup-commons` se citar caminhos — hoje descrevem tudo na raiz | 2 arquivos de skill | nenhum | mecânico |
| 12 | **Checkpoint A** — rodar `node scripts/test-corpus.js` (110/110), abrir `glyph-engine-alias.html`, testar 2-3 presets manualmente na interface. Só depois disso a Parte A conta como pronta. | — | validação final da parte A | checkpoint |

## Parte B — formato `.hgml`

| # | Passo | Toca | Impacto em `test-corpus.js` | Tipo |
|---|---|---|---|---|
| 13 | Decidir D3: Opção 1 (reimpressão canônica fechada, reaproveita gramática/parser/testes) vs Opção 2 (decomposição total em átomos-hieróglifo, exige completar `expansoes.txt`) | design do formato | nenhum ainda | **decisão sua** |
| 14 | Decidir D4: nomes das tags `.hgml` — canônicos existentes (`crit`, `ctx`, `vrfy`...) vs vocabulário novo | design do formato | nenhum ainda | **decisão sua** |
| 15 | Decidir D5: texto livre desaparece por padrão no filtro denso, ou vira literal condensado com flag pra preservar | design do formato | nenhum ainda | **decisão sua** |
| 16 | Escrever um adendo normativo (`glyph-hgml.ebnf` ou seção nova em `glyph-grammar.ebnf`) descrevendo a forma canônica `.hgml` como **subconjunto** da gramática atual: sempre `[tag]...[/tag]` explícito, sem `;` de auto-fechamento, sem `bareTag`, sem texto livre. Documento pra revisão sua antes de codar. | novo doc / `glyph-grammar.ebnf` | nenhum | design meu, **checkpoint de revisão antes do passo 17** |
| 17 | Implementar `toHGML(src, opts)` — nova função irmã de `toXML`/`toAST`, caminha pelos mesmos `segments` do `parse()` já existente, emite `[tag]valor[/tag]` aplicando o filtro de D5. Função **aditiva**: `buildXml`/`toXML` continuam intocados. | `glyph-parser.js` (ou `xml-emitter.js`/novo `hgml-emitter.js`, se a Parte A já rodou) | risco zero pros 110 casos existentes — é código novo, não editado | mecânico, uma vez que 13-16 estão fechados |
| 18 | Adicionar `--hgml` ao bloco CLI (junto de `--ast`/`--xml`/`--diag`) | `glyph-parser.js`, bloco CLI no fim do arquivo | nenhum | mecânico |
| 19 | Criar `scripts/test-hgml-corpus.js` com um **oráculo de round-trip**: gera `.hgml`, re-tokeniza/re-parseia (já que `.hgml` é Glyph válido), compara a AST resultante com a original. Reaproveitar os casos dos buckets já existentes em `test-corpus.js` (`POSITIVE`, `TEMPLATES`, `RULE_CASES`...) em vez de escrever casos do zero. | novo arquivo de teste | não altera os 110 atuais — soma uma suíte nova ao lado | mecânico, mas é o **verdadeiro crash-test** da fase |
| 20 | Rodar o round-trip contra os 110 casos reaproveitados; qualquer nó que não sobreviva aponta um bug em `toHGML` ou uma ambiguidade real na gramática atual que ninguém tinha notado | — | usa os 110 como insumo, não os modifica | validação |
| 21 | **Checkpoint B** — revisar com você 5-10 exemplos de saída `.hgml` lado a lado com o XML equivalente, confirmar que a forma "sente certo" antes de generalizar | — | — | checkpoint |
| 22 | *(só se D3=Opção 2)* Completar `expansoes.txt` pros ~90 comandos de `INSTR` que hoje não têm expansão em hieróglifos-base, verificando ausência de ciclos a cada adição via `node dag.js` | `expansoes.txt` | nenhum direto — é insumo de dados, não código do parser | **trabalho seu**, com meu apoio na verificação de ciclos |
| 23 | *(só se D3=Opção 2)* Implementar um segundo emissor (`toHGMLAtomic` ou flag `deep:true` em `toHGML`) que substitui cada comando canônico pela cadeia de átomos-base segundo `expansoes.txt`, sobre a mesma AST | `glyph-parser.js` | precisa de round-trip próprio — decompor em átomos pode não ser reversível 1:1, então esse é o passo que mais precisa de teste dedicado | design + implementação, alto esforço |
| 24 | Atualizar `ASSINATURAS.md`/`skills/glyph-markup/SKILL.md` com a seção normativa de `.hgml`; bump de `VERSION` em `glyph-parser.js` e de `GLYPH_ASSET_VERSION` no HTML (hoje incoerentes entre si — `1.0.9.3` vs `1.9.3`, vale alinhar de passagem); entrada nova em `CHANGELOG.md` seguindo o padrão das entradas anteriores | docs + versão | nenhum | mecânico, feito por último |

---

## Ordem recomendada

Parte A inteira (com checkpoint 12) antes de começar a Parte B — não porque
sejam tecnicamente dependentes (dá pra fazer `.hgml` sem mexer em `/scripts`),
mas porque partir o motor duas vezes seguidas (granulação + depois `.hgml`
tocando os mesmos arquivos já mexidos) é onde regressão silenciosa gosta de
morar. As decisões D1-D6 valem a pena serem todas respondidas antes do primeiro
commit — mudam o formato do trabalho, não só o conteúdo.
