# O que os compiladores já pagaram para aprender

> **Pesquisa externa, pedida pelo Regente em 2026-09-05:** *"consegue buscar no
> StackOverflow, GitHub ou outras fontes da internet por falhas comuns em
> compiladores para usar como exemplo em situações de lógica que o próprio Glyph
> possa captar diretamente da caixa de texto do Autor da Ordem?"*
>
> Cada seção termina no que ela **decide** para o Glyph. O que não decide nada
> não está aqui.

## 0. A medição que vale mais que a bibliografia

As onze palavras que o Autor da Ordem escreveu de verdade e o motor recusou, em
`glyph-variable-naming-system.pgml`, contra o que `suggest()` respondeu:

| escreveu | motor sugeriu | |
|---|---|---|
| `ITER` | `ITR` (d=1) | ✅ |
| `PART` | *resolve desde 3.4.7.05* | ✅ |
| `SEC` | `SPEC` (d=1) | ❌ |
| `DOC` | `EXC` (d=2) | ❌ |
| `DESC` | `EXC` (d=2) | ❌ |
| `RULE` | **`TRUE`** (d=2) | ❌ |
| `SCOPE` | `CORE` (d=2) | ❌ |
| `CMD` | `CMP` (d=1) | ❌ |
| `CMD2` | `CMP` (d=2) | ❌ |
| `SYNTAX` | (nenhuma) | ❌ |
| `RESULT` | (nenhuma) | ❌ |

**1 acerto em 11.** `RULE → TRUE` resume o defeito: distância ortográfica pura,
zero semântica. Nada em *rule* significa *true* — só se parecem.

Isto é erro de gente real trabalhando, e §3 mostra que esse corpus não se parece
com o de estudante nem com o de mutação aleatória. Vale mais que qualquer suíte
sintética que se possa inventar.

## 1. O resultado contra-intuitivo, e é o que decide o desenho

**[Not the Silver Bullet: LLM-enhanced Programming Error Messages are Ineffective
in Practice](https://arxiv.org/abs/2409.18661)** (2024) comparou mensagens de
erro do compilador, geradas por GPT-4, e escritas à mão por especialistas:

- GPT-4 venceu o compilador em **1 de 6** tarefas
- **escritas à mão venceram em 5 de 6**, de **35 a 122 segundos** mais rápido
- 88,1% acharam as escritas à mão "no tamanho certo"; as do GPT-4 se espalharam

E o detalhe que importa: as mensagens do GPT-4 **continham a solução correta** e
tiveram nota subjetiva melhor — e ainda assim ninguém depurou mais rápido. Os
autores atribuem a um deslocamento de papel: de **solucionador ativo** para
**avaliador passivo**.

> *"a usabilidade de uma mensagem de erro é mais complexa do que o texto conter
> ou não a solução correta"*

**Decide:** o gatilho do Glyph **não deve explicar**. Deve **oferecer o comando**.
É a re-ferência que o Regente pediu, e a pesquisa diz que explicar melhor não
substitui apontar certo.

## 2. O que decide legibilidade, medido

**[Compiler Error Messages Considered Unhelpful](https://dl.acm.org/doi/10.1145/3344429.3372508)**
— Becker et al., ITiCSE 2019, revisão sistemática, 219 referências.

Quatro fatores com suporte empírico: **comprimento**, **jargão**, **estrutura da
frase**, **vocabulário**. E a conclusão que contraria o instinto:

> *"mensagens mais detalhadas não simplificam necessariamente o entendimento;
> importa mais onde a informação está colocada e como está estruturada"*

**Decide:** ao escrever diagnóstico, cortar antes de acrescentar. Foi exatamente
o erro do `TruncatedLiteral`, que dizia *"Feche com ` antes"* — texto suficiente,
posto no lugar errado, descrevendo um conserto já aplicado.

## 3. O corpus de erros reais

**[Syntax and Stack Overflow: A methodology for extracting a corpus of syntax
errors and fixes](https://arxiv.org/abs/1907.07803)**

| categoria | fatia |
|---|---|
| sintaxe inválida (genérico) | **41,8%** (26.336 ocorrências) |
| indentação — bloco esperado 23,1%, indentação inesperada 17,5%, desalinhada 2,3% | **42,9%** |
| parênteses faltando (print) | 4,9% |
| **EOF inesperado** — construto não fechado | 4,3% |
| **literal de string não fechado** | 3,3% |
| tab misturado com espaço | 0,5% |

Dois achados:

1. **~85% é delimitação, não lógica.** "Não fechei" ou "aninhei errado". É a
   família exata dos defeitos do Glyph: `TruncatedLiteral`,
   `UnmatchedCloseBracket`, `UnclosedRaw`, `UnclosedLogic`, e o `;;` que migra.
2. **"Sintaxe inválida" com 41,8% é o anti-padrão** — a mensagem que não diz nada.

O paper também registra que erro de gente real **difere** do de estudante e do de
mutação aleatória. É o argumento para §0 ser a fonte primária deste repositório.

**Decide:** o esforço rende mais em delimitação do que em lógica, e nenhum
diagnóstico do Glyph pode ser um "sintaxe inválida" genérico.

## 4. Os princípios que Rust e Elm convergiram

**[Rust RFC 1644](https://rust-lang.github.io/rfcs/1644-default-and-expanded-rustc-errors.html)**
— e o Rust aprendeu do Elm, não o contrário.

- **foco no código do autor**, não na máquina
- o **"o quê"** e o **"porquê"**, nessa ordem
- o código do autor **visualmente distinto** do texto do compilador
- a mensagem como **guia**, não como despejo de estado interno

Do lado do Elm, a formulação é mais direta: esconder a representação interna da
falha e apresentar, em linguagem simples, **o erro exato que ele acha que você
cometeu**, com sugestão de conserto — tratando o erro como oportunidade de
ensinar
([Jamalambda](https://jamalambda.com/posts/2021-06-13-elm-errors.html)).

## 5. As armadilhas do "did you mean" que já foram pagas

Vale ler antes de mexer no `suggest()`, porque são exatamente os erros de §0:

- **[rust#147595](https://github.com/rust-lang/rust/issues/147595)** — o sugeridor
  *"não filtra itens com nomes textualmente dissimilares"*. É o `RULE → TRUE`.
- **[rust#46332](https://github.com/rust-lang/rust/issues/46332)** — tentar
  **capitalização diferente antes** da distância de edição.
- **[cargo#10224](https://github.com/rust-lang/cargo/pull/10224)** — distância
  insensível a maiúsculas ajuda em abreviações.
- **[rust#38927](https://github.com/rust-lang/rust/pull/38927)** — sugestão por
  Levenshtein começou restrita a campos e locais, e foi ampliada depois. Ampliar
  cedo demais é o que produz sugestão confiante e errada.
- Sugestão marcada como *machine applicable* **não pode gerar código inválido**.

**Decide:** `suggest()` precisa de **filtro semântico**, não de limiar melhor.
Candidatos que o Glyph já tem, sem inventar nada: categoria (`CAT_OF`), espécie
(`speciesOf`), e a própria tabela de composição.

## 6. Onde a lógica de programação entra

A família que os linters cobrem: **condição sempre verdadeira**, **código
inalcançável**, **off-by-one**. E o limite arquitetural que interessa:

> *"uma regra de lint trabalha sobre a AST de um único arquivo, sem fluxo de
> dados entre arquivos"*

**O Glyph está exatamente nesse nicho** — um documento, uma AST, e desde
`3.4.7.05` um começo de **grafo de nomes** com `binds`/`ref`.

Três detecções decidíveis hoje, sem mecanismo novo:

| detecção | com o que já existe |
|---|---|
| nome ligado e nunca referenciado | subtração de conjuntos entre `binds` e `ref` |
| composto profundo sem operando | `depthOf` — medido: limiar 5 dispara em 4% do corpus |
| conjunção onde sequência era mais provável, ou o inverso | `<holds>` passou a distinguir as duas em `3.4.7.05` |

## 7. O que este documento NÃO autoriza

Nada aqui autoriza o motor a **adivinhar intenção**. Todas as decisões acima são
lookup em tabela que já existe — categoria, espécie, composição, grafo de nomes.
No instante em que um gatilho precisar comparar significados que nenhuma tabela
relaciona, ele virou síntese, e `PROMOTION_BOUNDARY.md` §2 já diz o que fazer:
recusar.
