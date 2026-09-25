//! glyph-version — Port of `scripts/core/version.js` — the oracle. The JS module's own summary:
//!
//!   the engine's version, in one place.
//!
//! The one place stays the JS file: `build.rs` reads `VERSION` from it, and
//! `tests/oracle.rs` holds it to the engine every case of the oracle names.

include!(concat!(env!("OUT_DIR"), "/version.rs"));
