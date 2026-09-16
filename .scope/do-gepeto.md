### Gepeto disse:

Eu mudaria uma coisa importante na arquitetura: **não faria do `.virtual/` um mecanismo primariamente de busca textual**. Para o caso que você descreveu, o problema já tem uma solução matemática clássica muito próxima.

A formulação correta é:

$$
\boxed{
\text{documento}
\;\rightarrow\;
\text{árvore estrutural}
\;\rightarrow\;
\text{sequência ordenada dinâmica}
\;\rightarrow\;
\text{índice persistente de posições}
}
$$

O nome que estava faltando é principalmente **Order-Maintenance Problem**, complementado por **dynamic sequence/range queries** e **succinct tree navigation**. O problema de order-maintenance foi estudado precisamente para manter uma sequência sob inserções e remoções enquanto se responde eficientemente “\(x\) vem antes de \(y\)?”; Dietz e Sleator mostraram inclusive estruturas com operações em tempo constante no pior caso. ([DOI][1])

Mas há uma segunda questão: **como encontrar o nó original depois que o documento mudou?** Aí entramos em incremental parsing, índices de texto e, em casos extremos, FM-index/grammars. O truque é não usar a mesma estrutura para os dois problemas.

# Índice

* [1. O problema real](#1-o-problema-real)
* [2. O termo matemático](#2-o-termo-matemático)
* [3. Como responder “pegue o que está acima de X”](#3-como-responder-pegue-o-que-está-acima-de-x)
* [4. A descoberta crucial: identidade ≠ conteúdo](#4-a-descoberta-crucial-identidade--conteúdo)
* [5. Arquitetura matematicamente correta](#5-arquitetura-matematicamente-correta)
* [6. Onde entram FM-index, Merkle e estruturas sucintas](#6-onde-entram-fm-index-merkle-e-estruturas-sucintas)
* [7. Limite teórico](#7-limite-teórico)
* [8. Algoritmo recomendado](#8-algoritmo-recomendado)
* [9. Rust](#9-rust)
* [10. Conclusão](#10-conclusão)

## Glossário

| Termo                 | Papel no Glyph                                                 |
| --------------------- | -------------------------------------------------------------- |
| **Order Maintenance** | mantém a ordem relativa dos nós sob edição                     |
| **Predecessor**       | encontra o elemento imediatamente anterior                     |
| **Rank/Select**       | transforma posição estrutural em posição numérica e vice-versa |
| **LCA**               | encontra ancestral comum na árvore estrutural                  |
| **SCC**               | trata ciclos no grafo de dependências                          |
| **Rope**              | sequência editável eficiente                                   |
| **Merkle tree**       | fingerprint hierárquico                                        |
| **FM-index**          | localização de padrões no texto sem varredura linear           |
| **SSA/AST**           | representação estrutural do documento/código                   |
| **Path copying**      | técnica para versões persistentes de árvores                   |
| **fingerprint**       | evidência compacta de identidade/estado                        |

---

# 1. O problema real

Imagine:

```text
document.md

P1
P2
P3        ← Virtual Path aponta para P3
P4
P5
```

O Harness sabe:

```text
virtual = document.md#paragraph:abc123
```

Agora o usuário diz:

> “Leia o conteúdo acima de P3.”

A primeira reação seria:

```text
abrir document.md
procurar P3
contar linhas
voltar
```

É justamente isso que queremos eliminar.

A pergunta correta não é:

$$
\text{“onde está P3 no texto?”}
$$

Mas:

$$
\boxed{
\text{“qual é a posição estrutural de P3 na representação indexada?”}
}
$$

Se o sistema já conhece P3, procurar textualmente por P3 é desperdício.

---

# 2. O termo matemático

O núcleo é **Order Maintenance**.

Formalmente temos uma sequência:

$$
L=(x_1,x_2,\ldots,x_n)
$$

com operações:

$$
Insert(x_i,x_j)
$$

$$
Delete(x_i)
$$

e consulta:

$$
Order(x_i,x_j)
$$

que responde:

$$
x_i<x_j
$$

Dietz–Sleator estudaram exatamente essa classe de problema e obtiveram estruturas capazes de manter a ordem com custo constante em regimes apropriados. ([DOI][1])

Isso é quase literalmente:

> “este parágrafo está antes daquele?”

Mas podemos ir além.

Para o documento, não temos uma lista plana. Temos uma árvore:

```text
Document
├── Heading
│   ├── Paragraph
│   ├── Paragraph
│   └── Paragraph
├── Heading
│   ├── Paragraph
│   └── Paragraph
└── CodeBlock
```

Logo:

$$
T=(V,E)
$$

e cada nó possui uma posição em uma travessia preorder:

$$
\pi:V\rightarrow\{1,\ldots,n\}
$$

Então:

$$
\pi(u)<\pi(v)
$$

significa que \(u\) precede \(v\).

Estruturas de árvores sucintas usam justamente técnicas de `rank/select` e representações como balanced parentheses para permitir navegação estrutural muito eficiente. ([GitHub][2])

---

# 3. Como responder “pegue o que está acima de X”

Aqui fica interessante.

Suponha:

```text
Document
│
├── H1
│   ├── P1
│   ├── P2
│   └── P3 ← alvo
│
├── H2
│   └── P4
│
└── H3
```

Para a consulta:

```text
above(P3)
```

existem **três semânticas diferentes**.

### A. Irmão anterior

$$
previousSibling(P3)=P2
$$

### B. Tudo desde o início da seção

$$
range(section(P3).start,P3.start)
$$

### C. Tudo no documento antes de P3

$$
range(Document.start,P3.start)
$$

Essas três operações podem ser definidas **sem busca textual**.

Se o índice conhece:

$$
start(P3)=o
$$

então:

$$
read(0,o)
$$

resolve a terceira imediatamente.

O gargalo vira apenas a quantidade de informação que você pediu para retornar.

---

# 4. A descoberta crucial: identidade ≠ conteúdo

Aqui está, na minha leitura, a parte mais importante para o desenho do Glyph.

Você colocou uma restrição:

> não quero simplesmente guardar o próprio conteúdo final como atalho.

Correto.

Mas não precisamos guardar o conteúdo.

Precisamos guardar a **identidade estrutural do objeto**.

Por exemplo:

```text
NodeID = 8f2c...
```

O índice pode conter:

```text
NodeID
parent
previous
next
depth
start_offset
end_offset
subtree_size
fingerprint
```

Nada disso é o conteúdo.

Portanto:

$$
\boxed{
\text{identity metadata}
\neq
\text{cached content}
}
$$

E isso resolve uma dificuldade fundamental.

---

# 5. Arquitetura matematicamente correta

Eu faria o `.virtual/` como uma **estrutura de índices sobre uma representação estrutural**, não como um conjunto de atalhos.

```text
.guidelines/
│
├── .shortcuts/
├── .sources/
├── .plan/
│
└── .virtual/
    │
    ├── nodes
    ├── order
    ├── offsets
    ├── fingerprints
    ├── dependencies
    └── manifests
```

Internamente:

$$
\boxed{
Document
\rightarrow
AST
\rightarrow
Order\ Structure
\rightarrow
Offset\ Map
}
$$

Cada nó:

$$
v_i=
(id,parent,next,prev,depth,o_s,o_e,h)
$$

onde:

$$
[o_s,o_e)
$$

é o intervalo físico atual.

---

## O truque que torna isso realmente eficiente

Não use o número ordinal do nó como identidade.

Isto seria ruim:

```text
P1
P2
P3
```

porque inserir algo antes de P2 deslocaria tudo.

Use:

$$
ID(P2)=\text{stable identifier}
$$

e mantenha a ordem separadamente.

Isso é exatamente onde **order-maintenance** entra.

A estrutura pode saber:

```text
P1 < P2 < P3 < P4
```

sem que P3 dependa de ser “o terceiro”.

---

# 6. Onde entram FM-index, Merkle e estruturas sucintas

Agora chegamos ao ponto em que a matemática fica realmente interessante.

Existem **quatro problemas diferentes** e não devemos usar uma única estrutura para todos.

| Problema                                       | Estrutura                          |
| ---------------------------------------------- | ---------------------------------- |
| “Qual é este nó?”                              | stable ID / structural fingerprint |
| “Onde ele está?”                               | order-maintenance + offset index   |
| “O que está antes/depois?”                     | predecessor / sequence structure   |
| “O conteúdo mudou?”                            | Merkle/fingerprint                 |
| “Não consigo identificar o nó estruturalmente” | fallback full-text index           |

### 6.1. Stable identity

O ideal:

```text
NodeID = GUID
```

armazenado no sidecar:

```text
.virtual/nodes
```

O documento não precisa conter esse ID.

Isso mantém o arquivo humano-legível.

---

## 6.2. Offset index

Suponha:

$$
N=10^6
$$

nós.

Queremos:

$$
location(NodeID)\rightarrow(o_s,o_e)
$$

Uma tabela hash faz:

$$
O(1)
$$

esperado.

Se precisamos de ordenação espacial:

$$
BTreeMap
$$

dá:

$$
O(\log N)
$$

e suporta predecessor.

Isso já resolve uma quantidade enorme do problema.

---

## 6.3. Rope

Aqui aparece uma estrutura muito apropriada para o `.virtual/`.

Uma rope representa texto como árvore balanceada de chunks, mantendo comprimentos de subárvores, de modo que splits/concats e localização por posição possam ser feitos em \(O(\log n)\) em vez de mover o documento inteiro. ([Northwestern University PLT][3])

Então:

```text
Document
       │
       ▼
     Rope
    /    \
 chunk   chunk
```

A árvore estrutural do Markdown pode apontar para intervalos da rope.

Consequentemente:

$$
NodeID
\rightarrow
RopeRange
\rightarrow
bytes
$$

sem procurar no documento.

---

# 7. A solução híbrida que eu considero mais forte

Aqui está a arquitetura que eu escolheria.

```text
                       ┌───────────────┐
                       │ Source file   │
                       └───────┬───────┘
                               │
                               ▼
                       ┌───────────────┐
                       │ Incremental   │
                       │ Parser        │
                       └───────┬───────┘
                               │
                               ▼
                       ┌───────────────┐
                       │ Document AST  │
                       └───────┬───────┘
                               │
             ┌─────────────────┼─────────────────┐
             ▼                 ▼                 ▼
        Node identity     Order index       Offset index
             │                 │                 │
             ▼                 ▼                 ▼
          NodeID          predecessor       [start,end]
             │                 │                 │
             └─────────────────┼─────────────────┘
                               │
                               ▼
                       ┌───────────────┐
                       │ Query Engine  │
                       └───────┬───────┘
                               │
                    ┌──────────┼───────────┐
                    ▼          ▼           ▼
                  above       before      subtree
                    │          │           │
                    └──────────┼───────────┘
                               ▼
                           Context
```

Isso transforma:

> “procure aquele parágrafo”

em:

$$
\boxed{
ID
\rightarrow
node
\rightarrow
order/range
\rightarrow
extract
}
$$

---

# 8. E se o nó foi movido?

Aqui está a parte realmente difícil.

Imagine:

```text
commit 1

A
B ← target
C
D
```

Depois:

```text
commit 2

A
C
D
B ← target
```

O conteúdo de B é igual.

Seu offset mudou.

Um offset não é identidade.

O sistema precisa detectar:

$$
B_{old}\equiv B_{new}
$$

sem comparar o documento inteiro.

Há várias soluções.

## Caso ideal

O editor/harness sabe que:

```text
move(NodeID=B, after=D)
```

Então:

$$
O(1)
$$

ou próximo disso.

## Caso de edição externa

Use:

$$
fingerprint(B)
$$

com contexto estrutural:

$$
F(B)=H(
type(B),
H(parent(B)),
H(prev(B)),
H(next(B)),
content\_fingerprint(B)
)
$$

Agora o sistema possui uma assinatura.

Se o nó desapareceu na posição anterior, o indexador procura correspondência na região modificada.

Isso é **incremental**, não uma reindexação global.

---

# 9. E se nem isso funcionar?

Aqui entra o que você intuiu sobre busca.

Não devemos eliminar o `grep` completamente.

Devemos transformar:

$$
grep
$$

em:

$$
\boxed{\text{recovery mechanism}}
$$

e não:

$$
\boxed{\text{primary navigation mechanism}}
$$

A ordem seria:

```text
NodeID
   ↓
offset index
   ↓
structural fingerprint
   ↓
incremental changed-region search
   ↓
full-text index
   ↓
ambiguity/error
```

Para o último estágio, entram estruturas clássicas de **full-text indexing**.

Um FM-index, por exemplo, permite localizar padrões usando a BWT e estruturas `rank`, em vez de varrer todo o texto; variantes suportam `locate` de ocorrências. ([OUP Academic][4])

E existe pesquisa ainda mais recente sobre **dynamic grammar-compressed self-indexes**, especificamente para coleções de texto altamente repetitivas e sujeitas a inserções/remoções. ([DROPS][5])

Mas eu **não começaria com FM-index**.

Seria uma otimização prematura para o problema principal.

---

# 10. A formulação mais elegante

Há uma sequência matemática escondida aqui:

$$
\boxed{
\text{Semantic Node}
\rightarrow
\text{Stable Identity}
\rightarrow
\text{Order}
\rightarrow
\text{Range}
\rightarrow
\text{Bytes}
}
$$

Cada transformação possui uma responsabilidade diferente.

### Identidade

$$
id:N\rightarrow U
$$

### Ordem

$$
ord:N\rightarrow L
$$

### Localização

$$
loc:N\rightarrow [0,|T|)
$$

### Materialização

$$
extract([a,b))=T[a:b]
$$

Então:

$$
extract(loc(find(id)))
$$

é a operação fundamental.

Não existe `grep`.

---

# 11. Uma propriedade extremamente importante

Você perguntou:

> “sem necessidade de reler tudo”

Existe um limite matemático aqui.

Se alguém modificou arbitrariamente \(99\%\) do documento **sem que o sistema tenha recebido informação da mutação**, não há estrutura mágica capaz de descobrir exatamente o novo endereço de uma entidade sem inspecionar alguma informação sobre a região alterada.

Em outras palavras:

$$
\boxed{
\text{não é possível inferir informação que não foi observada}
}
$$

Portanto, para atingir o comportamento que você quer, o Glyph precisa assumir uma arquitetura **incremental/event-driven**:

```text
mutation
   ↓
parser
   ↓
update virtual index
   ↓
query
```

e não:

```text
mutation
   ↓
arquivo abandonado
   ↓
algum tempo depois
   ↓
Glyph tenta descobrir o que aconteceu
```

Esta distinção é fundamental.

---

# 12. Isso sugere algo ainda melhor para o Glyph

Em vez de `.virtual/` ser apenas:

```text
"atalhos"
```

eu o trataria como:

$$
\boxed{
\textbf{Materialized Structural Knowledge Base}
}
$$

ou, mais operacionalmente:

$$
\boxed{
\textbf{Incremental Context Index}
}
$$

O sistema mantém uma visão computável do documento.

Por exemplo:

```json
{
  "node": "01HF...",
  "kind": "paragraph",
  "parent": "01HE...",
  "previous": "01HD...",
  "next": "01HG...",
  "start": 18240,
  "end": 19422,
  "fingerprint": "sha256:...",
  "version": 317
}
```

O conteúdo não está armazenado.

Somente:

$$
\text{where}
+
\text{what}
+
\text{relationship}
+
\text{proof}
$$

---

# 13. Agora vem uma consequência muito interessante para a síntese da IA

Considere o estado atual:

```text
User:
"leia o conteúdo acima daquele parágrafo"
```

Sem estrutura:

$$
IA:
search
\rightarrow
inspect
\rightarrow
guess
\rightarrow
search
\rightarrow
inspect
\rightarrow
synthesize
$$

Com `.virtual/`:

$$
IA:
query(NodeID)
\rightarrow
predecessor/range
\rightarrow
extract
$$

Portanto:

$$
D_{model}
=
D_{search}
+
D_{navigation}
+
D_{interpretation}
$$

passa a aproximadamente:

$$
D_{model}
\approx
D_{interpretation}
$$

onde \(D\) é o espaço de decisões que o modelo precisa tomar.

**Esse é exatamente o tipo de redução que você está procurando.**

---

# 14. O algoritmo que eu escolheria

Minha versão final seria:

$$
\boxed{
\text{Incremental Structural Order Index}
}
$$

composto por:

### Camada 1 — AST

Markdown/JSON/XML/código são convertidos em árvores.

### Camada 2 — Stable Node IDs

Cada entidade estrutural recebe identidade persistente.

### Camada 3 — Order Maintenance

Mantém:

$$
before(a,b)
$$

sob inserções/movimentações/deleções.

Dietz–Sleator fornecem uma base teórica clássica para isso. ([DOI][1])

### Camada 4 — Offset/Rope

Mapeia:

$$
NodeID\rightarrow[start,end)
$$

e permite extração eficiente.

### Camada 5 — Fingerprints

Detecta:

$$
state_{old}\neq state_{new}
$$

sem comparar semanticamente tudo.

### Camada 6 — Dependency Graph

Mantém:

$$
code\leftrightarrow documentation
$$

e propagação de invalidação.

### Camada 7 — Recovery Index

Só quando identidade estrutural falhar:

$$
FM\text{-}index / q\text{-}gram / search
$$

FM-index e outros self-indexes são precisamente estruturas destinadas a localizar padrões sem uma varredura tradicional do texto. ([DROPS][5])

---

# 15. Complexidade alvo

Para um nó já conhecido:

$$
\boxed{
NodeID\rightarrow Node = O(1)
}
$$

hash esperado.

Consulta de ordem:

$$
\boxed{
order(a,b)=O(1)
}
$$

com uma estrutura de order-maintenance apropriada. ([DOI][1])

Predecessor:

$$
\boxed{
O(\log n)
}
$$

com árvore ordenada convencional, ou melhor em estruturas especializadas.

Extração:

$$
\boxed{
O(\log n + L)
}
$$

onde \(L\) é o tamanho do conteúdo efetivamente retornado.

Esse \(+L\) não pode desaparecer: para entregar \(L\) bytes ao modelo, precisamos materializar \(L\) bytes.

Atualização incremental:

$$
O(k\log n)
$$

onde \(k\) é aproximadamente o número de nós estruturais afetados pela edição, e não o tamanho total do repositório.

---

# 16. O resultado conceitual

Eu resumiria toda essa investigação em uma frase:

$$
\boxed{
\textbf{Não indexe textos. Indexe posições semânticas em estruturas ordenadas.}
}
$$

O texto passa a ser apenas a representação física.

A informação primária do `.virtual/` passa a ser:

```text
identity
topology
order
range
provenance
version
dependency
```

E, então:

```text
"o que vem acima de X?"
```

deixa de ser um problema de **information retrieval**.

Vira um problema de:

$$
\boxed{
\text{order query}
+
\text{range query}
}
$$

Isso é muito mais barato.

E há uma consequência ainda mais forte: **a âncora textual deixa de ser a identidade principal**. `#button-accessibility` pode continuar existindo como interface humana, mas internamente ela resolve uma vez para um `NodeID`. A partir daí, o sistema trabalha matematicamente com a entidade estrutural.

Essa, na minha avaliação, é a arquitetura que mais se aproxima daquilo que você está tentando construir: não um “grep mais inteligente”, mas uma **máquina de coordenadas semânticas para o repositório**, na qual a IA consulta relações já materializadas em vez de reconstruí-las por inferência em cada execução.

[1]: https://doi.org/10.1145/28395.28434?utm_source=chatgpt.com "Two algorithms for maintaining order in a list | Proceedings of the nineteenth annual ACM symposium on Theory of computing"
[2]: https://github.com/Cydhra/vers?utm_source=chatgpt.com "GitHub - Cydhra/vers: Succinct data structures using very efficient rank and select · GitHub"
[3]: https://plt.cs.northwestern.edu/release-pkg-build/doc/rope/index.html?utm_source=chatgpt.com "Ropes: An Alternative to Strings"
[4]: https://academic.oup.com/bioinformatics/article/36/2/400/5538990?utm_source=chatgpt.com "Haplotype-aware graph indexes | Bioinformatics | Oxford Academic"
[5]: https://drops.dagstuhl.de/entities/document/10.4230/LIPIcs.ESA.2026.6?utm_source=chatgpt.com "Dynamic Grammar-Compressed Self-Index in δ-Optimal Space"
