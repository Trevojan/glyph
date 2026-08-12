# Changelog

Todas as mudanças notáveis do Glyph são documentadas aqui, da mais recente para a mais antiga.

> **Nota sobre versionamento:** a partir desta reorganização, o projeto adota o esquema
> `1.0.9.x` como faixa de desenvolvimento pré-`2.0` — o salto para `2.0` fica reservado
> para uma revisão deliberada e significativa, não para o próximo incremento de rotina.
> As versões abaixo eram anteriormente identificadas como `1.9`, `1.9.1`, `1.9.2` e
> `1.9.3`; o conteúdo é o mesmo, só a numeração muda. Versões anteriores (`v1.7`,
> `v1.8`) mantêm sua numeração histórica — ver `GLYPH_v1.7_CHANGELIST.md` e
> `GLYPH_v1.8_CHANGELIST.md`.

---

## [1.0.9.3] — Pendências fechadas

Todas as seis pendências conhecidas listadas ao final da `1.0.9.2` foram resolvidas
nesta passagem.

### Corrigido

- **`ERROR` e `PROB` sem entrada em `INSTR`.** `ERROR` registrado como hieróglifo
  (nível 0, `= BASE` em `expansoes.txt`); `PROB` corrigido para `ERROR + CTX` (era
  `FLS + TRYFR`, derivação errada). Ambos entram em `CATS`/`INSTR` seguindo o padrão
  de `CRIT`/`SCRU`/`TRYFR` — vocabulário sem entrada em `FRAMES`, livre de aridade.
  `SESSION.prob` ("problema") foi removido: com `PROB` resolvendo em `INSTR`,
  `classify()` nunca mais alcançaria aquela entrada — ficaria vocabulário morto.
  Casos `P-24`/`P-25` na suíte; `N-11` trocou de `ERROR` (agora válido) para `BOGUS`.
- **`glyph-grammar.ebnf` divergia da implementação.** `segment_break` e o operador
  renomeado `line_break` trocados de lugar — `;` fecha o segmento, `;;` só quebra a
  resposta sem fechar nada, casando com o motor e a tabela `PUNCT`.
- **Cache de `file://` não invalidava `<script src>` ao editar.**
  `glyph-engine-alias.html` ganhou um `GLYPH_ASSET_VERSION` único que vira `?v=` nos
  quatro `<script src>`, via `document.write` preservando a ordem de carga. Verificado
  no navegador: sem erro de console, ordem de carga correta.

### Adicionado

- **`best-of` com N candidatos.** O ligador de templates ganhou um tipo de casa nova
  — `"repeat": true` num `param`, no máximo um por template. Sai da ordem posicional
  (um param fixo declarado depois, como o `criterion` do `best-of`, colidiria com a
  posição de candidatos extras) e só se preenche por chamada nomeada repetida:
  `[ph-more'C'][ph-more'D']`. Zero chamadas remove a casa da expansão em vez de virar
  `<needs>` — é pluralidade opcional sobre o que os params fixos já garantem, não uma
  casa obrigatória. `best-of` ganhou o param `more` nessas condições; chamada
  posicional de 2 candidatos continua idêntica a antes.

### Alterado

- **`skills/*/SKILL.md`** bumped para `v1.0.9.3`; conteúdo atualizado com o contrato
  de severidade (`fix`/`ask`/`note`), ligação de templates (casas nomeadas,
  posicionais e a casa repetível nova), regras semânticas (`pair`/`order`/
  `precondition`) e o vocabulário `ERROR`/`PROB`.
- **Comentários de código traduzidos para inglês.** `glyph-parser.js` convertido —
  comentários de código, não a tabela de vocabulário, glosas e mensagens de
  diagnóstico, que continuam PT-BR/EN-EU por serem interface, não comentário.
  `test-corpus.js` convertido por inteiro (é ferramenta de desenvolvimento, não
  interface do produto). `glyph-rules.json` e `build-templates.js` conferidos: já
  estavam 100% convertidos.
- `VERSION` em `glyph-parser.js` estava parado em `"1.0.9.1"` mesmo depois da
  `1.0.9.2` ter entregado templates e regras semânticas — bumped para `1.0.9.3`
  junto com esta passagem.

---

## [1.0.9.2] — Templates que expandem, regras semânticas, arquivos separados

### Adicionado

- **Templates deixaram de ser casca.** Até a `1.0.9.1`, `[--nome[…]]` emitia só o que
  estava escrito na chamada: o corpo da definição não entrava, nem na mesma
  mensagem — quem ligava as duas pontas era o leitor humano ou o modelo. Agora o
  motor liga: a definição declara casas com `` [ph-nome`pergunta`] ``; a chamada
  preenche **por nome** (`[ph-nome'valor']`) ou **por posição** (literais soltos, na
  ordem de declaração). Casa não preenchida continua virando `<needs>`. Conteúdo
  extra da chamada entra no fim da expansão.
  - Ciclos diretos e indiretos são interrompidos com a cadeia visível (`TemplateCycle`).
  - Erro de sintaxe no corpo armazenado sobe prefixado com o nome do template.
  - A glosa viaja como `means="…"` no XML.
  - **Store**: `glyph-templates.json` é a fonte de verdade. O navegador abre em
    `file://`, onde `fetch` de `.json` é bloqueado, então `node build-templates.js`
    gera `glyph-data.js` para o `<script src>`. Editou um `.json`, rode o build.
- **Regras semânticas — o critério que faltava.** `glyph-rules.json`, esquema 2. Três
  tipos de regra, com **classes** (`@thinking`, `@subject`, `@condition`) e, em cada
  uma, o **reparo sugerido** — não só a queixa.

  | tipo | dispara quando |
  |---|---|
  | `pair` | dois comandos caem no mesmo alvo (irmãos, ou um ancestral do outro) |
  | `order` | `then` aparece antes de `first` entre irmãos |
  | `precondition` | `target` não é precedido por nenhum dos `requiresBefore` |

  Isenção sob `[ovr]` / `[byp]`: ali a sobreposição foi pedida de propósito. Revisão
  do operador sobre a base `1.0.9.1`: `req + dont` desceu de `fix` para `ask` (é
  redundância enfática, não incoerência — reparo `prio + dont`), e `hyp + assm` saiu
  de "não é contradição" para tensão com pré-condição de sujeito.
- **Seis compostos na biblioteca**: `scientific-review`, `reinforce`, `insight`,
  `fertilize`, `best-of`, `track` — somando-se a `germinate`. A tabela de regras
  pegou dois erros de modelagem nos corpos enquanto eram escritos (`gen`+`elab` e
  `[alt]` com um item só), o que é o melhor argumento disponível a favor dela.
  **Limitação conhecida**: `best-of` fixava dois candidatos, porque `[cmp]` exige
  aridade 2 e o conteúdo extra da chamada entra no fim da expansão, não dentro do
  `[cmp]` — resolvido em `1.0.9.3`.

### Alterado

- **Arquivos separados.** O HTML tinha 1.014 linhas misturando estilo, dados e
  comportamento; agora:

  | arquivo | linhas | papel |
  |---|---|---|
  | `glyph-engine-alias.html` | **85** | só marcação e 4 `<script>` |
  | `glyph-engine.css` | 274 | apresentação |
  | `glyph-moldes.js` | 110 | dados: MOLDES, EXTRAS, PRESETS |
  | `glyph-ui.js` | 563 | app |
  | `glyph-parser.js` | 1.555 | núcleo: léxico, parser, regras, XML |
- **Regra de idioma formalizada.** Conversa em pt-BR; código, comentários,
  identificadores e dados de regra em inglês. Mensagens de diagnóstico são interface
  (o app tem alternância PT-BR / EN-EU) e seguem em português. `glyph-rules.json` e
  `build-templates.js` já convertidos nesta versão; `glyph-parser.js` e a suíte
  ficaram devendo até `1.0.9.3`.

### Testes

- Suíte cresceu para **95 casos**: novos baldes **Templates** (10) e **Regras**
  (15), mais o balde **Guarda** — todo o corpus positivo re-executado com os stores
  carregados, exigindo zero `fix`. Sem ele, uma regra nova poderia transformar uso
  normal em erro sem a suíte notar.

### Pendências conhecidas (fechadas em [1.0.9.3](#1093--pendências-fechadas))

- `ERROR` e `PROB` em `expansoes.txt` derivados no DAG mas nunca registrados em `INSTR`.
- `glyph-grammar.ebnf` divergindo da implementação quanto a `;` e `;;`.
- `skills/*/SKILL.md` ainda anunciando v1.8.
- `best-of` limitado a dois candidatos.
- Comentários de `glyph-parser.js` e da suíte ainda em português.
- Cache de `file://` não invalidando `<script src>` ao editar.

---

## [1.0.9.1] — Blocos longos

Revisão pedida sobre a query `better_logic_constraints`, cujo próprio `[intn]` dizia:
*"foresee semantics and logic problems when the user writes a long glyph query"*. A
engine não previa nada — devolvia `diagnostics: []` e quebrava.

### Causa raiz

Em Glyph, todo `[` sem `]` entra dentro do anterior. Uma query longa não fica larga,
fica **funda**. Três consequências, todas medidas antes de corrigir:

1. **A indentação era O(profundidade²).** `pad(d)` emitia `2×d` espaços por linha, e
   a profundidade crescia com o tamanho da query — numa ferramenta cujo rodapé diz
   "xml pra colar no chat":

   | profundidade | XML antes | XML depois |
   |---|---|---|
   | 100 | 23 KB | 7,5 KB |
   | 500 | 518 KB | 38 KB |
   | 1000 | **2 MB** | 77 KB |
   | 8000 | estourava | 616 KB |

   Corrigido com teto de recuo em `LIMITS.indent = 12`; a estrutura continua legível
   pelas tags.
2. **Os emissores recursivos estouravam a pilha.** `buildXml` morria com `RangeError`
   a partir de ~2000 níveis; `serializeAST`, a partir de ~1000 (`parse` sobrevivia por
   já ser iterativo). `emit`, `walk`, `collect` e `astNode` agora usam pilha explícita
   — `emit` empilha as linhas de fechamento num frame `tail`, para saírem depois dos
   filhos. Caso à parte: mesmo com a AST construída iterativamente, `JSON.stringify`
   do V8 recursa internamente e estoura — como a AST é painel de inspeção e o
   entregável é o XML, ela trunca em `LIMITS.astDepth = 200` com marcador explícito
   (`{"type":"Truncated","omittedNodes":N}` + `truncatedNodes` na raiz). **O XML não
   tem teto.**
3. **O bloco `r-` descartava todo o conteúdo.** `collect()` só coletava nomes de
   comando; o retorno saía como
   `<user-expectative expects="target,skeptic,criticize,scrutinize"/>` e o texto
   `user command blocks` evaporava. Agora `expects` continua sendo o sumário
   achatado, mas o corpo real viaja junto.

### Adicionado

| code | severidade | dispara quando |
|---|---|---|
| `DeepNesting` | `note` | ≥ 10 níveis; mostra a cadeia e lembra que `[` sem `]` aninha |
| `MassAutoClose` | `note` | um `;` fecha > 8 comandos de uma vez |
| `LooseCommandWord` | `ask` | palavra solta que existe no vocabulário, escrita sem `[` |

`LooseCommandWord` veio direto da query original: o `rd` do segundo bloco estava no
vocabulário como tag de sessão ("ler"), mas foi escrito sem colchete e virou
`<off>rd</off>` — prosa inerte, sem aviso. Os limiares de profundidade ficam acima do
que a query original escrevia, de propósito, para não virar ruído.

### Testes

Novo balde **L** com 8 casos, incluindo teto de bytes do XML (pega a volta da
indentação quadrática), truncamento marcado da AST, e um caso de falso positivo para
`LooseCommandWord`. Total: **50 casos**.

---

## [1.0.9.0] — Unificação do Pipeline

Data de lançamento: **2026-08-08**

Tema da versão: **uma implementação só**. A cadeia `humano → glifo → xml → máquina`
existia inteira apenas dentro do navegador; fora dele parava no JSON.

### O diagnóstico que motivou a versão

A v1.8 tinha **dois parsers divergentes**:

| | `glyph-parser.js` (v1.8) | engine embutido no HTML |
|---|---|---|
| Emite AST JSON | ✓ | — |
| Emite XML | ✗ (o cabeçalho prometia, o módulo não exportava) | ✓ |
| Roda fora do navegador | ✓ | ✗ |
| Trata texto livre, cadeias, `[logic]`, `;;` | ✗ | ✓ |

O módulo standalone tratava apenas 6 das 16 classes de token; as outras eram
**descartadas em silêncio** — sem erro, sem diagnóstico:

| Entrada | AST v1.8 | AST 1.0.9.0 |
|---|---|---|
| `[REV-IMPR-FMT]` | só `CRIT` | `CRIT` + `IMPR` + `FMT` |
| `[INS] escreva isto` | texto perdido | `<off>escreva isto</off>` |
| `[logic]hp = 3d6kh2[/logic]` | `segments: []` | bloco `<logic>` completo |
| `[SUM];;[LIM]` | 1 segmento | 2 blocos + `<break/>` |

A suíte de testes também não conseguia falhar: `test-corpus.js` da v1.8 incrementava
`negPassed++` nos três ramos — inclusive no `catch` e no ramo "nenhum erro
encontrado". O placar `9/9` era verdade por construção. Os positivos só checavam
`segments.length > 0`, então `P-06` (cadeia) passava com dois terços da AST faltando.
Os diagnósticos prometidos também não conferiam: `N-01` reportava `UnknownCommand` em
vez de erro de aridade, e `N-06` ("template inexistente") reportava
`UnmatchedCloseBracket`.

### Adicionado

- **`glyph-parser.js` — núcleo único** (UMD, 1144 linhas). Vocabulário, lexer, bloco
  `[logic]`, parser e **emissor XML** num só módulo, que roda em Node (`require`) e
  no navegador (`window.GlyphCore`).

  ```bash
  node glyph-parser.js "[crit[ctx'parser']]" --xml
  node glyph-parser.js "[gt'A']" --diag
  node glyph-parser.js "[sum]" --ast
  ```

  - `toXML(src)` — a cadeia inteira em uma chamada.
  - `serializeAST(segments, gaps)` / `toAST(src)` — AST limpa, sem ciclos.
  - Diagnósticos ganham `code` tipado e `plain` (texto sem HTML, para CLI).
- **Aridade posicional de verdade (`SLOTS`)**. `ASSINATURAS.md` §3 exigia 2
  argumentos para as comparações prefixas, `[DFN]` e `[VAL]` — o engine nunca
  checou. `[gt'A']`, `[DFN'símbolo']` e `[VAL'alvo']` passavam sem um único
  diagnóstico; agora cada posição vazia viaja no XML:

  ```xml
  <greater-than>
    <user-input>A</user-input>
    <needs slot="2">o segundo termo</needs>
  </greater-than>
  ```

  `SECTION` e `BLOCK` entraram em `FRAMES` e passaram a exigir nome literal
  (`MissingStructName`), casando com a aridade mínima que `ASSINATURAS.md` já lhes
  dava.

### Corrigido

1. **`sync is not defined`** — o bootstrap do HTML chamava uma função inexistente e
   morria antes de `window.__glyph`. O painel de XML nascia vazio a cada
   carregamento. Era `rebuild()`.
2. **Painel de AST estourava** — `JSON.stringify` sobre os nós crus fecha ciclo em
   `parent`. O "trunfo do Glyph" da v1.8 nunca renderizou no navegador; o erro
   estava mascarado pelo bug do `sync`.
3. **`4d6kh3` vazava `kh3`** como variável indefinida — `freeVars` removia a rolagem
   mas deixava o sufixo `kh`/`kl` para trás, poluindo o XML com um
   `<needs var="kh3">` falso.

### Alterado

- **`glyph-engine-alias.html` — agora consumidor** (1907 → 1007 linhas). 894 linhas
  de duplicação removidas; o HTML mantém só o que é interface (`MOLDES`, `colorize`,
  `renderLit` e o app). Requer `glyph-parser.js` na mesma pasta.
- **Renomeações de diagnóstico.** `ArityError` era um nome mentiroso: `[SUM]` sem
  alvo o disparava, mas casa vazia **não é erro** neste desenho — vira `<needs>`. A
  severidade é o contrato:

  | severidade | significado |
  |---|---|
  | `fix` | sintaxe ou vocabulário quebrado; o XML não é confiável |
  | `ask` | falta informação; vira `<needs>` e **não bloqueia** |
  | `note` | aviso |

  `ArityError` → `UnfilledSlot` · `ArityWarning` → `SingletonList` · novo
  `MissingOperand`.

### Testes

Suíte nova — **42 casos, 4 baldes, sai com exit code**:

| balde | casos | critério |
|---|---|---|
| **P** positivos | 20 | parseiam com zero diagnósticos `fix` |
| **I** incompletos | 6 | produzem o `code` esperado, viram `<needs>`, não bloqueiam |
| **N** inválidos | 11 | produzem o `code` esperado com severidade `fix` |
| **R** regressões | 5 | os buracos da v1.8, travados contra volta |

A separação **incompleto ≠ inválido** é nova: a v1.8 amontoava as duas coisas em
"negativo", contra o próprio princípio de "casa vazia não bloqueia". Três casos que a
v1.8 listava como positivos foram reclassificados: `P-09`, `P-11` e `P-12` usam
`FAIL`, `ERROR` e `ABREV`, que não existiam no vocabulário — produzem `<unresolved>`.
