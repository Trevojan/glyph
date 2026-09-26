// EMS-001 ORD-0011, the val: the app drives the 114 sources through Rust with
// the same bytes as through JS, and the JS path still works. A Chrome the
// DevTools protocol drives opens the page twice from serve-dev.js — as it is,
// and with engine=relay, served by the Rust glyph-engine — types each source,
// and reads what the page paints: the XML, the AST panel, the burn, the gaps
// and the status line. The JS path is also held against the core in node.
//   cargo build --release --manifest-path rust/Cargo.toml -p glyph-cli
//   CHROME=<a Chrome or Chromium> node rust/crates/glyph-cli/examples/app_on_rust.mjs
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
const ENGINE = path.join(ROOT, "rust/target/release/glyph-engine" + (process.platform === "win32" ? ".exe" : ""));
for (const [p, cmd] of [[ORACLE, "npm run check:rust"], [ENGINE, "cargo build --release --manifest-path rust/Cargo.toml -p glyph-cli"]])
  if (!fs.existsSync(p)) { console.error("missing " + path.relative(ROOT, p) + " — written by: " + cmd); process.exit(1); }
if (!process.env.CHROME) { console.error("CHROME names no browser"); process.exit(1); }

const sources = fs.readdirSync(ORACLE).filter(f => f.endsWith(".json")).sort()
  .map(f => JSON.parse(fs.readFileSync(path.join(ORACLE, f), "utf8"))).map(c => ({ id: c.id, src: c.src }))
  .filter(c => !process.env.ONLY || new RegExp(process.env.ONLY).test(c.id));
const REPO = { templates: require("../../../../.guidelines/templates.json").templates,
               rules: require("../../../../.guidelines/rules.json"), expansions: require("../../../../.guidelines/expansions.json") };

const server = spawn(process.execPath, [path.join(ROOT, "scripts/serve-dev.js"), "0", "--no-open", "--engine", "rust"],
                     { stdio: ["ignore", "pipe", "inherit"] });
const port = await new Promise(ok => readline.createInterface({ input: server.stdout })
  .on("line", l => { const m = l.match(/localhost:(\d+)\//); if (m) ok(Number(m[1])); }));

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "glyph-app-"));
const chrome = spawn(process.env.CHROME, ["--headless=new", "--no-sandbox", "--disable-gpu", "--no-first-run", "--no-proxy-server",
  "--remote-debugging-port=0", "--user-data-dir=" + dir, "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
const wsUrl = await new Promise(ok => readline.createInterface({ input: chrome.stderr })
  .on("line", l => { const m = l.match(/DevTools listening on (ws:\S+)/); if (m) ok(m[1]); }));
const ws = new WebSocket(wsUrl);
await new Promise(ok => ws.addEventListener("open", ok, { once: true }));
let seq = 0;
const pending = new Map();
ws.addEventListener("message", e => { const m = JSON.parse(e.data); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const cdp = (method, params, sessionId) => new Promise(ok => { const id = ++seq; pending.set(id, ok); ws.send(JSON.stringify({ id, method, params: params || {}, sessionId })); });

/* the page, typed into: every source, and what it paints */
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
async function page(query) {
  const { result: { targetId } } = await cdp("Target.createTarget", { url: "http://127.0.0.1:" + port + "/glyph-engine-alias.html" + query });
  const { result: { sessionId } } = await cdp("Target.attachToTarget", { targetId, flatten: true });
  const evaluate = async expression => {
    const m = (await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, sessionId)).result;
    if (m.exceptionDetails) throw new Error(JSON.stringify(m.exceptionDetails).slice(0, 400));
    return m.result.value;
  };
  for (let waited = 0; await evaluate("typeof window.__glyph") !== "object"; waited += 50) {
    if (waited > 20000) throw new Error("the page never came up" + query + ": " +
      await evaluate("document.readyState + ' GlyphCore:' + typeof GlyphCore + ' ' + document.title"));
    await new Promise(ok => setTimeout(ok, 50));
  }
  return evaluate("(" + drive + ")(" + JSON.stringify(sources.map(s => s.src)) + ")");
}

const t0 = Date.now();
const js = await page("");
console.log("the JS path: " + ((Date.now() - t0) / 1000).toFixed(1) + " s");
const rust = await page("?engine=relay");
ws.close(); chrome.kill(); server.kill();
await new Promise(ok => chrome.once("exit", ok));
fs.rmSync(dir, { recursive: true, force: true });

const differ = { rust: [], core: [] };
sources.forEach((s, i) => {
  for (const k of ["error", "xml", "ast", "hgml", "gaps", "stat"])
    if (js[i][k] !== rust[i][k]) differ.rust.push(s.id + " " + k);
  const core = { xml: G.toXML(s.src, { ...REPO, lang: "pt" }), hgml: G.toHGML(s.src, { ...REPO, lang: "pt" }) };
  for (const k of ["xml", "hgml"]) if (js[i][k] !== core[k]) differ.core.push(s.id + " " + k);
  if (js[i].error) differ.core.push(s.id + " error: " + js[i].error);
});
if (process.env.SHOW) { const i = sources.findIndex(s => s.id === process.env.SHOW), a = js[i].ast, b = rust[i].ast;
  const at = [...a].findIndex((c, k) => c !== b[k]); console.log(JSON.stringify(a.slice(Math.max(0, at - 150), at + 150)) + "\n---\n" + JSON.stringify(b.slice(Math.max(0, at - 150), at + 150))); }
console.log(sources.length + " sources typed into the page twice in " + ((Date.now() - t0) / 1000).toFixed(1) + " s");
console.log("the relay to Rust against the JS path: " + (differ.rust.length ? differ.rust.length + " differ — " + differ.rust.slice(0, 8).join(", ") : "the same bytes, every panel"));
console.log("the JS path against the core in node: " + (differ.core.length ? differ.core.length + " differ — " + differ.core.slice(0, 8).join(", ") : "the same XML and burn"));
process.exit(differ.rust.length || differ.core.length ? 1 : 0);
