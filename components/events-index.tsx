import Link from "next/link";
import { CmsEvents } from "@/components/cms-events";
import { Breadcrumb, PageHero, SourceLine } from "@/components/page-shell";
import { Pagination } from "@/components/pagination";
import { readPublicEvents, splitPublicEvents } from "@/lib/cms/events-live";
import { getContent, getNews, splitActivities, type Locale } from "@/lib/i18n";

// Shared body of /news/events/ (page 1) and /news/events/page/N/ (older archive pages). The archive list is
// cut into EVENTS_PAGE_SIZE items per page; the CMS events (M05) and the upcoming list belong to page 1 only.
export const EVENTS_PAGE_SIZE = 10;

export function eventsPageCount(locale: Locale) {
  return Math.max(1, Math.ceil(splitActivities(locale).past.length / EVENTS_PAGE_SIZE));
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

export async function EventsIndex({ locale, current }: { locale: Locale; current: number }) {
  const news = getNews(locale);
  const site = getContent(locale);
  const { upcoming, past } = splitActivities(locale);
  const total = eventsPageCount(locale);
  const pageItems = past.slice((current - 1) * EVENTS_PAGE_SIZE, current * EVENTS_PAGE_SIZE);
  const first = current === 1;
  const cmsEvents = first ? await readPublicEvents() : [];
  const cmsSplit = splitPublicEvents(cmsEvents);
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
          {first ? <CmsEvents events={cmsEvents} locale={locale} {...cmsSplit} /> : null}
          <p className="mb-8 max-w-3xl text-sm text-neutral-600">{news.events.snapshotNote}</p>

          {first && upcoming.length > 0 && (
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
          {pageItems.length > 0 ? (
            <EventList items={pageItems} locale={locale} thaiTitles={thaiTitles} />
          ) : (
            <p className="text-neutral-600">{news.events.empty}</p>
          )}

          <Pagination basePath={`/${locale}/news/events`} current={current} labels={news.pagination} locale={locale} total={total} />

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
