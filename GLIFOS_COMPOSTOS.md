# Revisão das fórmulas propostas — o que mudou da 1ª para a 2ª passada

O glossário consolidado vive em [GLOSSARY.md](GLOSSARY.md). Este arquivo é só
o registro do que revisei e por quê — útil se você quiser reverter alguma
correção minha, inútil depois que as fórmulas estiverem estáveis.

## Erros meus na 1ª passada

**Redundância em três fórmulas.** Eu tinha empilhado hieróglifos que dizem a
mesma coisa, o que infla a profundidade no `dag.js` sem acrescentar sentido:

| era | virou | por quê |
|---|---|---|
| `RMBR = [ALW[MAND[GET[CTX]]]]` | `[ALW[GET[CTX]]]` | `ALW` e `MAND` são a mesma força aqui |
| `RTNL = [SPEC[ELAB[RSN]]],[REF[CNST]]` | `[ELAB[RSN]],[REF[CNST]]` | `SPEC`+`ELAB` é detalhe dito duas vezes |
| `ALT = [DIST[NEQ[BASE]]]` | `[NEQ[CORE]],[EQ[TGT]]` | `DIST`+`NEQ` é diferença dita duas vezes |

**Um erro semântico de verdade: `DEPR`.** Eu tinha escrito `[NEV[GO]]` — "nunca
execute". Errado: isso é `DONT`/`DENY`. Deprecado ainda funciona, só não deveria
ser usado, e nem sempre tem substituto. O seu próprio verbete de `AVD` ("evitar
quando possível, grau fraco") era exatamente a peça certa, e eu não usei.
Virou `[AVD[GO]],[OPT[REF[INSTOF]]]`.

**Simplificações que melhoraram a leitura**, sem mudança de sentido:
`FRGT` perdeu o `[SUB[CTX]]` supérfluo; `JUST` e `CTRD` perderam um nível de
aninhamento cada; `LRN` perdeu o `[PT]`.

**Ganho colateral:** ao cortar `[SUB[CTX]]` de `FRGT`, o par `RMBR`/`FRGT` virou
`[ALW[GET[CTX]]]` contra `[NEV[GET[CTX]]]` — par mínimo perfeito, mesmo operando
e quantificadores opostos. É disso que a contradição `rmbr-frgt` de
`glyph-rules.json` passa a ser derivável. A versão redundante escondia isso.

## Duas fórmulas que retirei

`RSN` e `FIN` saíram dos compostos e viraram hieróglifos primitivos. As fórmulas
que eu tinha (`[CORE[CTX-GO]]` e `[PT[NEV[ADD[PT]]]]`) diziam menos que o
verbete em prosa e criavam profundidade falsa no `dag.js`. Ficam registradas aqui
caso você prefira mantê-las como compostos.

## O que eu não tinha visto na 1ª passada

**A lacuna real não são as fórmulas — são os átomos não declarados.**
`expansoes.txt` declara 28; o glossário v1.0.9.4 declara 76. São ~48 linhas
`= BASE` faltando: trabalho mecânico, zero decisão de conteúdo, e é o que está
travando o `dag.js` de calcular qualquer coisa. Eu tinha tratado as 15 fórmulas
como o gargalo. Não são — a parte mecânica é 3× maior e vem antes.

**A notação tinha uma ambiguidade não resolvida.** Conviviam `[A],[B]`
(conjunção), `[A][B]` (sequência) e `A + B` (algébrica antiga) sem regra
declarada. Escrevi as minhas assumindo vírgula = conjunção; **você confirmou a
regra**, que virou normativa na §0.1 do glossário. A notação `A + B` fica
aposentada — as quatro fórmulas antigas que a usavam têm reescrita proposta.

**`BASE` estava sobrecarregado** — era palavra-chave do `expansoes.txt` *e*
comando do vocabulário. **Resolvido**: o comando virou `CORE`, a palavra-chave
segue `BASE`. Impacto medido na §6.4 do glossário — 4 pontos de código, zero
casos de teste.

**As de-fusões da v1.7 seguem um eixo único**, o que eu tinha tratado como sete
decisões avulsas: em todas as sete a separação é *objeto vs. ato* ou *padrão de
comparação*. Isso é argumento a favor da de-fusão, não contra — a tabela está em
§6.6 do glossário.
