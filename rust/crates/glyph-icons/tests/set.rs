//! The delivered set, built as `npm run check` builds it, and each refusal of
//! EMS-003 ORD-0002 shown failing on a set changed by one thing.

use glyph_icons::{Kind, build, data_js, normalise, svg, validate};
use std::path::PathBuf;

fn delivered() -> Vec<(String, String)> {
    let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../.scope/asset/glyph-icons");
    let mut files: Vec<(String, String)> = std::fs::read_dir(dir)
        .unwrap()
        .flatten()
        .map(|e| e.path())
        .filter(|p| p.extension().and_then(|x| x.to_str()) == Some("svg"))
        .map(|p| {
            let stem = p.file_stem().unwrap().to_str().unwrap().to_string();
            (stem, std::fs::read_to_string(&p).unwrap())
        })
        .collect();
    files.sort();
    files
}

const TILE: &str = r#"<svg width="13" height="17" viewBox="0 0 13 17" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1H3V3H1Z" fill="black"/><rect x="0.5" y="5" width="12" height="11" rx="3" fill="white" stroke="black"/><path d="M3 8H9" stroke="black"/></svg>"#;

#[test]
fn the_delivered_set_as_measured() {
    let set = build(&delivered()).unwrap();
    assert_eq!(set.icons.len(), 41);
    assert_eq!(set.rows.len(), 120);
    assert_eq!(set.rows.iter().filter(|r| r.icon.is_some()).count(), 39);
    let unnamed: Vec<&str> = set.unnamed.iter().map(|(f, _)| f.as_str()).collect();
    assert_eq!(unnamed, ["pin_off", "pin_on"]);
    for i in set.icons.iter().filter(|i| i.kind == Kind::Tile) {
        assert!(i.dropped >= 1, "{}: no name outline dropped", i.stem);
        assert!(
            i.symbol.contains(" 13 12\""),
            "{}: not cut to the tile",
            i.stem
        );
    }
}

/// Outside a mask or a clip path, no element of the set paints with a colour
/// of its own: only `none`, or a token through `style`.
#[test]
fn no_colour_is_written_in_the_set() {
    fn walk(el: &svg::El, inside: bool, stem: &str) {
        let inside = inside || el.name == "mask" || el.name == "clipPath";
        if !inside {
            for k in ["fill", "stroke"] {
                if let Some(v) = el.attr(k) {
                    assert_eq!(v, "none", "{stem}: <{}> {k}=\"{v}\"", el.name);
                }
            }
            if let Some(s) = el.attr("style") {
                assert!(
                    s.split(';').all(|d| d.contains(":var(--gi-")),
                    "{stem}: style {s}"
                );
            }
        }
        el.kids.iter().for_each(|k| walk(k, inside, stem));
    }
    for i in build(&delivered()).unwrap().icons {
        walk(&svg::parse(&i.symbol).unwrap(), false, &i.stem);
    }
}

#[test]
fn an_icon_no_command_names_is_refused() {
    let mut files = delivered();
    files.push(("zzz".into(), TILE.into()));
    let err = build(&files).unwrap_err();
    assert_eq!(
        err,
        ["zzz.svg: no command is named ZZZ, and no exception declares the file"]
    );
}

#[test]
fn a_colour_with_no_role_is_refused() {
    let red = TILE.replace("stroke=\"black\"/></svg>", "stroke=\"#ff0000\"/></svg>");
    let err = normalise("ask", &red).unwrap_err();
    assert!(err.contains("a colour with no role"), "{err}");
}

#[test]
fn the_name_above_the_frame_is_dropped() {
    let i = normalise("ask", TILE).unwrap();
    assert_eq!(i.dropped, 1);
    assert!(!i.symbol.contains("M1 1H3V3H1Z"));
    assert!(i.symbol.contains("M3 8H9"));
    assert!(
        i.symbol
            .starts_with("<symbol id=\"gi-ask\" viewBox=\"0 4.5 13 12\"")
    );
}

#[test]
fn a_command_the_table_leaves_out_is_refused() {
    let data = data_js(&build(&delivered()).unwrap());
    assert!(validate(&data).is_empty());
    let cut = data.replacen("\"ASK\": \"ask\",", "", 1);
    assert_ne!(cut, data);
    assert_eq!(
        validate(&cut),
        ["scripts/glyph-icons.js: the table leaves out ASK"]
    );
    let cut = data.replacen("\n    \"INS\",", "", 1);
    assert_ne!(cut, data);
    assert_eq!(
        validate(&cut),
        ["scripts/glyph-icons.js: the table leaves out INS"]
    );
}
