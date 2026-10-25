import { en } from "@/content/en/site";
import { th, type SiteContent } from "@/content/th/site";

export const LOCALES = ["th", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "th";

export type { SiteContent } from "@/content/th/site";

const CONTENT: Record<Locale, SiteContent> = { th, en };

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function getContent(locale: Locale): SiteContent {
  return CONTENT[locale];
}

// Each language named in that language — a switcher label readers recognise.
export const LOCALE_LABEL: Record<Locale, string> = { th: "ไทย", en: "English" };

// Nav order and target slugs (architecture §3.1). `href` is filled in only once
// the page exists, so no nav item is a link to a 404.
export const NAV: { key: keyof SiteContent["nav"]; href?: (locale: Locale) => string }[] = [
  { key: "home", href: (locale) => `/${locale}` },
  { key: "about" },
  { key: "research" },
  { key: "services" },
  { key: "documents" },
  { key: "news" },
];

// shortcut: placeholder origin until the owner names the production domain;
// canonical/hreflang/sitemap need an absolute base, so set NEXT_PUBLIC_SITE_URL
// at deploy time. The Pages preview workflow passes
// https://numtip.github.io/rae-digital-platform for that reason.
// TODO(owner): set the real domain here once approved — no other file may hardcode one.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
