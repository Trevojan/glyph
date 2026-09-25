---
description: Emite a próxima ORD-#### a partir do Glyph dado — numa série EMS-###/, ou chapada em .orders/ — mede primeiro, escreve só depois do Regente
argument-hint: <glyph>
allowed-tools: Bash(node:*), Bash(ls:*), Bash(sed:*), Read
shell: bash
---
## O que já existe em .orders/

```
!`ls -1 Docs/.guidelines/.orders .guidelines/.orders 2>/dev/null || true`
```

## As séries

Cada `EMS-###/` guarda a spec da série, o `README.md` dela e uma pasta por ORD:

```
!`ls -1d Docs/.guidelines/.orders/EMS-*/* .guidelines/.orders/EMS-*/* 2>/dev/null || true`
```

## A Ordem aberta hoje

Uma linha, ou nenhuma, somadas todas as séries. Se houver duas, uma delas está
errada. Vazio só significa "nenhuma" quando o `README.md` de cada série aparece
na lista acima; sem ele, a série não tem registro, e a Ordem aberta dela não se
lê daqui:

```markdown
!`sed -n '/^## A Ordem aberta/,/^## Ordens fechadas/p' Docs/.guidelines/.orders/EMS-*/README.md .guidelines/.orders/EMS-*/README.md Docs/.guidelines/.orders/README.md .guidelines/.orders/README.md 2>/dev/null || true`
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
3. Se não há Ordem aberta e o Regente confirma, emita com o motor, não à mão,
   na pasta da série:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/glyph-plugin.js" --from "<o caminho de fonte: acima>" --bundle --out "<.orders/EMS-###>"
   ```

   Numa série, o número vem das pastas `ORD-####/` dela — a maior, mais um;
   a contagem reinicia em cada série, e a spec, um rascunho ou um ID datado
   não contam — e o resultado é a pasta `ORD-####/` com `.pgml`, `.xml`,
   `.json`, `.hgml` e o manifesto. Sem `--out`, a Ordem sai chapada em
   `.orders/` como `ORD-####.zip` com os mesmos cinco, numerada pelo maior
   `ORD-####` seguido de nada ou de um ponto. Depois, a linha "A Ordem aberta"
   do `README.md` da série é do Regente escrever, não sua.
