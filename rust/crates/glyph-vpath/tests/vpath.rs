//! EMS-002 ORD-0001, held to its five vals: the trees, the index, the
//! resolver, sources and the gate. Each breach the gate refuses is made here,
//! in a repository of a few files, and seen refused.

use glyph_vpath::index::{self, Index};
use glyph_vpath::{markdown, select, tree, Format};
use std::path::{Path, PathBuf};
use std::process::Command;

fn sel(path: &str, text: &str, selector: &str) -> Result<String, String> {
    select(Format::of(path), text, selector).map(|n| text[n.start..n.end].to_string())
}

// ---------- the trees ----------

#[test]
fn markdown_by_slug_as_github_writes_it() {
    let text = "---\nsources:\n  - a.js\n---\n# Top\nintro\n## The `ck`, [linked](x.md)!\nbody\n```\n# not a heading\n```\n## Repeat\none\n## Repeat\ntwo\n# Next\n";
    assert_eq!(sel("d.md", text, "top").unwrap(), &text[text.find("# Top").unwrap()..text.find("# Next").unwrap()]);
    assert_eq!(sel("d.md", text, "the-ck-linked").unwrap(), "## The `ck`, [linked](x.md)!\nbody\n```\n# not a heading\n```\n");
    assert_eq!(sel("d.md", text, "repeat").unwrap(), "## Repeat\none\n");
    assert_eq!(sel("d.md", text, "repeat-1").unwrap(), "## Repeat\ntwo\n");
    assert!(sel("d.md", text, "not-a-heading").is_err(), "a heading in a fence is not a heading");
    assert!(sel("d.md", text, "sources").is_err(), "the frontmatter holds no heading");
    assert_eq!(sel("d.md", text, "").unwrap(), text, "the empty selector is the whole file");
    assert_eq!(markdown::slug("8. Project vocabulary — the terms"), "8-project-vocabulary--the-terms");
    assert_eq!(markdown::slug("Restrições — o que o projeto se proíbe"), "restrições--o-que-o-projeto-se-proíbe");
}

#[test]
fn json_by_pointer_and_one_node_only() {
    let text = r#"{"a": {"b/c": [10, {"d~e": true}]}, "dup": 1, "dup": 2}"#;
    assert_eq!(sel("x.json", text, "/a/b~1c/0").unwrap(), "10");
    assert_eq!(sel("x.json", text, "/a/b~1c/1/d~0e").unwrap(), "true");
    assert!(sel("x.json", text, "/a/zz").unwrap_err().contains("no key"));
    assert!(sel("x.json", text, "/a/b~1c/01").is_err(), "an index is written canonically");
    assert!(sel("x.json", text, "/dup").unwrap_err().contains("more than once"));
    assert!(sel("x.json", text, "a").unwrap_err().contains("starts with `/`"));
    let nodes = tree(Format::Json, text).unwrap();
    assert!(nodes.iter().any(|n| n.selector == "/a/b~1c/1/d~0e" && n.depth == 4));
}

#[test]
fn xml_by_element_path_with_positions() {
    let text = "<?xml version=\"1.0\"?>\n<root a=\"x>y\">\n  <!-- <item> -->\n  <item>one</item>\n  <item>two</item>\n  <only/>\n</root>\n";
    assert_eq!(sel("x.xml", text, "/root/item[2]").unwrap(), "<item>two</item>");
    assert_eq!(sel("x.xml", text, "/root/only").unwrap(), "<only/>");
    assert!(sel("x.xml", text, "/root/item").unwrap_err().contains("names 2 elements"));
    assert!(sel("x.xml", text, "/root/item[3]").is_err());
    let nodes = tree(Format::Xml, text).unwrap();
    let names: Vec<&str> = nodes.iter().map(|n| n.selector.as_str()).collect();
    assert_eq!(names, ["", "/root", "/root/item[1]", "/root/item[2]", "/root/only"]);
    assert!(tree(Format::Xml, "<a><b></a>").is_err());
}

#[test]
fn blocks_behind_any_comment_prefix() {
    let text = "x\n// @block:api\nfn a() {}\n// @endblock:api\n# @block:py-thing\npass\n# @endblock:py-thing\n<!-- @block:m -->\nm\n<!-- @endblock:m -->\nsay @block:prose in a sentence\n";
    assert_eq!(sel("a.rs", text, "@block:api").unwrap(), "fn a() {}\n");
    assert_eq!(sel("a.py", text, "@block:py-thing").unwrap(), "pass\n");
    assert_eq!(sel("a.pgml", text, "@block:m").unwrap(), "m\n");
    assert!(sel("a.rs", text, "@block:prose").is_err(), "a marker is a line of its own");
    assert!(tree(Format::Text, "// @block:a\n// @block:b\n// @endblock:b\n// @endblock:a\n").unwrap_err().contains("do not nest"));
    assert!(tree(Format::Text, "// @block:a\n").unwrap_err().contains("never closes"));
    assert!(tree(Format::Text, "// @block:a\nx\n// @endblock:a\n// @block:a\ny\n// @endblock:a\n").unwrap_err().contains("twice"));
}

// ---------- a repository of a few files ----------

struct Repo(PathBuf);

impl Repo {
    fn new(name: &str) -> Repo {
        let dir = std::env::temp_dir().join(format!("glyph-vpath-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        let r = Repo(dir);
        r.put(".guidelines/GUIDE.md", "---\nsources:\n  - src/cli.js#@block:flags\n---\n# Guide\nthe flags are --a and --b\n");
        r.put(".guidelines/data.json", "{\"k\": {\"deep\": {\"deeper\": 1}}}\n");
        r.put(".guidelines/.history/old.md", "");
        r.put("README.md", "# Readme\n");
        r.put("src/cli.js", "// @block:flags\nconst flags = ['--a', '--b'];\n// @endblock:flags\nconst other = 1;\n");
        r
    }
    fn put(&self, file: &str, text: &str) {
        let p = self.0.join(file);
        std::fs::create_dir_all(p.parent().unwrap()).unwrap();
        std::fs::write(p, text).unwrap();
    }
    /// As `glyph-vpath build` does: the index, then the cache of its text.
    fn build(&self) {
        let old = index::committed(&self.0).unwrap().map(|(_, i)| i);
        let new = index::build(&self.0, old.as_ref(), &[]).unwrap();
        glyph_vpath::recovery::write_cache(&self.0, &new).unwrap();
        self.write(new);
    }
    fn write(&self, idx: Index) {
        self.put(index::PATH, &index::render(&idx));
    }
    fn check(&self) -> Vec<String> {
        index::check(&self.0)
    }
    fn refused(&self, what: &str) {
        let b = self.check();
        assert!(b.iter().any(|l| l.contains(what)), "expected `{what}` among {b:?}");
    }
}

impl Drop for Repo {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

// ---------- the index ----------

#[test]
fn the_index_covers_the_universe_and_keeps_offsets() {
    let r = Repo::new("cover");
    r.refused("does not exist");
    r.build();
    assert_eq!(r.check(), Vec::<String>::new());
    let (_, idx) = index::committed(&r.0).unwrap().unwrap();
    let paths: Vec<&str> = idx.files.iter().map(|e| e.path.as_str()).collect();
    assert_eq!(paths, [".guidelines/GUIDE.md", ".guidelines/data.json", "README.md"], "the attic and the index aside");
    let data = idx.entry(".guidelines/data.json").unwrap();
    let selectors: Vec<&str> = data.nodes.iter().map(|n| n.selector.as_str()).collect();
    assert_eq!(selectors, ["", "/k", "/k/deep"], "JSON to depth 2");
    let guide = idx.entry(".guidelines/GUIDE.md").unwrap().node("guide").unwrap();
    assert_eq!((guide.line, guide.lines), (5, 2), "the line range a windowed read takes");
}

#[test]
fn the_gate_refuses_a_file_left_out_changed_or_gone() {
    let r = Repo::new("drift");
    r.build();
    r.put(".guidelines/new.md", "# New\n");
    r.refused(".guidelines/new.md: not in the index");
    r.build();
    r.put("README.md", "# Readme\nmore\n");
    r.refused("README.md: changed since the index was built");
    r.build();
    std::fs::remove_file(r.0.join(".guidelines/new.md")).unwrap();
    r.refused(".guidelines/new.md: in the index, gone from the disk");
    r.build();
    let text = std::fs::read_to_string(r.0.join(index::PATH)).unwrap();
    r.put(index::PATH, &text.replace("\"depth\": 2", "\"depth\": 2 "));
    r.refused("drifted");
}

#[test]
fn the_gate_refuses_an_empty_slice_and_a_source_that_does_not_resolve() {
    let r = Repo::new("resolve");
    r.build();
    r.put(".guidelines/empty.txt", "");
    r.refused(".guidelines/empty.txt: resolves to an empty slice");
    std::fs::remove_file(r.0.join(".guidelines/empty.txt")).unwrap();
    r.put(".guidelines/GUIDE.md", "---\nsources:\n  - src/cli.js#@block:gone\n---\n# Guide\n");
    r.refused("declares a source that does not resolve");
    r.put(".guidelines/GUIDE.md", "---\nsources:\n  - .guidelines/.orders/EMS-001/RETURN.md\n---\n# Guide\n");
    r.put(".guidelines/.orders/EMS-001/RETURN.md", "# Return\n");
    r.refused("a log is never a source");
}

// ---------- sources ----------

#[test]
fn a_source_that_changes_under_a_document_that_did_not_is_stale() {
    let r = Repo::new("stale");
    r.build();
    r.put("src/cli.js", "// @block:flags\nconst flags = ['--a', '--b'];\n// @endblock:flags\nconst other = 2;\n");
    assert_eq!(r.check(), Vec::<String>::new(), "a change outside the block is not the document's");
    r.put("src/cli.js", "// @block:flags\nconst flags = ['--a', '--b', '--c'];\n// @endblock:flags\n");
    r.refused(".guidelines/GUIDE.md: stale");
    r.build();
    r.refused(".guidelines/GUIDE.md: stale");
    let old = index::committed(&r.0).unwrap().map(|(_, i)| i);
    r.write(index::build(&r.0, old.as_ref(), &[".guidelines/GUIDE.md".to_string()]).unwrap());
    assert_eq!(r.check(), Vec::<String>::new(), "stamped again, deliberately");
    r.put("src/cli.js", "// @block:flags\nconst flags = ['--a'];\n// @endblock:flags\n");
    r.put(".guidelines/GUIDE.md", "---\nsources:\n  - src/cli.js#@block:flags\n---\n# Guide\nthe flag is --a\n");
    r.build();
    assert_eq!(r.check(), Vec::<String>::new(), "the document brought up to date stamps its sources");
}

// ---------- the resolver ----------

fn vpath(r: &Repo, args: &[&str]) -> (bool, String, String) {
    let out = Command::new(env!("CARGO_BIN_EXE_glyph-vpath")).arg("--root").arg(&r.0).args(args).output().unwrap();
    (out.status.success(), String::from_utf8(out.stdout).unwrap(), String::from_utf8(out.stderr).unwrap())
}

#[test]
fn the_resolver_answers_offsets_and_provenance_and_refuses_a_stale_index() {
    let r = Repo::new("resolver");
    r.build();
    let (ok, out, _) = vpath(&r, &["resolve", "src/cli.js#@block:flags", ".guidelines/data.json#/k/deep/deeper", "README.md"]);
    assert!(ok);
    let lines: Vec<&str> = out.lines().collect();
    assert_eq!(lines.len(), 3, "one answer per path, in the order asked");
    assert!(lines[0].contains("\"bytes\":[16,46]") && lines[0].contains("\"line\":2,\"lines\":1"), "{}", lines[0]);
    assert!(lines[1].contains("\"selector\":\"/k/deep/deeper\""), "deeper than the index, read from the file");
    let (_, text, _) = vpath(&r, &["resolve", "src/cli.js#@block:flags", "--text"]);
    assert_eq!(text, "--- src/cli.js#@block:flags · lines 2+1 · bytes 16..46\nconst flags = ['--a', '--b'];\n");
    let (ok, _, err) = vpath(&r, &["resolve", "README.md#nothing"]);
    assert!(!ok && err.contains("names no node"), "{err}");
    r.put("README.md", "# Readme\nmoved\n");
    let (ok, _, err) = vpath(&r, &["resolve", "README.md#readme"]);
    assert!(!ok && err.contains("changed since the index was built"), "{err}");
    let (_, code, _) = vpath(&r, &["code", "src/cli.js"]);
    assert_eq!(code, ".guidelines/GUIDE.md ← src/cli.js#@block:flags\n");
}

// ---------- this repository ----------

#[test]
fn this_repository_passes_its_own_gate() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../..");
    assert_eq!(index::check(&root), Vec::<String>::new());
}

// ---------- EMS-002 ORD-0002: the NodeID ----------

impl Repo {
    fn index(&self) -> Index {
        index::committed(&self.0).unwrap().unwrap().1
    }
    fn id(&self, vpath: &str) -> String {
        let idx = self.index();
        let (file, selector) = glyph_vpath::split(vpath);
        idx.entry(file).and_then(|e| e.node(selector)).map(|n| n.id.clone()).unwrap_or_else(|| panic!("{vpath} is not in the index"))
    }
    fn alias(&self, vpath: &str) -> Option<String> {
        self.index().alias(vpath).map(str::to_string)
    }
}

const DOC: &str = "# Doc\n## Alpha\nalpha one\nalpha two\n## Beta\nbeta one\nbeta two\n## Gamma\ngamma one\n";

#[test]
fn a_node_keeps_its_id_through_an_edit_a_move_and_a_rename_over_the_same_body() {
    let r = Repo::new("ids");
    r.put(".guidelines/doc.md", DOC);
    r.put(".guidelines/other.md", "# Other\n");
    r.build();
    let (alpha, beta, gamma) = (r.id(".guidelines/doc.md#alpha"), r.id(".guidelines/doc.md#beta"), r.id(".guidelines/doc.md#gamma"));

    // 3. an edit in place
    r.put(".guidelines/doc.md", &DOC.replace("alpha two", "alpha two, edited"));
    r.build();
    assert_eq!(r.id(".guidelines/doc.md#alpha"), alpha, "an edit in place keeps the NodeID");

    // 2. a section moved to another file, unchanged
    r.put(".guidelines/doc.md", "# Doc\n## Alpha\nalpha one\nalpha two, edited\n## Gamma\ngamma one\n");
    r.put(".guidelines/other.md", "# Other\n## Beta\nbeta one\nbeta two\n");
    r.build();
    assert_eq!(r.id(".guidelines/other.md#beta"), beta, "a section moved keeps its NodeID");
    assert_eq!(r.alias(".guidelines/doc.md#beta"), Some(beta.clone()), "and its old path is an alias");

    // 4. a heading renamed over the same body
    r.put(".guidelines/doc.md", "# Doc\n## Alpha\nalpha one\nalpha two, edited\n## Gamma, renamed\ngamma one\n");
    r.build();
    assert_eq!(r.id(".guidelines/doc.md#gamma-renamed"), gamma, "a heading renamed over the same body keeps its NodeID");
    assert_eq!(r.alias(".guidelines/doc.md#gamma"), Some(gamma.clone()));

    // layer 7, not this one: a heading renamed while its body changes is a new node
    r.put(".guidelines/doc.md", "# Doc\n## Alpha, renamed\nalpha one\nalpha three\n## Gamma, renamed\ngamma one\n");
    r.build();
    let fresh = r.id(".guidelines/doc.md#alpha-renamed");
    assert_ne!(fresh, alpha, "similarity is the recovery index's, by INTAKE-VIRTUAL-PATH §21");
    let numbers = |id: &str| id[1..].parse::<u64>().unwrap();
    assert!(numbers(&fresh) >= r.index().next - 1 && numbers(&fresh) > numbers(&gamma), "a new node takes a new number");
    assert_eq!(r.alias(".guidelines/doc.md#alpha"), None, "a node that is gone takes its NodeID and its paths with it");
    assert_eq!(index::validate(&r.index()), Vec::<String>::new());
}

#[test]
fn content_beats_position_in_json_and_a_renamed_key_or_block_keeps_its_id() {
    let r = Repo::new("positions");
    r.put(".guidelines/list.json", "{\"items\": [\"apple\", \"pear\"], \"old\": {\"x\": 1}}\n");
    r.put(".guidelines/notes.txt", "# @block:first\nsome text\n# @endblock:first\n");
    r.build();
    let (apple, pear, old) = (r.id(".guidelines/list.json#/items/0"), r.id(".guidelines/list.json#/items/1"), r.id(".guidelines/list.json#/old"));
    let block = r.id(".guidelines/notes.txt#@block:first");
    r.put(".guidelines/list.json", "{\"items\": [\"fig\", \"apple\", \"pear\"], \"new\": {\"x\": 1}}\n");
    r.put(".guidelines/notes.txt", "# @block:renamed\nsome text\n# @endblock:renamed\n");
    r.build();
    assert_eq!(r.id(".guidelines/list.json#/items/1"), apple, "the element follows its content, not its index");
    assert_eq!(r.id(".guidelines/list.json#/items/2"), pear);
    assert!(![apple.clone(), pear.clone()].contains(&r.id(".guidelines/list.json#/items/0")), "the inserted element is new");
    assert_eq!(r.alias(".guidelines/list.json#/items/0"), None, "a live path wins over an alias");
    assert_eq!(r.id(".guidelines/list.json#/new"), old, "a renamed key keeps its NodeID");
    assert_eq!(r.id(".guidelines/notes.txt#@block:renamed"), block, "a renamed block keeps its NodeID");
}

#[test]
fn a_renamed_file_keeps_its_ids_edited_or_not() {
    let r = Repo::new("files");
    r.put(".guidelines/a.md", DOC);
    r.put(".guidelines/b.md", "# Bee\n## One\nfirst\n## Two\nsecond\n");
    r.build();
    let (a_root, a_beta) = (r.id(".guidelines/a.md"), r.id(".guidelines/a.md#beta"));
    let (b_root, b_two) = (r.id(".guidelines/b.md"), r.id(".guidelines/b.md#two"));
    std::fs::rename(r.0.join(".guidelines/a.md"), r.0.join(".guidelines/a2.md")).unwrap();
    std::fs::remove_file(r.0.join(".guidelines/b.md")).unwrap();
    r.put(".guidelines/b2.md", "# Bee\n## One\nfirst\n## Two\nsecond, edited\n## Three\nthird\n");
    r.build();
    assert_eq!(r.id(".guidelines/a2.md"), a_root, "renamed unchanged: the root follows");
    assert_eq!(r.id(".guidelines/a2.md#beta"), a_beta);
    assert_eq!(r.id(".guidelines/b2.md"), b_root, "renamed and edited: more than half went to one file");
    assert_eq!(r.id(".guidelines/b2.md#two"), b_two, "and the edited section follows by its selector");
    assert_eq!(r.alias(".guidelines/a.md#beta"), Some(a_beta), "the old paths are aliases");
    assert_eq!(r.alias(".guidelines/b.md"), Some(b_root));
    assert_eq!(r.check(), Vec::<String>::new());
}

#[test]
fn an_old_path_answers_the_node_it_became_with_a_warning() {
    let r = Repo::new("alias");
    r.put(".guidelines/doc.md", DOC);
    r.build();
    let beta = r.id(".guidelines/doc.md#beta");
    r.put(".guidelines/doc.md", &DOC.replace("## Beta", "## Beta, renamed"));
    r.build();
    let (ok, out, err) = vpath(&r, &["resolve", ".guidelines/doc.md#beta"]);
    assert!(ok, "an old path never blocks: {err}");
    assert!(err.contains("`.guidelines/doc.md#beta` moved; it is `.guidelines/doc.md#beta-renamed`"), "{err}");
    assert!(out.contains(&format!("\"id\":\"{beta}\"")) && out.contains("\"moved_from\":\".guidelines/doc.md#beta\""), "{out}");
    let (ok, text, _) = vpath(&r, &["resolve", &beta, "--text"]);
    assert!(ok && text.starts_with(&format!("--- .guidelines/doc.md#beta-renamed · {beta} · lines 5+3")), "{text}");
    let (_, up, _) = vpath(&r, &["up", &beta]);
    let chain: Vec<&str> = up.lines().map(|l| l.split_whitespace().nth(1).unwrap()).collect();
    assert_eq!(chain, [".guidelines/doc.md#beta-renamed", ".guidelines/doc.md#doc", ".guidelines/doc.md"]);
    let (_, node, _) = vpath(&r, &["node", ".guidelines/doc.md#beta-renamed"]);
    let alpha = r.id(".guidelines/doc.md#alpha");
    let gamma = r.id(".guidelines/doc.md#gamma");
    assert!(node.contains(&format!("\"prev\":\"{alpha}\",\"next\":\"{gamma}\",\"depth\":2")), "{node}");
}

#[test]
fn the_gate_refuses_a_source_by_an_old_path_and_an_identity_that_does_not_hold() {
    let r = Repo::new("idgate");
    r.put(".guidelines/doc.md", DOC);
    r.put(".guidelines/GUIDE.md", "---\nsources:\n  - .guidelines/doc.md#beta\n---\n# Guide\n");
    r.build();
    r.put(".guidelines/doc.md", &DOC.replace("## Beta", "## Beta, renamed"));
    r.refused("declares `.guidelines/doc.md#beta`, which moved: write `.guidelines/doc.md#beta-renamed`");
    r.put(".guidelines/GUIDE.md", "---\nsources:\n  - .guidelines/doc.md#beta-renamed\n---\n# Guide\n");
    r.build();
    assert_eq!(r.check(), Vec::<String>::new());

    let good = std::fs::read_to_string(r.0.join(index::PATH)).unwrap();
    let alpha = r.id(".guidelines/doc.md#alpha");
    let gamma = r.id(".guidelines/doc.md#gamma");
    let breaks = [
        (good.replacen(&format!("[\"{gamma}\""), &format!("[\"{alpha}\""), 1), "repeats"),
        (good.replacen(&format!("\"{alpha}\", \"alpha\""), &format!("\"{alpha}\", \"alpha\"").replace(&alpha, "n999"), 1), "not a NodeID below"),
        (good.replacen(&format!(", \"{}\"]", r.id(".guidelines/doc.md#doc")), ", \"n1\"]", 1), "is no node before it"),
        (good.replacen("\"aliases\": {", "\"aliases\": {\n    \".guidelines/gone.md\": \"n998\",", 1), "which is no node"),
        (good.replacen("\"aliases\": {", "\"aliases\": {\n    \".guidelines/doc.md#alpha\": \"n1\",", 1), "is a live path"),
    ];
    for (text, what) in breaks {
        r.put(index::PATH, &text);
        r.refused(what);
    }
}

#[test]
fn the_first_build_gives_ids_to_an_index_of_ord_0001_and_keeps_its_stamps() {
    let r = Repo::new("migrate");
    r.build();
    let idx = r.index();
    // the shape ORD-0001 wrote: six fields a row, no next, no aliases
    let mut v1 = String::from("{\n  \"depth\": 2,\n  \"files\": {");
    for (k, e) in idx.files.iter().enumerate() {
        let rows: Vec<String> = e.nodes.iter().map(|n| format!("[\"{}\", {}, {}, {}, {}, \"{}\"]", n.selector, n.start, n.end, n.line, n.lines, n.fingerprint)).collect();
        let sources: Vec<String> = e.sources.iter().map(|(v, _)| format!("[\"{v}\", \"stamped-in-v1\"]")).collect();
        v1.push_str(&format!("{}\"{}\": {{\"sources\": [{}], \"nodes\": [{}]}}", if k == 0 { "" } else { "," }, e.path, sources.join(","), rows.join(",")));
    }
    v1.push_str("}\n}\n");
    r.put(index::PATH, &v1);
    assert_eq!(index::validate(&index::load(&v1).unwrap()), Vec::<String>::new(), "an index with no NodeID promises nothing yet");
    r.refused("drifted");
    r.build();
    let migrated = r.index();
    assert!(migrated.files.iter().all(|e| e.nodes.iter().all(|n| !n.id.is_empty())));
    assert_eq!(migrated.entry(".guidelines/GUIDE.md").unwrap().sources[0].1, "stamped-in-v1", "the stamps are kept");
    let once = std::fs::read_to_string(r.0.join(index::PATH)).unwrap();
    r.build();
    assert_eq!(std::fs::read_to_string(r.0.join(index::PATH)).unwrap(), once, "a second build writes the same bytes");
}

#[test]
fn every_node_finds_its_place_once() {
    let r = Repo::new("places");
    r.put(".guidelines/doc.md", DOC);
    r.build();
    let idx = r.index();
    let places = glyph_vpath::identity::places(&idx);
    assert_eq!(places.len(), idx.files.iter().map(|e| e.nodes.len()).sum::<usize>());
    let beta = &places[&r.id(".guidelines/doc.md#beta")];
    assert_eq!((beta.prev.clone(), beta.next.clone(), beta.depth),
               (Some(r.id(".guidelines/doc.md#alpha")), Some(r.id(".guidelines/doc.md#gamma")), 2));
}

// ---------- EMS-002 ORD-0003: the recovery index ----------

const SPEC: &str = "# Spec\n## Old name\nline one\nline two\nline three\nline four\n## Other\nunrelated text\n";
const RENAMED: &str = "# Spec\n## New name\nline one\nline two\nline three\nline five\n## Other\nunrelated text\n";

impl Repo {
    fn recovery(&self, reference: &str) -> Option<glyph_vpath::recovery::Recovered> {
        self.index().recovery(reference).cloned()
    }
    fn git(&self, args: &[&str]) {
        let ok = Command::new("git").arg("-C").arg(&self.0)
            .args(["-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false"]).args(args)
            .output().map(|o| o.status.success()).unwrap_or(false);
        assert!(ok, "git {args:?}");
    }
}

#[test]
fn a_heading_renamed_while_its_body_changes_is_recovered_by_its_content() {
    let r = Repo::new("recover");
    r.put(".guidelines/spec.md", SPEC);
    r.build();
    let old = r.id(".guidelines/spec.md#old-name");
    r.put(".guidelines/spec.md", RENAMED);
    r.build();
    let new = r.id(".guidelines/spec.md#new-name");
    assert_ne!(new, old, "recovery is not identity: the successor keeps its own NodeID");
    let rec = r.recovery(".guidelines/spec.md#old-name").expect("recovered by the path");
    assert_eq!((rec.id.as_str(), rec.to.as_str(), rec.score), (old.as_str(), new.as_str(), 60), "three of five lines: Jaccard 0.60");
    assert_eq!(r.recovery(&old).map(|x| x.to), Some(new.clone()), "and by the old NodeID");
    assert_eq!(index::validate(&r.index()), Vec::<String>::new());
    assert_eq!(r.check(), Vec::<String>::new());

    let (ok, out, err) = vpath(&r, &["resolve", ".guidelines/spec.md#old-name"]);
    assert!(ok, "an index miss never blocks: {err}");
    assert!(err.contains("went; by its content it is `.guidelines/spec.md#new-name`, Jaccard 0.60 — an index miss"), "{err}");
    assert!(out.contains(&format!("\"id\":\"{new}\"")) && out.contains("\"recovered_from\":\".guidelines/spec.md#old-name\",\"score\":0.6"), "{out}");
    let (ok, text, _) = vpath(&r, &["resolve", &old, "--text"]);
    assert!(ok && text.contains(&format!("recovered from {old}, Jaccard 0.60")), "{text}");
    let (_, misses, _) = vpath(&r, &["misses"]);
    assert_eq!(misses, format!("    1  .guidelines/spec.md#old-name → .guidelines/spec.md#new-name\n    1  {old} → .guidelines/spec.md#new-name\n"));

    // the successor renamed again over the same body: the recovery follows its NodeID
    r.put(".guidelines/spec.md", &RENAMED.replace("## New name", "## Newer name"));
    r.build();
    assert_eq!(r.recovery(".guidelines/spec.md#old-name").map(|x| x.to), Some(new.clone()));
    let (_, out, _) = vpath(&r, &["resolve", ".guidelines/spec.md#old-name"]);
    assert!(out.contains("\"path\":\".guidelines/spec.md#newer-name\""), "{out}");
}

#[test]
fn a_deletion_and_a_tie_are_not_recovered() {
    let r = Repo::new("norecover");
    r.put(".guidelines/spec.md", SPEC);
    r.build();
    r.put(".guidelines/spec.md", "# Spec\n## Something else\nnothing in common\n## Other\nunrelated text\n");
    r.build();
    assert_eq!(r.recovery(".guidelines/spec.md#old-name"), None, "a deletion has no successor");
    let (ok, _, err) = vpath(&r, &["resolve", ".guidelines/spec.md#old-name"]);
    assert!(!ok && err.contains("names no node"), "{err}");

    let r = Repo::new("tie");
    r.put(".guidelines/spec.md", SPEC);
    r.build();
    r.put(".guidelines/spec.md", "# Spec\n## Twin a\nline one\nline two\nline three\n## Twin b\nline one\nline two\nline three\n## Other\nunrelated text\n");
    r.build();
    assert_eq!(r.recovery(".guidelines/spec.md#old-name"), None, "two successors that tie are none");
}

#[test]
fn the_old_text_comes_from_the_cache_then_from_git_and_only_when_it_is_the_one_indexed() {
    // no cache and no git: nothing to compare, and the build says so
    let r = Repo::new("nowhere");
    r.put(".guidelines/spec.md", SPEC);
    r.build();
    std::fs::remove_dir_all(r.0.join(glyph_vpath::recovery::CACHE)).unwrap();
    r.put(".guidelines/spec.md", RENAMED);
    let old = index::committed(&r.0).unwrap().map(|(_, i)| i);
    let new = index::build(&r.0, old.as_ref(), &[]).unwrap();
    assert!(new.recovered.is_empty());
    assert!(new.notes.iter().any(|n| n.contains(".guidelines/spec.md#old-name: went, and the text it had is neither in the cache nor in git at HEAD")), "{:?}", new.notes);

    // git at HEAD, when the cache is gone
    let r = Repo::new("fromgit");
    r.put(".guidelines/spec.md", SPEC);
    r.build();
    r.git(&["init", "-q"]);
    r.git(&["add", "-A"]);
    r.git(&["commit", "-q", "-m", "spec"]);
    std::fs::remove_dir_all(r.0.join(glyph_vpath::recovery::CACHE)).unwrap();
    r.put(".guidelines/spec.md", RENAMED);
    r.build();
    assert!(r.recovery(".guidelines/spec.md#old-name").is_some(), "the old text read from git at HEAD");

    // a cache that is not the text indexed is not taken
    let r = Repo::new("stalecache");
    r.put(".guidelines/spec.md", SPEC);
    r.build();
    r.put(&format!("{}/.guidelines/spec.md", glyph_vpath::recovery::CACHE), "# Spec\n## Old name\nsomething else entirely\n");
    r.put(".guidelines/spec.md", RENAMED);
    let old = index::committed(&r.0).unwrap().map(|(_, i)| i);
    assert!(index::build(&r.0, old.as_ref(), &[]).unwrap().recovered.is_empty(), "the fingerprint decides which old text is the old text");
}

#[test]
fn the_gate_refuses_a_source_by_a_recovered_path_and_a_recovery_that_does_not_hold() {
    let r = Repo::new("recgate");
    r.put(".guidelines/spec.md", SPEC);
    r.put(".guidelines/GUIDE.md", "---\nsources:\n  - .guidelines/spec.md#old-name\n---\n# Guide\n");
    r.build();
    r.put(".guidelines/spec.md", RENAMED);
    r.refused("declares `.guidelines/spec.md#old-name`, which went; by its content it is `.guidelines/spec.md#new-name`, Jaccard 0.60");
    r.put(".guidelines/GUIDE.md", "---\nsources:\n  - .guidelines/spec.md#new-name\n---\n# Guide\n");
    r.build();
    assert_eq!(r.check(), Vec::<String>::new());

    let good = std::fs::read_to_string(r.0.join(index::PATH)).unwrap();
    let rec = r.recovery(".guidelines/spec.md#old-name").unwrap();
    let live = r.id(".guidelines/spec.md#other");
    let line = format!("[\".guidelines/spec.md#old-name\", \"{}\", \"{}\", {}]", rec.id, rec.to, rec.score);
    let breaks = [
        (line.replace(&rec.to, "n999"), "which is no node"),
        (line.replace(&rec.id, &live), "names a node that lives"),
        (line.replace(".guidelines/spec.md#old-name", ".guidelines/spec.md#other"), "names a node that lives"),
        (line.replace(&format!(", {}]", rec.score), ", 40]"), "outside 50 to 100"),
    ];
    for (bad, what) in breaks {
        r.put(index::PATH, &good.replace(&line, &bad));
        r.refused(what);
    }
}

// ---------- EMS-002 ORD-0004: order maintenance ----------

use glyph_vpath::order::{Order, Relation};

#[test]
fn before_tells_which_comes_first_or_which_holds_the_other() {
    let r = Repo::new("before");
    r.put(".guidelines/doc.md", DOC);
    r.put(".guidelines/other.md", "# Other\n");
    r.build();
    let idx = r.index();
    let order = Order::of(&idx);
    let id = |v: &str| r.id(v);
    let rel = |a: &str, b: &str| order.relation(&idx, &id(a), &id(b)).unwrap();
    assert_eq!(rel(".guidelines/doc.md#alpha", ".guidelines/doc.md#beta"), Relation::Before);
    assert_eq!(rel(".guidelines/doc.md#gamma", ".guidelines/doc.md#alpha"), Relation::After);
    assert_eq!(rel(".guidelines/doc.md#doc", ".guidelines/doc.md#beta"), Relation::Holds);
    assert_eq!(rel(".guidelines/doc.md#beta", ".guidelines/doc.md"), Relation::Inside);
    assert_eq!(rel(".guidelines/doc.md", ".guidelines/doc.md#doc"), Relation::Holds, "two equal ranges: the first in order holds");
    assert_eq!(rel(".guidelines/doc.md#gamma", ".guidelines/other.md"), Relation::Before, "files in the order the index lists them");
    assert_eq!(rel(".guidelines/doc.md#beta", ".guidelines/doc.md#beta"), Relation::Same);
    let (ok, out, _) = vpath(&r, &["before", ".guidelines/doc.md#beta", &id(".guidelines/doc.md#alpha")]);
    assert!(ok && out == "after\n", "{out}");
}

#[test]
fn above_and_between_read_the_order() {
    let r = Repo::new("above");
    r.put(".guidelines/doc.md", DOC);
    r.build();
    let idx = r.index();
    let order = Order::of(&idx);
    let id = |v: &str| r.id(v);
    assert_eq!(order.above(&idx, &id(".guidelines/doc.md#gamma"), 5).unwrap(),
               [id(".guidelines/doc.md#beta"), id(".guidelines/doc.md#alpha")], "nearest first, and never what holds it");
    assert_eq!(order.above(&idx, &id(".guidelines/doc.md#alpha"), 5).unwrap(), Vec::<String>::new());
    let span: Vec<String> = order.between(&id(".guidelines/doc.md#alpha"), &id(".guidelines/doc.md#gamma")).unwrap()
        .iter().map(|&(f, n)| idx.files[f].nodes[n].selector.clone()).collect();
    assert_eq!(span, ["alpha", "beta", "gamma"]);
    assert!(order.between(&id(".guidelines/doc.md#gamma"), &id(".guidelines/doc.md#alpha")).unwrap_err().contains("comes before"));
    let (ok, out, _) = vpath(&r, &["above", ".guidelines/doc.md#gamma", "1"]);
    assert!(ok && out.starts_with(&id(".guidelines/doc.md#beta")) && out.lines().count() == 1, "{out}");
    let (ok, _, err) = vpath(&r, &["between", ".guidelines/doc.md#gamma", ".guidelines/doc.md#alpha"]);
    assert!(!ok && err.contains("comes before"), "{err}");
    let (ok, _, err) = vpath(&r, &["above", ".guidelines/doc.md#nothing"]);
    assert!(!ok && err.contains("names no node of the index"), "{err}");
}

#[test]
fn the_order_answers_after_an_insertion_a_move_and_a_removal() {
    let r = Repo::new("reorder");
    r.put(".guidelines/doc.md", DOC);
    r.build();
    let (alpha, beta, gamma) = (r.id(".guidelines/doc.md#alpha"), r.id(".guidelines/doc.md#beta"), r.id(".guidelines/doc.md#gamma"));
    r.put(".guidelines/doc.md", "# Doc\n## Gamma\ngamma one\n## Alpha\nalpha one\nalpha two\n## Inserted\nnew text\n## Beta\nbeta one\nbeta two\n");
    r.build();
    let idx = r.index();
    let order = Order::of(&idx);
    let inserted = r.id(".guidelines/doc.md#inserted");
    assert_eq!(r.id(".guidelines/doc.md#gamma"), gamma, "the moved section keeps its NodeID");
    assert_eq!(order.relation(&idx, &gamma, &alpha), Some(Relation::Before), "and its new place");
    assert_eq!(order.relation(&idx, &alpha, &inserted), Some(Relation::Before));
    assert_eq!(order.relation(&idx, &inserted, &beta), Some(Relation::Before));
    r.put(".guidelines/doc.md", "# Doc\n## Gamma\ngamma one\n## Alpha\nalpha one\nalpha two\n## Inserted\nnew text\n");
    r.build();
    let idx = r.index();
    assert_eq!(Order::of(&idx).rank(&beta), None, "a removed node has no place in the order");
    let (ok, _, err) = vpath(&r, &["before", &beta, &alpha]);
    assert!(!ok && err.contains("is no NodeID"), "{err}");
}

#[test]
fn the_order_of_this_repository_agrees_with_its_files_and_offsets_on_every_pair() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../..");
    let idx = index::committed(&root).unwrap().unwrap().1;
    let order = Order::of(&idx);
    // an independent sort: the path as a string, the start, the longer first
    let mut all: Vec<(&str, usize, usize, &str)> = idx.files.iter()
        .flat_map(|e| e.nodes.iter().map(move |n| (e.path.as_str(), n.start, n.end, n.id.as_str()))).collect();
    all.sort_by(|a, b| (a.0, a.1, std::cmp::Reverse(a.2)).cmp(&(b.0, b.1, std::cmp::Reverse(b.2))));
    let ranks: Vec<usize> = all.iter().map(|x| order.rank(x.3).unwrap()).collect();
    assert_eq!(ranks, (0..all.len()).collect::<Vec<_>>(), "the order is the sort of the index's files and offsets");
    let mut pairs = 0usize;
    for (i, a) in all.iter().enumerate() {
        for b in &all[i + 1..] {
            let rel = order.relation(&idx, a.3, b.3).unwrap();
            let holds = a.0 == b.0 && a.1 <= b.1 && b.2 <= a.2;
            assert_eq!(rel, if holds { Relation::Holds } else { Relation::Before }, "{} and {}", a.3, b.3);
            assert_eq!(order.relation(&idx, b.3, a.3).unwrap(), if holds { Relation::Inside } else { Relation::After });
            pairs += 1;
        }
    }
    assert!(pairs > 1_000_000, "every pair: {pairs}");
}
