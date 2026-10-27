#!/usr/bin/env node
// Turns the runtime's published-only export into static files you can open in a browser.
//
//   RAE_CMS_TOKEN=... node scripts/cms-preview.mjs [--api http://127.0.0.1:3317] [--out out-cms-preview]
//
// The output is git-ignored and nothing here deploys, so no draft and no editorial draft ever
// reaches GitHub Pages. Images are downloaded beside each article so the pages render offline.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { articlesFromExport, previewFiles } from "../lib/cms/preview-site.ts";
import { SAFE_MEDIA_FILE } from "../lib/cms/media.ts";

const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index === -1 ? fallback : args[index + 1];
};

const api = value("--api", process.env.RAE_CMS_API ?? "http://127.0.0.1:3317");
const out = resolve(value("--out", process.env.RAE_CMS_PREVIEW_DIR ?? "out-cms-preview"));
const token = process.env.RAE_CMS_TOKEN ?? "";

if (!token) {
  console.error("cms-preview: set RAE_CMS_TOKEN to a staging account token");
  process.exit(2);
}

const response = await fetch(`${api}/v1/export`, { headers: { authorization: `Bearer ${token}` } });
if (!response.ok) {
  console.error(`cms-preview: export failed with ${response.status}`);
  process.exit(1);
}

const articles = articlesFromExport(await response.json());

// Each article's images are downloaded into its own folder and the page is rewritten to point at
// the local copy, because the loopback API needs a token a static page cannot send.
let images = 0;
for (const article of articles) {
  for (const media of article.media) {
    const filename = media.url.split("/").pop() ?? "";
    if (!SAFE_MEDIA_FILE.test(filename)) throw new Error(`refusing an unexpected media name: ${filename}`);
    const file = await fetch(`${api}${media.url}`, { headers: { authorization: `Bearer ${token}` } });
    if (!file.ok) throw new Error(`cannot fetch ${media.url}: ${file.status}`);
    const path = join(out, article.id, "images", filename);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, Buffer.from(await file.arrayBuffer()));
    media.url = `images/${filename}`;
    images += 1;
  }
}

for (const file of previewFiles(articles)) {
  const path = join(out, file.path);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, file.contents, "utf8");
}

console.log(`cms-preview: ${articles.length} published articles, ${images} images → ${out}`);
console.log("cms-preview: open index.html; nothing was deployed");
