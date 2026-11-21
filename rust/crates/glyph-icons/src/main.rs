//! `glyph-icons` writes the normalised set and its table from the delivered
//! files; `glyph-icons --check` refuses when either differs from a fresh build,
//! when an icon no command names has no exception, or when the committed table
//! leaves a command out. `--root DIR` names the repository; by default it is
//! the nearest directory, here or above, that holds `.scope/asset/glyph-icons`.

use glyph_icons::{DATA, DELIVERED, TABLE};
use std::path::{Path, PathBuf};
use std::process::ExitCode;

fn main() -> ExitCode {
    let mut args: Vec<String> = std::env::args().skip(1).collect();
    let root = match args.iter().position(|a| a == "--root") {
        Some(i) if i + 1 < args.len() => {
            let r = PathBuf::from(args.remove(i + 1));
            args.remove(i);
            r
        }
        _ => match find_root() {
            Some(r) => r,
            None => return fail(&[format!("no {DELIVERED}/ here or above; pass --root")]),
        },
    };
    let check = match args.as_slice() {
        [] => false,
        [a] if a == "--check" => true,
        _ => return fail(&["usage: glyph-icons [--check] [--root DIR]".into()]),
    };
    match run(&root, check) {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => fail(&e),
    }
}

fn find_root() -> Option<PathBuf> {
    let here = std::env::current_dir().ok()?;
    here.ancestors()
        .find(|p| p.join(DELIVERED).is_dir())
        .map(Path::to_path_buf)
}

fn run(root: &Path, check: bool) -> Result<(), Vec<String>> {
    let dir = root.join(DELIVERED);
    let mut files = Vec::new();
    let entries = std::fs::read_dir(&dir).map_err(|e| vec![format!("{DELIVERED}: {e}")])?;
    for e in entries.flatten() {
        let p = e.path();
        if p.extension().and_then(|x| x.to_str()) != Some("svg") {
            continue;
        }
        let stem = p
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_string();
        let text =
            std::fs::read_to_string(&p).map_err(|e| vec![format!("{}: {e}", p.display())])?;
        files.push((stem, text));
    }
    files.sort();
    let set = glyph_icons::build(&files)?;
    let fresh = [
        (DATA, glyph_icons::data_js(&set)),
        (TABLE, glyph_icons::table_md(&set)),
    ];
    if !check {
        for (path, text) in &fresh {
            std::fs::write(root.join(path), text).map_err(|e| vec![format!("{path}: {e}")])?;
        }
        println!(
            "{DATA} and {TABLE}: {} icons, {} commands",
            set.icons.len(),
            set.rows.len()
        );
        return Ok(());
    }
    let mut breaches = Vec::new();
    for (path, text) in &fresh {
        match std::fs::read_to_string(root.join(path)) {
            Ok(have) => {
                if *path == DATA {
                    breaches.extend(glyph_icons::validate(&have));
                }
                if have.replace("\r\n", "\n") != *text {
                    breaches.push(format!(
                        "{path} differs from a fresh build: run `cargo run -q --manifest-path rust/Cargo.toml -p glyph-icons`"
                    ));
                }
            }
            Err(e) => breaches.push(format!("{path}: {e}")),
        }
    }
    if breaches.is_empty() {
        Ok(())
    } else {
        Err(breaches)
    }
}

fn fail(lines: &[String]) -> ExitCode {
    eprintln!("glyph-icons: {} breach(es)", lines.len());
    lines.iter().for_each(|l| eprintln!("  {l}"));
    ExitCode::FAILURE
}
