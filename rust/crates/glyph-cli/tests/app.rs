//! EMS-001 ORD-0013, path A: the binary serves the app on its own origin, with
//! the stores of the machine it runs on, and installs and uninstalls itself.
//! Every test points APPDATA and LOCALAPPDATA at a scratch folder, so nothing
//! of the machine running the suite is read or written, and none of them
//! touches the registry.

use std::io::{BufRead, BufReader, Read, Write};
use std::net::TcpStream;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};

fn scratch(name: &str) -> PathBuf {
    let d = std::env::temp_dir().join(format!("glyph-app-{name}-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&d);
    std::fs::create_dir_all(&d).expect("the scratch folder");
    d
}

fn glyph(home: &Path) -> Command {
    let mut c = Command::new(env!("CARGO_BIN_EXE_glyph"));
    c.env("APPDATA", home.join("Roaming")).env("LOCALAPPDATA", home.join("Local"));
    c
}

struct Server {
    child: Child,
    port: u16,
}

impl Drop for Server {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

fn serve(home: &Path) -> Server {
    let mut child = glyph(home).args(["--serve", "--port", "0", "--no-open"])
        .stdout(Stdio::piped()).stderr(Stdio::inherit()).spawn().expect("the app runs");
    let mut line = String::new();
    BufReader::new(child.stdout.take().expect("stdout")).read_line(&mut line).expect("the first line");
    let port = line.split("127.0.0.1:").nth(1).and_then(|r| r.split('/').next()).and_then(|p| p.parse().ok())
        .unwrap_or_else(|| panic!("no port in {line:?}"));
    Server { child, port }
}

fn http(port: u16, method: &str, path: &str, body: &str) -> (String, Vec<u8>) {
    let mut s = TcpStream::connect(("127.0.0.1", port)).expect("the app listens");
    let req = format!("{method} {path} HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}", body.len());
    s.write_all(req.as_bytes()).expect("the request");
    let mut head = String::new();
    let mut r = BufReader::new(s);
    let mut len = 0;
    loop {
        let mut h = String::new();
        r.read_line(&mut h).expect("a header");
        if h.trim_end().is_empty() {
            break;
        }
        if let Some(v) = h.to_ascii_lowercase().strip_prefix("content-length:") {
            len = v.trim().parse().unwrap_or(0);
        }
        head.push_str(&h);
    }
    let mut bytes = vec![0; len];
    r.read_exact(&mut bytes).expect("the body");
    (head, bytes)
}

#[test]
fn the_app_serves_its_page_and_answers_the_engine_on_one_origin() {
    let home = scratch("serve");
    let app = serve(&home);
    let repo = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../..");

    let (head, page) = http(app.port, "GET", "/glyph-engine-alias.html?engine=relay", "");
    assert!(head.starts_with("HTTP/1.1 200") && head.contains("text/html"), "{head}");
    assert_eq!(page, std::fs::read(repo.join("glyph-engine-alias.html")).unwrap(), "the page is the repository's");
    let (head, module) = http(app.port, "GET", "/scripts/core/parser.js", "");
    assert!(head.contains("text/javascript"), "{head}");
    assert_eq!(module, std::fs::read(repo.join("scripts/core/parser.js")).unwrap());
    let (head, _) = http(app.port, "GET", "/", "");
    assert!(head.starts_with("HTTP/1.1 302") && head.contains("Location: /glyph-engine-alias.html?engine=relay"), "{head}");
    let (head, _) = http(app.port, "GET", "/Cargo.toml", "");
    assert!(head.starts_with("HTTP/1.1 404"), "only the app's files: {head}");

    for q in [r#"{"call":"toXML","src":"[crit'the parser']"}"#, r#"{"call":"tokenize","src":"[nt'a']"}"#, "nope"] {
        let (head, a) = http(app.port, "POST", "/engine", q);
        assert!(head.starts_with("HTTP/1.1 200"), "{head}");
        assert_eq!(String::from_utf8(a).unwrap(), glyph_protocol::answer(q), "{q}");
    }
    drop(app);
    let _ = std::fs::remove_dir_all(&home);
}

#[test]
fn the_engine_answers_with_the_stores_of_the_machine() {
    let q = r#"{"call":"toXML","src":"[--germinate'a']"}"#;
    let repository = glyph_protocol::answer(q);

    /* the folder holds the repository's own stores: the same answer */
    let home = scratch("stores-same");
    let stores = home.join("Roaming").join("Glyph").join("stores");
    std::fs::create_dir_all(&stores).unwrap();
    let repo = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../.guidelines");
    for f in ["templates.json", "rules.json", "expansions.json"] {
        std::fs::copy(repo.join(f), stores.join(f)).unwrap();
    }
    let app = serve(&home);
    assert_eq!(String::from_utf8(http(app.port, "POST", "/engine", q).1).unwrap(), repository, "read from disk, the same stores");
    drop(app);

    /* the folder holds no template: the answer is the machine's, not the repository's */
    std::fs::write(stores.join("templates.json"), r#"{ "templates": {} }"#).unwrap();
    let app = serve(&home);
    let mine = String::from_utf8(http(app.port, "POST", "/engine", q).1).unwrap();
    assert_ne!(mine, repository, "the machine's templates answer");
    drop(app);

    /* a store that does not read stops the app, rather than answering from a guess */
    std::fs::write(stores.join("templates.json"), "{ not json").unwrap();
    let out = glyph(&home).args(["--serve", "--port", "0", "--no-open"]).output().unwrap();
    assert!(!out.status.success() && String::from_utf8_lossy(&out.stderr).contains("templates.json"),
            "{}", String::from_utf8_lossy(&out.stderr));
    let _ = std::fs::remove_dir_all(&home);
}

/// EMS-002 ORD-0032: the tables carry the templates of the machine, and what a
/// request brings goes over them and does not stay.
#[test]
fn the_page_reads_the_machine_and_brings_what_differs() {
    let home = scratch("differ");
    let stores = home.join("Roaming").join("Glyph").join("stores");
    std::fs::create_dir_all(&stores).unwrap();
    std::fs::write(stores.join("templates.json"), r#"{ "templates": { "machine": { "body": "[nt'of the machine']" } } }"#).unwrap();
    let app = serve(&home);
    let ask = |q: &str| String::from_utf8(http(app.port, "POST", "/engine", q).1).unwrap();

    let tables = glyph_json::parse(&ask(r#"{"call":"tables"}"#)).unwrap();
    let held = tables.get("ok").and_then(|t| t.get("templates")).expect("the tables name the templates");
    assert_eq!(glyph_json::stringify(held), r#"{"machine":{"body":"[nt'of the machine']"}}"#, "the machine's, not the repository's");

    let mine = r#"{"mine":{"body":"[nt'of the page']"}}"#;
    let src = "[--machine][--mine]";
    let a = ask(&format!(r#"{{"call":"toXML","src":"{src}","differ":{{"digest":"{}","templates":{mine}}}}}"#, glyph_envelope::ck(mine)));
    assert!(a.contains("of the machine") && a.contains("of the page"), "{a}");
    let a = ask(&format!(r#"{{"call":"toXML","src":"{src}"}}"#));
    assert!(a.contains("of the machine") && !a.contains("of the page"), "nothing stays: {a}");
    let a = ask(&format!(r#"{{"call":"toXML","src":"{src}","differ":{{"digest":"0","templates":{mine}}}}}"#));
    assert!(a.contains("do not match their digest"), "{a}");
    drop(app);
    let _ = std::fs::remove_dir_all(&home);
}

/// The optional header's subsystem field: 3 a console program, 2 a Windows one.
#[cfg(windows)]
fn subsystem_at(exe: &[u8]) -> usize {
    u32::from_le_bytes(exe[0x3c..0x40].try_into().unwrap()) as usize + 0x5c
}

/// The binary run from a scratch folder, so that no test opens a real browser or
/// a real Edge: `whoami.exe` stands in for each, and a program is looked for
/// beside the running binary first. It ends at once, as a closed window does.
#[cfg(windows)]
fn staged(home: &Path, with_edge: bool) -> Command {
    let stand_in = Path::new(&std::env::var_os("SystemRoot").unwrap()).join("System32").join("whoami.exe");
    let bin = home.join("bin");
    std::fs::create_dir_all(&bin).unwrap();
    std::fs::copy(env!("CARGO_BIN_EXE_glyph"), bin.join("glyph.exe")).unwrap();
    std::fs::copy(&stand_in, bin.join("rundll32.exe")).unwrap();
    if with_edge {
        let edge = home.join("Local").join("Microsoft").join("Edge").join("Application");
        std::fs::create_dir_all(&edge).unwrap();
        std::fs::copy(&stand_in, edge.join("msedge.exe")).unwrap();
    }
    let mut c = Command::new(bin.join("glyph.exe"));
    c.env("APPDATA", home.join("Roaming")).env("LOCALAPPDATA", home.join("Local"))
        .env("ProgramFiles(x86)", home.join("no-edge")).env("ProgramFiles", home.join("no-edge"));
    c
}

#[test]
fn a_second_launch_finds_the_engine_and_ends() {
    let home = scratch("second");
    let first = serve(&home);
    let child = glyph(&home).args(["--serve", "--no-open", "--port", &first.port.to_string()])
        .stdout(Stdio::piped()).spawn().expect("the second launch runs");
    let mut second = Server { child, port: first.port };
    let started = std::time::Instant::now();
    let status = loop {
        if let Some(status) = second.child.try_wait().unwrap() {
            break status;
        }
        assert!(started.elapsed().as_secs() < 15, "the second launch is still waiting on the first");
        std::thread::sleep(std::time::Duration::from_millis(50));
    };
    assert!(status.success(), "{status}");
    let mut said = String::new();
    second.child.stdout.take().expect("stdout").read_to_string(&mut said).unwrap();
    assert!(said.contains("already running"), "{said:?}");
    drop(second);
    drop(first);
    let _ = std::fs::remove_dir_all(&home);
}

#[cfg(windows)]
#[test]
fn the_engine_stops_when_the_window_closes() {
    let home = scratch("window");
    let child = staged(&home, true).args(["--serve", "--port", "0"]).stdout(Stdio::piped()).spawn().expect("the app runs");
    let mut app = Server { child, port: 0 };
    let mut line = String::new();
    BufReader::new(app.child.stdout.take().expect("stdout")).read_line(&mut line).expect("the first line");
    assert!(line.contains("close its window"), "{line:?}");
    let started = std::time::Instant::now();
    let status = loop {
        if let Some(status) = app.child.try_wait().unwrap() {
            break status;
        }
        assert!(started.elapsed().as_secs() < 15, "the window closed and the engine is still running");
        std::thread::sleep(std::time::Duration::from_millis(50));
    };
    assert!(status.success(), "{status}");
    drop(app);
    let _ = std::fs::remove_dir_all(&home);
}

/// Edge hands a launch to the browser already on the profile and ends at once:
/// the stand-in ends as it does, and the `lockfile` is what that browser holds.
#[cfg(windows)]
#[test]
fn the_engine_stays_for_a_window_handed_to_the_browser_on_the_profile() {
    let home = scratch("handed");
    let lock = home.join("Local").join("Glyph").join("window").join("lockfile");
    std::fs::create_dir_all(lock.parent().unwrap()).unwrap();
    std::fs::write(&lock, "").unwrap();
    let child = staged(&home, true).args(["--serve", "--port", "0"]).stdout(Stdio::piped()).spawn().expect("the app runs");
    let mut app = Server { child, port: 0 };
    let mut line = String::new();
    BufReader::new(app.child.stdout.take().expect("stdout")).read_line(&mut line).expect("the first line");
    std::thread::sleep(std::time::Duration::from_secs(2));
    assert!(app.child.try_wait().unwrap().is_none(), "Edge handed the window over and ended, and the window is open");
    std::fs::remove_file(&lock).unwrap();
    let started = std::time::Instant::now();
    let status = loop {
        if let Some(status) = app.child.try_wait().unwrap() {
            break status;
        }
        assert!(started.elapsed().as_secs() < 15, "Edge left the profile and the engine is still running");
        std::thread::sleep(std::time::Duration::from_millis(50));
    };
    assert!(status.success(), "{status}");
    drop(app);
    let _ = std::fs::remove_dir_all(&home);
}

#[cfg(windows)]
#[test]
fn where_edge_is_missing_the_engine_stays_up_for_the_default_browser() {
    let home = scratch("no-edge");
    let child = staged(&home, false).args(["--serve", "--port", "0"]).stdout(Stdio::piped()).spawn().expect("the app runs");
    let mut app = Server { child, port: 0 };
    let mut line = String::new();
    BufReader::new(app.child.stdout.take().expect("stdout")).read_line(&mut line).expect("the first line");
    app.port = line.split("127.0.0.1:").nth(1).and_then(|r| r.split('/').next()).and_then(|p| p.parse().ok())
        .unwrap_or_else(|| panic!("no port in {line:?}"));
    assert!(line.contains("close this window"), "{line:?}");
    std::thread::sleep(std::time::Duration::from_secs(2));
    assert!(app.child.try_wait().unwrap().is_none(), "the browser's opener ended, and the engine stays");
    assert!(http(app.port, "GET", "/", "").0.starts_with("HTTP/1.1 302"));
    drop(app);
    let _ = std::fs::remove_dir_all(&home);
}

#[cfg(windows)]
#[test]
fn the_binary_installs_itself_and_takes_itself_back() {
    let home = scratch("install");
    let local = home.join("Local").join("Programs").join("Glyph");
    let stores = home.join("Roaming").join("Glyph").join("stores");
    let lnk = home.join("Roaming").join("Microsoft").join("Windows").join("Start Menu").join("Programs").join("Glyph.lnk");

    let out = glyph(&home).args(["--install", "--no-register"]).output().unwrap();
    assert!(out.status.success(), "{}", String::from_utf8_lossy(&out.stderr));
    let mut windowed = std::fs::read(env!("CARGO_BIN_EXE_glyph")).unwrap();
    let at = subsystem_at(&windowed);
    assert_eq!(windowed[at], 3, "the binary itself stays a console program, for the CLI");
    windowed[at] = 2;
    assert!(std::fs::read(local.join("glyph.exe")).unwrap() == windowed, "the installed copy is the binary, marked as a Windows program");
    assert!(local.join("glyph.ico").is_file() && lnk.is_file(), "the icon and the shortcut");
    let seeded = std::fs::read_to_string(stores.join("templates.json")).unwrap();
    let repo = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../.guidelines/templates.json");
    assert_eq!(seeded, std::fs::read_to_string(repo).unwrap(), "seeded with the basic templates");

    /* what the user keeps is never overwritten */
    std::fs::write(stores.join("templates.json"), r#"{ "templates": {} }"#).unwrap();
    assert!(glyph(&home).args(["--install", "--no-register"]).output().unwrap().status.success());
    assert_eq!(std::fs::read_to_string(stores.join("templates.json")).unwrap(), r#"{ "templates": {} }"#);

    let out = glyph(&home).args(["--uninstall", "--no-register"]).output().unwrap();
    assert!(out.status.success(), "{}", String::from_utf8_lossy(&out.stderr));
    assert!(!local.join("glyph.exe").exists() && !local.join("glyph.ico").exists() && !lnk.exists(), "everything taken back");
    assert!(stores.join("templates.json").is_file(), "the stores are the user's, and stay");
    let _ = std::fs::remove_dir_all(&home);
}

#[test]
fn a_source_that_spells_an_app_flag_is_still_compiled_after_another_flag() {
    let home = scratch("route");
    let ours = glyph(&home).args(["--xml", "[nt'--serve']"]).output().unwrap();
    assert!(ours.status.success() && String::from_utf8_lossy(&ours.stdout).contains("--serve"),
            "{}", String::from_utf8_lossy(&ours.stderr));
    let _ = std::fs::remove_dir_all(&home);
}
