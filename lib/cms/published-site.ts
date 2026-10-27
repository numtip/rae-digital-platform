import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { NewsItem } from "../../content/th/news.ts";
import { articlesFromExport, PreviewRejected, type PreviewArticle } from "./preview-site.ts";

// The bridge from a locally generated copy of the CMS export to the real news templates.
// `scripts/cms-preview.mjs --site-data` writes `public/cms-published/`, which is git-ignored:
// in CI the directory does not exist, so every function here returns nothing and the site
// renders exactly the archive it always did. Nothing here can publish anything.

export type Locale = "th" | "en";

export type PublishedGalleryItem = { src: string; alt: string; caption: string };

export type PublishedArticle = {
  title: string;
  /** The export carries no publication date, so this is the date the copy was taken. */
  date: string;
  dateIso: string;
  body: string[];
  gallery: PublishedGalleryItem[];
};

export const PUBLISHED_SITE_DIR = join("public", "cms-published");

// Only files this project's own generator can have written: the id folder plus the runtime's
// `NN-xxxxxxxx.ext` name. Anything else in the JSON is not something to put in an <img src>.
const MEDIA_SRC = /^\/cms-published\/[a-z0-9][a-z0-9-]{1,63}\/\d{2}-[0-9a-f]{8}\.(png|jpg|webp)$/;

type SiteData = { generatedAt?: string; articles?: (Partial<PreviewArticle> & { status?: string })[] };

const siteDir = (override?: string) => override ?? join(process.cwd(), PUBLISHED_SITE_DIR);

function readSite(override?: string) {
  const file = join(siteDir(override), "index.json");
  if (!existsSync(file)) return { date: "", articles: [] as PreviewArticle[] };
  const payload = JSON.parse(readFileSync(file, "utf8")) as SiteData;
  // The file keeps the export's shape, so the export's own gate runs over it: a draft, an
  // unsafe id or a half-translated article throws here instead of reaching a page.
  return { date: String(payload.generatedAt ?? "").slice(0, 10), articles: articlesFromExport(payload) };
}

export function publishedIds(dir?: string): string[] {
  return readSite(dir).articles.map((article) => article.id);
}

function toItem(locale: Locale, article: PreviewArticle, date: string): NewsItem {
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
  const { date, articles } = readSite(dir);
  return articles.map((article) => toItem(locale, article, date));
}

export function cmsArticle(locale: Locale, id: string, dir?: string): PublishedArticle | null {
  const { date, articles } = readSite(dir);
  const article = articles.find((entry) => entry.id === id);
  if (!article) return null;
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
