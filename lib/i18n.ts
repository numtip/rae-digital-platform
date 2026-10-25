import { en } from "@/content/en/site";
import { enAbout } from "@/content/en/about";
import { th, type SiteContent } from "@/content/th/site";
import { thAbout, type AboutContent } from "@/content/th/about";

export const LOCALES = ["th", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "th";

export type { SiteContent } from "@/content/th/site";
export type { AboutContent } from "@/content/th/about";

const CONTENT: Record<Locale, SiteContent> = { th, en };

// One entry per page whose copy lives in its own file. The TH file defines the
// shape, so a missing/extra English key fails `npm run typecheck`.
const ABOUT: Record<Locale, AboutContent> = { th: thAbout, en: enAbout };

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function getContent(locale: Locale): SiteContent {
  return CONTENT[locale];
}

export function getAbout(locale: Locale): AboutContent {
  return ABOUT[locale];
}

// Each language named in that language — a switcher label readers recognise.
export const LOCALE_LABEL: Record<Locale, string> = { th: "ไทย", en: "English" };

// Nav order and target slugs (architecture §3.1). `href` is filled in only once
// the page exists, so no nav item is a link to a 404.
export const NAV: { key: keyof SiteContent["nav"]; href?: (locale: Locale) => string }[] = [
  { key: "home", href: (locale) => `/${locale}` },
  { key: "about", href: (locale) => `/${locale}/about` },
  { key: "research" },
  { key: "services" },
  { key: "documents" },
  { key: "news" },
];

// Interior pages that exist in every locale, in the order the sitemap lists them.
export const PAGES = ["about"] as const;

// shortcut: placeholder origin until the owner names the production domain;
// canonical/hreflang/sitemap need an absolute base, so set NEXT_PUBLIC_SITE_URL
// at deploy time. The Pages preview workflow passes
// https://numtip.github.io/rae-digital-platform for that reason.
// TODO(owner): set the real domain here once approved — no other file may hardcode one.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
