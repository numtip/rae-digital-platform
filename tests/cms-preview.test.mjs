import test from "node:test";
import assert from "node:assert/strict";
import { articlesFromExport, previewFiles, renderArticlePage, PreviewRejected } from "../lib/cms/preview-site.ts";

// The static preview is the only path from the CMS to something a browser shows. These checks are
// about what it refuses: a draft, a missing translation, an id that could escape the output folder,
// an image that is not this article's own file.

const article = {
  id: "staging-real-20261027",
  titleTh: "สำนักวิจัยฯ จัดประชาพิจารณ์",
  titleEn: "Public hearing on quality assurance",
  source: "https://www.facebook.com/share/p/1BsZLPpCyV/",
  bodyTh: ["ย่อหน้าที่หนึ่ง", "ย่อหน้าที่สอง"],
  bodyEn: ["First paragraph", "Second paragraph"],
  media: [
    {
      url: "/v1/media/staging-real-20261027/01-aaaaaaaa.jpg",
      captionTh: "ภาพรวมการประชุม",
      captionEn: "Overview of the meeting",
      altTh: "ผู้เข้าร่วมนั่งในห้องประชุม",
      altEn: "Participants seated in the meeting room",
    },
  ],
};

test("a published article becomes a Thai and an English page plus an index", () => {
  const files = previewFiles(articlesFromExport({ articles: [article] }));
  const paths = files.map((file) => file.path).sort();
  assert.deepEqual(paths, ["index.html", "staging-real-20261027/en.html", "staging-real-20261027/th.html"]);

  const thai = renderArticlePage(article, "th");
  assert.match(thai, /ย่อหน้าที่หนึ่ง/);
  assert.match(thai, /ภาพรวมการประชุม/);
  assert.doesNotMatch(thai, /First paragraph/);
  assert.match(thai, /noindex/);

  const english = renderArticlePage(article, "en");
  assert.match(english, /First paragraph/);
  assert.match(english, /Overview of the meeting/);
  assert.doesNotMatch(english, /ย่อหน้าที่หนึ่ง/);
});

test("markup in the content is escaped, not rendered", () => {
  const hostile = { ...article, titleTh: "<script>alert(1)</script>", bodyTh: ["<img src=x onerror=1>"] };
  const page = renderArticlePage(hostile, "th");
  assert.doesNotMatch(page, /<script>alert/);
  assert.match(page, /&lt;script&gt;/);
  assert.doesNotMatch(page, /<img src=x/);
});

test("a draft, an unsafe id or a half-translated article is refused", () => {
  assert.throws(() => articlesFromExport({ articles: [{ ...article, status: "draft" }] }), /not published/);
  assert.throws(() => articlesFromExport({ articles: [{ ...article, status: "approved" }] }), /not published/);
  assert.throws(() => articlesFromExport({ articles: [{ ...article, id: "../../etc/passwd" }] }), /unsafe article id/);
  assert.throws(() => articlesFromExport({ articles: [{ ...article, bodyEn: [] }] }), PreviewRejected);
  assert.throws(() => articlesFromExport({ articles: [{ ...article, titleEn: "  " }] }), /missing a title/);
  const noAlt = { ...article, media: [{ ...article.media[0], altEn: "" }] };
  assert.throws(() => articlesFromExport({ articles: [noAlt] }), /bilingual captions/);
});

// The preview downloads each image with an editor's token, so an image reference that is not this
// article's own runtime file is refused rather than fetched: another folder could hold a draft's
// photo, and a path that is not `/v1/media/<id>/NN-xxxxxxxx.ext` is not ours to read at all.
test("an image that is not the article's own runtime file is refused", () => {
  const withUrl = (url) => articlesFromExport({ articles: [{ ...article, media: [{ ...article.media[0], url }] }] });

  assert.throws(() => withUrl("/v1/media/some-other-article/01-aaaaaaaa.jpg"), /outside its own folder/);
  assert.throws(() => withUrl("/v1/media/staging-real-20261027/../../etc/passwd"), /outside its own folder/);
  assert.throws(() => withUrl("/v1/media/staging-real-20261027/passwd.jpg"), /outside its own folder/);
  assert.throws(() => withUrl("/v1/media/staging-real-20261027/01-aaaaaaaa.pdf"), /outside its own folder/);
  assert.throws(() => withUrl("https://example.com/01-aaaaaaaa.jpg"), /outside its own folder/);
  assert.throws(() => withUrl(""), /outside its own folder/);

  // Both shapes the generator writes are accepted, so the gate runs again on its own site data.
  assert.equal(withUrl("/v1/media/staging-real-20261027/01-aaaaaaaa.jpg").length, 1);
  assert.equal(withUrl("/cms-published/staging-real-20261027/01-aaaaaaaa.webp").length, 1);
});

// The source is rendered as a link, so only a real https URL may become one.
test("a source that is not https is shown as text, never as an href", () => {
  const hostile = { ...article, source: "javascript:alert(1)" };
  const page = renderArticlePage(hostile, "th");
  assert.doesNotMatch(page, /href="javascript:/);
  assert.match(page, /javascript:alert\(1\)/);

  const missing = renderArticlePage({ ...article, source: "" }, "th");
  assert.doesNotMatch(missing, /href=""/);
});

