# `conformance/` — manual simples

Dois arquivos. Um é a **afirmação**, o outro é o **golden**.

| arquivo | o que é | quem escreve |
|---|---|---|
| `examples.json` | fontes Glyph escritas à mão pelo Regente, com o XML que o motor responde | **fonte: humano. XML: motor.** |
| `golden.json` | o mesmo XML, derivado da especificação **antes** de existir emissor (lock T5) | ninguém edita à mão |

Hoje os dois são iguais byte a byte. Isso é o emissor cumprindo a afirmação —
nunca a afirmação sendo tirada do emissor.

## A regra única

**A fonte é a afirmação. O XML é o que o motor responde.**

Você escreve `src`. Nunca escreve `xml`. Se o XML muda, isso é *decisão de
release* e precisa de explicação — não é para ser absorvido em silêncio.

## Adicionar um caso

1. Escreva a fonte (só a fonte).
2. Me entregue. Eu calculo `xml`, `digest`, `roundTrips` e devolvo a entrada pronta.
3. `npm run check`.

O passo 2 é manual porque **o motor ainda não lê arquivo** — `glyph-cli.js`
recebe fonte por argv, não caminho. É o item A da `.orders/INTAKE-VARIABLES.md`;
depois dele isso vira um comando.

## Os campos, e por que existem

| campo | significa |
|---|---|
| `id` | rótulo humano — `E-01`. **Não é identidade.** |
| `digest` | 12 hex de sha256 sobre `src`. **É a identidade.** |
| `roundTrips` | fixado por caso: `toXML(fromXML(xml)) === xml` |
| `pinnedTo` | o `digest` que a ressalva desculpa |

`pinnedTo` prende a ressalva à **fonte**, não à posição. Uma ressalva que migra
para outro caso não perde a razão — ela **adquire uma falsa**, e o lock T10 não
pega isso.

`roundTrips` é fixado por caso e não exigido de todos: E-01 carrega apóstrofo, e
o README documenta que ele é substituído. Exigir estabilidade de todo mundo faria
uma perda documentada parecer defeito; não exigir de ninguém deixaria uma
regressão real se esconder atrás dela. **Um caso que muda de resposta falha nos
dois sentidos.**

Nota: `roundTrips` compara **XML**, não fonte. `[in` volta como `[ins` e isso não
quebra nada — o XML é idêntico.

## As armadilhas ao escrever a fonte

**`]` não pode aparecer dentro de um literal.** Sob nenhuma aspa. Não há escape:
contrabarra não existe, dobrar não funciona, e entidade morre no `;`. O
diagnóstico diz *"Feche com ` antes"*, que é conselho já seguido — o culpado é o
colchete e a mensagem não diz isso.

`README.md:66` lista `' \` [ ]` como *substituídos em vez de preservados*.
Medido, por caractere:

| | comportamento real |
|---|---|
| `'` | substituído (`'` → `’`) — confere |
| `` ` `` | substituído (→ `’`) — confere |
| `[` | substituído (→ `(`) — confere |
| `\` | **preservado.** O README diz substituído |
| `]` | **recusado no parse.** Nunca chega ao round-trip |

Use crase para o literal e apóstrofo dentro dele, nunca o contrário.

## E-06 — o caso que falta (Q14)

Os cinco existentes carregam **zero `origin="item"`** — medido, um por um. Sem
isso o K1 não alcança a regra de posição do `PACKAGE_TARGET.md` §3.2: numa cadeia,
o primeiro membro é o `-` e o resto é `,`, e **nenhum membro carrega atributo
porque a posição carrega o operador**. Uma cadeia de um membro só não prova isso.

Por isso E-06 precisa de uma **cadeia nua de dois membros**. Base verificada em
2.4.6.04:

```
[in
  [tgt`ChainDemo`]
  [rev-cmp,eval`the current order against the expected one`]
  [instof-add`do not redesign the caller.`]]
```

Sai como `<chain><compare/><evaluate/></chain>` — zero diagnósticos,
`roundTrips: true`, `digest: bda7e6415f25`, e **1 nó `origin="item"`**, o único
do corpus inteiro.

A base é ponto de partida, não a resposta: o conteúdo é seu. Só mantenha o
`[tgt`, a cadeia nua de dois membros, e nenhum `]` dentro de literal.
