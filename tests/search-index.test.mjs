import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// A document category was indexed twice: once at its own page and once more under the
// same title pointing at /documents, so a category search returned the same row twice —
// and the second link dropped the reader on the documents hub instead of the category
// page they searched for, while the documents chip counted the category twice.
// lib/search-index.ts cannot be imported here (the @/ alias needs the Next resolver),
// so the two shapes that produced the duplicate are pinned as text. Both are checked
// because either one alone can be reintroduced in a different spelling.

const source = readFileSync("lib/search-index.ts", "utf8");

test("each document category is indexed once, at its own page", () => {
  assert.equal(
    [...source.matchAll(/documents\.groups\.forEach\(/g)].length,
    1,
    "lib/search-index.ts walks the document groups more than once",
  );
});

test("no document category is indexed against the documents hub", () => {
  assert.equal(
    [...source.matchAll(/item\(\s*`\$\{base\}\/documents`/g)].length,
    0,
    "a document category is an item entry pointing at /documents instead of its own page",
  );
});
