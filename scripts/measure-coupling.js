#!/usr/bin/env node
/**
 * measure-coupling — four measures over a repository's history, for sizing
 * the virtual paths before they are built.
 *
 *   node measure-coupling.js [repo] [--rev REV] [--since REV] [--k N] [--json]
 *
 *   repo      the repository to measure (default: this one)
 *   --rev     the last commit of the universe (default: HEAD)
 *   --since   also report the window after this commit, apart
 *   --k       the lag window of M1 (default: 3)
 *   --json    print the numbers as JSON instead of the report
 *
 * The measures and the thresholds that read them are declared in
 * `.guidelines/.orders/INTAKE-VIRTUAL-PATH.md` §18, committed before this file:
 *
 *   M1  staleness — a code commit is co-updated (touches a doc), lagged (a
 *       doc-only commit follows within k) or unpaired (reported apart)
 *   M2  edit locality — (added + deleted) / lines before, per doc edit of a
 *       file that had at least five lines
 *   M3  co-change coupling — support and lift per (code, doc) pair, commits
 *       touching more than 15 files left out
 *   M4  anchor survival — a heading slug that disappears is moved, renamed
 *       (its body reappears under a new slug, line-set Jaccard >= 0.5) or deleted
 *   M5  structural recovery — of the breaks whose content lived on, keyed by
 *       path, the share the same text, the same body or the same file renamed
 *       finds again (§20)
 *   M6  recovery by the path — of what the structure leaves, the slug whose
 *       trigrams are closest, against the slug whose body is (§22)
 *
 * Identity follows renames (`git log -M`) and is keyed by the latest name.
 * Nothing here knows what a `.pgml` is: any repository path can be handed in.
 */
"use strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const argv = process.argv.slice(2);
const opt = name => { const i = argv.indexOf(name); return i === -1 ? null : argv.splice(i, 2)[1]; };
const JSON_OUT = argv.indexOf("--json") !== -1 && !!argv.splice(argv.indexOf("--json"), 1);
const REV = opt("--rev") || "HEAD";
const SINCE = opt("--since");
const K = Number(opt("--k") || 3);
const REPO = path.resolve(argv[0] || path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

const MASS = 15, JACCARD = 0.5;
const CODE = /\.(js|rs|py)$/, DOC = /\.md$/;
const EXCLUDED = p => p === "scripts/glyph-data.js" || p.startsWith(".claude/skills/glyph-markup/") ||
  /(^|\/)CHANGELOG\.md$/.test(p) || /(^|\/)CHANGELIST[^/]*$/.test(p) || p.startsWith(".guidelines/.history/");

const git = (...args) => execFileSync("git", ["-C", REPO, ...args], { encoding: "utf8", maxBuffer: 1 << 28 });
const show = (rev, file) => { try { return git("show", rev + ":" + file); } catch { return null; } };

/* ---------- the history, identity following renames ---------- */

function readLog() {
  const commits = [];
  for (const block of git("log", "--reverse", "--no-merges", "-M", "--name-status", "--format=%x00%H", REV).split("\0").slice(1)) {
    const [hash, ...lines] = block.trim().split("\n");
    const changes = lines.filter(Boolean).map(l => {
      const f = l.split("\t");
      return f[0][0] === "R" ? { st: "R", from: f[1], to: f[2] } : { st: f[0][0], from: f[1], to: f[1] };
    });
    commits.push({ hash, changes });
  }
  return commits;
}

function assignIdentity(commits) {
  const live = new Map(), last = [];
  for (const c of commits) for (const ch of c.changes) {
    let id = ch.st === "A" ? undefined : live.get(ch.from);
    if (id === undefined) { id = last.length; last.push(ch.to); }
    if (ch.st === "R") live.delete(ch.from);
    if (ch.st === "D") live.delete(ch.from); else live.set(ch.to, id);
    last[id] = ch.to;
    ch.id = id;
  }
  for (const c of commits) for (const ch of c.changes) {
    ch.name = last[ch.id];
    ch.excluded = EXCLUDED(ch.from) || EXCLUDED(ch.to) || EXCLUDED(ch.name);
    ch.kind = CODE.test(ch.name) ? "code" : DOC.test(ch.name) ? "doc" : null;
  }
  for (const c of commits) {
    c.mass = c.changes.length > MASS;
    const kept = c.changes.filter(ch => !ch.excluded && ch.kind);
    c.code = new Set(kept.filter(ch => ch.kind === "code").map(ch => ch.name));
    c.doc = new Set(kept.filter(ch => ch.kind === "doc").map(ch => ch.name));
    c.docEdits = kept.filter(ch => ch.kind === "doc");
  }
  return commits;
}

/* ---------- M1 ---------- */

function m1(commits, from) {
  let co = 0, lagged = 0, unpaired = 0;
  for (let i = from; i < commits.length; i++) {
    const c = commits[i];
    if (!c.code.size) continue;
    if (c.doc.size) { co++; continue; }
    const follows = commits.slice(i + 1, i + 1 + K).some(n => n.doc.size && !n.code.size);
    follows ? lagged++ : unpaired++;
  }
  return { codeCommits: co + lagged + unpaired, coUpdated: co, lagged, unpaired, rate: ratio(lagged, co + lagged) };
}

/* ---------- M2 ---------- */

function numstat(hash) {
  const out = {};
  for (const l of git("show", "-M", "--numstat", "--format=", hash).split("\n").filter(Boolean)) {
    const [a, d, p] = l.split("\t");
    out[expandRename(p)] = a === "-" ? null : Number(a) + Number(d);
  }
  return out;
}
const expandRename = p => {
  const m = p.match(/^(.*)\{(.*) => (.*)\}(.*)$/);
  if (m) return (m[1] + m[3] + m[4]).replace(/\/\//g, "/");
  return p.includes(" => ") ? p.split(" => ")[1] : p;
};

function m2(commits, from) {
  const samples = [];
  for (let i = from; i < commits.length; i++) {
    const c = commits[i];
    const edits = c.docEdits.filter(ch => ch.st === "M" || ch.st === "R");
    if (!edits.length) continue;
    const ns = numstat(c.hash);
    for (const ch of edits) {
      const churn = ns[ch.to];
      if (churn == null) continue;
      const before = show(c.hash + "^", ch.from);
      const lines = before === null ? 0 : before.split("\n").length - (before.endsWith("\n") ? 1 : 0);
      if (lines >= 5) samples.push(churn / lines);
    }
  }
  samples.sort((a, b) => a - b);
  const q = f => samples.length ? samples[Math.min(samples.length - 1, Math.floor(f * samples.length))] : null;
  return { samples: samples.length, q1: q(0.25), median: q(0.5), q3: q(0.75), max: samples.at(-1) ?? null,
    under20: ratio(samples.filter(s => s < 0.2).length, samples.length),
    over50: ratio(samples.filter(s => s > 0.5).length, samples.length) };
}

/* ---------- M3 ---------- */

function m3(commits, from) {
  const pool = commits.slice(from).filter(c => !c.mass);
  const n = pool.length, count = new Map(), pair = new Map();
  const inc = (m, k) => m.set(k, (m.get(k) || 0) + 1);
  for (const c of pool) {
    for (const f of [...c.code, ...c.doc]) inc(count, f);
    for (const a of c.code) for (const b of c.doc) inc(pair, a + "\t" + b);
  }
  const pairs = [...pair].map(([k, support]) => {
    const [code, doc] = k.split("\t");
    return { code, doc, support, lift: support * n / (count.get(code) * count.get(doc)) };
  }).filter(p => p.lift > 2 && p.support >= 3).sort((a, b) => b.support - a.support || b.lift - a.lift);
  return { commits: n, massLeftOut: commits.length - from - n, pairs };
}

/* ---------- M4 ---------- */

function sections(text) {
  const out = new Map(), lines = text.split("\n"), heads = [];
  let fence = false;
  lines.forEach((l, i) => {
    if (/^\s*(```|~~~)/.test(l)) fence = !fence;
    const m = !fence && l.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (m) heads.push({ level: m[1].length, text: m[2], at: i });
  });
  const seen = new Map();
  heads.forEach(h => {
    const base = slug(h.text), k = seen.get(base) || 0;
    seen.set(base, k + 1);
    h.slug = k ? base + "-" + k : base;
  });
  heads.forEach((h, j) => {
    for (let p = j - 1; p >= 0; p--) if (heads[p].level < h.level) { h.parent = heads[p].slug; break; }
  });
  heads.forEach((h, j) => {
    const sibs = heads.filter(o => o.parent === h.parent && o.level === h.level), at = sibs.indexOf(h);
    h.prev = at > 0 ? sibs[at - 1].slug : null;
    h.next = at < sibs.length - 1 ? sibs[at + 1].slug : null;
  });
  heads.forEach((h, j) => {
    let end = lines.length;
    for (const n of heads.slice(j + 1)) if (n.level <= h.level) { end = n.at; break; }
    const body = lines.slice(h.at + 1, end);
    out.set(h.slug, { set: new Set(body.map(s => s.trim()).filter(Boolean)),
      text: lines.slice(h.at, end).join("\n"), body: body.join("\n"),
      parent: h.parent ?? null, prev: h.prev, next: h.next });
  });
  return out;
}
const slug = t => t.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").toLowerCase()
  .replace(/[^\p{L}\p{N}\s_-]/gu, "").trim().replace(/\s/g, "-");
const jaccard = (a, b) => {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
};

function m4(commits, from) {
  let created = 0, moved = 0, renamed = 0, deleted = 0, carriedByFileRename = 0;
  for (let i = from; i < commits.length; i++) {
    const c = commits[i];
    if (!c.docEdits.length) continue;
    const removed = [], added = [];
    for (const ch of c.docEdits) {
      const before = ch.st === "A" ? new Map() : sections(show(c.hash + "^", ch.from) ?? "");
      const after = ch.st === "D" ? new Map() : sections(show(c.hash, ch.to) ?? "");
      if (ch.st === "R") carriedByFileRename += [...before.keys()].filter(s => after.has(s)).length;
      for (const [s, sec] of before) if (!after.has(s)) removed.push({ file: ch.name, s, body: sec.set });
      for (const [s, sec] of after) if (!before.has(s)) added.push({ file: ch.name, s, body: sec.set });
    }
    created += added.length;
    for (const r of removed) {
      if (added.some(a => a.s === r.s && a.file !== r.file)) moved++;
      else if (added.some(a => jaccard(a.body, r.body) >= JACCARD)) renamed++;
      else deleted++;
    }
  }
  return { created, moved, renamed, deleted, breaks: moved + renamed, rate: ratio(moved + renamed, created),
    carriedByFileRename };
}

/* ---------- M5 ---------- */

/* the slugs a commit removed and added, keyed by path, and the files rule 3
   pairs: an old file with the new file that holds more than half of its slugs
   again, by the same slug or the same text */
function breaks(c) {
  const removed = [], added = [];
  for (const ch of c.docEdits) {
    const before = ch.st === "A" ? new Map() : sections(show(c.hash + "^", ch.from) ?? "");
    const after = ch.st === "D" ? new Map() : sections(show(c.hash, ch.to) ?? "");
    const keep = ch.from === ch.to;
    for (const [s, sec] of before) if (!keep || !after.has(s)) removed.push({ file: ch.from, s, ...sec });
    for (const [s, sec] of after) if (!keep || !before.has(s)) added.push({ file: ch.to, s, ...sec });
  }
  const pairs = new Map();
  for (const file of new Set(removed.map(r => r.file))) {
    const mine = removed.filter(r => r.file === file);
    const votes = new Map();
    for (const r of mine) {
      const there = added.filter(a => a.s === r.s || a.text === r.text).map(a => a.file);
      for (const f of new Set(there)) votes.set(f, (votes.get(f) || 0) + 1);
    }
    for (const [f, n] of votes) if (n * 2 > mine.length) pairs.set(file, f);
  }
  return { removed, added, pairs };
}
const unique = list => list.length === 1 ? list[0] : null;
/* rules 1 to 3 of §20: how the structure finds a removed slug again, or null */
const structural = (r, added, pairs) =>
  unique(added.filter(a => a.text === r.text)) ? "text"
    : r.body.trim() && unique(added.filter(a => a.body === r.body)) ? "body"
    : pairs.has(r.file) && added.some(a => a.file === pairs.get(r.file) && a.s === r.s) ? "file" : null;

function m5(commits, from) {
  let lived = 0, recovered = 0, renamedLived = 0, renamedRecovered = 0, samePlace = 0, renamedSamePlace = 0, deleted = 0, falsePlace = 0;
  const by = { text: 0, body: 0, file: 0 };
  for (let i = from; i < commits.length; i++) {
    const c = commits[i];
    if (!c.docEdits.length) continue;
    const { removed, added, pairs } = breaks(c);
    for (const r of removed) {
      const moved = added.some(a => a.s === r.s && a.file !== r.file);
      const renamed = !moved && added.some(a => jaccard(a.set, r.set) >= JACCARD);
      if (!moved && !renamed) {
        /* a deletion the same place would wrongly carry: its precision */
        const home = pairs.get(r.file) ?? r.file;
        if (unique(added.filter(a => a.file === home && a.parent === r.parent && a.prev === r.prev && a.next === r.next))) falsePlace++;
        deleted++;
        continue;
      }
      lived++;
      if (renamed) renamedLived++;
      const how = structural(r, added, pairs);
      if (how) { recovered++; by[how]++; if (renamed) renamedRecovered++; continue; }
      /* post hoc, apart from the rate (§21): the same place — the same parent
         and the same neighbours, in the same file or the one it paired with */
      const home = pairs.get(r.file) ?? r.file;
      const place = added.filter(a => a.file === home && a.parent === r.parent && a.prev === r.prev && a.next === r.next);
      if (unique(place)) { samePlace++; if (renamed) renamedSamePlace++; }
    }
  }
  return { lived, recovered, rate: ratio(recovered, lived), by, renamedLived, renamedRecovered, samePlace, renamedSamePlace, deleted, falsePlace };
}

/* ---------- M6 ---------- */

const trigrams = t => t.length < 3 ? new Set([t]) : new Set([...Array(t.length - 2).keys()].map(i => t.slice(i, i + 3)));

/* the one candidate whose score is largest and at least JACCARD, or null */
function best(candidates, score) {
  let top = null, at = -1, tie = false;
  for (const a of candidates) {
    const x = score(a);
    if (x > at) { top = a; at = x; tie = false; } else if (x === at) tie = true;
  }
  return top && at >= JACCARD && !tie ? top : null;
}

function m6(commits, from) {
  let cases = 0, truths = 0, predictions = 0, right = 0;
  const wrong = { deleted: 0, other: 0 };
  for (let i = from; i < commits.length; i++) {
    const c = commits[i];
    if (!c.docEdits.length) continue;
    const { removed, added, pairs } = breaks(c);
    for (const r of removed) {
      if (structural(r, added, pairs)) continue;
      cases++;
      const truth = best(added, a => jaccard(a.set, r.set));
      const home = pairs.get(r.file) ?? r.file;
      const mine = trigrams(r.s);
      const guess = best(added.filter(a => a.file === home), a => jaccard(trigrams(a.s), mine));
      if (truth) truths++;
      if (!guess) continue;
      predictions++;
      if (truth && guess.file === truth.file && guess.s === truth.s) right++;
      else wrong[truth ? "other" : "deleted"]++;
    }
  }
  return { cases, truths, predictions, right, wrong, precision: ratio(right, predictions), recall: ratio(right, truths) };
}

/* ---------- report ---------- */

const ratio = (a, b) => b ? a / b : null;
const pct = x => x == null ? "—" : (100 * x).toFixed(1) + " %";

function measure(commits, from) {
  return { commits: commits.length - from, m1: m1(commits, from), m2: m2(commits, from), m3: m3(commits, from), m4: m4(commits, from), m5: m5(commits, from), m6: m6(commits, from) };
}

const commits = assignIdentity(readLog());
const result = { repo: REPO, rev: git("rev-parse", "--short", REV).trim(), k: K, whole: measure(commits, 0) };
if (SINCE) {
  const since = git("rev-parse", SINCE).trim();
  const at = commits.findIndex(c => c.hash === since);
  if (at === -1) { console.error("measure-coupling: " + SINCE + " is not in the history of " + REV); process.exit(1); }
  result.since = { rev: since.slice(0, 7), ...measure(commits, at + 1) };
}

if (JSON_OUT) { console.log(JSON.stringify(result, null, 2)); process.exit(0); }

function print(title, r) {
  console.log("\n" + title + " — " + r.commits + " commits");
  console.log("  M1  code commits " + r.m1.codeCommits + ": co-updated " + r.m1.coUpdated + ", lagged " + r.m1.lagged +
              ", unpaired " + r.m1.unpaired + " → rate " + pct(r.m1.rate) + " (k=" + K + ")");
  console.log("  M2  " + r.m2.samples + " doc edits: q1 " + pct(r.m2.q1) + ", median " + pct(r.m2.median) + ", q3 " + pct(r.m2.q3) +
              ", max " + pct(r.m2.max) + "; under 20 % " + pct(r.m2.under20) + ", over 50 % " + pct(r.m2.over50));
  console.log("  M3  " + r.m3.commits + " commits (" + r.m3.massLeftOut + " mass left out), " + r.m3.pairs.length + " pair(s) with lift > 2 and support >= 3");
  r.m3.pairs.forEach(p => console.log("        " + p.code + " ↔ " + p.doc + "  support " + p.support + ", lift " + p.lift.toFixed(2)));
  console.log("  M4  " + r.m4.created + " slugs created: moved " + r.m4.moved + ", renamed " + r.m4.renamed + ", deleted " + r.m4.deleted +
              " → break rate " + pct(r.m4.rate) + "; " + r.m4.carriedByFileRename + " slug(s) carried by a file rename");
  console.log("  M5  " + r.m5.lived + " content-lived breaks by path: recovered " + r.m5.recovered + " → " + pct(r.m5.rate) +
              " (text " + r.m5.by.text + ", body " + r.m5.by.body + ", file " + r.m5.by.file + "); of the renamed, " +
              r.m5.renamedRecovered + " of " + r.m5.renamedLived);
  console.log("  M6  " + r.m6.cases + " breaks the structure leaves, " + r.m6.truths + " with a successor by content: the path predicts " +
              r.m6.predictions + ", right " + r.m6.right + " (wrong onto a deletion " + r.m6.wrong.deleted + ", onto another slug " + r.m6.wrong.other +
              ") → precision " + pct(r.m6.precision) + ", recall " + pct(r.m6.recall));
  console.log("      post hoc, the same place: " + r.m5.samePlace + " more, " + r.m5.renamedSamePlace + " of them renamed; and it would carry " +
              r.m5.falsePlace + " of the " + r.m5.deleted + " deletions onto a new section");
}
console.log("measure-coupling " + result.repo + " at " + result.rev);
print("whole history", result.whole);
if (result.since) print("after " + result.since.rev, result.since);
