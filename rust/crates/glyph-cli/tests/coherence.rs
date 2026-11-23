//! EMS-002 ORD-0040, the coherence between Orders, in the Rust alone (the
//! Regent's C5 b of 2026-11-21): an Order says where it stands, the claim is
//! read from its AST, the Rust `--bundle` writes it into the manifest as
//! `relates` and refuses one its destination does not answer, and
//! `glyph --check` holds every Order bundled from ORD-0040 on. The trigger is
//! mismatch, not absence (INTAKE-ORDER-COHERENCE.md §5 and §9).

#[path = "../../../testkit/oracle.rs"]
mod oracle;

use oracle::{Json, Must};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Output, Stdio};

/// A folder of its own for one test, emptied first.
fn scratch(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!("glyph-coherence-{name}-{}", std::process::id()));
    let _ = fs::remove_dir_all(&dir);
    fs::create_dir_all(&dir).expect("the scratch folder");
    dir
}

fn glyph(dir: &Path, args: &[&str]) -> Output {
    Command::new(env!("CARGO_BIN_EXE_glyph"))
        .args(args)
        .current_dir(dir)
        .stdin(Stdio::null())
        .env_remove("SOURCE_DATE_EPOCH")
        .output()
        .expect("glyph runs")
}

/// `--bundle` of one source into a folder, the source written beside it.
fn bundle(dir: &Path, out: &str, src: &str) -> Output {
    fs::write(dir.join("src.pgml"), src).expect("the source");
    glyph(dir, &["--file", "src.pgml", "--bundle", "--out", out])
}

fn said(b: &[u8]) -> String {
    String::from_utf8_lossy(b).into_owned()
}

/// A series folder with the configuration the engine bundles with.
fn series(dir: &Path, name: &str, id: &str, engine: &str) {
    fs::create_dir_all(dir.join(name)).expect("the series");
    fs::write(
        dir.join(name).join("EMS.json"),
        format!(
            "{{\"id\":\"{id}\",\"title\":\"t\",\"xsd\":[{{\"kind\":\"block\",\"name\":\"ORD-####-…\"}}],\
             \"engine\":\"{engine}\",\"conventions\":[],\"rules\":[],\"exceptions\":[],\"pins\":[],\
             \"traffic\":{{}},\"invoke\":{{\"skills\":[],\"actions\":[]}}}}\n"
        ),
    )
    .expect("the EMS.json");
}

fn version() -> String {
    let out = glyph(&std::env::temp_dir(), &["[crit'x']", "--xml"]);
    let xml = said(&out.stdout);
    let at = xml.find("engine=\"").expect("the engine") + 8;
    xml[at..at + xml[at..].find('"').expect("its end")].to_string()
}

fn manifest(dir: &Path, path: &str) -> Json {
    oracle::parse(&fs::read_to_string(dir.join(path)).expect("the manifest")).expect("JSON")
}

#[test]
fn a_claim_that_matches_is_written_as_relates() {
    let dir = scratch("matches");
    series(&dir, "EMS-005", "EMS-005", &version());
    let first = bundle(&dir, "EMS-005", "[block'ORD-0001-first' [ref'EMS']]");
    assert_eq!(first.status.code(), Some(0), "{}", said(&first.stderr));
    let m = manifest(&dir, "EMS-005/ORD-0001/ORD-0001.manifest.json");
    let relates = m.get("relates").and_then(Json::arr).expect("relates");
    assert_eq!(relates.len(), 1);
    assert_eq!(relates[0].s("order"), "EMS");
    assert_eq!(relates[0].s("kind"), "reference");
    assert_eq!(relates[0].s("reason"), "");

    let second = bundle(
        &dir,
        "EMS-005",
        "[block'ORD-0002-second' [ovr[ref'ORD-0001'],'it was wrong'] [drvf[ref'ORD-0001']]]",
    );
    assert_eq!(second.status.code(), Some(0), "{}", said(&second.stderr));
    let m = manifest(&dir, "EMS-005/ORD-0002/ORD-0002.manifest.json");
    let relates = m.get("relates").and_then(Json::arr).expect("relates");
    let pairs: Vec<(&str, &str, &str)> = relates
        .iter()
        .map(|r| (r.s("order"), r.s("kind"), r.s("reason")))
        .collect();
    assert_eq!(
        pairs,
        vec![
            ("ORD-0001", "override", "it was wrong"),
            ("ORD-0001", "derive-from", "")
        ]
    );

    let check = glyph(&dir, &["--check", "."]);
    assert_eq!(check.status.code(), Some(0), "{}", said(&check.stdout));
    assert!(
        said(&check.stdout).contains("2 Orders under ., 2 held"),
        "{}",
        said(&check.stdout)
    );
}

#[test]
fn an_order_with_no_claim_is_bundled_as_before_and_asked_by_the_check() {
    let dir = scratch("unclaimed");
    series(&dir, "EMS-005", "EMS-005", &version());
    let out = bundle(&dir, "EMS-005", "[block'ORD-0001-x' [crit'x']]");
    assert_eq!(out.status.code(), Some(0));
    assert_eq!(said(&out.stderr), "");
    let m = manifest(&dir, "EMS-005/ORD-0001/ORD-0001.manifest.json");
    assert!(m.get("relates").is_none(), "no claim, no relates");
    let check = glyph(&dir, &["--check", "."]);
    let text = said(&check.stdout);
    assert_eq!(check.status.code(), Some(0), "an ask is no refusal: {text}");
    assert!(text.contains("ask  EMS-005/ORD-0001  Unclaimed"), "{text}");
}

/// Each mismatch refuses the bundle, writes nothing, and names its code.
#[test]
fn a_claim_its_destination_does_not_answer_is_refused() {
    let v = version();
    let cases: &[(&str, &str, &str, &str)] = &[
        (
            "outside",
            "out",
            "[block'ORD-0001-x' [ref'EMS']]",
            "ClaimEmsOutsideSeries",
        ),
        (
            "unconfigured",
            "EMS-006",
            "[block'ORD-0001-x' [ref'EMS']]",
            "ClaimEmsUnconfigured",
        ),
        (
            "other",
            "EMS-007",
            "[block'ORD-0001-x' [ref'EMS']]",
            "ClaimEmsOtherSeries",
        ),
        (
            "pattern",
            "EMS-005",
            "[block'first' [ref'EMS']]",
            "ClaimEmsPattern",
        ),
        (
            "nem",
            "EMS-005",
            "[block'ORD-0001-x' [ref'nem']]",
            "NemOutsideNem",
        ),
        (
            "absent",
            "EMS-005",
            "[block'ORD-0001-x' [drvf[ref'ORD-0009']]]",
            "RelationToAbsent",
        ),
        (
            "itself",
            "EMS-005",
            "[block'ORD-0001-x' [seeal[ref'ORD-0001']]]",
            "RelationToItself",
        ),
        (
            "elsewhere",
            "EMS-005",
            "[block'ORD-0001-x' [seeal[ref'EMS-001/ORD-0001']]]",
            "RelationOutsideDirectory",
        ),
    ];
    for (name, out, src, code) in cases {
        let dir = scratch(name);
        series(&dir, "EMS-005", "EMS-005", &v);
        series(&dir, "EMS-007", "EMS-008", &v);
        fs::create_dir_all(dir.join("EMS-006")).expect("a series with no EMS.json");
        fs::create_dir_all(dir.join("out")).expect("a flat folder");
        let run = bundle(&dir, out, src);
        let err = said(&run.stderr);
        assert_eq!(run.status.code(), Some(2), "{name}: {err}");
        assert!(err.contains(&format!("[fix] {code} — ")), "{name}: {err}");
        assert!(err.contains("nothing written"), "{name}: {err}");
        let left: Vec<String> = fs::read_dir(dir.join(out))
            .expect("the destination")
            .flatten()
            .map(|e| e.file_name().to_string_lossy().into_owned())
            .filter(|n| n.starts_with("ORD-") || n.starts_with(".ORD-"))
            .collect();
        assert!(left.is_empty(), "{name}: {left:?} written");
    }
}

#[test]
fn a_loose_order_stands_in_nem() {
    let dir = scratch("loose");
    fs::create_dir_all(dir.join("NEM")).expect("NEM");
    let first = bundle(&dir, "NEM", "[block'x' [ref'nem']]");
    assert_eq!(first.status.code(), Some(0), "{}", said(&first.stderr));
    let second = bundle(&dir, "NEM", "[block'y' [drvf[ref'ORD-0001']]]");
    assert_eq!(second.status.code(), Some(0), "{}", said(&second.stderr));
    let check = glyph(&dir, &["--check", "."]);
    let text = said(&check.stdout);
    assert_eq!(check.status.code(), Some(0), "{text}");
    assert!(text.contains("2 Orders under ., 2 held"), "{text}");
}

#[test]
fn the_check_holds_the_engine_and_the_cycle_of_supersession() {
    let dir = scratch("held");
    series(&dir, "EMS-005", "EMS-005", &version());
    assert_eq!(
        bundle(&dir, "EMS-005", "[block'ORD-0001-a' [ref'EMS']]")
            .status
            .code(),
        Some(0)
    );
    assert_eq!(
        bundle(
            &dir,
            "EMS-005",
            "[block'ORD-0002-b' [instof[ref'ORD-0001']]]"
        )
        .status
        .code(),
        Some(0)
    );
    // the first comes to claim it supersedes the second: a cycle
    let ast = glyph(
        &dir,
        &[
            "[block'ORD-0001-a' [ref'EMS'] [ovr[ref'ORD-0002']]]",
            "--ast",
        ],
    );
    fs::write(dir.join("EMS-005/ORD-0001/ORD-0001.json"), &ast.stdout).expect("the AST");
    // and the second says it was bundled with another engine
    let at = dir.join("EMS-005/ORD-0002/ORD-0002.manifest.json");
    let text = fs::read_to_string(&at).expect("the manifest");
    fs::write(&at, text.replace(&version(), "0.0.0.01")).expect("the manifest");

    let check = glyph(&dir, &["--check", "."]);
    let text = said(&check.stdout);
    assert_eq!(check.status.code(), Some(1), "{text}");
    assert!(
        text.contains("fix  EMS-005/ORD-0001  SupersessionCycle — ORD-0001 supersedes itself through ORD-0001 → ORD-0002 → ORD-0001"),
        "{text}"
    );
    assert!(
        text.contains("fix  EMS-005/ORD-0002  SupersessionCycle"),
        "{text}"
    );
    assert!(
        !text.contains("EMS-005/ORD-0002  ClaimEmsEngine"),
        "the engine is the configuration's, which only [ref'EMS'] claims: {text}"
    );
    assert!(text.contains("2 fix, 0 ask"), "{text}");
}

#[test]
fn the_engine_of_a_claim_to_its_series_is_the_configurations() {
    let dir = scratch("engine");
    series(&dir, "EMS-005", "EMS-005", &version());
    assert_eq!(
        bundle(&dir, "EMS-005", "[block'ORD-0001-a' [ref'EMS']]")
            .status
            .code(),
        Some(0)
    );
    let at = dir.join("EMS-005/ORD-0001/ORD-0001.manifest.json");
    let text = fs::read_to_string(&at).expect("the manifest");
    fs::write(&at, text.replace(&version(), "0.0.0.01")).expect("the manifest");
    let check = glyph(&dir, &["--check", "."]);
    let text = said(&check.stdout);
    assert_eq!(check.status.code(), Some(1), "{text}");
    assert!(
        text.contains("fix  EMS-005/ORD-0001  ClaimEmsEngine"),
        "{text}"
    );
}

#[test]
fn the_closed_orders_are_read_as_emitted() {
    let dir = scratch("closed");
    series(&dir, "EMS-005", "EMS-005", &version());
    fs::write(dir.join("src.pgml"), "[block'ORD-0001-a' [crit'x']]").expect("the source");
    let old = Command::new(env!("CARGO_BIN_EXE_glyph"))
        .args(["--file", "src.pgml", "--bundle", "--out", "EMS-005"])
        .current_dir(&dir)
        .env("SOURCE_DATE_EPOCH", "1790386200")
        .output()
        .expect("glyph runs");
    assert_eq!(old.status.code(), Some(0));
    // a claim that held when it was bundled, and an engine changed since
    assert_eq!(
        bundle(&dir, "EMS-005", "[block'ORD-0002-b' [ref'EMS']]")
            .status
            .code(),
        Some(0)
    );
    let at = dir.join("EMS-005/ORD-0002/ORD-0002.manifest.json");
    let text = fs::read_to_string(&at).expect("the manifest");
    let from = text.find("\"emitted\": \"").expect("emitted") + 12;
    let text = format!(
        "{}2026-09-26T01:30:00.000Z{}",
        &text[..from],
        &text[from + 24..]
    );
    fs::write(&at, text.replace(&version(), "0.0.0.01")).expect("the manifest");
    let check = glyph(&dir, &["--check", "."]);
    let text = said(&check.stdout);
    assert_eq!(check.status.code(), Some(0), "{text}");
    assert!(
        !text.contains("Unclaimed"),
        "a closed Order is asked nothing: {text}"
    );
    assert!(text.contains("2 Orders under ., 0 held"), "{text}");
}

#[test]
fn a_zip_bundle_is_read_as_its_folder_is() {
    let dir = scratch("zip");
    fs::create_dir_all(dir.join("NEM")).expect("NEM");
    assert_eq!(
        bundle(&dir, "NEM", "[block'x' [ref'nem'] [ovr[ref'ORD-0002']]]")
            .status
            .code(),
        Some(2),
        "ORD-0002 is not there yet"
    );
    assert_eq!(
        bundle(&dir, "NEM", "[block'x' [ref'nem']]").status.code(),
        Some(0)
    );
    assert!(dir.join("NEM/ORD-0001.zip").is_file());
    fs::rename(dir.join("NEM"), dir.join("EMS-009")).expect("moved into a series");
    let check = glyph(&dir, &["--check", "."]);
    let text = said(&check.stdout);
    assert_eq!(check.status.code(), Some(1), "{text}");
    assert!(
        text.contains("fix  EMS-009/ORD-0001  NemOutsideNem"),
        "{text}"
    );
}

#[test]
fn the_check_wants_a_folder() {
    let dir = scratch("folder");
    let run = glyph(&dir, &["--check", "nowhere"]);
    assert_eq!(run.status.code(), Some(2));
    assert!(
        said(&run.stderr).contains("nowhere"),
        "{}",
        said(&run.stderr)
    );
}
