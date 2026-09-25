//! glyph-cli — Port of `scripts/glyph-cli.js` — flag for flag (M11).
//!
//! EMS-001 ORD-0008, the first binary: `glyph` reads Glyph on stdin and
//! writes the XML, and nothing else — the bytes `toXML` answers, with no line
//! after them, read with the repository's three stores. Where the JS throws,
//! the binary writes the JS's message to stderr and exits 1, as node does on
//! an uncaught throw. A flag is not ported yet.

use glyph_parse::Opts;
use glyph_stores::Context;
use std::io::{Read, Write};

fn main() {
    if std::env::args().len() > 1 {
        eprintln!("glyph (rust) {}: flags are not ported yet — use node scripts/glyph-cli.js", env!("CARGO_PKG_VERSION"));
        std::process::exit(2);
    }
    let mut bytes = Vec::new();
    if let Err(e) = std::io::stdin().read_to_end(&mut bytes) {
        eprintln!("glyph: stdin: {e}");
        std::process::exit(2);
    }
    let src = String::from_utf8_lossy(&bytes);
    match glyph_xml::to_xml(&src, &Opts::new(Context::repository()), false) {
        Ok(xml) => {
            let mut out = std::io::stdout().lock();
            if out.write_all(xml.as_bytes()).and_then(|_| out.flush()).is_err() {
                std::process::exit(2);
            }
        }
        Err(thrown) => {
            eprintln!("TypeError: {}", thrown.0);
            std::process::exit(1);
        }
    }
}
