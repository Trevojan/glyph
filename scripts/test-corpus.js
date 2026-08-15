/**
 * Glyph Corpus Test Suite v1.1.0 (test-corpus.js)
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
const TPL = require("../glyph-templates.json");
const RULESTORE = require("../glyph-rules.json");
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
    clean:true, cmds:["REV","IMPR","FMT"], xml:["<review>","<improve/>","<format/>"] },
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
  /* v1.1.0.0: these two asserted the v1.7 fusion. With it undone, each side
     stands on its own — EVAL compares against a realistic quality standard,
     CRIT against the declared goal; SPEC is the detailed artefact, ELAB the
     act of detailing. GLOSSARIO.md §6.5. */
  { id:"P-21", name:"EVAL is its own command, not an alias of CRIT.", src:"[EVAL'projeto']",
    clean:true, cmds:["EVAL"], xml:["<evaluate>"] },
  { id:"P-22", name:"SPEC is its own command, not an alias of ELAB.", src:"[SPEC'requisito']",
    clean:true, cmds:["SPEC"] },
  { id:"P-23", name:"CTX slots (what, where, when).", src:"[CTX'banco','prodDB','v1.7']",
    clean:true, xml:["<context>","<user-input>prodDB</user-input>"] },
  { id:"P-24", name:"ERROR is a hieroglyph — atomic command, no arity.", src:"[ERROR]",
    clean:true, xml:["<error/>"] },
  { id:"P-25", name:"PROB is composite ERROR+CTX — accepts nested context.", src:"[PROB[CTX'timeout']]",
    clean:true, cmds:["PROB","CTX"], xml:["<problem>","<context>"] },

  /* ---- v1.1.0.0: the vocabulary GLOSSARIO.md declared and the engine
     did not have. Half the formulas in expansoes.txt referenced these. ---- */
  { id:"P-26", name:"CORE replaces BASE — the command, not the atom keyword.",
    src:"[CORE'o ponto de partida']", clean:true, cmds:["CORE"], xml:["<core>"] },
  { id:"P-27", name:"Context ops read, write and locate inside the scope.",
    src:"[FIND'a variável'][GET'o valor'][ADD'um caso'][SUB'o ruído'][WHR'no parser']",
    clean:true, cmds:["FIND","GET","ADD","SUB","WHR"],
    xml:["<find>","<get>","<add>","<subtract>","<where>"] },
  { id:"P-28", name:"Intensity primitives stand alone — no operand, no <needs>.",
    src:"[HGH][LOW][BOLD][LIGHT]", clean:true,
    xml:["<high/>","<low/>","<bold/>","<light/>"] },
  { id:"P-29", name:"SWITCH takes the states, GO takes what to run.",
    src:"[SWITCH'A','B'][GO'a suíte']", clean:true, cmds:["SWITCH","GO"],
    xml:["<switch>","<go>"] },

  /* ---- v1.1.0.0: the seven v1.7 fusions, undone. Each case pins the side
     that used to disappear into the other. GLOSSARIO.md §6.5. ---- */
  { id:"P-30", name:"REV is a reading sweep, not CRIT's formal comparison.",
    src:"[REV'o diff']", clean:true, cmds:["REV"], xml:["<review>"] },
  { id:"P-31", name:"SIMP cuts complexity; CLAR removes ambiguity. Both survive.",
    src:"[SIMP'o texto'][CLAR'o termo']", clean:true, cmds:["SIMP","CLAR"],
    xml:["<simplify>","<clarification>"] },
  { id:"P-32", name:"QST types the block; ASK aims at someone.",
    src:"[QST'cabe em memória?'][ASK'ao time']", clean:true, cmds:["QST","ASK"],
    xml:["<question>","<ask>"] },
  { id:"P-33", name:"FOREX introduces an example; EX is the example itself.",
    src:"[FOREX'o caso do parser'][EX'4d6kh3']", clean:true, cmds:["FOREX","EX"],
    xml:["<for-example>","<example>"] },
  { id:"P-34", name:"ONLYIF is a necessary condition, COND a generic gate.",
    src:"[ONLYIF'o teste passar'][COND'houver tempo']", clean:true,
    cmds:["ONLYIF","COND"], xml:["<only-if>","<condition>"] }
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
  /* v1.1.0.0: BASE is no longer a command — it is only the keyword on the
     right-hand side of expansoes.txt, meaning "this one is an atom". Writing
     it as a command has to fail, or the collision the rename fixed comes
     back through the parser. */
  { id:"N-13", name:"BASE is no longer a command — CORE took its place",
    src:"[BASE'o ponto de partida']", code:"UnknownCommand" },
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
    cmds:["REV","IMPR","FMT"] },
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

/* ------------------------------------------------------------------ *
 * X — composition table (v1.1.0.0)
 *
 * These do not fit the case shape above: they assert about the VOCABULARY
 * as a whole, not about one input. The important one is X-01. Glossary and
 * engine drifted apart once already — twelve commands declared in the
 * glossary that the engine had never heard of, and half the composition
 * formulas silently unable to resolve. Nothing caught it because nothing
 * was comparing the two lists. Now something does.
 * ------------------------------------------------------------------ */

function runExpansionChecks() {
  console.log("\n--- Composition table — glossary and engine must agree ---");
  const X = [];
  const ok = (id, name, why) => {
    if (why) { console.log("  ✗ " + id + ": " + name); console.log("      " + why); failures.push(id); }
    else { console.log("  ✓ " + id + ": " + name); X.push(id); }
  };

  const store = require("../glyph-expansions.json");
  const opts = { expansions: store };

  // every command the parser knows, from every bucket that yields a canonical
  const vocab = new Set([
    ...Object.keys(G.INSTR), ...Object.keys(G.STRUCT), ...Object.keys(G.META)
  ]);
  const table = new Set(Object.keys(store.commands));

  const missing = [...vocab].filter(c => !table.has(c)).sort();
  ok("X-01a", "every command in the engine is in expansoes.txt",
     missing.length ? missing.length + " ausente(s) da tabela: " + missing.join(" ") : null);

  /* The reverse direction is not symmetric: MODE (OFF/ON) and the engine
     structures are declared in the table so formulas can name them, but they
     are not INSTR commands. Only real vocabulary has to round-trip. */
  const extra = [...table].filter(c =>
    !vocab.has(c) && !G.MODE[c] && !G.ALIAS[c]).sort();
  ok("X-01b", "every command in expansoes.txt is in the engine",
     extra.length ? extra.length + " na tabela sem verbete no motor: " + extra.join(" ") : null);

  ok("X-02", "atoms report species `atom` and depth 0",
     (G.speciesOf("CORE", opts) === "atom" && G.depthOf("CORE", opts) === 0)
       ? null : "CORE saiu como " + G.speciesOf("CORE", opts) + "/" + G.depthOf("CORE", opts));

  ok("X-03", "composites report a formula and a depth above zero",
     (G.speciesOf("CRIT", opts) === "composite" && G.depthOf("CRIT", opts) > 0 &&
      /CMP/.test(G.formulaOf("CRIT", opts) || ""))
       ? null : "CRIT não trouxe fórmula/profundidade coerentes");

  const atoms = G.atomsOf("PROB", opts);
  ok("X-04", "a composite burns down to hieroglyphs only",
     (atoms && atoms.length && atoms.every(a => G.speciesOf(a, opts) === "atom"))
       ? null : "PROB não reduziu a átomos: " + JSON.stringify(atoms));

  ok("X-05", "an atom burns down to itself",
     JSON.stringify(G.atomsOf("CTX", opts)) === JSON.stringify(["CTX"])
       ? null : "CTX reduziu a " + JSON.stringify(G.atomsOf("CTX", opts)));

  const ast = G.toAST("[crit'x']", opts);
  const node = ast.segments[0].body[0];
  ok("X-06", "the AST carries species and composition depth",
     (node.species === "composite" && node.compositionDepth === 2)
       ? null : "nó veio " + node.species + "/" + node.compositionDepth);

  const bare = G.toAST("[crit'x']", {});
  ok("X-07", "with no store loaded, species is null and nothing breaks",
     (bare.segments[0].body[0].species == null) ? null : "species não veio null sem store");

  /* v1.2.0.1 — the AST used to carry all sixteen fields on every node whether
     or not they said anything, and 43% of them were false/null/[]. */
  const lean = G.toAST("[crit'x']", opts);
  const verbose = G.toAST("[crit'x']", { ...opts, verbose: true });
  const leanNode = lean.segments[0].body[0];
  ok("X-08", "a AST não carrega mais campos vazios",
     (!("isAlias" in leanNode) && !("autoClosed" in leanNode) && !("suggestion" in leanNode))
       ? null : "sobraram vazios: " + JSON.stringify(Object.keys(leanNode)));
  ok("X-09", "o que diz algo continua lá",
     (leanNode.canonical === "CRIT" && leanNode.gloss && leanNode.species === "composite")
       ? null : "perdeu campo com conteúdo: " + JSON.stringify(leanNode));
  ok("X-10", "`verbose` restaura a forma antiga inteira",
     ("isAlias" in verbose.segments[0].body[0] &&
      JSON.stringify(verbose).length > JSON.stringify(lean).length)
       ? null : "verbose não trouxe os campos de volta");

  /* v1.2.0.1 — `describe` carries the semantics into the message, so whoever
     reads the XML does not need the vocabulary loaded. Off by default: it
     changes the deliverable. */
  const plain = G.toXML("[scru'x']", opts);
  const rich = G.toXML("[scru'x']", { ...opts, describe: true });
  ok("X-11", "`describe` está desligado por padrão",
     (!/means=/.test(plain) && !/made-of=/.test(plain)) ? null : "vazou describe no XML normal");
  ok("X-12", "com `describe`, um composto carrega do que é feito",
     (/means="[^"]+"/.test(rich) && /made-of="[a-z ]+"/.test(rich))
       ? null : "faltou means/made-of em <scrutinize>");
  ok("X-13", "um hieróglifo não ganha `made-of` — não decompõe",
     !/made-of=/.test(G.toXML("[ctx'x']", { ...opts, describe: true }))
       ? null : "átomo veio com made-of");

  /* v1.2.1.0 — as definições do GLOSSARIO.md dentro do motor. Sem elas o
     `means` repetia o rótulo em inglês (`means="Review"` em `<review>`) e os
     88 hieróglifos, que são o que NÃO decompõe, nada tinham a dizer de si. */
  const semDef = Object.keys(store.commands).filter(c => !store.commands[c].def).sort();
  ok("X-14", "todo comando tem definição vinda do glossário",
     semDef.length ? semDef.length + " sem def: " + semDef.join(" ") : null);

  const atomRich = G.toXML("[ctx'x']", { ...opts, describe: true });
  ok("X-15", "`means` traz a definição, não o rótulo em inglês",
     (/means="Escopo declarado\."/.test(atomRich) && !/means="Context"/.test(atomRich))
       ? null : "means não trouxe a definição do glossário");

  ok("X-16", "um hieróglifo se explica mesmo sem ter do que ser feito",
     (G.defOf("HGH", opts) && !G.formulaOf("HGH", opts))
       ? null : "HGH ficou sem def ou ganhou fórmula");

  return X.length;
}
const rX = runExpansionChecks();

/* ------------------------------------------------------------------ *
 * H — .hgml, the atomic burn (v1.1.1.0)
 *
 * The oracle is the format itself: .hgml is valid Glyph, so the output can
 * be re-parsed and checked against two invariants that need no hand-written
 * expectation per case — every tag is an atom, and nothing became `fix`.
 * That is a stronger test than any table of expected strings, and it is the
 * reason the format reuses the grammar instead of inventing one.
 * ------------------------------------------------------------------ */

function runHgmlChecks() {
  console.log("\n--- .hgml — a queima atômica ---");
  const H = [];
  const ok = (id, name, why) => {
    if (why) { console.log("  ✗ " + id + ": " + name); console.log("      " + why); failures.push(id); }
    else { console.log("  ✓ " + id + ": " + name); H.push(id); }
  };

  const store = require("../glyph-expansions.json");
  const opts = { expansions: store };

  /** re-parses .hgml and reports what survived */
  const reburn = src => {
    const out = G.toHGML(src, opts);
    const re = G.parse(out, opts);
    const cmds = [];
    const lits = [];
    re.segments.forEach(s => G.walk(s.children, n => {
      if (n.canonical) cmds.push(n.canonical);
      if (n.literal) lits.push(n.v);
    }));
    return {
      out, cmds, lits,
      fix: re.gaps.filter(g => g.sev === "fix").map(g => g.code),
      nonAtom: [...new Set(cmds.filter(c => G.speciesOf(c, opts) !== "atom"))]
    };
  };

  const crit = reburn("[crit'o parser']");
  ok("H-01", "um composto reduz só a hieróglifos",
     crit.nonAtom.length ? "sobrou: " + crit.nonAtom.join(",") : null);
  ok("H-02", "a saída reparseia sem nenhum `fix`",
     crit.fix.length ? crit.fix.join(",") : null);
  ok("H-03", "o que o humano escreveu sobrevive à queima",
     crit.lits.includes("o parser") ? null : "literal perdido: " + JSON.stringify(crit.lits));
  ok("H-04", "todo tag sai em forma fechada `[x[/x]`",
     /\[cmp\b/.test(crit.out) && /\[\/cmp\]/.test(crit.out)
       ? null : "sem par de abertura/fechamento em cmp");

  const atom = reburn("[ctx'api/pedidos.py']");
  ok("H-05", "um hieróglifo atravessa intacto",
     JSON.stringify(atom.cmds) === JSON.stringify(["CTX"])
       ? null : "veio " + JSON.stringify(atom.cmds));

  const once = G.toHGML("[crit'x'][prob'y']", opts);
  ok("H-06", "queimar o queimado não muda nada",
     G.toHGML(once, opts) === once ? null : "a segunda queima diferiu");

  ok("H-07", "sem store, avisa em vez de quebrar",
     /^#/.test(G.toHGML("[crit'x']", {})) ? null : "não devolveu o aviso");

  /* The burn is an EXPANSION: this pins the order of magnitude so a silent
     regression to shallow output gets noticed. */
  const hyp = reburn("[hyp'o banco responde']");
  ok("H-08", "HYP, o mais fundo, reduz inteiro (~97 hieróglifos)",
     (!hyp.nonAtom.length && !hyp.fix.length && hyp.cmds.length > 80)
       ? null : "sobrou " + hyp.nonAtom.join(",") + " / " + hyp.cmds.length + " tags");

  /* Two formulas carry tokens the grammar cannot read inside brackets, and
     both are DATA problems, not burn bugs:
       SCRU  `R:` — the return token is segment-level punctuation, so `[R:`
             parses as a command named R.
       QST   `[LOGIC-NONE]` — the lexer claims any `[logic…]` as a calculation
             block and then wants `[/logic]`.
     Pinned by name: if either is fixed the count moves and this case fails,
     which is the point — it must not be fixed silently. */
  const KNOWN = ["QST", "SCRU"];
  const failing = Object.keys(store.commands).filter(c => {
    if (store.commands[c].species !== "composite") return false;
    const r = reburn("[" + c.toLowerCase() + "'x']");
    return r.fix.length || r.nonAtom.length;
  }).sort();
  ok("H-09", "30 dos 32 compostos queimam limpo; 2 conhecidos falham",
     JSON.stringify(failing) === JSON.stringify(KNOWN)
       ? null : "esperado " + JSON.stringify(KNOWN) + ", veio " + JSON.stringify(failing));

  return H.length;
}
const rH = runHgmlChecks();

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
console.log(" Composition  " + rX + "/17");
console.log(" .hgml burn   " + rH + "/9");
console.log("=================================================");

if (failures.length) {
  console.error("\nFAILED: " + failures.join(", "));
  process.exit(1);
}
console.log("\nAll green.");
