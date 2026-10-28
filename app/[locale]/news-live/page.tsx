import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NewsGrid } from "@/components/news-grid";
import { Breadcrumb, PageHero, SourceLine } from "@/components/page-shell";
import { liveNews } from "@/lib/cms/live";
import { getContent, getNews, isLocale } from "@/lib/i18n";

// The live index: published items are read from the CMS at request time, so a story that was
// published a minute ago is on this page on the next render — no commit, no rebuild.
//
// Pilot only: /news/ keeps working exactly as before. `revalidate` is the safety net; the publish
// hook (app/api/news-live/revalidate) cuts it short when the runtime says something changed.
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
      canonical: `/${locale}/news-live/`,
      languages: { th: "/th/news-live/", en: "/en/news-live/", "x-default": "/th/news-live/" },
    },
  };
}

export default async function LiveNews({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const news = getNews(locale);
  const { items, stale } = await liveNews(locale);

  return (
    <main id="main-content" tabIndex={-1}>
      <PageHero title={news.hero.title} lead={news.hero.lead} />

      <section className="bg-surface-50 py-16">
        <div className="mx-auto w-full max-w-7xl px-4">
          <Breadcrumb
            locale={locale}
            trail={[{ label: getContent(locale).nav.home, href: `/${locale}` }, { label: news.hero.title }]}
          />
          <p className="mb-6 max-w-3xl text-sm text-neutral-600">{stale ? news.labels.liveStale : news.labels.liveNote}</p>

          {items.length > 0 ? (
            // Every live item carries both titles, so there is no Thai-only fallback to look up.
            <NewsGrid
              items={items}
              labels={news.labels}
              locale={locale}
              section="news-live"
              thaiTitles={new Map<string, string>()}
            />
          ) : (
            <p className="rounded-lg border border-neutral-200 bg-white p-6 text-neutral-700">{news.labels.liveEmpty}</p>
          )}

          <p className="mt-6">
            <Link className="text-sm font-medium text-brand-600 underline underline-offset-2" href={`/${locale}/news`}>
              {news.labels.back}
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
