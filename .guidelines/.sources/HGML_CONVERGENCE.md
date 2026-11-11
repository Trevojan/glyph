<!-- Medição pedida pelo Regente: "duas maneiras de escrever, uma só saída em
     hieróglifos". Rodada contra o motor em 2.4.6.04 antes de qualquer desenho.
     O que ela mudou está em §5. -->

# Convergência do `.hgml` — várias fontes, uma intenção

> **A regra que o Regente quer:** se há várias maneiras de escrever um `.pgml`,
> deve haver **apenas 1 saída possível em `.hgml`**. O defeito é quando os glifos
> dizem "A" e os hieróglifos dizem "B".
>
> Medido antes de propor. A propriedade **já vale** no eixo mais difícil, e quebra
> em três lugares estreitos — todos mecânicos.

## 1. A primeira surpresa: o eixo caro já converge

O eixo que parecia exigir mais trabalho — **um composto contra a própria
fórmula** — já dá a mesma queima.

### Objetivo 1 — *"simplifique X no núcleo"*

| | fonte | diagnósticos | converge com A |
|---|---|---|---|
| **A** | `` [sum`X`] `` | — | (base) |
| **B** | `` [simp`X`],[core] `` | — | **SIM** |
| **C** | `` [core],[simp`X`] `` | — | **NÃO** |

### Objetivo 2 — *"sempre puxe o contexto, sobre X"*

| | fonte | diagnósticos | converge com A |
|---|---|---|---|
| **A** | `` [rmbr`X`] `` | — | (base) |
| **B** | `` [alw`X`[get[ctx]]] `` | `ask/UnfilledSlot` | **SIM** |
| **C** | `` [rmbr[get[ctx]]`X`] `` | `ask/UnfilledSlot` | **NÃO** |

Nos dois casos, **A ≡ B**. O autor pode escrever o composto ou abrir a fórmula
na mão, e a queima é idêntica byte a byte. Isso não foi construído para esta
medição — é o comportamento de hoje.

**A propriedade não precisa ser inventada. Precisa ser fechada.**

## 2. Onde quebra — três classes, todas mecânicas

### 2.1 A queima está invertida nos dois sentidos — e §0.1 é que está errado

O par que quebra o Objetivo 1:

```
[simp`X`],[core]     ->   [elab 'X' …] [ref…] [ctx] [core]
[core],[simp`X`]     ->   [core] [elab 'X' …] [ref…] [ctx]
```

Eu tratei isso como defeito da queima, contra o `GLOSSARY.md` §0.1 normativo:

> `[A],[B]` | **conjunção** — A e B valem juntos, **sem ordem entre eles**

**O Regente decidiu o contrário, e a decisão é dele:** *"antigamente eu dizia que
não havia diferença na ordem. isso se provou ineficaz. deve ser alterado."*

A razão é linguística e vale como regra geral: **o que deve ser feito é declarado
antes do sujeito** — *red ball*, *thin air*, *heavy stuff*. Então:

| fonte | leitura |
|---|---|
| `` [simp`X`],[core] `` | "simplifique X **e trate como** núcleo" |
| `` [core],[simp`X`] `` | "**em** núcleo, simplifique X" |

São intenções diferentes. A queima estava certa em distinguir; **§0.1 é que
precisa perder o *"sem ordem entre eles"*.**

### 2.1b Mas a queima perde a distinção que §0.1 declara normativa

E aqui a inversão fecha. Medido:

```
[simp`X`],[core]     conjunção
[simp`X`][core]      sequência
```

`§0.1` dá leituras **diferentes** para as duas (`,` = valem juntos; sem
separador = A, depois B), e `§0.3` sustenta: em `[A][B]` o sujeito de B é o
**resultado** de A. Mesmo assim:

| projeção | distingue conjunção de sequência? |
|---|---|
| **AST** | **SIM** — `origin: "item"` contra `origin: "root"` |
| **XML** | **NÃO** — byte a byte idêntico |
| **`.hgml`** | **NÃO** — byte a byte idêntico |

**A queima guarda uma ordem que §0.1 diz não existir, e perde a diferença que
§0.1 diz ser normativa.** Errada nas duas pontas, e por isso as duas correções
são o mesmo conserto.

### 2.2 Escrever a fórmula dentro do próprio composto duplica

```
[rmbr[get[ctx]]`X`]

[alw
  [get[ctx]]      <- o que o autor escreveu
  'X'
  [get[ctx]]      <- a fórmula do RMBR, expandida por cima
[/alw]
```

O autor escreveu `[get[ctx]]` **uma vez**. A queima emite **duas**. Confirmado
num segundo comando: `` [vrfy[cmp[true]]`y`] `` sai com `[true]` duplicado e
`cmp` dentro de `cmp`.

Isto é literalmente *os glifos dizem A e os hieróglifos dizem B* — e é o único
achado aqui que é defeito puro, sem decisão pendente.

### 2.3 A posição do literal — retificado: não era defeito

> **Corrigido em 2026-09-05, pelo Regente.** Esta seção dizia que a posição do
> literal "decide a convergência e nada avisa", tratando a divergência como
> defeito. Está errado.

`` [alw`X`[get[ctx]]] `` e `` [alw[get[ctx]]`X`] `` **não devem** convergir: são
declarações diferentes, pela mesma regra de §5 — a ordem é significado.

| fonte | leitura |
|---|---|
| `` [alw`X`[get[ctx]]] `` | sempre X, pegue o contexto |
| `` [alw[get[ctx]]`X`] `` | sempre, pegue o contexto, e o resultado é X |

O que faltava não era convergência: era **nome**. Os dois emitiam o mesmo
`<user-input>` e diferiam só por ordem de irmãos, então o consumidor tinha de
*inferir* qual era qual. Fechado por `role="result"` — ver §9.

## 3. O precedente já está no código

`glyph-parser.js:1887`, ao montar `made-of`:

```js
/* Unique and sorted, not the raw sequence: as a signature of what the command
   IS, `ctx` appearing four times says nothing more than it appearing once —
   and the raw burn of SCRU is 64 items. */
attrs.push('made-of="' + xesc(uniq.sort().join(" ")) + '"');
```

**O motor já decidiu que, para fins de identidade, os átomos de um composto são
um conjunto ordenado e sem repetição.** Ele faz isso no `made-of` do XML e não
faz na queima, que continua sendo *the raw sequence* — 64 itens para `SCRU`,
sensível à ordem e duplicando.

A canonicalização que §2.2 pede não é mecanismo novo: é a **metade `uniq`** desse
mesmo trecho, aplicada onde ainda não foi.

**A metade `sort` não se aplica** — §5 decidiu que a ordem é significado. As duas
metades sempre foram separáveis; a decisão do Regente só mostrou qual delas
serve. `made-of` continua ordenando porque ali ele é *assinatura de identidade*,
não intenção: para dizer **o que o comando é**, a ordem não acrescenta.

## 4. Uma correção ao passo-a-passo, e ela deixa a obra mais barata

O plano do Regente coloca o `.hgml` **antes** do AST: *"os hieróglifos devem ser
digeríveis para xml antes dos glifos serem lidos"*, e o AST montado sobre o
resultado mais puro.

Medido, o motor faz o contrário — e o contrário é o certo:

```js
function burn(segments, opts) { … }        // recebe segmentos JÁ PARSEADOS
toHGML(src) === burn(parse(src).segments)
```

A queima é **derivada** da árvore, não anterior a ela. Não dá para montar o AST
sobre o `.hgml` porque o `.hgml` só existe depois de haver árvore — e ele perde
coisa de propósito (prosa livre não sobrevive, `hgmlLit` recusa `]` e quebra de
linha).

**O que o Regente quer continua inteiro, com uma troca de papel:**

| no plano | na prática |
|---|---|
| `.hgml` é etapa do pipeline | `.hgml` é a **chave de comparação** |
| AST montado sobre o `.hgml` | AST **canonicalizado**, e a queima prova que duas fontes chegaram na mesma intenção |

Isso é mais barato e mais forte. Mais barato porque não reordena o pipeline —
canonicaliza um passo que já existe. Mais forte porque a queima vira **teste**:
duas fontes com a mesma intenção têm que dar o mesmo `.hgml`, e isso é uma
asserção que o `test-corpus.js` sabe fazer hoje, do jeito que `roundTrips` já é
fixado por caso em `conformance/examples.json`.

E o passo *"se não houver o mesmo significado que a raiz, para por aí"* já tem
forma pronta no repositório: é o `awaiting` — um vetor que **deve** falhar até seu
produtor existir, e que falha no instante em que passa.

## 5. Decidido pelo Regente

> **`A,B` NÃO significa o mesmo que `B,A`.** A ordem é significado.
>
> *"antigamente eu dizia que não havia diferença na ordem. isso se provou
> ineficaz. deve ser alterado."*

Consequências, e nenhuma delas é opinião depois disto:

1. **`GLOSSARY.md` §0.1 perde o *"sem ordem entre eles"*.** É texto normativo; a
   alteração é decisão de release e entra pelo dígito de regras.
2. **§0.3 fica de pé.** Ele fala de *onde o operando pousa*, não de
   comutatividade — e a leitura do Regente (*o que se faz vem antes do sujeito*)
   é a mesma coisa dita pela gramática.
3. **A queima não deve ordenar.** Some o `sort()`; **fica o `uniq`**, que
   resolve §2.2 e não depende de ordem nenhuma. A separação sobrevive à decisão.

### Raio de alcance, medido

| | |
|---|---|
| fontes no corpus | 105 |
| fontes com `origin="item"` | **8 (8%)** |
| nós `origin="item"` dentro de cadeia | 1 |
| nós `origin="item"` fora de cadeia — **a conjunção que some** | **12** |

Doze nós, oito fontes. `packagePass` já agrupa membros de cadeia em `<chain>`;
o que falta é a conjunção de topo, que hoje não recebe agrupamento nenhum e por
isso desaparece do XML.

## 6. `.hgml` depois do AST? — esforço e ganho

A pergunta do Regente, respondida pela medição de §2.1b.

**Não é que o `.hgml` mereça vir depois. É que ele não consegue vir antes.**

O AST é a única projeção que carrega a distinção `[A],[B]` × `[A][B]`. Canonizar
no `.hgml` significaria canonizar através de um canal que **já perdeu** o que
precisa ser decidido.

| caminho | esforço | ganho |
|---|---|---|
| **canonizar no AST** | o campo **já existe** (`origin`). Falta o XML emitir a consequência e a queima respeitá-la. Raio: 8% do corpus, 12 nós. | a propriedade de convergência vira verificável **hoje**, sobre um campo que já está lá |
| **canonizar no `.hgml` primeiro** | é preciso **primeiro inventar** sintaxe de hieróglifo para uma distinção que ele não sabe expressar — ou seja, reconstruir o que o AST já tem — e só então canonizar | o mesmo ganho, por um caminho estritamente mais longo, e com perda no meio |

E há o limite duro: a queima **descarta de propósito** — prosa livre não
sobrevive, e `hgmlLit` recusa `]` e quebra de linha. Uma fonte de verdade não
pode ser a projeção que joga fora.

**Portanto: o AST é a fonte de verdade, e o `.hgml` é a chave de comparação.**
Duas fontes com a mesma intenção têm que dar a mesma queima — isso vira asserção
do `test-corpus.js`, do jeito que `roundTrips` já é fixado por caso.

## 7. A pergunta do `[alw]` — preservado, não coberto

O Regente perguntou se o motor já cobre a diferença entre

```
[alw`X`[get[ctx]]]     "sempre X, pegue o contexto"
[alw[get[ctx]]`X`]     "sempre → pegue → contexto → fecha, sobe → (resultado) X"
```

**Preservado: sim.** Os dois XML são diferentes, e a ordem sobrevive na queima.
Nada se perde.

**Coberto: não.** Nada *nomeia* a diferença. O nó `Literal` do AST carrega
`{type, value, form, at}` — **não tem papel**. E os dois emitem o mesmo
`<user-input>`, filhos de `<always>`, separados só pela posição relativa ao
`<get>`.

Ou seja: o consumidor tem que **inferir** "antes do aninhado = operando, depois
do aninhado = resultado" a partir de posição — exatamente a inferência que o
Regente proibiu (*"se eu chamo variável, você deve receber a informação do jeito
fácil: substituindo, no lugar de te fazer inferir"*).

E é o mesmo defeito de `.orders/INTAKE-VARIABLES.md` §2, visto do outro lado: lá
o `<user-input>` não distingue **nome** de **valor**; aqui não distingue
**operando** de **resultado**. Um conserto, dois sintomas.

## 8. Método

Todos os pares acima foram rodados contra o motor em **2.4.6.04** com os três
stores carregados, comparando `toHGML` normalizado por espaço em branco. Nenhum
exemplo foi escrito para ilustrar uma conclusão: os quatro primeiros pares
testados produziram três divergências, e as classes de §2 saíram delas.

---

## 9. O que foi implementado — 3.4.7.05

Esta medição virou release. O que dela saiu:

| medição | o que foi feito |
|---|---|
| §2.1 a ordem é significado | `GLOSSARY.md` §0.1 perdeu *"sem ordem entre eles"* |
| §2.1b conjunção some do XML | `<holds>` agrupa a conjunção de topo; `RT-05` invertido, `RT-07` novo |
| §2.2 duplicação na queima | `uniq` na injeção de operandos; `H-13`, `H-14` |
| §2.3 posição sem nome | `role="operand"`/`role="result"`; `RO-01..05` |
| §3 o `sort` do `made-of` | **não** aplicado à queima, por §5 |
| §6 AST como fonte de verdade | confirmado: `.hgml` não consegue vir antes, porque não expressa o que o AST distingue |
| §7 operando contra resultado | `role`, e `binds`/`ref` do lado das variáveis |

O que **não** foi feito, e por quê: a queima continua sem ordenar conjunção —
§5 decidiu que ordenar seria trocar uma duplicação por uma mentira diferente.
