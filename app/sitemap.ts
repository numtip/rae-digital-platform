import type { MetadataRoute } from "next";
import { LOCALES, PAGES, SITE_URL, getNews } from "@/lib/i18n";

// Static export (GitHub Pages preview) needs an explicit static route.
export const dynamic = "force-static";

// Same alternates as the page head, x-default included — the sitemap and the
// <link rel="alternate"> block must not disagree.
function languagesFor(path: string) {
  const suffix = path ? `${path}/` : "";
  return {
    th: `${SITE_URL}/th/${suffix}`,
    en: `${SITE_URL}/en/${suffix}`,
    "x-default": `${SITE_URL}/th/${suffix}`,
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const home = LOCALES.map((locale) => ({
    url: `${SITE_URL}/${locale}/`,
    changeFrequency: "weekly" as const,
    priority: locale === "th" ? 1 : 0.8,
    alternates: { languages: languagesFor("") },
  }));

  const pages = PAGES.flatMap((page) =>
    LOCALES.map((locale) => ({
      url: `${SITE_URL}/${locale}/${page}/`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
      alternates: { languages: languagesFor(page) },
    })),
  );

  // One entry per published news item, both locales, same alternates as the rest.
  const newsItems = getNews("th").items.flatMap((item) =>
    LOCALES.map((locale) => ({
      url: `${SITE_URL}/${locale}/news/${item.nid}/`,
      lastModified: item.dateIso,
      changeFrequency: "yearly" as const,
      priority: 0.4,
      alternates: { languages: languagesFor(`news/${item.nid}`) },
    })),
  );

  return [...home, ...pages, ...newsItems];
}
