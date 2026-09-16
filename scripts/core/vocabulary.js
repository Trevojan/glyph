/**
 * core/vocabulary.js — Appendix A, one slot per command, and the maps read
 * off it in both directions.
 *
 * The tables (CATS, INSTR, ALIAS, STRUCT, META, MODE, EMO, SESSION, FRAMES,
 * SLOTS, …) are what a name IS to the engine; `elName` is the name a command
 * wears in the emitted document; GLOSS_REVERSE and ELEMENT_INPUT are that
 * same naming read backwards, built here so the two directions cannot drift
 * apart. The seam graph found the reverse maps declared in the inverse's
 * section and reached from the lexer and the emitter — three inbound edges on
 * a seam that should have none. They are vocabulary; this is where they live.
 * Imports nothing.
 */

/* ======================================================
   1. VOCABULARY — Appendix A, one slot per command
   ======================================================

   LANGUAGE BOUNDARY. Everything that reaches the deliverable is English:
   INSTR glosses (which become the XML element names), FRAMES and SLOTS
   (which become <needs>), EMO (which becomes <mood>), and the definitions
   extracted from GLOSSARY.md.

   CATS below is the exception, and deliberately so: its labels and glosses
   exist only to drive the interface — the category browser, the search box
   and the tooltip — and the interface is pt-BR. They feed PTBR and CAT_OF,
   both consumed by glyph-ui.js and by two diagnostic messages, which are
   also screen text.

   That mixing is the next data-engineering step, not an oversight: engine
   data and interface data should not share a file. Moving CATS out means
   giving glyph-ui.js its own vocabulary table, which is a change to the
   interface contract and wants to be its own commit. */

export var CATS = [
  { id:"acao", label:"Ação", note:"operar sobre algo que já existe", items:[
    ["RWK","retrabalhar"],["FMT","formatar"],["IMPR","melhorar"],["SIMP","simplificar"],
    ["ELAB","detalhar"],["ITR","iterar"],["GEN","generalizar"],["SPEC","especificar"],
    ["SUM","resumir"],["CAT","categorizar"]
  ]},
  { id:"juizo", label:"Juízo", note:"medir algo que já existe", items:[
    ["REV","revisar"],["CRIT","criticar"],["SCRU","escrutinar"],["PROB","problema"],
    ["EVAL","avaliar"],["VRFY","verificar"],["VAL","validar"],["SKEP","ser cético"],
    ["CMP","comparar"],["DIST","distinguir"],["TRUE","verdadeiro"],["FLS","falso"],
    ["POS","positivo"],["NGT","negativo"],["ERROR","erro"],["REAL","realista"]
  ]},
  { id:"pergunta", label:"Pergunta", note:"obter o que falta", items:[
    ["QST","pergunta"],["ASK","pergunte"],["CLAR","esclarecer"],["CONF","confirmar"]
  ]},
  { id:"enquadre", label:"Enquadre", note:"situar a coisa no mundo", items:[
    ["CTX","contexto"],["REF","referência"],["SEEAL","veja também"],["CORE","fundamento, ponto de partida"],
    ["DRVF","derivar de"],["EX","exemplo"],["FOREX","por exemplo"],["NT","nota"],["PT","parte n"]
  ]},
  /* Operating ON the context, not merely sitting in it. Splitting this from
     "enquadre" is what separates declaring a scope from reading, writing and
     locating inside one. */
  { id:"contexto", label:"Contexto", note:"ler, escrever e localizar no escopo", items:[
    ["FIND","buscar no contexto"],["GET","ler e reter"],["ADD","acrescentar"],
    ["SUB","subtrair"],["WHR","onde, lugar"]
  ]},
  { id:"condicao", label:"Condição", note:"quando vale, quando não, o que entra no lugar", items:[
    ["COND","condição"],["IF","se"],["UNLS","a menos que"],["ONLYIF","só se"],
    ["ONLYW","só quando"],["EXC","exceção"],["FBK","plano B"],["INSTOF","em vez de"],
    ["SWITCH","alternar entre estados"]
  ]},
  { id:"limite", label:"Limite", note:"o que é proibido, exigido ou opcional", items:[
    ["CNST","restrição"],["RESTR","limite"],["LIM","limitação"],["REQ","exigência"],
    ["MAND","obrigatório"],["OPT","opcional"],["AVD","evitar"],["DONT","não faça"],
    ["DENY","negar"],["NEV","nunca"],["ALW","sempre"],["DEPR","obsoleto"]
  ]},
  { id:"raciocinio", label:"Raciocínio", note:"construir e explorar ideia", items:[
    ["RSN","motivo"],["RTNL","racional"],["JUST","justificar"],["HYP","hipótese"],
    ["IMAG","imagine"],["BRST","brainstorm"],["CNSD","considere"],["ALT","alternativa"],
    ["PROP","propor"],["ASSM","suposição"],["CTRD","contradizer"],["CNCL","concluir"],
    ["TRYFR","tenta chegar em"],["INTN","intenção"]
  ]},
  { id:"rumo", label:"Rumo", note:"alvo, ordem e prontidão", items:[
    ["TGT","alvo"],["PRIO","prioridade"],["FIN","por fim"],["RDY","prontidão"],["INS","instrução"],
    ["GO","executa, vai"]
  ]},
  /* Degree. PRIO orders items against each other; these grade a single item —
     how much force it carries (HGH/LOW) and how much weight it gets in the
     output (BOLD/LIGHT). */
  { id:"intensidade", label:"Intensidade", note:"grau de força e de ênfase", items:[
    ["HGH","alta"],["LOW","baixa"],["BOLD","ênfase forte"],["LIGHT","ênfase suave"]
  ]},
  { id:"molde", label:"Molde", note:"peças de estrutura e template", items:[
    ["TPL","template"],["PH","casa a preencher"],["VAR","variável"],["PARAM","parâmetro"],
    ["DEF","define"],["SECTION","seção"],["BLOCK","bloco"],["LOGIC","bloco de conta"],["SKL","skill"]
  ]},
  { id:"marca", label:"Marca", note:"aviso e memória", items:[
    ["WARN","aviso"],["RMBR","lembre"],["FRGT","esqueça"],["LRN","aprender"],
    ["BYP","contornar"],["OVR","sobrepor"]
  ]}
];

export var INSTR = {
  INS:"Instruction", BYP:"Bypass", ONLYW:"Only When", AVD:"Avoid", NT:"Note",
  WARN:"Warning", EX:"Example", CTX:"Context", REF:"Reference", COND:"Condition",
  EXC:"Exception", PRIO:"Priority", OVR:"Override", FBK:"Fallback", CNST:"Constraint",
  REQ:"Requirement", OPT:"Optional", MAND:"Mandatory", DEPR:"Deprecated", PH:"Placeholder",
  VAR:"Variable", PARAM:"Parameter", FMT:"Format", TPL:"Template", SUM:"Summary",
  CLAR:"Clarification", CONF:"Confirmation", RESTR:"Restriction", ONLYIF:"Only If",
  UNLS:"Unless", INSTOF:"Instead Of", FOREX:"For Example", SEEAL:"See Also", DONT:"Do Not",
  PT:"Part", RSN:"Reason", TGT:"Target", QST:"Question", TRYFR:"Try For Result", PROB:"Problem",
  SKEP:"Skeptic", IMAG:"Imagine", RMBR:"Remember", FRGT:"Forget",
  ITR:"Iterate", CMP:"Compare", CTRD:"Contradict", SIMP:"Simplify", ELAB:"Elaborate",
  HYP:"Hypothesis", EVAL:"Evaluate", BRST:"Brainstorm", RTNL:"Rationale", ALT:"Alternative",
  LIM:"Limitation", VRFY:"Verify", CNSD:"Consider", GEN:"Generalise", SPEC:"Specify",
  CNCL:"Conclude", PROP:"Propose", JUST:"Justify", DIST:"Distinguish", CAT:"Categorise",
  POS:"Positive", NGT:"Negative", REAL:"Realistic", FIN:"Finally", RWK:"Rework",
  CRIT:"Criticise", SCRU:"Scrutinise", NEV:"Never", ALW:"Always", RDY:"Ready",
  INTN:"Intention", IMPR:"Improve", REV:"Review", LRN:"Learn", DRVF:"Derive From",
  FLS:"False", TRUE:"True", ERROR:"Error", ASSM:"Assumption", VAL:"Validate", ASK:"Ask",
  DENY:"Deny", CORE:"Core", DFN:"Define Symbol",
  GT:"Greater Than", GTE:"Greater Than Equal", LT:"Less Than", LTE:"Less Than Equal",
  EQ:"Equal", NEQ:"Not Equal",
  /* v1.1.0.0 — declarados em GLOSSARY.md §1/§2 e usados pelas fórmulas de
     expansions.txt, mas ausentes do motor até aqui. */
  FIND:"Find", GET:"Get", ADD:"Add", SUB:"Subtract", WHR:"Where",
  HGH:"High", LOW:"Low", BOLD:"Bold", LIGHT:"Light",
  SWITCH:"Switch", GO:"Go"
};

export var PTBR = {};
CATS.forEach(function (c) { c.items.forEach(function (it) { PTBR[it[0]] = it[1]; }); });

export var CAT_OF = {};
CATS.forEach(function (c) { c.items.forEach(function (it) { CAT_OF[it[0]] = c.label; }); });

export var EDITORIAL_ONLY = { BYP:1, OVR:1, NEV:1, ALW:1, FRGT:1 };

export var ALIAS = {
  IN:"INS", AS:"ASSM", CX:"CTX", PR:"PRIO", TG:"TGT", RY:"RDY", VL:"VAL",
  RQ:"REQ", CR:"CRIT", RW:"RWK", RV:"REV", FM:"FMT", IM:"IMPR", FN:"FIN",
  CL:"CLAR", RT:"RTNL", CN:"CNST", WN:"WARN", SM:"SUM"
  /* The v1.7 merges (FOREX→EX, QST→ASK, EVAL→CRIT, REV→CRIT, ONLYIF→COND,
     SPEC→ELAB, SIMP→CLAR) left in v1.1.0.0. Each pair had a real axis
     separating its two sides — the datum vs. the connective that introduces
     it, the block's typing vs. the act aimed at someone, the standard a
     comparison is made against — and folding them erased the axis along with
     the command. All seven already had their own INSTR entry; classify()
     consults ALIAS *before* INSTR, so merely having the line here was enough
     for the merge to win. Deleting it is the whole de-fusion.
     .guidelines/.history/GLOSSARY_CLOSED.md §6.5. */
};
export var ALIAS_OF = {};
Object.keys(ALIAS).forEach(function (a) { (ALIAS_OF[ALIAS[a]] = ALIAS_OF[ALIAS[a]] || []).push(a); });

export var STRUCT = {
  SECTION:"Section", BLOCK:"Block", IF:"If", UNLS:"Unless", SKL:"Skill",
  DEF:"Define", PH:"Placeholder", TPL:"Template", LOGIC:"Logic"
};
/* META and STRUCT are PARSING buckets, not the species taxonomy of
   GLOSSARY.md — the two axes are independent and both are needed. The
   glossary classifies by COMPOSITION (does it decompose into atoms?);
   these classify by BEHAVIOUR (does it open a named block? is it exempt
   from the slot-order warning?). A command can be an atom in one and a
   struct in the other without contradiction. */
export var META = {
  QUICK:"Quick", TOBLOCK:"To Block", TOSECTION:"To Section",
  HMN:"Human", EXT:"External", ATC:"Attachment",
  NONE:"None"                       // v1.1.0.0 — engine em GLOSSARY.md §4
};
export var MODE = { OFF:"Mode off", ON:"Mode on" };

/* Reaches the deliverable as <mood dominant="…">, so English like the rest of
   the XML. `lng` keeps its Portuguese name in the comment because "saudade"
   has no one-word English equivalent — "longing" is the closest. */
export var EMO = {
  hpy:"happiness", joy:"joy", exc:"excitement", cnt:"contentment", clm:"calm",
  ser:"serenity", pea:"peace", grt:"gratitude", hop:"hope", prd:"pride",
  lov:"love", afc:"affection", adm:"admiration", amu:"amusement", del:"delight",
  rlf:"relief", cfd:"confidence", eth:"enthusiasm", cur:"curiosity", awe:"awe",
  ply:"playfulness", chr:"cheer",
  sad:"sadness", ang:"anger", fry:"fury", fear:"fear", dis:"disdain", dsg:"disgust",
  anx:"anxiety", frs:"frustration", irr:"irritation", ann:"annoyance", env:"envy",
  jel:"jealousy", glt:"guilt", shm:"shame", reg:"regret", dsp:"despair",
  grf:"grief", lon:"loneliness", bor:"boredom", res:"resentment", btr:"bitterness",
  ctm:"contempt", hum:"humiliation", emb:"embarrassment", pan:"panic", drd:"dread",
  ter:"terror", exh:"exhaustion", str:"stress", ovw:"overwhelm", ins:"insecurity",
  apt:"apathy", num:"numbness", mel:"melancholy",
  cnf:"confusion", dbt:"doubt", sus:"suspicion", skp:"scepticism", nos:"nostalgia",
  lng:"longing", vul:"vulnerability", emp:"empathy", cmp:"compassion", sym:"sympathy",
  trs:"trust", bet:"betrayal", ind:"indifference", ant:"anticipation",
  imp:"impatience", sur:"surprise"
};

/* "prob" left this table: now that PROB is a registered INSTR tag
   (ERROR+CTX), classify() would resolve it before ever reaching this
   block anyway — it would sit here as dead vocabulary, unreachable
   under any casing.

   "go" left for the same reason in v1.1.0.0: GO is now a command
   (GLOSSARY.md §1), and INSTR is consulted before SESSION. Leaving it
   would be a second, unreachable definition of the same word. */
export var SESSION = {
  rd:"read", info:"information", org:"organise",
  ok:"ok, understood", dtl:"detail"
};

export var LOGIC_OPS = [
  ["pb[x]","arredonda pra baixo — floor(x)"],
  ["pc[x]","arredonda pra cima — ceil(x)"],
  ["ar[x]","arredonda normal — round(x)"],
  ["<n","no máximo n (teto)"],
  [">n","no mínimo n (piso)"],
  ["NdX","rola N dados de X faces — ex. 3d6"],
  ["4d6kh3","rola e mantém os 3 maiores (kl = menores)"],
  ["?","se"],["!","a menos que / não"],["->","então"],[".dbl","tem duplas"]
];

export var PUNCT = [
  ["'texto'","texto literal — sem shift"],
  [";","fecha o bloco"],
  [";;","quebra a resposta em duas"],
  [",","lista itens / continua cadeia"],
  ["-","encadeia: [rw-cr"],
  ["r-","o que eu devo devolver"],
  ["[--nome","chama template"],
  ["[--nome=","define template"],
  ["[=","este bloco continua do anterior"],
  ["[logic-nome]","abre bloco de conta"]
];

/* valency: what each command needs to receive to be determinate.
   SECTION and BLOCK enter here in v1.0.9 to match SIGNATURES.md, which
   already assigned them minimum arity 1. */
export var FRAMES = {
  INS:["what to do"], TRYFR:["the desired result"], PROP:["what to propose"],
  IMPR:["what to improve"], REV:["what to review"], CRIT:["what to criticise"],
  RWK:["what to rework"], FMT:["what to format"], SUM:["what to summarise"],
  SCRU:["what to scrutinise"], VRFY:["what to verify"], VAL:["what to validate"],
  SKEP:["sceptical about what"], SIMP:["what to simplify"], ELAB:["what to elaborate"],
  ASK:["what to ask"], QST:["the question"], CLAR:["what to clarify"],
  IMAG:["the situation"], HYP:["the hypothesis"], BRST:["the topic"],
  CNSD:["the factors*"], CMP:["the terms*"], CAT:["the items*"], ALT:["the options*"],
  DIST:["the terms*"],
  CTX:["what it refers to"], REF:["what it refers to"], SEEAL:["what it refers to"],
  TGT:["the target"], BYP:["what to bypass"], DRVF:["the origin"],
  COND:["the condition"], IF:["the condition"], UNLS:["the condition"],
  ONLYIF:["the condition"], ONLYW:["the condition"], EXC:["the exception"],
  RSN:["the reason"], RTNL:["the rationale"], JUST:["the justification"],
  EX:["the case"], FOREX:["the case"], REQ:["the requirement"],
  CNST:["the limit"], RESTR:["the limit"], AVD:["what to avoid"],
  DONT:["what not to do"], DENY:["what to deny"], ASSM:["what is assumed"],
  NT:["the observation"], WARN:["the risk"], LIM:["the limit"],
  EVAL:["what to evaluate"], CNCL:["about what"], ITR:["what to iterate"],
  GEN:["what to generalise"], SPEC:["what to specify"], INSTOF:["what takes its place"],
  SECTION:["the section name"], BLOCK:["the block name"],
  /* Only operators belong here. WHR, HGH, LOW, BOLD and LIGHT are primitives
     in the glossary ("stand alone"), so they require no operand and never
     produce <needs>. */
  FIND:["what to find"], GET:["what to read from the context"],
  ADD:["what to add"], SUB:["what to subtract"],
  SWITCH:["the states*"], GO:["what to execute"]
};



/* structural commands whose first child must be a literal (the name) */
export var NAMED_STRUCT = { SECTION:1, BLOCK:1 };

/* Mandatory ordered slots — SIGNATURES.md §3 (prefix comparison) and the
   arity-2 signatures. FRAMES only models the first slot; here each missing
   position becomes a <needs slot="…"> in the XML, instead of silently
   vanishing. */
export var SLOTS = {
  GT: ["the first term", "the second term"],
  GTE:["the first term", "the second term"],
  LT: ["the first term", "the second term"],
  LTE:["the first term", "the second term"],
  EQ: ["the first term", "the second term"],
  NEQ:["the first term", "the second term"],
  DFN:["the symbol", "the meaning"],
  VAL:["what to validate", "the external criterion"]
};

export function elName(canonical, tier, gloss) {
  if (tier === "session") return canonical;
  if (tier === "blend") return String(canonical).toLowerCase();
  var g = gloss || canonical;
  return g.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || String(canonical).toLowerCase();
}



/* classify() probes MODE → STRUCT → META → ALIAS → INSTR; the reverse map is
   built in that same order with the first writer winning, which is what
   makes it the inverse of classify() rather than a lookup that merely
   agrees with it. PH, TPL and UNLS sit in two tables each and resolve to
   STRUCT for precisely this reason. ALIAS needs no entry: an alias carries
   the canonical's own gloss, so elName() already lands on the same element.
   GLOSS_COLLISIONS should stay empty — a test asserts it, so that editing
   the vocabulary later cannot introduce an ambiguity in silence. */
export var GLOSS_REVERSE = {}, GLOSS_COLLISIONS = [];
[["mode", MODE], ["struct", STRUCT], ["meta", META], ["instr", INSTR]]
  .forEach(function (pair) {
    var tier = pair[0], table = pair[1];
    Object.keys(table).forEach(function (canon) {
      var el = elName(canon, tier, table[canon]);
      if (GLOSS_REVERSE[el]) {
        if (GLOSS_REVERSE[el].canonical !== canon)
          GLOSS_COLLISIONS.push({ element:el, kept:GLOSS_REVERSE[el].canonical, dropped:canon });
        return;
      }
      GLOSS_REVERSE[el] = { canonical:canon, tier:tier };
    });
  });

/* ------------------------------------------------------------------ *
 * ELEMENT_INPUT — the element's own name, accepted as an input spelling
 *
 * The inverse accepts `<note>` and answers NT. The forward parser refused
 * `[NOTE` — and not as one oversight: measured, ALL 98 element names whose
 * spelling differs from the canonical were refused. So the author who read
 * the emitted document and wrote back what they saw was refused by an
 * asymmetry rather than by a decision.
 *
 * This is derived from GLOSS_REVERSE rather than typed out as 98 alias
 * lines, so the two directions cannot drift apart: they are the same table
 * read from both ends.
 *
 * Keyed on the element name with its separators SQUASHED, because `-` is the
 * chain operator — `[instead-of` is a chain of INSTEAD and OF, and always
 * will be. `[insteadof` is the spelling this opens.
 *
 * A name that any existing table already claims is left alone: MODE, STRUCT,
 * META, ALIAS and INSTR all win, and a key two elements would share is
 * dropped rather than resolved by luck.
 * ------------------------------------------------------------------ */
export var ELEMENT_INPUT = {}, ELEMENT_INPUT_COLLISIONS = [];
Object.keys(GLOSS_REVERSE).forEach(function (el) {
  var key = el.toUpperCase().replace(/[^A-Z0-9]+/g, "");
  var hit = GLOSS_REVERSE[el];
  if (!key || key === hit.canonical) return;
  if (MODE[key] || STRUCT[key] || META[key] || ALIAS[key] || INSTR[key]) return;
  if (ELEMENT_INPUT[key]) {
    if (ELEMENT_INPUT[key].canonical !== hit.canonical)
      ELEMENT_INPUT_COLLISIONS.push({ spelling:key, kept:ELEMENT_INPUT[key].canonical, dropped:hit.canonical });
    return;
  }
  ELEMENT_INPUT[key] = { canonical:hit.canonical, tier:hit.tier };
});
Object.keys(ELEMENT_INPUT).forEach(function (k) {
  if (ELEMENT_INPUT_COLLISIONS.some(function (c) { return c.spelling === k; })) delete ELEMENT_INPUT[k];
});

export var EMO_REVERSE = {};
Object.keys(EMO).forEach(function (k) { EMO_REVERSE[String(EMO[k]).toLowerCase()] = k; });
