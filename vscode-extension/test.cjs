"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { diagnosticLanguage, diagnosticsFor, formatGlyph, loadGlyphCore } = require("./extension.cjs");

const extensionPath = __dirname;
const root = path.resolve(extensionPath, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(extensionPath, "package.json"), "utf8"));
const grammar = JSON.parse(fs.readFileSync(path.join(extensionPath, "syntaxes", "glyph.tmLanguage.json"), "utf8"));

assert.deepEqual(
  manifest.contributes.languages.map(language => [language.id, ...language.extensions]),
  [["pgml", ".pgml"], ["hgml", ".hgml"]]
);
assert.equal(grammar.scopeName, "source.glyph");
for (const rule of ["command", "placeholder", "literal", "mood", "template", "chain", "raw", "off", "logic", "return"]) {
  assert.ok(grammar.repository[rule], "grammar rule " + rule);
}
for (const include of grammar.patterns) {
  assert.ok(grammar.repository[include.include.slice(1)], "grammar include " + include.include);
}

/* every pattern compiles; Oniguruma's leading (?i) is JavaScript's i flag */
(function compiles(node) {
  if (!node || typeof node !== "object") return;
  for (const key of ["match", "begin", "end"]) {
    if (typeof node[key] !== "string") continue;
    const caseless = node[key].startsWith("(?i)");
    assert.doesNotThrow(() => new RegExp(caseless ? node[key].slice(4) : node[key], caseless ? "i" : ""),
      "grammar pattern " + node[key]);
  }
  Object.values(node).forEach(compiles);
})(grammar);

assert.equal(diagnosticLanguage("pt-br"), "pt");
assert.equal(diagnosticLanguage("pt"), "pt");
assert.equal(diagnosticLanguage("en"), "en");
assert.equal(diagnosticLanguage(undefined), "en");

function mockVscode() {
  class Range {
    constructor(startLine, startCharacter, endLine, endCharacter) {
      if (typeof startLine === "object") {
        this.start = startLine;
        this.end = startCharacter;
      } else {
        this.start = { line: startLine, character: startCharacter };
        this.end = { line: endLine, character: endCharacter };
      }
    }
  }
  class Diagnostic {
    constructor(range, message, severity) {
      this.range = range;
      this.message = message;
      this.severity = severity;
    }
  }
  return {
    Range,
    Diagnostic,
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2 }
  };
}

function documentOf(text) {
  return {
    getText: () => text,
    positionAt(offset) {
      const before = text.slice(0, offset).split("\n");
      return { line: before.length - 1, character: before[before.length - 1].length };
    }
  };
}

const mapped = diagnosticsFor(mockVscode(), documentOf("[x]"), [
  { sev: "fix", code: "Broken", plain: "Malformed source", at: { s: 0, e: 1 } },
  { sev: "ask", code: "Missing", plain: "More information is needed" },
  { sev: "note", code: "Shape", plain: "Check this shape" }
]);
assert.deepEqual(mapped.map(diagnostic => diagnostic.severity), [0, 2, 1]);
assert.deepEqual(mapped[0].range.start, { line: 0, character: 0 });
assert.deepEqual(mapped[0].range.end, { line: 0, character: 1 });
assert.equal(mapped[0].source, "Glyph");
assert.equal(mapped[1].range.start.character, 0);
assert.throws(
  () => diagnosticsFor(mockVscode(), documentOf("[x]"), [{ sev: "unexpected", code: "Unknown" }]),
  /Unsupported Glyph diagnostic severity/
);
assert.throws(
  () => diagnosticsFor(mockVscode(), documentOf("[x]"), [{ sev: "fix", code: "BadSpan", at: { s: 1, e: 8 } }]),
  /Invalid source span/
);

/* the .pgml and .hgml files this repository keeps */
function sourcesUnder(directory) {
  const found = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...sourcesUnder(full));
    else if (/\.(pgml|hgml)$/.test(entry.name)) found.push(full);
  }
  return found;
}

async function verifyParserIntegration() {
  const glyph = await loadGlyphCore(extensionPath);
  const shape = text => glyph.parse(text, { lang: "en" }).gaps.map(gap => [gap.code, gap.sev]);
  const format = text => formatGlyph(text, glyph.tokenize(text));

  /* the Order Matrix the extension was written against: its holes reach
     the editor as questions, not as refusals */
  const production = fs.readFileSync(path.join(root, ".scope", "generics", "production.pgml"), "utf8");
  const productionGaps = glyph.parse(production, { lang: "en" }).gaps;
  const productionDiagnostics = diagnosticsFor(mockVscode(), documentOf(production), productionGaps);
  assert.ok(productionGaps.some(gap => gap.code === "PlaceholderPending" && gap.sev === "ask"));
  assert.ok(productionDiagnostics.some(diagnostic => diagnostic.severity === 2));

  /* an anonymous block is broken structure, and the refusal is an error */
  const anonymous = "[block[ctx'x']]";
  const anonymousGaps = glyph.parse(anonymous, { lang: "en" }).gaps;
  const refusal = diagnosticsFor(mockVscode(), documentOf(anonymous), anonymousGaps)
    .find(diagnostic => diagnostic.code === "MissingStructName");
  assert.ok(refusal, "MissingStructName for an anonymous block");
  assert.equal(refusal.severity, 0);

  const hgml = glyph.toHGML("[prob'timeout']");
  diagnosticsFor(mockVscode(), documentOf(hgml), glyph.parse(hgml, { lang: "en" }).gaps);
  assert.ok(glyph.parse("[", { lang: "en" }).gaps.some(gap => gap.sev === "fix"));

  /* a span the engine gives lands where it points */
  const spanned = "[core\n  [in-rwk/ins/fmt]\n]";
  const slash = glyph.parse(spanned, { lang: "en" }).gaps.find(gap => gap.at);
  assert.ok(slash, "a diagnostic with a source span");
  const placed = diagnosticsFor(mockVscode(), documentOf(spanned), [slash])[0];
  assert.equal(placed.range.start.line, 1);
  assert.equal(spanned.slice(slash.at.s, slash.at.e), "/ins/fmt");

  /* the formatter moves whitespace only: for every source the repository
     keeps, the XML and the diagnostics hold, and a second pass is a no-op */
  const kept = sourcesUnder(path.join(root, ".guidelines", ".orders"))
    .concat(sourcesUnder(path.join(root, ".scope")));
  assert.ok(kept.length >= 40, "the repository's Glyph sources");
  for (const file of kept) {
    const text = fs.readFileSync(file, "utf8");
    const formatted = format(text);
    const name = path.relative(root, file);
    assert.equal(glyph.toXML(formatted), glyph.toXML(text), "XML of " + name);
    assert.deepEqual(shape(formatted), shape(text), "diagnostics of " + name);
    assert.equal(format(formatted), formatted, "second pass over " + name);
  }

  /* the Orders of the series and their burns are already in the layout */
  for (const file of sourcesUnder(path.join(root, ".guidelines", ".orders", "EMS-001"))) {
    const text = fs.readFileSync(file, "utf8");
    assert.equal(format(text), text, path.relative(root, file) + " is laid out");
  }

  /* a command that spans lines opens up; one on a single line stays */
  const sample = "[core\n  [prio\n    [nt`something important`,[ph-importance`high`\n    ]]]\n]";
  const formattedSample = [
    "[core",
    "  [prio",
    "    [nt`something important`,",
    "      [ph-importance`high`",
    "      ]]]",
    "]"
  ].join("\n");
  assert.equal(format(sample), formattedSample);
  assert.equal(format("[block'x'[ctx'a'][tgt'b']]"), "[block'x'[ctx'a'][tgt'b']]");
  assert.equal(format("[block'x'\n[ctx'a'][tgt'b'\n]]"), "[block'x'\n  [ctx'a']\n  [tgt'b'\n  ]]");
  assert.equal(format("[block'x'\n[ctx'a'] 'tail']"), "[block'x'\n  [ctx'a'] 'tail'\n]");
  assert.equal(format("[block'x'\n      [ctx'a']\n\n\n[tgt'b']\n    ];"), "[block'x'\n  [ctx'a']\n\n\n  [tgt'b']\n];");

  /* the burn's layout: [/name] on its own line, at the depth of its opener */
  const burn = "[block\n'x'\n[ctx\n'a'\n[/ctx]\n[cnst[/cnst]\n[/block]";
  assert.equal(format(burn), "[block\n  'x'\n  [ctx\n    'a'\n  [/ctx]\n  [cnst[/cnst]\n[/block]");

  /* literal content is kept exactly, and whitespace a token swallows stays */
  const literalSource = "[core\n[nt`first line\n  still literal`]\n[go`x ]";
  const formattedLiteral = format(literalSource);
  assert.ok(formattedLiteral.includes("`first line\n  still literal`"));
  assert.equal(glyph.toXML(formattedLiteral), glyph.toXML(literalSource));
  for (const swallowing of ["[nt prose [b'x']\n  [c'y'] more\n]", "[off]\n  [x'y']\n[on]", "[nt`a ] b`]"]) {
    assert.equal(glyph.toXML(format(swallowing)), glyph.toXML(swallowing), swallowing);
  }

  const crlfSource = "[core\r\n[nt`x`]\r\n]\r\n";
  const crlfFormatted = format(crlfSource);
  assert.equal(crlfFormatted, "[core\r\n  [nt`x`]\r\n]\r\n");
  assert.ok(!/(?<!\r)\n/.test(crlfFormatted));

  const closedSegment = "[core\n[prio];[nt`next`\n]";
  assert.equal(format(closedSegment), "[core\n  [prio];[nt`next`\n]");

  /* nesting as deep as the engine's own ceiling formats without recursion */
  const deep = "[a\n".repeat(8000) + "]".repeat(8000);
  assert.equal(format(format(deep)), format(deep));

  console.log("VS Code Glyph extension checks passed.");
}

verifyParserIntegration().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
