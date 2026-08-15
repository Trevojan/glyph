/**
 * Glyph Core v1.1.0 (glyph-parser.js)
 *
 * Single core of the chain  human → glyph → xml → machine.
 *
 * Through v1.8 there were two divergent parsers: this module (which only
 * emitted AST and dropped free text, chains, [logic] and ;;) and the parser
 * embedded in glyph-engine-alias.html (complete, but browser-locked, the
 * only one able to emit XML). v1.0.9 unified them: this file is the reference
 * implementation, and the HTML is a consumer of it.
 *
 * VERSION SCHEME — a.b.c.d, each digit naming the layer that moved:
 *   a  frontend        the HTML/CSS/UI consumer
 *   b  backend         this parser: lexer, tree, emitters
 *   c  business rules  glyph-rules.json, template constraints, valency
 *   d  data fixes      vocabulary tables, constants, glosses
 * A digit moving resets every digit to its right.
 *
 * v1.1.0.0 — the vocabulary is now aligned to GLOSSARIO.md, which is the
 * normative reference from here on. Three changes, all backend:
 *
 *   1. `BASE` the command became `CORE`. `BASE` stayed as the keyword in
 *      expansoes.txt meaning "this is an atom" — the two used to collide on
 *      the same word and no expansion table could disambiguate them.
 *   2. Twelve commands the glossary declared but the engine never knew:
 *      FIND GET ADD SUB WHR (context ops), HGH LOW BOLD LIGHT (intensity),
 *      SWITCH (condition), GO (execution). Half the composition formulas in
 *      expansoes.txt referenced them and could not resolve.
 *   3. The v1.7 fusions are undone. EVAL, REV, SPEC, SIMP, QST, FOREX and
 *      ONLYIF are commands in their own right again, each separated from the
 *      one it was folded into by a stated axis (object vs. act, or standard
 *      of comparison) — see GLOSSARIO.md §6.5.
 *
 * UMD: works in Node (require) and in the browser (window.GlyphCore).
 * As a CLI:  node glyph-parser.js "[crit[ctx]]" [--ast|--xml|--diag]
 */

(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GlyphCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VERSION = "1.1.0.1";

  /* ======================================================
     1. VOCABULARY — Appendix A, one slot per command
     ====================================================== */

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
    /* v1.1.0.0: operar SOBRE o contexto, não apenas situar-se nele. A separação
       de "enquadre" é o que distingue declarar um escopo de ler, escrever e
       localizar dentro dele. */
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
    /* v1.1.0.0: grau. PRIO ordena entre itens; estes graduam um item só —
       quanta força ele tem (HGH/LOW) e quanto peso ganha na saída
       (BOLD/LIGHT). Eram os únicos do glossário sem casa temática. */
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
    LIM:"Limitation", VRFY:"Verify", CNSD:"Consider", GEN:"Generalize", SPEC:"Specify",
    CNCL:"Conclude", PROP:"Propose", JUST:"Justify", DIST:"Distinguish", CAT:"Categorize",
    POS:"Positive", NGT:"Negative", REAL:"Realistic", FIN:"Finally", RWK:"Rework",
    CRIT:"Criticize", SCRU:"Scrutinize", NEV:"Never", ALW:"Always", RDY:"Ready",
    INTN:"Intention", IMPR:"Improve", REV:"Review", LRN:"Learn", DRVF:"Derive From",
    FLS:"False", TRUE:"True", ERROR:"Error", ASSM:"Assumption", VAL:"Validate", ASK:"Ask",
    DENY:"Deny", CORE:"Core", DFN:"Define Symbol",
    GT:"Greater Than", GTE:"Greater Than Equal", LT:"Less Than", LTE:"Less Than Equal",
    EQ:"Equal", NEQ:"Not Equal",
    /* v1.1.0.0 — declarados em GLOSSARIO.md §1/§2 e usados pelas fórmulas de
       expansoes.txt, mas ausentes do motor até aqui. */
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
       GLOSSARIO.md §6.5. */
  };
  var ALIAS_OF = {};
  Object.keys(ALIAS).forEach(function (a) { (ALIAS_OF[ALIAS[a]] = ALIAS_OF[ALIAS[a]] || []).push(a); });

  var STRUCT = {
    SECTION:"Section", BLOCK:"Block", IF:"If", UNLS:"Unless", SKL:"Skill",
    DEF:"Define", PH:"Placeholder", TPL:"Template", LOGIC:"Logic"
  };
  /* META and STRUCT are PARSING buckets, not the species taxonomy of
     GLOSSARIO.md — the two axes are independent and both are needed. The
     glossary classifies by COMPOSITION (does it decompose into atoms?);
     these classify by BEHAVIOUR (does it open a named block? is it exempt
     from the slot-order warning?). A command can be an atom in one and a
     struct in the other without contradiction. */
  var META = {
    QUICK:"Quick", TOBLOCK:"To Block", TOSECTION:"To Section",
    HMN:"Human", EXT:"External", ATC:"Attachment",
    NONE:"None"                       // v1.1.0.0 — engine em GLOSSARIO.md §4
  };
  var MODE = { OFF:"Mode off", ON:"Mode on" };

  var EMO = {
    hpy:"felicidade", joy:"alegria", exc:"empolgação", cnt:"contentamento", clm:"calma",
    ser:"serenidade", pea:"paz", grt:"gratidão", hop:"esperança", prd:"orgulho",
    lov:"amor", afc:"afeto", adm:"admiração", amu:"divertimento", del:"deleite",
    rlf:"alívio", cfd:"confiança", eth:"entusiasmo", cur:"curiosidade", awe:"assombro",
    ply:"brincadeira", chr:"animação",
    sad:"tristeza", ang:"raiva", fry:"fúria", fear:"medo", dis:"desdém", dsg:"nojo",
    anx:"ansiedade", frs:"frustração", irr:"irritação", ann:"incômodo", env:"inveja",
    jel:"ciúme", glt:"culpa", shm:"vergonha", reg:"arrependimento", dsp:"desespero",
    grf:"luto", lon:"solidão", bor:"tédio", res:"ressentimento", btr:"amargura",
    ctm:"desprezo", hum:"humilhação", emb:"vergonha social", pan:"pânico", drd:"pavor",
    ter:"terror", exh:"exaustão", str:"estresse", ovw:"sobrecarga", ins:"insegurança",
    apt:"apatia", num:"anestesia", mel:"melancolia",
    cnf:"confusão", dbt:"dúvida", sus:"suspeita", skp:"ceticismo", nos:"nostalgia",
    lng:"saudade", vul:"vulnerabilidade", emp:"empatia", cmp:"compaixão", sym:"simpatia",
    trs:"confiança", bet:"traição", ind:"indiferença", ant:"expectativa",
    imp:"impaciência", sur:"surpresa"
  };

  /* "prob" left this table: now that PROB is a registered INSTR tag
     (ERROR+CTX), classify() would resolve it before ever reaching this
     block anyway — it would sit here as dead vocabulary, unreachable
     under any casing.

     "go" left for the same reason in v1.1.0.0: GO is now a command
     (GLOSSARIO.md §1), and INSTR is consulted before SESSION. Leaving it
     would be a second, unreachable definition of the same word. */
  var SESSION = {
    rd:"ler", info:"informação", org:"organizar",
    ok:"ok, entendido", dtl:"detalhe"
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
     SECTION and BLOCK enter here in v1.0.9 to match ASSINATURAS.md, which
     already assigned them minimum arity 1. */
  var FRAMES = {
    INS:["o que fazer"], TRYFR:["o resultado desejado"], PROP:["o que propor"],
    IMPR:["o que melhorar"], REV:["o que revisar"], CRIT:["o que criticar"],
    RWK:["o que retrabalhar"], FMT:["o que formatar"], SUM:["o que resumir"],
    SCRU:["o que escrutinar"], VRFY:["o que verificar"], VAL:["o que validar"],
    SKEP:["cético sobre o quê"], SIMP:["o que simplificar"], ELAB:["o que detalhar"],
    ASK:["o que perguntar"], QST:["a pergunta"], CLAR:["o que esclarecer"],
    IMAG:["a situação"], HYP:["a hipótese"], BRST:["o assunto"],
    CNSD:["os fatores*"], CMP:["os termos*"], CAT:["os itens*"], ALT:["as opções*"],
    DIST:["os termos*"],
    CTX:["a que se refere"], REF:["a que se refere"], SEEAL:["a que se refere"],
    TGT:["o alvo"], BYP:["o que contornar"], DRVF:["a origem"],
    COND:["a condição"], IF:["a condição"], UNLS:["a condição"],
    ONLYIF:["a condição"], ONLYW:["a condição"], EXC:["a exceção"],
    RSN:["o motivo"], RTNL:["o racional"], JUST:["a justificativa"],
    EX:["o caso"], FOREX:["o caso"], REQ:["a exigência"],
    CNST:["o limite"], RESTR:["o limite"], AVD:["o que evitar"],
    DONT:["o que não fazer"], DENY:["o que negar"], ASSM:["o que se assume"],
    NT:["a observação"], WARN:["o risco"], LIM:["o limite"],
    EVAL:["o que avaliar"], CNCL:["sobre o quê"], ITR:["o que iterar"],
    GEN:["o que generalizar"], SPEC:["o que especificar"], INSTOF:["o que entra no lugar"],
    SECTION:["o nome da seção"], BLOCK:["o nome do bloco"],
    /* v1.1.0.0 — só os operadores entram aqui. WHR, HGH, LOW, BOLD e LIGHT
       são primitivos no glossário ("valem sozinhos"), então não exigem
       operando e não geram <needs>. */
    FIND:["o que buscar"], GET:["o que ler do contexto"],
    ADD:["o que acrescentar"], SUB:["o que subtrair"],
    SWITCH:["os estados*"], GO:["o que executar"]
  };

  /* structural commands whose first child must be a literal (the name) */
  var NAMED_STRUCT = { SECTION:1, BLOCK:1 };

  /* Mandatory ordered slots — ASSINATURAS.md §3 (prefix comparison) and the
     arity-2 signatures. FRAMES only models the first slot; here each missing
     position becomes a <needs slot="…"> in the XML, instead of silently
     vanishing. */
  var SLOTS = {
    GT: ["o primeiro termo", "o segundo termo"],
    GTE:["o primeiro termo", "o segundo termo"],
    LT: ["o primeiro termo", "o segundo termo"],
    LTE:["o primeiro termo", "o segundo termo"],
    EQ: ["o primeiro termo", "o segundo termo"],
    NEQ:["o primeiro termo", "o segundo termo"],
    DFN:["o símbolo", "o significado"],
    VAL:["o que validar", "o critério externo"]
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
     Filled by useTemplates(). Node loads it from glyph-templates.json;
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
     What GLOSSARIO.md knows and the engine did not: which commands are
     hieroglyphs (atoms, they do not decompose) and which are glyphs
     (composites, with a formula that reduces them to atoms).

     Generated from expansoes.txt into glyph-expansions.json by
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

      if (c === "\\") {
        flushText();
        var start = i; i++;
        var order = 0, guard = 0;
        while (i < n && guard++ < 64) {
          var es = i;
          while (i < n && /[A-Za-z]/.test(src[i])) i++;
          var ename = src.slice(es, i);
          if (!ename) break;
          var had = src[i] === "\\";
          var ord = order++;
          T.push({ k:"emotion", v:ename, s: ord === 0 ? start : es - 1,
                   e:i + (had?1:0), order:ord, unterminated:!had, delim:"\\" });
          if (had) { i++; if (!(i < n && /[A-Za-z]/.test(src[i]))) break; } else break;
        }
        if (i === start + 1) addText("\\");
        continue;
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
        if (!textBuf.length && prevT && prevT.k === "extend") {
          flushText(); T.push({ k:"divide", v:"/", s:i, e:i+1 }); i++; expectBare = true; continue;
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
        gaps.push({ sev:"note", lab:"li assim", code:"CapFloorNotice",
          msg:"<code>" + (/\s<\s*\d+\s*$/.test(rule.expr) ? "&lt;" : "&gt;") +
              "</code> posfixo lido como teto/piso, não comparação. Comparar: <code>&lt;=</code> <code>&gt;=</code>." });
      }
      rules.push(rule);
    });

    var used = {};
    rules.forEach(function (r) { (r.uses || []).forEach(function (v) { if (!defined[v]) used[v] = true; }); });
    var missing = Object.keys(used);
    if (missing.length)
      gaps.push({ sev:"ask", lab:"indefinido", code:"UndefinedVariable",
        msg: missing.map(function (v) { return "<code>" + esc(v) + "</code>"; }).join(", ") +
            (missing.length === 1 ? " usado, nunca definido." : " usados, nunca definidos.") +
            " Entrada externa ou linha faltando?" });

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
          esc(chain.concat(key).join(" → ")) + "). Expansão interrompida.", "TemplateCycle");
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
     other". Finite, external table (glyph-rules.json): editing the file
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
    var c = { pairs:{}, order:[], pre:[] };
    (store.rules || []).forEach(function (r) {
      if (r.kind === "pair") { c.pairs[pairKey(r.a, r.b)] = r; return; }
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

    function fire(r, id, msg) {
      if (seen[id]) return;
      seen[id] = 1;
      G(r.severity || "ask", r.label || "regra",
        msg + (r.suggest ? " <em>Sugestão: " + esc(r.suggest) + "</em>" : ""),
        "Rule:" + r.id);
    }

    function reportPair(x, y) {
      var r = C.pairs[pairKey(x.canonical, y.canonical)];
      if (!r || underExempt(x) || underExempt(y)) return;
      fire(r, r.id + "@" + (x.id || 0) + "-" + (y.id || 0),
        "<code>[" + esc(String(x.canonical).toLowerCase()) + "</code> com <code>[" +
        esc(String(y.canonical).toLowerCase()) + "</code> no mesmo alvo — " + esc(r.why) + ".");
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
          fire(o.rule, o.rule.id + "@" + (flat[j].id || 0),
            "<code>[" + esc(String(flat[j].canonical).toLowerCase()) + "</code> vem antes de <code>[" +
            esc(String(o.first).toLowerCase()) + "</code> — " + esc(o.rule.why) + ".");
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
          fire(p.rule, p.rule.id + "@" + (flat[i].id || 0),
            "<code>[" + esc(String(p.target).toLowerCase()) + "</code> sem enquadramento antes — " +
            esc(p.rule.why) + ".");
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
    function G(sev, lab, msg, code) { gaps.push({ sev:sev, lab:lab, msg:msg, code:code || "Note" }); }
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
          "…). Em bloco longo isso costuma fechar mais do que se pretendia — feche com <code>]</code> o que for parcial.",
          "MassAutoClose");
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
          G("fix", "sem nome", "<code>[</code> sem nome. Um <code>[</code> = um comando.", "EmptyCommandName");
        var nd = {
          id:++uid, raw:tk.v, tier:cl.tier, canonical:cl.canonical, gloss:cl.gloss,
          alias:!!cl.alias, children:[], emotions:[], colon:null, autoClosed:false, tok:tk,
          editorial:!!EDITORIAL_ONLY[cl.canonical],
          origin: pendingOrigin || (tk.k === "bareTag" ? "extend" : (parentNode ? "nest" : "root")),
          chainElement: tk.k === "bareTag" || pendingOrigin === "extend" || pendingOrigin === "divide",
          slotName: inPH && tk.k === "bareTag",
          depth: stack.length
        };
        if (cl.tier === "unknown" && !nd.slotName) {
          var sg = suggest(tk.v);
          nd.suggestion = sg;
          G("fix", "não existe",
            "<code>[" + esc(tk.v) + "</code> fora do vocabulário." +
            (sg ? " → <code>[" + sg.name.toLowerCase() + "</code>" +
                  (PTBR[sg.name] ? " (" + PTBR[sg.name] + ")" : "") + "?" : " Veja a tabela."),
            "UnknownCommand");
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
          if (!tk.closed) G("fix", "não fechou", "<code>[logic]</code> sem <code>[/logic]</code>.", "UnclosedLogic");
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
          if (!stack.length) G("fix", "sobrando", "<code>]</code> sem comando aberto.", "UnmatchedCloseBracket");
          else stack.pop();
          pendingOrigin = null;
          break;

        case "closeTag": {
          var found = -1;
          for (var s2 = stack.length-1; s2 >= 0; s2--)
            if (String(stack[s2].canonical).toUpperCase() === String(tk.v).toUpperCase()) { found = s2; break; }
          if (found === -1) G("fix", "sobrando", "<code>[/" + esc(tk.v) + "]</code> fecha comando não aberto.", "UnmatchedCloseTag");
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
            if (nx.k === "divide") { parts.push("/"); j5++; continue; }
            if (nx.k === "extend") { parts.push("-"); j5++; continue; }
            break;
          }
          t2.colon = parts.join(" ").replace(/\s+,/g, ",").trim();
          if (sawComma && !STRUCT[t2.canonical])
            G("ask", "ordem incerta",
              "<code>[" + esc(t2.raw) + ": a,b,c]</code> ordem não inferível. Aninhe.", "AmbiguousSlotOrder");
          i = j5 - 1;
          break;
        }

        case "literal": {
          var t3 = top();
          var lit = { literal:true, v:tk.v, form:tk.form, tok:tk };
          if (t3) t3.children.push(lit); else seg.children.push(lit);
          if (tk.closedBy === "bracket" || tk.closedBy === "semi")
            G("fix", "texto cortado",
              "literal cortado no <code>" + (tk.closedBy === "bracket" ? "]" : ";") +
              "</code>. Feche com <code>`</code> antes.", "TruncatedLiteral");
          if (tk.closedBy === "eof") G("fix", "texto aberto", "<code>`</code> sem fechar.", "UnterminatedLiteral");
          if (tk.form === "quote" && tk.closedBy === "unterminated")
            G("fix", "texto aberto", "<code>'</code> sem fechar.", "UnterminatedLiteral");
          pendingOrigin = null;
          break;
        }

        case "emotion": {
          var key = tk.v.toLowerCase();
          if (!EMO[key]) G("note", "humor externo", "<code>/" + esc(tk.v) + "/</code> fora da tabela. Ignorado.", "UnknownEmotion");
          var rec = { name:key, gloss:EMO[key] || "?", order:tk.order };
          var t4 = top(); if (t4) t4.emotions.push(rec);
          seg.mood.push(rec);
          break;
        }

        case "extend": {
          pendingOrigin = "extend";
          var nx2 = tokens[i+1];
          if (!nx2 || (nx2.k !== "open" && nx2.k !== "bareTag" && nx2.k !== "divide" && nx2.k !== "literal" && nx2.k !== "text"))
            G("fix", "pendurado", "<code>-</code> sem cadeia. Ex.: <code>[rw-cr</code>.", "DanglingChain");
          if (nx2 && nx2.k === "divide") {
            var nx3 = tokens[i+2];
            if (!nx3 || (nx3.k !== "open" && nx3.k !== "bareTag" && nx3.k !== "literal" && nx3.k !== "text"))
              G("fix", "pendurado", "cadeia vazia. Ex.: <code>[in-rw,fm,im</code>.", "DanglingChain");
          }
          break;
        }
        case "divide": pendingOrigin = "divide"; break;
        case "comma":  pendingOrigin = "item"; break;
        case "equals": { var t5 = top(); if (t5) t5.isDefinition = true; break; }
        case "semi":   closeSeg("semi"); break;

        case "linebreak": {
          seg.breaks++;
          if (stack.length)
            G("note", "quebra visual",
              "<code>;;</code> não fecha bloco, só <code>;</code> fecha. Segue aberto: " +
              stack.map(function (x) { return "<code>[" + esc(String(x.canonical || x.template || "?").toLowerCase()) + "</code>"; }).join(", ") + ".",
              "LinebreakInsideBlock");
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
          G("note", "modo texto", "<code>[off]</code> sem <code>[on]</code>. Resto lido como prosa.", "UnclosedOffMode");
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
              "<code>" + esc(v) + "</code> solto. Lógica: <code>[if</code> <code>[unls</code> <code>[logic]</code>.",
              "LooseKeyword");
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
                "virou prosa (<code>&lt;off&gt;</code>), não comando. Queria <code>[" + esc(lw) + "</code>?",
                "LooseCommandWord");
          }
          if (/^\.+$/.test(v))
            G("note", "ponto solto",
              "<code>.</code> sem função. Separadores: <code>,</code> <code>;</code> <code>;;</code>.",
              "LooseDots");
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
          (q ? esc(q.v) : "sem resposta"), "PlaceholderPending");
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
          "sequência e não escopo, feche com <code>]</code> ou separe com <code>,</code>.",
          "DeepNesting");
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
            esc(String(nd2.canonical).toLowerCase()) + "'nome',…</code>.", "MissingStructName");
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
                slots.length + " termos, recebeu " + got + ". Falta <strong>" + esc(slots[k]) + "</strong>.",
                "MissingOperand");
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
              ": <strong>" + esc(want.replace("*", "")) + "</strong>?", "UnfilledSlot");
          else if (want.slice(-1) === "*" && filled === 1)
            G("note", "lista de um",
              "<code>[" + esc(String(nd2.canonical).toLowerCase()) + "</code> aceita n itens, recebeu 1. Liste com <code>,</code>.",
              "SingletonList");
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
              "<code>[--" + esc(nd3.template) + "=</code> sem corpo.", "EmptyTemplateDefinition");
        } else invoked.push(nd3.template);
      });
    });
    var known = templateRegistry(opts) || {};
    invoked.forEach(function (nm) {
      if (!defd[nm.toLowerCase()] && !known[nm.toLowerCase()] && !known[nm])
        G("note", "tpl indefinido",
          "<code>[--" + esc(nm) + "</code> não definido aqui. TPL não persiste entre sessões. Redefina: <code>[--" +
          esc(nm) + "=…</code>.", "UndefinedTemplate");
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

  function buildXml(segments) {
    if (!segments.length) return "<!-- escolha um molde ou escreva do lado esquerdo -->";
    var L = ["<glyph>"];
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
          sg.children.forEach(function (nd) { emit(nd, 3, L); });
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
      sg.children.forEach(function (nd) { emit(nd, 2, L); });
      L.push(pad(1) + "</block>");
      if (sg.breaks) L.push(pad(1) + "<break/>");
    });
    L.push("</glyph>");
    return L.join("\n");
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
  function emit(root, startDepth, L) {
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
      if (nd.tier === "unknown" || nd.tier === "empty") {
        var at = ['tag="' + xesc(nd.raw || "") + '"'];
        if (nd.suggestion) at.push('nearest="' + xesc(nd.suggestion.name.toLowerCase()) + '"');
        open = "<unresolved " + at.join(" ");
        closeName = "unresolved";
      } else {
        var el = elName(nd.canonical, nd.tier, nd.gloss);
        var attrs = [];
        if (nd.editorial) attrs.push('force="editorial"');
        if (nd.colon) attrs.push('name="' + xesc(nd.colon) + '"');
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
    return buildXml(parse(src, opts).segments);
  }

  /* ======================================================
     6. AST JSON — clean serialization, no cycles
     ====================================================== */

  /* The shallow node, without `body` — the body gets filled by the iterative loop below. */
  function astShallow(nd) {
    if (nd.literal) return { type: nd.form === "raw" ? "Raw" : "Literal", value: nd.v, form: nd.form };
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
    if (nd.template) return { type:"Template", name:nd.template, isDefinition:!!nd.isDef };
    return {
      type:"Command",
      raw: nd.raw,
      canonical: nd.canonical,
      tier: nd.tier,
      gloss: nd.gloss || "",
      element: (nd.tier === "unknown" || nd.tier === "empty") ? null : elName(nd.canonical, nd.tier, nd.gloss),
      isAlias: !!nd.alias,
      chainElement: !!nd.chainElement,
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

  /* Iterative for the same reason as emit: in a long block the tree is deep.

     The depth ceiling isn't a whim: even with iterative construction, V8's
     `JSON.stringify` recurses internally and overflows around a thousand
     levels. Since the AST is an inspection panel (the deliverable is the
     XML, which has no ceiling), truncating with an explicit marker beats
     bringing down the whole serialization. */
  function astNode(root, stats) {
    var holder = [];
    var stack = [{ nd:root, arr:holder, d:0 }];
    while (stack.length) {
      var f = stack.pop();

      if (f.d >= LIMITS.astDepth) {
        var omitted = 0;
        walk([f.nd], function () { omitted++; });
        f.arr.push({ type:"Truncated", reason:"depth", atDepth:LIMITS.astDepth, omittedNodes:omitted });
        if (stats) stats.truncated += omitted;
        continue;
      }

      var obj = astShallow(f.nd);
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
  function serializeAST(segments, gaps) {
    var stats = { truncated: 0 };
    var out = {
      type: "GlyphAST",
      version: VERSION,
      segments: segments.map(function (s) {
        return {
          type: "Segment",
          mood: s.mood,
          isReturn: !!s.isReturn,
          continues: !!s.continues,
          breaks: s.breaks,
          autoClosedCount: s.autoClosed,
          // not map(astNode) directly: map passes the index as the 2nd argument
          body: s.children.map(function (nd) { return astNode(nd, stats); })
        };
      }),
      diagnostics: (gaps || []).map(function (g) {
        return { code:g.code, severity:g.sev, label:g.lab, message:g.plain };
      })
    };
    if (stats.truncated) out.truncatedNodes = stats.truncated;
    return out;
  }

  function toAST(src, opts) {
    var r = parse(src, opts);
    return serializeAST(r.segments, r.gaps);
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
    buildXml: buildXml, toXML: toXML, toAST: toAST, serializeAST: serializeAST,
    esc: esc, xesc: xesc
  };
});

/* ---------- CLI ---------- */
if (typeof require === "function" && typeof module === "object" && require.main === module) {
  var G = module.exports;
  // optional stores: if absent, the engine still runs, just without expansion/contradiction checks
  [["../glyph-templates.json", G.useTemplates],
   ["../glyph-rules.json", G.useRules],
   ["../glyph-expansions.json", G.useExpansions]].forEach(function (pair) {
    try {
      pair[1](require(require("path").resolve(__dirname, pair[0])));
    } catch (e) { /* missing store is a valid situation */ }
  });
  var argv = process.argv.slice(2);
  var mode = "xml";
  var src = [];
  argv.forEach(function (a) {
    if (a === "--ast" || a === "--xml" || a === "--diag" || a === "--expand") mode = a.slice(2);
    else src.push(a);
  });
  var input = src.join(" ");
  if (!input) {
    console.error("uso: node glyph-parser.js \"[crit[ctx]]\" [--xml|--ast|--diag|--expand]");
    process.exit(2);
  }
  if (mode === "expand") {
    /* --expand takes a COMMAND NAME, not Glyph source: it answers "what is
       this made of", which is the question the .hgml emitter will ask. */
    var nm = input.replace(/[\[\]']/g, "").trim().toUpperCase();
    var sp = G.speciesOf(nm);
    if (!sp) {
      console.error(nm + ": fora da tabela de composição (ou store não carregado).");
      process.exit(2);
    }
    console.log(nm + "  [" + sp + "]  nível " + G.depthOf(nm));
    if (sp === "composite") {
      console.log("  fórmula: " + G.formulaOf(nm));
      var at = G.atomsOf(nm);
      console.log("  " + at.length + " hieróglifos: " + at.join(" "));
    } else {
      console.log("  hieróglifo — não decompõe.");
    }
  }
  else if (mode === "ast") console.log(JSON.stringify(G.toAST(input), null, 2));
  else if (mode === "diag") {
    var gaps = G.parse(input).gaps;
    if (!gaps.length) console.log("sem diagnósticos.");
    gaps.forEach(function (g) { console.log("[" + g.sev + "] " + g.code + " — " + g.plain); });
  } else console.log(G.toXML(input));
}
