import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cmsArticle, cmsNewsItems, publicationStamp, publishedIds } from "../lib/cms/published-site.ts";
import { PreviewRejected } from "../lib/cms/preview-site.ts";

// The CMS -> site data bridge reads whatever `scripts/cms-sync.mjs` committed under
// public/cms-published/. These checks are about the two cases that matter: the file is there and
// both languages render with the gallery, and the file is absent so the site is what it always was.

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
  publishedAt: "2026-10-26T18:16:32.000Z",
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
    // The CMS publication instant, not the moment the copy was taken: 18:16 UTC is already the
    // 27th in Bangkok, so the label is the office's day and the ISO stamp stays UTC.
    assert.equal(thai.date, "27 ตุลาคม 2569");
    assert.equal(thai.dateIso, "2026-10-26T18:16:32.000Z");
    assert.equal(thai.gallery.length, 5);
    assert.deepEqual(thai.gallery[0], {
      src: article.media[0].url,
      alt: "ภาพที่ 1",
      caption: "คำบรรยายภาพที่ 1",
    });

    const english = cmsArticle("en", "staging-real-20261027", dir);
    assert.equal(english.title, article.titleEn);
    assert.equal(english.date, "27 October 2026");
    assert.equal(english.dateIso, article.publishedAt);
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
    // The card carries the article's own lead photo, which the sync publishes with the same
    // `-320`/`-640` widths as the site's own news photos.
    assert.equal(thaiItems[0].image.src, article.media[0].url);
    assert.equal(thaiItems[0].image.alt, article.media[0].altTh);
    // The gallery stays on the detail page.
    assert.equal(cmsNewsItems("en", dir)[0].image.alt, article.media[0].altEn);
    assert.equal(cmsNewsItems("en", dir)[0].title, article.titleEn);
    assert.equal(cmsNewsItems("en", dir)[0].image.alt, article.media[0].altEn);
    assert.equal(cmsArticle("th", "no-such-id", dir), null);
  });
});

test("an article without photos still gets a card, just without an image", () => {
  withSite({ articles: [{ ...article, media: [] }] }, (dir) => {
    assert.equal(cmsNewsItems("th", dir)[0].image, null);
    assert.equal(cmsArticle("en", article.id, dir).gallery.length, 0);
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
    // Pinned to the export gate, which is the one that reads this url before the renderer sees it.
    assert.throws(() => cmsArticle("th", article.id, dir), /outside its own folder/);
    // The card path checks the same rule, so a bad lead photo cannot reach an <img src> either.
    assert.throws(() => cmsNewsItems("th", dir), /outside its own folder/);
  });
});

test("a published date shows a Bangkok label and keeps the full ISO stamp for the JSON-LD", () => {
  withSite({ generatedAt: "2026-10-27T03:00:00.000Z", articles: [article] }, (dir) => {
    const cms = cmsArticle("th", article.id, dir);
    const stamp = publicationStamp(cms.date, cms.dateIso);
    assert.deepEqual(stamp, { date: "27 ตุลาคม 2569", datePublished: "2026-10-26T18:16:32.000Z" });
    // Exactly what the page serialises: the label is formatted, datePublished is not.
    assert.equal(JSON.stringify({ datePublished: stamp.datePublished }), '{"datePublished":"2026-10-26T18:16:32.000Z"}');
  });
});

test("an export without a publication date leaves the date off instead of inventing one", () => {
  const undated = { ...article };
  delete undated.publishedAt;
  withSite({ generatedAt: "2026-10-27T03:00:00.000Z", articles: [undated] }, (dir) => {
    const thai = cmsArticle("th", article.id, dir);
    assert.equal(thai.date, "");
    assert.equal(thai.dateIso, "");
    assert.equal(cmsNewsItems("en", dir)[0].date, "");
    assert.equal(thai.gallery.length, 5, "the rest of the article still renders");
    // No label at all — not an empty one — and no `datePublished` key once serialised.
    assert.equal(publicationStamp(thai.date, thai.dateIso), null);
    assert.equal(JSON.stringify({ datePublished: publicationStamp(thai.date, thai.dateIso)?.datePublished }), "{}");
  });
  withSite({ articles: [{ ...article, publishedAt: "published yesterday" }] }, (dir) => {
    assert.throws(() => cmsArticle("th", article.id, dir), /malformed publishedAt/);
  });
  withSite({ articles: [{ ...article, publishedAt: "2026-13-45T00:00:00.000Z" }] }, (dir) => {
    assert.throws(() => cmsArticle("en", article.id, dir), /malformed publishedAt/);
  });
});

test("the tracked CMS data is exactly what the sync writes", () => {
  const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
  const files = git("ls-files", "--", "public/cms-published").split("\n").filter(Boolean);
  // The folder is committed (Pages serves static files), so the guard moves to the shape of what
  // may enter it: one index and the sync's own image names, nothing else, ever.
  for (const path of files) {
    assert.match(
      path,
      /^public\/cms-published\/(index\.json|[a-z0-9][a-z0-9-]{1,63}\/\d{2}-[0-9a-f]{8}(-\d{3})?\.(png|jpg|webp))$/,
      `${path} is not something the sync writes`,
    );
  }
  assert.notEqual(
    spawnSync("git", ["check-ignore", "public/cms-published/index.json"], { stdio: "ignore" }).status,
    0,
    "the data must not be ignored",
  );
});
