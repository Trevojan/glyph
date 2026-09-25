//! The call both protocols carry, for EMS-001 ORD-0010's measurement: one JSON
//! request `{ "call", "src" }`, one JSON answer `{ "ok": … }` or
//! `{ "thrown": … }`, over the repository's three stores. Only the three
//! projections are carried; the twelve calls wait for the Regent's ADR.

use glyph_burn::{to_hgml, BurnOpts};
use glyph_envelope::{to_ast, AstOpts};
use glyph_parse::Opts;
use glyph_stores::Context;
use glyph_util::json::{parse, stringify, Json};
use glyph_util::tree::Thrown;
use glyph_xml::to_xml;

pub fn answer(request: &str) -> String {
    let req = match parse(request) {
        Ok(r) => r,
        Err(e) => return stringify(&Json::Obj(vec![("thrown".into(), Json::Str(format!("bad request: {e}")))])),
    };
    let src = req.get("src").and_then(Json::str).unwrap_or("");
    let o = Opts::new(Context::repository());
    let got: Result<Json, Thrown> = match req.get("call").and_then(Json::str) {
        Some("toXML") => to_xml(src, &o, false).map(Json::Str),
        Some("toAST") => to_ast(src, &Opts { en: true, ..Opts::new(Context::repository()) }, &AstOpts::default()),
        Some("toHGML") => to_hgml(src, &BurnOpts { parse: &o, keep_text: false }).map(Json::Str),
        other => Err(Thrown(format!("no such call: {other:?}"))),
    };
    stringify(&Json::Obj(vec![match got {
        Ok(v) => ("ok".into(), v),
        Err(Thrown(m)) => ("thrown".into(), Json::Str(m)),
    }]))
}
