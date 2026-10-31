---
description: O glyph-package (XML) de uma ORD-#### existente, lido do .pgml dela
argument-hint: <ORD-#### | EMS-###/ORD-####>
allowed-tools: Bash(node:*)
shell: bash
---
Resposta do motor (`glyph-cli.js --file <ORD>.pgml --xml`) para a Ordem `$1`,
procurada em `Docs/.guidelines/.orders/` ou `.guidelines/.orders/`, e numa série na
pasta `EMS-###/ORD-####/` dela:

```xml
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/glyph-plugin.js" --from "$1" --xml`
```

Mostre o XML ao Regente exatamente como está: é o artefato que se cola. Numa
série, ele já está na pasta da ORD, ao lado do `.pgml`. Fora dela, para
gravá-lo ao lado do `.pgml`, rode o mesmo comando com `> <pasta>/$1.xml`; só se
o Regente pedir.
