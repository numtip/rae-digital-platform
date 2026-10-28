import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The desk is a client component: rendering it needs a DOM, and this suite deliberately has no
// dependencies. So these checks read the source as text and pin the structure that regressed once
// (an always-visible editor beside the login form, fields stretched by the grid). The behaviour
// itself — login, sign-out, session expiry — is exercised in Chromium against the running desk.
const root = join(import.meta.dirname, "..");
const desk = readFileSync(join(root, "components/cms/news-desk.tsx"), "utf8");
const copy = readFileSync(join(root, "lib/cms/admin-copy.ts"), "utf8");

// Everything before the dashboard's `return (` — i.e. the branch that renders when there is no session.
const unauthenticated = desk.slice(0, desk.indexOf("  return (\n    <section aria-labelledby=\"news-desk\""));
const authenticated = desk.slice(desk.indexOf("  return (\n    <section aria-labelledby=\"news-desk\""));

test("without a session the desk renders the login card and no editor", () => {
  assert.ok(unauthenticated.length > 0, "the unauthenticated branch is missing");
  assert.match(unauthenticated, /if \(!token\) \{/, "the login card must be the no-session branch");
  assert.match(unauthenticated, /id="userId"/, "the login card needs the user field");
  assert.match(unauthenticated, /type="password"/, "the login card needs the password field");
  assert.ok(!/name="bodyTh"/.test(unauthenticated), "the editor must not render before a session exists");
  assert.ok(!/name="titleTh"/.test(unauthenticated), "no draft fields before a session exists");
});

test("the login card is a centred, capped card", () => {
  assert.match(unauthenticated, /mx-auto w-full max-w-\[400px\]/, "the card must be centred and capped at 400px");
  assert.match(unauthenticated, /rounded-lg border[^"]*bg-white/, "the card needs its own surface");
});

test("login fields have a fixed height instead of stretching to the grid row", () => {
  const field = desk.match(/const FIELD = `([^`]+)`/)?.[1] ?? "";
  assert.match(field, /\bh-1[12]\b/, "FIELD must set a fixed height (h-11/h-12)");
  assert.ok(!/^min-h-/.test(field.trim()), "min-h-* alone lets the field stretch");
  assert.match(desk, /const LABEL = "flex flex-col gap-1/, "labels must not be stretched grid cells");
  assert.match(unauthenticated, /className={`h-12[^`]*rounded-md bg-brand-700/, "the login button is a 48px target");
});

test("the dashboard is only rendered after a session exists", () => {
  assert.ok(authenticated.length > 0, "the dashboard branch is missing");
  assert.match(authenticated, /id="news-desk"/, "the dashboard keeps its heading landmark");
  assert.ok(!/id="userId"/.test(authenticated), "the login form must be gone once signed in");
});

test("signing out clears the session and everything it owned", () => {
  const body = desk.match(/function signOut\([^)]*\) \{([\s\S]*?)\n  \}/)?.[1] ?? "";
  assert.ok(body.length > 0, "signOut() is missing");
  assert.match(body, /setToken\(""\)/, "signOut must drop the bearer token");
  for (const state of ["setItems", "setSelected", "setMedia", "setPending"]) {
    assert.match(body, new RegExp(`${state}\\(`), `signOut must reset ${state}`);
  }
  assert.match(authenticated, /onClick=\{\(\) => signOut\(\)\}/, "the dashboard needs a sign-out control");
});

test("an expired session returns the reader to the login card", () => {
  assert.match(desk, /result\.status === 401/, "401 must be recognised");
  assert.match(desk, /signOut\(copy\.sessionExpired\)/, "401 must sign the reader out with the expiry notice");
});

test("nothing writes credentials to the console", () => {
  assert.ok(!/console\.(log|info|debug|warn|error)/.test(desk), "the desk must not log anything");
});

test("both locales carry the login copy", () => {
  for (const key of ["loginHint", "signingIn", "logout", "sessionExpired"]) {
    const hits = copy.match(new RegExp(`^\\s*${key}:`, "gm")) ?? [];
    assert.equal(hits.length, 2, `${key} must exist in th and en`);
  }
});
