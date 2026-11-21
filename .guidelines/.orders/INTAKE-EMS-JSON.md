# Intake — `EMS.json`, the configuration a series carries

> **The measured proposal for step 2 of the trail to the final Explorer**
> ([`.plan`](../.plan/README.md) §5). What `EMS.json` is, where it lives and what it
> holds are ratified (2026-10-15, [`.decisions/`](../.decisions/README.md)); the rest is
> built *with* the Regent — *"let's build it together"* — so this file lists what is
> ratified, measures the series as they stand, and asks what is left. The Regent answered
> §4 on 2026-11-21, and §5 holds the answers. The Order opens after step 1, the XSD
> ([`INTAKE-XSD.md`](INTAKE-XSD.md)).
> Measured at `5685486`.

## 1. What is ratified

| | the decision |
|---|---|
| one file per series | `EMS.json`, in JSON, beside the series' ORDs; the spec `EMS-###.pgml` keeps the Orders (the direction, one section per ORD with its `tgt` and `val`), and `EMS.json` keeps the rules |
| its first field | the XSD pattern the Orders of the series follow, so the Emission answers a declaration from its spec rather than from the input XML or from inference |
| what else it holds | the conventions, the rules, the exceptions, the pins and the traffic — the paths each Order reads and writes, which `repair` restores from |
| where it goes | inside the `<glyph-package>` of every Order of the series, pointed by the configuration, so the Harness reads what is doable from the package itself ([`INTAKE-PIN-TRAFFIC.md`](INTAKE-PIN-TRAFFIC.md) §4) |
| `<invoke>` | a skill path or a predefined action comes validated from the series' configuration, and what it does not resolve is `fix` before the Order is followed |
| the check | the `--check` of a series Order reads its `EMS.json`, not the folder listing, and compares metadata ([`INTAKE-ORDER-COHERENCE.md`](INTAKE-ORDER-COHERENCE.md) §9); the gate of `FIELD-3b`, every `[ctx]` version of a series equal to the declared one, lands there too |
| how the Explorer shows it | by its title, *Alignment Matrix*, and not only by its ID |

## 2. The three series, measured

Over the 54 Orders of `EMS-001`, `EMS-002` and `EMS-003`, their `.pgml` and their
`.manifest.json`, the queued ones included:

| | `EMS-001` | `EMS-002` | `EMS-003` |
|---|---|---|---|
| Orders | 14 | 34 | 6 |
| the engine its manifests name | 3.5.8.06 ×12, 3.6.9.07 ×2 | 3.6.9.07 ×31, 4.7.10.08 ×3 | 4.7.10.08 ×6 |
| an engine version in a `[ctx]` | none | none | none |
| distinct paths its `[ctx'…','path']` name | 1 | 7, 1 to 3 per Order | 5, 2 to 3 per Order |
| paths named as written by an Order | none | none | none |

**Two findings decide questions below.** No Order writes a version in `[ctx]`, so the
gate of `FIELD-3b` as written has nothing to compare; the version an Order was bundled
with lives in its manifest, and two of the three series span two engines. And the
`[ctx]` path of an Order is already the read half of the traffic, declared in the
source; the write half is declared nowhere.

**What any answer costs.** No declared source of the snapshot is compiled inside a
series, so no hash of the snapshot moves; only bundles written in a series after the
Order carry the configuration, and the closed Orders stay as emitted.

## 3. The proposed shape

Every field below comes from §1. Two exceptions: `id` and `title` name the series as the
Explorer shows it, and E3 asks about `engine`:

```json
{
  "id": "EMS-002",
  "title": "Glyph 100% in Rust",
  "xsd": "…the pattern, in the notation INTAKE-XSD X2 settles…",
  "engine": "4.7.10.08",
  "conventions": [],
  "rules": [],
  "exceptions": [],
  "pins": [],
  "traffic": { "ORD-0030": { "reads": [".guidelines/.orders/INTAKE-INCLUSION.md"], "writes": [] } },
  "invoke": { "skills": [], "actions": [] }
}
```

## 4. The questions

**E1. The field list.**
- a. the ratified fields only, as in §3; the Orders stay in the spec
- b. a, and the list of the series' Orders, so the `--check` needs no spec. The spec
  already holds them, and a fact in two places is one wrong
- c. a, and `creates`: the blank Order a series configured to create one starts, which
  inherits its destination ([`INTAKE-PIN-TRAFFIC.md`](INTAKE-PIN-TRAFFIC.md) §2)

**E2. How the configuration enters each package.**
- a. **whole**, as an element beside `<schema>`, with the digest of the `EMS.json` it
  came from
- b. **the slices the Order uses**: its traffic, its pins, the rules and exceptions its
  commands touch, with the digest of the whole
- c. **the pointer only**, the path and the digest, the Harness reading the file. This
  reads against the decision, which puts the rules inside the package

**E3. The version a series holds to** (`FIELD-3b`), against §2.
- a. `engine` names the version new Orders are bundled with, and the gate compares the
  manifest's `engine`, not a `[ctx]`, for Orders bundled after the field exists
- b. `engine` per range of Orders, so the whole history checks: `EMS-001` and `EMS-002`
  each declare two
- c. the gate as `FIELD-3b` wrote it, on `[ctx]` versions, so every new Order writes one

**E4. The traffic's read half.**
- a. derived from each Order's `[ctx]` paths, so only the write half is typed in
  `EMS.json`
- b. both halves typed in `EMS.json`

**E5. The first `EMS.json` of the three series.**
- a. the session drafts one per series from what each already declares — the title from
  the spec, the engine from the manifests, the read paths from `[ctx]` — and the Regent
  rewrites it
- b. the Regent writes the first, and the session reviews it
- c. only a new series gets one

**E6. How a user's `EMS.json` is validated**, at the trust boundary.
- a. against a hand-authored `ems-schema.json` beside
  [`ast-schema.json`](../.sources/ast-schema.json), as the AST's precedent
- b. by the engine's code alone, with no schema file

**E7. The notation of `xsd`.**
- a. the notation of the ORD's declaration, whatever [`INTAKE-XSD.md`](INTAKE-XSD.md) X2
  settles, so the gate compares like with like
- b. W3C XSD, whatever X2 settles

**The session's recommendation:** E1 a, E2 a, E3 a, E4 a, E5 a, E6 a, E7 a.
- **E1 a** keeps every fact in one place.
- **E2 a** is the simplest reading of the decision, and the digest says which configuration an Order was bundled under.
- **E3 a** holds the series forward only and leaves the acts as emitted.
- **E4 a** keeps what the source already declares out of a second file.
- **E5 a** is the "together" of the Regent's word.
- **E6 a** checks a user's file with something the engine did not derive.
- **E7 a** keeps one notation.

## 5. The answers — 2026-11-21

In [`.decisions/`](../.decisions/README.md), round of 2026-11-21, from the sheet [`PERGUNTAS-2026-11-20.md`](../.plan/PERGUNTAS-2026-11-20.md).

| | answer | what the Order builds |
|---|---|---|
| E1 | a | the ratified fields only, as in §3; the Orders stay in the spec |
| E2 | a | the configuration enters each package whole, as an element beside `<schema>`, with the digest of the `EMS.json` it came from |
| E3 | a | `engine` names the version new Orders are bundled with, and the gate compares the manifest's `engine` for Orders bundled after the field exists |
| E4 | a | the traffic's read half is derived from each Order's `[ctx]` paths; only the write half is typed in |
| E5 | a | the session drafts the first `EMS.json` of each of the three series, and the Regent reads them |
| E6 | a | a user's `EMS.json` is checked against a hand-written `ems-schema.json` beside [`ast-schema.json`](../.sources/ast-schema.json), as the AST's precedent |
| E7 | a | `xsd` is written in the notation of the Order's declaration, which X2 c makes the one source, so the gate compares like with like |

**A field the 2D view adds.** The Regent's V4 of 2026-11-21
([`INTAKE-2D-VIEW.md`](INTAKE-2D-VIEW.md) §6) puts the positions of a series' plane in
its `EMS.json`. The field is the 2D view's to propose when it stores one; this Order
leaves room for it and writes none.
