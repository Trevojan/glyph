# Perguntas abertas — para o Regente preencher

> **Como usar:** cada pergunta traz a situação **medida** (não inventada), as
> opções com o que cada uma produz de fato, o que cada uma custa, e uma
> recomendação. Preencha a linha `RESPOSTA:` e devolva. Se a recomendação servir,
> escreva só `ok`.
> Nenhuma delas exige que você infira nada: os bytes de cada opção estão escritos.
---
## 1. `;;` — consertar ou aposentar?  
### O que acontece hoje, medido
`;;` **não apita erro** em posição nenhuma. Parse limpo, emite `<break/>`. Mas:
```
ida  : [nt`a`];;[nt`b`]
volta: [nt'a'][nt'b'];;   <- a quebra MIGROU para o fim
```
E na queima ela **desaparece inteira** — zero rastro no `.hgml`.
Ou seja: ela existe no documento, não sobrevive à própria ida e volta, e não significa nada para o consumidor final.
### Opções
**(a) Consertar a posição.** `<break/>` passa a ser emitido entre os blocos, e a volta o recoloca lá.
```xml
<block once="true"><note>…a…</note></block>
<break/>                              <!-- fica aqui, entre os dois -->
<block once="true"><note>…b…</note></block>
```
Custo: mexer em `packageUnpass` e no montador de blocos. A quebra continua sem significado para o consumidor — só passa a ficar no lugar certo.
**(b) Aposentar.** `;;` sai da gramática e vira **reconhecedor**: quem escrever recebe `fix` dizendo que foi retirado e o que usar no lugar (`;`).
Custo: é decisão de release (dígito `release`). Precisa dizer o que substitui.
**(c) Dar significado a ela.** `;;` passa a significar algo que o `.hgml` também carregue — por exemplo, "corte duro: o que vem depois não herda contexto".

Custo: é feature nova, e precisa de medição antes.

> **Recomendo (b).** Você disse que ela "não tem uso nenhum", e a medição concorda: não sobrevive ao round-trip nem à queima. Um construto que não significa nada no baixo nível não deveria existir no alto. E o método já tem a forma pronta — construto aposentado vira reconhecedor, nunca é apagado no silêncio.

**RESPOSTA:** quebra de resposta é útil especificamente quando um objeto de contexto tem seu valor ou valores manipulados de diversas maneiras, criando ramificações. segunda a lógica de grafos, seguir com a resolução de um problema que demanda muitas variáveis acaba por chamar detalhes tanto do início quando detalhes profundos de outros pontos do grafo. isto não é um erro, mas a lógica longa é um desafio no Glyph. isto, hoje, é um problema, pois a capacidade de manter um longo - ou melhor, um *longuíssimo* grafo contendo lógica é a salvação da utilidade pública da ferramenta: uma ORD-1234 emitida, um app saindo do forno. a compactação de comandos também se torna um problema para leitores não acostumados, e às vezes, até mesmo para a máquina. a possibilidade de formatar um arquivo de comando depende essencialmente da quebra de blocos, nosso ";;". por mais que seja custoso, é parte da sintaxe e da lógica estrutural tão básica que não aparece na interação entre comandos, tal qual o colchete e a vírgula. quero dizer que isto faz parte do coração, e por isso é *uma artéria*, não um *apêndice* -> consertemos este fragmento da ferramenta.

---
## 2. `;` dentro de literal — as duas aspas discordam
### O que acontece hoje, medido

```
[nt`a ; b`]     ->  TruncatedLiteral ×2, UnmatchedCloseBracket
[nt'a ; b']     ->  limpo, <user-input>a ; b</user-input>
```
**`;` encerra um literal de crase e não encerra um de apóstrofo.** As duas formas de aspas deveriam ser intercambiáveis — a crase existe para você poder escrever apóstrofo dentro, e vice-versa. Hoje elas têm gramáticas diferentes.
Isso também é o que matou a entidade `&#93;` quando testei escapes: ela morre no `;`, e eu tinha visto o sintoma sem ver a assimetria.
### Opções
**(a) A crase passa a tolerar `;`**, como o apóstrofo já faz.
```
[nt`a ; b`]  ->  limpo, <user-input>a ; b</user-input>
```
Custo: baixo. Ganho: `;` fica utilizável em texto, e as duas aspas concordam.
Risco: um `;` separador esquecido dentro de uma crase passa a não ser detectado — mas isso já é verdade para o apóstrofo hoje.
**(b) O apóstrofo passa a recusar `;`**, como a crase já faz.
```
[nt'a ; b']  ->  TruncatedLiteral
```
Custo: **quebra fontes existentes** que hoje passam limpas. Ganho: `;` continua inequivocamente separador.

> **Recomendo (a).** O apóstrofo é a forma mais antiga e mais usada, então (b) quebraria mais. E a regra fica mais simples de dizer: *dentro de um literal, só a aspa que o abriu o fecha* — que é o que o Autor da Ordem já espera.

**RESPOSTA:** sua recomendação é interessante. mas o que me intriga é que isto sobreviveu até aqui. eu deveria ter dado mais atenção para que isto não fosse problema desde o início. sem enrolação - consertemos isso também. *ponto e vírgula* devem ser considerados apenas fora de literais, nunca dentro. senão, o Autor fica bastante limitado ao que vai escrever. listas de tópicos, por exemplo, dependem de ";" ao final de cada ponto. não é regra, mas é convenção (global?), então não pode sequer servir um propósito diferente de (a) <- jamais algo estrutural pode causar problema na escrita de literais, principalmente porque a ordem emitida é lida por um Algoritmo Avançado (vulgo Inteligência Artificial).

---
## 3. Parâmetro de template escrito nu
### O que acontece hoje, medido

```
[--germinate`a`,`b`]   ->  limpo, os dois preenchem os placeholders
[--germinate'a','b']   ->  limpo, IDÊNTICO ao anterior
[--germinate a,b]      ->  ask/PlaceholderPending ×2
                           os valores caem como <off>a</off> <off>b</off>
```
Sua frase estava exata: **param de template é sempre literal**. As duas aspas servem; a palavra nua não. E o que ela faz hoje é o pior dos mundos — os valores não somem (viram `<off>`, prosa) e os buracos ficam abertos, então o documento sai com uma pergunta que o autor já respondeu.
### Opções
**(a) Recusar mais alto.** A palavra nua vira `fix`, com a mensagem apontando: *"parâmetro de template precisa de aspas: `[--germinate\`a\`,\`b\`]"*.
Custo: baixo. Ganho: o autor descobre na hora.
**(b) Aceitar a palavra nua como literal.** `[--germinate a,b]` passa a preencher, igual às aspas.
Custo: a palavra nua já significa **prosa** (`<off>`) em todo o resto da gramática. Fazer dela literal só dentro de template cria uma regra de exceção.  

> **Recomendo (a).** (b) trocaria um erro visível por uma exceção invisível na gramática, e a pesquisa em `.sources/COMPILER_LESSONS.md` §1 diz que apontar o conserto exato bate qualquer coisa mais esperta.

**RESPOSTA:** o que eu digo é que o motor simplesmente não mostra o texto em glifo que acompanha o Autor da Ordem como correto.
this:
![[Pasted image 20260905213147.png]]
alerts this:
![[Pasted image 20260905213103.png]]

which is a mistake. there is an object as first parameter and a direct text as second parameter.

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
Duas variáveis, declaradas **no meio dos comandos** — `ordem_atual` no segundo item, `esperada` no último. É exatamente o caso que você descreveu: *"não importa qual momento seja"*.
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
As ligações **existem** (`binds`), mas quem lê precisa **varrer a árvore** inteira para saber quais nomes existem. É o esforço que você quer eliminar.
#### E aqui apareceu uma coisa que eu não sabia
Eu tinha escrito este exemplo à mão com `ref="ordem_atual"` naquele `<user-input>` do `<review>`. **O motor não põe.** E está certo em não pôr: `ref` casa o literal **inteiro**, e o literal ali é a frase `"ordem_atual contra a esperada"`, não o nome sozinho.
Ou seja: **um nome citado dentro de uma frase não é resolvido.** Só é referência o literal que É o nome. A alternativa — procurar o nome como pedaço da frase — seria casar por coincidência de palavra, que é síntese, e `PROMOTION_BOUNDARY.md` §2 manda recusar.

Isso muda a pergunta 4: se o cabeçalho só listar o que `ref` já resolve, ele vai listar **menos** do que o documento realmente usa. O cabeçalho precisa vir de `binds` (as declarações), não de `ref` (os usos) — e é o que as três opções abaixo fazem.
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
Diz **o que cada nome é**, sem quem lê ter de descer na árvore. Reusa **exatamente** a forma que `<logic>` já emite hoje (`<rule kind>`, `<source>`, `<reads>`, `<uses>`) — que é a evolução Darwiniana que você pediu.
Custo: médio. Duplica conteúdo que também está no corpo — mas duplicar aqui é o ponto: o cabeçalho existe para não ser preciso ir ao corpo.
### Opção (c) — (b) mais os caminhos de arquivo
Igual a (b), e `<uses>` também recolhe **todo** caminho de arquivo do documento, esteja ou não numa variável — porque você disse *"caminhos de arquivos, tudo organizado pré-mastigado para o harness"*.
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
Custo: preciso de uma regra para "isto é um caminho". A mais segura é sintática: contém `/` ou começa com `~`, `.` ou uma letra de unidade. Nada de adivinhação semântica.

> **Recomendo (c)**, construída em duas etapas: (b) primeiro, `<paths>` depois,
> em commits separados — assim se a regra de caminho estiver errada, ela sai
> sozinha sem levar as ligações junto.

**RESPOSTA:**  o problema de (b) é a repetição de conceito no output do xml da ordem emitida. agora, (a) é maravilhoso para o resultado que eu mais espero.   mas eu achei bastante útil - desde que seja bem respeitado e muito bem delimitado. agora, para (c): aceito caso \<path>s possam estar vazios, ou então referenciando índice no próprio arquivo (bom para humano, inútil para IA? se útil a ambos: faça, ganho duplo!). se até aqui tudo ok, então (c) é minha resposta.

**Se escolher (c), a regra de caminho:** `<path>../up_level_file.json</path><path>./this_level_file.json</path>;`

---
## 5. Ponteiro de aposentadoria
### A situação
O vetor `N-13` do corpus se chama *"BASE deixou de ser comando — CORE tomou o lugar"*. O que o motor diz hoje:
```
[fix] UnknownCommand — [BASE fora do vocabulário. Veja a tabela.
```
Ele sabe que `BASE` foi aposentado — está escrito em `GLOSSARY.md` §0.2 — e não conta. O método diz *"construto aposentado vira reconhecedor, nunca é apagado no silêncio"*, e essa metade nunca foi construída para **comandos** (só para a raiz `<glyph>`).
### O que seria
```
[fix] Comando obsoleto conhecido — [BASE] foi substituído por [CORE] (GLOSSARY §0.2).
[fix] Deprecated known command — [BASE] was replaced by [CORE] (GLOSSARY §0.2).
```
### Opções
**(a) Uma tabela de aposentadoria** em `expansions.json` ou num store próprio:
`{ "BASE": { "since": "1.2.0.0", "use": "CORE", "why": "GLOSSARY §0.2" } }`.
Custo: baixo. Precisa ser preenchida à mão, uma vez, com o que já está escrito.
**(b) Não fazer.** O silêncio já é melhor que o palpite errado de antes.

> **Recomendo (a)**, e ela cobre mais do que `BASE`: as sete fusões desfeitas na v1.1.0.0 (`FOREX→EX`, `QST→ASK`, `EVAL→CRIT`, `REV→CRIT`, `ONLYIF→COND`, `SPEC→ELAB`, `SIMP→CLAR`) estão comentadas no código e não chegam ao Autor da Ordem.

**RESPOSTA:** corrigi e alterei seu exemplo. cuidado com essa parte: por mais que muitas coisas estejam anotadas como obsoletas, o que realmente ocorre é que metade foi designada a outras funções. isto não está anotado na mesma parte porque as diretrizes da época diziam que o objetivo é "guardar alterações no documento", coisa que hoje é evitada: se o custo de ler é maior (porque pode causar retrabalho caso a mensagem não seja lida por completo de uma só vez), reescreva, risque ou delete o conteúdo. o que é autodestrutivo para a natureza do projeto deve ser evitado. mas isso já está implícito em suas diretrizes atuais. só relembrando: aplique isso quando visita as antigas, porque sem uma lente consciente de que você está lendo algo defasado, você pode acabar pensando que nós só nos esquecemos e deixamos de lado, quando na real, em algum outro lugar, há a anotação de que "tal coisa foi abandonada" junto de sua razão e data. no seu exemplo, eu gostei da ideia de guardar no expansions.json. mas o app deve tratar de outra maneira quando cai na exceção: sempre mostre uma frase breve e coerente, como a dos exemplos pt-br e en-eu acima, para que o Autor não gaste mais energia compreendo o erro do que buscando descrever seu objetivo.

---
## 6. O que o motor diz quando não tem o que sugerir
### Hoje
```
[fix] UnknownCommand — [RULE fora do vocabulário. Veja a tabela.
```
*"Veja a tabela"* é o que a pesquisa chama de mensagem que não aponta — a mesma família do `SyntaxError: invalid syntax` que é 41,8% do corpus do StackOverflow.
### Opções
**(a) Deixar como está.** Honesto, e curto.
**(b) Dizer onde está a tabela.** *"…fora do vocabulário. A lista está em `XML_REFERENCE.md` §4, ou digite `[` para ver as opções."*
Custo: baixo. Amarra a mensagem a um caminho de arquivo, que pode envelhecer.
**(c) Oferecer a categoria.** Se `[RULE` aparece onde só cabe uma restrição, o motor diz quais comandos cabem ali. Custo: precisa de um modelo de "o que cabe aqui", que ainda não existe.  

> **Recomendo (b)** agora e **(c)** depois — (c) é o gatilho de re-ferência de
> verdade, e ele merece medição própria antes.

**RESPOSTA:** (b) é uma boa, mas uma breve correção de posicionamento dos dados: *"…fora do vocabulário. Digite `[` para ver opções ou acesse a lista em `XML_REFERENCE.md` §4."* <- resposta dentro do app primeiro -> ação mais curta e de maior ganho para o Autor da Ordem.

---
## O que eu faço sem você
Independente das respostas acima, sigo com:
- o içamento em si — o `walk` que coleta as ligações já existe
- o filtro semântico do `suggest()` **já entrou** (3 úteis, 8 silêncios, 0 palpites)
- a subtração `binds` − `ref`, que dá "nome ligado e nunca usado"
- o emissor de bundle `ORD-xxxxx`, que hoje não existe em forma nenhuma
Se preferir, responda só a **4** — é a que bloqueia mais coisa. <- respondi mais do que isso e espero ter sanado mais dúvidas do que criado. entendo que surgirão ainda outras, mas pelo menos quero que estas que eu dei possam ter dúvidas retroalimentadas pelo seu próprio conceito.

---

## 7. `GLOSSARY.md` §2 contradiz `GLOSSARY.md` §0 — texto normativo

> Achado ao construir a tabela primitivo/operador. **Não reescrevi nada**: é
> texto normativo, e a sua própria ressalva vale aqui — *"obsoleto às vezes é
> reatribuído, e a razão está em outro lugar"*.

### O que está escrito

**§0**, normativo, declara dois eixos **independentes**:

| | **primitive** — stands alone | **operator** — needs an operand |
|---|---|---|
| **hieroglyph** — atom | … | … |
| **glyph** — has a formula | *(vazio por construção)* | … |

E o documento tem uma seção para cada célula: **§1 Hieroglyph operators** (40
comandos) e **§2 Hieroglyph primitives** (38), esta com o subtítulo *"Atoms
that stand on their own, with no operand"*.

### O que medi

| | |
|---|---|
| comandos em §2 que **exigem operando** pelo `FRAMES` | **16** |
| desses, listados **só** em §2 (arquivados na célula errada) | **15** |
| listados nas **duas** seções ao mesmo tempo | **1** (`REQ`) |

Os quinze: `CTX` `TGT` `SPEC` `EX` `RWK` `IMPR` `REV` `SKEP` `DIST` `REF`
`SEEAL` `NT` `EXC` `LIM` `RSN` — e `REQ` é o duplicado.

Não é caso de borda: `CTX`, `NT`, `REV` e `RSN` estão entre os comandos mais
usados do corpus. E o motor **concorda com o `FRAMES`**, não com a §2:
`[ctx]` sozinho emite `<needs>what it refers to</needs>`.

### Como segui sem você

A tabela do `standsAlone()` é **derivada do motor** — é primitivo o átomo de
que nenhuma tabela de valência cobra operando — em vez de transcrita da prosa.
Dá 38 primitivos, e os cinco que o comentário do `FRAMES` já nomeava estão
entre eles. Então o `imperative` já funciona e está gateado.

**Mas a §2 continua afirmando o contrário do que o motor faz**, e enquanto
isso valer, qualquer um que leia o glossário para entender o eixo vai aprender
errado.

### Opções

**(a) A §2 está mal-arquivada.** Os 15 mudam para §1, e `REQ` perde a entrada
duplicada. O subtítulo da §2 fica como está.
Custo: baixo, e é o que a medição sugere. Mas é texto normativo.

**(b) O subtítulo da §2 é que está errado.** A seção lista *hieróglifos*, e
"with no operand" foi escrito confundindo os dois eixos que a §0 separa. Então
só o subtítulo muda, e nenhum comando se move.
Custo: mínimo. **Mas então §1 e §2 listam a mesma coisa por critérios
diferentes, e `REQ` aparecendo nas duas deixa de ser erro.**

**(c) Alguns dos 15 foram reatribuídos de propósito** e a razão está escrita
em outro lugar que eu não achei. Nesse caso você me diz onde, e eu leio antes
de mexer.

> **Recomendo (a)**, mas com a ressalva de que só você sabe se algum dos 15
> mudou de função de propósito. Se a resposta for (a), eu movo os quinze e
> escrevo a razão junto, com a data.

**RESPOSTA:**
