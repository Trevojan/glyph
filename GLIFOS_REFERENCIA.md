# Glifos e Hieróglifos — referência completa (v1.0.9.3)

Compilado direto de `expansoes.txt` (base + compostos) e `glyph-parser.js` (vocabulário completo: `CATS`/`INSTR`/`ALIAS`/`STRUCT`/`META`/`EMO`). Nada inventado — é o que já existe no motor hoje.

---

## 1. Hieróglifos-base (`expansoes.txt`)

Os tags que a triagem trata como átomos — não se decompõem em nada mais simples. 28 no total.

**Núcleo + operadores puros:**
`TRUE`, `FLS`, `ERROR`, `POS`, `NGT`, `MAND`, `OPT`, `DONT`, `ALW`, `NEV`, `PRIO`, `OVR`, `PT`, `VAR`, `PARAM`, `PH`, `TPL`, `DEF`, `DFN`

**Primitivos de enquadre, restrição e pergunta:**
`CMP`, `CNST`, `CTX`, `ASK`, `TGT`, `EX`, `ELAB`, `CLAR`, `COND`

---

## 2. Compostos já expandidos (v1.7)

Os únicos 6 comandos que hoje têm fórmula oficial em hieróglifos-base:

| Composto | Fórmula | Glosa |
|---|---|---|
| `VRFY` | `CMP + TRUE` | verificar = comparar com verdadeiro |
| `VAL` | `CMP + CNST` | validar = comparar com restrição |
| `CRIT` | `CMP + CTX` | criticar = comparar com contexto |
| `SCRU` | `CTX + VRFY + CRIT + ASK` | escrutinar = contexto + verificar + criticar + perguntar |
| `TRYFR` | `TGT + VRFY` | tentar chegar em = alvo + verificar |
| `PROB` | `ERROR + CTX` | problema = erro + contexto |

Os outros ~90 comandos do vocabulário completo (seção 3) **ainda não têm** fórmula — é o trabalho em aberto que o HGML_PLAN.md aponta como decisão D6/passo 22.

---

## 3. Vocabulário completo (`INSTR`, por categoria)

Todo comando reconhecido pelo motor, agrupado como em `CATS`. Os marcados com ⚛ já são hieróglifo-base (repetidos da seção 1, aqui só pra mostrar a categoria deles); os marcados com 🧩 já têm composto (seção 2); o resto é vocabulário solto, candidato a expansão futura.

### Ação — operar sobre algo que já existe
`RWK` retrabalhar · `FMT` formatar · `IMPR` melhorar · `SIMP` simplificar · `ELAB` ⚛ detalhar · `ITR` iterar · `GEN` generalizar · `SPEC` especificar · `SUM` resumir · `CAT` categorizar

### Juízo — medir algo que já existe
`REV` revisar · `CRIT` 🧩 criticar · `SCRU` 🧩 escrutinar · `PROB` 🧩 problema · `EVAL` avaliar · `VRFY` 🧩 verificar · `VAL` 🧩 validar · `SKEP` ser cético · `CMP` ⚛ comparar · `DIST` distinguir · `TRUE` ⚛ verdadeiro · `FLS` ⚛ falso · `POS` ⚛ positivo · `NGT` ⚛ negativo · `ERROR` ⚛ erro · `REAL` realista

### Pergunta — obter o que falta
`QST` pergunta · `ASK` ⚛ pergunte · `CLAR` ⚛ esclarecer · `CONF` confirmar

### Enquadre — situar a coisa no mundo
`CTX` ⚛ contexto · `REF` referência · `SEEAL` veja também · `BASE` base, ponto de partida · `DRVF` derivar de · `EX` ⚛ exemplo · `FOREX` por exemplo · `NT` nota · `PT` ⚛ parte n

### Condição — quando vale, quando não, o que entra no lugar
`COND` ⚛ condição · `IF` se · `UNLS` a menos que · `ONLYIF` só se · `ONLYW` só quando · `EXC` exceção · `FBK` plano B · `INSTOF` em vez de

### Limite — o que é proibido, exigido ou opcional
`CNST` ⚛ restrição · `RESTR` limite · `LIM` limitação · `REQ` exigência · `MAND` ⚛ obrigatório · `OPT` ⚛ opcional · `AVD` evitar · `DONT` ⚛ não faça · `DENY` negar · `NEV` ⚛ nunca · `ALW` ⚛ sempre · `DEPR` obsoleto

### Raciocínio — construir e explorar ideia
`RSN` motivo · `RTNL` racional · `JUST` justificar · `HYP` hipótese · `IMAG` imagine · `BRST` brainstorm · `CNSD` considere · `ALT` alternativa · `PROP` propor · `ASSM` suposição · `CTRD` contradizer · `CNCL` concluir · `TRYFR` 🧩 tenta chegar em · `INTN` intenção

### Rumo — alvo, ordem e prontidão
`TGT` ⚛ alvo · `PRIO` ⚛ prioridade · `FIN` por fim · `RDY` prontidão · `INS` instrução

### Molde — peças de estrutura e template
`TPL` ⚛ template · `PH` ⚛ casa a preencher · `VAR` ⚛ variável · `PARAM` ⚛ parâmetro · `DEF` ⚛ define · `SECTION` seção · `BLOCK` bloco · `LOGIC` bloco de conta · `SKL` skill

### Marca — aviso e memória
`WARN` aviso · `RMBR` lembre · `FRGT` esqueça · `LRN` aprender · `BYP` contornar · `OVR` ⚛ sobrepor

### Fora das categorias acima (comparadores lógicos, só em `INSTR`)
`GT` maior que · `GTE` maior ou igual · `LT` menor que · `LTE` menor ou igual · `EQ` igual · `NEQ` diferente · `DFN` ⚛ define símbolo

---

## 4. Aliases (forma curta → canônica)

`IN`→INS · `AS`→ASSM · `CX`→CTX · `PR`→PRIO · `TG`→TGT · `RY`→RDY · `VL`→VAL · `RQ`→REQ · `CR`→CRIT · `RW`→RWK · `RV`→REV · `FM`→FMT · `IM`→IMPR · `FN`→FIN · `CL`→CLAR · `RT`→RTNL · `CN`→CNST · `WN`→WARN · `SM`→SUM

Fusões da v1.7 (forma aceita → canônica, tratadas como o mesmo comando):
`FOREX`→EX · `QST`→ASK · `EVAL`→CRIT · `REV`→CRIT · `ONLYIF`→COND · `SPEC`→ELAB · `SIMP`→CLAR

---

## 5. Estruturais, modo e meta (fora do `INSTR`)

**STRUCT** (abrem bloco, não são instrução solta): `SECTION`, `BLOCK`, `IF`, `UNLS`, `SKL`, `DEF`, `PH`, `TPL`, `LOGIC`

**META**: `QUICK`, `TOBLOCK`, `TOSECTION`, `HMN`, `EXT`, `ATC`

**MODE**: `OFF`, `ON`

---

## 6. Glifos de emoção (`\tag\`, sistema paralelo por backslash)

74 tags no total, PT-BR já embutido no motor.

**Positivas:** `hpy` felicidade · `joy` alegria · `exc` empolgação · `cnt` contentamento · `clm` calma · `ser` serenidade · `pea` paz · `grt` gratidão · `hop` esperança · `prd` orgulho · `lov` amor · `afc` afeto · `adm` admiração · `amu` divertimento · `del` deleite · `rlf` alívio · `cfd` confiança · `eth` entusiasmo · `cur` curiosidade · `awe` assombro · `ply` brincadeira · `chr` animação

**Negativas / difíceis:** `sad` tristeza · `ang` raiva · `fry` fúria · `fear` medo · `dis` desdém · `dsg` nojo · `anx` ansiedade · `frs` frustração · `irr` irritação · `ann` incômodo · `env` inveja · `jel` ciúme · `glt` culpa · `shm` vergonha · `reg` arrependimento · `dsp` desespero · `grf` luto · `lon` solidão · `bor` tédio · `res` ressentimento · `btr` amargura · `ctm` desprezo · `hum` humilhação · `emb` vergonha social · `pan` pânico · `drd` pavor · `ter` terror · `exh` exaustão · `str` estresse · `ovw` sobrecarga · `ins` insegurança · `apt` apatia · `num` anestesia · `mel` melancolia

**Ambíguas / mistas:** `cnf` confusão · `dbt` dúvida · `sus` suspeita · `skp` ceticismo · `nos` nostalgia · `lng` saudade · `vul` vulnerabilidade · `emp` empatia · `cmp` compaixão · `sym` simpatia · `trs` confiança · `bet` traição · `ind` indiferença · `ant` expectativa · `imp` impaciência · `sur` surpresa

---

## O que falta pra virar .hgml "100% hieróglifo"

Cada comando marcado sem ⚛ nem 🧩 na seção 3 (a maioria — ~90 dos ~100) ainda não tem uma fórmula de composição em hieróglifos-base. É esse preenchimento que o plano de `.hgml` (D6) deixa como trabalho seu — decidir, comando por comando, do que ele "é feito" na base dos 28 átomos da seção 1, seguindo o padrão que os 6 compostos da seção 2 já estabeleceram (ex: `VRFY = CMP + TRUE`).
