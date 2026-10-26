import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("primary nav covers every section that has a page", () => {
  const src = readFileSync("lib/i18n.ts", "utf8");
  const nav = src.slice(src.indexOf("export const NAV"), src.indexOf("export const PAGES"));
  for (const key of ["about", "research", "services", "documents", "knowledge", "news", "systems", "contact"]) {
    assert.match(nav, new RegExp(`key: "${key}"`));
  }
  assert.equal(nav.includes('key: "home"'), false);
  assert.match(nav, /directory/);
  // Knowledge is its own branch, not a second name for the Document Center.
  assert.match(nav, /\/knowledge`/);
  assert.match(nav, /\/documents`/);
});
