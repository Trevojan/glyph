---
description: Glyph → glyph-package (XML). A fonte vai como argumento; a resposta do motor volta intacta
argument-hint: <glyph>
allowed-tools: Bash(node:*)
shell: bash
---
Resposta do motor (`glyph-cli.js --xml`):

```xml
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/glyph-plugin.js" --xml <<'GLYPH'
$ARGUMENTS
GLYPH`
```

Mostre o bloco acima ao Regente exatamente como está. `fonte vazia` quer dizer
que o argumento não veio: peça o Glyph. Não conserte, não reformate, não resuma
a resposta do motor — ela é a projeção, e o AST por trás dela é a fonte de
verdade.
