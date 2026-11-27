import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventsIndex, eventsPageCount } from "@/components/events-index";
import { getNews, isLocale } from "@/lib/i18n";

// Pages 2..N of the events archive (10 per page). Page 1 is /news/events/ itself.
type Props = { params: Promise<{ locale: string; page: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  const total = eventsPageCount("th");
  return Array.from({ length: Math.max(0, total - 1) }, (_, index) => ({ page: String(index + 2) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, page } = await params;
  if (!isLocale(locale)) notFound();
  const current = Number(page);
  const total = eventsPageCount(locale);
  if (!Number.isInteger(current) || current < 2 || current > total) notFound();
  const news = getNews(locale);
  return {
    title: `${news.pagination.page(current, total)} — ${news.events.meta.title}`,
    description: news.events.meta.description,
    alternates: {
      canonical: `/${locale}/news/events/page/${current}/`,
      languages: {
        th: `/th/news/events/page/${current}/`,
        en: `/en/news/events/page/${current}/`,
        "x-default": `/th/news/events/page/${current}/`,
      },
    },
  };
}

export default async function EventsPage({ params }: Props) {
  const { locale, page } = await params;
  if (!isLocale(locale)) notFound();
  const current = Number(page);
  if (!Number.isInteger(current) || current < 2 || current > eventsPageCount(locale)) notFound();
  return <EventsIndex current={current} locale={locale} />;
}
