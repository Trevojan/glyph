# Glifos e Hieróglifos — glossário normativo (v1.1.0.0)

Referência normativa do vocabulário Glyph. Organizado por **espécie** e não por
tema, porque é a espécie que decide o que `.hgml` pode tratar como átomo.

**O motor deriva deste documento, não o contrário.** Desde a v1.1.0.0 o
`glyph-parser.js` está alinhado a ele: as 120 entradas abaixo existem no
vocabulário, e `expansoes.txt` fecha em 0 ciclos e 0 indefinidos.

Marcas: **★** entrada proposta na consolidação, não no rascunho original.

## Versionamento — `a.b.c.d`

| dígito | camada |
|---|---|
| `a` | frontend — HTML, CSS, UI |
| `b` | backend — o parser: lexer, árvore, emissores |
| `c` | business rules — `glyph-rules.json`, constraints, valência |
| `d` | data — tabelas de vocabulário, constantes, glosas |

Um dígito que anda **zera todos à direita**. A v1.0.9.3 → v1.1.0.0 foi um salto
de *backend*: vocabulário novo, renomeação e de-fusão são mudanças no núcleo.

---

## 0. Legenda — as espécies

O rascunho usava 7 rótulos sem legenda, e dois deles se contradiziam
(`glifo primitivo` — se glifo tem fórmula, não pode ser primitivo). Proposta:
dois eixos independentes, mais duas espécies que não são vocabulário.

|  | **primitivo** — vale sozinho | **operador** — precisa de operando |
|---|---|---|
| **hieróglifo** — átomo, não decompõe | `hieróglifo primitivo` | `hieróglifo operador` |
| **glifo** — tem fórmula | *(vazio por construção)* | `glifo composto` |

- **engine** — não é vocabulário do usuário: estrutura que o motor interpreta.
- **mo** — modo: muda como o resto do documento é lido.

Consequência prática: **todo hieróglifo vira uma linha `= BASE` em
`expansoes.txt`; todo glifo vira uma linha com fórmula.** É essa fronteira que o
`.hgml` precisa, e é a única razão da legenda existir.

Os 14 verbetes que estavam como `glifo primitivo` foram reclassificados como
`hieróglifo primitivo` ★ — são átomos, não compostos sem fórmula.

## 0.1 Notação das fórmulas — normativo

Quatro construções, cada uma com uma leitura só:

| forma | leitura |
|---|---|
| `[A[B]]` | **aninhamento** — B é operando de A |
| `[A],[B]` | **conjunção** — A e B valem juntos, sem ordem entre si |
| `[A][B]` | **sequência** — A, depois B |
| `[A-B]` | **cadeia** — A e B aplicados ao mesmo operando |

A notação algébrica `A + B` das fórmulas antigas (`SIMP`, `GEN`, `SUM`, `CAT`)
fica **aposentada**: é conjunção, e deve ser reescrita em colchetes para não
manter duas sintaxes vivas. As quatro estão marcadas na §3.

## 0.2 `BASE` e `CORE` — a desambiguação

`BASE` era duas coisas: a palavra-chave do lado direito em `expansoes.txt`
("isto é um átomo") e um comando do vocabulário ("fundamento estrutural").
Resolvido:

- **`BASE`** — só a palavra-chave do `expansoes.txt`. Não é comando, não aparece
  entre colchetes, não entra em fórmula.
- **`CORE`** ★ — o comando. Fundamento estrutural de objeto de contexto.

Todas as fórmulas da §3 já estão reescritas com `CORE`. Custo no motor: 4 pontos
de código (§6.4), **zero casos de teste** — `test-corpus.js` não usa `BASE` em
lugar nenhum.

Também reclassifiquei `CORE` de *engine* para *hieróglifo primitivo* ★: ele
aparece como operando em 11 fórmulas, o que é comportamento de átomo de
vocabulário, não de estrutura de motor.

## 0.3 Ligação do operando — normativo

Uma fórmula descreve operações, mas não diz **sobre o quê**. Quando o humano
escreve `[crit'o parser']`, algo tem que decidir onde `'o parser'` entra na
fórmula de `CRIT`. A regra:

> **O operando do humano é o sujeito da fórmula inteira.** Cada item opera sobre
> esse mesmo sujeito; o que aparece aninhado dentro de um item é o *padrão* ou
> *aspecto* contra o qual aquele item opera, não um sujeito novo.

Combinada com a §0.1:

| forma | sujeito de `B` |
|---|---|
| `[A],[B]` | o mesmo de `A` — conjunção não troca o sujeito |
| `[A][B]` | o **resultado** de `A` — sequência encadeia |
| `[A[B]]` | `B` não é sujeito: é operando/padrão de `A` |

`CRIT` = `[CMP[CTX]],[SPEC-CORE],[EVAL[ERROR]]`, com `'o parser'` como sujeito,
lê-se: **compare `'o parser'` com o contexto; especifique o núcleo de
`'o parser'`; avalie `'o parser'` quanto a erros.** Os três itens são vírgula,
então os três falam do parser — `CTX`, `CORE` e `ERROR` são contra o quê, não
sobre o quê.

A regra se sustenta em toda a tabela:

| invocação | leitura |
|---|---|
| `[prob'timeout']` | `[ERROR[CTX]]` — timeout é erro, situado num contexto |
| `[vrfy'a saída']` | `[CMP-TRUE[[CORE],[TGT]]]` — compare a saída com a verdade, contra fundamento e alvo |
| `[alt'usar cache']` | `[NEQ[CORE]],[EQ[TGT]]` — difere do fundamento, coincide no alvo |
| `[assm'o banco responde']` | `[ADD[CORE]],[NEV[VRFY]]` — entra como fundamento, nunca é verificado |

**Por que isto precisava ser escrito:** a glosa em prosa de uma fórmula tende a
suprir o sujeito entre parênteses ("o núcleo *do contexto*"), e a fórmula não o
diz. Sem a regra, cada leitor supre um sujeito diferente e o emissor `.hgml` não
tem como escolher. Com ela, a decomposição é mecânica — que é a condição para
`toHGML()` existir (`HGML_PLAN.md`, passo 17).

---

## 1. Hieróglifos operadores

Átomos que agem sobre outro elemento.

`TRUE` — True. Comparação-base: verdadeiro.
`FLS` — False. Comparação-base: falso.
`POS` — Positive. Polaridade positiva, afirmação ou concordância.
`NGT` — Negative. Polaridade negativa, negação ou discordância.
`DONT` — Do not. Nega **fazer algo**: proibição direta sobre uma ação.
`DENY` — Deny. Rejeita **o que leva a um resultado**: recusa da via, não da ação em si.
`PRIO` — Prioritise. Elemento prioritário entre demais objetos do contexto.
`OVR` — Override. Suspende regra anterior, sobrescreve de acordo.
`DFN` — Define. Estabelece definição, cria associação semântica, chama novos conceitos.
`CMP` — Compare. Avalia a relação entre valores do contexto.
`CNST` — Constraint. Regra testável, usada como alvo de comparação.
`ASK` — Ask. Ato de solicitar resposta a alguém; dispara pergunta.
`ELAB` — Elaborate. Expande com detalhes; desenvolve ideia.
`CLAR` — Clarify. Torna claro; remove ambiguidade.
`COND` — Condition. Gate lógico para execução condicional.
`FMT` — Format. Especifica formato de saída; padrão de apresentação.
`ITR` — Iterate. Repetição controlada de um processo.
`CONF` — Confirm. Validar decisão já tomada.
`UNLS` — Unless. Condicional negado; exclui execução sob certa condição.
`ONLYIF` — Only if. Condição necessária para execução.
`ONLYW` — Only when. Restrição temporal de execução.
`INSTOF` — Instead of. Substituição de uma ação por outra.
`AVD` — Avoid. Recomendação de evitar quando possível (grau fraco).
`RDY` — Readiness. Estado de prontidão para execução.
`INS` — Instruction. Comando direto de execução.
`WARN` — Warn. Alerta sobre uma condição relevante, sem bloquear execução.
`BYP` — Bypass. Contorna uma etapa sem executá-la.
`FIND` ⚠ — Find. Busca o valor no contexto e o define como alvo ou objeto de contexto.
`GT` — Greater than. Comparação numérica: maior que.
`GTE` — Greater or equal than. Comparação numérica: maior ou igual.
`LT` — Lesser than. Comparação numérica: menor que.
`LTE` — Lesser or equal than. Comparação numérica: menor ou igual.
`EQ` — Equals. Comparação de igualdade.
`NEQ` — Not equal. Comparação de desigualdade.
`GET` ⚠ — Get. Lê um valor do contexto e o retém até a próxima interação.
`SUB` ⚠ — Subtract. Diminui um valor explícito do contexto.
`ADD` ⚠ — Add. Adiciona um valor ao contexto, respeitando seu tipo.
`SWITCH` ⚠ — Switch. Alternância entre estados via seleção condicional.
`GO` ⚠ — Go. Executa; procede com a ação pendente.

**Sobre o par `DONT` / `DENY`:** a distinção é o objeto da negação — `DONT`
incide sobre a **ação** ("não faça X"), `DENY` incide sobre a **via** ("recuso o
caminho que leva a Y"). Consequência prática em `glyph-rules.json`: a regra
`req-deny` ("requiring and denying the same thing") foi escrita quando `DENY`
significava recusar uma proposta. Sob a definição refinada, `REQ` (exigir que
algo exista) e `DENY` (rejeitar uma via até um resultado) já não colidem
automaticamente — o texto da regra precisa ser revisto, e talvez a severidade.

## 2. Hieróglifos primitivos

Átomos que valem por si, sem operando.

`ERROR` — Error. Marca ou sinaliza falha ou exceção.
`MAND` — Mandatory. Requisito obrigatório, não é opcional.
`OPT` — Option. Elemento opcional, pode ser omitido.
`ALW` — Always. Comportamento permanente, sem exceções.
`NEV` — Never. Modificador de permanência aplicado a outra regra (ex: `NEV DONT X` = nunca faça X).
`PT` — Part, part of. Relação de pertencimento do objeto de um contexto.
`VAR` — Variable. Elemento variável, valor mutável, pronto para ser definido ou reutilizado.
`PARAM` — Parameter. Entrada configurável de um comando.
`PH` — Placeholder. Posição reservada em um objeto para input de valor.
`DEF` — Default. Valor padrão, comportamento base.
`TPL` ★ — Template. Molde nomeado, definido com `[--nome=` e invocado com `[--nome`.
`CORE` ★ — Core. Fundamento estrutural de objeto de contexto. *(era `BASE` — §0.2)*
`CTX` — Context. Escopo declarado.
`TGT` — Target. Alvo, destino ou objetivo.
`SPEC` — Specification. Descrição técnica detalhada de um requisito.
`LOGIC` — Logic. Bloco de operações matemáticas/booleanas.
`WHR` ⚠ — Where. Marca de local; contexto espacial de referência.
`HGH` ⚠ — High. Intensidade alta; prioridade elevada.
`LOW` ⚠ — Low. Intensidade baixa; prioridade reduzida.
`BOLD` ⚠ — Bold. Ênfase forte; destaque no output.
`LIGHT` ⚠ — Light. Ênfase suave; tom reduzido no output.
`ATC` — Attach. Anexa contexto ou referência auxiliar a um comando.

Reclassificados de `glifo primitivo` ★:

`EX` — Example. O exemplo em si — o dado, o caso concreto.
`RWK` — Rework. Reconstruir estrutura mantendo a intenção original.
`IMPR` — Improve. Melhorar qualidade sem alterar a estrutura (polish incremental).
`REV` — Review. Varredura de leitura buscando erro/inconsistência, sem comparação formal.
`SKEP` — Sceptic. Adotar postura cética diante de uma proposição.
`DIST` — Distinguish. Marcar diferença entre dois elementos.
`REAL` — Realistic. Padrão de qualidade prática, base do `EVAL`.
`REF` — Reference. Aponta para uma fonte externa.
`SEEAL` — See also. Sugere relação com outro elemento.
`NT` — Note. Anotação; marca ponto relevante.
`EXC` — Exception. Desvio explícito da regra geral.
`LIM` — Limitation. Constatação de um limite existente (não é imposição).
`REQ` — Requirement. Exigência positiva — o que precisa existir.
`EXT` — External. Marca elemento externo ao escopo do documento.
`RSN` ★ — Reason. Razão; motivo subjacente a uma decisão. *(promovido de composto — §5)*
`FIN` ★ — Finally. Marca de fechamento/encerramento. *(promovido de composto — §5)*

## 3. Glifos compostos

Têm fórmula em hieróglifos. As marcadas ★ são propostas minhas (§5 explica cada uma).

**Já existentes** (com `BASE` → `CORE` aplicado):

`VRFY` = `[CMP-TRUE[[CORE],[TGT]]]` — Verify. Comparar com a verdade/fato.
`VAL` = `[CMP-CTX[CNST]][SUB[EQ[CMP-CTX]]][CAT-EQ]` — Validate. Comparar com a restrição/regra.
`CRIT` = `[CMP[CTX],[SPEC-CORE],[EVAL[ERROR]]]` — Critique. Comparar com o contexto/objetivo declarado.
`EVAL` = `[REAL[CORE-CTX[DIST[SKL]]]],[REF[DEF[SPEC-CORE-CTX]]]` — Evaluate. Comparar com padrão realista de qualidade prática.
`SCRU` = `[DIST-RSN[TRYFR[FIND-REAL][WHR[REAL-EQ[R:[CONF]]]]][CTX-VRFY-RSN],[SUM[ASK[DIST-RSN[TRYFR[REAL]]]]]]` — Scrutinise. Examinar contexto sob verificação, criticar e questionar.
`TRYFR` = `[REV[REF[TGT]]][VRFY[TGT],[TRUE[CNCL[GO-LOGIC]]]]` — Try. Tentar atingir o alvo com verificação.
`PROB` = `[ERROR[CTX]]` — Problem. Erro situado dentro de um contexto específico.
`QST` = `[CTX[GET[CORE],[WHR[LOGIC-NONE]]],[ASK]]` — Question. Tipagem estrutural: marca um bloco como interrogativo (não necessariamente dirigido a alguém — ver `ASK`).
`DRVF` = `[RTNL-RWK[MAND-NEQ],[CTX[GO-SWITCH]]]` — Derive from. Extrair conclusão a partir de um princípio.
`FOREX` = `[GO-ALT[AVD[GET[CTX-REQ],[CTX-CNST],[CTX-EXC]]]]` — For example. Conectivo discursivo que introduz um `EX` no fluxo do texto.
`FBK` = `[IF-ERROR][EQ[RMBR[CORE]],[INSTOF[TRYFR],[GO[ALT]]]]` — Fallback. Plano alternativo de ação em caso de falha.
`RESTR` = `[IF[SKEP[CNST]][TRUE][LIM-GO[CTX-EQ[CNST]]]]` — Restrict. Ação de limitar o escopo de aplicação.
`HYP` = `[RMBR[FBK]][IMAG[ONLYIF[CNST-REAL]][TRUE],[ADD[CTX][FOREX-CORE]],[FBK]]` — Hypothesis. Proposição testável, não confirmada.

**Notação algébrica a aposentar** (§0.1) — reescrita minha ★ à direita:

| atual | reescrita proposta ★ |
|---|---|
| `SIMP` = `RTNL-SUB + CTX` | `[RTNL-SUB],[CTX]` |
| `GEN` = `ELAB + RWK + SUB-CTX` | `[ELAB],[RWK],[SUB-CTX]` |
| `SUM` = `SIMP + CORE` | `[SIMP],[CORE]` |
| `CAT` = `SUM + CORE + ELAB` | `[SUM],[CORE],[ELAB]` |

`SIMP` — Simplify. Reduzir complexidade — cortar, não adicionar.
`GEN` — Generalise. Categorizar instâncias em um padrão base.
`SUM` — Summarise. Simplificar mantendo o fundamento essencial.
`CAT` — Categorise. Organizar em classes.

**Propostos ★:**

`ALT` = `[NEQ[CORE]],[EQ[TGT]]` — Alternative. Difere no meio, coincide no fim.
`ASSM` = `[ADD[CORE]],[NEV[VRFY]]` — Assumption. Entra como fundamento, nunca é verificada.
`DEPR` = `[AVD[GO]],[OPT[REF[INSTOF]]]` — Deprecated. Evite executar; pode haver substituto.
`RTNL` = `[ELAB[RSN]],[REF[CNST]]` — Rationale. Razão detalhada e amarrada a um critério.
`IMAG` = `[ADD[CTX[NEQ[REAL]]]]` — Imagine. Acrescenta um contexto não-real.
`RMBR` = `[ALW[GET[CTX]]]` — Remember. Recuperação permanente do contexto.
`FRGT` = `[NEV[GET[CTX]]]` — Forget. Nunca mais recupera do contexto.
`LRN` = `[GEN[RMBR]],[ADD[CORE]]` — Learn. Generaliza o retido e incorpora ao fundamento.
`BRST` = `[ITR[ADD[ALT-IMAG]]],[NEV[CNST]]` — Brainstorm. Itera alternativas imaginadas, sem restrição.
`CNSD` = `[ITR[CMP[ALT],[CNST]]],[NEV[CNCL]]` — Consider. Compara cada alternativa à regra, sem concluir.
`PROP` = `[GO[ALT[RTNL]]],[ASK[CONF]]` — Propose. Apresenta alternativa com racional e pede aval.
`CTRD` = `[NGT[TGT]],[RTNL[DIST]]` — Contradict. Nega o alvo e sustenta com a diferença.
`CNCL` = `[FIN[DRVF[CORE-CTX]]]` — Conclude. Derivação final a partir do fundamento do contexto.
`JUST` = `[GO[RTNL]],[TGT[CNCL]]` — Justify. Aciona o racional em favor de uma conclusão.
`INTN` = `[DFN[TGT[RSN]]]` — Intention. Declara o alvo junto do seu motivo.

## 4. Engine e modos

**engine** — estrutura interpretada pelo motor, não vocabulário de instrução:

`IF` — If. Condicional lógico; gate de execução.
`SECTION` — Divisão estrutural nomeada que agrupa comandos relacionados.
`BLOCK` — Unidade atômica de execução; agrupa comandos interpretados como um único passo.
`SKL` — Marca uma skill instalada e invocável dentro do documento Glyph.
`NONE` ⚠ — None. Ausência de valor; retorno vazio de operações de engine.
`TOBLOCK` — Converte uma seção ou conjunto solto de comandos em estrutura `BLOCK`.
`TOSECTION` — Converte um bloco ou conjunto solto de comandos em estrutura `SECTION`.
`HMN` — Human. Representa o usuário/humano como objeto referenciável.

**mo** — modo, muda como o resto é lido:

`QUICK` — Diretiva de execução condensada: expande um comando abreviado em instrução canônica completa.
`OFF` — Off. Desativa a interpretação de Glyph a partir deste ponto.
`ON` — On. Reativa a interpretação de Glyph após um `OFF`.

---

## 5. As fórmulas propostas — razão de cada uma

O eixo dos seus 6 compostos originais: **um composto nomeia o que opera e contra
qual padrão** — `VRFY` contra a verdade, `VAL` contra a regra, `CRIT` contra o
objetivo, `EVAL` contra o padrão realista. Segui isso. Onde o verbete é
substantivo e não ação, a fórmula descreve o estado, não o procedimento.

**`RMBR` / `FRGT` — o par que se paga sozinho.** `[ALW[GET[CTX]]]` contra
`[NEV[GET[CTX]]]`: mesmo operando, quantificadores opostos. A contradição
`rmbr-frgt` que está em `glyph-rules.json` como tabela decorada passa a ser
*derivável* da fórmula. É o melhor argumento a favor do projeto inteiro de
expansão: as regras semânticas deixam de ser convenção e viram consequência.

**`BRST` explica a precondição que você já tinha escrito.** A fórmula não contém
`CTX` nenhum — brainstorm por construção não traz o próprio enquadre. É
exatamente por isso que a regra `brst-needs-frame` exige `@subject`/`@condition`
antes dele.

**`CNSD` e `BRST` se separam por uma negação só.** `BRST` = `NEV[CNST]` (gera sem
filtro); `CNSD` = `NEV[CNCL]` (filtra sem decidir). Um abre o leque, o outro pesa
o leque, nenhum fecha — quem fecha é `CNCL`.

**`ASSM` transcreve em vez de interpretar.** `[ADD[CORE]],[NEV[VRFY]]` é
literalmente a sua glosa: "premissa não verificada, tomada como fundamento".

**`ALT` foi o que mais mudou entre as passadas.** Uma alternativa não é só
"diferente do fundamento" — é substituível por ele. `[NEQ[CORE]],[EQ[TGT]]` diz
as duas coisas: diverge no meio, converge no fim.

**`RSN` e `FIN` eu tirei dos compostos.** `FIN` é marcador posicional, irmão de
`PT`; `RSN` é quase irredutível — as fórmulas que consegui (`[PT[NEV[ADD[PT]]]]`
e `[CORE[CTX-GO]]`) diziam menos que o verbete. Forçar fórmula ali cria
profundidade falsa no `dag.js` sem ganho semântico. Se você discordar, as duas
estão registradas aqui para reversão.

**Confiança.** Alta: `ASSM`, `ALT`, `IMAG`, `RMBR`, `FRGT`, `DEPR`, `INTN`,
`RTNL`, `CNSD`, `BRST`. Média: `CNCL`, `JUST`, `LRN`, `PROP`, `CTRD` — essas eu
revisitaria depois de ver as primeiras rodando contra casos reais.

**Ciclos:** verifiquei as 15 à mão, nenhuma alcança a si mesma. Confirmar com
`node scripts/dag.js` depois que §6.1 estiver resolvido.

---

## 6. Pendências

### 6.1 ~~`expansoes.txt` declara 28 átomos~~ — RESOLVIDO

`expansoes.txt` foi reescrito com as 88 declarações não-expansivas (77 átomos de
vocabulário + 11 de engine/modo, que aparecem em fórmulas e precisavam resolver)
e as 32 fórmulas de composto. Resultado de `node scripts/dag.js`:

```
nivel 0  [hieroglifo]   88
nivel 1  [composto-1]   13   ALT DEPR EVAL FRGT GEN IMAG INTN PROB QST RESTR RMBR RTNL VRFY
nivel 2  [composto-2]    9   ASSM BRST CRIT CTRD DRVF FOREX LRN PROP SIMP
nivel 3  [composto-3]    2   CNCL SUM
nivel 4  [composto-4]    4   CAT CNSD JUST TRYFR
nivel 5  [composto-5]    3   FBK SCRU VAL
nivel 6  [composto-6]    1   HYP

resumo: 120 com camada, 0 indefinidos, 0 ciclos
```

**A tabela fecha**: 120 verbetes, todos com camada, nenhum ciclo, nenhuma
dependência fantasma. A suíte segue 110/110 — `expansoes.txt` não está no require
graph de `test-corpus.js`.

`HYP` é o fundo do poço com 6 níveis, e faz sentido: hipótese depende de `FBK`,
que depende de `TRYFR`, que depende de `CNCL`, que depende de `DRVF`, que depende
de `RTNL`. Cinco saltos até chegar nos átomos.

Duas correções foram necessárias no `dag.js` para isso valer:

- **O regex de dependências comia as cadeias.** Era `/[A-Z_][\w-]*/g`, e `-` está
  dentro da classe — então `CMP-TRUE` saía como **um** identificador fantasma em
  vez de `CMP` e `TRUE`. Foi escrito quando as fórmulas eram separadas por espaço
  (`VRFY = CMP TRUE`); com a notação de cadeia da §0.1 ele corrompia toda
  dependência encadeada. Virou `/[A-Z_]\w*/g`. Nenhum comando tem hífen no nome,
  então dividir ali é sempre correto.
- **Os rótulos de nível contradiziam a taxonomia nova.** `dag.js` chamava o nível
  1 de "primitivo", mas `ALT`, `VRFY` e `RMBR` estão no nível 1 e são compostos.
  Agora nível 0 é `hieroglifo` e todo nível acima é `composto-N`.

### 6.2 ~~Doze tags não existem no motor~~ — RESOLVIDO (v1.1.0.0)

As doze entraram em `INSTR`, com duas categorias novas em `CATS` porque não
cabiam nas existentes sem forçar:

- **Contexto** (`ler, escrever e localizar no escopo`) — `FIND`, `GET`, `ADD`,
  `SUB`, `WHR`. A separação de *enquadre* é o que distingue **declarar** um
  escopo de **operar dentro** dele.
- **Intensidade** (`grau de força e de ênfase`) — `HGH`, `LOW`, `BOLD`,
  `LIGHT`. `PRIO` ordena *entre* itens; estas graduam *um* item.

`SWITCH` foi para *condição*, `GO` para *rumo*, `NONE` para `META` (é engine).
Os seis operadores ganharam valência em `FRAMES`; os cinco primitivos não, porque
o glossário diz que "valem sozinhos" — e portanto não geram `<needs>`.

Um efeito colateral tratado: `go` saiu de `SESSION`. `classify()` consulta
`INSTR` antes de `SESSION`, então a tag de sessão minúscula virou uma segunda
definição inalcançável da mesma palavra — exatamente o motivo pelo qual `prob`
já tinha saído dessa tabela na v1.0.9.

### 6.3 ~~Três símbolos fantasma~~ — RESOLVIDO

`CMD`, `R` e `THEN` sumiram da conta. Cada um por um caminho diferente:

**`THEN` — eliminado pela própria regra de notação.** Não foi substituído por
nada: a §0.1 define justaposição `[A][B]` como sequência, que é exatamente o que
`THEN` marcava. Em `VAL` e `TRYFR` ele estava entre grupos já justapostos, então
era pura redundância:

```
[REV[REF[TGT]]][THEN[VRFY[TGT],…]]   →   [REV[REF[TGT]]][VRFY[TGT],…]
```

Em `SCRU` era diferente — ali o `THEN` estava **dentro de uma lista separada por
vírgula**, e vírgula é conjunção, *sem ordem entre os itens*. Ele era a única
coisa dizendo que B vinha depois de A, então removê-lo exigia decidir o que
acontecia com C. Escolha sua: **A→B em sequência, C em paralelo** —
`[DIST-RSN[A][CTX-VRFY-RSN],[SUM[C]]]`.

**`R` — resolvido no `dag.js`, não na fórmula.** `R:` é token de retorno do lexer
(`r-` / `R:`, que liga `seg.isReturn`), não comando. Em vez de apagá-lo de `SCRU`
— o que perderia a marcação de retorno — o `dag.js` passou a descartar os tokens
de retorno antes de extrair dependências. Compor e marcar retorno são eixos
diferentes; a tabela de expansão só precisa enxergar o primeiro.

**`CMD` — removido de `FBK`.** Era metavariável ("o comando qualquer"), não
comando real, e `ALT` já significa "a alternativa": `[GO[ALT-CMD]]` → `[GO[ALT]]`
diz o mesmo com um símbolo a menos.

(`INSTOFF` em `FBK` era typo de `INSTOF`; corrigido na §3.)

### 6.7 ~~Três fórmulas com colchetes desbalanceados~~ — RESOLVIDO

`VAL`, `EVAL` e `SCRU` foram fechadas por você. **As 32 fórmulas estão
balanceadas**, verificado por contagem. `VAL` resolveu e entrou no nível 5 (é
hoje o composto mais profundo do vocabulário: `CAT` está no 4, e `VAL` depende
dele).

Uma correção aplicada de passagem: `EVAL` voltou escrita com `BASE-CTX` e
`SPEC-BASE-CTX` — cópia de versão anterior à decisão da §0.2. Reescrita para
`CORE-CTX` e `SPEC-CORE-CTX`.

### 6.4 ~~`BASE` → `CORE`~~ — RESOLVIDO (v1.1.0.0)

Aplicado nos 4 pontos: `CATS` e `INSTR` em `glyph-parser.js`, a classe
`subject` em `glyph-rules.json`, e as 3 ocorrências de `tag:"base"` nos moldes
*fluxo*, *decisão* e *laço*. `glyph-data.js` regenerado.

`dag.js` não mudou: a palavra-chave `= BASE` segue sendo `BASE`, agora sem
ambiguidade. E foi acrescentado um caso negativo à suíte (**N-13**) fixando que
`[base]` agora *tem* que falhar como vocabulário desconhecido — sem ele, a
colisão que a renomeação desfez poderia voltar pelo parser sem ninguém notar.

### 6.5 A de-fusão da v1.7 contradiz o motor e quebra 4 casos da suíte

Este glossário trata as fusões da v1.7 como **rejeitadas**, e as distinções que
você desenhou são boas e seguem um eixo único — *objeto vs. ato*, ou *padrão de
comparação*:

| par | eixo que os separa |
|---|---|
| `EX` / `FOREX` | o dado / o conectivo que o introduz |
| `QST` / `ASK` | tipagem do bloco / ato dirigido a alguém |
| `EVAL` / `CRIT` | contra padrão realista / contra objetivo declarado |
| `REV` / `CRIT` | varredura sem comparação / comparação formal |
| `ONLYIF` / `COND` | condição necessária / gate genérico |
| `SPEC` / `ELAB` | o artefato detalhado / o ato de detalhar |
| `SIMP` / `CLAR` | cortar complexidade / remover ambiguidade |

**Aplicado na v1.1.0.0** apagando as 7 linhas de `ALIAS` — `classify()` consulta
`ALIAS` antes de `INSTR`, e os sete já tinham verbete próprio lá, então a
existência da linha era a fusão inteira. Os sete também já tinham valência em
`FRAMES`, então a de-fusão saiu de graça nesse ponto.

Quatro casos afirmavam a fusão e foram reescritos (`P-06`, `P-21`, `P-22`,
`R-01`); cinco novos (`P-30`..`P-34`) fixam cada par como distinto. Nenhum outro
caso quebrou.

Três regras de `glyph-rules.json` citavam a fusão como fato e foram corrigidas:

- **`clar-elab` virou `simp-elab`.** A tensão real é cortar × acrescentar, e
  quem corta é `SIMP`. `CLAR` remove ambiguidade — o que muitas vezes *adiciona*
  palavras, então não se opõe a `ELAB`.
- **`gen-elab`** perdeu o "(ELAB absorbed SPEC)" do texto, e ganhou uma irmã:
  **`gen-spec`**, a tensão que a fusão vinha escondendo.
- **A classe `coarsen`** era `[GEN, SUM, CLAR]` e virou `[GEN, SUM, SIMP]`, pelo
  mesmo motivo — clarificar não é regredir detalhe.

### 6.6 ~~`req-deny` precisa ser revista~~ — RESOLVIDO (v1.1.0.0)

Rebaixada de `fix`/`contradiction` para `ask`/`tension`. Com `DENY` incidindo
sobre a *via até um resultado* e `REQ` sobre a *existência de algo*, os dois
deixaram de colidir por construção: é legítimo quando a via rejeitada não é a
única, errado quando é. Como `fix`, a regra estava reprovando entrada válida — e
`fix` significa "o XML não é confiável", o que não era o caso.

---

## 7. Estado e ordem

| | passo | estado |
|---|---|---|
| 1 | §6.1 — declarar átomos + colar fórmulas em `expansoes.txt` | ✅ feito |
| 2 | §6.7 — fechar colchetes de `VAL`, `EVAL`, `SCRU` | ✅ feito — 32/32 balanceadas |
| 3 | §6.3 — resolver `THEN`, `R`, `CMD` | ✅ feito — 0 indefinidos |
| 4 | §6.4 — `BASE` → `CORE` no motor | ✅ v1.1.0.0 |
| 5 | §6.2 — as 12 tags novas no `INSTR` | ✅ v1.1.0.0 |
| 6 | §6.5 — de-fusão da v1.7 | ✅ v1.1.0.0 |
| 7 | §6.6 — `req-deny` | ✅ v1.1.0.0 |

**Glossário e motor estão sincronizados.** A tabela de expansão fecha em 120
verbetes, 0 ciclos, 0 indefinidos; a suíte fecha em 129 casos verdes (eram 110 —
os 19 novos cobrem o vocabulário v1.1.0.0 e cada par des-fundido).

### A ponte para o `.hgml` — construída na v1.1.0.1

O parser agora sabe o que `expansoes.txt` sabe. `build-templates.js` compila a
tabela em `glyph-expansions.json` (e daí para `glyph-data.js`, para o
navegador), e o motor a consome por `useExpansions()` — irmão opcional de
`useTemplates()` e `useRules()`: sem store carregado o motor roda idêntico, só
não sabe do que as coisas são feitas.

API nova, toda somativa (nenhum diagnóstico e nenhum XML mudou):

| chamada | responde |
|---|---|
| `speciesOf(cmd)` | `"atom"` \| `"composite"` \| `null` |
| `depthOf(cmd)` | a camada — 0 para átomo |
| `formulaOf(cmd)` | a fórmula, para composto |
| `atomsOf(cmd)` | o fecho transitivo em hieróglifos |

Na AST cada comando ganhou `species` e `compositionDepth`. Atenção ao par de
campos homônimos: `depth` é a profundidade do nó **no texto do usuário**;
`compositionDepth` é a profundidade do comando **no vocabulário**. Eixos
diferentes.

No CLI, `--expand` responde "do que isto é feito":

```
$ node scripts/glyph-parser.js CRIT --expand
CRIT  [composite]  nível 2
  fórmula: [CMP[CTX],[SPEC-CORE],[EVAL[ERROR]]]
  15 hieróglifos: CMP CTX SPEC CORE REAL CORE CTX DIST SKL REF DEF SPEC CORE CTX ERROR
```

`HYP` queima até **101 hieróglifos** — a primeira medida concreta do que
"matéria pura" custa.

### O emissor existe — `.hgml` (v1.2.0.0)

`toHGML()` reduz a árvore a hieróglifos puros. A §0.3 é o que o torna mecânico:
o operando do humano vira o sujeito da fórmula, e a partir daí a decomposição
não tem decisão a tomar.

```
[prob'timeout']   →   [error
                        'timeout'
                        [ctx[/ctx]
                      [/error]
```

Forma fechada `[nome … [/nome]`, abrindo **sem** `]` — porque `]` já fecha um
comando, e `[ctx][/ctx]` emitiria `UnmatchedCloseTag`.

**30 dos 32 compostos queimam limpo.** Os dois que faltam são problemas de dado
que a queima tornou visíveis, e estão fixados pelo nome no caso `H-09` da suíte:

- **`SCRU`** — `R:` dentro de colchetes. O token de retorno é pontuação de
  segmento; `[R:` parseia como comando chamado `R`.
- **`QST`** — `[LOGIC-NONE]`. O lexer reivindica todo `[logic…]` como bloco de
  conta, então **o comando `LOGIC` é inescrevível dentro de uma fórmula**.
  Limitação da linguagem, não da fórmula.
