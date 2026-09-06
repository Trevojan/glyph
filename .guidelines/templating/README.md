# guidelines-template

Ponto de partida para um projeto novo: a estrutura `.guidelines/` em seis eixos,
e os arquivos da raiz já apontando para ela.

O problema que isto resolve é um só. Quando o ensino de um projeto vive na
memória do agente ou no histórico da conversa, ele **não viaja com o
repositório**: uma janela de contexto nova abre sem nada apontando para lugar
nenhum, e a primeira hora vai embora reconstruindo por inferência o que já
estava decidido. `CLAUDE.md` na raiz é o que o harness lê sozinho; ele aponta
para o índice, e o índice aponta para o resto.

## Os eixos

`.guidelines/` guarda os detalhes que aumentam o **domínio** sobre a inferência
conforme a carga do projeto cresce em contexto.

| eixo | guarda |
|---|---|
| `.sources` | referências externas de fato usadas — e o que cada uma **decidiu** |
| `.decisions` | decisões tomadas, com quem decidiu e a razão |
| `.plan` | o que vem a seguir, e o que ficou para depois |
| `.orders` | as Ordens — o contrato que despacha o trabalho, imutável e numerado |
| `.constraints` | o que o projeto se proíbe de fazer |
| `.changelog` | o que mudou, e como o número de versão se move |
| `.shortcuts` | **o índice** — o ponto de entrada que aponta para todo o resto |

Os quatro do meio são um ciclo: **decide → agenda → comissiona → registra.**
Ao lado deles, `.history` — que **não é eixo**, é o sótão: o lugar que faz de
remover uma coisa diferente de apagar.

**O ponto na frente do nome é intencional.** Marca caminho de baixo nível, lido
pelo harness e não por quem abre o repositório para ver o que o projeto faz. A
raiz fica com as portas de entrada; o pensamento fica em `.guidelines/`.

O alvo: ao retomar, decifrar **apenas o passo anterior, o atual e o próximo**.
Todo o resto se alcança por atalho.

## Usar

1. **Use this template** no GitHub, ou clone e apague o `.git`.
2. Preencha os `⟨…⟩`. São os únicos buracos — cada um diz o que espera.
3. Comece pela ordem que evita retrabalho:

   | primeiro | porque |
   |---|---|
   | `CLAUDE.md` | é o que o agente lê sem ser mandado. Enquanto estiver com buracos, toda sessão nova começa cega |
   | `.shortcuts/README.md` | "Onde estou" e "o mapa em cinco linhas". O resto pode esperar a primeira decisão real |
   | `.constraints/README.md` → **Do artefato** | as outras três tabelas já vêm preenchidas: são o método, e não mudam de projeto para projeto |
   | os demais | quando houver o que registrar. Eixo vazio é honesto; eixo inventado mente |

4. Apague este `README.md` e escreva o do seu projeto.

## As regras que a estrutura carrega

Elas estão nos arquivos, não aqui — mas três decidem se a coisa funciona:

- **O índice aponta, não copia.** Se um fato está em dois lugares, um dos dois
  está errado e ninguém sabe qual.
- **A prosa declara o estado, nunca a correção.** O texto que dizia "isto é A"
  torna-se "isto é B". Micro-correção acumulada vira resíduo que o leitor infere
  e descarta.
- **Um agente não ratifica norma que escreveu.** Ele mede, propõe e recusa.

## O que este template não é

Não é gerenciador de tarefas nem substituto de issue tracker. `.plan/` guarda o
que está **aberto e decidido**, não a fila inteira de ideias. E não é um lugar
para relatório: o que fechou sai do plano e vira linha no changelog — a exceção
é `.orders/`, onde a Ordem fechada **fica**, porque ela é o contrato do que foi
entregue.

Também não tenta adivinhar o seu domínio. Todo eixo aceita ficar vazio, e vazio
é honesto; inventado mente.
