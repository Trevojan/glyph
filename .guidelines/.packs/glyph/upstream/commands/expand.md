---
description: De que um comando é feito — espécie, nível, fórmula e hieróglifos. Recebe um NOME (CRIT), não fonte
argument-hint: <COMANDO>
allowed-tools: Bash(node:*)
shell: bash
---
Resposta do motor (`glyph-cli.js --expand`):

```
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/glyph-plugin.js" --expand <<'GLYPH'
$ARGUMENTS
GLYPH`
```

Mostre o bloco acima ao Regente exatamente como está. `fora da tabela de
composição` quer dizer que o nome não existe no vocabulário, ou que veio fonte
em vez de nome: este comando responde "de que isto é feito", e só isso.
