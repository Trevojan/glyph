# Decisões — quem decidiu, e por quê

> Uma decisão sem razão registrada volta a ser discutida. Uma decisão sem autor
> registrado é re-decidida por quem não tinha autoridade.
>
> **Só o Regente decide.** Um agente pode medir, propor e recusar — nunca
> ratificar norma que ele próprio escreveu.

## Formato

| data | decisão | quem | razão |
|---|---|---|---|

---

## 2026-09-26

| decisão | razão |
|---|---|
| **Pela ponte, `parse` responde a contagem de comandos da árvore** ao lado do envelope — no `glyph-protocol.js` primeiro, depois no Rust | respondido no questionário de 2026-09-26: *"b. protocol answers count"* (pergunta 15 do [retorno](../.orders/EMS-001/RETURN.md)). O envelope para em `LIMITS.astDepth`, e a árvore que a ponte reconstrói dele para junto: a linha de status contava 200 comandos onde o JS conta 8 000, 2 000 e 400. `protocol.json` é escrito de novo por esta decisão |
| **A linha de status do `glyph-ui.js` lê a contagem que o resultado do `parse` traz**, e percorre a árvore quando ele não traz nenhuma | respondido no mesmo questionário: *"One line in glyph-ui.js"*. É a leitura assinada do alvo da `ORD-0011`, *"glyph-ui.js changes only at its transport"*: o caminho JS não traz contagem e continua byte a byte igual. A outra via, nós de enchimento na árvore reconstruída, poria nela o que a fonte nunca teve |
| **O `--bundle` lê `SOURCE_DATE_EPOCH`, e o horário do zip é UTC** — nos dois motores, o JS primeiro | respondido no questionário de 2026-09-26: *"SOURCE_DATE_EPOCH, UTC"* (pergunta 16 do retorno). O `emitted` do manifesto e o horário MS-DOS do zip vêm do relógio, e o zip o lia em hora local, uma zona que o `std` do Rust não lê sem crate de fora. Com a variável, o momento é dela, e a paridade da `ORD-0012` se mede byte a byte |
| **A tag `conformance-v0` é criada no clone local**, e o push fica com o Regente | respondido no mesmo questionário: *"Create it, don't push"*. O proxy da sessão na nuvem recusou o push da tag |

## 2026-09-25

| decisão | razão |
|---|---|
| **O protocolo da EMS-001 é B**: o motor responde em stdio, uma requisição JSON por linha e uma resposta por linha; o `serve-dev.js`, que serve a página, o lança e repassa `POST /engine` a ele | respondido no questionário de 2026-09-25: *"B"*, contra a proposta A da sessão. As duas opções foram medidas sobre as 114 fontes, do node e de uma página: as duas respondem os bytes do JS e não trazem crate; B tem 16 linhas a menos e o salto do relay custa de 0,1 a 0,3 ms por chamada. O app instalado (`ORD-0013`) leva node ou um segundo protocolo. Medição e ADR: [retorno da EMS-001](../.orders/EMS-001/RETURN.md) |
| **Os caminhos virtuais entram no motor**, em `.guidelines/.shortcuts/.virtual/`, e vão para o topo do plano | *"quero que seja feito um sistema que implemente \".guidelines/.shortcuts/.virtual/\""*; em 2026-09-26: *"ponha no topo da lista"*. O desenho e as medições que vêm antes do código: [`.plan`](../.plan/README.md) §0 |
| **"Degraus" são as ORDs da EMS-001** | respondido no mesmo questionário: *"As ORDs da EMS-001"*. A fila segue da `ORD-0010` em diante, uma aberta por vez; a escada continua revogada |

## 2026-09-24

Respostas do Regente à auditoria da escada Rust
([`INTAKE-RUST-LADDER.md`](../.orders/INTAKE-RUST-LADDER.md) §8).

| decisão | razão |
|---|---|
| **O Glyph migra para Rust**, e o port aceita crates de terceiros | *"aceite mesmo assim. é o preço para o release de próximo nível."* A migração estava decidida desde 2026-09-23 fora deste repositório (R-01); aqui ela ganha o custo aceito. O que o vendoring compra e o que não compra está no intake, §9 |
| **O app de navegador existe: é o MVP** | *"o app de navegador deve existir porque é um MVP. ainda assim, há o que ser feito em Rust."* O navegador fica com o núcleo JS; o que se faz em Rust é o motor como processo próprio, que o app alcança por HTTP (EMS-001) |
| **A skill fica com o que já existe**, ao lado do app de navegador | *"a skill fica para o que já existe, ao lado do app de navegador."* Ela continua entregando o motor JS legível; a migração não a redefine |
| **As stores viajam como um objeto de contexto**, no JS, antes do port | *"se for necessário, sim - se for eficiente, melhor ainda."* A razão, medida: pelas chaves soltas, uma chamada que traz os próprios templates ainda recebe as regras globais do processo, então dois pacotes num processo se contaminam; o contexto responde pelas três stores ou por nenhuma. Custo medido: zero |
| **EMS, ORD e PIN são conceitos interativos da solução**, e tendem a crescer | *"sem problemas por enquanto. mapeie propostas e siga com o que já temos."* O registro precisa aceitar conceito novo sem reforma |
| **Os módulos 18 a 24 ficam no escopo** | *"estamos construindo Glyph, não é?"* |
| **Uma ADR vale quando o Regente assina** | *"as ADRs dependem da assinatura do RGN. uma vez confirmadas, ok. a decisão do RGN sobrepõe o andamento da arquitetura, mas não significa que o Regente vai pessoalmente escrever e modificar uma a uma"*. O papel dono redige e propõe; o Regente assina. *"alterar ADRs custa uma seção de questionário"* — o custo é parte da norma |
| **Dependência se mede pela profundidade transitiva, não pela autoria; a base se vendoriza** | *"vendoring é uma ideia essencial. sigamos assim. minha visão sobre código autoral é sobre emprestar excessivamente funções de terceiros e até \"quarteiros\" e \"quinteiros\", tal qual Python, porque isso gera peso desnecessário de build e arrumar bugs internos leva dias. mas no nosso caso, é apenas para a base que não precisamos reinventar"*. Toda crate passa pelo filtro medido antes de entrar (árvore, profundidade, peso de build — [`INTAKE-RUST-LADDER.md`](../.orders/INTAKE-RUST-LADDER.md) §9), e a que entra vem vendorizada |
| **Os seis nomes do que se chamava "template"**: o macro da linguagem continua `template`; os formulários do app são `mould` (a grafia segue o en-EU do lock T13); os PRESETS são `sample`; as Ordens genéricas são `Order Matrix`; os trechos do editor são `snippets`; o layout de renderização é `layout` | *"ok, então os nomes são template->template, formulários do app -> mold, presets -> sample, Ordens genéricas -> Order Matrix (que nome dahora), trechos prontos -> snippets, layout de renderização -> layout"*. Medição e citações: [`INTAKE-RUST-LADDER.md`](../.orders/INTAKE-RUST-LADDER.md) §11 |
| **Termos técnicos e teóricos se firmam em inglês** — também na interface em português | *"é melhor firmar os termos técnicos e teóricos em inglês"*. Por isso `mould` e não "molde", `layout` e não "leiaute" |
| **Duas fontes estavam erradas**: o glossário chamava o template de *mould*, e a nota do `templates.json` o chamava de *preset* | *"o glossário troca template por mold, fonte está errada. o JSON chama template de preset, fonte errada também."* *mould* pertence aos formulários do app; `preset` sai do vocabulário |
| **"modelo" deixa de nomear o template** e fica livre para o modelo de IA | *"modelo não sei se bate em template, mas deve mudar por causa do Modelo de IA."* Medido antes de trocar: na interface, todo `modelo` era o template ou o modelo de IA, nenhum terceiro |
| **A grafia é en-EU: `mould`, não `mold`** | *"ei, ei, \"mould\" está mesmo correto? não significa \"mofo\"? se mold e mould são realmente a mesma coisa, então o correto é \"mould\" e eu suspeitei da escolha à toa"*. `mould` é a grafia britânica de `mold`, e as duas carregam os dois sentidos, a fôrma e o fungo — nenhuma desambigua a outra. A convenção já estava decidida: o lock T13 da `ORD-2026-08-30-01`, *"en-EU across the system, always"*, com o escopo *"artefacts in en-EU, interface stays pt-BR"*. Medição e resíduos: [`INTAKE-RUST-LADDER.md`](../.orders/INTAKE-RUST-LADDER.md) §12 |
| **O Rust é um app pequeno que come o território do JS, não uma migração em lockstep** | *"cara… não é só criar um app com instalador? a gente precisa focar no funcional […] vamos focar da seguinte maneira: um app pequeno, contido e limitado. serve pra substituir o Glyph de navegador? se não, vamos o alimentando com features pouco a pouco, até que ele supere o motor em JS"*; ratificado: *"concordo plenamente"*. O motor é um processo próprio, o visual é o app de navegador, WASM sai, a janela vem por último. Comissionado pela spec da série, [`EMS-001.pgml`](../.orders/EMS-001/EMS-001.pgml), com as razões em [`BRIEFING-2026-09-24.md`](../.orders/BRIEFING-2026-09-24.md) |
| **Snapshot ampliado**: 102 → 114 fontes, nenhum hash movido | doze fontes declaradas, uma por código de diagnóstico que nenhuma fonte declarada alcançava (M01, autorizado); oito desses códigos não tinham teste nenhum. Os 102 hashes anteriores são idênticos |
| **As Ordens vivem em séries: `.orders/EMS-###/ORD-####/`**, e a contagem de ORD reinicia em cada série | *"a series of ORDs are stored (and the number resets) in a folder called EMS, which holds it's own spec that talks to the Guidelines -> so, it have it's own constraints, counters, exceptions, ADR and DC mods and how to proceed even after"*. A pasta de uma ORD guarda o pacote: o XML é a Ordem, e o `.pgml`, o `.json`, o `.hgml` e o manifesto a deixam validar a si mesma. Responde ao `I_B1`, o esquema de ID e a casa das Ordens. O layout está construído desde 2026-09-25: numa série, o `--bundle` escreve a ORD como a pasta `ORD-####/` e o plugin a acha por `EMS-###/ORD-####` ([retorno](../.orders/EMS-001/RETURN.md)) |
| **Uma série cresce como fila, não como versão** | *"should we make it a new version? or create a queue of ORDs? i think the second one is better."* Uma ORD abre quando fecham as ORDs de que ela depende, e o número dela é o seu lugar na fila; a versão fica para emendar uma Ordem aberta. A execução assíncrona foi pedida medida (*"must measure it all"*): a medição e a proposta estão na seção `queue` da spec da EMS-001 |
| **O trabalho de 2026-09-24 entra no repositório**: os seis passos do briefing, e o plugin | *"enqueue commits. we need to do it right now, as things may alter a lot in no time from here."* `82befb4` a `c243aca`, e `4a907e3`; `npm run check` verde em cada um, rodado sobre a árvore do próprio commit |
| **A `ORD-0011` fica estacionada** | respondido no questionário de 2026-09-24: *"Park it"*. Ela reestrutura o repositório lendo `_ORBITAL`, que só existe nesta máquina; continua emitida, sai da vaga da Ordem aberta, e reabre aqui quando o Regente chamar. A vaga passa à EMS-001 |
| **O Regente assina tudo o que a spec da EMS-001 revoga** | respondido no mesmo questionário: *"Sign all"*. A escada deixa de ser a ordem de trabalho e `ladder.toml` fica como registro da auditoria; saem M11d (o lockstep), M11b e o crate `glyph-wasm`, M22 e o Tauri, a aposentadoria do motor JS; e, da `ORD-0011`, a escada como plano com o `ladder.py`, o limite de zero dependências e as linhas que poriam `ladder.toml`, `ladder.py` e `audit_corpus.py` nos eixos. A lista inteira está na seção `revoked` da spec |
| **A primeira sessão na nuvem: o layout, depois a EMS-001** | respondido no mesmo questionário: *"Layout, then Rust"*. A sessão constrói `.orders/EMS-###/ORD-####/` e ensina a série ao `--bundle` e ao plugin, e então corre a fila da `ORD-0001` em diante até onde o orçamento for, um commit verde por ORD. O que ela ouve está em [`HANDOFF-2026-09-24.pgml`](../.orders/HANDOFF-2026-09-24.pgml) |

## 2026-09-06

| decisão | razão |
|---|---|
| **A prosa declara o estado, nunca a correção** | *"você adiciona um 'não é mais A, agora é B', quando na verdade o texto que dizia 'isto é A' deve simplesmente tornar-se 'isto é B' — para não acumular micro-correções e gerar resíduo, coisa que o modelo vai inferir e descartar por não auxiliar no estado final da resposta, que é o contexto em si"* |
| **A skill vive em `.claude/skills/glyph-markup/`** | a pasta que o harness lê e a pasta que se publica passam a ser uma só. A causa-raiz mais repetida deste repositório é uma decisão que não chegou às outras cópias, e a skill instalada foi onde ela custou mais caro |
| **`XML_REFERENCE.md` ganha portão de versão** | as tabelas eram provadas pela suíte e o `engine="…"` dentro dos exemplos não era. Ficou em `2.4.5.01` por duas releases, no único lugar de onde se copia |
| **O ponto na frente do nome marca caminho de baixo nível** | lido pelo harness, não por quem abre o repositório para ver o que o projeto faz. `ORDERS/` → `.orders/` e `history/` → `.history/`. A raiz fica com as portas de entrada |
| **`.orders` é eixo próprio**, não cabe em `.plan` nem em `.decisions` | os dois teriam de quebrar a própria regra: `.plan` apaga o que fecha, e uma Ordem fechada é o contrato do que foi entregue; `.decisions` é append-only sem estado, e exatamente uma Ordem fica aberta por vez |
| **`.history` não é eixo** | eixo responde a uma pergunta de quem retoma o trabalho; o sótão não responde a nenhuma. Existe para que remover não seja apagar |
| **`GLOSSARY.md` §6 e `XML_REFERENCE.md` §9 vão para o sótão** | eram 138 linhas narrando o que foi fechado, dentro das duas referências que a skill carrega inteiras a cada sessão — §6 sozinho era 20% do glossário. A numeração `§6.x` foi mantida no sótão, então os apontadores do motor resolvem |
| **Snapshot regenerado**: 102 hashes de AST | a `note` de `req-deny` em `rules.json` narrava a própria correção e viaja no envelope de toda projeção. Reescrita para declarar o estado; o snapshot moveu por **decisão**, não para ficar verde. `xml` e `hgml` não se moveram |

## 2026-09-05

| decisão | razão |
|---|---|
| **`,` carrega ordem.** `GLOSSARY.md` §0.1 perdeu *"sem ordem entre eles"* | *"antigamente eu dizia que não havia diferença na ordem. isso se provou ineficaz."* A razão generaliza: **o que se faz é declarado antes do sujeito** — *red ball*, *thin air*. Então `[simp'X'],[core]` é "simplifique X e trate como núcleo" e `[core],[simp'X']` é "em núcleo, simplifique X" |
| **`<holds>` ganha elemento próprio**, não atributo nem reuso de `<chain>` | cadeia significa "aplicados ao mesmo operando"; conjunção significa "valem juntos". Fundir as duas seria o defeito sendo consertado, por outra porta |
| **O modelo semântico inteiro entra** — nome ligado a valor, não só o papel | *"Sim, e também ligar nome a valor"* |
| **A `<section>` de cabeçalho é irmã do `<schema/>`** | *"reutilizar algo já construído para implementar coisa nova é a base da evolução Darwiniana"* |
| **Servir o app é o futuro; abrir custa 1 clique, no máximo 2** | *"se uma evolução de arquitetura depende de servir o app, é o futuro - sem menos"* |
| **Sem worktrees.** Trabalhar direto no repositório | pedido explícito |
| **"Autor da Ordem"** é quem escreve a fonte | o motor existe para trocar a inferência dele por re-ferência |
| **`.guidelines` guarda atalhos de pensamento**, em seis eixos | reduzir síntese conforme a carga do projeto cresce; ao retomar, decifrar só o passo anterior, o atual e o próximo |

## Anteriores, ainda em vigor

| decisão | razão |
|---|---|
| **`[res]` é checkpoint nomeado**, não rebobinagem | rebobinar exigiria o documento carregar histórico de estados aplicados — isso é estado e tempo, e acabaria com "declarado, nunca aplicado" |
| **A parte legível é o `.pgml`, não o XML** | *"análise humana de xml é cirurgia de código"* |
| **`glyph-package` é raiz única**, sem forma condicional | um consumidor não pode ter de ramificar na forma do documento antes de conseguir lê-lo |
| **`<invoke>` significa *função*** para o modelo que recebe o documento | um comando é uma função; o documento declara a leitura dela e não a executa |
| **Zero dependências no lado JS** — o motor, a skill e o app de navegador | é propriedade do repositório, não acidente: a skill roda com `node` e nada mais, o app abre sem build. No Rust vale o critério da profundidade transitiva (2026-09-24) |
| **O golden deriva da especificação**, nunca de uma implementação | lock T5 |

## Decisões que um agente tomou e o Regente ainda não ratificou

- [`PROMOTION_BOUNDARY.md`](../PROMOTION_BOUNDARY.md) §5 está **vazia**. Até ser
  assinada, §2 é recomendação tirada de medição — **não é norma**, e nada pode
  citá-la como vinculante.
