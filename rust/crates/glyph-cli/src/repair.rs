//! `glyph --repair` (EMS-002 ORD-0042, step 4 of the trail to the final
//! Explorer): the queue of what `glyph --check` finds, one `REPAIR.json` per
//! folder with findings — beside its `EMS.json` in a series (C3 b) — and one
//! Order moved or removed at a time. A move adapts the Order to the folder it
//! lands in and bundles it there with this binary, which numbers it (RP-2 a);
//! every act warns, with the difference, and writes nothing until `--yes`
//! confirms it. The Harness repairs through it first; the Explorer's
//! `-Repair-` menu reads the same queue (RP-3).

use crate::coherence::{
    Home, Order, field, findings, homes_under, is_held, is_series, order_named,
};
use glyph_json::{Json, stringify_indent};
use std::path::{Path, PathBuf};

/// One Order in the queue: what did not match, and where it would go.
struct Entry<'a> {
    home: &'a Home,
    order: &'a Order,
    codes: Vec<(&'static str, String)>,
    proposes: PathBuf,
}

/// Where a finding sends its Order (RP-4 b): the series an `EMS.json`
/// configures, the Order's own series when only its engine or its pattern
/// did not match, and `NEM/` beside the series when no series fits.
fn proposal(root: &Path, home: &Home, codes: &[(&'static str, String)]) -> PathBuf {
    if codes.iter().any(|(k, _)| *k == "ClaimEmsOtherSeries")
        && let Some(Ok(cfg)) = &home.config
    {
        let of = field(cfg, "id");
        if is_series(of) && root.join(of).is_dir() {
            return root.join(of);
        }
    }
    if codes
        .iter()
        .all(|(k, _)| matches!(*k, "ClaimEmsEngine" | "ClaimEmsPattern"))
    {
        return home.dir.clone();
    }
    root.join("NEM")
}

fn queue<'a>(root: &Path, homes: &'a [Home]) -> Vec<Entry<'a>> {
    let mut out = Vec::new();
    for home in homes {
        for order in home.orders.iter().filter(|o| is_held(o)) {
            let codes: Vec<(&'static str, String)> = findings(home, order)
                .into_iter()
                .filter(|f| f.sev == "fix")
                .map(|f| (f.code, f.msg))
                .collect();
            if !codes.is_empty() {
                out.push(Entry {
                    home,
                    order,
                    proposes: proposal(root, home, &codes),
                    codes,
                });
            }
        }
    }
    out
}

/// A path as the queue names it: from the folder `--repair` was given.
fn shown(root: &Path, p: &Path) -> String {
    let rel = p
        .strip_prefix(root)
        .unwrap_or(p)
        .to_string_lossy()
        .replace('\\', "/");
    if rel.is_empty() { ".".into() } else { rel }
}

/// The queue written whole: `REPAIR.json` in each folder with findings, and
/// none where no finding is left.
fn write_queue(root: &Path, homes: &[Home], entries: &[Entry]) -> Vec<String> {
    let s = |v: &str| Json::Str(v.to_string());
    let mut written = Vec::new();
    for home in homes {
        let mine: Vec<&Entry> = entries.iter().filter(|e| e.home.dir == home.dir).collect();
        let at = home.dir.join("REPAIR.json");
        if mine.is_empty() {
            let _ = std::fs::remove_file(&at);
            continue;
        }
        let orders = mine
            .iter()
            .map(|e| {
                Json::Obj(vec![
                    ("order".into(), s(&e.order.id)),
                    ("path".into(), s(&e.order.shown)),
                    (
                        "findings".into(),
                        Json::Arr(
                            e.codes
                                .iter()
                                .map(|(c, m)| {
                                    Json::Obj(vec![("code".into(), s(c)), ("message".into(), s(m))])
                                })
                                .collect(),
                        ),
                    ),
                    ("proposes".into(), s(&shown(root, &e.proposes))),
                ])
            })
            .collect();
        let doc = Json::Obj(vec![
            (
                "note".into(),
                s(&format!(
                    "the repair queue of {}, written by glyph --repair from what glyph --check finds (EMS-002 ORD-0042); one entry per Order, asked one at a time; never edited by hand",
                    home.name
                )),
            ),
            ("orders".into(), Json::Arr(orders)),
        ]);
        if std::fs::write(&at, stringify_indent(&doc, "  ") + "\n").is_ok() {
            written.push(shown(root, &at));
        }
    }
    written
}

/// The number `--bundle` gives the next Order in `dir`: the highest
/// `ORD-####` it holds, folders only in a series, plus one.
fn next_number(dir: &Path) -> u32 {
    let series = dir
        .file_name()
        .map(|n| is_series(&n.to_string_lossy()))
        .unwrap_or(false);
    let mut next = 1;
    for e in std::fs::read_dir(dir).into_iter().flatten().flatten() {
        let name = e.file_name().to_string_lossy().into_owned();
        let is_dir = e.file_type().map(|t| t.is_dir()).unwrap_or(false);
        let head = name.get(..8).unwrap_or("");
        let after = name.as_bytes().get(8);
        if order_named(head) && (after.is_none() || after == Some(&b'.')) && (!series || is_dir) {
            next = next.max(head[4..].parse::<u32>().unwrap_or(0) + 1);
        }
    }
    next
}

/// The source adapted to the folder it lands in: the Order's own name
/// renumbered, the claim to its series or to `nem`, and a block name a series
/// declares as `<prefix>…` given to the first block that lacks it.
fn adapt(src: &str, old: &str, new: &str, dest: &Path) -> String {
    let mut s = src.replace(&format!("'{old}-"), &format!("'{new}-"));
    let series = dest
        .file_name()
        .map(|n| is_series(&n.to_string_lossy()))
        .unwrap_or(false);
    s = if series {
        s.replace("[ref'nem']", "[ref'EMS']")
    } else {
        s.replace("[ref'EMS']", "[ref'nem']")
    };
    let cfg = std::fs::read_to_string(dest.join("EMS.json"))
        .ok()
        .and_then(|t| glyph_json::parse(&t).ok());
    for x in cfg
        .as_ref()
        .and_then(|c| c.get("xsd"))
        .and_then(Json::arr)
        .unwrap_or(&[])
    {
        let name = field(x, "name").replace("####", &new[4..]);
        if field(x, "kind") != "block" {
            continue;
        }
        if let Some(prefix) = name.strip_suffix('…').filter(|p| !p.contains('…'))
            && !s.contains(&format!("[block'{prefix}"))
            && let Some(at) = s.find("[block'")
        {
            s.insert_str(at + 7, prefix);
        }
    }
    s
}

/// The lines that differ, as `-` and `+`.
fn difference(old: &str, new: &str) -> Vec<String> {
    old.lines()
        .zip(new.lines())
        .filter(|(a, b)| a != b)
        .flat_map(|(a, b)| [format!("  - {a}"), format!("  + {b}")])
        .collect()
}

/// The adapted source bundled into `dest` by this binary: `dest` made when it
/// is missing — `NEM/` by the first loose Order (C4 a) — and taken back when
/// the bundle refuses, the refusal coming back as its lines.
fn bundle_there(adapted: &str, dest: &Path) -> Result<std::process::Output, Vec<String>> {
    let made = !dest.exists();
    if made && let Err(err) = std::fs::create_dir_all(dest) {
        return Err(vec![format!(
            "glyph --repair: {} was not made: {err}",
            dest.display()
        )]);
    }
    let tmp = std::env::temp_dir().join(format!("glyph-repair-{}.pgml", std::process::id()));
    let ran = std::fs::write(&tmp, adapted).and_then(|_| {
        std::process::Command::new(std::env::current_exe()?)
            .arg("--file")
            .arg(&tmp)
            .arg("--bundle")
            .arg("--out")
            .arg(dest)
            .output()
    });
    let _ = std::fs::remove_file(&tmp);
    let refused = match ran {
        Ok(r) if r.status.success() => return Ok(r),
        Ok(r) => String::from_utf8_lossy(&r.stderr)
            .lines()
            .map(String::from)
            .collect(),
        Err(err) => vec![err.to_string()],
    };
    if made {
        let _ = std::fs::remove_dir(dest);
    }
    Err(refused)
}

/// What a refused `--bundle` offers (RP-1 b): the destination its findings
/// propose and, with `--repair`, the source adapted to it and bundled there,
/// written only with `--yes`.
pub fn offer(
    home: &Home,
    codes: &[(&'static str, String)],
    src: &str,
    id: &str,
    repair: bool,
    yes: bool,
) -> Said {
    let mut said = Said {
        out: Vec::new(),
        err: Vec::new(),
        code: 2,
    };
    // the folder the series and NEM stand in, named as the user named it
    let up = home
        .dir
        .parent()
        .filter(|p| home.dir != Path::new(".") && !p.as_os_str().is_empty());
    let root = match up {
        _ if !is_series(&home.name) && home.name != "NEM" => home.dir.clone(),
        Some(p) => p.to_path_buf(),
        None if home.dir == Path::new(".") => PathBuf::from(".."),
        None => PathBuf::new(),
    };
    let dest = proposal(&root, home, codes);
    let new = format!("ORD-{:04}", next_number(&dest));
    let adapted = adapt(src, id, &new, &dest);
    let there = dest.to_string_lossy().replace('\\', "/");
    if !repair {
        said.err.push(format!(
            "repair: run again with --repair to bundle it into {there} instead, adapted to it."
        ));
        return said;
    }
    said.out.push(format!(
        "bundles it into {there}/{new} instead, adapted to it. Confirm only what the Regent has seen."
    ));
    said.out.extend(difference(src, &adapted));
    if !yes {
        said.out
            .push("nothing written: run again with --yes to confirm.".into());
        said.code = 0;
        return said;
    }
    match bundle_there(&adapted, &dest) {
        Ok(r) => {
            said.out
                .extend(String::from_utf8_lossy(&r.stdout).lines().map(String::from));
            said.code = 0;
        }
        Err(lines) => {
            said.err.extend(lines);
            said.err.push("the repair stopped: nothing written.".into());
        }
    }
    said
}

fn remove(o: &Order) -> std::io::Result<()> {
    for f in &o.files {
        if f.is_dir() {
            std::fs::remove_dir_all(f)?;
        } else if f.exists() {
            std::fs::remove_file(f)?;
        }
    }
    Ok(())
}

/// What `--repair` answers: stdout, stderr and the exit code.
pub struct Said {
    pub out: Vec<String>,
    pub err: Vec<String>,
    pub code: i32,
}

/// `glyph --repair <folder> [--apply <Order> [--to <folder>] [--remove] [--yes]]`.
pub fn run(args: &[String]) -> Said {
    let mut said = Said {
        out: Vec::new(),
        err: Vec::new(),
        code: 0,
    };
    let (mut folder, mut apply, mut to, mut remove_it, mut yes) = (None, None, None, false, false);
    let mut i = 0;
    while i < args.len() {
        match args[i].as_str() {
            "--apply" => {
                i += 1;
                apply = args.get(i).cloned();
            }
            "--to" => {
                i += 1;
                to = args.get(i).cloned();
            }
            "--remove" => remove_it = true,
            "--yes" => yes = true,
            a if folder.is_none() && !a.starts_with("--") => folder = Some(a.to_string()),
            a => {
                said.err
                    .push(format!("glyph --repair: {a} is no flag of the repair."));
                said.code = 2;
                return said;
            }
        }
        i += 1;
    }
    let root_text = folder.unwrap_or_default();
    let root = PathBuf::from(&root_text);
    if root_text.is_empty() || !root.is_dir() {
        said.err
            .push(format!("glyph --repair: {root_text} is no folder."));
        said.code = 2;
        return said;
    }
    let homes = homes_under(&root);
    let entries = queue(&root, &homes);
    let Some(target) = apply else {
        for e in &entries {
            for (c, m) in &e.codes {
                said.out.push(format!("{}  {c} — {m}", e.order.shown));
            }
            said.out.push(format!(
                "  proposes {}: glyph --repair {root_text} --apply {} [--to <folder> | --remove] --yes",
                shown(&root, &e.proposes),
                e.order.shown
            ));
        }
        let written = write_queue(&root, &homes, &entries);
        said.out.push(if entries.is_empty() {
            format!("glyph --repair: the queue under {root_text} is empty")
        } else {
            format!(
                "glyph --repair: {} Orders in the queue under {root_text}, written to {}",
                entries.len(),
                written.join(", ")
            )
        });
        said.code = if entries.is_empty() { 0 } else { 1 };
        return said;
    };
    let target = target.replace('\\', "/");
    let Some(e) = entries.iter().find(|e| e.order.shown == target) else {
        said.err.push(format!(
            "glyph --repair: {target} is not in the repair queue under {root_text}."
        ));
        said.code = 2;
        return said;
    };
    let o = e.order;
    let names: Vec<String> = o.files.iter().map(|f| shown(&root, f)).collect();
    if remove_it {
        said.out.push(format!(
            "removes {}: {}. It is an Order of the queue; confirm only what the Regent has seen.",
            o.shown,
            names.join(", ")
        ));
        if !yes {
            said.out
                .push("nothing written: run again with --yes to confirm.".into());
            return said;
        }
        if let Err(err) = remove(o) {
            said.err.push(format!(
                "glyph --repair: {} was not removed: {err}",
                o.shown
            ));
            said.code = 2;
            return said;
        }
        let homes = homes_under(&root);
        let entries = queue(&root, &homes);
        write_queue(&root, &homes, &entries);
        if !entries.iter().any(|x| x.home.dir == e.home.dir) {
            let _ = std::fs::remove_file(e.home.dir.join("REPAIR.json"));
        }
        said.out.push(format!("removed {}", o.shown));
        return said;
    }
    let dest = to
        .map(|t| root.join(t))
        .unwrap_or_else(|| e.proposes.clone());
    let Some(src) = &o.source else {
        said.err.push(format!(
            "glyph --repair: {} holds no .pgml to adapt; nothing written.",
            o.shown
        ));
        said.code = 2;
        return said;
    };
    let new = format!("ORD-{:04}", next_number(&dest));
    let adapted = adapt(src, &o.id, &new, &dest);
    let landing: Vec<String> = std::fs::read_dir(&dest)
        .into_iter()
        .flatten()
        .flatten()
        .map(|x| x.file_name().to_string_lossy().into_owned())
        .collect();
    said.out.push(format!(
        "moves {} to {}/{new}, adapted to it, and removes it from where it is: {}. A move rewrites the Order; confirm only what the Regent has seen.",
        o.shown,
        shown(&root, &dest),
        names.join(", ")
    ));
    said.out.extend(difference(src, &adapted));
    for c in o.claims.iter().filter(|c| order_named(&c.order)) {
        if !landing.iter().any(|n| n.starts_with(&c.order)) {
            said.out.push(format!(
                "  [ref'{}'] ({}) will not resolve in {}",
                c.order,
                c.kind,
                shown(&root, &dest)
            ));
        }
    }
    if !yes {
        said.out
            .push("nothing written: run again with --yes to confirm.".into());
        return said;
    }
    let ran = match bundle_there(&adapted, &dest) {
        Ok(r) => r,
        Err(lines) => {
            said.err.extend(lines);
            said.err
                .push(format!("the move stopped: {} is where it was.", o.shown));
            said.code = 2;
            return said;
        }
    };
    said.out.extend(
        String::from_utf8_lossy(&ran.stdout)
            .lines()
            .map(String::from),
    );
    if let Err(err) = remove(o) {
        said.err.push(format!(
            "glyph --repair: {} is bundled in {}, and the one where it was is not removed: {err}",
            o.shown,
            shown(&root, &dest)
        ));
        said.code = 2;
        return said;
    }
    let homes = homes_under(&root);
    let entries = queue(&root, &homes);
    write_queue(&root, &homes, &entries);
    if !entries.iter().any(|x| x.home.dir == e.home.dir) {
        let _ = std::fs::remove_file(e.home.dir.join("REPAIR.json"));
    }
    said.out.push(format!(
        "moved {} to {}/{new}",
        o.shown,
        shown(&root, &dest)
    ));
    said
}
