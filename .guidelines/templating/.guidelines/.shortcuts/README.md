# Atalhos — comece por aqui

> **O ponto de entrada.** Quem retoma o projeto lê este arquivo primeiro e só
> então abre o que precisa. O objetivo é que apenas **o passo anterior, o atual
> e o próximo** precisem ser decifrados; todo o resto se alcança por atalho em
> vez de ser reconstruído por inferência.
>
> Este índice **aponta**. Nunca copia. Se um fato está em dois lugares, um dos
> dois está errado e ninguém sabe qual.

## Onde estou

| | |
|---|---|
| versão | ⟨preencher⟩ |
| suíte | ⟨o comando, e se está verde⟩ |
| último marco | ⟨o que acabou de ficar pronto⟩ |
| próximo | ⟨o que vem a seguir — ou um link para `.plan/`⟩ |

## Os eixos

> **O ponto na frente do nome é intencional.** Marca caminho de baixo nível —
> lido pelo harness, não pela pessoa que abre o repositório para ver o que o
> projeto faz. A raiz fica com as portas de entrada; o pensamento fica aqui.

| eixo | o que guarda |
|---|---|
| [`.sources/`](../.sources/) | referências externas de fato usadas, e o que cada uma **decidiu** |
| [`.decisions/`](../.decisions/) | decisões tomadas, quem decidiu, e a razão |
| [`.plan/`](../.plan/) | o que vem a seguir, e o que ficou para depois |
| [`.orders/`](../.orders/) | as Ordens — o contrato que despacha o trabalho, imutável e numerado |
| [`.constraints/`](../.constraints/) | o que o projeto **se proíbe** de fazer |
| [`.changelog/`](../.changelog/) | o que mudou, e como o número de versão se move |
| `.shortcuts/` | este arquivo |

Os quatro do meio são um ciclo, e é nessa ordem que se lê:
**decide → agenda → comissiona → registra.**

[`.history/`](../.history/) fica ao lado e **não é eixo**: é o sótão, onde um
documento superado sai do caminho de leitura sem sair do repositório.

## O mapa do projeto, em cinco linhas

> Cinco linhas, não mais. Se não cabe em cinco, o que sobra é documento, não
> atalho — e vai para o eixo que lhe corresponde.

1. ⟨qual arquivo é o núcleo, e o que consome o quê⟩
2. ⟨qual é a fonte de verdade, e quais são as projeções dela⟩
3. ⟨o que **não pode** ser a fonte de verdade, e por quê⟩
4. ⟨como o projeto trata o caso incompleto — erro, ou pergunta?⟩
5. ⟨por onde passa toda mudança de formato, e contra o que é medida⟩

## Os documentos que mais se consulta

> A coluna da esquerda é a **pergunta que a pessoa tem**, não o título do
> documento. Quem retoma um projeto sabe o que quer saber; raramente sabe onde
> foi escrito.

| quando a pergunta é | abra |
|---|---|
| ⟨"…?"⟩ | ⟨`ARQUIVO.md`⟩ |

## Vocabulário do projeto

> Só os termos cunhados **aqui** — os que um leitor não encontraria fora deste
> repositório. Termo de domínio público não entra.

- **⟨termo⟩** — ⟨o que significa neste projeto⟩
