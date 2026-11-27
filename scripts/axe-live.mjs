// Browser accessibility run: axe-core (WCAG 2.2 A/AA + best-practice) in headless Chromium over a list of URLs,
// light and dark colour scheme, desktop and phone width. No new dependency: Chromium is driven over the DevTools
// protocol with Node's built-in WebSocket; axe-core comes from node_modules.
//   node scripts/axe-live.mjs https://raeservice.mju.ac.th/rae-landing /th/ /en/ /th/news/ ...
// First argument is the origin+base, the rest are paths. Exit 1 when any violation is found.
import { spawn } from "node:child_process";
import { readFileSync, mkdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join } from "node:path";

const [base, ...paths] = process.argv.slice(2);
if (!base || paths.length === 0) {
  console.error("usage: node scripts/axe-live.mjs <origin+base> <path>...");
  process.exit(2);
}
const axeSource = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const PORT = 9300 + Math.floor(Math.random() * 500);
const profile = join(homedir(), `rae-axe-profile-${process.pid}`); // snap Chromium cannot write hidden or /tmp dirs
mkdirSync(profile, { recursive: true });
const chrome = spawn(process.env.CHROME ?? "chromium-browser", ["--headless=new", "--no-sandbox", "--disable-gpu", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
const stop = () => { chrome.kill(); try { rmSync(profile, { recursive: true, force: true }); } catch {} };
process.on("exit", stop);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function connect() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
      const ws = new WebSocket(target.webSocketDebuggerUrl);
      await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
      return ws;
    } catch { await sleep(500); }
  }
  throw new Error("Chromium did not start");
}
const ws = await connect();
let id = 0;
const pending = new Map();
const listeners = [];
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  else listeners.forEach((fn) => fn(msg));
};
const send = (method, params = {}) => new Promise((res) => { const n = ++id; pending.set(n, res); ws.send(JSON.stringify({ id: n, method, params })); });
const loaded = () => new Promise((res) => { const fn = (m) => { if (m.method === "Page.loadEventFired") { listeners.splice(listeners.indexOf(fn), 1); res(); } }; listeners.push(fn); });

await send("Page.enable");
let violations = 0;
let checked = 0;
for (const scheme of ["light", "dark"]) {
  for (const [w, h, label] of [[1280, 900, "desktop"], [375, 800, "phone"]]) {
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }] });
    await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 });
    for (const path of paths) {
      const url = `${base.replace(/\/$/, "")}${path}`;
      const done = loaded();
      await send("Page.navigate", { url });
      await Promise.race([done, sleep(20000)]);
      await sleep(600);
      await send("Runtime.evaluate", { expression: axeSource });
      const result = await send("Runtime.evaluate", {
        expression: `axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice'] } }).then(r => JSON.stringify(r.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0,3).map(n => n.target.join(' ')) }))))`,
        awaitPromise: true, returnByValue: true,
      });
      checked += 1;
      const found = JSON.parse(result.result?.result?.value ?? "[]");
      if (result.result?.exceptionDetails) { console.error(`${scheme}/${label} ${path}: axe could not run`); violations += 1; continue; }
      for (const v of found) {
        violations += 1;
        console.error(`${scheme}/${label} ${path}: [${v.impact}] ${v.id} — ${v.help}\n    ${v.nodes.join("\n    ")}`);
      }
    }
  }
}
ws.close();
stop();
console.log(`axe-live: ${checked} page runs (${paths.length} pages × light/dark × desktop/phone), ${violations} violation(s)`);
process.exit(violations ? 1 : 0);
