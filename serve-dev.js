#!/usr/bin/env node
/**
 * serve-dev.js — static server for checking the web app in a real browser.
 *
 * The app is built to be opened by double-click over file://, and that is how
 * it ships. But file:// cannot be driven by an automated browser (scripts do
 * not run in a static snapshot), so verifying a UI change meant taking it on
 * faith. This serves the same directory over http so the page can actually be
 * loaded, clicked and read.
 *
 * Development only — nothing in the app depends on it.
 *   node serve-dev.js [port]
 */

"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.argv[2]) || 8731;
const ROOT = __dirname;

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
}).listen(PORT, () => console.log("glyph dev server: http://localhost:" + PORT + "/"));
