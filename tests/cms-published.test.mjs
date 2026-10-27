import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cmsArticle, cmsNewsItems, publishedIds } from "../lib/cms/published-site.ts";
import { PreviewRejected } from "../lib/cms/preview-site.ts";

// The CMS -> site data bridge is only reachable when someone generated public/cms-published/.
// These checks are about the two cases that matter: the file is there and both languages render
// with the gallery, and the file is absent so the site is exactly what CI builds.

const paragraph = (n, lang) => `${lang} paragraph ${n}`;

const media = (n) => ({
  url: `/cms-published/staging-real-20261027/0${n}-a1b2c3d${n}.jpg`,
  captionTh: `คำบรรยายภาพที่ ${n}`,
  captionEn: `Caption number ${n}`,
  altTh: `ภาพที่ ${n}`,
  altEn: `Photo ${n}`,
});

const article = {
  id: "staging-real-20261027",
  status: "published",
  titleTh: "สำนักวิจัยฯ จัดประชาพิจารณ์หลักประกันคุณภาพ",
  titleEn: "Public hearing on quality assurance",
  source: "https://www.facebook.com/share/p/1BsZLPpCyV/",
  bodyTh: [1, 2, 3].map((n) => paragraph(n, "ไทย")),
  bodyEn: [1, 2, 3].map((n) => paragraph(n, "English")),
  media: [1, 2, 3, 4, 5].map(media),
};

function withSite(payload, run) {
  const dir = mkdtempSync(join(tmpdir(), "rae-cms-published-"));
  try {
    writeFileSync(join(dir, "index.json"), JSON.stringify(payload));
    return run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("a published article renders in both languages with its gallery", () => {
  withSite({ generatedAt: "2026-10-27T03:00:00.000Z", articles: [article] }, (dir) => {
    assert.deepEqual(publishedIds(dir), ["staging-real-20261027"]);

    const thai = cmsArticle("th", "staging-real-20261027", dir);
    assert.equal(thai.title, article.titleTh);
    assert.deepEqual(thai.body, article.bodyTh);
    assert.equal(thai.date, "2026-10-27");
    assert.equal(thai.gallery.length, 5);
    assert.deepEqual(thai.gallery[0], {
      src: article.media[0].url,
      alt: "ภาพที่ 1",
      caption: "คำบรรยายภาพที่ 1",
    });

    const english = cmsArticle("en", "staging-real-20261027", dir);
    assert.equal(english.title, article.titleEn);
    assert.deepEqual(english.body, article.bodyEn);
    assert.equal(english.gallery.length, 5);
    assert.deepEqual(english.gallery[4], {
      src: article.media[4].url,
      alt: "Photo 5",
      caption: "Caption number 5",
    });

    // Same routes the archive uses, so the list and the detail page cannot disagree.
    const thaiItems = cmsNewsItems("th", dir);
    assert.equal(thaiItems[0].nid, "staging-real-20261027");
    assert.equal(thaiItems[0].title, article.titleTh);
    assert.equal(thaiItems[0].image, null);
    assert.equal(cmsNewsItems("en", dir)[0].title, article.titleEn);
    assert.equal(cmsArticle("th", "no-such-id", dir), null);
  });
});

test("without the data file the site lists nothing and renders nothing new", () => {
  const empty = mkdtempSync(join(tmpdir(), "rae-cms-published-empty-"));
  try {
    mkdirSync(join(empty, "nested"));
    assert.deepEqual(publishedIds(empty), []);
    assert.deepEqual(cmsNewsItems("th", empty), []);
    assert.equal(cmsArticle("th", article.id, empty), null);
  } finally {
    rmSync(empty, { recursive: true, force: true });
  }
});

test("a draft can never reach a page, even if it is in the data file", () => {
  withSite({ articles: [{ ...article, status: "draft" }] }, (dir) => {
    assert.throws(() => publishedIds(dir), /not published/);
    assert.throws(() => cmsArticle("th", article.id, dir), PreviewRejected);
    assert.throws(() => cmsNewsItems("en", dir), /not published/);
  });
  withSite({ articles: [{ ...article, media: [{ ...article.media[0], url: "/etc/passwd" }] }] }, (dir) => {
    assert.throws(() => cmsArticle("th", article.id, dir), /outside public\/cms-published|bilingual/);
  });
});
