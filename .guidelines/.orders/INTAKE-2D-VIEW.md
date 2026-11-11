# Intake — the 2D view: the measured proposal

> **The proposal [`EMS-003/ORD-0001`](EMS-003/README.md) opens with.** The Regent
> asked for the feature on 2026-11-11: *"the icons i just sent must be used to
> organize a 2D intuitive view and enable editing via visible links with different
> types of operations and connectors. there must be XML Orders describing the details
> of this bigger feature."* This file measures what the engine and the icons already
> give, proposes the model, and asks what the model leaves to decide. §6 holds the
> Regent's answers, and nothing of the series is built before them. Measured at
> `c078f2c`.

## 1. What the tree gives a picture

| the picture needs | the engine holds | where |
|---|---|---|
| a node | `Command` and `Literal`, two of the three node types of the envelope | `toAST` |
| a frame | `Segment`, the third, and the `struct` commands `SECTION`, `BLOCK` and `PT` | `toAST`; [`GLOSSARY.md`](../.sources/GLOSSARY.md) §4 |
| a link with a type | `origin` on every node: `root`, `nest`, `extend` or `item`, the operator that wrote the edge to its parent | [`ast-schema.json`](../.sources/ast-schema.json) |
| the place in the source | `at`, the span of each command | `toAST` |
| a name and who points at it | `binds` and `ref`, written by the XML emitter; the envelope does not carry them | `buildXml`; [`XML_REFERENCE.md`](../.sources/XML_REFERENCE.md) §3 |
| what a literal names | `role="result"` on a literal after a nest; the envelope carries `role` | `toAST` |
| what is missing | `<needs>` in the XML, and the diagnostics `fix`, `ask` and `note` with their spans | `parse` |
| the way from a picture back to source | `fromAST`, held over every declared source by the suite | `scripts/core/inverse.js` |

The page shows four tabs over one source field — `.pgml`, `.xml`, `.json`, `.hgml` —
in 1 792 lines of interface script and 372 of style, with no library.

## 2. The icons, as delivered

Kept as delivered in `.scope/asset/glyph-icons/`: 41 SVG files, 204 718 bytes, with
no script and no outside reference in them.

| | |
|---|---|
| named after a command | 39 of the 120 commands of the vocabulary |
| named after nothing the vocabulary holds | `pin_on` and `pin_off`: the PIN is step 6 of the [trail](../.plan/README.md) |
| tile sizes | 13×17 (22 files), 13×18 (14), 14×17 (2), 15×18 (1); the two pins are 8×8 |
| colours | black and white written into every file; `eval.svg` and `ovr.svg` also stroke `#1E1245` |
| the name | drawn as outlines above each tile; `nt.svg` says *note*, every other the command name |

By category of the palette: *ação* 4 of 10, *juízo* 9 of 16, *pergunta* 2 of 4,
*enquadre* 1 of 8, *contexto* 3 of 5, *condição* 5 of 9, *limite* 4 of 12,
*raciocínio* 0 of 14, *rumo* 2 of 6, *intensidade* 1 of 4, *frame* 3 of 10, *marca* 2
of 6. `SECTION` and `BLOCK` have no icon and `PT` has one.

## 3. The model proposed

**Nodes.** A command is its icon tile with its name; a literal is its text, attached
to the command it is the operand of.

**Containers.** A segment, a `[section`, a `[block` and a `[part` are frames: what
they hold is drawn inside them, as a part slices a block and a block a section.

**Connectors.** Each is drawn from one fact the engine already holds, and each writes
one operator when the plane edits it:

| connector | says | written as | drawn from |
|---|---|---|---|
| nest | B is under A | `[a[b]]` | `origin: nest` |
| chain | B extends A over the same operand | `[a-b` | `origin: extend` |
| item | A and B are members of one conjunction | `[a],[b]` | `origin: item` |
| sequence | B follows A | `[a][b]` | the order of siblings |
| reference | this literal names what that command binds | `[ref'name']`, or the bound name as a literal | `binds` and `ref` |
| result | this literal names what came back | a literal after a nest | `role: result` |
| call | this call expands that definition | `[--name` to `[--name=` | the template node |

**Operations.** Connect two nodes by a type; change a connector's type; move an end;
cut; place a command from the palette of icons; remove a node; reorder siblings;
write an operand; wrap nodes in a section, a block or a part. Each is one edit of the
tree; `fromAST` writes the source; the engine reads it again; the plane shows what
was read.

## 4. What the model costs

- **`binds` and `ref` are not in the envelope.** The reference connector either
  recomputes them on the page, a second copy of a rule the emitter owns, or they enter
  the envelope, which moves every `ast` hash of the snapshot by decision (V6).
- **81 commands have no icon**, the whole reasoning category among them. A fallback
  tile answers until an icon arrives (ORD-0002).
- **The colours are written into the files.** Following the interface — black
  background, cyan, purple, dark green, light blue — means generating a normalised
  set from the delivered one (ORD-0002).
- **A picture has positions and the tree has none.** Either the layout is computed
  each time, or a position is stored somewhere that is not the Order (V4).

## 5. The questions

**V1. What an edit on the plane changes.**
- a. the tree, and `fromAST` writes the source: the AST is the source of truth, and
  the way back is held by the suite
- b. the source text, by the span of the node: no dependence on the way back, and
  whitespace and layout of the source survive an edit

**V2. Which connectors the plane draws and edits.**
- a. the seven of §3
- b. the four the tree writes as edges and order — nest, chain, item, sequence — and
  the other three drawn but not editable
- c. the four only

**V3. How a section, a block and a part show.**
- a. frames that hold their nodes, as §3
- b. nodes like any other, tied to what they hold by nest connectors

**V4. Where a position lives.**
- a. nowhere: the layout is computed from the graph, and the same source is the same
  picture
- b. on the user's machine, per Order, beside the Explorer's personal data, with the
  computed layout as the default
- c. in the Order itself: it travels with the source, and moves what is emitted

**V5. The icons on the plane.**
- a. a normalised set generated from the delivered files: one size, the colours of
  the interface, the name drawn by the page
- b. as delivered, on a light tile over the black plane

**V6. Where the graph is computed.**
- a. on the page, from the JSON envelope, `binds` and `ref` recomputed there
- b. on the page, from the envelope, after `binds` and `ref` enter the envelope: the
  `ast` hashes move by decision
- c. a call of the engine, answered byte for byte by the JS and the Rust

**V7. Where the plane shows.**
- a. a fifth tab of the page, beside `.pgml`, `.xml`, `.json` and `.hgml`
- b. a surface of its own, with the source beside it

The session recommends **V1 a, V2 a, V3 a, V4 b, V5 a, V6 b, V7 b**: V1 a and V6 b
keep one owner for each fact; V4 b keeps the Order free of what is personal; and V7 b
because a plane edited by links needs the source in sight, which a tab hides.

## 6. The Regent's answers

Not given yet. `ORD-0001` stops here.
