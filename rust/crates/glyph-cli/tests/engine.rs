//! EMS-001 ORD-0010, the process: `glyph-engine` reads one request a line on
//! stdin and writes one answer a line on stdout, and over every request
//! `protocol.json` records its lines are the JS's, in order.

#[path = "../../../testkit/oracle.rs"]
mod oracle;

use oracle::{module, Must};
use std::io::Write;
use std::process::{Command, Stdio};

#[test]
fn the_engine_answers_every_recorded_request_in_order() {
    let lines = module("protocol").a("lines");
    let input: String = lines.iter().map(|l| format!("{}\n", l.s("q"))).collect();
    let mut child = Command::new(env!("CARGO_BIN_EXE_glyph-engine"))
        .stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped()).spawn().expect("the engine runs");
    let mut stdin = child.stdin.take().expect("stdin");
    let writer = std::thread::spawn(move || stdin.write_all(input.as_bytes()).expect("stdin takes the requests"));
    let out = child.wait_with_output().expect("the engine ends at the end of its input");
    writer.join().expect("the writer");
    assert!(out.status.success() && out.stderr.is_empty(), "{:?}", String::from_utf8_lossy(&out.stderr));
    let text = String::from_utf8(out.stdout).expect("UTF-8");
    let answers: Vec<&str> = text.split_terminator('\n').collect();
    assert_eq!(answers.len(), lines.len(), "one answer a request");
    for (l, got) in lines.iter().zip(&answers) {
        assert_eq!(*got, l.s("a"), "{}", l.s("q").get(..l.s("q").len().min(90)).unwrap_or(l.s("q")));
    }
}
