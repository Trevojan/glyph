//! EMS-001 ORD-0013, path A of the measured installer paths: the binary is the
//! app and its own installer.
//!
//! `glyph --serve` answers the page and its scripts out of the binary, and
//! `POST /engine` with the engine, on its own localhost origin, so no node runs
//! anywhere. The port is fixed, 8732, because the page keeps the user's moulds
//! in the browser's storage, and that storage belongs to an origin, port
//! included. `--port N` moves it, and `--port 0` takes any free port and prints
//! it, for the tests.
//!
//! The engine answers with the stores of the user's machine,
//! `%APPDATA%\Glyph\stores\`, when they are there, and with the repository's
//! otherwise. `glyph --install` seeds that folder with the repository's stores,
//! the basic templates for examples, and never overwrites a store a user
//! already holds (question 11 of the return). It copies the binary to
//! `%LOCALAPPDATA%\Programs\Glyph\`, writes a Start-menu shortcut that runs
//! `--serve`, and writes the uninstall entry under `HKCU` with `reg.exe`.
//! `--uninstall` takes all of that back and leaves the stores, which are the
//! user's. `--no-register` leaves the registry alone, for the tests, and
//! `--no-open` leaves the browser closed.
//!
//! Run with no argument from a console, as a double-click does, the binary
//! installs itself when it is not the installed copy, and then serves.

use glyph_stores::{Context, Value};
use glyph_util::json::{self, Json};
use std::io::{BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Arc;

pub const PORT: u16 = 8732;
const ENTRY: &str = "/glyph-engine-alias.html?engine=relay";

macro_rules! page {
    ($($path:literal),* $(,)?) => {
        &[$(($path, include_bytes!(concat!("../../../../", $path)) as &[u8])),*]
    };
}

/// The page and every script it loads, as the repository holds them.
pub const PAGE: &[(&str, &[u8])] = page!(
    "glyph-engine-alias.html",
    "glyph-engine.css",
    ".scope/asset/favicon.ico",
    "scripts/glyph-data.js",
    "scripts/glyph-moulds.js",
    "scripts/glyph-parser.js",
    "scripts/glyph-transport.js",
    "scripts/glyph-ui.js",
    "scripts/glyph-zip.js",
    "scripts/core/burn.js",
    "scripts/core/emit-ast.js",
    "scripts/core/emit-xml.js",
    "scripts/core/inverse.js",
    "scripts/core/lexer.js",
    "scripts/core/logic.js",
    "scripts/core/parser.js",
    "scripts/core/rules.js",
    "scripts/core/stores.js",
    "scripts/core/templates.js",
    "scripts/core/util.js",
    "scripts/core/version.js",
    "scripts/core/vocabulary.js",
);

/// The stores the installer seeds: the repository's, the basic ones.
const SEED: &[(&str, &str)] = &[
    ("templates.json", include_str!("../../../../.guidelines/templates.json")),
    ("rules.json", include_str!("../../../../.guidelines/rules.json")),
    ("expansions.json", include_str!("../../../../.guidelines/expansions.json")),
];

fn content_type(path: &str) -> &'static str {
    match path.rsplit('.').next() {
        Some("html") => "text/html; charset=utf-8",
        Some("css") => "text/css; charset=utf-8",
        Some("js") => "text/javascript; charset=utf-8",
        Some("ico") => "image/x-icon",
        _ => "application/octet-stream",
    }
}

fn value(j: Json) -> Value {
    match j {
        Json::Null => Value::Null,
        Json::Bool(b) => Value::Bool(b),
        Json::Num(n) => Value::Num(n),
        Json::Str(s) => Value::Str(s),
        Json::Arr(a) => Value::Arr(a.into_iter().map(value).collect()),
        Json::Obj(kv) => Value::Obj(kv.into_iter().map(|(k, v)| (k, value(v))).collect()),
    }
}

fn env_dir(name: &str) -> Option<PathBuf> {
    std::env::var_os(name).filter(|v| !v.is_empty()).map(PathBuf::from)
}

/// `%APPDATA%\Glyph\stores`, where what a user keeps lives.
pub fn stores_dir() -> Option<PathBuf> {
    env_dir("APPDATA").or_else(|| env_dir("XDG_CONFIG_HOME")).map(|d| d.join("Glyph").join("stores"))
}

/// The machine's stores when the folder holds them, else the repository's.
/// A store that does not read is an error to say, never a store to guess.
pub fn machine_context() -> Result<Context, String> {
    let Some(dir) = stores_dir().filter(|d| d.join("templates.json").is_file()) else {
        return Ok(Context::repository().clone());
    };
    let read = |name: &str| -> Result<Option<Value>, String> {
        let p = dir.join(name);
        if !p.is_file() {
            return Ok(None);
        }
        let text = std::fs::read_to_string(&p).map_err(|e| format!("{}: {e}", p.display()))?;
        json::parse(&text).map(|j| Some(value(j))).map_err(|e| format!("{}: {e}", p.display()))
    };
    Ok(Context::new(read("templates.json")?, read("rules.json")?, read("expansions.json")?))
}

fn respond(out: &mut TcpStream, status: &str, ctype: &str, body: &[u8]) -> std::io::Result<()> {
    /* one write: a head and a body in two would wait on the peer's delayed ACK */
    let mut whole = format!("HTTP/1.1 {status}\r\nContent-Type: {ctype}\r\nContent-Length: {}\r\nCache-Control: no-store\r\n\r\n",
                            body.len()).into_bytes();
    whole.extend_from_slice(body);
    out.write_all(&whole)
}

fn connection(stream: TcpStream, ctx: Arc<Context>) {
    let Ok(read_half) = stream.try_clone() else { return };
    let mut reader = BufReader::new(read_half);
    let mut out = stream;
    let _ = out.set_nodelay(true);
    loop {
        let mut line = String::new();
        if reader.read_line(&mut line).unwrap_or(0) == 0 {
            break;
        }
        let mut parts = line.split_whitespace();
        let (method, target) = (parts.next().unwrap_or(""), parts.next().unwrap_or("/"));
        let mut len = 0;
        loop {
            let mut h = String::new();
            if reader.read_line(&mut h).unwrap_or(0) == 0 || h.trim_end().is_empty() {
                break;
            }
            if let Some((k, v)) = h.split_once(':') {
                if k.eq_ignore_ascii_case("content-length") {
                    len = v.trim().parse().unwrap_or(0);
                }
            }
        }
        let mut body = vec![0; len];
        if reader.read_exact(&mut body).is_err() {
            break;
        }
        let path = target.split(['?', '#']).next().unwrap_or("/");
        let sent = match (method, path) {
            ("POST", "/engine") => {
                let a = glyph_protocol::answer_in(&ctx, &String::from_utf8_lossy(&body));
                respond(&mut out, "200 OK", "application/json; charset=utf-8", a.as_bytes())
            }
            ("GET", "/") => {
                let head = format!("HTTP/1.1 302 Found\r\nLocation: {ENTRY}\r\nContent-Length: 0\r\n\r\n");
                out.write_all(head.as_bytes())
            }
            ("GET", p) => match PAGE.iter().find(|(name, _)| p.strip_prefix('/') == Some(*name)) {
                Some((name, bytes)) => respond(&mut out, "200 OK", content_type(name), bytes),
                None => respond(&mut out, "404 Not Found", "text/plain; charset=utf-8", b"not part of the app"),
            },
            _ => respond(&mut out, "405 Method Not Allowed", "text/plain; charset=utf-8", b"GET or POST /engine"),
        };
        if sent.is_err() {
            break;
        }
    }
}

fn open_browser(url: &str) {
    let r = if cfg!(windows) {
        Command::new("rundll32").args(["url.dll,FileProtocolHandler", url]).spawn()
    } else if cfg!(target_os = "macos") {
        Command::new("open").arg(url).spawn()
    } else {
        Command::new("xdg-open").arg(url).spawn()
    };
    if r.is_err() {
        println!("open {url} in a browser");
    }
}

/// An engine of this app already holds the port: it answers a request.
fn already_serving(port: u16) -> bool {
    let Ok(mut s) = TcpStream::connect(("127.0.0.1", port)) else { return false };
    let q = r#"{"call":"freeVars","raw":"x"}"#;
    let req = format!("POST /engine HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{q}", q.len());
    let mut got = String::new();
    s.write_all(req.as_bytes()).is_ok() && s.read_to_string(&mut got).is_ok() && got.contains("\"ok\"")
}

pub fn serve(port: u16, open: bool) -> i32 {
    let ctx = match machine_context() {
        Ok(c) => Arc::new(c),
        Err(e) => {
            eprintln!("the stores of this machine do not read: {e}");
            return 1;
        }
    };
    let listener = match TcpListener::bind(("127.0.0.1", port)) {
        Ok(l) => l,
        Err(_) if port != 0 && already_serving(port) => {
            if open {
                open_browser(&format!("http://127.0.0.1:{port}{ENTRY}"));
            }
            println!("Glyph is already running at http://127.0.0.1:{port}/");
            return 0;
        }
        Err(e) => {
            eprintln!("port {port}: {e}");
            return 1;
        }
    };
    let bound = listener.local_addr().map(|a| a.port()).unwrap_or(port);
    let url = format!("http://127.0.0.1:{bound}/");
    println!("Glyph is running at {url} — close this window to stop it");
    let _ = std::io::stdout().flush();
    if open {
        open_browser(&format!("http://127.0.0.1:{bound}{ENTRY}"));
    }
    for stream in listener.incoming().flatten() {
        let ctx = Arc::clone(&ctx);
        /* a browser holds up to six connections to one origin; each thread
           gets the main thread's stack, which the engine runs on */
        let _ = std::thread::Builder::new().stack_size(8 << 20).spawn(move || connection(stream, ctx));
    }
    0
}

/* ---------------------------------------------------------------- *
 * the installer
 * ---------------------------------------------------------------- */

pub struct Places {
    pub dir: PathBuf,
    pub exe: PathBuf,
    pub icon: PathBuf,
    pub shortcut: Option<PathBuf>,
    pub stores: PathBuf,
}

pub fn places() -> Result<Places, String> {
    let local = env_dir("LOCALAPPDATA").ok_or("LOCALAPPDATA is not set")?;
    let dir = local.join("Programs").join("Glyph");
    let shortcut = env_dir("APPDATA").map(|a| a.join("Microsoft").join("Windows").join("Start Menu").join("Programs").join("Glyph.lnk"));
    Ok(Places { exe: dir.join("glyph.exe"), icon: dir.join("glyph.ico"), shortcut,
                stores: stores_dir().ok_or("APPDATA is not set")?, dir })
}

const UNINSTALL_KEY: &str = r"HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\Glyph";

fn ps_quote(p: &Path) -> String {
    format!("'{}'", p.display().to_string().replace('\'', "''"))
}

fn run_quiet(cmd: &mut Command) -> Result<(), String> {
    let out = cmd.output().map_err(|e| e.to_string())?;
    if out.status.success() { Ok(()) } else { Err(String::from_utf8_lossy(&out.stderr).trim().to_string()) }
}

pub fn is_installed_copy() -> bool {
    match (std::env::current_exe(), places()) {
        (Ok(me), Ok(p)) => same_file(&me, &p.exe),
        _ => false,
    }
}

fn same_file(a: &Path, b: &Path) -> bool {
    match (a.canonicalize(), b.canonicalize()) {
        (Ok(x), Ok(y)) => x == y,
        _ => false,
    }
}

pub fn install(register: bool) -> Result<Places, String> {
    let p = places()?;
    std::fs::create_dir_all(&p.dir).map_err(|e| format!("{}: {e}", p.dir.display()))?;
    let me = std::env::current_exe().map_err(|e| e.to_string())?;
    if !same_file(&me, &p.exe) {
        std::fs::copy(&me, &p.exe).map_err(|e| format!("{}: {e}", p.exe.display()))?;
    }
    let icon = PAGE.iter().find(|(n, _)| n.ends_with("favicon.ico")).map(|(_, b)| *b).unwrap_or_default();
    std::fs::write(&p.icon, icon).map_err(|e| format!("{}: {e}", p.icon.display()))?;
    std::fs::create_dir_all(&p.stores).map_err(|e| format!("{}: {e}", p.stores.display()))?;
    for (name, text) in SEED {
        let f = p.stores.join(name);
        if !f.exists() {
            std::fs::write(&f, text).map_err(|e| format!("{}: {e}", f.display()))?;
        }
    }
    if let Some(lnk) = &p.shortcut {
        if let Some(parent) = lnk.parent() {
            std::fs::create_dir_all(parent).map_err(|e| format!("{}: {e}", parent.display()))?;
        }
        let script = format!(
            "$s = (New-Object -ComObject WScript.Shell).CreateShortcut({}); $s.TargetPath = {}; $s.Arguments = '--serve'; \
             $s.WorkingDirectory = {}; $s.IconLocation = {}; $s.Description = 'Glyph'; $s.Save()",
            ps_quote(lnk), ps_quote(&p.exe), ps_quote(&p.dir), ps_quote(&p.icon));
        run_quiet(Command::new("powershell").args(["-NoProfile", "-NonInteractive", "-Command", &script]))
            .map_err(|e| format!("the Start-menu shortcut: {e}"))?;
    }
    if register {
        let exe = p.exe.display().to_string();
        let uninstall = format!("\"{exe}\" --uninstall");
        for (name, data) in [("DisplayName", "Glyph"), ("DisplayVersion", glyph_version::VERSION),
                             ("Publisher", "Glyph"), ("InstallLocation", &p.dir.display().to_string()),
                             ("DisplayIcon", &p.icon.display().to_string()), ("UninstallString", &uninstall)] {
            run_quiet(Command::new("reg").args(["add", UNINSTALL_KEY, "/v", name, "/t", "REG_SZ", "/d", data, "/f"]))
                .map_err(|e| format!("the uninstall entry: {e}"))?;
        }
        for name in ["NoModify", "NoRepair"] {
            run_quiet(Command::new("reg").args(["add", UNINSTALL_KEY, "/v", name, "/t", "REG_DWORD", "/d", "1", "/f"]))
                .map_err(|e| format!("the uninstall entry: {e}"))?;
        }
    }
    Ok(p)
}

pub fn uninstall(register: bool) -> Result<Places, String> {
    let p = places()?;
    if let Some(lnk) = &p.shortcut {
        if lnk.exists() {
            std::fs::remove_file(lnk).map_err(|e| format!("{}: {e}", lnk.display()))?;
        }
    }
    if register {
        let _ = run_quiet(Command::new("reg").args(["delete", UNINSTALL_KEY, "/f"]));
    }
    if p.icon.exists() {
        std::fs::remove_file(&p.icon).map_err(|e| format!("{}: {e}", p.icon.display()))?;
    }
    let me = std::env::current_exe().map_err(|e| e.to_string())?;
    if same_file(&me, &p.exe) {
        /* a running binary cannot remove itself: a shell does it once this one has ended */
        let line = format!("ping -n 3 127.0.0.1 >nul & del /f /q \"{}\" & rmdir \"{}\"", p.exe.display(), p.dir.display());
        Command::new("cmd").args(["/c", &line]).spawn().map_err(|e| e.to_string())?;
    } else {
        if p.exe.exists() {
            std::fs::remove_file(&p.exe).map_err(|e| format!("{}: {e}", p.exe.display()))?;
        }
        let _ = std::fs::remove_dir(&p.dir);
    }
    Ok(p)
}

/// The app's flags, when the command line opens with one; `None` hands the
/// command line to the CLI of `glyph-cli.js` unchanged.
pub fn route(argv: &[String]) -> Option<i32> {
    if !matches!(argv.first().map(String::as_str), Some("--serve" | "--install" | "--uninstall")) {
        return None;
    }
    let has = |f: &str| argv.iter().any(|a| a == f);
    let open = !has("--no-open");
    let register = !has("--no-register");
    if has("--install") {
        return Some(match install(register) {
            Ok(p) => {
                println!("Glyph is installed in {}, and its stores are in {}", p.dir.display(), p.stores.display());
                0
            }
            Err(e) => {
                eprintln!("the install stopped: {e}");
                1
            }
        });
    }
    if has("--uninstall") {
        return Some(match uninstall(register) {
            Ok(p) => {
                println!("Glyph is removed; the stores stay in {}, and they are yours", p.stores.display());
                0
            }
            Err(e) => {
                eprintln!("the uninstall stopped: {e}");
                1
            }
        });
    }
    if has("--serve") {
        let port = match argv.iter().position(|a| a == "--port").map(|i| argv.get(i + 1)) {
            None => PORT,
            Some(Some(n)) => match n.parse() {
                Ok(n) => n,
                Err(_) => {
                    eprintln!("--port takes a number, not {n}");
                    return Some(2);
                }
            },
            Some(None) => {
                eprintln!("--port without a number");
                return Some(2);
            }
        };
        return Some(serve(port, open));
    }
    None
}

/// A double-click: install when this is not the installed copy, then serve.
pub fn double_click() -> i32 {
    if !is_installed_copy() {
        match install(true) {
            Ok(p) => println!("Glyph is installed in {}; the Start menu opens it from now on", p.dir.display()),
            Err(e) => {
                eprintln!("the install stopped: {e}");
                return 1;
            }
        }
    }
    serve(PORT, true)
}
