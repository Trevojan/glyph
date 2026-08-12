/**
 * Glyph Corpus Test Suite v1.0.9 (test-corpus.js)
 *
 * The v1.8 suite counted segments and gave PASS to anything: in the negative
 * cases it incremented the counter in all three branches (including the
 * catch and the "no error" branch), so 9/9 was true by construction, not by
 * merit. This version makes assertions about the AST and the XML, and exits
 * with a non-zero code.
 *
 * Three buckets, because Glyph's design distinguishes three things v1.8
 * lumped together as "negative":
 *
 *   P — positive   : parses clean, no `fix`-severity diagnostic.
 *   I — incomplete : missing information. NOT an error: becomes <needs> in
 *                    the XML and the input stays usable ("an empty slot does
 *                    not block").
 *   N — invalid    : broken syntax or vocabulary, `fix` severity.
 *   R — regression : the v1.8 gaps the unification closed.
 */

"use strict";

const G = require("./glyph-parser.js");

/* Stores travel through opts in the cases that need them, so the suite
   doesn't depend on the module's global state or on test order. */
const TPL = require("./glyph-templates.json");
const RULESTORE = require("./glyph-rules.json");
const WITH_TPL = { templates: TPL.templates };
const WITH_RULES = { rules: RULESTORE };
/* Template constraints naming a class ("@coarsen") resolve it through the
   rules store, so those cases need both loaded. */
const WITH_BOTH = { templates: TPL.templates, rules: RULESTORE };

/* ------------------------------------------------------------------ *
 * cases
 * ------------------------------------------------------------------ */

const POSITIVE = [
  { id:"P-01", name:"Summarize this.", src:"[SUM]",
    xml:["<summary>", "<needs>o que resumir</needs>"] },
  { id:"P-02", name:"Summarize this, step by step.", src:"[SUM'step by step']",
    xml:["<summary>", "<user-input>step by step</user-input>"], clean:true },
  { id:"P-03", name:"Criticize, considering the context.", src:"[CRIT[CTX]]",
    cmds:["CRIT","CTX"] },
  { id:"P-04", name:"Criticize and ask.", src:"[CRIT[CTX],[ASK;",
    cmds:["CRIT","CTX","ASK"] },
  { id:"P-05", name:"Compare two terms.", src:"[CMP'termo1','termo2']",
    clean:true, xml:["<compare>"] },
  { id:"P-06", name:"Review, improve and format.", src:"[REV-IMPR-FMT]",
    clean:true, cmds:["CRIT","IMPR","FMT"], xml:["<criticize>","<improve/>","<format/>"] },
  { id:"P-07", name:"Section A: criticize and propose.", src:"[SECTION'sectA',[CRIT],[PROP[ALT]]]",
    cmds:["SECTION","CRIT","PROP","ALT"] },
  { id:"P-08", name:"Prefix comparison gt.", src:"[COND[gt[VAR'A'],[VAR'B']],[INSTOF[SUM],[ASK;",
    cmds:["COND","GT","VAR","VAR","INSTOF","SUM","ASK"] },
  { id:"P-10", name:"Template invocation.", src:"[--REVCHECK]",
    xml:['<template name="REVCHECK"/>'] },
  { id:"P-13", name:"Default value.", src:"[DEF]", clean:true, xml:["<define/>"] },
  { id:"P-14", name:"Emotion with enthusiasm.", src:"/eth/[BRST'3']",
    clean:true, xml:['<mood dominant="entusiasmo"/>'] },
  { id:"P-15", name:"Block B: verify and conclude.", src:"[BLOCK'blockB',[VRFY],[CNCL]]",
    cmds:["BLOCK","VRFY","CNCL"] },
  { id:"P-16", name:"Segment boundary.", src:"[SUM];[LIM]", segments:2 },
  { id:"P-17", name:"Literal as-is.", src:"[INS[RWK'as-is']]",
    clean:true, xml:["<user-input>as-is</user-input>"] },
  { id:"P-18", name:"Triple auto-close.", src:"[INS[ASSM[ASK;",
    cmds:["INS","ASSM","ASK"] },
  { id:"P-19", name:"Define symbol with DFN.", src:"[DFN'API','Interface de Programação']",
    clean:true, xml:["<define-symbol>"] },
  { id:"P-20", name:"Validate against a specification.", src:"[VAL'solução','especificação']",
    clean:true, xml:["<validate>"] },
  { id:"P-21", name:"Alias EVAL resolves to CRIT.", src:"[EVAL'projeto']",
    clean:true, cmds:["CRIT"], xml:["<criticize>"] },
  { id:"P-22", name:"Alias SPEC resolves to ELAB.", src:"[SPEC'requisito']",
    clean:true, cmds:["ELAB"] },
  { id:"P-23", name:"CTX slots (what, where, when).", src:"[CTX'banco','prodDB','v1.7']",
    clean:true, xml:["<context>","<user-input>prodDB</user-input>"] },
  { id:"P-24", name:"ERROR is a hieroglyph — atomic command, no arity.", src:"[ERROR]",
    clean:true, xml:["<error/>"] },
  { id:"P-25", name:"PROB is composite ERROR+CTX — accepts nested context.", src:"[PROB[CTX'timeout']]",
    clean:true, cmds:["PROB","CTX"], xml:["<problem>","<context>"] }
];

const INCOMPLETE = [
  { id:"I-01", name:"IF with no condition becomes <needs>", src:"[IF;",
    code:"UnfilledSlot", xml:["<needs>a condição</needs>"] },
  { id:"I-02", name:"CMP with a single term warns", src:"[CMP'a']",
    code:"SingletonList" },
  { id:"I-06", name:"Template not defined in this session", src:"[--NAOEXISTE]",
    code:"UndefinedTemplate" },
  { id:"I-08", name:"GT missing the second term", src:"[gt'A']",
    code:"MissingOperand", xml:['<needs slot="2">o segundo termo</needs>'] },
  { id:"I-09", name:"DFN missing the meaning", src:"[DFN'símbolo']",
    code:"MissingOperand", xml:['<needs slot="2">o significado</needs>'] },
  { id:"I-10", name:"VAL missing the external criterion", src:"[VAL'alvo']",
    code:"MissingOperand", xml:['<needs slot="2">o critério externo</needs>'] }
];

const INVALID = [
  { id:"N-03", name:"SECTION with no literal name", src:"[SECTION,[CRIT]]",
    code:"MissingStructName" },
  { id:"N-04", name:"Dangling extension", src:"[COND-]",
    code:"DanglingChain" },
  { id:"N-05", name:"Unterminated literal", src:"[SUM'abc",
    code:"UnterminatedLiteral" },
  { id:"N-09", name:"FAIL outside the vocabulary", src:"[IF[INS[FAIL]],[MAND[FMT]",
    code:"UnknownCommand", xml:['<unresolved tag="FAIL"'] },
  { id:"N-11", name:"BOGUS outside the vocabulary", src:"[CRIT[CTX],[IF[BOGUS],[WARN];",
    code:"UnknownCommand" },
  { id:"N-12", name:"ABREV outside the vocabulary", src:"[AVD[ABREV'X']]",
    code:"UnknownCommand" },
  { id:"N-13", name:"] with no open command", src:"[SUM]]",
    code:"UnmatchedCloseBracket" },
  { id:"N-14", name:"[logic] with no [/logic]", src:"[logic]a = 1",
    code:"UnclosedLogic" },
  { id:"N-15", name:"[/sum] closes an unopened command", src:"[crit][/sum]",
    code:"UnmatchedCloseTag" },
  { id:"N-16", name:"[ with no name", src:"[ ]",
    code:"EmptyCommandName" },
  { id:"N-17", name:"Template definition with no body", src:"[--t=",
    code:"EmptyTemplateDefinition" }
];

/* The four v1.8 gaps: tokens the standalone parser silently dropped, plus
   the data-suffix leak inside the [logic] block. */
const REGRESSION = [
  { id:"R-01", name:"hyphen chain preserves every link", src:"[REV-IMPR-FMT]",
    cmds:["CRIT","IMPR","FMT"] },
  { id:"R-02", name:"free text survives as <off>", src:"[INS] escreva isto aqui",
    xml:["<off>escreva isto aqui</off>"] },
  { id:"R-03", name:";; emits a break instead of vanishing", src:"[SUM];;[LIM]",
    xml:["<break/>"] },
  { id:"R-04", name:"[logic] block reaches the XML", src:"[logic-dano]\nhp = 3d6kh2\n[/logic]",
    xml:['<logic name="dano">', '<rule kind="let" var="hp">'] },
  { id:"R-05", name:"kh suffix does not leak as a variable", src:"[logic]\nroll = 4d6kh3\n[/logic]",
    xmlAbsent:['<needs var="kh3">'] }
];

/* Long blocks: in Glyph every `[` without a `]` nests, so a long query
   grows deep, not wide. These cases pin down the three breakages that caused. */
const LONG = [
  { id:"L-01", name:"XML emitter does not overflow the stack at 8000 levels",
    src:"[ins".repeat(8000) + ";", noThrow:true },
  { id:"L-02", name:"AST does not overflow, truncates with a marker",
    src:"[ins".repeat(2000) + ";", noThrow:true, astTruncated:true },
  { id:"L-03", name:"indent has a ceiling: XML grows linearly, not quadratically",
    src:"[ins".repeat(400) + ";", maxXmlBytes:40000 },
  { id:"L-04", name:"r- block preserves the content, not just the summary",
    src:"r-[tgt`user command blocks`[skep[crit-[scru",
    xml:["<user-input>user command blocks</user-input>", 'expects="target,skeptic,criticize,scrutinize"'] },
  { id:"L-05", name:"deep nesting gets flagged",
    src:"[ins".repeat(12) + ";", code:"DeepNesting" },
  { id:"L-06", name:"`;` closing a lot at once gets flagged",
    src:"[ins".repeat(12) + ";", code:"MassAutoClose" },
  { id:"L-07", name:"command written without a bracket doesn't turn into silent prose",
    src:"rd [ctx'engine']", code:"LooseCommandWord" },
  { id:"L-08", name:"ordinary prose is not a false positive",
    src:"[ins`x`] uma frase inteira de prosa aqui", codeAbsent:"LooseCommandWord" }
];

/* Templates: through v1.0.9.1 the invocation didn't bring in the definition's
   body, not even in the same message. The reader was what connected the ends. */
const TEMPLATES = [
  { id:"T-01", name:"invocation expands the definition's body",
    src:"[--germinate'analise','clareza']", opts:WITH_TPL,
    xml:['expanded="true"', "<skill>", "<user-input>tree logic structure</user-input>"] },
  { id:"T-02", name:"positional binding fills in declaration order",
    src:"[--germinate'analise','clareza']", opts:WITH_TPL,
    xml:['<user-input slot="alvo">analise</user-input>',
         '<user-input slot="criterio">clareza</user-input>'] },
  { id:"T-03", name:"binding by name fills the right slot",
    src:"[--germinate[ph-criterio'clareza']]", opts:WITH_TPL,
    xml:['<user-input slot="criterio">clareza</user-input>', '<needs slot="alvo">'] },
  { id:"T-04", name:"unfilled slot becomes <needs>, does not block",
    src:"[--germinate]", opts:WITH_TPL,
    xml:['<needs slot="alvo">', '<needs slot="criterio">'], noFix:true },
  { id:"T-05", name:"extra call content survives the expansion",
    src:"[--germinate'a','b'[mand[tgt`extra`]]]", opts:WITH_TPL,
    xml:["<mandatory>", "<user-input>extra</user-input>"] },
  { id:"T-06", name:"the template's gloss travels as means",
    src:"[--germinate'a','b']", opts:WITH_TPL, xml:['means="'] },
  { id:"T-07", name:"a direct cycle is interrupted and reported",
    src:"[--loop]", code:"TemplateCycle",
    opts:{ templates:{ loop:{ body:"[--loop]", params:[] } } } },
  { id:"T-08", name:"an indirect cycle too",
    src:"[--a]", code:"TemplateCycle",
    opts:{ templates:{ a:{ body:"[--b]", params:[] }, b:{ body:"[--a]", params:[] } } } },
  { id:"T-09", name:"broken syntax in the stored body bubbles up",
    src:"[--quebrado]", code:"UnterminatedLiteral",
    opts:{ templates:{ quebrado:{ body:"[sum'abc", params:[] } } } },
  { id:"T-10", name:"unknown template stays just a warning",
    src:"[--naoexiste]", opts:WITH_TPL, code:"UndefinedTemplate", noFix:true },
  { id:"T-11", name:"repeatable slot: 2 candidates by position (default)",
    src:"[--best-of'ctx','A','B','crit']", opts:WITH_TPL,
    xml:["<user-input slot=\"a\">A</user-input>", "<user-input slot=\"b\">B</user-input>"],
    xmlAbsent:["slot=\"more\""] },
  { id:"T-12", name:"repeatable slot: N candidates via repeated [ph-more]",
    src:"[--best-of'ctx','A','B'[ph-more'C'][ph-more'D'][ph-criterion'crit']]", opts:WITH_TPL,
    xml:["<user-input slot=\"more\">C</user-input>", "<user-input slot=\"more2\">D</user-input>",
         "<user-input slot=\"criterion\">crit</user-input>"] }
];

/* Template constraints: the rules above are local (command vs command).
   These check the SHAPE a preset promised, only inside its own expansion —
   the gap that let a loop be handed commands dissolving the loop itself. */
const CONSTRAINTS = [
  { id:"K-01", name:"preset intacto não acusa nada",
    src:"[--loop'a arquitetura','um nível mais fino','quando couber numa página']",
    opts:WITH_BOTH, codeAbsent:"TemplateConstraint:", noFix:true },
  { id:"K-02", name:"improvisar DENTRO da passagem é permitido",
    src:"[--loop'x','y','z'[brst'ideias para a próxima passagem']]",
    opts:WITH_BOTH, codeAbsent:"TemplateConstraint:" },
  { id:"K-03", name:"regredir o nível de detalhe é sinalizado",
    src:"[--loop'x','y','z'[gen'o padrão geral']]",
    opts:WITH_BOTH, code:"TemplateConstraint:no-coarsen", noFix:true },
  { id:"K-04", name:"abandonar o laço é sinalizado",
    src:"[--loop'x','y','z'[instof'outro alvo']]",
    opts:WITH_BOTH, code:"TemplateConstraint:no-exit", noFix:true },
  { id:"K-05", name:"[ovr] isenta: a saída foi pedida em voz alta",
    src:"[--loop'x','y','z'[ovr[gen'o padrão']]]",
    opts:WITH_BOTH, codeAbsent:"TemplateConstraint:" },
  { id:"K-06", name:"o mesmo comando fora do preset não acusa",
    src:"[gen'x']", opts:WITH_BOTH, codeAbsent:"TemplateConstraint:" },
  { id:"K-07", name:"preset sem constraints declaradas segue livre",
    src:"[--germinate'a','b'[gen'x']]", opts:WITH_BOTH, codeAbsent:"TemplateConstraint:" },
  { id:"K-08", name:"sem store de regras, a classe não resolve e nada é checado",
    src:"[--loop'x','y','z'[gen'x']]", opts:WITH_TPL, codeAbsent:"TemplateConstraint:" },
  { id:"K-09", name:"a mensagem carrega o reparo, não só a queixa",
    src:"[--loop'x','y','z'[gen'x']]", opts:WITH_BOTH,
    messageHas:"depois que [cond] fechar o laço" }
];

/* Semantic rules: pairs, order and precondition. The criterion that was
   missing for "commands don't contradict each other". */
const RULE_CASES = [
  { id:"C-01", name:"pair: mand + opt siblings", src:"[mand'x'][opt'x']", opts:WITH_RULES,
    code:"Rule:mand-opt", requireFix:true },
  { id:"C-02", name:"pair: mand ancestor of opt", src:"[mand[opt'x']]", opts:WITH_RULES,
    code:"Rule:mand-opt" },
  { id:"C-03", name:"pair: alw + nev", src:"[alw][nev]", opts:WITH_RULES,
    code:"Rule:alw-nev", requireFix:true },
  { id:"C-04", name:"redundancy: req + dont is ask, not fix", src:"[req'log'][dont'log']",
    opts:WITH_RULES, code:"Rule:req-dont", noFix:true },
  { id:"C-05", name:"weakening: ins + opt", src:"[ins'x'][opt'x']",
    opts:WITH_RULES, code:"Rule:ins-opt", noFix:true },
  { id:"C-06", name:"[ovr] exempts: the overlap was requested on purpose", src:"[ovr[mand'x'][opt'x']]",
    opts:WITH_RULES, codeAbsent:"Rule:mand-opt" },
  { id:"C-07", name:"cmp + dist still isn't a rule", src:"[cmp'a','b'][dist'a','b']",
    opts:WITH_RULES, codeAbsent:"Rule:" },
  { id:"C-08", name:"crit + impr still isn't a rule", src:"[crit'x'][impr'x']",
    opts:WITH_RULES, codeAbsent:"Rule:" },
  { id:"C-09", name:"no store loaded, nothing gets checked", src:"[mand'x'][opt'x']",
    opts:{}, codeAbsent:"Rule:" },
  { id:"C-10", name:"order: thinking before elab", src:"[crit'x'][elab'x']",
    opts:WITH_RULES, code:"Rule:elab-before-thinking" },
  { id:"C-11", name:"correct order does not flag", src:"[elab'x'][crit'x']",
    opts:WITH_RULES, codeAbsent:"Rule:elab-before-thinking" },
  { id:"C-12", name:"precondition: brst with no framing", src:"[brst'ideias']",
    opts:WITH_RULES, code:"Rule:brst-needs-frame" },
  { id:"C-13", name:"precondition satisfied by [ctx]", src:"[ctx'motor'][brst'ideias']",
    opts:WITH_RULES, codeAbsent:"Rule:brst-needs-frame" },
  { id:"C-14", name:"precondition: hyp with no subject", src:"[hyp'talvez X']",
    opts:WITH_RULES, code:"Rule:hyp-needs-subject" },
  { id:"C-15", name:"the suggested repair travels in the message", src:"[pos'x'][ngt'x']",
    opts:WITH_RULES, code:"Rule:pos-ngt", messageHas:"pos + cond + ngt" }
];

/* Guard: rules must not turn normal usage into an error. Runs the positive
   corpus with the store loaded and requires that nothing becomes `fix`. */
const POSITIVE_WITH_RULES = POSITIVE.map(tc => ({
  id: tc.id + "+R", name: tc.name + " (with rules)",
  src: tc.src, opts: { rules: RULESTORE, templates: TPL.templates }
}));

/* ------------------------------------------------------------------ *
 * runner
 * ------------------------------------------------------------------ */

let failures = [];

function commandsOf(res) {
  const out = [];
  res.segments.forEach(s => G.walk(s.children, n => {
    if (n.canonical) out.push(n.canonical);
  }));
  return out;
}

/** Runs one case and returns the list of failure reasons (empty = passed). */
function check(tc, rules) {
  const why = [];
  let res, xml, astJson;
  try {
    res = G.parse(tc.src, tc.opts);
    xml = G.buildXml(res.segments);
    // serialize AND stringify: V8's JSON.stringify recurses and is where it used to overflow
    const ast = G.serializeAST(res.segments, res.gaps);
    astJson = JSON.stringify(ast);
    if (tc.astTruncated && !ast.truncatedNodes)
      why.push("expected a marked truncation in the AST, none came");
  } catch (err) {
    return ["unexpected exception (" + err.constructor.name + "): " + err.message.slice(0, 60)];
  }

  if (tc.maxXmlBytes && xml.length > tc.maxXmlBytes)
    why.push("XML with " + xml.length + " bytes, expected at most " + tc.maxXmlBytes +
             " — indentation is probably quadratic again");

  // prefix, so "Rule:" covers any semantic rule
  if (tc.codeAbsent && res.gaps.some(g => String(g.code).startsWith(tc.codeAbsent)))
    why.push("got code " + tc.codeAbsent + ", which should not appear: " +
             res.gaps.map(g => g.code).join(", "));

  if (tc.messageHas && !res.gaps.some(g => g.plain.includes(tc.messageHas)))
    why.push("no message contains: " + tc.messageHas);

  const fix = res.gaps.filter(g => g.sev === "fix");
  const codes = res.gaps.map(g => g.code);

  // the case may override the group's default rule
  const wantNoFix = tc.noFix !== undefined ? tc.noFix : rules.noFix;
  const wantFix = tc.requireFix !== undefined ? tc.requireFix : rules.requireFix;

  if (wantNoFix && fix.length)
    why.push("expected zero `fix` diagnostics, got: " + fix.map(g => g.code).join(", "));

  if (wantFix && !fix.length)
    why.push("expected at least one `fix` diagnostic, got none");

  if (tc.clean && res.gaps.length)
    why.push("expected no diagnostics, got: " + codes.join(", "));

  if (tc.code && codes.indexOf(tc.code) === -1)
    why.push("expected code " + tc.code + ", got: " + (codes.join(", ") || "none"));

  if (tc.code && wantFix) {
    const hit = res.gaps.filter(g => g.code === tc.code)[0];
    if (hit && hit.sev !== "fix")
      why.push(tc.code + " came with severity `" + hit.sev + "`, expected `fix`");
  }

  if (tc.cmds) {
    const got = commandsOf(res);
    if (got.join(",") !== tc.cmds.join(","))
      why.push("commands [" + got.join(",") + "] != expected [" + tc.cmds.join(",") + "]");
  }

  if (tc.segments !== undefined && res.segments.length !== tc.segments)
    why.push("segments " + res.segments.length + " != " + tc.segments);

  (tc.xml || []).forEach(frag => {
    if (xml.indexOf(frag) === -1) why.push("XML does not contain: " + frag);
  });
  (tc.xmlAbsent || []).forEach(frag => {
    if (xml.indexOf(frag) !== -1) why.push("XML contains what it should not: " + frag);
  });

  return why;
}

function runGroup(title, cases, rules) {
  console.log("\n--- " + title + " ---");
  let passed = 0;
  cases.forEach(tc => {
    const why = check(tc, rules);
    if (!why.length) {
      console.log("  ✓ " + tc.id + ": " + tc.name);
      passed++;
    } else {
      console.log("  ✗ " + tc.id + ": " + tc.name);
      why.forEach(w => console.log("      " + w));
      failures.push(tc.id);
    }
  });
  return passed;
}

console.log("=================================================");
console.log("   Glyph v" + G.VERSION + " Corpus Test Suite");
console.log("=================================================");

const rP = runGroup("Positive — parse clean", POSITIVE, { noFix:true });
const rI = runGroup("Incomplete — become <needs>, do not block", INCOMPLETE, { noFix:true });
const rN = runGroup("Invalid — require a `fix` diagnostic", INVALID, { requireFix:true });
const rR = runGroup("v1.8 regressions closed in v1.0.9", REGRESSION, { noFix:false });
const rL = runGroup("Long blocks — the engine must not break", LONG, { noFix:false });
const rT = runGroup("Templates — invocation expands the definition", TEMPLATES, { noFix:false });
const rC = runGroup("Semantic rules — pair, order, precondition", RULE_CASES, { noFix:false });
const rK = runGroup("Template constraints — the shape a preset promises", CONSTRAINTS, { noFix:false });
const rG = runGroup("Guard — rules must not break normal usage", POSITIVE_WITH_RULES, { noFix:true });

console.log("\n=================================================");
console.log(" Positive     " + rP + "/" + POSITIVE.length);
console.log(" Incomplete   " + rI + "/" + INCOMPLETE.length);
console.log(" Invalid      " + rN + "/" + INVALID.length);
console.log(" Regressions  " + rR + "/" + REGRESSION.length);
console.log(" Long blocks  " + rL + "/" + LONG.length);
console.log(" Templates    " + rT + "/" + TEMPLATES.length);
console.log(" Rules        " + rC + "/" + RULE_CASES.length);
console.log(" Constraints  " + rK + "/" + CONSTRAINTS.length);
console.log(" Guard        " + rG + "/" + POSITIVE_WITH_RULES.length);
console.log("=================================================");

if (failures.length) {
  console.error("\nFAILED: " + failures.join(", "));
  process.exit(1);
}
console.log("\nAll green.");
