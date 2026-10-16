#!/usr/bin/env node
/**
 * measure-coupling — does a repository's history show the staleness a
 * virtual-path index exists to catch?
 *
 *   node measure-coupling.js [repo] [--since <commit>] [--json]
 *
 * Three measures over the commits reachable from HEAD, chronological, merges
 * left out. Nothing here knows what a `.pgml` is: any repository path can be
 * handed to it. The thresholds are the ones INTAKE-VIRTUAL-PATH §6 stamped on
 * 2026-09-11, and they live in this file so that the commit that adds or moves
 * them comes before the commit that records a number.
 *
 * Universe
 *   code  `*.js`, `*.mjs`, `*.rs`; the `js` arm keeps `*.js` alone, as in §6
 *   doc   `*.md`, except `CHANGELOG.md` and files named `CHANGELIST*`
 *   generated, out of every measure: `scripts/glyph-data.js`, `.claude/skills/**`,
 *         `EXAMPLES.md` — rebuilt by a script, so they co-change by construction
 *   mass  a commit touching more than 15 files is out of M3 — moves and renames
 *         carry unrelated files together
 *   key   M1 and M3 by basename, as §6, and by path as a second arm
 *
 * M1 — staleness base rate. A commit touching code is co-updated when it also
 *   touches a doc; lagged when it does not and a doc-only commit follows within
 *   k = 3; unpaired otherwise, reported and never folded.
 *   rate = lagged / (co-updated + lagged).
 *   < 10 % stop · ≥ 25 % justified · between, M2 decides.
 * M2 — edit locality. Each doc edit of a file that existed before with ≥ 5
 *   lines: (added + deleted) / lines before. The distribution, never the mean.
 *   median < 20 % anchors buy scope · > 50 % anchors are dead metadata.
 * M3 — co-change coupling. For each (code, doc) pair, support = commits
 *   touching both, lift = P(both) / (P(code) · P(doc)).
 *   ≥ 1 pair with lift > 2 and support ≥ 3 → a coupling exists to index.
 */
"use strict";
import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";

const argv = process.argv.slice(2);
const flag = n => { const i = argv.indexOf(n); return i === -1 ? null : (argv[i + 1] || ""); };
const JSON_OUT = argv.indexOf("--json") !== -1;
const SINCE = flag("--since");
const REPO = path.resolve(argv.find((a, i) => !a.startsWith("--") && argv[i - 1] !== "--since") || ".");

const K = 3, K_SPREAD = [1, 2, 3, 5, 8], MASS = 15, MIN_LINES = 5;
const T = { m1Stop: 0.10, m1Go: 0.25, m2Scope: 0.20, m2Dead: 0.50, m3Lift: 2, m3Support: 3 };

const git = args => execFileSync("git", ["-C", REPO].concat(args),
  { encoding: "utf8", maxBuffer: 1 << 28 });

const base = p => p.split("/").pop();
const generated = p => p === "scripts/glyph-data.js" || p.startsWith(".claude/skills/") || base(p) === "EXAMPLES.md";
const isDoc = p => /\.md$/i.test(p) && base(p) !== "CHANGELOG.md" && !/^CHANGELIST/.test(base(p)) && !generated(p);
const codeOf = arm => arm === "js"
  ? p => /\.js$/.test(p) && !generated(p)
  : p => /\.(js|mjs|rs)$/.test(p) && !generated(p);

/* the commits, oldest first, each with its parent and its numstat */
function commits() {
  const out = git(["log", "--reverse", "--no-merges", "--no-renames", "--format=@@%H %P", "--numstat", "HEAD"]);
  const list = [];
  for (const chunk of out.split("@@").slice(1)) {
    const lines = chunk.split("\n");
    const [sha, parent] = lines[0].trim().split(" ");
    const files = [];
    for (const l of lines.slice(1)) {
      const m = /^(\d+|-)\t(\d+|-)\t(.+)$/.exec(l);
      if (m) files.push({ path: m[3], add: m[1] === "-" ? null : +m[1], del: m[2] === "-" ? null : +m[2] });
    }
    list.push({ sha, parent: parent || null, files });
  }
  if (!SINCE) return list;
  const from = git(["rev-parse", SINCE]).trim();
  const at = list.findIndex(c => c.sha === from);
  if (at === -1) throw new Error("--since " + SINCE + " is not on the first history of HEAD");
  return list.slice(at + 1);
}

/* line counts of `<parent>:<path>` in one git process */
function lineCounts(reqs) {
  if (!reqs.length) return [];
  const r = spawnSync("git", ["-C", REPO, "cat-file", "--batch"],
    { input: reqs.join("\n") + "\n", maxBuffer: 1 << 30 });
  const buf = r.stdout, counts = [];
  let i = 0;
  while (i < buf.length && counts.length < reqs.length) {
    const nl = buf.indexOf(10, i);
    const head = buf.slice(i, nl).toString("utf8").split(" ");
    if (head[1] === "missing" || head.length < 3) { counts.push(null); i = nl + 1; continue; }
    const size = +head[2], body = buf.slice(nl + 1, nl + 1 + size);
    let n = 0; for (const b of body) if (b === 10) n++;
    if (size && body[size - 1] !== 10) n++;
    counts.push(n);
    i = nl + 1 + size + 1;
  }
  return counts;
}

const median = xs => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[(s.length - 1) >> 1] : null; };
const quart = (xs, q) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) * q)] : null; };

function m1(list, isCode, k) {
  let co = 0, lagged = 0, unpaired = 0;
  list.forEach((c, i) => {
    const code = c.files.some(f => isCode(f.path)), doc = c.files.some(f => isDoc(f.path));
    if (!code) return;
    if (doc) { co++; return; }
    const next = list.slice(i + 1, i + 1 + k);
    if (next.some(n => n.files.some(f => isDoc(f.path)) && !n.files.some(f => isCode(f.path)))) lagged++;
    else unpaired++;
  });
  const rate = co + lagged ? lagged / (co + lagged) : null;
  return { codeCommits: co + lagged + unpaired, co, lagged, unpaired, rate };
}

function m2(list) {
  const edits = [];
  for (const c of list) if (c.parent)
    for (const f of c.files) if (isDoc(f.path) && f.add !== null) edits.push({ c, f });
  const counts = lineCounts(edits.map(e => e.c.parent + ":" + e.f.path));
  const xs = [];
  edits.forEach((e, i) => { const n = counts[i]; if (n !== null && n >= MIN_LINES) xs.push((e.f.add + e.f.del) / n); });
  return { samples: xs.length, q1: quart(xs, 0.25), median: median(xs), q3: quart(xs, 0.75),
           max: xs.length ? Math.max.apply(null, xs) : null,
           under20: xs.length ? xs.filter(x => x < 0.2).length / xs.length : null,
           over50: xs.length ? xs.filter(x => x > 0.5).length / xs.length : null };
}

function m3(list, isCode, key) {
  const cs = list.filter(c => c.files.length <= MASS);
  const N = cs.length, nOf = new Map(), pair = new Map();
  for (const c of cs) {
    const code = new Set(), doc = new Set();
    for (const f of c.files) { if (isCode(f.path)) code.add(key(f.path)); else if (isDoc(f.path)) doc.add(key(f.path)); }
    for (const x of code) nOf.set("c:" + x, (nOf.get("c:" + x) || 0) + 1);
    for (const x of doc) nOf.set("d:" + x, (nOf.get("d:" + x) || 0) + 1);
    for (const a of code) for (const b of doc) { const p = a + "\t" + b; pair.set(p, (pair.get(p) || 0) + 1); }
  }
  const pairs = [];
  for (const [p, s] of pair) {
    const [a, b] = p.split("\t");
    const lift = (s / N) / ((nOf.get("c:" + a) / N) * (nOf.get("d:" + b) / N));
    pairs.push({ code: a, doc: b, support: s, lift });
  }
  const real = pairs.filter(p => p.lift > T.m3Lift && p.support >= T.m3Support)
    .sort((x, y) => y.support - x.support || y.lift - x.lift);
  return { commits: N, massOut: list.length - N, pairs: pairs.length, real };
}

const verdict1 = r => r === null ? "no code commit" : r < T.m1Stop ? "stop" : r >= T.m1Go ? "justified" : "M2 decides";
const verdict2 = m => m === null ? "no sample" : m < T.m2Scope ? "anchors buy scope" : m > T.m2Dead ? "anchors are dead metadata" : "between";

const list = commits();
const res = { repo: REPO, head: git(["rev-parse", "--short", "HEAD"]).trim(), since: SINCE, commits: list.length,
              first: list.length ? list[0].sha.slice(0, 7) : null, last: list.length ? list[list.length - 1].sha.slice(0, 7) : null,
              arms: {} };
for (const arm of ["all", "js"]) {
  const isCode = codeOf(arm);
  res.arms[arm] = {
    m1: Object.assign(m1(list, isCode, K), { spread: K_SPREAD.map(k => [k, m1(list, isCode, k).rate]) }),
    m3: { basename: m3(list, isCode, base), path: m3(list, isCode, p => p) }
  };
}
res.m2 = m2(list);

if (JSON_OUT) { process.stdout.write(JSON.stringify(res, null, 2) + "\n"); process.exit(0); }
const pct = x => x === null ? "—" : (100 * x).toFixed(1) + " %";
console.log("repo " + res.repo + " at " + res.head + (SINCE ? ", after " + SINCE : "") + ": " +
            res.commits + " commits, " + res.first + " → " + res.last);
for (const arm of ["all", "js"]) {
  const a = res.arms[arm], m = a.m1;
  console.log("\n[" + arm + "] M1 " + pct(m.rate) + " — " + verdict1(m.rate) + "; " + m.codeCommits +
              " code commits: co-updated " + m.co + ", lagged " + m.lagged + ", unpaired " + m.unpaired);
  console.log("[" + arm + "]    k: " + m.spread.map(([k, r]) => k + " → " + pct(r)).join(", "));
  for (const key of ["basename", "path"]) {
    const g = a.m3[key];
    console.log("[" + arm + "] M3 by " + key + ": " + g.real.length + " pair(s) over the bar, of " + g.pairs +
                "; " + g.commits + " commits, " + g.massOut + " mass commits out");
    for (const p of g.real) console.log("        " + p.code + " ↔ " + p.doc + "  lift " + p.lift.toFixed(2) + ", support " + p.support);
  }
}
const d = res.m2;
console.log("\nM2 median " + pct(d.median) + " — " + verdict2(d.median) + "; " + d.samples + " samples, q1 " +
            pct(d.q1) + ", q3 " + pct(d.q3) + ", max " + pct(d.max) + "; under 20 % " + pct(d.under20) +
            ", over 50 % " + pct(d.over50));
