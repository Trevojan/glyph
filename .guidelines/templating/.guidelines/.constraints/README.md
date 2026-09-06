# Restrições — o que o projeto se proíbe

> Uma restrição é mais barata que a decisão que ela evita. Estas valem sem
> discussão nova; para mudar uma, é decisão do Regente e vai para
> [`.decisions/`](../.decisions/).
>
> As tabelas **Do método**, **Da escrita** e **Do processo** já vêm preenchidas:
> são o método, e não mudam de projeto para projeto. **Do artefato** é a que
> cada projeto escreve.

## Do artefato

> O que *esta* coisa se proíbe de ser. Exemplos do que cabe aqui: zero
> dependências; uma raiz única no formato emitido; nada que execute o que
> apenas descreve.

| | |
|---|---|
| **⟨restrição⟩** | ⟨a razão, em uma linha⟩ |

## Do método

| | |
|---|---|
| **Domínio evita síntese** | o que couber em código, esquema ou tabela **nunca** deve ser re-inferido |
| **O portão vem antes da coisa que ele guarda** | e todo portão precisa ter sido **observado falhando** antes de contar |
| **Construto aposentado vira reconhecedor** | nunca é apagado no silêncio: quem escrever a forma velha recebe uma recusa que nomeia a nova |
| **Perda conhecida é fixada com a razão** | e um pino que deixa de valer é **invertido**, não deletado — uma suíte que descarta pino aposentado perde a memória do que ele guardava |
| **Um agente não ratifica norma que escreveu** | pode medir, propor e recusar. Ratificar é do Regente |

## Da escrita

| | |
|---|---|
| **O índice aponta, não copia** | se um fato está em dois lugares, um dos dois está errado e ninguém sabe qual |
| **A prosa declara o estado, nunca a correção** | o texto que dizia "isto é A" **torna-se** "isto é B"; não ganha um "não é mais A". Micro-correção acumulada é resíduo que o leitor infere e descarta, por não auxiliar o estado final. Onde a aposentadoria precisa agir, ela age no mecanismo — não na prosa |
| **Nada desaparece em silêncio** | o que some sem recusa é defeito, não economia |
| **Diagnóstico nomeia a causa** | não o conserto. Mensagem mais detalhada não ajuda; posição e estrutura ajudam |

## Do processo

| | |
|---|---|
| **Um passo por commit** | com a verificação verde em cada um |
| **Regenerar o snapshot para deixar a suíte verde derrota o snapshot** | regenera-se quando a mudança é **decisão**, e a decisão fica escrita |
| **Uma Ordem aberta é imutável salvo por versão** | e duas Ordens concorrentes são proibidas — material novo vira *intake*, não emenda. As Ordens vivem em [`.orders/`](../.orders/) |
