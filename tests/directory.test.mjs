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

// The documents page once published wtms_webpageAdminDetail.aspx, which exists only to
// redirect to the public page — an admin path on a public site and one hop too many.
test("no published outbound link uses an admin page path", () => {
  for (const file of ["content/links.ts", "content/th/documents.ts", "content/en/documents.ts"]) {
    assert.doesNotMatch(readFileSync(file, "utf8"), /AdminDetail\.aspx/, file);
  }
});

test("staging_compose shifts arguments before docker compose", () => {
  const src = readFileSync("scripts/staging/lib/common.sh", "utf8");
  const fn = src.slice(src.indexOf("staging_compose()"));
  assert.match(fn, /local repo_root="\$1"\n  shift\n/);
});
