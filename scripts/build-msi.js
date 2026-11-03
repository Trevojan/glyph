#!/usr/bin/env node
/**
 * build-msi.js — the installer for Windows (EMS-001 ORD-0013): one .msi that
 * puts the page, the Rust engine and the node that serves them on a clean
 * machine.
 *
 *   node scripts/build-msi.js [--out <dir>]
 *
 * ADR B as signed: the page reaches glyph-engine through the relay of
 * serve-dev.js, so the installed app carries node. The install folder mirrors
 * the repository — serve-dev.js serves the page beside it and spawns the engine
 * at rust/target/release/glyph-engine.exe — so nothing in the app learns it was
 * installed. The Start-menu shortcut runs
 *   node\node.exe scripts\serve-dev.js --engine rust --host 127.0.0.1
 * which opens the page on the relay, bound to this machine alone. A simple .msi
 * first; its performance is later work (the Regent, 2026-11-03).
 *
 *   1. the engine: `cargo build --release -p glyph-cli`, native on Windows and
 *      `--target x86_64-pc-windows-gnu` elsewhere, where mingw-w64 links it;
 *   2. node: node-<this node's version>-win-x64.zip from nodejs.org, its
 *      SHA-256 checked against the release's SHASUMS256.txt, both cached; the
 *      zip gives node.exe and the LICENSE that travels with it;
 *   3. the stage: the page, its stylesheet, the icons of .scope/asset/,
 *      README.md, package.json (it makes the scripts ES modules), every file of
 *      scripts/, node and the two binaries;
 *   4. the closure: every src and href of the page, every url() of a
 *      stylesheet and every relative import of the modules they reach resolves
 *      inside the stage — a missing file refuses here, not on the clean machine;
 *   5. glyph.wxs, in the WiX v3 schema, written from the stage: every id and
 *      GUID derived from the install path, so a rebuild keeps them;
 *   6. the .msi: `wixl` (msitools) where it exists, else WiX v3's candle and
 *      light.
 *
 * The output is rust/target/msi/, which git ignores with the rest of
 * rust/target/. Zero dependencies, as every script here.
 */
"use strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import cp from "node:child_process";
import crypto from "node:crypto";
import zlib from "node:zlib";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argOf = name => { const i = process.argv.indexOf(name); return i === -1 ? null : process.argv[i + 1]; };
const OUT = path.resolve(argOf("--out") || path.join(ROOT, "rust", "target", "msi"));
const STAGE = path.join(OUT, "stage");
const WIN = process.platform === "win32";

/* the product line: never changes, so every later .msi upgrades this one */
const UPGRADE_CODE = "F53D74FF-DBAD-4E7A-A721-07E59CCD2E4A";
const PAGE = "glyph-engine-alias.html";
const ICON = ".scope/asset/favicon.ico";
const ENGINE = "rust/target/release/glyph-engine.exe";
const NODE = "node/node.exe";

function die(msg) { console.error("build-msi: " + msg); process.exit(1); }
const say = msg => console.log("build-msi: " + msg);
const sha256 = buf => crypto.createHash("sha256").update(buf).digest("hex");
const posix = rel => rel.split(path.sep).join("/");

/* the version the app carries is the engine's, a.b.c.dd; an MSI compares the
   first three fields (255.255.65535 at most) and carries the fourth */
const VERSION = (() => {
  const m = fs.readFileSync(path.join(ROOT, "scripts", "core", "version.js"), "utf8")
    .match(/VERSION\s*=\s*"(\d+)\.(\d+)\.(\d+)\.(\d+)"/);
  if (!m) die("no a.b.c.dd VERSION in scripts/core/version.js");
  const n = m.slice(1).map(Number);
  if (n[0] > 255 || n[1] > 255 || n[2] > 65535 || n[3] > 65535) die("VERSION " + m[0] + " is past what an MSI holds");
  return { engine: m.slice(1).join("."), msi: n.join(".") };
})();

/* ---------- 1. the engine ------------------------------------------------ */
function buildEngine() {
  const target = WIN ? [] : ["--target", "x86_64-pc-windows-gnu"];
  const args = ["build", "--release", "-p", "glyph-cli", "--manifest-path", path.join(ROOT, "rust", "Cargo.toml")].concat(target);
  say("cargo " + args.join(" "));
  const r = cp.spawnSync("cargo", args, { stdio: "inherit" });
  if (r.error) die("cargo: " + r.error.message);
  if (r.status !== 0) die("cargo build failed" + (WIN ? "" : "; off Windows it needs `rustup target add x86_64-pc-windows-gnu` and mingw-w64"));
  const dir = path.join(ROOT, "rust", "target", ...(WIN ? [] : ["x86_64-pc-windows-gnu"]), "release");
  const bins = {};
  for (const f of ["glyph-engine.exe", "glyph.exe"]) {
    const p = path.join(dir, f);
    if (!fs.existsSync(p)) die("cargo wrote no " + p);
    bins[f] = p;
  }
  return bins;
}

/* ---------- 2. node ------------------------------------------------------ */
async function fetchTo(url, file) {
  if (fs.existsSync(file)) return fs.readFileSync(file);
  say("downloading " + url);
  let r;
  try { r = await fetch(url); } catch (e) { die(url + ": " + (e.cause && e.cause.code || e.message)); }
  if (!r.ok) die(url + ": HTTP " + r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(file, buf);
  return buf;
}

async function nodeForWindows() {
  const v = process.version, name = "node-" + v + "-win-x64";
  const base = "https://nodejs.org/dist/" + v + "/";
  const cache = path.join(OUT, "cache", v);
  fs.mkdirSync(cache, { recursive: true });
  const sums = (await fetchTo(base + "SHASUMS256.txt", path.join(cache, "SHASUMS256.txt"))).toString("utf8");
  const line = sums.split("\n").find(l => l.trim().endsWith("  " + name + ".zip"));
  if (!line) die("SHASUMS256.txt of " + v + " names no " + name + ".zip");
  const want = line.trim().split(/\s+/)[0];
  const zipFile = path.join(cache, name + ".zip");
  let zip = await fetchTo(base + name + ".zip", zipFile);
  if (sha256(zip) !== want) {
    fs.rmSync(zipFile);
    zip = await fetchTo(base + name + ".zip", zipFile);
  }
  const got = sha256(zip);
  if (got !== want) die(name + ".zip: sha256 " + got + ", SHASUMS256.txt says " + want);
  say(name + ".zip: sha256 " + got + ", as SHASUMS256.txt says");
  const files = unzip(zip, [name + "/node.exe", name + "/LICENSE"]);
  return { version: v, sha256: got, exe: files[name + "/node.exe"], license: files[name + "/LICENSE"] };
}

/* the named entries of a zip, read from its central directory: stored or
   deflated, and no zip64, which a node release does not need */
function unzip(buf, names) {
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) die("not a zip: no end of central directory");
  const count = buf.readUInt16LE(eocd + 10);
  let at = buf.readUInt32LE(eocd + 16);
  if (count === 0xffff || at === 0xffffffff) die("a zip64 archive is not read here");
  const out = {};
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(at) !== 0x02014b50) die("zip: central directory entry " + i + " is malformed");
    const method = buf.readUInt16LE(at + 10);
    const packed = buf.readUInt32LE(at + 20), size = buf.readUInt32LE(at + 24);
    const nameLen = buf.readUInt16LE(at + 28), extraLen = buf.readUInt16LE(at + 30), noteLen = buf.readUInt16LE(at + 32);
    const local = buf.readUInt32LE(at + 42);
    const name = buf.toString("utf8", at + 46, at + 46 + nameLen);
    if (names.includes(name)) {
      if (buf.readUInt32LE(local) !== 0x04034b50) die("zip: the local header of " + name + " is malformed");
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const data = buf.subarray(start, start + packed);
      const body = method === 0 ? Buffer.from(data) : method === 8 ? zlib.inflateRawSync(data) : die(name + ": compression method " + method);
      if (body.length !== size) die(name + ": " + body.length + " bytes inflated, the zip says " + size);
      out[name] = body;
    }
    at += 46 + nameLen + extraLen + noteLen;
  }
  for (const n of names) if (!out[n]) die("the zip has no " + n);
  return out;
}

/* ---------- 3. the stage ------------------------------------------------- */
function filesUnder(dir) {
  const out = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else if (e.isFile()) out.push(p);
    }
  })(dir);
  return out;
}

function stage(bins, node) {
  fs.rmSync(STAGE, { recursive: true, force: true });
  const put = (rel, from) => {
    const to = path.join(STAGE, ...rel.split("/"));
    fs.mkdirSync(path.dirname(to), { recursive: true });
    if (Buffer.isBuffer(from)) fs.writeFileSync(to, from); else fs.copyFileSync(from, to);
  };
  for (const f of [PAGE, "glyph-engine.css", "README.md", "package.json"]) put(f, path.join(ROOT, f));
  for (const dir of ["scripts", ".scope/asset"])
    for (const p of filesUnder(path.join(ROOT, ...dir.split("/")))) put(posix(path.relative(ROOT, p)), p);
  put(ENGINE, bins["glyph-engine.exe"]);
  put("rust/target/release/glyph.exe", bins["glyph.exe"]);
  put(NODE, node.exe);
  put("node/LICENSE", node.license);
  return filesUnder(STAGE).map(p => posix(path.relative(STAGE, p)));
}

/* ---------- 4. the closure ----------------------------------------------- */
function closure() {
  const missing = [], seen = new Set();
  const visit = (rel, from) => {
    if (seen.has(rel)) return;
    seen.add(rel);
    const full = path.join(STAGE, ...rel.split("/"));
    if (!fs.existsSync(full)) { missing.push(rel + "  (reached from " + from + ")"); return; }
    const here = path.posix.dirname(rel);
    const text = /\.(js|css|html)$/.test(rel) ? fs.readFileSync(full, "utf8") : "";
    const refs = [];
    if (rel.endsWith(".html"))
      for (const m of text.matchAll(/\b(?:src|href)\s*=\s*"([^"]+)"/g)) refs.push(m[1]);
    if (rel.endsWith(".css"))
      for (const m of text.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)|@import\s+(['"])([^'"]+)\3/g)) refs.push(m[2] || m[4]);
    if (rel.endsWith(".js"))
      for (const m of text.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)(["'])(\.{1,2}\/[^"']+)\1/g)) refs.push(m[2]);
    for (const ref of refs) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(ref) || ref.startsWith("#") || ref.startsWith("//")) continue;
      const clean = ref.split(/[?#]/)[0];
      if (clean) visit(path.posix.normalize(path.posix.join(here, clean)), rel);
    }
  };
  visit(PAGE, "the shortcut");
  for (const rel of ["scripts/serve-dev.js", "package.json", NODE, ENGINE, ICON]) visit(rel, "the shortcut");
  if (missing.length) die("the stage misses " + missing.length + " file(s) the app reaches:\n  " + missing.join("\n  "));
  return seen.size;
}

/* ---------- 5. glyph.wxs ------------------------------------------------- */
const xa = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const hash = s => crypto.createHash("sha1").update(s).digest();
const idOf = (kind, rel) => kind + "_" + hash(kind + ":" + rel).toString("hex").slice(0, 24);
function guidOf(name) {
  const h = hash("glyph-msi:" + name);
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString("hex").toUpperCase();
  return x.slice(0, 8) + "-" + x.slice(8, 12) + "-" + x.slice(12, 16) + "-" + x.slice(16, 20) + "-" + x.slice(20, 32);
}

function wxs(files) {
  /* the folders as a tree, the files in the folder that holds them */
  const tree = { dirs: new Map(), files: [] };
  for (const rel of files) {
    const parts = rel.split("/");
    let node = tree;
    for (const d of parts.slice(0, -1)) {
      if (!node.dirs.has(d)) node.dirs.set(d, { dirs: new Map(), files: [] });
      node = node.dirs.get(d);
    }
    node.files.push(rel);
  }
  const comps = [];
  const lines = [];
  const emit = (node, prefix, depth) => {
    const pad = "  ".repeat(depth);
    for (const rel of node.files) {
      const c = idOf("c", rel);
      comps.push(c);
      lines.push(pad + '<Component Id="' + c + '" Guid="' + guidOf("component:" + rel) + '" Win64="yes">');
      lines.push(pad + '  <File Id="' + idOf("f", rel) + '" Name="' + xa(rel.split("/").pop()) + '" Source="' +
                 xa(path.join(STAGE, ...rel.split("/"))) + '" KeyPath="yes" />');
      lines.push(pad + "</Component>");
    }
    for (const [name, sub] of node.dirs) {
      const rel = prefix ? prefix + "/" + name : name;
      lines.push(pad + '<Directory Id="' + idOf("d", rel) + '" Name="' + xa(name) + '">');
      emit(sub, rel, depth + 1);
      lines.push(pad + "</Directory>");
    }
  };
  emit(tree, "", 5);
  const startMenu = "StartMenuShortcut";
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    "<!-- written by scripts/build-msi.js from its stage; never edited by hand -->",
    '<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi">',
    '  <Product Id="' + guidOf("product:" + VERSION.msi) + '" Name="Glyph" Language="1033" Version="' + VERSION.msi +
      '" Manufacturer="Glyph" UpgradeCode="' + UPGRADE_CODE + '">',
    '    <Package InstallerVersion="500" Compressed="yes" InstallScope="perMachine"',
    '             Description="Glyph ' + VERSION.engine + '" Comments="The Glyph page on the Rust engine, served by node" />',
    '    <MajorUpgrade DowngradeErrorMessage="A newer Glyph is already installed." />',
    '    <Media Id="1" Cabinet="glyph.cab" EmbedCab="yes" />',
    '    <Icon Id="glyph.ico" SourceFile="' + xa(path.join(STAGE, ...ICON.split("/"))) + '" />',
    '    <Property Id="ARPPRODUCTICON" Value="glyph.ico" />',
    '    <Directory Id="TARGETDIR" Name="SourceDir">',
    '      <Directory Id="ProgramFiles64Folder">',
    '        <Directory Id="INSTALLDIR" Name="Glyph">',
    ...lines,
    "        </Directory>",
    "      </Directory>",
    '      <Directory Id="ProgramMenuFolder">',
    '        <Component Id="' + startMenu + '" Guid="' + guidOf("component:start-menu") + '" Win64="yes">',
    '          <Shortcut Id="GlyphShortcut" Name="Glyph" Description="The Glyph page on the Rust engine"',
    '                    Target="[INSTALLDIR]node\\node.exe"',
    '                    Arguments="&quot;[INSTALLDIR]scripts\\serve-dev.js&quot; --engine rust --host 127.0.0.1"',
    '                    WorkingDirectory="INSTALLDIR" Icon="glyph.ico" />',
    '          <RegistryValue Root="HKCU" Key="Software\\Glyph" Name="shortcut" Type="integer" Value="1" KeyPath="yes" />',
    "        </Component>",
    "      </Directory>",
    "    </Directory>",
    '    <Feature Id="Glyph" Title="Glyph" Level="1">',
    ...comps.concat(startMenu).map(c => '      <ComponentRef Id="' + c + '" />'),
    "    </Feature>",
    "  </Product>",
    "</Wix>",
    ""
  ].join("\n");
}

/* ---------- 6. the .msi -------------------------------------------------- */
function onPath(tool) {
  const r = cp.spawnSync(WIN ? "where" : "which", [tool], { encoding: "utf8" });
  return r.status === 0 ? r.stdout.split(/\r?\n/)[0].trim() : null;
}

function buildMsi(wxsFile, msiFile) {
  const run = (tool, args) => {
    say(tool + " " + args.join(" "));
    const r = cp.spawnSync(tool, args, { stdio: "inherit" });
    if (r.error) die(tool + ": " + r.error.message);
    if (r.status !== 0) die(tool + " exited " + r.status);
  };
  if (onPath("wixl")) return run("wixl", ["-a", "x64", "-o", msiFile, wxsFile]), "wixl";
  const bin = process.env.WIX ? path.join(process.env.WIX, "bin") : null;
  const candle = onPath("candle") || (bin && fs.existsSync(path.join(bin, "candle.exe")) ? path.join(bin, "candle.exe") : null);
  const light = onPath("light") || (bin && fs.existsSync(path.join(bin, "light.exe")) ? path.join(bin, "light.exe") : null);
  if (!candle || !light) die("no MSI builder: install msitools (wixl) or WiX Toolset v3 (candle and light)");
  const obj = wxsFile.replace(/\.wxs$/, ".wixobj");
  run(candle, ["-nologo", "-arch", "x64", "-out", obj, wxsFile]);
  run(light, ["-nologo", "-out", msiFile, obj]);
  return "WiX v3";
}

/* ---------- the run ------------------------------------------------------ */
const started = Date.now();
fs.mkdirSync(OUT, { recursive: true });
const bins = buildEngine();
const node = await nodeForWindows();
const files = stage(bins, node);
const reached = closure();
say("stage: " + files.length + " files; the closure reaches " + reached + ", every one present");
const wxsFile = path.join(OUT, "glyph.wxs");
fs.writeFileSync(wxsFile, wxs(files));
const msiFile = path.join(OUT, "Glyph-" + VERSION.engine + "-x64.msi");
fs.rmSync(msiFile, { force: true });
const builder = buildMsi(wxsFile, msiFile);
const msi = fs.readFileSync(msiFile);
const manifest = {
  msi: path.basename(msiFile),
  version: VERSION.engine,
  msiVersion: VERSION.msi,
  builder: builder,
  bytes: msi.length,
  sha256: sha256(msi),
  node: { version: node.version, zipSha256: node.sha256 },
  files: files.length,
  seconds: Math.round((Date.now() - started) / 100) / 10
};
fs.writeFileSync(path.join(OUT, "msi.json"), JSON.stringify(manifest, null, 2) + "\n");
say(manifest.msi + ": " + manifest.bytes + " bytes, sha256 " + manifest.sha256 + ", by " + builder + ", in " + manifest.seconds + " s");
