import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { galleryVisible, mediaGallery } from "../lib/cms/media-live.ts";

// M15 gallery. The library is the only source of the page's copy, so the rules worth pinning down are: the
// site never invents a title (it reads the library's own bilingual fields), it never turns a URL the runtime
// did not write into an <img src>, and an empty library means the page does not exist.

const asset = (over = {}) => ({
  code: "RAE-MD-0007",
  titleTh: "ภาพบรรยากาศงานประชุม",
  titleEn: "Conference in progress",
  altTh: "ผู้เข้าร่วมนั่งในห้องประชุม",
  altEn: "Participants seated in a conference room",
  captionTh: "ภาพจากงานประชุมประจำปี",
  captionEn: "From the annual conference",
  mime: "image/jpeg",
  bytes: 1234,
  url: "/v1/public/media/RAE-MD-0007/0123456789abcdef.jpg",
  updatedAt: "2026-11-27T03:00:00.000Z",
  ...over,
});

test("an empty library is no gallery at all", () => {
  assert.deepEqual(mediaGallery([], "th"), []);
  assert.equal(galleryVisible(mediaGallery([], "th")), false);
  assert.equal(galleryVisible(mediaGallery([asset()], "th")), true);
});

test("only a file the runtime published on its own path becomes an img src", () => {
  const dropped = [
    { url: "https://example.org/photo.jpg" }, // not the runtime's path
    { url: "/v1/public/media/RAE-MD-0007/../secret.jpg" }, // traversal
    { url: "/v1/public/media/RAE-MD-0007/not-a-hex-name.jpg" }, // not the runtime's file name
    { url: "/v1/public/media/RAE-MD-9999/0123456789abcdef.jpg" }, // a different asset's file
    { url: undefined },
  ];
  for (const over of dropped) {
    assert.deepEqual(mediaGallery([asset(over)], "th"), [], `accepted ${JSON.stringify(over.url)}`);
  }
});

test("the gallery carries the library's own copy in the reader's language", () => {
  const [th] = mediaGallery([asset()], "th");
  const [en] = mediaGallery([asset()], "en");
  assert.equal(th.title, "ภาพบรรยากาศงานประชุม");
  assert.equal(th.caption, "ภาพจากงานประชุมประจำปี");
  assert.equal(en.title, "Conference in progress");
  assert.equal(en.alt, "Participants seated in a conference room");
  // The bytes come through this app: the browser cannot reach the loopback runtime.
  assert.equal(th.src, "/api/media-library/RAE-MD-0007/0123456789abcdef.jpg");
  // Nothing is typed by this site, so a missing alt falls back to the published title, never to "".
  assert.equal(mediaGallery([asset({ altTh: "", altEn: "" })], "en")[0].alt, "Conference in progress");
});

test("the page, the hub link and the sitemap all hide a gallery with nothing in it", () => {
  const page = readFileSync("app/[locale]/media/page.tsx", "utf8");
  assert.match(page, /if \(!galleryVisible\(gallery\)\) notFound\(\)/);
  const knowledge = readFileSync("app/[locale]/knowledge/page.tsx", "utf8");
  assert.match(knowledge, /library\.length > 0[\s\S]*?\/\$\{locale\}\/media/);
  const sitemap = readFileSync("app/sitemap.ts", "utf8");
  assert.match(sitemap, /readPublicMedia\(\)\)\.length === 0 \? \[\]/);
  // …and not in PAGES: a fixed entry would list a page the export never writes.
  assert.ok(!/^\s*"media",$/m.test(readFileSync("lib/i18n.ts", "utf8")));
});
