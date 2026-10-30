import type { MetadataRoute } from "next";
import { liveNews, liveSitemap } from "@/lib/cms/live";
import { LOCALES, PAGES, SITE_URL, getDocuments, getNews, getNewsPages } from "@/lib/i18n";

// Two builds share this file. A server revalidates it (`revalidate`), so a story published a
// minute ago is listed without a rebuild and the publish hook drops it sooner. The GitHub Pages
// export has no server to ask — `output: "export"` renders the sitemap once at build time — and
// there the committed copy is exactly what the site serves, so the same read is correct.
//
// Deliberately no `dynamic = "force-static"`: with NEXT_PAGES_PREVIEW=1 the export is static
// anyway, and on a server that line would freeze the live ids out of the file forever.
// Literal, not NEWS_WINDOW: Next only accepts a statically analysed segment config.
export const revalidate = 30;

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  // The published set: the ids the archive does not already list, in both locales. Read at render
  // time (ISR on a server, the committed copy at build on Pages), so a story published without a
  // rebuild is still listed — and one the hook reported withdrawn is not, even during an outage.
  const { items: published } = await liveNews("th");
  const liveItems = liveSitemap(published, new Set(getNews("th").items.map((item) => item.nid)), SITE_URL);

  return [
    ...home,
    ...pages,
    ...events,
    ...newsItems,
    ...docCategories,
    ...newsIndexPages,
    ...liveItems,
  ];
}
