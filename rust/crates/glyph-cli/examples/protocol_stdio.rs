//! EMS-001 ORD-0010, option B: the engine on stdio — one JSON request a line
//! in, one JSON answer a line out — for `scripts/serve-dev.js` to relay the
//! page's HTTP to. `cargo run --release --example protocol_stdio`.

#[path = "common/mod.rs"]
mod common;

use std::io::{BufRead, Write};

fn main() {
    let mut out = std::io::stdout().lock();
    for line in std::io::stdin().lock().lines() {
        let Ok(line) = line else { break };
        if writeln!(out, "{}", common::answer(&line)).and_then(|_| out.flush()).is_err() {
            break;
        }
    }
}
