#!/usr/bin/env node

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/**
 * serve-dev.js — how the app is opened, and how it is checked in a browser.
 *
 * It used to say the app opens by double-click over file:// and that nothing
 * depended on this file. That stopped being true when the module system moved
 * to ESM: `glyph-engine-alias.html` loads the parser and the UI as
 * `type="module"`, and a browser refuses a module over file:// on CORS. The page
 * still draws, so the failure looks like a frozen app rather than a load error.
 *
 * The decision was to keep ESM and make serving the way in, not to walk the
 * module system back. So this file is no longer development-only: it IS the app
 * launcher, and `glyph.cmd` at the repository root is the single click.
 *   node serve-dev.js [port] [--engine rust] [--no-open]
 *
 * It also relays the engine (EMS-001 ORD-0010, ADR B): `POST /engine` writes
 * the page's request, one JSON line, to an engine process's stdin and answers
 * with the line the engine writes back. The engine is `glyph-protocol.js` on
 * this same node, or the Rust `glyph-engine` with `--engine rust`; it starts
 * at the first request, and again after it dies.
 */

"use strict";

const http = require("http");
const fs = require("fs");
const cp = require("child_process");
const readline = require("readline");

const PORT = /^\d+$/.test(process.argv[2] || "") ? Number(process.argv[2]) : 8731;
const ROOT = path.join(__dirname, "..");   // serve o repo inteiro, nao so scripts/

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt":  "text/plain; charset=utf-8",
  ".md":   "text/plain; charset=utf-8"
};

const RUST = process.argv.includes("--engine") && process.argv[process.argv.indexOf("--engine") + 1] === "rust";
const ENGINE = RUST
  ? [path.join(ROOT, "rust", "target", "release", "glyph-engine" + (process.platform === "win32" ? ".exe" : "")), []]
  : [process.execPath, [path.join(__dirname, "glyph-protocol.js")]];

/* the engine answers in order, so the answers wait in the order asked */
let engine = null;
function engineOf() {
  if (engine) return engine;
  const child = cp.spawn(ENGINE[0], ENGINE[1], { stdio: ["pipe", "pipe", "inherit"] });
  const waiting = [];
  const die = e => {
    if (engine && engine.child === child) engine = null;
    waiting.splice(0).forEach(w => w.fail(e));
  };
  readline.createInterface({ input: child.stdout }).on("line", line => { const w = waiting.shift(); if (w) w.ok(line); });
  child.on("error", die);
  child.stdin.on("error", die);
  child.on("exit", () => die(new Error("the engine exited")));
  engine = {
    child: child,
    ask: body => new Promise((ok, fail) => {
      waiting.push({ ok: ok, fail: fail });
      child.stdin.write(body.replace(/[\r\n]+/g, " ") + "\n");
    })
  };
  return engine;
}

function relay(req, res) {
  let body = "";
  req.setEncoding("utf8");
  req.on("data", c => { body += c; });
  req.on("end", () => engineOf().ask(body).then(line => {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(line);
  }, e => {
    res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ thrown: "engine: " + e.message }));
  }));
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url.split("?")[0] === "/engine") return relay(req, res);
  const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "") || "glyph-engine-alias.html";
  const full = path.join(ROOT, rel);

  // never serve outside the directory
  if (!full.startsWith(ROOT)) { res.writeHead(403); return res.end("forbidden"); }

  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404); return res.end("not found: " + rel); }
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(full).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(data);
  });
});
server.listen(PORT, () => {
  const url = "http://localhost:" + server.address().port + "/glyph-engine-alias.html";
  console.log("glyph: " + url);
  /* one click means the browser opens itself. Zero dependencies, so this is
     the platform's own opener rather than a package. */
  if (process.argv.indexOf("--no-open") === -1) {
    const cmd = process.platform === "win32" ? 'start ""'
              : process.platform === "darwin" ? "open" : "xdg-open";
    cp.exec(cmd + ' "' + url + '"', () => {});
  }
});
