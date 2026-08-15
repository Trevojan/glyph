# Glyph

Notação de comandos abreviados que descreve um fluxo lógico até os mínimos
detalhes. Você escreve `[crit'o parser'][ctx'api/pedidos.py']`, o motor devolve
XML estruturado para colar num chat.

O princípio do desenho: **casa vazia não bloqueia.** Falta de informação vira
`<needs>` no XML em vez de erro — mande incompleto, volte preenchido.

---

## Rodar

### O app — sem instalar nada

**Dê duplo clique em `glyph-engine-alias.html`.** É só isso. Ele foi feito para
abrir por `file://`, sem servidor e sem build: os dados já vêm embutidos em
`scripts/glyph-data.js` justamente porque `file://` bloqueia `fetch` de `.json`.

Precisa apenas de um navegador.

> Se a página abrir em branco, veja **Depois de editar** abaixo — quase sempre
> é cache. Se ainda assim falhar, use o servidor de desenvolvimento.

### A linha de comando — precisa de Node

```bash
node scripts/glyph-parser.js "[crit[ctx'o parser']]" --xml
```

Modos: `--xml` (padrão, o entregável) · `--ast` (painel de inspeção JSON) ·
`--diag` (só os diagnósticos) · `--hgml` (a queima atômica) · `--expand` (do que
um comando é feito).

### `.hgml` — a queima atômica

Reduz tudo a hieróglifos puros: cada composto trocado pela sua fórmula, até não
sobrar nada que decomponha.

```bash
node scripts/glyph-parser.js "[prob'timeout']" --hgml
```
```
[error
  'timeout'
  [ctx[/ctx]
[/error]
```

É **expansão, não compressão** — um composto vale ~15 hieróglifos e `[hyp]`
chega a 97. A saída continua sendo Glyph válido, então pode ser reprocessada.

```bash
node scripts/glyph-parser.js CRIT --expand
```
```
CRIT  [composite]  nível 2
  fórmula: [CMP[CTX],[SPEC-CORE],[EVAL[ERROR]]]
  15 hieróglifos: CMP CTX SPEC CORE REAL CORE CTX DIST SKL REF DEF SPEC CORE CTX ERROR
```

### O servidor de desenvolvimento

Útil quando o cache do `file://` atrapalha, ou para abrir de outro aparelho na
mesma rede:

```bash
node scripts/serve-dev.js
```

Abre em `http://localhost:8731`. Nada no app depende dele.

---

## Depois de editar

**Mexeu num `.js`?** O `file://` não revalida `<script src>` ao editar. Suba o
`GLYPH_ASSET_VERSION` no topo de `glyph-engine-alias.html` e recarregue — é o
que existe para furar o cache.

**Mexeu em `glyph-rules.json`, `glyph-templates.json` ou `expansoes.txt`?**
Rode o build. Os `.json` e o `.txt` são a fonte; `scripts/glyph-data.js` é a
cópia que o navegador consegue carregar.

```bash
node scripts/build-templates.js
```

---

## Verificar

```bash
node scripts/test-corpus.js     # suíte — 137 casos
node scripts/dag.js             # tabela de composição — 0 ciclos, 0 indefinidos
```

Os dois saem com código diferente de zero quando falham, então servem em CI.

---

## Onde está o quê

`/scripts` guarda **JavaScript**; dados, o app e os documentos ficam na raiz. O
critério é o tipo do arquivo, não quem o escreveu — por isso o gerado
`glyph-data.js` (JS) fica em `/scripts` e o gerado `glyph-expansions.json`
(dados) fica na raiz, junto dos outros stores.

| arquivo | papel |
|---|---|
| `glyph-engine-alias.html` + `glyph-engine.css` | o app — só interface |
| `scripts/glyph-parser.js` | o núcleo: lexer, árvore, regras, emissores |
| `scripts/glyph-ui.js` · `glyph-moldes.js` | interface e formulários |
| `glyph-rules.json` · `glyph-templates.json` | stores de dados, editáveis à mão |
| `expansoes.txt` | tabela de composição: átomos e fórmulas |
| `scripts/glyph-data.js` · `glyph-expansions.json` | **gerados** — não edite |

## Documentação

| documento | responde |
|---|---|
| [`GLOSSARIO.md`](GLOSSARIO.md) | **o que** cada comando é — a referência normativa |
| [`ASSINATURAS.md`](ASSINATURAS.md) | **quantos** operandos cada um pede |
| [`glyph-grammar.ebnf`](glyph-grammar.ebnf) | a sintaxe, formalmente |
| [`CHANGELOG.md`](CHANGELOG.md) | o que mudou e por quê |
| [`HGML_PLAN.md`](HGML_PLAN.md) | para onde isto vai — o formato `.hgml` |

O motor deriva do `GLOSSARIO.md`, não o contrário, e a suíte tem uma checagem
(`X-01`) que falha se os dois divergirem.

## Versionamento — `a.b.c.d`

`a` frontend · `b` backend (o parser) · `c` business rules · `d` dados e
constantes. Um dígito que anda zera todos à direita.
