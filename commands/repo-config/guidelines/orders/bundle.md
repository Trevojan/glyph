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

One line per open Order, across every series: several Orders may be open at once
while none waits on a blocking question (the Regent, 2026-11-22). Vazio só significa "nenhuma" quando o `README.md` de cada série aparece
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
2. **Several Orders may be open at once**, as long as none waits on a blocking
   question (the Regent, 2026-11-22). If this Order waits on a question only the
   Regent can answer, say so and stop.
3. Once the Regent confirms, emit with the engine, not by hand, into the series
   folder:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/glyph-plugin.js" --from "<o caminho de fonte: acima>" --bundle --out "<.orders/EMS-###>"
   ```

   Into a series, the plugin hands the bundle to the installed `glyph` of its own
   version (EMS-002/ORD-0041), which checks the Order's claim — `[ref'EMS']`,
   `[ref'nem']` or `[ref'ORD-####']` — before it writes, and refuses a claim the
   series does not answer; with no such `glyph`, the plugin refuses by name and
   writes nothing: install it with `glyph --install`, or set `GLYPH_BIN`.

   Numa série, o número vem das pastas `ORD-####/` dela — a maior, mais um;
   a contagem reinicia em cada série, e a spec, um rascunho ou um ID datado
   não contam — e o resultado é a pasta `ORD-####/` com `.pgml`, `.xml`,
   `.json`, `.hgml` e o manifesto; com `--zip`, também o `ORD-####.zip` ao
   lado da pasta, só quando pedido. Sem `--out`, a Ordem sai chapada em
   `.orders/` como `ORD-####.zip` com os mesmos cinco, numerada pelo maior
   `ORD-####` seguido de nada ou de um ponto. Depois, a linha "A Ordem aberta"
   do `README.md` da série é do Regente escrever, não sua.
