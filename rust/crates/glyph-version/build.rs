//! `VERSION` is read from `scripts/core/version.js` at build time, so the number
//! lives in one place: the changelog moves it there, and the Rust follows.

use std::{env, fs, path::Path};

fn main() {
    let js = Path::new(&env::var("CARGO_MANIFEST_DIR").unwrap()).join("../../../scripts/core/version.js");
    println!("cargo:rerun-if-changed={}", js.display());
    let src = fs::read_to_string(&js).unwrap_or_else(|e| panic!("{}: {e}", js.display()));
    let version = src.split("VERSION = \"").nth(1).and_then(|rest| rest.split('"').next())
        .unwrap_or_else(|| panic!("{}: no `VERSION = \"…\"`", js.display()));
    let out = Path::new(&env::var("OUT_DIR").unwrap()).join("version.rs");
    fs::write(out, format!("pub const VERSION: &str = {version:?};\n")).unwrap();
}
