//! The coherence between Orders (EMS-002 ORD-0040, step 3 of the trail to the
//! final Explorer), in the Rust alone by the Regent's C5 b of 2026-11-21.
//!
//! An Order says where it stands, anywhere in its source (C2 a): `[ref'EMS']`
//! hands the check to the configuration of its series, `[ref'nem']` names a
//! loose Order, and `[ref'ORD-####']` an Order of its own directory, bare or
//! under a relation command, which names the kind of the edge. The claim is
//! read from the AST, as `binds` and `ref` are. The trigger is mismatch, not
//! absence: a claim its destination does not answer is `fix`, and an Order
//! that makes none is asked where it stands (INTAKE-ORDER-COHERENCE.md §5
//! and §9).

use glyph_json::Json;
use std::path::Path;

/// The moment of EMS-002/ORD-0040, the Order that builds the check: the
/// Orders bundled from it on are held, and the closed ones before it are read
/// as emitted and asked nothing (C1 a).
pub const HELD_FROM: &str = "2026-11-22T20:06:46.248Z";

/// The relation commands, whose reference names the kind of the edge.
const RELATIONS: [&str; 5] = ["OVR", "INSTOF", "DEPR", "DRVF", "SEEAL"];

/// The kinds that put an Order in place of its target: they make no cycle.
const SUPERSEDING: [&str; 3] = ["override", "instead-of", "deprecated"];

/// One claim, as the manifest's `relates` writes it: `order` is the Order
/// referenced, or the category, `EMS` or `nem`.
#[derive(Debug, Clone, PartialEq)]
pub struct Claim {
    pub order: String,
    pub kind: String,
    pub reason: String,
}

/// An Order as the check reads its bundle.
#[derive(Debug, Clone, Default)]
pub struct Order {
    pub id: String,
    /// Where the check names it, from the folder it was given.
    pub shown: String,
    pub emitted: String,
    pub engine: String,
    pub claims: Vec<Claim>,
    /// Its `<declares>`, kind and name.
    pub declares: Vec<(String, String)>,
    pub unreadable: Option<String>,
}

/// A directory of Orders, its `queued/` with it, and the configuration that
/// answers for a claim to its series.
pub struct Home {
    pub name: String,
    pub config: Option<Result<Json, String>>,
    pub orders: Vec<Order>,
}

pub struct Finding {
    pub sev: &'static str,
    pub code: &'static str,
    pub msg: String,
}

/// `^ORD-\d{4}$`
fn order_named(v: &str) -> bool {
    let b = v.as_bytes();
    b.len() == 8 && v.starts_with("ORD-") && b[4..].iter().all(u8::is_ascii_digit)
}

/// `^EMS-\d{3}$`
pub fn is_series(name: &str) -> bool {
    name.len() == 7 && name.starts_with("EMS-") && name[4..].bytes().all(|b| b.is_ascii_digit())
}

/// What a reference claims: a category, or an Order, kept with the path that
/// would put it outside the directory.
fn claimable(v: &str) -> bool {
    let at = v.len().saturating_sub(8);
    v == "EMS"
        || v == "nem"
        || (v.is_char_boundary(at)
            && order_named(&v[at..])
            && (at == 0 || v[..at].ends_with(['/', '\\'])))
}

fn field<'a>(nd: &'a Json, key: &str) -> &'a str {
    nd.get(key).and_then(Json::str).unwrap_or("")
}

fn body(nd: &Json) -> &[Json] {
    nd.get("body").and_then(Json::arr).unwrap_or(&[])
}

/// The words a command holds itself, its literals and its prose.
fn words(nd: &Json) -> impl Iterator<Item = &str> {
    body(nd)
        .iter()
        .filter(|k| matches!(field(k, "type"), "Literal" | "Text"))
        .map(|k| field(k, "value").trim())
        .filter(|v| !v.is_empty())
}

/// The claims of an Order, read from its AST in source order.
pub fn claims_of(ast: &Json) -> Vec<Claim> {
    let mut out = Vec::new();
    for seg in ast.get("segments").and_then(Json::arr).unwrap_or(&[]) {
        walk(seg, &mut out);
    }
    out
}

fn walk(parent: &Json, out: &mut Vec<Claim>) {
    let relation = RELATIONS.contains(&field(parent, "canonical"));
    for nd in body(parent) {
        let target = body(nd)
            .iter()
            .find(|k| field(k, "type") == "Literal")
            .map(|k| field(k, "value").trim());
        if field(nd, "canonical") == "REF"
            && let Some(v) = target.filter(|v| claimable(v))
        {
            let (kind, reason) = if relation {
                let own = words(parent).collect::<Vec<_>>().join(" ");
                (field(parent, "element").to_string(), own)
            } else {
                ("reference".to_string(), String::new())
            };
            out.push(Claim {
                order: v.to_string(),
                kind,
                reason,
            });
        }
        walk(nd, out);
    }
}

/// The `<declares>` of a package, each kind and name.
pub fn declares_of(xml: &str) -> Vec<(String, String)> {
    let mut out = Vec::new();
    let mut i = 0;
    while let Some(p) = xml[i..].find("<declares") {
        let at = i + p;
        i = at + 1;
        if let Some((tag, attrs, _, _)) = glyph_util::start_tag(xml, at)
            && tag == "declares"
        {
            let get = |k: &str| {
                attrs
                    .iter()
                    .find(|(n, _)| n == k)
                    .map_or(String::new(), |(_, v)| {
                        v.replace("&lt;", "<")
                            .replace("&gt;", ">")
                            .replace("&quot;", "\"")
                            .replace("&apos;", "'")
                            .replace("&amp;", "&")
                    })
            };
            out.push((get("kind"), get("name")));
        }
    }
    out
}

/// An Order from the three files of its bundle.
fn order_of(
    id: &str,
    shown: String,
    man: Option<String>,
    ast: Option<String>,
    xml: Option<String>,
) -> Order {
    let mut o = Order {
        id: id.into(),
        shown,
        ..Order::default()
    };
    let man = man.map(|m| glyph_json::parse(&m));
    if let Some(Ok(m)) = &man {
        o.emitted = field(m, "emitted").into();
        o.engine = field(m, "engine").into();
    }
    match (man, ast.map(|a| glyph_json::parse(&a)), xml) {
        (Some(Ok(_)), Some(Ok(a)), Some(x)) => {
            o.claims = claims_of(&a);
            o.declares = declares_of(&x);
        }
        (None | Some(Err(_)), ..) => o.unreadable = Some("its manifest".into()),
        (_, None | Some(Err(_)), _) => o.unreadable = Some("its AST".into()),
        (.., None) => o.unreadable = Some("its XML".into()),
    }
    o
}

/// The Orders a directory holds, in each layout `--bundle` writes or a hand
/// lays out: a folder `ORD-####/`, its files flat, or its zip.
fn orders_in(dir: &Path, shown: &str) -> Vec<Order> {
    let Ok(rd) = std::fs::read_dir(dir) else {
        return Vec::new();
    };
    let mut names: Vec<(String, bool)> = rd
        .flatten()
        .map(|e| {
            let is_dir = e.file_type().map(|t| t.is_dir()).unwrap_or(false);
            (e.file_name().to_string_lossy().into_owned(), is_dir)
        })
        .collect();
    names.sort();
    let text = |p: &Path| std::fs::read_to_string(p).ok();
    let show = |id: &str| {
        if shown.is_empty() {
            id.to_string()
        } else {
            format!("{shown}/{id}")
        }
    };
    let mut out: Vec<Order> = Vec::new();
    for (name, is_dir) in names {
        let o = if is_dir && order_named(&name) {
            let at = dir.join(&name);
            order_of(
                &name,
                show(&name),
                text(&at.join(format!("{name}.manifest.json"))),
                text(&at.join(format!("{name}.json"))),
                text(&at.join(format!("{name}.xml"))),
            )
        } else if let Some(id) = name
            .strip_suffix(".manifest.json")
            .filter(|n| !is_dir && order_named(n))
        {
            order_of(
                id,
                show(id),
                text(&dir.join(&name)),
                text(&dir.join(format!("{id}.json"))),
                text(&dir.join(format!("{id}.xml"))),
            )
        } else if let Some(id) = name
            .strip_suffix(".zip")
            .filter(|n| !is_dir && order_named(n))
        {
            let entries = std::fs::read(dir.join(&name))
                .ok()
                .and_then(|z| glyph_bundle::zip_entries(&z))
                .unwrap_or_default();
            let entry = |ext: &str| {
                entries
                    .iter()
                    .find(|(n, _)| *n == format!("{id}.{ext}"))
                    .and_then(|(_, b)| String::from_utf8(b.clone()).ok())
            };
            order_of(
                id,
                show(id),
                entry("manifest.json"),
                entry("json"),
                entry("xml"),
            )
        } else {
            continue;
        };
        if !out.iter().any(|x| x.id == o.id) {
            out.push(o);
        }
    }
    out
}

/// The `EMS.json` of a directory, checked as `--bundle` checks it.
fn config_of(dir: &Path) -> Option<Result<Json, String>> {
    let text = std::fs::read_to_string(dir.join("EMS.json")).ok()?;
    let text = glyph_util::js_trim(&text.replace("\r\n", "\n"));
    Some(glyph_json::parse(&text).and_then(|cfg| {
        let bad = glyph_schema::validate_ems(&cfg);
        if bad.is_empty() {
            Ok(cfg)
        } else {
            Err(bad.join("; "))
        }
    }))
}

/// The directory `dir`, named `name`, as a home: a `queued/` belongs to the
/// directory above it.
pub fn home_at(dir: &Path, name: &str, shown: &str) -> Home {
    let queued = if shown.is_empty() {
        "queued".to_string()
    } else {
        format!("{shown}/queued")
    };
    let mut orders = orders_in(dir, shown);
    for o in orders_in(&dir.join("queued"), &queued) {
        if !orders.iter().any(|x| x.id == o.id) {
            orders.push(o);
        }
    }
    Home {
        name: name.to_string(),
        config: config_of(dir),
        orders,
    }
}

/// The home a bundle written into `dir` lands in.
pub fn home_for(dir: &Path) -> Home {
    let name_of = |p: &Path| {
        std::fs::canonicalize(p)
            .ok()
            .and_then(|c| c.file_name().map(|n| n.to_string_lossy().into_owned()))
            .unwrap_or_default()
    };
    if name_of(dir) == "queued" {
        let up = dir.join("..");
        home_at(&up, &name_of(&up), "")
    } else {
        home_at(dir, &name_of(dir), "")
    }
}

/// `####` the Order's number and `…` one character or more, as the `xsd` of
/// an `EMS.json` writes a name every Order of the series declares.
fn fits(pattern: &str, name: &str) -> bool {
    let mut parts = pattern.split('…');
    let Some(mut rest) = parts.next().and_then(|first| name.strip_prefix(first)) else {
        return false;
    };
    let parts: Vec<&str> = parts.collect();
    for (i, p) in parts.iter().enumerate() {
        let Some(c) = rest.chars().next() else {
            return false;
        };
        let after = &rest[c.len_utf8()..];
        if i + 1 == parts.len() {
            return rest.len() > p.len() && rest.ends_with(p);
        }
        match after.find(p) {
            Some(at) => rest = &after[at + p.len()..],
            None => return false,
        }
    }
    rest.is_empty()
}

/// The path back to `o` through what supersedes, if there is one.
fn cycle_through(home: &Home, o: &Order) -> Option<Vec<String>> {
    let next = |id: &str| -> Vec<String> {
        home.orders
            .iter()
            .filter(|x| x.id == id)
            .flat_map(|x| x.claims.iter())
            .filter(|c| SUPERSEDING.contains(&c.kind.as_str()) && order_named(&c.order))
            .map(|c| c.order.clone())
            .collect()
    };
    let (mut stack, mut seen) = (vec![vec![o.id.clone()]], Vec::new());
    while let Some(path) = stack.pop() {
        for n in next(path.last().map_or("", String::as_str)) {
            if n == o.id && path.len() > 1 {
                return Some([path.clone(), vec![n]].concat());
            }
            if n != o.id && !seen.contains(&n) {
                seen.push(n.clone());
                stack.push([path.clone(), vec![n]].concat());
            }
        }
    }
    None
}

/// What the check says of `o`, standing in `home`.
pub fn findings(home: &Home, o: &Order) -> Vec<Finding> {
    let mut out = Vec::new();
    let mut put = |sev, code, msg: String| out.push(Finding { sev, code, msg });
    let (id, here) = (o.id.as_str(), home.name.as_str());
    if let Some(what) = &o.unreadable {
        put(
            "fix",
            "BundleUnreadable",
            format!("{id}: {what} does not read."),
        );
        return out;
    }
    if o.claims.is_empty() {
        put(
            "ask",
            "Unclaimed",
            format!(
                "{id} does not say where it stands: [ref'EMS'] in a series, [ref'nem'] for a loose Order, or [ref'ORD-####'] for an Order of its own directory."
            ),
        );
    }
    for c in &o.claims {
        let t = c.order.as_str();
        match t {
            "EMS" if !is_series(here) => put(
                "fix",
                "ClaimEmsOutsideSeries",
                format!("{id} claims [ref'EMS'] in {here}, which is no series."),
            ),
            "EMS" => match &home.config {
                None => put(
                    "fix",
                    "ClaimEmsUnconfigured",
                    format!(
                        "{id} claims [ref'EMS'], and {here} holds no EMS.json to answer for it."
                    ),
                ),
                Some(Err(why)) => put(
                    "fix",
                    "ClaimEmsUnconfigured",
                    format!(
                        "{id} claims [ref'EMS'], and the EMS.json of {here} does not conform to ems-schema.json: {why}."
                    ),
                ),
                Some(Ok(cfg)) => {
                    let of = field(cfg, "id");
                    if of != here {
                        put(
                            "fix",
                            "ClaimEmsOtherSeries",
                            format!(
                                "{id} claims [ref'EMS'] in {here}, and its EMS.json configures {of}."
                            ),
                        );
                    }
                    let engine = field(cfg, "engine");
                    if engine != o.engine {
                        put(
                            "fix",
                            "ClaimEmsEngine",
                            format!(
                                "{id} was bundled with engine {}, and {here} bundles with {engine}.",
                                o.engine
                            ),
                        );
                    }
                    for x in cfg.get("xsd").and_then(Json::arr).unwrap_or(&[]) {
                        let (kind, name) = (field(x, "kind"), field(x, "name"));
                        let want = name.replace("####", &id[4..]);
                        if !o.declares.iter().any(|(k, n)| k == kind && fits(&want, n)) {
                            put(
                                "fix",
                                "ClaimEmsPattern",
                                format!(
                                    "{id} declares no {kind} {name}, which every Order of {here} declares."
                                ),
                            );
                        }
                    }
                }
            },
            "nem" if here != "NEM" => put(
                "fix",
                "NemOutsideNem",
                format!("{id} claims [ref'nem'] in {here}: a loose Order stands in .orders/NEM/."),
            ),
            "nem" => {}
            _ if !order_named(t) => put(
                "fix",
                "RelationOutsideDirectory",
                format!(
                    "{id} relates to {t} ({}), outside {here}: a chain stays in its own directory.",
                    c.kind
                ),
            ),
            _ if t == id => put(
                "fix",
                "RelationToItself",
                format!("{id} relates to itself ({}).", c.kind),
            ),
            _ if !home.orders.iter().any(|x| x.id == t) => put(
                "fix",
                "RelationToAbsent",
                format!("{id} relates to {t} ({}), and {here} holds no {t}.", c.kind),
            ),
            _ => {}
        }
    }
    if let Some(path) = cycle_through(home, o) {
        put(
            "fix",
            "SupersessionCycle",
            format!(
                "{id} supersedes itself through {}: override, instead-of and deprecated make no cycle.",
                path.join(" → ")
            ),
        );
    }
    out
}

/// Every home under `dir`, a directory of its own and none inside an Order.
fn homes(dir: &Path, name: &str, shown: &str, out: &mut Vec<Home>) {
    if name != "queued" {
        let h = home_at(dir, name, shown);
        if !h.orders.is_empty() {
            out.push(h);
        }
    }
    let Ok(rd) = std::fs::read_dir(dir) else {
        return;
    };
    let mut subs: Vec<String> = rd
        .flatten()
        .filter(|e| e.file_type().map(|t| t.is_dir()).unwrap_or(false))
        .map(|e| e.file_name().to_string_lossy().into_owned())
        .filter(|n| !n.starts_with('.') && !order_named(n))
        .collect();
    subs.sort();
    for n in subs {
        let at = if shown.is_empty() {
            n.clone()
        } else {
            format!("{shown}/{n}")
        };
        homes(&dir.join(&n), &n, &at, out);
    }
}

/// `glyph --check <folder>`: one line per finding on an Order held, and the
/// count; exit 1 on a `fix`, an `ask` refusing nothing.
pub fn check(root: &str) -> (String, i32) {
    let base = Path::new(root);
    if root.is_empty() || !base.is_dir() {
        return (format!("glyph --check: {root} is no folder."), 2);
    }
    let name = std::fs::canonicalize(base)
        .ok()
        .and_then(|c| c.file_name().map(|n| n.to_string_lossy().into_owned()))
        .unwrap_or_default();
    let mut all = Vec::new();
    homes(base, &name, "", &mut all);
    let (mut lines, mut n, mut held, mut fix, mut ask) = (Vec::new(), 0, 0, 0, 0);
    for h in &all {
        for o in &h.orders {
            n += 1;
            if o.emitted.as_str() < HELD_FROM {
                continue;
            }
            held += 1;
            for f in findings(h, o) {
                if f.sev == "fix" {
                    fix += 1;
                } else {
                    ask += 1;
                }
                lines.push(format!("{}  {}  {} — {}", f.sev, o.shown, f.code, f.msg));
            }
        }
    }
    lines.push(format!(
        "glyph --check: {n} Orders under {root}, {held} held from {HELD_FROM}; {fix} fix, {ask} ask"
    ));
    (lines.join("\n"), if fix > 0 { 1 } else { 0 })
}
