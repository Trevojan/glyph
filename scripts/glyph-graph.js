/* ======================================================
   glyph-graph.js — the graph of a package, derived from the tree alone
   (EMS-003 ORD-0003)

   The 2D view draws this, and nothing else: the signed model of
   INTAKE-2D-VIEW.md §6 computes the graph on the page, from the JSON
   envelope (V6 b), with `binds` and `ref` already in it. So the graph holds
   no fact the envelope does not, and `envelopeOf` gives the envelope back.

     nodes        every node of the tree that is not a frame: a command, a
                  literal, a template, a text, a fence, a logic block
     containers   the frames (V3 a): a segment, a [section, a [block, a [part
     connectors   the seven of the signed table, each typed by the fact it is
                  drawn from:
                    nest       B under A                origin "nest"
                    chain      B extends A              origin "extend"
                    item       A and B, one conjunction origin "item", from the sibling before
                    sequence   B follows A              sibling order, when B is no item
                    reference  a literal names a binding  `ref` to the `binds` that names it
                    result     a literal names what came back  `role: "result"`
                    call       a call expands a definition  a template to the definition of its name
     marks        each diagnostic, on the node its span is, or on the package
                  when it has no span; an `ask` on a node is a socket

   Every node and frame carries `at`, the span it points the source at: its
   own, or, inside an expansion, the invocation's (`inherited`). A segment
   has none: its span is its body's.

   A literal that is an operand is not a connector: it is drawn attached to
   its command (§3), so it is a node whose `parent` says which. A child of a
   frame is held by the frame, not linked to it. An edge of a kind the table
   does not name is refused by name, never guessed at.
   ====================================================== */

export var GRAPH_SCHEMA = 1;

export var CONNECTORS = ["nest", "chain", "item", "sequence", "reference", "result", "call"];

/* the struct commands a frame is drawn for */
export var FRAMES = { SECTION: true, BLOCK: true, PT: true };

var EDGE = { nest: "nest", extend: "chain" };

function shallow(n) {
  var o = {}, k;
  for (k in n) if (Object.prototype.hasOwnProperty.call(n, k) && k !== "body") o[k] = n[k];
  return o;
}

function refused(code, message) {
  var e = new Error(code + ": " + message);
  e.code = code;
  return e;
}

/* The graph of an envelope of the `full` projection. Ids are given in the
   order the tree is walked, so the same envelope is the same graph, byte for
   byte. */
export function graphOf(env) {
  if (!env || env.type !== "GlyphAST") throw refused("NotAnEnvelope", "the graph is derived from a GlyphAST envelope");
  if (env.projection !== "full") throw refused("NotFull", "the graph needs the `full` projection, where every field is present");
  var nodes = [], containers = [], connectors = [], marks = [];
  var seq = 0, all = [];
  var binders = {}, definitions = {};

  /* the span each node points the source at: its own, or, for a node an
     expansion wrote, whose text is not in the document, the span of the
     nearest node above it that has one -- the invocation the author wrote,
     as the Regent's D3 of 2026-11-21 places a diagnostic raised there */
  var spans = {};
  function add(n, parent, isSeg) {
    var id = (isSeg ? "s" : "n") + seq++;
    var frame = isSeg || (n.type === "Command" && FRAMES[n.canonical] === true);
    var own = n.at ? { s: n.at.s, e: n.at.e } : null;
    var at = own || (parent !== null ? spans[parent] : null);
    spans[id] = at;
    var item = { id: id, kind: isSeg ? "Segment" : n.type, parent: parent, data: shallow(n), body: Array.isArray(n.body),
                 at: at, inherited: !own && !!at };
    (frame ? containers : nodes).push(item);
    all.push({ id: id, n: n, frame: frame });
    if (n.type === "Command" && n.binds && !binders[n.binds]) binders[n.binds] = id;
    if (n.type === "Template" && n.isDefinition && !definitions[n.name]) definitions[n.name] = id;
    /* an item joins the sibling just before it, a chain link included
       (`[a-b,c]`); a sequence runs between the siblings a reader reads in
       turn, and a chain link is the parent's, not one of them */
    var prev = null, prevRead = null;
    (n.body || []).forEach(function (k) {
      var kid = add(k, id, false);
      if (k.type === "Command") {
        var o = k.origin;
        if (o === "item") {
          /* `[,[rwk]]`: a conjunction whose first member is empty joins the
             command it opens under */
          connectors.push({ type: "item", from: prev || id, to: kid });
        } else if (o === "nest" || o === "extend") {
          if (!frame) connectors.push({ type: EDGE[o], from: id, to: kid });
          if (!k.chainElement && prevRead) connectors.push({ type: "sequence", from: prevRead, to: kid });
        } else if (o === "root") {
          if (prevRead) connectors.push({ type: "sequence", from: prevRead, to: kid });
        } else if (o === null && k.slotName) {
          /* a hole's name, `[ph-x`: part of the placeholder, attached as an
             operand is, and no sibling a reader reads in turn */
          return;
        } else {
          throw refused("UnknownEdge", kid + ": the edge `" + o + "` is not one of the signed table");
        }
        prev = kid;
        if (!k.chainElement) prevRead = kid;
      } else if (k.type === "Literal" || k.type === "Raw") {
        if (k.role === "result") connectors.push({ type: "result", from: id, to: kid });
      } else if (k.type === "Template") {
        if (prevRead) connectors.push({ type: "sequence", from: prevRead, to: kid });
        prev = prevRead = kid;
      }
    });
    return id;
  }

  var prevSeg = null;
  env.segments.forEach(function (sg) {
    var sid = add(sg, null, true);
    if (prevSeg) connectors.push({ type: "sequence", from: prevSeg, to: sid });
    prevSeg = sid;
  });

  /* the connectors drawn from a name: read once every node is placed, since a
     reference resolves to a binding written later as readily as earlier */
  all.forEach(function (a) {
    var n = a.n;
    if ((n.type === "Literal" || n.type === "Raw") && n.ref && binders[n.ref])
      connectors.push({ type: "reference", from: a.id, to: binders[n.ref] });
    if (n.type === "Template" && !n.isDefinition && definitions[n.name])
      connectors.push({ type: "call", from: a.id, to: definitions[n.name] });
  });

  (env.diagnostics || []).forEach(function (d, i) {
    var on = d.at ? place(all, d.at) : null;
    marks.push({ diagnostic: i, code: d.code, severity: d.severity, node: on,
                 socket: on !== null && d.severity === "ask" });
  });

  var envelope = shallow(env);
  delete envelope.segments;
  return { type: "GlyphGraph", schema: GRAPH_SCHEMA, envelope: envelope,
           containers: containers, nodes: nodes, connectors: connectors, marks: marks };
}

/* The node a span is about: the one whose span it is, else the innermost
   whose span holds it. */
function place(all, at) {
  var best = null, width = Infinity;
  all.forEach(function (a) {
    var s = a.n.at;
    if (!s || s.s > at.s || s.e < at.e) return;
    if (s.s === at.s && s.e === at.e) { best = a.id; width = -1; return; }
    if (width >= 0 && s.e - s.s < width) { best = a.id; width = s.e - s.s; }
  });
  return best;
}

/* The envelope a graph was derived from: the tree rebuilt from each node's
   fields and its parent, in the order the ids were given. */
export function envelopeOf(g) {
  if (!g || g.type !== "GlyphGraph") throw refused("NotAGraph", "an envelope is rebuilt from a GlyphGraph");
  var byId = {}, order = [];
  g.containers.concat(g.nodes).forEach(function (it) { byId[it.id] = it; });
  Object.keys(byId).sort(function (a, b) { return Number(a.slice(1)) - Number(b.slice(1)); })
    .forEach(function (id) { order.push(byId[id]); });
  var built = {}, env = {}, k;
  for (k in g.envelope) if (Object.prototype.hasOwnProperty.call(g.envelope, k)) env[k] = g.envelope[k];
  var segments = [];
  order.forEach(function (it) {
    var o = {}, f;
    for (f in it.data) if (Object.prototype.hasOwnProperty.call(it.data, f)) o[f] = it.data[f];
    if (it.body) o.body = [];
    built[it.id] = o;
    if (it.parent === null) segments.push(o);
    else built[it.parent].body.push(o);
  });
  /* `segments` sits where the envelope wrote it: after `projection` */
  var out = {};
  for (k in env) {
    if (!Object.prototype.hasOwnProperty.call(env, k)) continue;
    out[k] = env[k];
    if (k === "projection") out.segments = segments;
  }
  return out;
}
