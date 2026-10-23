//! EMS-002 ORD-0013: a store compiles once. A template body and a composite
//! in the burn reach the stores the caller loaded, so the rules the repository
//! loads compile once in the process, whatever the calls ask. A test binary of
//! its own, with one test, because the count is the process's.

use glyph_burn::{to_hgml, BurnOpts};
use glyph_parse::{parse, Opts};
use glyph_rules::compilations;
use glyph_stores::{Context, Registered};

#[test]
fn the_repository_rules_compile_once_whatever_the_calls_ask() {
    let mut o = Opts::new(Context::repository());
    o.registered = Registered::repository();
    let b = BurnOpts { parse: &o, keep_text: false };
    /* two template bodies, the composites the burn opens, and a rule that fires */
    let src = "[--germinate'a','b'][--reinforce'r','w'][crit'x'][rev[dist'y']]";
    parse(src, &o).unwrap();
    assert_eq!(compilations(), 1, "the first parse compiles the repository's rules, and its bodies compile nothing");
    for _ in 0..3 {
        parse(src, &o).unwrap();
        to_hgml(src, &b).unwrap();
    }
    assert_eq!(compilations(), 1, "a later call compiled a store again");
}
