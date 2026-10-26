import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NewsIndex } from "@/components/news-index";
import { getContent, getNews, getNewsPages, isLocale } from "@/lib/i18n";

// Pages 2..N of the news index. Static-friendly: every page is a real URL with its own
// canonical, and page 1 keeps living at /news/ rather than /news/page/1/.

type Props = { params: Promise<{ locale: string; page: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  // Page numbering starts at 2; page 1 is the /news/ route itself.
  const total = getNewsPages("th").length;
  return Array.from({ length: Math.max(0, total - 1) }, (_, index) => ({ page: String(index + 2) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, page } = await params;
  if (!isLocale(locale)) notFound();
  const news = getNews(locale);
  const total = getNewsPages(locale).length;
  const current = Number(page);
  if (!Number.isInteger(current) || current < 2 || current > total) notFound();
  return {
    title: `${news.pagination.page(current, total)} — ${news.meta.title}`,
    description: news.meta.description,
    alternates: {
      canonical: `/${locale}/news/page/${current}/`,
      languages: {
        th: `/th/news/page/${current}/`,
        en: `/en/news/page/${current}/`,
        "x-default": `/th/news/page/${current}/`,
      },
    },
  };
}

export default async function NewsPage({ params }: Props) {
  const { locale, page } = await params;
  if (!isLocale(locale)) notFound();
  const current = Number(page);
  const pages = getNewsPages(locale);
  if (!Number.isInteger(current) || current < 2 || current > pages.length) notFound();

  const news = getNews(locale);
  const thaiTitles = new Map(getNews("th").items.map((entry) => [entry.nid, entry.title]));

  return (
    <NewsIndex
      current={current}
      items={pages[current - 1]}
      locale={locale}
      news={news}
      thaiTitles={thaiTitles}
      total={pages.length}
    />
  );
}
