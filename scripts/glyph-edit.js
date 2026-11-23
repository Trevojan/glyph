/* ======================================================
   glyph-edit.js — editing by the links (EMS-003 ORD-0005)

   Each operation of the plane is one edit of the tree (V1 a of the signed
   model, INTAKE-2D-VIEW.md §6): it takes the `full` envelope, returns the
   edited one, and never touches text. The way back, `fromAST`, writes the
   source; the engine reads it again; and the edit holds only when the tree
   read back is the edited tree. One that does not is refused by name, and
   the source stays the bytes it was.

     connect(from, to, type, at)  nest, chain, item, sequence: `to` moves
                                  under or beside `from`; reference: a
                                  literal takes the name a command binds;
                                  result: a literal names what came back;
                                  call: a call takes the definition's name
     retype(c, type)              cut, then connect by the new type
     move(c, node)                cut, then connect to another node
     cut(c)                       the node stays in the package: a tree edge
                                  leaves it a root command (§3, nothing
                                  vanishes in silence); a reference and a
                                  call are the text, so cutting them is
                                  refused, and the operand is what changes
     place(canonical, parent, at) a command from the palette
     remove(node, how)            a node that holds others asks first: `lift`
                                  its children to its place, or `drop` them
     reorder(node, by)            among its siblings
     operand(node, text)          write, or clear, a command's operand
     wrap(nodes, kind, name)      siblings in a [section, a [block or a [part

   Ids are the graph's (glyph-graph.js): the order the tree is walked in.
   ====================================================== */

import { graphOf } from "./glyph-graph.js";

/* the operator each connector writes, as the plane names it */
export var WRITES = { nest: "[a[b]]", chain: "[a-b", item: "[a],[b]", sequence: "[a][b]",
                      reference: "[ref'name']", result: "[a[b]'name']", call: "[--name" };
export var TREE_EDGES = ["nest", "chain", "item", "sequence"];
export var WRAPS = { section: "SECTION", block: "BLOCK", part: "PT" };

function no(code, message) { return { refused: code, message: message }; }
function copy(env) { return JSON.parse(JSON.stringify(env)); }
var isCmd = function (n) { return n && (n.type === "Command" || n.type === "Template"); };
var isLit = function (n) { return n && (n.type === "Literal" || n.type === "Raw"); };

/* every node by the graph's id, with the list that holds it */
export function index(env) {
  var at = {}, seq = 0;
  function add(n, list, i, parent, seg, copied) {
    var id = (parent === null ? "s" : "n") + seq++;
    at[id] = { id: id, node: n, list: list, i: i, parent: parent, seg: seg, copied: copied };
    var inside = copied || (n.type === "Template" && n.expanded === true);
    (n.body || []).forEach(function (k, j) { add(k, n.body, j, id, seg, inside); });
  }
  env.segments.forEach(function (sg, i) { add(sg, env.segments, i, null, i, false); });
  return at;
}

function top(ix, id) {
  var it = ix[id];
  while (it.parent !== null && ix[it.parent].parent !== null) it = ix[it.parent];
  return it;
}
function within(ix, id, maybeAncestor) {
  for (var it = ix[id]; it && it.parent !== null; it = ix[it.parent]) if (it.parent === maybeAncestor) return true;
  return false;
}
function detach(ix, id) {
  var it = ix[id], k = it.list.indexOf(it.node);
  it.list.splice(k, 1);
  return it.node;
}
function plainOrigin(list, env) { return env.segments.some(function (s) { return s.body === list; }) ? "root" : "nest"; }
function insertAfter(list, ref, n) { list.splice(list.indexOf(ref) + 1, 0, n); }
/* a node out of the tree it was in lands as a root command after the top
   command that held it, in the same segment */
function toRoot(env, ix, fromId, n) {
  var t = top(ix, fromId), seg = env.segments[t.seg];
  n.origin = "root"; n.chainElement = false;
  insertAfter(seg.body, t.node, n);
}
/* a segment the edit emptied goes with its last node; one the source held
   empty stays */
function emptied(env, ix, id) {
  var seg = env.segments[ix[id].seg];
  return function () {
    if (env.segments.length > 1 && seg.body === ix[id].list && !seg.body.length)
      env.segments.splice(env.segments.indexOf(seg), 1);
  };
}
function guard(ix, ids) {
  for (var k = 0; k < ids.length; k++) {
    var it = ix[ids[k]];
    if (!it) return no("EditNoNode", ids[k] + " is not a node of this package");
    if (it.copied) return no("EditInsideExpansion", ids[k] + " was written by a template's expansion; edit the definition");
    if (it.node.type === "Truncated") return no("EditTruncated", "the envelope omits this part of the tree");
  }
  return null;
}

/* the operations, each on a copy; an answer is an envelope or a refusal */
var OPS = {
  connect: function (env, a) {
    var ix = index(env), r = guard(ix, [a.from, a.to]);
    if (r) return r;
    if (a.from === a.to) return no("EditSelf", "a node is not linked to itself");
    var f = ix[a.from].node, t = ix[a.to].node, type = a.type;
    if (ix[a.from].parent === null || ix[a.to].parent === null) return no("EditSegment", "a segment is a frame, not an end of a link");
    if (type === "reference") {
      if (!isLit(f) || f.form === "raw") return no("EditNotALiteral", "a reference leaves from a literal");
      if (f.type !== "Literal" || !t.binds) return no("EditNoBinding", "the command at the other end binds no name");
      f.value = t.binds;
      return env;
    }
    if (type === "call") {
      if (f.type !== "Template" || f.isDefinition || t.type !== "Template" || !t.isDefinition)
        return no("EditNotACall", "a call joins a template call to a definition");
      f.name = t.name; f.expanded = false; f.body = [];
      return env;
    }
    if (type === "result") {
      if (f.type !== "Command" || f.chainElement) return no("EditNotACommand", "a result leaves from a command");
      if (!isLit(t)) return no("EditNotALiteral", "a result lands on a literal");
      if (!(f.body || []).some(function (k) { return isCmd(k) && !k.chainElement; }))
        return no("EditNoNest", "a result is named after a nested command, and this one has none");
      var lit = detach(ix, a.to);
      lit.role = "result";
      if (typeof a.at === "number") f.body.splice(a.at, 0, lit); else f.body.push(lit);
      return env;
    }
    if (TREE_EDGES.indexOf(type) === -1) return no("EditNoSuchLink", "`" + type + "` is not a link of the signed table");
    if (!isCmd(t) || t.slotName) return no("EditNotACommand", "only a command or a template moves by a link");
    if (within(ix, a.from, a.to)) return no("EditCycle", "a node cannot go under what it holds");
    var tidy = emptied(env, ix, a.to);
    var holds = (t.body || []).some(function (k) { return isCmd(k) || isLit(k); });
    if (type === "nest") {
      if (!isCmd(f) || f.chainElement) return no("EditLinkHolds", "a bare link holds nothing");
      t = detach(ix, a.to); t.origin = "nest"; t.chainElement = false;
      f.body = f.body || [];
      if (typeof a.at === "number") f.body.splice(a.at, 0, t); else f.body.push(t);
    } else if (type === "chain") {
      if (f.type !== "Command" || f.chainElement) return no("EditLinkHolds", "a link chains to a command, not to a link");
      /* bare unless asked otherwise; a bracketed link, `[a-[b]]`, emits what
         the nest emits, and the way back writes it as one */
      var bare = a.bare === undefined ? true : !!a.bare;
      if (bare && holds) return no("EditChainHolds", "a chain link is bare: it holds nothing of its own");
      t = detach(ix, a.to); t.origin = "extend"; t.chainElement = bare;
      f.body = f.body || [];
      var last = -1;
      f.body.forEach(function (k, j) { if (k.chainElement) last = j; });
      f.body.splice(typeof a.at === "number" ? a.at : last + 1, 0, t);
    } else if (type === "item") {
      if (!isCmd(f)) return no("EditNotACommand", "an item joins two commands");
      /* `[a,[b]]`: an item whose first member is empty joins the command it
         opens under, and stays where it stands */
      if (ix[a.to].parent === a.from) { t.origin = "item"; return env; }
      if (f.chainElement && holds) return no("EditChainHolds", "an item of links is bare: it holds nothing of its own");
      t = detach(ix, a.to); t.origin = "item"; t.chainElement = !!f.chainElement;
      if (typeof a.at === "number") ix[a.from].list.splice(a.at, 0, t); else insertAfter(ix[a.from].list, f, t);
    } else {
      if (!isCmd(f) || f.chainElement) return no("EditSequenceOfLink", "a link is the command's, no sibling read in turn");
      var list = ix[a.from].list;
      t = detach(ix, a.to); t.origin = plainOrigin(list, env); t.chainElement = false;
      if (typeof a.at === "number") list.splice(a.at, 0, t); else insertAfter(list, f, t);
    }
    tidy();
    return env;
  },

  cut: function (env, a) {
    var c = graphOf(env).connectors[a.connector];
    if (!c) return no("EditNoLink", "no link " + a.connector);
    if (c.type === "reference") return no("EditReferenceIsText", "a reference is the literal's text: write another operand");
    if (c.type === "call") return no("EditCallIsName", "a call is its name: write another call");
    var ix = index(env), r = guard(ix, [c.to]);
    if (r) return r;
    if (ix[c.from].parent === null) return no("EditSegment", "the order of segments is not a link to cut");
    var n = ix[c.to].node;
    if (c.type === "item") {
      n.origin = n.chainElement ? "extend" : plainOrigin(ix[c.to].list, env);
      return env;
    }
    if (c.type === "sequence" && ix[c.to].list === env.segments[ix[c.to].seg].body) {
      detach(ix, c.to);
      n.origin = "root";
      var seg = { type: "Segment", mood: [], isReturn: false, continues: false, breaks: 0, autoClosedCount: 0, body: [n] };
      env.segments.splice(ix[c.to].seg + 1, 0, seg);
      return env;
    }
    detach(ix, c.to);
    if (isLit(n)) { n.role = null; insertAfter(env.segments[top(ix, c.from).seg].body, top(ix, c.from).node, n); }
    else toRoot(env, ix, c.from, n);
    return env;
  },

  place: function (env, a) {
    var name = String(a.canonical || "").toUpperCase();
    if (a.known && a.known.indexOf(name) === -1) return no("EditUnknownCommand", "`" + name + "` is not a command of the vocabulary");
    var n = { type: "Command", raw: name.toLowerCase(), canonical: name, origin: "root", chainElement: false,
              slotName: false, name: null, body: [] };
    var ix = index(env);
    if (a.parent == null) { env.segments[env.segments.length - 1].body.push(n); return env; }
    var r = guard(ix, [a.parent]);
    if (r) return r;
    var p = ix[a.parent];
    if (p.parent === null) { p.node.body.push(n); return env; }
    if (!isCmd(p.node) || p.node.chainElement) return no("EditLinkHolds", "a command is placed under a command, not under a link");
    n.origin = "nest";
    if (typeof a.at === "number") p.node.body.splice(a.at, 0, n); else p.node.body.push(n);
    return env;
  },

  remove: function (env, a) {
    var ix = index(env), r = guard(ix, [a.node]);
    if (r) return r;
    var it = ix[a.node], n = it.node;
    if (it.parent === null) return no("EditSegment", "a segment goes when its last command does");
    var held = (n.body || []).filter(isCmd);
    if (held.length && a.how !== "lift" && a.how !== "drop")
      return no("EditHoldsOthers", "it holds " + held.length + " command(s): lift them to its place, or drop them with it");
    var tidy = emptied(env, ix, a.node), k = it.list.indexOf(n);
    var lifted = a.how === "lift" ? held.map(function (h) { h.origin = plainOrigin(it.list, env); h.chainElement = false; return h; }) : [];
    Array.prototype.splice.apply(it.list, [k, 1].concat(lifted));
    tidy();
    return env;
  },

  reorder: function (env, a) {
    var ix = index(env), r = guard(ix, [a.node]);
    if (r) return r;
    var it = ix[a.node];
    if (it.parent === null) return no("EditSegment", "a segment is not reordered from the plane");
    var k = it.list.indexOf(it.node), j = k + (a.by || 0);
    if (j < 0 || j >= it.list.length || j === k) return no("EditNoPlace", "there is no sibling to change places with");
    it.list.splice(k, 1);
    it.list.splice(j, 0, it.node);
    return env;
  },

  operand: function (env, a) {
    var ix = index(env), r = guard(ix, [a.node]);
    if (r) return r;
    var n = ix[a.node].node;
    if (n.type !== "Command" || n.chainElement || n.slotName) return no("EditNoOperand", "only a bracketed command takes an operand");
    var text = String(a.text == null ? "" : a.text);
    var k = (n.body || []).findIndex(function (c) { return c.type === "Literal" && c.role !== "result"; });
    if (!text) {
      if (k === -1) return no("EditNoOperand", "there is no operand to clear");
      n.body.splice(k, 1);
      return env;
    }
    if (k !== -1) { n.body[k].value = text; return env; }
    n.body = n.body || [];
    var after = 0;
    n.body.forEach(function (c, j) { if (c.chainElement) after = j + 1; });
    n.body.splice(after, 0, { type: "Literal", value: text, form: "quote", slot: null, role: "operand", ref: null });
    return env;
  },

  wrap: function (env, a) {
    var kind = WRAPS[a.kind];
    if (!kind) return no("EditNoFrame", "a frame is a section, a block or a part");
    var name = String(a.name == null ? "" : a.name).trim();
    if (!name) return no("EditWrapNeedsName", "a frame is named: its first literal is its name");
    var ix = index(env), ids = a.nodes || [], r = guard(ix, ids);
    if (r) return r;
    if (!ids.length) return no("EditWrapNothing", "there is nothing to wrap");
    var list = ix[ids[0]].list;
    var at = ids.map(function (id) { return ix[id].list === list ? list.indexOf(ix[id].node) : -1; }).sort(function (x, y) { return x - y; });
    if (at[0] < 0 || at.some(function (v, j) { return j && v !== at[j - 1] + 1; }))
      return no("EditWrapApart", "a frame wraps siblings that stand together");
    if (at.some(function (v) { return list[v].chainElement; })) return no("EditWrapLink", "a link is its command's, and stays with it");
    var held = list.slice(at[0], at[at.length - 1] + 1).map(function (n) { if (n.type === "Command") { n.origin = "nest"; } return n; });
    var frame = { type: "Command", raw: kind.toLowerCase(), canonical: kind, origin: plainOrigin(list, env), chainElement: false,
                  slotName: false, name: null,
                  body: [{ type: "Literal", value: name, form: "quote", slot: null, role: "operand", ref: null }].concat(held) };
    list.splice(at[0], held.length, frame);
    return env;
  }
};
/* a cut moves nodes, and the walk gives them new ids; a key set on each node
   before the cut finds them after it */
function keyed(env) {
  var ix = index(env);
  Object.keys(ix).forEach(function (id) { ix[id].node.__k = id; });
  return env;
}
function idOf(env, key) {
  var ix = index(env), ids = Object.keys(ix);
  for (var j = 0; j < ids.length; j++) if (ix[ids[j]].node.__k === key) return ids[j];
  return null;
}
function recut(env, a, then) {
  var c = graphOf(env).connectors[a.connector];
  if (!c) return no("EditNoLink", "no link " + a.connector);
  var cut = OPS.cut(keyed(env), a);
  if (cut.refused) return cut;
  return then(cut, c);
}
OPS.retype = function (env, a) {
  return recut(env, a, function (cut, c) {
    return OPS.connect(cut, { from: idOf(cut, c.from), to: idOf(cut, c.to), type: a.type });
  });
};
OPS.move = function (env, a) {
  return recut(env, a, function (cut, c) {
    return OPS.connect(cut, { from: idOf(cut, c.from), to: idOf(cut, a.node), type: c.type });
  });
};
export var OPERATIONS = Object.keys(OPS);
export { keyed, idOf };

/* what the tree says once the derived fields are set aside: what an edit can
   change, and what reading the source again must give back */
export function shape(env) {
  function kids(list) {
    return (list || []).map(function (n) {
      var o = { t: n.type };
      /* a bracketed link, `[a-[b]]`, emits what `[a[b]]` emits, and the way
         back writes the second: one tree for the reader */
      if (n.type === "Command") {
        o.c = n.canonical; o.o = n.origin === "extend" && !n.chainElement ? "nest" : n.origin;
        o.k = !!n.chainElement; o.s = !!n.slotName;
      }
      if (n.type === "Literal" || n.type === "Raw" || n.type === "Text" || n.type === "Verbatim") o.v = n.value;
      if (n.type === "Template") { o.n = n.name; o.d = !!n.isDefinition; }
      /* a call's body is its expansion, which the definition writes */
      if (n.body && !(n.type === "Template" && !n.isDefinition)) o.b = kids(n.body);
      return o;
    });
  }
  return env.segments.map(function (s) { return { r: !!s.isReturn, b: kids(s.body) }; });
}

/* One operation, held or refused. `engine` is { toAST, fromAST, opts }. */
export function apply(env, op, args, engine) {
  if (!OPS[op]) return no("EditNoSuchOperation", "`" + op + "` is not an operation of the plane");
  if (env.truncatedNodes) return no("EditTruncated", "the envelope omits part of the tree; the way back cannot write it");
  var edited = OPS[op](copy(env), args || {});
  if (edited.refused) return edited;
  var src = engine.fromAST(edited, engine.opts).src;
  var back = engine.toAST(src, engine.opts);
  var want = JSON.stringify(shape(edited)), got = JSON.stringify(shape(back));
  if (want !== got) return no("EditNotHeld", "the source the way back writes reads as another tree");
  return { src: src, env: back, edited: edited };
}

/* the link types the two ends of a link admit, each tried and held */
export function admits(env, connector, engine) {
  var c = graphOf(env).connectors[connector];
  if (!c) return [];
  return TREE_EDGES.concat(["result"]).filter(function (t) {
    if (t === c.type) return true;
    return !apply(env, "retype", { connector: connector, type: t }, engine).refused;
  });
}
