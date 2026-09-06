# Ordens — o contrato que despacha o trabalho

> Uma Ordem não é plano nem decisão. A decisão **autoriza**, o plano **agenda**,
> a Ordem **comissiona**: diz o que é para ser feito, sob quais restrições, e
> quais entregáveis voltam.
>
> **Uma Ordem aberta é imutável salvo por versão.** Material novo que chega com
> uma Ordem aberta vira *intake* — nunca emenda. **Duas Ordens concorrentes são
> proibidas:** exatamente uma fica aberta por vez.

## Numeração

Chapada e sequencial, como um ADR: a próxima é a maior que já existe aqui, mais
um. Sem ramificar por assunto, sem reaproveitar número de Ordem cancelada.

```
ORD-####          ⟨ou o esquema deste projeto⟩
```

## A Ordem aberta

> Uma linha, ou nenhuma. Se houver duas, uma delas está errada.

| | |
|---|---|
| id | ⟨ORD-####⟩ |
| comissiona | ⟨o que, em uma linha⟩ |
| aberta desde | ⟨AAAA-MM-DD⟩ |
| versão | ⟨v#⟩ — ⟨o que a última versão mudou⟩ |

## Ordens fechadas

> Ficam. Uma Ordem fechada é o contrato do que foi entregue, e é por ela que se
> responde "isto foi pedido assim?" — por isso ela **não** sai daqui quando
> fecha, ao contrário do que está em [`.plan/`](../.plan/).

| id | comissionou | onde está o resultado |
|---|---|---|
| ⟨ORD-####⟩ | ⟨…⟩ | ⟨o release, o documento, o commit⟩ |

## Intake — o que chegou com uma Ordem aberta

> Não é fila de ideias: é material que **teria emendado** uma Ordem imutável.
> Cada linha espera virar Ordem própria ou entrar em [`.plan/`](../.plan/).

| | |
|---|---|
| ⟨`INTAKE-*.md`⟩ | ⟨o que chegou, e por que não coube na Ordem aberta⟩ |
