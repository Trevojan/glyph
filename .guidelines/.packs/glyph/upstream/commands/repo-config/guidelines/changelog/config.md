---
description: Viaja até .changelog/ das guidelines deste repositório e deixa o motor perguntar o que muda ali
argument-hint: [glyph]
allowed-tools: Bash(node:*), Bash(ls:*), Bash(sed:*), Read, Glob, Grep
shell: bash
---
## Onde estamos

O eixo `.changelog/` deste repositório — `Docs/.guidelines/` ou `.guidelines/`,
o que existir:

```
!`ls -1 Docs/.guidelines/.changelog .guidelines/.changelog 2>/dev/null || true`
```

Se a lista veio vazia, não há `.changelog/` aqui: a lacuna fica marcada, não
preenchida.

## O que o eixo diz de si

```markdown
!`sed -n '1,40p' Docs/.guidelines/.changelog/README.md .guidelines/.changelog/README.md 2>/dev/null || true`
```

## O que o motor pergunta

O Glyph do Regente, se veio como argumento; senão, a sonda do eixo, cujas casas
vazias são as perguntas:

```
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/glyph-plugin.js" --diag --fallback "[block'config'[ctx'.changelog','Docs/.guidelines/.changelog/'][section'change'[tgt][ins][rtnl][cnst]]]" <<'GLYPH'
$ARGUMENTS
GLYPH`
```

---

Os `ask` acima são o formulário. Faça-os ao Regente numa única leva — um
pop-up com todas as dúvidas — e não altere nada em `.changelog/` antes de ter
as respostas. Mostre o que existe; marque a lacuna; nunca preencha por
inferência. Um `fix` interrompe: a fonte está quebrada, não incompleta.
