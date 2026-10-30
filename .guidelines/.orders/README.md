# Orders — the contract that dispatches the work

> An Order is neither a plan nor a decision. A decision **authorises**, a plan **schedules**, an Order
> **commissions**: it says what is to be done, under which constraints, and which deliverables come back.
>
> **An open Order is immutable except by version.** New material that arrives while an Order is open
> becomes *intake*, never an amendment. **Two concurrent Orders are forbidden:** exactly one stays open at
> a time.

## Numbering

Flat and sequential, like an ADR: the next one is the largest that already exists here, plus one. No
branching by subject, no reusing the number of a cancelled Order.

```
ORD-####          ⟨or this project's scheme⟩
```

## The open Order

> One line, or none. If there are two, one of them is wrong.

| | |
|---|---|
| id | ⟨ORD-####⟩ |
| commissions | ⟨what, in one line⟩ |
| open since | ⟨YYYY-MM-DD⟩ |
| version | ⟨v#⟩ — ⟨what the latest version changed⟩ |

## Closed Orders

> They stay. A closed Order is the contract of what was delivered, and it is how "was this asked for this
> way?" gets answered — so it does **not** leave this folder when it closes, unlike what is in
> [`.plan/`](../.plan/).

| id | commissioned | where the result is |
|---|---|---|
| ⟨ORD-####⟩ | ⟨…⟩ | ⟨the release, the document, the commit⟩ |

## Intake — what arrived while an Order was open

> Not a queue of ideas: material that **would have amended** an immutable Order. Each line waits to
> become an Order of its own or to enter [`.plan/`](../.plan/).

| | |
|---|---|
| ⟨`INTAKE-*.md`⟩ | ⟨what arrived, and why it did not fit the open Order⟩ |