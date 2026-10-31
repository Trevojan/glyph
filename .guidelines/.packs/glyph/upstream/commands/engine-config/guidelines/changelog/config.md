---
description: Viaja até .changelog/ do próprio repositório do Glyph e deixa o motor perguntar o que muda ali
argument-hint: [glyph]
allowed-tools: Bash(node:*), Bash(ls:*), Bash(sed:*), Read, Glob, Grep
shell: bash
---
## Onde estamos

O eixo `.changelog/` do repositório do motor, `${CLAUDE_PLUGIN_ROOT}/.guidelines/`:

```
!`ls -1 "${CLAUDE_PLUGIN_ROOT}/.guidelines/.changelog"`
```

## O que o eixo diz de si

```markdown
!`sed -n '1,40p' "${CLAUDE_PLUGIN_ROOT}/.guidelines/.changelog/README.md"`
```

## O que o motor pergunta

O Glyph do Regente, se veio como argumento; senão, a sonda do eixo, cujas casas
vazias são as perguntas:

```
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/glyph-plugin.js" --root "${CLAUDE_PLUGIN_ROOT}" --diag --fallback "[block'config'[ctx'.changelog','glyph/.guidelines/.changelog/'][section'change'[tgt][ins][rtnl][cnst]]]" <<'GLYPH'
$ARGUMENTS
GLYPH`
```

---

Os `ask` acima são o formulário. Faça-os ao Regente numa única leva — um
pop-up com todas as dúvidas — e não altere nada em `.changelog/` antes de ter
as respostas. Este eixo é o do motor: a versão `a.b.c.d` move-se pela regra
que ele mesmo declara, e um dígito que anda zera os da direita. Mostre o que
existe; marque a lacuna; nunca preencha por inferência.
