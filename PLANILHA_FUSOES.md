# Planilha de fusões — as 12 casas com mais de um comando

Objetivo: para cada casa, decidir **um sobrevivente canônico** e transformar os outros em alias.
Nada é removido. Alias continua sendo aceito ao digitar; o motor emite o canônico.

## Como preencher

Para cada par, responda três perguntas. Escreva a resposta, não só sim/não — é a escrita que
revela quando você está racionalizando.

**P1 — Consequência.** Escreva a frase inteira que cada comando gera. Se as duas frases pedem a
mesma coisa ao leitor, **falha** → fundir.

**P2 — Decidibilidade no ato.** Você sabe qual usar *no momento de digitar*, sem parar? Se hesita,
**falha** → fundir. Esta é a única pergunta que só você pode responder.

**P3 — Não-recuperabilidade.** A diferença já está no argumento que você passa de qualquer jeito?
Se está, **falha** → fundir.

**Regra:** falhou em qualquer uma → fundir. Passou nas três → manter as duas, e escrever o
critério de diferença na documentação (se não conseguir escrever, é porque falhou em P2).

Ao decidir uma fusão, a ação é **uma linha** em `ALIAS`:
```js
ALIAS = { ..., PERDEDOR:"VENCEDOR" }
```
`ALIAS` é consultada antes de `INSTR` no `classify()`, então a fusão vale imediatamente e o
comando continua parseando. Verificado: a suíte de 11 seções passa sem alteração.

---

## Casa 1 — DIR + Evaluation (4 comandos)

`[crit]` criticar · `[eval]` avaliar · `[rev]` revisar · `[val]` validar

| | P1 consequência | P2 decide no ato? | P3 já está no arg? | veredito |
|---|---|---|---|---|
| `[crit]` vs `[eval]` | "aponte os defeitos" / "dê um veredito de valor" | ✗ hesita — ambos pedem julgamento | ✗ o argumento é o mesmo (`[crit'X']` / `[eval'X']`) | **FUNDIR** `EVAL:"CRIT"` |
| `[eval]` vs `[rev]` | "julgue o valor" / "percorra e comente" | ✗ hesita | ✗ "percorrer" é o método, não o resultado | **FUNDIR** `REV:"CRIT"` |
| `[val]` vs os três | "verifique contra **este critério externo**" / os outros não exigem critério | ✓ sabe no ato: tem critério? `[val]` | ✓ o critério é o parâmetro (P3 passa) | **MANTER** |

> Resultado: **`[crit]` e `[val]` sobrevivem**. `[eval]` e `[rev]` viram alias de `[crit]`.
> Critério documentável: `[val]` exige critério externo como parâmetro; `[crit]` não.
> Aliases: `EVAL:"CRIT"`, `REV:"CRIT"`

## Casa 2 — ASS + Background (4 comandos)

`[assm]` suposição · `[ctx]` contexto · `[hyp]` hipótese · `[ref]` referência

| | P1 consequência | P2 decide no ato? | P3 já está no arg? | veredito |
|---|---|---|---|---|
| `[assm]` vs `[hyp]` | "tomo como premissa dada" / "proponho para testar/validar" | ✓ sabe no ato: vai testar? `[hyp]` | ✓ a intenção de teste é distinta | **MANTER** |
| `[ctx]` vs `[ref]` | "quadro/cenário conceitual" / "ponteiro direto para fonte externa" | ✓ sabe no ato: é link/fonte? `[ref]` | ✓ argumento de ref é URI/fonte | **MANTER** |

> Resultado: **Todos os 4 sobrevivem**. Cada um possui papel semântico claro e distinguível no ato.

## Casa 3 — ASS + Elaboration (3 comandos)

`[ex]` exemplo · `[forex]` por exemplo · `[seeal]` veja também

| | P1 consequência | P2 decide no ato? | P3 já está no arg? | veredito |
|---|---|---|---|---|
| `[ex]` vs `[forex]` | idênticos | ✗ hesita | — | **FUNDIR** `FOREX:"EX"` |
| `[ex]` vs `[seeal]` | "ilustra o conceito" / "aponta para tópico correlato/lateral" | ✓ sabe no ato | ✓ relação lateral ≠ exemplificação | **MANTER** |

> Resultado: **`[ex]` e `[seeal]` sobrevivem**. `[forex]` é alias de `[ex]`.

## Casa 4 — DIR + Solutionhood

`[ask]` pergunte · `[qst]` pergunta

| | P1 consequência | P2 decide no ato? | P3 já está no arg? | veredito |
|---|---|---|---|---|
| `[ask]` vs `[qst]` | o ato de perguntar / o conteúdo da pergunta (recuperável) | ✗ hesita | ✗ redundante | **FUNDIR** `QST:"ASK"` |

> Resultado: **`[ask]` sobrevive**. `[qst]` é alias de `[ask]`.

---

## Casas 5 a 12 — Resoluções completas

| # | Casa | Comandos | P1 consequência | P2 | P3 | veredito | Aliases |
|---|---|---|---|---|---|---|---|
| 5 | `-` + Unconditional | `[alw]` `[nev]` | "sempre" (afirmativo) / "nunca" (negativo) | ✓ | ✓ | **MANTER** | — |
| 6 | `-` + Condition | `[cond]` `[onlyif]` | "sob esta condição" / "exclusivamente se" | ✗ hesita | ✗ redundante no arg | **FUNDIR** | `ONLYIF:"COND"` |
| 7 | `-` + Otherwise | `[exc]` `[instof]` | "exceção à regra" / "substituição ativa" | ✓ | ✓ | **MANTER** | — |
| 8 | DIR + Elaboration | `[elab]` `[spec]` | "mais detalhes" / "mais precisão" | ✗ hesita | ✗ sobreposição no ato | **FUNDIR** | `SPEC:"ELAB"` |
| 9 | DIR + Restatement | `[clar]` `[simp]` | "tornar mais claro" / "tornar mais simples" | ✗ hesita | ✗ mesma intenção prática | **FUNDIR** | `SIMP:"CLAR"` |
| 10 | DIR + Contrast | `[cmp]` `[dist]` | semelhanças e diferenças / apenas diferenças | ✓ | ✓ | **MANTER** | — |
| 11 | DIR + Antithesis | `[ctrd]` `[skep]` | "afirme o oposto" / "coloque em dúvida" | ✓ | ✓ | **MANTER** | — |
| 12 | DIR + List | `[brst]` `[cat]` | "gerar novos itens" / "agrupar itens existentes" | ✓ | ✓ | **MANTER** | — |

> **Resumo Geral de Fusões Novas Aplicadas:**
> `EVAL:"CRIT"`, `REV:"CRIT"`, `ONLYIF:"COND"`, `SPEC:"ELAB"`, `SIMP:"CLAR"` (somando-se a `FOREX:"EX"` e `QST:"ASK"`).

---

## Depois de preencher

1. Some as fusões. Cada uma é uma linha em `ALIAS`.
2. Rode `node test-lexer.js`. Deve continuar passando — se quebrar, o alias colidiu com algo.
3. Para cada par **mantido**, escreva uma linha de critério na documentação. Se travar ao
   escrever, o par falhou em P2 e você acabou de descobrir tarde. Volte e funda.
4. Os sobreviventes canônicos entram em `expansoes.txt` para o `dag.js` calcular as camadas.
