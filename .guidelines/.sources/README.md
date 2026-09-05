# Fontes — o que veio de fora, e o que decidiu

> Só entra aqui referência que foi **de fato usada** e que **decidiu alguma
> coisa**. Uma lista de links que não decidiram nada é bibliografia, não atalho.
>
> Reconstruir uma busca externa é o que mais custa ao retomar um projeto — é
> por isso que este eixo existe.

## Documentos

| arquivo | assunto | decidiu |
|---|---|---|
| [`COMPILER_LESSONS.md`](COMPILER_LESSONS.md) | falhas comuns em compiladores, e o que fazer com mensagem de erro | o gatilho **aponta**, não explica; `suggest()` precisa de filtro semântico, não de limiar melhor; ~85% dos erros reais são delimitação, não lógica |

## Referências externas, por assunto

### Mensagem de erro — o que funciona

- [Not the Silver Bullet: LLM-enhanced Programming Error Messages are Ineffective in Practice](https://arxiv.org/abs/2409.18661) (2024) — GPT-4 venceu o compilador em **1 de 6** tarefas; escritas à mão venceram em **5 de 6**, 35–122 s mais rápido. Conter a solução correta **não basta**.
- [Compiler Error Messages Considered Unhelpful](https://dl.acm.org/doi/10.1145/3344429.3372508) — Becker et al., ITiCSE 2019, 219 referências. Legibilidade depende de comprimento, jargão, estrutura e vocabulário. Detalhar mais **não** simplifica.
- [Elm — amazing, informative, paternalistic error messages](https://jamalambda.com/posts/2021-06-13-elm-errors.html) — esconder a representação interna, dizer o erro exato que se acha ter sido cometido.

### Erros reais, medidos

- [Syntax and Stack Overflow: extracting a corpus of syntax errors and fixes](https://arxiv.org/abs/1907.07803) — distribuição real: 41,8% "sintaxe inválida", 42,9% indentação, 4,3% EOF inesperado, 3,3% literal não fechado. Erro de gente real **difere** do de estudante e do de mutação aleatória.

### Sugestão "did you mean" — armadilhas já pagas

- [Rust RFC 1644 — default and expanded rustc errors](https://rust-lang.github.io/rfcs/1644-default-and-expanded-rustc-errors.html) — os princípios que Rust e Elm convergiram.
- [rust#147595](https://github.com/rust-lang/rust/issues/147595) — o sugeridor não filtra nomes textualmente dissimilares. É o `RULE → TRUE` do Glyph.
- [rust#46332](https://github.com/rust-lang/rust/issues/46332) — tentar capitalização diferente **antes** da distância de edição.
- [cargo#10224](https://github.com/rust-lang/cargo/pull/10224) — distância insensível a maiúsculas.
- [rust#38927](https://github.com/rust-lang/rust/pull/38927) — a sugestão por Levenshtein começou restrita e foi ampliada depois; ampliar cedo produz sugestão confiante e errada.

## A fonte primária, e ela é interna

`glyph-variable-naming-system.pgml` — as onze palavras que o Autor da Ordem
escreveu de verdade e o motor recusou. Vale mais que qualquer corpus sintético,
pelo mesmo motivo que o paper do StackOverflow dá: **erro de gente real
trabalhando não se parece com erro inventado.**
