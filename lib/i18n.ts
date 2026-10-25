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
import { thNews, type NewsContent } from "@/content/th/news";
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
export type { NewsContent } from "@/content/th/news";
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
  const news = NEWS[locale];
  if (locale === "th") return news;
  // A story has a photo or it does not — the Thai source of truth records which.
  // The English file cannot know, and a blanket image path pointed four stories
  // (procurement/audit notices) at files that were never published.
  const withPhoto = new Set(thNews.items.filter((item) => item.image).map((item) => item.nid));
  return { ...news, items: news.items.map((item) => ({ ...item, image: withPhoto.has(item.nid) ? item.image : null })) };
}

export function getSearch(locale: Locale): SearchContent {
  return SEARCH[locale];
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
];

// Interior pages that exist in every locale, in the order the sitemap lists them.
export const PAGES = ["about", "research", "services", "documents", "news", "search"] as const;

// shortcut: placeholder origin until the owner names the production domain;
// canonical/hreflang/sitemap need an absolute base, so set NEXT_PUBLIC_SITE_URL
// at deploy time. The Pages preview workflow passes
// https://numtip.github.io/rae-digital-platform for that reason.
// TODO(owner): set the real domain here once approved — no other file may hardcode one.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
