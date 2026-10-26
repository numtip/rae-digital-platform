import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("primary nav matches the seven blueprint sections that exist", () => {
  const src = readFileSync("lib/i18n.ts", "utf8");
  const nav = src.slice(src.indexOf("export const NAV"), src.indexOf("export const PAGES"));
  for (const key of ["about", "research", "services", "documents", "news", "systems", "contact"]) {
    assert.match(nav, new RegExp(`key: "${key}"`));
  }
  assert.equal(nav.includes('key: "home"'), false);
  assert.match(nav, /directory/);
});
