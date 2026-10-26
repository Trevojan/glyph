# Inclusion — a known command never vanishes

> **Not an order.** The Regent's decision of 2026-10-25, in
> [`.decisions/`](../.decisions/README.md): *"an issue to be solved must
> traverse all the current rules to see which one could benefit. if we found
> one or more places where the rule could fit, or an unexpected use for a
> command that is invisible after AST/XML/HGML digestion, we must make changes
> to include it - never exclude."* This intake holds the measurement that
> found the positions, the rule each one was traversed to, and the Order that
> builds it. It took the place of the *não trabalha* note of 2026-09-27; the
> *não sabe* stays `fix`, the `UnknownCommand`.

## 1. The measurement

At `b827782`, every known name — the 120 canonicals of `INSTR`, `STRUCT`,
`META` and `MODE`, the 19 `ALIAS` keys and the 5 `SESSION` words, 144 in all —
was written in every position the grammar reaches, and a command counted as
having an effect when its element appeared more often than in the same source
without it, or when a new diagnostic named it. Fourteen positions left a known
command with no element and no diagnostic. Five design passes, one per
cluster, each traversed the rules and prototyped the inclusion on a copy of
the tree.

## 2. The positions, the rule each falls under, and the Order

| position | measured | the rule that includes it | Order |
|---|---|---|---|
| a mood in a return segment — `r- [ctx'x']/eth/` | kept in `segment.mood`, no `<mood>`; the way back glued `r-` to the mood header | XML_REFERENCE §6: `<mood>` is the first child of `<block>`, and a return segment is a segment | [`ORD-0022`](EMS-002/README.md) |
| a mood whose innermost open command is a template — `[--t=/eth/]` | the JS throws; the Rust answered the document | OPERATOR_TARGET §3.1, the innermost open node, and XML_REFERENCE §6; the Regent: the Rust only | [`ORD-0023`](EMS-002/README.md) |
| a stray `[on]`, with no `[off]` open | the XML identical to the source without it | XML_REFERENCE §2 naming: `[on` is `<mode-on>`, and the inverse already wrote `<mode-on/>` back as `[on]` | [`ORD-0024`](EMS-002/README.md) |
| `[off]` as the last characters | no trace | `UnclosedOffMode`, raised for every other unclosed `[off]` | [`ORD-0024`](EMS-002/README.md) |
| the bare words `off`, `on` | prose, while the other 142 names ask | `LooseCommandWord`, whose list left out `MODE` | [`ORD-0024`](EMS-002/README.md) |
| `[ctx'x'-crit]`, `[ctx -crit]`, `[ctx]-crit` | `-crit` in `<off>`, no node | the grammar's `chained_command`, a chain item may be a literal; GLOSSARY §0.1 and §0.3 | [`ORD-0025`](EMS-002/README.md) |
| `[ph'q'[crit'x']]`, `[ph-a[crit'x']]` | in the AST, dropped from the XML | GLOSSARY §0.3, what is nested is the standard the item works against; `<needs>` keeps its shape (PACKAGE_TARGET G3); the Regent: the `<placeholder>` wrapper | `ORD-0026` |
| `[ph-a-crit]` | a second hole name, the first kept | the `-` after `[ph` binds *the* name, singular; after it, `-` is the chain operator again | `ORD-0026` |
| a command inside a named template fill — `[--reinforce[ph-rule'a'[crit'x']]…]` | lost in the AST too | GLOSSARY §0.3; `slot` rebuilds the call (XML_REFERENCE §3); the Regent: `slot` on any element | to come |
| a named fill that names no parameter — `[ph-zzz'v'[crit'x']]` | the whole fill absent | the fill model: what is not a fill lands as extra content; *não sabe* is `fix` | to come |
| a template defined in the source and called in it — `[--t=[crit'x']][--t]` | not expanded, `UndefinedTemplate` suppressed | a template is defined with `[--name=` and invoked with `[--name` (GLOSSARY); the Regent: the source definition overrides the store | to come |
| the colon value — `[ctx: crit]`, `[ctx: a, crit]` | only a `name` | the Regent: the colon is retired — `:` costs a shift; the name is the first parameter typed as a literal, and only the commands that take a name have one | to come |

## 3. What the traversal found beside the positions

Measured while tracing the fourteen, not built by these Orders:

- `fromAST` writes a text child glued to the command name: `[ctx foo]` comes
  back as `[ctxfoo]`, and a known command turns unknown on the way back.
- A lone `r-` leaves no trace, the empty-document comment.
- `[ on ]` with spaces does not close an `[off]` region, while the opener and
  the stray reader both take whitespace.
- A non-empty region loses its toggle through the XML: `[off]p[on]` comes
  back as prose, the loss the suite already pins.
- More positions where a known command still drops: after prose
  (`a -crit`), after `;` or `,`, after a mood, after `[/raw]`, at the start of
  the document, with a space after the dash (`[ctx] - crit`), and `--crit`.
- The colon of a template call (`[--germinate: crit]`) vanishes from every
  projection; a command inside a fill at a call site of a probe template
  (`[--pair[ph-first[ctx]]'b']`) vanishes.

## 4. What waits on the Regent

- **The name of a `[logic]` fence once the colon is retired.** `[logic:calc]`
  names the fence today, and `[logic'calc']` is the command `LOGIC`, not the
  fence.
- **`[ctx]-crit` at the top level** attaches the link to the block, read as
  GLOSSARY §0.3 sequence; the alternative is to attach it to the command just
  closed, so that `[ctx]-crit` equals `[ctx-crit]`.
- **The severity of `UnmatchedOnMode`**: `note`, as built; `fix` would refuse
  the use the inclusion gives the command.
- **The scoped reading of `[off'x']` and `[on'x']`**: the operand read with
  interpretation off or on — no engine change, a reading of SIGNATURES §6 to
  ratify.
