---
description: Diagnósticos de uma ORD-#### existente — fix recusa, ask pergunta, note observa
argument-hint: <ORD-####>
allowed-tools: Bash(node:*)
shell: bash
---
Resposta do motor (`glyph-cli.js --file <ORD>.pgml --diag`) para a Ordem `$1`,
procurada em `Docs/.guidelines/.orders/` ou `.guidelines/.orders/`:

```
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/glyph-plugin.js" --from "$1" --diag`
```

Repasse os diagnósticos ao Regente como estão. Um `fix` quer dizer que o `.pgml`
— a única projeção escrita à mão — tem de mudar; `ask` é casa vazia que viaja
como `<needs>`, de propósito. `não existe` quer dizer que o número não está na
pasta: liste o que há e pergunte.
