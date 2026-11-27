#!/usr/bin/env node
// Publishes the runtime's published-only export into the committed site data, so the Pages build
// carries it: a CI runner cannot reach the CMS, but it can read a file that is in git.
//
//   RAE_CMS_TOKEN_FILE=/path/to/token node scripts/cms-sync.mjs [--api http://127.0.0.1:3317] [--out public/cms-published]
//
// The export is validated by `articlesFromExport` — the same gate the preview uses — before
// anything is written, so a draft, a half-translated article or an id that could escape the
// folder exits non-zero with the working tree untouched. Images are committed because Pages
// serves static files; the CMS itself stays on loopback and is never exposed.

import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { SAFE_ID, SAFE_MEDIA_FILE } from "../lib/cms/media.ts";
import { articlesFromExport } from "../lib/cms/preview-site.ts";
import { PUBLISHED_SITE_DIR, siteDataFile } from "../lib/cms/site-data.ts";

const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index === -1 ? fallback : args[index + 1];
};

const api = value("--api", process.env.RAE_CMS_API ?? "http://127.0.0.1:3317");
const out = resolve(value("--out", process.env.RAE_CMS_OUT ?? PUBLISHED_SITE_DIR));

// The host's own CLI, checked at run time: no npm package, no build step, nothing to install in
// the repo. `null` means the machine has none, and images are committed at full size.
const resizer = ["magick", "convert", "ffmpeg"].find((cmd) => spawnSync(cmd, ["-version"], { stdio: "ignore" }).status === 0) ?? null;

function resize(input, output, width) {
  const run =
    resizer === "ffmpeg"
      ? spawnSync(resizer, ["-hide_banner", "-loglevel", "error", "-y", "-i", input, "-vf", `scale='min(${width},iw)':-2`, "-c:v", "libwebp", "-quality", "80", output])
      : spawnSync(resizer, [input, "-resize", `${width}x>`, "-quality", "80", output]);
  return run.status === 0;
}

// A token that came from a file or the environment, never from this repository — it is public.
const token = process.env.RAE_CMS_TOKEN_FILE
  ? (await readFile(process.env.RAE_CMS_TOKEN_FILE, "utf8")).trim()
  : (process.env.RAE_CMS_TOKEN ?? "");
if (!token) {
  console.error("cms-sync: set RAE_CMS_TOKEN_FILE to a path, or RAE_CMS_TOKEN");
  process.exit(2);
}

let changed = 0;
const keep = new Set(["index.json"]);

// Writing only what differs is what makes a second run a no-op: same export, same bytes, so the
// runner has no diff to commit and does not churn the pull request.
async function put(relative, bytes) {
  keep.add(relative);
  const path = join(out, relative);
  try {
    if (Buffer.compare(await readFile(path), bytes) === 0) return;
  } catch {
    // not written yet
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);
  changed += 1;
}

const work = await mkdtemp(join(tmpdir(), "cms-sync-"));

try {
  const response = await fetch(`${api}/v1/export`, { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`export failed with ${response.status}`);

  // Every article is checked here, before a byte lands in the working tree.
  const articles = articlesFromExport(await response.json());

  let images = 0;
  for (const article of articles) {
    for (const media of article.media) {
      const name = media.url.split("/").pop() ?? "";
      if (!SAFE_MEDIA_FILE.test(name)) throw new Error(`refusing an unexpected media name: ${name}`);
      const file = await fetch(`${api}${media.url}`, { headers: { authorization: `Bearer ${token}` } });
      if (!file.ok) throw new Error(`cannot fetch ${media.url}: ${file.status}`);
      const bytes = Buffer.from(await file.arrayBuffer());
      const base = name.replace(/\.(png|jpg|webp)$/, "");

      // 900px is the width the site's own news photos are published at, and `NewsImage` derives
      // the card's `-320`/`-640` candidates from a `.webp` src — so all three files ship.
      let large = null;
      if (resizer) {
        const input = join(work, `${article.id}-${name}`);
        await writeFile(input, bytes);
        const variants = [`${base}.webp`, `${base}-320.webp`, `${base}-640.webp`];
        if (resize(input, join(work, variants[0]), 900) && resize(input, join(work, variants[1]), 320) && resize(input, join(work, variants[2]), 640)) {
          for (const variant of variants) await put(`${article.id}/${variant}`, await readFile(join(work, variant)));
          large = variants[0];
        }
      }

      if (large) {
        media.url = `/cms-published/${article.id}/${large}`;
      } else {
        await put(`${article.id}/${name}`, bytes);
        // Full size is the fallback, not a broken card: `NewsImage` only derives the narrower
        // candidates for a `.webp` src, so a `.jpg`/`.png` upload keeps pointing at itself.
        if (name.endsWith(".webp")) for (const width of [320, 640]) await put(`${article.id}/${base}-${width}.webp`, bytes);
      }
      images += 1;
    }
  }

  // The committed tree is exactly this export: a photo of an unpublished article must not stay
  // on the public site, and an image that has a `.webp` copy must not linger at full size.
  for (const entry of await readdir(out, { withFileTypes: true }).catch(() => [])) {
    if (!entry.isDirectory() || !SAFE_ID.test(entry.name)) continue;
    const dir = join(out, entry.name);
    for (const name of await readdir(dir)) {
      if (!keep.has(`${entry.name}/${name}`)) await rm(join(dir, name), { force: true });
    }
    if ((await readdir(dir)).length === 0) await rm(dir, { recursive: true, force: true });
  }

  await put("index.json", Buffer.from(siteDataFile(articles)));

  const resized = resizer ? `resized with ${resizer}` : "no image CLI found — committed at full size";
  console.log(`cms-sync: ${articles.length} published articles, ${images} images, ${changed} file(s) changed (${resized}) → ${out}`);
  if (changed === 0) console.log("cms-sync: nothing to commit");
} catch (error) {
  console.error(`cms-sync: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
} finally {
  await rm(work, { recursive: true, force: true });
}
