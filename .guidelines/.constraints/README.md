# Restrições — o que o projeto se proíbe

> Uma restrição é mais barata que a decisão que ela evita. Estas valem sem
> discussão nova; para mudar uma, é decisão do Regente e vai para
> [`.decisions/`](../.decisions/).

## Do artefato

| | |
|---|---|
| **Zero dependências** | é propriedade do repositório, não acidente. Não há `dependencies` em `package.json` e não haverá |
| **Glyph descreve; nada executa** | o documento diz **o que está sob o quê** e nunca computa o resultado. É o que carrega a invariante de ida e volta, o `<invoke reads>` e o validador |
| **Raiz única** | `glyph-package` sem forma condicional. Um consumidor não pode ramificar na forma do documento antes de conseguir lê-lo |
| **O AST é a fonte de verdade** | as três projeções derivam dele. O `.hgml` **não pode** vir antes — ele descarta de propósito e não expressa o que o AST distingue |

## Do método

| | |
|---|---|
| **Domínio evita síntese** | o que couber em código, esquema ou tabela **nunca** deve ser re-inferido. Onde a tabela não decide, [`PROMOTION_BOUNDARY.md`](../PROMOTION_BOUNDARY.md) §2 manda **recusar** |
| **O portão vem antes da coisa que ele guarda** | e todo portão precisa ter sido **observado falhando** antes de contar |
| **Construto aposentado vira reconhecedor** | nunca é apagado no silêncio |
| **Perda conhecida é fixada com a razão** | e um pino que deixa de valer é **invertido**, não deletado — uma suíte que descarta pino aposentado perde a memória do que ele guardava |
| **O golden deriva da especificação** | nunca de uma implementação (lock T5) |
| **Um agente não ratifica norma que escreveu** | |
| **Uma ordem aberta é imutável salvo por versão** | e duas ordens concorrentes são proibidas — por isso o material novo vira *intake* |

## Da escrita

| | |
|---|---|
| **A parte legível é o `.pgml`** | não o XML. Análise humana de XML é cirurgia de código |
| **Casa vazia não é erro** | vira `<needs>`. `fix` recusa, `ask` pergunta, `note` observa |
| **Nada desaparece em silêncio** | um caractere ou construto que some sem recusa é defeito, não economia |
| **Diagnóstico nomeia a causa** | não o conserto. Medido: mensagem mais detalhada não ajuda; posição e estrutura ajudam — [`.sources/COMPILER_LESSONS.md`](../.sources/COMPILER_LESSONS.md) §2 |
| **O índice aponta, não copia** | se um fato está em dois lugares, um dos dois está errado e ninguém sabe qual |

## Do processo

| | |
|---|---|
| **Um passo por commit**, `npm run check` verde em cada um | |
| **Sem worktrees** | trabalhar direto no repositório |
| **Regenerar o snapshot para deixar a suíte verde derrota o snapshot** | regenera-se quando a mudança é **decisão**, e a decisão fica escrita |
| **A fonte de um exemplo de conformidade é a afirmação** | o XML é o que o motor responde. Mudança no XML é decisão de release e precisa de explicação |
