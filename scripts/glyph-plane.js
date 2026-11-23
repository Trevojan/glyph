/* ======================================================
   glyph-plane.js — the 2D view, read only (EMS-003 ORD-0004)

   The plane draws the graph of glyph-graph.js and nothing else: the signed
   model (INTAKE-2D-VIEW.md §6) derives the graph on the page (V6 b) and puts
   the plane on a surface of its own, with the source beside it (V7 b). It
   reads the tree and writes nothing.

   layout(g)          rows, frames and anchors, from the graph alone: an
                      indented tree, one row per node a reader reads, so the
                      same source is the same picture and a package grows by
                      rows, never by crossings. No stored position exists yet
                      (EMS.json is step 2 of the trail); `positions`, when one
                      is given, wins over the computed row.
   render(g, L, ...)  the SVG: frames, connectors, then rows, each row and
                      each connector a stop of the keyboard walk with the text
                      a screen reader says
   mountPlane(el, src) the page's binding: choose a node and its span is
                      selected in the source; move the caret and its node is
                      marked; walk with the arrows; zoom with + and -

   A connector's type is told by its stroke, its dash and its end mark, never
   by colour alone, and the legend names all seven.
   ====================================================== */

import { graphOf, CONNECTORS } from "./glyph-graph.js";

export var GEOM = { ROW: 34, INDENT: 34, TILE_W: 26, TILE_H: 24, PAD: 16, CH: 7.2, CUT: 32 };

/* stroke dash and end mark of each type; the colour token is a third cue */
export var STYLE = {
  nest:      { dash: "",          end: "arrow",   token: "--h-cmd" },
  chain:     { dash: "5 3",       end: "arrow",   token: "--h-op" },
  item:      { dash: "1.5 3",     end: "diamond", token: "--ok" },
  sequence:  { dash: "",          end: "open",    token: "--el" },
  reference: { dash: "6 3 1.5 3", end: "dot",     token: "--h-lit" },
  result:    { dash: "3 2",       end: "square",  token: "--h-emo" },
  call:      { dash: "8 3",       end: "bar",     token: "--ask" }
};

export var WORDS = {
  types: { nest: "nest", chain: "chain", item: "item", sequence: "sequence",
           reference: "reference", result: "result", call: "call" },
  sev: { fix: "fix", ask: "ask", note: "note" },
  segment: "segment", operand: "operand", socket: "asks here", omitted: "nodes omitted",
  plane: "plane of the package", onPackage: "on the package",
  tools: { bar: "edit the tree", link: "link to", pick: "choose the other end", operand: "operand", write: "write",
           up: "up", down: "down", remove: "remove", lift: "lift what it holds", drop: "remove all", place: "place",
           wrap: "wrap in", name: "name", retype: "change type", cut: "cut", moveEnd: "move the end",
           undo: "undo", redo: "redo", refused: "refused", done: "done", cancel: "cancel",
           frames: { section: "section", block: "block", part: "part" } }
};

var RANK = { fix: 3, ask: 2, note: 1 };

function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function cut(s) {
  s = String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  return s.length > GEOM.CUT ? s.slice(0, GEOM.CUT - 1) + "…" : s;
}

/* An operand literal and a hole's name are drawn on their command's row. */
export function attached(it) {
  return ((it.kind === "Literal" || it.kind === "Raw") && it.data.role === "operand") ||
         (it.kind === "Command" && it.data.slotName === true && it.data.origin === null);
}

/* the words a row shows */
export function labelOf(it, segIndex) {
  var d = it.data;
  switch (it.kind) {
    case "Segment": return "§" + (segIndex + 1);
    case "Command": return "[" + String(d.canonical || d.raw || "").toLowerCase();
    case "Template": return "[--" + d.name + (d.isDefinition ? "=" : "");
    case "Literal": case "Raw": return "'" + cut(d.value) + "'";
    case "Text": return cut(d.value);
    case "Verbatim": return "[raw] " + cut(d.value);
    case "Logic": return "[logic" + (d.name ? "-" + d.name : "");
    case "ModeOff": return "[off]";
    case "Truncated": return "… " + d.omittedNodes;
    default: return it.kind;
  }
}
function chipOf(it) {
  return it.kind === "Command" ? "-" + String(it.data.canonical || it.data.raw || "").toLowerCase()
                               : "'" + cut(it.data.value) + "'";
}
function hasTile(it) { return it.kind === "Command" || it.kind === "Template"; }

/* Rows, frames and anchors. Pure: the same graph is the same layout. */
export function layout(g, positions) {
  var items = g.containers.concat(g.nodes).sort(function (a, b) {
    return Number(a.id.slice(1)) - Number(b.id.slice(1));
  });
  var byId = {}, kids = {}, depth = {}, segIndex = {}, segs = 0;
  items.forEach(function (it) { byId[it.id] = it; kids[it.id] = []; });
  items.forEach(function (it) { if (it.parent !== null) kids[it.parent].push(it.id); });
  var isFrame = {};
  g.containers.forEach(function (c) { isFrame[c.id] = true; });

  var rows = [], row = {}, chips = {};
  items.forEach(function (it) {
    if (it.kind === "Segment") segIndex[it.id] = segs++;
    depth[it.id] = it.parent === null ? 0 : depth[it.parent] + 1;
    if (attached(it) && it.parent !== null) {
      (chips[it.parent] = chips[it.parent] || []).push(it.id);
      return;
    }
    var x = GEOM.PAD + depth[it.id] * GEOM.INDENT, y = GEOM.PAD + rows.length * GEOM.ROW;
    if (positions && positions[it.id]) { x = positions[it.id].x; y = positions[it.id].y; }
    var r = { id: it.id, x: x, y: y, depth: depth[it.id], label: labelOf(it, segIndex[it.id]),
              tile: hasTile(it), chips: [] };
    var right = x + (r.tile ? GEOM.TILE_W + 6 : 0) + r.label.length * GEOM.CH;
    r.labelEnd = right;
    row[it.id] = r;
    rows.push(r);
  });
  /* the chips after the label, in the order the source wrote them */
  rows.forEach(function (r) {
    var at = r.labelEnd + 6;
    (chips[r.id] || []).forEach(function (cid) {
      var text = chipOf(byId[cid]), w = text.length * GEOM.CH + 8;
      r.chips.push({ id: cid, text: text, x: at, w: w });
      at += w + 4;
    });
    r.right = r.chips.length ? at - 4 : r.labelEnd;
  });

  /* a frame holds its header row and every row below it, bottom-up so an
     outer frame always clears an inner one */
  var frames = {};
  function frame(id) {
    if (frames[id]) return frames[id];
    var r = row[id], top = r.y - 6, left = r.x - 6, right = r.right + 8, bottom = r.y + GEOM.TILE_H + 6;
    (function down(pid) {
      kids[pid].forEach(function (k) {
        if (isFrame[k]) {
          var f = frame(k);
          right = Math.max(right, f.x + f.w + 6);
          bottom = Math.max(bottom, f.y + f.h + 6);
        } else {
          if (row[k]) { right = Math.max(right, row[k].right + 8); bottom = Math.max(bottom, row[k].y + GEOM.TILE_H + 6); }
          down(k);
        }
      });
    })(id);
    frames[id] = { id: id, x: left, y: top, w: right - left, h: bottom - top };
    return frames[id];
  }
  g.containers.forEach(function (c) { frame(c.id); });

  var width = 0, height = 0;
  rows.forEach(function (r) { width = Math.max(width, r.right); height = Math.max(height, r.y + GEOM.TILE_H); });
  g.containers.forEach(function (c) { var f = frames[c.id]; width = Math.max(width, f.x + f.w); height = Math.max(height, f.y + f.h); });
  return { rows: rows, row: row, chipOf: chipIndex(rows), frames: g.containers.map(function (c) { return frames[c.id]; }),
           width: Math.ceil(width + 120), height: Math.ceil(height + GEOM.PAD) };
}
function chipIndex(rows) {
  var o = {};
  rows.forEach(function (r) { r.chips.forEach(function (c) { o[c.id] = { row: r, chip: c }; }); });
  return o;
}

/* where a connector leaves and lands, as an SVG path */
export function pathOf(c, L, k) {
  var mid = function (r) { return r.y + GEOM.TILE_H / 2; };
  var from = L.row[c.from], to = L.row[c.to];
  if (c.type === "reference" || c.type === "call") {
    var px, py;
    if (L.chipOf[c.from]) { var a = L.chipOf[c.from]; px = a.chip.x + a.chip.w; py = mid(a.row); }
    else if (from) { px = from.right; py = mid(from); }
    else return null;
    var target = to || (L.chipOf[c.to] && L.chipOf[c.to].row);
    if (!target) return null;
    var gx = Math.max(px, target.right) + 24 + (k % 4) * 8;
    return "M" + px + " " + py + "C" + gx + " " + py + "," + gx + " " + mid(target) + "," + (target.right + 2) + " " + mid(target);
  }
  if (!from || !to) return null;
  if (to.x > from.x) {
    var sx = from.x + (from.tile ? 8 : 4), sy = from.y + GEOM.TILE_H;
    return "M" + sx + " " + sy + "V" + mid(to) + "H" + (to.x - 2);
  }
  var off = c.type === "item" ? 10 : 18;
  return "M" + from.x + " " + mid(from) + "C" + (from.x - off) + " " + mid(from) + "," + (to.x - off) + " " +
         mid(to) + "," + (to.x - 2) + " " + mid(to);
}

function markers() {
  var shape = {
    arrow:   '<path d="M0 0L8 4L0 8Z"/>',
    open:    '<path d="M0 0L8 4L0 8" fill="none" stroke-width="1.4"/>',
    diamond: '<path d="M0 4L4 0L8 4L4 8Z"/>',
    dot:     '<circle cx="4" cy="4" r="3"/>',
    square:  '<rect x="1" y="1" width="6" height="6"/>',
    bar:     '<rect x="3" y="0" width="2" height="8"/>'
  };
  return CONNECTORS.map(function (t) {
    var s = STYLE[t];
    return '<marker id="pm-' + t + '" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"' +
           ' style="fill:var(' + s.token + ');stroke:var(' + s.token + ')">' + shape[s.end] + "</marker>";
  }).join("");
}

/* the walk: every row in reading order, each followed by the connectors that
   leave it, so the whole plane is reached from the keyboard */
export function walkOrder(g, L) {
  var out = {}, order = [];
  g.connectors.forEach(function (c, i) {
    var owner = L.row[c.from] ? c.from : (L.chipOf[c.from] ? L.chipOf[c.from].row.id : null);
    if (owner) (out[owner] = out[owner] || []).push("c" + i);
  });
  L.rows.forEach(function (r) { order.push(r.id); (out[r.id] || []).forEach(function (c) { order.push(c); }); });
  return order;
}

/* The SVG of a graph. `icons` is the table glyph-icons writes; `words` the
   interface's words for the types and the severities. */
export function render(g, L, icons, words) {
  words = words || WORDS;
  var byId = {};
  g.containers.concat(g.nodes).forEach(function (it) { byId[it.id] = it; });
  var marks = {};
  g.marks.forEach(function (m) { if (m.node) (marks[m.node] = marks[m.node] || []).push(m); });
  var nameOf = function (id) {
    var r = L.row[id];
    if (r) return r.label;
    var a = L.chipOf[id];
    return a ? a.chip.text : id;
  };
  var o = ['<svg class="plane-svg" xmlns="http://www.w3.org/2000/svg" width="' + L.width + '" height="' + L.height +
           '" viewBox="0 0 ' + L.width + " " + L.height + '" role="tree" aria-label="' + esc(words.plane) + '">',
           "<defs>" + markers() + "</defs>"];
  L.frames.forEach(function (f) {
    var it = byId[f.id];
    o.push('<rect class="pf pf-' + (it.kind === "Segment" ? "seg" : String(it.data.canonical).toLowerCase()) +
           '" data-frame="' + f.id + '" x="' + f.x + '" y="' + f.y + '" width="' + f.w + '" height="' + f.h + '" rx="6"/>');
  });
  g.connectors.forEach(function (c, i) {
    var d = pathOf(c, L, i);
    if (!d) return;
    var s = STYLE[c.type];
    o.push('<path class="pc pc-' + c.type + '" id="pc-c' + i + '" data-conn="c' + i + '" d="' + d + '"' +
           (s.dash ? ' stroke-dasharray="' + s.dash + '"' : "") + ' style="stroke:var(' + s.token + ')"' +
           ' marker-end="url(#pm-' + c.type + ')" tabindex="-1" role="treeitem" aria-label="' +
           esc(words.types[c.type] + ": " + nameOf(c.from) + " → " + nameOf(c.to)) + '"/>');
  });
  L.rows.forEach(function (r) {
    var it = byId[r.id], ms = marks[r.id] || [];
    var sev = ms.reduce(function (a, m) { return (RANK[m.severity] || 0) > (RANK[a] || 0) ? m.severity : a; }, "");
    var said = [r.label + (it.data.gloss ? ", " + it.data.gloss : "")];
    r.chips.forEach(function (c) { said.push(words.operand + " " + c.text); });
    ms.forEach(function (m) { said.push(words.sev[m.severity] + ": " + m.code); });
    o.push('<g class="pn' + (sev ? " sev-" + sev : "") + '" id="pn-' + r.id + '" data-node="' + r.id + '" transform="translate(' +
           r.x + " " + r.y + ')" tabindex="-1" role="treeitem" aria-level="' + (r.depth + 1) + '" aria-label="' + esc(said.join("; ")) + '">');
    if (sev) o.push('<rect class="ring" x="-3" y="-3" width="' + (GEOM.TILE_W + 6) + '" height="' + (GEOM.TILE_H + 6) + '" rx="5"/>');
    if (r.tile) {
      var stem = it.kind === "Command" && icons && icons.icons ? icons.icons[it.data.canonical] : null;
      o.push('<svg class="gi' + (stem ? "" : " gi-none") + '" width="' + GEOM.TILE_W + '" height="' + GEOM.TILE_H +
             '" viewBox="0 0 13 12"><use href="#gi-' + (stem || "fallback") + '"/></svg>');
    }
    var lx = r.tile ? GEOM.TILE_W + 6 : 0;
    o.push('<text class="pl pl-' + it.kind.toLowerCase() + '" x="' + lx + '" y="16">' + esc(r.label) + "</text>");
    r.chips.forEach(function (c) {
      o.push('<g class="pchip" data-node="' + c.id + '"><rect x="' + (c.x - r.x) + '" y="4" width="' + c.w + '" height="16" rx="3"/>' +
             '<text x="' + (c.x - r.x + 4) + '" y="16">' + esc(c.text) + "</text></g>");
    });
    if (ms.some(function (m) { return m.socket; }))
      o.push('<circle class="socket" cx="' + (GEOM.TILE_W + 1) + '" cy="1" r="4"><title>' + esc(words.socket) + "</title></circle>");
    o.push("</g>");
  });
  o.push("</svg>");
  return o.join("");
}

/* the legend: each type's line and end mark, named */
export function legend(words) {
  words = words || WORDS;
  return '<div class="plegend">' + CONNECTORS.map(function (t) {
    var s = STYLE[t];
    return '<span class="pkey"><svg width="34" height="10" aria-hidden="true"><line x1="1" y1="5" x2="26" y2="5"' +
           (s.dash ? ' stroke-dasharray="' + s.dash + '"' : "") + ' style="stroke:var(' + s.token + ')" marker-end="url(#pm-' + t + ')"/></svg>' +
           esc(words.types[t]) + "</span>";
  }).join("") + "</div>";
}

/* ---- the page's binding ---- */
export function mountPlane(el, srcEl, opts) {
  opts = opts || {};
  var words = opts.words || WORDS, icons = opts.icons || null;
  var g = null, L = null, order = [], at = {}, copy = {}, current = null, zoom = 1;
  /* editing (EMS-003 ORD-0005): the page hands `edit(op, args)`, which
     answers a refusal by name or redraws; `admits(i)` the types a link takes,
     `known` the commands of the palette, `writes` the operator of each type,
     and `undo`/`redo` its own stack */
  var picking = null, also = [], status = "", statusSev = "";
  el.classList.add("plane");
  el.tabIndex = -1;

  function choose(id) {
    if (!id || !at[id]) return;
    srcEl.setSelectionRange(at[id].s, at[id].e);
  }
  function focusItem(id) {
    var node = el.querySelector('[data-node="' + id + '"].pn') || el.querySelector('[data-conn="' + id + '"]');
    if (!node) return;
    current = id;
    node.focus({ preventScroll: true });
    if (node.scrollIntoView) node.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
  function here() {
    var p = srcEl.selectionStart, best = null, width = Infinity;
    if (!L) return;
    /* the innermost node whose span holds the caret; where a call's
       expansion copies a definition the document holds, the copy carries the
       definition's span, and the node the author wrote wins the tie */
    L.rows.forEach(function (r) {
      var s = at[r.id];
      if (!s || s.s > p || p > s.e) return;
      var w = s.e - s.s;
      if (w < width || (w === width && best && copy[best] && !copy[r.id])) { best = r.id; width = w; }
    });
    var old = el.querySelector(".pn.here");
    if (old) old.classList.remove("here");
    var now = best && el.querySelector('#pn-' + best);
    if (now) now.classList.add("here");
    return best;
  }
  function scale() {
    var svg = el.querySelector(".plane-svg");
    if (!svg || !L) return;
    svg.setAttribute("width", Math.round(L.width * zoom));
    svg.setAttribute("height", Math.round(L.height * zoom));
  }

  /* a chosen node selects its span in the source; an operand chip selects
     the literal's own span, on its command's row */
  function edit(op, args) {
    if (!opts.edit) return;
    var r = opts.edit(op, args);
    if (r && r.refused) { status = words.tools.refused + ": " + r.refused + " \u2014 " + r.message; statusSev = "fix"; }
    else { status = words.tools.done; statusSev = "ok"; }
    picking = null;
    drawTools();
  }
  function opt(v, label, on) { return '<option value="' + esc(v) + '"' + (on ? " selected" : "") + ">" + esc(label) + "</option>"; }
  function btn(act, label, aria) {
    return '<button class="btn mini" type="button" data-act="' + act + '"' + (aria ? ' aria-label="' + esc(aria) + '"' : "") + ">" + esc(label) + "</button>";
  }
  function drawTools() {
    var bar = el.querySelector(".ptools");
    if (!bar || !opts.edit) return;
    var T = words.tools, h = [btn("undo", T.undo), btn("redo", T.redo)];
    var conn = current && current.charAt(0) === "c" && g && g.connectors[Number(current.slice(1))];
    var write = function (t) { return words.types[t] + (opts.writes && opts.writes[t] ? "  " + opts.writes[t] : ""); };
    if (picking) {
      h.push('<span class="pnow">' + esc(T.pick) + "</span>" + btn("cancel", T.cancel));
    } else if (conn) {
      var types = opts.admits ? opts.admits(Number(current.slice(1))) : [conn.type];
      h.push('<select data-in="type" aria-label="' + esc(T.retype) + '">' +
             types.map(function (t) { return opt(t, write(t), t === conn.type); }).join("") + "</select>" +
             btn("retype", T.retype) + btn("cut", T.cut) + btn("move", T.moveEnd));
    } else if (current && L && L.row[current]) {
      var it = find(current);
      if (it && it.parent !== null) {
        h.push('<select data-in="link" aria-label="' + esc(T.link) + '">' +
               CONNECTORS.map(function (t) { return opt(t, write(t), false); }).join("") + "</select>" + btn("link", T.link));
        if (it.kind === "Command")
          h.push('<input data-in="operand" size="12" aria-label="' + esc(T.operand) + '" placeholder="' + esc(T.operand) + '">' + btn("operand", T.write));
        h.push(btn("up", "\u2191", T.up) + btn("down", "\u2193", T.down) + btn("remove", T.remove));
        h.push('<select data-in="frame" aria-label="' + esc(T.wrap) + '">' +
               Object.keys(T.frames).map(function (k) { return opt(k, T.frames[k], false); }).join("") + "</select>" +
               '<input data-in="name" size="8" aria-label="' + esc(T.name) + '" placeholder="' + esc(T.name) + '">' +
               btn("wrap", T.wrap + (also.length ? " (" + (also.length + 1) + ")" : "")));
      }
      if (opts.known)
        h.push('<select data-in="cmd" aria-label="' + esc(T.place) + '">' +
               opts.known.map(function (k) { return opt(k, "[" + k.toLowerCase(), false); }).join("") + "</select>" + btn("place", T.place));
    }
    if (status) h.push('<span class="pstat sev-' + statusSev + '" role="status">' + esc(status) + "</span>");
    bar.innerHTML = h.join("");
  }
  function val(name) { var f = el.querySelector('.ptools [data-in="' + name + '"]'); return f ? f.value : ""; }
  el.addEventListener("click", function (ev) {
    var b = ev.target.closest ? ev.target.closest(".ptools [data-act]") : null;
    if (!b) return;
    var act = b.getAttribute("data-act"), ci = current && current.charAt(0) === "c" ? Number(current.slice(1)) : null;
    status = "";
    if (act === "undo" || act === "redo") { if (opts[act]) opts[act](); return; }
    if (act === "cancel") { picking = null; drawTools(); return; }
    if (act === "link") { picking = { op: "connect", type: val("link"), from: current }; drawTools(); return; }
    if (act === "move") { picking = { op: "move", connector: ci }; drawTools(); return; }
    if (act === "retype") return edit("retype", { connector: ci, type: val("type") });
    if (act === "cut") return edit("cut", { connector: ci });
    if (act === "operand") return edit("operand", { node: current, text: val("operand") });
    if (act === "up" || act === "down") return edit("reorder", { node: current, by: act === "up" ? -1 : 1 });
    if (act === "place") {
      var it = find(current);
      return edit("place", { canonical: val("cmd"), known: opts.known,
                             parent: it && (it.kind === "Command" || it.parent === null) ? current : null });
    }
    if (act === "wrap") return edit("wrap", { nodes: [current].concat(also), kind: val("frame"), name: val("name") });
    if (act === "remove") {
      /* a node that holds others asks first what happens to them */
      var holds = g.nodes.concat(g.containers).some(function (k) {
        return k.parent === current && (k.kind === "Command" || k.kind === "Template");
      });
      if (!holds) return edit("remove", { node: current });
      el.querySelector(".ptools").insertAdjacentHTML("beforeend", '<span class="pnow">' +
        btn("lift", words.tools.lift) + btn("drop", words.tools.drop) + "</span>");
      return;
    }
    if (act === "lift" || act === "drop") return edit("remove", { node: current, how: act });
  });
  el.addEventListener("click", function (ev) {
    if (ev.target.closest && ev.target.closest(".ptools")) return;
    var n = ev.target.closest ? ev.target.closest("[data-conn], .pchip, .pn") : null;
    if (!n) return;
    /* the other end of a link being made or moved */
    if (picking && !n.hasAttribute("data-conn")) {
      var end = n.getAttribute("data-node"), pk = picking;
      if (pk.op === "connect") return edit("connect", { from: pk.from, to: end, type: pk.type });
      return edit("move", { connector: pk.connector, node: end });
    }
    /* shift adds a sibling to what a frame will wrap */
    if (ev.shiftKey && n.classList.contains("pn") && current && current !== n.getAttribute("data-node")) {
      also.push(n.getAttribute("data-node"));
      drawTools();
      return;
    }
    also = [];
    if (n.hasAttribute("data-conn")) { focusItem(n.getAttribute("data-conn")); return; }
    var row = n.classList.contains("pchip") ? n.closest(".pn") : n;
    focusItem(row.getAttribute("data-node"));
    choose(n.getAttribute("data-node"));
  });
  el.addEventListener("keydown", function (ev) {
    if (ev.target.closest && ev.target.closest(".ptools")) return;
    if ((ev.ctrlKey || ev.metaKey) && (ev.key === "z" || ev.key === "Z" || ev.key === "y")) {
      var redo = ev.key === "y" || ev.shiftKey;
      if (opts[redo ? "redo" : "undo"]) opts[redo ? "redo" : "undo"]();
      ev.preventDefault();
      return;
    }
    if (ev.key === "Escape" && picking) { picking = null; drawTools(); return; }
    if (ev.key === "Delete" && current && L && L.row[current] && opts.edit) { edit("remove", { node: current }); return; }
    if (!order.length) return;
    var i = Math.max(0, order.indexOf(current));
    var go = null;
    switch (ev.key) {
      case "ArrowDown": go = order[Math.min(order.length - 1, i + 1)]; break;
      case "ArrowUp": go = order[Math.max(0, i - 1)]; break;
      case "Home": go = order[0]; break;
      case "End": go = order[order.length - 1]; break;
      case "ArrowLeft": {
        var it = g && find(current);
        if (it && it.parent !== null && L.row[it.parent]) go = it.parent;
        break;
      }
      case "ArrowRight": {
        var kid = g && g.containers.concat(g.nodes).filter(function (k) { return k.parent === current && L.row[k.id]; })
          .sort(function (a, b) { return Number(a.id.slice(1)) - Number(b.id.slice(1)); })[0];
        if (kid) go = kid.id;
        break;
      }
      case "Enter": case " ": choose(L.row[current] ? current : null); ev.preventDefault(); return;
      case "+": case "=": zoom = Math.min(3, zoom * 1.25); scale(); ev.preventDefault(); return;
      case "-": zoom = Math.max(0.3, zoom / 1.25); scale(); ev.preventDefault(); return;
      case "0": zoom = 1; scale(); ev.preventDefault(); return;
      default: return;
    }
    ev.preventDefault();
    if (go) focusItem(go);
  });
  el.addEventListener("focusin", function (ev) {
    if (ev.target.closest && (ev.target.closest(".pn") || ev.target.closest(".pc"))) drawTools();
  });
  el.addEventListener("focus", function () { if (order.length) focusItem(current && order.indexOf(current) !== -1 ? current : order[0]); });
  ["select", "keyup", "click", "input"].forEach(function (k) { srcEl.addEventListener(k, here); });

  function find(id) {
    var all = g.containers.concat(g.nodes);
    for (var k = 0; k < all.length; k++) if (all[k].id === id) return all[k];
    return null;
  }

  return {
    /* draw the envelope's graph; a refusal is shown, never swallowed */
    update: function (env) {
      try {
        g = graphOf(env);
      } catch (e) {
        g = null; L = null; order = [];
        el.innerHTML = '<div class="gap fix"><span class="bar"></span><span class="txt">' + esc(e.message) + "</span></div>";
        return null;
      }
      L = layout(g, opts.positions);
      order = walkOrder(g, L);
      at = {}; copy = {};
      g.containers.concat(g.nodes).forEach(function (it) {
        if (it.at) at[it.id] = it.at;
        var up = it.parent !== null ? find(it.parent) : null;
        copy[it.id] = !!up && (copy[up.id] || (up.kind === "Template" && up.data.expanded === true));
      });
      /* a diagnostic with no span lands on the package: one mark per code,
         with how many times it was raised */
      var loose = {}, keys = [];
      g.marks.forEach(function (m) {
        if (m.node) return;
        var k = m.severity + " " + m.code;
        if (!loose[k]) { loose[k] = { m: m, n: 0 }; keys.push(k); }
        loose[k].n++;
      });
      var head = keys.length
        ? '<div class="pmarks"><span class="none">' + esc(words.onPackage) + "</span>" + keys.map(function (k) {
            var m = loose[k].m, n = loose[k].n;
            return '<span class="pmark sev-' + m.severity + '">' + esc(words.sev[m.severity]) + " " + esc(m.code) +
                   (n > 1 ? " ×" + n : "") + "</span>";
          }).join("") + "</div>"
        : "";
      el.innerHTML = (opts.edit ? '<div class="ptools" role="toolbar" aria-label="' + esc(words.tools.bar) + '"></div>' : "") +
        legend(words) + head + '<div class="pscroll">' + render(g, L, icons, words) + "</div>";
      if (order.indexOf(current) === -1) current = order[0] || null;
      el.querySelectorAll(".pn, .pc").forEach(function (n) { n.addEventListener("focus", function () { current = n.getAttribute("data-node") || n.getAttribute("data-conn"); }); });
      scale();
      here();
      drawTools();
      return { nodes: L.rows.length, chips: Object.keys(L.chipOf).length, frames: L.frames.length, connectors: g.connectors.length };
    },
    choose: choose, here: here, order: function () { return order.slice(); },
    /* the interface's words, which follow its language */
    words: function (w) { words = w || WORDS; }
  };
}
