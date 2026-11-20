//! EMS-002 ORD-0035, issue #12: a hole keeps its name through the burn. The
//! head line of its `[ph` carries the name, lowercase as the engine writes a
//! hole's name everywhere (the Regent, 2026-11-20), and the reread asks what
//! the source asks, with no `fix`. The oracle holds the declared sources; this
//! holds the case the corpus does not write, a name in mixed case.

use glyph_burn::{BurnOpts, to_hgml};
use glyph_parse::{Opts, parse};
use glyph_stores::Context;

#[test]
fn a_hole_burns_with_its_name_on_the_head_line_and_rereads_clean() {
    let o = Opts::new(Context::repository());
    let b = BurnOpts {
        parse: &o,
        keep_text: false,
    };
    let h = to_hgml("[ph-MyName`q`]", &b).expect("the burn");
    assert_eq!(
        h.split('\n').collect::<Vec<_>>(),
        ["[ph-myname", "  'q'", "[/ph]"]
    );
    let re = parse(&h, &o).expect("the reread");
    let codes: Vec<(&str, &str)> = re
        .gaps
        .iter()
        .map(|g| (g.sev.as_str(), g.code.as_str()))
        .collect();
    assert_eq!(codes, [("ask", "PlaceholderPending")]);
    assert_eq!(
        to_hgml("[ph-x]", &b).expect("a name alone"),
        "[ph-x[/ph]",
        "a hole of a name alone closes on its head line"
    );
}
