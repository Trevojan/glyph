# Ordens — o contrato que despacha o trabalho

> Uma Ordem não é plano nem decisão. A decisão **autoriza**, o plano
> **agenda**, a Ordem **encomenda**: diz o que fazer, sob quais restrições, e
> quais entregáveis voltam.
>
> **Uma Ordem aberta é imutável salvo por versão.** O material novo que chega
> com uma Ordem aberta vira *intake*, nunca emenda. **Duas Ordens concorrentes
> são proibidas**: exatamente uma fica aberta por vez.

## Numeração

As Ordens vivem em séries, `EMS-###/ORD-####/`, e a contagem de ORD reinicia
em cada série ([`.decisions/`](../.decisions/README.md), 2026-09-25). Numa
série, a próxima é a maior pasta `ORD-####/` dela, mais um; a spec, um
rascunho ou um ID datado não contam. As ORDs avulsas moram na NEM,
`.orders/NEM/`, com numeração própria — decidida em 2026-09-27, ainda não
construída.

## Os registros das séries

Cada série tem o seu registro, e é nele que se leem a Ordem aberta e as
fechadas, com o commit e o digest de cada uma:

| série | registro |
|---|---|
| `EMS-001` — o Glyph em Rust | [`EMS-001/README.md`](EMS-001/README.md) |

Esta página não repete a linha da Ordem aberta: o comando de bundle lê a
seção da Ordem aberta de cada registro, e duas linhas para a mesma Ordem
contariam como duas Ordens.

## Intake — o que chegou com uma Ordem aberta

> Não é fila de ideias: é o material que **teria emendado** uma Ordem
> imutável. Cada um espera virar uma Ordem própria ou entrar no
> [`.plan/`](../.plan/).

São os `INTAKE-*.md` desta pasta; o que cada um decidiu, e o que ainda
espera, está no [`.plan`](../.plan/README.md).

## O resto da pasta

Atos, que não se reescrevem: os handoffs datados (`HANDOFF-*.pgml`), o
briefing de 2026-09-24, a Ordem datada de agosto (`ORD-2026-08-30-01`) com o
retorno do arquiteto e o plano de rederivação, e a `ORD-0011` chapada,
estacionada em `parked/`.
