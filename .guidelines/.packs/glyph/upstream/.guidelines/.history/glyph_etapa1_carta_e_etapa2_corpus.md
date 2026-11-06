# Glyph — Etapa 1 (Carta de Intenção) e Etapa 2 (Corpus)

> Documento de trabalho. Objetivo: fixar em um só lugar tudo o que hoje se perde
> ao longo da documentação. Nada aqui é implementação; é **decisão** e **evidência**.
> Status: rascunho para revisão do operador (Eros).

---

# ETAPA 1 — CARTA DE INTENÇÃO

## 1.1 Tese (a frase-norte)

> **Glyph é uma linguagem de marcação para a linguagem natural, cuja finalidade
> primária é ajudar o humano a expor suas próprias ideias com mais detalhe —
> e só secundariamente instruir a máquina.**

Consequência de design, a ser aplicada em toda disputa futura:

- Quando houver conflito entre **expressividade humana / economia de digitação**
  e **simplicidade de implementação**, vence a expressividade humana.
- O único limite absoluto dessa preferência é: **o resultado precisa ter parse
  não-ambíguo**. Ambiguidade não é um custo de implementação, é falha de
  propósito — uma nota que se lê de duas formas não ajuda o humano a pensar.

## 1.2 O que o Glyph é

Uma notação de comandos abreviados, entre delimitadores, que descreve um
**fluxograma escalável até os mínimos detalhes** a partir de comandos breves.
Escreve-se linearmente; lê-se como estrutura em árvore.

## 1.3 O que o Glyph NÃO é (non-goals explícitos)

Registrar isto evita feature creep — é a metade mais importante da Etapa 1.

- **Não é** uma linguagem de programação. Não há execução, estado persistente,
  I/O, nem loops além do que a leitura sequencial oferece.
- **Não é** um protocolo de máquina otimizado (cf. 1.1). Não compete com JSON/XML.
- **Não é** um mecanismo de permissão. Nenhum comando expande o que o leitor faz;
  comando comprimido é avaliado exatamente como a mesma frase em português.
- **Não é** persistente entre conversas. Definições são de escopo de sessão.
- **Não é** obrigatoriamente puro: texto livre convive com comandos na mesma linha.

## 1.4 O "leitor" (o "quê")

O termo genérico para o agente que consome Glyph. Requisitos mínimos, derivados
da lista do operador:

- **R1.** Reconhecer abreviações delimitadas.
- **R2.** Resolver cada abreviação por **tabela de significados** (abrev → palavra
  inteira), em passe léxico isolado, antes de ler por sentido.
- **R3.** Manter **estado de pilha**: gravar aberturas, extensões e parâmetros de
  cada `[CMD]` ativo. (Isto é o que torna o Glyph livre de contexto, não regular.)
- **R4.** Emitir **erro previsível** quando a aridade esperada não é satisfeita.
- **R5.** Resolver séries por leitura **esquerda → direita**, montando uma sentença.

## 1.5 Invariantes (numerados, rastreáveis)

Cada invariante recebe ID permanente. Qualquer mudança futura cita o ID.

| ID | Invariante | Origem |
|---|---|---|
| I-01 | Existe um leitor capaz de ler abreviações | lista do operador |
| I-02 | Leitura = resolução de abreviação por tabela de significados | idem |
| I-03 | Delimitação: `[` abre, `]` fecha um comando | idem |
| I-04 | Uma abreviação é um **comando**; genericamente `[CMD]` | idem |
| I-05 | Aninhamento é obrigatório: `[[ ]]` | idem |
| I-06 | Comandos podem receber comandos como parâmetro (origem de I-05) | idem |
| I-07 | Auto-fechamento LIFO em `;`: `[[[;` = `[[[]]];` | idem |
| I-08 | Parâmetro literal ocupa espaço próprio no chamado do comando | idem |
| I-09 | Vírgula separa múltiplos parâmetros | idem — **ver C-03** |
| I-10 | Operações/condicionais são a expectativa central do Glyph | idem |
| I-11 | `[DEF]` significa **default** — sempre significou | idem — **ver C-02** |
| I-12 | Encadeamento de comandos: `[CMD1-CMD2-CMD3]` | idem |
| I-13 | Alguns comandos recebem **nome** como parâmetro (`section`, `block`) | idem |
| I-14 | Templates são invocados por `[--` | idem — **ver C-04** |
| I-15 | Alguns templates **sobrepõem** comandos comuns | idem |
| I-16 | Séries retornam na ordem de leitura esquerda → direita | idem |
| I-17 | Comando com aridade > 0 seguido de `]`, `;` ou `-` sem parâmetro = **erro** | idem — **ver C-05** |
| I-18 | O auto-fechamento não isenta I-17 | idem |
| I-19 | Emoções usam `/` como delimitador (substituiu `\`) | idem — **ver C-01** |

## 1.6 Registro de conflitos (a resolver antes da Etapa 3)

Nada abaixo foi decidido por conta própria. Cada item precisa de um veredito do
operador; até então, a formalização fica bloqueada.

### C-01 — Colisão `/` emoção vs `/` divisor  🔴 bloqueante
- I-19 usa `/` para emoção: `/eth/`.
- I-12 / operador *divide* já usa `/` no interior de cadeias: `[in-/RW/FM/IM`.
- **Efeito:** o lexer não separa os dois casos sem lookahead frágil; `[in-/RW/`
  é cadeia ou emoção embutida?
- **Opções:** (a) manter `\` para emoção; (b) outro delimitador de emoção
  (ex. `:eth:`, `~eth~`); (c) trocar o divisor de cadeia (mas I-12 já usa `-`,
  então o divisor talvez seja redundante — investigar se `/` é necessário).

### C-02 — `[DEF]` = default deixa *define* órfão  🟠
- I-11 fixa `[DEF]` = default.
- A skill instalada `glyph-markup` documenta `[DEF[X = meaning]]` como **define**.
- **Efeito:** documentação instalada está incorreta; e não há tag para *definir*.
- **Opções:** criar `[DFN]` ou `[LET]` para define; ou desambiguar por aridade
  (`[DEF]` sozinho = default, `[DEF[X = ...]]` = define) — porém desambiguação
  por aridade contraria a clareza que I-02 busca.

### C-03 — Vírgula sobrecarregada  🟠
- I-09: vírgula separa parâmetros — `[abrev`t1`,`t2`]`.
- I-13: vírgula separa **nome** de **corpo** — `[section`sectA`,[CMD],...]`.
- **Efeito:** dois papéis gramaticais no mesmo símbolo. Parseável, mas o humano
  perde a leitura visual (contra 1.1).
- **Opções:** `:` para nome (`[section:`sectA`, ...]`), reservando `,` só para
  parâmetros irmãos.

### C-04 — `[--` para templates  🟡
- I-14 substitui `[TPL[...]]` por `[--`.
- **Efeito:** `--` é visualmente próximo do operador de extensão `-` (I-12).
  `[--REVCHECK]` vs `[A-B]` vs `[in-`…
- **Pergunta aberta:** `[--` é apenas invocação, ou também definição? Qual a
  forma de *definir* um template na versão nova?

### C-05 — Aridade não está declarada em lugar nenhum  🔴 bloqueante
- I-17 exige erro quando falta parâmetro; I-07 auto-fecha comandos abertos.
- **Efeito:** `[IF;` é simultaneamente válido (I-07) e erro (I-17).
- **Resolução necessária:** uma **tabela de assinaturas** — para cada comando,
  aridade mínima e tipo esperado (literal / comando / nome / série / nenhum).
  Regra derivada: *o auto-fechamento só pode fechar comandos cuja aridade mínima
  já foi satisfeita; do contrário, erro.* Esta tabela é entregável obrigatório
  da Etapa 3 e não existe hoje.

### C-06 — Operadores infixos não estão especificados  🔴 bloqueante
- I-10 diz que operações são o centro do Glyph; o exemplo do operador usa `>`:
  `[cond[var`A`>[var`B`, ...`
- **Efeito:** `>` é um **operador infixo**, classe gramatical ausente de toda a
  formalização até agora. Sem regras de precedência e associatividade,
  `[var`A`>[var`B`+[var`C`` é ambíguo.
- **Necessário decidir:** conjunto fechado de operadores (`> < = >= <= != & | !`?),
  precedência, associatividade, e se há parênteses de agrupamento.
  Alternativa mais conservadora e coerente com o resto do Glyph: **eliminar
  infixos** e usar forma prefixa de comando — `[gt[var`A`,[var`B`]]` — mantendo
  uma só regra sintática em toda a linguagem. Recomendo avaliar essa opção antes
  de investir em precedência.

### C-07 — Skills instaladas estão fora de sincronia  🟠
Os arquivos `glyph-markup` e `glyph-markup-commons` (v1.6) descrevem `\emoção\`,
`[TPL[...]]` e `[DEF]`=define. Enquanto não forem atualizados, o leitor vai
interpretar sua entrada nova pela regra velha. Isto não é um problema de spec, é
um problema de deploy — mas produz erro real de leitura hoje.

## 1.7 Critério de "pronto" para a Etapa 1

A Etapa 1 fecha quando: (a) C-01, C-05 e C-06 estiverem decididos; (b) cada
invariante tiver ao menos um exemplo no corpus da Etapa 2; (c) os non-goals de
1.3 forem confirmados como definitivos.

---

# ETAPA 2 — CORPUS

## 2.1 Regras do corpus

- Cada caso é um par: **intenção em português** ↔ **Glyph desejado**.
- A intenção é escrita **primeiro**, sem olhar a sintaxe. Isso impede que o corpus
  vire apenas uma ilustração do spec atual em vez de um teste dele.
- Todo caso cita o(s) invariante(s) que exercita.
- **Mínimo de 25% de casos negativos** (devem falhar, e falhar de forma prevista).
- Um caso cujo Glyph você não consegue escrever é o resultado mais valioso do
  corpus: marque `⚠ NÃO EXPRESSÁVEL` e siga. Isso é requisito descoberto.

## 2.2 Casos positivos

| # | Intenção (português) | Glyph | Testa |
|---|---|---|---|
| P-01 | Resuma isto. | `[SUM]` | I-01..I-04 |
| P-02 | Resuma isto, passo a passo. | `[SUM`step by step`]` | I-08 |
| P-03 | Critique, considerando o contexto. | `[CRIT[CTX]]` | I-05, I-06 |
| P-04 | Critique, considerando o contexto, e pergunte se ficar em dúvida. | `[CRIT[CTX],[ASK;` | I-07, I-09 |
| P-05 | Compare estes dois termos. | `` [CMP`termo1`,`termo2`] `` | I-09 |
| P-06 | Revise, melhore e formate. | `[REV-IMPR-FMT]` | I-12 |
| P-07 | Na seção "A", critique e proponha alternativa. | `` [SECTION`sectA`,[CRIT],[PROP[ALT]]] `` | I-13, C-03 |
| P-08 | Se A for maior que B, some em vez de perguntar. | `` [COND[gt[VAR`A`],[VAR`B`]],[INSTOF[SUM],[ASK; `` | I-10, C-06 |
| P-09 | Se a instrução falhar, é obrigatório formatar em vez de acionar o fallback; motivo: contexto obsoleto. | `[IF[INS[FAIL]],[MAND[FMT][INSTOF[FBK],[RSN[DEPR[CTX]]]` | I-16, R5 |
| P-10 | Invoque o template de revisão. | `[--REVCHECK]` | I-14 |
| P-11 | Critique o contexto; se houver erro, categorize e avise; opcionalmente pergunte para esclarecer. | `[CRIT[CTX],[IF[ERROR],[CAT][WARN],[OPT[ASK][CLAR];` | I-15, I-16 |
| P-12 | Evite usar a abreviação X. | `` [AVD[ABREV`X`]] `` | I-06 |
| P-13 | Este é o padrão, salvo indicação contrária. | `[DEF]` | I-11 |
| P-14 | (com entusiasmo) Proponha três ideias. | `` /eth/[BRST`3`] `` | I-19, C-01 |
| P-15 | No bloco "B", verifique e conclua. | `` [BLOCK`blockB`,[VRFY],[CNCL]] `` | I-13 |
| P-16 | Resuma; depois liste as limitações. | `[SUM];[LIM]` | I-07 (fronteira de segmento) |
| P-17 | Instrução: reformular mantendo o sentido literal `as-is`. | `` [INS[RWK`as-is`]] `` | I-08 (literal com espaço) |
| P-18 | Três níveis aninhados fechados de uma vez. | `[INS[ASSM[ASK;` | I-07 |
| P-19 | Defina o termo "API" como "Interface de Programação". | `` [DFN`API`,`Interface de Programação`] `` | C-02 |
| P-20 | Valide a solução contra o critério da especificação. | `` [VAL`solução`,`especificação`] `` | C-05, ASSINATURAS |
| P-21 | Use alias `[EVAL]` que resolve para `[CRIT]`. | `` [EVAL`projeto`] `` | ALIAS v1.7 |
| P-22 | Use alias `[SPEC]` que resolve para `[ELAB]`. | `` [SPEC`requisito`] `` | ALIAS v1.7 |
| P-23 | Contexto estendido com slots `what`, `where`, `when`. | `` [CTX`banco`,`prodDB`,`v1.7`] `` | C-08 |

## 2.3 Casos negativos (devem falhar previsivelmente)

| # | Entrada | Falha esperada | Testa |
|---|---|---|---|
| N-01 | `[IF;` | erro: `IF` exige condição; auto-close não supre | I-17, I-18, C-05 |
| N-02 | `[CMP`a`]` | erro: `CMP` exige 2 parâmetros, recebeu 1 | I-17, C-05 |
| N-03 | `[SECTION,[CRIT]]` | erro: `SECTION` exige nome | I-13, I-17 |
| N-04 | `[COND-]` | erro: extensão vazia após `-` | I-17 |
| N-05 | `` [SUM`abc `` (literal não fechado no fim da mensagem) | erro: literal não encerrado | lexer literal |
| N-06 | `[--NAOEXISTE]` | erro: template não definido na sessão | I-14 |
| N-07 | `[in-RW-FM-IM` | resolvido: cadeia válida em v1.7 (sem `/` divisor) | C-01 (sucesso) |
| N-08 | `[gt`A`]` | erro: `gt` exige 2 parâmetros | C-06, C-05 |
| N-09 | `[DFN`símbolo`]` | erro: `DFN` exige 2 parâmetros (símbolo e significado) | C-02, C-05 |
| N-10 | `[VAL`alvo`]` | erro: `VAL` exige 2 parâmetros (alvo e critério) | C-05 |

> N-05, N-07 e N-08 não têm falha *esperada* porque o spec não decide o caso.
> São exatamente os três lugares onde a linguagem está incompleta.

## 2.4 Como usar este corpus

1. Preencha P-19 e adicione seus próprios casos até chegar a ~30.
2. Para cada `⚠`, abra um item no Registro de Conflitos (1.6).
3. Só então escreva a EBNF (Etapa 4). A gramática deve aceitar **todos** os
   positivos e rejeitar **todos** os negativos — isso é o critério de aceite.
4. Quando o parser existir (Etapa 6), este arquivo vira a suíte de testes literal.
