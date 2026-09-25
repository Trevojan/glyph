//! EMS-001 ORD-0006: `expand_invocations` and `check_template_constraints`
//! against `trees.json` — every tree the JS parser builds for the 114 sources
//! and the probes, expanded here with `parse` answered by the body parses the
//! JS recorded, in the order it asked for them. The tree after, and every
//! diagnostic in the order raised, equal the JS's; where the JS throws, the
//! port stops at the same pass with the same message.
//!
//! Then the val: the diagnostics of every T-, C- and K-case equal the oracle.
//! Each case's tree, as the JS parser builds it, goes through the three passes
//! the parser runs — expansion, the rules, the constraints — and what they
//! raise, ranked as `parse` ranks its diagnostics and stripped as it strips
//! them, equals what the case file holds from those passes. The rest of a
//! case's diagnostics are the parser's own, and ORD-0007's to match.

#[path = "../../../testkit/oracle.rs"]
mod oracle;

use glyph_rules::check_rules;
use glyph_stores::{Context, Value};
use glyph_templates::*;
use glyph_util::json::Json;
use glyph_util::tree::{strip_tags, Diag, Thrown};
use oracle::{cases, diag_json, diag_of, dump_of, module, tree_of, Must};

fn value(j: &Json) -> Value {
    match j {
        Json::Null => Value::Null,
        Json::Bool(b) => Value::Bool(*b),
        Json::Num(n) => Value::Num(*n),
        Json::Str(s) => Value::Str(s.clone()),
        Json::Arr(a) => Value::Arr(a.iter().map(value).collect()),
        Json::Obj(kv) => Value::Obj(kv.iter().map(|(k, v)| (k.clone(), value(v))).collect()),
    }
}

/// The context of a run: the repository's templates, with the probe templates
/// over them for a probe (`{ ...TPL.templates, ...PROBE_TEMPLATES }`), and the
/// repository's rules unless the run has none.
fn context(trees: &Json, run: &Json) -> Context {
    let repo = Context::repository();
    let mut map = match &repo.templates {
        Value::Obj(kv) => kv.clone(),
        v => panic!("the repository's templates are not a map: {v:?}"),
    };
    if run.get("probe") == Some(&Json::Bool(true)) {
        for (k, v) in trees.get("probeTemplates").and_then(Json::obj).expect("the probe templates") {
            match map.iter_mut().find(|(x, _)| x == k) {
                Some(slot) => slot.1 = value(v),
                None => map.push((k.clone(), value(v))),
            }
        }
    }
    let rules = if run.get("withRules") == Some(&Json::Bool(true)) { repo.rules.clone() } else { None };
    Context::new(Some(Value::Obj(map)), rules, repo.expansions.clone())
}

fn thrown_at(run: &Json, stage: &str) -> Option<Thrown> {
    run.get("thrown").filter(|t| t.s("stage") == stage).map(|t| Thrown(t.s("message").to_string()))
}

#[derive(Default)]
struct Count {
    levels: usize,
    expanded: usize,
    raised: usize,
}

/// One level of expansion, held to the JS's: the tree the parser has built,
/// expanded with each body parse answered by the level below — itself
/// expanded here, with the chain the JS had — and the parser's diagnostics of
/// that body as the JS recorded them. What it raises, what it throws, and the
/// tree after equal the JS's; the tree goes up as the body's parse, with what
/// the level raised.
fn level(p: &Json, ctx: &Context, expanding: &[String], id: &str, n: &mut Count)
         -> (glyph_util::tree::Tree<()>, Result<(), Thrown>, Vec<Diag>) {
    let mut tree = tree_of(p.get("before").expect("before"));
    let mut asked = p.a("parses").iter();
    let mut raised = Vec::new();
    let result = expand_invocations(&mut tree, ctx, true, expanding, &mut |d| raised.push(d), &mut |body, sub| {
        let q = asked.next().unwrap_or_else(|| panic!("{id}: a parse the JS did not ask for: {body:?}"));
        assert_eq!(body, q.s("body"), "{id}: the body handed to parse");
        let chain: Vec<&str> = q.a("expanding").iter().map(|x| x.str().expect("a name")).collect();
        assert_eq!(sub.expanding, chain, "{id}: the templates being expanded");
        assert!(!sub.valency && sub.session, "{id}: what parse is told");
        let (tree, r, _) = level(q, &Context::new(Some(sub.templates.clone()), None, None), &sub.expanding, id, n);
        r?;
        Ok(Parsed { tree, gaps: q.a("gaps").iter().map(diag_of).collect() })
    });
    assert!(asked.next().is_none(), "{id}: the JS asked for a parse the port did not");
    assert_eq!(result.clone().err(), thrown_at(p, "expand"), "{id} {expanding:?}: what expansion throws");
    assert_eq!(Json::Arr(raised.iter().map(diag_json).collect()), Json::Arr(p.a("expand").to_vec()),
               "{id} {expanding:?}: what expansion raises");
    assert_eq!(dump_of(&tree, false), *p.get("after").expect("after"), "{id} {expanding:?}: the tree after expansion");
    n.levels += 1;
    n.expanded += tree.nodes.iter().filter(|nd| nd.expanded == Some(true)).count();
    n.raised += p.a("expand").len();
    (tree, result, raised)
}

#[test]
fn every_expansion_and_constraint_equals_the_js() {
    let trees = module("trees");
    let runs = trees.a("runs");
    assert!(runs.len() > 114, "trees.json holds {} runs — write it again: {}", runs.len(), oracle::WRITE_IT);
    let mut n = Count::default();
    for run in runs {
        let id = run.s("id");
        let ctx = context(trees, run);
        let (tree, _, _) = level(run, &ctx, &[], id, &mut n);

        let Some(want) = run.get("constraints") else { continue };
        let mut got = Vec::new();
        let result = check_template_constraints(&tree, &ctx, &mut |d| got.push(diag_json(&d)));
        assert_eq!(result.err(), thrown_at(run, "constraints"), "{id}: what the constraints throw");
        assert_eq!(Json::Arr(got), *want, "{id}: what the constraints raise");
        n.raised += want.arr().expect("a list").len();
    }
    println!("{} runs, {} levels of expansion, {} invocations expanded, {} diagnostics", runs.len(), n.levels, n.expanded, n.raised);
}

#[test]
fn every_dump_reads_back_to_itself() {
    fn each(p: &Json, id: &str, n: &mut usize) {
        for k in ["before", "after"] {
            let d = p.get(k).unwrap_or_else(|| panic!("{id}: no {k}"));
            assert_eq!(dump_of(&tree_of(d), false), *d, "{id}: a dump the tree does not hold");
            *n += 1;
        }
        p.a("parses").iter().for_each(|q| each(q, id, n));
    }
    let mut n = 0;
    for run in module("trees").a("runs") {
        each(run, run.s("id"), &mut n);
    }
    assert!(n > 0, "no dump in trees.json — write it: {}", oracle::WRITE_IT);
}

/// Raised by `templates.js` or `rules.js`: their codes, and a body's syntax
/// error, which the expander raises again under the invocation.
fn from_these_passes(d: &Json) -> bool {
    let code = d.s("code");
    ["TemplateCycle", "TemplateParamNotLiteral", "TemplateConstraint:", "Rule:"].iter().any(|p| code.starts_with(p))
        || d.s("plain").starts_with("no corpo de [--")
}

#[test]
fn the_diagnostics_of_every_t_c_and_k_case_equal_the_oracle() {
    let trees = module("trees");
    let (mut n, mut matched) = (0, 0);
    for case in cases().iter().filter(|c| ["T-", "C-", "K-"].iter().any(|p| c.s("id").starts_with(p))) {
        let id = case.s("id");
        let run = trees.a("runs").iter().find(|r| r.s("id") == id).unwrap_or_else(|| panic!("{id} has no run in trees.json"));
        let ctx = context(trees, run);
        let (tree, r, mut raised) = level(run, &ctx, &[], id, &mut Count::default());
        r.unwrap_or_else(|e| panic!("{id}: {e:?}"));
        check_rules(&tree, &ctx, &mut |d| raised.push(d)).unwrap_or_else(|e| panic!("{id}: {e:?}"));
        check_template_constraints(&tree, &ctx, &mut |d| raised.push(d)).unwrap_or_else(|e| panic!("{id}: {e:?}"));

        /* `parse` sorts its diagnostics by severity, stably, and strips each */
        let rank = |d: &Diag| ["fix", "ask", "note"].iter().position(|s| *s == d.sev).expect("a severity");
        raised.sort_by_key(rank);
        let got: Vec<Json> = raised.iter().map(|d| Json::Obj(vec![
            ("sev".into(), Json::Str(d.sev.clone())), ("code".into(), Json::Str(d.code.clone())),
            ("plain".into(), Json::Str(strip_tags(&d.msg)))])).collect();
        let want: Vec<Json> = case.a("diagnostics").iter().filter(|d| from_these_passes(d)).cloned().collect();
        assert_eq!(got, want, "{id}: the diagnostics of templates and rules");
        n += 1;
        matched += got.len();
    }
    assert_eq!(n, 36, "the oracle holds {n} T-, C- and K-cases");
    println!("{n} cases, {matched} diagnostics of templates and rules, of {} in all",
             cases().iter().filter(|c| ["T-", "C-", "K-"].iter().any(|p| c.s("id").starts_with(p)))
                 .map(|c| c.a("diagnostics").len()).sum::<usize>());
}
