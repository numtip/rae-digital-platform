import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ContentSearch } from "@/components/content-search";
import { Breadcrumb, PageHero } from "@/components/page-shell";
import { liveNews } from "@/lib/cms/live";
import { getContent, getSearch, isLocale } from "@/lib/i18n";
import { buildSearchIndex } from "@/lib/search-index";

type Props = { params: Promise<{ locale: string }> };

// The archive index is built once and filtered in the browser, so search keeps working on the
// static export. The published set is appended here, on the server, from the same read the news
// pages use: one search box, one ranking, and a story published a minute ago is already findable.
// Next reads segment config by static analysis, so this is the literal: it is NEWS_WINDOW.
export const revalidate = 30;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const search = getSearch(locale);
  return {
    title: search.meta.title,
    description: search.meta.description,
    alternates: {
      canonical: `/${locale}/search/`,
      languages: { th: "/th/search/", en: "/en/search/", "x-default": "/th/search/" },
    },
  };
}

export default async function Search({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const search = getSearch(locale);
  const { items } = await liveNews(locale);
  // Same shape the index uses, so the client component and the category chips need no special
  // case: a published story is a "news" item like any archive story.
  const published = items.map((item) => ({
    kind: "item" as const,
    title: item.title,
    text: item.body.join(" · "),
    href: `/${locale}/news/${item.nid}`,
  }));

  return (
    <main id="main-content" tabIndex={-1}>
      <PageHero title={search.hero.title} lead={search.hero.lead} />
      <section className="bg-surface-50 py-16">
        <div className="mx-auto w-full max-w-7xl px-4">
          <Breadcrumb
            locale={locale}
            trail={[
              { label: getContent(locale).nav.home, href: `/${locale}` },
              { label: search.hero.title },
            ]}
          />
          <Suspense fallback={<p className="text-neutral-700">{search.labels.empty}</p>}>
            <ContentSearch entries={[...buildSearchIndex(locale), ...published]} labels={search.labels} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
