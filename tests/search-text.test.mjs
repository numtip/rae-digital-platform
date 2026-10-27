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
import { foldForSearch } from "../lib/search-text.ts";

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

// The rule only helps if the component uses it on both sides: folding the query alone
// would compare a composed query against the raw text and change nothing.
test("both sides of the comparison are folded", () => {
  const src = readFileSync("components/content-search.tsx", "utf8");
  assert.match(src, /const needle = foldForSearch\(query\.trim\(\)\)/);
  assert.match(src, /entries\.filter\(\(entry\) => foldForSearch\(/);
});
