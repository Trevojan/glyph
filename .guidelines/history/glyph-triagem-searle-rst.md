# Triagem dos 85 comandos — Searle x RST

Cruzamento de duas bases fechadas independentes:

- **Searle** — 5 classes de forca ilocucionaria: `DIR` diretivo, `ASS` assertivo, `DEC` declaracao, `COM` comissivo, `EXP` expressivo. `-` = nao e ato de fala.
- **RST** (Mann & Thompson) — ~30 relacoes retoricas. `-` = o comando nao estabelece relacao entre trechos.

**Regra de leitura da coluna veredito:**

| Padrao | Veredito | Por que |
|---|---|---|
| sem Searle **e** sem RST | `HIEROGLIFO` | nao e ato nem relacao: e operador puro |
| sem Searle, com RST | `hieroglifo?` | operador que marca relacao — base ou conectivo |
| RST multipla (`A+B`) | `COMPOSTO` | faz o trabalho de duas relacoes |
| Searle + 1 RST (ou nenhuma) | `primitivo?` | candidato a primitivo do dominio |

## Tabela completa

| cmd | gloss | Searle | RST | veredito | frame no motor |
|---|---|---|---|---|---|
| `[fls]` | False | - | - | **HIEROGLIFO** | — |
| `[mand]` | Mandatory | - | - | **HIEROGLIFO** | — |
| `[ngt]` | Negative | - | - | **HIEROGLIFO** | — |
| `[opt]` | Optional | - | - | **HIEROGLIFO** | — |
| `[ovr]` | Override | - | - | **HIEROGLIFO** | — |
| `[param]` | Parameter | - | - | **HIEROGLIFO** | — |
| `[ph]` | Placeholder | - | - | **HIEROGLIFO** | — |
| `[pos]` | Positive | - | - | **HIEROGLIFO** | — |
| `[prio]` | Priority | - | - | **HIEROGLIFO** | — |
| `[pt]` | Part | - | - | **HIEROGLIFO** | — |
| `[real]` | Realistic | - | - | **HIEROGLIFO** | — |
| `[tpl]` | Template | - | - | **HIEROGLIFO** | — |
| `[true]` | True | - | - | **HIEROGLIFO** | — |
| `[var]` | Variable | - | - | **HIEROGLIFO** | — |
| `[alw]` | Always | - | Unconditional | **hieroglifo?** | — |
| `[cond]` | Condition | - | Condition | **hieroglifo?** | sim |
| `[exc]` | Exception | - | Otherwise | **hieroglifo?** | sim |
| `[fin]` | Finally | - | Sequence | **hieroglifo?** | — |
| `[instof]` | Instead Of | - | Otherwise | **hieroglifo?** | sim |
| `[nev]` | Never | - | Unconditional | **hieroglifo?** | — |
| `[onlyif]` | Only If | - | Condition | **hieroglifo?** | sim |
| `[onlyw]` | Only When | - | Circumstance | **hieroglifo?** | sim |
| `[tgt]` | Target | - | Purpose | **hieroglifo?** | sim |
| `[unls]` | Unless | - | Unless | **hieroglifo?** | sim |
| `[scru]` | Scrutinize | DIR | Evaluation+Evidence+Solutionhood | **COMPOSTO** | sim |
| `[tryfr]` | Try For Result | DIR | Purpose+Enablement | **COMPOSTO** | sim |
| `[alt]` | Alternative | DIR | Disjunction | **primitivo?** | sim |
| `[ask]` | Ask | DIR | Solutionhood | **primitivo?** | sim |
| `[assm]` | Assumption | ASS | Background | **primitivo?** | sim |
| `[avd]` | Avoid | DIR | - | **primitivo?** | sim |
| `[base]` | Base | DEC | Background | **primitivo?** | — |
| `[brst]` | Brainstorm | DIR | List | **primitivo?** | sim |
| `[byp]` | Bypass | DIR | - | **primitivo?** | sim |
| `[cat]` | Categorize | DIR | List | **primitivo?** | sim |
| `[clar]` | Clarification | DIR | Restatement | **primitivo?** | sim |
| `[cmp]` | Compare | DIR | Contrast | **primitivo?** | sim |
| `[cncl]` | Conclude | DIR | Volitional Result | **primitivo?** | sim |
| `[cnsd]` | Consider | DIR | Joint | **primitivo?** | sim |
| `[cnst]` | Constraint | DEC | - | **primitivo?** | sim |
| `[conf]` | Confirmation | DIR | - | **primitivo?** | — |
| `[crit]` | Criticize | DIR | Evaluation | **primitivo?** | sim |
| `[ctrd]` | Contradict | DIR | Antithesis | **primitivo?** | — |
| `[ctx]` | Context | ASS | Background | **primitivo?** | sim |
| `[deny]` | Deny | DEC | Antithesis | **primitivo?** | sim |
| `[depr]` | Deprecated | DEC | - | **primitivo?** | — |
| `[dist]` | Distinguish | DIR | Contrast | **primitivo?** | sim |
| `[dont]` | Do Not | DIR | - | **primitivo?** | sim |
| `[drvf]` | Derive From | DIR | Means | **primitivo?** | sim |
| `[elab]` | Elaborate | DIR | Elaboration | **primitivo?** | sim |
| `[eval]` | Evaluate | DIR | Evaluation | **primitivo?** | sim |
| `[ex]` | Example | ASS | Elaboration | **primitivo?** | sim |
| `[fbk]` | Fallback | COM | Otherwise | **primitivo?** | — |
| `[fmt]` | Format | DIR | - | **primitivo?** | sim |
| `[forex]` | For Example | ASS | Elaboration | **primitivo?** | sim |
| `[frgt]` | Forget | DIR | - | **primitivo?** | — |
| `[gen]` | Generalize | DIR | Interpretation | **primitivo?** | sim |
| `[hyp]` | Hypothesis | ASS | Background | **primitivo?** | sim |
| `[imag]` | Imagine | DIR | Circumstance | **primitivo?** | sim |
| `[impr]` | Improve | DIR | - | **primitivo?** | sim |
| `[ins]` | Instruction | DIR | - | **primitivo?** | sim |
| `[intn]` | Intention | ASS | Purpose | **primitivo?** | — |
| `[itr]` | Iterate | DIR | Sequence | **primitivo?** | sim |
| `[just]` | Justify | DIR | Justify | **primitivo?** | sim |
| `[lim]` | Limitation | ASS | Concession | **primitivo?** | sim |
| `[lrn]` | Learn | DIR | - | **primitivo?** | — |
| `[nt]` | Note | ASS | - | **primitivo?** | sim |
| `[prop]` | Propose | DIR | - | **primitivo?** | sim |
| `[qst]` | Question | DIR | Solutionhood | **primitivo?** | sim |
| `[rdy]` | Ready | COM | - | **primitivo?** | — |
| `[ref]` | Reference | ASS | Background | **primitivo?** | sim |
| `[req]` | Requirement | DEC | - | **primitivo?** | sim |
| `[restr]` | Restriction | DEC | - | **primitivo?** | sim |
| `[rev]` | Review | DIR | Evaluation | **primitivo?** | sim |
| `[rmbr]` | Remember | DIR | - | **primitivo?** | — |
| `[rsn]` | Reason | ASS | Volitional Cause | **primitivo?** | sim |
| `[rtnl]` | Rationale | ASS | Justify | **primitivo?** | sim |
| `[rwk]` | Rework | DIR | - | **primitivo?** | sim |
| `[seeal]` | See Also | ASS | Elaboration | **primitivo?** | sim |
| `[simp]` | Simplify | DIR | Restatement | **primitivo?** | sim |
| `[skep]` | Skeptic | DIR | Antithesis | **primitivo?** | sim |
| `[spec]` | Specify | DIR | Elaboration | **primitivo?** | sim |
| `[sum]` | Summary | DIR | Summary | **primitivo?** | sim |
| `[val]` | Validate | DIR | Evaluation | **primitivo?** | sim |
| `[vrfy]` | Verify | DIR | Evidence | **primitivo?** | sim |
| `[warn]` | Warning | ASS | Motivation | **primitivo?** | sim |

## Contagem

- `HIEROGLIFO`: **14**
- `hieroglifo?`: **10**
- `COMPOSTO`: **2**
- `primitivo?`: **59**

## Convergencia independente (o achado)

Duas classificacoes que nunca se falaram concordam:

- comandos **sem frame de valencia** no motor: 27
- comandos que **nao sao ato de fala** nesta triagem: 24
- **intersecao: 17** — `[alw]` `[fin]` `[fls]` `[mand]` `[nev]` `[ngt]` `[opt]` `[ovr]` `[param]` `[ph]` `[pos]` `[prio]` `[pt]` `[real]` `[tpl]` `[true]` `[var]`

O motor nao conseguiu dar valencia a esses porque **eles nao sao predicados**. Predicado tem argumento;
operador tem escopo. A tabela `FRAMES` estava tentando dar argumento a quem so tem escopo — e falhou
exatamente nos 17 que a teoria tambem separa. Isso e evidencia convergente de que a base esta ai.

## Base proposta — 14 hieroglifos, agrupados por funcao

| grupo | hieroglifos | analogo formal |
|---|---|---|
| Valor de verdade | `[true]` `[fls]` | constantes booleanas |
| Polaridade | `[pos]` `[ngt]` | sinal / polaridade de traco |
| Modal deontico | `[mand]` `[opt]` `[dont]` | operadores modais (necessidade, possibilidade, proibicao) |
| Quantificador | `[alw]` `[nev]` | quantificadores universal e universal-negado |
| Ordenacao / escopo | `[prio]` `[ovr]` `[pt]` `[fin]` | precedencia e indice estrutural |
| Ligacao (binding) | `[var]` `[param]` `[ph]` `[tpl]` | ligadores de nome a valor |
| Estado / metadados | `[depr]` `[real]` `[rdy]` `[conf]` | predicados de estado (nao-relacionais) |
| Meta-sessao | `[rmbr]` `[frgt]` `[lrn]` | efeitos no ambiente da sessao |

## Redundancias — mesma classe Searle e mesma relacao RST

Pares que ocupam a mesma casa do cruzamento. Nao provam duplicidade, mas cada um exige um criterio
explicito de diferenca — ou uma fusao.

| Searle | RST | comandos |
|---|---|---|
| DIR | Evaluation | `[crit]` `[eval]` `[rev]` `[val]` |
| ASS | Background | `[assm]` `[ctx]` `[hyp]` `[ref]` |
| ASS | Elaboration | `[ex]` `[forex]` `[seeal]` |
| - | Unconditional | `[alw]` `[nev]` |
| - | Condition | `[cond]` `[onlyif]` |
| - | Otherwise | `[exc]` `[instof]` |
| DIR | Elaboration | `[elab]` `[spec]` |
| DIR | Restatement | `[clar]` `[simp]` |
| DIR | Contrast | `[cmp]` `[dist]` |
| DIR | Antithesis | `[ctrd]` `[skep]` |
| DIR | List | `[brst]` `[cat]` |
| DIR | Solutionhood | `[ask]` `[qst]` |

## Relacoes RST sem nenhum comando — lacunas expressivas

O Glyph hoje **nao sabe dizer** estas relacoes. Cada uma e um candidato a comando novo
(ou a template, dada a regra de vocabulario fechado):

- **Preparation** — preparar o terreno antes do ponto
- **Non-volitional Cause** — causa nao-intencional (vs `[rsn]`, que e volitiva)
- **Non-volitional Result** — consequencia nao-intencional

## Compostos com expansao

```
[scru]  = [ctx] -> [vrfy[evidence]] -> [eval] -> [qst[gap]]
          Evaluation + Evidence + Solutionhood — tres relacoes num comando
[tryfr] = [tgt[state]] -> [enablement] -> [vrfy[reached]]
          Purpose + Enablement
[prob]  = [fls] de [tryfr]        <- usa dois hieroglifos, boa fundacao ok
[crit]  = [eval] com retorno escalar, sem [vrfy]  <- por isso nao investiga
```
