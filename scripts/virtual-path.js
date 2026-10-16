#!/usr/bin/env node
/**
 * virtual-path — layers 1 to 4 of the plan's §0: an address for every
 * structural slice of `.guidelines/`, an identity that survives a move, an
 * order that answers before(a, b), and the offsets of every slice.
 *
 *   node virtual-path.js                 rebuild .guidelines/.shortcuts/.virtual/index.json
 *   node virtual-path.js --check         exit 1 on a breach; prints nothing on success
 *   node virtual-path.js resolve <vp>    the slice, prefixed with its own address and offsets
 *   node virtual-path.js node <vp>       the node: id, parent, prev, next, depth, [start, end)
 *   node virtual-path.js before <a> <b>  true when a comes before b
 *   node virtual-path.js above <vp>      what comes above: the ancestors, then the earlier siblings
 *   node virtual-path.js list <file>     every structural address of a file, in document order
 *
 * A virtual path is `<file>#<selector>`, the file relative to the repository.
 * The extension picks the grammar of the selector, so `#` is the only
 * delimiter (INTAKE-VIRTUAL-PATH §10, hole 1):
 *
 *   .md    #slug             a heading, slugged as GitHub does, -1 -2 for repeats;
 *                            the slice runs to the next heading of the same or a higher level
 *   .json  #/a/b/0           a JSON Pointer, RFC 6901, `~0` and `~1` escaped; one node only
 *   .xml   #/root/item[2]    element names from the root, `[n]` when siblings share the name
 *   any    #@block:name      the lines between a line holding only `@block:name` and one
 *                            holding only `@endblock:name`, behind any comment prefix; no nesting
 *   any    (no selector)     the whole file
 *
 * Laws. A selector that resolves to zero nodes or to several is an error,
 * never an empty slice. The index is JSON, written here and read by anyone.
 * Coverage is closed: every file of `.guidelines/` is in the index, except the
 * folder that holds the index and the hooks' state, `.shortcuts/.virtual/`, and
 * every entry resolves to content that is not empty.
 *
 * Identity. A structural node — a heading, an element, an object or array, a
 * block, a file — carries a NodeID kept from one rebuild to the next: first by
 * the same file and selector, then by the digest of its slice, so a slice
 * moved inside its file, or carried whole to another file, keeps its id; a
 * heading renamed is a new slice, because the heading is part of it. A JSON leaf resolves by pointer and has no id
 * of its own. The digest is identity metadata; it is not the fingerprint of
 * layer 5, which waits for its own measurement.
 *
 * Order. Within a file, each node carries a label from an order-maintenance
 * list: before(a, b) is one comparison, O(1). Labels are kept across rebuilds
 * for the longest run of nodes still in order, and only the k nodes that moved
 * or arrived get new ones. Between files, the order is the order of the paths.
 *
 * Offsets are UTF-16 code units of the text with CRLF read as LF, so an index
 * written on Windows holds on a clone with LF endings.
 */
"use strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX = ".guidelines/.shortcuts/.virtual/index.json";
const SKIP = ".guidelines/.shortcuts/.virtual/";
const STEP = 1 << 16, SPACE = 2 ** 48;
/* a known loss, pinned with its reason: the gate fails on any other empty
   file, and on this one the day it holds something */
const KNOWN_EMPTY = new Map([
  [".guidelines/.history/study.md", "empty since the initial commit 2bb1f01, carried into the attic twice; the attic is the Regent's to prune"]
]);

const rel = (root, p) => path.relative(root, p).split(path.sep).join("/");
const readText = (root, file) => fs.readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");
const digest = s => crypto.createHash("sha1").update(s).digest("hex").slice(0, 12);
const formatOf = file => {
  const x = path.extname(file).toLowerCase();
  return x === ".md" ? "md" : x === ".json" ? "json" : x === ".xml" ? "xml" : "text";
};
const BINARY = /\.(zip|ico|png|jpe?g|gif|pdf|exe|dll|wasm)$/i;

class VPError extends Error {}

/* ------------------------------------------------------------------ *
 * layer 1 — a tree per format. Each parser returns nodes in document
 * order: { sel, kind, parentIx, start, end }, the file root first.
 * ------------------------------------------------------------------ */

export function slugOf(text) {
  return text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").trim().toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, "").replace(/ /g, "-");
}

function mdTree(text) {
  const nodes = [{ sel: "", kind: "file", parentIx: -1, start: 0, end: text.length, level: 0 }];
  const seen = new Map(), stack = [0];
  let fence = null, at = 0;
  for (const line of text.split("\n")) {
    const f = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (f) { if (!fence) fence = f[1][0]; else if (f[1][0] === fence) fence = null; }
    else if (!fence) {
      const h = /^(#{1,6})[ \t]+(.*?)[ \t#]*$/.exec(line);
      if (h) {
        const level = h[1].length, base = slugOf(h[2]);
        const n = seen.get(base) || 0; seen.set(base, n + 1);
        while (nodes[stack[stack.length - 1]].level >= level) {
          nodes[stack.pop()].end = at;
        }
        nodes.push({ sel: n ? base + "-" + n : base, kind: "heading", parentIx: stack[stack.length - 1],
                     start: at, end: text.length, level });
        stack.push(nodes.length - 1);
      }
    }
    at += line.length + 1;
  }
  return nodes;
}

function jsonTree(text) {
  const nodes = [{ sel: "", kind: "file", parentIx: -1, start: 0, end: text.length }];
  let i = 0;
  const ws = () => { while (i < text.length && /\s/.test(text[i])) i++; };
  const str = () => {
    const s = i++;
    while (text[i] !== '"') { if (text[i] === "\\") i++; i++; if (i > text.length) throw new VPError("unterminated string at " + s); }
    i++;
    return JSON.parse(text.slice(s, i));
  };
  const esc = k => k.replace(/~/g, "~0").replace(/\//g, "~1");
  const value = (ptr, parentIx) => {
    ws();
    const c = text[i], start = i;
    if (c === "{" || c === "[") {
      let me = parentIx;
      if (ptr !== "") { nodes.push({ sel: ptr, kind: c === "{" ? "object" : "array", parentIx, start, end: -1 }); me = nodes.length - 1; }
      i++; ws();
      let n = 0;
      if (text[i] === (c === "{" ? "}" : "]")) { i++; }
      else for (;;) {
        let key = String(n++);
        if (c === "{") { ws(); key = str(); ws(); if (text[i++] !== ":") throw new VPError("expected : at " + (i - 1)); }
        value(ptr + "/" + esc(key), me);
        ws();
        const d = text[i++];
        if (d === ",") continue;
        if (d === (c === "{" ? "}" : "]")) break;
        throw new VPError("unexpected " + JSON.stringify(d) + " at " + (i - 1));
      }
      if (ptr !== "") nodes[me].end = i;
      else { nodes[0].start = start; nodes[0].end = i; }
    } else if (c === '"') str();
    else { const m = /^-?\d+(\.\d+)?([eE][+-]?\d+)?|^true|^false|^null/.exec(text.slice(i, i + 40)); if (!m) throw new VPError("bad value at " + i); i += m[0].length; }
  };
  value("", 0);
  return nodes;
}

function xmlTree(text) {
  const nodes = [{ sel: "", kind: "file", parentIx: -1, start: 0, end: text.length }];
  const stack = [{ ix: 0, path: "", counts: new Map() }];
  const re = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<\/([A-Za-z_][\w.:-]*)\s*>|<([A-Za-z_][\w.:-]*)(?:\s(?:[^>"']|"[^"]*"|'[^']*')*?)?(\/?)>/g;
  let m;
  while ((m = re.exec(text))) {
    if (m[1]) {
      const top = stack.pop();
      if (!top || stack.length === 0 || nodes[top.ix].name !== m[1]) throw new VPError("unbalanced </" + m[1] + "> at " + m.index);
      nodes[top.ix].end = m.index + m[0].length;
    } else if (m[2]) {
      const up = stack[stack.length - 1], n = (up.counts.get(m[2]) || 0) + 1;
      up.counts.set(m[2], n);
      nodes.push({ sel: null, name: m[2], nth: n, kind: "element", parentIx: up.ix, start: m.index, end: -1, up });
      const ix = nodes.length - 1;
      if (m[3]) nodes[ix].end = m.index + m[0].length;
      else stack.push({ ix, counts: new Map() });
    }
  }
  if (stack.length !== 1) throw new VPError("unclosed <" + nodes[stack[stack.length - 1].ix].name + ">");
  for (const n of nodes) if (n.kind === "element") {
    const p = nodes[n.parentIx], many = n.up.counts.get(n.name) > 1;
    n.sel = (p.kind === "file" ? "" : p.sel) + "/" + n.name + (many ? "[" + n.nth + "]" : "");
    delete n.up;
  }
  return nodes;
}

const MARK = /^\s*(?:\/\/|#|--|<!--|\/\*|;|%|\*)?\s*@(end)?block:([A-Za-z0-9._-]+)\s*(?:-->|\*\/)?\s*$/;

function blocks(text) {
  const out = [];
  let open = null, at = 0;
  for (const line of text.split("\n")) {
    const m = MARK.exec(line);
    if (m && !m[1]) {
      if (open) throw new VPError("@block:" + m[2] + " opens inside @block:" + open.name + "; blocks do not nest");
      open = { name: m[2], start: at + line.length + 1 };
    } else if (m && m[1]) {
      if (!open || open.name !== m[2]) throw new VPError("@endblock:" + m[2] + " closes nothing");
      out.push({ sel: "@block:" + m[2], kind: "block", start: open.start, end: at });
      open = null;
    }
    at += line.length + 1;
  }
  if (open) throw new VPError("@block:" + open.name + " never closes");
  return out;
}

/* the whole tree of a file: the format's nodes, then its blocks, each under
   the deepest node that contains it */
export function treeOf(text, file) {
  const fmt = formatOf(file);
  const nodes = fmt === "md" ? mdTree(text) : fmt === "json" ? jsonTree(text) : fmt === "xml" ? xmlTree(text)
    : [{ sel: "", kind: "file", parentIx: -1, start: 0, end: text.length }];
  for (const b of blocks(text)) {
    let p = 0;
    for (let k = 1; k < nodes.length; k++) if (nodes[k].start <= b.start && b.end <= nodes[k].end) p = k;
    nodes.push(Object.assign(b, { parentIx: p }));
  }
  const order = nodes.map((n, k) => k).sort((a, b) => nodes[a].start - nodes[b].start || nodes[b].end - nodes[a].end || a - b);
  const remap = new Map(order.map((k, j) => [k, j]));
  return order.map(k => Object.assign({}, nodes[k], { parentIx: nodes[k].parentIx < 0 ? -1 : remap.get(nodes[k].parentIx) }));
}

/* ------------------------------------------------------------------ *
 * resolution — cardinality 1, and a JSON leaf by pointer
 * ------------------------------------------------------------------ */

export function split(vp) {
  const h = vp.indexOf("#");
  return h === -1 ? { file: vp, sel: "" } : { file: vp.slice(0, h), sel: vp.slice(h + 1) };
}

export function resolveIn(text, file, sel) {
  const tree = treeOf(text, file);
  let hits = tree.filter(n => n.sel === sel);
  if (!hits.length && formatOf(file) === "xml" && sel) {
    const want = sel.split("/").slice(1);
    hits = tree.filter(n => n.kind === "element" &&
      n.sel.split("/").slice(1).map(s => s.replace(/\[\d+\]$/, "")).join("/") === want.join("/"));
    if (hits.length > 1) throw new VPError(file + "#" + sel + " resolves to " + hits.length + " elements; name one with [n]");
  }
  if (!hits.length && formatOf(file) === "json" && sel.startsWith("/")) {
    const v = jsonLeaf(text, sel);
    if (v) return v;
  }
  if (!hits.length) throw new VPError(file + "#" + sel + " resolves to nothing");
  if (hits.length > 1) throw new VPError(file + "#" + sel + " resolves to " + hits.length + " nodes");
  return { start: hits[0].start, end: hits[0].end, node: hits[0] };
}

function jsonLeaf(text, ptr) {
  const keys = ptr.split("/").slice(1).map(k => k.replace(/~1/g, "/").replace(/~0/g, "~"));
  const last = keys.pop(), parentSel = keys.length ? "/" + keys.map(k => k.replace(/~/g, "~0").replace(/\//g, "~1")).join("/") : "";
  const tree = treeOf(text, "leaf.json");
  const p = tree.find(n => n.sel === parentSel);
  if (!p) return null;
  const doc = JSON.parse(text.slice(p.start, p.end));
  if (doc === null || typeof doc !== "object" || !(last in doc)) return null;
  const want = JSON.stringify(doc[last]);
  /* the leaf's span: scan the parent's members in order */
  let i = p.start + 1, n = 0;
  const skipWs = () => { while (/\s/.test(text[i])) i++; };
  const endOfValue = () => {
    let depth = 0, inStr = false;
    for (; i < p.end; i++) {
      const c = text[i];
      if (inStr) { if (c === "\\") i++; else if (c === '"') inStr = false; continue; }
      if (c === '"') inStr = true;
      else if (c === "{" || c === "[") depth++;
      else if (c === "}" || c === "]") { if (depth === 0) return; depth--; }
      else if (c === "," && depth === 0) return;
    }
  };
  for (;;) {
    skipWs();
    let key = String(n++);
    if (text[p.start] === "{") {
      const s = i; i++; while (text[i] !== '"') { if (text[i] === "\\") i++; i++; } i++;
      key = JSON.parse(text.slice(s, i)); skipWs(); i++; skipWs();
    }
    const s = i; endOfValue();
    let e = i; while (/\s/.test(text[e - 1])) e--;
    if (key === last && JSON.stringify(JSON.parse(text.slice(s, e))) === want) return { start: s, end: e, node: null };
    if (text[i] !== ",") return null;
    i++;
  }
}

/* ------------------------------------------------------------------ *
 * layers 2 and 3 — identity kept, labels kept
 * ------------------------------------------------------------------ */

function listFiles(root) {
  const out = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name), r = rel(root, p);
      if (e.isDirectory()) { if (!(r + "/").startsWith(SKIP)) walk(p); }
      else out.push(r);
    }
  })(path.join(root, ".guidelines"));
  return out.sort();
}

/* longest increasing subsequence of labels, by index; O(n log n) */
function keepers(labels) {
  const tails = [], prev = new Array(labels.length).fill(-1), tailIx = [];
  labels.forEach((v, k) => {
    if (v == null) return;
    let lo = 0, hi = tails.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (tails[mid] < v) lo = mid + 1; else hi = mid; }
    tails[lo] = v; tailIx[lo] = k; prev[k] = lo ? tailIx[lo - 1] : -1;
  });
  const keep = new Set();
  for (let k = tailIx[tails.length - 1]; k !== undefined && k !== -1; k = prev[k]) keep.add(k);
  return keep;
}

function label(seq) {
  const keep = keepers(seq.map(n => n.label));
  let relabels = 0;
  const out = seq.map((n, k) => keep.has(k) ? n.label : null);
  for (let k = 0; k < out.length; k++) {
    if (out[k] !== null) continue;
    const lo = k ? out[k - 1] : 0;
    let j = k; while (j < out.length && out[j] === null) j++;
    const hi = j < out.length ? out[j] : Math.max(lo, 0) + STEP * (j - k + 1);
    const gap = (hi - lo) / (j - k + 1);
    if (gap < 1) { relabels = out.length; return { labels: seq.map((n, x) => (x + 1) * STEP), relabels }; }
    for (let x = k; x < j; x++) out[x] = Math.floor(lo + gap * (x - k + 1));
    relabels += j - k; k = j - 1;
  }
  if (out.length && out[out.length - 1] >= SPACE) return { labels: seq.map((n, x) => (x + 1) * STEP), relabels: out.length };
  return { labels: out, relabels };
}

export function build(root = ROOT, old = null) {
  const prior = old || { next: 1, files: {} };
  const oldByKey = new Map(), oldByDigest = new Map(), used = new Set();
  for (const [file, f] of Object.entries(prior.files)) for (const n of f.nodes || []) {
    oldByKey.set(file + "#" + n.sel + "|" + n.kind, Object.assign({ file }, n));
    if (n.key) { const l = oldByDigest.get(n.kind + n.key) || []; l.push(Object.assign({ file }, n)); oldByDigest.set(n.kind + n.key, l); }
  }
  let next = prior.next || 1;
  const files = {}, errors = [], pending = [];
  for (const file of listFiles(root)) {
    if (BINARY.test(file)) { files[file] = { format: "binary", bytes: fs.statSync(path.join(root, file)).size }; continue; }
    const text = readText(root, file);
    let tree;
    try { tree = treeOf(text, file); } catch (e) { if (e instanceof VPError) { errors.push(file + ": " + e.message); continue; } throw e; }
    const nodes = tree.map((t, k) => ({ sel: t.sel, kind: t.kind, parentIx: t.parentIx, start: t.start, end: t.end,
                                         key: digest(text.slice(t.start, t.end)), k }));
    for (const n of nodes) {
      const o = oldByKey.get(file + "#" + n.sel + "|" + n.kind);
      if (o && !used.has(o.id)) { n.id = o.id; n.label = o.file === file ? o.label : null; used.add(o.id); }
    }
    pending.push({ file, nodes });
    files[file] = { format: formatOf(file), nodes };
  }
  /* a slice moved or renamed: the same digest, unique on both sides */
  const fresh = new Map();
  for (const p of pending) for (const n of p.nodes) if (!n.id) { const l = fresh.get(n.kind + n.key) || []; l.push({ p, n }); fresh.set(n.kind + n.key, l); }
  for (const [dk, l] of fresh) {
    const cand = (oldByDigest.get(dk) || []).filter(o => !used.has(o.id));
    if (l.length === 1 && cand.length === 1) {
      l[0].n.id = cand[0].id; l[0].n.label = cand[0].file === l[0].p.file ? cand[0].label : null; used.add(cand[0].id);
    }
  }
  let relabels = 0;
  for (const p of pending) {
    for (const n of p.nodes) if (!n.id) n.id = "n" + (next++).toString(36);
    const L = label(p.nodes); relabels += L.relabels;
    p.nodes.forEach((n, k) => { n.label = L.labels[k]; });
    const kids = new Map();
    p.nodes.forEach(n => { if (n.parentIx >= 0) { const l = kids.get(n.parentIx) || []; l.push(n); kids.set(n.parentIx, l); } });
    p.nodes.forEach(n => {
      n.parent = n.parentIx >= 0 ? p.nodes[n.parentIx].id : null;
      n.depth = n.parentIx >= 0 ? p.nodes[n.parentIx].depth + 1 : 0;
      const sib = n.parentIx >= 0 ? kids.get(n.parentIx) : [n], at = sib.indexOf(n);
      n.prev = at > 0 ? sib[at - 1].id : null;
      n.next = at < sib.length - 1 ? sib[at + 1].id : null;
    });
    files[p.file].nodes = p.nodes.map(n => ({ id: n.id, sel: n.sel, kind: n.kind, parent: n.parent, prev: n.prev, next: n.next,
                                              depth: n.depth, start: n.start, end: n.end, label: n.label, key: n.key }));
  }
  return { index: { schema: 1, next, files }, errors, relabels };
}

/* one node per line, so a rebuild's diff names the nodes that moved */
export function serialise(index) {
  const out = ['{', '  "schema": ' + index.schema + ',', '  "next": ' + index.next + ',', '  "files": {'];
  const names = Object.keys(index.files);
  names.forEach((file, i) => {
    const f = index.files[file], end = i < names.length - 1 ? "," : "";
    if (f.format === "binary") { out.push("    " + JSON.stringify(file) + ': { "format": "binary", "bytes": ' + f.bytes + " }" + end); return; }
    out.push("    " + JSON.stringify(file) + ': { "format": ' + JSON.stringify(f.format) + ', "nodes": [');
    f.nodes.forEach((n, k) => out.push("      " + JSON.stringify(n) + (k < f.nodes.length - 1 ? "," : "")));
    out.push("    ] }" + end);
  });
  out.push("  }", "}");
  return out.join("\n") + "\n";
}

/* ------------------------------------------------------------------ *
 * layer 4 — offsets, and the queries
 * ------------------------------------------------------------------ */

export function open(root = ROOT, index = null) {
  const ix = index || JSON.parse(fs.readFileSync(path.join(root, INDEX), "utf8"));
  const byId = new Map(), bySel = new Map();
  for (const [file, f] of Object.entries(ix.files)) for (const n of f.nodes || []) {
    const e = Object.assign({ file }, n); byId.set(n.id, e); bySel.set(file + "#" + n.sel, e);
  }
  const nodeOf = vp => {
    const { file, sel } = split(vp);
    const n = bySel.get(file + "#" + sel);
    if (!n) throw new VPError(vp + " is not a structural node of the index");
    return n;
  };
  const before = (a, b) => a.file === b.file ? a.label < b.label : a.file < b.file;
  return {
    byId, nodeOf, before: (va, vb) => before(nodeOf(va), nodeOf(vb)),
    above(vp) {
      const n = nodeOf(vp), out = [];
      for (let p = n.parent && byId.get(n.parent); p; p = p.parent && byId.get(p.parent)) out.push(p);
      for (let s = n.prev && byId.get(n.prev); s; s = s.prev && byId.get(s.prev)) out.push(s);
      return out;
    },
    extract(vp) {
      const { file, sel } = split(vp);
      const text = readText(root, file);
      const r = resolveIn(text, file, sel);
      const slice = text.slice(r.start, r.end);
      if (!slice.trim()) throw new VPError(vp + " resolves to an empty slice");
      return { vp, start: r.start, end: r.end, text: slice };
    }
  };
}

export function check(root = ROOT) {
  const breaches = [];
  let committed = null;
  try { committed = fs.readFileSync(path.join(root, INDEX), "utf8"); } catch (e) { breaches.push(INDEX + " is missing"); }
  const old = committed ? JSON.parse(committed) : null;
  const { index, errors } = build(root, old);
  breaches.push(...errors);
  for (const [file, f] of Object.entries(index.files)) {
    if (f.format === "binary") { if (!f.bytes) breaches.push(file + " is empty"); continue; }
    const text = readText(root, file);
    if (KNOWN_EMPTY.has(file)) {
      if (text.trim()) breaches.push(file + " is pinned as empty and now holds content: invert the pin in KNOWN_EMPTY");
      continue;
    }
    for (const n of f.nodes) if (!text.slice(n.start, n.end).trim()) breaches.push(file + "#" + n.sel + " resolves to an empty slice");
  }
  if (old) {
    for (const file of Object.keys(index.files)) if (!old.files[file]) breaches.push(file + " is not in the index");
    for (const file of Object.keys(old.files)) if (!index.files[file]) breaches.push(file + " is in the index and not on disk");
    if (committed.replace(/\r\n/g, "\n") !== serialise(index)) breaches.push("the index is behind the files: run node scripts/virtual-path.js");
  }
  return breaches;
}

function main() {
  const [cmd, a, b] = process.argv.slice(2);
  try {
    if (!cmd) {
      let old = null; try { old = JSON.parse(fs.readFileSync(path.join(ROOT, INDEX), "utf8")); } catch (e) {}
      const { index, errors, relabels } = build(ROOT, old);
      if (errors.length) { errors.forEach(e => console.error("  ✗ " + e)); process.exit(1); }
      fs.writeFileSync(path.join(ROOT, INDEX), serialise(index));
      const count = Object.values(index.files).reduce((s, f) => s + (f.nodes ? f.nodes.length : 0), 0);
      console.log(INDEX + ": " + Object.keys(index.files).length + " files, " + count + " nodes, " + relabels + " labels written");
    } else if (cmd === "--check") {
      const breaches = check(ROOT);
      if (breaches.length) { breaches.forEach(x => console.error("  ✗ " + x)); process.exit(1); }
    } else if (cmd === "resolve") {
      const r = open(ROOT).extract(a);
      process.stdout.write("<!-- " + r.vp + " [" + r.start + ", " + r.end + ") -->\n" + r.text + (r.text.endsWith("\n") ? "" : "\n"));
    } else if (cmd === "node") {
      console.log(JSON.stringify(open(ROOT).nodeOf(a), null, 2));
    } else if (cmd === "before") {
      console.log(String(open(ROOT).before(a, b)));
    } else if (cmd === "list") {
      const f = JSON.parse(fs.readFileSync(path.join(ROOT, INDEX), "utf8")).files[a];
      if (!f || !f.nodes) throw new VPError(a + " is not a text file of the index");
      for (const n of f.nodes) console.log("  ".repeat(n.depth) + a + (n.sel ? "#" + n.sel : "") + "  " + n.kind);
    } else if (cmd === "above") {
      for (const n of open(ROOT).above(a)) console.log(n.file + (n.sel ? "#" + n.sel : ""));
    } else { console.error("unknown command: " + cmd); process.exit(2); }
  } catch (e) {
    if (e instanceof VPError) { console.error("  ✗ " + e.message); process.exit(1); }
    throw e;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
