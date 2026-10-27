import Link from "next/link";
import { NewsGrid } from "@/components/news-grid";
import { Pagination } from "@/components/pagination";
import { Breadcrumb, CARD, ExternalLink, PageHero, SourceLine } from "@/components/page-shell";
import { cmsNewsItems } from "@/lib/cms/published-site";
import { getContent, type Locale, type NewsContent, type NewsItem } from "@/lib/i18n";

// Shared body of the news index: page 1 at /news/ and /news/page/N/ are the same
// markup, only the slice differs. Kept in one place so the two routes cannot drift.

export function NewsIndex({
  locale,
  news,
  items,
  current,
  total,
  thaiTitles,
}: {
  locale: Locale;
  news: NewsContent;
  items: NewsItem[];
  current: number;
  total: number;
  thaiTitles: Map<string, string>;
}) {
  // The intro states the size of the list it sits on, so a published CMS item, wherever it is
  // paged to, is counted here rather than in a number baked into the copy.
  const listed = news.items.length + cmsNewsItems(locale).length;
  return (
    <main id="main-content" tabIndex={-1}>
      <PageHero title={news.hero.title} lead={news.hero.lead} />

      <section className="bg-surface-50 py-16">
        <div className="mx-auto w-full max-w-7xl px-4">
          <Breadcrumb
            locale={locale}
            trail={[
              { label: getContent(locale).nav.home, href: `/${locale}` },
              { label: news.hero.title },
            ]}
          />
          <p className="mb-6 text-sm text-neutral-600">{news.snapshotNote(listed)}</p>
          <p className="mb-6">
            <Link
              className="text-sm font-medium text-brand-600 underline underline-offset-2"
              href={`/${locale}/news/events`}
            >
              {news.labels.eventsLink}
            </Link>
          </p>

          <NewsGrid items={items} labels={news.labels} locale={locale} thaiTitles={thaiTitles} />

          <Pagination current={current} labels={news.pagination} locale={locale} total={total} />

          <div className={`${CARD} mt-10`}>
            <h2 className="text-lg font-bold text-neutral-800">{news.categories.title}</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {news.categories.items.map((category) => (
                <li
                  key={category}
                  className="rounded-full border border-brand-500/30 bg-brand-500/5 px-4 py-1.5 text-sm text-brand-700"
                >
                  {category}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto w-full max-w-7xl px-4">
          <ExternalLink href={news.officialLink.url}>{news.officialLink.label}</ExternalLink>
          <div className="mt-10">
            <SourceLine {...news.source} />
          </div>
          {current > 1 && (
            <p className="mt-6 text-sm">
              <Link className="text-brand-600 underline underline-offset-2" href={`/${locale}/news`}>
                {news.labels.back}
              </Link>
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
