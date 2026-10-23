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
    fn build(&self) {
        let old = index::committed(&self.0).unwrap().map(|(_, i)| i);
        self.write(index::build(&self.0, old.as_ref(), &[]).unwrap());
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
