---
description: O AST (JSON) de uma ORD-#### existente — a fonte de verdade, lida do .pgml dela
argument-hint: <ORD-#### | EMS-###/ORD-####>
allowed-tools: Bash(node:*)
shell: bash
---
Resposta do motor (`glyph-cli.js --file <ORD>.pgml --ast`) para a Ordem `$1`,
procurada em `Docs/.guidelines/.orders/` ou `.guidelines/.orders/`, e numa série na
pasta `EMS-###/ORD-####/` dela:

```json
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/glyph-plugin.js" --from "$1" --ast`
```

Mostre o AST ao Regente exatamente como está. Para gravá-lo ao lado do `.pgml`,
rode o mesmo comando com `> <pasta>/$1.json`; só se o Regente pedir.
