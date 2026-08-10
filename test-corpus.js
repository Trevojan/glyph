/**
 * Glyph Corpus Test Suite v1.9 (test-corpus.js)
 *
 * A suíte v1.8 contava segmentos e dava PASS a qualquer coisa: nos casos
 * negativos ela incrementava o contador nos três ramos (inclusive no catch e
 * no ramo "sem erro"), então 9/9 era verdade por construção, não por mérito.
 * Esta versão faz asserções sobre a AST e sobre o XML, e sai com código != 0.
 *
 * Três baldes, porque o desenho do Glyph distingue três coisas que a v1.8
 * amontoava em "negativo":
 *
 *   P — positivo    : parseia limpo, nenhum diagnóstico de severidade `fix`.
 *   I — incompleto  : falta informação. NÃO é erro: vira <needs> no XML e a
 *                     entrada continua utilizável ("casa vazia não bloqueia").
 *   N — inválido    : sintaxe ou vocabulário quebrado, severidade `fix`.
 *   R — regressão   : os buracos da v1.8 que a unificação fechou.
 */

"use strict";

const G = require("./glyph-parser.js");

/* Os stores viajam por opts nos casos que precisam deles, para que a suíte não
   dependa do estado global do módulo nem da ordem dos testes. */
const TPL = require("./glyph-templates.json");
const RULESTORE = require("./glyph-rules.json");
const WITH_TPL = { templates: TPL.templates };
const WITH_RULES = { rules: RULESTORE };

/* ------------------------------------------------------------------ *
 * casos
 * ------------------------------------------------------------------ */

const POSITIVE = [
  { id:"P-01", name:"Resuma isto.", src:"[SUM]",
    xml:["<summary>", "<needs>o que resumir</needs>"] },
  { id:"P-02", name:"Resuma isto, passo a passo.", src:"[SUM'step by step']",
    xml:["<summary>", "<user-input>step by step</user-input>"], clean:true },
  { id:"P-03", name:"Critique, considerando o contexto.", src:"[CRIT[CTX]]",
    cmds:["CRIT","CTX"] },
  { id:"P-04", name:"Critique e pergunte.", src:"[CRIT[CTX],[ASK;",
    cmds:["CRIT","CTX","ASK"] },
  { id:"P-05", name:"Compare dois termos.", src:"[CMP'termo1','termo2']",
    clean:true, xml:["<compare>"] },
  { id:"P-06", name:"Revise, melhore e formate.", src:"[REV-IMPR-FMT]",
    clean:true, cmds:["CRIT","IMPR","FMT"], xml:["<criticize>","<improve/>","<format/>"] },
  { id:"P-07", name:"Seção A: critique e proponha.", src:"[SECTION'sectA',[CRIT],[PROP[ALT]]]",
    cmds:["SECTION","CRIT","PROP","ALT"] },
  { id:"P-08", name:"Comparação prefixa gt.", src:"[COND[gt[VAR'A'],[VAR'B']],[INSTOF[SUM],[ASK;",
    cmds:["COND","GT","VAR","VAR","INSTOF","SUM","ASK"] },
  { id:"P-10", name:"Invocação de template.", src:"[--REVCHECK]",
    xml:['<template name="REVCHECK"/>'] },
  { id:"P-13", name:"Valor default.", src:"[DEF]", clean:true, xml:["<define/>"] },
  { id:"P-14", name:"Emoção com entusiasmo.", src:"/eth/[BRST'3']",
    clean:true, xml:['<mood dominant="entusiasmo"/>'] },
  { id:"P-15", name:"Bloco B: verifique e conclua.", src:"[BLOCK'blockB',[VRFY],[CNCL]]",
    cmds:["BLOCK","VRFY","CNCL"] },
  { id:"P-16", name:"Fronteira de segmento.", src:"[SUM];[LIM]", segments:2 },
  { id:"P-17", name:"Literal as-is.", src:"[INS[RWK'as-is']]",
    clean:true, xml:["<user-input>as-is</user-input>"] },
  { id:"P-18", name:"Auto-close triplo.", src:"[INS[ASSM[ASK;",
    cmds:["INS","ASSM","ASK"] },
  { id:"P-19", name:"Define símbolo com DFN.", src:"[DFN'API','Interface de Programação']",
    clean:true, xml:["<define-symbol>"] },
  { id:"P-20", name:"Validar contra especificação.", src:"[VAL'solução','especificação']",
    clean:true, xml:["<validate>"] },
  { id:"P-21", name:"Alias EVAL resolve para CRIT.", src:"[EVAL'projeto']",
    clean:true, cmds:["CRIT"], xml:["<criticize>"] },
  { id:"P-22", name:"Alias SPEC resolve para ELAB.", src:"[SPEC'requisito']",
    clean:true, cmds:["ELAB"] },
  { id:"P-23", name:"Slots de CTX (what, where, when).", src:"[CTX'banco','prodDB','v1.7']",
    clean:true, xml:["<context>","<user-input>prodDB</user-input>"] }
];

const INCOMPLETE = [
  { id:"I-01", name:"IF sem condição vira <needs>", src:"[IF;",
    code:"UnfilledSlot", xml:["<needs>a condição</needs>"] },
  { id:"I-02", name:"CMP com um só termo avisa", src:"[CMP'a']",
    code:"SingletonList" },
  { id:"I-06", name:"Template não definido nesta sessão", src:"[--NAOEXISTE]",
    code:"UndefinedTemplate" },
  { id:"I-08", name:"GT sem o segundo termo", src:"[gt'A']",
    code:"MissingOperand", xml:['<needs slot="2">o segundo termo</needs>'] },
  { id:"I-09", name:"DFN sem o significado", src:"[DFN'símbolo']",
    code:"MissingOperand", xml:['<needs slot="2">o significado</needs>'] },
  { id:"I-10", name:"VAL sem critério externo", src:"[VAL'alvo']",
    code:"MissingOperand", xml:['<needs slot="2">o critério externo</needs>'] }
];

const INVALID = [
  { id:"N-03", name:"SECTION sem nome literal", src:"[SECTION,[CRIT]]",
    code:"MissingStructName" },
  { id:"N-04", name:"Extensão pendurada", src:"[COND-]",
    code:"DanglingChain" },
  { id:"N-05", name:"Literal não fechado", src:"[SUM'abc",
    code:"UnterminatedLiteral" },
  { id:"N-09", name:"FAIL fora do vocabulário", src:"[IF[INS[FAIL]],[MAND[FMT]",
    code:"UnknownCommand", xml:['<unresolved tag="FAIL"'] },
  { id:"N-11", name:"ERROR fora do vocabulário", src:"[CRIT[CTX],[IF[ERROR],[WARN];",
    code:"UnknownCommand" },
  { id:"N-12", name:"ABREV fora do vocabulário", src:"[AVD[ABREV'X']]",
    code:"UnknownCommand" },
  { id:"N-13", name:"] sem comando aberto", src:"[SUM]]",
    code:"UnmatchedCloseBracket" },
  { id:"N-14", name:"[logic] sem [/logic]", src:"[logic]a = 1",
    code:"UnclosedLogic" },
  { id:"N-15", name:"[/sum] fecha comando não aberto", src:"[crit][/sum]",
    code:"UnmatchedCloseTag" },
  { id:"N-16", name:"[ sem nome", src:"[ ]",
    code:"EmptyCommandName" },
  { id:"N-17", name:"Definição de template sem corpo", src:"[--t=",
    code:"EmptyTemplateDefinition" }
];

/* Os quatro buracos da v1.8: tokens que o parser standalone descartava em
   silêncio, mais o vazamento do sufixo de dados no bloco [logic]. */
const REGRESSION = [
  { id:"R-01", name:"cadeia com hífen preserva todos os elos", src:"[REV-IMPR-FMT]",
    cmds:["CRIT","IMPR","FMT"] },
  { id:"R-02", name:"texto livre sobrevive como <off>", src:"[INS] escreva isto aqui",
    xml:["<off>escreva isto aqui</off>"] },
  { id:"R-03", name:";; emite quebra em vez de sumir", src:"[SUM];;[LIM]",
    xml:["<break/>"] },
  { id:"R-04", name:"bloco [logic] chega ao XML", src:"[logic-dano]\nhp = 3d6kh2\n[/logic]",
    xml:['<logic name="dano">', '<rule kind="let" var="hp">'] },
  { id:"R-05", name:"sufixo kh não vaza como variável", src:"[logic]\nroll = 4d6kh3\n[/logic]",
    xmlAbsent:['<needs var="kh3">'] }
];

/* Blocos longos: em Glyph todo `[` sem `]` aninha, então uma query comprida
   fica funda, não larga. Estes casos travam as três quebras que isso causava. */
const LONG = [
  { id:"L-01", name:"emissor XML não estoura a pilha em 8000 níveis",
    src:"[ins".repeat(8000) + ";", noThrow:true },
  { id:"L-02", name:"AST não estoura, trunca com marcador",
    src:"[ins".repeat(2000) + ";", noThrow:true, astTruncated:true },
  { id:"L-03", name:"indentação tem teto: XML cresce linear, não ao quadrado",
    src:"[ins".repeat(400) + ";", maxXmlBytes:40000 },
  { id:"L-04", name:"bloco r- preserva o conteúdo, não só o sumário",
    src:"r-[tgt`user command blocks`[skep[crit-[scru",
    xml:["<user-input>user command blocks</user-input>", 'expects="target,skeptic,criticize,scrutinize"'] },
  { id:"L-05", name:"aninhamento profundo é sinalizado",
    src:"[ins".repeat(12) + ";", code:"DeepNesting" },
  { id:"L-06", name:"`;` fechando muita coisa de uma vez é sinalizado",
    src:"[ins".repeat(12) + ";", code:"MassAutoClose" },
  { id:"L-07", name:"comando escrito sem colchete não vira prosa calada",
    src:"rd [ctx'engine']", code:"LooseCommandWord" },
  { id:"L-08", name:"prosa comum não vira falso positivo",
    src:"[ins`x`] uma frase inteira de prosa aqui", codeAbsent:"LooseCommandWord" }
];

/* Templates: até a v1.9.1 a invocação não trazia o corpo da definição, nem na
   mesma mensagem. Quem ligava as pontas era o leitor. */
const TEMPLATES = [
  { id:"T-01", name:"invocação expande o corpo da definição",
    src:"[--germinate'analise','clareza']", opts:WITH_TPL,
    xml:['expanded="true"', "<skill>", "<user-input>tree logic structure</user-input>"] },
  { id:"T-02", name:"ligação posicional preenche na ordem declarada",
    src:"[--germinate'analise','clareza']", opts:WITH_TPL,
    xml:['<user-input slot="alvo">analise</user-input>',
         '<user-input slot="criterio">clareza</user-input>'] },
  { id:"T-03", name:"ligação por nome preenche a casa certa",
    src:"[--germinate[ph-criterio'clareza']]", opts:WITH_TPL,
    xml:['<user-input slot="criterio">clareza</user-input>', '<needs slot="alvo">'] },
  { id:"T-04", name:"casa não preenchida vira <needs>, não bloqueia",
    src:"[--germinate]", opts:WITH_TPL,
    xml:['<needs slot="alvo">', '<needs slot="criterio">'], noFix:true },
  { id:"T-05", name:"conteúdo extra da chamada sobrevive à expansão",
    src:"[--germinate'a','b'[mand[tgt`extra`]]]", opts:WITH_TPL,
    xml:["<mandatory>", "<user-input>extra</user-input>"] },
  { id:"T-06", name:"a glosa do template viaja como means",
    src:"[--germinate'a','b']", opts:WITH_TPL, xml:['means="'] },
  { id:"T-07", name:"ciclo direto é interrompido e reportado",
    src:"[--loop]", code:"TemplateCycle",
    opts:{ templates:{ loop:{ body:"[--loop]", params:[] } } } },
  { id:"T-08", name:"ciclo indireto também",
    src:"[--a]", code:"TemplateCycle",
    opts:{ templates:{ a:{ body:"[--b]", params:[] }, b:{ body:"[--a]", params:[] } } } },
  { id:"T-09", name:"sintaxe quebrada no corpo armazenado sobe",
    src:"[--quebrado]", code:"UnterminatedLiteral",
    opts:{ templates:{ quebrado:{ body:"[sum'abc", params:[] } } } },
  { id:"T-10", name:"template desconhecido continua sendo só aviso",
    src:"[--naoexiste]", opts:WITH_TPL, code:"UndefinedTemplate", noFix:true }
];

/* Regras semânticas: pares, ordem e pré-condição. É o critério que faltava
   para "os comandos não se contradizem". */
const RULE_CASES = [
  { id:"C-01", name:"par: mand + opt irmãos", src:"[mand'x'][opt'x']", opts:WITH_RULES,
    code:"Rule:mand-opt", requireFix:true },
  { id:"C-02", name:"par: mand ancestral de opt", src:"[mand[opt'x']]", opts:WITH_RULES,
    code:"Rule:mand-opt" },
  { id:"C-03", name:"par: alw + nev", src:"[alw][nev]", opts:WITH_RULES,
    code:"Rule:alw-nev", requireFix:true },
  { id:"C-04", name:"redundância: req + dont é ask, não fix", src:"[req'log'][dont'log']",
    opts:WITH_RULES, code:"Rule:req-dont", noFix:true },
  { id:"C-05", name:"enfraquecimento: ins + opt", src:"[ins'x'][opt'x']",
    opts:WITH_RULES, code:"Rule:ins-opt", noFix:true },
  { id:"C-06", name:"[ovr] isenta: a sobreposição foi pedida", src:"[ovr[mand'x'][opt'x']]",
    opts:WITH_RULES, codeAbsent:"Rule:mand-opt" },
  { id:"C-07", name:"cmp + dist continua não sendo regra", src:"[cmp'a','b'][dist'a','b']",
    opts:WITH_RULES, codeAbsent:"Rule:" },
  { id:"C-08", name:"crit + impr continua não sendo regra", src:"[crit'x'][impr'x']",
    opts:WITH_RULES, codeAbsent:"Rule:" },
  { id:"C-09", name:"sem store carregado, nada é checado", src:"[mand'x'][opt'x']",
    opts:{}, codeAbsent:"Rule:" },
  { id:"C-10", name:"ordem: thinking antes de elab", src:"[crit'x'][elab'x']",
    opts:WITH_RULES, code:"Rule:elab-before-thinking" },
  { id:"C-11", name:"ordem correta não acusa", src:"[elab'x'][crit'x']",
    opts:WITH_RULES, codeAbsent:"Rule:elab-before-thinking" },
  { id:"C-12", name:"pré-condição: brst sem enquadramento", src:"[brst'ideias']",
    opts:WITH_RULES, code:"Rule:brst-needs-frame" },
  { id:"C-13", name:"pré-condição satisfeita por [ctx]", src:"[ctx'motor'][brst'ideias']",
    opts:WITH_RULES, codeAbsent:"Rule:brst-needs-frame" },
  { id:"C-14", name:"pré-condição: hyp sem sujeito", src:"[hyp'talvez X']",
    opts:WITH_RULES, code:"Rule:hyp-needs-subject" },
  { id:"C-15", name:"o reparo sugerido viaja na mensagem", src:"[pos'x'][ngt'x']",
    opts:WITH_RULES, code:"Rule:pos-ngt", messageHas:"pos + cond + ngt" }
];

/* Guarda: as regras não podem transformar uso normal em erro. Roda o corpus
   positivo com o store carregado e exige que nada vire `fix`. */
const POSITIVE_WITH_RULES = POSITIVE.map(tc => ({
  id: tc.id + "+R", name: tc.name + " (com regras)",
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

/** Roda um caso e devolve a lista de motivos de falha (vazia = passou). */
function check(tc, rules) {
  const why = [];
  let res, xml, astJson;
  try {
    res = G.parse(tc.src, tc.opts);
    xml = G.buildXml(res.segments);
    // serializar E stringificar: JSON.stringify do V8 recursa e é onde estourava
    const ast = G.serializeAST(res.segments, res.gaps);
    astJson = JSON.stringify(ast);
    if (tc.astTruncated && !ast.truncatedNodes)
      why.push("esperava truncamento marcado na AST, não veio");
  } catch (err) {
    return ["exceção inesperada (" + err.constructor.name + "): " + err.message.slice(0, 60)];
  }

  if (tc.maxXmlBytes && xml.length > tc.maxXmlBytes)
    why.push("XML com " + xml.length + " bytes, esperava no máximo " + tc.maxXmlBytes +
             " — indentação provavelmente voltou a ser quadrática");

  // prefixo, para que "Rule:" cubra qualquer regra semântica
  if (tc.codeAbsent && res.gaps.some(g => String(g.code).startsWith(tc.codeAbsent)))
    why.push("veio o código " + tc.codeAbsent + ", que não devia aparecer: " +
             res.gaps.map(g => g.code).join(", "));

  if (tc.messageHas && !res.gaps.some(g => g.plain.includes(tc.messageHas)))
    why.push("nenhuma mensagem contém: " + tc.messageHas);

  const fix = res.gaps.filter(g => g.sev === "fix");
  const codes = res.gaps.map(g => g.code);

  // o caso pode sobrescrever a regra do grupo
  const wantNoFix = tc.noFix !== undefined ? tc.noFix : rules.noFix;
  const wantFix = tc.requireFix !== undefined ? tc.requireFix : rules.requireFix;

  if (wantNoFix && fix.length)
    why.push("esperava zero diagnósticos `fix`, veio: " + fix.map(g => g.code).join(", "));

  if (wantFix && !fix.length)
    why.push("esperava ao menos um diagnóstico `fix`, não veio nenhum");

  if (tc.clean && res.gaps.length)
    why.push("esperava nenhum diagnóstico, veio: " + codes.join(", "));

  if (tc.code && codes.indexOf(tc.code) === -1)
    why.push("esperava o código " + tc.code + ", veio: " + (codes.join(", ") || "nenhum"));

  if (tc.code && wantFix) {
    const hit = res.gaps.filter(g => g.code === tc.code)[0];
    if (hit && hit.sev !== "fix")
      why.push(tc.code + " veio com severidade `" + hit.sev + "`, esperava `fix`");
  }

  if (tc.cmds) {
    const got = commandsOf(res);
    if (got.join(",") !== tc.cmds.join(","))
      why.push("comandos [" + got.join(",") + "] != esperado [" + tc.cmds.join(",") + "]");
  }

  if (tc.segments !== undefined && res.segments.length !== tc.segments)
    why.push("segmentos " + res.segments.length + " != " + tc.segments);

  (tc.xml || []).forEach(frag => {
    if (xml.indexOf(frag) === -1) why.push("XML não contém: " + frag);
  });
  (tc.xmlAbsent || []).forEach(frag => {
    if (xml.indexOf(frag) !== -1) why.push("XML contém o que não devia: " + frag);
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

const rP = runGroup("Positivos — parseiam limpo", POSITIVE, { noFix:true });
const rI = runGroup("Incompletos — viram <needs>, não bloqueiam", INCOMPLETE, { noFix:true });
const rN = runGroup("Inválidos — exigem diagnóstico `fix`", INVALID, { requireFix:true });
const rR = runGroup("Regressões v1.8 fechadas na v1.9", REGRESSION, { noFix:false });
const rL = runGroup("Blocos longos — a engine não pode quebrar", LONG, { noFix:false });
const rT = runGroup("Templates — invocação expande a definição", TEMPLATES, { noFix:false });
const rC = runGroup("Regras semânticas — par, ordem, pré-condição", RULE_CASES, { noFix:false });
const rG = runGroup("Guarda — regras não podem quebrar uso normal", POSITIVE_WITH_RULES, { noFix:true });

console.log("\n=================================================");
console.log(" Positivos   " + rP + "/" + POSITIVE.length);
console.log(" Incompletos " + rI + "/" + INCOMPLETE.length);
console.log(" Inválidos   " + rN + "/" + INVALID.length);
console.log(" Regressões  " + rR + "/" + REGRESSION.length);
console.log(" Blocos long " + rL + "/" + LONG.length);
console.log(" Templates   " + rT + "/" + TEMPLATES.length);
console.log(" Regras      " + rC + "/" + RULE_CASES.length);
console.log(" Guarda      " + rG + "/" + POSITIVE_WITH_RULES.length);
console.log("=================================================");

if (failures.length) {
  console.error("\nFALHOU: " + failures.join(", "));
  process.exit(1);
}
console.log("\nTudo verde.");
