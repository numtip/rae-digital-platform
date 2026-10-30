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

// The documents page once published wtms_webpageAdminDetail.aspx — an admin path on a public
// site. The guard for that lives in tests/content.test.mjs, which already walks every content
// file, so a new content type is covered without editing a list of paths.

// The unit/media tile renders its icon aria-hidden and its label from the locale file, so an id
// without a label is a link with no accessible name. TypeScript cannot see this: the label lookup
// casts the id. Keep the two lists equal instead.
test("every registry id has a label in both locales", () => {
  const ids = [...links.matchAll(/\{ id: "([^"]+)"/g)].map((m) => m[1]).sort();
  for (const locale of ["th", "en"]) {
    const src = readFileSync(`content/${locale}/directory.ts`, "utf8");
    const start = src.indexOf("  labels: {") + "  labels: {".length;
    const body = src.slice(start, src.indexOf("\n  },", start));
    const labelIds = [...body.matchAll(/^\s+"?([a-z][a-z-]*)"?:/gm)].map((m) => m[1]).sort();
    assert.deepEqual(labelIds, ids, `${locale}/directory.ts labels do not match content/links.ts`);
  }
});

test("staging_compose shifts arguments before docker compose", () => {
  const src = readFileSync("scripts/staging/lib/common.sh", "utf8");
  const fn = src.slice(src.indexOf("staging_compose()"));
  assert.match(fn, /local repo_root="\$1"\n  shift\n/);
});
