//! glyph-icons — the Regent's icons, as one set the app draws (EMS-003 ORD-0002).
//!
//! The files of `.scope/asset/glyph-icons/` stay as delivered. This reads them
//! and writes two things nobody edits by hand: `scripts/glyph-icons.js`, the
//! sprite and the table the page loads, and `.guidelines/.sources/ICONS.md`, the
//! same table for the Regent to read. `.scope/` is the Regent's raw material,
//! read only for agents (R4.6), so nothing is written there.
//!
//! Normalising a delivered tile takes out three things the file carries and the
//! app does not want from it:
//!
//! - **the name**, drawn as outlines above the tile. The page draws the name
//!   from the vocabulary, so the outlines that lie wholly above the tile's
//!   frame are dropped, and the view box is cut to the frame;
//! - **the size**: every frame is the same 12 by 11 rectangle, wherever the
//!   file placed it, so cutting the view box to it gives one tile, 13 by 12
//!   with the stroke;
//! - **the colours**: white, black and the one purple are roles — the face,
//!   the ink and the accent — and each becomes a token of `glyph-engine.css`,
//!   so the interface paints them and no colour is written in the set. Inside a
//!   mask or a clip path a colour is luminance or geometry, not paint, and
//!   stays as drawn.
//!
//! An icon no command names fails the build unless `EXCEPTIONS` declares it,
//! and a command with no icon gets the fallback tile: the frame alone, dashed.

pub mod svg;

use glyph_json::Json;
use std::collections::BTreeMap;
use svg::El;

/// Where the delivered set is read from, relative to the repository.
pub const DELIVERED: &str = ".scope/asset/glyph-icons";
/// The sprite and the table the page loads.
pub const DATA: &str = "scripts/glyph-icons.js";
/// The table for the Regent.
pub const TABLE: &str = ".guidelines/.sources/ICONS.md";

/// The delivered icons no command names, each with the reason it stays.
pub const EXCEPTIONS: &[(&str, &str)] = &[
    (
        "pin_off",
        "the PIN, step 6 of the trail: no command names it until the PIN's vocabulary is built (N1 a, 2026-11-21)",
    ),
    (
        "pin_on",
        "the PIN, step 6 of the trail: no command names it until the PIN's vocabulary is built (N1 a, 2026-11-21)",
    ),
];

/// The colours the delivered files paint with, and the token that paints each role.
const ROLES: &[(&str, &str)] = &[
    ("white", "--gi-face"),
    ("black", "--gi-ink"),
    ("#1e1245", "--gi-accent"),
];

/// The tile every frame is cut to, stroke included.
pub const TILE: (f64, f64) = (13.0, 12.0);

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Kind {
    /// A command's tile, cut to its frame.
    Tile,
    /// A mark with no frame, kept at its own size: the two pins.
    Marker,
}

/// One delivered file, normalised.
#[derive(Debug)]
pub struct Icon {
    pub stem: String,
    pub kind: Kind,
    /// The `<symbol>` the sprite carries for it.
    pub symbol: String,
    /// How many name outlines were dropped from above the frame.
    pub dropped: usize,
}

/// A delivered file, normalised: the name out, the view box cut to the frame,
/// the colours given to roles, and every id prefixed so the sprite holds them all.
pub fn normalise(stem: &str, text: &str) -> Result<Icon, String> {
    let mut root = svg::parse(text).map_err(|e| format!("{stem}.svg: {e}"))?;
    if root.name != "svg" {
        return Err(format!(
            "{stem}.svg: the root is <{}>, not <svg>",
            root.name
        ));
    }
    let frame = root.kids.iter().find(|k| {
        k.name == "rect"
            && k.attr("width") == Some("12")
            && k.attr("height") == Some("11")
            && k.attr("rx").is_some()
    });
    let (kind, view, dropped) = match frame {
        Some(f) => {
            let num = |k: &str| f.attr(k).unwrap_or("0").parse::<f64>().ok();
            let (Some(x), Some(y)) = (num("x"), num("y")) else {
                return Err(format!("{stem}.svg: the frame's x or y is not a number"));
            };
            let before = root.kids.len();
            root.kids.retain(|k| !is_name(k, y));
            let n = glyph_json::number;
            let view = format!("{} {} {} {}", n(x - 0.5), n(y - 0.5), n(TILE.0), n(TILE.1));
            (Kind::Tile, view, before - root.kids.len())
        }
        None => {
            let view = root
                .attr("viewBox")
                .ok_or(format!("{stem}.svg: no frame and no viewBox"))?
                .to_string();
            (Kind::Marker, view, 0)
        }
    };
    let mut ids = Vec::new();
    collect_ids(&root, &mut ids);
    let prefix = format!("gi-{stem}-");
    let mut kids = std::mem::take(&mut root.kids);
    for k in kids.iter_mut() {
        restyle(k, &ids, &prefix, false).map_err(|e| format!("{stem}.svg: {e}"))?;
    }
    let mut symbol = format!("<symbol id=\"gi-{stem}\" viewBox=\"{view}\" fill=\"none\">");
    kids.iter().for_each(|k| k.write(&mut symbol));
    symbol.push_str("</symbol>");
    Ok(Icon {
        stem: stem.to_string(),
        kind,
        symbol,
        dropped,
    })
}

/// A name outline: a path at the root, painted by no mask or clip, whose every
/// point lies above the frame's top edge.
fn is_name(el: &El, top: f64) -> bool {
    if el.name != "path" || el.attr("mask").is_some() || el.attr("clip-path").is_some() {
        return false;
    }
    match el.attr("d").and_then(svg::path_ys) {
        Some(ys) => !ys.is_empty() && ys.iter().all(|&y| y < top),
        None => false,
    }
}

fn collect_ids(el: &El, out: &mut Vec<String>) {
    if let Some(id) = el.attr("id") {
        out.push(id.to_string());
    }
    el.kids.iter().for_each(|k| collect_ids(k, out));
}

/// Ids prefixed, references to them rewritten, `xlink:href` written as `href`,
/// and, outside a mask or a clip path, each colour handed to its role's token.
fn restyle(el: &mut El, ids: &[String], prefix: &str, inside: bool) -> Result<(), String> {
    let inside = inside || el.name == "mask" || el.name == "clipPath";
    if let Some(v) = el.remove("xlink:href") {
        el.attrs.push(("href".to_string(), v));
    }
    let mut style = Vec::new();
    let mut attrs = Vec::new();
    for (k, v) in std::mem::take(&mut el.attrs) {
        let v = rewrite_refs(&v, ids, prefix);
        if k == "id" {
            attrs.push((k, format!("{prefix}{v}")));
        } else if !inside && (k == "fill" || k == "stroke") && v != "none" {
            let low = v.to_ascii_lowercase();
            let Some((_, token)) = ROLES.iter().find(|(c, _)| *c == low) else {
                return Err(format!("<{}> {k}=\"{v}\": a colour with no role", el.name));
            };
            style.push(format!("{k}:var({token})"));
        } else if k == "style" {
            return Err(format!("<{}> carries a style of its own", el.name));
        } else {
            attrs.push((k, v));
        }
    }
    if !style.is_empty() {
        attrs.push(("style".to_string(), style.join(";")));
    }
    el.attrs = attrs;
    for k in el.kids.iter_mut() {
        restyle(k, ids, prefix, inside)?;
    }
    Ok(())
}

/// `url(#id)` and `#id`, for each id the file declares, with the prefix.
fn rewrite_refs(v: &str, ids: &[String], prefix: &str) -> String {
    if let Some(id) = v.strip_prefix('#')
        && ids.iter().any(|i| i == id)
    {
        return format!("#{prefix}{id}");
    }
    let mut out = v.to_string();
    for id in ids {
        out = out.replace(&format!("url(#{id})"), &format!("url(#{prefix}{id})"));
    }
    out
}

/// Every command the vocabulary holds, in its order, each with its category:
/// the category browser's first, then those of `INSTR`, `STRUCT`, `META` and
/// `MODE` it leaves out, with no category. Aliases are spellings, not commands.
pub fn commands() -> Vec<(&'static str, &'static str)> {
    let mut out: Vec<(&str, &str)> = Vec::new();
    for c in glyph_vocab::CATS {
        for (name, _) in c.items {
            out.push((name, c.id));
        }
    }
    for table in [
        glyph_vocab::INSTR,
        glyph_vocab::STRUCT,
        glyph_vocab::META,
        glyph_vocab::MODE,
    ] {
        for (name, _) in table {
            if !out.iter().any(|(n, _)| n == name) {
                out.push((name, ""));
            }
        }
    }
    out
}

/// A command, its category, and the icon that draws it, or none: the fallback.
#[derive(Debug)]
pub struct Row {
    pub command: &'static str,
    pub category: &'static str,
    pub icon: Option<String>,
}

/// The set: every icon normalised, every command placed, the unnamed declared.
#[derive(Debug)]
pub struct Set {
    pub icons: Vec<Icon>,
    pub rows: Vec<Row>,
    pub unnamed: Vec<(String, String)>,
}

/// The set from the delivered files, given as `(stem, text)` in file-name order.
pub fn build(files: &[(String, String)]) -> Result<Set, Vec<String>> {
    let mut errors = Vec::new();
    let mut icons = Vec::new();
    for (stem, text) in files {
        match normalise(stem, text) {
            Ok(i) => icons.push(i),
            Err(e) => errors.push(e),
        }
    }
    let cmds = commands();
    let mut named: BTreeMap<String, String> = BTreeMap::new();
    let mut unnamed = Vec::new();
    for i in &icons {
        let up = i.stem.to_ascii_uppercase();
        let exception = EXCEPTIONS.iter().find(|(s, _)| *s == i.stem);
        if cmds.iter().any(|(c, _)| *c == up) {
            if exception.is_some() {
                errors.push(format!(
                    "{}.svg: a command is named {up}, so the exception for it is not needed",
                    i.stem
                ));
            }
            if i.kind != Kind::Tile {
                errors.push(format!(
                    "{}.svg: names {up} but has no frame to cut a tile to",
                    i.stem
                ));
            }
            named.insert(up, i.stem.clone());
        } else if let Some((_, why)) = exception {
            unnamed.push((i.stem.clone(), why.to_string()));
        } else {
            errors.push(format!(
                "{}.svg: no command is named {up}, and no exception declares the file",
                i.stem
            ));
        }
    }
    for (s, _) in EXCEPTIONS {
        if !files.iter().any(|(f, _)| f == s) {
            errors.push(format!(
                "the exception for {s}.svg names a file that is not delivered"
            ));
        }
    }
    if !errors.is_empty() {
        return Err(errors);
    }
    let rows = cmds
        .into_iter()
        .map(|(command, category)| Row {
            command,
            category,
            icon: named.get(command).cloned(),
        })
        .collect();
    Ok(Set {
        icons,
        rows,
        unnamed,
    })
}

/// The fallback tile: the frame every delivered tile shares, alone and dashed.
const FALLBACK: &str = "<symbol id=\"gi-fallback\" viewBox=\"0 0 13 12\" fill=\"none\"><rect x=\"0.5\" y=\"0.5\" width=\"12\" height=\"11\" rx=\"3\" stroke-dasharray=\"2 1.5\" style=\"fill:var(--gi-face);stroke:var(--gi-fallback)\"/></symbol>";

/// The sprite: one `<svg>` of symbols, `gi-fallback` first, then each icon as `gi-<file>`.
pub fn sprite(set: &Set) -> String {
    let mut s = String::from(
        "<svg xmlns=\"http://www.w3.org/2000/svg\" id=\"gi-sprite\" width=\"0\" height=\"0\" aria-hidden=\"true\" style=\"position:absolute\">",
    );
    s.push_str(FALLBACK);
    set.icons.iter().for_each(|i| s.push_str(&i.symbol));
    s.push_str("</svg>");
    s
}

const HEAD: &str = "/* GENERATED BY glyph-icons (rust/crates/glyph-icons) — DO NOT EDIT BY HAND.\n   The delivered set is .scope/asset/glyph-icons/, kept as delivered. Run:\n   cargo run -q --manifest-path rust/Cargo.toml -p glyph-icons */\n(function (root) {\n  \"use strict\";\n  root.GlyphIcons = ";
const TAIL: &str = ";\n})(typeof self !== \"undefined\" ? self : this);\n";

/// `scripts/glyph-icons.js`: the table and the sprite, as the page loads them.
pub fn data_js(set: &Set) -> String {
    let s = |v: &str| Json::Str(v.to_string());
    let icons = set
        .rows
        .iter()
        .filter_map(|r| r.icon.as_ref().map(|i| (r.command.to_string(), s(i))))
        .collect();
    let fallback = set
        .rows
        .iter()
        .filter(|r| r.icon.is_none())
        .map(|r| s(r.command))
        .collect();
    let unnamed = set
        .unnamed
        .iter()
        .map(|(f, why)| (f.clone(), s(why)))
        .collect();
    let v = Json::Obj(vec![
        ("schema".into(), Json::Num(1.0)),
        (
            "tile".into(),
            Json::Arr(vec![Json::Num(TILE.0), Json::Num(TILE.1)]),
        ),
        ("icons".into(), Json::Obj(icons)),
        ("fallback".into(), Json::Arr(fallback)),
        ("unnamed".into(), Json::Obj(unnamed)),
        ("sprite".into(), s(&sprite(set))),
    ]);
    format!("{HEAD}{}{TAIL}", glyph_json::stringify_indent(&v, "  "))
}

/// `.guidelines/.sources/ICONS.md`: the same table, for the Regent.
pub fn table_md(set: &Set) -> String {
    let with = set.rows.iter().filter(|r| r.icon.is_some()).count();
    let total = set.rows.len();
    let label = |id: &str| {
        glyph_vocab::CATS
            .iter()
            .find(|c| c.id == id)
            .map(|c| c.label)
            .unwrap_or("— (outside the category browser)")
    };
    let mut o = String::new();
    o.push_str("# The icons — the table, generated\n\n");
    o.push_str(
        "> Written by `glyph-icons` (`rust/crates/glyph-icons`) from the delivered files of\n",
    );
    o.push_str("> [`.scope/asset/glyph-icons/`](../../.scope/asset/glyph-icons/), which stay as delivered; never edited by hand.\n");
    o.push_str(
        "> `npm run check` refuses it when it differs from a fresh build. `EMS-003/ORD-0002`.\n\n",
    );
    o.push_str(&format!(
        "{total} commands: {with} with an icon, {} with the fallback tile. {} delivered files, {} of them no command names.\n\n",
        total - with,
        set.icons.len(),
        set.unnamed.len()
    ));
    o.push_str("## By category\n\n| category | with an icon |\n|---|---|\n");
    let mut cats: Vec<&str> = Vec::new();
    for r in &set.rows {
        if !cats.contains(&r.category) {
            cats.push(r.category);
        }
    }
    for c in &cats {
        let rows: Vec<&Row> = set.rows.iter().filter(|r| r.category == *c).collect();
        let n = rows.iter().filter(|r| r.icon.is_some()).count();
        o.push_str(&format!("| {} | {n} of {} |\n", label(c), rows.len()));
    }
    o.push_str("\n## The commands with an icon\n\n| command | category | file | name outlines dropped |\n|---|---|---|---|\n");
    for r in set.rows.iter().filter(|r| r.icon.is_some()) {
        let stem = r.icon.as_deref().unwrap();
        let dropped = set
            .icons
            .iter()
            .find(|i| i.stem == stem)
            .map_or(0, |i| i.dropped);
        o.push_str(&format!(
            "| `{}` | {} | `{stem}.svg` | {dropped} |\n",
            r.command,
            label(r.category)
        ));
    }
    o.push_str("\n## The commands with no icon\n\nThe fallback tile answers for each until an icon arrives.\n\n| command | category |\n|---|---|\n");
    for r in set.rows.iter().filter(|r| r.icon.is_none()) {
        o.push_str(&format!("| `{}` | {} |\n", r.command, label(r.category)));
    }
    o.push_str("\n## The icons no command names\n\n| file | why it stays |\n|---|---|\n");
    for (f, why) in &set.unnamed {
        o.push_str(&format!("| `{f}.svg` | {why} |\n"));
    }
    o
}

/// What the committed `scripts/glyph-icons.js` leaves out, by name: a command
/// in neither `icons` nor `fallback`, or an icon whose symbol the sprite lacks.
pub fn validate(data: &str) -> Vec<String> {
    let body = data
        .find("root.GlyphIcons = ")
        .map(|i| &data[i + "root.GlyphIcons = ".len()..])
        .and_then(|b| b.rfind(TAIL).map(|j| &b[..j]));
    let Some(Ok(v)) = body.map(glyph_json::parse) else {
        return vec![format!("{DATA}: not the shape glyph-icons writes")];
    };
    let icons = v.get("icons").and_then(Json::obj).unwrap_or(&[]);
    let fallback: Vec<&str> = v
        .get("fallback")
        .and_then(Json::arr)
        .unwrap_or(&[])
        .iter()
        .filter_map(Json::str)
        .collect();
    let sprite = v.get("sprite").and_then(Json::str).unwrap_or("");
    let mut out = Vec::new();
    for (c, _) in commands() {
        if !icons.iter().any(|(k, _)| k == c) && !fallback.contains(&c) {
            out.push(format!("{DATA}: the table leaves out {c}"));
        }
    }
    for (c, stem) in icons {
        let id = format!("id=\"gi-{}\"", stem.str().unwrap_or(""));
        if !sprite.contains(&id) {
            out.push(format!(
                "{DATA}: {c} names an icon the sprite does not hold"
            ));
        }
    }
    out
}
