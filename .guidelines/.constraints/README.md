# Restrições — o que o projeto se proíbe

> Uma restrição é mais barata que a decisão que ela evita. Estas valem sem
> discussão nova; para mudar uma, é decisão do Regente e vai para
> [`.decisions/`](../.decisions/).

## Do artefato

| | |
|---|---|
| **Zero dependências no lado JS** | o motor JS, a skill e o app de navegador são propriedade do repositório, não acidente. Não há `dependencies` em `package.json` e não haverá |
| **No Rust, dependência se mede pela profundidade, e a base se vendoriza** | o que se recusa é *"emprestar excessivamente funções de terceiros e até quarteiros e quinteiros"* — a árvore que desce e cobra em build e em dias de depuração em código alheio; o que se aceita é *"a base que não precisamos reinventar"*. Antes de adotar, mede-se a árvore da crate (crates, profundidade, linhas, build limpo); a que entra vem vendorizada |
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
| **Termos técnicos e teóricos em inglês** | *"é melhor firmar os termos técnicos e teóricos em inglês"* — também na interface em português: `template`, `mould`, `sample`, `Order Matrix`, `snippet`, `layout` |
| **A grafia é en-EU** | o lock T13 da `ORD-2026-08-30-01`: *"en-EU across the system, always"* — o que viaja (elementos, diagnósticos do envelope, prosa dos artefatos) em en-EU, a interface em pt-BR. Por isso `criticise`, `generalise`, `mould`. Anda junto da regra acima: firmar o termo em inglês obriga a escolher uma grafia do inglês |
| **A parte legível é o `.pgml`** | não o XML. Análise humana de XML é cirurgia de código |
| **Casa vazia não é erro** | vira `<needs>`. `fix` recusa, `ask` pergunta, `note` observa |
| **Nada desaparece em silêncio** | um caractere ou construto que some sem recusa é defeito, não economia |
| **Diagnóstico nomeia a causa** | não o conserto. Medido: mensagem mais detalhada não ajuda; posição e estrutura ajudam — [`.sources/COMPILER_LESSONS.md`](../.sources/COMPILER_LESSONS.md) §2 |
| **O índice aponta, não copia** | se um fato está em dois lugares, um dos dois está errado e ninguém sabe qual |
| **A prosa declara o estado, nunca a correção** | o texto que dizia "isto é A" **torna-se** "isto é B"; não ganha um "não é mais A". Micro-correção acumulada é resíduo que o leitor infere e descarta, por não auxiliar o estado final. Onde a aposentadoria precisa agir, ela age na tabela de recusas |

## Do processo

| | |
|---|---|
| **Um passo por commit**, `npm run check` verde em cada um | |
| **Uma ADR vale quando o Regente assina** | o papel dono redige e propõe; a decisão do Regente sobrepõe o andamento da arquitetura. Alterar uma ADR assinada custa uma seção de questionário com o Regente |
| **Sem worktrees** | trabalhar direto no repositório |
| **Regenerar o snapshot para deixar a suíte verde derrota o snapshot** | regenera-se quando a mudança é **decisão**, e a decisão fica escrita |
| **A fonte de um exemplo de conformidade é a afirmação** | o XML é o que o motor responde. Mudança no XML é decisão de release e precisa de explicação |
