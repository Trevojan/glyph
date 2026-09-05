# Changelog — como o número se move

> O registro em si é o [`CHANGELOG.md`](../../CHANGELOG.md) na raiz, e continua
> sendo. Este arquivo é o **atalho**: a regra da versão, e o que cada release
> decidiu, para não ser preciso reler tudo.

## O esquema

```
release . frontend . rules . minor
```

| dígito | move quando |
|---|---|
| **release** | o documento emitido muda de forma, ou a gramática ganha/perde construto — trabalho de parser que muda **o que Glyph é** |
| **frontend** | HTML / CSS / interface |
| **rules** | `rules.json`, restrições, valência, **vocabulário** |
| **minor** | contador de dois dígitos para todo o resto |

**Nenhum dígito zera outro.** Foi por isso que o esquema mudou: no antigo, um
dígito que se movia zerava tudo à direita, então mexer só na interface
descartava o número que o motor tinha conquistado.

## O que cada release decidiu

| versão | o que moveu o dígito maior |
|---|---|
| **3.4.7.05** | o documento reescrevia conjunção como sequência em silêncio. `<holds>`, `binds`, `ref`, `role`, cerca `[raw]`. `GLOSSARY` §0.1 perdeu *"sem ordem entre eles"*. 98 grafias de elemento entraram |
| **2.4.6.04** | `expansions.json` ganhou `element` **depois** que o dígito que o cobre já tinha sido gasto |
| **2.4.5.01** | o operador chegou ao XML e dois construtos saíram da gramática |
| **1.4.4.01** | quatro formatos, um cartão |
| **1.3.4.00** | o XML ganhou referência, e a referência ganhou teste |
| **1.2.3.00** | `fromXML` — a corrente passou a andar nos dois sentidos |
| **1.2.0.0** | o `.hgml` passou a existir |

## A regra que se aprende relendo

**A causa-raiz que mais se repete neste repositório é uma só:** *uma decisão
tomada num lugar e nunca levada aos outros.* Apareceu no `file://` do README, no
`element` que chegou depois do dígito, no `<needs>` que nascia sozinho na segunda
volta, e na cláusula de ordem do §0.1 que contradizia o motor.

Ao fechar qualquer mudança, a pergunta é: **onde mais isto estava escrito?**
