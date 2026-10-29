import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { metaDescription } from "../lib/seo.ts";

// The news pages hand a body paragraph to `description`, and those paragraphs run to
// 1,064 characters. Imported as a .ts module: lib/seo.ts has no imports of its own, so
// Node's type stripping loads it without the Next alias resolver or a build.

const LIMIT = 160;

test("a short paragraph is passed through untouched", () => {
  const text = "สำนักวิจัยและบริการวิชาการ มหาวิทยาลัยแม่โจ้";
  assert.equal(metaDescription(text, "fallback"), text);
});

test("a long Thai paragraph is cut to the limit, with no dangling vowel or tone mark", () => {
  const text = "ข่าวกิจกรรม".repeat(60); // no spaces: the shape of every imported body
  const out = metaDescription(text, "fallback");
  assert.ok(out.length <= LIMIT, `length ${out.length}`);
  assert.ok(out.endsWith("…"));
  // the character before the ellipsis must be a base character, not a vowel/tone mark
  assert.doesNotMatch(out.slice(0, -1), /[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]$/u);
});

test("a long English sentence is cut at a space rather than mid-word", () => {
  const text = "The office promotes research and academic services for communities ".repeat(4).trim();
  const out = metaDescription(text, "fallback");
  assert.ok(out.length <= LIMIT, `length ${out.length}`);
  assert.ok(out.endsWith("…"));
  // the space rule fired: the ellipsis follows a whole word, not a half one
  assert.match(out.slice(0, -1), /[A-Za-z]$/u, "cut mid-word");
  assert.ok(!out.includes("  "), "double space survived");
});

test("whitespace and newlines from the source are collapsed to one line", () => {
  const out = metaDescription("  บรรทัดหนึ่ง\n\nบรรทัดสอง\tบรรทัดสาม  ", "fallback");
  assert.equal(out, "บรรทัดหนึ่ง บรรทัดสอง บรรทัดสาม");
});

test("an empty body falls back to the title instead of an empty description", () => {
  assert.equal(metaDescription("", "หัวข่าว"), "หัวข่าว");
  assert.equal(metaDescription("   \n ", "หัวข่าว"), "หัวข่าว");
});

test("trailing punctuation is dropped before the ellipsis", () => {
  const out = metaDescription("word ".repeat(60).trim() + ".", "fallback");
  assert.ok(out.endsWith("…"));
  assert.ok(!out.includes(".…"), `punctuation kept: …${out.slice(-8)}`);
});

// The real imported paragraphs, not a fixture: whatever the office published must land
// inside the limit, or the gate is testing a string that never ships.
test("every long body paragraph in the Thai news archive fits the limit", () => {
  const source = readFileSync("content/th/news.ts", "utf8");
  const paragraphs = [...source.matchAll(/"([^"\n]{200,})"/g)].map((m) => m[1]);
  assert.ok(paragraphs.length > 20, `only ${paragraphs.length} paragraphs parsed — check the file shape`);
  const longest = paragraphs.reduce((a, b) => (a.length >= b.length ? a : b));
  const out = metaDescription(longest, "fallback");
  assert.ok(out.length <= LIMIT, `longest paragraph (${longest.length}) produced ${out.length}`);
  for (const p of paragraphs) {
    assert.ok(metaDescription(p, "fallback").length <= LIMIT, `over limit: ${p.slice(0, 40)}`);
  }
});

// A helper nothing calls is dead code — these two pages compose a description from
// runtime data, and that is exactly where an over-long one came from.
test("the pages that derive a description from data route it through metaDescription", () => {
  for (const file of [
    "app/[locale]/news/[nid]/page.tsx",
    "app/[locale]/documents/category/[slug]/page.tsx",
  ]) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /description: metaDescription\(/, `${file} builds its own description`);
  }
});
