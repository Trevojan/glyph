"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const LANGUAGE_IDS = Object.freeze(["pgml", "hgml"]);
const SEVERITY_NAMES = Object.freeze({
  fix: "Error",
  ask: "Information",
  note: "Warning"
});
const INDENT = "  ";

function readStore(root, filename, useStore) {
  const fullPath = path.join(root, ".guidelines", filename);
  const store = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  useStore(store);
}

async function loadGlyphCore(extensionPath) {
  const root = path.resolve(extensionPath, "..");
  const coreUrl = pathToFileURL(path.join(root, "scripts", "glyph-parser.js")).href;
  const imported = await import(coreUrl);
  const glyph = imported.default;

  readStore(root, "templates.json", glyph.useTemplates);
  readStore(root, "rules.json", glyph.useRules);
  readStore(root, "expansions.json", glyph.useExpansions);
  return glyph;
}

/* The engine writes its diagnostics in en-EU and in pt-BR; the Problems panel
   is interface, so it follows the language VS Code is displayed in. */
function diagnosticLanguage(displayLanguage) {
  return /^pt\b/i.test(displayLanguage || "") ? "pt" : "en";
}

function diagnosticsFor(vscode, document, gaps) {
  return gaps.map(function (gap) {
    const severityName = SEVERITY_NAMES[gap.sev];
    if (!severityName || typeof vscode.DiagnosticSeverity[severityName] !== "number") {
      throw new Error("Unsupported Glyph diagnostic severity: " + gap.sev);
    }

    let range = new vscode.Range(0, 0, 0, 0);
    if (gap.at) {
      const start = gap.at.s;
      const end = gap.at.e;
      const length = document.getText().length;
      if (!Number.isInteger(start) || !Number.isInteger(end) ||
          start < 0 || end < start || end > length) {
        throw new Error("Invalid source span for Glyph diagnostic " + gap.code);
      }
      range = new vscode.Range(document.positionAt(start), document.positionAt(end));
    }

    const message = gap.plain || gap.msg || gap.lab || gap.code;
    const diagnostic = new vscode.Diagnostic(
      range,
      gap.code + ": " + message,
      vscode.DiagnosticSeverity[severityName]
    );
    diagnostic.source = "Glyph";
    diagnostic.code = gap.code;
    return diagnostic;
  });
}

/* ------------------------------------------------------------------ *
 * The formatter moves whitespace and nothing else.
 *
 * It edits only the whitespace between two tokens that the lexer throws
 * away, so the tokens, the XML, the AST and the diagnostics of the
 * formatted text are those of the source. Whitespace next to a token that
 * swallows it (prose, an [off] region, a literal that a bracket or a line
 * end closed) is left as written.
 *
 * Layout. A command that spans lines puts each nested command on its own
 * line, two spaces deeper than itself, and closes on its own line at its
 * own depth, unless its close follows another close: a run of closing
 * brackets stays concatenated as written. A command on one line stays on
 * it, so one line break after an opener is how the author asks for the
 * level to open up. Lines are never joined, and every line that starts
 * with a token is indented by the depth of that token; a line that starts
 * with a close takes the depth of the command it ends. The Orders of this
 * repository and the burn's own `.hgml` are already in this layout.
 * ------------------------------------------------------------------ */

const OPENING = new Set(["open", "tpl", "chain"]);
const WHOLE_COMMAND = new Set(["logic", "rawfence"]);
const CLOSING = new Set(["close", "closeTag"]);

/* the end of what a token owns; `[--name` takes its trailing whitespace
   into the token, and that whitespace is layout */
function tokenEnd(source, token) {
  if (token.k === "tpl" && !token.def) {
    const own = /^\[--\s*[A-Za-z0-9_.-]+/.exec(source.slice(token.s, token.e));
    if (own) return token.s + own[0].length;
  }
  return token.e;
}

function swallowsWhitespace(token) {
  if (token.k === "text" || token.k === "raw" || token.k === "modeUnclosed") return true;
  if (token.k === "literal") return token.closedBy !== "tick" && token.closedBy !== "quote";
  if (WHOLE_COMMAND.has(token.k)) return !token.closed;
  return false;
}

function commandTree(tokens) {
  const opened = new Map();
  const closed = new Map();
  const nodes = [];
  const stack = [];

  tokens.forEach(function (token, index) {
    const parent = stack[stack.length - 1] || null;
    if (OPENING.has(token.k) || WHOLE_COMMAND.has(token.k)) {
      const node = { start: index, end: WHOLE_COMMAND.has(token.k) ? index : -1,
                     depth: stack.length, parent: parent, breaks: false };
      nodes.push(node);
      opened.set(index, node);
      if (OPENING.has(token.k)) stack.push(node);
    } else if (CLOSING.has(token.k) && stack.length > 0) {
      const node = stack.pop();
      node.end = index;
      closed.set(index, node);
    } else if (token.k === "semi") {
      stack.length = 0;
    }
  });
  return { nodes: nodes, opened: opened, closed: closed };
}

function formatGlyph(source, tokens) {
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const tree = commandTree(tokens);

  /* gaps[i]: the whitespace run before token i, or null where tokens touch,
     overlap, or the run holds anything but whitespace */
  const gaps = [];
  const swallowed = [];
  let reach = 0;
  let reacher = null;
  tokens.forEach(function (token, index) {
    gaps[index] = null;
    if (token.s >= reach) {
      const text = source.slice(reach, token.s);
      if (/^\s*$/.test(text)) gaps[index] = { from: reach, to: token.s, text: text };
      swallowed[index] = reacher !== null && swallowsWhitespace(reacher);
    } else {
      swallowed[index] = true;
    }
    const end = tokenEnd(source, token);
    if (end >= reach) { reach = end; reacher = token; }
  });

  /* lineBreaks[i]: how many gaps before token i hold a line break, so a
     command spans lines when the count moves between its two brackets */
  const lineBreaks = [0];
  tokens.forEach(function (token, index) {
    lineBreaks[index + 1] = lineBreaks[index] +
      (gaps[index] && gaps[index].text.includes("\n") ? 1 : 0);
  });
  tree.nodes.forEach(function (node) {
    node.breaks = node.end > node.start && lineBreaks[node.end + 1] > lineBreaks[node.start + 1];
  });

  function lineAt(depth, gapText) {
    const count = Math.max(1, (gapText.match(/\n/g) || []).length);
    return newline.repeat(count) + INDENT.repeat(depth);
  }

  const edits = [];
  let depth = 0;
  tokens.forEach(function (token, index) {
    const gap = gaps[index];
    const opening = tree.opened.get(index);
    const closing = tree.closed.get(index);
    let want = null;

    if (opening) {
      if (opening.parent && opening.parent.breaks) want = lineAt(opening.depth, gap ? gap.text : "");
    } else if (closing) {
      if (closing.breaks && !(index > 0 && CLOSING.has(tokens[index - 1].k))) {
        want = lineAt(closing.depth, gap ? gap.text : "");
      }
    }
    if (want === null && gap && gap.text.includes("\n")) {
      const at = opening ? opening.depth : closing ? closing.depth : depth;
      want = lineAt(at, gap.text);
    }

    if (want !== null && gap && !swallowed[index] && want !== gap.text) {
      edits.push({ from: gap.from, to: gap.to, text: want });
    }

    if (opening && OPENING.has(token.k)) depth = opening.depth + 1;
    else if (closing) depth = closing.depth;
    else if (token.k === "semi") depth = 0;
  });

  let output = "";
  let cursor = 0;
  edits.forEach(function (edit) {
    output += source.slice(cursor, edit.from) + edit.text;
    cursor = edit.to;
  });
  return output + source.slice(cursor);
}

function activate(context) {
  const vscode = require("vscode");
  const diagnostics = vscode.languages.createDiagnosticCollection("glyph");
  const timers = new Map();
  const lang = diagnosticLanguage(vscode.env.language);
  let glyphPromise;
  let errorReported = false;

  function getGlyph() {
    if (!glyphPromise) glyphPromise = loadGlyphCore(context.extensionPath);
    return glyphPromise;
  }

  function reportExtensionError(error) {
    if (errorReported) return;
    errorReported = true;
    vscode.window.showErrorMessage("Glyph verification failed: " + error.message);
  }

  function supported(document) {
    return LANGUAGE_IDS.includes(document.languageId);
  }

  async function validate(document) {
    if (!supported(document)) return;
    const glyph = await getGlyph();
    const result = glyph.parse(document.getText(), { lang: lang });
    diagnostics.set(document.uri, diagnosticsFor(vscode, document, result.gaps || []));
  }

  function schedule(document) {
    if (!supported(document)) return;
    const key = document.uri.toString();
    const existing = timers.get(key);
    if (existing) clearTimeout(existing);
    timers.set(key, setTimeout(function () {
      timers.delete(key);
      validate(document).catch(reportExtensionError);
    }, 200));
  }

  context.subscriptions.push(
    diagnostics,
    vscode.languages.registerDocumentFormattingEditProvider(
      LANGUAGE_IDS.slice(),
      {
        async provideDocumentFormattingEdits(document) {
          const glyph = await getGlyph();
          const source = document.getText();
          const formatted = formatGlyph(source, glyph.tokenize(source));
          if (formatted === source) return [];
          const fullDocument = new vscode.Range(
            document.positionAt(0),
            document.positionAt(source.length)
          );
          return [vscode.TextEdit.replace(fullDocument, formatted)];
        }
      }
    ),
    vscode.workspace.onDidOpenTextDocument(schedule),
    vscode.workspace.onDidChangeTextDocument(function (event) {
      schedule(event.document);
    }),
    vscode.workspace.onDidCloseTextDocument(function (document) {
      const key = document.uri.toString();
      const timer = timers.get(key);
      if (timer) clearTimeout(timer);
      timers.delete(key);
      diagnostics.delete(document.uri);
    })
  );

  getGlyph().then(function () {
    vscode.workspace.textDocuments.forEach(schedule);
  }).catch(reportExtensionError);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
  diagnosticLanguage,
  diagnosticsFor,
  formatGlyph,
  loadGlyphCore
};
