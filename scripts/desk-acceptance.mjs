// Desk acceptance run: the CMS admin desk (/th|en/cms-admin/) is behind a login and the export build renders it
// as notFound(), so check:a11y, check:contrast and check:export can never see it. This drives the real, logged-in
// desk in headless Chromium over the DevTools protocol and checks what those static gates cannot: that a
// destructive move asks first, that keeping it changes nothing, that confirming says so, that a refused move
// stays on the form after the toast has gone, and that the desk is axe-clean in light and dark with a toast up.
//
//   RAE_CMS_USER=... RAE_CMS_PASSWORD=... node scripts/desk-acceptance.mjs [--base-url http://127.0.0.1:3417]
//   node scripts/desk-acceptance.mjs --dry-run
//
// Credentials come from the environment only and are never printed. Chromium is driven with Node's built-in
// WebSocket and axe-core comes from node_modules, exactly as scripts/axe-live.mjs does: no new dependency.
// Test rows are created through the CMS API with a [acceptance] prefix and removed at the end; audit rows are
// never deleted, and the cleanup reports what it left behind.
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const USAGE = "usage: node scripts/desk-acceptance.mjs [--base-url <url>] [--dry-run]";
export const MARKER = "[acceptance]";
const PNG_1X1 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

// ---- pure helpers: argument parsing, one line per check, the summary line ----

export function parseArgs(argv, env = process.env) {
  const options = { baseUrl: env.DESK_BASE_URL ?? "http://127.0.0.1:3417", api: env.RAE_CMS_API ?? "http://127.0.0.1:3317", dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--base-url") {
      const value = argv[++i];
      if (!value) throw new Error(`--base-url needs a value\n${USAGE}`);
      options.baseUrl = value.replace(/\/$/, "");
    } else throw new Error(`unknown argument ${arg}\n${USAGE}`);
  }
  return options;
}

export function line(result) {
  const tag = result.status === "pass" ? "PASS" : result.status === "skip" ? "SKIP" : "FAIL";
  return `${tag}  ${result.desk.padEnd(13)} ${result.check}${result.detail ? ` — ${result.detail}` : ""}`;
}

// A skipped check is not a pass: it leaves the denominator, so "PASS 12/12 (3 skipped)" still says what ran.
export function summarise(results) {
  const failed = results.filter((r) => r.status === "fail");
  const passed = results.filter((r) => r.status === "pass").length;
  const skipped = results.filter((r) => r.status === "skip").length;
  const total = passed + failed.length;
  return { passed, total, skipped, ok: failed.length === 0, text: `${failed.length ? "FAIL" : "PASS"} ${passed}/${total}${skipped ? ` (${skipped} skipped)` : ""}` };
}

// ---- the desks, and what each one needs to hold a row worth acting on ----

export const DESKS = [
  {
    desk: "documents", section: "documents-desk", path: "/v1/documents", list: "documents", table: "documents", publish: "current",
    seed: (title, at) => ({ category: "administration", titleTh: title, titleEn: title, version: "1.0", storageUrl: "https://maejo365-my.sharepoint.com/personal/acceptance/Documents/acceptance.pdf", note: at }),
  },
  {
    desk: "knowledge", section: "knowledge-desk", path: "/v1/knowledge", list: "entries", table: "knowledge_entries", publish: "published",
    seed: (title) => ({ topic: MARKER, questionTh: title, questionEn: title, answerTh: "acceptance answer", answerEn: "acceptance answer", sortOrder: 999 }),
  },
  {
    desk: "events", section: "events-desk", path: "/v1/events", list: "events", table: "events", publish: "published",
    seed: (title) => ({ titleTh: title, titleEn: title, startsAt: "2027-01-15T09:00:00+07:00", endsAt: "2027-01-15T10:00:00+07:00", locationTh: "RAE", locationEn: "RAE", descriptionTh: "-", descriptionEn: "-" }),
  },
  {
    desk: "announcements", section: "announcements-desk", path: "/v1/announcements", list: "announcements", table: "announcements", publish: "published",
    seed: (title, at) => ({ kind: "banner", titleTh: title, titleEn: title, bodyTh: at, bodyEn: at, startsAt: at, endsAt: new Date(Date.parse(at) + 7 * 86400_000).toISOString() }),
  },
  {
    desk: "departments", section: "departments-desk", path: "/v1/departments", list: "departments", table: "departments", publish: "published",
    seed: (title) => ({ nameTh: title, nameEn: title, descriptionTh: "-", descriptionEn: "-", sortOrder: 999 }),
  },
  {
    desk: "media", section: "media-desk", path: "/v1/media-library", list: "assets", table: "media_assets", publish: "published",
    seed: (title) => ({ titleTh: title, titleEn: title, altTh: "acceptance image", altEn: "acceptance image", captionTh: "-", captionEn: "-", dataBase64: PNG_1X1 }),
  },
  {
    // Personnel has no confirm-gated move: its status is active/inactive and restricted data sits behind a
    // separate, audited panel. The run still proves the row and the toast, and skips the dialog checks.
    desk: "personnel", section: "personnel-desk", path: "/v1/personnel", list: "personnel", table: "personnel", publish: null,
    seed: (title) => ({ prefixTh: "Mr.", firstTh: title, lastTh: "Acceptance", positionTh: "Test", email: "acceptance@example.org", isPublic: true, consent: true }),
  },
];

/** The text a desk prints for a row, so the run can find its own row in the list. */
const titleOf = (desk, row) => String(row.titleTh ?? row.nameTh ?? row.firstTh ?? "");

// ---- page-side helpers, installed in the desk after every navigation ----

const PAGE = `window.__desk = {
  row(section, title) {
    const root = document.getElementById(section);
    if (!root) return null;
    return [...root.querySelectorAll("li")].find((li) => li.textContent.includes(title)) ?? null;
  },
  status(section, title, value) {
    const li = this.row(section, title);
    const select = li && li.querySelector("select");
    if (!select) return "no status select";
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(select, value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return "ok";
  },
  dialog: () => document.querySelector('[role="alertdialog"]'),
  dialogButton(which) {
    const d = this.dialog();
    if (!d) return "no dialog";
    const buttons = [...d.querySelectorAll("button")];
    const target = which === "keep" ? buttons[0] : buttons[buttons.length - 1];
    if (!target) return "no button";
    target.click();
    return "ok";
  },
  toasts: () => [...document.querySelectorAll("[data-sonner-toast]")].map((t) => t.dataset.type || "info"),
  inlineError(section) {
    const root = document.getElementById(section);
    const alert = root && root.querySelector('[role="alert"]');
    return alert ? alert.textContent.trim() : "";
  },
  // A toast on screen without touching anything: the knowledge row's edit form submitted unchanged saves the
  // same values back, which the desk confirms with a toast. Used to hold a toast up while axe runs.
  toastNow(section, title) {
    const li = this.row(section, title);
    const details = li && li.querySelector("details");
    if (!details) return "no details";
    details.open = true;
    const form = details.querySelector("form");
    if (!form) return "no form";
    form.requestSubmit();
    return "ok";
  },
};
"installed"`;

// ---- checks collected in one list so the summary is counted, never guessed ----

const results = [];
function record(status, desk, check, detail) {
  const result = { status, desk, check, detail };
  results.push(result);
  console.log(line(result));
  return status === "pass";
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const user = process.env.RAE_CMS_USER ?? "";
  const password = process.env.RAE_CMS_PASSWORD ?? "";
  const officerUser = process.env.RAE_CMS_OFFICER_USER ?? "";
  const officerPassword = process.env.RAE_CMS_OFFICER_PASSWORD ?? "";

  if (options.dryRun) {
    console.log(`desk-acceptance: dry run against ${options.baseUrl} (api ${options.api})`);
    console.log(`  needs RAE_CMS_USER + RAE_CMS_PASSWORD (publisher), optional RAE_CMS_OFFICER_USER + RAE_CMS_OFFICER_PASSWORD`);
    console.log(`  seeds one ${MARKER} row per desk: ${DESKS.map((d) => d.desk).join(", ")}`);
    console.log("  per desk with a confirm-gated move: dialog appears / keep changes nothing / confirm shows a toast");
    console.log("  then axe WCAG A/AA on the logged-in desk, light and dark, with a toast on screen, in th and en");
    console.log("  then a refused publisher-only move as the officer account: inline error survives the toast");
    console.log("  cleanup removes every seeded row (audit rows are never deleted) and reports what is left");
    return 0;
  }

  if (!user || !password) {
    console.error("desk-acceptance: set RAE_CMS_USER and RAE_CMS_PASSWORD to a desk account (publisher role)");
    return 2;
  }

  const axeSource = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
  const stamp = new Date().toISOString().slice(0, 16);
  const titles = Object.fromEntries(DESKS.map((desk) => [desk.section, `${MARKER} ${desk.desk} ${stamp}`]));
  const created = [];   // { desk, code } — what cleanup must remove
  let token = "";

  const api = async (path, { method = "GET", body, as = token } = {}) => {
    const response = await fetch(`${options.api}${path}`, {
      method,
      headers: { "content-type": "application/json", ...(as ? { authorization: `Bearer ${as}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { ok: response.ok, status: response.status, payload: await response.json().catch(() => ({})) };
  };
  const listRows = async (desk) => {
    const result = await api(desk.path);
    return result.ok ? (result.payload[desk.list] ?? []) : [];
  };

  // ---- seed through the API, so every row has a known code to delete later ----
  const login = await api("/v1/login", { method: "POST", body: { userId: user, password } });
  if (!login.ok || !login.payload.token) {
    console.error(`desk-acceptance: login as ${user} failed with ${login.status} (${String(login.payload.error ?? "no token")})`);
    return 2;
  }
  token = String(login.payload.token);
  for (const desk of DESKS) {
    const seeded = await api(desk.path, { method: "POST", body: desk.seed(titles[desk.section], new Date().toISOString()) });
    if (!seeded.ok) {
      record("fail", desk.desk, "seed a test row", `POST ${desk.path} -> ${seeded.status} ${String(seeded.payload.message ?? "")}`);
      continue;
    }
    created.push({ desk: desk.desk, code: seeded.payload.code ?? seeded.payload.id });
  }
  // The officer's refusal needs its own draft document: publishing the walk's row would hide it.
  const refused = await api("/v1/documents", { method: "POST", body: DESKS[0].seed(titles["documents-desk"], new Date().toISOString()) });
  if (refused.ok) created.push({ desk: "documents", code: refused.payload.code });

  // ---- the browser ----
  const chrome = launch();
  try {
    const { evaluate, send, goto, waitFor } = chrome;
    await send("Page.enable");

    const signIn = async (userId, secret) => {
      await goto(options.baseUrl + "/en/cms-admin/");
      await waitFor(`document.querySelector("#userId") !== null`, 60000);
      // The local form sits in a <details> that starts closed when the runtime offers MJU SSO.
      await evaluate(`(() => { const d = document.querySelector("details"); if (d) d.open = true; return true; })()`);
      await evaluate(`document.querySelector("#userId").focus()`);
      await send("Input.insertText", { text: userId });
      await evaluate(`document.querySelector("#password").focus()`);
      await send("Input.insertText", { text: secret });
      await evaluate(`document.querySelector("form").requestSubmit()`);
      if (!await waitFor(`document.querySelector("#userId") === null`, 20000)) throw new Error(`sign-in as ${userId} did not reach the desk`);
      await evaluate(PAGE);
      return waitFor(`!!document.getElementById("documents-desk")`, 30000);
    };

    await signIn(user, password);
    for (const desk of DESKS) {
      const section = desk.section;
      const title = titles[section];
      const code = created.find((row) => row.desk === desk.desk)?.code;
      const statusOf = async () => {
        const rows = await listRows(desk);
        return rows.find((row) => row.code === code)?.status ?? "missing";
      };
      const found = await waitFor(`!!window.__desk.row(${JSON.stringify(section)}, ${JSON.stringify(title)})`, 15000);
      if (!record(found ? "pass" : "fail", desk.desk, "the seeded row is on the desk")) continue;

      if (!desk.publish) {
        record("skip", desk.desk, "confirm dialog before a destructive move", "this desk has no confirm-gated move");
        const changed = await evaluate(`__desk.status(${JSON.stringify(section)}, ${JSON.stringify(title)}, "inactive")`);
        const toasted = changed === "ok" && await waitFor(`__desk.toasts().length > 0`, 10000);
        record(toasted && (await statusOf()) === "inactive" ? "pass" : "fail", desk.desk, "a status change confirms itself with a toast");
        await api(`${desk.path}/${code}`, { method: "PATCH", body: { status: "active" } });
        continue;
      }

      await evaluate(`__desk.status(${JSON.stringify(section)}, ${JSON.stringify(title)}, ${JSON.stringify(desk.publish)})`);
      const asked = await waitFor(`!!__desk.dialog()`, 10000);
      record(asked ? "pass" : "fail", desk.desk, `confirm dialog before going ${desk.publish}`);

      if (asked) {
        await evaluate(`__desk.dialogButton("keep")`);
        const closed = await waitFor(`!__desk.dialog()`, 10000);
        const untouched = (await statusOf()) !== desk.publish;
        record(closed && untouched ? "pass" : "fail", desk.desk, "keep leaves the record unchanged", closed ? (untouched ? "" : `status is already ${desk.publish}`) : "the dialog stayed open");
      }

      await evaluate(`__desk.status(${JSON.stringify(section)}, ${JSON.stringify(title)}, ${JSON.stringify(desk.publish)})`);
      if (!await waitFor(`!!__desk.dialog()`, 10000)) {
        record("fail", desk.desk, "confirming shows a success toast", "no dialog to confirm");
        continue;
      }
      await evaluate(`__desk.dialogButton("confirm")`);
      const toasted = await waitFor(`__desk.toasts().includes("success")`, 15000);
      let published = false;
      for (let i = 0; i < 20 && !published; i += 1) {
        published = (await statusOf()) === desk.publish;
        if (!published) await new Promise((r) => setTimeout(r, 250));
      }
      record(toasted && published ? "pass" : "fail", desk.desk, "confirming shows a success toast", toasted ? "" : "no success toast appeared");
    }

    // ---- axe on the desk a reader actually sees, light and dark, with a toast on screen ----
    for (const locale of ["th", "en"]) {
      await signIn(user, password);
      for (const scheme of ["light", "dark"]) {
        await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }] });
        await evaluate(`__desk.toastNow("knowledge-desk", ${JSON.stringify(titles["knowledge-desk"])})`);
        const up = await waitFor(`__desk.toasts().length > 0`, 10000);
        if (!up) record("fail", "axe", `${locale}/${scheme}: a toast is on screen`, "no toast appeared");
        await evaluate(axeSource);
        const found = await evaluate(`axe.run(document, { runOnly: { type: "tag", values: ${JSON.stringify(AXE_TAGS)} } }).then((r) => JSON.stringify(r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) }))))`);
        const violations = JSON.parse(found ?? "[]");
        record(violations.length === 0 ? "pass" : "fail", "axe", `${locale}/${scheme}: WCAG A/AA with a toast on screen`, violations.length === 0 ? "" : `${violations.length} violation(s)`);
        for (const violation of violations) console.log(`      [${violation.impact}] ${violation.id} — ${violation.help}\n        ${violation.nodes.join("\n        ")}`);
      }
    }

    // ---- a refused move is a persistent, inline failure, not just a toast that fades ----
    if (!officerUser || !officerPassword) {
      record("skip", "refusal", "an officer's publisher-only move stays on the form", "set RAE_CMS_OFFICER_USER and RAE_CMS_OFFICER_PASSWORD to run it");
    } else {
      await signIn(officerUser, officerPassword);
      const title = titles["documents-desk"];
      const found = await waitFor(`!!window.__desk.row("documents-desk", ${JSON.stringify(title)})`, 15000);
      if (!found) {
        record("fail", "refusal", "the officer sees the seeded document row");
      } else {
        await evaluate(`__desk.status("documents-desk", ${JSON.stringify(title)}, "current")`);
        if (await waitFor(`!!__desk.dialog()`, 10000)) await evaluate(`__desk.dialogButton("confirm")`);
        const shown = await waitFor(`__desk.inlineError("documents-desk") !== ""`, 10000);
        record(shown ? "pass" : "fail", "refusal", "a refused publish surfaces an inline error");
        // The toast fades on its own; the error is what stays. Wait it out, then look again.
        await waitFor(`__desk.toasts().length === 0`, 15000);
        const still = await evaluate(`__desk.inlineError("documents-desk")`);
        record(still ? "pass" : "fail", "refusal", "the inline error outlives the toast", still ? "" : "the error cleared with the toast");
        const untouched = (await api("/v1/documents")).payload.documents?.find((row) => row.code === refused.payload?.code)?.status;
        record(untouched === "draft" ? "pass" : "fail", "refusal", "the refused move left the record a draft", `status is ${untouched}`);
      }
    }
  } finally {
    chrome.stop();
  }

  // ---- cleanup: seeded rows and their media files, never the audit trail ----
  const marked = [];
  for (const desk of DESKS) {
    for (const row of await listRows(desk)) if (titleOf(desk, row).startsWith(MARKER)) marked.push({ desk, code: row.code });
  }
  const db = process.env.RAE_CMS_DB_HOST
    ? { host: process.env.RAE_CMS_DB_HOST, port: Number(process.env.RAE_CMS_DB_PORT ?? 3306), user: process.env.RAE_CMS_DB_USER ?? "", password: process.env.RAE_CMS_DB_PASSWORD ?? "", database: process.env.RAE_CMS_DB_NAME ?? "rae_cms" }
    : null;
  if (db) {
    const { default: mysql } = await import("mysql2/promise");
    const pool = await mysql.createPool({ ...db, connectionLimit: 1 });
    try {
      for (const { desk, code } of marked) {
        if (desk.table === "personnel") await pool.query("DELETE FROM personnel_private WHERE personnel_code = ?", [code]);
        await pool.query(`DELETE FROM \`${desk.table}\` WHERE code = ?`, [code]);
      }
    } finally {
      await pool.end();
    }
  } else {
    // No database access: archive what we seeded and say so, rather than pretending the rows are gone.
    for (const { desk, code } of marked) await api(`${desk.path}/${code}`, { method: "PATCH", body: { status: desk.publish ? "archived" : "inactive" } });
  }
  const mediaDir = process.env.RAE_CMS_MEDIA_DIR ?? "";
  let files = 0;
  for (const { desk, code } of marked) {
    if (desk.table !== "media_assets" || !mediaDir) continue;
    try { rmSync(join(mediaDir, "library", code), { recursive: true, force: true }); files += 1; } catch { /* reported below as left behind */ }
  }
  const left = [];
  for (const desk of DESKS) for (const row of await listRows(desk)) if (titleOf(desk, row).startsWith(MARKER)) left.push(`${desk.desk} ${row.code}`);
  console.log(`cleanup: ${marked.length} seeded row(s), ${files} media folder(s) removed; left behind ${left.length} row(s)${db ? "" : ", archived only (set RAE_CMS_DB_HOST … to delete them)"}${left.length ? ` (${left.join(", ")})` : ""}; audit rows untouched`);

  const summary = summarise(results);
  console.log(summary.text);
  return summary.ok && left.length === 0 ? 0 : 1;
}

// ---- Chromium over the DevTools protocol (the same technique as scripts/axe-live.mjs) ----

function launch() {
  const port = 9300 + Math.floor(Math.random() * 500);
  const profile = join(homedir(), `rae-desk-profile-${process.pid}`); // snap Chromium cannot write hidden or /tmp dirs
  mkdirSync(profile, { recursive: true });
  const chrome = spawn(process.env.CHROME ?? "chromium-browser", ["--headless=new", "--no-sandbox", "--disable-gpu", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
  const stop = () => { chrome.kill(); try { rmSync(profile, { recursive: true, force: true }); } catch {} };
  const state = { port, stop, ws: null };
  process.on("exit", stop);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const ready = (async () => {
    for (let i = 0; i < 60; i += 1) {
      try {
        const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
        const ws = new WebSocket(target.webSocketDebuggerUrl);
        await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
        state.ws = ws;
        return ws;
      } catch { await sleep(500); }
    }
    throw new Error("Chromium did not start (set CHROME to a Chromium binary)");
  })();

  let id = 0;
  const pending = new Map();
  void ready.then((ws) => {
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
    };
  });
  const send = async (method, params = {}) => {
    await ready;
    return new Promise((res) => {
      const n = ++id;
      pending.set(n, res);
      state.ws.send(JSON.stringify({ id: n, method, params }));
    });
  };

  const evaluate = async (expression) => {
    const reply = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    const details = reply.result?.exceptionDetails;
    if (details) throw new Error(String(details.exception?.description ?? details.text ?? "the page threw"));
    return reply.result?.result?.value;
  };
  const waitFor = async (expression, ms = 10000) => {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      if (await evaluate(expression).catch(() => false)) return true;
      await sleep(120);
    }
    return false;
  };
  const goto = async (url) => {
    await send("Page.navigate", { url });
    await waitFor(`document.readyState === "complete"`, 60000);
  };
  return { stop, send, evaluate, waitFor, goto };
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  run().then((code) => process.exit(code)).catch((error) => {
    console.error(`desk-acceptance: ${error.message}`);
    process.exit(1);
  });
}
