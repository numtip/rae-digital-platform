import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { metaDescription, openGraphSite } from "../lib/seo.ts";

// The news pages hand a body paragraph to `description`, and those paragraphs run to
// 1,045 characters. Imported as a .ts module: lib/seo.ts carries only a type-only import, so
// Node's type stripping loads it without the Next alias resolver or a build.
//
// The crafted fixtures below put the raw cut at character 158 on purpose — a fixture whose
// cut happens to land on a base character tests nothing, which is how the first version of
// this suite stayed green with the trimming rules deleted.

const LIMIT = 160;
const CUT = LIMIT - 1; // 159 characters survive the slice; the 160th is the ellipsis

test("a short paragraph is passed through untouched", () => {
  const text = "สำนักวิจัยและบริการวิชาการ มหาวิทยาลัยแม่โจ้";
  assert.equal(metaDescription(text, "fallback"), text);
});

test("a long Thai paragraph is cut to the limit", () => {
  const text = "ข่าวกิจกรรม".repeat(60); // no spaces: the shape of an imported body
  const out = metaDescription(text, "fallback");
  assert.equal(out.length, LIMIT);
  assert.ok(out.endsWith("…"));
});

test("a cut that lands on a Thai tone mark drops the mark instead of shipping it", () => {
  // index 158 is the mark, 159 the base character the mark belongs to
  const text = "ก".repeat(CUT - 1) + "\u0E49" + "ก".repeat(20);
  const out = metaDescription(text, "fallback");
  assert.equal(out.at(-1), "…");
  assert.doesNotMatch(out.slice(0, -1), /[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]$/u, "trailing mark kept");
  assert.equal(out.length, CUT, "the mark was replaced, not just hidden");
});

test("a cut that lands on a leading vowel drops it instead of shipping it", () => {
  // "เก" is written vowel-then-consonant, so ending after the vowel is a broken syllable
  const text = "ก".repeat(CUT - 1) + "\u0E40" + "ก".repeat(20);
  const out = metaDescription(text, "fallback");
  assert.doesNotMatch(out.slice(0, -1), /[\u0E40-\u0E44]$/u, "dangling leading vowel kept");
  assert.equal(out.length, CUT);
});

test("a space near the cut is used, so an English snippet ends on a whole word", () => {
  const text = "a".repeat(150) + " " + "b".repeat(40);
  const out = metaDescription(text, "fallback");
  assert.equal(out, "a".repeat(150) + "…", "the space at 150 was not used");
});

test("a space far from the cut is ignored, so a snippet does not lose 29 characters", () => {
  // the only space sits at 120, which is 39 characters before the cut: cutting there would
  // throw away a fifth of the snippet, which is what the Thai paragraphs suffered
  const text = "ก".repeat(120) + " " + "ข".repeat(60);
  const out = metaDescription(text, "fallback");
  assert.equal(out.length, LIMIT, `cut short at ${out.length}`);
});

test("whitespace and newlines from the source are collapsed to one line", () => {
  const out = metaDescription("  บรรทัดหนึ่ง\n\nบรรทัดสอง\tบรรทัดสาม  ", "fallback");
  assert.equal(out, "บรรทัดหนึ่ง บรรทัดสอง บรรทัดสาม");
});

test("an empty body falls back to the title, and the title is bounded too", () => {
  assert.equal(metaDescription("", "หัวข่าว"), "หัวข่าว");
  assert.equal(metaDescription("   \n ", "หัวข่าว"), "หัวข่าว");
  const longTitle = "หัวข้อยาว".repeat(30);
  assert.equal(metaDescription("", longTitle).length, LIMIT);
});

test("trailing punctuation is dropped before the ellipsis", () => {
  const text = "x".repeat(CUT - 1) + "." + "y".repeat(40);
  const out = metaDescription(text, "fallback");
  assert.equal(out, "x".repeat(CUT - 1) + "…", "punctuation kept before the ellipsis");
});

// The real imported paragraphs, not a fixture: whatever the office published must land
// inside the limit without a broken glyph, or the gate is testing a string that never ships.
test("every long body paragraph in the Thai news archive survives the cut intact", () => {
  const source = readFileSync("content/th/news.ts", "utf8");
  const paragraphs = [...source.matchAll(/"((?:[^"\\\n]|\\.){200,})"/g)].map((m) => m[1]);
  assert.ok(paragraphs.length > 70, `only ${paragraphs.length} paragraphs parsed — check the file shape`);
  const broken = /[\u0E31\u0E34-\u0E3A\u0E40-\u0E44\u0E47-\u0E4E]…$/u;
  for (const p of paragraphs) {
    const out = metaDescription(p, "fallback");
    assert.ok(out.length <= LIMIT, `over limit (${out.length}): ${p.slice(0, 40)}`);
    assert.doesNotMatch(out, broken, `broken glyph before the ellipsis: …${out.slice(-8)}`);
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

// Sharing a page must name the site and the locale it is in. The locale tags are the pairs
// Facebook and LinkedIn read, and a page that sets its own openGraph has to carry them.
test("the site-wide openGraph fields follow the locale and name the office", () => {
  const th = openGraphSite("สำนักวิจัยและบริการวิชาการ", "th");
  const en = openGraphSite("The Office of Research and Academic Services", "en");
  assert.deepEqual(th, {
    siteName: "สำนักวิจัยและบริการวิชาการ",
    locale: "th_TH",
    alternateLocale: ["en_US"],
  });
  assert.deepEqual(en, {
    siteName: "The Office of Research and Academic Services",
    locale: "en_US",
    alternateLocale: ["th_TH"],
  });
});
