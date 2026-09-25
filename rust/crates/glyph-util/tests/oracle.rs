//! EMS-001 ORD-0002: each function equals its JS on every string the oracle
//! holds. The JS answers are `rust/target/oracle-modules/util.json`, written by
//! the export over the case files; `xesc` is `esc` in the JS, so both answer to
//! the same list.

#[path = "../../../testkit/oracle.rs"]
mod oracle;

use glyph_util::{esc, lev, walk, xesc, Children};
use oracle::{Json, Must};
use std::collections::{BTreeSet, HashMap};

fn util() -> &'static Json {
    oracle::module("util")
}

#[test]
fn the_answers_cover_every_string_the_case_files_hold() {
    let mut held = Vec::new();
    oracle::cases().iter().for_each(|c| c.strings(&mut held));
    let held: BTreeSet<&str> = held.into_iter().collect();
    let answered: BTreeSet<&str> = util().a("strings").iter().filter_map(Json::str).collect();
    assert!(!held.is_empty(), "the case files hold no string");
    assert!(held == answered, "{} strings held, {} answered, {} held and not answered",
            held.len(), answered.len(), held.difference(&answered).count());
}

#[test]
fn esc_and_xesc_equal_the_js() {
    let (strings, answers) = (util().a("strings"), util().a("esc"));
    assert!(!strings.is_empty() && strings.len() == answers.len(), "util.json: strings and esc disagree");
    let bad: Vec<&str> = strings.iter().zip(answers)
        .map(|(s, a)| (s.str().unwrap(), a.str().unwrap()))
        .filter(|(s, a)| esc(s) != *a || xesc(s) != *a)
        .map(|(s, _)| s)
        .collect();
    assert!(bad.is_empty(), "{} of {} strings differ from the JS; the first: {:?}",
            bad.len(), strings.len(), bad.first().map(|s| s.chars().take(80).collect::<String>()));
}

#[test]
fn lev_equals_the_js() {
    let (strings, pairs) = (util().a("strings"), util().a("lev"));
    assert!(!pairs.is_empty(), "util.json: no lev pairs");
    for p in pairs {
        let p = p.arr().unwrap();
        let s = strings[p[0].num().unwrap() as usize].str().unwrap();
        let t = p[1].str().unwrap();
        let (st, ts) = (p[2].num().unwrap() as usize, p[3].num().unwrap() as usize);
        let head: String = s.chars().take(40).collect();
        assert_eq!(lev(s, t), st, "lev({head:?}…, {t:?})");
        assert_eq!(lev(t, s), ts, "lev({t:?}, {head:?}…)");
    }
}

/// A segment's tree as the shape it has: the envelope names children `body`.
struct Shape {
    at: String,
    children: Vec<Shape>,
}

impl Children for Shape {
    fn children(&self) -> &[Shape] {
        &self.children
    }
}

fn shape(nd: &Json, at: String) -> Shape {
    let body = nd.get("body").and_then(Json::arr).unwrap_or(&[]);
    Shape { children: body.iter().enumerate().map(|(i, ch)| shape(ch, format!("{at}/{i}"))).collect(), at }
}

#[test]
fn walk_visits_as_the_js() {
    let answers: HashMap<&str, Vec<&str>> = util().a("walk").iter()
        .map(|w| w.arr().unwrap())
        .map(|w| (w[0].str().unwrap(), w[1].arr().unwrap().iter().filter_map(Json::str).collect()))
        .collect();
    assert!(!answers.is_empty(), "util.json: no walks");
    let mut walked = 0;
    for case in oracle::cases() {
        let Some(segments) = case.get("ast").and_then(|a| a.get("segments")).and_then(Json::arr) else { continue };
        for (k, sg) in segments.iter().enumerate() {
            let body = sg.get("body").and_then(Json::arr).unwrap_or(&[]);
            let roots: Vec<Shape> = body.iter().enumerate().map(|(i, nd)| shape(nd, i.to_string())).collect();
            let mut seen = Vec::new();
            walk(&roots, |nd| seen.push(nd.at.as_str()));
            let key = format!("{}#{k}", case.s("id"));
            assert_eq!(Some(&seen), answers.get(key.as_str()), "{key}");
            walked += 1;
        }
    }
    assert_eq!(walked, answers.len(), "trees walked here and trees the JS walked");
}
