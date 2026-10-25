import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ContentSearch } from "@/components/content-search";
import { Breadcrumb, PageHero } from "@/components/page-shell";
import { getContent, getSearch, isLocale } from "@/lib/i18n";
import { buildSearchIndex } from "@/lib/search-index";

type Props = { params: Promise<{ locale: string }> };

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
            <ContentSearch entries={buildSearchIndex(locale)} labels={search.labels} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
