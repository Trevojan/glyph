# EMS-001 ORD-0014, the window driven for real: the installed copy in a scratch
# APPDATA and LOCALAPPDATA, real Edge windows on the desktop, and every scenario held
# against what it should do. A window is closed only when it belongs to the app's
# profile or did not exist before the launch that opened it: a title is not enough,
# because the terminal running this script may well carry "glyph" in its own.
#   cargo build --manifest-path rust/Cargo.toml -p glyph-cli
#   powershell -NoProfile -ExecutionPolicy Bypass -File rust/crates/glyph-cli/examples/window_measure.ps1
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path
$home2 = Join-Path ([IO.Path]::GetTempPath()) ("glyph-window-" + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Force "$home2\Roaming", "$home2\Local" | Out-Null
$env:APPDATA = "$home2\Roaming"
$env:LOCALAPPDATA = "$home2\Local"
$installed = "$home2\Local\Programs\Glyph\glyph.exe"
$profile2 = "$home2\Local\Glyph\window"
$lnk = "$home2\Roaming\Microsoft\Windows\Start Menu\Programs\Glyph.lnk"

Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Text;
public static class W {
    public delegate bool Cb(IntPtr h, IntPtr l);
    [StructLayout(LayoutKind.Sequential)] public struct R { public int L, T, Rt, B; }
    [DllImport("user32.dll")] public static extern bool EnumWindows(Cb cb, IntPtr l);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out R r);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
    [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr dc, uint flags);
    public static List<IntPtr> Of(uint target) {
        var r = new List<IntPtr>();
        EnumWindows((h, l) => { uint p; GetWindowThreadProcessId(h, out p); if (p == target && IsWindowVisible(h)) r.Add(h); return true; }, IntPtr.Zero);
        return r;
    }
    public static List<IntPtr> All() {
        var r = new List<IntPtr>();
        EnumWindows((h, l) => { if (IsWindowVisible(h)) r.Add(h); return true; }, IntPtr.Zero);
        return r;
    }
    public static List<IntPtr> NewSince(List<IntPtr> before) {
        var r = new List<IntPtr>();
        foreach (var h in All()) if (!before.Contains(h)) r.Add(h);
        return r;
    }
    public static string Title(IntPtr h) { var s = new StringBuilder(256); GetWindowText(h, s, 256); return s.ToString(); }
    public static void Shot(IntPtr h, string path) {
        R r; GetWindowRect(h, out r);
        using (var b = new Bitmap(Math.Max(1, r.Rt - r.L), Math.Max(1, r.B - r.T)))
        using (var g = Graphics.FromImage(b)) {
            var dc = g.GetHdc(); PrintWindow(h, dc, 2); g.ReleaseHdc(dc);
            b.Save(path, System.Drawing.Imaging.ImageFormat.Png);
        }
    }
}
'@ -ReferencedAssemblies System.Drawing

$script:failed = 0
function Expect($label, $ok, $detail) {
    if ($ok) { "  ok    $label  [$detail]" } else { $script:failed++; "  FAIL  $label  [$detail]" }
}
function Procs($like) { @(Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like "*$like*" }) }
function Browser($like) { Procs $like | Where-Object { $_.CommandLine -notlike '*--type=*' } }
function Engine { @(Get-CimInstance Win32_Process -Filter "Name='glyph.exe'" | Where-Object { $_.ExecutablePath -eq $installed }) }
function Wait-Until($seconds, [scriptblock]$cond) {
    $sw = [Diagnostics.Stopwatch]::StartNew()
    while ($sw.Elapsed.TotalSeconds -lt $seconds) { if (& $cond) { return [int]$sw.Elapsed.TotalMilliseconds }; Start-Sleep -Milliseconds 50 }
    return -1
}
function AppWindows { $r = @(); foreach ($b in (Browser $profile2)) { foreach ($h in [W]::Of([uint32]$b.ProcessId)) { if ([W]::Title($h) -like 'Glyph*') { $r += $h } } }; $r }
function CloseWindows { foreach ($b in (Browser $profile2)) { foreach ($h in [W]::Of([uint32]$b.ProcessId)) { [void][W]::PostMessage($h, 0x10, [IntPtr]::Zero, [IntPtr]::Zero) } } }

try {
    "== install"
    & "$repo\rust\target\debug\glyph.exe" --install --no-register
    Expect 'install exits 0' ($LASTEXITCODE -eq 0) "exit=$LASTEXITCODE"
    $b = [IO.File]::ReadAllBytes($installed); $at = [BitConverter]::ToInt32($b, 0x3c) + 0x5c
    $s = [IO.File]::ReadAllBytes("$repo\rust\target\debug\glyph.exe")
    Expect 'the installed copy is a Windows program, the binary a console one' ($b[$at] -eq 2 -and $s[$at] -eq 3) "installed=$($b[$at]) binary=$($s[$at])"

    "== 1. opened by the shortcut"
    Start-Process -FilePath $lnk
    # the first window takes under 1 s, and took 19 s and over 20 s in two runs: the cause is not measured
    $ms = Wait-Until 60 { @(AppWindows).Count -ge 1 }
    Expect 'a window opens' ($ms -ge 0) "$ms ms"
    $e = @(Engine)
    Expect 'one engine' ($e.Count -eq 1) "engines=$($e.Count) cmd=$($e[0].CommandLine -replace [regex]::Escape($home2), '<scratch>')"
    Expect 'the profile holds its lockfile while Edge runs' (Test-Path "$profile2\lockfile") "$profile2\lockfile".Replace($home2, '<scratch>')
    $hosts = @(Get-CimInstance Win32_Process -Filter "Name='conhost.exe' OR Name='OpenConsole.exe' OR Name='cmd.exe'" | Where-Object { $_.ParentProcessId -eq $e[0].ProcessId })
    Expect 'no console under the engine' ($hosts.Count -eq 0) "consoles=$($hosts.Count)"
    $engineWindows = @([W]::Of([uint32]$e[0].ProcessId)).Count
    Expect 'the engine has no visible window' ($engineWindows -eq 0) "windows=$engineWindows"
    foreach ($h in (AppWindows)) { "  window '$([W]::Title($h))'" }
    Start-Sleep -Seconds 2
    [W]::Shot(@(AppWindows)[0], "$home2\window.png")
    $flags = (Browser $profile2)[0].CommandLine
    Expect 'Edge runs as an app on a profile of its own' ($flags -like '*--app=*' -and $flags -like "*--user-data-dir=$profile2*") ($flags -replace [regex]::Escape($home2), '<scratch>')

    "== 2. a second launch adds a window, and the engine waits for the last one"
    Start-Process -FilePath $lnk
    $ms = Wait-Until 15 { @(AppWindows).Count -ge 2 }
    Expect 'a second window opens' ($ms -ge 0) "$ms ms; browsers on the profile=$(@(Browser $profile2).Count)"
    $ms = Wait-Until 10 { @(Engine).Count -eq 1 }
    Expect 'the second launch ends, one engine stays' ($ms -ge 0) "$ms ms; engines=$(@(Engine).Count)"
    [void][W]::PostMessage(@(AppWindows)[0], 0x10, [IntPtr]::Zero, [IntPtr]::Zero)
    [void](Wait-Until 5 { @(AppWindows).Count -le 1 })
    Start-Sleep -Seconds 1
    Expect 'one window closed, the engine stays' (@(AppWindows).Count -eq 1 -and @(Engine).Count -eq 1) "windows=$(@(AppWindows).Count) engines=$(@(Engine).Count)"

    "== 3. the last window closes"
    CloseWindows
    $ms = Wait-Until 15 { @(Engine).Count -eq 0 }
    Expect 'the engine stops with the last window' ($ms -ge 0) "$ms ms"
    [void](Wait-Until 10 { @(Procs $profile2).Count -eq 0 })
    Expect 'no Edge left on the profile' (@(Procs $profile2).Count -eq 0) "left=$(@(Procs $profile2).Count)"
    Expect 'and the lockfile goes with it' (-not (Test-Path "$profile2\lockfile")) "exists=$(Test-Path "$profile2\lockfile")"

    "== 4. no argument: the installed copy itself, double-clicked"
    Start-Process -FilePath $installed
    $ms = Wait-Until 20 { @(AppWindows).Count -ge 1 }
    Expect 'a window opens' ($ms -ge 0) "$ms ms; engines=$(@(Engine).Count)"
    [void](Wait-Until 10 { $w = @(AppWindows); $w.Count -ge 1 -and [W]::Title($w[0]) -like 'Glyph*' })
    CloseWindows
    $ms = Wait-Until 15 { @(Engine).Count -eq 0 }
    Expect 'the engine stops with it' ($ms -ge 0) "$ms ms"
    [void](Wait-Until 10 { @(Procs $profile2).Count -eq 0 })

    "== 5. the engine dies with the window open, and the shortcut runs again"
    Start-Process -FilePath $lnk
    [void](Wait-Until 20 { @(AppWindows).Count -ge 1 })
    Start-Sleep -Seconds 1
    Stop-Process -Id (Engine)[0].ProcessId -Force
    [void](Wait-Until 5 { @(Engine).Count -eq 0 })
    Start-Process -FilePath $lnk
    Start-Sleep -Seconds 3
    Expect 'Edge hands the window to the browser on the profile, and the engine stays for it' (@(AppWindows).Count -ge 1 -and @(Engine).Count -eq 1) "windows=$(@(AppWindows).Count) engines=$(@(Engine).Count)"
    CloseWindows
    [void](Wait-Until 10 { @(Procs $profile2).Count -eq 0 })
    $ms = Wait-Until 10 { @(Engine).Count -eq 0 }
    Expect 'every window closed, the engine stops' ($ms -ge 0 -and @(Procs $profile2).Count -eq 0) "$ms ms; edge left=$(@(Procs $profile2).Count)"
    Start-Process -FilePath $lnk
    [void](Wait-Until 20 { @(AppWindows).Count -ge 1 })
    Start-Sleep -Seconds 1
    Expect 'with every window closed, the shortcut opens it again' (@(AppWindows).Count -ge 1 -and @(Engine).Count -eq 1) "windows=$(@(AppWindows).Count) engines=$(@(Engine).Count)"
    CloseWindows
    $ms = Wait-Until 15 { @(Engine).Count -eq 0 }
    Expect 'the engine stops with it' ($ms -ge 0) "$ms ms"
    [void](Wait-Until 10 { @(Procs $profile2).Count -eq 0 })

    "== 6. Edge missing, the installed copy: the default browser, a stand-in here, and a console"
    $real86 = ${env:ProgramFiles(x86)}; $real = $env:ProgramFiles
    ${env:ProgramFiles(x86)} = "$home2\no-edge"; $env:ProgramFiles = "$home2\no-edge"
    Copy-Item "$env:SystemRoot\System32\whoami.exe" "$home2\Local\Programs\Glyph\rundll32.exe"
    $before = [W]::All()
    Start-Process -FilePath $installed -ArgumentList '--serve'
    ${env:ProgramFiles(x86)} = $real86; $env:ProgramFiles = $real
    [void](Wait-Until 10 { @(Engine).Count -ge 1 })
    Start-Sleep -Seconds 2
    $e = @(Engine)
    Expect 'one engine, with no Edge' ($e.Count -eq 1) "engines=$($e.Count); edge on the profile=$(@(Procs $profile2).Count)"
    $cmd = @(Get-CimInstance Win32_Process -Filter "Name='cmd.exe'" | Where-Object { $_.ParentProcessId -eq $e[0].ProcessId })
    Expect 'a cmd under the engine holds it up' ($cmd.Count -eq 1) "cmd=$($cmd.Count)"
    $fresh = @([W]::NewSince($before) | Where-Object { [W]::Title($_) -like '*Glyph*' })
    if ($fresh.Count -ge 1) {
        "  console window: '$([W]::Title($fresh[0]))'"
        [W]::Shot($fresh[0], "$home2\console.png")
        [void][W]::PostMessage($fresh[0], 0x10, [IntPtr]::Zero, [IntPtr]::Zero)
        $how = 'WM_CLOSE to the new window'
    } else {
        "  no new window with Glyph in its title: the console went to a tab of a terminal already open"
        Stop-Process -Id $cmd[0].ProcessId -Force
        $how = 'the cmd ended by its PID'
    }
    $ms = Wait-Until 10 { @(Engine).Count -eq 0 }
    Expect 'the console closed, the engine stops' ($ms -ge 0) "$ms ms, by $how"
} finally {
    "== cleanup"
    foreach ($e in (Engine)) { Stop-Process -Id $e.ProcessId -Force }
    CloseWindows
    [void](Wait-Until 10 { @(Procs $profile2).Count -eq 0 })
    # Edge starts a browser of its own on the default profile, which LOCALAPPDATA puts in the scratch folder here
    Procs $home2 | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    "left: engines=$(@(Engine).Count) edge in the scratch folder=$(@(Procs $home2).Count)"
    "the screenshots: $home2"
    "failed: $script:failed"
}
exit $script:failed
