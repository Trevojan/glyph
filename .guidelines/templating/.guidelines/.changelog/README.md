# Changelog — como o número se move

> O registro em si é o [`CHANGELOG.md`](../../CHANGELOG.md) na raiz, e continua
> sendo. Este arquivo é o **atalho**: a regra da versão, e o que cada release
> decidiu, para não ser preciso reler tudo.

## O esquema

```
⟨dígito⟩ . ⟨dígito⟩ . ⟨dígito⟩ . ⟨dígito⟩
```

| dígito | move quando |
|---|---|
| **⟨nome⟩** | ⟨o que tem de acontecer para ele mexer⟩ |

**Nenhum dígito zera outro.** Digitos movem-se independentemente e mantêm o seu
lugar: mexer só na interface não pode descartar o número que o núcleo conquistou.

## O que cada release decidiu

> Uma linha por release, e só o que **moveu o dígito maior**. O detalhe está no
> `CHANGELOG.md`; aqui fica o que se lembra.

| versão | o que moveu o dígito maior |
|---|---|
| **⟨x.y.z.w⟩** | ⟨a decisão, não a lista de arquivos⟩ |

## A regra que se aprende relendo

**A causa-raiz que mais se repete em qualquer repositório é uma só:** *uma
decisão tomada num lugar e nunca levada aos outros.*

Ao fechar qualquer mudança, a pergunta é: **onde mais isto estava escrito?**
