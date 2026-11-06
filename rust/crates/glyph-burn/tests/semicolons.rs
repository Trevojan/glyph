//! O4, residual 1, decided 2026-10-25 and built in the Rust only: the burn
//! writes `;;` between two blocks where `;` writes the blank line, so the
//! `.hgml` carries the line break the tree carries. The JS writes the blank
//! line for both until it leaves; the oracle tests undo this one difference
//! (`known::semicolons`) and hold the rest byte for byte.

use glyph_burn::{to_hgml, BurnOpts};
use glyph_parse::Opts;
use glyph_stores::Context;

fn lines(src: &str) -> Vec<String> {
    let o = Opts::new(Context::repository());
    to_hgml(src, &BurnOpts { parse: &o, keep_text: false }).expect("the burn").split('\n').map(str::to_string).collect()
}

#[test]
fn a_line_break_between_blocks_burns_as_its_own_line() {
    assert_eq!(lines("[nt'a'];;[nt'b']"), ["[nt", "  'a'", "[/nt]", ";;", "[nt", "  'b'", "[/nt]"]);
    assert_eq!(lines("[nt'a'];[nt'b']"), ["[nt", "  'a'", "[/nt]", "", "[nt", "  'b'", "[/nt]"]);
    assert_eq!(lines("[nt'a'];;;;[nt'b']"), ["[nt", "  'a'", "[/nt]", ";;", ";;", "[nt", "  'b'", "[/nt]"]);
}
