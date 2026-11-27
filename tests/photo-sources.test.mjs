import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { photoSources } from "../lib/assets.ts";

// The news card offers the archive's three pre-built widths when they exist, and a single file
// when they do not. Getting this wrong is not cosmetic: a derived name that was never exported
// is a 404 on every card, and the Pages export cannot catch it because it does not fetch images.

test("an archive photo offers the three widths that were actually exported", () => {
  const photo = photoSources("/images/news/37909.webp");
  assert.equal(photo.src, "/images/news/37909-640.webp");
  assert.deepEqual(photo.candidates, [
    { url: "/images/news/37909-320.webp", width: 320 },
    { url: "/images/news/37909-640.webp", width: 640 },
    { url: "/images/news/37909.webp", width: 900 },
  ]);
});

test("a photo the sync published as webp offers the three widths beside it", () => {
  const photo = photoSources("/cms-published/staging-real-20261027/02-b2c3d4e5.webp");
  assert.equal(photo.src, "/cms-published/staging-real-20261027/02-b2c3d4e5-640.webp");
  assert.deepEqual(photo.candidates, [
    { url: "/cms-published/staging-real-20261027/02-b2c3d4e5-320.webp", width: 320 },
    { url: "/cms-published/staging-real-20261027/02-b2c3d4e5-640.webp", width: 640 },
    { url: "/cms-published/staging-real-20261027/02-b2c3d4e5.webp", width: 900 },
  ]);
});

test("a single-file photo is handed over as it is, with no invented widths", () => {
  for (const src of [
    // A full-size upload: the sync had no resize CLI (or could not convert it), so no widths exist.
    "/cms-published/staging-real-20261027/01-a1b2c3d1.jpg",
    "/images/brand/logo.png",
  ]) {
    const photo = photoSources(src);
    assert.equal(photo.src, src);
    assert.deepEqual(photo.candidates, [], `${src} must not claim a srcset`);
  }
});

test("every news card renders through NewsImage, which asks lib/assets.ts for the sources", () => {
  for (const file of ["components/news-grid.tsx", "app/[locale]/page.tsx", "app/[locale]/news/[nid]/page.tsx"]) {
    assert.match(readFileSync(file, "utf8"), /<NewsImage/, `${file} must not build its own <img>`);
  }
  const image = readFileSync("components/news-image.tsx", "utf8");
  assert.match(image, /photoSources\(src\)/);
  // No second copy of the naming rule: the old inline builder derived "-320/-640" for any src.
  assert.doesNotMatch(image, /-320\.webp/);
});
