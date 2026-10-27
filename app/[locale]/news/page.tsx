import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NewsIndex } from "@/components/news-index";
import { cmsNewsItems } from "@/lib/cms/published-site";
import { getNews, getNewsPages, isLocale } from "@/lib/i18n";

// Page 1 of the news index — /news/ itself, so the canonical URL of the list never
// changes and existing links keep working.

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
  // A freshly published CMS item belongs at the top of page 1; the pagination still counts the
  // archive, so nothing moves between pages. Empty unless the local data file exists.
  const items = [...cmsNewsItems(locale), ...(pages[0] ?? [])];

  return (
    <NewsIndex
      current={1}
      items={items}
      locale={locale}
      news={news}
      thaiTitles={thaiTitles}
      total={pages.length}
    />
  );
}
