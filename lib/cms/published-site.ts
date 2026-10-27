import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { NewsItem } from "../../content/th/news.ts";
import { PREVIEW_DATA_DIR } from "./build-guard.ts";
import { articlesFromExport, PreviewRejected, type PreviewArticle } from "./preview-site.ts";

// The bridge from a locally generated copy of the CMS export to the real news templates.
// `scripts/cms-preview.mjs --site-data` writes `public/cms-published/`, which is git-ignored:
// in CI the directory does not exist, so every function here returns nothing and the site
// renders exactly the archive it always did. Nothing here can publish anything.

export type Locale = "th" | "en";

export type PublishedGalleryItem = { src: string; alt: string; caption: string };

export type PublishedArticle = {
  title: string;
  /** The CMS publication date, `YYYY-MM-DD`, or "" when the runtime does not export one. */
  date: string;
  dateIso: string;
  body: string[];
  gallery: PublishedGalleryItem[];
};

export const PUBLISHED_SITE_DIR = PREVIEW_DATA_DIR;

// Only files this project's own generator can have written: the id folder plus the runtime's
// `NN-xxxxxxxx.ext` name. Anything else in the JSON is not something to put in an <img src>.
const MEDIA_SRC = /^\/cms-published\/[a-z0-9][a-z0-9-]{1,63}\/\d{2}-[0-9a-f]{8}\.(png|jpg|webp)$/;

type SiteData = { articles?: (Partial<PreviewArticle> & { status?: string })[] };

const siteDir = (override?: string) => override ?? join(process.cwd(), PUBLISHED_SITE_DIR);

function readSite(override?: string): PreviewArticle[] {
  const file = join(siteDir(override), "index.json");
  if (!existsSync(file)) return [];
  const payload = JSON.parse(readFileSync(file, "utf8")) as SiteData;
  // The export's own gate runs over the file: a draft, an unsafe id or a half-translated
  // article throws here instead of reaching a page.
  return articlesFromExport(payload);
}

// Never a date we made up: a runtime that exports no publication stamp leaves the date off the
// page, and a stamp in the wrong shape is a bug worth failing on rather than rendering.
function dateOf(article: PreviewArticle): string {
  if (!article.publishedAt) return "";
  if (!/^\d{4}-\d{2}-\d{2}/.test(article.publishedAt)) throw new PreviewRejected(`${article.id} has a malformed publishedAt: ${article.publishedAt}`);
  return article.publishedAt.slice(0, 10);
}

export function publishedIds(dir?: string): string[] {
  return readSite(dir).map((article) => article.id);
}

function toItem(locale: Locale, article: PreviewArticle): NewsItem {
  const date = dateOf(article);
  return {
    nid: article.id,
    title: locale === "th" ? article.titleTh : article.titleEn,
    date,
    dateIso: date,
    type: "",
    body: locale === "th" ? article.bodyTh : article.bodyEn,
    // The news card reuses NewsImage, whose srcset points at pre-resized WebP variants this
    // gallery does not have, so a published card carries no photo and falls back to the bar.
    image: null,
  };
}

export function cmsNewsItems(locale: Locale, dir?: string): NewsItem[] {
  return readSite(dir).map((article) => toItem(locale, article));
}

export function cmsArticle(locale: Locale, id: string, dir?: string): PublishedArticle | null {
  const article = readSite(dir).find((entry) => entry.id === id);
  if (!article) return null;
  const date = dateOf(article);
  return {
    title: locale === "th" ? article.titleTh : article.titleEn,
    date,
    dateIso: date,
    body: locale === "th" ? article.bodyTh : article.bodyEn,
    gallery: article.media.slice(0, 5).map((media) => {
      if (!MEDIA_SRC.test(media.url)) throw new PreviewRejected(`${id} points an image outside ${PUBLISHED_SITE_DIR}`);
      return {
        src: media.url,
        alt: locale === "th" ? media.altTh : media.altEn,
        caption: locale === "th" ? media.captionTh : media.captionEn,
      };
    }),
  };
}
