import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb, PageHero, SourceLine } from "@/components/page-shell";
import { getContent, getNews, isLocale, splitActivities } from "@/lib/i18n";

// Events (M05). Only activities the office has already published are listed, taken from
// the news archive by the type the office assigns. The upcoming section renders only when
// a published item carries a future date — today none does, so it is absent rather than
// filled with a guessed calendar.

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
      languages: {
        th: "/th/news/events/",
        en: "/en/news/events/",
        "x-default": "/th/news/events/",
      },
    },
  };
}

function EventList({
  items,
  locale,
  thaiTitles,
}: {
  items: { nid: string; title: string; date: string; dateIso: string }[];
  locale: string;
  thaiTitles: Map<string, string>;
}) {
  return (
    <ul className="divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white">
      {items.map((item) => (
        <li key={item.nid} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:gap-4">
          {/* brand-600, not gold: gold-600 on white is 2.76:1 and fails AA at this size. */}
          <time className="shrink-0 text-sm font-semibold text-brand-600" dateTime={item.dateIso}>
            {item.date}
          </time>
          <Link
            className="text-base font-medium text-neutral-800 underline underline-offset-2 hover:text-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            href={`/${locale}/news/${item.nid}`}
          >
            {item.title || thaiTitles.get(item.nid) || item.nid}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function NewsEvents({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const news = getNews(locale);
  const site = getContent(locale);
  const { upcoming, past } = splitActivities(locale);
  const thaiTitles = new Map(getNews("th").items.map((entry) => [entry.nid, entry.title]));

  return (
    <main id="main-content" tabIndex={-1}>
      <PageHero title={news.events.hero.title} lead={news.events.hero.lead} />

      <section className="bg-surface-50 py-8">
        <div className="mx-auto w-full max-w-7xl px-4">
          <Breadcrumb
            locale={locale}
            trail={[
              { label: site.nav.home, href: `/${locale}` },
              { label: news.hero.title, href: `/${locale}/news` },
              { label: news.events.hero.title },
            ]}
          />
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="mx-auto w-full max-w-7xl px-4">
          <p className="mb-8 max-w-3xl text-sm text-neutral-600">{news.events.snapshotNote}</p>

          {upcoming.length > 0 && (
            <>
              <h2 className="mb-4 text-2xl font-bold text-neutral-800" id="upcoming">
                {news.events.upcomingTitle}
              </h2>
              <EventList items={upcoming} locale={locale} thaiTitles={thaiTitles} />
            </>
          )}

          <h2 className="mb-4 mt-10 text-2xl font-bold text-neutral-800" id="past">
            {news.events.pastTitle}
          </h2>
          {past.length > 0 ? (
            <EventList items={past} locale={locale} thaiTitles={thaiTitles} />
          ) : (
            <p className="text-neutral-600">{news.events.empty}</p>
          )}

          <p className="mt-8">
            <Link
              className="text-sm font-medium text-brand-600 underline underline-offset-2"
              href={`/${locale}/news`}
            >
              {news.events.backToNews}
            </Link>
          </p>
          <div className="mt-10">
            <SourceLine {...news.source} />
          </div>
        </div>
      </section>
    </main>
  );
}
