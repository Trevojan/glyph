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

**RESPOSTA:** (c), e perguntado quais: *"Não lembro: mova todos (a)"* — em
2026-09-27. Os quinze e o `REQ` foram para o §1; nenhuma entrada do §2 exige
operando pelo motor.

---

## 8. O inventário de 2026-10-15 — vinte e três perguntas, as palavras do Regente

> **Esta seção é a casa das palavras literais.** O inventário foi levantado
> sobre o repositório em `main`, `afed370`, e cada pergunta tem o seu enunciado
> no documento onde vive — este registro **aponta** para lá e não o copia. A
> decisão e a razão de cada uma estão em
> [`.decisions/`](../.decisions/README.md) sob 2026-10-15.
>
> O Regente declarou a rodada **incompleta**: *"i did not finished yet, but i
> think this is enough material to go on. i understand that if i created new
> questions or contradictions, this is actually good news and an advance of
> Glyph's project anyway."*

### `COH-relates` — a aresta entre Ordens

Enunciado: [`INTAKE-ORDER-COHERENCE.md`](../.orders/INTAKE-ORDER-COHERENCE.md)
§4 e §5. Candidatas A a D; a A era a recomendação.

**RESPOSTA:** the concept of A is solid. i'll take it as base. when starting a
loose ORD, from what i'm seeing, no EMS field should appear as `fix` for no
references. instead, chained orders may simply reference each another in the same
directory, and the `fix` appears when the metadata don't match. this solves loose
chained ORDs (going back from later edition to say that a solution was already
decided and named: *No-Emission/Not-Emitted* Orders -> NEM). the reason for this
answer: there is already planned that each EMS will carry it's own configuration
file. this is already ratified, and the `[CMD]` must follow it. i ratify it as
`[ref'nem']`, for common chained loose Orders and `[ref'EMS']` for referencing
the file's actual directory EMS configuration. this solves it - any `fix` found
here will be enqueued to the `repair` function, which will ask to move each
misplaced ORD to it's correct EMS (or to the NEM folder, if required). in resume:
it is necessary for an Order to refer another, but if it's a loose one, it will
note its category in their reference: `[ref'nem']`. the same goes to EMS -> the
very first Order must `[ref'EMS']` to declare it's part of a queue, passing the
responsibility to the EMS configuration, which is a real improvement in
organisation and enables future `repair`s.

> **Supera a candidata A como escrita.** O que a resposta cria, e que nenhuma
> candidata oferecia: **dois valores de referência** (`[ref'nem']` e
> `[ref'EMS']`), a **delegação da verificação à configuração da EMS**, e a
> **função `repair` como fila** — que não existe hoje: o `repair` do tráfego
> mostra a diferença e pergunta, e não enfileira nada. E inverte o gatilho: a
> ausência de referência deixa de ser `fix`, e o `fix` passa a ser metadado que
> não casa.

### `PT-Q11` — `<invoke>` e a precondição

Enunciado: [`PACKAGE_TARGET.md`](../PACKAGE_TARGET.md) §10. Candidatas A e B.

**RESPOSTA:** when `<invoke>` is used, there must be a basis for the model to
rely on. for example: if the EMS has a configuration that set paths to a SKILL.md
or a file that comprehend a skill, it must be called. if ending unresolved by
EMS's configurations, the Explorer must return a `fix`. the point also is that
the Explorer should carry global generic skills of its own to save time and
resolve faster the invocation dependency. the element itself is powerful because
it calls pre-defined actions and send parameters, but the most important here is
the output: will it go on through the Order or is the `<invoke>` the end of the
XML? if goes on, the EMS is very important to have the skill's/pre-defined
action's paths validated. if it's the final output and the `<invoke>` can't
execute as scripted, it must return an error before follow the Order
specification. no blocking dependency may be present when executing an Order -
otherwise the Harness may guess or even take blind decisions, leading only to
rework.

> **A norma vale além do `<invoke>`:** nenhuma dependência bloqueante pode
> existir ao executar uma Ordem. E a pergunta que ele mesmo levanta no meio da
> resposta — *"will it go on through the Order or is the `<invoke>` the end of
> the XML?"* — **ele responde nos dois ramos**, na mesma frase: se segue, a
> configuração da EMS tem de ter os caminhos validados; se é saída final e não
> executa como escrito, retorna erro antes de seguir a especificação. Resposta
> condicional completa, não pergunta aberta.

### `OT-9.1` — posição de diagnóstico no AST JSON

Enunciado: [`OPERATOR_TARGET.md`](../OPERATOR_TARGET.md) §9. Candidatas A a C.

**RESPOSTA:** A, undoubtly. we must consider a future reality where the AST
should be read and used as generative context - if considering it
source-of-truth isn't enough today. if we may prevent the situation, we solve a
newborn problem. if not, we gain another point to an already solid structure.
double gain.

### `VP-16` — referências podem sair do pacote

Enunciado: [`INTAKE-VIRTUAL-PATH.md`](../.orders/INTAKE-VIRTUAL-PATH.md) §16.
Candidatas A a C; a C era a recomendação.

**RESPOSTA:** we must reach B, though C is indeed a good idea. cross-packaging is
a feature we know from UX and Software Development experience will be at high
demand sooner or later -> sooner, certainly, if the user seek to solve multiple
ORDs from different sources at a time. anyway, my answer about the Explorer
resolving paths already covers part of it, but it's also more fruitful to verify
if an MCP may join the ORD without worry about integration constraints.

> **B, não a recomendação C — por expectativa de demanda, não por medição.** As
> duas medições que o §16 exigia em ordem não foram feitas: o braço de
> comparação do §8 e o terceiro braço do transporte MCP. A escolha **reabre a
> decisão de escopos aninhados**, que estava adiada por palavra do Regente.

### `ORD-0013` — o instalador

Enunciado: [`EMS-001.pgml`](../.orders/EMS-001/EMS-001.pgml), seção
`ORD-0013-installer`. Candidatas A a D; a recomendação era D e então A.

**RESPOSTA:** we'll follow through A. at this point, the functional Rust desktop
app already is the main goal.

### `EFF-10` — o `->`

Enunciado: [`INTAKE-EFFECTS.md`](../.orders/INTAKE-EFFECTS.md) §10. Candidatas A
a D; a A era a recomendação.

**RESPOSTA:** forget about it. when i wrote this, i was simply showing you an
example -> compared to another. just that. the symbol `->` never existed and will
never do, as `>` needs to press `SHIFT+.` to be typed.

> Fecha sem reconhecedor: não houve construto a aposentar.

### `PT-Q12` — o `K8` conta errado

Enunciado: [`PACKAGE_TARGET.md`](../PACKAGE_TARGET.md) §10. Candidatas A e B.

**RESPOSTA:** A -> straight to the point. *Mastery spares synthesis.*

### `EFF-9` — `origin` em `item` vs `root`

Enunciado: [`INTAKE-EFFECTS.md`](../.orders/INTAKE-EFFECTS.md) §9. Candidatas A
a C, sem recomendação.

**RESPOSTA:** the answer is both A and B. a root of a series of items must be
clear in it's declaration to avoid confusion as the longer the official XML
output, the harder it gets to distinguish subjects from a block to another of a
section. so, there must be something like `root-x` and each item also carry its
own `x-item-##` <- the first part being the related root, then declaring it is an
item and finally it's position in the logic structure's queue. the generic
`root-` of a section is primarily its name.

> **Desenho, não escolha de letra:** um esquema de nomeação que os dois níveis
> carregam. **Move os hashes de `xml`**, então passa pelo
> [`PACKAGE_TARGET.md`](../PACKAGE_TARGET.md) e pelo `conformance/`.

### `FIELD-3b` — o portão da versão nos 51 `[ctx]`

Enunciado: [`INTAKE-FIELD-2026-09.md`](../.orders/INTAKE-FIELD-2026-09.md) §3.
Candidatas A a D; a recomendação era D e então A.

**RESPOSTA:** D, then A. a solution with finesse, must admit, well done!

### `ORD-0014` — aceitar a árvore medida

Enunciado: [`EMS-001.pgml`](../.orders/EMS-001/EMS-001.pgml), seção
`ORD-0014-window`. Candidatas A a C; a A era a recomendação.

**RESPOSTA:** for instance the target is Windows. so, as this is an integration
question plus minor constraint for us today, we'll follow with A.

### `VP-12` — os caminhos B e C do mini-repo

Enunciado: [`INTAKE-VIRTUAL-PATH.md`](../.orders/INTAKE-VIRTUAL-PATH.md) §12.
Candidatas A a D; a A era a recomendação.

**RESPOSTA:** A.

### `FIELD-3c` — tabela de prefixos no `--check`

Enunciado: [`INTAKE-FIELD-2026-09.md`](../.orders/INTAKE-FIELD-2026-09.md) §3.
Candidatas A e B; a B era a recomendação.

**RESPOSTA:** B.

### `PARKED` — a `ORD-0011` chapada

Enunciado: [`README.md`](README.md), *Adiado por decisão*, e
[`.orders/parked/restructure-glyph-repo/`](../.orders/parked/restructure-glyph-repo/).
Candidatas A a C; a recomendação era B agora e C quando a EMS-001 fechar.

**RESPOSTA:** i'll follow the recommendation: B now, C when EMS-001 closes.

### `Q14-quando` — a E-06

Enunciado: [`conformance/README.md`](../../conformance/README.md) §E-06.
Candidatas A a D, só para o *quando*.

**RESPOSTA:** D. this was actually responded in earlier questions, isn't it?
anyway, i won't ratify this as done, as this needs a closer inspection. for now,
i think you have enough material to go on.

> **Adiada com a direção dada, não fechada.** A base verificada é o caminho; o
> Regente inspecciona antes de assinar. Até então `K1` não alcança G2 e G3.

### `PT-Q9` — o bundle de seis camadas

Enunciado: [`PACKAGE_TARGET.md`](../PACKAGE_TARGET.md) §10. Candidatas A a C; a
A era a recomendação.

**RESPOSTA:** B.

### `PIN-vocabulary` — os nomes canónicos e a valência do PIN

Enunciado: [`INTAKE-PIN-TRAFFIC.md`](../.orders/INTAKE-PIN-TRAFFIC.md) §5. Sem
candidata possível: vocabulário do Regente.

**RESPOSTA:** a pinned attribute on a `[CMD]` is a way to declare it explicitly
so it may be handled in many different forms without aching about inference
effort. for example, if i have a `[rev'filepath.txt']`, and i `[pin-rev]`, it
takes the last input and define it as part of each PIN call of the same type.

> **Semântica, não só nome:** o PIN declara explicitamente um atributo de um
> `[CMD]` para não depender de inferência, e `[pin-rev]` toma a **última
> entrada** do tipo e a fixa para cada chamada PIN do mesmo tipo.

### `PIN-selection` — a gramática do seletor de tipo

Enunciado: [`INTAKE-PIN-TRAFFIC.md`](../.orders/INTAKE-PIN-TRAFFIC.md) §5. Sem
candidata possível: fórmula.

**RESPOSTA:** this will come along the "item" and "part" definition. for now, i
can say: what is PINned is an attribute of a declared *object*, or a
characteristic of a declared *subject*, or ultimately the formula of an specified
*value*. all of this may be written down in the XML for you to digest, but still
needs inference to find the whole meaning.

> **Vem junto do `EFF-8`, e o `EFF-8` chegou:** a gramática acompanha a
> definição de "item" e "part", e as duas estão respondidas abaixo — o `[part]`
> com desenho e rótulo-ponteiro, o "item" com a fronteira. Então a gramática é
> proposta medida na ORD que constrói o PIN, não espera palavra.

### `PIN-EMS.json` — o esquema da `EMS.json`

Enunciado: [`INTAKE-PIN-TRAFFIC.md`](../.orders/INTAKE-PIN-TRAFFIC.md) §5. Sem
candidata possível: desenho de esquema que entra no `<glyph-package>`.

**RESPOSTA:** let's build it together. we'll brainstorm and relate to what we
already own and is clearly ratified and immutable to the current version. the
first thing to mention is that the EMS will have the basic XSD structure for the
ORDs to follow. this is useful for when an specific declaration inside an Order
is given, the Emission handles its spec instead of the very XML of input or your
pure inference. also this helps when trying to figure how to untangle the user
input meaning, as the EMS configuration will serve as a map and will hold very
low cost to be used: just call where it matches the EMS' XSD pattern pointing to
the current ORD being read and proceed the reasoning.

### `PIN-EMS-000` — o conteúdo inicial da EMS genérica

Enunciado: [`INTAKE-PIN-TRAFFIC.md`](../.orders/INTAKE-PIN-TRAFFIC.md) §5. A
pergunta de um bit: medir `.scope/generics/` por frequência, ou escrever do zero.

**RESPOSTA:** A, and i rewrite to make it fit. this will be quite an artisan
handswork.

### `EFF-8` — `PART`

Enunciado: [`INTAKE-EFFECTS.md`](../.orders/INTAKE-EFFECTS.md) §8. Candidatas A
a C para o recorte barato; a C era a recomendação.

**RESPOSTA:** C, and "`[part]`" was already in the plans. i did not saw when it
gone missing. time to solve it. "`[part'ph-label_height_0','ph-label_height_1,label_height_2']`"
is a `[cmd]` that slices down `[block]`s, just like `[block]`s are slices of
`[section]`s. this is useful when a `[section]` have a goal that may be achieved
in multiple ways and ends being more fruitful in the same Order. through `[part]`
is possible to take care of specific situations down to user input per boolean or
word-by-word, something that `[block]` may do, but also isn't prepared for. in
this case, a `[block]` hold a `[part]` when it's easier to apply the same logic,
but manage different outputs, for example:

```PGML
[section'dish'
[block'ingredients'
[nt'salt'][nt'butter']
[part'sa or bu'[ask'needs salt or butter?'
]]
[block'prepare'
[nt'boil'][nt'oven']
[part'bo or ov'[ask'send to boil or to oven?']
]]];
r-[nt'recipe: "le Fishe au Chocolat". sa or bu, bo or ov'];
```

when trying to resolve the subject `'dish'`, the recipe specified at `r-` must be
put under the declared situation. each `[block]` has its object and values
definition. the `[part]`s uses the declared ones. useful for complex logic
operations within a determined scope of context. maybe driven by a subagent when
the Harness encounter this specific situation. anyway, instead of letting you
decide it all alone, it's possible to define pointers like
`[part'dish-ingredients-core']` or even `[part'dish-cutlery']`. in this case,
there are two notes for each `[block]`: `salt` and `butter`. each one of these
"items" can be declared separately: `[item-salt]` and `[item-butter]`. even
beyond, they may also be declared inside a root: `(inside section 'dish')
[nt'pantry']` -> `[part'pantry-item-salt']`, `[part'pantry-item-butter']`. also
an example using all labels: `[part'house-kitchen-pantry-item-salt']`,
`[part'house-kitchen-pantry-item-salt']`.

> **Desenho inteiro, e um achado dentro dele.** O `[part]` *"was already in the
> plans"* e sumiu sem recusa e sem registro — desaparecimento silencioso de
> construto, o que a norma proíbe. A ORD é **restauração**, não feature nova.
> Desenho normativo, com este exemplo, em
> [`INTAKE-EFFECTS.md`](../.orders/INTAKE-EFFECTS.md) §8.2.

### `EFF-8` — "item" e os objetos de contexto

Enunciado: [`INTAKE-EFFECTS.md`](../.orders/INTAKE-EFFECTS.md) §8, primeira
linha. Sem candidata possível: modelo semântico novo.

**RESPOSTA:** we have to be honest here. there is no way to save inference effort
enough to make worthy use of this `[CMD]`. this is obvious, since no context is
enough to simply run a script that will certainly help out with determinism if
the user input may be *anything*. so, to ease the effort as far as we should, i
press on to build scripts that help absorbing the information in a very concise
and clearing way. most of this is based in the inference engines, but the use of
suba-scribe would be a heavy response to a simple Order's XML input. a subagent
for this specific situation, however, would be a killer - but still a strong
answer to an almost mechanical situation. my verdict, and i want you to confirm
if it makes sense, it that you must at least have some material to base your
inference effort over the XML's content itself. that phrase i always repeat in
personal conversations: "some-thing is better than no-thing". in resume: trust
the engine's generated XSD and apply its rules to the pure XML content when you
first come to follow an ORD. the XSD is mechanical and offers some structure,
that in this case, will try to assemble a logic around a *subject* -> like
preparing a dish, or finding out if it needs butter or salt. as it will be
handmade, it may contain errors or contradictions. but hey, "we are all humans
after all". the frontier of *item definition* is this. you will always need to
rely on what the ORD has to offer as input.

> **A fronteira é a resposta, e é deliberada.** Não é uma definição de *item* no
> abstrato porque nenhuma se paga: a entrada do usuário pode ser qualquer coisa.
> A régua é o que a Ordem oferece como entrada — o XSD gerado pelo motor,
> aplicado ao conteúdo puro do XML. **Confirmado**, com uma ressalva de agente,
> que ele pediu que fosse conferida: só vale gerado pelo motor, nunca escrito à
> mão, e falta o portão em que o XSD confere contra o XML com divergência em
> `fix`. Registro em [`INTAKE-EFFECTS.md`](../.orders/INTAKE-EFFECTS.md) §8.1.

### `PKG-5` — o conteúdo de `<schema>`

Enunciado: [`PACKAGE_TARGET.md`](../PACKAGE_TARGET.md) §5. Sem candidata
possível para o conteúdo; o barato era confirmar que segue vazio.

**RESPOSTA:** ironic, i just answered something citing it! Glyph's back on
trails! the declaration of sections, blocks, templates, parts and variables must
all reflect inside the `<schema>` definition. this serves as a sketch of how to
build the script to better comprehend the situation. through this we may expand
it so to fit value, subject, object and its attributes and use other properties
yet to be coded. at this time, the current workflow obliges you to infer from
zero, but at least you return a somewhat structured XML. the goal is to make the
user's XML input very rich so that you may save effort trying to figure it out
from nothing -> and, of course, it won't exactly save you, but it's always better
to start from sketch than start from nowhere.

### `EMS-002` — a série que ainda não foi escrita

Levantada pelo inventário, não escrita como pergunta no repositório. Candidatas A
a C; a A era a recomendação.

**RESPOSTA:** A.

### `EMS-001-queue` — a execução assíncrona

Enunciado: [`README.md`](README.md), *Aberto, esperando o Regente*. Candidatas A
e B; a A era a recomendação.

**RESPOSTA:** A.
