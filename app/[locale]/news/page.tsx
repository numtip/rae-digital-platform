import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CARD, ExternalLink, PageHero, SourceLine } from "@/components/page-shell";
import { asset } from "@/lib/assets";
import { getNews, isLocale } from "@/lib/i18n";

// Headlines, dates and lead images come from content/<locale>/news.ts — a dated
// snapshot of the official news list. Each item opens its own page; the office
// site stays the live source, and the page says so.

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
          <p className="mb-6 text-sm text-neutral-600">{news.snapshotNote}</p>

          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {news.items.map((item) => (
              <li key={item.nid} className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
                <Link className="group block" href={`/${locale}/news/${item.nid}`}>
                  <Image
                    alt={item.image.alt}
                    className="h-44 w-full object-cover"
                    height={800}
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    src={asset(item.image.src)}
                    width={1200}
                  />
                  <div className="p-5">
                    <p className="text-xs font-semibold text-gold-600">{item.date}</p>
                    <h2 className="mt-2 text-lg font-bold leading-snug text-neutral-800 group-hover:text-brand-600">
                      {item.title}
                    </h2>
                    <p className="mt-3 text-sm font-semibold text-brand-600 underline underline-offset-2">
                      {news.labels.read}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

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
        </div>
      </section>
    </main>
  );
}
