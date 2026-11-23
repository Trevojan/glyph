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
| [`.orders/`](.guidelines/.orders/) | the Orders and the intakes; several Orders open at once while none waits on a blocking question |
| [`.sources/`](.guidelines/.sources/) | os fatos: a linguagem — as normas e as stores — e as referências externas que decidiram alguma coisa |

## Escrever Glyph

A skill **`/glyph-markup`** está em `.claude/skills/glyph-markup/`. Ela é gerada
deste repositório por `node scripts/build-skill.js`, e `npm run check` recusa
quando ela diverge do motor — então é a cópia corrente. O mesmo script escreve o
espelho dela em `.agents/skills/glyph-markup/`, para o agente que lê essa pasta,
com o `SKILL.md` copiado deste, e o `--check` segura os dois. Uma cópia instalada
na conta pode estar atrasada; a desta pasta é a que vale.

## Entregar o plugin

O plugin `glyph-markup` — a skill, os comandos e o motor — sai inteiro de
`npm run plugin`, que escreve `.scope/dist/glyph-markup.plugin` derivado das
fontes e recusa quando a versão do manifesto não é a do motor. Nada se monta à
mão. Pediram o plugin, a skill instalável ou a atualização de um dos dois? Rode
o script e entregue o `.plugin` pelo card de instalação do app, o que tem o
botão de instalar — nunca um zip, um `.ps1` ou um `.cmd` para o Regente rodar.
O pacote se instala; ele não se descompacta dentro deste repositório.

## Verificar

```bash
npm run check
npm run check:rust
```

O primeiro roda os dois `--check` de geração, `check-globals`, o DAG, os grafos
de costura, de crates e de links, a escada, o índice dos caminhos virtuais, os
ícones gerados, a suíte e o teste da extensão VS Code ([`vscode-extension/`](vscode-extension/README.md));
o segundo mede e gradua cada crate externa, confere o formato e o `clippy` com
avisos negados, escreve o oráculo no commit sob teste e roda `cargo test` em
`rust/`. Os dois pedem `cargo`, no Rust que o `rust-toolchain.toml` fixa. **Um passo por commit, verde em cada um.**

The first also runs the XSD gate over every bundle under `.orders/`
(`glyph-check.js --gate`) and the coherence between Orders over the same folder
(`glyph --check`, EMS-002/ORD-0040): a claim that does not match is refused, and
an Order bundled from ORD-0040 on that makes no claim is asked where it stands.

Editou um arquivo de `.guidelines/`, o `README.md` ou este? Rode
`npm run vpath -- build`: o índice em `.guidelines/.shortcuts/.virtual/` cobre
todos eles, e o `check` recusa o que mudou sem ele. Uma fatia se lê com
`npm run vpath -- resolve 'arquivo#seletor' --text`, ou pelo `NodeID` do nó.

Editou `.guidelines/.sources/rules.json`, `templates.json`, `expansions.txt` ou
`GLOSSARY.md`? Rode `node scripts/build-templates.js` antes de verificar: essas
são as fontes, e `scripts/glyph-data.js` e `.guidelines/.sources/expansions.json` são as
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

Em [`.guidelines/.sources/GLOSSARY.md`](.guidelines/.sources/GLOSSARY.md) §8 — quem decide, como o
trabalho se ordena, o app Rust e os nomes que o Regente ratificou.
