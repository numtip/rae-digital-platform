// Thai is spelled two ways in Unicode and the search must not care which one arrives.
// The content files are NFC ("ำ" = U+0E33), but a word copied from a PDF or a legacy
// TIS-620 export carries the older NIKHAHIT + SARA AA pair (U+0E4D U+0E32). Same word on
// screen, different code points, so a plain substring match finds nothing.
//
// Imported as a .ts module: it has no imports of its own, so Node's type stripping loads
// it without the Next alias resolver or a build — same reason the other gates read raw
// sources, but here the assertions can run against the real function.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { foldForSearch, matchesQuery } from "../lib/search-text.ts";

const decomposed = (text) => text.replaceAll("\u0E33", "\u0E4D\u0E32");

test("a Thai word spelled the old way still matches the page it came from", () => {
  const page = "ข่าวสารและกิจกรรม — สำนักวิจัยและบริการวิชาการ";
  const query = decomposed("สำนักวิจัย");
  // premise: the two spellings really are different strings
  assert.notEqual(query, "สำนักวิจัย");
  assert.ok(foldForSearch(page).includes(foldForSearch(query)), "decomposed SARA AM found nothing");
  assert.ok(
    foldForSearch("ยังไม่มีกิจกรรมที่กำลังจะมาถึง").includes(foldForSearch(decomposed("กำลัง"))),
    "decomposed กำลัง found nothing",
  );
});

test("folding keeps the case-insensitive match the English page relies on", () => {
  assert.ok(foldForSearch("Research & innovation").includes(foldForSearch("research")));
});

// A reader who puts a space between two words still wants both of them. Matching the
// whole string as one phrase answered "ไม่พบ" for pages that hold every word: the real
// documents category carries "ทุนวิจัย / แบบฟอร์ม" and the query found nothing.
// Text below is copied from content/th/documents.ts, not invented for the test.
const documentsCategory = "งานวิจัย ระเบียบ / ประกาศ / ทุนวิจัย / แบบฟอร์ม / มาตรฐานการวิจัย";

test("words separated by a space are all required, in any order", () => {
  assert.equal(matchesQuery(documentsCategory, "ทุนวิจัย แบบฟอร์ม"), true);
  assert.equal(matchesQuery(documentsCategory, "แบบฟอร์ม ทุนวิจัย"), true);
  assert.equal(matchesQuery(documentsCategory, "  ทุนวิจัย   แบบฟอร์ม  "), true);
});

test("a word the page does not carry is still a miss", () => {
  assert.equal(matchesQuery(documentsCategory, "ทุนวิจัย ลิ้นจี่"), false);
  assert.equal(matchesQuery(documentsCategory, "กัญชง"), false);
});

test("an empty or whitespace-only query matches nothing", () => {
  assert.equal(matchesQuery(documentsCategory, ""), false);
  assert.equal(matchesQuery(documentsCategory, "   "), false);
});

test("a single word behaves exactly as before, old spelling included", () => {
  assert.equal(matchesQuery(documentsCategory, "แบบฟอร์ม"), true);
  // SARA AM still compares equal however the reader's copy carries it.
  assert.equal(matchesQuery("นำเสนอผลงานวิจัย", decomposed("นำเสนอ")), true);
});

// The rule only helps if the component uses it: folding the query alone would compare a
// composed query against the raw text and change nothing, and a phrase match would throw
// away every query that carries a space.
test("the page filters through the shared rule, not an inline substring", () => {
  const src = readFileSync("components/content-search.tsx", "utf8");
  assert.match(src, /const needle = query\.trim\(\)/);
  assert.match(src, /entries\.filter\(\(entry\) => matchesQuery\(/);
  assert.doesNotMatch(src, /\$\{entry\.title\} \$\{entry\.text\}`\)\.includes\(/);
});
