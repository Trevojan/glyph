// EMS-001 ORD-0010, option B's relay: what scripts/serve-dev.js would gain —
// the page's POST written to the engine's stdin as one line, the engine's
// next line answered back. One request in flight at a time, as the engine
// answers in order.
import { spawn } from "node:child_process";
import readline from "node:readline";

export function relay(bin) {
  const child = spawn(bin, [], { stdio: ["pipe", "pipe", "inherit"] });
  const waiting = [];
  readline.createInterface({ input: child.stdout }).on("line", line => waiting.shift()(line));
  const ask = body => new Promise(resolve => { waiting.push(resolve); child.stdin.write(body.replace(/\n/g, " ") + "\n"); });
  const handle = (req, res) => {
    let body = "";
    req.on("data", c => { body += c; });
    req.on("end", () => ask(body).then(line => {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
      res.end(line);
    }));
  };
  return { handle, child };
}
