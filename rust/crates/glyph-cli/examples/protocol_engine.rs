//! EMS-001 ORD-0010's baseline: the engine and its JSON with no transport —
//! one request a line in, the median nanoseconds of ROUNDS answers to it a
//! line out. `cargo run --release --example protocol_engine -- ROUNDS`.

#[path = "common/mod.rs"]
mod common;

use std::io::{BufRead, Write};
use std::time::Instant;

fn main() {
    let rounds: usize = std::env::args().nth(1).and_then(|r| r.parse().ok()).unwrap_or(5);
    let mut out = std::io::stdout().lock();
    for line in std::io::stdin().lock().lines() {
        let Ok(line) = line else { break };
        common::answer(&line);
        let mut ns: Vec<u128> = (0..rounds)
            .map(|_| {
                let t = Instant::now();
                std::hint::black_box(common::answer(&line));
                t.elapsed().as_nanos()
            })
            .collect();
        ns.sort_unstable();
        if writeln!(out, "{}", ns[ns.len() / 2]).and_then(|_| out.flush()).is_err() {
            break;
        }
    }
}
