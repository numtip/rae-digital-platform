import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const links = readFileSync("content/links.ts", "utf8");
const hrefs = [...links.matchAll(/href: "(https:[^"]+)"/g)].map((m) => m[1]);
const featured = (links.match(/featured: true/g) ?? []).length;

test("published registry links are unique https URLs", () => {
  assert.ok(hrefs.length >= 12);
  assert.equal(new Set(hrefs).size, hrefs.length);
  for (const href of hrefs) assert.ok(href.startsWith("https://"), href);
});

test("featured systems stay in the compact range", () => {
  assert.ok(featured >= 6 && featured <= 8, `featured=${featured}`);
});

test("staging_compose shifts arguments before docker compose", () => {
  const src = readFileSync("scripts/staging/lib/common.sh", "utf8");
  const fn = src.slice(src.indexOf("staging_compose()"));
  assert.match(fn, /local repo_root="\$1"\n  shift\n/);
});
