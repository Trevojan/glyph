//! The gate in the Rust's `fromXML` (EMS-002 ORD-0037): a schema and a
//! content that disagree are refused by name, as the JS refuses them.

use glyph_inverse::{check_schema, from_xml};

const XML: &str = "<glyph-package engine=\"x\">\n  <schema>\n    <declares kind=\"section\" name=\"a\"/>\n    <declares kind=\"binding\" name=\"get_data\" on=\"variable\"/>\n  </schema>\n  <block once=\"true\">\n    <section name=\"a\" binds=\"a\">\n      <rework/>\n    </section>\n    <variable binds=\"get_data\">\n      <user-input>get_data</user-input>\n    </variable>\n  </block>\n</glyph-package>";

fn codes(xml: &str) -> Vec<&'static str> {
    from_xml(xml)
        .expect("read")
        .diag
        .iter()
        .map(|d| d.code)
        .collect()
}

#[test]
fn the_engines_own_shape_passes() {
    assert!(check_schema(XML).is_empty());
}

#[test]
fn a_declaration_left_out_is_refused() {
    let dropped = XML.replace("\n    <declares kind=\"section\" name=\"a\"/>", "");
    assert_ne!(dropped, XML);
    assert!(codes(&dropped).contains(&"SchemaUndeclared"));
}

#[test]
fn a_declaration_the_content_lacks_is_refused() {
    let added = XML.replace(
        "<schema>",
        "<schema>\n    <declares kind=\"part\" name=\"ghost\"/>",
    );
    assert!(codes(&added).contains(&"SchemaDeclaresAbsent"));
}

#[test]
fn an_empty_schema_before_the_gate_is_noted() {
    let start = XML.find("<schema>").unwrap();
    let end = XML.find("</schema>").unwrap() + "</schema>".len();
    let before = format!("{}<schema/>{}", &XML[..start], &XML[end..]);
    let d = check_schema(&before);
    assert_eq!(d.len(), 1);
    assert_eq!((d[0].sev, d[0].code), ("note", "SchemaBeforeGate"));
}

#[test]
fn no_schema_is_refused() {
    let start = XML.find("  <schema>").unwrap();
    let end = XML.find("</schema>\n").unwrap() + "</schema>\n".len();
    let none = format!("{}{}", &XML[..start], &XML[end..]);
    assert!(codes(&none).contains(&"SchemaMissing"));
}
