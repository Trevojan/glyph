// EMS-001 ORD-0014, the second half of the val: the Order the window emits equals
// the one a browser emits. One engine, and Edge twice on profiles of their own: as
// the app starts it, `--app` with the same flags plus the debugging port, and as a
// plain tab. Five sources go to the disk, and every source of the oracle is typed
// into both with the page's own button clicked, keeping the Blob emitOrder makes:
// Chromium holds back a page's automatic downloads, at 50 and sooner, and that shelf
// is not what is compared. The clock in the zip and in the manifest is the only
// thing the two are allowed to differ on.
//   npm run check:rust
//   cargo build --release --manifest-path rust/Cargo.toml -p glyph-cli
//   node rust/crates/glyph-cli/examples/window_order.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import readline from "node:readline";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const ORACLE = path.join(ROOT, "rust/target/oracle");
const ENGINE = path.join(ROOT, "rust/target/release/glyph" + (process.platform === "win32" ? ".exe" : ""));
const EDGE = process.env.CHROME || path.join(process.env["ProgramFiles(x86)"] || "", "Microsoft/Edge/Application/msedge.exe");
for (const [p, cmd] of [[ORACLE, "npm run check:rust"], [ENGINE, "cargo build --release --manifest-path rust/Cargo.toml -p glyph-cli"], [EDGE, "CHROME=<a Chrome or Chromium>"]])
  if (!fs.existsSync(p)) { console.error("missing " + p + " — written by: " + cmd); process.exit(1); }

const sleep = ms => new Promise(ok => setTimeout(ok, ms));
const orderId = n => "ORD-" + String(n).padStart(4, "0");
const sources = fs.readdirSync(ORACLE).filter(f => f.endsWith(".json")).sort()
  .map(f => JSON.parse(fs.readFileSync(path.join(ORACLE, f), "utf8"))).map(c => ({ id: c.id, src: c.src }));

const work = fs.mkdtempSync(path.join(os.tmpdir(), "glyph-window-"));
const engine = spawn(ENGINE, ["--serve", "--no-open", "--port", "0"], {
  env: { ...process.env, APPDATA: path.join(work, "Roaming"), LOCALAPPDATA: path.join(work, "Local") },
  stdio: ["ignore", "pipe", "inherit"],
});
const port = await new Promise(ok => readline.createInterface({ input: engine.stdout })
  .on("line", l => { const m = l.match(/127\.0\.0\.1:(\d+)\//); if (m) ok(Number(m[1])); }));
const url = `http://127.0.0.1:${port}/glyph-engine-alias.html?engine=relay`;
const edges = [];
const stop = () => { for (const e of edges) e.kill(); engine.kill(); };

async function open(name, target) {
  const profile = path.join(work, name), downloads = path.join(work, name + "-zips");
  fs.mkdirSync(profile, { recursive: true });
  fs.mkdirSync(downloads, { recursive: true });
  const edge = spawn(EDGE, [target, `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0"], { stdio: "ignore" });
  edges.push(edge);
  const active = path.join(profile, "DevToolsActivePort");
  let lines = [];
  for (let waited = 0; lines.length < 2; waited += 100) {
    if (waited > 30000) throw new Error(name + ": no DevToolsActivePort");
    await sleep(100);
    if (fs.existsSync(active)) lines = fs.readFileSync(active, "utf8").split(/\r?\n/).filter(Boolean);
  }
  const ws = new WebSocket(`ws://127.0.0.1:${lines[0]}${lines[1]}`);
  await new Promise((ok, no) => { ws.addEventListener("open", ok, { once: true }); ws.addEventListener("error", no, { once: true }); });
  let seq = 0;
  const pending = new Map();
  ws.addEventListener("message", e => { const m = JSON.parse(e.data); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
  const cdp = (method, params, sessionId) => new Promise(ok => { const id = ++seq; pending.set(id, ok); ws.send(JSON.stringify({ id, method, params: params || {}, sessionId })); });
  let info = null;
  for (let waited = 0; !info; waited += 100) {
    if (waited > 30000) throw new Error(name + ": the page never appeared");
    info = ((await cdp("Target.getTargets")).result.targetInfos || []).find(t => t.url.startsWith(url));
    if (!info) await sleep(100);
  }
  const { result: { sessionId } } = await cdp("Target.attachToTarget", { targetId: info.targetId, flatten: true });
  const allowed = await cdp("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: downloads });
  if (allowed.error) throw new Error(name + ": " + JSON.stringify(allowed.error));
  const evaluate = async expression => {
    const m = (await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true }, sessionId)).result;
    if (m.exceptionDetails) throw new Error(JSON.stringify(m.exceptionDetails).slice(0, 400));
    return m.result.value;
  };
  for (let waited = 0; await evaluate("typeof window.__glyph") !== "object"; waited += 50) {
    if (waited > 20000) throw new Error(name + ": the page never came up");
    await sleep(50);
  }
  return { name, downloads, evaluate, title: await evaluate("document.title"),
           close: async () => { const gone = new Promise(ok => edge.once("exit", ok)); await cdp("Browser.close"); await gone; ws.close(); } };
}

/* the page, typed into, and its button clicked: the zip goes to the disk */
const typeIn = (src, n) => {
  const el = document.getElementById("src");
  if (el.readOnly) document.getElementById("detach").click();
  el.value = src;
  el.dispatchEvent(new Event("input"));
  document.getElementById("ordNo").value = String(n);
  document.getElementById("ordEmit").click();
};

/* the same, keeping the Blob emitOrder makes instead of handing it to the download shelf */
const typeInAndKeep = async (src, n) => {
  const el = document.getElementById("src");
  if (el.readOnly) document.getElementById("detach").click();
  let error = null, blob = null;
  const onErr = e => { error = String(e.message || e.error); };
  window.addEventListener("error", onErr);
  el.value = src;
  el.dispatchEvent(new Event("input"));
  window.removeEventListener("error", onErr);
  document.getElementById("ordNo").value = String(n);
  const make = URL.createObjectURL, click = HTMLAnchorElement.prototype.click;
  URL.createObjectURL = b => { blob = b; return make.call(URL, b); };
  HTMLAnchorElement.prototype.click = function () { if (!this.download) click.call(this); };
  document.getElementById("ordEmit").click();
  URL.createObjectURL = make;
  HTMLAnchorElement.prototype.click = click;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return { error, b64: btoa(s) };
};

async function toDisk(side, count) {
  const zips = [];
  for (let i = 0; i < count; i++) {
    const file = path.join(side.downloads, orderId(i + 1) + ".zip");
    await side.evaluate(`(${typeIn})(${JSON.stringify(sources[i].src)}, ${i + 1})`);
    for (let waited = 0; !fs.existsSync(file); waited += 25) {
      if (waited > 60000) throw new Error(`${side.name}: ${orderId(i + 1)} (${sources[i].id}) never reached the disk`);
      await sleep(25);
    }
    await sleep(100);
    zips.push(fs.readFileSync(file));
  }
  return zips;
}

async function kept(side) {
  const zips = [], errors = [];
  for (let i = 0; i < sources.length; i++) {
    const got = await side.evaluate(`(${typeInAndKeep})(${JSON.stringify(sources[i].src)}, ${i + 1})`);
    if (got.error) errors.push(sources[i].id + ": " + got.error);
    zips.push(Buffer.from(got.b64, "base64"));
  }
  return { zips, errors };
}

/* the entries of a zip, by its central directory: stored, never compressed */
function entries(b) {
  let end = b.length - 22;
  while (end >= 0 && b.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < 0) throw new Error("no central directory");
  let at = b.readUInt32LE(end + 16);
  const out = {};
  for (let k = b.readUInt16LE(end + 10); k > 0; k--) {
    const size = b.readUInt32LE(at + 24), nameLen = b.readUInt16LE(at + 28), extraLen = b.readUInt16LE(at + 30), noteLen = b.readUInt16LE(at + 32);
    const local = b.readUInt32LE(at + 42), name = b.toString("utf8", at + 46, at + 46 + nameLen);
    if (b.readUInt16LE(at + 10) !== 0) throw new Error("compressed: " + name);
    const data = local + 30 + b.readUInt16LE(local + 26) + b.readUInt16LE(local + 28);
    out[name] = b.subarray(data, data + size);
    at += 46 + nameLen + extraLen + noteLen;
  }
  return out;
}

/* two lists of zips: the four projections byte for byte, the manifest but for its clock */
function compare(label, as, bs) {
  const differ = [], digest = crypto.createHash("sha256");
  let projections = 0, manifests = 0, bytes = 0;
  as.forEach((zip, i) => {
    const s = sources[i], id = orderId(i + 1), a = entries(zip), b = entries(bs[i]);
    const names = [".pgml", ".xml", ".json", ".hgml", ".manifest.json"].map(e => id + e).sort().join();
    if (Object.keys(a).sort().join() !== names || Object.keys(b).sort().join() !== names) differ.push(s.id + " entries");
    for (const e of [".pgml", ".xml", ".json", ".hgml"]) {
      const x = a[id + e], y = b[id + e];
      if (!x || !y || !x.equals(y)) differ.push(s.id + " " + e); else { projections++; bytes += x.length; digest.update(x); }
    }
    const ma = JSON.parse(a[id + ".manifest.json"]), mb = JSON.parse(b[id + ".manifest.json"]);
    delete ma.emitted; delete mb.emitted;
    if (JSON.stringify(ma) !== JSON.stringify(mb)) differ.push(s.id + " manifest"); else manifests++;
  });
  console.log(`${label}: ${projections} of ${as.length * 4} projections the same bytes, ${bytes} bytes, sha256 ${digest.digest("hex")}; ${manifests} of ${as.length} manifests the same but for 'emitted'`
    + (differ.length ? `; ${differ.length} differ — ${differ.slice(0, 12).join(", ")}` : ""));
  return differ.length;
}

let code = 1;
try {
  const t0 = Date.now();
  const app = await open("window", `--app=${url}`), tab = await open("tab", url);
  const diskApp = await toDisk(app, 5), diskTab = await toDisk(tab, 5);
  const keptApp = await kept(app), keptTab = await kept(tab);
  await app.close();
  await tab.close();
  const bad = compare("on the disk", diskApp, diskTab) + compare("every source", keptApp.zips, keptTab.zips)
    + compare("the window, the disk against the Blob", diskApp, keptApp.zips.slice(0, 5));
  const same = JSON.stringify(keptApp.errors) === JSON.stringify(keptTab.errors);
  console.log(`errors in the page: window ${keptApp.errors.length}, tab ${keptTab.errors.length}${same ? "" : " — not the same"}`);
  console.log(`${sources.length} sources, port ${port}, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  code = bad || !same ? 1 : 0;
} catch (e) {
  console.error(e.stack || e);
} finally {
  stop();
}
await sleep(1000);
fs.rmSync(work, { recursive: true, force: true, maxRetries: 5 });
process.exit(code);
