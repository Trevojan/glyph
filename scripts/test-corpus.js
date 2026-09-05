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


import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import G from "./glyph-parser.js";
import * as CHECK_MOD from "./glyph-check.js";

/* Stores travel through opts in the cases that need them, so the suite
   doesn't depend on the module's global state or on test order. */
const TPL = require("../.guidelines/templates.json");
const RULESTORE = require("../.guidelines/rules.json");
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
    xml:["<summary>", "<needs>what to summarise</needs>"] },
  { id:"P-02", name:"Summarize this, step by step.", src:"[SUM'step by step']",
    xml:["<summary>", "<user-input>step by step</user-input>"], clean:true },
  { id:"P-03", name:"Criticise, considering the context.", src:"[CRIT[CTX]]",
    cmds:["CRIT","CTX"] },
  { id:"P-04", name:"Criticise and ask.", src:"[CRIT[CTX],[ASK;",
    cmds:["CRIT","CTX","ASK"] },
  { id:"P-05", name:"Compare two terms.", src:"[CMP'termo1','termo2']",
    clean:true, xml:["<compare>"] },
  /* the two bare links now say which operator attached them; before, the XML
     could not tell `-impr-fmt` from `-impr,fmt` and neither could fromXML */
  { id:"P-06", name:"Review, improve and format.", src:"[REV-IMPR-FMT]",
    clean:true, cmds:["REV","IMPR","FMT"],
    /* rederived for glyph-package (E2): two consecutive extends are two runs of
       one, not one run of two - PACKAGE_TARGET.md 3.4. Folding them would make
       [REV-IMPR-FMT] and [REV-IMPR,FMT] emit identically, which is the defect E0
       removed. */
    xml:["<review>", "<chain>", "<improve/>", "<format/>"] },
  { id:"P-07", name:"Section A: criticise and propose.", src:"[SECTION'sectA',[CRIT],[PROP[ALT]]]",
    cmds:["SECTION","CRIT","PROP","ALT"] },
  { id:"P-08", name:"Prefix comparison gt.", src:"[COND[gt[VAR'A'],[VAR'B']],[INSTOF[SUM],[ASK;",
    cmds:["COND","GT","VAR","VAR","INSTOF","SUM","ASK"] },
  { id:"P-10", name:"Template invocation.", src:"[--REVCHECK]",
    xml:['<template name="REVCHECK"/>'] },
  { id:"P-13", name:"Default value.", src:"[DEF]", clean:true, xml:["<define/>"] },
  { id:"P-14", name:"Emotion with enthusiasm.", src:"/eth/[BRST'3']",
    clean:true, xml:['<mood dominant="enthusiasm"/>'] },
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
     act of detailing. GLOSSARY.md §6.5. */
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

  /* ---- v1.1.0.0: the vocabulary GLOSSARY.md declared and the engine
     did not have. Half the formulas in expansions.txt referenced these. ---- */
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
     that used to disappear into the other. GLOSSARY.md §6.5. ---- */
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
    code:"UnfilledSlot", xml:["<needs>the condition</needs>"] },
  { id:"I-02", name:"CMP with a single term warns", src:"[CMP'a']",
    code:"SingletonList" },
  { id:"I-06", name:"Template not defined in this session", src:"[--NAOEXISTE]",
    code:"UndefinedTemplate" },
  { id:"I-08", name:"GT missing the second term", src:"[gt'A']",
    code:"MissingOperand", xml:['<needs slot="2">the second term</needs>'] },
  { id:"I-09", name:"DFN missing the meaning", src:"[DFN'símbolo']",
    code:"MissingOperand", xml:['<needs slot="2">the meaning</needs>'] },
  { id:"I-10", name:"VAL missing the external criterion", src:"[VAL'alvo']",
    code:"MissingOperand", xml:['<needs slot="2">the external criterion</needs>'] }
];

const INVALID = [
  /* v1.1.0.0: BASE is no longer a command — it is only the keyword on the
     right-hand side of expansions.txt, meaning "this one is an atom". Writing
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
    /* was a second N-13. Two different vectors under one id: both ran and both
       passed, but the snapshot is keyed by id, so one silently replaced the
       other and [BASE'…'] was never covered byte for byte. Found by D-04. */
  { id:"N-22", name:"] with no open command", src:"[SUM]]",
    code:"UnmatchedCloseBracket" },
  { id:"N-14", name:"[logic] with no [/logic]", src:"[logic]a = 1",
    code:"UnclosedLogic" },
  { id:"N-15", name:"[/sum] closes an unopened command", src:"[crit][/sum]",
    code:"UnmatchedCloseTag" },
  { id:"N-16", name:"[ with no name", src:"[ ]",
    code:"EmptyCommandName" },
  { id:"N-17", name:"Template definition with no body", src:"[--t=",
    code:"EmptyTemplateDefinition" },

  /* OPERATOR_TARGET §8.2. Three constructs that used to be swallowed in
     silence or, worse, announced by a diagnostic that reported the wrong
     thing. Bucket N and not bucket I, because "an empty slot does not block"
     protects information that is MISSING and never information that is
     MALFORMED — conflating the two is what produced all three. */
  { id:"N-18", name:"`/` inside a chain is refused, not read as a mood",
    src:"[in-rwk/ctx]", code:"SlashInChain" },
  { id:"N-19", name:"a chain `/` run whose head is a real emotion code",
    src:"[in-rwk/ins/fmt]", code:"SlashInChain" },
  { id:"N-20", name:"the abandoned \\emo\\ spelling is refused by name",
    src:"\\eth\\[ins`x`]", code:"BackslashMood" },
  { id:"N-21", name:"an off-table mood code is discarded at fix, not noted",
    src:"/eth/xyz/[ins`x`]", code:"UnknownEmotion" }
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
    xml:["<user-input>user command blocks</user-input>", 'expects="target,skeptic,criticise,scrutinise"'] },
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

/* Ids whose expectation is already correct but whose PRODUCER has not landed.
   Same discipline as `awaiting` in runGroup, and as RT-02 and SN-01: expected to
   fail now, and a failure the moment it starts passing, because a pin that
   outlives its reason is how a real regression hides. */
const AWAITING = {};
""
  .split(" ").forEach(id => { AWAITING[id] = "E4"; });

function awaitCheck(id, why) {
  const owed = AWAITING[id];
  if (!owed) return null;
  return why
    ? { pass: true,  line: "  \u23f8 " + id + "  (awaiting " + owed + ")" }
    : { pass: false, line: "  \u2717 " + id + ": passes now \u2014 " + owed +
                           " has landed; remove it from AWAITING" };
}


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
  let passed = 0, pinned = 0;
  cases.forEach(tc => {
    const why = check(tc, rules);
    /* `awaiting: "E3b"` - the expectation was rederived (E2) against a format no
       emitter produces yet, so it MUST fail until that deliverable lands. Pinned
       rather than reverted, and bidirectional the way RT-02 and SN-01 are: the
       moment it passes, the pin has outlived its reason and the suite says so. */
    if (tc.awaiting) {
      if (why.length) { console.log("  ⏸ " + tc.id + ": " + tc.name + "  (awaiting " + tc.awaiting + ")"); pinned++; }
      else {
        console.log("  ✗ " + tc.id + ": " + tc.name);
        console.log("      passes now - " + tc.awaiting + " has landed; remove `awaiting` and its note");
        failures.push(tc.id);
      }
      return;
    }
    if (!why.length) {
      console.log("  ✓ " + tc.id + ": " + tc.name);
      passed++;
    } else {
      console.log("  ✗ " + tc.id + ": " + tc.name);
      why.forEach(w => console.log("      " + w));
      failures.push(tc.id);
    }
  });
  if (pinned) console.log("  (" + pinned + " pinned, awaiting a deliverable)");
  return passed + pinned;
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

  const store = require("../.guidelines/expansions.json");
  const opts = { expansions: store };

  // every command the parser knows, from every bucket that yields a canonical
  const vocab = new Set([
    ...Object.keys(G.INSTR), ...Object.keys(G.STRUCT), ...Object.keys(G.META)
  ]);
  const table = new Set(Object.keys(store.commands));

  const missing = [...vocab].filter(c => !table.has(c)).sort();
  ok("X-01a", "every command in the engine is in expansions.txt",
     missing.length ? missing.length + " missing from the table: " + missing.join(" ") : null);

  /* The reverse direction is not symmetric: MODE (OFF/ON) and the engine
     structures are declared in the table so formulas can name them, but they
     are not INSTR commands. Only real vocabulary has to round-trip. */
  const extra = [...table].filter(c =>
    !vocab.has(c) && !G.MODE[c] && !G.ALIAS[c]).sort();
  ok("X-01b", "every command in expansions.txt is in the engine",
     extra.length ? extra.length + " in the table with no entry in the engine: " + extra.join(" ") : null);

  ok("X-02", "atoms report species `atom` and depth 0",
     (G.speciesOf("CORE", opts) === "atom" && G.depthOf("CORE", opts) === 0)
       ? null : "CORE came out as " + G.speciesOf("CORE", opts) + "/" + G.depthOf("CORE", opts));

  ok("X-03", "composites report a formula and a depth above zero",
     (G.speciesOf("CRIT", opts) === "composite" && G.depthOf("CRIT", opts) > 0 &&
      /CMP/.test(G.formulaOf("CRIT", opts) || ""))
       ? null : "CRIT did not return a coherent formula/depth");

  const atoms = G.atomsOf("PROB", opts);
  ok("X-04", "a composite burns down to hieroglyphs only",
     (atoms && atoms.length && atoms.every(a => G.speciesOf(a, opts) === "atom"))
       ? null : "PROB did not reduce to atoms: " + JSON.stringify(atoms));

  ok("X-05", "an atom burns down to itself",
     JSON.stringify(G.atomsOf("CTX", opts)) === JSON.stringify(["CTX"])
       ? null : "CTX reduced to " + JSON.stringify(G.atomsOf("CTX", opts)));

  const ast = G.toAST("[crit'x']", opts);
  const node = ast.segments[0].body[0];
  ok("X-06", "the AST carries species and composition depth",
     (node.species === "composite" && node.compositionDepth === 2)
       ? null : "nó got " + node.species + "/" + node.compositionDepth);

  const bare = G.toAST("[crit'x']", {});
  ok("X-07", "with no store loaded, species is null and nothing breaks",
     (bare.segments[0].body[0].species == null) ? null : "species não got null sem store");

  /* v1.2.0.1 thinned the AST because 43% of every node was false/null/[] and
     nobody reads a 23 KB panel. v2.4.5.01 keeps the thinning and moves it: the
     AST is the source of truth now, so completeness outranks size on what is
     EXPORTED and the thinning belongs to the screen. Hence two named
     projections instead of a boolean, and `full` as the default — a payload
     that must be diffed or read back cannot afford a field's absence to mean
     six different things. */
  const lean = G.toAST("[crit'x']", { ...opts, projection: "panel" });
  const verbose = G.toAST("[crit'x']", opts);
  const leanNode = lean.segments[0].body[0];
  ok("X-08", "the panel projection carries no empty fields",
     (!("isAlias" in leanNode) && !("autoClosed" in leanNode) && !("suggestion" in leanNode))
       ? null : "empties left: " + JSON.stringify(Object.keys(leanNode)));
  ok("X-09", "whatever says something is still there",
     (leanNode.canonical === "CRIT" && leanNode.gloss && leanNode.species === "composite")
       ? null : "dropped a field with content: " + JSON.stringify(leanNode));
  ok("X-10", "the full projection is the whole shape, and is the default",
     ("isAlias" in verbose.segments[0].body[0] &&
      JSON.stringify(verbose).length > JSON.stringify(lean).length &&
      verbose.projection === "full" && lean.projection === "panel" &&
      G.toAST("[crit'x']", { ...opts, verbose: true }).projection === "full")
       ? null : "verbose did not bring the fields back");

  /* v1.2.0.1 — `describe` carries the semantics into the message, so whoever
     reads the XML does not need the vocabulary loaded. Off by default: it
     changes the deliverable. */
  const plain = G.toXML("[scru'x']", opts);
  const rich = G.toXML("[scru'x']", { ...opts, describe: true });
  ok("X-11", "`describe` is off by default",
     (!/means=/.test(plain) && !/made-of=/.test(plain)) ? null : "describe leaked into the plain XML");
  ok("X-12", "with `describe`, a composite carries what it is made of",
     (/means="[^"]+"/.test(rich) && /made-of="[a-z ]+"/.test(rich))
       ? null : "means/made-of missing on <scrutinise>");
  ok("X-13", "a hieroglyph gets no `made-of` — it does not decompose",
     !/made-of=/.test(G.toXML("[ctx'x']", { ...opts, describe: true }))
       ? null : "atom came with made-of");

  /* v1.2.1.0 — as definições do GLOSSARY.md dentro do motor. Sem elas o
     `means` repetia o rótulo em inglês (`means="Review"` em `<review>`) e os
     88 hieróglifos, que são o que NÃO decompõe, nada tinham a dizer de si. */
  const semDef = Object.keys(store.commands).filter(c => !store.commands[c].def).sort();
  ok("X-14", "every command has a definition from the glossary",
     semDef.length ? semDef.length + " without def: " + semDef.join(" ") : null);

  const atomRich = G.toXML("[ctx'x']", { ...opts, describe: true });
  ok("X-15", "`means` carries the definition, not the English label",
     (/means="Declared scope\."/.test(atomRich) && !/means="Context"/.test(atomRich))
       ? null : "means did not carry the glossary definition");

  ok("X-16", "a hieroglyph explains itself with nothing to be made of",
     (G.defOf("HGH", opts) && !G.formulaOf("HGH", opts))
       ? null : "HGH lost its def or gained a formula");

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
  console.log("\n--- .hgml — the atomic burn ---");
  const H = [];
  const ok = (id, name, why) => {
    if (why) { console.log("  ✗ " + id + ": " + name); console.log("      " + why); failures.push(id); }
    else { console.log("  ✓ " + id + ": " + name); H.push(id); }
  };

  const store = require("../.guidelines/expansions.json");
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
  ok("H-01", "a composite reduces to hieroglyphs only",
     crit.nonAtom.length ? "left over: " + crit.nonAtom.join(",") : null);
  ok("H-02", "the output re-parses with no `fix`",
     crit.fix.length ? crit.fix.join(",") : null);
  ok("H-03", "what the human wrote survives the burn",
     crit.lits.includes("o parser") ? null : "literal lost: " + JSON.stringify(crit.lits));
  ok("H-04", "every tag comes out in closed form `[x[/x]`",
     /\[cmp\b/.test(crit.out) && /\[\/cmp\]/.test(crit.out)
       ? null : "no open/close pair on cmp");

  const atom = reburn("[ctx'api/pedidos.py']");
  ok("H-05", "a hieroglyph passes through untouched",
     JSON.stringify(atom.cmds) === JSON.stringify(["CTX"])
       ? null : "got " + JSON.stringify(atom.cmds));

  const once = G.toHGML("[crit'x'][prob'y']", opts);
  ok("H-06", "burning the burnt changes nothing",
     G.toHGML(once, opts) === once ? null : "the second burn differed");

  ok("H-07", "with no store it warns instead of breaking",
     /^#/.test(G.toHGML("[crit'x']", {})) ? null : "did not return the warning");

  /* The burn is an EXPANSION: this pins the order of magnitude so a silent
     regression to shallow output gets noticed. */
  const hyp = reburn("[hyp'o banco responde']");
  ok("H-08", "HYP, the deepest, reduces fully (~97 hieroglyphs)",
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
  ok("H-09", "30 of 32 composites burn clean; 2 known ones fail",
     JSON.stringify(failing) === JSON.stringify(KNOWN)
       ? null : "expected " + JSON.stringify(KNOWN) + ", got " + JSON.stringify(failing));

  /* the pattern layer — L6a. The .hgml had no consumer, and T26 says a format
     without one is a format whose consumer has not been built yet. This is it:
     co-occurrence in the BURNT form maps to one richer element, matched over
     atoms so it is invariant to which surface synonym the author typed. */
  const blendSrc = "[in[rev`o fluxo`][scru`a logica`]]";
  const BLEND_OPTS = { expansions: require("../.guidelines/expansions.json"), rules: RULESTORE };
  const blended = G.toHGML(blendSrc, BLEND_OPTS);
  ok("H-10", "a blend folds co-occurring atoms into one element",
     /\[heavy-review/.test(blended) && /'o fluxo'/.test(blended) && /'a logica'/.test(blended)
       ? null : "did not fire, or lost a literal: " + blended.slice(0, 120));

  /* the trap HGML_PLAN names: an invented element that cannot say what it means
     has moved the interpretation problem, not solved it */
  ok("H-11", "the burn declares every pattern it applied, with its meaning",
     /^# patterns applied to this burn:/m.test(blended) &&
     /heavy-review  <- REV \+ DIST  one deep review/.test(blended)
       ? null : "the invented element does not explain itself");

  ok("H-12", "a blend with no `means` is refused at compile time",
     (function () {
       const store = JSON.parse(JSON.stringify(RULESTORE));
       store.rules.push({ id:"no-means", kind:"blend", when:["REV","DIST"], emit:"x" });
       delete store.__compiled;
       const out = G.toHGML(blendSrc, { expansions:require("../.guidelines/expansions.json"), rules:store });
       return /\[x/.test(out) ? "it emitted an element that cannot say what it means" : null;
     })());

  /* H-13 -- the burn said more than the source did.
     [CRIT[CTX]] burnt to `[cmp [ctx] [ctx] ...]`: the author's operand plus the
     one CRIT's own formula produces. The document asserted the context is
     consulted twice, which the source never said -- the glyphs said A and the
     hieroglyphs said B. The `uniq` half of the made-of rule, applied where
     operands are injected into a burnt formula. */
  {
    const one = G.toHGML("[CRIT[CTX]]", opts);
    const ctxAtTop = one.split("\n").filter(l => l === "  [ctx[/ctx]").length;
    ok("H-13", "an operand the formula also produces is written once, not twice",
       ctxAtTop === 1 ? null
         : "[ctx] appears " + ctxAtTop + " times at the top level of CRIT's burn");
  }

  /* H-14 -- and the fix must not flatten order, because order is meaning.
     GLOSSARY 0.1 changed on 2026-09-05: `,` carries order, so [rmbr'X'] and
     [rmbr[get[ctx]]'X'] are different statements and must stay different. */
  ok("H-14", "deduplication does not collapse two orders into one",
     G.toHGML("[rmbr`X`]", opts) !== G.toHGML("[rmbr[get[ctx]]`X`]", opts) ? null
       : "the two orders now burn the same, which trades a duplication for a different lie");

  return H.length;
}
const rH = runHgmlChecks();

/* ------------------------------------------------------------------ *
 * F — fromXML, the inverse (v1.4.0.0)
 *
 * The oracle is the same one the burn uses, turned around: the XML is
 * regenerated from the reconstructed source and compared against the XML
 * it came from. String equality on the SOURCE is the wrong test — aliases
 * normalise ([rw → [rwk), positional template fills come back named, and
 * `;;` moves to the end of its segment. All of those are the same message.
 * Equality on the XML is the real invariant, because the XML is what the
 * deliverable is.
 * ------------------------------------------------------------------ */

function runFromXmlChecks() {
  console.log("\n--- fromXML — the inverse ---");
  const F = [];
  const ok = (id, name, why) => {
    const pin = awaitCheck(id, why);
    if (pin) { console.log(pin.line); if (pin.pass) F.push(id); else failures.push(id); return; }
    if (why) { console.log("  ✗ " + id + ": " + name); console.log("      " + why); failures.push(id); }
    else { console.log("  ✓ " + id + ": " + name); F.push(id); }
  };

  const opts = { expansions: require("../.guidelines/expansions.json") };

  /** src → xml → src → xml, and the two XMLs must agree */
  const trip = src => {
    const x1 = G.toXML(src, opts);
    const back = G.fromXML(x1, opts);
    const x2 = G.toXML(back.src, opts);
    return { x1, x2, back, stable: x1 === x2 };
  };

  const crit = trip("[crit'o parser']");
  ok("F-01", "a command with a literal survives the round trip",
     crit.stable && /o parser/.test(crit.back.src) ? null
       : "unstable, or the literal was lost: " + JSON.stringify(crit.back.src));

  /* <needs> is written in three shapes and only one of them is source. The
     FRAMES filler must come back as nothing and be REGENERATED — writing it
     back would turn the engine's question into the human's answer. */
  const needs = trip("[ins]");
  ok("F-02", "a synthetic <needs> regenerates instead of becoming an answer",
     needs.stable && /<needs>what to do<\/needs>/.test(needs.x2) &&
     !/what to do/.test(needs.back.src)
       ? null : "the filler leaked into the source: " + JSON.stringify(needs.back.src));

  const hole = trip("[--t=[ph-x`a pergunta`]]");
  const holeRe = G.parse(hole.back.src, opts);
  let phNames = [];
  holeRe.segments.forEach(s => G.walk(s.children, n => {
    if (n.slotName) phNames.push(String(n.raw));
  }));
  ok("F-03", "a real [ph- hole keeps its name and its question",
     hole.stable && phNames.indexOf("x") !== -1 ? null
       : "hole lost: " + JSON.stringify(hole.back.src) + " names=" + JSON.stringify(phNames));

  const multi = trip("[ins'x'];[=[ctx'y']");
  ok("F-04", "segments, chaining and moods keep their shape",
     multi.stable && /continues="previous"/.test(multi.x2) ? null
       : "chain lost: " + JSON.stringify(multi.back.src));

  const mood = trip("/frs/[crit'venceu']");
  ok("F-05", "a mood comes back as the emotion that wrote it",
     mood.stable && /^\/frs\//.test(mood.back.src) ? null
       : "mood lost: " + JSON.stringify(mood.back.src));

  /* <block> is written by the segment wrapper AND by the STRUCT command.
     Only position plus `once` separate them; get this wrong and a nested
     [block silently becomes an extra segment, or vice versa. */
  const blk = trip("[crit[block'nested']]");
  const blkRe = G.parse(blk.back.src, opts);
  let sawBlock = false;
  blkRe.segments.forEach(s => G.walk(s.children, n => { if (n.canonical === "BLOCK") sawBlock = true; }));
  ok("F-06", "a nested [block stays a command, not a segment",
     blk.stable && sawBlock && blkRe.segments.length === 1 ? null
       : "segments=" + blkRe.segments.length + " sawBlock=" + sawBlock);

  const lg = trip("[go[logic-dano]\ntier = pc[attr/4] <5\nroll = 4d6kh3\n[/logic]]");
  ok("F-07", "<logic> rebuilds from the authored <source>, not from <reads>",
     lg.stable && /4d6kh3/.test(lg.back.src) ? null
       : "logic lost: " + JSON.stringify(lg.back.src));

  const unk = trip("[zzzz'x']");
  ok("F-08", "an unknown command stays unknown instead of vanishing",
     unk.stable && /zzzz/.test(unk.back.src) ? null
       : "unresolved lost: " + JSON.stringify(unk.back.src));

  /* PINNED, documented loss. [tpl:name'…'] and [--name…] emit the same
     <template name="…"> and nothing separates them, so the invocation is
     the reading. If this ever changes, the docs change with it. */
  const tplColon = trip("[crit[tpl:somename'body text']]");
  ok("F-09", "[tpl: comes back as a [-- invocation — pinned, not a bug",
     /\[--somename/.test(tplColon.back.src) ? null
       : "expected a [--somename invocation, got " + JSON.stringify(tplColon.back.src));

  /* A standing guard: editing the vocabulary must not introduce two
     different commands that kebab to one element name. */
  ok("F-10", "no two commands collapse to the same element name",
     G.glossCollisions.length === 0 ? null
       : "collisions: " + JSON.stringify(G.glossCollisions));

  const junk = G.fromXML("<glyph><block once=\"true\"><criticise>");
  ok("F-11", "malformed xml answers with diagnostics, never an exception",
     junk.diag.some(d => d.sev === "fix") ? null : "no fix-level diagnostic was raised");

  const notXml = G.fromXML("isto nao e xml nenhum");
  ok("F-12", "input that is not this engine's xml is refused cleanly",
     notXml.src === "" && notXml.diag.some(d => d.code === "NoGlyphRoot")
       ? null : "expected NoGlyphRoot, got " + JSON.stringify(notXml.diag));

  /* ---- the chain operator, from OPERATOR_TARGET §8.1 -------------------
     Every one of these forbids a specific way the operator can go back to
     being unrecoverable. The bucket had no extend case at all before, which
     is why the inverse could break and still read 12/12. */

  const fab = trip("[in[rtnl-go`cover X`]]");
  ok("F-13", "an extend does not fabricate a <needs> on the way back",
     fab.stable && !/what to execute/.test(fab.x1) && !/what to execute/.test(fab.x2)
       ? null : "fabricated: " + JSON.stringify(fab.back.src));

  const ext = trip("[a-b-c]"), itm = trip("[a-b,c]");
  ok("F-14", "extend and item stay distinct through the round trip",
     ext.stable && itm.stable && ext.x1 !== itm.x1 ? null
       : "collapsed: " + JSON.stringify(ext.back.src) + " vs " + JSON.stringify(itm.back.src));

  const brk = trip("[in-[rwk]]");
  ok("F-15", "chain does not leak onto a bracketed child",
     brk.stable && !/<rework[^>]*chain=/.test(brk.x1) && /<needs>what to rework<\/needs>/.test(brk.x1)
       ? null : "leaked, or the <needs> is missing: " + brk.x1.replace(/\s+/g, " "));

  ok("F-16", "`-[` is a synonym of `[`",
     G.toXML("[in-[rwk]]", opts) === G.toXML("[in[rwk]]", opts) ? null
       : "the two forms diverged");

  const germ = trip("[--germinate]");
  ok("F-17", "chain never reaches a placeholder name",
     !/<needs[^>]*chain=/.test(germ.x1) ? null : "chain on a <needs slot>");

  const kids = G.fromXML('<glyph-package engine="' + G.VERSION + '"><schema/><block once="true"><instruction>' +
    '<chain><rework><user-input>x</user-input></rework></chain>' +
    '</instruction></block></glyph-package>', opts);
  ok("F-18", "a chain element with children is named, not silently repaired",
     (kids.diag || []).some(d => d.code === "XmlChainHasChildren" && d.sev === "fix") ? null
       : "no XmlChainHasChildren at fix");

  const first = G.fromXML('<glyph-package engine="' + G.VERSION + '"><schema/><block once="true"><instruction>' +
    '<chain><rework chain="item"/><format/></chain>' +
    '</instruction></block></glyph-package>', opts);
  ok("F-19", "a run starting with `,` is promoted and reported",
     (first.diag || []).some(d => d.code === "XmlChainStartsWithItem" && d.sev === "fix") &&
     G.parse(first.src, opts).gaps.every(g => g.sev !== "fix")
       ? null : "not reported, or the reconstruction is not valid Glyph: " + JSON.stringify(first.src));

  const edit = G.toXML("[ins-alw,nev]", opts);
  ok("F-20", "force=\"editorial\" keeps its place beside chain",
     /<chain>\s*<always force="editorial"\/>/.test(edit) ? null
       : "attribute order or presence changed: " + edit.replace(/\s+/g, " "));

  const seg = trip("[in-rwk;[in-fmt]");
  ok("F-21", "a chain does not cross a segment boundary",
     seg.stable && (seg.x1.match(/<block once="true">/g) || []).length === 2 &&
     !/<instruction[^>]*chain=/.test(seg.x1)
       ? null : "the chain crossed the `;`: " + seg.x1.replace(/\s+/g, " "));

  const bareUnk = trip("[in-zzz]");
  ok("F-22", "an unknown bare tag keeps its chain",
     bareUnk.stable && /<chain>\s*<unresolved tag="zzz"\/>/.test(bareUnk.x1) ? null
       : "lost: " + bareUnk.x1.replace(/\s+/g, " "));

  const emo = trip("/eth/[crit'x']");
  ok("F-23", "the inverse writes the slash spelling, never the backslash",
     emo.stable && /\/eth\//.test(emo.back.src) && emo.back.src.indexOf("\\") === -1
       ? null : "the abandoned spelling came back: " + JSON.stringify(emo.back.src));

  return F.length;
}
const rF = runFromXmlChecks();

/* ------------------------------------------------------------------ *
 * D — XML_REFERENCE.md, kept honest (v1.3.4.00)
 *
 * A reference nobody tests goes stale in silence. The draft this file was
 * reconciled from still listed [BASE] as a command two versions after the
 * glossary made it a keyword — nothing was there to notice. These checks
 * read the reference's own tables and hold every row against the emitter,
 * the same way X-01/X-14 hold GLOSSARY.md against the vocabulary.
 * ------------------------------------------------------------------ */

function runReferenceChecks() {
  console.log("\n--- XML_REFERENCE.md — the doc against the engine ---");
  const D = [];
  const ok = (id, name, why) => {
    if (why) { console.log("  ✗ " + id + ": " + name); console.log("      " + why); failures.push(id); }
    else { console.log("  ✓ " + id + ": " + name); D.push(id); }
  };

  const fs = require("fs");
  const path = require("path");
  const refPath = path.resolve(__dirname, "../.guidelines/XML_REFERENCE.md");
  let md = "";
  try { md = fs.readFileSync(refPath, "utf8"); }
  catch (e) { ok("D-01", "the reference exists", "XML_REFERENCE.md not found"); return D.length; }
  ok("D-01", "the reference exists", null);

  /* every `[x` | `<y>` row in the vocabulary tables */
  const rows = [];
  const re = /^\|\s*`\[([a-z0-9_.-]+)`\s*\|\s*`<([a-z0-9-]+)>`\s*\|/gm;
  let m;
  while ((m = re.exec(md))) rows.push({ bracket: m[1], element: m[2] });

  ok("D-02", "the vocabulary tables were found and parsed",
     rows.length > 100 ? null : "only " + rows.length + " rows parsed — the table shape changed");

  /* the load-bearing one: every documented element is what the engine emits */
  const wrong = [];
  rows.forEach(r => {
    const cl = G.classify(r.bracket, {});
    if (cl.tier === "unknown") { wrong.push(r.bracket + ": not in the vocabulary at all"); return; }
    const el = G.elName(cl.canonical, cl.tier, cl.gloss);
    if (el !== r.element) wrong.push(r.bracket + ": doc says <" + r.element + ">, engine emits <" + el + ">");
  });
  ok("D-03", "every documented bracket→element pair matches the emitter",
     wrong.length ? wrong.slice(0, 6).join(" | ") + (wrong.length > 6 ? " (+" + (wrong.length - 6) + " more)" : "") : null);

  /* the reverse gap: a command in the engine that the reference never mentions */
  const documented = {};
  rows.forEach(r => { documented[G.classify(r.bracket, {}).canonical] = 1; });
  const undocumented = []
    .concat(Object.keys(G.INSTR), Object.keys(G.STRUCT), Object.keys(G.META))
    .filter(c => !documented[c]);
  ok("D-04", "no command in the engine is missing from the reference",
     undocumented.length ? "undocumented: " + undocumented.join(", ") : null);

  /* aliases must not be listed as elements of their own — the reference says
     so in §2, and a row claiming otherwise would contradict its own rule */
  const aliasRows = rows.filter(r => G.ALIAS[r.bracket.toUpperCase()]);
  ok("D-05", "no alias is documented as an element in its own right",
     aliasRows.length ? aliasRows.map(r => r.bracket).join(", ") : null);

  /* BASE is the specific stale row that motivated these checks: the glossary
     made it a keyword and the draft kept calling it a command */
  ok("D-06", "BASE is not documented as a command (GLOSSARY.md §0.2)",
     rows.some(r => r.bracket === "base") ? "the reference lists [base as a command again" : null);

  /* §4 — operators and delimiters. D-03 and D-04 only ever looked at the
     vocabulary tables, so §4 is the one table in the reference that nothing
     asserted. That blind spot is why `/` could be documented as an operator
     while the engine dropped it into <off>, and why the C-01 resolution could
     reach glyph-grammar.ebnf and stop there.

     A token check would not catch it: the lexer DOES emit a `divide` token.
     What fails is the documented behaviour, so each row gets a probe and an
     expectation. `expect` is what the reference promises; when it does not
     hold, the row and the engine disagree and one of them is wrong. */
  const SECTION4 = [
    { id: "4-01", src: "[ins'x'][ins`y`]",
      expect: x => /<user-input>x<\/user-input>/.test(x) && /<user-input>y<\/user-input>/.test(x) },
    { id: "4-02", src: "[ins'a','b']",
      expect: x => /<instruction>\s*<user-input>a<\/user-input>\s*<user-input>b<\/user-input>/.test(x) },
    { id: "4-03", src: "[ins'a'];[ins'b']",
      expect: x => (x.match(/<block /g) || []).length === 2 },
    { id: "4-04", src: "[ins'a'];;[ins'b']",       expect: x => /<break\/>/.test(x) },
    { id: "4-05", src: "[ins'a'];[=[ins'b']",      expect: x => /continues="previous"/.test(x) },
    { id: "4-06", src: "[in-rwk]",
      /* rederived for glyph-package (E2, late): a run of one is still a run */
      expect: x => /<instruction>\s*<chain>\s*<rework\/>\s*<\/chain>\s*<\/instruction>/.test(x) },
    { id: "4-07", src: "[in-rwk,ctx]",
      /* rederived for glyph-package (E2): the run is wrapped and the attribute
         does not survive it, position carrying the operator - PACKAGE_TARGET.md
         3.1 and 3.2. This is the ONLY forward vector in the corpus exercising a
         chain of more than one member. */
      expect: x => /<instruction>\s*<chain>\s*<rework\/>\s*<context\/>\s*<\/chain>\s*<\/instruction>/.test(x) },
    /* 4-08 was the `/` divide row. It is gone from the reference because it is
       gone from the grammar (C-01) and now from the engine; the refusal that
       replaced it lives in bucket N, where a malformed construct belongs. */
    { id: "4-09", src: "[off]hello [ins'x'][on]", expect: x => /<off>hello \[ins'x'\]<\/off>/.test(x) },
    /* the two rows added on 2026-09-05: `,` between bracketed siblings, and
       the verbatim fence. D-08 requires a probe per documented row, which is
       what keeps §4 from drifting away from the engine. */
    { id: "4-13", src: "[simp`X`],[core]",
      expect: x => /<holds>/.test(x) && x.indexOf("join=") === -1 },
    { id: "4-14", src: "[raw][a[b]][/raw]",
      expect: x => /<raw>\[a\[b\]\]<\/raw>/.test(x) },
    { id: "4-10", src: "[ins'a']r-'a list'",       expect: x => /<user-expectative expects="/.test(x) },
    { id: "4-11", src: "[logic]let a = 1[/logic]",
      expect: x => /<logic>/.test(x) && /<rule kind="/.test(x) },
    /* the row reads "*not applicable* (§1)" because auto-close maps to no
       operator of its own — but the behaviour is testable and this is the case
       GLYPH-COMO-COMECAR named explicitly, so it gets a probe rather than an
       exemption: an unclosed source must emit what the closed one emits */
    { id: "4-12", src: "[in[rwk]",
      expect: x => x === G.toXML("[in[rwk]]", WITH_BOTH) }
  ];

  const broken = [];
  SECTION4.forEach(p => {
    let xml = "";
    try { xml = G.toXML(p.src, WITH_BOTH); }
    catch (e) { broken.push(p.id + ": threw — " + e.message); return; }
    const holds = p.expect(xml);
    if (p.awaiting) {
      /* same pin as runGroup: rederived ahead of the emitter, unpinned the
         moment it starts holding */
      if (holds) broken.push(p.id + ": passes now - " + p.awaiting +
                             " has landed; remove `awaiting` and its note");
      return;
    }
    if (!holds)
      broken.push(p.id + " (" + p.src + "): the engine does not do what §4 documents"
                  + (/<off>/.test(xml) ? " — it fell into <off>, which is the documented behaviour of a DIFFERENT row" : ""));
  });
  ok("D-07", "every operator documented in §4 behaves as documented",
     broken.length ? broken.join(" | ") : null);

  /* the reverse gap, the same shape as D-04: a §4 row nobody probes is a row
     that can go stale in silence, which is the defect this check exists for */
  const s4 = md.split(/^## 4\. /m)[1];
  const s4rows = s4 ? (s4.split(/^## /m)[0].match(/^\|(?!\s*-)(?!\s*Bracket).*\|$/gm) || []) : [];
  /* §11 — the failure section. It was written after three defects had lived
     for versions in the space where it should have been: the document had no
     place to state what a malformed construct produces, so nothing written
     here could contradict an engine that fabricated one. Prose alone would
     re-create that, so §11.3 is held to the engine exactly as §7 is by D-03. */
  const REFUSALS = [
    { code: "SlashInChain",           run: () => G.parse("[in-rwk/ctx]", WITH_BOTH).gaps },
    { code: "BackslashMood",          run: () => G.parse("\\eth\\[ins`x`]", WITH_BOTH).gaps },
    { code: "UnknownEmotion",         run: () => G.parse("/eth/xyz/[ins`x`]", WITH_BOTH).gaps },
    { code: "XmlChainHasChildren",    run: () => G.fromXML('<glyph-package engine="' + G.VERSION + '"><schema/><block once="true"><instruction>' +
        '<chain><rework><user-input>x</user-input></rework></chain>' +
        '</instruction></block></glyph-package>', WITH_BOTH).diag },
    { code: "XmlChainStartsWithItem", run: () => G.fromXML('<glyph-package engine="' + G.VERSION + '"><schema/><block once="true"><instruction>' +
        '<chain><rework chain="item"/><format/></chain>' +
        '</instruction></block></glyph-package>', WITH_BOTH).diag },
    /* the root retired in 2.4.5.01: refused by name rather than read leniently */
    { code: "XmlLegacyRoot",          run: () => G.fromXML('<glyph><block once="true">' +
        '<instruction/></block></glyph>', WITH_BOTH).diag }
  ];

  const notRaised = REFUSALS.filter(r => {
    const g = r.run() || [];
    return !g.some(x => x.code === r.code && x.sev === "fix");
  }).map(r => r.code);
  ok("D-09", "every refusal documented in §11.3 is raised at fix by its trigger",
     notRaised.length ? "documented but not raised: " + notRaised.join(", ") : null);

  /* the reverse gap, the shape D-04 is to D-03 */
  const s11 = md.split(/^### 11\.3 /m)[1];
  const s11codes = s11 ? (s11.split(/^### /m)[0].match(/^\| `([A-Za-z]+)`/gm) || [])
                           .map(r => r.replace(/^\| `|`$/g, "")) : [];
  const undocRefusal = REFUSALS.map(r => r.code).filter(c => s11codes.indexOf(c) === -1);
  const unprobed = s11codes.filter(c => !REFUSALS.some(r => r.code === c));
  ok("D-10", "§11.3 and the probes name the same refusals",
     (undocRefusal.length || unprobed.length)
       ? (undocRefusal.length ? "raised but not in §11.3: " + undocRefusal.join(", ") + ". " : "") +
         (unprobed.length ? "in §11.3 but never probed: " + unprobed.join(", ") : "")
       : null);

  ok("D-08", "every §4 row has a probe in D-07",
     s4rows.length === SECTION4.length ? null
       : "§4 has " + s4rows.length + " rows and D-07 has " + SECTION4.length
         + " probes — a documented operator with no probe cannot be caught when it goes stale");

  /* G17: the worked example in section 4 was stale for a whole release because
     D-07 probes the ROWS and nobody probed the example beneath them. The skill
     carries a hand-written example of the emitted document with the same
     exposure, so it gets a probe rather than a promise. */
  const SKILL = path.resolve(__dirname, "../skills/glyph-markup/SKILL.md");
  let skillText = null;
  try { skillText = fs.readFileSync(SKILL, "utf8"); } catch (e) {}
  if (skillText === null) ok("D-11", "the published skill exists", "skills/glyph-markup/SKILL.md not found");
  else {
    const shown = (skillText.match(/<glyph-package engine="[^"]*">[\s\S]*?<\/glyph-package>/) || [])[0];
    /* expansions included deliberately: without it no <invoke> is emitted and
       the probe would compare against a document the engine never ships.
       That is finding G13, one store reached by two paths. */
    const real = G.toXML("[crit-ctx,ex'X']",
      { templates: TPL.templates, rules: RULESTORE,
        expansions: require("../.guidelines/expansions.json") }).trim();
    ok("D-11", "the worked document in the skill is what the engine emits",
       !shown ? "no worked <glyph-package> example found in SKILL.md"
              : shown === real ? null
              : "the skill shows a document the engine does not emit");
  }


  return D.length;
}
const rD = runReferenceChecks();

/* ------------------------------------------------------------------ *
 * E4 — the round-trip invariant, moved to the AST
 *
 * The old oracle (`trip`, bucket F) asserts XML string equality on a second
 * lap. That was right while the XML was the deliverable and the AST was an
 * inspection panel. T23 reversed it, and the reversal has a cost the old
 * invariant cannot see:
 *
 *     [off]p[on]  ->  <off>p</off>  ->  " p "  ->  <off>p</off>
 *
 * XML equality PASSES. The source lost `[off]` and `[on]` entirely — the mode
 * toggle is gone and only its content survived. An invariant that calls that a
 * fixed point is measuring the serialisation, not the meaning.
 *
 * So the invariant becomes equality of the `full` AST, minus the fields that
 * record HOW the source was spelled rather than WHAT it says:
 *
 *   raw, isAlias   an alias and its canonical are the same command
 *   form           a backtick and a quote hold the same literal
 *
 * Everything semantic is compared, `origin` and `chainElement` included — which
 * is the point of E0 and would be given away by a lazier exclusion set.
 *
 * Known losses are PINNED WITH A REASON rather than excluded, so a new one
 * cannot hide behind a documented one.
 * ------------------------------------------------------------------ */
function runAstInvariant() {
  console.log("\n--- E4 — the round trip, measured on the AST ---");
  const D = [];
  const ok = (id, name, why) => {
    const pin = awaitCheck(id, why);
    if (pin) { console.log(pin.line); if (pin.pass) D.push(id); else failures.push(id); return; }
    if (why) { console.log("  ✗ " + id + ": " + name); console.log("      " + why); failures.push(id); }
    else { console.log("  ✓ " + id + ": " + name); D.push(id); }
  };

  const opts = { templates: TPL.templates, rules: RULESTORE,
                 expansions: require("../.guidelines/expansions.json") };
  /* Fields that record HOW the source was written, not what it says. An alias
     and its canonical are the same command; a backtick and a quote hold the
     same literal; and `autoClosed` records that the author omitted a closing
     bracket which the engine supplied — the reconstruction writes it out, so
     the flag falls with reason. All four are provenance of the text.

     Everything semantic stays in, `origin` and `chainElement` included. A
     lazier exclusion set would give away exactly what E0 was for. */
  const SPELLING = { raw: 1, isAlias: 1, form: 1, autoClosed: 1, autoClosedCount: 1,
                     /* `at` is a coordinate INTO the source text, so the
                        reconstruction necessarily carries different ones: an
                        alias that normalises or a bracket the engine supplied
                        moves every position after it. It records where, never
                        what — the same class as the rest of this set. */
                     at: 1,
                     /* the descriptor describes the TEXT — its length and its
                        checksum — so a reconstruction necessarily carries a
                        different one. Same class as `at`: it records which
                        source, never what the source says. `stores` stays in,
                        because a reconstruction parsed against a different
                        store would be a real difference. */
                     source: 1 };

  const strip = o => {
    if (Array.isArray(o)) return o.map(strip);
    if (!o || typeof o !== "object") return o;
    const out = {};
    Object.keys(o).forEach(k => { if (!SPELLING[k]) out[k] = strip(o[k]); });
    return out;
  };
  const meaning = src => JSON.stringify(strip(G.toAST(src, opts)));

  /* each entry: why it cannot hold, verified, and never a blanket exclusion */
  const PINNED = {
    "[in-[rwk]]": "`-[` normalises to `[` by design (OPERATOR_TARGET §3.2): marking a bracketed child too would force fromXML to decide whether chain=\"extend\" meant `-rwk` or `-[rwk]`",
    "[off]p[on]": "the mode toggle is lost: <off> reconstructs as prose, so ModeOff becomes Text. NOT a documented non-survivor — found by this check",
    "[logic]let a = 1[/logic]": "fromXmlLogic writes a newline after the opening tag, so every rule's `line` shifts by one. Found by this check"
  };

  const CASES = [].concat(POSITIVE, INCOMPLETE, INVALID, REGRESSION, TEMPLATES, RULE_CASES)
    .filter(c => c && c.id && typeof c.src === "string").map(c => c.src)
    .concat(Object.keys(PINNED));

  /* One cause, not twenty symptoms: `[A],[B]` and `[A][B]` emit IDENTICAL XML,
     because the chain attribute marks bare links only (OPERATOR_TARGET §3.2)
     and a bracketed sibling has nowhere to carry `origin: "item"`. So a comma
     between bracketed commands cannot come back. Pinned by cause rather than
     by listing every source that happens to contain one, which would turn one
     open question into twenty pins nobody could read. */
  const commaBetweenBrackets = src => /,\s*\[/.test(src);

  const broke = [], healed = [], byCause = [];
  let refused = 0, documented = 0;
  CASES.forEach(src => {
    let holds;
    try { holds = meaning(src) === meaning(G.fromXML(G.toXML(src, opts), opts).src); }
    catch (e) { broke.push(JSON.stringify(src).slice(0, 50) + ": threw"); return; }
    if (PINNED[src]) { if (holds) healed.push(src); return; }
    /* the second of the three losses README:58 already pins: content appended
       past a template's declared params has no slot and cannot be recovered */
    if (!holds && /^\[--[a-z-]+/.test(src) && /\[[a-z]/i.test(src.slice(3))) { documented++; return; }
    if (!holds && commaBetweenBrackets(src)) { byCause.push(src); return; }
    /* A refused input has no meaning to preserve: the engine's answer to it IS
       the refusal, and asking whether malformed source survives a round trip
       asks the wrong question of the wrong input. The invariant is a property
       of well-formed sources. Bucket N asserts the refusal itself. */
    if (!holds && (G.parse(src, opts).gaps || []).some(g => g.sev === "fix")) { refused++; return; }
    if (!holds) broke.push(JSON.stringify(src).slice(0, 60));
  });

  ok("RT-01", "meaning survives the round trip everywhere it is not pinned",
     broke.length ? broke.slice(0, 5).join(" | ") + (broke.length > 5 ? " (+" + (broke.length - 5) + ")" : "") : null);
  console.log("      (" + byCause.length + " carry `,[` — pinned by cause; " + refused +
              " are refused at fix, where the round trip is not the question; " + documented +
              " are the template-overflow loss README:58 already pins)");
  ok("RT-02", "no pinned loss has quietly healed",
     healed.length ? "now round-trips — remove the pin and its reason: " + healed.join(" | ") : null);

  /* the reason the invariant moved, asserted rather than argued */
  const off = "[off]p[on]";
  const x1 = G.toXML(off, opts), x2 = G.toXML(G.fromXML(x1, opts).src, opts);
  ok("RT-03", "the AST invariant is strictly stronger than the XML one",
     (x1 === x2 && meaning(off) !== meaning(G.fromXML(x1, opts).src)) ? null
       : "the case that justified moving the invariant no longer demonstrates it");

  /* fromAST over the whole corpus. The oracle is toXML on both sides, so the
     expectations are free — the same shape bucket F uses, pointed at the other
     inverse. This is what proves the AST is complete: a field the projection
     forgot shows up here as a reconstruction that does not re-emit. Two did —
     `expanded` on a template and `slot` on a bound literal, both present in the
     XML and absent from a projection called `full`. */
  const astBroke = [];
  /* the same classification RT-01 uses: a refused source has no meaning to
     preserve, and the template overflow is a loss README:58 already pins.
     Applying one rule in one place and not the other is how a suite starts
     disagreeing with itself. */
  const notAsked = src => PINNED[src]
    || (/^\[--[a-z-]+/.test(src) && /\[[a-z]/i.test(src.slice(3)))
    || (G.parse(src, opts).gaps || []).some(g => g.sev === "fix");
  CASES.filter(src => !notAsked(src)).forEach(src => {
    let a, b;
    try {
      a = G.toXML(src, opts);
      const r = G.fromAST(G.toAST(src, opts), opts);
      b = G.toXML(r.src, opts);
    } catch (e) { astBroke.push(JSON.stringify(src).slice(0, 40) + ": threw"); return; }
    if (a !== b) astBroke.push(JSON.stringify(src).slice(0, 55));
  });
  ok("RT-04", "fromAST reconstructs every corpus source to the same XML",
     astBroke.length ? astBroke.slice(0, 5).join(" | ") +
       (astBroke.length > 5 ? " (+" + (astBroke.length - 5) + ")" : "") : null);

  /* The comma both paths carry.
     This assertion used to read "the AST path keeps a comma the XML path
     cannot", and it was a pin on a real loss: the emitted document had no way
     to say `,` between bracketed siblings, so `[crit[ctx],[ask]]` came back
     from XML as `[crit[ctx][ask]]` — conjunction silently rewritten as
     sequence, which GLOSSARY §0.1 gives a different reading.

     <holds> closed it. The pin is inverted rather than deleted, because the
     loss it described is exactly what must never come back: a suite that drops
     a retired pin loses the memory of what the pin was for. */
  const comma = "[crit[ctx],[ask]]";
  const viaAst = G.fromAST(G.toAST(comma, opts), opts).src;
  const viaXml = G.fromXML(G.toXML(comma, opts), opts).src;
  ok("RT-05", "both paths keep the comma, and conjunction stays conjunction",
     (/,\s*\[/.test(viaAst) && /,\s*\[/.test(viaXml)) ? null
       : "via AST: " + JSON.stringify(viaAst) + " | via XML: " + JSON.stringify(viaXml));

  /* and the difference the loss used to erase is visible in the document */
  ok("RT-07", "conjunction and sequence do not emit the same bytes",
     G.toXML("[simp`X`],[core]", opts) !== G.toXML("[simp`X`][core]", opts) ? null
       : "[A],[B] and [A][B] still emit identical documents");

  /* a thinned envelope is refused rather than half-read */
  const thin = G.fromAST(G.toAST("[in-rwk]", { ...opts, projection: "panel" }), opts);
  ok("RT-06", "a panel envelope is refused, not guessed at",
     (thin.src === "" && (thin.diag || []).some(d => d.code === "ThinnedAST" && d.sev === "fix"))
       ? null : "it tried: " + JSON.stringify(thin.src));

  return D.length;
}
const rRT = runAstInvariant();

/* ------------------------------------------------------------------ *
 * the AST schema — the two directions that hold each other
 *
 * `.guidelines/ast-schema.json` is hand-authored, deliberately: a schema
 * generated from the engine would agree with it by construction and catch
 * nothing. So glyph-check validates envelopes against the declaration, and
 * this bucket asserts the other direction — that what the engine emits
 * conforms. Drift in either one is then a failure, the same way
 * XML_REFERENCE and D-03 hold each other.
 *
 * Acceptance is the mutation criterion from BUNDLE_TARGET §5: break ten
 * things, catch at least nine. A validator nobody has broken is a validator
 * nobody knows the shape of.
 * ------------------------------------------------------------------ */
function runSchemaChecks() {
  console.log("\n--- the AST schema — glyph-check against the engine ---");
  const D = [];
  const ok = (id, name, why) => {
    if (why) { console.log("  ✗ " + id + ": " + name); console.log("      " + why); failures.push(id); }
    else { console.log("  ✓ " + id + ": " + name); D.push(id); }
  };

  const check = CHECK_MOD;

  const opts = { templates: TPL.templates, rules: RULESTORE,
                 expansions: require("../.guidelines/expansions.json") };
  const CORPUS = [].concat(POSITIVE, INCOMPLETE, INVALID, REGRESSION, LONG,
                           TEMPLATES, CONSTRAINTS, RULE_CASES);

  const bad = [], truncated = [], acceptedAnyway = [];
  CORPUS.forEach(c => {
    if (!c || !c.id || typeof c.src !== "string") return;
    let env;
    try { env = G.toAST(c.src, opts); } catch (e) { bad.push(c.id + ": threw"); return; }
    const errs = check.validate(env);
    /* A truncated envelope SHOULD be refused — rule 11, and the deep-nesting
       stress vectors are the only sources that produce one. Asserting that
       every envelope conforms would have made correct behaviour look like a
       failure; asserting nothing would let a real violation hide behind it. */
    if (env.truncatedNodes) {
      truncated.push(c.id);
      if (!errs.length) acceptedAnyway.push(c.id);
      return;
    }
    if (errs.length) bad.push(c.id + ": " + errs[0]);
  });
  ok("SC-01", "every complete corpus envelope conforms to the declared schema",
     bad.length ? bad.slice(0, 4).join(" | ") + (bad.length > 4 ? " (+" + (bad.length - 4) + ")" : "") : null);
  ok("SC-03", "a truncated envelope is refused, not accepted as complete",
     acceptedAnyway.length ? "accepted despite being truncated: " + acceptedAnyway.join(", ")
       : truncated.length ? null : "no corpus source produced a truncated envelope — the check proves nothing");

  /* ten mutations, one per rule the schema states, applied to a real envelope */
  const clone = () => JSON.parse(JSON.stringify(G.toAST("[in-rwk,fmt`x`];/eth/[crit`y`]", opts)));
  const MUTANTS = [
    ["envelope type",        e => { e.type = "NotGlyph"; }],
    ["envelope version",     e => { delete e.version; }],
    ["envelope projection",  e => { e.projection = "panel"; }],
    ["undeclared envelope key", e => { e.smuggled = 1; }],
    ["missing node key",     e => { delete e.segments[0].body[0].origin; }],
    ["undeclared node key",  e => { e.segments[0].body[0].chainOp = "extend"; }],
    ["unknown node type",    e => { e.segments[0].body[0].type = "Whatever"; }],
    ["origin off the list",  e => { e.segments[0].body[0].body[0].origin = "divide"; }],
    ["literal form off the list", e => {
       (function f(l){ (l||[]).forEach(n => { if (n.type === "Literal") n.form = "curly"; if (n.body) f(n.body); }); })
       (e.segments[0].body); }],
    ["schema off the declared one", e => { e.schema = 99; }],
    ["a store fingerprint dropped",  e => { delete e.stores.expansions; }],
    ["source newline off the list",  e => { e.source.newline = "cr"; }],
    ["undeclared key in source",     e => { e.source.mtime = 1; }],
    ["diagnostic at without e", e => {
       e.diagnostics.push({ code:"X", severity:"fix", label:"l", message:"m", at:{ s:0 } }); }]
  ];
  const missed = MUTANTS.filter(m => {
    const e = clone(); m[1](e);
    return check.validate(e).length === 0;
  }).map(m => m[0]);
  ok("SC-02", "the schema catches at least 13 of 14 mutations",
     (MUTANTS.length - missed.length) >= MUTANTS.length - 1 ? null
       : "caught " + (MUTANTS.length - missed.length) + "/" + MUTANTS.length + "; missed: " + missed.join(", "));

  return D.length;
}
const rSC = runSchemaChecks();

/* ------------------------------------------------------------------ *
 * the glyph-package document validator (E3)
 *
 * Written before the emitter it gates, and held to the same standard the AST
 * schema is: acceptance is a mutation test, one per clause of
 * PACKAGE_TARGET.md section 6, at most one escaping. A validator that catches
 * nothing is decorative, and the golden is the only thing it can be pointed at
 * until E3b exists.
 * ------------------------------------------------------------------ */
function runPackageChecks() {
  console.log("\n--- glyph-package — the document validator ---");
  const D = [];
  const ok = (id, name, why) => {
    if (why) { console.log("  \u2717 " + id + ": " + name); console.log("      " + why); failures.push(id); }
    else { console.log("  \u2713 " + id + ": " + name); D.push(id); }
  };
  let GOLD = null;
  try { GOLD = require("../conformance/golden.json"); }
  catch (e) { ok("PK-00", "the golden exists", "conformance/golden.json not found"); return D.length; }

  const refused = GOLD.cases.filter(c => CHECK_MOD.validatePackage(c.package).length);
  ok("PK-01", "every golden document is accepted",
     refused.length ? refused.map(c => c.id + ": " + CHECK_MOD.validatePackage(c.package).join(" | ")).join("  ||  ") : null);

  /* D-02 - the id is a label; the digest is the identity. A pin bound to a
     position silently starts excusing a different vector the moment a case is
     inserted or reordered, and lock T10 only catches a pin whose REASON expired,
     never one that changed subject. */
  const crypto = require("crypto");
  const digestOf = s => crypto.createHash("sha256").update(s, "utf8").digest("hex").slice(0, 12);
  const drifted = GOLD.cases.filter(c => c.digest !== digestOf(c.src)).map(c => c.id);
  ok("PK-04", "every case digest matches its own source",
     drifted.length ? "source edited without the digest following it: " + drifted.join(", ") : null);
  const migrated = GOLD.cases.filter(c => c.pinnedTo && c.pinnedTo !== digestOf(c.src)).map(c => c.id);
  ok("PK-05", "no pin has changed subject",
     migrated.length ? "pinned to a source this case no longer holds: " + migrated.join(", ") : null);

  /* D-04 - `duplicate` and `conflicting` are different words. Same id and same
     content is idempotence and costs nothing; same id and DIFFERENT content is a
     collision, and it is the only one that is a defect. Collapsing them makes a
     re-run indistinguishable from a real clash - and here it hid a vector from
     the snapshot, which is keyed by id. */
  const corpusText = require("fs").readFileSync(require("path").resolve(__dirname, "test-corpus.js"), "utf8");
  const byId = {};
  for (const m of corpusText.matchAll(/\bid:\s*"([A-Z]+-[\w+]+)"\s*,\s*name:\s*"([^"]*)"/g)) {
    (byId[m[1]] = byId[m[1]] || []).push(m[2]);
  }
  const conflicting = Object.keys(byId).filter(id =>
    byId[id].length > 1 && new Set(byId[id]).size > 1);
  ok("PK-06", "no two vectors share an id with different content",
     conflicting.length
       ? "colliding ids, and the snapshot is keyed by id: " + conflicting.join(", ")
       : null);



  const E01 = GOLD.cases.find(c => c.id === "E-01").package;
  const E05 = GOLD.cases.find(c => c.id === "E-05").package;
  const PKM = [
    ["NotAPackage",        E01, d => d.replace("<glyph-package", "<glyph").replace("</glyph-package>", "</glyph>")],
    ["EngineUnstated",     E01, d => d.replace(' engine="' + G.VERSION + '"', "")],
    ["ChainDoubleEncoded", E01, d => d.replace("<go/>", '<go chain="extend"/>')],
    ["ChainUngrouped",     E01, d => d.replace("<note>", '<note chain="item">')],
    ["ChainEmpty",         E01, d => d.replace("<chain>\n          <go/>\n        </chain>", "<chain>\n        </chain>")],
    ["SchemaMissing",      E01, d => d.replace("  <schema/>\n", "")],
    ["InvokeMisplaced",    E01, d => d.replace(
        '<invoke reads="[ELAB[RSN]],[REF[CNST]]" species="composite" depth="1"/>\n        <chain>\n          <go/>\n        </chain>',
        '<chain>\n          <go/>\n        </chain>\n        <invoke reads="[ELAB[RSN]],[REF[CNST]]" species="composite" depth="1"/>')],
    ["InvokeOnAtom",       E01, d => d.replace("<note>", '<note>\n        <invoke reads="[X]" species="composite" depth="1"/>')],
    ["ReadingUnfaithful",  E01, d => d.replace('reads="[ELAB[RSN]],[REF[CNST]]"', 'reads="[ELAB[RSN]]"')],
    ["SegmentUnmarked",    E05, d => d.replace('<block once="true">', "<block>")],
    ["MoodMisplaced",      E05, d => d.replace("<instruction>", '<instruction/>\n    <mood dominant="joy"/>\n    <instruction>')],
    ["TextReflowed",       E01, d => d.replace("<user-input>start</user-input>", "<user-input>\n          start\n        </user-input>")],
  ];
  const inert = PKM.filter(m => m[2](m[1]) === m[1]).map(m => m[0]);
  ok("PK-02", "every mutation actually mutates",
     inert.length ? "these left the document unchanged, so they prove nothing: " + inert.join(", ") : null);

  const missed = PKM.filter(m => {
    const doc = m[2](m[1]);
    return doc === m[1] || !CHECK_MOD.validatePackage(doc).some(e => e.indexOf(m[0]) === 0);
  }).map(m => m[0]);
  ok("PK-03", "one mutation per clause, at most one escapes",
     (PKM.length - missed.length) >= PKM.length - 1 ? null
       : "caught " + (PKM.length - missed.length) + "/" + PKM.length + "; missed: " + missed.join(", "));

  return D.length;
}
const rPK = runPackageChecks();


/* ------------------------------------------------------------------ *
 * the five authored examples — conformance, not illustration
 *
 * These are the input→XML pairs the Regent wrote by hand: the instrument the
 * documentation calls the most reliable one there is, and the thing the handoff
 * had been asking for. They are held apart from the buckets above because they
 * are the only sources here whose *source* was authored as a claim rather than
 * as a test — under T4 the golden derives from these and from the
 * specification, never from an implementation.
 *
 * The XML in conformance/examples.json is what the engine answers. A change to
 * it is therefore a release decision, not a regression to absorb quietly: four
 * of the five moved when `chain` was introduced, and each moved by exactly the
 * lines that carry a bare link.
 * ------------------------------------------------------------------ */
function runExampleChecks() {
  console.log("\n--- the five authored examples ---");
  const D = [];
  const ok = (id, name, why) => {
    const pin = awaitCheck(id, why);
    if (pin) { console.log(pin.line); if (pin.pass) D.push(id); else failures.push(id); return; }
    if (why) { console.log("  ✗ " + id + ": " + name); console.log("      " + why); failures.push(id); }
    else { console.log("  ✓ " + id + ": " + name); D.push(id); }
  };

  let store = null;
  try { store = require("../conformance/examples.json"); }
  catch (e) { ok("E-00", "the examples exist", "conformance/examples.json not found"); return D.length; }

  const opts = { templates: TPL.templates, rules: RULESTORE,
                 expansions: require("../.guidelines/expansions.json") };

  store.cases.forEach(c => {
    const got = G.toXML(c.src, opts).trim();
    if (got !== c.xml) {
      const a = c.xml.split("\n"), b = got.split("\n");
      let first = "";
      for (let i = 0; i < Math.max(a.length, b.length); i++)
        if (a[i] !== b[i]) { first = "line " + (i + 1) + ": expected " + JSON.stringify(a[i]) +
                                     ", got " + JSON.stringify(b[i]); break; }
      ok(c.id, "authored pair still holds", first || "length differs");
      return;
    }
    /* Round-trip status is PINNED per case rather than demanded of all five.
       E-01 holds an apostrophe, and the README documents that text carrying
       one is substituted rather than preserved — the substitution reaches the
       XML, so that pair is XML-unstable by design. Asserting stability for
       everyone would have made a documented loss look like a defect; asserting
       nothing would let a real regression hide behind it. So each case says
       which it is, and a case that CHANGES its answer fails either way. */
    const back = G.fromXML(got, opts);
    const trips = G.toXML(back.src, opts).trim() === got;
    ok(c.id, "authored pair still holds", trips === !!c.roundTrips ? null
       : c.roundTrips
         ? "was round-trip stable and no longer is: " + JSON.stringify(back.src).slice(0, 80)
         : "is pinned as not round-tripping and now does — remove the pin and its note");
  });

  return D.length;
}
const rE = runExampleChecks();

/* ------------------------------------------------------------------ *
 * projection snapshot — the net under the split
 *
 * The 173 assertions above say the engine still satisfies 173 claims. They do
 * not say the output is unchanged, and for a pure mechanical refactor that is
 * the only honest acceptance criterion: same input, same bytes out. Anything
 * the assertions do not happen to look at can move without a single one going
 * red.
 *
 * So every declared corpus source is run through all three projections and the
 * result checksummed. Taken BEFORE the cut, this is what proves afterwards that
 * nothing else moved.
 *
 * Stores are passed explicitly and identically for every case, rather than per
 * case: what a refactor must preserve is `same input + same stores -> same
 * bytes`, and a uniform maximal store exercises more of the engine than the
 * narrower per-case opts do.
 *
 *   node scripts/test-corpus.js --update-snapshot
 *
 * regenerates it. That flag is also the way to paper over a regression, so it
 * says out loud what it changed and it is never run to make a red suite green.
 * ------------------------------------------------------------------ */
function runSnapshotChecks() {
  console.log("\n--- projection snapshot — same input, same bytes ---");
  const D = [];
  const ok = (id, name, why) => {
    if (why) { console.log("  ✗ " + id + ": " + name); console.log("      " + why); failures.push(id); }
    else { console.log("  ✓ " + id + ": " + name); D.push(id); }
  };

  const fs = require("fs");
  const path = require("path");
  const crypto = require("crypto");
  const SNAP = path.resolve(__dirname, "../.guidelines/corpus-snapshot.json");
  const SNAP_OPTS = { templates: TPL.templates, rules: RULESTORE,
                      expansions: require("../.guidelines/expansions.json") };

  const sum = s => crypto.createHash("sha256").update(s, "utf8").digest("hex").slice(0, 16);

  /* the eight declared arrays; the inline sources of the X/H/F/D checks are
     covered by their own buckets and have no stable id to key on here */
  const CORPUS = [].concat(POSITIVE, INCOMPLETE, INVALID, REGRESSION, LONG,
                           TEMPLATES, CONSTRAINTS, RULE_CASES);

  const now = {};
  const threw = [];
  CORPUS.forEach(c => {
    if (!c || !c.id || typeof c.src !== "string") return;
    const one = {};
    /* the AST envelope stamps the engine version, so hashing it whole made
       every version bump invalidate all 101 entries at once and bury real
       drift in the noise. The snapshot measures SHAPE; the stamp is recorded
       once in the file's own `engine` field, where it belongs. */
    const astShape = s => {
      const a = G.toAST(s, SNAP_OPTS);
      delete a.version;
      return JSON.stringify(a);
    };
    [["xml", s => G.toXML(s, SNAP_OPTS)],
     ["ast", astShape],
     ["hgml", s => G.toHGML(s, SNAP_OPTS)]].forEach(pair => {
      try { one[pair[0]] = sum(pair[1](c.src)); }
      catch (e) { one[pair[0]] = "THREW"; threw.push(c.id + "." + pair[0] + ": " + e.message); }
    });
    now[c.id] = one;
  });

  /* Pinned, with the reason, the way H-09 pins its known losses. The snapshot
     found this on its first run and it is a real gap rather than a quirk:
     L-01 and L-02 exist because the XML emitter and the AST were each hardened
     against deep nesting and each got a vector saying so — 8000 levels for the
     XML, a truncation marker at LIMITS.astDepth for the AST. The atomic burn
     was never given either, and nothing crossed the LONG sources with the
     .hgml projection, so nobody found out. Measured: toHGML survives 1600
     levels and overflows between 1600 and 3200.

     Pinned rather than hidden: a NEW throw fails this check, and closing this
     one means deleting its entry, not regenerating the snapshot. */
  /* Emptied by K18. It held `L-01.hgml: Maximum call stack size exceeded` from
     the day this bucket was written: the burn was the one projection with
     neither a ceiling nor a vector, while the XML emitter is hardened to 8000
     levels and the AST truncates with a marker. The burn now stops at the same
     ceiling the AST uses and says so in its own output, so the three
     projections finally agree on what deep means — and SN-01 required the pin
     to be removed rather than letting it outlive its reason. */
  const KNOWN_THROWS = [];
  const unexpected = threw.filter(t => KNOWN_THROWS.indexOf(t) === -1);
  const fixed = KNOWN_THROWS.filter(k => threw.indexOf(k) === -1);
  ok("SN-01", "the only projections that throw are the pinned ones",
     unexpected.length ? "new: " + unexpected.slice(0, 4).join(" | ")
       : fixed.length ? "pinned but no longer throwing — remove from KNOWN_THROWS: " + fixed.join(", ")
       : null);

  const ids = Object.keys(now);

  if (process.argv.indexOf("--update-snapshot") !== -1) {
    let prev = null;
    try { prev = JSON.parse(fs.readFileSync(SNAP, "utf8")).cases; } catch (e) { /* first run */ }
    const moved = prev ? ids.filter(id => !prev[id] ||
      ["xml", "ast", "hgml"].some(k => prev[id][k] !== now[id][k])) : [];
    /* D-01: one file, but the same rule. A snapshot truncated by a crash is
       read as content by the next run, and every case it lost reads as a
       projection that never existed. Write beside it, then rename. */
    const snapText = JSON.stringify({
      note: "GENERATED by test-corpus.js --update-snapshot — DO NOT EDIT BY HAND. " +
            "It records the checksum of every projection of every declared corpus source, " +
            "so a refactor can be held to 'same input, same bytes' rather than to 'the " +
            "assertions still pass'. Regenerating it to make a red suite green defeats it.",
      engine: G.VERSION, count: ids.length, cases: now
    }, null, 2) + "\n";
    fs.writeFileSync(SNAP + ".tmp", snapText);
    fs.renameSync(SNAP + ".tmp", SNAP);
    console.log("  ! snapshot written: " + ids.length + " sources, engine " + G.VERSION);
    if (prev) console.log("  ! " + moved.length + " changed" +
                          (moved.length ? ": " + moved.slice(0, 12).join(", ") : ""));
    ok("SN-02", "snapshot regenerated (not a check)", null);
    return D.length;
  }

  let stored = null;
  try { stored = JSON.parse(fs.readFileSync(SNAP, "utf8")); }
  catch (e) {
    ok("SN-02", "the snapshot exists",
       "no .guidelines/corpus-snapshot.json — run: node scripts/test-corpus.js --update-snapshot");
    return D.length;
  }
  ok("SN-02", "the snapshot exists", null);

  const missing = ids.filter(id => !stored.cases[id]);
  const extra = Object.keys(stored.cases).filter(id => !now[id]);
  const drift = ids.filter(id => stored.cases[id] &&
    ["xml", "ast", "hgml"].some(k => stored.cases[id][k] !== now[id][k]));

  ok("SN-03", "no source lost or gained since the snapshot",
     (missing.length || extra.length)
       ? (missing.length ? "not in the snapshot: " + missing.join(", ") + ". " : "") +
         (extra.length ? "in the snapshot but no longer declared: " + extra.join(", ") : "")
       : null);

  /* D-05, the half that was missing. The snapshot already answers WHICH sources
     moved; what it never said is WHAT KIND of change it was, and that is the
     first question every time. A run where only `ast` moved is a store or a
     diagnostic; one where `xml` moved is the emitter; one where all three moved
     is the parser. Counted here rather than by hand, which is how it was done
     three times over this release. */
  const byKind = { xml: [], ast: [], hgml: [] };
  drift.forEach(id => ["xml", "ast", "hgml"].forEach(k => {
    if (stored.cases[id][k] !== now[id][k]) byKind[k].push(id);
  }));
  const shape = ["xml", "ast", "hgml"]
    .filter(k => byKind[k].length)
    .map(k => byKind[k].length + " " + k).join(", ");
  const reads = byKind.xml.length && byKind.ast.length && byKind.hgml.length
      ? "all three projections moved, which reads as the parser"
    : byKind.xml.length ? "the emitted document moved, which reads as the emitter"
    : byKind.ast.length ? "only the envelope moved, which reads as a store or a diagnostic"
    : "only the burn moved";
  ok("SN-04", "every projection is byte-identical to the snapshot",
     drift.length
       ? shape + " \u2014 " + reads + ". " +
         drift.slice(0, 8).map(id => id + " (" +
           ["xml", "ast", "hgml"].filter(k => stored.cases[id][k] !== now[id][k]).join(", ") + ")")
           .join(" | ") + (drift.length > 8 ? " (+" + (drift.length - 8) + " more)" : "")
       : null);

  return D.length;
}
const rSN = runSnapshotChecks();

/* ------------------------------------------------------------------ *
 * the app — the deliverable nothing was checking
 *
 * The README promised the app opens by double-clicking the HTML over file://.
 * That stopped being true when the module system moved to ESM, because a
 * browser refuses a `type="module"` script over file:// on CORS — and since the
 * HTML and CSS still load, the page draws and nothing responds, so it reads as
 * a frozen app rather than as a load error. Five gates were green throughout.
 *
 * These do not drive a browser; that would cost a dependency this repository
 * does not have. They check the cheaper thing that actually broke: whether the
 * documented way in still matches what the page requires.
 * ------------------------------------------------------------------ */
function runAppChecks() {
  console.log("\n--- the app — the documented way in ---");
  const D = [];
  const fsx = require("fs"), px = require("path");
  const ok = (id, name, why) => {
    if (why) { console.log("  \u2717 " + id + ": " + name); console.log("      " + why); failures.push(id); }
    else { console.log("  \u2713 " + id + ": " + name); D.push(id); }
  };
  const ROOT = px.resolve(__dirname, "..");
  let html = null, readme = null;
  try { html = fsx.readFileSync(px.join(ROOT, "glyph-engine-alias.html"), "utf8"); } catch (e) {}
  try { readme = fsx.readFileSync(px.join(ROOT, "README.md"), "utf8"); } catch (e) {}
  if (html === null || readme === null) {
    ok("AP-00", "the app and its README exist", "glyph-engine-alias.html or README.md not found");
    return D.length;
  }

  /* every script the page asks for is actually there */
  const srcs = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map(m => m[1]);
  const absent = srcs.filter(s => !fsx.existsSync(px.join(ROOT, s)));
  ok("AP-01", "every script the page loads exists",
     absent.length ? "referenced and missing: " + absent.join(", ") : null);

  /* the one that would have caught it: modules and file:// cannot both be true */
  const usesModules = /<script[^>]*type="module"/.test(html);
  const tellsFileProtocol =
    /double-click\s+`?glyph-engine-alias\.html`?/i.test(readme) ||
    /built to open\s*\n?\s*over `file:\/\//i.test(readme);
  ok("AP-02", "the documented way in matches what the page requires",
     usesModules && tellsFileProtocol
       ? "the page loads ES modules, which a browser refuses over file://, while the README still says to open the HTML directly"
       : null);

  /* and the click the README promises has something behind it */
  const launcher = (readme.match(/Double-click `([^`]+)`/) || [])[1];
  ok("AP-03", "the launcher the README names exists",
     !launcher ? "the README names no launcher to double-click"
       : fsx.existsSync(px.join(ROOT, launcher)) ? null
       : "README says to double-click `" + launcher + "`, which is not in the repository");

  return D.length;
}
const rAP = runAppChecks();


/* ------------------------------------------------------------------ *
 * the command line — the OTHER documented way in
 *
 * AP-01..03 gate the app. Nothing gated the CLI, and the gap was the same
 * shape: until `--file` existed the engine had no filesystem entry point at
 * all, so `glyph-cli.js order.pgml` compiled the STRING "order.pgml" and
 * answered, confidently, about a filename. A silent wrong answer is the class
 * this release exists to remove, so the refusal is gated beside the feature.
 * ------------------------------------------------------------------ */
function runCliChecks() {
  console.log("\n--- the command line — the documented way in ---");
  const D = [];
  const fsx = require("fs"), px = require("path"), cp = require("child_process");
  const ok = (id, name, why) => {
    if (why) { console.log("  ✗ " + id + ": " + name); console.log("      " + why); failures.push(id); }
    else { console.log("  ✓ " + id + ": " + name); D.push(id); }
  };
  const ROOT = px.resolve(__dirname, "..");
  const CLI = px.join(ROOT, "scripts", "glyph-cli.js");
  const tmp = px.join(ROOT, ".cli-gate.pgml");
  const run = args => {
    try {
      return { out: cp.execFileSync(process.execPath, [CLI].concat(args),
                                   { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }), code: 0 };
    } catch (e) {
      return { out: String(e.stdout || "") + String(e.stderr || ""), code: e.status == null ? -1 : e.status };
    }
  };
  try {
    fsx.writeFileSync(tmp, "[crit`from a file`]", "utf8");

    /* CL-01 — the content is compiled, and it is the content and not the name */
    const r1 = run(["--file", tmp, "--xml"]);
    ok("CL-01", "--file compiles the file's content",
       r1.code === 0 && /<user-input>from a file<\/user-input>/.test(r1.out)
         ? null : "exit " + r1.code + ", output: " + JSON.stringify(r1.out.slice(0, 160)));

    /* CL-02 — the refusal, which is the half that keeps the wrong answer away */
    const r2 = run([tmp, "--xml"]);
    ok("CL-02", "a bare existing path is refused, never compiled as source",
       r2.code !== 0 && /--file/.test(r2.out) && !/<glyph-package/.test(r2.out)
         ? null : "exit " + r2.code + ", output: " + JSON.stringify(r2.out.slice(0, 160)));

    /* CL-03 — the old way in did not move */
    const r3 = run(["[crit`inline`]", "--xml"]);
    ok("CL-03", "source on the command line still compiles",
       r3.code === 0 && /<user-input>inline<\/user-input>/.test(r3.out)
         ? null : "exit " + r3.code + ", output: " + JSON.stringify(r3.out.slice(0, 160)));
  } finally {
    try { fsx.unlinkSync(tmp); } catch (e) { /* never existed, or already gone */ }
  }
  return D.length;
}
const rCL = runCliChecks();


/* ------------------------------------------------------------------ *
 * diagnostics that name the cause
 *
 * A message that describes a fix the author has already applied reads as the
 * engine not seeing the text. `TruncatedLiteral` said "Feche com ` antes" at a
 * point where the closing backtick was already there, one character further
 * right — so the rule (`]` ends a literal, under either quote, with no escape)
 * was unreadable from the only place it was reported.
 * ------------------------------------------------------------------ */
function runDiagWordingChecks() {
  console.log("\n--- diagnostics name the cause ---");
  const D = [];
  const ok = (id, name, why) => {
    if (why) { console.log("  ✗ " + id + ": " + name); console.log("      " + why); failures.push(id); }
    else { console.log("  ✓ " + id + ": " + name); D.push(id); }
  };
  const bare = s => String(s).replace(/<[^>]+>/g, "");
  const opts = { templates: TPL.templates, rules: RULESTORE,
                 expansions: require("../.guidelines/expansions.json") };

  const g = G.parse("[nt`a ] b`]", opts).gaps.filter(d => d.code === "TruncatedLiteral");
  ok("DG-01", "TruncatedLiteral is raised for a bracket inside a literal",
     g.length ? null : "a literal holding ] no longer reports TruncatedLiteral");
  if (g.length) {
    const msg = bare(g[0].msg);
    ok("DG-02", "its message names the character that ends the literal",
       /\]/.test(msg) ? null : "message does not mention ]: " + JSON.stringify(msg));
    ok("DG-03", "and does not prescribe a fix the author already applied",
       /feche com|close it with/i.test(msg)
         ? "message still says to close the literal, which the author did: " + JSON.stringify(msg)
         : null);
  } else { failures.push("DG-02", "DG-03"); }
  return D.length;
}
const rDG = runDiagWordingChecks();


/* ------------------------------------------------------------------ *
 * spellings — the two directions read the same table
 *
 * The inverse accepted `<note>` and answered NT while the forward parser
 * refused `[NOTE`. Measured before the fix: all 98 element names whose
 * spelling differs from the canonical were refused, so an author who read the
 * emitted document and wrote back what they saw was refused by an asymmetry
 * rather than by a decision. This gate is the whole class, not the two
 * instances that were reported.
 * ------------------------------------------------------------------ */
function runSpellingChecks() {
  console.log("\n--- spellings — forward and inverse read one table ---");
  const D = [];
  const ok = (id, name, why) => {
    if (why) { console.log("  ✗ " + id + ": " + name); console.log("      " + why); failures.push(id); }
    else { console.log("  ✓ " + id + ": " + name); D.push(id); }
  };
  const opts = { templates: TPL.templates, rules: RULESTORE,
                 expansions: require("../.guidelines/expansions.json") };
  const rev = G.elementCanonicalMap || {};

  /* SP-01 — every element the inverse emits is a spelling the parser takes */
  const refused = [];
  for (const el of Object.keys(rev)) {
    const spelled = el.toUpperCase().replace(/[^A-Z0-9]+/g, "");
    if (!spelled) continue;
    const c = G.classify(spelled);
    if (c.tier === "unknown" || c.canonical !== rev[el].canonical) refused.push(el + "->" + rev[el].canonical);
  }
  ok("SP-01", "every emitted element name is accepted as input",
     refused.length ? refused.length + " refused, e.g. " + refused.slice(0, 5).join(", ") : null);

  /* SP-02 — and nothing that already meant something changed meaning */
  const held = [["NT", "NT"], ["IN", "INS"], ["CRIT", "CRIT"], ["SUM", "SUM"], ["EX", "EX"]];
  const moved = held.filter(([input, want]) => G.classify(input).canonical !== want);
  ok("SP-02", "the spellings that already worked still mean the same",
     moved.length ? "moved: " + moved.map(m => m[0]).join(", ") : null);

  /* SP-03 — the hyphen stays the chain operator, and this must not steal it */
  const chained = G.toAST("[instead-of`x`]", opts).segments.flatMap(s => s.body)[0];
  ok("SP-03", "a hyphenated element name does not become one command",
     chained && chained.canonical === "INSTOF"
       ? "[instead-of] now parses as INSTOF; the hyphen is the chain operator and must stay one"
       : null);

  return D.length;
}
const rSP = runSpellingChecks();


/* ------------------------------------------------------------------ *
 * [raw] -- the verbatim fence, so Glyph can quote Glyph
 *
 * Measured: `]` ends a literal from inside, under EITHER quote, and no
 * escape exists -- backslash, doubling and &#93; were each tried and each
 * refused (the entity dies on the `;`, which is a separator). So a document
 * that quotes Glyph could not be written in Glyph. [logic] was the only
 * construct that carried a bracket through, and it then misread the content
 * as an expression and reported the commands inside as undefined variables.
 * ------------------------------------------------------------------ */
function runRawFenceChecks() {
  console.log("\n--- [raw] -- Glyph quoting Glyph ---");
  const D = [];
  const ok = (id, name, why) => {
    if (why) { console.log("  \u2717 " + id + ": " + name); console.log("      " + why); failures.push(id); }
    else { console.log("  \u2713 " + id + ": " + name); D.push(id); }
  };
  const opts = { templates: TPL.templates, rules: RULESTORE,
                 expansions: require("../.guidelines/expansions.json") };

  const quoted = "[sum`organized`[itr-core[ctx]]]";
  const src = "[raw]" + quoted + "[/raw]";
  const xml = G.toXML(src, opts);

  ok("RW-01", "a bracket survives the fence into the document",
     xml.indexOf("<raw>" + quoted.replace(/&/g, "&amp;").replace(/</g, "&lt;")) !== -1 ? null
       : "the quoted source is not carried verbatim: " + JSON.stringify(xml));

  const gaps = G.parse(src, opts).gaps;
  ok("RW-02", "the content is carried, not read",
     gaps.length === 0 && xml.indexOf("<needs") === -1 ? null
       : "diagnostics: " + gaps.map(g => g.sev + "/" + g.code).join(",") + " | " + JSON.stringify(xml));

  ok("RW-03", "it survives the XML round trip byte for byte",
     G.fromXML(xml, opts).src === src ? null
       : "came back as " + JSON.stringify(G.fromXML(xml, opts).src));

  ok("RW-04", "and the AST round trip too",
     G.fromAST(G.toAST(src, opts), opts).src === src ? null
       : "came back as " + JSON.stringify(G.fromAST(G.toAST(src, opts), opts).src));

  /* the refusal half: a fence left open is a fault, not a fence */
  ok("RW-05", "an unclosed fence is refused",
     G.parse("[raw][a]", opts).gaps.some(g => g.code === "UnclosedRaw" && g.sev === "fix") ? null
       : "no UnclosedRaw for a [raw] with no [/raw]");

  return D.length;
}
const rRW = runRawFenceChecks();


/* ------------------------------------------------------------------ *
 * the literal's role -- operand or result, said rather than inferred
 *
 * [alw`X`[get[ctx]]] and [alw[get[ctx]]`X`] emitted the same <user-input>
 * and differed only by sibling order, so a consumer had to INFER "before
 * the nest = operand, after = result" from position. The Regent ruled that
 * out: a value must arrive substituted, not deduced.
 * ------------------------------------------------------------------ */
function runLiteralRoleChecks() {
  console.log("\n--- the literal's role ---");
  const D = [];
  const ok = (id, name, why) => {
    if (why) { console.log("  \u2717 " + id + ": " + name); console.log("      " + why); failures.push(id); }
    else { console.log("  \u2713 " + id + ": " + name); D.push(id); }
  };
  const opts = { templates: TPL.templates, rules: RULESTORE,
                 expansions: require("../.guidelines/expansions.json") };

  const before = G.toXML("[alw`X`[get[ctx]]]", opts);
  const after  = G.toXML("[alw[get[ctx]]`X`]", opts);

  ok("RO-01", "a literal before a bracketed nest is the operand, and says nothing",
     /<user-input>X<\/user-input>/.test(before) ? null
       : "operand is not the unmarked default: " + JSON.stringify(before));

  ok("RO-02", "a literal after a bracketed nest names what came back",
     /<user-input role="result">X<\/user-input>/.test(after) ? null
       : "no role=\"result\": " + JSON.stringify(after));

  ok("RO-03", "the two positions no longer emit the same bytes",
     before !== after ? null
       : "operand and result still produce identical documents");

  /* GLOSSARY 0.1: [A-B] applies BOTH links to the same operand, so a literal
     after a chain link is that operand and not a result. E-01 is the vector
     that caught this -- [rtnl-go`...`] was briefly marked result. */
  ok("RO-04", "a chain link does not make the next literal a result",
     G.toXML("[rtnl-go`texto`]", opts).indexOf('role="result"') === -1 ? null
       : "a chain link is being read as a closed nest");

  /* the envelope is the source of truth: a fact the document carries must not
     be one the AST makes a reader re-derive */
  const lit = G.toAST("[alw[get[ctx]]`X`]", opts)
    .segments[0].body[0].body.filter(n => n.type === "Literal")[0];
  ok("RO-05", "the role travels in the AST envelope too",
     lit && lit.role === "result" ? null
       : "the envelope literal carries role=" + JSON.stringify(lit && lit.role));

  return D.length;
}
const rRO = runLiteralRoleChecks();


/* ------------------------------------------------------------------ *
 * global store registration — the tripwire for splitting the core
 *
 * Every bucket above routes its stores through `opts`, deliberately, so the
 * suite does not depend on module global state or on test order. That is the
 * right call for those buckets and it leaves one path with no coverage at all:
 * `useTemplates` / `useRules` / `useExpansions` register into closure-private
 * state that the emitters read, and nothing here ever exercised it.
 *
 * Which matters because that closure is about to be cut into modules. If the
 * split ever produces two copies of it, a global registration lands in one and
 * the emitter reads the other — silently, because an unregistered store is a
 * valid situation, not an error. The engine would simply stop seeing rules and
 * report nothing. Every bucket above would stay green.
 *
 * So this runs LAST, after every opts-routed bucket, because it is the only
 * thing here that mutates global state on purpose.
 * ------------------------------------------------------------------ */
function runRegistryGuard() {
  console.log("\n--- global store registration — the seam the split must not break ---");
  const D = [];
  const ok = (id, name, why) => {
    if (why) { console.log("  ✗ " + id + ": " + name); console.log("      " + why); failures.push(id); }
    else { console.log("  ✓ " + id + ": " + name); D.push(id); }
  };

  const EXPSTORE = require("../.guidelines/expansions.json");

  /* each probe reads a different store, so a half-registered engine cannot
     pass by accident: species comes from expansions, the diagnostic from
     rules, the expansion from templates */
  const species = o => { const n = G.toAST("[crit]", o).segments[0].body[0];
                         return n.species + "/" + n.compositionDepth; };
  const ruleHit = o => (G.parse("[mand'x'][opt'x']", o).gaps || [])
                         .map(g => g.sev + ":" + g.code).join(",") || "-";
  const expanded = o => /expanded/.test(G.toXML("[--germinate]", o));

  /* the reference reading, taken the way every other bucket takes it */
  const viaOpts = { species: species({ expansions: EXPSTORE }),
                    rule: ruleHit(WITH_RULES),
                    tpl: expanded(WITH_TPL) };

  G.useExpansions(EXPSTORE);
  G.useRules(RULESTORE);
  G.useTemplates(TPL.templates);

  /* …and now with no opts at all: only the global registration can supply it */
  ok("GS-01", "expansions registered globally reach the AST",
     species({}) === viaOpts.species ? null
       : "opts gave " + viaOpts.species + ", global registration gave " + species({}));
  ok("GS-02", "rules registered globally reach the diagnostics",
     ruleHit({}) === viaOpts.rule ? null
       : "opts gave " + viaOpts.rule + ", global registration gave " + ruleHit({}));
  ok("GS-03", "templates registered globally reach the emitter",
     expanded({}) === viaOpts.tpl ? null
       : "opts expanded=" + viaOpts.tpl + ", global registration expanded=" + expanded({}));

  return D.length;
}
const rGS = runRegistryGuard();



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
console.log(" .hgml burn   " + rH + "/14");
console.log(" fromXML      " + rF + "/23");
console.log(" reference    " + rD + "/11");
console.log(" round trip   " + rRT + "/7");
console.log(" ast schema   " + rSC + "/3");
console.log(" glyph-package" + String(rPK).padStart(4) + "/6");
console.log(" examples     " + rE + "/5");
console.log(" snapshot     " + rSN + "/4");
console.log(" app          " + String(rAP).padStart(4) + "/3");
console.log(" cli          " + String(rCL).padStart(4) + "/3");
console.log(" diag wording " + String(rDG).padStart(4) + "/3");
console.log(" spellings    " + String(rSP).padStart(4) + "/3");
console.log(" raw fence    " + String(rRW).padStart(4) + "/5");
console.log(" literal role " + String(rRO).padStart(4) + "/5");
console.log(" global store " + rGS + "/3");
console.log("=================================================");

if (failures.length) {
  console.error("\nFAILED: " + failures.join(", "));
  process.exit(1);
}
console.log("\nAll green.");
