//! EMS-001 ORD-0002: `VERSION` is the engine every case of the oracle names.

#[path = "../../../testkit/oracle.rs"]
mod oracle;

use oracle::Must;

#[test]
fn version_is_the_engine_the_oracle_names() {
    let cases = oracle::cases();
    assert!(!cases.is_empty(), "the oracle holds no case");
    for case in cases {
        assert_eq!(glyph_version::VERSION, case.s("engine"), "{}", case.s("id"));
    }
    assert_eq!(glyph_version::VERSION, oracle::module("util").s("engine"), "oracle-modules/util.json");
}
