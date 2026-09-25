---
description: A queima (.hgml) de uma ORD-#### existente, lida do .pgml dela
argument-hint: <ORD-####>
allowed-tools: Bash(node:*)
shell: bash
---
Resposta do motor (`glyph-cli.js --file <ORD>.pgml --hgml`) para a Ordem `$1`,
procurada em `Docs/.guidelines/.orders/` ou `.guidelines/.orders/`:

```
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/glyph-plugin.js" --from "$1" --hgml`
```

Mostre a queima ao Regente exatamente como está. Ela é derivada da árvore, nunca
anterior a ela — e por isso nunca é a fonte de verdade. Para gravá-la ao lado do
`.pgml`, rode o mesmo comando com `> <pasta>/$1.hgml`; só se o Regente pedir.
