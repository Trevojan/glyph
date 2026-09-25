---
description: Só os diagnósticos — fix recusa, ask pergunta, note observa. Casa vazia não é erro
argument-hint: <glyph>
allowed-tools: Bash(node:*)
shell: bash
---
Resposta do motor (`glyph-cli.js --diag`):

```
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/glyph-plugin.js" --diag <<'GLYPH'
$ARGUMENTS
GLYPH`
```

Leia a severidade antes de qualquer coisa: um `fix` torna o XML não confiável e
é o único que pede correção da fonte; `ask` vira `<needs>` e a fonte segue
usável; `note` é forma. Repasse os diagnósticos ao Regente como estão, e se
houver `ask`, as perguntas que eles carregam são o formulário — faça-as numa
única leva. `fonte vazia` quer dizer que o argumento não veio: peça o Glyph.
