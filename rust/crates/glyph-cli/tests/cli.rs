//! EMS-001 ORD-0012, flag parity: every run `cli.json` records — the command
//! line of `glyph-cli.js`, in a folder of its own, with SOURCE_DATE_EPOCH set
//! where the run set it — answers the same stdout and exit through `glyph`,
//! the same stderr where the JS wrote its own words, and leaves the folder
//! holding the same files, byte for byte.

#[path = "../../../testkit/oracle.rs"]
mod oracle;

use oracle::{module, Json, Must};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

fn base64(s: &str) -> Vec<u8> {
    let val = |c: u8| match c {
        b'A'..=b'Z' => c - b'A',
        b'a'..=b'z' => c - b'a' + 26,
        b'0'..=b'9' => c - b'0' + 52,
        b'+' => 62,
        _ => 63,
    };
    let bytes: Vec<u8> = s.bytes().filter(|&c| c != b'=').map(val).collect();
    bytes
        .chunks(4)
        .flat_map(|q| {
            let n = q.iter().enumerate().fold(0u32, |n, (i, &v)| n | (v as u32) << (18 - 6 * i));
            [(n >> 16) as u8, (n >> 8) as u8, n as u8].into_iter().take(q.len() - 1)
        })
        .collect()
}

/// The folder as the recorder lists it: sorted by name, a folder as `path/`.
fn tree(dir: &Path, rel: &str, out: &mut Vec<(String, Option<Vec<u8>>)>) {
    let mut names: Vec<_> = fs::read_dir(dir).expect("the folder reads").map(|e| e.expect("an entry")).collect();
    names.sort_by_key(|e| e.file_name());
    for e in names {
        let name = format!("{rel}{}", e.file_name().to_string_lossy());
        if e.file_type().expect("its type").is_dir() {
            out.push((format!("{name}/"), None));
            tree(&e.path(), &format!("{name}/"), out);
        } else {
            out.push((name, Some(fs::read(e.path()).expect("the file reads"))));
        }
    }
}

#[test]
fn every_recorded_run_answers_the_same_bytes() {
    let cases = module("cli").a("cases");
    let root: PathBuf = std::env::temp_dir().join(format!("glyph-cli-parity-{}", std::process::id()));
    let _ = fs::remove_dir_all(&root);
    let (mut runs, mut failures) = (0, Vec::new());
    for (n, c) in cases.iter().enumerate() {
        let dir = root.join(n.to_string());
        fs::create_dir_all(&dir).expect("the case folder");
        let fixture = c.get("fixture").expect("a fixture");
        for d in fixture.get("dirs").and_then(Json::arr).unwrap_or(&[]) {
            fs::create_dir_all(dir.join(d.str().expect("a folder name"))).expect("the fixture folder");
        }
        if let Some(Json::Obj(files)) = fixture.get("files") {
            for (name, text) in files {
                fs::write(dir.join(name), text.str().expect("the file's text")).expect("the fixture file");
            }
        }
        let loose = c.get("loose") == Some(&Json::Bool(true));
        for r in c.a("runs") {
            runs += 1;
            let args: Vec<&str> = r.a("args").iter().map(|a| a.str().expect("an argument")).collect();
            let mut cmd = Command::new(env!("CARGO_BIN_EXE_glyph"));
            cmd.args(&args).current_dir(&dir).stdin(Stdio::null()).env_remove("SOURCE_DATE_EPOCH");
            if let Some(e) = r.get("env").and_then(|e| e.get("SOURCE_DATE_EPOCH")).and_then(Json::str) {
                cmd.env("SOURCE_DATE_EPOCH", e);
            }
            let out = cmd.output().expect("glyph runs");
            let said = |b: &[u8]| String::from_utf8_lossy(b).into_owned();
            let at = format!("case {n} {:?}", args.iter().map(|a| a.get(..a.len().min(40)).unwrap_or(a)).collect::<Vec<_>>());
            let exit = r.get("exit").and_then(Json::num).expect("an exit") as i32;
            let thrown = r.get("thrown").and_then(Json::str).is_some();
            if out.status.code() != Some(exit) {
                failures.push(format!("{at}: exit {:?}, the JS {exit} — {}", out.status.code(), said(&out.stderr).trim()));
            } else if said(&out.stdout) != r.s("stdout") {
                failures.push(format!("{at}: stdout {:?}, the JS {:?}",
                    said(&out.stdout).chars().take(120).collect::<String>(), r.s("stdout").chars().take(120).collect::<String>()));
            } else if !loose && !thrown && said(&out.stderr) != r.s("stderr") {
                failures.push(format!("{at}: stderr {:?}, the JS {:?}", said(&out.stderr), r.s("stderr")));
            }
        }
        let mut got = Vec::new();
        tree(&dir, "", &mut got);
        let want: Vec<(String, Option<Vec<u8>>)> = c
            .a("after")
            .iter()
            .map(|a| (a.s("path").to_string(), a.get("b64").and_then(Json::str).map(base64)))
            .collect();
        if got != want {
            let first = got.iter().zip(&want).position(|(g, w)| g != w).unwrap_or(got.len().min(want.len()));
            failures.push(format!("case {n}: the folder differs from {:?} (it holds {}, the JS {})",
                want.get(first).or(got.get(first)).map(|e| &e.0), got.len(), want.len()));
        }
    }
    let _ = fs::remove_dir_all(&root);
    assert!(runs > 700, "the oracle holds {runs} runs; written by {}", oracle::WRITE_IT);
    assert!(failures.is_empty(), "{} of {runs} runs differ:\n{}", failures.len(),
        failures.iter().take(12).cloned().collect::<Vec<_>>().join("\n"));
}
