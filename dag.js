#!/usr/bin/env node
// Calcula camadas do Glyph a partir de um arquivo de expansoes.
// Uso: node dag.js expansoes.txt
// Formato de cada linha:  cmd = cmd1 cmd2 cmd3      (expansao)
//                         cmd = BASE                (hieroglifo, nao expande)
// Linhas vazias e as que comecam com # sao ignoradas.

const fs = require("fs");
const file = process.argv[2] || "expansoes.txt";
const src = fs.readFileSync(file, "utf8");

const def = {};                      // cmd -> [deps]
const base = new Set();
src.split(/\r?\n/).forEach((ln, i) => {
  const s = ln.trim();
  if (!s || s.startsWith("#")) return;
  const m = /^([A-Za-z_][\w-]*)\s*=\s*(.+)$/.exec(s);
  if (!m) { console.error("linha " + (i+1) + " ignorada (formato): " + s); return; }
  const lhs = m[1].toUpperCase();
  const rhs = m[2].trim();
  if (/^BASE$/i.test(rhs)) { base.add(lhs); def[lhs] = []; return; }
  def[lhs] = rhs.toUpperCase().match(/[A-Z_][\w-]*/g) || [];
});

const all = new Set(Object.keys(def));
Object.values(def).forEach(ds => ds.forEach(d => all.add(d)));

// 1. dependencias nunca definidas
const undef = [...all].filter(c => !(c in def)).sort();

// 2. deteccao de ciclos (DFS com pilha)
const WHITE=0, GRAY=1, BLACK=2, color={}, cycles=[];
[...all].forEach(c => color[c]=WHITE);
function dfs(node, path) {
  if (color[node]===GRAY) { cycles.push(path.slice(path.indexOf(node)).concat(node)); return; }
  if (color[node]===BLACK) return;
  color[node]=GRAY; path.push(node);
  (def[node]||[]).forEach(d => dfs(d, path));
  path.pop(); color[node]=BLACK;
}
[...all].sort().forEach(c => { if (color[c]===WHITE) dfs(c, []); });

// 3. camadas: profundidade = 1 + max(profundidade das deps). Hieroglifo = 0.
const depth = {}, unresolvable = new Set(cycles.flat());
function d(node, seen) {
  if (node in depth) return depth[node];
  if (unresolvable.has(node) || !(node in def)) return null;
  seen = seen || new Set();
  if (seen.has(node)) return null;
  seen.add(node);
  const ds = def[node];
  if (!ds.length) return (depth[node]=0);
  let mx = -1;
  for (const x of ds) { const v = d(x, seen); if (v===null) return null; if (v>mx) mx=v; }
  return (depth[node] = mx+1);
}
[...all].sort().forEach(c => d(c));

// --- saida ---
const NAMES = {0:"hieroglifo", 1:"primitivo", 2:"composto", 3:"composto-2", 4:"composto-3"};
const byDepth = {};
Object.keys(depth).sort().forEach(c => { (byDepth[depth[c]] = byDepth[depth[c]]||[]).push(c); });

console.log("=== CAMADAS (por ordenacao topologica) ===");
Object.keys(byDepth).map(Number).sort((a,b)=>a-b).forEach(k => {
  console.log("\nnivel " + k + "  [" + (NAMES[k]||("composto-"+(k-1))) + "]  (" + byDepth[k].length + ")");
  console.log("  " + byDepth[k].join(" "));
});

if (undef.length) {
  console.log("\n=== DEPENDENCIAS NUNCA DEFINIDAS (" + undef.length + ") ===");
  console.log("  " + undef.join(" "));
  console.log("  -> ou sao hieroglifos (declare '= BASE') ou faltam expansoes.");
}
if (cycles.length) {
  console.log("\n=== CICLOS (" + cycles.length + ") — camada indefinivel ===");
  cycles.forEach(c => console.log("  " + c.join(" -> ")));
  console.log("  -> quebre cada ciclo promovendo um dos membros a '= BASE'.");
}
const semCamada = [...all].filter(c => !(c in depth)).sort();
if (semCamada.length) {
  console.log("\n=== SEM CAMADA ATRIBUIVEL (" + semCamada.length + ") ===");
  console.log("  " + semCamada.join(" "));
}
console.log("\nresumo: " + Object.keys(depth).length + " com camada, " +
  undef.length + " indefinidos, " + cycles.length + " ciclos.");
