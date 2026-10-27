import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { enNews } from "../content/en/news.ts";
import { thNews } from "../content/th/news.ts";
import { cmsNewsItems } from "../lib/cms/published-site.ts";

// The archive intro is a function of two real collections. The fixed date range describes the
// legacy archive the copy was transcribed from — never the CMS items, which have their own dates —
// and the CMS fragment disappears entirely when this build loaded none.

const CMS_WORDS = /CMS|content management system|ระบบจัดการเนื้อหา/;

const published = (n) => ({
  id: `cms-intro-${n}`,
  status: "published",
  titleTh: `ข่าวใหม่ ${n}`,
  titleEn: `New story ${n}`,
  source: "https://rae.mju.ac.th/",
  bodyTh: ["เนื้อหา"],
  bodyEn: ["Body"],
  media: [],
  publishedAt: "2026-10-26T18:16:32.000Z",
});

function withCms(count, run) {
  const dir = mkdtempSync(join(tmpdir(), "rae-news-intro-"));
  try {
    writeFileSync(
      join(dir, "index.json"),
      JSON.stringify({ articles: Array.from({ length: count }, (_, index) => published(index + 1)) }),
    );
    return run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("the intro states the legacy range alone while no CMS item is loaded", () => {
  const absent = join(tmpdir(), "rae-news-intro-absent");
  for (const news of [thNews, enNews]) {
    assert.equal(cmsNewsItems("th", absent).length, 0);
    const intro = news.snapshotNote(news.items.length, 0);
    assert.ok(intro.includes(String(news.items.length)), intro);
    assert.doesNotMatch(intro, CMS_WORDS);
    // No "+ 0", no empty parentheses left behind by a hidden fragment.
    assert.doesNotMatch(intro, /\+/);
    assert.doesNotMatch(intro, /\(\s*\)/);
  }
});

test("the intro states the legacy count and the CMS count when both have records", () => {
  withCms(3, (dir) => {
    for (const [locale, news] of [["th", thNews], ["en", enNews]]) {
      const cmsCount = cmsNewsItems(locale, dir).length;
      assert.equal(cmsCount, 3);
      const intro = news.snapshotNote(news.items.length, cmsCount);
      assert.match(intro, CMS_WORDS);
      assert.ok(intro.includes(String(news.items.length)), intro);
      assert.ok(intro.includes(" 3 "), intro);
      // The legacy range stays in front of the CMS fragment.
      assert.ok(intro.indexOf(String(news.items.length)) < intro.search(CMS_WORDS), intro);
    }
  });
});
