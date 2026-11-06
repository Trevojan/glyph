//! A mood whose innermost open command is a template, decided 2026-10-25 for
//! the Rust only: the JS throws until it leaves, and the Rust answers the
//! document — the mood colours the segment, first in its block. The oracle
//! tests name the four sources (`known::template_mood`).

use glyph_parse::Opts;
use glyph_stores::Context;
use glyph_xml::to_xml;

#[test]
fn a_mood_inside_a_template_colours_the_segment() {
    let o = Opts::new(Context::repository());
    for src in ["[--t=/eth/]", "[--zz/eth/]", "[--reinforce'a''b'/eth/]", "[--t=[ctx'x']/eth/]"] {
        let xml = to_xml(src, &o, false).unwrap_or_else(|e| panic!("{src}: {e:?}"));
        assert!(xml.contains("  <block once=\"true\">\n    <mood dominant=\"enthusiasm\"/>\n"), "{src}: {xml}");
    }
}
