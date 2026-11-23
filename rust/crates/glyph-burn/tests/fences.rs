//! EMS-002 ORD-0045, the burn of a fence, in the Rust only by the Regent's
//! F3 b of 2026-11-21 (INTAKE-BURN-FENCES.md §5): a raw fence burns as the
//! open fence carrying its body verbatim, and every logic block, named or
//! not, as the open fence carrying its rules, so the reread says what the
//! source said. The JS burn keeps the defect until it leaves, and the nine
//! declared burns that differ are named in `known::FENCES`.

#[path = "../../../testkit/oracle.rs"]
mod oracle;

use glyph_burn::{BurnOpts, to_hgml};
use glyph_parse::{Opts, parse};
use glyph_stores::Context;
use glyph_xml::to_xml;
use oracle::{Must, cases};
use std::collections::BTreeSet;

fn burn(src: &str, ctx: &Context) -> String {
    let o = Opts::new(ctx);
    to_hgml(
        src,
        &BurnOpts {
            parse: &o,
            keep_text: false,
        },
    )
    .expect("the burn")
}

fn fixes(src: &str, ctx: &Context) -> BTreeSet<String> {
    parse(src, &Opts::new(ctx))
        .expect("the parse")
        .gaps
        .iter()
        .filter(|g| g.sev == "fix")
        .map(|g| g.code.to_string())
        .collect()
}

/// The three sources of INTAKE-BURN-FENCES.md §1 and `OC-12`'s unclosed fence.
const DEFECT: &[&str] = &[
    "[raw]\nanything [x] here\n[/raw]",
    "[raw] never closed",
    "[logic-dano]\nhp = 3d6kh2\n[/logic]",
    "[logic]\nx = 1\n[/logic]",
];

#[test]
fn a_fence_and_a_block_reread_to_the_same_document() {
    let ctx = Context::repository();
    let o = Opts::new(ctx);
    for src in DEFECT {
        let h = burn(src, ctx);
        let own = fixes(src, ctx);
        let new: Vec<String> = fixes(&h, ctx).difference(&own).cloned().collect();
        assert!(
            new.is_empty(),
            "{src:?}: the burn {h:?} rereads with {new:?}"
        );
        if *src != "[raw] never closed" {
            assert_eq!(
                to_xml(&h, &o, false).expect("the reread"),
                to_xml(src, &o, false).expect("the source"),
                "{src:?}: the burn {h:?} rereads to another document"
            );
        }
    }
}

#[test]
fn every_declared_burn_rereads_with_no_fix_its_source_lacks() {
    let repo = Context::repository();
    let (mut burns, mut failing) = (0, Vec::new());
    for case in cases() {
        let ctx = repo.with(case.get("stores").unwrap_or(&oracle::Json::Null));
        let h = burn(case.s("src"), &ctx);
        if h.starts_with('#') {
            continue;
        }
        burns += 1;
        let own = fixes(case.s("src"), &ctx);
        if !fixes(&h, &ctx).is_subset(&own) {
            failing.push(case.s("id").to_string());
        }
    }
    assert!(
        failing.is_empty(),
        "{burns} burns, these reread refused: {failing:?}"
    );
    assert_eq!(burns, 116, "the declared burns");
}

#[test]
fn the_undo_reaches_the_nine_it_names_and_no_other() {
    let repo = Context::repository();
    let reached: Vec<String> = cases()
        .iter()
        .filter(|case| {
            let ctx = repo.with(case.get("stores").unwrap_or(&oracle::Json::Null));
            let h = burn(case.s("src"), &ctx);
            oracle::known::fences(&h) != h
        })
        .map(|case| case.s("id").to_string())
        .collect();
    let mut named: Vec<String> = oracle::known::FENCES
        .iter()
        .map(|s| s.to_string())
        .collect();
    named.sort();
    let mut reached = reached;
    reached.sort();
    assert_eq!(reached, named);
}
