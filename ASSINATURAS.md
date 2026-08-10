# Glyph v1.7 — Tabela Normativa de Assinaturas e Aridades (ASSINATURAS.md)

Resolução de **C-05** (Aridade) e **C-08** (Slots de `[CTX]`).

## Regra Geral de Auto-Fechamento (I-07 & I-18)

- O operador de auto-fechamento (`;`) **só pode fechar automaticamente um comando se sua aridade mínima de slots for previamente satisfeita**.
- Se um comando com `min > 0` for seguido de `;` sem seus slots mínimos preenchidos, o parser deve emitir **ERRO DE ARIDADE (N-01)**.

---

## 1. Operadores Puros (Hieróglifos - Nível 0)

Aridade 0. Podem ser abertos e auto-fechados livremente.

| Comando | Min | Max | Descrição / Papel | Auto-fechável? |
|---|---|---|---|---|
| `[true]` / `[fls]` | 0 | 0 | Constantes booleanas | ✓ |
| `[pos]` / `[ngt]` | 0 | 0 | Polaridade | ✓ |
| `[mand]` / `[opt]` | 0 | 0 | Modalidade deontica (obrigatório / opcional) | ✓ |
| `[dont]` | 0 | 1 | Restrição explícita | ✓ |
| `[alw]` / `[nev]` | 0 | 0 | Quantificadores (sempre / nunca) | ✓ |
| `[prio]` / `[ovr]` | 0 | 1 | Precedência / Sobreposição | ✓ |
| `[pt]` | 0 | 1 | Índice de parte | ✓ |
| `[var]` | 1 | 1 | Declaração/Referência de variável | ✗ (exige nome) |
| `[param]` | 1 | 1 | Parâmetro | ✗ (exige nome) |
| `[ph]` | 1 | 1 | Placeholder / Casa a preencher | ✗ (exige id/pergunta) |
| `[tpl]` | 1 | 2 | Template definition | ✗ (exige nome) |
| `[def]` | 0 | 0 | Valor Default (I-11) | ✓ |
| `[dfn]` | 2 | 2 | Define novo símbolo (C-02): `[dfn'símbolo','significado']` | ✗ (exige 2 slots) |

---

## 2. Comandos Estruturais e Contextuais com Slots (Nível 1 & 2)

### Resolução C-08 — Slots de `[CTX]`
`[ctx]` tem 3 slots ordenados e opcionais: `[ctx'what','where','when']`.
- Slot 1 (`what`): O assunto/entidade de contexto.
- Slot 2 (`where`): O local/escopo (ex: arquivo, componente, seção).
- Slot 3 (`when`): O momento/condição temporal ou de versão.

### Tabela Completa de Assinaturas

| Comando | Min | Max | Slots Ordenados | Auto-fechável se |
|---|---|---|---|---|
| `[ctx]` | 1 | 3 | 1: `what`, 2: `where`, 3: `when` | Slot 1 preenchido |
| `[sum]` | 0 | 1 | 1: `o que resumir` | Sempre |
| `[crit]` | 1 | 1 | 1: `o que criticar` | Slot 1 preenchido |
| `[val]` | 2 | 2 | 1: `o que validar`, 2: `critério externo` | Slots 1 e 2 preenchidos |
| `[vrfy]` | 1 | 1 | 1: `o que verificar` | Slot 1 preenchido |
| `[ask]` | 1 | 1 | 1: `o que perguntar` | Slot 1 preenchido |
| `[cond]` | 1 | 2 | 1: `condição`, 2: `ramo_então` | Slot 1 preenchido |
| `[if]` | 1 | 2 | 1: `condição`, 2: `então` | Slot 1 preenchido |
| `[unls]` | 1 | 2 | 1: `condição de exceção`, 2: `ação` | Slot 1 preenchido |
| `[exc]` | 1 | 1 | 1: `a exceção` | Slot 1 preenchido |
| `[instof]` | 1 | 1 | 1: `o que entra no lugar` | Slot 1 preenchido |
| `[cmp]` | 2 | ∞ | 1..n: `termos a comparar` | Pelo menos 2 termos preenchidos |
| `[dist]` | 2 | ∞ | 1..n: `termos a distinguir` | Pelo menos 2 termos preenchidos |
| `[cat]` | 2 | ∞ | 1..n: `itens/categorias` | Pelo menos 2 itens preenchidos |
| `[brst]` | 1 | 1 | 1: `tópico/assunto` | Slot 1 preenchido |
| `[elab]` | 1 | 1 | 1: `o que detalhar` | Slot 1 preenchido |
| `[clar]` | 1 | 1 | 1: `o que esclarecer` | Slot 1 preenchido |
| `[assm]` | 1 | 1 | 1: `a suposição` | Slot 1 preenchido |
| `[hyp]` | 1 | 1 | 1: `a hipótese` | Slot 1 preenchido |
| `[ref]` | 1 | 1 | 1: `a referência/fonte` | Slot 1 preenchido |
| `[seeal]` | 1 | 1 | 1: `tópico correlato` | Slot 1 preenchido |
| `[ex]` | 1 | 1 | 1: `o exemplo` | Slot 1 preenchido |
| `[tgt]` | 1 | 1 | 1: `o alvo/objetivo` | Slot 1 preenchido |
| `[rsn]` | 1 | 1 | 1: `o motivo` | Slot 1 preenchido |
| `[rtnl]` | 1 | 1 | 1: `o racional` | Slot 1 preenchido |
| `[just]` | 1 | 1 | 1: `a justificativa` | Slot 1 preenchido |
| `[req]` | 1 | 1 | 1: `o requisito` | Slot 1 preenchido |
| `[cnst]` | 1 | 1 | 1: `a restrição` | Slot 1 preenchido |
| `[avd]` | 1 | 1 | 1: `o que evitar` | Slot 1 preenchido |
| `[rwk]` | 1 | 1 | 1: `o que retrabalhar` | Slot 1 preenchido |
| `[fmt]` | 1 | 1 | 1: `o que formatar` | Slot 1 preenchido |
| `[impr]` | 1 | 1 | 1: `o que melhorar` | Slot 1 preenchido |
| `[itr]` | 1 | 1 | 1: `o que iterar` | Slot 1 preenchido |
| `[gen]` | 1 | 1 | 1: `o que generalizar` | Slot 1 preenchido |
| `[prop]` | 1 | 1 | 1: `o que propor` | Slot 1 preenchido |

---

## 3. Operadores Prefixos de Comparação (Resolução C-06)

Em substituição a operadores infixos (`>`, `<`, `=`), o Glyph v1.7 adota **exclusivamente a forma prefixa**:

- `[gt'A','B']` — A > B (Greater Than)
- `[gte'A','B']` — A ≥ B (Greater Than or Equal)
- `[lt'A','B']` — A < B (Less Than)
- `[lte'A','B']` — A ≤ B (Less Than or Equal)
- `[eq'A','B']` — A = B (Equal)
- `[neq'A','B']` — A ≠ B (Not Equal)

Todos exigem exatamente **2 argumentos** (`min = 2, max = 2`).

## 4. Operadores de Polaridade e Modalidade (Resolução C-11)

### Resolução C-11 — Operadores de Polaridade e Modalidade

Os operadores `[POS]`, `[NEG]`, `[MAND]` e `[OPT]` funcionam como prefixos de **polaridade** e **modalidade deontica**, respectivamente. Eles modificam o sentido do comando que os sucede, invertendo-o (`[NEG]`, `[POS]`) ou alterando sua força obrigatória (`[MAND]`, `[OPT]`).

#### 4.1 Operadores de Polaridade (`[POS]` e `[NEG]`)

Estes operadores invertem o valor de verdade ou a orientação de uma afirmação:

- `[pos[A]]` é semanticamente equivalente a `[A]`.
- `[neg[A]]` é semanticamente equivalente a `[fls[A]]` ou à negação lógica de `[A]`.

Ambos admitem **0 a ∞ argumentos**, permitindo `[neg[A, B, C]]` para negar múltiplos termos.

#### 4.2 Operadores de Modalidade Deontica (`[MAND]` e `[OPT]`)

Estes operadores definem o grau de obrigação:

- `[mand[A]]`: `A` é **obrigatório** (deve ser feito).
- `[opt[A]]`: `A` é **opcional** (pode ser feito).

Ambos admitem **0 a ∞ argumentos**, permitindo especificar obrigação ou opção para múltiplos termos: `[mand[A, B, C]]`.

#### 4.3 Auto-fechamento

Devido à sua natureza de modificadores (prefixos), todos os operadores de polaridade e modalidade são considerados **auto-fecháveis** (``;``) independentemente da quantidade de argumentos que recebam.

### Tabela de Operadores de Polaridade e Modalidade

| Comando | Min | Max | Papel | Auto-fechável? |
|---|---|---|---|---|
| `[pos[...]]` | 0 | ∞ | Inverte polaridade (sempre verdadeiro) | ✓ |
| `[neg[...]]` | 0 | ∞ | Inverte polaridade (sempre falso) | ✓ |
| `[mand[...]]` | 0 | ∞ | Obrigatório (deontico) | ✓ |
| `[opt[...]]` | 0 | ∞ | Opcional (deontico) | ✓ |

