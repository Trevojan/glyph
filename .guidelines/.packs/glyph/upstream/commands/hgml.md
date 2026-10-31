---
description: Glyph → .hgml, a queima — cada composto trocado pela sua fórmula até sobrar só hieróglifo
argument-hint: <glyph>
allowed-tools: Bash(node:*)
shell: bash
---
Resposta do motor (`glyph-cli.js --hgml`):

```
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/glyph-plugin.js" --hgml <<'GLYPH'
$ARGUMENTS
GLYPH`
```

Mostre o bloco acima ao Regente exatamente como está. É expansão, não
compressão: ~15 hieróglifos por composto. `fonte vazia` quer dizer que o
argumento não veio: peça o Glyph. Não conserte nem resuma a queima.
