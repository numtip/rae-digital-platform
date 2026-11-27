import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NewsIndex } from "@/components/news-index";
import { liveNews, mergedNews, staticExportOnly } from "@/lib/cms/live";
import { getNews, getNewsPages, isLocale } from "@/lib/i18n";

// Page 1 of the news index — /news/ itself, so the canonical URL of the list never
// changes and existing links keep working.
//
// It is also the canonical list of what the office has published: the transcribed archive and
// everything the CMS says is published, one card per id, newest first. `revalidate` is the safety
// net; the publish hook (app/api/news-live/revalidate) drops the cached render immediately.

// Next reads segment config by static analysis, so this is the literal: it is NEWS_WINDOW.
export const revalidate = 30;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const news = getNews(locale);
  return {
    title: news.meta.title,
    description: news.meta.description,
    alternates: {
      canonical: `/${locale}/news/`,
      languages: { th: "/th/news/", en: "/en/news/", "x-default": "/th/news/" },
    },
  };
}

export default async function News({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const news = getNews(locale);
  const pages = getNewsPages(locale);
  const thaiTitles = new Map(getNews("th").items.map((entry) => [entry.nid, entry.title]));
  const archive = new Set(news.items.map((entry) => entry.nid));
  // Pages 2..N still paginate the archive alone, so a story the reader saw on page 1 never moves
  // between pages when the CMS adds one.
  const live = await liveNews(locale);
  const items = mergedNews(pages[0] ?? [], live.items);

  return (
    <NewsIndex
      cmsCount={items.filter((item) => !archive.has(item.nid)).length}
      current={1}
      items={items}
      locale={locale}
      news={news}
      // A static export has no runtime to be stale against: the committed copy *is* its news.
      stale={live.stale && !staticExportOnly}
      thaiTitles={thaiTitles}
      total={pages.length}
    />
  );
}
