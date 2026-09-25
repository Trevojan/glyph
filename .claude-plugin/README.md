# O plugin `glyph-markup`

Este repositório **é** o plugin: `.claude-plugin/plugin.json` o declara, e
`commands/` é a árvore de comandos de barra. Ele entra no Claude Code por uma
junção — `~/.claude/skills/glyph-markup` → esta pasta — que o carregador
reconhece como `glyph-markup@skills-dir` sem marketplace nem instalação. O que
se edita aqui vale na sessão seguinte (ou em `/reload-plugins`).

## A árvore

O nome do comando é o caminho: `commands/a/b/c.md` → `/glyph-markup:a:b:c`.

| comando | faz |
|---|---|
| `/glyph-markup:xml` `:ast` `:hgml` `:diag` `<glyph>` | os modos do motor, ao pé da letra, sobre Glyph inline; a resposta volta intacta |
| `/glyph-markup:expand <COMANDO>` | de que um comando é feito — recebe um nome, não fonte |
| `/glyph-markup:repo-config:guidelines:changelog:config [glyph]` | viaja até `.changelog/` do repositório atual e deixa o motor perguntar o que muda |
| `/glyph-markup:engine-config:guidelines:changelog:config [glyph]` | o mesmo, sobre o `.guidelines/` deste repositório |
| `/glyph-markup:repo-config:guidelines:orders:bundle <glyph>` | mede a fonte, mostra a Ordem aberta, e diz como emitir a próxima `ORD-####` — o motor escreve, depois do Regente |
| `/glyph-markup:repo-config:guidelines:orders:diag` `:hgml` `:xml` `:ast <ORD-####>` | os modos sobre uma Ordem que já existe |

`repo-config` procura `Docs/.guidelines/` e depois `.guidelines/` a partir da
pasta do projeto; `engine-config` aponta para `${CLAUDE_PLUGIN_ROOT}/.guidelines/`,
que é este repositório. Os dois eixos além de `changelog`, e o que vai em
`engine-config:<args>`, ainda não existem: a folha `changelog/config.md` é o
molde para quando existirem — copiar, trocar o nome do eixo e a sonda.

## Como uma folha fala com o motor

Uma folha não chama `glyph-cli.js` direto: chama
[`scripts/glyph-plugin.js`](../scripts/glyph-plugin.js), que resolve o que um
comando de barra não consegue — a fonte chega por **stdin** num heredoc
citado, para que aspas, `;` e quebras de linha cheguem intactas; `--from` acha
`ORD-0011` na pasta certa; `--bundle` sem `--out` cai em `.orders/`. O motor
segue intocado.

```
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/glyph-plugin.js" --diag <<'GLYPH'
$ARGUMENTS
GLYPH`
```

Ordem de substituição no Claude Code: `$ARGUMENTS`/`$1` primeiro,
`${CLAUDE_PLUGIN_ROOT}` depois, e só então o `` !`…` `` roda — por isso o
argumento pode entrar no heredoc.

## Dois limites

- **Crase no argumento quebra a folha.** O Claude Code fecha o `` !`…` `` na
  primeira crase, e os moldes usam crase nos buracos (`` [ph-x`pergunta`] ``).
  Glyph com molde entra por arquivo: `--from <caminho>`.
- **`!` depois de espaço vira `\!`** no argumento, por escape do Claude Code.
  `glyph-plugin.js` desfaz; Glyph nunca escreve `\!`.

## O que ainda não é

O pipeline é app → CLI → skill → plugin: uma função que o motor não tem hoje
não ganha folha aqui antes de existir na CLI. A versão do plugin é própria
(`0.1.0`), não a `a.b.c.d` do motor, e `npm run check` não o cobre.
