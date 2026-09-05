/**
 * Glyph Core v1.2.0 (glyph-parser.js)
 *
 * Single core of the chain  human → glyph → xml → machine.
 *
 * Through v1.8 there were two divergent parsers: this module (which only
 * emitted AST and dropped free text, chains, [logic] and ;;) and the parser
 * embedded in glyph-engine-alias.html (complete, but browser-locked, the
 * only one able to emit XML). v1.0.9 unified them: this file is the reference
 * implementation, and the HTML is a consumer of it.
 *
 * VERSION SCHEME — release.frontend.rules.minor, from v1.2.3.00 onward:
 *   1st  release   the line itself; moves when the whole thing is another thing
 *   2nd  frontend  the HTML/CSS/UI consumer
 *   3rd  rules     rules.json, template constraints, valency, vocabulary
 *   4th  minor     two digits (00, 11, 24, 42) for everything small
 * No digit resets any other. That is the whole point of the change: under the
 * old a.b.c.d, where a digit moving reset everything to its right, touching the
 * interface alone threw away the number the engine had earned — v1.3.0.0 plus a
 * batch of panels would have read v2.0.0.0, which says "new product" about an
 * afternoon of buttons. Digits now move on their own and stay where they are.
 *
 * The backend has no digit of its own. Parser work rides in `release` when it
 * changes what Glyph IS (v1.2.3.00 added fromXML, the inverse) and in `minor`
 * when it does not.
 *
 * Versions through v1.3.0.0 used the old a.b.c.d scheme and keep their numbers;
 * they are not renumbered, because a changelog records what happened.
 *
 * v1.1.0.0 — the vocabulary is now aligned to GLOSSARY.md, which is the
 * normative reference from here on. Three changes, all backend:
 *
 *   1. `BASE` the command became `CORE`. `BASE` stayed as the keyword in
 *      expansions.txt meaning "this is an atom" — the two used to collide on
 *      the same word and no expansion table could disambiguate them.
 *   2. Twelve commands the glossary declared but the engine never knew:
 *      FIND GET ADD SUB WHR (context ops), HGH LOW BOLD LIGHT (intensity),
 *      SWITCH (condition), GO (execution). Half the composition formulas in
 *      expansions.txt referenced them and could not resolve.
 *   3. The v1.7 fusions are undone. EVAL, REV, SPEC, SIMP, QST, FOREX and
 *      ONLYIF are commands in their own right again, each separated from the
 *      one it was folded into by a stated axis (object vs. act, or standard
 *      of comparison) — see GLOSSARY.md §6.5.
 *
 * UMD: works in Node (require) and in the browser (window.GlyphCore).
 * As a CLI:  node glyph-parser.js "[crit[ctx]]" [--ast|--xml|--diag|--hgml|--from-xml]
 */

/* The UMD wrapper is gone. It existed so one file could serve Node through
   `require` and the browser through a bare `<script src>`, and the price was
   that the core had to stay ONE file — the browser has no `require`, so a
   split needed a bundler. That is D1 in HGML_PLAN, open since v1.1.

   ESM removes the reason for the bundler: the same `import` works in Node and
   in the browser. The global assignment below is kept anyway, because
   glyph-ui.js finds the core that way and rewriting the interface is not this
   change. */
const GlyphCore = (function () {
  "use strict";

  var VERSION = "2.4.6.04";

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

  var CATS = [
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

  var INSTR = {
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

  var PTBR = {};
  CATS.forEach(function (c) { c.items.forEach(function (it) { PTBR[it[0]] = it[1]; }); });

  var CAT_OF = {};
  CATS.forEach(function (c) { c.items.forEach(function (it) { CAT_OF[it[0]] = c.label; }); });

  var EDITORIAL_ONLY = { BYP:1, OVR:1, NEV:1, ALW:1, FRGT:1 };

  var ALIAS = {
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
       GLOSSARY.md §6.5. */
  };
  var ALIAS_OF = {};
  Object.keys(ALIAS).forEach(function (a) { (ALIAS_OF[ALIAS[a]] = ALIAS_OF[ALIAS[a]] || []).push(a); });

  var STRUCT = {
    SECTION:"Section", BLOCK:"Block", IF:"If", UNLS:"Unless", SKL:"Skill",
    DEF:"Define", PH:"Placeholder", TPL:"Template", LOGIC:"Logic"
  };
  /* META and STRUCT are PARSING buckets, not the species taxonomy of
     GLOSSARY.md — the two axes are independent and both are needed. The
     glossary classifies by COMPOSITION (does it decompose into atoms?);
     these classify by BEHAVIOUR (does it open a named block? is it exempt
     from the slot-order warning?). A command can be an atom in one and a
     struct in the other without contradiction. */
  var META = {
    QUICK:"Quick", TOBLOCK:"To Block", TOSECTION:"To Section",
    HMN:"Human", EXT:"External", ATC:"Attachment",
    NONE:"None"                       // v1.1.0.0 — engine em GLOSSARY.md §4
  };
  var MODE = { OFF:"Mode off", ON:"Mode on" };

  /* Reaches the deliverable as <mood dominant="…">, so English like the rest of
     the XML. `lng` keeps its Portuguese name in the comment because "saudade"
     has no one-word English equivalent — "longing" is the closest. */
  var EMO = {
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
  var SESSION = {
    rd:"read", info:"information", org:"organise",
    ok:"ok, understood", dtl:"detail"
  };

  var LOGIC_OPS = [
    ["pb[x]","arredonda pra baixo — floor(x)"],
    ["pc[x]","arredonda pra cima — ceil(x)"],
    ["ar[x]","arredonda normal — round(x)"],
    ["<n","no máximo n (teto)"],
    [">n","no mínimo n (piso)"],
    ["NdX","rola N dados de X faces — ex. 3d6"],
    ["4d6kh3","rola e mantém os 3 maiores (kl = menores)"],
    ["?","se"],["!","a menos que / não"],["->","então"],[".dbl","tem duplas"]
  ];

  var PUNCT = [
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
  var FRAMES = {
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
  var NAMED_STRUCT = { SECTION:1, BLOCK:1 };

  /* Mandatory ordered slots — SIGNATURES.md §3 (prefix comparison) and the
     arity-2 signatures. FRAMES only models the first slot; here each missing
     position becomes a <needs slot="…"> in the XML, instead of silently
     vanishing. */
  var SLOTS = {
    GT: ["the first term", "the second term"],
    GTE:["the first term", "the second term"],
    LT: ["the first term", "the second term"],
    LTE:["the first term", "the second term"],
    EQ: ["the first term", "the second term"],
    NEQ:["the first term", "the second term"],
    DFN:["the symbol", "the meaning"],
    VAL:["what to validate", "the external criterion"]
  };

  /* Long-block limits (v1.0.9.1).

     In Glyph every `[` without a `]` nests INSIDE the previous one, so a long
     query doesn't grow wide: it grows deep. That had three consequences, all
     fixed here — indentation grew with the square of depth (2 KB of input
     became 500 KB of XML), the recursive emitters overflowed the call stack,
     and the user got no warning at all that 40 commands had turned into 40
     levels of nested scope. */
  var LIMITS = {
    indent: 12,      // visual indent ceiling; past this the XML stops growing
    nesting: 10,     // past this depth, warn that the nesting is probably unintentional
    autoClose: 8,    // `;` closing more than this at once deserves a warning
    astDepth: 200    // AST ceiling: V8's JSON.stringify is recursive and overflows
  };

  /* ---- template registry ----------------------------------------------
     Filled by useTemplates(). Node loads it from templates.json;
     the browser, from the generated glyph-data.js (file:// blocks fetch). */
  var TEMPLATES = {};
  function useTemplates(store) {
    TEMPLATES = (store && store.templates) || store || {};
    return TEMPLATES;
  }
  function templateRegistry(opts) {
    return (opts && opts.templates) || TEMPLATES;
  }

  /* ---- composition registry (v1.1.0.0) --------------------------------
     What GLOSSARY.md knows and the engine did not: which commands are
     hieroglyphs (atoms, they do not decompose) and which are glyphs
     (composites, with a formula that reduces them to atoms).

     Generated from expansions.txt into expansions.json by
     build-templates.js. Optional, exactly like the template and rule stores:
     with no store loaded the engine parses and emits the same as before, it
     just cannot say what anything is made of.

     This is the table an .hgml emitter burns down to — the reason it exists.
     Nothing in the XML path reads it yet: species is inspection data, and it
     travels in the AST. */
  var EXPANSIONS = null;
  function useExpansions(store) {
    EXPANSIONS = (store && store.commands) ? store : (store ? { commands: store } : null);
    return EXPANSIONS;
  }
  function expansionRegistry(opts) {
    var s = (opts && opts.expansions) || EXPANSIONS;
    return (s && s.commands) ? s : null;
  }
  function entryOf(name, opts) {
    var reg = expansionRegistry(opts);
    if (!reg) return null;
    return reg.commands[String(name || "").toUpperCase()] || null;
  }

  /** "atom" | "composite" | null (no store, or outside the table) */
  function speciesOf(name, opts) {
    var e = entryOf(name, opts);
    return e ? e.species : null;
  }
  /** composition layer: 0 for an atom, 1 + the deepest dependency otherwise */
  function depthOf(name, opts) {
    var e = entryOf(name, opts);
    return e && typeof e.depth === "number" ? e.depth : null;
  }
  /** the formula, for a composite; null for an atom */
  function formulaOf(name, opts) {
    var e = entryOf(name, opts);
    return (e && e.formula) || null;
  }
  /** what the command MEANS — extracted from GLOSSARY.md at build time.
      `formulaOf` says what a composite is made OF; this says what any command
      IS, and for the 88 hieroglyphs it is the only thing there is to say. */
  function defOf(name, opts) {
    var e = entryOf(name, opts);
    return (e && e.def) || null;
  }

  /**
   * atomsOf(name) — the transitive atom closure, in formula order.
   *
   * Repeats are kept: a command that reaches CTX by two routes is made of it
   * twice, and collapsing that would misreport what the composition costs.
   * The build gate in build-templates.js already refuses a table with cycles,
   * so `seen` here is belt-and-braces against a hand-edited store.
   */
  function atomsOf(name, opts) {
    var reg = expansionRegistry(opts);
    if (!reg) return null;
    var out = [];
    (function walkDown(n, seen, hops) {
      var U = String(n).toUpperCase();
      if (hops > 64 || seen[U]) { out.push(U); return; }
      var e = reg.commands[U];
      if (!e || e.species === "atom") { out.push(U); return; }
      var next = {}; for (var k in seen) next[k] = 1; next[U] = 1;
      (e.deps || []).forEach(function (d) { walkDown(d, next, hops + 1); });
    })(name, {}, 0);
    return out;
  }

  /* children that count as a filled slot */
  function valueChildren(nd) {
    return (nd.children || []).filter(function (ch) {
      return ch.canonical || ch.literal || ch.logic || ch.template || (ch.text && ch.v) || ch.mode;
    });
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  var xesc = esc;

  /* ======================================================
     2. LEXER
     ====================================================== */

  var NAME_CH = /[A-Za-z0-9_.]/;

  function tokenize(src) {
    var T = [], i = 0, n = src.length;
    var off = false, textStart = -1, textBuf = "", expectBare = false;

    function flushText() {
      if (textBuf.length) {
        if (textBuf.trim().length) T.push({ k:"text", v:textBuf, s:textStart, e:textStart + textBuf.length });
        textBuf = ""; textStart = -1;
      }
    }
    function addText(ch) { if (textStart < 0) textStart = i; textBuf += ch; }

    while (i < n) {
      if (off) {
        var up = src.toUpperCase(), idx = up.indexOf("[ON]", i);
        var end = idx === -1 ? n : idx;
        if (end > i) T.push({ k:"raw", v:src.slice(i, end), s:i, e:end });
        i = end;
        if (idx !== -1) { T.push({ k:"mode", v:"ON", s:i, e:i+4 }); i += 4; off = false; }
        else T.push({ k:"modeUnclosed", v:"", s:n, e:n });
        continue;
      }

      var c = src[i];

      var wantBare = expectBare; expectBare = false;
      if (wantBare) {
        if (/\s/.test(c)) { expectBare = true; i++; continue; }
        if (/[A-Za-z]/.test(c)) {
          var bs = i;
          while (i < n && NAME_CH.test(src[i])) i++;
          T.push({ k:"bareTag", v:src.slice(bs, i), s:bs, e:i });
          continue;
        }
      }

      if (c === "[") {
        flushText();
        var rest = src.slice(i);

        var mTpl = /^\[--\s*([A-Za-z0-9_.-]+)\s*(=)?/.exec(rest);
        if (mTpl) { T.push({ k:"tpl", v:mTpl[1], def:!!mTpl[2], s:i, e:i+mTpl[0].length }); i += mTpl[0].length; continue; }

        var mChain = /^\[=/.exec(rest);
        if (mChain) { T.push({ k:"chain", v:"[=", s:i, e:i+2 }); i += 2; continue; }

        var mLog = /^\[\s*logic\s*(?:[:\-\s]\s*([^\]]*?))?\s*\]/i.exec(rest);
        if (mLog) {
          var lname = (mLog[1] || "").trim();
          var bodyStart = i + mLog[0].length;
          var mClose = /\[\s*\/\s*logic\s*\]/i.exec(src.slice(bodyStart));
          var bodyEnd = mClose ? bodyStart + mClose.index : n;
          T.push({ k:"logic", v:lname, body:src.slice(bodyStart, bodyEnd), s:i,
                   e: mClose ? bodyEnd + mClose[0].length : n, closed:!!mClose });
          i = mClose ? bodyEnd + mClose[0].length : n;
          continue;
        }

        var mOff = /^\[\s*off\s*\]/i.exec(rest);
        if (mOff) { T.push({ k:"mode", v:"OFF", s:i, e:i+mOff[0].length }); i += mOff[0].length; off = true; continue; }
        var mOn = /^\[\s*on\s*\]/i.exec(rest);
        if (mOn) { T.push({ k:"mode", v:"ON", s:i, e:i+mOn[0].length, stray:true }); i += mOn[0].length; continue; }

        if (src[i+1] === "/") {
          var j = i + 2, ns = j;
          while (j < n && NAME_CH.test(src[j])) j++;
          var ce = j; if (src[ce] === "]") ce++;
          T.push({ k:"closeTag", v:src.slice(ns, j), s:i, e:ce });
          i = ce; continue;
        }

        var j2 = i + 1, ns2 = j2;
        while (j2 < n && NAME_CH.test(src[j2])) j2++;
        T.push({ k:"open", v:src.slice(ns2, j2), s:i, e:j2 });
        i = j2; continue;
      }

      if (c === "]") { flushText(); T.push({ k:"close", v:"]", s:i, e:i+1 }); i++; continue; }

      if (c === "`") {
        flushText();
        var ls = i + 1, j3 = ls, by = "eof";
        while (j3 < n) {
          if (src[j3] === "`") { by = "tick"; break; }
          if (src[j3] === "]") { by = "bracket"; break; }
          if (src[j3] === ";") { by = "semi"; break; }
          j3++;
        }
        var e3 = by === "tick" ? j3 + 1 : j3;
        T.push({ k:"literal", v:src.slice(ls, j3), s:i, e:e3, form:"tick", closedBy:by });
        i = e3; continue;
      }

      if (c === "'") {
        flushText();
        var qs = i + 1, j4 = qs, qc = false;
        while (j4 < n) {
          if (src[j4] === "'") { qc = true; break; }
          if (src[j4] === "]" || src[j4] === "\n") break;
          j4++;
        }
        var e4 = qc ? j4 + 1 : j4;
        T.push({ k:"literal", v:src.slice(qs, j4), s:i, e:e4, form:"quote",
                 closedBy: qc ? "quote" : "unterminated" });
        i = e4; continue;
      }

      /* The backslash emotion delimiter was replaced by the slash at resolution
         I-19. The grammar carries only the slash (glyph-grammar.ebnf:13) and
         the inverse has only ever written the slash — but the lexer still
         accepted both, so an abandoned spelling stayed alive and undocumented,
         and the installed skill still taught it.

         DEMOTED TO A RECOGNISER, not deleted. Deleting the branch makes `\eth\`
         fall through to addText and emit <off>\eth\</off> in silence — the very
         defect this work exists to abolish, re-created in the act of removing a
         different instance of it. So the shape is still matched, still refused
         by name, and the characters survive as <off>. Nothing is fabricated,
         nothing vanishes, and the author is told which spelling to use. */
      if (c === "\\") {
        var bs = i, bj = i + 1;
        while (bj < n && /[A-Za-z\\]/.test(src[bj])) bj++;
        if (bj > bs + 1) {
          addText(src.slice(bs, bj));
          flushText();
          T.push({ k:"badmood", v:src.slice(bs, bj), s:bs, e:bj });
          i = bj; continue;
        }
        /* a lone `\` in prose is not a delimiter and must stay prose */
        addText("\\"); i++; continue;
      }

      if (c === ";") {
        flushText();
        if (src[i+1] === ";") { T.push({ k:"linebreak", v:";;", s:i, e:i+2 }); i += 2; }
        else { T.push({ k:"semi", v:";", s:i, e:i+1 }); i++; }
        continue;
      }

      if (c === ",") {
        var pv = T[T.length-1];
        flushText();
        T.push({ k:"comma", v:",", s:i, e:i+1 }); i++;
        if (pv && pv.k === "bareTag") expectBare = true;
        continue;
      }

      if (c === "-" && /^\s*[Rr]\s*$/.test(textBuf) && !/[A-Za-z0-9]/.test(src[i+1] || "")) {
        T.push({ k:"return", v:"r-", s:textStart, e:i+1 });
        textBuf = ""; textStart = -1; i++; continue;
      }

      if (c === ":") {
        if (/^\s*R\s*$/.test(textBuf)) {
          T.push({ k:"return", v:"R:", s:textStart, e:i+1 });
          textBuf = ""; textStart = -1; i++; continue;
        }
        flushText(); T.push({ k:"colon", v:":", s:i, e:i+1 }); i++; continue;
      }

      if (c === "=") { flushText(); T.push({ k:"equals", v:"=", s:i, e:i+1 }); i++; continue; }

      if (c === "-") {
        var prev = T[T.length-1];
        if (!textBuf.length && prev && (prev.k === "open" || prev.k === "bareTag")) {
          T.push({ k:"extend", v:"-", s:i, e:i+1 }); i++; expectBare = true; continue;
        }
        addText(c); i++; continue;
      }

      if (c === "/") {
        var prevT = T[T.length-1];
        /* The divide operator was removed by resolution C-01 — the grammar has
           said so since v1.7 (glyph-grammar.ebnf:37) while the engine went on
           emitting a `divide` token and XML_REFERENCE went on documenting it.
           This is the propagation, not a new decision.

           Deleting the branch outright would not be safe, because `/` is not a
           free character: EMO holds `ins` and `cmp`, INSTR holds INS and CMP,
           and the emotion branch below fires on /name/ regardless of what
           precedes it. So `[in-rwk/ins/fmt]` fabricated a <mood> from a chain,
           hoisted it to block level, and dropped `fmt`. In a chain position the
           emotion branch must not be entered at all. */
        var inChain = !textBuf.length && prevT &&
                      (prevT.k === "extend" || prevT.k === "bareTag" || prevT.k === "comma");
        if (inChain) {
          var rs = i, rj = i + 1;
          while (rj < n && /[A-Za-z\/]/.test(src[rj])) rj++;   /* the whole run, so nothing is left for EMO */
          addText(src.slice(rs, rj));
          flushText();
          T.push({ k:"badslash", v:src.slice(rs, rj), s:rs, e:rj });
          i = rj; continue;
        }
        var pb2 = i + 1, ps2 = pb2;
        while (pb2 < n && /[A-Za-z]/.test(src[pb2])) pb2++;
        var first = src.slice(ps2, pb2);
        if (first && src[pb2] === "/" && EMO[first.toLowerCase()]) {
          flushText();
          var st2 = i; i++;
          var ord2 = 0, gd2 = 0;
          while (i < n && gd2++ < 64) {
            var es2 = i;
            while (i < n && /[A-Za-z]/.test(src[i])) i++;
            var en2 = src.slice(es2, i);
            if (!en2) break;
            var had2 = src[i] === "/";
            var o2 = ord2++;
            T.push({ k:"emotion", v:en2, s: o2 === 0 ? st2 : es2 - 1,
                     e:i + (had2?1:0), order:o2, unterminated:!had2, delim:"/" });
            if (had2) { i++; if (!(i < n && /[A-Za-z]/.test(src[i]))) break; } else break;
          }
          continue;
        }
        addText(c); i++; continue;
      }

      addText(c); i++;
    }
    flushText();
    return T;
  }

  function classify(name, opts) {
    opts = opts || {};
    var U = String(name || "").toUpperCase(), L = String(name || "").toLowerCase();
    if (!name) return { tier:"empty", canonical:"", gloss:"" };
    if (MODE[U]) return { tier:"mode", canonical:U, gloss:MODE[U] };
    if (STRUCT[U]) return { tier:"struct", canonical:U, gloss:STRUCT[U] };
    if (META[U]) return { tier:"meta", canonical:U, gloss:META[U] };
    if (ALIAS[U]) { var f = ALIAS[U];
      return { tier:"instr", canonical:f, alias:true, aliasOf:f, gloss:INSTR[f], merged: !!INSTR[U] }; }
    if (INSTR[U]) return { tier:"instr", canonical:U, gloss:INSTR[U] };
    if (opts.session !== false && SESSION[L]) return { tier:"session", canonical:L, gloss:SESSION[L] };
    return { tier:"unknown", canonical:U, gloss:"" };
  }

  function lev(a, b) {
    var m = a.length, q = b.length;
    if (!m) return q; if (!q) return m;
    var prev = [], cur = [], i, j;
    for (j = 0; j <= q; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur[0] = i;
      for (j = 1; j <= q; j++)
        cur[j] = Math.min(prev[j]+1, cur[j-1]+1, prev[j-1] + (a[i-1] === b[j-1] ? 0 : 1));
      var t = prev; prev = cur; cur = t;
    }
    return prev[q];
  }

  function suggest(name) {
    var U = String(name).toUpperCase();
    var pool = Object.keys(INSTR).concat(Object.keys(STRUCT), Object.keys(META), Object.keys(ALIAS));
    var best = null, bd = 99;
    for (var k = 0; k < pool.length; k++) { var d = lev(U, pool[k]); if (d < bd) { bd = d; best = pool[k]; } }
    return (bd <= 2 && bd < Math.max(U.length, 2)) ? { name:best, dist:bd } : null;
  }

  function elName(canonical, tier, gloss) {
    if (tier === "session") return canonical;
    var g = gloss || canonical;
    return g.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || String(canonical).toLowerCase();
  }

  /* ======================================================
     3. [logic] BLOCK
     ====================================================== */

  var RESERVED_WORDS = /^(and|or|not|if|then|else|true|false|min|max|abs|sum|floor|ceil|round|sem|se|senao|entao|no|de|do|da|pb|pc|ar|kh|kl|e|ou)$/i;

  function expandExpr(raw) {
    var s = " " + raw + " ";
    s = s.replace(/(^|[^\w])(\d+)\s*d\s*(\d+)\s*(k[hl])\s*(\d*)/gi, function (_, p, nd, fc, kk, mm) {
      var keep = mm || "1";
      return p + "rola " + nd + " dado(s) de " + fc + " faces, mantém o(s) " + keep +
        (kk.toLowerCase() === "kh" ? " maior(es)" : " menor(es)");
    });
    s = s.replace(/(^|[^\w])(\d+)\s*d\s*(\d+)/gi, "$1rola $2 dado(s) de $3 faces");
    s = s.replace(/(^|[^\w])pb\s*\[([^\]]*)\]/gi, "$1floor($2)");
    s = s.replace(/(^|[^\w])pc\s*\[([^\]]*)\]/gi, "$1ceil($2)");
    s = s.replace(/(^|[^\w])ar\s*\[([^\]]*)\]/gi, "$1round($2)");
    s = s.replace(/(^|[^\w])pb\s+([A-Za-z_][\w.]*)/gi, "$1floor($2)");
    s = s.replace(/(^|[^\w])pc\s+([A-Za-z_][\w.]*)/gi, "$1ceil($2)");
    s = s.replace(/(^|[^\w])ar\s+([A-Za-z_][\w.]*)/gi, "$1round($2)");
    s = s.replace(/(^|[^\w])\^\s*\[([^\]]*)\]/g, "$1ceil($2)");
    s = s.replace(/(^|[^\w])_\s*\[([^\]]*)\]/g, "$1floor($2)");
    s = s.replace(/(^|[^\w])~\s*\[([^\]]*)\]/g, "$1round($2)");
    s = s.replace(/(^|[^\w])\^\s*([A-Za-z_][\w.]*)/g, "$1ceil($2)");
    s = s.replace(/(^|[^\w])_\s*([A-Za-z_][\w.]*)/g, "$1floor($2)");
    s = s.replace(/(^|[^\w])~\s*([A-Za-z_][\w.]*)/g, "$1round($2)");
    s = s.replace(/\s<\s*(\d+)\s*$/, ", máximo $1");
    s = s.replace(/\s>\s*(\d+)\s*$/, ", mínimo $1");
    s = s.replace(/\.dbl\b/g, ".tem_duplas");
    s = s.replace(/(^|[^\w!<>=])!\s*/g, "$1não ");
    return s.trim().replace(/\s+/g, " ");
  }

  function freeVars(raw) {
    var s = raw
      /* the whole roll comes out, including the kh/kl suffix — otherwise
         "4d6kh3" leaves "kh3" behind and it leaks out as an undefined variable */
      .replace(/(^|[^\w])\d+\s*d\s*\d+\s*(?:k[hl]\s*\d*)?/gi, " ")
      .replace(/`[^`]*`/g, " ")
      .replace(/'[^']*'/g, " ")
      .replace(/\.\w+/g, " ")
      .replace(/(^|[^\w])[_^~](?=[\[\s])/g, "$1 ")
      .replace(/\b\d+(\.\d+)?\b/g, " ");
    var out = [], seen = {}, m, re = /[A-Za-z_][A-Za-z0-9_]*/g;
    while ((m = re.exec(s))) {
      var w = m[0];
      if (w === "_") continue;
      if (RESERVED_WORDS.test(w)) continue;
      if (seen[w.toLowerCase()]) continue;
      seen[w.toLowerCase()] = 1;
      out.push(w);
    }
    return out;
  }

  function parseLogic(name, body) {
    var rules = [], gaps = [], defined = {}, capNoted = false;
    String(body || "").split(/\r?\n/).forEach(function (lineRaw, ln) {
      var line = lineRaw.trim();
      if (!line || /^(#|\/\/)/.test(line)) return;
      var rule = { line: ln + 1, source: line };
      var mLet = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/.exec(line);
      var mWhen = /^(!|\?)?\s*(.+?)\s*->\s*(.+)$/.exec(line);

      if (mLet) {
        rule.kind = "let"; rule.name = mLet[1]; rule.expr = mLet[2].trim();
        if (defined[rule.name])
          gaps.push({ sev:"ask", lab:"conflito", code:"DuplicateBinding",
            msg:"<code>" + esc(rule.name) + "</code> definido 2x. Qual vale?" });
        defined[rule.name] = true;
      } else if (mWhen) {
        rule.kind = mWhen[1] === "!" ? "unless" : "when";
        rule.cond = mWhen[2].trim(); rule.then = mWhen[3].trim(); rule.expr = rule.cond;
      } else if (/^(!|\?)/.test(line)) {
        rule.kind = line[0] === "!" ? "unless" : "when";
        rule.cond = line.slice(1).trim(); rule.expr = rule.cond;
        gaps.push({ sev:"ask", lab:"sem então", code:"MissingConsequent",
          msg:"<code>" + esc(line) + "</code>: consequência? Use <code>-&gt;</code>." });
      } else { rule.kind = "expr"; rule.expr = line; }

      if (!rule.expr) {
        gaps.push({ sev:"fix", lab:"vazio", code:"EmptyLogicLine",
          msg:"linha " + rule.line + " sem expressão." });
        return;
      }
      rule.reads = expandExpr(rule.expr) + (rule.then ? " → então " + expandExpr(rule.then) : "");
      rule.uses = freeVars(rule.expr);
      if (rule.then && /=/.test(rule.then)) rule.uses = rule.uses.concat(freeVars(rule.then));

      if (!capNoted && /\s[<>]\s*\d+\s*$/.test(rule.expr)) {
        capNoted = true;
        gaps.push({ sev:"note", lab:"read as", code:"CapFloorNotice",
          msg:"<code>" + (/\s<\s*\d+\s*$/.test(rule.expr) ? "&lt;" : "&gt;") +
              "</code> in postfix reads as a cap or a floor, not a comparison. " +
              "To compare, write <code>&lt;=</code> or <code>&gt;=</code>." });
      }
      rules.push(rule);
    });

    var used = {};
    rules.forEach(function (r) { (r.uses || []).forEach(function (v) { if (!defined[v]) used[v] = true; }); });
    var missing = Object.keys(used);
    if (missing.length)
      gaps.push({ sev:"ask", lab:"undefined", code:"UndefinedVariable",
        msg: missing.map(function (v) { return "<code>" + esc(v) + "</code>"; }).join(", ") +
            (missing.length === 1 ? " used and never defined." : " used and never defined.") +
            " External input, or a missing line?" });

    return { name:name, rules:rules, gaps:gaps, missing:missing };
  }

  /* ======================================================
     4. PARSER
     ====================================================== */

  /* Iterative on purpose: in a long block the tree is deep, and the
     recursive version overflowed the stack right along with the emitters. */
  function walk(list, fn) {
    var stack = [], i;
    for (i = (list || []).length - 1; i >= 0; i--) stack.push(list[i]);
    while (stack.length) {
      var nd = stack.pop();
      fn(nd);
      var kids = nd.children;
      if (kids && kids.length) for (i = kids.length - 1; i >= 0; i--) stack.push(kids[i]);
    }
  }

  function stripTags(s) {
    return String(s == null ? "" : s)
      .replace(/<[^>]+>/g, "")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&amp;/g, "&")
      .replace(/\s+/g, " ").trim();
  }

  /* ======================================================
     3b. TEMPLATE EXPANSION

     Through v1.0.9.1 an invocation `[--name[…]]` emitted only what was written
     in the call itself: the definition's body never entered, not even in the
     same message. The human reader or the model was what connected the two
     ends. Now the engine connects them.

     Linking: the definition declares holes with `[ph-name\`question\`]`; the
     call fills them by name (`[ph-name'value']`) or by position (bare
     literals, in declaration order). Whatever isn't a fill lands as extra
     content at the end. An unfilled hole still becomes <needs> — it does not
     block.
     ====================================================== */

  function phName(nd) {
    var n = (nd.children || []).filter(function (c) { return c.slotName; })[0];
    return n ? String(n.raw) : null;
  }

  /* `repeatName` (lowercase) is the one param, if any, declared with
     `"repeat": true` in the template store — see bindHoles below for why it
     is collected separately from the positional/named split. */
  function collectFills(inv, repeatName) {
    var named = {}, positional = [], extra = [];
    var repeatKey = repeatName ? String(repeatName).toLowerCase() : null;
    (inv.children || []).forEach(function (c) {
      if (c.canonical === "PH") {
        var nm = phName(c);
        if (nm) {
          var lit = (c.children || []).filter(function (k) { return k.literal; })[0];
          var val = lit ? lit.v : "";
          var key = nm.toLowerCase();
          if (repeatKey && key === repeatKey) (named[key] = named[key] || []).push(val);
          else named[key] = val;
          return;
        }
      }
      if (c.literal) { positional.push(c.v); return; }
      extra.push(c);
    });
    return { named:named, positional:positional, extra:extra };
  }

  /* A repeatable hole (at most one per template, marked `repeat` on its
     param) does not fit the position-by-declaration-order scheme: a fixed
     param declared after it (e.g. best-of's `criterion`) would collide with
     whatever positional index the repeats push it to. So the repeatable
     hole binds only through repeated named calls — `[ph-more'x'][ph-more'y']`
     — and is excluded from positional `order` entirely. Each call beyond the
     first adds one more sibling node where the hole sat, instead of
     overwriting a single value; zero calls drops the hole from the output
     (it is optional plurality, not a required slot, so it does not become
     <needs> — the template's other fixed params already cover the minimum). */
  function bindHoles(nodes, fills, params, repeatName) {
    var order = params.filter(function (p) {
      return p !== repeatName && !(String(p).toLowerCase() in fills.named);
    });

    function valueFor(name) {
      var k = String(name).toLowerCase();
      if (k in fills.named) { var v = fills.named[k]; return Array.isArray(v) ? v[0] : v; }
      var at = order.indexOf(name);
      return (at !== -1 && at < fills.positional.length) ? fills.positional[at] : null;
    }

    function rebuild(list) {
      var out = [];
      (list || []).forEach(function (nd) {
        if (nd.canonical === "PH") {
          var nm = phName(nd);
          if (nm && repeatName && nm.toLowerCase() === String(repeatName).toLowerCase()) {
            var vals = fills.named[nm.toLowerCase()] || [];
            vals.forEach(function (v, idx) {
              if (v === null || v === undefined || !String(v).length) return;
              out.push({ literal:true, v:String(v), form:"quote",
                         boundSlot: nm + (idx ? String(idx + 1) : "") });
            });
            return;
          }
          var v2 = nm ? valueFor(nm) : null;
          if (v2 !== null && v2 !== undefined && String(v2).length) {
            out.push({ literal:true, v:String(v2), form:"quote", boundSlot:nm });
            return;
          }
        }
        if (nd.children && nd.children.length) nd.children = rebuild(nd.children);
        out.push(nd);
      });
      return out;
    }
    return rebuild(nodes);
  }

  function reparent(list, parent) {
    (list || []).forEach(function (nd) {
      nd.parent = parent;
      if (nd.children && nd.children.length) reparent(nd.children, nd);
    });
  }

  function expandInvocations(segments, opts, G) {
    var registry = templateRegistry(opts);
    if (!registry) return;
    var chain = (opts && opts._expanding) || [];

    var invocations = [];
    segments.forEach(function (sg) {
      walk(sg.children, function (nd) { if (nd.template && !nd.isDef) invocations.push(nd); });
    });

    invocations.forEach(function (inv) {
      var key = String(inv.template).toLowerCase();
      var def = registry[key] || registry[inv.template];
      if (!def || !def.body) return;

      if (chain.indexOf(key) !== -1) {
        G("fix", "ciclo",
          "<code>[--" + esc(inv.template) + "</code> se expande dentro de si mesmo (" +
          esc(chain.concat(key).join(" → ")) + "). Expansão interrompida.", "TemplateCycle",
            "cycle", "<code>[--" + esc(inv.template) + "</code> expands inside itself (" + esc(chain.concat(key).join(" → ")) + "). Expansion stopped.");
        return;
      }

      var sub = parse(def.body, {
        session: opts.session,
        valency: false,                       // valency is judged in the final context
        templates: registry,
        _expanding: chain.concat(key)
      });

      /* Syntax errors (and cycles) from the stored body need to bubble up:
         the outer passes run over the already-expanded tree and do not
         reproduce them. `ask`/`note` stay out because they get regenerated. */
      sub.gaps.forEach(function (g) {
        if (g.sev === "fix")
          G(g.sev, g.lab, "no corpo de <code>[--" + esc(inv.template) + "</code>: " + g.msg, g.code);
      });

      var body = [];
      sub.segments.forEach(function (s) { body = body.concat(s.children); });

      var params = (def.params || []).map(function (p) { return p.name || p; });
      var repeatDef = (def.params || []).filter(function (p) { return p && p.repeat; })[0];
      var repeatName = repeatDef ? (repeatDef.name || repeatDef) : null;
      var fills = collectFills(inv, repeatName);

      inv.children = bindHoles(body, fills, params, repeatName).concat(fills.extra);
      reparent(inv.children, inv);
      inv.expanded = true;
      inv.gloss = def.gloss || "";
    });
  }

  /* ======================================================
     3c. CONTRADICTIONS

     The criterion that was missing for "commands don't contradict each
     other". Finite, external table (rules.json): editing the file
     changes the rule, without touching code. `hard` becomes `fix`, `tension`
     becomes `ask`.
     ====================================================== */

  var RULES = null;
  function useRules(store) { RULES = store || null; return RULES; }

  function pairKey(a, b) { return a < b ? a + "|" + b : b + "|" + a; }

  /* Resolves "@className" against the classes table; a bare name is itself. */
  function expandNames(store, name) {
    if (String(name).charAt(0) !== "@") return [name];
    return ((store.classes || {})[String(name).slice(1)] || []).slice();
  }

  function compileRules(store) {
    var c = { pairs:{}, order:[], pre:[], blends:[] };
    (store.rules || []).forEach(function (r) {
      if (r.kind === "pair") { c.pairs[pairKey(r.a, r.b)] = r; return; }
      /* `blend` is the pattern layer: co-occurrence in the BURNT form maps to
         one richer element. It matches the way `pair` does and emits instead
         of diagnosing, and it is written over the 88 atoms — so a pattern is
         invariant to which surface synonym the author happened to type, which
         is the property that makes it tractable at all.

         HGML_PLAN names one trap: an invented element that cannot say what it
         means moves the interpretation problem one step along instead of
         solving it. So a blend with no `means` is REFUSED at compile time
         rather than warned about. A trap you can walk into is not closed. */
      if (r.kind === "blend") {
        if (!r.means || !r.emit || !(r.when && r.when.length >= 2)) return;
        var when = [];
        r.when.forEach(function (nm) {
          expandNames(store, nm).forEach(function (x) { when.push(x); });
        });
        c.blends.push({ rule:r, when:when, emit:r.emit, means:r.means });
        return;
      }
      if (r.kind === "order") {
        /* `first` must not match itself: it is usually a member of the very
           class named in `then` (ELAB is part of @thinking). */
        var then = expandNames(store, r.then).filter(function (n) { return n !== r.first; });
        c.order.push({ rule:r, first:r.first, then:then });
        return;
      }
      if (r.kind === "precondition") {
        var accept = {};
        (r.requiresBefore || []).forEach(function (n) {
          expandNames(store, n).forEach(function (x) { accept[x] = 1; });
        });
        c.pre.push({ rule:r, target:r.target, accept:accept });
      }
    });
    return c;
  }

  function checkRules(segments, opts, G) {
    var store = (opts && opts.rules) || RULES;
    if (!store) return;
    var C = store.__compiled || (store.__compiled = compileRules(store));
    var exempt = {};
    ((store.scope && store.scope.exemptUnder) || []).forEach(function (x) { exempt[x] = 1; });
    var seen = {};

    /* Under an explicit [ovr] or [byp] the overlap was requested on purpose. */
    function underExempt(nd) {
      var p = nd.parent, hops = 0;
      while (p && hops++ < 64) { if (exempt[p.canonical]) return true; p = p.parent; }
      return false;
    }

    /* `why` and `suggest` are already en-EU in rules.json; only this assembly
       was pt-BR, which is why a rule diagnostic read half in each language.
       Both are built, and `opts.lang` picks — the artefact travels in en-EU
       while the interface keeps pt-BR. */
    function fire(r, id, msg, enMsg) {
      if (seen[id]) return;
      seen[id] = 1;
      G(r.severity || "ask", r.label || "regra",
        msg + (r.suggest ? " <em>Sugestão: " + esc(r.suggest) + "</em>" : ""),
        "Rule:" + r.id, r.label || "rule",
        (enMsg || msg) + (r.suggest ? " <em>Suggestion: " + esc(r.suggest) + "</em>" : ""));
    }

    function reportPair(x, y) {
      var r = C.pairs[pairKey(x.canonical, y.canonical)];
      if (!r || underExempt(x) || underExempt(y)) return;
      var a = "<code>[" + esc(String(x.canonical).toLowerCase()) + "</code>",
          b = "<code>[" + esc(String(y.canonical).toLowerCase()) + "</code>";
      fire(r, r.id + "@" + (x.id || 0) + "-" + (y.id || 0),
        a + " com " + b + " no mesmo alvo — " + esc(r.why) + ".",
        a + " with " + b + " on the same target — " + esc(r.why) + ".");
    }

    segments.forEach(function (sg) {
      /* document order within the segment, for `order` and `precondition` */
      var flat = [];
      walk(sg.children, function (nd) { if (nd.canonical) flat.push(nd); });

      // --- pair: siblings under one parent ---
      var groups = [sg.children];
      walk(sg.children, function (nd) { if (nd.children && nd.children.length) groups.push(nd.children); });
      groups.forEach(function (kids) {
        var byName = {};
        kids.forEach(function (c) { if (c.canonical) (byName[c.canonical] = byName[c.canonical] || []).push(c); });
        Object.keys(C.pairs).forEach(function (k) {
          var r = C.pairs[k];
          if (byName[r.a] && byName[r.b]) reportPair(byName[r.a][0], byName[r.b][0]);
        });
      });

      // --- pair: one is an ancestor of the other ---
      walk(sg.children, function (nd) {
        if (!nd.canonical) return;
        var p = nd.parent, hops = 0;
        while (p && hops++ < 32) { if (p.canonical) reportPair(nd, p); p = p.parent; }
      });

      // --- order: `then` must not come before `first` ---
      C.order.forEach(function (o) {
        var firstAt = -1, i, j;
        for (i = 0; i < flat.length; i++) if (flat[i].canonical === o.first) { firstAt = i; break; }
        for (j = 0; j < flat.length; j++) {
          if (o.then.indexOf(flat[j].canonical) === -1) continue;
          if (firstAt !== -1 && j > firstAt) continue;      // correct order, nothing to say
          if (firstAt === -1) return;                        // `first` absent: rule does not apply
          var la = "<code>[" + esc(String(flat[j].canonical).toLowerCase()) + "</code>",
              lb = "<code>[" + esc(String(o.first).toLowerCase()) + "</code>";
          fire(o.rule, o.rule.id + "@" + (flat[j].id || 0),
            la + " vem antes de " + lb + " — " + esc(o.rule.why) + ".",
            la + " comes before " + lb + " — " + esc(o.rule.why) + ".");
          return;
        }
      });

      // --- precondition: target must be preceded by an accepted frame ---
      C.pre.forEach(function (p) {
        for (var i = 0; i < flat.length; i++) {
          if (flat[i].canonical !== p.target) continue;
          var framed = false;
          for (var k = 0; k < i; k++) if (p.accept[flat[k].canonical]) { framed = true; break; }
          if (framed) continue;
          var t = "<code>[" + esc(String(p.target).toLowerCase()) + "</code>";
          fire(p.rule, p.rule.id + "@" + (flat[i].id || 0),
            t + " sem enquadramento antes — " + esc(p.rule.why) + ".",
            t + " with no framing before it — " + esc(p.rule.why) + ".");
        }
      });
    });
  }

  /* ======================================================
     3d. TEMPLATE CONSTRAINTS — the shape a preset promises

     The rules in 3c are all LOCAL: they compare two commands to each other
     (siblings, or one an ancestor of the other) or check what preceded a
     target in the same segment. None of them sees the SHAPE of a whole
     preset once it is expanded. So a template that set up an iteration
     could be handed commands that dissolve the very loop it opened, and the
     engine stayed quiet — it only knew two commands coexisted, not that one
     of them walked out of the structure the other one promised.

     A constraint travels with the template that declares it and is checked
     ONLY inside that template's own expansion — same provenance the
     [ovr]/[byp] exemption already walks, via the `parent` chain that
     reparent() builds at expansion time.

     `forbid` names a class or command that must not appear inside. The
     exemption is deliberate and is the whole point: under an explicit
     [ovr]/[byp] the departure was requested out loud. The preset
     de-limits, it does not wall in — leaving the rails stays possible, it
     just stops happening by drift.

     Severity is data, but `ask` is the right default and what the shipped
     presets use: walking out of a preset's shape is not broken syntax, the
     XML stays trustworthy, so it must not be `fix` (that would also make
     any such template fail the Guard bucket).
     ====================================================== */

  /* A class ("@name") resolves through the rules store; a bare name is
     itself. Returns [] for a class naming a store that is not loaded —
     the constraint then simply does not fire, matching C-09's "no store
     loaded, nothing gets checked". */
  function constraintNames(rulesStore, spec) {
    var out = [];
    (Array.isArray(spec) ? spec : [spec]).forEach(function (n) {
      if (String(n).charAt(0) === "@") {
        var cls = ((rulesStore && rulesStore.classes) || {})[String(n).slice(1)];
        if (cls) cls.forEach(function (x) { out.push(String(x).toUpperCase()); });
      } else out.push(String(n).toUpperCase());
    });
    return out;
  }

  function checkTemplateConstraints(segments, opts, G) {
    var registry = templateRegistry(opts);
    if (!registry) return;
    var rulesStore = (opts && opts.rules) || RULES;

    var exempt = {};
    (((rulesStore || {}).scope || {}).exemptUnder || ["OVR", "BYP"])
      .forEach(function (x) { exempt[x] = 1; });

    /* Same walk as checkRules' underExempt, but it stops at the template
       node: an [ovr] wrapping the whole invocation from outside says
       nothing about what happens inside this preset. */
    function exemptWithin(nd, stopAt) {
      var p = nd.parent, hops = 0;
      while (p && p !== stopAt && hops++ < 64) { if (exempt[p.canonical]) return true; p = p.parent; }
      return false;
    }

    segments.forEach(function (sg) {
      walk(sg.children, function (inv) {
        if (!inv.template || !inv.expanded) return;
        var def = registry[String(inv.template).toLowerCase()] || registry[inv.template];
        var cons = (def && def.constraints) || [];
        if (!cons.length) return;

        var inside = [];
        walk(inv.children || [], function (nd) { if (nd.canonical) inside.push(nd); });

        cons.forEach(function (c) {
          if (!c.forbid) return;
          var names = {};
          constraintNames(rulesStore, c.forbid).forEach(function (n) { names[n] = 1; });

          for (var i = 0; i < inside.length; i++) {
            var nd = inside[i];
            if (!names[nd.canonical] || exemptWithin(nd, inv)) continue;
            G(c.severity || "ask", c.label || "fora do trilho",
              "<code>[" + esc(String(nd.canonical).toLowerCase()) + "</code> dentro de <code>[--" +
              esc(inv.template) + "</code>" + (c.why ? " — " + esc(c.why) : "") + "." +
              (c.suggest ? " <em>Sugestão: " + esc(c.suggest) + ".</em>" : "") +
              " Se a saída for proposital, marque com <code>[ovr</code>.",
              "TemplateConstraint:" + c.id);
            return;                 // one report per constraint, not per offender
          }
        });
      });
    });
  }

  /**
   * parse(input, opts)
   *   input — Glyph source code (string) or an already-tokenized array.
   *   opts  — { session:true, valency:true }
   * Returns { segments, gaps, tokens }.
   */
  function parse(input, opts) {
    opts = opts || {};
    var tokens = typeof input === "string" ? tokenize(input) : input;
    var gaps = [], segments = [], stack = [], uid = 0;
    var seg = newSeg(), pendingOrigin = null;

    function newSeg() { return { children:[], mood:[], autoClosed:0, breaks:0 }; }
    function top() { return stack.length ? stack[stack.length-1] : null; }
    function attach(nd) { var t = top(); if (t) { t.children.push(nd); nd.parent = t; } else seg.children.push(nd); }
    /* Duas línguas por diagnóstico. O rótulo e a mensagem em inglês chegam
       como 5º e 6º argumentos; faltando, fica o pt-BR — um sítio esquecido
       aparece na língua errada, que é melhor que aparecer vazio. */
    function G(sev, lab, msg, code, enLab, enMsg, tk) {
      var en = opts.lang === "en";
      var g = { sev:sev, lab:(en && enLab) || lab, msg:(en && enMsg) || msg, code:code || "Note" };
      /* Additive, and optional. A refusal with no coordinate cannot be located
         by a reader who does not have the engine — which is the whole point of
         carrying the AST between machines. Every token already holds s/e, so
         this costs a field and no plumbing, and the existing consumers read
         { sev, lab, msg } and are unaffected. */
      if (tk && typeof tk.s === "number") g.at = { s:tk.s, e:tk.e };
      gaps.push(g);
    }
    function closeSeg(cause) {
      var names = [];
      while (stack.length) {
        var closing = stack.pop();
        closing.autoClosed = true; seg.autoClosed++;
        if (names.length < 4) names.push(String(closing.canonical || closing.template || "?").toLowerCase());
      }
      if (cause === "semi" && seg.autoClosed > LIMITS.autoClose)
        G("note", "fecha tudo",
          "<code>;</code> fechou " + seg.autoClosed + " comandos de uma vez (" +
          names.map(function (x) { return "<code>[" + esc(x) + "</code>"; }).join(", ") +
          "…). Em bloco longo isso costuma fechar mais do que se pretendia — feche com <code>]</code> o que for parcial.", "MassAutoClose",
            "closed everything", "<code>;</code> closed " + seg.autoClosed + " commands at once (" + names.map(function (x) { return "<code>[" + esc(x) + "</code>"; }).join(", ") + "…). In a long block that usually closes more than intended — close what is partial with <code>]</code>.");
      seg.cause = cause;
      if (seg.children.length || seg.mood.length || seg.breaks) segments.push(seg);
      seg = newSeg(); pendingOrigin = null;
    }

    for (var i = 0; i < tokens.length; i++) {
      var tk = tokens[i];

      if (tk.k === "open" || tk.k === "bareTag") {
        var cl = classify(tk.v, opts);
        var parentNode = top();
        var inPH = !!(parentNode && parentNode.canonical === "PH");
        if (tk.k === "open" && !tk.v)
          G("fix", "sem nome", "<code>[</code> sem nome. Um <code>[</code> = um comando.", "EmptyCommandName",
            "no name", "<code>[</code> with no name. One <code>[</code> is one command.");
        /* `[ph-alvo` uses `-` as a name binder, not a chain operator: the bare
           tag becomes the placeholder's name and is consumed by the PH branch
           rather than emitted as an element. Its origin would read "extend",
           which is an artefact of the shared lexer path — so it is suppressed
           and no chain attribute can reach a <needs slot="…">. */
        var isSlotName = inPH && tk.k === "bareTag";
        var nd = {
          id:++uid, raw:tk.v, tier:cl.tier, canonical:cl.canonical, gloss:cl.gloss,
          alias:!!cl.alias, children:[], emotions:[], colon:null, autoClosed:false, tok:tk,
          editorial:!!EDITORIAL_ONLY[cl.canonical],
          /* which operator produced the edge to this node's parent */
          origin: isSlotName ? null
                : (pendingOrigin || (tk.k === "bareTag" ? "extend" : (parentNode ? "nest" : "root"))),
          /* Narrowed to the one question it is actually asked: was this written
             BARE, with no `[` of its own, and therefore cannot hold an operand?
             It used to answer that *and* "which operator attached it", and the
             two are independent — `[in-rwk]` and `[in-[rwk]]` share an origin
             and differ in bareness. Conflating them is why an extend could not
             be recovered from the XML, and why `-[` silently cancelled the
             <needs> a bracketed command asks for. */
          chainElement: tk.k === "bareTag",
          slotName: isSlotName,
          depth: stack.length
        };
        if (cl.tier === "unknown" && !nd.slotName) {
          var sg = suggest(tk.v);
          nd.suggestion = sg;
          G("fix", "não existe",
            "<code>[" + esc(tk.v) + "</code> fora do vocabulário." +
            (sg ? " → <code>[" + sg.name.toLowerCase() + "</code>" +
                  (PTBR[sg.name] ? " (" + PTBR[sg.name] + ")" : "") + "?" : " Veja a tabela."), "UnknownCommand",
            "does not exist", "<code>[" + esc(tk.v) + "</code> is outside the vocabulary." + (sg ? " → <code>[" + sg.name.toLowerCase() + "</code>" + (INSTR[sg.name] ? " (" + INSTR[sg.name] + ")" : "") + "?" : " See the table."));
        }
        attach(nd);
        if (tk.k === "open") stack.push(nd);
        pendingOrigin = null;
        continue;
      }

      switch (tk.k) {
        case "logic": {
          var lg = parseLogic(tk.v, tk.body);
          attach({ logic:lg, children:[], tok:tk, origin: pendingOrigin || "nest" });
          lg.gaps.forEach(function (g) { gaps.push(g); });
          if (!tk.closed) G("fix", "não fechou", "<code>[logic]</code> sem <code>[/logic]</code>.", "UnclosedLogic",
            "not closed", "<code>[logic]</code> without <code>[/logic]</code>.");
          pendingOrigin = null;
          break;
        }
        case "tpl": {
          var tnode = { template:tk.v, isDef:!!tk.def, children:[], tok:tk,
                        origin: pendingOrigin || (top() ? "nest" : "root") };
          attach(tnode); stack.push(tnode); pendingOrigin = null;
          break;
        }
        case "chain": seg.continues = true; break;

        case "close":
          if (!stack.length) G("fix", "sobrando", "<code>]</code> sem comando aberto.", "UnmatchedCloseBracket",
            "spare", "<code>]</code> with no command open.");
          else stack.pop();
          pendingOrigin = null;
          break;

        case "closeTag": {
          var found = -1;
          for (var s2 = stack.length-1; s2 >= 0; s2--)
            if (String(stack[s2].canonical).toUpperCase() === String(tk.v).toUpperCase()) { found = s2; break; }
          if (found === -1) G("fix", "sobrando", "<code>[/" + esc(tk.v) + "]</code> fecha comando não aberto.", "UnmatchedCloseTag",
            "spare", "<code>[/" + esc(tk.v) + "]</code> closes a command that never opened.");
          else stack.length = found;
          break;
        }

        case "colon": {
          var t2 = top();
          if (!t2) break;
          var parts = [], j5 = i + 1, sawComma = false;
          while (j5 < tokens.length) {
            var nx = tokens[j5];
            if (nx.k === "close" || nx.k === "semi" || nx.k === "open" || nx.k === "linebreak" || nx.k === "logic") break;
            if (nx.k === "comma") { sawComma = true; parts.push(","); j5++; continue; }
            if (nx.k === "literal" || nx.k === "text") { parts.push(String(nx.v).trim()); j5++; continue; }
            if (nx.k === "equals") { parts.push("="); j5++; continue; }
            if (nx.k === "extend") { parts.push("-"); j5++; continue; }
            break;
          }
          t2.colon = parts.join(" ").replace(/\s+,/g, ",").trim();
          if (sawComma && !STRUCT[t2.canonical])
            G("ask", "ordem incerta",
              "<code>[" + esc(t2.raw) + ": a,b,c]</code> ordem não inferível. Aninhe.", "AmbiguousSlotOrder",
            "order unclear", "<code>[" + esc(t2.raw) + ": a,b,c]</code> order cannot be inferred. Nest them.");
          i = j5 - 1;
          break;
        }

        case "literal": {
          var t3 = top();
          var lit = { literal:true, v:tk.v, form:tk.form, tok:tk };
          if (t3) t3.children.push(lit); else seg.children.push(lit);
          /* The message used to read "Feche com ``` antes." — advice the author has
             already followed, because the closing backtick IS there, just after
             the `]`. Naming the fix instead of the cause made a one-line lexer
             rule impossible to read out of the diagnostic: the culprit is the
             character itself, and there is no escape for it under either quote. */
          if (tk.closedBy === "bracket" || tk.closedBy === "semi")
            G("fix", "texto cortado",
              "<code>" + (tk.closedBy === "bracket" ? "]" : ";") +
              "</code> encerra o literal aqui, e não há escape para ele. Reescreva o texto sem esse caractere.",
              "TruncatedLiteral",
            "text cut", "<code>" + (tk.closedBy === "bracket" ? "]" : ";") +
              "</code> ends the literal here, and there is no escape for it. Rewrite the text without that character.");
          if (tk.closedBy === "eof") G("fix", "texto aberto", "<code>`</code> sem fechar.", "UnterminatedLiteral",
            "text left open", "<code>`</code> never closed.");
          if (tk.form === "quote" && tk.closedBy === "unterminated")
            G("fix", "texto aberto", "<code>'</code> sem fechar.", "UnterminatedLiteral",
            "text left open", "<code>'</code> never closed.");
          pendingOrigin = null;
          break;
        }

        case "emotion": {
          var key = tk.v.toLowerCase();
          if (!EMO[key]) {
            /* It said "Ignorado" and it was not ignored: the code went on into
               seg.mood carrying the gloss "?", and buildXml joined those
               glosses into also="?" — a literal question mark printed into the
               deliverable, announced by a `note` saying the opposite. A
               misleading low-severity diagnostic is worse than none, because it
               reads as handled. Now it is discarded here, at `fix`, with a
               position, and no `?` can reach the XML under any input. */
            G("fix", "humor fora da tabela",
              "<code>/" + esc(tk.v) + "/</code> não está na tabela de emoções. Descartado.",
              "UnknownEmotion",
              "mood off-table",
              "<code>/" + esc(tk.v) + "/</code> is not in the emotion table. Discarded.",
              tk);
            break;
          }
          var rec = { name:key, gloss:EMO[key], order:tk.order };
          var t4 = top(); if (t4) t4.emotions.push(rec);
          seg.mood.push(rec);
          break;
        }

        case "extend": {
          pendingOrigin = "extend";
          var nx2 = tokens[i+1];
          if (!nx2 || (nx2.k !== "open" && nx2.k !== "bareTag" && nx2.k !== "literal" && nx2.k !== "text"))
            G("fix", "pendurado", "<code>-</code> sem cadeia. Ex.: <code>[rw-cr</code>.", "DanglingChain",
            "dangling", "<code>-</code> with no chain. E.g. <code>[rw-cr</code>.");
          break;
        }
        /* `/` in a chain position, and the abandoned `\emo\` spelling. Both
           are refused by name rather than swallowed: an empty slot does not
           block, but that protects information that is MISSING, never
           information that is MALFORMED. Bucket N, `fix`, with a position. */
        case "badslash":
          G("fix", "barra na cadeia",
            "<code>/</code> dentro de uma cadeia. O divisor foi removido em v1.7 (C-01) e " +
            "<code>/</code> agora delimita apenas emoção. Feche a cadeia antes: <code>[in-rwk]/eth/</code>.",
            "SlashInChain",
            "slash in chain",
            "<code>/</code> inside a chain. The divider was removed in v1.7 (C-01) and " +
            "<code>/</code> now delimits emotion only. Close the chain first: <code>[in-rwk]/eth/</code>.",
            tk);
          break;
        case "badmood":
          G("fix", "grafia abandonada",
            "<code>\emo\</code> foi substituída por <code>/emo/</code> em v1.7 (I-19). " +
            "Escreva <code>/eth/</code>.",
            "BackslashMood",
            "abandoned spelling",
            "<code>\emo\</code> was replaced by <code>/emo/</code> in v1.7 (I-19). " +
            "Write <code>/eth/</code>.",
            tk);
          break;
        case "comma":  pendingOrigin = "item"; break;
        case "equals": { var t5 = top(); if (t5) t5.isDefinition = true; break; }
        case "semi":   closeSeg("semi"); break;

        case "linebreak": {
          seg.breaks++;
          if (stack.length)
            G("note", "quebra visual",
              "<code>;;</code> não fecha bloco, só <code>;</code> fecha. Segue aberto: " +
              stack.map(function (x) { return "<code>[" + esc(String(x.canonical || x.template || "?").toLowerCase()) + "</code>"; }).join(", ") + ".", "LinebreakInsideBlock",
            "visual break", "<code>;;</code> does not close a block, only <code>;</code> does. Still open: " + stack.map(function (x) { return "<code>[" + esc(String(x.canonical || x.template || "?").toLowerCase()) + "</code>"; }).join(", ") + ".");
          break;
        }

        case "mode": {
          if (tk.v === "OFF") {
            var mn = { mode:"off", children:[], tok:tk };
            var t6 = top(); if (t6) t6.children.push(mn); else seg.children.push(mn);
            seg.pendingMode = mn;
          } else seg.pendingMode = null;
          break;
        }
        case "modeUnclosed":
          G("note", "modo texto", "<code>[off]</code> sem <code>[on]</code>. Resto lido como prosa.", "UnclosedOffMode",
            "text mode", "<code>[off]</code> without <code>[on]</code>. The rest is read as prose.");
          break;
        case "raw": {
          var rawNode = { literal:true, v:tk.v, form:"raw", tok:tk };
          if (seg.pendingMode) seg.pendingMode.children.push(rawNode); else seg.children.push(rawNode);
          break;
        }
        case "return": seg.isReturn = true; break;

        case "text": {
          var v = String(tk.v).trim();
          if (!v) break;
          var t7 = top();
          var txt = { text:true, v:v, tok:tk };
          if (t7) t7.children.push(txt); else seg.children.push(txt);
          if (/^(if|or|else|and|then|unless|se|ou|senao|entao)$/i.test(v))
            G("note", "palavra solta",
              "<code>" + esc(v) + "</code> solto. Lógica: <code>[if</code> <code>[unls</code> <code>[logic]</code>.", "LooseKeyword",
            "loose word", "<code>" + esc(v) + "</code> on its own. Logic: <code>[if</code> <code>[unls</code> <code>[logic]</code>.");
          /* A loose word that exists in the vocabulary is almost always a
             command written without `[`. Without this it becomes <off>,
             inert prose: the `rd` in a long query vanishes with no warning
             at all. */
          else if (/^[A-Za-z][A-Za-z0-9_.]*$/.test(v)) {
            var uw = v.toUpperCase(), lw = v.toLowerCase();
            var known = INSTR[uw] || ALIAS[uw] || STRUCT[uw] || META[uw] ||
                        (opts.session !== false && SESSION[lw]);
            if (known)
              G("ask", "comando solto",
                "<code>" + esc(v) + "</code> está no vocabulário mas foi escrito sem <code>[</code> — " +
                "virou prosa (<code>&lt;off&gt;</code>), não comando. Queria <code>[" + esc(lw) + "</code>?", "LooseCommandWord",
            "loose command", "<code>" + esc(v) + "</code> is in the vocabulary but was written without <code>[</code> — " + "it became prose (<code>&lt;off&gt;</code>), not a command. Did you mean <code>[" + esc(lw) + "</code>?");
          }
          if (/^\.+$/.test(v))
            G("note", "ponto solto",
              "<code>.</code> sem função. Separadores: <code>,</code> <code>;</code> <code>;;</code>.", "LooseDots",
            "loose dot", "<code>.</code> has no function here. Separators: <code>,</code> <code>;</code> <code>;;</code>.");
          break;
        }
      }
    }
    closeSeg("eof");

    // ---- template expansion ----
    // Before the other passes on purpose: valency, contradiction and empty
    // slot must see the expanded body, not the bare call.
    expandInvocations(segments, opts, G);

    // ---- empty template slot ----
    segments.forEach(function (sgx) {
      walk(sgx.children, function (nd2) {
        if (nd2.canonical !== "PH") return;
        var nameNode = (nd2.children || []).filter(function (c) { return c.slotName; })[0];
        var q = (nd2.children || []).filter(function (c) { return c.literal; })[0];
        G("ask", "casa vazia",
          (nameNode ? "<code>" + esc(nameNode.raw) + "</code> " : "") +
          (q ? esc(q.v) : "sem resposta"), "PlaceholderPending",
            "empty field", (nameNode ? "<code>" + esc(nameNode.raw) + "</code> " : "") + (q ? esc(q.v) : "no answer"));
      });
    });

    // ---- deep nesting in a long block ----
    // A `[` without a `]` nests inside the previous one. After a few
    // commands this stops being refinement and becomes scope nobody asked for.
    segments.forEach(function (sgd) {
      var deepest = null;
      walk(sgd.children, function (nd2) {
        if (nd2.depth === undefined) return;
        if (!deepest || nd2.depth > deepest.depth) deepest = nd2;
      });
      if (deepest && deepest.depth >= LIMITS.nesting) {
        var chain = [], p = deepest;
        while (p && chain.length < 4) { chain.unshift(String(p.canonical || "?").toLowerCase()); p = p.parent; }
        G("note", "muito fundo",
          (deepest.depth + 1) + " níveis de aninhamento (…" +
          chain.map(function (x) { return "<code>[" + esc(x) + "</code>"; }).join(" › ") +
          "). Cada <code>[</code> sem <code>]</code> entra dentro do anterior — se a intenção era " +
          "sequência e não escopo, feche com <code>]</code> ou separe com <code>,</code>.", "DeepNesting",
            "very deep", (deepest.depth + 1) + " levels of nesting (…" + chain.map(function (x) { return "<code>[" + esc(x) + "</code>"; }).join(" › ") + "). Every <code>[</code> without <code>]</code> goes inside the previous one — if you meant a sequence and not a scope, close it with <code>]</code> or separate with <code>,</code>.");
      }
    });

    // ---- mandatory name for SECTION / BLOCK ----
    segments.forEach(function (sgn) {
      walk(sgn.children, function (nd2) {
        if (!NAMED_STRUCT[nd2.canonical]) return;
        var firstReal = (nd2.children || []).filter(function (c) {
          return c.literal || c.canonical || c.logic || c.template || (c.text && c.v);
        })[0];
        if (!firstReal || !firstReal.literal)
          G("fix", "sem nome",
            "<code>[" + esc(String(nd2.canonical).toLowerCase()) + "</code> exige um nome literal como primeiro slot. Ex.: <code>[" +
            esc(String(nd2.canonical).toLowerCase()) + "'nome',…</code>.", "MissingStructName",
            "no name", "<code>[" + esc(String(nd2.canonical).toLowerCase()) + "</code> needs a literal name as its first slot. E.g. <code>[" + esc(String(nd2.canonical).toLowerCase()) + "'name',…</code>.");
      });
    });

    // ---- valency ----
    if (opts.valency !== false) {
      segments.forEach(function (sg2) {
        walk(sg2.children, function (nd2) {
          if (!nd2.canonical || nd2.chainElement || nd2.slotName) return;
          if (nd2.canonical === "PH") return;
          if (nd2.tier === "unknown" || nd2.tier === "empty") return;

          /* strict positional arity takes precedence over FRAMES valency */
          var slots = SLOTS[nd2.canonical];
          if (slots) {
            var got = valueChildren(nd2).length + (nd2.colon ? 1 : 0);
            for (var k = got; k < slots.length; k++)
              G("ask", "falta operando",
                "<code>[" + esc(String(nd2.canonical).toLowerCase()) + "</code> exige " +
                slots.length + " termos, recebeu " + got + ". Falta <strong>" + esc(slots[k]) + "</strong>.", "MissingOperand",
            "operand missing", "<code>[" + esc(String(nd2.canonical).toLowerCase()) + "</code> takes " + slots.length + " terms, got " + got + ". Missing <strong>" + esc(slots[k]) + "</strong>.");
            return;
          }

          var frame = FRAMES[nd2.canonical];
          if (!frame) return;
          var filled = valueChildren(nd2).length + (nd2.colon ? 1 : 0);
          var want = frame[0];
          if (filled === 0)
            G("ask", "sem alvo",
              "<code>[" + esc(String(nd2.canonical).toLowerCase()) + "</code>" +
              (PTBR[nd2.canonical] ? " (" + PTBR[nd2.canonical] + ")" : "") +
              ": <strong>" + esc(want.replace("*", "")) + "</strong>?", "UnfilledSlot",
            "no target", "<code>[" + esc(String(nd2.canonical).toLowerCase()) + "</code>" + (INSTR[nd2.canonical] ? " (" + INSTR[nd2.canonical] + ")" : "") + ": <strong>" + esc(want.replace("*", "")) + "</strong>?");
          else if (want.slice(-1) === "*" && filled === 1)
            G("note", "lista de um",
              "<code>[" + esc(String(nd2.canonical).toLowerCase()) + "</code> aceita n itens, recebeu 1. Liste com <code>,</code>.", "SingletonList",
            "list of one", "<code>[" + esc(String(nd2.canonical).toLowerCase()) + "</code> takes n items, got 1. List them with <code>,</code>.");
        });
      });
    }

    // ---- composition species (optional store) ----
    // Annotation only: it changes no diagnostic and no XML. A command being
    // composite is not a problem to report, it is a fact an .hgml emitter
    // needs — so it rides in the AST and nowhere else.
    if (expansionRegistry(opts)) {
      segments.forEach(function (sgx2) {
        walk(sgx2.children, function (nd2) {
          if (!nd2.canonical) return;
          var e = entryOf(nd2.canonical, opts);
          if (!e) return;
          nd2.species = e.species;
          nd2.compositionDepth = typeof e.depth === "number" ? e.depth : null;
        });
      });
    }

    // ---- semantic rules (pairs, order, preconditions) ----
    checkRules(segments, opts, G);

    // ---- template constraints (the shape each preset promises) ----
    checkTemplateConstraints(segments, opts, G);

    // ---- templates ----
    var defd = {}, invoked = [];
    segments.forEach(function (sg3) {
      walk(sg3.children, function (nd3) {
        if (!nd3.template) return;
        if (nd3.isDef) {
          defd[nd3.template.toLowerCase()] = true;
          if (!(nd3.children || []).length)
            G("fix", "tpl vazio",
              "<code>[--" + esc(nd3.template) + "=</code> sem corpo.", "EmptyTemplateDefinition",
            "empty tpl", "<code>[--" + esc(nd3.template) + "=</code> has no body.");
        } else invoked.push(nd3.template);
      });
    });
    var known = templateRegistry(opts) || {};
    invoked.forEach(function (nm) {
      if (!defd[nm.toLowerCase()] && !known[nm.toLowerCase()] && !known[nm])
        G("note", "tpl indefinido",
          "<code>[--" + esc(nm) + "</code> não definido aqui. TPL não persiste entre sessões. Redefina: <code>[--" +
          esc(nm) + "=…</code>.", "UndefinedTemplate",
            "tpl undefined", "<code>[--" + esc(nm) + "</code> is not defined here. TPL does not persist between sessions. Redefine it: <code>[--" + esc(nm) + "=…</code>.");
    });

    var rank = { fix:0, ask:1, note:2 };
    gaps.sort(function (a, b) { return rank[a.sev] - rank[b.sev]; });
    gaps.forEach(function (g) { g.plain = stripTags(g.msg); });
    return { segments:segments, gaps:gaps, tokens:tokens };
  }

  /* ======================================================
     5. XML EMITTER — the message that travels to the machine
     ====================================================== */

  /* Ceilinged indent. Without the ceiling the XML grows with the SQUARE of
     depth: 500 levels turned into ~500 KB of whitespace, and the XML is
     exactly the thing that gets copied into the chat. Past the ceiling the
     structure stays readable through the tags themselves. */
  function pad(d) { return new Array(Math.min(d, LIMITS.indent) + 1).join("  "); }

  function buildXml(segments, opts) {
    if (!segments.length) return "<!-- escolha um molde ou escreva do lado esquerdo -->";
    var L = ["<glyph-package engine=\"" + VERSION + "\">", pad(1) + "<schema/>"];
    segments.forEach(function (sg) {
      if (sg.isReturn) {
        var exp = [], bad = [];
        collect(sg.children, exp, bad);
        L.push(pad(1) + "<block" + blockAttrs(sg) + ">");
        var head = '<user-expectative expects="' + xesc(exp.join(",")) + '"';
        /* `expects` is only the flattened summary. Through v1.0.9 it was ALL the
           return block emitted, so literals and nesting were discarded:
           `r-[tgt\`user command blocks\`` lost the whole text. The real body
           travels along with it now. */
        if (!sg.children.length) L.push(pad(2) + head + "/>");
        else {
          L.push(pad(2) + head + ">");
          // emit() already renders an unknown tier as <unresolved>, so `bad`
          // only serves to decide the summary — nothing gets emitted twice.
          sg.children.forEach(function (nd) { emit(nd, 3, L, opts); });
          L.push(pad(2) + "</user-expectative>");
        }
        L.push(pad(1) + "</block>");
        if (sg.breaks) L.push(pad(1) + "<break/>");
        return;
      }
      L.push(pad(1) + "<block" + blockAttrs(sg) + ">");
      if (sg.mood.length) {
        var a = ['dominant="' + xesc(sg.mood[0].gloss) + '"'];
        if (sg.mood.length > 1)
          a.push('also="' + xesc(sg.mood.slice(1).map(function (m) { return m.gloss; }).join(",")) + '"');
        L.push(pad(2) + "<mood " + a.join(" ") + "/>");
      }
      sg.children.forEach(function (nd) { emit(nd, 2, L, opts); });
      L.push(pad(1) + "</block>");
      if (sg.breaks) L.push(pad(1) + "<break/>");
    });
    L.push("</glyph-package>");
    return packagePass(L, opts).join("\n");
  }


  /* ---- glyph-package, the structural pass (E3b) ------------------------
     Sections 3 and 4 of PACKAGE_TARGET.md are shape, not content, so they run
     as one pass over the emitted lines rather than threading through `emit`.
     The same algorithm was validated against the hand-derived golden byte for
     byte BEFORE any emitter existed, which is the direction lock T5 demands.  */
  function packageIndent(s) { return s.length - s.replace(/^ +/, "").length; }

  function packagePass(L, opts) {
    /* 3 — a maximal run of siblings, first `extend` then `item`s, is one
       <chain>, and the attribute does not survive it: position carries it.
       A second `extend` opens a NEW run (3.4), which is what keeps `-`
       distinguishable from `,`. */
    var out = [];
    for (var i = 0; i < L.length; i++) {
      var line = L[i];
      if (!/\schain="extend"\s*\/>/.test(line)) { out.push(line); continue; }
      var ind = packageIndent(line), run = [line], j = i + 1;
      while (j < L.length && packageIndent(L[j]) === ind && /\schain="item"\s*\/>/.test(L[j])) {
        run.push(L[j]); j++;
      }
      var padding = new Array(ind + 1).join(" ");
      out.push(padding + "<chain>");
      for (var r = 0; r < run.length; r++)
        out.push("  " + run[r].replace(/\schain="(extend|item)"/, ""));
      out.push(padding + "</chain>");
      i = j - 1;
    }
    /* 4 — <invoke> is a leaf, first child of the element whose call it
       describes, and only where the command is composite: an atom's reading is
       its own name, and saying so on every element is a tautology with a cost. */
    var withInvokes = [];
    for (var m = 0; m < out.length; m++) {
      var l = out[m], t = l.replace(/^ +/, "");
      withInvokes.push(l);
      if (t.charAt(0) !== "<" || t.indexOf("</") === 0 || /\/>$/.test(t)) continue;
      var nm = (t.match(/^<([a-z-]+)[\s>]/) || [])[1];
      var hit = nm && GLOSS_REVERSE[nm];
      if (!hit || speciesOf(hit.canonical, opts) !== "composite") continue;
      withInvokes.push(new Array(packageIndent(l) + 3).join(" ") +
        '<invoke reads="' + xesc(formulaOf(hit.canonical, opts)) + '" species="composite" depth="' +
        depthOf(hit.canonical, opts) + '"/>');
    }
    return withInvokes;
  }


  function blockAttrs(sg) {
    return ' once="true"' + (sg.continues ? ' continues="previous"' : "");
  }

  function collect(list, acc, bad) {
    walk(list, function (nd) {
      if (!nd.canonical || nd.slotName) return;
      if (nd.tier === "unknown" || nd.tier === "empty") { if (bad) bad.push(nd); }
      else if (nd.canonical !== "PH") acc.push(elName(nd.canonical, nd.tier, nd.gloss));
    });
  }

  /* Iterative with an explicit stack. The recursive version overflowed the
     JS call stack around 2000 levels, and in Glyph depth grows with the
     query's size (every `[` without a `]` nests). A frame with `tail` holds
     the lines that close the node, pushed before the children so they come
     out after them. */
  function emit(root, startDepth, L, opts) {
    var stack = [{ nd:root, d:startDepth }];

    function pushKids(kids, d) {
      for (var i = kids.length - 1; i >= 0; i--) stack.push({ nd:kids[i], d:d });
    }

    while (stack.length) {
      var f = stack.pop();
      if (f.tail) { for (var t = 0; t < f.tail.length; t++) L.push(f.tail[t]); continue; }

      var nd = f.nd, d = f.d;

      if (nd.literal) {
        if (nd.form === "raw") { L.push(pad(d) + "<off>" + xesc(nd.v.trim()) + "</off>"); continue; }
        // value bound to a template slot: the slot's name travels along with it
        var slotAt = nd.boundSlot ? ' slot="' + xesc(nd.boundSlot) + '"' : "";
        L.push(pad(d) + "<user-input" + slotAt + ">" + xesc(nd.v) + "</user-input>");
        continue;
      }
      if (nd.text) { L.push(pad(d) + "<off>" + xesc(nd.v) + "</off>"); continue; }
      if (nd.mode) { pushKids(nd.children || [], d); continue; }
      if (nd.logic) { emitLogic(nd.logic, d, L); continue; }

      if (nd.template) {
        var ta = ' name="' + xesc(nd.template) + '"' + (nd.isDef ? ' define="true"' : "") +
                 (nd.expanded ? ' expanded="true"' : "") +
                 (nd.expanded && nd.gloss ? ' means="' + xesc(nd.gloss) + '"' : "");
        var tkids = nd.children || [];
        if (!tkids.length) { L.push(pad(d) + "<template" + ta + "/>"); continue; }
        L.push(pad(d) + "<template" + ta + ">");
        stack.push({ tail:[pad(d) + "</template>"] });
        pushKids(tkids, d + 1);
        continue;
      }

      // empty template slot: the question travels in place of the answer
      if (nd.canonical === "PH") {
        var nameNode = (nd.children || []).filter(function (c) { return c.slotName; })[0];
        var qNode = (nd.children || []).filter(function (c) { return c.literal; })[0];
        L.push(pad(d) + "<needs" + (nameNode ? ' slot="' + xesc(nameNode.raw) + '"' : "") + ">" +
          xesc(qNode ? qNode.v : "sem resposta") + "</needs>");
        continue;
      }

      var open, closeName;
      /* `chain` records the operator that attached a BARE element, and only a
         bare one. A bracketed child already announces its own scope, so marking
         it too would force fromXML() to decide whether chain="extend" meant
         `-rwk` or `-[rwk]` — a second bit smuggled into one attribute. `-[`
         normalises to `[` instead, and the attribute means exactly one thing:
         this element was written bare, by this operator. */
      var chainAttr = (nd.chainElement && (nd.origin === "extend" || nd.origin === "item"))
        ? 'chain="' + nd.origin + '"' : null;

      if (nd.tier === "unknown" || nd.tier === "empty") {
        var at = ['tag="' + xesc(nd.raw || "") + '"'];
        if (nd.suggestion) at.push('nearest="' + xesc(nd.suggestion.name.toLowerCase()) + '"');
        if (chainAttr) at.push(chainAttr);   /* so [in-zzz reads back as a chain link */
        open = "<unresolved " + at.join(" ");
        closeName = "unresolved";
      } else {
        var el = elName(nd.canonical, nd.tier, nd.gloss);
        var attrs = [];
        if (nd.editorial) attrs.push('force="editorial"');
        if (nd.colon) attrs.push('name="' + xesc(nd.colon) + '"');
        if (chainAttr) attrs.push(chainAttr);
        /* `describe` makes the message carry its own semantics, so whoever
           reads it does not need the Glyph vocabulary loaded to know what
           `<scrutinise>` means. Nothing here is invented: `means` is the gloss
           and `made-of` is the composition table, both already in the engine.

           Off by default — it changes the deliverable, and the plain form is
           the one every doc and every test describes. */
        if (opts && opts.describe) {
          /* A definição do glossário, não o rótulo do INSTR: `means="Review"`
             não acrescentava nada a `<review>`. Cai no rótulo só se a tabela
             de composição não estiver carregada. */
          var mean = defOf(nd.canonical, opts) || nd.gloss;
          if (mean) attrs.push('means="' + xesc(mean) + '"');
          var sp = speciesOf(nd.canonical, opts);
          if (sp === "composite") {
            /* Unique and sorted, not the raw sequence: as a signature of what
               the command IS, `ctx` appearing four times says nothing more
               than it appearing once — and the raw burn of SCRU is 64 items. */
            var seen = {}, uniq = [];
            (atomsOf(nd.canonical, opts) || []).forEach(function (a) {
              if (!seen[a]) { seen[a] = 1; uniq.push(a.toLowerCase()); }
            });
            attrs.push('made-of="' + xesc(uniq.sort().join(" ")) + '"');
          }
        }
        open = "<" + el + (attrs.length ? " " + attrs.join(" ") : "");
        closeName = el;
      }

      var kids = valueChildren(nd);

      /* ordered slots: each empty position travels as <needs slot="n"> */
      var slots = nd.chainElement ? null : SLOTS[nd.canonical];
      var slotNeeds = [];
      if (slots) {
        var got = kids.length + (nd.colon ? 1 : 0);
        for (var k = got; k < slots.length; k++) slotNeeds.push({ pos:k + 1, want:slots[k] });
      }

      var frame = slots ? null : FRAMES[nd.canonical];
      var needs = (frame && !nd.chainElement && kids.length === 0 && !nd.colon) ? frame[0].replace("*", "") : null;
      var allKids = nd.children || [];

      if (!allKids.length && !needs && !slotNeeds.length) { L.push(pad(d) + open + "/>"); continue; }

      L.push(pad(d) + open + ">");
      if (needs) L.push(pad(d + 1) + "<needs>" + xesc(needs) + "</needs>");

      var tail = [];
      slotNeeds.forEach(function (s) {
        tail.push(pad(d + 1) + '<needs slot="' + s.pos + '">' + xesc(s.want) + "</needs>");
      });
      tail.push(pad(d) + "</" + closeName + ">");
      stack.push({ tail:tail });
      pushKids(allKids, d + 1);
    }
  }

  function emitLogic(lg, d, L) {
    L.push(pad(d) + "<logic" + (lg.name ? ' name="' + xesc(lg.name) + '"' : "") + ">");
    lg.rules.forEach(function (r) {
      var at = ['kind="' + r.kind + '"'];
      if (r.name) at.push('var="' + xesc(r.name) + '"');
      L.push(pad(d+1) + "<rule " + at.join(" ") + ">");
      L.push(pad(d+2) + "<source>" + xesc(r.source) + "</source>");
      L.push(pad(d+2) + "<reads>" + xesc(r.reads) + "</reads>");
      if (r.then) L.push(pad(d+2) + "<then>" + xesc(r.then) + "</then>");
      if (r.uses && r.uses.length) L.push(pad(d+2) + "<uses>" + xesc(r.uses.join(", ")) + "</uses>");
      L.push(pad(d+1) + "</rule>");
    });
    lg.missing.forEach(function (v) {
      L.push(pad(d+1) + '<needs var="' + xesc(v) + '">usado e nunca definido</needs>');
    });
    L.push(pad(d) + "</logic>");
  }

  /** human → glyph → XML, in one call. */
  function toXML(src, opts) {
    return buildXml(parse(src, opts).segments, opts);
  }

  /* ======================================================
     6. AST JSON — clean serialization, no cycles
     ====================================================== */

  /* The shallow node, without `body` — the body gets filled by the iterative loop below. */
  /* ------------------------------------------------------------------ *
   * ck — a 64-bit checksum, in-core and declared
   *
   * Node's crypto is not reachable from the browser half of this engine, and
   * SubtleCrypto is async, which fights a synchronous serialiser. A hand-rolled
   * hash deserves a conscious yes, and this is it: two independent FNV-1a runs
   * over UTF-16 code units, different offset bases, concatenated. Declared here
   * so a port reproduces it bit for bit rather than inventing its own and
   * silently disagreeing about whether two stores are the same.
   * ------------------------------------------------------------------ */
  /* the AST envelope's own shape version, moved independently of the engine.
     Bumped when a field is added, removed or changes meaning — 2 because the
     `full`/`panel` split, `origin`, `at`, `slot` and `expanded` all landed at
     once and a reader of a v1 envelope must not be told it understands them. */
  var AST_SCHEMA = 2;

  /* A store is fingerprinted by its serialised form. Deterministic because the
     stores are parsed from files and JSON.stringify preserves that order; null
     when no store is loaded, which is itself the fact a receiver needs. */
  function storeCk(store) { return store ? ck(JSON.stringify(store)) : null; }

  function srcDescriptor(opts) {
    var t = (opts && typeof opts.__source === "string") ? opts.__source : null;
    if (t === null) return null;          /* serializeAST called without a source */
    var d = {
      length: t.length,
      checksum: ck(t),
      encoding: "utf-8",
      /* a receiver that rewrites line endings on the way in would invalidate
         every offset in the envelope, so the descriptor records which it was */
      newline: (t.indexOf("\r\n") !== -1)
        ? (new RegExp("[^\r]\n").test(t) ? "mixed" : "crlf") : "lf",
      uri: (opts && opts.uri) || null
    };
    if (opts && opts.embedSource === true) d.text = t;
    return d;
  }

  function ck(str) {
    var s = String(str == null ? "" : str);
    var a = 0x811c9dc5, b = 0x01000193, i, c;
    for (i = 0; i < s.length; i++) {
      c = s.charCodeAt(i);
      a ^= c; a = (a * 0x01000193) >>> 0;
      b ^= c + i; b = (b * 0x85ebca6b) >>> 0;
    }
    return ("00000000" + a.toString(16)).slice(-8) + ("00000000" + b.toString(16)).slice(-8);
  }

  function astShallow(nd) {
    /* `slot` is the template parameter this literal was bound to. It reached
       the XML as `<user-input slot="…">` and never reached the AST, so an
       expanded invocation could not be told from its own expansion — the second
       field fromAST proved missing from a projection called `full`. */
    if (nd.literal) return { type: nd.form === "raw" ? "Raw" : "Literal", value: nd.v,
                             form: nd.form, slot: nd.boundSlot || null };
    if (nd.text) return { type:"Text", value:nd.v };
    if (nd.mode) return { type:"ModeOff" };
    if (nd.logic) {
      return {
        type:"Logic",
        name: nd.logic.name || null,
        rules: nd.logic.rules.map(function (r) {
          return { kind:r.kind, line:r.line, name:r.name || null, source:r.source,
                   expr:r.expr, then:r.then || null, reads:r.reads, uses:r.uses || [] };
        }),
        missing: nd.logic.missing
      };
    }
    /* `expanded` was in the XML and not in the AST, which made an expanded
       invocation indistinguishable from a definition body — writing fromAST is
       what surfaced it: the reconstruction wrote out the whole expansion where
       the author had typed `[--germinate]`. A projection called `full` that is
       missing a field the XML carries is not full. */
    if (nd.template) return { type:"Template", name:nd.template,
                              isDefinition:!!nd.isDef, expanded:!!nd.expanded };
    return {
      type:"Command",
      raw: nd.raw,
      canonical: nd.canonical,
      tier: nd.tier,
      gloss: nd.gloss || "",
      element: (nd.tier === "unknown" || nd.tier === "empty") ? null : elName(nd.canonical, nd.tier, nd.gloss),
      isAlias: !!nd.alias,
      chainElement: !!nd.chainElement,
      /* The operator that produced the edge to the parent. The parser has
         always computed it; it was simply never exported, which is what made
         `[a-b,c]` and `[a-b-c]` serialise to one identical AST and left
         fromXML() unable to tell them apart. */
      origin: nd.origin || null,
      slotName: !!nd.slotName,
      editorial: !!nd.editorial,
      name: nd.colon || null,
      depth: nd.depth,
      autoClosed: !!nd.autoClosed,
      suggestion: nd.suggestion ? nd.suggestion.name : null,
      emotions: nd.emotions || [],
      /* v1.1.0.0 — null unless the expansion store is loaded. `depth` above is
         how deep this node sits in the USER's text; `compositionDepth` is how
         deep the command sits in the vocabulary. Different axes, both useful. */
      species: nd.species || null,
      compositionDepth: (nd.compositionDepth === undefined) ? null : nd.compositionDepth
    };
  }

  /* Nodes that carry `body`. Logic holds rules, not children. */
  function astHasBody(nd) { return !!(nd.mode || nd.template || (!nd.literal && !nd.text && !nd.logic)); }

  /* Every node used to carry all sixteen fields whether or not they said
     anything: 43% of them were `false`, `null` or `[]`. A 321-character input
     produced 23 KB of AST, and a panel that long is a panel nobody reads.

     Dropped: anything empty, plus `raw` when it only repeats `canonical` in
     lower case. NOT dropped, even though derivable: `element` (the contract
     with the XML emitter), `depth` and `type`. Those are cheap and something
     downstream may switch on them — thinning a payload is not worth breaking
     a consumer over.

     The thinning applies to the `panel` projection only; the exported
     `full` projection keeps every field. See projectionOf(). */
  /* Two named projections, replacing a boolean.
   *
   *   full   every declared field, always present, no drop rules
   *   panel  the thinned shape, for the screen
   *
   * The distinction is load-bearing now that the AST is the source of truth
   * (T23). Under thinning, a field's ABSENCE means null, false, "" or [] — and
   * also "dropped because it repeated the canonical", and also "dropped because
   * this is an atom", and also "an older engine never had it". Six states in
   * one signal. That is survivable in a panel a human skims and fatal in a
   * payload that must be diffed against another machine's, or read back into
   * source: a reconstructor cannot tell a missing operand from a dropped one.
   *
   * So the EXPORT is `full` by default and `panel` is asked for explicitly, by
   * the screen, which is the only consumer that ever wanted it. `verbose:true`
   * kept as an alias for one release. */
  function projectionOf(opts) {
    if (opts && opts.projection === "panel") return "panel";
    if (opts && opts.projection === "full") return "full";
    if (opts && opts.verbose === true) return "full";   /* deprecated alias */
    if (opts && opts.verbose === false) return "panel"; /* deprecated alias */
    return "full";
  }

  function astLean(o) {
    var out = {}, k, v;
    for (k in o) {
      if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
      v = o[k];
      if (v === null || v === false || v === "" || (Array.isArray(v) && !v.length)) continue;
      if (k === "raw" && o.canonical && String(v).toUpperCase() === o.canonical) continue;
      if (k === "compositionDepth" && o.species === "atom") continue;   // átomo é sempre 0
      /* `origin` is a non-empty string on every node, so exporting it naively
         would put "root" or "nest" on the great majority of them and undo the
         thinning this function exists for. Both are derivable from position —
         root is a child of the segment, nest is a child of a command — while
         `extend` and `item` are not, and they are the whole reason the field
         is exported. The `full` projection keeps them, as it keeps everything. */
      if (k === "origin" && (v === "root" || v === "nest")) continue;
      out[k] = v;
    }
    return out;
  }

  /* Iterative for the same reason as emit: in a long block the tree is deep.

     The depth ceiling isn't a whim: even with iterative construction, V8's
     `JSON.stringify` recurses internally and overflows around a thousand
     levels. Since the AST is an inspection panel (the deliverable is the
     XML, which has no ceiling), truncating with an explicit marker beats
     bringing down the whole serialization. */
  function astNode(root, stats, opts) {
    var holder = [];
    var stack = [{ nd:root, arr:holder, d:0 }];
    while (stack.length) {
      var f = stack.pop();

      if (f.d >= LIMITS.astDepth) {
        var omitted = 0;
        walk([f.nd], function () { omitted++; });
        f.arr.push({ type:"Truncated", reason:"depth", atDepth:LIMITS.astDepth, omittedNodes:omitted, at:null });
        if (stats) stats.truncated += omitted;
        continue;
      }

      var obj = astShallow(f.nd);
      if (projectionOf(opts) === "panel") obj = astLean(obj);
      else {
        /* The span in the source that produced this node. Every token has
           carried `s`/`e` since the lexer was written and every node has
           carried its token — this is the same shape as `origin`: computed
           from the start, discarded at serialisation, and missed only once
           something outside the engine needed to read the result.

           It is what makes a diagnostic locatable by a reader who does not
           have the engine, and it is the substrate a trace is built on: given
           a span, which command; given a command, which span. `panel` does not
           get it, because the screen has the source in front of it. */
        obj.at = (f.nd.tok && typeof f.nd.tok.s === "number")
          ? { s: f.nd.tok.s, e: f.nd.tok.e } : null;
      }
      f.arr.push(obj);
      if (astHasBody(f.nd)) {
        obj.body = [];
        var kids = f.nd.children || [];
        for (var i = kids.length - 1; i >= 0; i--) stack.push({ nd:kids[i], arr:obj.body, d:f.d + 1 });
      }
    }
    return holder[0];
  }

  /* Serializes already-parsed segments. The raw nodes carry `parent` and
     `tok`, which close cycles — JSON.stringify straight on them overflows. */
  function serializeAST(segments, gaps, opts) {
    var stats = { truncated: 0 };
    var out = {
      type: "GlyphAST",
      /* `schema` is the SHAPE of this envelope; `version` is the engine that
         produced it. They were one field, and a reader had to pin an engine
         build to say "I understand this" — which is the wrong question. The
         repository already separates them elsewhere: expansions.json carries
         `schema: 2`, the dispatch carries `schema: 1`. */
      schema: AST_SCHEMA,
      version: VERSION,
      /* Store fingerprints, and this is the field most easily forgotten and
         the one that breaks a hand-off outright. `species`, `compositionDepth`
         and `def` are FUNCTIONS of expansions.json; `name` resolution is a
         function of templates.json. Re-import against a different store yields
         a different meaning for the same tree, silently — the exact defect
         class this order is named after. A receiver compares these and refuses,
         instead of discovering it later by being wrong. */
      /* A DESCRIPTOR, never the text. T12 keeps the source out of the general
         export — the surface where the XML is pasted does not read Glyph — but
         offsets with no anchor are unresolvable on arrival: a receiver cannot
         tell whether `at: {s:11,e:16}` belongs to the source in front of it.
         The descriptor lets it assert that and refuse otherwise, which makes
         T12's carve-out mechanical instead of a convention. `{embedSource:true}`
         adds the text, for the examples and teaching models T12 allows. */
      source: srcDescriptor(opts),
      stores: {
        templates: storeCk(opts && opts.templates ? opts.templates : TEMPLATES),
        rules: storeCk(opts && opts.rules ? opts.rules : RULES),
        expansions: storeCk(opts && opts.expansions ? opts.expansions : EXPANSIONS)
      },
      /* A reader must never have to infer which projection it was handed by
         noticing which fields happen to be absent — that inference is exactly
         what the thinning made impossible. The envelope says so. */
      projection: projectionOf(opts),
      segments: segments.map(function (s) {
        var seg = {
          type: "Segment",
          mood: s.mood,
          isReturn: !!s.isReturn,
          continues: !!s.continues,
          breaks: s.breaks,
          autoClosedCount: s.autoClosed
        };
        if (projectionOf(opts) === "panel") seg = astLean(seg);
        // not map(astNode) directly: map passes the index as the 2nd argument
        seg.body = s.children.map(function (nd) { return astNode(nd, stats, opts); });
        return seg;
      }),
      diagnostics: (gaps || []).map(function (g) {
        /* `at` was added to the gap record and stopped here, which is the same
           shape as `origin` and the same shape as the propagation failure this
           whole release is named after: the value existed, one consumer did not
           carry it, and the omission was invisible because nothing downstream
           could ask. A refusal a reader cannot locate is a refusal they cannot
           act on. */
        var d = { code:g.code, severity:g.sev, label:g.lab, message:g.plain };
        if (g.at && typeof g.at.s === "number") d.at = { s:g.at.s, e:g.at.e };
        return d;
      })
    };
    if (stats.truncated) {
      out.truncatedNodes = stats.truncated;
      /* The ceiling was justified in-comment by the AST being "an inspection
         panel": truncating a panel with a marker beats bringing the whole
         serialisation down. T23 retired that premise. A source of truth that
         silently omits part of itself is not one, and the marker sits deep in
         the tree where a reader has to already suspect it to find it.
         So in `full` the omission is announced at the envelope, at `fix`,
         where glyph-check refuses it and a human sees it first. `panel` keeps
         the quiet marker: the screen has the source next to it. */
      if (projectionOf(opts) === "full")
        out.diagnostics.push({
          code: "DepthExceeded", severity: "fix", label: "profundidade",
          message: "a árvore passa de " + LIMITS.astDepth + " níveis e " + stats.truncated +
                   " nós foram omitidos — este envelope não está completo e não deve ser " +
                   "carregado como se estivesse."
        });
    }
    return out;
  }

  function toAST(src, opts) {
    /* The envelope TRAVELS: it is read on another machine, by something that
       does not have this engine. So its diagnostics default to en-EU, and a
       caller that wants the pt-BR interface strings asks for them by name.
       The interface keeps pt-BR; the artefact does not. */
    var o0 = {};
    for (var k0 in (opts || {})) if (Object.prototype.hasOwnProperty.call(opts, k0)) o0[k0] = opts[k0];
    if (!o0.lang) o0.lang = "en";
    opts = o0;
    var r = parse(src, opts);
    var o = {};
    for (var k in (opts || {})) if (Object.prototype.hasOwnProperty.call(opts, k)) o[k] = opts[k];
    o.__source = String(src == null ? "" : src);
    return serializeAST(r.segments, r.gaps, o);
  }

  /* ======================================================
     7. .hgml — HIEROGLYPH MARKDOWN, the atomic burn

     What the XML emitter does NOT do: reduce. `<criticise>` travels as one
     tag, and whatever CRIT is *made of* stays implicit. .hgml burns the tree
     down to pure matter — every composite replaced by its formula, over and
     over, until only hieroglyphs are left.

     Two things make this cheap instead of a second language:

       1. A formula IS valid Glyph, so `parse()` reads it. No second grammar.
       2. The output is valid Glyph too, so it can be re-parsed — which gives
          a correctness oracle for free (see the round-trip bucket in the
          suite) instead of a hand-written expectation per case.

     Form: every tag opens WITHOUT `]` and closes with `[/name]`. That is not
     decoration — `]` already closes a command, so `[ctx][/ctx]` would emit an
     UnmatchedCloseTag. `[ctx[/ctx]` is the closed form.

     Cost: the burn is an EXPANSION, not a compression. A composite averages
     ~15 hieroglyphs and HYP reaches 101, so a short input grows about 25x.
     That is inherent to "100% hieroglyphs" — density and full decomposition
     pull in opposite directions, and this format chose decomposition.
     ====================================================== */

  var BURN_LIMIT = 24;          // safety net; the build already refuses cycles

  /* The human's operand is the subject of the whole formula (GLOSSARY.md §0.3).
     Concretely: it becomes the first child of the formula's head command. The
     rule has to be mechanical or the burn cannot be automated at all. */
  function injectSubject(body, operands) {
    if (!operands || !operands.length) return body;
    for (var i = 0; i < body.length; i++) {
      if (body[i].canonical) {
        body[i].children = operands.concat(body[i].children || []);
        return body;
      }
    }
    return operands.concat(body);   // formula with no command head: prepend
  }

  var burnTruncated = false;
  var burnBlends = [];        /* what fired, so the output can declare itself */

  /* Co-occurrence among siblings in the burnt form. The burn is a canonical
     form, so this asks a question about MEANING and not about spelling. */
  function applyBlends(list, opts) {
    var store = (opts && opts.rules) || RULES;
    if (!store) return list;
    var comp = store.__compiled || (store.__compiled = compileRules(store));
    if (!comp || !comp.blends.length || !list.length) return list;
    var out = list, i;
    for (i = 0; i < comp.blends.length; i++) {
      var b = comp.blends[i];
      var present = b.when.every(function (c) {
        return out.some(function (n) { return n.canonical === c; });
      });
      if (!present) continue;
      var kids = [];
      var kept = out.filter(function (n) {
        if (b.when.indexOf(n.canonical) !== -1) {
          (n.children || []).forEach(function (k) { kids.push(k); });
          return false;
        }
        return true;
      });
      if (burnBlends.indexOf(b) === -1) burnBlends.push(b);
      kept.push({ canonical: b.emit, blended: true, children: kids });
      out = kept;
    }
    return out;
  }

  function burnList(list, opts, chain, depth) {
    var out = [];
    depth = depth || 0;
    /* the same ceiling the AST uses, so the three projections agree on what
       deep means. Announced rather than survived: a burn that stops silently
       is the class of defect this release exists to remove. */
    if (depth > LIMITS.astDepth) { burnTruncated = true; return out; }
    (list || []).forEach(function (nd) {
      /* Literals are what the human actually said — they survive. Free prose
         does not: it is not vocabulary, and .hgml is hieroglyphs only. */
      if (nd.literal) { if (nd.form !== "raw") out.push(nd); return; }
      if (nd.text)    { if (opts && opts.keepText) out.push(nd); return; }
      if (nd.mode)    { out = out.concat(burnList(nd.children, opts, chain, depth + 1)); return; }
      if (nd.logic)   { out.push(nd); return; }
      /* A template invocation already expanded during parse(); what is left
         is the shell, so the burn walks straight through it. */
      if (nd.template) { out = out.concat(burnList(nd.children, opts, chain, depth + 1)); return; }
      if (!nd.canonical) return;

      var e = entryOf(nd.canonical, opts);

      /* The operands are burnt FIRST, under the CURRENT chain — before the
         formula is opened. This is not an optimisation, it is the difference
         between working and not: an operand is not part of the formula it is
         passed to, so it must not inherit that formula's chain.

         `[rmbr[fbk]]` inside HYP's formula is RMBR receiving FBK as argument.
         Burning the argument after injecting it made FBK look like something
         RMBR's formula contains, and since FBK's formula does mention RMBR,
         the guard read a cycle that is not there — HYP → RMBR → FBK → RMBR —
         and stopped with RMBR unreduced. Burning arguments first keeps the two
         relationships apart: containment extends the chain, argument does not. */
      var operands = burnList(nd.children || [], opts, chain, depth + 1);

      if (!e || e.species === "atom") {
        out.push({ canonical: nd.canonical, children: operands });
        return;
      }

      var key = String(nd.canonical).toUpperCase();
      if (chain.indexOf(key) !== -1 || chain.length >= BURN_LIMIT) {
        /* Only reachable from a hand-edited store: build-templates.js refuses
           to generate a table with cycles. Emitting the node unburned beats
           looping, and the marker says the output is not fully reduced. */
        out.push({ canonical: key, children: operands, unburned: true,
                   via: chain.concat(key).join(" → ") });
        return;
      }

      var sub = parse(e.formula, {
        session: opts && opts.session,
        valency: false,          // a formula is a definition, not a request
        expansions: (opts && opts.expansions) || EXPANSIONS
      });
      var body = [];
      sub.segments.forEach(function (s) { body = body.concat(s.children); });

      /* Burn the formula body, then inject the already-atomic operands. */
      var burnedBody = burnList(body, opts, chain.concat(key));
      out = out.concat(injectSubject(burnedBody, operands));
    });
    return applyBlends(out, opts);
  }

  /* Walks the burnt tree and reports what came out of it. Counted here rather
     than during the burn because operands are burnt before their formula, so
     an in-flight counter double-counts them. */
  function burnStats(list, acc) {
    acc = acc || { atoms:0, literals:0, unburned:0, via:[] };
    (list || []).forEach(function (nd) {
      if (nd.literal || nd.text) acc.literals++;
      else if (nd.canonical) {
        if (nd.unburned) { acc.unburned++; acc.via.push(nd.via); }
        else acc.atoms++;
      }
      burnStats(nd.children, acc);
    });
    return acc;
  }

  function hgmlLit(v) {
    /* `'` closes a literal, `]` and a newline end one. Nothing survives them
       intact, so they are folded rather than escaped — .hgml carries the
       human's words to the engine, not their punctuation. */
    return String(v == null ? "" : v)
      .replace(/'/g, "’").replace(/]/g, ")").replace(/\s+/g, " ").trim();
  }

  function hgmlLines(list, d, L) {
    (list || []).forEach(function (nd) {
      if (nd.literal) { L.push(pad(d) + "'" + hgmlLit(nd.v) + "'"); return; }
      if (nd.text)    { L.push(pad(d) + "'" + hgmlLit(nd.v) + "'"); return; }
      if (nd.logic)   { L.push(pad(d) + "[logic" + (nd.logic.name ? "-" + nd.logic.name : "") + "[/logic]"); return; }
      var name = String(nd.canonical || "?").toLowerCase();
      var kids = nd.children || [];
      if (!kids.length) { L.push(pad(d) + "[" + name + "[/" + name + "]"); return; }
      L.push(pad(d) + "[" + name);
      hgmlLines(kids, d + 1, L);
      L.push(pad(d) + "[/" + name + "]");
    });
  }

  /**
   * burn(segments, opts) — the tree reduced to hieroglyphs.
   * Returns { segments:[{children}], stats }.
   */
  function burn(segments, opts) {
    opts = opts || {};
    var out = (segments || []).map(function (sg) {
      return { children: burnList(sg.children, opts, []), isReturn: !!sg.isReturn, breaks: sg.breaks };
    });
    var acc = { atoms:0, literals:0, unburned:0, via:[] };
    out.forEach(function (sg) { burnStats(sg.children, acc); });
    return { segments: out, stats: acc };
  }

  /** human → glyph → .hgml, in one call. */
  function toHGML(src, opts) {
    opts = opts || {};
    if (!expansionRegistry(opts))
      return "# sem tabela de composição: carregue expansions.json (useExpansions)";
    burnTruncated = false;
    burnBlends = [];
    var b = burn(parse(src, opts).segments, opts);
    var L = [];
    b.segments.forEach(function (sg, i) {
      if (i) L.push("");
      hgmlLines(sg.children, 0, L);
    });
    /* An invented element that cannot say what it means moves the
       interpretation problem one step along instead of solving it — the trap
       HGML_PLAN names. A blend is refused at compile time without a `means`,
       and the burn that used one declares it here, so the output explains
       itself to a reader who does not have rules.json. */
    if (burnBlends.length) {
      var decl = ["# patterns applied to this burn:"];
      burnBlends.forEach(function (b) {
        decl.push("#   [" + b.emit + "  <- " + b.when.join(" + ") + "  " + b.means);
      });
      decl.push("#");
      L = decl.concat(L);
    }
    if (burnTruncated)
      L.unshift("# truncated at " + LIMITS.astDepth + " levels — this burn is incomplete.");
    return L.join("\n");
  }


  /* ======================================================
     7. XML → GLYPH — the inverse

     The pipeline was one-way until here ("human → glyph → xml → machine"),
     so editing the XML meant editing the deliverable and abandoning the
     source. fromXML() reads the emitter's own output back into bracket
     source, and the normal parse/emit path takes over again.

     Three things do NOT come back, and each is pinned by a test in
     test-corpus.js so none of them gets "fixed" silently:

     - `<template name="X">` is written both by [tpl:X'…'] and by [--X…],
       and nothing in the output separates the two. This always rebuilds
       the [--X invocation: a repo-wide grep found no [tpl: in real use.
     - Content appended to an invocation beyond its declared params
       (collectFills' `extra`) carries no slot marker once expanded, so it
       cannot be told from the template's own body.
     - esc()/xesc() leave ' ` [ ] alone and the literal grammar ends on
       exactly those characters, so such text returns through litSafeXml(),
       the same substitution the interface already makes for form fields.
     ====================================================== */

  /* classify() probes MODE → STRUCT → META → ALIAS → INSTR; the reverse map is
     built in that same order with the first writer winning, which is what
     makes it the inverse of classify() rather than a lookup that merely
     agrees with it. PH, TPL and UNLS sit in two tables each and resolve to
     STRUCT for precisely this reason. ALIAS needs no entry: an alias carries
     the canonical's own gloss, so elName() already lands on the same element.
     GLOSS_COLLISIONS should stay empty — a test asserts it, so that editing
     the vocabulary later cannot introduce an ambiguity in silence. */
  var GLOSS_REVERSE = {}, GLOSS_COLLISIONS = [];
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

  var EMO_REVERSE = {};
  Object.keys(EMO).forEach(function (k) { EMO_REVERSE[String(EMO[k]).toLowerCase()] = k; });

  function xmlUnescape(s) {
    return String(s).replace(/&(#x[0-9a-fA-F]+|#[0-9]+|amp|lt|gt|quot|apos);/g, function (m, e) {
      if (e === "amp") return "&";
      if (e === "lt") return "<";
      if (e === "gt") return ">";
      if (e === "quot") return '"';
      if (e === "apos") return "'";
      var code = e.charAt(1) === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return isNaN(code) ? m : String.fromCharCode(code);
    });
  }

  function xmlTagName(s) { var m = /^\s*([A-Za-z_][\w.:-]*)/.exec(s); return m ? m[1] : ""; }

  function xmlAttrs(raw) {
    var out = {}, m, re = /([A-Za-z_][\w.:-]*)\s*=\s*"([^"]*)"/g;
    while ((m = re.exec(raw))) out[m[1]] = xmlUnescape(m[2]);
    return out;
  }

  /* Hand-written, like tokenize(), and for the same reason the rest of this
     file is: the CLI and the test suite run on plain Node with no
     dependencies, and DOMParser exists only in the browser. Using it would
     put the inverse behind a wall the tests cannot reach and split the engine
     in two again, which is the divergence v1.0.9 closed. The dialect to read
     is small and self-imposed — buildXml escapes & < > " and writes no
     namespaces, CDATA or DTD — so this stays a reader for that dialect, not
     an XML parser in general. */
  function xmlTokenize(xml) {
    var T = [], i = 0, n = xml.length;
    function pushText(raw) { if (raw && raw.trim()) T.push({ k:"text", v:xmlUnescape(raw) }); }
    while (i < n) {
      var lt = xml.indexOf("<", i);
      if (lt === -1) { pushText(xml.slice(i)); break; }
      if (lt > i) pushText(xml.slice(i, lt));
      if (xml.substr(lt, 4) === "<!--") {
        var ce = xml.indexOf("-->", lt + 4);
        i = ce === -1 ? n : ce + 3;
        continue;
      }
      var gt = xml.indexOf(">", lt);
      if (gt === -1) { T.push({ k:"truncated" }); break; }
      var inner = xml.slice(lt + 1, gt);
      if (inner.charAt(0) === "/") T.push({ k:"close", tag:xmlTagName(inner.slice(1)) });
      else if (inner.charAt(inner.length - 1) === "/") {
        var body = inner.slice(0, -1);
        T.push({ k:"selfclose", tag:xmlTagName(body), attrs:xmlAttrs(body) });
      } else T.push({ k:"open", tag:xmlTagName(inner), attrs:xmlAttrs(inner) });
      i = gt + 1;
    }
    return T;
  }

  /* Never throws: a hand-edited panel is one of the inputs, so malformed XML
     has to come back as diagnostics the interface can show, the same way
     parse() answers bad Glyph with gaps instead of an exception. */
  function xmlParseTree(xml) {
    var toks = xmlTokenize(xml), diag = [];
    var root = { tag:"#root", attrs:{}, children:[] };
    var stack = [root];
    toks.forEach(function (tk) {
      var top = stack[stack.length - 1];
      if (tk.k === "text") { top.children.push({ tag:"#text", v:tk.v, attrs:{}, children:[] }); return; }
      if (tk.k === "selfclose") { top.children.push({ tag:tk.tag, attrs:tk.attrs, children:[] }); return; }
      if (tk.k === "open") {
        var el = { tag:tk.tag, attrs:tk.attrs, children:[] };
        top.children.push(el); stack.push(el); return;
      }
      if (tk.k === "close") {
        for (var d = stack.length - 1; d > 0; d--) {
          if (stack[d].tag === tk.tag) {
            if (d < stack.length - 1)
              diag.push({ sev:"note", code:"XmlAutoClose",
                msg:"<code>&lt;/" + esc(tk.tag) + "&gt;</code> closed " + (stack.length - 1 - d) +
                    " elemento(s) que seguiam abertos." });
            stack.length = d;
            return;
          }
        }
        diag.push({ sev:"fix", code:"XmlUnmatchedClose",
          msg:"<code>&lt;/" + esc(tk.tag) + "&gt;</code> closes an element that never opened." });
        return;
      }
      if (tk.k === "truncated")
        diag.push({ sev:"fix", code:"XmlTruncated",
          msg:"<code>&lt;</code> with no <code>&gt;</code>: the xml is truncated." });
    });
    if (stack.length > 1)
      diag.push({ sev:"fix", code:"XmlUnclosed",
        msg:"never closed: " + stack.slice(1).map(function (e) {
          return "<code>&lt;" + esc(e.tag) + "&gt;</code>"; }).join(", ") + "." });
    return { root:root, diag:diag };
  }

  function xmlChild(el, tag) {
    var kids = el.children || [];
    for (var i = 0; i < kids.length; i++) if (kids[i].tag === tag) return kids[i];
    return null;
  }
  function xmlText(el) {
    var s = "";
    (el.children || []).forEach(function (c) { if (c.tag === "#text") s += c.v; });
    return s;
  }

  /* A literal ends at the next ' ] or newline, so those characters cannot
     travel inside one. esc()/xesc() do not escape them on the way out, which
     is why the trip back needs this: the same substitution glyph-ui.js has
     always made for what a human types into a form field. */
  function litSafeXml(s) {
    return String(s == null ? "" : s)
      .replace(/'/g, "’").replace(/`/g, "’")
      .replace(/\[/g, "(").replace(/\]/g, ")")
      .replace(/\r?\n/g, " ").trim();
  }
  function asLiteral(s) { return "'" + litSafeXml(s) + "'"; }

  function xmlKids(el, diag) {
    var out = "";
    /* `chain="item"` is the `,` of a run and cannot be the run's first link:
       `[in,rwk` does not open a chain. The XML panel is hand-editable, so this
       arrives from a human rather than from the emitter, and the choice is
       between repairing it in silence and saying so. It is promoted to `-`
       and reported — the same rule the rest of this work is built on. */
    var firstChain = true;
    (el.children || []).forEach(function (c) {
      if (c.tag === "#text" || c.tag === "mood" || c.tag === "break") { out += fromXmlNode(c, diag); return; }
      var op = c.attrs && c.attrs.chain;
      if (op === "extend" || op === "item") {
        if (firstChain && op === "item") {
          diag.push({ sev:"fix", code:"XmlChainStartsWithItem",
            msg:"the first link of a chain cannot be <code>chain=\"item\"</code> — " +
                "<code>,</code> continua uma cadeia, não a abre. Promovido a <code>-</code>." });
          c = { tag:c.tag, attrs:cloneWithChain(c.attrs, "extend"), children:c.children };
        }
        firstChain = false;
      } else if (c.tag !== "user-input") {
        firstChain = true;   /* a bracketed sibling ends the run */
      }
      out += fromXmlNode(c, diag);
    });
    return out;
  }

  function cloneWithChain(attrs, v) {
    var o = {}, k;
    for (k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) o[k] = attrs[k];
    o.chain = v;
    return o;
  }

  function fromXmlLogic(el, diag) {
    var lines = [];
    (el.children || []).forEach(function (c) {
      if (c.tag !== "rule") return;
      var srcEl = xmlChild(c, "source");
      if (srcEl) lines.push(xmlText(srcEl));
    });
    /* <source> is the authored expression, untouched by expandExpr — so the
       block comes back as it was written, not as it was read back to the
       human. <needs var> is regenerated by parseLogic on the next pass. */
    var nm = el.attrs.name ? ":" + litSafeXml(el.attrs.name) : "";
    return "[logic" + nm + "]\n" + lines.join("\n") + "\n[/logic]";
  }

  function fromXmlTemplate(el, diag) {
    var nm = el.attrs.name || "";
    var head = "[--" + nm + (el.attrs.define ? "=" : "");
    if (el.attrs.expanded) {
      /* An expanded invocation holds the template's body, not the call. The
         bound values are the ones carrying a slot, and rebuilding them as
         named [ph-x'v'] fills is exactly what collectFills reads back — so
         the call survives even though the expansion it produced is discarded
         and regenerated. What the caller appended beyond the declared params
         has no slot and cannot be recovered; see the section note. */
      var fills = "";
      (function scan(list) {
        (list || []).forEach(function (c) {
          if (c.tag === "user-input" && c.attrs && c.attrs.slot && /^[A-Za-z]/.test(c.attrs.slot)) {
            fills += "[ph-" + c.attrs.slot + asLiteral(xmlText(c)) + "]";
            return;
          }
          scan(c.children);
        });
      })(el.children);
      return head + fills + "]";
    }
    return head + xmlKids(el, diag) + "]";
  }

  function fromXmlNode(el, diag) {
    var tag = el.tag;
    if (tag === "#text") return "";
    if (tag === "user-input") return asLiteral(xmlText(el));
    if (tag === "off") return " " + litSafeXml(xmlText(el)) + " ";
    if (tag === "mood" || tag === "break") return "";   /* handled per block */
    if (tag === "logic") return fromXmlLogic(el, diag);
    if (tag === "template") return fromXmlTemplate(el, diag);
    if (tag === "unresolved") {
      var uop = chainOpOf(el, diag, litSafeXml(el.attrs.tag || ""));
      if (uop) return uop + litSafeXml(el.attrs.tag || "");
      return "[" + litSafeXml(el.attrs.tag || "") + xmlKids(el, diag) + "]";
    }
    if (tag === "needs") {
      /* Three shapes share this element, and one attribute tells them apart:
         a real [ph-name] hole carries an alpha slot, while the FRAMES and
         SLOTS fillers carry none or a bare number. Only the hole is source;
         the fillers are the engine asking a question, and buildXml asks it
         again from the vocabulary on the next pass. Writing them back would
         turn a prompt into an answer. */
      var slot = el.attrs.slot;
      if (slot && /^[A-Za-z]/.test(slot))
        return "[ph-" + slot + "`" + litSafeXml(xmlText(el)) + "`]";
      return "";
    }

    var hit = GLOSS_REVERSE[tag];
    var name = hit ? hit.canonical.toLowerCase() : (SESSION[tag] ? tag : null);
    if (!name) {
      diag.push({ sev:"note", code:"XmlUnknownElement",
        msg:"<code>&lt;" + esc(tag) + "&gt;</code> matches no command — " +
            "o conteúdo foi mantido, a marca não." });
      return xmlKids(el, diag);
    }
    /* A bare link carries no scope, so it rebuilds as the operator plus the
       name — no brackets, no recursion into children. Writing `[name…]` here is
       exactly what fabricated a <needs>: the bracket gave the command a scope
       to want an operand in, and the engine duly asked for one the author had
       never omitted. Writing `-name` instead lets the following <user-input>
       land on the parent, where the author put it.

       It runs after GLOSS_REVERSE, so an alias rebuilds under its canonical
       name like the bracketed path, and it is the only writer of `-` and `,`,
       so a run comes back in source order with no reordering pass. */
    var op = chainOpOf(el, diag, name);
    if (op) return op + name;

    /* `force="editorial"` is not read back: nd.editorial comes from
       EDITORIAL_ONLY keyed by the canonical, so it returns on its own. */
    var head = "[" + name + (el.attrs.name ? ":" + litSafeXml(el.attrs.name) : "");
    return head + xmlKids(el, diag) + "]";
  }

  /* Shared by the resolved and unresolved branches. Returns "-" or "," for a
     chain link, or null. A chain element with children is malformed — a bare
     tag cannot hold any — so the children are re-attached to the parent, which
     is what the bracket form would have done, and the reader says so rather
     than repairing it quietly. */
  function chainOpOf(el, diag, name) {
    var op = el.attrs && el.attrs.chain;
    if (op !== "extend" && op !== "item") return null;
    var kids = (el.children || []).filter(function (c) { return c.tag !== "#text"; });
    if (kids.length)
      diag.push({ sev:"fix", code:"XmlChainHasChildren",
        msg:"<code>&lt;" + esc(el.tag) + " chain&gt;</code> has children — a link written without " +
            "<code>[</code> não tem escopo para segurá-los. Reanexados ao pai." });
    return op === "item" ? "," : "-";
  }


  /* ------------------------------------------------------------------ *
   * fromAST — the path the promotion of the AST implies and never had
   *
   * There was no AST-to-source path in this engine at all: fromXML was the
   * only inverse, so reconstructing source meant going through the XML. That
   * was coherent while the XML was the deliverable. Under T23 it is not, and
   * it costs something concrete — `[A],[B]` and `[A][B]` emit IDENTICAL XML,
   * because the chain attribute marks bare links only, so a comma between
   * bracketed commands cannot come back that way. The AST records it as
   * `origin: "item"` and always did.
   *
   * So the fix is not to make the XML carry it — that needs a second attribute
   * and reopens the ambiguity §3.2 closed. It is to read the source of truth
   * directly. The XML→source path stays as a convenience, one-way in the same
   * sense toHGML is, and nothing that matters depends on it any more.
   *
   * Reads the `full` projection only. A `panel` envelope is refused rather
   * than half-read: thinning makes a field's absence mean six different things,
   * and a reconstructor that guesses is worse than one that stops.
   * ------------------------------------------------------------------ */
  function fromAST(env, opts) {
    opts = opts || {};
    var diag = [];
    if (!env || typeof env !== "object" || env.type !== "GlyphAST") {
      diag.push({ sev:"fix", code:"NotAnAST",
        msg:"not a <code>GlyphAST</code> envelope." });
      return { src:"", diag:diag };
    }
    if (env.projection && env.projection !== "full") {
      diag.push({ sev:"fix", code:"ThinnedAST",
        msg:"projection <code>" + esc(String(env.projection)) + "</code> — only the projection " +
            "<code>full</code> pode ser reconstruída. Na projeção de painel a ausência de um " +
            "campo não distingue vazio de descartado." });
      return { src:"", diag:diag };
    }

    function lit(v, form) {
      var t = String(v == null ? "" : v);
      /* the backtick form is preserved when it was used and is still safe;
         otherwise the quote form, escaped the way fromXML escapes it */
      if (form === "tick" && t.indexOf("`") === -1) return "`" + t + "`";
      return asLiteral(t);
    }

    function kids(list) {
      var out = "";
      (list || []).forEach(function (n) { out += node(n); });
      return out;
    }

    function node(n) {
      if (!n || typeof n !== "object") return "";
      switch (n.type) {
        /* `form:"raw"` is unquoted prose, not a literal: quoting it would put
           delimiters into text the author never delimited */
        case "Raw":     return n.form === "raw" ? String(n.value == null ? "" : n.value)
                                                : lit(n.value, n.form);
        case "Literal": return lit(n.value, n.form);
        case "Text":    return String(n.value == null ? "" : n.value);
        case "ModeOff": return "[off]" + kids(n.body) + "[on]";
        case "Template": {
          /* An expanded invocation holds the template's BODY, not the call.
             Writing the body back would replace what the author typed with
             what it expanded to — the same trap fromXmlTemplate avoids. The
             bound values are the ones carrying a slot; everything else is
             regenerated from the store on the next pass. */
          if (n.expanded) {
            var fills = "";
            (function scan(list) {
              (list || []).forEach(function (c) {
                if (c && c.type === "Command" && c.slotName) return;   /* the binder itself */
                /* a BOUND value is the call; an unbound one is the template's
                   own prompt, and writing that back turns a question into an
                   answer — the same rule <needs> follows */
                if (c && (c.type === "Literal" || c.type === "Raw") && c.slot &&
                    /^[A-Za-z]/.test(c.slot)) {
                  fills += "[ph-" + c.slot + lit(c.value, c.form) + "]";
                  return;
                }
                if (c && c.body) scan(c.body);
              });
            })(n.body);
            return "[--" + String(n.name || "") + fills + "]";
          }
          return "[--" + String(n.name || "") + (n.isDefinition ? "=" : "") + kids(n.body) + "]";
        }
        case "Logic": {
          var lines = (n.rules || []).map(function (r) { return String(r.source || ""); });
          return "[logic" + (n.name ? ":" + n.name : "") + "]\n" + lines.join("\n") + "\n[/logic]";
        }
        case "Truncated":
          diag.push({ sev:"fix", code:"TruncatedAST",
            msg:"the envelope was truncated at depth " + n.atDepth + " and omitted " +
                n.omittedNodes + " nós — não há o que reconstruir a partir dele." });
          return "";
        case "Command": {
          /* `raw` as written: an unresolved tag keeps its case, because
             `<unresolved tag="A">` is what the author typed and lowercasing it
             would make the reconstruction a different unknown command */
          var name = String(n.raw || n.canonical || "");
          /* the placeholder's name is bound by `-`, which is a name binder here
             and not a chain operator — §2.5 is why its origin is suppressed */
          if (n.slotName) return "-" + name;
          /* a bare link carries no scope: the operator plus the name, no
             brackets, exactly as fromXML writes it — writing [name…] here is
             what fabricates a <needs> */
          if (n.chainElement)
            return (n.origin === "item" ? "," : "-") + name;
          var lead = n.origin === "item" ? "," : "";
          return lead + "[" + name + (n.name ? ":" + litSafeXml(n.name) : "") + kids(n.body) + "]";
        }
        default:
          diag.push({ sev:"note", code:"AstUnknownNode",
            msg:"node <code>" + esc(String(n.type)) + "</code> is not in the AST vocabulary — ignored." });
          return "";
      }
    }

    var parts = [];
    (env.segments || []).forEach(function (seg) {
      var pre = "";
      if (seg.mood && seg.mood.length)
        pre += "/" + seg.mood.map(function (m) { return m.name; }).join("/") + "/";
      if (seg.continues) pre += "[=";
      if (seg.isReturn) pre += "r-";
      parts.push(pre + kids(seg.body) + (seg.breaks ? ";;" : ""));
    });
    /* `;;` already closed its segment, so it must not be followed by `;` */
    var src = parts.reduce(function (acc, cur, i) {
      if (i === 0) return cur;
      return acc + (/;;$/.test(acc) ? "" : ";") + cur;
    }, "");

    return { src:src, diag:diag };
  }

  function fromXmlBlock(el, diag) {
    var pre = "";
    var mood = xmlChild(el, "mood");
    if (mood) {
      var keys = [];
      [mood.attrs.dominant].concat(String(mood.attrs.also || "").split(","))
        .forEach(function (g) {
          var k = EMO_REVERSE[String(g || "").trim().toLowerCase()];
          if (k) keys.push(k);
        });
      if (keys.length) pre += "/" + keys.join("/") + "/";
    }
    var exp = xmlChild(el, "user-expectative");
    /* `expects` is only the flattened summary of what the body already says,
       so the body is what gets rebuilt — the attribute regenerates from it. */
    if (exp) return pre + "r-" + xmlKids(exp, diag);
    var body = "";
    (el.children || []).forEach(function (c) {
      if (c.tag === "mood" || c.tag === "#text") return;
      body += fromXmlNode(c, diag);
    });
    return pre + body;
  }

  /** xml → glyph. The inverse of toXML, within the limits noted above. */
  /* ---- glyph-package, the inverse of packagePass (E4) ------------------
     The reader is given a document, not an AST, and the shape sections 3 to 5
     added is undone here so every rule below it keeps working unchanged.

     <invoke> is DISCARDED and never read back. It is derived from the store,
     so reconstructing a command from it would be the engine answering its own
     question - which is finding A3, the defect where the inverse INVENTED a
     <needs> the author was never asked for. A loss can be pinned; an invention
     cannot. <schema/> goes the same way: it carries no authored content.  */
  function packageUnpass(el, diag) {
    if (!el || !el.children) return el;
    var out = [];
    el.children.forEach(function (c) {
      if (c.tag === "schema" || c.tag === "invoke") return;
      if (c.tag === "chain") {
        /* position carried the operator, so position gives it back:
           the first member came from `-`, every other from `,` (3.2) */
        var first = true;
        (c.children || []).forEach(function (m) {
          if (m.tag === "#text") return;
          /* The panel is hand-editable, so a <chain> can arrive carrying things
             the emitter never writes. Position decides the operator (3.2) and
             overwriting whatever is there would be repairing in silence, which
             is the one thing this reader refuses to do. Both refusals keep the
             names XML_REFERENCE 11.3 documents; only their trigger moved. */
          if (m.attrs && m.attrs.chain)
            diag.push({ sev:"fix", code:"XmlChainStartsWithItem",
              msg:"a <code>&lt;chain&gt;</code> member carries <code>chain=\"" + esc(m.attrs.chain) +
                  "\"</code>. Dentro de um <code>&lt;chain&gt;</code> a posição já diz o operador — " +
                  "remova o atributo." });
          /* a member with children is caught downstream by the existing
             XmlChainHasChildren check, which sees the `chain` this function
             assigns; raising it here as well would report one fault twice */
          var mm = {}, mk;
          for (mk in m) if (Object.prototype.hasOwnProperty.call(m, mk)) mm[mk] = m[mk];
          mm.attrs = cloneWithChain(m.attrs || {}, first ? "extend" : "item");
          out.push(packageUnpass(mm, diag));
          first = false;
        });
        return;
      }
      out.push(packageUnpass(c, diag));
    });
    /* copy the node whole and swap only its children: a text node carries its
       content in a property this function must not know the name of */
    var copy = {}, k;
    for (k in el) if (Object.prototype.hasOwnProperty.call(el, k)) copy[k] = el[k];
    copy.children = out;
    return copy;
  }


  function fromXML(xmlString, opts) {
    opts = opts || {};
    var pt = xmlParseTree(String(xmlString == null ? "" : xmlString));
    var diag = pt.diag.slice();
    var glyphEl = xmlChild(pt.root, "glyph-package");
    if (!glyphEl) {
      /* the retired root is refused BY NAME, never absorbed in silence - the
         same treatment the divide operator and the backslash mood got */
      if (xmlChild(pt.root, "glyph")) {
        diag.push({ sev:"fix", code:"XmlLegacyRoot",
          msg:"<code>&lt;glyph&gt;</code> was replaced by <code>&lt;glyph-package&gt;</code> in this " +
              "version. Re-emit the document with engine " + VERSION + "." });
        return { src:"", diag:diag };
      }
      diag.push({ sev:"fix", code:"NoGlyphRoot",
        msg:"no <code>&lt;glyph-package&gt;</code> at the root — this is not xml from this engine." });
      return { src:"", diag:diag };
    }
    glyphEl = packageUnpass(glyphEl, diag);
    var parts = [];
    (glyphEl.children || []).forEach(function (el) {
      if (el.tag === "#text") return;
      /* <block> is written by two different things: the wrapper buildXml puts
         around every segment, and the STRUCT command [block'…']. They are the
         same element name, and only position plus the `once` attribute
         separate them — the wrapper is always a direct child of <glyph> and
         always carries `once`, because blockAttrs() runs nowhere else. A
         nested [block reaches fromXmlNode instead, through GLOSS_REVERSE. */
      if (el.tag === "block" && el.attrs.once) {
        parts.push({ src:(el.attrs.continues ? "[=" : "") + fromXmlBlock(el, diag), brk:false });
        return;
      }
      if (el.tag === "break") { if (parts.length) parts[parts.length - 1].brk = true; return; }
      diag.push({ sev:"note", code:"XmlUnexpectedTop",
        msg:"<code>&lt;" + esc(el.tag) + "&gt;</code> outside a block — ignored." });
    });
    var src = parts.map(function (p, i) {
      return p.src + (p.brk ? ";;" : "") + (i < parts.length - 1 ? ";" : "");
    }).join("");
    return { src:src, diag:diag };
  }

  return {
    VERSION: VERSION,
    CATS: CATS, INSTR: INSTR, ALIAS: ALIAS, ALIAS_OF: ALIAS_OF, STRUCT: STRUCT,
    META: META, MODE: MODE, EMO: EMO, SESSION: SESSION, FRAMES: FRAMES,
    EDITORIAL_ONLY: EDITORIAL_ONLY, PTBR: PTBR, CAT_OF: CAT_OF,
    LOGIC_OPS: LOGIC_OPS, PUNCT: PUNCT, NAMED_STRUCT: NAMED_STRUCT,
    tokenize: tokenize, classify: classify, suggest: suggest, lev: lev, elName: elName,
    expandExpr: expandExpr, freeVars: freeVars, parseLogic: parseLogic,
    parse: parse, walk: walk,
    useTemplates: useTemplates, templateRegistry: templateRegistry,
    useRules: useRules,
    useExpansions: useExpansions, expansionRegistry: expansionRegistry,
    speciesOf: speciesOf, depthOf: depthOf, formulaOf: formulaOf, atomsOf: atomsOf,
    defOf: defOf,
    buildXml: buildXml, toXML: toXML, toAST: toAST, serializeAST: serializeAST,
    burn: burn, toHGML: toHGML,
    fromXML: fromXML, fromAST: fromAST, elementCanonicalMap: GLOSS_REVERSE, glossCollisions: GLOSS_COLLISIONS,
    esc: esc, xesc: xesc
  };
})();

export default GlyphCore;
/* the browser reads it as a global, and check-globals.js knows this shape */
globalThis.GlyphCore = GlyphCore;

/* Run directly, this file used to be the command line. The CLI moved to
   glyph-cli.js — it was the only part of the core that touched the filesystem,
   and the seam graph says it is the only piece nothing else depends on.
   Delegating to it from here would import a module that imports this one, so
   the pointer is a message rather than a cycle. */
if (typeof process !== "undefined" && process.argv && process.argv[1] &&
    import.meta.url === "file://" + process.argv[1].replace(/\\/g, "/").replace(/^([A-Za-z]:)/, "/$1")) {
  console.error("the command line moved to glyph-cli.js:\n  node scripts/glyph-cli.js " +
                (process.argv.slice(2).map(a => JSON.stringify(a)).join(" ") || '"<source>" --xml'));
  process.exit(2);
}
