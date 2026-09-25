---
description: Emite a próxima ORD-#### em .orders/ a partir do Glyph dado — mede primeiro, escreve só depois do Regente
argument-hint: <glyph>
allowed-tools: Bash(node:*), Bash(ls:*), Bash(sed:*), Read
shell: bash
---
## O que já existe em .orders/

```
!`ls -1 Docs/.guidelines/.orders .guidelines/.orders 2>/dev/null || true`
```

## A Ordem aberta hoje

Uma linha, ou nenhuma. Se houver duas, uma delas está errada. Vazio só
significa "nenhuma" quando `README.md` aparece na lista acima; sem ele, não há
registro, e a Ordem aberta não se lê daqui:

```markdown
!`sed -n '/^## A Ordem aberta/,/^## Ordens fechadas/p' Docs/.guidelines/.orders/README.md .guidelines/.orders/README.md 2>/dev/null || true`
```

## O que o motor diz da fonte

A fonte fica guardada no caminho da primeira linha (`fonte:`), para ser
emitida sem passar de novo por um modelo:

```
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/glyph-plugin.js" --keep --diag <<'GLYPH'
$ARGUMENTS
GLYPH`
```

---

1. Um `fix` interrompe: a fonte está quebrada e o `.pgml` é o que se edita.
   `ask` não bloqueia — casa vazia viaja como `<needs>`, de propósito — mas o
   Autor da Ordem tem de saber quais são.
2. **Exatamente uma Ordem aberta por vez.** Se a seção acima mostra uma,
   emitir outra é proibido até ela fechar. Diga isso e pare. Sem registro,
   pergunte ao Regente qual está aberta antes de seguir.
3. Se não há Ordem aberta e o Regente confirma, emita com o motor, não à mão:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/glyph-plugin.js" --from "<o caminho de fonte: acima>" --bundle
   ```

   O número vem da pasta — a maior `ORD-####` que já existe, mais um, e um
   rascunho `ORD-####.pgml` deixado ali conta como emitido — e o
   resultado é `ORD-####.zip` com `.pgml`, `.xml`, `.json`, `.hgml` e o
   manifesto. Depois, a linha "A Ordem aberta" do README de `.orders/` é do
   Regente escrever, não sua.
