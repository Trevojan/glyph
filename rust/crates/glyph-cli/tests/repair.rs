//! EMS-002 ORD-0042, `glyph --repair`: the queue of what `glyph --check`
//! finds, one `REPAIR.json` per folder with findings, a destination proposed
//! for each Order, and one Order moved or removed at a time, warned and
//! written only with `--yes` (INTAKE-ORDER-COHERENCE.md §12, RP-1 to RP-4).

#[path = "../../../testkit/oracle.rs"]
mod oracle;

use oracle::{Json, Must};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Output, Stdio};

fn scratch(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!("glyph-repair-{name}-{}", std::process::id()));
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

fn bundle(dir: &Path, out: &str, src: &str) {
    fs::write(dir.join("src.pgml"), src).expect("the source");
    let run = glyph(dir, &["--file", "src.pgml", "--bundle", "--out", out]);
    assert_eq!(run.status.code(), Some(0), "{}", said(&run.stderr));
}

fn said(b: &[u8]) -> String {
    String::from_utf8_lossy(b).into_owned()
}

fn version() -> String {
    let xml = said(&glyph(&std::env::temp_dir(), &["--version"]).stdout);
    xml.trim().to_string()
}

fn series(dir: &Path, name: &str, id: &str, xsd: &str) {
    fs::create_dir_all(dir.join(name)).expect("the series");
    fs::write(
        dir.join(name).join("EMS.json"),
        format!(
            "{{\"id\":\"{id}\",\"title\":\"t\",\"xsd\":[{xsd}],\"engine\":\"{}\",\"conventions\":[],\
             \"rules\":[],\"exceptions\":[],\"pins\":[],\"traffic\":{{}},\"invoke\":{{\"skills\":[],\"actions\":[]}}}}\n",
            version()
        ),
    )
    .expect("the EMS.json");
}

const BLOCK: &str = "{\"kind\":\"block\",\"name\":\"ORD-####-…\"}";

/// A loose Order bundled into `NEM/`, then carried into a series by hand.
fn misplaced(dir: &Path) {
    series(dir, "EMS-005", "EMS-005", BLOCK);
    fs::create_dir_all(dir.join("NEM")).expect("NEM");
    bundle(dir, "NEM", "[block'x' [ref'nem']]");
    fs::rename(
        dir.join("NEM/ORD-0001.zip"),
        dir.join("EMS-005/ORD-0001.zip"),
    )
    .expect("carried");
}

fn queue(dir: &Path, at: &str) -> Json {
    oracle::parse(&fs::read_to_string(dir.join(at)).expect("the queue")).expect("JSON")
}

#[test]
fn the_queue_is_written_beside_the_configuration_with_a_destination() {
    let dir = scratch("queue");
    misplaced(&dir);
    let run = glyph(&dir, &["--repair", "."]);
    let out = said(&run.stdout);
    assert_eq!(run.status.code(), Some(1), "{out}");
    assert!(out.contains("EMS-005/ORD-0001  NemOutsideNem — "), "{out}");
    assert!(
        out.contains("proposes NEM: glyph --repair . --apply EMS-005/ORD-0001 "),
        "{out}"
    );
    let q = queue(&dir, "EMS-005/REPAIR.json");
    let orders = q.a("orders");
    assert_eq!(orders.len(), 1);
    assert_eq!(orders[0].s("order"), "ORD-0001");
    assert_eq!(orders[0].s("proposes"), "NEM");
    assert_eq!(orders[0].a("findings")[0].s("code"), "NemOutsideNem");
}

#[test]
fn nothing_is_written_without_yes() {
    let dir = scratch("unconfirmed");
    misplaced(&dir);
    let run = glyph(&dir, &["--repair", ".", "--apply", "EMS-005/ORD-0001"]);
    let out = said(&run.stdout);
    assert_eq!(run.status.code(), Some(0), "{}", said(&run.stderr));
    assert!(
        out.contains("moves EMS-005/ORD-0001 to NEM/ORD-0001, adapted to it"),
        "{out}"
    );
    assert!(
        out.contains("nothing written: run again with --yes to confirm."),
        "{out}"
    );
    assert!(dir.join("EMS-005/ORD-0001.zip").is_file());
    assert_eq!(fs::read_dir(dir.join("NEM")).expect("NEM").count(), 0);
}

#[test]
fn a_move_bundles_the_order_where_it_lands_and_removes_it_where_it_was() {
    let dir = scratch("moved");
    misplaced(&dir);
    fs::remove_dir(dir.join("NEM")).expect("NEM is made by the first loose Order");
    let run = glyph(
        &dir,
        &["--repair", ".", "--apply", "EMS-005/ORD-0001", "--yes"],
    );
    assert_eq!(run.status.code(), Some(0), "{}", said(&run.stderr));
    assert!(
        dir.join("NEM/ORD-0001.zip").is_file(),
        "{}",
        said(&run.stdout)
    );
    assert!(!dir.join("EMS-005/ORD-0001.zip").exists());
    assert!(
        !dir.join("EMS-005/REPAIR.json").exists(),
        "the queue is empty"
    );
    let check = glyph(&dir, &["--check", "."]);
    assert_eq!(check.status.code(), Some(0), "{}", said(&check.stdout));
}

#[test]
fn an_order_moves_to_the_series_its_configuration_names_and_takes_its_number() {
    let dir = scratch("other");
    series(&dir, "EMS-005", "EMS-005", BLOCK);
    series(&dir, "EMS-007", "EMS-007", BLOCK);
    bundle(&dir, "EMS-007", "[block'ORD-0001-there' [ref'EMS']]");
    bundle(&dir, "EMS-005", "[block'ORD-0001-here' [ref'EMS']]");
    let cfg = fs::read_to_string(dir.join("EMS-005/EMS.json")).expect("it");
    fs::write(
        dir.join("EMS-005/EMS.json"),
        cfg.replace("\"EMS-005\"", "\"EMS-007\""),
    )
    .expect("it");
    let list = glyph(&dir, &["--repair", "."]);
    assert!(
        said(&list.stdout).contains("proposes EMS-007"),
        "{}",
        said(&list.stdout)
    );
    let run = glyph(
        &dir,
        &["--repair", ".", "--apply", "EMS-005/ORD-0001", "--yes"],
    );
    let out = said(&run.stdout);
    assert_eq!(run.status.code(), Some(0), "{}", said(&run.stderr));
    assert!(
        out.contains("  - [block'ORD-0001-here' [ref'EMS']]"),
        "{out}"
    );
    assert!(
        out.contains("  + [block'ORD-0002-here' [ref'EMS']]"),
        "{out}"
    );
    let src = fs::read_to_string(dir.join("EMS-007/ORD-0002/ORD-0002.pgml")).expect("moved");
    assert_eq!(src, "[block'ORD-0002-here' [ref'EMS']]");
    assert!(!dir.join("EMS-005/ORD-0001").exists());
}

#[test]
fn a_block_the_series_does_not_declare_is_renamed_in_place() {
    let dir = scratch("pattern");
    series(&dir, "EMS-005", "EMS-005", "");
    bundle(&dir, "EMS-005", "[block'first' [ref'EMS']]");
    series(&dir, "EMS-005", "EMS-005", BLOCK);
    let list = glyph(&dir, &["--repair", "."]);
    let out = said(&list.stdout);
    assert!(out.contains("ClaimEmsPattern"), "{out}");
    assert!(out.contains("proposes EMS-005"), "{out}");
    let run = glyph(
        &dir,
        &["--repair", ".", "--apply", "EMS-005/ORD-0001", "--yes"],
    );
    assert_eq!(run.status.code(), Some(0), "{}", said(&run.stderr));
    let src = fs::read_to_string(dir.join("EMS-005/ORD-0002/ORD-0002.pgml")).expect("re-bundled");
    assert_eq!(src, "[block'ORD-0002-first' [ref'EMS']]");
    assert!(!dir.join("EMS-005/ORD-0001").exists());
    assert_eq!(glyph(&dir, &["--check", "."]).status.code(), Some(0));
}

#[test]
fn an_order_is_removed_on_confirmation() {
    let dir = scratch("removed");
    misplaced(&dir);
    let ask = glyph(
        &dir,
        &["--repair", ".", "--apply", "EMS-005/ORD-0001", "--remove"],
    );
    assert!(said(&ask.stdout).contains("removes EMS-005/ORD-0001: EMS-005/ORD-0001.zip"));
    assert!(dir.join("EMS-005/ORD-0001.zip").is_file());
    let run = glyph(
        &dir,
        &[
            "--repair",
            ".",
            "--apply",
            "EMS-005/ORD-0001",
            "--remove",
            "--yes",
        ],
    );
    assert_eq!(run.status.code(), Some(0), "{}", said(&run.stderr));
    assert!(!dir.join("EMS-005/ORD-0001.zip").exists());
    assert!(!dir.join("EMS-005/REPAIR.json").exists());
}

#[test]
fn a_move_the_destination_refuses_leaves_the_order_where_it_was() {
    let dir = scratch("refused");
    misplaced(&dir);
    series(&dir, "EMS-006", "EMS-006", BLOCK);
    let cfg = fs::read_to_string(dir.join("EMS-006/EMS.json")).expect("it");
    fs::write(
        dir.join("EMS-006/EMS.json"),
        cfg.replace(&version(), "0.0.0.01"),
    )
    .expect("it");
    let run = glyph(
        &dir,
        &[
            "--repair",
            ".",
            "--apply",
            "EMS-005/ORD-0001",
            "--to",
            "EMS-006",
            "--yes",
        ],
    );
    let err = said(&run.stderr);
    assert_eq!(run.status.code(), Some(2), "{err}");
    assert!(
        err.contains("EMS.json bundles with engine 0.0.0.01"),
        "{err}"
    );
    assert!(
        err.contains("the move stopped: EMS-005/ORD-0001 is where it was."),
        "{err}"
    );
    assert!(dir.join("EMS-005/ORD-0001.zip").is_file());
    assert!(!dir.join("EMS-006/ORD-0001").exists());
}

#[test]
fn an_empty_queue_says_so_and_leaves_no_file() {
    let dir = scratch("empty");
    series(&dir, "EMS-005", "EMS-005", BLOCK);
    bundle(&dir, "EMS-005", "[block'ORD-0001-a' [ref'EMS']]");
    fs::write(dir.join("EMS-005/REPAIR.json"), "{}").expect("a stale queue");
    let run = glyph(&dir, &["--repair", "."]);
    assert_eq!(run.status.code(), Some(0));
    assert!(said(&run.stdout).contains("the queue under . is empty"));
    assert!(!dir.join("EMS-005/REPAIR.json").exists());
    let none = glyph(&dir, &["--repair", ".", "--apply", "EMS-005/ORD-0009"]);
    assert_eq!(none.status.code(), Some(2));
    assert!(said(&none.stderr).contains("is not in the repair queue"));
}

/// RP-1 b: the bundle refuses a claim that does not match, and offers the
/// repair: `--repair` shows the source adapted to the proposed destination,
/// and `--yes` bundles it there.
#[test]
fn a_refused_bundle_offers_the_repair() {
    let dir = scratch("offer");
    series(&dir, "EMS-005", "EMS-005", BLOCK);
    fs::write(dir.join("src.pgml"), "[block'x' [ref'nem']]").expect("the source");
    let args = ["--file", "src.pgml", "--bundle", "--out", "EMS-005"];
    let refused = glyph(&dir, &args);
    let err = said(&refused.stderr);
    assert_eq!(refused.status.code(), Some(2), "{err}");
    assert!(err.contains("[fix] NemOutsideNem"), "{err}");
    assert!(
        err.contains(
            "repair: run again with --repair to bundle it into NEM instead, adapted to it."
        ),
        "{err}"
    );
    let shown = glyph(&dir, &[&args[..], &["--repair"]].concat());
    let out = said(&shown.stdout);
    assert_eq!(shown.status.code(), Some(0), "{}", said(&shown.stderr));
    assert!(
        out.contains("bundles it into NEM/ORD-0001 instead, adapted to it."),
        "{out}"
    );
    assert!(
        out.contains("nothing written: run again with --yes to confirm."),
        "{out}"
    );
    assert!(!dir.join("NEM").exists());
    let done = glyph(&dir, &[&args[..], &["--repair", "--yes"]].concat());
    assert_eq!(done.status.code(), Some(0), "{}", said(&done.stderr));
    assert!(
        dir.join("NEM/ORD-0001.zip").is_file(),
        "NEM is made by the first loose Order"
    );
    assert!(
        fs::read_dir(dir.join("EMS-005")).expect("it").all(|e| !e
            .expect("an entry")
            .file_name()
            .to_string_lossy()
            .starts_with("ORD-")),
        "nothing written in the series"
    );
}
