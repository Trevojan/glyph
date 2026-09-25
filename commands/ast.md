---
description: Glyph → AST (JSON), a fonte de verdade da qual o XML e o .hgml são projeções
argument-hint: <glyph>
allowed-tools: Bash(node:*)
shell: bash
---
Resposta do motor (`glyph-cli.js --ast`):

```json
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/glyph-plugin.js" --ast <<'GLYPH'
$ARGUMENTS
GLYPH`
```

Mostre o bloco acima ao Regente exatamente como está. Cuidado com o par
homônimo: `depth` é onde o nó está no texto; `compositionDepth` é onde o comando
está no vocabulário. `fonte vazia` quer dizer que o argumento não veio: peça o
Glyph.
