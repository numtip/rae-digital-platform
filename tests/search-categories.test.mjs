import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// The search filter renders one chip per label it finds in content/<locale>/search.ts, so a
// section missing from that list is invisible: its results can only be reached through "all".
// A new section is added to SECTIONS in lib/search-index.ts, which is why this compares the
// two lists instead of trusting either one.

const sections = (() => {
  const source = readFileSync("lib/search-index.ts", "utf8");
  const block = source.slice(source.indexOf("const SECTIONS = ["), source.indexOf("] as const;"));
  return [...block.matchAll(/"([a-z-]+)"/g)].map((match) => match[1]);
})();

const categoryLabels = (file) => {
  const source = readFileSync(file, "utf8");
  const block = source.slice(source.indexOf("categories: {"), source.indexOf("},", source.indexOf("categories: {")));
  return [...block.matchAll(/\n\s+([a-z-]+):\s*"/g)].map((match) => match[1]);
};

test("every searchable section has a filter label in both locales", () => {
  assert.ok(sections.length >= 8, `only ${sections.length} sections parsed from lib/search-index.ts`);
  assert.ok(sections.includes("knowledge"), "knowledge is missing from SECTIONS");
  for (const file of ["content/th/search.ts", "content/en/search.ts"]) {
    const labels = categoryLabels(file);
    const missing = sections.filter((section) => !labels.includes(section));
    assert.deepEqual(missing, [], `${file} has no chip label for: ${missing.join(", ")}`);
  }
});
