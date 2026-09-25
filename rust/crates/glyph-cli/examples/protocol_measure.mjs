// EMS-001 ORD-0010: both protocols over the 114 sources — time per call,
// lines written, crates added — each answer held against what the JS answers
// in this same process.
//   cargo build --release --manifest-path rust/Cargo.toml -p glyph-cli --examples
//   node rust/crates/glyph-cli/examples/protocol_measure.mjs [rounds]
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import G from "../../../../scripts/glyph-parser.js";
import { relay } from "./protocol_relay.mjs";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "../../../..");
const ORACLE = path.join(ROOT, "rust/target/oracle");
const BIN = path.join(ROOT, "rust/target/release/examples");
const ROUNDS = Number(process.argv[2]) || 5;
const CALLS = ["toXML", "toAST", "toHGML"];
const OPTS = { templates: require("../../../../.guidelines/templates.json").templates,
               rules: require("../../../../.guidelines/rules.json"),
               expansions: require("../../../../.guidelines/expansions.json") };

const need = (p, cmd) => {
  if (fs.existsSync(p)) return;
  console.error("missing " + path.relative(ROOT, p) + " — written by: " + cmd);
  process.exit(1);
};
need(ORACLE, "npm run check:rust");
const BUILD = "cargo build --release --manifest-path rust/Cargo.toml -p glyph-cli --examples";
for (const b of ["protocol_http", "protocol_stdio", "protocol_engine"]) need(path.join(BIN, b), BUILD);

const sources = fs.readdirSync(ORACLE).filter(f => f.endsWith(".json")).sort()
  .map(f => JSON.parse(fs.readFileSync(path.join(ORACLE, f), "utf8")))
  .map(c => ({ id: c.id, src: c.src }));
const request = (call, s) => JSON.stringify({ call: call, src: s.src });

/* what the JS answers is the oracle, thrown messages included */
const jsAnswer = (call, src) => {
  try { return { ok: G[call](src, OPTS) }; } catch (e) { return { thrown: e.message }; }
};
const expected = new Map();
for (const s of sources) for (const call of CALLS) expected.set(s.id + " " + call, JSON.stringify(jsAnswer(call, s.src)));

const now = () => process.hrtime.bigint();
const median = xs => [...xs].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))[xs.length >> 1];

/* an option: per call, per source, the median microseconds of ROUNDS timed
   rounds after a warm-up one; the warm-up answers are held against the JS */
async function measure(name, ask) {
  const per = new Map(CALLS.map(c => [c, sources.map(() => [])]));
  const wrong = [], respelt = [];
  for (let round = 0; round <= ROUNDS; round++)
    for (let i = 0; i < sources.length; i++)
      for (const call of CALLS) {
        const t0 = now();
        const text = await ask(request(call, sources[i]));
        const answer = JSON.parse(text);
        const t1 = now();
        if (round > 0) { per.get(call)[i].push(t1 - t0); continue; }
        const key = sources[i].id + " " + call;
        if (JSON.stringify(answer) !== expected.get(key)) wrong.push(key);
        else if (text !== expected.get(key)) respelt.push(key);
      }
  return { name, us: new Map(CALLS.map(c => [c, per.get(c).map(xs => Number(median(xs)) / 1000)])), wrong, respelt };
}

/* the page today: the JS in its own process, the object and no JSON */
const js = { name: "JS in process (today)", us: new Map(CALLS.map(call => {
  const per = sources.map(() => []);
  for (let round = 0; round <= ROUNDS; round++)
    sources.forEach((s, i) => { const t0 = now(); jsAnswer(call, s.src); const t1 = now(); if (round > 0) per[i].push(t1 - t0); });
  return [call, per.map(xs => Number(median(xs)) / 1000)];
})), wrong: [], respelt: [] };

/* the Rust engine and its JSON, no transport: the floor both options share */
const engineProc = spawn(path.join(BIN, "protocol_engine"), [String(ROUNDS)], { stdio: ["pipe", "pipe", "inherit"] });
const engineLines = [];
readline.createInterface({ input: engineProc.stdout }).on("line", l => engineLines.shift()(l));
const askEngine = body => new Promise(resolve => { engineLines.push(resolve); engineProc.stdin.write(body + "\n"); });
const engine = { name: "Rust engine alone, no transport", us: new Map(), wrong: [], respelt: [] };
for (const call of CALLS) {
  const xs = [];
  for (const s of sources) xs.push(Number(await askEngine(request(call, s))) / 1000);
  engine.us.set(call, xs);
}
engineProc.kill();

/* a client on one kept-alive socket, as a page's fetch is */
const poster = port => {
  const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });
  const post = body => new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, method: "POST", path: "/", agent,
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } }, res => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", c => { text += c; });
      res.on("end", () => resolve(text));
    });
    req.on("error", reject);
    req.end(body);
  });
  return { post, agent };
};
const firstLine = stream => new Promise(resolve => readline.createInterface({ input: stream }).once("line", resolve));
const probe = request("toXML", sources[0]);

/* A: the engine serves HTTP itself */
let t0 = now();
const serverA = spawn(path.join(BIN, "protocol_http"), ["8732"], { stdio: ["ignore", "pipe", "inherit"] });
await firstLine(serverA.stdout);
const clientA = poster(8732);
await clientA.post(probe);
const coldA = Number(now() - t0) / 1e6;
const A = await measure("A · the engine serves HTTP", clientA.post);
clientA.agent.destroy();
serverA.kill();

/* B: the engine on stdio, its HTTP relayed by the dev server */
t0 = now();
const r = relay(path.join(BIN, "protocol_stdio"));
const relayServer = http.createServer(r.handle);
await new Promise(ok => relayServer.listen(8733, "127.0.0.1", ok));
const clientB = poster(8733);
await clientB.post(probe);
const coldB = Number(now() - t0) / 1e6;
const B = await measure("B · stdio, relayed by the dev server", clientB.post);
clientB.agent.destroy();
relayServer.close();
r.child.kill();

/* B's pipe without the relay, to tell the relay's hop from the pipe's */
const pipe = spawn(path.join(BIN, "protocol_stdio"), [], { stdio: ["pipe", "pipe", "inherit"] });
const waiting = [];
readline.createInterface({ input: pipe.stdout }).on("line", l => waiting.shift()(l));
const Bpipe = await measure("B's pipe alone, no relay", body => new Promise(resolve => { waiting.push(resolve); pipe.stdin.write(body + "\n"); }));
pipe.kill();

/* lines written and crates added */
const count = rel => {
  const lines = fs.readFileSync(path.join(HERE, rel), "utf8").split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  return { rel, lines: lines.length, code: lines.filter(l => l.trim() && !/^\s*(\/\/|\/\*|\*)/.test(l)).length };
};
const filesA = ["protocol_http.rs", "common/mod.rs"].map(count);
const filesB = ["protocol_stdio.rs", "common/mod.rs", "protocol_relay.mjs"].map(count);
const lock = fs.readFileSync(path.join(ROOT, "rust/Cargo.lock"), "utf8");
const external = (lock.match(/^source = /gm) || []).length;
const foreign = ["protocol_http.rs", "protocol_stdio.rs", "common/mod.rs"]
  .flatMap(f => fs.readFileSync(path.join(HERE, f), "utf8").match(/^use\s+\w+/gm) || [])
  .map(u => u.replace(/^use\s+/, "")).filter(c => c !== "std" && !c.startsWith("glyph_"));

const f1 = n => n.toFixed(1);
const stats = xs => {
  const s = [...xs].sort((a, b) => a - b);
  const at = q => s[Math.min(s.length - 1, Math.floor(q * s.length))];
  const total = s.reduce((a, b) => a + b, 0);
  return { total, mean: total / s.length, p50: at(0.5), p95: at(0.95), max: s[s.length - 1] };
};
const out = [];
out.push("measured " + new Date().toISOString() + " · " + sources.length + " sources × " + CALLS.length + " calls × " + ROUNDS +
         " rounds after one warm-up · median per source · node " + process.version + " · " + os.cpus()[0].model + " × " + os.cpus().length);
out.push("");
out.push("| option | call | total for the " + sources.length + " (ms) | p50 (µs) | p95 (µs) | max (µs) | over the engine alone, p50 (µs) | answers unequal to the JS |");
out.push("|---|---|---|---|---|---|---|---|");
for (const o of [js, engine, A, B, Bpipe])
  for (const call of CALLS) {
    const st = stats(o.us.get(call));
    const over = o === js || o === engine ? "—" : f1(stats(o.us.get(call).map((x, i) => x - engine.us.get(call)[i])).p50);
    const unequal = o === js ? "oracle" : o === engine ? "—" : String(o.wrong.filter(w => w.endsWith(" " + call)).length);
    out.push("| " + o.name + " | " + call + " | " + f1(st.total / 1000) + " | " + f1(st.p50) + " | " + f1(st.p95) + " | " +
             f1(st.max) + " | " + over + " | " + unequal + " |");
  }
const slow = (o, call) => { const xs = o.us.get(call); const i = xs.indexOf(Math.max(...xs)); return sources[i].id + " " + f1(xs[i] / 1000) + " ms"; };
out.push("");
out.push("slowest source per call — JS: " + CALLS.map(c => c + " " + slow(js, c)).join(", ") +
         " · Rust alone: " + CALLS.map(c => c + " " + slow(engine, c)).join(", "));
/* what one keystroke asks today: run() tokenizes, parses, builds the XML,
   the panel envelope and the burn, and renderLit classifies each command */
const perKey = sources.map(s => 5 + G.tokenize(s.src).filter(t => t.k === "open" || t.k === "bareTag").length).sort((a, b) => a - b);
out.push("calls one keystroke makes, as run() makes them (five, and one classify a command token) — p50 " +
         perKey[perKey.length >> 1] + ", p95 " + perKey[Math.floor(0.95 * perKey.length)] + ", max " + perKey[perKey.length - 1]);
out.push("");
out.push("| option | spawn to first answer (ms) | files | lines | code lines | crates added |");
out.push("|---|---|---|---|---|---|");
const sum = (files, k) => files.reduce((a, f) => a + f[k], 0);
out.push("| A | " + f1(coldA) + " | " + filesA.map(f => f.rel + " " + f.lines).join(", ") + " | " + sum(filesA, "lines") + " | " +
         sum(filesA, "code") + " | " + (external + foreign.length) + " |");
out.push("| B | " + f1(coldB) + " | " + filesB.map(f => f.rel + " " + f.lines).join(", ") + " | " + sum(filesB, "lines") + " | " +
         sum(filesB, "code") + " | " + (external + foreign.length) + " |");
const unequal = [...A.wrong, ...B.wrong, ...Bpipe.wrong];
if (unequal.length) out.push("", "unequal: " + unequal.join(", "));
const respelt = [...A.respelt, ...B.respelt, ...Bpipe.respelt];
out.push("", respelt.length ? "equal in value, spelt otherwise than JSON.stringify: " + respelt.join(", ")
                            : "every answer is JSON.stringify's own bytes");
console.log(out.join("\n"));
process.exit(unequal.length ? 1 : 0);
