//! EMS-002 ORD-0013: a context made from loaded stores holds the same ones,
//! as the JS hands the same object on.

use glyph_json::Json;
use glyph_stores::{Context, Registered};
use std::sync::Arc;

#[test]
fn a_context_made_from_loaded_stores_holds_them_and_copies_none() {
    let repo = Context::repository();
    let held = |rules: Option<&Arc<Json>>, expansions: Option<&Arc<Json>>| {
        Arc::ptr_eq(rules.expect("rules"), repo.rules.as_ref().expect("the repository's rules"))
            && Arc::ptr_eq(expansions.expect("expansions"), repo.expansions.as_ref().expect("the repository's expansions"))
    };
    let made = Context::shared(Some(Arc::clone(&repo.templates)), repo.rules.clone(), repo.expansions.clone());
    assert!(Arc::ptr_eq(&made.templates, &repo.templates) && held(made.rules.as_ref(), made.expansions.as_ref()), "shared copied a store");
    let laid = repo.with(&Json::Obj(Vec::new()));
    assert!(Arc::ptr_eq(&laid.templates, &repo.templates) && held(laid.rules.as_ref(), laid.expansions.as_ref()),
            "with copied a store it does not replace");
    let reg = Registered::repository();
    assert!(held(reg.rules.as_ref(), reg.expansions.as_ref()), "the registered stores are copies of the repository's");
}
