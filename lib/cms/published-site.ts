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
  /** The publication day as a reader sees it: the locale's date on the Bangkok calendar. */
  date: string;
  /** The export's own ISO 8601 instant, unchanged, for structured data. */
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

// The export carries the publication instant in UTC, and it stays UTC — only the label is
// rendered on the office's own calendar. Thai gets the Buddhist-era year it publishes in.
const DATE_LABEL: Record<Locale, Intl.DateTimeFormat> = {
  th: new Intl.DateTimeFormat("th-TH-u-ca-buddhist", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" }),
  en: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" }),
};

// Never a date we made up: a runtime that exports no publication stamp leaves the date off the
// page, and a stamp in the wrong shape is a bug worth failing on rather than rendering.
function dateOf(locale: Locale, article: PreviewArticle): { date: string; dateIso: string } {
  if (!article.publishedAt) return { date: "", dateIso: "" };
  const at = new Date(article.publishedAt);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(article.publishedAt) || Number.isNaN(at.getTime())) {
    throw new PreviewRejected(`${article.id} has a malformed publishedAt: ${article.publishedAt}`);
  }
  return { date: DATE_LABEL[locale].format(at), dateIso: article.publishedAt };
}

// The publication stamp the page shows: the label needs a display date and the JSON-LD needs
// the ISO one. `null` when the export carried no stamp, so a missing date renders no label at
// all and leaves `datePublished` out, instead of an empty line or the string "undefined".
export function publicationStamp(date: string, dateIso: string) {
  return date ? { date, datePublished: dateIso || undefined } : null;
}

export function publishedIds(dir?: string): string[] {
  return readSite(dir).map((article) => article.id);
}

// One rule for every image the bridge emits: the export's media paths are the generator's own
// `/cms-published/<id>/NN-xxxxxxxx.ext`, so anything else is not something to put in an <img src>.
function photoSrc(article: PreviewArticle, url: string): string {
  if (!MEDIA_SRC.test(url)) throw new PreviewRejected(`${article.id} points an image outside ${PUBLISHED_SITE_DIR}`);
  return url;
}

function toItem(locale: Locale, article: PreviewArticle): NewsItem {
  const { date, dateIso } = dateOf(locale, article);
  const first = article.media[0];
  return {
    nid: article.id,
    title: locale === "th" ? article.titleTh : article.titleEn,
    date,
    dateIso,
    type: "",
    body: locale === "th" ? article.bodyTh : article.bodyEn,
    // The card shows the article's own lead photo. It is a single file, so lib/assets.ts hands it
    // to the card without a srcset rather than naming widths that were never built.
    // shortcut: the card loads the uploaded file at full size — no resized copy exists. Acceptable
    // because this data never reaches a production build; resize when syndication becomes real.
    image: first ? { src: photoSrc(article, first.url), alt: locale === "th" ? first.altTh : first.altEn } : null,
  };
}

export function cmsNewsItems(locale: Locale, dir?: string): NewsItem[] {
  return readSite(dir).map((article) => toItem(locale, article));
}

export function cmsArticle(locale: Locale, id: string, dir?: string): PublishedArticle | null {
  const article = readSite(dir).find((entry) => entry.id === id);
  if (!article) return null;
  const { date, dateIso } = dateOf(locale, article);
  return {
    title: locale === "th" ? article.titleTh : article.titleEn,
    date,
    dateIso,
    body: locale === "th" ? article.bodyTh : article.bodyEn,
    gallery: article.media.slice(0, 5).map((media) => ({
      src: photoSrc(article, media.url),
      alt: locale === "th" ? media.altTh : media.altEn,
      caption: locale === "th" ? media.captionTh : media.captionEn,
    })),
  };
}
