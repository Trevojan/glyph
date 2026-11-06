A universal Virtual Path combines a relative file path, a format-specific delimiter, and a semantic selector string (`[File Path][Delimiter][Selector]`). This structure allows your DSL compiler to emit precision target references across any file format in your context repository.

| Document Format | Selector Strategy | Virtual Path Syntax Example | Harness Resolution Logic | Ideal Use Case |
| --- | --- | --- | --- | --- |
| **Markdown** (`.md`) | Heading Anchor (`#`) | `.guidelines/ui.md#button-accessibility` | Reads text beginning at heading `# Button Accessibility` up to the next heading of equal or higher depth. | Long-form guidelines, decision records, and component specs. |
| **JSON** (`.json`) | Key Selector / Pointer (`$`) | `.guidelines/config.json$.theme.colors` | Parses JSON and extracts only the key-value object present at `theme.colors`. | Schema definitions, structured flags, and manifest metadata. |
| **XML** (`.xml`) | XPath / Tag Matcher (`/`) | `.guidelines/orders/ORD-001.xml//order/rules` | Evaluates the XPath expression to return matching tags and child nodes. | DSL compiler outputs, execution payloads, and tool specs. |
| **Code / Text** | Block Boundary (`#@`) | `.guidelines/auth.ts#@block:jwt-validation` | Reads lines strictly bounded between `// @block:jwt-validation` start and end markers. | Isolated code patterns, language-agnostic snippets, inline constraints. |

### Data Flow for Diagramming

To represent this in an architectural diagram, map the processing lifecycle across four key nodes:

1. **DSL Compiler (Producer):** Analyzes task requirements $\rightarrow$ maps dependencies to target documents $\rightarrow$ emits `manifest.json` containing Virtual Paths.
2. **Virtual Path Parser (Harness Layer):** Intercepts the Virtual Path string $\rightarrow$ splits path into `[File Path]` and `[Selector]`.
3. **Context Resolver (Extractor):** Evaluates selector strategy (XPath, JSON Pointer, Markdown Anchor, or Block Tag) $\rightarrow$ retrieves slice from disk.
4. **Claude Code Harness (Consumer):** Injects resolved context slice into the active session prompt without running `grep` or reading full files.