//! EMS-001 ORD-0008, the val: the first binary. The five sources of
//! `conformance/examples.json` come out byte-exact against the XML they
//! record, then all 114 sources against the oracle; and a source the JS
//! throws on leaves stdout empty, the JS's message on stderr, and exit 1.

#[path = "../../../testkit/oracle.rs"]
mod oracle;

use glyph_util::json::{parse, Json};
use oracle::{cases, Must};
use std::io::Write;
use std::process::{Command, Stdio};

fn glyph(src: &str) -> std::process::Output {
    let mut child = Command::new(env!("CARGO_BIN_EXE_glyph"))
        .stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped()).spawn().expect("the binary runs");
    child.stdin.take().expect("stdin").write_all(src.as_bytes()).expect("stdin takes the source");
    child.wait_with_output().expect("the binary ends")
}

#[test]
fn the_five_examples_come_out_byte_exact() {
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../conformance/examples.json");
    let examples = parse(&std::fs::read_to_string(&path).expect("conformance/examples.json")).expect("its JSON");
    let list = examples.a("cases");
    assert_eq!(list.len(), 5, "conformance/examples.json holds {} cases", list.len());
    for c in list {
        let out = glyph(c.s("src"));
        assert!(out.status.success() && out.stderr.is_empty(), "{}: {:?}", c.s("id"), String::from_utf8_lossy(&out.stderr));
        assert_eq!(String::from_utf8(out.stdout).expect("UTF-8"), c.s("xml"), "{}: the XML it records", c.s("id"));
    }
}

#[test]
fn all_114_come_out_as_the_oracle() {
    for case in cases() {
        let out = glyph(case.s("src"));
        assert!(out.status.success(), "{}: {:?}", case.s("id"), String::from_utf8_lossy(&out.stderr));
        assert_eq!(String::from_utf8(out.stdout).expect("UTF-8"), case.s("xml"), "{}: the XML", case.s("id"));
    }
    println!("{} sources", cases().len());
}

#[test]
fn a_source_the_js_throws_on_writes_no_xml() {
    let out = glyph("[constructor]");
    assert_eq!(out.status.code(), Some(1));
    assert!(out.stdout.is_empty());
    assert_eq!(String::from_utf8_lossy(&out.stderr), "TypeError: byName[c.canonical].push is not a function\n");
    let _ = Json::Null;
}
