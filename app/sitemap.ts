import type { MetadataRoute } from "next";
import { LOCALES, SITE_URL } from "@/lib/i18n";

// Same alternates as the page head, x-default included — the sitemap and the
// <link rel="alternate"> block must not disagree.
const languages = {
  th: `${SITE_URL}/th/`,
  en: `${SITE_URL}/en/`,
  "x-default": `${SITE_URL}/th/`,
};

export default function sitemap(): MetadataRoute.Sitemap {
  return LOCALES.map((locale) => ({
    url: `${SITE_URL}/${locale}/`,
    changeFrequency: "weekly",
    priority: locale === "th" ? 1 : 0.8,
    alternates: { languages },
  }));
}
