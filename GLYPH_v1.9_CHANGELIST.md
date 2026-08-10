# Glyph v1.8 → v1.9 — Unificação do Pipeline

Data de lançamento: **2026-08-08**

Tema da versão: **uma implementação só**. A cadeia `humano → glifo → xml → máquina`
existia inteira apenas dentro do navegador; fora dele parava no JSON.

---

## 🔴 O diagnóstico que motivou a versão

A v1.8 tinha **dois parsers divergentes**:

| | `glyph-parser.js` (v1.8) | engine embutido no HTML |
|---|---|---|
| Emite AST JSON | ✓ | — |
| Emite XML | ✗ (o cabeçalho prometia, o módulo não exportava) | ✓ |
| Roda fora do navegador | ✓ | ✗ |
| Trata texto livre, cadeias, `[logic]`, `;;` | ✗ | ✓ |

O módulo standalone tratava apenas 6 das 16 classes de token. As outras eram
**descartadas em silêncio** — sem erro, sem diagnóstico:

| Entrada | AST v1.8 | AST v1.9 |
|---|---|---|
| `[REV-IMPR-FMT]` | só `CRIT` | `CRIT` + `IMPR` + `FMT` |
| `[INS] escreva isto` | texto perdido | `<off>escreva isto</off>` |
| `[logic]hp = 3d6kh2[/logic]` | `segments: []` | bloco `<logic>` completo |
| `[SUM];;[LIM]` | 1 segmento | 2 blocos + `<break/>` |

## 🧪 A suíte de testes não conseguia falhar

`test-corpus.js` v1.8 incrementava `negPassed++` nos **três** ramos — inclusive no
`catch` e no ramo "nenhum erro encontrado". O placar `9/9` era verdade por
construção. Os positivos só checavam `segments.length > 0`, então `P-06`
(cadeia) passava com dois terços da AST faltando.

Os diagnósticos prometidos também não conferiam: `N-01` reportava
`UnknownCommand` em vez de erro de aridade, e `N-06` ("template inexistente")
reportava `UnmatchedCloseBracket`.

---

## ✅ O que a v1.9 entrega

### `glyph-parser.js` — núcleo único (UMD, 1144 linhas)

Vocabulário, lexer, bloco `[logic]`, parser e **emissor XML** num só módulo, que
roda em Node (`require`) e no navegador (`window.GlyphCore`).

```bash
node glyph-parser.js "[crit[ctx'parser']]" --xml
node glyph-parser.js "[gt'A']" --diag
node glyph-parser.js "[sum]" --ast
```

- `toXML(src)` — a cadeia inteira em uma chamada.
- `serializeAST(segments, gaps)` / `toAST(src)` — AST limpa, sem ciclos.
- Diagnósticos ganham `code` tipado e `plain` (texto sem HTML, para CLI).

### `glyph-engine-alias.html` — agora consumidor (1907 → 1007 linhas)

**894 linhas de duplicação removidas.** O HTML mantém só o que é interface:
`MOLDES`, `colorize`, `renderLit` e o app. Requer `glyph-parser.js` na mesma pasta.

### Aridade posicional de verdade (`SLOTS`)

`ASSINATURAS.md` §3 exigia 2 argumentos para as comparações prefixas, `[DFN]` e
`[VAL]` — **o engine nunca checou**. `[gt'A']`, `[DFN'símbolo']` e `[VAL'alvo']`
passavam sem um único diagnóstico. Agora cada posição vazia viaja no XML:

```xml
<greater-than>
  <user-input>A</user-input>
  <needs slot="2">o segundo termo</needs>
</greater-than>
```

`SECTION` e `BLOCK` entraram em `FRAMES` e passaram a exigir nome literal
(`MissingStructName`), casando com a aridade mínima que `ASSINATURAS.md` já lhes dava.

---

## 🐛 Correções

1. **`sync is not defined`** — o bootstrap do HTML chamava uma função inexistente
   e morria antes de `window.__glyph`. O painel de XML **nascia vazio a cada
   carregamento**. Era `rebuild()`.
2. **Painel de AST estourava** — `JSON.stringify` sobre os nós crus fecha ciclo
   em `parent`. O "trunfo do Glyph" da v1.8 nunca renderizou no navegador; o erro
   estava mascarado pelo `sync`.
3. **`4d6kh3` vazava `kh3`** como variável indefinida — `freeVars` removia a
   rolagem mas deixava o sufixo `kh`/`kl` para trás, poluindo o XML com um
   `<needs var="kh3">` falso.

---

## 📏 Renomeações de diagnóstico

`ArityError` era um nome mentiroso: `[SUM]` sem alvo o disparava, mas casa vazia
**não é erro** neste desenho — vira `<needs>`. A severidade é o contrato:

| severidade | significado |
|---|---|
| `fix` | sintaxe ou vocabulário quebrado; o XML não é confiável |
| `ask` | falta informação; vira `<needs>` e **não bloqueia** |
| `note` | aviso |

`ArityError` → `UnfilledSlot` · `ArityWarning` → `SingletonList` · novo `MissingOperand`.

---

## 🧪 Nova suíte — 42 casos, 4 baldes, sai com exit code

| balde | casos | critério |
|---|---|---|
| **P** positivos | 20 | parseiam com zero diagnósticos `fix` |
| **I** incompletos | 6 | produzem o `code` esperado, viram `<needs>`, não bloqueiam |
| **N** inválidos | 11 | produzem o `code` esperado com severidade `fix` |
| **R** regressões | 5 | os buracos da v1.8, travados contra volta |

A separação **incompleto ≠ inválido** é nova: a v1.8 amontoava as duas coisas em
"negativo", contra o próprio princípio de "casa vazia não bloqueia".

Três casos que a v1.8 listava como **positivos** foram reclassificados: `P-09`,
`P-11` e `P-12` usam `FAIL`, `ERROR` e `ABREV`, que **não existem no
vocabulário** — produzem `<unresolved>`.

---

---

# v1.9.1 — Blocos longos

Revisão pedida sobre a query `better_logic_constraints`, cujo próprio `[intn]`
dizia: *"foresee semantics and logic problems when the user writes a long glyph
query"*. A engine não previa nada — devolvia `diagnostics: []` e quebrava.

## A causa raiz

Em Glyph **todo `[` sem `]` entra dentro do anterior**. Uma query longa não fica
larga, fica **funda**. Três consequências, todas medidas antes de corrigir:

### 1. A indentação era O(profundidade²)

`pad(d)` emitia `2×d` espaços por linha, e a profundidade crescia com o tamanho
da query. Numa ferramenta cujo rodapé diz *"xml pra colar no chat"*:

| profundidade | XML antes | XML depois |
|---|---|---|
| 100 | 23 KB | 7,5 KB |
| 500 | 518 KB | 38 KB |
| 1000 | **2 MB** | 77 KB |
| 8000 | estourava | 616 KB |

Teto de recuo em `LIMITS.indent = 12`. A estrutura continua legível pelas tags.

### 2. Os emissores recursivos estouravam a pilha

`buildXml` morria com `RangeError` a partir de ~2000 níveis; `serializeAST`, a
partir de ~1000. O `parse` sobrevivia porque já era iterativo.

`emit`, `walk`, `collect` e `astNode` agora usam pilha explícita. `emit` empilha
as linhas de fechamento num frame `tail`, para saírem depois dos filhos.

**Caso à parte:** mesmo com a AST construída iterativamente, `JSON.stringify` do
V8 recursa internamente e estoura. Como a AST é painel de inspeção e o
entregável é o XML, a AST trunca em `LIMITS.astDepth = 200` com marcador
explícito (`{"type":"Truncated","omittedNodes":N}` + `truncatedNodes` na raiz).
**O XML não tem teto.**

### 3. O bloco `r-` descartava todo o conteúdo

`collect()` só coletava nomes de comando. O retorno saía como
`<user-expectative expects="target,skeptic,criticize,scrutinize"/>` — e o texto
`user command blocks` **evaporava**. Agora `expects` continua sendo o sumário
achatado, mas o corpo real viaja junto.

## Diagnósticos novos

| code | sev | dispara quando |
|---|---|---|
| `DeepNesting` | note | ≥ 10 níveis; mostra a cadeia e lembra que `[` sem `]` aninha |
| `MassAutoClose` | note | um `;` fecha > 8 comandos de uma vez |
| `LooseCommandWord` | ask | palavra solta que existe no vocabulário, escrita sem `[` |

O terceiro veio direto da sua query: o `rd` do segundo bloco estava no
vocabulário como tag de sessão ("ler"), mas foi escrito sem colchete e virou
`<off>rd</off>` — prosa inerte, sem aviso. É a única coisa que a engine passou a
sinalizar na sua query; os limiares de profundidade ficam acima do que você
escreveu, de propósito, para não virar ruído.

## Suíte

Novo balde **L** com 8 casos, incluindo teto de bytes do XML (pega a volta da
indentação quadrática), truncamento marcado da AST, e um caso de **falso
positivo** para `LooseCommandWord`. Total: **50 casos**.

---

# v1.9.2 — Templates que expandem, regras semânticas, arquivos separados

## 📐 Regra de idioma

Conversa em pt-BR; **código, comentários, identificadores e dados de regra em
inglês**. Mensagens de diagnóstico são interface (o app tem alternância
PT-BR / EN-EU) e seguem em português. `glyph-rules.json` e
`build-templates.js` já convertidos; `glyph-parser.js` e a suíte ficam devendo.

## 🌱 Templates deixaram de ser casca

Até a v1.9.1 `[--nome[…]]` emitia só o que estava escrito na chamada: o corpo da
definição não entrava, **nem na mesma mensagem**. Quem ligava as duas pontas era
o leitor humano ou o modelo — o motor só transportava dois elementos soltos.

Agora o motor liga. A definição declara casas com `` [ph-nome`pergunta`] ``; a
chamada preenche **por nome** (`[ph-nome'valor']`) ou **por posição** (literais
soltos, na ordem de declaração). Casa não preenchida continua virando `<needs>`.
Conteúdo extra da chamada entra no fim da expansão.

- Ciclos diretos e indiretos são interrompidos com a cadeia visível (`TemplateCycle`).
- Erro de sintaxe no corpo armazenado sobe prefixado com o nome do template.
- A glosa viaja como `means="…"` no XML.

**Store**: `glyph-templates.json` é a fonte de verdade. O navegador abre em
`file://`, onde `fetch` de `.json` é bloqueado, então `node build-templates.js`
gera `glyph-data.js` para o `<script src>`. **Editou um `.json`, rode o build.**

## 🧠 Regras semânticas — o critério que faltava

`glyph-rules.json`, esquema 2. Três tipos de regra, com **classes** (`@thinking`,
`@subject`, `@condition`) e, em cada uma, o **reparo sugerido** — não só a queixa.

| tipo | dispara quando |
|---|---|
| `pair` | dois comandos caem no mesmo alvo (irmãos, ou um ancestral do outro) |
| `order` | `then` aparece antes de `first` entre irmãos |
| `precondition` | `target` não é precedido por nenhum dos `requiresBefore` |

Isenção sob `[ovr]` / `[byp]`: ali a sobreposição foi pedida de propósito.

Revisão do operador sobre a base v1.9.1: `req + dont` desceu de `fix` para `ask`
(é redundância enfática, não incoerência — reparo `prio + dont`), e `hyp + assm`
saiu de "não é contradição" para tensão com pré-condição de sujeito.

## 🧩 Seis compostos na biblioteca

`scientific-review`, `reinforce`, `insight`, `fertilize`, `best-of`, `track` —
somando-se a `germinate`. A tabela de regras pegou dois erros de modelagem nos
corpos enquanto eram escritos (`gen`+`elab` e `[alt]` com um item só), o que é o
melhor argumento disponível a favor dela.

**Limitação conhecida**: `best-of` fixa dois candidatos, porque `[cmp]` exige
aridade 2 e o conteúdo extra da chamada entra no fim da expansão, não dentro do
`[cmp]`. Suportar n candidatos pede casa variádica no ligador.

## 🗂️ Arquivos separados

O HTML tinha 1.014 linhas misturando estilo, dados e comportamento.

| arquivo | linhas | papel |
|---|---|---|
| `glyph-engine-alias.html` | **85** | só marcação e 4 `<script>` |
| `glyph-engine.css` | 274 | apresentação |
| `glyph-moldes.js` | 110 | dados: MOLDES, EXTRAS, PRESETS |
| `glyph-ui.js` | 563 | app |
| `glyph-parser.js` | 1.555 | núcleo: léxico, parser, regras, XML |

## 🧪 Suíte: 95 casos

Novos baldes **Templates** (10) e **Regras** (15), mais o balde **Guarda**: todo o
corpus positivo re-executado **com os stores carregados**, exigindo zero `fix`.
Sem ele, uma regra nova poderia transformar uso normal em erro sem a suíte notar.

---

## ⚠️ Pendências conhecidas

- **`ERROR` e `PROB` em `expansoes.txt`** são derivados no DAG (`ERROR = PROB`,
  `PROB = FLS TRYFR`) mas nunca foram registrados em `INSTR`. Decidir se entram
  no vocabulário ou saem do arquivo de expansões.
- **`glyph-grammar.ebnf` diverge da implementação** quanto a `;` e `;;`: a
  gramática declara `segment_break = ";;"` e `auto_close = ";"`, mas o motor (e a
  tabela `PUNCT` da interface) trata `;` como o que fecha o bloco e `;;` como
  quebra visual que **não** fecha. A EBNF precisa acompanhar.
- `skills/*/SKILL.md` ainda anunciam v1.8.
- `best-of` limitado a dois candidatos até o ligador aceitar casa variádica.
- Comentários de `glyph-parser.js` e da suíte ainda em português.
- Cache de `file://` não invalida `<script src>` ao editar: recarregue com bypass de cache ao testar mudanças em JS/CSS.
