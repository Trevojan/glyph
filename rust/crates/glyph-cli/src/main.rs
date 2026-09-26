//! glyph-cli — Port of `scripts/glyph-cli.js` — flag for flag (M11).
//!
//! EMS-001 ORD-0008, the first binary: with no argument, `glyph` reads Glyph
//! on stdin and writes the XML, and nothing else — the bytes `toXML` answers,
//! with no line after them. Where the JS throws, the binary writes the JS's
//! message to stderr and exits 1, as node does on an uncaught throw.
//!
//! EMS-001 ORD-0012, flag parity: with arguments, the command line of
//! `glyph-cli.js` — `--xml --ast --diag --hgml --expand --from-xml`, the source
//! on argv or by `--file`, and `--bundle` with `--out` — answering its bytes,
//! read with the repository's three stores. The moment a bundle carries is
//! SOURCE_DATE_EPOCH's when it is set, and the zip's time is UTC (question 16
//! of the EMS-001 return).

use glyph_burn::{to_hgml, BurnOpts};
use glyph_envelope::{to_ast, AstOpts};
use glyph_parse::{parse, Opts};
use glyph_stores::{atoms_of, depth_of, formula_of, species_of, Context};
use glyph_util::json::{number, stringify_indent, Json};
use glyph_util::tree::Thrown;
use glyph_xml::to_xml;
use std::io::{Read, Write};
use std::path::Path;

/// What the run writes, and how it ends: `console.log`, `console.error` and
/// `process.exit`, as the JS makes them.
struct Out {
    out: Vec<u8>,
    err: Vec<u8>,
}

impl Out {
    fn log(&mut self, s: &str) {
        self.out.extend_from_slice(s.as_bytes());
        self.out.push(b'\n');
    }
    fn error(&mut self, s: &str) {
        self.err.extend_from_slice(s.as_bytes());
        self.err.push(b'\n');
    }
    fn exit(self, code: i32) -> ! {
        let mut o = std::io::stdout().lock();
        let mut e = std::io::stderr().lock();
        let _ = o.write_all(&self.out).and_then(|_| o.flush());
        let _ = e.write_all(&self.err).and_then(|_| e.flush());
        std::process::exit(code)
    }
    /// An uncaught throw: node prints it and exits 1.
    fn thrown(mut self, kind: &str, Thrown(msg): Thrown) -> ! {
        self.error(&format!("{kind}: {msg}"));
        self.exit(1)
    }
}

fn main() {
    let argv: Vec<String> = std::env::args_os().skip(1).map(|a| a.to_string_lossy().into_owned()).collect();
    if argv.is_empty() {
        let mut bytes = Vec::new();
        if std::io::stdin().read_to_end(&mut bytes).is_ok() && !bytes.is_empty() {
            return first_binary(&String::from_utf8_lossy(&bytes));
        }
    }
    cli(argv)
}

/// ORD-0008: the XML of stdin, and nothing after it.
fn first_binary(src: &str) {
    match to_xml(src, &Opts::new(Context::repository()), false) {
        Ok(xml) => Out { out: xml.into_bytes(), err: Vec::new() }.exit(0),
        Err(thrown) => Out { out: Vec::new(), err: Vec::new() }.thrown("TypeError", thrown),
    }
}

/// `LOOKS_LIKE_PATH`: no bracket anywhere, and an extension of a source or a
/// separator after the first character. Used only to refuse.
fn looks_like_path(s: &str) -> bool {
    if s.is_empty() || s.contains(['[', ']']) {
        return false;
    }
    let lower = s.to_lowercase();
    let ext = ["pgml", "glyph", "gly", "txt", "md", "hgml", "xml", "json"]
        .iter()
        .any(|e| lower.len() > e.len() + 1 && lower.ends_with(&format!(".{e}")));
    ext || s.char_indices().skip(1).any(|(_, c)| c == '/' || c == '\\')
}

/// `path.normalize` of the platform the binary runs on, for the paths it
/// prints: the JS prints what `path.join` gives.
fn normalize(p: &str) -> String {
    let win = cfg!(windows);
    let sep = if win { '\\' } else { '/' };
    let is_sep = |c: char| c == '/' || (win && c == '\\');
    let mut rest = p;
    let mut prefix = String::new();
    if win && rest.len() >= 2 && rest.as_bytes()[1] == b':' && rest.as_bytes()[0].is_ascii_alphabetic() {
        prefix = rest[..2].to_string();
        rest = &rest[2..];
    }
    let rooted = rest.starts_with(is_sep);
    let trailing = rest.len() > 1 && rest.ends_with(is_sep);
    let mut parts: Vec<&str> = Vec::new();
    for seg in rest.split(is_sep) {
        match seg {
            "" | "." => {}
            ".." if parts.last().is_some_and(|l| *l != "..") => {
                parts.pop();
            }
            ".." if rooted => {}
            s => parts.push(s),
        }
    }
    let mut out = prefix;
    if rooted {
        out.push(sep);
    }
    out.push_str(&parts.join(&sep.to_string()));
    if out.is_empty() {
        out.push('.');
    } else if trailing && !parts.is_empty() {
        out.push(sep);
    }
    out
}

/// `path.join(dir, name)`.
fn join(dir: &str, name: &str) -> String {
    normalize(&if dir.is_empty() { name.to_string() } else { format!("{dir}/{name}") })
}

/// `path.basename(path.resolve(dir))`: the last name of the folder, read from
/// the working directory.
fn resolved_name(dir: &str) -> String {
    let abs = if Path::new(dir).is_absolute() || (cfg!(windows) && dir.starts_with(['/', '\\'])) {
        dir.to_string()
    } else {
        let cwd = std::env::current_dir().map(|c| c.to_string_lossy().into_owned()).unwrap_or_default();
        format!("{cwd}/{dir}")
    };
    let n = normalize(&abs);
    n.trim_end_matches(['/', '\\']).rsplit(['/', '\\']).next().unwrap_or("").to_string()
}

/// `^EMS-\d{3}$`
fn is_series(name: &str) -> bool {
    name.len() == 7 && name.starts_with("EMS-") && name[4..].bytes().all(|b| b.is_ascii_digit())
}

/// `^ORD-(\d{4})(?:\.|$)`: the number of an ID, and none for a dated one.
fn ord_number(name: &str) -> Option<u32> {
    let b = name.as_bytes();
    if b.len() < 8 || !name.starts_with("ORD-") || !b[4..8].iter().all(u8::is_ascii_digit) {
        return None;
    }
    if b.len() > 8 && b[8] != b'.' {
        return None;
    }
    name[4..8].parse().ok()
}

/// The moment of the emission, in milliseconds: SOURCE_DATE_EPOCH's when it
/// is digits alone, and now otherwise.
fn moment() -> f64 {
    match std::env::var("SOURCE_DATE_EPOCH") {
        Ok(e) if !e.is_empty() && e.bytes().all(|b| b.is_ascii_digit()) => e.parse::<f64>().unwrap_or(f64::INFINITY) * 1000.0,
        _ => std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis() as f64)
            .unwrap_or(0.0),
    }
}

fn cli(argv: Vec<String>) {
    let mut o = Out { out: Vec::new(), err: Vec::new() };
    let ctx = Context::repository();
    let opts = Opts::new(ctx);
    let mut mode = "xml";
    let mut src: Vec<String> = Vec::new();
    let (mut file, mut bundle, mut out_dir): (Option<String>, bool, Option<String>) = (None, false, None);
    let mut i = 0;
    while i < argv.len() {
        let a = argv[i].as_str();
        match a {
            "--ast" | "--xml" | "--diag" | "--expand" | "--hgml" | "--from-xml" => mode = &argv[i][2..],
            "--file" | "-f" => {
                i += 1;
                file = argv.get(i).cloned();
            }
            "--bundle" => bundle = true,
            "--out" => {
                i += 1;
                out_dir = argv.get(i).cloned();
            }
            _ if a.starts_with("--file=") => file = Some(a[7..].to_string()),
            _ => src.push(argv[i].clone()),
        }
        i += 1;
    }
    let mut input = src.join(" ");

    if let Some(f) = &file {
        if !input.is_empty() {
            o.error("--file e uma fonte na linha de comando ao mesmo tempo: escolha uma.");
            o.exit(2);
        }
        if f.is_empty() {
            o.error("--file sem caminho.");
            o.exit(2);
        }
        match std::fs::read(f) {
            Ok(bytes) => input = String::from_utf8_lossy(&bytes).into_owned(),
            Err(e) => {
                o.error(&format!("não consegui ler {f}: {e}"));
                o.exit(2);
            }
        }
        // a BOM survives the read and would reach the tokenizer as content
        if input.starts_with('\u{FEFF}') {
            input.drain(..3);
        }
    } else if mode != "expand" && !input.is_empty() && looks_like_path(&input) && Path::new(&input).exists() {
        o.error(&format!("{input} é um arquivo que existe, e uma fonte Glyph não se parece com isso."));
        o.error(&format!("para compilar o arquivo:  node scripts/glyph-cli.js --file {input} --xml"));
        o.exit(2);
    }

    if input.is_empty() {
        o.error("uso: node scripts/glyph-cli.js \"[crit[ctx]]\" [--xml|--ast|--diag|--hgml]");
        o.error("     node scripts/glyph-cli.js --file caminho.pgml [--xml|--ast|--diag|--hgml]");
        o.error("     node scripts/glyph-cli.js \"<glyph-package>…</glyph-package>\" --from-xml");
        o.error("     node scripts/glyph-cli.js CRIT --expand");
        o.exit(2);
    }

    // toAST with no language answers in en-EU, as the envelope's default
    let ast_opts = Opts { en: true, ..Opts::new(ctx) };
    let ast_text = |src: &str| to_ast(src, &ast_opts, &AstOpts::default()).map(|a| stringify_indent(&a, "  "));

    if bundle {
        let dir = out_dir.clone().unwrap_or_else(|| ".".into());
        let series = is_series(&resolved_name(&dir));
        let mut next = 1;
        match std::fs::read_dir(&dir) {
            Ok(entries) => {
                for e in entries.flatten() {
                    let name = e.file_name().to_string_lossy().into_owned();
                    let dir_entry = e.file_type().map(|t| t.is_dir()).unwrap_or(false);
                    if let Some(n) = ord_number(&name) {
                        if !series || dir_entry {
                            next = next.max(n + 1);
                        }
                    }
                }
            }
            Err(e) => {
                o.error(&format!("nao consegui ler {dir}: {e}"));
                o.exit(2);
            }
        }
        let id = format!("ORD-{next:04}");
        let compiled = to_xml(&input, &opts, false)
            .and_then(|xml| Ok((xml, ast_text(&input)?, to_hgml(&input, &BurnOpts { parse: &opts, keep_text: false })?)));
        let (xml, ast, hgml) = match compiled {
            Ok(t) => t,
            Err(Thrown(e)) => {
                o.error(&format!("a fonte nao compilou: {e}"));
                o.exit(1);
            }
        };
        let gaps = match parse(&input, &opts) {
            Ok(p) => p.gaps,
            Err(t) => o.thrown("TypeError", t),
        };
        let refused = gaps.iter().filter(|g| g.sev == "fix").count();
        let ms = moment();
        let emitted = match glyph_bundle::iso(ms as i64).filter(|_| ms.is_finite()) {
            Some(s) => s,
            None => o.thrown("RangeError", Thrown("Invalid time value".into())),
        };
        let s = |v: &str| Json::Str(v.to_string());
        let manifest = stringify_indent(
            &Json::Obj(vec![
                ("order".into(), s(&id)),
                ("engine".into(), s(glyph_version::VERSION)),
                ("emitted".into(), s(&emitted)),
                ("files".into(), Json::Arr(["pgml", "xml", "json", "hgml"].iter().map(|e| s(&format!("{id}.{e}"))).collect())),
                ("source".into(), file.as_deref().filter(|f| !f.is_empty()).map_or(Json::Null, s)),
                (
                    "diagnostics".into(),
                    Json::Obj(vec![
                        ("fix".into(), Json::Num(refused as f64)),
                        ("total".into(), Json::Num(gaps.len() as f64)),
                    ]),
                ),
            ]),
            "  ",
        ) + "\n";
        let five: Vec<(String, &str)> = vec![
            (format!("{id}.pgml"), input.as_str()),
            (format!("{id}.xml"), xml.as_str()),
            (format!("{id}.json"), ast.as_str()),
            (format!("{id}.hgml"), hgml.as_str()),
            (format!("{id}.manifest.json"), manifest.as_str()),
        ];
        if series {
            // written beside and then renamed: a half-written ORD-####/ would
            // count as emitted, and a name with a dot in front does not
            let dest = join(&dir, &id);
            let part = join(&dir, &format!(".{id}.{}", std::process::id()));
            let mut bytes = 0;
            let wrote = std::fs::create_dir(&part).and_then(|_| {
                for (name, text) in &five {
                    std::fs::write(Path::new(&part).join(name), text)?;
                    bytes += text.len();
                }
                std::fs::rename(&part, &dest)
            });
            if let Err(e) = wrote {
                let _ = std::fs::remove_dir_all(&part);
                o.error(&format!("nao consegui escrever {dest}: {e}"));
                o.exit(2);
            }
            o.log(&format!("{dest}{}  ({bytes} bytes, 5 arquivos)", std::path::MAIN_SEPARATOR));
        } else {
            let entries: Vec<(&str, &[u8])> = five.iter().map(|(n, t)| (n.as_str(), t.as_bytes())).collect();
            let zip = glyph_bundle::zip_store(&entries, ms as i64);
            let dest = join(&dir, &format!("{id}.zip"));
            if let Err(e) = std::fs::write(&dest, &zip) {
                o.thrown("Error", Thrown(e.to_string()));
            }
            o.log(&format!("{dest}  ({} bytes, 5 arquivos)", zip.len()));
        }
        // a refusal does not stop the emission, but the author has to know
        if refused > 0 {
            o.error(&format!("{refused} diagnostico(s) `fix` nesta Ordem. Rode --diag para ver."));
        }
        o.exit(0);
    }

    match mode {
        "hgml" => match to_hgml(&input, &BurnOpts { parse: &opts, keep_text: false }) {
            Ok(h) => o.log(&h),
            Err(t) => o.thrown("TypeError", t),
        },
        "from-xml" => match glyph_inverse::from_xml(&input) {
            Ok(back) => {
                o.log(&back.src);
                for d in &back.diag {
                    // the messages carry markup for the panel; the terminal wants them bare
                    let msg = strip_tags(&d.msg).replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&");
                    o.error(&format!("[{}] {} — {msg}", d.sev, d.code));
                }
            }
            Err(t) => o.thrown("RangeError", t),
        },
        "expand" => {
            // --expand takes a command's name, not Glyph source
            let nm = input.replace(['[', ']', '\''], "").trim().to_uppercase();
            let Some(sp) = species_of(&nm, ctx) else {
                o.error(&format!("{nm}: fora da tabela de composição (ou store não carregado)."));
                o.exit(2);
            };
            let depth = depth_of(&nm, ctx).map_or("undefined".to_string(), number);
            o.log(&format!("{nm}  [{sp}]  nível {depth}"));
            if sp == "composite" {
                let formula = formula_of(&nm, ctx).and_then(|f| f.str()).unwrap_or("undefined");
                o.log(&format!("  fórmula: {formula}"));
                let at = atoms_of(&nm, ctx).unwrap_or_default();
                o.log(&format!("  {} hieróglifos: {}", at.len(), at.join(" ")));
            } else {
                o.log("  hieróglifo — não decompõe.");
            }
        }
        "ast" => match ast_text(&input) {
            Ok(a) => o.log(&a),
            Err(t) => o.thrown("TypeError", t),
        },
        "diag" => match parse(&input, &opts) {
            Ok(p) => {
                if p.gaps.is_empty() {
                    o.log("sem diagnósticos.");
                }
                for g in &p.gaps {
                    o.log(&format!("[{}] {} — {}", g.sev, g.code, g.plain));
                }
            }
            Err(t) => o.thrown("TypeError", t),
        },
        _ => match to_xml(&input, &opts, false) {
            Ok(x) => o.log(&x),
            Err(t) => o.thrown("TypeError", t),
        },
    }
    o.exit(0)
}

/// `.replace(/<[^>]+>/g, "")`
fn strip_tags(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut rest = s;
    while let Some(i) = rest.find('<') {
        out.push_str(&rest[..i]);
        match rest[i + 1..].find('>') {
            Some(j) if j > 0 => rest = &rest[i + j + 2..],
            _ => {
                out.push('<');
                rest = &rest[i + 1..];
            }
        }
    }
    out.push_str(rest);
    out
}
