// EMS-002 ORD-0032, the val: behind engine=relay the page holds no store of its
// own. A Chrome the DevTools protocol drives saves a template through the page's own
// editor and reads what it paints.
//
//   1. the page as it is and with engine=relay, served by the Rust glyph-engine, each
//      with a saved template and a saved override: every declared source and the calls
//      of the two give the same bytes in every panel, the relay asks for the tables
//      once, classify never, and only a call that reads templates carries them;
//   2. the binary's own origin over a machine whose stores differ: the list shows the
//      machine's templates and the saved one, and the XML is what the core gives for
//      those stores;
//   3. what a request that brings templates costs, against one that brings none.
//
//   cargo build --release --manifest-path rust/Cargo.toml -p glyph-cli
//   CHROME=<a Chrome, Chromium or Edge> node rust/crates/glyph-cli/examples/app_stores.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import G from "../../../../scripts/glyph-parser.js";

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const ORACLE = path.join(ROOT, "rust/target/oracle");
const EXE = process.platform === "win32" ? ".exe" : "";
const ENGINE = path.join(ROOT, "rust/target/release/glyph-engine" + EXE);
const GLYPH = path.join(ROOT, "rust/target/release/glyph" + EXE);
for (const [p, cmd] of [[ORACLE, "npm run check:rust"], [ENGINE, "cargo build --release --manifest-path rust/Cargo.toml -p glyph-cli"]])
  if (!fs.existsSync(p)) { console.error("missing " + path.relative(ROOT, p) + " — written by: " + cmd); process.exit(1); }
if (!process.env.CHROME) { console.error("CHROME names no browser"); process.exit(1); }

const declared = fs.readdirSync(ORACLE).filter(f => f.endsWith(".json")).sort()
  .map(f => JSON.parse(fs.readFileSync(path.join(ORACLE, f), "utf8"))).map(c => ({ id: c.id, src: c.src }))
  .filter(c => !process.env.ONLY || new RegExp(process.env.ONLY).test(c.id));
const SAVED = [["mine", "[nt'of the page'][tgt[ph-thing'which thing']]"], ["germinate", "[nt'the page overrides it']"]];
const CALLS = ["[--mine]", "[--mine`the parser`]", "[--germinate'a']", "[--mine][--germinate][crit'x']", "[nt'no template']"]
  .map((src, i) => ({ id: "saved-" + (i + 1), src }));
const sources = declared.concat(CALLS);
const REPO = { templates: require("../../../../.guidelines/templates.json").templates,
               rules: require("../../../../.guidelines/rules.json"), expansions: require("../../../../.guidelines/expansions.json") };

const lineOf = (stream, pattern) => new Promise(ok => readline.createInterface({ input: stream })
  .on("line", l => { const m = l.match(pattern); if (m) ok(m); }));

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "glyph-stores-"));
const chrome = spawn(process.env.CHROME, ["--headless=new", "--no-sandbox", "--disable-gpu", "--no-first-run", "--no-proxy-server",
  "--remote-debugging-port=0", "--user-data-dir=" + path.join(dir, "profile"), "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
const ws = new WebSocket((await lineOf(chrome.stderr, /DevTools listening on (ws:\S+)/))[1]);
await new Promise(ok => ws.addEventListener("open", ok, { once: true }));
let seq = 0;
const pending = new Map();
ws.addEventListener("message", e => { const m = JSON.parse(e.data); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const cdp = (method, params, sessionId) => new Promise(ok => { const id = ++seq; pending.set(id, ok); ws.send(JSON.stringify({ id, method, params: params || {}, sessionId })); });

/* every request the page makes, its call and what it carries */
const SPY = `window.__asked = [];
  { const send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (b) {
      const q = JSON.parse(b);
      window.__asked.push({ call: q.call, differ: q.differ ? q.differ.digest : null, bytes: b.length });
      return send.call(this, b);
    }; }`;

async function open(origin, query) {
  const { result: { targetId } } = await cdp("Target.createTarget", { url: "about:blank" });
  const { result: { sessionId } } = await cdp("Target.attachToTarget", { targetId, flatten: true });
  await cdp("Page.enable", {}, sessionId);
  await cdp("Page.addScriptToEvaluateOnNewDocument", { source: SPY }, sessionId);
  await cdp("Page.navigate", { url: origin + "/glyph-engine-alias.html" + query }, sessionId);
  const evaluate = async expression => {
    const m = (await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, sessionId)).result;
    if (m.exceptionDetails) throw new Error(JSON.stringify(m.exceptionDetails).slice(0, 400));
    return m.result.value;
  };
  for (let waited = 0; await evaluate("typeof window.__glyph") !== "object"; waited += 50) {
    if (waited > 20000) throw new Error("the page never came up " + query);
    await new Promise(ok => setTimeout(ok, 50));
  }
  return evaluate;
}

/* saved through the page's own editor, as a user saves it */
const save = async (name, body) => {
  document.getElementById("tplNew").click();
  document.getElementById("tplName").value = name;
  document.getElementById("tplGloss").value = "saved by the instrument";
  document.getElementById("tplBody").value = body;
  document.getElementById("tplSave").click();
  return document.getElementById("tplDiag").textContent;
};

const drive = async srcs => {
  const el = document.getElementById("src"), out = [];
  if (el.readOnly) document.getElementById("detach").click();
  for (const s of srcs) {
    let error = null;
    const onErr = e => { error = String(e.message || e.error); };
    window.addEventListener("error", onErr);
    el.value = s;
    el.dispatchEvent(new Event("input"));
    window.removeEventListener("error", onErr);
    const r = { error: error };
    for (const t of ["xml", "ast", "hgml"]) { window.__glyph.setTab(t); r[t] = document.getElementById(t + "Out").textContent; }
    r.gaps = document.getElementById("gapOut").textContent;
    r.stat = document.getElementById("stat").textContent;
    out.push(r);
  }
  return out;
};

const saveAll = async evaluate => {
  for (const [name, body] of SAVED) await evaluate("(" + save + ")(" + JSON.stringify(name) + "," + JSON.stringify(body) + ")");
};
const typed = evaluate => evaluate("(" + drive + ")(" + JSON.stringify(sources.map(s => s.src)) + ")");

let failed = 0;
const say = (name, why) => { console.log((why ? "✗ " : "✓ ") + name + (why ? ": " + why : "")); if (why) failed++; };
const t0 = Date.now();

/* 1. through serve-dev.js, the same origin for both, so the storage is one */
const dev = spawn(process.execPath, [path.join(ROOT, "scripts/serve-dev.js"), "0", "--no-open", "--engine", "rust"], { stdio: ["ignore", "pipe", "inherit"] });
const devOrigin = "http://127.0.0.1:" + (await lineOf(dev.stdout, /localhost:(\d+)\//))[1];
const jsPage = await open(devOrigin, "");
await saveAll(jsPage);
const js = await typed(jsPage);
const relayPage = await open(devOrigin, "?engine=relay");
/* the first paint comes before the page merges its templates, on either path */
const atLoad = await relayPage("window.__asked.splice(0)");
const rust = await typed(relayPage);
const asked = await relayPage("window.__asked");
dev.kill();

/* the one difference by decision: the Rust burns `;;` as its own line, and the JS
   as a blank one (EMS-002 ORD-0019, known::semicolons in the testkit) */
const semicolons = hgml => hgml.split("\n").map(l => l === ";;" ? "" : l).join("\n");
const differ = [];
let marked = 0;
sources.forEach((s, i) => {
  if (semicolons(rust[i].hgml) !== rust[i].hgml) marked++;
  rust[i].hgml = semicolons(rust[i].hgml);
  for (const k of ["error", "xml", "ast", "hgml", "gaps", "stat"]) if (js[i][k] !== rust[i][k]) differ.push(s.id + " " + k);
});
console.log(sources.length + " sources typed into the page twice in " + ((Date.now() - t0) / 1000).toFixed(1) + " s, " + marked + " with the `;;` line of the Rust");
if (!process.env.ONLY) say("the known difference is reached", marked ? null : "no source burned the `;;` line");
say("the relay to Rust against the JS path, a saved template and a saved override in both, every panel",
    differ.length ? differ.length + " differ — " + differ.slice(0, 8).join(", ") : null);
const named = i => sources.findIndex(s => s.id === "saved-" + i);
say("a saved template expands through the relay", rust[named(1)].xml.indexOf("of the page") === -1 ? rust[named(1)].xml.slice(0, 200) : null);
say("a saved override answers through the relay", rust[named(3)].xml.indexOf("the page overrides it") === -1 ? rust[named(3)].xml.slice(0, 200) : null);

const per = {};
atLoad.concat(asked).forEach(a => { per[a.call] = (per[a.call] || 0) + 1; });
console.log("requests: " + (atLoad.length + asked.length) + " — " + Object.keys(per).sort().map(c => c + " " + per[c]).join(", "));
say("the tables are asked once, and classify never", per.tables !== 1 || per.classify ? JSON.stringify(per) : null);
const READS = new Set(["parse", "toXML", "toAST", "toHGML"]);
const digests = new Set(asked.filter(a => READS.has(a.call)).map(a => a.differ));
say("every call that reads templates carries one digest", digests.size !== 1 || digests.has(null) ? [...digests].join(",") : null);
say("no other call carries them", asked.some(a => !READS.has(a.call) && a.differ) ? "a call that reads none carried them" : null);

/* 2. the binary's own origin, over a machine whose stores differ */
const home = path.join(dir, "home"), stores = path.join(home, "Roaming", "Glyph", "stores");
fs.mkdirSync(stores, { recursive: true });
const MACHINE = { machine: { gloss: "of this machine", body: "[nt'of the machine']" } };
fs.writeFileSync(path.join(stores, "templates.json"), JSON.stringify({ templates: MACHINE }));
for (const f of ["rules.json", "expansions.json"]) fs.copyFileSync(path.join(ROOT, ".guidelines", f), path.join(stores, f));
const app = spawn(GLYPH, ["--serve", "--port", "0", "--no-open"], { stdio: ["ignore", "pipe", "inherit"],
  env: { ...process.env, APPDATA: path.join(home, "Roaming"), LOCALAPPDATA: path.join(home, "Local") } });
const appOrigin = "http://127.0.0.1:" + (await lineOf(app.stdout, /127\.0\.0\.1:(\d+)\//))[1];
const machinePage = await open(appOrigin, "?engine=relay");
await machinePage("(" + save + ")('mine'," + JSON.stringify(SAVED[0][1]) + ")");
const SRC = "[--machine][--mine][--germinate'a']";
const [painted] = await machinePage("(" + drive + ")(" + JSON.stringify([SRC]) + ")");
const list = await machinePage("[...document.querySelectorAll('#tplList .nm')].map(e => e.textContent)");
app.kill();
const onMachine = { ...MACHINE, mine: { gloss: "saved by the instrument", params: [{ name: "thing", ask: "which thing" }], body: SAVED[0][1] } };
const want = G.toXML(SRC, { templates: onMachine, rules: REPO.rules, expansions: REPO.expansions, lang: "pt" });
say("the list shows the machine's templates and the saved one", JSON.stringify(list) !== JSON.stringify(["machine", "mine"]) ? JSON.stringify(list) : null);
say("the XML is what the core gives for the stores of the machine and the saved template", painted.xml !== want ? painted.xml.slice(0, 300) : null);

ws.close(); chrome.kill();
await new Promise(ok => chrome.once("exit", ok));

/* 3. what bringing them costs: ten templates of about a kilobyte, on a small source,
   the engine on stdio, median of the second half */
const TEN = {};
for (let i = 0; i < 10; i++) TEN["saved-" + i] = { gloss: "a template a user keeps", body: "[nt'" + "the words a user keeps ".repeat(40) + "']" };
const BROUGHT = { digest: G.ck(JSON.stringify(TEN)), templates: TEN };
const engine = spawn(ENGINE, [], { stdio: ["pipe", "pipe", "inherit"] });
const answers = readline.createInterface({ input: engine.stdout });
const waiting = [];
answers.on("line", l => waiting.shift()(l));
const roundTrip = line => new Promise(ok => { waiting.push(ok); engine.stdin.write(line + "\n"); });
const median = async line => {
  const took = [];
  for (let i = 0; i < 2000; i++) { const a = performance.now(); await roundTrip(line); took.push(performance.now() - a); }
  return took.slice(1000).sort((x, y) => x - y)[500];
};
const small = { call: "toXML", src: "[crit'the parser'][tgt'x']" };
await median(JSON.stringify(small));
const bare = await median(JSON.stringify(small));
const over = await median(JSON.stringify({ ...small, differ: BROUGHT }));
engine.kill();
console.log("a small toXML by the Rust engine on stdio: " + bare.toFixed(3) + " ms alone, " + over.toFixed(3) + " ms bringing "
  + JSON.stringify(BROUGHT).length + " bytes of templates");

fs.rmSync(dir, { recursive: true, force: true });
console.log(failed ? failed + " failed" : "all held");
process.exit(failed ? 1 : 0);
