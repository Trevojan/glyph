//! The composition store's compiler, held to `read-expansions.js` beyond the
//! repository's own formulas: `depsOf` over every string of up to 256 units the
//! case files hold (`stores.json`), since no formula carries a return token now.

#[path = "../../../testkit/oracle.rs"]
mod oracle;
#[path = "../build/compose.rs"]
mod compose;

use oracle::Must;

#[test]
fn deps_of_equals_the_js() {
    let calls = oracle::module("stores").a("depsOf");
    assert!(!calls.is_empty(), "stores.json: no depsOf calls");
    for c in calls {
        let c = c.arr().unwrap();
        let want: Vec<&str> = c[1].arr().unwrap().iter().map(|d| d.str().unwrap()).collect();
        assert_eq!(compose::deps_of(c[0].str().unwrap()), want, "depsOf({:?})", c[0].str().unwrap());
    }
}
