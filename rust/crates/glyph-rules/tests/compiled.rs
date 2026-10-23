//! EMS-002 ORD-0013: `compiled_of` keys the compiled rules by the store
//! itself, as the JS `WeakMap` does.

use glyph_rules::compiled_of;
use glyph_stores::Context;
use std::sync::Arc;

#[test]
fn the_same_store_answers_the_same_compiled_rules_and_a_copy_its_own() {
    let store = Context::repository().rules.clone().expect("the repository's rules");
    let first = compiled_of(&store);
    assert!(Arc::ptr_eq(&first, &compiled_of(&store)), "the same store compiled twice");
    let copy = Arc::new((*store).clone());
    assert!(!Arc::ptr_eq(&first, &compiled_of(&copy)), "a store equal in content is another store, as a WeakMap key is");
}
