# Glyph

Notação de comando abreviada que compila para XML estruturado. **O AST é a fonte
de verdade**; o XML, o `.hgml` e o envelope `GlyphAST` são projeções dele.

## Comece por aqui — sempre

**[`.guidelines/.shortcuts/README.md`](.guidelines/.shortcuts/README.md)**

É o índice: onde o trabalho parou, o que vem a seguir, e qual documento responde
qual pergunta. Ele **aponta e nunca copia**, e este arquivo faz o mesmo de
propósito. Não reconstrua por inferência o que está a um atalho de distância.

| eixo | guarda |
|---|---|
| [`.plan/`](.guidelines/.plan/) | o que vem a seguir, e o que ficou para depois |
| [`.decisions/`](.guidelines/.decisions/) | o que já foi decidido, por quem, e a razão |
| [`.constraints/`](.guidelines/.constraints/) | o que o projeto se proíbe — **leia antes de propor** |
| [`.changelog/`](.guidelines/.changelog/) | como o número de versão se move |
| [`.sources/`](.guidelines/.sources/) | as referências externas que decidiram alguma coisa |

## Escrever Glyph

A skill **`/glyph-markup`** está em `.claude/skills/glyph-markup/`. Ela é gerada
deste repositório por `node scripts/build-skill.js`, e `npm run check` recusa
quando ela diverge do motor — então é a cópia corrente. Uma cópia instalada na
conta pode estar atrasada; a desta pasta é a que vale.

## Verificar

```bash
npm run check
```

Roda os dois `--check` de geração, `check-globals`, o DAG e a suíte. **Um passo
por commit, verde em cada um.**

Editou `.guidelines/rules.json`, `templates.json`, `expansions.txt` ou
`GLOSSARY.md`? Rode `node scripts/build-templates.js` antes de verificar: essas
são as fontes, e `scripts/glyph-data.js` e `.guidelines/expansions.json` são as
cópias que o motor carrega.

## Duas restrições que pegam todo agente novo

O conjunto inteiro está em
[`.constraints/`](.guidelines/.constraints/README.md). Estas duas mudam o que
você faz na primeira hora:

- **Sem worktrees.** Trabalhar direto neste repositório.
- **Declarar o estado, nunca a correção.** O texto que dizia "isto é A"
  **torna-se** "isto é B"; não ganha um "não é mais A, agora é B". Micro-correção
  acumulada vira resíduo que o leitor infere e descarta, porque não ajuda o
  estado final. Onde a aposentadoria precisa agir, ela age na tabela de recusas.

## Vocabulário

- **Regente** — quem decide. Um agente mede, propõe e recusa; não ratifica.
- **Autor da Ordem** — quem escreve a fonte `.pgml`. O motor existe para trocar
  a inferência dele por re-ferência.
- **queima** — o `.hgml`, a redução a hieróglifos puros.
