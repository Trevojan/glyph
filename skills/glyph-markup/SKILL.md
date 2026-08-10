---
name: glyph-markup
description: Glyph Shorthand Markup Language v1.9.2 Specification & Parser Integration. Use when writing or reading Glyph compact structured notation.
---

# Glyph Shorthand Markup Language (v1.9.2 Specification)

Glyph é uma notação de comandos abreviados, entre delimitadores, que descreve um fluxo lógico escalável até os mínimos detalhes. A implementação de referência é `glyph-parser.js`: um núcleo único (Node via `require`, navegador via `window.GlyphCore`) que faz lexer, parser, checagem de aridade, regras semânticas e emissão de **XML** — o XML é o entregável, não a AST (que é só painel de inspeção).

## Regras Normativas

1. **Delimitadores de Emoção**: Emoções usam exclusivamente slashes `/`: `/eth/`, `/cnf/`, `/clm/`. O uso de backslashes `\` foi totalmente removido.
2. **Operador de Encadamento**: Encadear comandos é feito **exclusivamente por hífen `-`**: `[CMD1-CMD2-CMD3]`. O antigo operador `/` divisor foi removido.
3. **Definição de Símbolos**: `[DFN'símbolo','significado']` define novos símbolos. `[DEF]` é reservado para valor padrão (default).
4. **Operadores de Comparação Prefixos**: Comparações usam forma prefixa de 2 argumentos: `[gt'A','B']`, `[gte'A','B']`, `[lt'A','B']`, `[lte'A','B']`, `[eq'A','B']`, `[neq'A','B']`.
5. **Invocação de Templates**: Invocação de template usa `[--nome` ou `[--nome'parâmetro']`. Definição usa `[--nome=...`.
6. **Fechamento de bloco (`;`) vs quebra visual (`;;`)**: `;` fecha todos os comandos abertos e encerra o segmento — só auto-fecha um comando se a aridade mínima dele já estiver satisfeita. `;;` **não fecha nada**: só divide a resposta em duas, os comandos abertos continuam abertos (o parser avisa com `LinebreakInsideBlock` se isso acontecer sem querer).

## Severidade dos diagnósticos — o contrato

Casa vazia **não é erro** neste desenho:

| severidade | significado | efeito no XML |
|---|---|---|
| `fix` | sintaxe ou vocabulário quebrado | o XML não é confiável |
| `ask` | falta informação | vira `<needs>`, **não bloqueia** — mande incompleto |
| `note` | aviso | não bloqueia |

## Templates que expandem

`[--nome=corpo]` define; `[--nome[...]]` invoca **e expande** — o corpo da definição entra na mensagem, não só a casca da chamada. O corpo declara casas com `` [ph-nome`pergunta`] ``; a chamada preenche por nome (`[ph-nome'valor']`) ou por posição (literais soltos, na ordem de declaração em `params`). Casa não preenchida vira `<needs>`. Um `param` pode ser marcado `"repeat": true` (no máximo um por template): essa casa não entra na ordem posicional e só se preenche por chamada nomeada repetida (`[ph-mais'A'][ph-mais'B']`), virando um nó a mais por ocorrência; zero chamadas remove a casa da expansão em vez de virar `<needs>`. Ciclos diretos e indiretos são barrados (`TemplateCycle`).

## Regras semânticas

Além da sintaxe, `glyph-rules.json` checa **coerência**: `pair` (dois comandos no mesmo alvo — irmãos ou um ancestral do outro), `order` (`then` antes de `first` entre irmãos) e `precondition` (alvo sem nenhum dos `requiresBefore` antes dele na mesma sentença). Sob `[ovr]` ou `[byp]` a sobreposição é isenta — foi pedida de propósito.

## Tabela de Aliases

- `[EVAL]` e `[REV]` resolvem para `[CRIT]`
- `[ONLYIF]` resolve para `[COND]`
- `[SPEC]` resolve para `[ELAB]`
- `[SIMP]` resolve para `[CLAR]`
- `[FOREX]` resolve para `[EX]`
- `[QST]` resolve para `[ASK]`

## Estrutura de Slots de Contexto (`[CTX]`)

`[ctx'what','where','when']` aceita 3 slots posicionais opcionais:
1. `what`: O assunto ou entidade principal.
2. `where`: O arquivo, módulo ou escopo.
3. `when`: A versão ou condição temporal.

## Arquivos da implementação

`glyph-parser.js` é o núcleo único; `glyph-rules.json` e `glyph-templates.json` são os stores de dados (fonte de verdade — editar o `.json` e rodar `node build-templates.js` para regenerar `glyph-data.js`, já que `file://` bloqueia `fetch` de `.json`); `glyph-engine-alias.html` + `glyph-engine.css` + `glyph-moldes.js` + `glyph-ui.js` são só a interface, consumidora do núcleo.
