/**
 * check-globals.js — no two files may publish the same browser global.
 *
 * The engine's browser side has no module system: `glyph-engine-alias.html`
 * loads four classic scripts in order and they find each other through mutable
 * globals. That works precisely as long as every global has one author. It has
 * not: `read-expansions.js` publishes `GlyphExpansions` as the *reader* of the
 * `expansions.txt` line format, while `build-templates.js` writes the parsed
 * *store* into `glyph-data.js` under the same name. Two unrelated objects, one
 * identifier.
 *
 * They have never collided because `read-expansions.js` is Node-only in
 * practice — it is not in the HTML's script list. That is not a property
 * anybody declared; it is one nobody has broken yet. Splitting the core, or
 * loading the reader in a browser for any reason, makes one silently clobber
 * the other, and "silently" is the whole problem: the second assignment wins
 * and the first consumer to ask gets an object of the wrong shape.
 *
 * So the invariant is checked rather than remembered.
 *
 *   node scripts/check-globals.js
 *
 * Exits 1 when a name has more than one author.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const DIR = __dirname;

/* `root.Name =` is the shape every UMD/IIFE wrapper in scripts/ uses to
   publish. Assignments to a local `root` variable inside a factory would be a
   false positive, but no file does that and the check is cheap enough that a
   false positive is better than a missed clobber. */
const ASSIGN = /\broot\.([A-Za-z_$][A-Za-z0-9_$]*)\s*=/g;

const authors = {};

fs.readdirSync(DIR)
  .filter(f => f.endsWith(".js") && f !== path.basename(__filename))
  .sort()
  .forEach(f => {
    const src = fs.readFileSync(path.join(DIR, f), "utf8");
    const seen = {};
    let m;
    while ((m = ASSIGN.exec(src))) {
      if (seen[m[1]]) continue;          /* one file may assign a name twice */
      seen[m[1]] = 1;
      (authors[m[1]] = authors[m[1]] || []).push(f);
    }
  });

const names = Object.keys(authors).sort();
const clashes = names.filter(n => authors[n].length > 1);

names.forEach(n => {
  const who = authors[n];
  console.log((who.length > 1 ? "  ✗ " : "  ✓ ") + n.padEnd(24) + who.join(", "));
});

console.log("\n" + names.length + " globals, " + clashes.length + " with more than one author.");

if (clashes.length) {
  console.error("\nFAILED: " + clashes.map(n => n + " (" + authors[n].join(" vs ") + ")").join("; "));
  console.error("Two files publishing one name means the load order decides which object wins,");
  console.error("and nothing reports the loser. Rename one, or stop publishing it to the browser.");
  process.exit(1);
}

console.log("Every global has exactly one author.");
