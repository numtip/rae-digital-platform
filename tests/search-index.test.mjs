import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// A document category was indexed twice: once at its own page and once more under the
// same title pointing at /documents, so the "documents" chip counted 7 results for 4
// destinations and a category search answered with a link that does not list it.
// lib/search-index.ts cannot be imported here (the @/ alias needs the Next resolver),
// so the shape that caused the duplicate is pinned as text.

const source = readFileSync("lib/search-index.ts", "utf8");

test("each document category is indexed once, at its own page", () => {
  assert.equal(
    [...source.matchAll(/documents\.groups\.forEach\(/g)].length,
    1,
    "lib/search-index.ts walks the document groups more than once, so every category is both its own page and /documents",
  );
});
