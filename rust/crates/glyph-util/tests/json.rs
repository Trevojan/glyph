//! `json` read and written against the JS: every file the export writes is
//! `JSON.stringify(value, null, 1)` and a newline, so reading it and writing it
//! back gives the same bytes, or the reader or the writer is not the JS's.

#[path = "../../../testkit/oracle.rs"]
mod oracle;

use glyph_util::json::{number, parse, stringify, stringify_indent, Json};

#[test]
fn every_oracle_file_reads_and_writes_back_to_its_bytes() {
    let files = oracle::files();
    let bad: Vec<String> = files.iter().filter_map(|(f, text)| {
        let v = parse(text).unwrap_or_else(|e| panic!("{}: {e}", f.display()));
        let back = stringify_indent(&v, " ") + "\n";
        (back != *text).then(|| {
            let at = back.bytes().zip(text.bytes()).take_while(|(a, b)| a == b).count();
            format!("{} differs at byte {at}", f.display())
        })
    }).collect();
    assert!(bad.is_empty(), "{} of {} files: {}", bad.len(), files.len(), bad.join("; "));
}

#[test]
fn compact_is_the_indented_without_the_gaps() {
    let v = parse(r#"{"a":[1,{"b":"x\n\"y\""}],"c":{},"d":[]}"#).unwrap();
    assert_eq!(stringify(&v), r#"{"a":[1,{"b":"x\n\"y\""}],"c":{},"d":[]}"#);
}

/* What node answers for `String(n)` and `JSON.stringify`, the JS rules for
   placing the shortest digits; the oracle's numbers are all integers, so
   these hold the rest. */
#[test]
fn numbers_are_written_as_the_js_writes_them() {
    for (n, js) in [(0.0, "0"), (-0.0, "0"), (100.0, "100"), (-0.5, "-0.5"), (123.456, "123.456"),
                    (1e21, "1e+21"), (1e20, "100000000000000000000"), (1.5e-7, "1.5e-7"),
                    (1e-7, "1e-7"), (0.000001, "0.000001"), (9007199254740993.0, "9007199254740992"),
                    (f64::NAN, "null"), (f64::INFINITY, "null")] {
        assert_eq!(number(n), js, "{n}");
    }
}

#[test]
fn keys_keep_the_js_property_order() {
    let v = parse(r#"{"b":1,"2":2,"a":3,"0":4,"b":5,"01":6}"#).unwrap();
    let keys: Vec<&str> = match &v { Json::Obj(kv) => kv.iter().map(|(k, _)| k.as_str()).collect(), _ => vec![] };
    assert_eq!(keys, ["0", "2", "b", "a", "01"]);
    assert_eq!(v.get("b"), Some(&Json::Num(5.0)));
}
