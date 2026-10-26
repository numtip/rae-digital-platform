import { enDirectory } from "@/content/en/directory";
import { thDirectory, type DirectoryContent } from "@/content/th/directory";
import { en } from "@/content/en/site";
import { enAbout } from "@/content/en/about";
import { enDocuments } from "@/content/en/documents";
import { enNews } from "@/content/en/news";
import { enResearch } from "@/content/en/research";
import { enSearch } from "@/content/en/search";
import { enServices } from "@/content/en/services";
import { th, type SiteContent } from "@/content/th/site";
import { thAbout, type AboutContent } from "@/content/th/about";
import { thDocuments, type DocumentsContent } from "@/content/th/documents";
import { thNews, type NewsContent, type NewsItem } from "@/content/th/news";
import { thResearch, type ResearchContent } from "@/content/th/research";
import { thSearch, type SearchContent } from "@/content/th/search";
import { thServices, type ServicesContent } from "@/content/th/services";

export const LOCALES = ["th", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "th";

export type { SiteContent } from "@/content/th/site";
export type { AboutContent } from "@/content/th/about";
export type { ResearchContent } from "@/content/th/research";
export type { ServicesContent } from "@/content/th/services";
export type { DocumentsContent } from "@/content/th/documents";
export type { NewsContent, NewsItem } from "@/content/th/news";
export type { SearchContent } from "@/content/th/search";

const CONTENT: Record<Locale, SiteContent> = { th, en };

// One entry per page whose copy lives in its own file. The TH file defines the
// shape, so a missing/extra English key fails `npm run typecheck`.
const ABOUT: Record<Locale, AboutContent> = { th: thAbout, en: enAbout };
const RESEARCH: Record<Locale, ResearchContent> = { th: thResearch, en: enResearch };
const SERVICES: Record<Locale, ServicesContent> = { th: thServices, en: enServices };
const DOCUMENTS: Record<Locale, DocumentsContent> = { th: thDocuments, en: enDocuments };
const NEWS: Record<Locale, NewsContent> = { th: thNews, en: enNews };
const SEARCH: Record<Locale, SearchContent> = { th: thSearch, en: enSearch };
const DIRECTORY: Record<Locale, DirectoryContent> = { th: thDirectory, en: enDirectory };

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function getContent(locale: Locale): SiteContent {
  return CONTENT[locale];
}

export function getAbout(locale: Locale): AboutContent {
  return ABOUT[locale];
}

export function getResearch(locale: Locale): ResearchContent {
  return RESEARCH[locale];
}

export function getServices(locale: Locale): ServicesContent {
  return SERVICES[locale];
}

export function getDocuments(locale: Locale): DocumentsContent {
  return DOCUMENTS[locale];
}

export function getNews(locale: Locale): NewsContent {
  // Whether a story has a photo is decided once, in content/en/news.ts, from the Thai
  // source of truth (HAS_PHOTO). It used to be repaired here as well after the same bug
  // was fixed twice; the duplication was removed so the rule lives in one layer.
  return NEWS[locale];
}

export function getSearch(locale: Locale): SearchContent {
  return SEARCH[locale];
}

export function getDirectory(locale: Locale): DirectoryContent {
  return DIRECTORY[locale];
}

// One page of the news index. Every page is a real URL, so the whole thing stays a
// static export: /news/ is page 1, /news/page/2/ onwards are generated routes.
export const NEWS_PAGE_SIZE = 12;

export function getNewsPages(locale: Locale): NewsItem[][] {
  const items = getNews(locale).items;
  const pages: NewsItem[][] = [];
  for (let index = 0; index < items.length; index += NEWS_PAGE_SIZE) {
    pages.push(items.slice(index, index + NEWS_PAGE_SIZE));
  }
  return pages;
}

// Each language named in that language — a switcher label readers recognise.
export const LOCALE_LABEL: Record<Locale, string> = { th: "ไทย", en: "English" };

// Nav order and target slugs (architecture §3.1). `href` is filled in only once
// the page exists, so no nav item is a link to a 404.
export const NAV: { key: keyof SiteContent["nav"]; href?: (locale: Locale) => string }[] = [
  { key: "home", href: (locale) => `/${locale}` },
  { key: "about", href: (locale) => `/${locale}/about` },
  { key: "research", href: (locale) => `/${locale}/research` },
  { key: "services", href: (locale) => `/${locale}/services` },
  { key: "documents", href: (locale) => `/${locale}/documents` },
  { key: "news", href: (locale) => `/${locale}/news` },
  { key: "contact", href: (locale) => `/${locale}/contact` },
];

// Interior pages that exist in every locale, in the order the sitemap lists them.
export const PAGES = ["about", "research", "services", "documents", "news", "contact", "search", "directory"] as const;

// shortcut: placeholder origin until the owner names the production domain;
// canonical/hreflang/sitemap need an absolute base, so set NEXT_PUBLIC_SITE_URL
// at deploy time. The Pages preview workflow passes
// https://numtip.github.io/rae-digital-platform for that reason.
// TODO(owner): set the real domain here once approved — no other file may hardcode one.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
