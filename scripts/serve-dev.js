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
 *   node serve-dev.js [port]
 */

"use strict";

const http = require("http");
const fs = require("fs");

const PORT = Number(process.argv[2]) || 8731;
const ROOT = path.join(__dirname, "..");   // serve o repo inteiro, nao so scripts/

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt":  "text/plain; charset=utf-8",
  ".md":   "text/plain; charset=utf-8"
};

http.createServer((req, res) => {
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
}).listen(PORT, () => {
  const url = "http://localhost:" + PORT + "/glyph-engine-alias.html";
  console.log("glyph: " + url);
  /* one click means the browser opens itself. Zero dependencies, so this is
     the platform's own opener rather than a package. */
  if (process.argv.indexOf("--no-open") === -1) {
    const cmd = process.platform === "win32" ? 'start ""'
              : process.platform === "darwin" ? "open" : "xdg-open";
    import("node:child_process").then(cp =>
      cp.exec(cmd + ' "' + url + '"', () => {}));
  }
});
