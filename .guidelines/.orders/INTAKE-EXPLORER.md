# Intake — the Explorer: its shell, its page, and the EMS surface

> **The measured proposal for steps 11 and 12 of the trail to the final Explorer**
> ([`.plan`](../.plan/README.md) §5). The direction is the Regent's of 2026-11-11: the
> final Explorer is the EMS surface in the installed app plus the exit of the JS, the
> page included; the shell goes by a webview crate, Tauri first, so it stops depending
> on Windows and Edge. That crate meets the rule of 2026-09-27 (O7), so this file
> measures every candidate by that rule and drafts the ADR that would amend it for the
> shell, for his signature (the norm of 2026-09-24: an ADR holds when the Regent signs
> it). It opens no Order. Measured at `5685486`.

## 1. The Explorer today

| | |
|---|---|
| the binary | `glyph --serve` answers the page and `POST /engine` from one origin, with no node; `glyph-cli` links no external crate |
| the page | 22 files compiled into the binary (`rust/crates/glyph-cli/src/app.rs`, `PAGE`): the JS engine and its data — `glyph-parser.js`, the 13 core modules and `glyph-data.js` — in 6,130 lines; the interface — `glyph-ui.js`, `glyph-moulds.js`, `glyph-transport.js`, `glyph-zip.js` — in 2,262; the HTML and the CSS in 551 |
| the engine the page uses | the JS in the page by default, and the Rust behind `?engine=relay`, with the engine's tables loaded once (`EMS-002/ORD-0032`) |
| the window | `msedge --app` on a profile of its own, and the engine stops with the last window (`EMS-001/ORD-0014`). Without Edge, the default browser |

## 2. The shell, measured by O7

Each tree as `crate-weight.js --tree` grades it: `cargo tree -e normal,build`, the crate
itself at depth 1. The weight is the sum of the crate archives cargo fetched, compressed;
vendored and unpacked, a tree weighs several times that.

| candidate | Windows | Linux | grade | weight, Windows · Linux |
|---|---|---|---|---|
| `tauri` 2.12.6 | 209 crates, depth 16 | 252 crates, depth 16 | `fix` | 34.2 MB · 18.7 MB |
| `wry` | 37, depth 8 | 99, depth 11 | `fix` | 17.0 · 6.5 |
| `tao` | 60, depth 12 | 116, depth 12 | `fix` | 13.9 · 9.2 |
| `wry` + `tao`, together | 78, depth 12 | 140, depth 12 | `fix` | 20.6 · 10.3 |
| `eframe` 0.37.0, a native UI in place of the page | 179, depth 14 | 280, depth 14 | `fix` | — |
| no crate: a Chromium-family browser in app mode on every system | 0 | 0 | — | — |

A webview also needs the system's own engine: WebView2 on Windows, shipped with 10 and 11;
WebKitGTK on Linux, a system package; WKWebView on macOS.

**What the shell has to do is small.** The engine already serves the page and answers
it, so the shell opens a native window on `http://127.0.0.1:8732/` and nothing more. What
Tauri adds over `wry` and `tao` — its IPC between the page and Rust, its plugins and its
bundler — serves an app whose logic lives in the shell, and here the logic lives in the
engine. **Every candidate with a crate grades `fix`**, so none enters under O7 as it
stands, not even with an ADR: `fix` is refused.

## 3. The ADR, drafted for the Regent's signature

The ladder already names it: M22, the standalone shell, says *"a native shell only by a
signed ADR"*.

> **ADR — the Explorer's shell (draft).** O7 holds for the engine: for every crate the
> engine's binaries link, as `crate-graph.js` and `crate-weight.js --check` hold it today.
> The Explorer's shell is a binary of its own, `glyph-shell`, in a Cargo workspace of its
> own outside `rust/`. Its only work is to open a native window on the page the engine
> serves, and to stop the engine when its last window closes. It links no crate of the
> engine, and the engine links none of its. Its tree is measured by O7 and recorded beside
> this ADR. Its grade does not refuse it: it enters with the crate this ADR names, at an
> exact version, with its `Cargo.lock` committed. A new version, or any other use of a
> webview crate, needs an ADR of its own.

## 4. The page

The page's route out of the JS was left open on 2026-11-11, and a Rust desktop app is
admitted. Measured against §1:

| route | what leaves | what it costs |
|---|---|---|
| **the relay only** | the JS engine and its data, 6,130 lines; the interface stays | the page answers only when the binary serves it: opened from disk, it has no engine |
| **views rendered by the engine** | the relay, and also the interface's own rendering: the engine writes each panel's HTML, and the page fetches and swaps it | a renderer in the engine, beside the four projections; the same views serve the Edge window and the webview |
| **the engine in WebAssembly** | the JS engine, which the Rust replaces inside the page | the `wasm32` target in the toolchain, exports written by hand to stay without crates; the page works from disk again. It is M11b of the [`ladder.toml`](../.plan/ladder.toml), `open`: the twelve functions `glyph-ui.js` calls, answering the same from WASM |
| **a native Rust UI** | the page, whole | `eframe`, `fix` in §2 |

## 5. The EMS surface (step 11)

It starts, loads, edits and emits an EMS or an ORD, shows a series by its title, keeps
the NEM, and puts `repair` and the warning of a path that stopped resolving on the screen
([`INTAKE-PIN-TRAFFIC.md`](INTAKE-PIN-TRAFFIC.md) §2 and §3). It reads what steps 2 to 4
and 8 build — the `EMS.json`, the coherence, `repair`, the traffic — so its measured
proposal waits for them. The Regent's screens of 2026-11-12 are its design input, checked
against the engine, with five open points of their own:
[`.ux/explorer/README.md`](../.ux/explorer/README.md).

## 6. The questions

**S1. The shell.**
- a. `tauri`, the Regent's first candidate
- b. `wry` + `tao`, the two crates Tauri is built on, for a shell that only opens a
  window: 78 crates on Windows against 209
- c. no crate: a Chromium-family browser in app mode on every system, and the default
  browser where none is installed. It no longer depends on Edge, and it still depends
  on a browser

**S2. Where the shell lives**, for S1 a or b.
- a. a binary of its own, `glyph-shell`, in a workspace outside `rust/`, as the ADR of §3
  drafts it: the engine's ruler stays as it is
- b. inside `glyph`, behind a feature: one binary, and O7 amended for the engine itself

**S3. The ADR of §3.**
- a. signed as drafted, naming the crate S1 chose
- b. signed with the crate vendored, as O7 vendors the crates it admits: 20.6 MB
  compressed for S1 b, 34.2 MB for S1 a, on Windows alone
- c. not signed: S1 c

**S4. The page's route.** The four rows of §4.
- a. the relay only, now; views rendered by the engine next, panel by panel
- b. views rendered by the engine, at once
- c. the engine in WebAssembly
- d. a native Rust UI

**The session's recommendation:** S1 b, S2 a, S3 a, S4 a.
- **S1 b** gives the window the Regent asked for with the part of Tauri that opens it.
- **S2 a** keeps the engine's dependency rule exactly where it is.
- **S3 a** pins the tree without carrying it.
- **S4 a** takes 6,130 lines out of the page at the cost of one route, the page opened from disk, which the installed app does not use; it then moves the interface into the engine one panel at a time, each held by the oracle.
