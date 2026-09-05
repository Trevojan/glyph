# Perguntas abertas — para o Regente preencher

> **Como usar:** cada pergunta traz a situação **medida** (não inventada), as
> opções com o que cada uma produz de fato, o que cada uma custa, e uma
> recomendação. Preencha a linha `RESPOSTA:` e devolva. Se a recomendação servir,
> escreva só `ok`.
>
> Nenhuma delas exige que você infira nada: os bytes de cada opção estão escritos.

---

## 1. `;;` — consertar ou aposentar?

### O que acontece hoje, medido

`;;` **não apita erro** em posição nenhuma. Parse limpo, emite `<break/>`. Mas:

```
ida  : [nt`a`];;[nt`b`]
volta: [nt'a'][nt'b'];;          <- a quebra MIGROU para o fim
```

E na queima ela **desaparece inteira** — zero rastro no `.hgml`.

Ou seja: ela existe no documento, não sobrevive à própria ida e volta, e não
significa nada para o consumidor final.

### Opções

**(a) Consertar a posição.** `<break/>` passa a ser emitido entre os blocos, e a
volta o recoloca lá.

```xml
<block once="true"><note>…a…</note></block>
<break/>                              <!-- fica aqui, entre os dois -->
<block once="true"><note>…b…</note></block>
```
Custo: mexer em `packageUnpass` e no montador de blocos. A quebra continua sem
significado para o consumidor — só passa a ficar no lugar certo.

**(b) Aposentar.** `;;` sai da gramática e vira **reconhecedor**: quem escrever
recebe `fix` dizendo que foi retirado e o que usar no lugar (`;`).
Custo: é decisão de release (dígito `release`). Precisa dizer o que substitui.

**(c) Dar significado a ela.** `;;` passa a significar algo que o `.hgml` também
carregue — por exemplo, "corte duro: o que vem depois não herda contexto".
Custo: é feature nova, e precisa de medição antes.

> **Recomendo (b).** Você disse que ela "não tem uso nenhum", e a medição
> concorda: não sobrevive ao round-trip nem à queima. Um construto que não
> significa nada no baixo nível não deveria existir no alto. E o método já tem
> a forma pronta — construto aposentado vira reconhecedor, nunca é apagado no
> silêncio.

**RESPOSTA:**

---

## 2. `;` dentro de literal — as duas aspas discordam

### O que acontece hoje, medido

```
[nt`a ; b`]     ->  TruncatedLiteral ×2, UnmatchedCloseBracket
[nt'a ; b']     ->  limpo, <user-input>a ; b</user-input>
```

**`;` encerra um literal de crase e não encerra um de apóstrofo.** As duas formas
de aspas deveriam ser intercambiáveis — a crase existe para você poder escrever
apóstrofo dentro, e vice-versa. Hoje elas têm gramáticas diferentes.

Isso também é o que matou a entidade `&#93;` quando testei escapes: ela morre no
`;`, e eu tinha visto o sintoma sem ver a assimetria.

### Opções

**(a) A crase passa a tolerar `;`**, como o apóstrofo já faz.
```
[nt`a ; b`]  ->  limpo, <user-input>a ; b</user-input>
```
Custo: baixo. Ganho: `;` fica utilizável em texto, e as duas aspas concordam.
Risco: um `;` separador esquecido dentro de uma crase passa a não ser detectado —
mas isso já é verdade para o apóstrofo hoje.

**(b) O apóstrofo passa a recusar `;`**, como a crase já faz.
```
[nt'a ; b']  ->  TruncatedLiteral
```
Custo: **quebra fontes existentes** que hoje passam limpas. Ganho: `;` continua
inequivocamente separador.

> **Recomendo (a).** O apóstrofo é a forma mais antiga e mais usada, então (b)
> quebraria mais. E a regra fica mais simples de dizer: *dentro de um literal,
> só a aspa que o abriu o fecha* — que é o que o Autor da Ordem já espera.

**RESPOSTA:**

---

## 3. Parâmetro de template escrito nu

### O que acontece hoje, medido

```
[--germinate`a`,`b`]   ->  limpo, os dois preenchem os placeholders
[--germinate'a','b']   ->  limpo, IDÊNTICO ao anterior
[--germinate a,b]      ->  ask/PlaceholderPending ×2
                           os valores caem como <off>a</off> <off>b</off>
```

Sua frase estava exata: **param de template é sempre literal**. As duas aspas
servem; a palavra nua não. E o que ela faz hoje é o pior dos mundos — os valores
não somem (viram `<off>`, prosa) e os buracos ficam abertos, então o documento
sai com uma pergunta que o autor já respondeu.

### Opções

**(a) Recusar mais alto.** A palavra nua vira `fix`, com a mensagem apontando:
*"parâmetro de template precisa de aspas: `[--germinate\`a\`,\`b\`]"*.
Custo: baixo. Ganho: o autor descobre na hora.

**(b) Aceitar a palavra nua como literal.** `[--germinate a,b]` passa a
preencher, igual às aspas.
Custo: a palavra nua já significa **prosa** (`<off>`) em todo o resto da
gramática. Fazer dela literal só dentro de template cria uma regra de exceção.

> **Recomendo (a).** (b) trocaria um erro visível por uma exceção invisível na
> gramática, e a pesquisa em `.sources/COMPILER_LESSONS.md` §1 diz que apontar o
> conserto exato bate qualquer coisa mais esperta.

**RESPOSTA:**

---

## 4. A `<section>` de cabeçalho — o exemplo trabalhado

> **Esta é a que mais precisa de você**, então vai inteira, com os bytes.

Você decidiu a colocação: irmã do `<schema/>`. Falta o **conteúdo**.

### A fonte

```
[in
  [tgt`TurnService`]
  [var`ordem_atual`[get-find`~/turns.json`]]
  [rev-cmp,eval`ordem_atual contra a esperada`]
  [var`esperada`[ref`docs/combate.md`]]]
```

Duas variáveis, declaradas **no meio dos comandos** — `ordem_atual` no segundo
item, `esperada` no último. É exatamente o caso que você descreveu: *"não importa
qual momento seja"*.

### O que o motor emite HOJE (3.4.7.05) — colado da saída real

```xml
<glyph-package engine="3.4.7.05">
  <schema/>
  <block once="true">
    <instruction>
      <target>
        <user-input>TurnService</user-input>
      </target>
      <variable binds="ordem_atual">
        <user-input>ordem_atual</user-input>
        <get>
          <chain><find/></chain>
          <user-input>~/turns.json</user-input>
        </get>
      </variable>
      <review>
        <chain><compare/><evaluate/></chain>
        <user-input>ordem_atual contra a esperada</user-input>
      </review>
      <variable binds="esperada">
        <user-input>esperada</user-input>
        <reference>
          <user-input>docs/combate.md</user-input>
        </reference>
      </variable>
    </instruction>
  </block>
</glyph-package>
```

As ligações **existem** (`binds`), mas quem lê precisa **varrer a árvore**
inteira para saber quais nomes existem. É o esforço que você quer eliminar.

#### E aqui apareceu uma coisa que eu não sabia

Eu tinha escrito este exemplo à mão com `ref="ordem_atual"` naquele
`<user-input>` do `<review>`. **O motor não põe.** E está certo em não pôr:
`ref` casa o literal **inteiro**, e o literal ali é a frase
`"ordem_atual contra a esperada"`, não o nome sozinho.

Ou seja: **um nome citado dentro de uma frase não é resolvido.** Só é referência
o literal que É o nome. A alternativa — procurar o nome como pedaço da frase —
seria casar por coincidência de palavra, que é síntese, e
`PROMOTION_BOUNDARY.md` §2 manda recusar.

Isso muda a pergunta 4: se o cabeçalho só listar o que `ref` já resolve, ele vai
listar **menos** do que o documento realmente usa. O cabeçalho precisa vir de
`binds` (as declarações), não de `ref` (os usos) — e é o que as três opções
abaixo fazem.

### Opção (a) — inventário: só nome e origem

```xml
<glyph-package engine="3.4.7.05">
  <schema/>
  <section kind="logic">
    <needs var="ordem_atual" from="variable"/>
    <needs var="esperada" from="variable"/>
  </section>
  <block once="true">…</block>
</glyph-package>
```
Diz **quais** nomes existem. Não diz o que são.
Custo: baixo — é um `walk` que já escrevi (`collectBindings`).

### Opção (b) — declaração: nome, origem e o que ele produz

```xml
<section kind="logic">
  <rule kind="binding" var="ordem_atual">
    <source>[var`ordem_atual`[get-find`~/turns.json`]]</source>
    <reads>[GET[FIND]]</reads>
    <uses>~/turns.json</uses>
  </rule>
  <rule kind="binding" var="esperada">
    <source>[var`esperada`[ref`docs/combate.md`]]</source>
    <reads>[REF]</reads>
    <uses>docs/combate.md</uses>
  </rule>
</section>
```
Diz **o que cada nome é**, sem quem lê ter de descer na árvore. Reusa **exatamente**
a forma que `<logic>` já emite hoje (`<rule kind>`, `<source>`, `<reads>`,
`<uses>`) — que é a evolução Darwiniana que você pediu.
Custo: médio. Duplica conteúdo que também está no corpo — mas duplicar aqui é o
ponto: o cabeçalho existe para não ser preciso ir ao corpo.

### Opção (c) — (b) mais os caminhos de arquivo

Igual a (b), e `<uses>` também recolhe **todo** caminho de arquivo do documento,
esteja ou não numa variável — porque você disse *"caminhos de arquivos, tudo
organizado pré-mastigado para o harness"*.

```xml
<section kind="logic">
  <rule kind="binding" var="ordem_atual">…</rule>
  <rule kind="binding" var="esperada">…</rule>
  <paths>
    <path>~/turns.json</path>
    <path>docs/combate.md</path>
  </paths>
</section>
```
Custo: preciso de uma regra para "isto é um caminho". A mais segura é sintática:
contém `/` ou começa com `~`, `.` ou uma letra de unidade. Nada de adivinhação
semântica.

> **Recomendo (c)**, construída em duas etapas: (b) primeiro, `<paths>` depois,
> em commits separados — assim se a regra de caminho estiver errada, ela sai
> sozinha sem levar as ligações junto.

**RESPOSTA:**

**Se escolher (c), a regra de caminho:**
`RESPOSTA (o que conta como caminho):`

---

## 5. Ponteiro de aposentadoria

### A situação

O vetor `N-13` do corpus se chama *"BASE deixou de ser comando — CORE tomou o
lugar"*. O que o motor diz hoje:

```
[fix] UnknownCommand — [BASE fora do vocabulário. Veja a tabela.
```

Ele sabe que `BASE` foi aposentado — está escrito em `GLOSSARY.md` §0.2 — e não
conta. O método diz *"construto aposentado vira reconhecedor, nunca é apagado no
silêncio"*, e essa metade nunca foi construída para **comandos** (só para a raiz
`<glyph>`).

### O que seria

```
[fix] Retired — [BASE foi aposentado. CORE tomou o lugar (GLOSSARY §0.2).
```

### Opções

**(a) Uma tabela de aposentadoria** em `expansions.json` ou num store próprio:
`{ "BASE": { "since": "1.2.0.0", "use": "CORE", "why": "GLOSSARY §0.2" } }`.
Custo: baixo. Precisa ser preenchida à mão, uma vez, com o que já está escrito.

**(b) Não fazer.** O silêncio já é melhor que o palpite errado de antes.

> **Recomendo (a)**, e ela cobre mais do que `BASE`: as sete fusões desfeitas na
> v1.1.0.0 (`FOREX→EX`, `QST→ASK`, `EVAL→CRIT`, `REV→CRIT`, `ONLYIF→COND`,
> `SPEC→ELAB`, `SIMP→CLAR`) estão comentadas no código e não chegam ao Autor da
> Ordem.

**RESPOSTA:**

---

## 6. O que o motor diz quando não tem o que sugerir

### Hoje

```
[fix] UnknownCommand — [RULE fora do vocabulário. Veja a tabela.
```

*"Veja a tabela"* é o que a pesquisa chama de mensagem que não aponta — a mesma
família do `SyntaxError: invalid syntax` que é 41,8% do corpus do StackOverflow.

### Opções

**(a) Deixar como está.** Honesto, e curto.

**(b) Dizer onde está a tabela.** *"…fora do vocabulário. A lista está em
`XML_REFERENCE.md` §4, ou digite `[` para ver as opções."*
Custo: baixo. Amarra a mensagem a um caminho de arquivo, que pode envelhecer.

**(c) Oferecer a categoria.** Se `[RULE` aparece onde só cabe uma restrição, o
motor diz quais comandos cabem ali. Custo: precisa de um modelo de "o que cabe
aqui", que ainda não existe.

> **Recomendo (b)** agora e **(c)** depois — (c) é o gatilho de re-ferência de
> verdade, e ele merece medição própria antes.

**RESPOSTA:**

---

## O que eu faço sem você

Independente das respostas acima, sigo com:

- o içamento em si — o `walk` que coleta as ligações já existe
- o filtro semântico do `suggest()` **já entrou** (3 úteis, 8 silêncios, 0 palpites)
- a subtração `binds` − `ref`, que dá "nome ligado e nunca usado"
- o emissor de bundle `ORD-xxxxx`, que hoje não existe em forma nenhuma

Se preferir, responda só a **4** — é a que bloqueia mais coisa.
