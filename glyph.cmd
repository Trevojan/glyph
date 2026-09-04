@echo off
rem  glyph.cmd — the single click.
rem
rem  The app used to open by double-clicking glyph-engine-alias.html. That stopped
rem  working when the module system moved to ESM: a browser refuses a
rem  `type="module"` script over file:// on CORS, and because the page still draws,
rem  the failure reads as a frozen app rather than as a load error.
rem
rem  Serving is the way in now. This starts the server and opens the browser, so
rem  the cost stays at one click.
cd /d "%~dp0"
node scripts\serve-dev.js
