# ⟨projeto⟩

⟨Uma frase dizendo o que este projeto é. Depois, uma frase dizendo qual é a
fonte de verdade e o que deriva dela.⟩

## Comece por aqui — sempre

**[`.guidelines/.shortcuts/README.md`](.guidelines/.shortcuts/README.md)**

É o índice: onde o trabalho parou, o que vem a seguir, e qual documento responde
qual pergunta. Ele **aponta e nunca copia**, e este arquivo faz o mesmo de
propósito. Não reconstrua por inferência o que está a um atalho de distância.

| eixo | guarda |
|---|---|
| [`.decisions/`](.guidelines/.decisions/) | o que já foi decidido, por quem, e a razão |
| [`.plan/`](.guidelines/.plan/) | o que vem a seguir, e o que ficou para depois |
| [`.orders/`](.guidelines/.orders/) | as Ordens — o contrato que despacha o trabalho. **Uma aberta por vez** |
| [`.constraints/`](.guidelines/.constraints/) | o que o projeto se proíbe — **leia antes de propor** |
| [`.changelog/`](.guidelines/.changelog/) | como o número de versão se move |
| [`.sources/`](.guidelines/.sources/) | as referências externas que decidiram alguma coisa |

## Verificar

```bash
⟨o comando de verificação⟩
```

⟨O que ele roda.⟩ **Um passo por commit, verde em cada um.**

⟨Se algum arquivo é gerado a partir de outro, diga aqui qual é a fonte, qual é a
cópia, e qual comando reconstrói — antes que alguém edite a cópia.⟩

## Duas restrições que pegam todo agente novo

O conjunto inteiro está em
[`.constraints/`](.guidelines/.constraints/README.md). Estas duas mudam o que
você faz na primeira hora:

- **⟨a restrição deste projeto que mais custa descobrir tarde⟩**
- **Declarar o estado, nunca a correção.** O texto que dizia "isto é A"
  **torna-se** "isto é B"; não ganha um "não é mais A, agora é B".
  Micro-correção acumulada vira resíduo que o leitor infere e descarta, porque
  não ajuda o estado final. Onde a aposentadoria precisa agir, ela age no
  mecanismo — não na prosa.

## Vocabulário

- **Regente** — quem decide. Um agente mede, propõe e recusa; não ratifica.
- **⟨termo cunhado aqui⟩** — ⟨o que significa neste projeto⟩
