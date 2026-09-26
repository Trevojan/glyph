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
import * as G_ZIP from "./glyph-zip.js";
import * as CHECK_MOD from "./glyph-check.js";
import * as VOCAB from "./core/vocabulary.js";
import * as STORES from "./core/stores.js";
import { ck } from "./core/emit-ast.js";
import { depsOf } from "./read-expansions.js";
import { expandInvocations, checkTemplateConstraints } from "./core/templates.js";
import { checkRules, compileRules } from "./core/rules.js";

/* Stores travel through opts in the cases that need them, so the suite
   doesn't depend on the module's global state or on test order. */
const TPL = require("../.guidelines/templates.json");
const RULESTORE = require("../.guidelines/rules.json");
const WITH_TPL = { templates: TPL.templates };
const WITH_RULES = { rules: RULESTORE };
/* Template constraints naming a class ("@coarsen") resolve it through the
   rules store, so those cases need both loaded. */
const WITH_BOTH = { templates: TPL.templates, rules: RULESTORE };

/* The round trips every bucket runs, recorded when the oracle is written
   (EMS-001 ORD-0009): each fromXML and fromAST call with what it answered,
   the source a toXML or toAST of the suite made its input from, and the JS's
   XML of what came back; each toHGML call with what the burn's re-parse
   raises at `fix`. Written after the last bucket, as `inverse.json`. */
const EXPORT_ORACLE = process.argv.includes("--export-oracle");
const TRIPS = [];
if (EXPORT_ORACLE) {
  const EXP = require("../.guidelines/expansions.json");
  /* the stores the call ran with, as stores.js resolves them — a bucket
     after the registry guard runs on what `useRules` and the rest registered */
  const storeOf = (s, repo) => !s || (typeof s === "object" && !Object.keys(s).length) ? "none" : s === repo ? "repo" : "other";
  const flags = o => ({ templates: storeOf(STORES.templatesOf(o), TPL.templates), rules: storeOf(STORES.rulesOf(o), RULESTORE),
                        expansions: storeOf(STORES.expansionsOf(o), EXP), session: !(o && o.session === false),
                        valency: !(o && o.valency === false), lang: (o && o.lang) || null,
                        projection: (o && o.projection) || null });
  const orig = { toXML: G.toXML, toAST: G.toAST, fromXML: G.fromXML, fromAST: G.fromAST, toHGML: G.toHGML, parse: G.parse };
  const made = new Map();
  const REPO = { templates: TPL.templates, rules: RULESTORE, expansions: EXP };
  const reemit = src => { try { return orig.toXML(src, REPO); } catch (e) { return { thrown: e.message }; } };
  const inverse = (fn, input) => (arg, o) => {
    let r;
    try { r = orig[fn](arg, o); }
    catch (e) { TRIPS.push({ fn: fn, input: input(arg), from: made.get(arg) || null, thrown: e.message }); throw e; }
    TRIPS.push({ fn: fn, input: input(arg), from: made.get(arg) || null, src: r.src, diag: r.diag, reemit: reemit(r.src) });
    return r;
  };
  G.toXML = (src, o) => { const x = orig.toXML(src, o); if (!made.has(x)) made.set(x, { src: src, opts: flags(o) }); return x; };
  G.toAST = (src, o) => { const a = orig.toAST(src, o); made.set(a, { src: src, opts: flags(o) }); return a; };
  G.fromXML = inverse("fromXML", x => x);
  G.fromAST = inverse("fromAST", env => env);
  G.toHGML = (src, o) => {
    const out = orig.toHGML(src, o);
    let fix;
    try { fix = orig.parse(out, o).gaps.filter(g => g.sev === "fix").map(g => g.code); } catch (e) { fix = { thrown: e.message }; }
    TRIPS.push({ fn: "toHGML", src: src, opts: flags(o), out: out, reparseFix: fix });
    return out;
  };
}

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
     act of detailing. .guidelines/.history/GLOSSARY_CLOSED.md §6.5. */
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
     that used to disappear into the other. .guidelines/.history/GLOSSARY_CLOSED.md §6.5. ---- */
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
   These check the SHAPE a template promised, only inside its own expansion —
   the gap that let a loop be handed commands dissolving the loop itself. */
const CONSTRAINTS = [
  { id:"K-01", name:"template intacto não acusa nada",
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
  { id:"K-06", name:"o mesmo comando fora do template não acusa",
    src:"[gen'x']", opts:WITH_BOTH, codeAbsent:"TemplateConstraint:" },
  { id:"K-07", name:"template sem constraints declaradas segue livre",
    src:"[--germinate'a','b'[gen'x']]", opts:WITH_BOTH, codeAbsent:"TemplateConstraint:" },
  { id:"K-08", name:"sem store de regras, a classe não resolve e nada é checado",
    src:"[--loop'x','y','z'[gen'x']]", opts:WITH_TPL, codeAbsent:"TemplateConstraint:" },
  { id:"K-09", name:"a mensagem carrega o reparo, não só a queixa",
    src:"[--loop'x','y','z'[gen'x']]", opts:WITH_BOTH,
    messageHas:"depois que [cond] fechar o laço" }
];

/* Semantic rules: pairs, order and precondition. The criterion that was
   missing for "commands don't contradict each other". */
/* ------------------------------------------------------------------ *
 * Oracle coverage (M01, INTAKE-RUST-LADDER.md)
 *
 * One declared source per diagnostic code the arrays above never reached.
 * Eight of these had no test anywhere in this file; the others were tested
 * with inline sources, which have no id and so never reached the snapshot or
 * the oracle a port is held to. Declared, they travel in both. Projected with
 * the repository's stores, like every snapshot source — TemplateCycle needs a
 * cyclic store and stays in T-06/T-07 until the snapshot honours a case's own
 * opts.
 * ------------------------------------------------------------------ */
const ORACLE_COVERAGE = [
  { id:"OC-01", src:"[crit: a,b,c]", code:"AmbiguousSlotOrder" },
  { id:"OC-02", src:"[logic]\nx = 1\ny = x < 5\n[/logic]", code:"CapFloorNotice" },
  { id:"OC-03", src:"[logic]\na = 1\na = 2\n[/logic]", code:"DuplicateBinding" },
  { id:"OC-04", src:"[logic]\na = 1\n!\n[/logic]", code:"EmptyLogicLine" },
  { id:"OC-05", src:"[crit'x'] . [ask'y']", code:"LooseDots" },
  { id:"OC-06", src:"[crit'x'] if [ask'y']", code:"LooseKeyword" },
  { id:"OC-07", src:"[logic]\na = 1\n? a\n[/logic]", code:"MissingConsequent" },
  { id:"OC-08", src:"[crit'x'][off] the rest is prose", code:"UnclosedOffMode" },
  { id:"OC-09", src:"[logic]\ny = z + 1\n[/logic]", code:"UndefinedVariable" },
  { id:"OC-10", src:"[--reinforce[ctx],`interprete`]", code:"TemplateParamNotLiteral" },
  { id:"OC-11", src:"[nt`a ] b`]", code:"TruncatedLiteral" },
  { id:"OC-12", src:"[raw] never closed", code:"UnclosedRaw" }
];

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
const rK = runGroup("Template constraints — the shape a template promises", CONSTRAINTS, { noFix:false });
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

  /* Two spellings the grammar cannot read inside brackets, kept OUT of the
     table by this case: `R:` (segment-level punctuation — `[R:` parses as a
     command named R) and `[LOGIC…]` (the lexer claims it as a calculation
     block and wants `[/logic]`). SCRU carried the first and QST the second
     until 2026-09, when a client kit re-read its own burns and six of
     fifty-one Orders failed on exactly those two. Both were data. Pinned at
     zero: a formula that brings either back moves the count, and this fails. */
  const KNOWN = [];
  const failing = Object.keys(store.commands).filter(c => {
    if (store.commands[c].species !== "composite") return false;
    const r = reburn("[" + c.toLowerCase() + "'x']");
    return r.fix.length || r.nonAtom.length;
  }).sort();
  ok("H-09", "every composite burns and re-reads clean — 32 of 32",
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
     /\[heavyreview/.test(blended) && /'o fluxo'/.test(blended) && /'a logica'/.test(blended)
       ? null : "did not fire, or lost a literal: " + blended.slice(0, 120));

  /* the trap HGML_PLAN names: an invented element that cannot say what it means
     has moved the interpretation problem, not solved it */
  ok("H-11", "the burn declares every pattern it applied, with its meaning",
     /^# patterns applied to this burn:/m.test(blended) &&
     /heavyreview  <- REV \+ DIST  one deep review/.test(blended)
       ? null : "the invented element does not explain itself");

  /* found in the field, 2026-09: nine Orders in a client template re-read their
     own burn as `[heavy` — the emit carried a hyphen, and `-` is the chain
     operator. A burn that names an element the lexer cannot read back, or that
     the vocabulary cannot place, is not a burn the engine can consume. */
  ok("H-10b", "a fired blend re-parses clean, as a known name",
     (function () {
       const h = G.toHGML("[rev'x'],[dist'y']", BLEND_OPTS);
       const g = (G.parse(h, { rules: RULESTORE }).gaps || []).filter(x => x.sev === "fix");
       const cl = G.classify("heavyreview", { rules: RULESTORE });
       return !g.length && cl.tier === "blend" ? null
            : "fix-level on re-parse: " + g.map(x => x.code).join(",") + " | tier " + cl.tier;
     })());

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
  const SKILL = path.resolve(__dirname, "../.claude/skills/glyph-markup/SKILL.md");
  let skillText = null;
  try { skillText = fs.readFileSync(SKILL, "utf8"); } catch (e) {}
  if (skillText === null) ok("D-11", "the published skill exists", ".claude/skills/glyph-markup/SKILL.md not found");
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
                           TEMPLATES, CONSTRAINTS, RULE_CASES, ORACLE_COVERAGE);

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
                           TEMPLATES, CONSTRAINTS, RULE_CASES, ORACLE_COVERAGE);

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

  /* The oracle a port is held to (M01, INTAKE-RUST-LADDER.md §4 R3): the same
     sources the snapshot hashes, written out whole and language-neutral, one
     file per case. Implementation-derived, so NOT conformance — conformance/
     derives from the specification (lock T5); this is only what the JS engine
     answers at this commit, and the port must answer the same bytes. Written
     on demand and never committed: any commit regenerates its own. */
  const exAt = process.argv.indexOf("--export-oracle");
  if (exAt !== -1) {
    const arg = process.argv[exAt + 1];
    const dir = arg && arg.slice(0, 2) !== "--" ? path.resolve(arg)
      : path.resolve(__dirname, "../rust/target/oracle");
    fs.mkdirSync(dir, { recursive: true });
    const guard = f => { try { return f(); } catch (e) { return { threw: e.message }; } };
    const texts = [];
    CORPUS.forEach(c => {
      if (!c || !c.id || typeof c.src !== "string") return;
      const ast = guard(() => { const a = G.toAST(c.src, SNAP_OPTS); delete a.version; return a; });
      const text = JSON.stringify({
        id: c.id, engine: G.VERSION, src: c.src, digest: now[c.id],
        tokens: guard(() => G.tokenize(c.src, SNAP_OPTS)),
        diagnostics: guard(() => (G.parse(c.src, SNAP_OPTS).gaps || [])
          .map(g => ({ sev: g.sev, code: g.code, plain: g.plain }))),
        xml: guard(() => G.toXML(c.src, SNAP_OPTS)),
        ast: ast,
        hgml: guard(() => G.toHGML(c.src, SNAP_OPTS))
      }, null, 1) + "\n";
      fs.writeFileSync(path.join(dir, c.id + ".json"), text);
      texts.push(text);
    });
    console.log("  ! oracle written: " + texts.length + " cases to " + dir);

    /* What a port compares outside the case files (EMS-001, from ORD-0002):
       the answers of one JS module over what the case files hold, read back
       from their text. Beside them and never inside, so the case files stay
       the bytes ORD-0001 froze at conformance-v0. */
    const mods = dir + "-modules";
    fs.mkdirSync(mods, { recursive: true });
    const held = texts.map(t => JSON.parse(t));
    const strings = new Set();
    const gather = v => {
      if (typeof v === "string") strings.add(v);
      else if (Array.isArray(v)) v.forEach(gather);
      else if (v && typeof v === "object") Object.keys(v).forEach(k => { strings.add(k); gather(v[k]); });
    };
    held.forEach(gather);
    const S = [...strings].sort();
    /* `lev` is quadratic: each string whole against the first 16 units of the
       next one in sorted order, both ways, so every string is measured and the
       longest costs millions of steps rather than hundreds of billions */
    const lev = S.map((s, i) => {
      const t = S[(i + 1) % S.length].slice(0, 16);
      return [i, t, G.lev(s, t), G.lev(t, s)];
    });
    /* `walk` follows `children`, and the envelope names them `body`: each
       segment's tree is walked as the shape it has, and answers the paths */
    const walks = [];
    held.forEach(h => ((h.ast && h.ast.segments) || []).forEach((sg, k) => {
      const shape = (nd, at) => ({ at: at,
        children: ((nd && nd.body) || []).map((ch, i) => shape(ch, at + "/" + i)) });
      const seen = [];
      G.walk((sg.body || []).map((nd, i) => shape(nd, String(i))), nd => seen.push(nd.at));
      walks.push([h.id + "#" + k, seen]);
    }));
    fs.writeFileSync(path.join(mods, "util.json"), JSON.stringify({
      engine: G.VERSION, strings: S, esc: S.map(G.esc), lev: lev, walk: walks
    }, null, 1) + "\n");

    /* vocabulary.js (from ORD-0003): every table it exports, as the text
       JSON.stringify gives and the digest the envelope's `ck` gives, so a
       table added to the JS reaches the oracle, and the port, on its own;
       and elName over every name of the tables it is read through, then over
       every string of up to 64 units the case files hold, as a gloss and as
       a blend, since no gloss of the tables ends in punctuation */
    const tables = {};
    Object.keys(VOCAB).sort().forEach(k => {
      if (typeof VOCAB[k] === "function") return;
      const text = JSON.stringify(VOCAB[k]);
      tables[k] = { json: text, digest: ck(text) };
    });
    const named = [];
    [["mode", VOCAB.MODE], ["struct", VOCAB.STRUCT], ["meta", VOCAB.META],
     ["instr", VOCAB.INSTR], ["session", VOCAB.SESSION]].forEach(([tier, table]) =>
      Object.keys(table).forEach(k => {
        named.push([k, tier, table[k], VOCAB.elName(k, tier, table[k])]);
        named.push([k, tier, null, VOCAB.elName(k, tier)]);
      }));
    S.filter(x => x.length <= 64).forEach(x => {
      named.push([x, "instr", x, VOCAB.elName(x, "instr", x)]);
      named.push([x, "blend", null, VOCAB.elName(x, "blend")]);
    });
    fs.writeFileSync(path.join(mods, "vocabulary.json"), JSON.stringify({
      engine: G.VERSION, tables: tables, elName: named
    }, null, 1) + "\n");

    /* stores.js (from ORD-0003): the three stores as the repository loads
       them, their digests, and what is read off them — for every name the
       composition table and the vocabulary know, and three it does not —
       with the stores loaded and with none. The digests are of the stores as
       read from disk: by now the suite's parses have hung `__compiled` on the
       rules object (rules.js), and the envelope's `stores.rules` hashes it */
    const EXP = SNAP_OPTS.expansions;
    const fresh = f => JSON.parse(fs.readFileSync(path.resolve(__dirname, "../.guidelines/" + f), "utf8"));
    const names = [...new Set([...Object.keys(EXP.commands),
      ...["MODE", "STRUCT", "META", "INSTR", "ALIAS", "SESSION"].flatMap(t => Object.keys(VOCAB[t])),
      "crit", "", "XYZ"])];
    const readOff = opts => names.map(n => [n, G.speciesOf(n, opts), G.depthOf(n, opts),
      G.formulaOf(n, opts), G.defOf(n, opts), G.atomsOf(n, opts), G.standsAlone(n, opts)]);
    const digestOf = v => ck(JSON.stringify(v));
    fs.writeFileSync(path.join(mods, "stores.json"), JSON.stringify({
      engine: G.VERSION,
      digests: { templates: digestOf(fresh("templates.json").templates), rules: digestOf(fresh("rules.json")),
                 expansions: digestOf(fresh("expansions.json")), commands: digestOf(fresh("expansions.json").commands) },
      context: {
        templatesFromWhole: digestOf(STORES.createContext({ templates: TPL }).templates),
        templatesFromMap: digestOf(STORES.createContext({ templates: TPL.templates }).templates),
        expansionsFromCommands: digestOf(STORES.createContext({ expansions: EXP.commands }).expansions),
        empty: [STORES.createContext({}).templates, STORES.createContext({}).rules,
                STORES.createContext({}).expansions]
      },
      loaded: readOff(G.createContext(SNAP_OPTS)),
      bare: readOff(G.createContext({})),
      /* read-expansions.js' depsOf, the compiler's reading of a formula, over
         every string of up to 256 units the case files hold: no formula of the
         table carries a return token since H-09 closed, and these do */
      depsOf: S.filter(x => x.length <= 256).map(x => [x, depsOf(x)])
    }, null, 1) + "\n");

    /* lexer.js (from ORD-0004): the 114 sources exercise less than the lexer
       reads — no text span past ASCII, no `[--name =`, no `[logic name]`, no
       mood run, no character outside the BMP — so `tokenize` answers here
       over every string of up to 4096 units the case files hold, and over
       probes written one per branch of lexer.js; `classify` (with the stores,
       with and without session words) and `suggest` over every name those
       tokens carry, the vocabulary's, and a few strangers */
    const PROBES = [
      "ß[off]x[on]y", "[off]ßx[on]y", "[off] never closed", "[OFF]x[ On ]y", "😀[off]x[on]z",
      "[nt/constructor/ x]", "[nt/eth/cnf/clm/ x]", "/eth/cur/ser/joy/awe/hop/lov/ x", "/" + "eth/".repeat(70) + " x",
      "[nt/eth x]", "[nt /xyz/ x]", "/eth", "a/b", "[in-rwk/ctx]", "[in-rwk/ins/fmt]", "[a,/eth/ x]",
      "[--name = x]", "[-- name=]", "[--a.b-c x]", "[--]", "[-- ]", "[--x", "[=", "[= x]",
      "[logic name]x[/logic]", "[logic: a b ]x[ / LOGIC ]", "[logic-n]1+1", "[logicx]", "[LOGIC]",
      "[logic\n name\n]x[/logic]", "[logic", "[logic ]", "[logic:]", "[logic x: y]", "[logic\t-\tz ]q",
      "[raw]a[b]c[/raw]", "[ RAW ]x", "[raw]unclosed", "[raw][/ raw ]", "[on]", "[ on ]x", "[offx]",
      "[/nt]", "[/", "[/nt", "[", "]", "[]", "[ctx", "[a.b_c9]",
      "`a'b`", "`a]b", "`unclosed", "`a;b`", "'a`b'", "'a]b", "'a\nb'", "'unclosed", "'a;b'",
      "\\eth\\ x", "a \\ b", "\\", "x\\y", "[nt\\cnf\\ x]",
      "a;b;;c", ";;;", "[in-rwk,fmt ,  sum]", "[a, b]", "[a,b-c, d]", "[in- rwk]", "[a -b]", "[a-b-c]",
      "r- x", " R: x", "r: x", "r-x", "R-", "[in r- ]", "  r  - x", "R :x", "a:b=c",
      " [nt x]　", "\t[ctx]\r\n", "﻿[ctx]", "[nt'😀']x😀", "[nt`😀`] 😀;",
      "ação [ctx'fichação'] ç", "[nt'a b'] x y"
    ];
    const lexSources = [...new Set([...PROBES, ...S.filter(x => x.length <= 4096)])];
    const lexed = lexSources.map(x => [x, G.tokenize(x)]);
    const lexNames = [...new Set([
      ...lexed.flatMap(([, ts]) => ts.filter(t => /^(open|closeTag|bareTag|tpl)$/.test(t.k)).map(t => t.v)),
      ...["MODE", "STRUCT", "META", "ALIAS", "INSTR", "SESSION", "EMO", "GLOSS_REVERSE", "ELEMENT_INPUT"]
        .flatMap(t => Object.keys(VOCAB[t])),
      ...(SNAP_OPTS.rules.rules || []).filter(r => r.kind === "blend").map(r => r.emit),
      "", "constructor", "__proto__", "Constructor", "rule", "sec", "iter", "itr", "xyz", "notes", "insteadof"])];
    fs.writeFileSync(path.join(mods, "lexer.json"), JSON.stringify({
      engine: G.VERSION, tokenize: lexed,
      classify: lexNames.map(x => [x, G.classify(x, SNAP_OPTS), G.classify(x, { ...SNAP_OPTS, session: false })]),
      suggest: lexNames.map(x => [x, G.suggest(x)])
    }, null, 1) + "\n");

    /* logic.js (from ORD-0005): the oracle holds 8 Logic nodes, so parseLogic
       answers over every [logic] block the lexer finds in the sources above,
       over every string of up to 256 units the case files hold, and over
       probes written one per rule of expandExpr, freeVars and parseLogic;
       expandExpr and freeVars over the same strings and probes */
    const LOGIC_PROBES = [
      "hp = 3d6kh2", "x = 4d6", "2d8kl", "3 D 6 KH 1", "d6", "10d10kh", "x = pb[y/2]", "pc z", "ar [q]",
      "PB  w.v", "Pc[n]", "^[a+b]", "_ q", "~[r]", "^x", "_x", "~ y.z", "a_b", "__x", "a < 5", "b > 3",
      "c <= 4", "roll.dbl", "roll.dblx", "!x -> y", "? a -> b = 2", "? -> b", "!-> b", "a -> b -> c",
      "# comment", "// c", "a = 1\na = 2", "!", "?", "! x", "? y", "1.5 + y_z", "`quoted` 'q' _",
      "not a and b or c", "x = y if z else w", "min(a, max(b, 3))", "1.5x", "x1 2x",
      "constructor = 1\n__proto__ = 2\ny = constructor + __proto__ + z", "Constructor = 1\nq = CONSTRUCTOR",
      "a != b", "!!x", "a !b", "a=b", "a == b", "a =", "=b", "a\r\nb = c", "  \n\t\n", "x = 'a' + `b`",
      "x = a.b.c", "é = 1", "ação = x", "n = 10 < 3", "k = rolls > 2 < 5", "x -> y = 1", "a b = 1",
      "z = 😀 + w", "t = 2d6 + 1d4kl1 + 3d", "a =!b", "x<!y", "!!!", "p>!q -> r"
    ];
    const logicBlocks = lexed.flatMap(([, ts]) => ts.filter(t => t.k === "logic").map(t => [t.v, t.body]));
    const logicStrings = [...new Set([...LOGIC_PROBES, ...S.filter(x => x.length <= 256)])];
    fs.writeFileSync(path.join(mods, "logic.json"), JSON.stringify({
      engine: G.VERSION,
      parseLogic: [...logicBlocks, ...logicStrings.map(x => ["", x])].map(([n, b]) => [n, b, G.parseLogic(n, b)]),
      expandExpr: logicStrings.map(x => [x, G.expandExpr(x)]),
      freeVars: logicStrings.map(x => [x, G.freeVars(x)])
    }, null, 1) + "\n");

    /* templates.js and rules.js (from ORD-0006): they work on the parser's
       tree, and the parser is ORD-0007. So the JS describes the tree: each
       source parsed with no templates and no rules — the tree the parser has
       built when expansion starts — then expandInvocations, checkRules and
       checkTemplateConstraints run on it here, the body parses the expander
       asks for recorded (parse is handed in, as parse.js hands itself in),
       with the tree after expansion and every diagnostic the three raise.
       Over the 114 sources with the repository's stores, and over probes with
       a store of probe templates: a cycle, a mutual cycle, a broken body,
       named, positional and non-literal arguments, a repeat, constraints, and
       the JS defects the port reproduces (params written as strings, the
       names Object.prototype answers for). What throws is recorded where it
       throws, and nothing after it runs: parse would stop there. Each run is
       then held to parse itself — the tree after, and the diagnostics the
       three raise, equal what a whole parse gives — so the reading of the
       parser's pipeline here is checked, not assumed */
    /* flat, as an arena: a tree 8000 levels deep overflows a recursive dump
       and JSON.stringify alike, and a list of nodes with child indices does not */
    /* a function the JS holds where a value should be — `Object`, which the
       prototype answers for `constructor` — is written as what it is, since
       JSON would drop it */
    const valueOf = v => typeof v === "function" ? { function: v.name } : v;
    const FIELDS = ["id", "raw", "tier", "canonical", "gloss", "alias", "colon", "autoClosed", "editorial", "origin",
       "chainElement", "slotName", "depth", "literal", "v", "form", "role", "text", "rawFence", "template",
       "isDef", "mode", "isDefinition", "expanded", "boundSlot"];
    /* `full` adds what only the whole parse sets — the species pass, the
       bindings, the suggestion — and the segments' own fields; every key a
       node or a segment holds must be one the dump knows */
    const FULL = ["species", "compositionDepth", "isBinder", "suggestion"];
    const KNOWN = new Set([...FIELDS, ...FULL, "logic", "emotions", "tok", "children", "parent"]);
    const KNOWN_SEG = new Set(["children", "mood", "autoClosed", "breaks", "cause", "continues", "isReturn", "pendingMode"]);
    const moodOf = e => { const o = { name: e.name, gloss: valueOf(e.gloss) }; if (e.order !== undefined) o.order = e.order; return o; };
    const fieldsOf = (nd, full) => {
      const o = {};
      (full ? [...FIELDS, ...FULL] : FIELDS).forEach(k => {
        if (nd[k] === undefined) return;
        if (k === "suggestion") o[k] = nd[k] && { name: nd[k].name, how: nd[k].how };
        else o[k] = valueOf(nd[k]);
      });
      if (nd.logic) o.logic = nd.logic.name || "";
      if (nd.emotions && nd.emotions.length) o.emotions = nd.emotions.map(moodOf);
      if (nd.tok) o.tok = { k: nd.tok.k, s: nd.tok.s, e: nd.tok.e };
      if (full) Object.keys(nd).forEach(k => { if (!KNOWN.has(k)) throw new Error("parse.json: a node holds " + k); });
      return o;
    };
    const dumpSegs = (segs, full) => {
      const order = [], at = new Map();
      segs.forEach(sg => {
        const stack = sg.children.slice().reverse();
        while (stack.length) {
          const nd = stack.pop();
          if (at.has(nd)) continue;
          at.set(nd, order.length);
          order.push(nd);
          const kids = nd.children || [];
          for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i]);
        }
      });
      return {
        nodes: order.map(nd => Object.assign(fieldsOf(nd, full), { children: (nd.children || []).map(c => at.get(c)),
          parent: nd.parent == null ? null : at.has(nd.parent) ? at.get(nd.parent) : -1 })),
        segments: segs.map(sg => {
          const kids = sg.children.map(c => at.get(c));
          if (!full) return kids;
          Object.keys(sg).forEach(k => { if (!KNOWN_SEG.has(k)) throw new Error("parse.json: a segment holds " + k); });
          const o = { children: kids, mood: sg.mood.map(moodOf), autoClosed: sg.autoClosed, breaks: sg.breaks, cause: sg.cause };
          if (sg.continues !== undefined) o.continues = sg.continues;
          if (sg.isReturn !== undefined) o.isReturn = sg.isReturn;
          if (sg.pendingMode !== undefined) o.pendingMode = sg.pendingMode === null ? null : at.get(sg.pendingMode);
          return o;
        })
      };
    };
    const PROBE_TEMPLATES = {
      selfref: { gloss: "Calls itself.", params: [], body: "[nt'before'][--selfref][nt'after']" },
      ping: { gloss: "Calls pong.", params: [], body: "[--pong]" },
      pong: { gloss: "Calls ping.", params: [], body: "[ctx[--ping]]" },
      broken: { gloss: "A body that does not parse clean.", params: [], body: "[xyz'a'][nt'b']]" },
      pair: { gloss: "Two holes.", params: [{ name: "first", ask: "the first" }, { name: "second", ask: "the second" }],
              body: "[crit[ph-first`the first`]][rev[ph-second`the second`]]" },
      many: { gloss: "A repeat.", params: [{ name: "item", ask: "an item", repeat: true }, { name: "why", ask: "the reason" }],
              body: "[cat[ph-item`an item`]][rtnl[ph-why`the reason`]]" },
      fenced: { gloss: "Constrained.", params: [{ name: "x", ask: "x" }],
                body: "[itr[ph-x`x`][elab]]", constraints: [{ id: "no-sum", forbid: ["SUM", "@thinking"], why: "stays open", suggest: "keep going" }] },
      Upper: { gloss: "Mixed case name.", params: [], body: "[nt'upper']" },
      strs: { gloss: "Params as strings.", params: ["alpha", "beta"], body: "[crit[ph-alpha`a`]][rev[ph-beta`b`]]" },
      ctor: { gloss: "A hole named constructor.", params: [{ name: "constructor" }, { name: "b" }],
              body: "[crit[ph-constructor`q`]][rev[ph-b`r`]]" },
      rep: { gloss: "A repeat named constructor.", params: [{ name: "constructor", repeat: true }], body: "[cat[ph-constructor`q`]]" },
      Constructor: { gloss: "Found by its own name only.", params: [], body: "[nt'ctor']" },
      bare: { gloss: "Constrained with no rules store.", params: [], body: "[itr[elab]]", constraints: [{ id: "no-sum", forbid: "sum" }] },
      wraprep: { gloss: "A body whose own expansion throws.", params: [], body: "[ctx'w'][--rep]" },
      clash: { gloss: "A body that breaks a rule.", params: [], body: "[mand'x'][opt'x']" }
    };
    const probeTemplates = { ...TPL.templates, ...PROBE_TEMPLATES };
    const TEMPLATE_PROBES = [
      "[--selfref]", "[--ping]", "[--broken]", "[--pair'a''b']", "[--pair[ph-second'b']'a']",
      "[--pair[ctx]'b']", "[--pair'a'[ctx]]", "[--pair'a'[ctx]'b']", "[--pair]", "[--pair'a''b''c']",
      "[--many[ph-item'x'][ph-item'y']'because']", "[--many'because']", "[--many[ph-item''][ph-item'z']]",
      "[--fenced'q'[sum'x']]", "[--fenced'q'[ovr[sum'x']]]", "[ovr[--fenced'q'[sum'x']]]", "[--fenced'q'[hyp'h']]",
      "[--upper]", "[--UPPER]", "[--Upper]", "[--nosuch'x']", "[--pair='x']", "[--pair'a''b'][--pair'c''d']",
      "[mand[opt'x']][mand[opt'y']]", "[alw[nev'x']]", "[ovr[alw[nev'x']]]", "[elab'a'][hyp'b']", "[brst'x']",
      "[ctx'c'][brst'x']", "[pos[ngt]]", "[pos'a'][ngt'b']", "[--pair[ph-first[ctx]]'b']",
      "[--strs'a''b']", "[--strs[ph-beta'B']'a']", "[--ctor'a''b']", "[--ctor[ph-constructor'C']'a']", "[--rep]",
      "[--rep[ph-constructor'x']]", "[--Constructor]", "[--constructor]", "[constructor]", "[mand'x'][opt'x'];[ctx[__proto__]]",
      "[pos[constructor]]", "[opt[opt[mand'x']]]", "[--wraprep]", "[--clash]"
    ];
    /* without a rules store: checkRules stays out, and the constraints read their
       own names — `[constructor` is one of them, through Object.prototype */
    const BARE_PROBES = ["[--bare[constructor]]", "[--bare[sum'x']]", "[--bare[constructor[sum'x']]]", "[--fenced'q'[constructor]]"];
    const treeRuns = [];
    const MODULE_CODE = /^(TemplateCycle|TemplateParamNotLiteral|TemplateConstraint:|Rule:)/;
    const RANK = { fix: 0, ask: 1, note: 2 };
    const catcher = caught => (sev, lab, msg, code, enLab, enMsg) => caught.push({ sev: sev, lab: lab, msg: msg,
      code: code || "Note", enLab: enLab || null, enMsg: enMsg || null });
    /* one level of expansion into `out`: the tree before, each body parse the
       expander asks for — a level of its own, down to where the chain stops —
       what it raises, what it throws, and the tree after. `opts` is what the
       expander reads its registry and `_expanding` from: the context at the
       top, what the expander hands parse below it */
    const expandLevel = (base, opts, out) => {
      out.before = dumpSegs(base.segments);
      out.parses = [];
      const caught = [];
      const rec = (body, o) => {
        const sub = { body: body, expanding: o._expanding };
        out.parses.push(sub);
        expandLevel(G.parse(body, { ...o, templates: {} }), o, sub);
        let whole;
        try { whole = G.parse(body, o); } catch (e) {
          if (!sub.thrown || sub.thrown.message !== e.message) throw new Error("trees.json: the parse of " + body + " is not what parse does");
          throw e;
        }
        if (sub.thrown || JSON.stringify(dumpSegs(whole.segments)) !== JSON.stringify(sub.after))
          throw new Error("trees.json: the parse of " + body + " is not what parse does");
        sub.gaps = whole.gaps.map(g => ({ sev: g.sev, lab: g.lab, msg: g.msg, code: g.code }));
        return whole;
      };
      try { expandInvocations(base.segments, opts, catcher(caught), rec); }
      catch (e) { out.thrown = { stage: "expand", message: e.message }; }
      out.expand = caught;
      out.after = dumpSegs(base.segments);
    };
    const runTrees = (id, src, templates, rules) => {
      const ctx = G.createContext({ templates: templates, rules: rules, expansions: SNAP_OPTS.expansions });
      const run = { id: id, src: src, probe: templates !== TPL.templates, withRules: !!rules };
      const base = G.parse(src, { ...SNAP_OPTS, templates: {}, rules: null });
      expandLevel(base, ctx, run);
      const caught = [], Gc = catcher(caught);
      if (!run.thrown) for (const [stage, fn] of [["rules", () => checkRules(base.segments, ctx, Gc)],
                                                  ["constraints", () => checkTemplateConstraints(base.segments, ctx, Gc)]]) {
        try { fn(); } catch (e) { run.thrown = { stage: stage, message: e.message }; }
        run[stage] = caught.splice(0);
        if (run.thrown) break;
      }
      /* held to parse itself */
      let whole, threw = null;
      try { whole = G.parse(src, { ...SNAP_OPTS, templates: templates, rules: rules }); } catch (e) { threw = e.message; }
      const mine = [].concat(run.expand || [], run.rules || [], run.constraints || [])
        .map((g, k) => [g, k]).sort((a, b) => RANK[a[0].sev] - RANK[b[0].sev] || a[1] - b[1])
        .map(([g]) => JSON.stringify([g.sev, g.lab, g.msg, g.code]));
      const theirs = whole ? whole.gaps.filter(g => MODULE_CODE.test(g.code) || g.msg.indexOf("no corpo de <code>[--") === 0)
        .map(g => JSON.stringify([g.sev, g.lab, g.msg, g.code])) : null;
      if (threw !== (run.thrown ? run.thrown.message : null) ||
          (whole && (JSON.stringify(dumpSegs(whole.segments)) !== JSON.stringify(run.after) ||
                     JSON.stringify(theirs) !== JSON.stringify(mine))))
        throw new Error("trees.json: the run of " + id + " is not what parse does");
      treeRuns.push(run);
    };
    CORPUS.forEach(c => { if (c && c.id && typeof c.src === "string") runTrees(c.id, c.src, TPL.templates, RULESTORE); });
    TEMPLATE_PROBES.forEach((src, k) => runTrees("probe-" + (k + 1), src, probeTemplates, RULESTORE));
    BARE_PROBES.forEach((src, k) => runTrees("bare-" + (k + 1), src, probeTemplates, null));
    /* compileRules, over the repository's store and a probe store: a key met
       twice, a class in `then` holding `first`, overlapping classes, a class
       the store lacks, and the three ways a blend is refused */
    const PROBE_RULES = {
      classes: { k: ["A", "B", "A"], j: ["B", "C"] },
      rules: [
        { id: "p1", kind: "pair", a: "B", b: "A" }, { id: "p2", kind: "pair", a: "A", b: "B" },
        { id: "p3", kind: "pair", a: "C", b: "C" }, { id: "o1", kind: "order", first: "A", then: "@k" },
        { id: "o2", kind: "order", first: "Q", then: "@missing" }, { id: "o3", kind: "order", first: "Q", then: "R" },
        { id: "c1", kind: "precondition", target: "C", requiresBefore: ["@k", "@j", "Z"] },
        { id: "c2", kind: "precondition", target: "D" },
        { id: "b1", kind: "blend", when: ["@k", "C"], emit: "e", means: "m" },
        { id: "b2", kind: "blend", when: ["A", "B"], emit: "e" }, { id: "b3", kind: "blend", when: ["A"], emit: "e", means: "m" },
        { id: "b4", kind: "blend", when: ["A", "B"], means: "m" }, { id: "x1", kind: "other" }
      ]
    };
    const compiled = store => {
      const c = compileRules(store);
      return { pairs: Object.keys(c.pairs).map(k => [k, c.pairs[k].id]),
               order: c.order.map(o => [o.rule.id, o.first, o.then]),
               pre: c.pre.map(q => [q.rule.id, q.target, Object.keys(q.accept)]),
               blends: c.blends.map(b => [b.rule.id, b.when, b.emit, b.means]) };
    };
    fs.writeFileSync(path.join(mods, "trees.json"), JSON.stringify({
      engine: G.VERSION, probeTemplates: PROBE_TEMPLATES, probeRules: PROBE_RULES,
      compileRules: { repository: compiled(RULESTORE), probe: compiled(PROBE_RULES) }, runs: treeRuns
    }, null, 1) + "\n");

    /* parser.js (from ORD-0007): every source parsed as the snapshot parses it,
       once in pt-BR and once in en-EU — the tree with every field a
       projection reads, the segments, and the diagnostics as parse returns
       them — and probes, one or more per branch of parse(), some of them
       without the session words or without valency */
    const PARSE_PROBES = [
      "", "[", "[ ]", "[ctx", "]", "[/ctx]", "[ctx[sum'x'][/ctx]'y'", "[--t[/undefined]x", "[--t: a]", "[ctx: a, b]",
      "[block: a, b]", "[ctx: a = b - c]", "[ctx: 'q' `r`]", "[ctx:]", "[ctx`x]", "[ctx`x;", "[ctx`x", "[ctx'x",
      "[ctx/eth/'x']", "/eth/xyz/", "[ctx/constructor/]", "/cnf/[sum/eth/]", "[rw-", "[rw-]", "[rw-cr'x']",
      "[in-rwk/ctx]", "\\eth\\", "[ctx'a','b']", "[dfn'a'='b']", "a;b;;c", ";;", "[ctx;;", "[off]x[on]y", "[off]x",
      "[ctx[off]raw text", "[off]a[on][off]b", "[raw]x[/raw]", "[raw]x", "[ctx[raw]y[/raw]", "[logic]a = b[/logic]",
      "[logic q]a -> b[/logic]", "[logic]a", "[ctx[logic]x = 1[/logic]]", "r- x", "R: y", "if x", "rd", "...", "constructor",
      "Constructor", "[ctx] prose ist", "[ph-x`q`]", "[ph-x]", "[ph[ctx]]", "[block]", "[block'n']", "[block[ctx]'n']",
      "[section[logic]x[/logic]]", "[ctx[sum[ctx[sum[ctx[sum[ctx[sum[ctx[sum[ctx",
      "[ctx[sum[ctx[sum[ctx[sum[ctx[sum[ctx[sum;", "[ctx[sum[ctx[sum[ctx;", "[ctx[sum[ctx[sum[ctx[sum[ctx[sum;",
      "[ctx[sum[ctx[sum[ctx[sum[ctx[sum[ctx;", "[gt'a']", "[gt: a]", "[gt'a''b'''c']",
      "[cat'a']", "[cat'a','b']", "[ctx]", "[ctx'x']", "[--x=]", "[--x=[ctx]]", "[--nosuch]", "[--constructor]",
      "[--toString]", "[--Germinate]", "[sum`organized`[ctx]][ref'organized']", "[sum'a'[ctx]][sum'a'[ctx]]",
      "[sum'toString'[ctx]]", "[sum'__proto__'[ctx]]", "[sum'two words'[ctx]]", "[sum[ctx]'late']", "[sum'x'-ctx]",
      "[xyzzy]", "[summ]", "[constructor]", "[__proto__'x']", "[pos[constructor]]", "[rw-cr-ctx]", "[a-b,c]",
      "[ctx[--germinate'x']]", "[mand'x'][opt'x']", "[ctx'x'][ctx'y'];[ctx]", "[CTX'Upper']", "[cx'alias']",
      "[heavyreview]", "[ctx`x`'y'[sum]'z']", "[ctx]]", "[--t'a'", "[ctx[--t]]]"
    ];
    const NO_SESSION = ["constructor", "[constructor]", "rd", "[ctx] prose ist"];
    const NO_VALENCY = ["[gt'a']", "[ctx]", "[cat'a']"];
    const parseRuns = [], xmlRuns = [];
    /* emit-xml.js (from ORD-0008): toXML over the same sources and options,
       plain and with `describe` */
    const runXml = (id, src, opts) => {
      const run = { id: id, src: src };
      if (opts.templates !== SNAP_OPTS.templates) run.probeTemplates = true;
      if (opts.rules !== SNAP_OPTS.rules) run.withRules = false;
      if (opts.expansions !== SNAP_OPTS.expansions) run.expansions = opts.expansions;
      if (opts.session === false) run.session = false;
      if (opts.valency === false) run.valency = false;
      for (const [k, o] of [["xml", opts], ["describe", { ...opts, describe: true }]]) {
        try { run[k] = G.toXML(src, o); } catch (e) { run[k] = { thrown: e.message }; }
      }
      xmlRuns.push(run);
    };
    /* emit-ast.js (from ORD-0009): toAST over the same sources and options,
       the envelope whole; for the probes, the panel projection, pt-BR, and a
       source carried with its uri */
    const astRuns = [];
    const runAst = (id, src, opts, probe) => {
      const run = { id: id, src: src };
      if (opts.templates !== SNAP_OPTS.templates) run.probeTemplates = true;
      if (opts.rules !== SNAP_OPTS.rules) run.withRules = false;
      if (opts.expansions !== SNAP_OPTS.expansions) run.expansions = opts.expansions;
      if (opts.session === false) run.session = false;
      if (opts.valency === false) run.valency = false;
      const variants = [["full", opts]];
      if (probe) variants.push(["panel", { ...opts, projection: "panel" }], ["pt", { ...opts, lang: "pt" }],
                               ["embed", { ...opts, uri: "file:///x.pgml", embedSource: true }]);
      for (const [k, o] of variants) {
        try { run[k] = G.toAST(src, o); } catch (e) { run[k] = { thrown: e.message }; }
      }
      astRuns.push(run);
    };
    /* burn.js (from ORD-0009): toHGML over the same sources and options, and
       for the probes with the prose kept */
    const hgmlRuns = [];
    const runHgml = (id, src, opts, probe) => {
      const run = { id: id, src: src };
      if (opts.templates !== SNAP_OPTS.templates) run.probeTemplates = true;
      if (opts.rules !== SNAP_OPTS.rules) run.withRules = false;
      if (opts.expansions !== SNAP_OPTS.expansions) run.expansions = opts.expansions;
      if (opts.session === false) run.session = false;
      if (opts.valency === false) run.valency = false;
      for (const [k, o] of probe ? [["hgml", opts], ["keepText", { ...opts, keepText: true }]] : [["hgml", opts]]) {
        try { run[k] = G.toHGML(src, o); } catch (e) { run[k] = { thrown: e.message }; }
      }
      hgmlRuns.push(run);
    };
    const runParse = (id, src, opts) => {
      runXml(id, src, opts);
      runHgml(id, src, opts, !/^[A-Z]+-\d+$/.test(id));
      runAst(id, src, opts, !/^[A-Z]+-\d+$/.test(id));
      const run = { id: id, src: src };
      if (opts.templates !== SNAP_OPTS.templates) run.probeTemplates = true;
      if (opts.rules !== SNAP_OPTS.rules) run.withRules = false;
      if (opts.expansions !== SNAP_OPTS.expansions) run.expansions = opts.expansions;
      if (opts.session === false) run.session = false;
      if (opts.valency === false) run.valency = false;
      for (const lang of ["pt", "en"]) {
        let r;
        try { r = G.parse(src, lang === "en" ? { ...opts, lang: "en" } : opts); }
        catch (e) { run[lang] = { thrown: e.message }; continue; }
        const tree = dumpSegs(r.segments, true);
        if (lang === "pt") run.tree = tree;
        else if (JSON.stringify(tree) !== JSON.stringify(run.tree)) throw new Error("parse.json: the tree of " + id + " moves with the language");
        run[lang] = r.gaps.map(g => ({ sev: g.sev, lab: g.lab, msg: g.msg, code: g.code, at: g.at || null, plain: g.plain }));
      }
      parseRuns.push(run);
    };
    CORPUS.forEach(c => { if (c && c.id && typeof c.src === "string") runParse(c.id, c.src, SNAP_OPTS); });
    PARSE_PROBES.forEach((src, k) => runParse("probe-" + (k + 1), src, SNAP_OPTS));
    NO_SESSION.forEach((src, k) => runParse("nosession-" + (k + 1), src, { ...SNAP_OPTS, session: false }));
    NO_VALENCY.forEach((src, k) => runParse("novalency-" + (k + 1), src, { ...SNAP_OPTS, valency: false }));
    /* the template probes parsed whole: the expander handed the real parse,
       every level down, with the probe templates, and without the rules */
    TEMPLATE_PROBES.forEach((src, k) => runParse("tpl-" + (k + 1), src, { ...SNAP_OPTS, templates: probeTemplates }));
    /* a composition store with an entry of no species and one whose depth is not a number */
    const PROBE_EXPANSIONS = { commands: { CTX: { species: "atom" }, SUM: { species: "composite", depth: "2" }, REF: { depth: 1 } } };
    ["[ctx[sum'x']]", "[ref'x'][nt'y']"].forEach((src, k) => runParse("store-" + (k + 1), src, { ...SNAP_OPTS, expansions: PROBE_EXPANSIONS }));
    BARE_PROBES.forEach((src, k) => runParse("tpl-bare-" + (k + 1), src, { ...SNAP_OPTS, templates: probeTemplates, rules: null }));
    fs.writeFileSync(path.join(mods, "parse.json"), JSON.stringify({ engine: G.VERSION, runs: parseRuns }, null, 1) + "\n");
    /* and the emitter's own branches: a literal named after a member of the
       prototype, a mood the prototype answers, return blocks, a chain against
       a conjunction, an imperative, bindings and their references */
    const XML_PROBES = ["[ctx'toString']", "[ctx'__proto__'][sum'constructor']", "[ctx'x']/constructor/", "/eth/cnf/clm/[ctx]",
      "r- [tgt'x'][zzz]", "R: [ctx[sum]]", "r-", "r- [ph-x`q`]", "[a-b,c]", "[a-b-c]", "[in-rwk,ctx]", "[simp'X'],[core]",
      "[simp'X'][core]", "[simp'X'],[core],[ctx'y']", "[a],[b[c],[d]]", "[bold[ctx]]", "[bold'x']", "[sum`organized`[ctx]][ref'organized']",
      "[sum`organized`[ctx]] organized", "[crit'x']", "[logic q]a -> b\n! c -> d = e\nz = y + 1[/logic]", "[ctx: a, b]",
      "[ph-x`q`][ph-y]", "[--germinate]", "[--germinate[ph-alvo'A']]", "[dfn'a']", "[in-zzz]", "[a],[zzz]", "[ctx`x` 'y']",
      "[ctx[raw] <b> & [/raw]]", "[off]a <b> \"c\"[on]", "[gt'a'[ctx]]", "[ctx-cat'a']", "[ctx;;[sum]", "[ctx]] [sum]",
      "[ctx'a'];[=[sum'b']", ...["[a[x]],[b[y]]", "[a[a]],[b]", "[a[a[x]]],[b]"].map(t => "[ctx".repeat(13) + t)];
    XML_PROBES.forEach((src, k) => runXml("xml-" + (k + 1), src, SNAP_OPTS));
    fs.writeFileSync(path.join(mods, "xml.json"), JSON.stringify({ engine: G.VERSION, runs: xmlRuns }, null, 1) + "\n");
    /* and the envelope's own: line endings, a tree cut in the panel, the
       prototype's gloss where no rules store stops the parse */
    ["[ctx'a']\r\n[sum'b']", "[ctx'a']\r\n[sum'b']\n[nt'c']", "\n[ctx]\r\n", "[ins".repeat(210)]
      .forEach((src, k) => runAst("ast-" + (k + 1), src, SNAP_OPTS, true));
    ["[__proto__'x']/constructor/", "[constructor[ctx]]"].forEach((src, k) =>
      runAst("ast-bare-" + (k + 1), src, { ...SNAP_OPTS, rules: null }, true));
    fs.writeFileSync(path.join(mods, "ast.json"), JSON.stringify({ engine: G.VERSION, runs: astRuns }, null, 1) + "\n");
    /* and the burn's own: literals it folds, the repository's blend at the top
       and nested, an operand the formula also writes, a burn deeper than the
       cut, and a composition store of probes — a cycle, a chain past the
       limit, a formula with no head, a formula whose head holds a literal —
       and no store at all */
    const BURN_STORE = { commands: {
      AAA: { species: "composite", depth: 1, formula: "[bbb]" }, BBB: { species: "composite", depth: 1, formula: "[aaa]" },
      HEADLESS: { species: "composite", depth: 1, formula: "'just text'" },
      QUOTE: { species: "composite", depth: 1, formula: "[ctx'fixed']" }, CTX: { species: "atom", depth: 0 } } };
    for (let i = 0; i < 26; i++) BURN_STORE.commands["C" + i] = { species: "composite", depth: 1, formula: "[c" + (i + 1) + "]" };
    for (let i = 1; i <= 5; i++) BURN_STORE.commands["F" + i] = { species: "composite", depth: 1, formula: "[f" + (i % 5 + 1) + "]" };
    [["[ctx`it's  a\ttest`]", SNAP_OPTS], ["[rev'x'][dist'y']", SNAP_OPTS], ["[ctx[rev'x'][dist'y']]", SNAP_OPTS],
     ["[rmbr[get[ctx]]'X']", SNAP_OPTS], ["[crit".repeat(203), SNAP_OPTS], ["[aaa'x']", { ...SNAP_OPTS, expansions: BURN_STORE }],
     ["[c0'x']", { ...SNAP_OPTS, expansions: BURN_STORE }], ["[headless[ctx]]", { ...SNAP_OPTS, expansions: BURN_STORE }],
     ["[quote'mine']", { ...SNAP_OPTS, expansions: BURN_STORE }], ["[crit'x']", { ...SNAP_OPTS, expansions: null }], ["[f1'x']", { ...SNAP_OPTS, expansions: BURN_STORE }]
    ].forEach(([src, o], k) => runHgml("burn-" + (k + 1), src, o, true));
    fs.writeFileSync(path.join(mods, "hgml.json"), JSON.stringify({ engine: G.VERSION, runs: hgmlRuns }, null, 1) + "\n");

    /* inverse.js (from ORD-0009): the way back's own probes, made here so the
       recorder takes them with the suite's round trips — an element the
       prototype answers for, a mood it answers for, references past U+FFFF,
       the malformed shapes, and envelopes the way back refuses */
    const PKG = b => '<glyph-package engine="' + G.VERSION + '"><schema/><block once="true">' + b + "</block></glyph-package>";
    [PKG("<constructor/>"), PKG("<toString><user-input>x</user-input></toString>"),
     PKG('<mood dominant="constructor" also="focus,__proto__"/><context/>'),
     PKG("<context><user-input>&#128512; &#x41;&#65; &amp;lt; &#xD83D;&#xDE00; &#x;</user-input></context>"),
     PKG('<instruction><context chain="item"/><example chain="item"/></instruction>'),
     PKG('<holds><context/><example join="item"/></holds><chain><context chain="item"/><example/></chain>'),
     PKG("<context><example>"), PKG("<context></example></context>"), PKG("<context"), "<glyph><block once=\"true\"/></glyph>",
     "nada aqui", PKG('<zzz><user-input>kept</user-input></zzz><needs slot="2">q</needs><needs slot="alvo">q</needs>'),
     PKG('<template name="t" expanded="true"><context><user-input slot="alvo">A</user-input><user-input slot="9">n</user-input></context></template>'),
     PKG('<unresolved tag="Zz" chain="extend"><context/></unresolved><off>a\nb</off><raw>x]y</raw>'),
     PKG('<logic name="q"><rule kind="let"><source>a = 1</source></rule></logic>'),
     '<glyph-package><block once="true" continues="previous"><context/></block><break/><block once="true"><sum/></block></glyph-package>',
     PKG('<context name="a" name="b"><user-input>&apos;q&apos;</user-input></context>< context/><raw>   </raw>'),
     PKG('<instruction chain="extend"/><user-input>x</user-input><context chain="item"/>'),
     PKG('<context><instruction chain="extend"/><user-input>x</user-input><example chain="item"/></context>'),
     PKG('<context chain="item"/>'),
     PKG("<" + Object.keys(VOCAB.SESSION)[0] + "/>"), PKG('<user-expectative expects="context"><context/></user-expectative>')
    ].forEach(x => { try { G.fromXML(x); } catch (e) { /* recorded where it throws */ } });
    const ENV = segs => ({ type: "GlyphAST", schema: 2, projection: "full", segments: segs });
    [ENV([{ mood: [{ name: "eth" }, {}], continues: true, isReturn: true, breaks: 1, body: [
        { type: "Literal", value: "a`b", form: "tick" }, { type: "Literal", value: "c", form: "tick" },
        { type: "Raw", value: "prose", form: "raw" }, { type: "Raw", value: "q", form: "quote" }, [],
        { type: "Nope" }, { type: "Truncated", atDepth: 200, omittedNodes: 7 }, 5,
        { type: "Command", raw: "CTX", canonical: "CTX", name: "n[1]", origin: "item", body: [{ type: "Text", value: "t" }] },
        { type: "Command", canonical: "SUM", chainElement: true, origin: "extend" },
        { type: "Command", canonical: "CTX", chainElement: true, origin: "item" },
        { type: "Template", name: "germinate", expanded: true, body: [{ type: "Command", slotName: true, canonical: "X" },
          { type: "Literal", value: "A", form: "quote", slot: "alvo" }, { type: "Literal", value: "B", slot: "2" }] },
        { type: "Template", name: "d", isDefinition: true, body: [{ type: "Verbatim", value: "v]" }] },
        { type: "Logic", name: "q", rules: [{ source: "a = 1" }, {}] }, { type: "ModeOff", body: [{ type: "Text", value: "p" }] }] },
      { body: [] }, { breaks: 0, body: [{ type: "Command", raw: "nt" }] }]),
     { ...ENV([]), projection: "panel" }, { type: "Other" }, [], "text", null
    ].forEach(env => G.fromAST(env));
    console.log("  ! module oracle written: util, vocabulary, stores, lexer, logic, trees, parse, xml, ast, hgml to " + mods);
  }

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
 * bindings -- a command's operand names its result, and a reference resolves
 *
 * The Regent's rule, from glyph-variable-naming-system.pgml: "when a command
 * targets an object in context using text followed by orders, the result is
 * named after the input text". Measured before this existed: [var`get_data`]
 * and a path emitted the SAME <user-input>, so nothing in the document said
 * get_data bound anything, and nothing linked a use to its definition.
 * ------------------------------------------------------------------ */
function runBindingChecks() {
  console.log("\n--- bindings -- name and reference ---");
  const D = [];
  const ok = (id, name, why) => {
    if (why) { console.log("  \u2717 " + id + ": " + name); console.log("      " + why); failures.push(id); }
    else { console.log("  \u2713 " + id + ": " + name); D.push(id); }
  };
  const opts = { templates: TPL.templates, rules: RULESTORE,
                 expansions: require("../.guidelines/expansions.json") };

  const named = G.toXML("[sum`organized`[itr-core[ctx]]]", opts);
  ok("BD-01", "an operand plus a nest names the command's result",
     /<summary binds="organized">/.test(named) ? null
       : "no binds on a command that names its result: " + JSON.stringify(named));

  ok("BD-02", "a command carrying only a literal binds nothing",
     G.toXML("[nt`organized`]", opts).indexOf("binds=") === -1 ? null
       : "a bare operand was read as naming a result there is none of");

  /* scope is the whole glyph-package, so a reference in a LATER block
     resolves to a binding in an earlier one -- and would resolve the other
     way round too */
  const pair = G.toXML("[var`get_data`[get-find`~/d.json`]];[eval`get_data`]", opts);
  ok("BD-03", "a literal that is a bound name carries the reference",
     /<user-input ref="get_data">get_data<\/user-input>/.test(pair) ? null
       : "the use is not linked to the definition: " + JSON.stringify(pair));

  ok("BD-04", "the binding literal is not a reference to itself",
     (pair.match(/ref="get_data"/g) || []).length === 1 ? null
       : "the declaration was also marked as a use");

  /* [--germinate] expands to [skill`tree logic structure`[...]], and binding
     that sentence would put a pseudo-name in the document and let `ref` match
     on a coincidence of wording. A name has the shape of a name. */
  ok("BD-05", "prose is not a name",
     G.toXML("[--germinate`a`,`b`]", { ...opts, templates: TPL.templates })
       .indexOf('binds="tree logic structure"') === -1 ? null
       : "a sentence was bound as if it were an identifier");

  /* one name, one result: choosing between two would be the silent wrong
     answer this release exists to remove */
  ok("BD-06", "two commands naming one result is refused",
     G.parse("[var`x`[get[ctx]]];[sum`x`[itr[ctx]]]", opts)
       .gaps.some(g => g.code === "DuplicateBinding" && g.sev === "fix") ? null
       : "a name bound twice raised nothing");

  return D.length;
}
const rBD = runBindingChecks();


/* ------------------------------------------------------------------ *
 * suggest -- aponta, ou cala
 *
 * Medido contra as ONZE palavras que o Autor da Ordem escreveu de verdade:
 * a versao por distancia de edicao acertava UMA, com oito palpites errados.
 * O pior era RULE -> TRUE, distancia ortografica sem nenhuma semantica.
 *
 * Um palpite errado aqui nao e ruido. O motor encontra o Autor da Ordem
 * ENQUANTO a intencao se forma, entao a sugestao errada puxa a intencao para
 * o lado errado enquanto ela ainda e maleavel.
 * ------------------------------------------------------------------ */
function runSuggestChecks() {
  console.log("\n--- suggest -- aponta, ou cala ---");
  const D = [];
  const ok = (id, name, why) => {
    if (why) { console.log("  \u2717 " + id + ": " + name); console.log("      " + why); failures.push(id); }
    else { console.log("  \u2713 " + id + ": " + name); D.push(id); }
  };
  const of = w => { const s = G.suggest(w); return s ? s.name : null; };

  /* a abreviacao real: ITR e Iterate encurtado, e ITER e o comeco da glosa */
  ok("SG-01", "uma abreviacao da glosa e reconhecida",
     of("ITER") === "ITR" ? null : "ITER sugeriu " + JSON.stringify(of("ITER")));

  /* e aqui a versao antiga dizia SPEC, quando o Autor da Ordem queria SECTION */
  ok("SG-02", "e aponta para o que o autor queria dizer",
     of("SEC") === "SECTION" ? null : "SEC sugeriu " + JSON.stringify(of("SEC")));

  /* o defeito que fechou: nada em `rule` significa `true`, os dois so se parecem */
  const guessed = ["RULE", "SCOPE", "DOC", "DESC", "CMD", "SYNTAX", "RESULT"]
    .filter(w => of(w) !== null);
  ok("SG-03", "uma palavra que nao existe nao ganha vizinho ortografico",
     guessed.length ? "ainda palpita em: " + guessed.map(w => w + " -> " + of(w)).join(", ") : null);

  /* ambiguo e pior que silencio: duas respostas nao apontam para lugar nenhum */
  ok("SG-04", "um prefixo ambiguo cala em vez de escolher",
     of("C") === null && of("RE") === null ? null
       : "escolheu entre candidatos: C -> " + of("C") + ", RE -> " + of("RE"));

  return D.length;
}
const rSG = runSuggestChecks();


/* ------------------------------------------------------------------ *
 * aspas -- as duas formas obedecem a mesma regra
 *
 * `;` encerrava um literal de crase e nao encerrava um de apostrofo, entao
 * as duas aspas tinham gramaticas diferentes -- e a crase existe justamente
 * para se poder escrever apostrofo dentro, e vice-versa.
 *
 * A regra do Regente: "jamais algo estrutural pode causar problema na
 * escrita de literais". Lista de topicos usa `;` ao fim de cada ponto por
 * convencao, e o Autor da Ordem nao pode perder isso para um separador.
 * ------------------------------------------------------------------ */
function runQuoteChecks() {
  console.log("\n--- aspas -- uma regra so ---");
  const D = [];
  const ok = (id, name, why) => {
    if (why) { console.log("  \u2717 " + id + ": " + name); console.log("      " + why); failures.push(id); }
    else { console.log("  \u2713 " + id + ": " + name); D.push(id); }
  };
  const opts = { templates: TPL.templates, rules: RULESTORE,
                 expansions: require("../.guidelines/expansions.json") };
  const clean = src => G.parse(src, opts).gaps.filter(g => g.sev === "fix").length === 0;
  const text = src => (G.toXML(src, opts).match(/<user-input>([^<]*)</) || [])[1];

  ok("QT-01", "`;` dentro de um literal de crase e conteudo",
     clean("[nt`a ; b`]") ? null
       : "ainda recusa: " + G.parse("[nt`a ; b`]", opts).gaps.map(g => g.code).join(","));

  ok("QT-02", "e as duas aspas dao o mesmo texto",
     text("[nt`a ; b`]") === text("[nt'a ; b']") ? null
       : "crase deu " + JSON.stringify(text("[nt`a ; b`]")) +
         ", apostrofo deu " + JSON.stringify(text("[nt'a ; b']")));

  /* a outra metade: fora do literal ele continua sendo o separador */
  ok("QT-03", "`;` fora de um literal ainda separa blocos",
     (G.toXML("[nt`a`];[nt`b`]", opts).match(/<block/g) || []).length === 2 ? null
       : "o separador parou de separar");

  return D.length;
}
const rQT = runQuoteChecks();


/* ------------------------------------------------------------------ *
 * parametro de template -- so literal conta, e o resto tem de recusar
 *
 * Ate 2026-09-05 um nao-literal na lista de argumentos escorregava para
 * `extra` em silencio, reaparecia como irmao orfao depois da expansao, e
 * empurrava todo literal seguinte uma casa a esquerda.
 *
 * Medido na fonte do Regente, [--reinforce[ctx]`interprete`]: o `interprete`,
 * escrito como SEGUNDO argumento, era ligado ao PRIMEIRO buraco (`rule`), e o
 * motor entao reclamava que faltava o `why` -- descrevendo a coisa errada
 * enquanto escondia a que aconteceu.
 * ------------------------------------------------------------------ */
function runTemplateParamChecks() {
  console.log("\n--- parametro de template ---");
  const D = [];
  const ok = (id, name, why) => {
    if (why) { console.log("  \u2717 " + id + ": " + name); console.log("      " + why); failures.push(id); }
    else { console.log("  \u2713 " + id + ": " + name); D.push(id); }
  };
  const opts = { templates: TPL.templates, rules: RULESTORE,
                 expansions: require("../.guidelines/expansions.json") };
  const codes = src => G.parse(src, opts).gaps.map(g => g.code);
  const msg = src => (G.parse(src, opts).gaps.find(g => g.code === "TemplateParamNotLiteral") || {}).plain
                     || (G.parse(src, opts).gaps.find(g => g.code === "TemplateParamNotLiteral") || {}).msg || "";

  const slid = "[--reinforce[ctx],`interprete`]";
  ok("TP-01", "um nao-literal entre os argumentos e recusado",
     codes(slid).indexOf("TemplateParamNotLiteral") !== -1 ? null
       : "escorregou em silencio: " + codes(slid).join(","));

  /* a mensagem tem de dizer QUAL posicao -- e a unica coisa que o autor
     precisa saber para consertar */
  ok("TP-02", "e a recusa nomeia a posicao",
     /1\u00ba|argument 1/.test(String(msg(slid))) ? null
       : "nao diz a posicao: " + JSON.stringify(String(msg(slid)).slice(0, 120)));

  /* conteudo escrito DEPOIS de todos os argumentos e perda documentada, nao
     deslize: nada foi empurrado, entao nada e recusado */
  const after = "[--reinforce`a`,`b`[gen`x`]]";
  ok("TP-03", "conteudo depois dos argumentos nao vira recusa",
     codes(after).indexOf("TemplateParamNotLiteral") === -1 ? null
       : "recusou conteudo em excesso, que e perda documentada e nao deslize");

  /* e o caso certo continua ligando os dois buracos */
  const good = "[--reinforce`a`,`b`]";
  const x = G.toXML(good, opts);
  ok("TP-04", "dois literais ainda preenchem os dois buracos",
     /slot="rule">a</.test(x) && /slot="why">b</.test(x) ? null
       : "a ligacao posicional quebrou: " + JSON.stringify(x.slice(0, 200)));

  return D.length;
}
const rTP = runTemplateParamChecks();


/* ------------------------------------------------------------------ *
 * imperativo -- um primitivo que recebeu operando
 *
 * GLOSSARY 0 declara dois eixos independentes, e o segundo -- primitivo
 * (stands alone) contra operador (needs an operand) -- nunca virou tabela.
 * Sem ele, [bold[ctx[var]]] saia com ZERO diagnosticos e nenhuma marca: um
 * comando declarado a nao receber nada aceitava um filho em silencio.
 *
 * O eixo e DERIVADO, nao transcrito: e primitivo o atomo de que nenhuma
 * tabela de valencia cobra operando. A prosa da GLOSSARY 2 nao serve de
 * fonte -- 15 dos 38 comandos que ela lista como "stand on their own"
 * exigem operando pelo FRAMES, e REQ esta nas duas secoes ao mesmo tempo.
 * ------------------------------------------------------------------ */
function runImperativeChecks() {
  console.log("\n--- imperativo ---");
  const D = [];
  const ok = (id, name, why) => {
    if (why) { console.log("  \u2717 " + id + ": " + name); console.log("      " + why); failures.push(id); }
    else { console.log("  \u2713 " + id + ": " + name); D.push(id); }
  };
  const opts = { templates: TPL.templates, rules: RULESTORE,
                 expansions: require("../.guidelines/expansions.json") };
  const marked = src => G.toXML(src, opts).indexOf('imperative="true"') !== -1;

  ok("IM-01", "um primitivo que recebe comando e imperativo",
     marked("[bold[ctx[var]]]") ? null : "[bold[ctx]] nao foi marcado");

  ok("IM-02", "um primitivo sozinho nao e",
     !marked("[bold]") ? null : "[bold] sozinho foi marcado, e ele e so uma marca");

  /* e a CONTENCAO que faz, nao a vizinhanca: [bold][ctx] sao dois irmaos */
  ok("IM-03", "dois irmaos lado a lado nao sao imperativo",
     !marked("[bold][ctx`x`]") ? null
       : "vizinhanca foi lida como contencao");

  /* so primitivo. um operador que recebe operando esta fazendo o seu trabalho */
  ok("IM-04", "um operador com operando nao e imperativo",
     !marked("[crit[ctx`x`]]") ? null
       : "[crit] exige operando pelo FRAMES e mesmo assim foi marcado");

  /* o eixo derivado tem de bater com os cinco que o comentario do FRAMES
     nomeia -- foi a unica lista que o codigo ja carregava */
  const five = ["WHR", "HGH", "LOW", "BOLD", "LIGHT"];
  const wrong = five.filter(c => !G.standsAlone(c, opts));
  ok("IM-05", "os cinco primitivos que o codigo ja nomeava continuam primitivos",
     wrong.length ? "deixaram de ser: " + wrong.join(", ") : null);

  return D.length;
}
const rIM = runImperativeChecks();


/* ------------------------------------------------------------------ *
 * o bundle da Ordem -- ORD-0001, numerado como um ADR
 *
 * Ate aqui `baixar` entregava UMA aba por clique, com o nome `glyph.ext`.
 * Quatro cliques e quatro renomeacoes para ter uma Ordem, que e o trabalho
 * que esta ferramenta existe para nao criar -- e o painel de destino dizia,
 * na propria tela, que seria lido "pelo emissor de bundle", que nunca tinha
 * sido escrito.
 *
 * O ZIP e escrito aqui dentro, metodo `store`, porque zero dependencia e
 * propriedade deste repositorio e nao acidente.
 * ------------------------------------------------------------------ */
function runBundleChecks() {
  console.log("\n--- bundle da Ordem ---");
  const D = [];
  const ok = (id, name, why) => {
    if (why) { console.log("  \u2717 " + id + ": " + name); console.log("      " + why); failures.push(id); }
    else { console.log("  \u2713 " + id + ": " + name); D.push(id); }
  };
  const fsx = require("fs"), px = require("path"), cp = require("child_process");
  const ROOT = px.resolve(__dirname, "..");

  /* um leitor de zip minimo, so o suficiente para conferir o que foi escrito:
     percorre os cabecalhos locais e recalcula o CRC de cada entrada */
  const readZip = buf => {
    const u = new Uint8Array(buf), out = [];
    const r16 = o => u[o] | (u[o + 1] << 8);
    const r32 = o => (u[o] | (u[o + 1] << 8) | (u[o + 2] << 16) | (u[o + 3] << 24)) >>> 0;
    let i = 0;
    while (i + 4 <= u.length && r32(i) === 0x04034B50) {
      const crc = r32(i + 14), size = r32(i + 22), nlen = r16(i + 26), elen = r16(i + 28);
      const name = Buffer.from(u.slice(i + 30, i + 30 + nlen)).toString("utf8");
      const data = u.slice(i + 30 + nlen + elen, i + 30 + nlen + elen + size);
      out.push({ name, size, crc, data });
      i += 30 + nlen + elen + size;
    }
    return out;
  };

  const tmp = px.join(ROOT, ".ord-gate");
  try {
    fsx.mkdirSync(tmp, { recursive: true });
    const srcFile = px.join(tmp, "fonte.pgml");
    fsx.writeFileSync(srcFile, "[in[tgt`acentuacao e c-cedilha: fichação`]]", "utf8");
    const run = args => cp.execFileSync(process.execPath,
      [px.join(ROOT, "scripts", "glyph-cli.js")].concat(args),
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

    run(["--file", srcFile, "--bundle", "--out", tmp]);
    const first = px.join(tmp, "ORD-0001.zip");
    ok("ZP-01", "emite ORD-0001 na primeira vez",
       fsx.existsSync(first) ? null : "nao escreveu " + first);

    /* a numeracao de ADR: le a pasta e continua de onde parou */
    run(["--file", srcFile, "--bundle", "--out", tmp]);
    ok("ZP-02", "e continua em ORD-0002, lendo a pasta",
       fsx.existsSync(px.join(tmp, "ORD-0002.zip")) ? null
         : "o numero nao avancou -- a pasta nao foi lida");

    const entries = readZip(fsx.readFileSync(first));
    ok("ZP-03", "o bundle tem as quatro projecoes mais o manifesto",
       entries.length === 5 &&
       [".pgml", ".xml", ".json", ".hgml", ".manifest.json"]
         .every(ext => entries.some(e => e.name === "ORD-0001" + ext))
         ? null : "tem " + entries.length + ": " + entries.map(e => e.name).join(", "));

    /* o CRC de cada entrada tem de bater com os bytes gravados, senao o
       descompactador do Autor da Ordem recusa o arquivo inteiro */
    const bad = entries.filter(e => G_ZIP.crc32(e.data) !== e.crc);
    ok("ZP-04", "o CRC de cada entrada confere com os bytes",
       bad.length ? "CRC errado em: " + bad.map(e => e.name).join(", ") : null);

    /* acento tem de voltar identico: o nome e o conteudo vao em UTF-8 e o
       bit 11 do cabecalho diz isso */
    const pgml = entries.find(e => e.name === "ORD-0001.pgml");
    const back = Buffer.from(pgml.data).toString("utf8");
    ok("ZP-05", "o conteudo volta byte a byte, acentos incluidos",
       back === fsx.readFileSync(srcFile, "utf8") ? null
         : "voltou diferente: " + JSON.stringify(back.slice(0, 80)));

    /* um ID e ORD-#### seguido de nada ou de um ponto: ORD-2026-08-30-01 e um
       ID datado, e lido como o numero 2026 faria a proxima sair ORD-2027 */
    fsx.writeFileSync(px.join(tmp, "ORD-2026-08-30-01.pgml"), "[nt'datada']", "utf8");
    run(["--file", srcFile, "--bundle", "--out", tmp]);
    ok("ZP-06", "um ID datado no destino nao vira numero",
       fsx.existsSync(px.join(tmp, "ORD-0003.zip")) ? null
         : "saiu " + fsx.readdirSync(tmp).filter(n => /\.zip$/.test(n)).join(", "));

    /* a serie: --out numa pasta EMS-### escreve a ORD como a pasta ORD-####/,
       com os cinco arquivos que o zip leva, e numera pelas pastas ORD daquela
       serie sozinha. Ao lado delas: a spec, um rascunho ORD-0007.pgml (arquivo,
       nao pasta) e uma pasta de ID datado -- nenhum dos tres conta */
    const orders = px.join(tmp, ".guidelines", ".orders");
    const ems = px.join(orders, "EMS-001");
    fsx.mkdirSync(px.join(ems, "ORD-2026-08-30-01"), { recursive: true });
    fsx.writeFileSync(px.join(ems, "EMS-001.pgml"), "[nt'a spec']", "utf8");
    fsx.writeFileSync(px.join(ems, "ORD-0007.pgml"), "[nt'rascunho']", "utf8");
    const five = id => [".pgml", ".xml", ".json", ".hgml", ".manifest.json"].map(ext => id + ext);
    const folder = (dir, id) => {
      const at = px.join(dir, id);
      if (!fsx.existsSync(at) || !fsx.statSync(at).isDirectory())
        return "nao ha pasta " + id + "/ -- a serie tem: " + fsx.readdirSync(dir).join(", ");
      const has = fsx.readdirSync(at).sort(), want = five(id).sort();
      return has.join() === want.join() ? null : id + "/ tem: " + has.join(", ");
    };
    run(["--file", srcFile, "--bundle", "--out", ems]);
    ok("ZP-07", "numa serie, a primeira vez escreve a pasta ORD-0001/ com os cinco arquivos",
       folder(ems, "ORD-0001"));

    run(["--file", srcFile, "--bundle", "--out", ems]);
    ok("ZP-08", "e a segunda, ORD-0002/, contando so as pastas ORD da serie",
       folder(ems, "ORD-0002"));

    /* a pasta leva o que o zip leva: a fonte byte a byte, as tres projecoes
       iguais as do zip da mesma fonte, e o manifesto com a ORD e os arquivos */
    const inFolder = name => {
      const f = px.join(ems, "ORD-0001", name);
      return fsx.existsSync(f) ? fsx.readFileSync(f, "utf8") : null;
    };
    const differ = [".xml", ".json", ".hgml"].filter(ext => {
      const z = entries.find(e => e.name === "ORD-0001" + ext);
      return inFolder("ORD-0001" + ext) !== Buffer.from(z.data).toString("utf8");
    });
    let man = null;
    try { man = JSON.parse(inFolder("ORD-0001.manifest.json")); } catch (e) { /* segue nulo */ }
    ok("ZP-09", "a pasta leva o que o zip leva: fonte, projecoes e manifesto",
       inFolder("ORD-0001.pgml") !== fsx.readFileSync(srcFile, "utf8") ? "a fonte voltou diferente"
         : differ.length ? "difere do zip: " + differ.join(", ")
         : !man || man.order !== "ORD-0001" || man.files.join() !== five("ORD-0001").slice(0, 4).join()
           ? "manifesto: " + JSON.stringify(man) : null);

    /* a contagem reinicia em cada serie */
    const ems2 = px.join(orders, "EMS-002");
    fsx.mkdirSync(ems2);
    run(["--file", srcFile, "--bundle", "--out", ems2]);
    ok("ZP-10", "a contagem reinicia em cada serie", folder(ems2, "ORD-0001"));

    /* o plugin acha a ORD de uma serie: --from EMS-001/ORD-0002 e o caminho da
       pasta dela respondem o mesmo que o .pgml de dentro */
    const plugin = args => {
      try {
        return cp.execFileSync(process.execPath,
          [px.join(ROOT, "scripts", "glyph-plugin.js")].concat(args),
          { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      } catch (e) { return { failed: String(e.stderr || e.message).trim() }; }
    };
    const direct = run(["--file", px.join(ems, "ORD-0002", "ORD-0002.pgml"), "--xml"]);
    const sameAs = got => typeof got !== "string" ? got.failed
      : got === direct ? null : "respondeu outro XML";
    ok("ZP-11", "o plugin acha a ORD pela serie: --from EMS-001/ORD-0002",
       sameAs(plugin(["--root", tmp, "--from", "EMS-001/ORD-0002", "--xml"])));
    ok("ZP-12", "e pelo caminho da pasta dela",
       sameAs(plugin(["--root", tmp, "--from", px.join(ems, "ORD-0002"), "--xml"])));

    /* o comando de bundle le a serie. As sondas de ls e sed do bundle.md sao
       avaliadas aqui pelo que nomeiam -- os globs e o intervalo --, sem shell,
       porque a suite nao depende de bash; o README da serie declara uma Ordem
       aberta e uma fechada, e so a aberta pode sair */
    fsx.writeFileSync(px.join(ems, "README.md"), "# EMS-001\n\n## A Ordem aberta\n\n" +
      "- `EMS-001/ORD-0002` aberta\n\n## Ordens fechadas\n\n- `EMS-001/ORD-0001` fechada\n", "utf8");
    const leaf = fsx.readFileSync(px.join(ROOT, "commands", "repo-config", "guidelines",
                                          "orders", "bundle.md"), "utf8");
    const probes = [];
    leaf.replace(/^!`((?:ls|sed) .*) 2>\/dev\/null \|\| true`$/gm, (m, c) => probes.push(c));
    const glob = g => {
      const re = new RegExp("^" + g.split("*").map(s => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
                                     .join("[^/.][^/]*") + "$");
      const found = [];
      const walk = (rel, depth) => {
        if (re.test(rel)) found.push(rel);
        const abs = px.join(tmp, rel);
        if (depth < 5 && fsx.statSync(abs).isDirectory())
          fsx.readdirSync(abs).sort().forEach(n => walk(rel ? rel + "/" + n : n, depth + 1));
      };
      walk("", 0);
      return found;
    };
    const said = probes.map(c => {
      const words = c.match(/'[^']*'|\S+/g), args = words.slice(1).filter(w => w[0] !== "-");
      if (words[0] === "ls") {
        const dirOnly = words.slice(1).some(w => /^-\w*d/.test(w));
        return args.map(glob).flat().map(p => dirOnly || !fsx.statSync(px.join(tmp, p)).isDirectory()
          ? p : fsx.readdirSync(px.join(tmp, p)).join("\n")).join("\n");
      }
      const range = /^'\/(.*)\/,\/(.*)\/p'$/.exec(args[0]);
      if (!range) return "";
      const [from, to] = [new RegExp(range[1]), new RegExp(range[2])];
      let inside = false;
      return args.slice(1).map(glob).flat().map(f => fsx.readFileSync(px.join(tmp, f), "utf8"))
        .join("").split("\n").filter(line => inside ? (inside = !to.test(line), true)
                                                     : (inside = from.test(line))).join("\n");
    }).join("\n");
    ok("ZP-13", "as sondas do bundle listam as pastas ORD de cada serie",
       /EMS-001\/ORD-0002/.test(said) ? null : "nao viram EMS-001/ORD-0002: " + JSON.stringify(said));
    ok("ZP-14", "e leem a Ordem aberta do README da serie, e so ela",
       !/ORD-0002` aberta/.test(said) ? "a Ordem aberta nao foi lida"
         : /ORD-0001` fechada/.test(said) ? "leram alem da secao aberta" : null);
  } finally {
    try { fsx.rmSync(tmp, { recursive: true, force: true }); } catch (e) { /* ja foi */ }
  }
  return D.length;
}
const rZP = runBundleChecks();


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

/* ------------------------------------------------------------------ *
 * The context — the three stores as one object, with no global fallback
 *
 * Loose `opts.templates/rules/expansions` fall back to the globals store by
 * store, so a call that brings its own templates still gets whatever rules
 * the process loaded: two packages in one process leak into each other. A
 * context (G.createContext) answers for all three or for none. This runs
 * after runRegistryGuard on purpose — the globals are loaded, so a context
 * that leaked would show it here.
 * ------------------------------------------------------------------ */
function runContextGuard() {
  console.log("\n--- context — one object, no fallback ---");
  const D = [];
  const ok = (id, name, why) => {
    if (why) { console.log("  ✗ " + id + ": " + name); console.log("      " + why); failures.push(id); }
    else { console.log("  ✓ " + id + ": " + name); D.push(id); }
  };

  const loose = { templates: TPL.templates, rules: RULESTORE, expansions: require("../.guidelines/expansions.json") };
  const ctx = G.createContext(loose);
  const CORPUS = [].concat(POSITIVE, INCOMPLETE, INVALID, REGRESSION, LONG,
                           TEMPLATES, CONSTRAINTS, RULE_CASES, ORACLE_COVERAGE);
  const three = (src, o) => {
    const a = G.toAST(src, o); delete a.version;
    return G.toXML(src, o) + "\n" + JSON.stringify(a) + "\n" + G.toHGML(src, o);
  };
  const differ = CORPUS.filter(c => c && typeof c.src === "string" &&
    (three(c.src, ctx) !== three(c.src, loose) ||
     three(c.src, { context: ctx }) !== three(c.src, loose))).map(c => c.id);
  ok("CX-01", "a context projects the corpus exactly as the loose stores do",
     differ.length ? "differs on " + differ.slice(0, 8).join(", ") : null);

  const ruleCodes = o => (G.parse("[mand'x'][opt'x']", o).gaps || []).map(g => g.code);
  /* the baseline is a loose store that is present and empty — it cannot fall
     back, in this engine or in one without contexts, so it measures the rules
     alone and not the mechanism under test. `__compiled` is cleared because
     compileRules caches onto the store object itself, and a copy would carry
     the original's compiled rules along with it */
  const noRules = ruleCodes(Object.assign({}, loose,
    { rules: Object.assign({}, RULESTORE, { rules: [], __compiled: undefined }) }));
  const fromRules = ruleCodes(loose).filter(c => noRules.indexOf(c) === -1);
  const leaked = ruleCodes(G.createContext({ templates: TPL.templates }))
    .filter(c => fromRules.indexOf(c) !== -1);
  ok("CX-02", "a context without rules gets none from the globals",
     !fromRules.length ? "the probe fired no rule even with the store — it proves nothing"
       : leaked.length ? "global rules reached it: " + leaked.join(",") : null);

  const expands = o => /expanded/.test(G.toXML("[--germinate]", o));
  ok("CX-03", "templates.json whole and the map inside it read the same, in both doors",
     [G.createContext({ templates: TPL }), { templates: TPL }].every(expands) &&
     !expands(G.createContext({}))
       ? null : "the file's own shape lost the templates in one of the two doors");

  return D.length;
}
const rCX = runContextGuard();

function runOracleCoverage() {
  console.log("\n--- oracle coverage — every declared code fires ---");
  const D = [];
  const opts = { templates: TPL.templates, rules: RULESTORE,
                 expansions: require("../.guidelines/expansions.json") };
  ORACLE_COVERAGE.forEach(c => {
    const codes = (G.parse(c.src, opts).gaps || []).map(g => g.code);
    if (codes.indexOf(c.code) === -1) {
      console.log("  ✗ " + c.id + ": " + c.code);
      console.log("      fired " + (codes.join(",") || "nothing") + " for " + JSON.stringify(c.src));
      failures.push(c.id);
    } else { console.log("  ✓ " + c.id + ": " + c.code); D.push(c.id); }
  });
  return D.length;
}
const rOC = runOracleCoverage();

/* ------------------------------------------------------------------
 * EMS-001 ORD-0010, ADR B: the engine on stdio, relayed by serve-dev.js.
 * The twelve calls go through `POST /engine` to the engine process and come
 * back as the bytes glyph-protocol.js answers in this process; a GET still
 * serves the page's files, and a request the engine refuses is answered.
 * ------------------------------------------------------------------ */
async function runRelay() {
  console.log("\n--- engine relay — POST /engine to glyph-protocol.js ---");
  const D = [];
  const ok = (id, name, why) => {
    if (why) { console.log("  ✗ " + id + ": " + name); console.log("      " + why); failures.push(id); }
    else { console.log("  ✓ " + id + ": " + name); D.push(id); }
  };
  const PROTOCOL = await import("./glyph-protocol.js");
  const cp = await import("node:child_process");
  const http = await import("node:http");
  const server = cp.spawn(process.execPath, [path.join(__dirname, "serve-dev.js"), "0", "--no-open"],
                          { stdio: ["ignore", "pipe", "inherit"] });
  const port = await new Promise((resolve, reject) => {
    let out = "";
    server.stdout.on("data", c => { out += c; const m = out.match(/localhost:(\d+)\//); if (m) resolve(Number(m[1])); });
    server.on("exit", () => reject(new Error("serve-dev.js exited")));
  });
  const send = (method, url, body) => new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port: port, method: method, path: url }, res => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", c => { text += c; });
      res.on("end", () => resolve({ status: res.statusCode, text: text }));
    });
    req.on("error", reject);
    req.end(body);
  });
  const SRC = "[crit'the parser'][logic-risk[x = 2][/logic]";
  const calls = [
    { call: "tokenize", src: SRC }, { call: "classify", name: "crit" }, { call: "suggest", name: "crti" },
    { call: "elName", canonical: "CRIT", tier: "instr", gloss: "Criticise" }, { call: "parseLogic", name: "risk", body: "x = 2\ny > x" },
    { call: "expandExpr", raw: "a && !b" }, { call: "freeVars", raw: "y > x" }, { call: "parse", src: SRC, lang: "pt" },
    { call: "toXML", src: SRC }, { call: "toAST", src: SRC, projection: "panel" }, { call: "toHGML", src: SRC },
    { call: "fromXML", xml: G.toXML(SRC, { templates: TPL.templates, rules: RULESTORE }) }
  ];
  try {
    for (const [k, q] of calls.entries()) {
      const line = JSON.stringify(q), r = await send("POST", "/engine", line);
      ok("RL-" + String(k + 1).padStart(2, "0"), q.call + " through the relay",
         r.status !== 200 ? "status " + r.status : r.text !== PROTOCOL.answer(line) ? "the relay answered other bytes than the engine: " + r.text.slice(0, 120) : null);
    }
    const bad = await send("POST", "/engine", "nope");
    ok("RL-13", "a line that is not a request is answered", bad.text !== "{\"thrown\":\"bad request\"}" ? bad.text : null);
    const page = await send("GET", "/scripts/glyph-protocol.js");
    ok("RL-14", "a GET still serves the files", page.status !== 200 || page.text.indexOf("ADR B") === -1 ? "status " + page.status : null);
  } finally {
    server.kill();
  }
  return D.length;
}
const rRL = await runRelay();



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
console.log(" .hgml burn   " + rH + "/15");
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
console.log(" bindings     " + String(rBD).padStart(4) + "/6");
console.log(" suggest      " + String(rSG).padStart(4) + "/4");
console.log(" aspas        " + String(rQT).padStart(4) + "/3");
console.log(" param template" + String(rTP).padStart(4) + "/4");
console.log(" imperativo   " + String(rIM).padStart(4) + "/5");
console.log(" bundle ORD   " + String(rZP).padStart(4) + "/14");
console.log(" global store " + rGS + "/3");
console.log(" context      " + rCX + "/3");
console.log(" coverage     " + String(rOC).padStart(4) + "/" + ORACLE_COVERAGE.length);
console.log(" engine relay " + String(rRL).padStart(4) + "/14");
console.log("=================================================");

if (EXPORT_ORACLE) {
  /* one entry per distinct call, in the order first made */
  const seen = new Set(), trips = TRIPS.filter(t => {
    const k = JSON.stringify([t.fn, t.input === undefined ? t.src : t.input, t.opts || null]);
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
  const arg = process.argv[process.argv.indexOf("--export-oracle") + 1];
  const mods = (arg && arg.slice(0, 2) !== "--" ? path.resolve(arg) : path.resolve(__dirname, "../rust/target/oracle")) + "-modules";
  require("fs").writeFileSync(path.join(mods, "inverse.json"), JSON.stringify({ engine: G.VERSION, trips: trips }, null, 1) + "\n");
  console.log("  ! round trips written: " + trips.length + " calls to " + path.join(mods, "inverse.json"));

  /* glyph-protocol.js (EMS-001 ORD-0010): the twelve calls over the case
     files, one request line and the line the JS answers; the names the
     tokens carry feed classify, suggest and elName, the logic blocks feed
     parseLogic, and each rule's expression expandExpr and freeVars */
  const PROTOCOL = await import("./glyph-protocol.js");
  const fsx = require("fs"), dir = mods.slice(0, -"-modules".length);
  const lines = [], had = new Set();
  const ask = q => {
    const line = typeof q === "string" ? q : JSON.stringify(q);
    if (had.has(line)) return null;
    had.add(line);
    const a = PROTOCOL.answer(line);
    lines.push({ q: line, a: a });
    return JSON.parse(a);
  };
  fsx.readdirSync(dir).filter(f => f.endsWith(".json")).sort().forEach(f => {
    const src = JSON.parse(fsx.readFileSync(path.join(dir, f), "utf8")).src;
    ask({ call: "tokenize", src: src });
    [undefined, "pt", "en"].forEach(lang => ask({ call: "parse", src: src, lang: lang }));
    ask({ call: "parse", src: src, session: false });
    ask({ call: "toAST", src: src, session: false, projection: "panel" });
    ask({ call: "toXML", src: src });
    ask({ call: "toXML", src: src, describe: true });
    ask({ call: "toAST", src: src });
    ask({ call: "toAST", src: src, projection: "panel" });
    ask({ call: "toAST", src: src, lang: "pt" });
    ask({ call: "toHGML", src: src });
    const xml = JSON.parse(PROTOCOL.answer(JSON.stringify({ call: "toXML", src: src }))).ok;
    if (typeof xml === "string") ask({ call: "fromXML", xml: xml });
    G.tokenize(src).forEach(t => {
      if (t.k === "open" || t.k === "bareTag") {
        ask({ call: "suggest", name: t.v });
        ask({ call: "classify", name: t.v, session: false });
        ["pt", "en"].forEach(lang => {
          const c = ask({ call: "classify", name: t.v, lang: lang });
          if (c && c.ok) ask({ call: "elName", canonical: c.ok.canonical, tier: c.ok.tier, gloss: c.ok.gloss });
        });
      }
      if (t.k === "logic") {
        const lg = ask({ call: "parseLogic", name: t.v, body: t.body });
        ((lg && lg.ok && lg.ok.rules) || []).forEach(r => {
          [r.expr, r.source].forEach(raw => {
            if (typeof raw !== "string") return;
            ask({ call: "expandExpr", raw: raw });
            ask({ call: "freeVars", raw: raw });
          });
        });
      }
    });
  });
  /* the logic blocks and expressions logic.json records, for the Logic
     encoder the corpus alone reaches in nine blocks */
  const LOGIC = JSON.parse(fsx.readFileSync(path.join(mods, "logic.json"), "utf8"));
  LOGIC.parseLogic.forEach(([name, body]) => ask({ call: "parseLogic", name: name, body: body }));
  LOGIC.expandExpr.forEach(([raw]) => ask({ call: "expandExpr", raw: raw }));
  LOGIC.freeVars.forEach(([raw]) => ask({ call: "freeVars", raw: raw }));
  /* the lines that are not a call, and the fields that are not strings */
  ["", "nope", "null", "[]", "7", "{}", "{\"call\":\"zz\"}", "{\"call\":\"tokenize\"}", "{\"call\":\"toXML\",\"src\":7}",
   "{\"call\":\"classify\",\"name\":\"CX\",\"lang\":\"xx\"}", "{\"call\":\"elName\",\"canonical\":\"CRIT\"}",
   "{\"call\":\"parseLogic\",\"name\":\"a\",\"body\":\"x = 1\\ny > x\"}", "{\"call\":\"expandExpr\",\"raw\":\"a && !b || c >= 2\"}",
   "{\"call\":\"fromXML\",\"xml\":\"<glyph>\"}", "{\"call\":\"suggest\",\"name\":\"crti\"}", "{\"call\":\"suggest\",\"name\":\"constructor\"}",
   "{\"call\":\"classify\",\"name\":\"toString\"}"].forEach(ask);
  fsx.writeFileSync(path.join(mods, "protocol.json"), JSON.stringify({ engine: G.VERSION, lines: lines }, null, 1) + "\n");
  console.log("  ! protocol written: " + lines.length + " requests to " + path.join(mods, "protocol.json"));
}

if (failures.length) {
  console.error("\nFAILED: " + failures.join(", "));
  process.exit(1);
}
console.log("\nAll green.");
