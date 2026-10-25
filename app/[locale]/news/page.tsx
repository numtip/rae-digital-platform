import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CARD, ExternalLink, PageHero, SourceLine } from "@/components/page-shell";
import { getNews, isLocale } from "@/lib/i18n";

// Headlines come from content/<locale>/news.ts — a dated snapshot of the official
// news list. The office site stays the live source, and the page says so.

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

  return (
    <main id="main-content" tabIndex={-1}>
      <PageHero title={news.hero.title} lead={news.hero.lead} />

      <section className="bg-surface-50 py-16">
        <div className="mx-auto w-full max-w-7xl px-4">
          <div className={CARD}>
            <h2 className="text-2xl font-bold text-neutral-800">{news.snapshot.title}</h2>
            <p className="mt-2 text-sm text-neutral-600">{news.snapshot.note}</p>
            <ul className="mt-6 space-y-3">
              {news.snapshot.items.map((item) => (
                <li key={item} className="flex gap-3 text-neutral-700">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={`${CARD} mt-6`}>
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
        </div>
      </section>
    </main>
  );
}
