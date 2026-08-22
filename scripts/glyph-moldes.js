/* Glyph engine — form data (MOLDES) and ready-made examples (PRESETS).
   Data only: no behaviour lives here. Loaded before glyph-ui.js. */
(function (root) {
  "use strict";

  /* ======================================================
     2. MOLDES — as perguntas que você não quer ter que lembrar
     Ordem das fases: começa pelo ALVO, porque é assim que
     você disse que pensa (explorar a saída pra achar o caminho).
     ====================================================== */

  var MOLDES = [
    {
      id:"fluxo", label:"fluxo",
      title:"Fluxo / Processo",
      hint:"Início e pré-condição, expectativa e validação técnica",
      steps:true,
      phases:[
        { id:"alvo", label:"Alvo", note:"backward-chaining", slots:[
          { id:"saida", tag:"tgt", q:"resultado esperado / produto final do fluxo" },
          { id:"prova", tag:"val", q:"qual o teste para validar o fluxo?" }
        ]},
        { id:"partida", label:"Partida", note:"pré-estado", slots:[
          { id:"entrada", tag:"core", q:"estado inicial e dependências necessárias" },
          { id:"pre", tag:"cond", q:"condição prévia de execução" }
        ]},
        { id:"percurso", label:"Percurso", note:"passos e junções", slots:[
          { id:"fora", tag:"lim", q:"escopo e limitações explícitas" }
        ]}
      ]
    },
    {
      id:"decisao", label:"decisão",
      title:"Decisão / Condicional",
      hint:"Avaliação lógica e bifurcação de execução",
      steps:false,
      phases:[
        { id:"alvo", label:"Alvo", note:"", slots:[
          { id:"escolha", tag:"ask", q:"bifurcação / decisão técnica requerida" }
        ]},
        { id:"partida", label:"Partida", note:"critério", slots:[
          { id:"criterio", tag:"core", q:"parâmetro ou variável de decisão" },
          { id:"limiar", tag:"cond", q:"limiar / valor de corte condicional" }
        ]},
        { id:"percurso", label:"Percurso", note:"ramos de execução", slots:[
          { id:"sim", tag:"ins", q:"instrução quando a condição é verdadeira" },
          { id:"nao", tag:"ins", q:"instrução quando a condição é falsa" },
          { id:"vazio", tag:"exc", q:"tratamento de exceção / valor nulo" }
        ]}
      ]
    },
    {
      id:"laco", label:"laço",
      title:"Laço / Repetição",
      hint:"Iteração sobre coleção ou estrutura de dados",
      steps:false,
      phases:[
        { id:"alvo", label:"Alvo", note:"", slots:[
          { id:"acumula", tag:"tgt", q:"acumulador / estado final pós-iteração" }
        ]},
        { id:"partida", label:"Partida", note:"coleção", slots:[
          { id:"colecao", tag:"core", q:"coleção de dados / iterável" },
          { id:"vazia", tag:"exc", q:"tratamento para coleção vazia" }
        ]},
        { id:"percurso", label:"Percurso", note:"corpo do laço", slots:[
          { id:"item", tag:"ins", q:"instrução por elemento" },
          { id:"parada", tag:"cond", q:"critério de interrupção do laço" },
          { id:"ordem", tag:"cnst", q:"restrição de ordenação de execução" }
        ]}
      ]
    },
    {
      id:"correcao", label:"correção",
      title:"Correção / Retrabalho",
      hint:"Diagnóstico de falha e refatoração dirigida",
      steps:false,
      phases:[
        { id:"alvo", label:"Alvo", note:"", slots:[
          { id:"oque", tag:"rwk", q:"alvo da refatoração (arquivo, módulo, função)" },
          { id:"esperado", tag:"tgt", q:"comportamento técnico esperado" }
        ]},
        { id:"partida", label:"Partida", note:"estado atual", slots:[
          { id:"sintoma", tag:"ctx", q:"diagnóstico do erro / comportamento atual" },
          { id:"quando", tag:"cond", q:"condição de reprodutibilidade da falha" }
        ]},
        { id:"percurso", label:"Percurso", note:"bordas", slots:[
          { id:"naomexer", tag:"dont", q:"componentes ou interfaces imutáveis" }
        ]}
      ]
    }
  ];

  var EXTRAS = [
    { id:"rev",  type:"bool", tag:"rev",  q:"<span class='tg'>[rev]</span> revisão automática no final" },
    { id:"scru", type:"bool", tag:"scru", q:"<span class='tg'>[scru]</span> escrutínio formal da lógica antes da resposta" },
    { id:"save", type:"bool", tag:"",     q:"salvar como template" }
  ];

  var PRESETS = [
    { label:"conta de dados", src:
      "[go[logic-dano-critico]\ntier = pc[attr/4] <5\nroll = 4d6kh3\nmarg = roll - dif\ncdmg = base + pb[marg/tier]\n!precision -> sem arredondar\n[/logic]" },
    { label:"encadeia blocos", src:"[rd'pedidos.csv';\n[=[org[cat'por cliente','por data';\n[=[sum;r-[skep-crit,scru" },
    { label:"template", src:"[--safego=[rev[vrfy[clar;\n[--safego'o parser de logic'" },
    { label:"sem shift", src:"/frs/[crit'esse parser me venceu'][ask'o que eu errei'" }
  ];


  /* ======================================================
     MOLDES_EN — a camada inglesa, sobreposta e não misturada

     Um overlay em vez de campos `_en` espalhados pela estrutura: a tabela
     pt-BR acima fica exatamente como estava, e quem lê uma delas não precisa
     desviar o olho da outra. As chaves são os mesmos `id` — se um id sumir
     daqui, a interface cai no pt-BR daquele pedaço e o resto segue.

     A pergunta de cada casa vira <needs> no XML, então em EN ela chega ao
     entregável em inglês — que é o que a fronteira de língua sempre pediu e
     o molde ainda não cumpria.
     ====================================================== */

  var MOLDES_EN = {
    fluxo: {
      label:"flow", title:"Flow / Process",
      hint:"Start and precondition, expectation and technical validation",
      phases:{ alvo:{ label:"Target", note:"backward-chaining" },
               partida:{ label:"Start", note:"pre-state" },
               percurso:{ label:"Path", note:"steps and junctions" } },
      slots:{ saida:"expected result / final product of the flow",
              prova:"which test validates the flow?",
              entrada:"initial state and required dependencies",
              pre:"precondition for execution",
              fora:"scope and explicit limitations" }
    },
    decisao: {
      label:"decision", title:"Decision / Conditional",
      hint:"Logical evaluation and execution branching",
      phases:{ alvo:{ label:"Target", note:"" },
               partida:{ label:"Start", note:"criterion" },
               percurso:{ label:"Path", note:"execution branches" } },
      slots:{ escolha:"branching / technical decision required",
              criterio:"decision parameter or variable",
              limiar:"threshold / conditional cut-off value",
              sim:"instruction when the condition is true",
              nao:"instruction when the condition is false",
              vazio:"exception / null value handling" }
    },
    laco: {
      label:"loop", title:"Loop / Repetition",
      hint:"Iteration over a collection or data structure",
      phases:{ alvo:{ label:"Target", note:"" },
               partida:{ label:"Start", note:"collection" },
               percurso:{ label:"Path", note:"loop body" } },
      slots:{ acumula:"accumulator / final state after iteration",
              colecao:"data collection / iterable",
              vazia:"handling for an empty collection",
              item:"instruction per element",
              parada:"criterion for breaking the loop",
              ordem:"execution ordering constraint" }
    },
    correcao: {
      label:"fix", title:"Fix / Rework",
      hint:"Failure diagnosis and directed refactoring",
      phases:{ alvo:{ label:"Target", note:"" },
               partida:{ label:"Start", note:"current state" },
               percurso:{ label:"Path", note:"edges" } },
      slots:{ oque:"refactoring target (file, module, function)",
              esperado:"expected technical behaviour",
              sintoma:"error diagnosis / current behaviour",
              quando:"condition for reproducing the failure",
              naomexer:"immutable components or interfaces" }
    }
  };

  var EXTRAS_EN = {
    rev:  "<span class='tg'>[rev]</span> automatic review at the end",
    scru: "<span class='tg'>[scru]</span> formal scrutiny of the logic before the answer",
    save: "save as a template"
  };

  /* Os presets são exemplos: o rótulo é tela e a fonte é a lição. Traduzir a
     fonte junto é o certo — um exemplo em pt-BR numa tela em inglês ensina a
     sintaxe e atrapalha a leitura ao mesmo tempo. O que NÃO muda é a forma:
     mesmos comandos, mesma ordem, mesmos diagnósticos. Só o que é palavra
     humana — nome do bloco, literal, variável de nome português — vira
     inglês, para que o exemplo continue demonstrando exatamente o que
     demonstrava. */
  var PRESETS_EN = [
    { label:"data maths", src:
      "[go[logic-critical-damage]\ntier = pc[attr/4] <5\nroll = 4d6kh3\nmargin = roll - difficulty\ncdmg = base + pb[margin/tier]\n!precision -> no rounding\n[/logic]" },
    { label:"chained blocks", src:"[rd'orders.csv';\n[=[org[cat'by client','by date';\n[=[sum;r-[skep-crit,scru" },
    { label:"template", src:"[--safego=[rev[vrfy[clar;\n[--safego'the logic parser'" },
    { label:"no shift", src:"/frs/[crit'this parser beat me'][ask'what I got wrong'" }
  ];

  root.MOLDES = MOLDES;
  root.EXTRAS = EXTRAS;
  root.PRESETS = PRESETS;
  root.MOLDES_EN = MOLDES_EN;
  root.EXTRAS_EN = EXTRAS_EN;
  root.PRESETS_EN = PRESETS_EN;
})(typeof self !== "undefined" ? self : this);
