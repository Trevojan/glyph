# Glyph v1.6 → v1.7 — Lista de alterações

Duas correções normativas do operador:

- **A. O divisor `/` não existe.** Encadeamento é feito **exclusivamente** por `-`:
  `[CMD1-CMD2-CMD3...]`. A forma `[cmdx-/cmdy/cmdz` está **errada**.
- **B. `\` não existe mais.** Emoções usam `/`: `/eth/`, `/cnf/`. Não é depreciação —
  é remoção. O leitor ainda reconhece `\` por inércia de treino; isso é bug, não feature.

`/` imediatamente após `[` continua sendo o marcador de fechamento (`[/IF]`).
Como emoção só ocorre fora de posição pós-`[`, **não há colisão** — este é o motivo
pelo qual C-01 se resolve por eliminação em vez de por convenção.

---

## Já aplicado (arquivos regenerados)

| Arquivo | Alterações |
|---|---|
| `glyph-markup/SKILL.md` | descrição, seção Emotion tags, seção Operators, vocabulário de emoção, nota v1.7; + flags UNRESOLVED em `[DEF]` (C-02) e templates (C-04) |
| `glyph-markup-commons/SKILL.md` | descrição, menção ao divisor, todos os exemplos de emoção |

## Pendente — `references/glyph-specification.md` (43 KB, edição manual)

Linhas exatas, na ordem em que aparecem:

| Linha | Conteúdo atual | Ação |
|---|---|---|
| 11 | "affective-state tags, delimited by **backslashes**" | → `delimited by slashes` |
| 96 | linha `-` na tabela de delimitadores (4.3) | manter; reescrever como *extend / chain operator* |
| 97 | linha `/` = **divide operator** | **remover a linha**; opcionalmente substituir por `/` = emotion delimiter (4.2) |
| 110 | racional do backtick: "`/` was reserved as the divide operator" | → `/` está reservado como delimitador de emoção; o argumento contra `//` (colisão com URLs) **permanece válido** e deve ser mantido |
| 116 | `[OFF]`/`[ON]`: "bracket/backslash syntax" | → `bracket/slash syntax` |
| 154 | título **4.7 Compact Operators: Extend (`-`) and Divide (`/`)** | → `4.7 Compact Operator: Extend / Chain (`-`)` |
| 162–164 | bloco normativo inteiro **Divide — `/`** | **excluir**. Migrar apenas a regra de posição da linha 164 (`/` após `[` = fechamento) para a Seção 5 ou 4.2, onde ela passa a proteger emoção vs fechamento |
| 173 | exemplo de densidade: "`-` marca extensão; `/` abre cadeia dividida" | reescrever: `-` marca extensão **e** separa os elementos da cadeia |
| 176 | `[in-/RW/FM/IM` | → `[in-RW-FM-IM` |
| 179 | "auto-closes to `[in-/RW/FM/IM]` … divided chain" | → `[in-RW-FM-IM]`; "cadeia estendida" |
| 181 | fragmento `[in-/` | → `[in-` (operador de extensão pendente, sem elementos) |
| 455 | changelog 1.5, racional do backtick cita divisor | corrigir a menção histórica ou marcá-la como superada por 1.7 |
| 539 | Apêndice A.6 — resumo de delimitadores cita `/` divide | remover; reatribuir `/` a emoção |
| Apêndice A.2 | vocabulário completo de ~70 emoções em `\xxx\` | **converter todas** para `/xxx/` — é a maior parte do trabalho |
| Seção 4.2 | seção normativa de affective-state tags | reescrever delimitador para `/` e declarar `\` **removido** |
| Seção 4.1.1 | auto-close | sem alteração |
| Changelog | — | acrescentar linha 1.7 descrevendo A e B como **breaking changes** |

> A linha 39 (princípio 5, "economy of expression") **não** precisa mudar, e vale
> reler: a remoção do divisor é exatamente o princípio sendo aplicado — brevidade
> que não sobrevive sem regra determinística sai da linguagem.

## Efeito colateral positivo na formalização

Com o divisor removido, a EBNF encolhe:

```ebnf
(* v1.6 *)
extension  = "-" , chain_item , { "/" , chain_item } ;

(* v1.7 *)
extension  = "-" , chain_item , { "-" , chain_item } ;
```

Um só separador em toda a produção. E `emotion = "/" , emo_code , "/" , { emo_code , "/" } ;`
deixa de competir com qualquer outra produção — a única regra de desambiguação
restante é posicional (`/` após `[` = fechamento), que é decidível com um caractere
de lookbehind, não lookahead.

## Aviso de escopo

Estes arquivos são cópias de trabalho. Editá-los aqui **não atualiza a sua
instalação** — os `.skill` ativos continuam em v1.6 até você reinstalar. Enquanto
isso, qualquer leitura de Glyph vai aplicar a regra velha (é exatamente o C-07 do
documento da Etapa 1, agora se manifestando na prática).

---

# Rodada 2 — comentários de revisão do operador

## Aplicado em `glyph-markup-commons/SKILL.md`

| # | Alteração | Natureza |
|---|---|---|
| 1 | `Backslashes \ \` → `Slashes / /`; resíduos `\hop\`/`\grt\` → `/hop/`/`/grt/` | correção pendente da rodada 1 (o replace anterior não pegou a inicial maiúscula) |
| 2 | `[CTX]` documentado com seus três parâmetros implícitos: **what? / where? / when?** | **semântica nova** |
| 3 | Distinção `[CRIT]` (julga) vs `[SCRU]` (investiga, "formal or systematic examination"); regra geral: a tag significa a definição de dicionário da palavra inteira | **princípio novo** |
| 4 | `[cmd]` coinado deve ser **short-doing** (uma ação). Multi-passo pertence a template, não a comando | **restrição nova** |
| 5 | Sintaxe de template corrigida (ver abaixo) | **breaking change** |
| 6 | Prática = aninhamento progressivo com atrito deliberado; Claude ensina a *estrutura lógica*, não entrega a linha pronta | pedagogia |

## Aplicado em `glyph-markup/SKILL.md` (propagação do #5)

- Definir: `` [TPL`revcheck`,[CRIT][ALT[IMPR]][FIN][SUM]; ``
- Invocar: `[--revcheck;`
- Formas v1.6 `[TPL: NAME = ...]` e `[TPL[NAME]]` marcadas como superadas.
- Cascata define-or-invoke reescrita: `[--name` sobre nome indefinido → **perguntar**, nunca inferir.

## Efeito no registro de conflitos

| Conflito | Status |
|---|---|
| **C-01** `/` emoção vs `/` divisor | ✅ **RESOLVIDO** — divisor eliminado; `/` é exclusivo de emoção |
| **C-04** forma de template | ✅ **RESOLVIDO** — `[TPL`nome`,corpo;` define, `[--nome` invoca |
| **C-03** vírgula sobrecarregada | 🟢 **REBAIXADO** — deixa de ser sobrecarga e passa a ser **convenção posicional uniforme**: em `[TPL]`, `[SECTION]`, `[BLOCK]`, o 1º parâmetro é sempre o identificador, e `,` separa identificador de corpo. Uma regra, três comandos. Recomendo **manter a vírgula** e documentar a convenção em vez de trocar por `:` |
| **C-02** `[DEF]` = default, *define* órfão | 🟠 aberto |
| **C-05** tabela de aridade | 🔴 aberto — **e agora com escopo maior** (ver abaixo) |
| **C-06** operadores infixos | 🔴 aberto |
| **C-07** skills fora de sincronia | 🟠 aberto até reinstalação |

## Novos itens abertos

- **C-08 — `[ctx]` com 3 slots implícitos.** Se `[ctx]` tem what/where/when, então
  aridade não é um número: é uma **lista de slots ordenados e opcionais**. A tabela de
  assinaturas da Etapa 3 precisa de coluna de *slots*, não só de min/max. Isto amplia
  C-05 e deve ser resolvido antes de escrever as ~90 linhas.
- **C-09 — sintaxe de parâmetro de template.** `[--codefix`arg`` é plausível mas não
  foi declarada. Marcado UNRESOLVED na skill.
- **C-10 — `/palavra` sem fechamento** (ex. `/btw`). Ainda em aberto: forma prefixa de
  emoção, digitação incompleta, ou construto distinto? Decide se `emotion` volta a
  precisar de lookahead.
- **C-11 — fronteira comando vs template.** O comentário #4 cria um critério
  ("short-doing" vs multi-passo) que hoje não é verificável mecanicamente. Precisa de
  definição operacional ou fica sendo convenção de estilo, não regra.
