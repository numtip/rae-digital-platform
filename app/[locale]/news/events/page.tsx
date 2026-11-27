import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventsIndex } from "@/components/events-index";
import { getNews, isLocale } from "@/lib/i18n";

// Events (M05). Page 1 of the events archive plus CMS-published events (read live, so the page
// revalidates). Older archive pages live at /news/events/page/N/.
export const revalidate = 60;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const events = getNews(locale).events;
  return {
    title: events.meta.title,
    description: events.meta.description,
    alternates: {
      canonical: `/${locale}/news/events/`,
      languages: { th: "/th/news/events/", en: "/en/news/events/", "x-default": "/th/news/events/" },
    },
  };
}

export default async function NewsEvents({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <EventsIndex current={1} locale={locale} />;
}
