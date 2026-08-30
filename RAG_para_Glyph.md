# Motor Lógico RAG para Glyph — Arquitetura por Domínio

## 1. Requisitos

**Funcionais:**
- Recuperar regras de Glyph já conhecidas antes de interpretar nova entrada
- Aumentar (augment) entrada com contexto de domínio relevante
- Gerar interpretação usando domínio, não inferência cega
- Aprender do resultado (feedback loop) e enriquecer o domínio

**Não-funcionais:**
- Latência: recuperação < 50ms (parsing real-time)
- Precisão: 0 alucinações — só usa conhecimento estruturado ou pergunta
- Maintainability: domínio em versionamento, não em memória volátil
- Escalabilidade: cresce com novos tags/templates/conflitos sem reshaping

**Constraints:**
- Roda offline (não depende de chamadas externas durante parsing)
- Memória: domínio cabe em JSON estruturado (~1-2MB)
- Team: decididido localmente pelo operador, não por ML

---

## 2. Arquitetura Alto-Nível

```
entrada Glyph
    ↓
[RETRIEVE] domínio relevante (tags, regras, templates da sessão)
    ↓
[AUGMENT] entrada com contexto (aliás, frames, slots implícitos)
    ↓
[GENERATE] interpretação usando só o domínio recuperado
    ↓
[CLASSIFY] se ambíguo: pergunte em vez de sintetizar
    ↓
[LEARN] adicione novo padrão/conflito ao domínio pra próxima sessão
    ↓
saída XML + gaps
```

Cada etapa toca o **domínio estruturado**, não redes neurais ou heurísticas:

- **RETRIEVE**: busca hash em `INSTR`, `STRUCT`, `ALIAS`, `FRAMES`, `[logic-rules]`
- **AUGMENT**: anexa slot-types, aridade esperada, histórico de uso na sessão
- **GENERATE**: aplica regras de LIFO/auto-close, verifica valência
- **CLASSIFY**: se `classify()` retorna `unknown`, ativa interrogativa (não síntese)
- **LEARN**: registra novo tag/conflito em `session-domain.json`

---

## 3. Motor Lógico — Três Camadas

### Camada 1: Domínio Estruturado (Retrieval)

```json
{
  "tags": {
    "CRIT": {
      "tier": "instr",
      "gloss": "Criticize",
      "frame": ["o que criticar"],
      "aliases": ["CR"],
      "conflicts": ["C-12: nome reutilizado entre wrapper e folha"],
      "examples": ["[CRIT[TGT]]", "[CRIT[CTX]]"],
      "last_used": "2026-08-26T14:32:00Z"
    },
    ...
  },
  "structs": {
    "BLOCK": {
      "reserved": true,
      "arity": "1+ (name + body)",
      "slots": [{"id": "name", "type": "literal"}, {"id": "body", "type": "segments"}],
      "closes_at": ["[/BLOCK]", ";", "eof"]
    },
    ...
  },
  "session_templates": {
    "CODEFIX": {
      "defined_at": "2026-08-26T10:15:00Z",
      "body": "[RQ][CR[WN[PH: target]]][RW][FM][IM]",
      "invocations": 3,
      "last_called": "2026-08-26T14:25:00Z"
    }
  },
  "conflicts": [
    {
      "id": "C-12",
      "title": "Nome de tag reaproveitado entre wrapper e folha",
      "status": "open",
      "affects": ["INSTRUCTION namespace"],
      "linked_to": ["P-20 corpus case"]
    }
  ]
}
```

**Loop RETRIEVE:**
```
entrada: "[crit[tgt]]"
  → tokenize: [open:"crit", open:"tgt", close, close]
  → RETRIEVE "CRIT" → {tier, frame, aliases, conflicts}
  → RETRIEVE "TGT" → {tier, frame}
  → retorna [CRIT.domain, TGT.domain] pra próxima camada
```

### Camada 2: Augmentação com Contexto (Augment)

Antes de gerar, **anexa** informação que reduz ambiguidade:

```javascript
function augment(token, domain, session_state) {
  const meta = domain.tags[token.canonical];
  
  return {
    token: token,
    
    // slot-type esperado (já no domínio)
    expected_slot: meta.frame[0],
    
    // aridade satisfeita?
    aridity_ok: token.children.length >= meta.frame.length,
    
    // foi usado antes nesta sessão? (reduz síntese)
    usage_history: session_state.usage[token.canonical],
    
    // conflito relacionado? (marca pra perguntar, não sintetizar)
    open_conflicts: meta.conflicts.filter(c => c.status === "open"),
    
    // qual alias foi usado? (normaliza pra canônica)
    alias_of: domain.aliases[token.name],
    
    // contexto de scope (PAI, aninhamento, modo OFF?)
    scope: { parent, depth, mode_state }
  };
}
```

**Efeito:** entrada ambígua agora carrega bandeira — `open_conflicts` não-vazia = **não sintetize, pergunte**.

### Camada 3: Geração Guiada por Domínio (Generate)

Decisões são **determinísticas** porque vêm do domínio, não de inferência:

```javascript
function generate(augmented_node, domain) {
  
  // 1. Se frame vazio e nenhum contexto salva, pergunta
  if (!augmented_node.aridity_ok && !augmented_node.usage_history) {
    return { kind: "ask", msg: `${node.token} espera: ${augmented_node.expected_slot}` };
  }
  
  // 2. Se conflito aberto afeta este nó, marca e pergunta
  if (augmented_node.open_conflicts.length) {
    return { 
      kind: "clarify", 
      msg: `Ambiguidade em ${node.token}: ${conflicts[0].title}. Qual era a intenção?`
    };
  }
  
  // 3. Senão, aplica regras mecânicas (LIFO, valência, scope)
  return {
    kind: "deterministic",
    classification: classify(node, domain),
    children: node.children.map(child => generate(augmented(child, domain, session), domain)),
    auto_closed: should_close_lifo(node, domain),
  };
}
```

**Nenhuma síntese acontece aqui.** Cada decisão é "está no domínio?" → sim, use-o; não, pergunte.

---

## 4. Loop LEARN — Feedback Evita Síntese Futura

Toda vez que o operador corrige ou confirma uma interpretação, o domínio cresce:

```javascript
function learn(original_input, claude_interpretation, operator_feedback) {
  
  // Se operador usou um tag novo: registre
  feedback.new_tags.forEach(tag => {
    domain.tags[tag] = {
      gloss: extract_intent(feedback.explanation),
      frame: infer_frame(feedback.context),
      first_seen: now(),
      confirmed_by: "operator"
    };
  });
  
  // Se interpretação foi errada: marca conflito como descoberto
  if (feedback.was_wrong) {
    domain.conflicts.push({
      id: `C-${next_id}`,
      pattern: original_input,
      was_misread_as: claude_interpretation,
      correct_reading: operator_feedback,
      root_cause: infer_from_diff(original, feedback),
      status: "discovered"
    });
  }
  
  // Se ficou ambíguo: registre e use pra calibrar próximas perguntas
  if (feedback.was_ambiguous) {
    domain.ambiguities.push({
      input: original_input,
      resolvents: operator_feedback.possible_readings,
      resolvent_chosen: operator_feedback.actual_intent,
      distinguisher: operator_feedback.how_to_tell_apart
    });
  }
  
  // Incrementa usage pra aprender preferência
  domain.tags[token].last_used = now();
  domain.tags[token].usage_count++;
  
  // Salva domínio versionado
  save_domain("domain-v1.4.0.1-session.json", domain);
}
```

**Efeito acumulado:** Toda correção evita síntese na próxima entrada similar. "Domínio evita síntese" literalmente — quanto mais tempo você usa, mais estruturado fica, menos Claude inventa.

---

## 5. Três Exemplos Concretos

### Ex. 1: Tag novo — reduz síntese na segunda use

**Sessão 1:**
```
entrada: [route`...`]
domain check: "ROUTE" não existe
ação: pergunta "ROUTE é um novo comando? Se sim, o que significa?"
operator: "sim, roteamento de domínio"
learn: domain.tags["ROUTE"] = { gloss: "Domain routing", confirmed_by: "operator" }
```

**Sessão 2 (mesma sessão):**
```
entrada: [route`...`][criticize target="route"]
domain check: "ROUTE" existe agora
retrieve: ROUTE.domain + CRITICIZE.domain
augment: target="route" → aponta pra ROUTE nó anterior
generate: determinístico, sem pergunta
```

### Ex. 2: Conflito descoberto — evita alucinação

**Primeira entrada:**
```
[instruction][instruction]
token 1: instruction como wrapper (outer)
token 2: instruction como comando folha (inner)
ambiguity: mesmo nome, dois papéis
action: ask "qual instruction é qual?"
learn: register C-12 (conflito descoberto)
```

**Entrada futura com padrão similar:**
```
[instruction][...inner tags...]
domain check: C-12 encontrado
augment: marca como "ambíguo, será perguntado"
generate: "Instruction é wrapper ou comando aqui? (Conflito C-12)"
```

### Ex. 3: Template reutilizado — domínio evita reinvenção

**Primeira invocação:**
```
[--CODEFIX: `login handler`]
learn: registra invocação, padrão de argumentação
```

**Décima invocação:**
```
[--CODEFIX: `api/pedidos`]
domain check: template existe, já invocado 9x
retrieve: histórico mostra sempre um argumento
augment: slot esperado = "alvo do refactor"
generate: sem pergunta, aplica template direto com novo argumento
```

---

## 6. Trade-offs

| Escolha | Pro | Con | Quando preferir |
|---|---|---|---|
| **Domínio em JSON** | Versionável, debugável, humanamente editável | Menos flexível que in-memory | Operador controla = preferir |
| **Retrieve antes de Generate** | Zero alucinação, determinístico | Mais lento que inferência neural | Precisão > latência |
| **Perguntar vs. sintetizar** | Operador aprova cada extensão | Mais verbose, requer confirmação | Alto custo de erro > UX frict |
| **Learn a cada feedback** | Domínio cresce com tempo real | Acumula ruído se feedback errado | Operador revisa = seguro |

---

## 7. O Que Muda em Glyph

**Sem RAG + Domínio:**
```
[entrada] → tokenize → classify (pergunta se unknown) → parse → ask
```

**Com RAG + Domínio:**
```
[entrada] → retrieve domain → tokenize → augment com domínio → classify 
(agora raramente pergunta) → parse → se conflito aberto: ask; senão: determinístico → learn
```

O ganho: **domínio estruturado reduz pra próxima entrada**, não pra esta. A primeira use de um tag novo segue perguntando (certo). A segunda use não (porque agora está no domínio).

---

**Resumo:** Cada feedback que você dá alimenta o domínio. Domínio alimentado = menos síntese necessária. O motor não fica mais inteligente, fica mais **específico** — é a diferença que importa.