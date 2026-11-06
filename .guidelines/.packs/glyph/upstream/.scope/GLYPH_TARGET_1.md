---
artifact: GLYPH_TARGET
nome_completo: Glyph — Production Output Target
versao: 0.1 (proposta, não ratificada)
tipo: plano_de_evolucao
relacionados: [ORCHESTRATION.md, PHASES.md, PROTOCOL.md, TEAM/TEAM.md, TEAM/PO.md, TEAM/DV.md, TEAM/QA.md, TEAM/DA.md]
---

# Glyph — Alvo de Output em Nível de Produção

> Nada aqui inventa estrutura nova. O Glyph já é um compilador; ele só tem
> um alvo de compilação errado.

## 0. A tese, corrigida

A tese original era: *"o output do Glyph deve se parecer com um system prompt
de produção em XML."*

Isso está certo no sintoma e errado no alvo. Parecer com aquele XML é
consequência, não objetivo. O objetivo real:

> **O Glyph deve ser a fonte única a partir da qual se geram os artefatos
> acoplados que o modelo e o Harness consomem separadamente — e que, escritos
> à mão, divergem.**

A prova está no próprio exemplo de produção. O bloco `<tool><parameters>`
contém um JSON Schema. Esse mesmo schema está registrado no Harness, fora do
prompt. São dois lugares, uma verdade. Toda vez que um parâmetro muda, alguém
precisa lembrar de mudar nos dois. Ninguém lembra sempre.

Esse é o defeito de classe que um compilador elimina — e é o único argumento
que justifica o Glyph existir em vez de um YAML. Guardem esse critério, ele
volta na §6.

## 1. O que o Glyph é hoje e o que o alvo é

| Dimensão | Glyph hoje (modo TURN) | System prompt de produção |
|---|---|---|
| Vida útil | um turno | uma sessão / um deploy |
| Objeto emitido | uma **instrução** | um conjunto de **invariantes** |
| Autoria | operador, ad hoc | artefato versionado no repositório |
| Destinatário | o modelo | o modelo, *sobre* o Harness |
| Conteúdo | o que fazer agora | quem você é, o que existe, o que é permitido, como emitir |
| Verificação | ler a resposta | schema, validador, gate |
| Modo de falha | resposta ruim | agente quebra em produção |

A distância não é de verbosidade. Uma instrução é **consumida**; um invariante
**persiste e restringe**. O engine hoje expande imperativos. O alvo exige que
ele também declare invariantes.

## 2. O que NÃO pode ser perdido

Isto é uma cláusula de proteção, não uma cortesia. Listado para que o TEAM
possa detectar a perda quando ela começar:

- **Economia de digitação.** O operador escreve ~10 caracteres e recebe
  estrutura. Se isso morre, o Glyph vira um formato de config e perde a razão
  de ter sintaxe própria.
- **A camada de dependência do dag.js** (hieroglyph / primitive / composite).
  É o que permite alias sem ambiguidade.
- **As tags de emoção/registro.** Controle de registro barato, difícil de
  replicar em qualquer formato declarativo.
- **O construtor guiado "molde".** É a UX de autoria; sem ela o modo AGENT vira
  digitação de XML com passos extras.
- **O teste de merge de três perguntas** (consequência / decidível-no-momento /
  não-recuperável-por-argumento) e o registro de conflitos `C-##`.

**Regra dura de proteção:** dois perfis, `turn` e `agent`, compartilhando
vocabulário mas **não** conjunto de comandos. Nenhum comando entra no core
porque o modo AGENT precisa dele. Comandos exclusivos de AGENT vivem em
namespace separado. Sem essa regra, a pressão de produção infla o core e mata
a economia de digitação do uso diário — que é o valor comprovado do projeto.

## 3. O alvo: um bundle de seis camadas

O engine deixa de emitir *um documento* e passa a emitir *um bundle*. Cada
camada tem um consumidor diferente, e é o consumidor que dita o formato — não
a estética.

| Camada | Pergunta que responde | Consumidor | Formato de emissão |
|---|---|---|---|
| **L0 IDENTITY** | quem é este agente, e o que ele **não** é | modelo | XML / PGML |
| **L1 SCOPE** | o que existe; o que pode ser tocado | modelo **e** sandbox | XML + JSON |
| **L2 TOOL CONTRACT** | o que pode ser invocado, com que forma | Harness (registro) **e** modelo (política) | JSON Schema + XML |
| **L3 PROCEDURE** | em que ordem; orçamento de retry; estados terminais nomeados | modelo | XML / HGML |
| **L4 OUTPUT CONTRACT** | o que o agente é obrigado a emitir | parser do Harness + validador | JSON Schema |
| **L5 GATE SPEC** | o que é checado, por quem, mecanicamente | CI / Harness — **nunca o próprio agente** | JSON / YAML |

Três invariantes governam o bundle:

**I1 — Uma fonte, N projeções.** Nenhum arquivo emitido é editado à mão. Um
diff em arquivo gerado é sinal de gate, não objeto de revisão.

**I2 — Enforcement nunca mora só no prompt.** `forbidden_paths` num XML é uma
sugestão ao modelo. A proibição real é o sandbox. L1 e L5 emitem sempre duas
faces: a declarativa (para o modelo entender) e a executável (para o ambiente
impedir). Se só existe a face declarativa, marque como *não aplicado*.

**I3 — O gate não é auto-atestado.** O exemplo de produção que originou esta
discussão viola isto: o mesmo agente que escreveu o código marca o checkbox
"cobertura mantida em 100%". O ORCHESTRATION.md §2.1 (F6) e §4
(*self-acceptance*) já proíbem. **Nesta dimensão o nosso modelo é superior ao
exemplo e não deve ser rebaixado para imitá-lo.** Tudo que é
maquinalmente-checável em L5 é executado fora do modelo; o que sobra vira
opinião de risco do QA, nunca veredito do produtor.

## 4. O que copiar do exemplo, item por item

Copiar (propriedades estruturais, não a aparência):

- separação `identity` / `objective` / `tone_and_behavior` — três coisas
  distintas que colapsam quando escritas em prosa corrida;
- escopo com três estados explícitos: `read-write`, `read-only`, `forbidden`
  (a terceira lista é o que falta na maioria dos prompts);
- princípio do menor privilégio declarado, não implícito;
- **orçamento de retry com número** (`máximo 3 tentativas`) e **estado terminal
  nomeado** (`REPROVADO_POR_TESTES`). Sem estado terminal nomeado o agente
  entra em loop ou improvisa uma saída;
- `output_contract` com forma JSON literal — o Harness parseia isso;
- artefato de estado em caminho fixo (`artifacts/last_run.json`). Isto é o
  "the file is the only thing that crosses" do ORCHESTRATION §1.7, já
  implementado.

Não copiar:

- o gate auto-atestado (I3 acima);
- `<step sequence="N">` como narrativa de procedimento. Passos escritos em
  prosa numerada divergem do que o código faz na terceira semana. L3 deve ser
  gerado a partir do mesmo lugar que define os estados terminais;
- profundidade de aninhamento decorativa. XML ajuda porque **delimita**, não
  porque é XML. Aninhamento profundo custa token e atenção. Fixar teto de
  profundidade (sugestão: 3) no schema do alvo.

## 5. Sequência de adoção

O ORCHESTRATION §8 diz: *não comece pela topologia, comece pelo gate.* A
tradução direta para cá:

> **Não comece pelos emissores. Comece pelo validador.**
> Um engine que emite quatro formatos sem validar nenhum produz lixo mais
> rápido.

**P0 — Definir o alvo. Zero código de engine.**
Escrever `TARGET_BUNDLE.md` (o schema das seis camadas) e **um bundle golden
escrito à mão** para o DV, usando o XML de produção como referência.
*Saída:* um humano olha o bundle golden e concorda que aquilo é nível de
produção. Se não concorda, o alvo ainda não existe e nada depois faz sentido.

**P1 — Validador (`glyph-check`).** Roda sobre bundles escritos à mão.
*Saída (teste de mutação):* quebrar 10 coisas no bundle golden — schema
inválido, path fora do escopo, tool sem estado terminal, output contract
ausente. O validador precisa pegar ≥9. Zero capturas significa validador
decorativo.

**P2 — Primeiro emissor: L0 + L1 a partir de Glyph.**
*Saída:* o emitido bate com o golden escrito à mão. Revisado por diff **uma
vez**; depois disso, nunca mais.

**P3 — L2 em emissão dupla.** Uma declaração de tool no source gera (a) o JSON
Schema para registro no Harness e (b) a política XML para o modelo.
*Saída:* mudar um parâmetro no source muda os dois outputs; um par
dessincronizado à mão é rejeitado pelo validador.
**Esta é a fase de maior valor do plano** — é a classe de defeito da §0.

**P4 — Compilar os role docs do TEAM.**
`PO.md`, `DV.md`, `QA.md`, `DA.md` passam a ser gerados a partir de source
Glyph, e a matriz de 12 arestas de contrato passa a ser **derivada, não
digitada**.
*Saída:* uma aresta faltando é erro de compilação, não algo que se descobre
lendo quatro arquivos. Isto fecha o anti-padrão do ORCHESTRATION §7 —
*"writing agent prompts that duplicate the role docs and then diverge from
them"* — de forma estrutural, não disciplinar.

**P5 — L4 + L5.** Output contract e gate spec emitidos; Rule A e Rule B
compiladas para configuração de gate executável.

**P6 — Matriz de formatos (PGML / HGML / JSON em paralelo).** Só aqui. E só
para formatos que tenham um consumidor que os parseia.

Cada fase segura sua métrica antes da próxima. O teto do sistema é capacidade
de revisão em todos os estágios (ORCHESTRATION §6).

## 6. Riscos e contra-argumentos

**R1 — "O Glyph vira um YAML pior."** É o defeater mais forte e é parcialmente
verdadeiro. Se uma camada é 90% config declarativa escrita uma vez e lida
sempre, a sintaxe de brackets não adiciona nada e *custa* um parser.
*Critério de decisão:* o Glyph só se justifica onde (a) a frequência de autoria
é alta e o custo de digitação importa, ou (b) uma fonte precisa projetar em ≥2
formatos mutuamente incompatíveis. **Consequência prática: não "glyphificar" a
camada L1 estática de ambiente.** Aquilo é YAML.

**R2 — Proliferação de formatos.** Quatro formatos × N agentes multiplica a
superfície de teste. Um formato sem consumidor que o parseie é decoração.
Adiar até existir o consumidor.

**R3 — Dívida de revisão (o gargalo declarado do ORCHESTRATION).** Um
compilador que emite 6 artefatos por papel × 8 papéis do NEW-TEAM = 48
artefatos. Se forem revisados, o sistema morre no próprio gargalo.
*Contramedida:* artefatos gerados **não são revisados nunca**. Só source e
validador são. Banner `<!-- GENERATED — do not edit -->` no topo de todo
emitido, e checagem de CI de que nenhum gerado foi modificado à mão.

**R4 — Culto ao XML.** "Mais XML = mais produção" é falso. O ganho é
delimitação semântica. Teto de aninhamento no schema (§4).

**R5 — Duas variáveis ao mesmo tempo.** Há uma migração de engine em avaliação
(JS → C++/Rust). Trocar o alvo de compilação e a linguagem do compilador
simultaneamente torna impossível atribuir qualquer regressão.
*Sequência:* congelar o alvo (P0–P1), depois portar. O validador é justamente
o artefato que torna o port verificável — ele é o teste de aceitação da
reescrita.

## 7. Definition of Done — uma fase deste plano

- [ ] A fase tem um bundle golden ou um caso de teste que a define
- [ ] O validador rejeita a violação correspondente (teste de mutação passou)
- [ ] Nenhum artefato gerado foi editado à mão
- [ ] Nenhum comando novo entrou no core por causa do modo AGENT
- [ ] O modo TURN continua funcionando sem regressão de digitação
- [ ] Nenhuma camada depende de auto-atestação do agente para ser considerada
      aplicada (I3)
- [ ] Métrica da fase estável antes de abrir a próxima

## 8. Métricas de saúde

- **Taxa de dessincronia L2** — pares schema/política divergentes detectados
  pelo validador. Deve cair a zero e ficar.
- **Custo de digitação no modo TURN** — caracteres do operador por instrução
  emitida. Se sobe, a §2 está sendo violada.
- **Artefatos gerados editados à mão** — deve ser zero. Qualquer valor > 0 é
  bug de contenção.
- **Cobertura de mutação do validador** — quantas quebras injetadas ele pega.
- **Razão comandos-core / comandos-agent** — se o core cresce, o perfil
  separado falhou.

## 9. Limites declarados deste plano

Escrito sem acesso a: a spec real do Glyph v1.7, os arquivos de
`Docs/.guidelines/TEAM/`, o emissor XML atual do engine, e as definições
operacionais de **PGML** e **HGML**. As camadas da §3 foram mapeadas a
*funções*, não aos seus formatos nominais — o mapeamento formato→camada é uma
decisão que cabe ao operador, não uma inferência que eu possa fazer daqui.

Também não sei qual Harness é o alvo real. A face de registro de L2 é
específica do Harness e não é decidível sem essa informação.

Este documento está em português com identificadores em inglês. Se o conjunto
`.guidelines` for canonicamente inglês, a tradução é mecânica.
