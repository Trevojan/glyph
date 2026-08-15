# Glifos e Hieróglifos — movido

**A referência do vocabulário é [`GLOSSARY.md`](GLOSSARY.md).**

Este arquivo era uma compilação do vocabulário na v1.0.9.3, escrita antes do
glossário normativo existir. Foi esvaziado na v1.1.0.1 em vez de atualizado,
de propósito.

## Por que não manter as duas

Duas referências completas do mesmo vocabulário divergem — é questão de tempo,
não de disciplina. E divergência entre duas descrições do vocabulário é
exatamente o defeito que custou esta versão inteira para consertar: o glossário
declarava doze comandos que o motor nunca conhecera, metade das fórmulas de
composição não resolvia, e nada acusou porque nada comparava as duas listas.

O conserto foi reduzir a **uma** fonte por tipo de informação, e amarrar cada
uma a uma verificação automática:

| o quê | onde | verificado por |
|---|---|---|
| o que cada comando **é** | `GLOSSARY.md` | `X-01` na suíte — motor e tabela têm de bater |
| do que cada comando **é feito** | `expansoes.txt` | `node scripts/dag.js` — 0 ciclos, 0 indefinidos |
| **quantos** operandos pede | `SIGNATURES.md` | derivado de `SLOTS`/`FRAMES` no parser |
| o que o motor **faz** | `scripts/glyph-parser.js` | `node scripts/test-corpus.js` |

Recriar aqui um quarto recorte dos mesmos dados reabriria o buraco, sem nenhuma
checagem cobrindo-o.

## Se quiser o recorte temático de volta

O `GLOSSARY.md` organiza por **espécie** (hieróglifo, glifo, engine, modo),
porque é a espécie que decide o que o `.hgml` pode tratar como átomo. O recorte
antigo, por **categoria** (Ação, Juízo, Enquadre…), continua existindo vivo em
`CATS`, dentro de `scripts/glyph-parser.js` — é o que a interface usa para montar
o navegador de comandos. Se ele fizer falta como documento, o caminho certo é
**gerá-lo** a partir de `CATS`, como `build-templates.js` já faz com os outros
dados gerados, e não mantê-lo à mão.
