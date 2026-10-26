import type { MetadataRoute } from "next";
import { LOCALES, PAGES, SITE_URL, getDocuments, getNews, getNewsPages } from "@/lib/i18n";

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

  // Document categories: a stable slug per category, both locales.
  const docCategories = getDocuments("th").groups.flatMap((group) =>
    LOCALES.map((locale) => ({
      url: `${SITE_URL}/${locale}/documents/category/${group.slug}/`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
      alternates: { languages: languagesFor(`documents/category/${group.slug}`) },
    })),
  );

  // Events (M05) lives under the news section, so it is not in PAGES.
  const events = LOCALES.map((locale) => ({
    url: `${SITE_URL}/${locale}/news/events/`,
    changeFrequency: "weekly" as const,
    priority: 0.5,
    alternates: { languages: languagesFor("news/events") },
  }));

  // News index pages 2..N; page 1 is already in PAGES as /news/.
  const newsPageCount = getNewsPages("th").length;
  const newsIndexPages = Array.from({ length: Math.max(0, newsPageCount - 1) }, (_, index) => index + 2)
    .flatMap((page) =>
      LOCALES.map((locale) => ({
        url: `${SITE_URL}/${locale}/news/page/${page}/`,
        changeFrequency: "weekly" as const,
        priority: 0.3,
        alternates: { languages: languagesFor(`news/page/${page}`) },
      })),
    );

  return [...home, ...pages, ...events, ...newsItems, ...docCategories, ...newsIndexPages];
}
