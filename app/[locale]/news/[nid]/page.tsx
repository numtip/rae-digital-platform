import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NewsImage } from "@/components/news-image";
import { Breadcrumb, CARD, SourceLine } from "@/components/page-shell";
import { asset } from "@/lib/assets";
import { SITE_URL, getContent, getNews, isLocale } from "@/lib/i18n";

// One page per published item. Bodies are the office's own text (Thai); the
// English route shows that Thai text and says so, rather than pretending to have
// a translation (ADR-0005).

type Props = { params: Promise<{ locale: string; nid: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getNews("th").items.map((item) => ({ nid: item.nid }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, nid } = await params;
  if (!isLocale(locale)) notFound();
  const news = getNews(locale);
  const item = news.items.find((entry) => entry.nid === nid);
  if (!item) notFound();
  return {
    title: `${item.title} — ${getContent(locale).header.orgFull}`,
    description: item.body[0] ?? item.title,
    alternates: {
      canonical: `/${locale}/news/${nid}/`,
      languages: {
        th: `/th/news/${nid}/`,
        en: `/en/news/${nid}/`,
        "x-default": `/th/news/${nid}/`,
      },
    },
    openGraph: {
      title: item.title,
      type: "article",
      images: item.image ? [{ url: item.image.src }] : [],
    },
  };
}

export default async function NewsItemPage({ params }: Props) {
  const { locale, nid } = await params;
  if (!isLocale(locale)) notFound();
  const news = getNews(locale);
  const item = news.items.find((entry) => entry.nid === nid);
  if (!item) notFound();

  // Bodies exist in Thai only; show them in both locales, labelled honestly.
  const thai = getNews("th").items.find((entry) => entry.nid === nid);
  const body = item.body.length > 0 ? item.body : (thai?.body ?? []);
  const title = item.title || thai?.title || nid;
  const showThaiOnlyNotice = item.body.length === 0 && body.length > 0;

  // A reader who finishes an article should be able to keep reading without going back
  // to the list. The archive is ordered newest-first, so the entry before this one is
  // newer and the entry after it is older.
  const ordered = getNews("th").items;
  const index = ordered.findIndex((entry) => entry.nid === nid);
  const localisedTitles = new Map(news.items.map((entry) => [entry.nid, entry.title]));
  const neighbour = (offset: number) =>
    index >= 0 && index + offset >= 0 && index + offset < ordered.length
      ? ordered[index + offset]
      : null;
  const newer = neighbour(-1);
  const older = neighbour(1);
  const neighbourTitle = (entry: { nid: string; title: string }) =>
    localisedTitles.get(entry.nid) || entry.title;

  // The article URL is the page's own canonical, so a crawler reads the same address the
  // head advertises; `inLanguage` stays "th" because the body is the Thai text as published,
  // whatever the headline language on the English route.
  const articleUrl = `${SITE_URL}/${locale}/news/${item.nid}/`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: item.title || title,
    datePublished: item.dateIso,
    inLanguage: "th",
    mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
    url: articleUrl,
    image: item.image ? [`${SITE_URL}${asset(item.image.src)}`] : undefined,
    publisher: { "@type": "Organization", name: getContent(locale).header.orgFull },
  };

  return (
    <main id="main-content" tabIndex={-1}>
      <section className="bg-brand-700 py-12 text-white">
        <div className="mx-auto w-full max-w-4xl px-4">
          <p className="text-sm text-neutral-200">
            {news.labels.type}: {item.type}
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight md:text-4xl">{title}</h1>
          {!item.title && news.labels.headlineThaiOnly && (
            <p className="mt-2 text-sm text-neutral-300">{news.labels.headlineThaiOnly}</p>
          )}
          <p className="mt-3 text-neutral-200">
            {news.labels.published}: {item.date}
          </p>
        </div>
      </section>

      <section className="bg-surface-50 py-12">
        <div className="mx-auto w-full max-w-4xl px-4">
          <Breadcrumb
            locale={locale}
            trail={[
              { label: getContent(locale).nav.home, href: `/${locale}` },
              { label: news.hero.title, href: `/${locale}/news` },
              { label: title },
            ]}
          />
          {item.image && (
            <NewsImage
              alt={item.image.alt || title}
              className="aspect-[16/10] w-full rounded-lg object-cover shadow-sm"
              eager
              sizes="(min-width: 1024px) 56rem, 100vw"
              src={item.image.src}
            />
          )}

          <div className={`${CARD} mt-6`}>
            {showThaiOnlyNotice && (
              <p className="mb-4 rounded-md border-l-4 border-gold-500 bg-cream-50 p-3 text-sm text-neutral-700">
                {news.labels.thaiOnly}
              </p>
            )}
            <div className="space-y-4 text-lg leading-relaxed text-neutral-800">
              {body.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>

          <nav aria-label={news.labels.navLabel} className="mt-8 grid gap-4 border-t border-neutral-200 pt-6 sm:grid-cols-2">
            {newer ? (
              <Link
                className="rounded-md border border-neutral-200 bg-white p-4 hover:border-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                href={`/${locale}/news/${newer.nid}`}
              >
                <span className="block text-xs font-semibold text-brand-600">
                  <span aria-hidden="true">← </span>
                  {news.labels.prevNewer}
                </span>
                <span className="mt-1 block text-sm font-medium leading-snug text-neutral-800">
                  {neighbourTitle(newer)}
                </span>
              </Link>
            ) : (
              <span className="rounded-md border border-dashed border-neutral-200 p-4 text-sm text-neutral-500">
                {news.labels.noNewer}
              </span>
            )}
            {older ? (
              <Link
                className="rounded-md border border-neutral-200 bg-white p-4 text-right hover:border-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:col-start-2"
                href={`/${locale}/news/${older.nid}`}
              >
                <span className="block text-xs font-semibold text-brand-600">
                  {news.labels.nextOlder}
                  <span aria-hidden="true"> →</span>
                </span>
                <span className="mt-1 block text-sm font-medium leading-snug text-neutral-800">
                  {neighbourTitle(older)}
                </span>
              </Link>
            ) : (
              <span className="rounded-md border border-dashed border-neutral-200 p-4 text-sm text-neutral-500 sm:col-start-2 sm:text-right">
                {news.labels.noOlder}
              </span>
            )}
          </nav>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              className="rounded-md bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
              href={`/${locale}/news`}
            >
              {news.labels.back}
            </Link>
          </div>

          <div className="mt-8">
            <SourceLine {...news.source} />
          </div>
        </div>
      </section>

      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        type="application/ld+json"
      />
    </main>
  );
}
