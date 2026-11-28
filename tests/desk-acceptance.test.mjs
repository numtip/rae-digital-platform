import test from "node:test";
import assert from "node:assert/strict";
import { line, parseArgs, summarise } from "../scripts/desk-acceptance.mjs";

// The browser flow needs a live, logged-in desk; the logic around it does not. These pin the three parts a
// reader of the output depends on: the arguments, one line per check, and the PASS n/n line that decides the
// exit code. A skipped check leaves the denominator instead of counting as a pass.

test("arguments default to a local desk and take --base-url without a trailing slash", () => {
  assert.deepEqual(parseArgs([], {}), { baseUrl: "http://127.0.0.1:3417", api: "http://127.0.0.1:3317", dryRun: false });
  assert.equal(parseArgs(["--base-url", "https://desk.example.org/"], {}).baseUrl, "https://desk.example.org");
  assert.equal(parseArgs(["--dry-run"], {}).dryRun, true);
  assert.equal(parseArgs([], { DESK_BASE_URL: "http://127.0.0.1:4000", RAE_CMS_API: "http://127.0.0.1:3317" }).baseUrl, "http://127.0.0.1:4000");
  assert.throws(() => parseArgs(["--base-url"], {}), /--base-url needs a value/);
  assert.throws(() => parseArgs(["--quiet"], {}), /unknown argument --quiet/);
});

test("a check is one line: tag, desk, what was checked, and why it failed", () => {
  assert.equal(line({ status: "pass", desk: "documents", check: "confirm dialog before going current" }), "PASS  documents     confirm dialog before going current");
  assert.equal(line({ status: "fail", desk: "axe", check: "en/dark: WCAG A/AA with a toast on screen", detail: "2 violation(s)" }), "FAIL  axe           en/dark: WCAG A/AA with a toast on screen — 2 violation(s)");
  assert.equal(line({ status: "skip", desk: "personnel", check: "confirm dialog", detail: "no confirm-gated move" }), "SKIP  personnel     confirm dialog — no confirm-gated move");
});

test("the summary counts passes against what ran, never against what was skipped", () => {
  const pass = { status: "pass", desk: "documents", check: "a" };
  const fail = { status: "fail", desk: "documents", check: "b" };
  const skip = { status: "skip", desk: "axe", check: "c" };
  assert.deepEqual(summarise([pass, pass, skip]), { passed: 2, total: 2, skipped: 1, ok: true, text: "PASS 2/2 (1 skipped)" });
  assert.deepEqual(summarise([pass, fail]), { passed: 1, total: 2, skipped: 0, ok: false, text: "FAIL 1/2" });
  assert.equal(summarise([]).text, "PASS 0/0");
});
