import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NewsImage } from "@/components/news-image";
import { Breadcrumb, CARD, SourceLine } from "@/components/page-shell";
import { asset } from "@/lib/assets";
import { liveNews } from "@/lib/cms/live";
import { publicationStamp, publishedIds } from "@/lib/cms/published-site";
import { SITE_URL, getContent, getNews, isLocale, type Locale } from "@/lib/i18n";

// One page per published item. Bodies are the office's own text (Thai); the
// English route shows that Thai text and says so, rather than pretending to have
// a translation (ADR-0005).
//
// Two kinds of id meet here: the transcribed archive in content/, and a story published through
// the CMS. A CMS story can be published after this build ran, so `dynamicParams` stays at its
// default — an id the build never saw renders on its first request. `revalidate` is the safety
// net; the publish hook drops the cached render immediately.

// Next reads segment config by static analysis, so this is the literal: it is NEWS_WINDOW.
export const revalidate = 30;

type Props = { params: Promise<{ locale: string; nid: string }> };

export function generateStaticParams() {
  // The ids the site already holds are prerendered either way (the Pages preview cannot render on
  // demand at all); on a server the list is not a closed set.
  const nids = new Set(getNews("th").items.map((item) => item.nid));
  for (const id of publishedIds()) nids.add(id);
  return [...nids].map((nid) => ({ nid }));
}

// The CMS is authoritative while it answers; the committed copy — minus the ids the publish hook
// reported withdrawn — only stands in during an outage. An archive id is never in the CMS.
async function publishedItem(locale: Locale, nid: string) {
  const { items } = await liveNews(locale);
  return items.find((item) => item.nid === nid) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, nid } = await params;
  if (!isLocale(locale)) notFound();
  const cms = await publishedItem(locale, nid);
  const item = getNews(locale).items.find((entry) => entry.nid === nid);
  if (!cms && !item) notFound();
  const title = cms?.title ?? item?.title ?? nid;
  return {
    title: `${title} — ${getContent(locale).header.orgFull}`,
    description: cms?.body[0] ?? item?.body[0] ?? title,
    alternates: {
      canonical: `/${locale}/news/${nid}/`,
      languages: {
        th: `/th/news/${nid}/`,
        en: `/en/news/${nid}/`,
        "x-default": `/th/news/${nid}/`,
      },
    },
    openGraph: {
      title,
      type: "article",
      // Resolves to this article's own canonical, not the locale home.
      url: "./",
      // metadataBase already carries the Pages basePath, so pass the gallery's own path: routing it
      // through `asset()` first produced `/rae-digital-platform/rae-digital-platform/cms-published/…`.
      images: cms?.gallery[0] ? [{ url: cms.gallery[0].src }] : item?.image ? [{ url: item.image.src }] : [],
    },
  };
}

export default async function NewsItemPage({ params }: Props) {
  const { locale, nid } = await params;
  if (!isLocale(locale)) notFound();
  const cms = await publishedItem(locale, nid);
  const news = getNews(locale);
  const item = cms ? undefined : news.items.find((entry) => entry.nid === nid);
  if (!cms && !item) notFound();

  // The hand-typed archive and a published CMS item meet here, so the markup below reads one
  // shape. A CMS item has no `type` (the export carries none) and no lead photo of its own on the
  // detail page — its photos are the gallery below.
  const view = {
    title: cms?.title ?? item?.title ?? "",
    type: item?.type ?? "",
    date: cms?.date ?? item?.date ?? "",
    dateIso: cms?.dateIso ?? item?.dateIso ?? "",
    body: cms?.body ?? item?.body ?? [],
    image: item?.image ?? null,
    gallery: cms?.gallery ?? [],
  };

  // Bodies exist in Thai only; show them in both locales, labelled honestly.
  const thai = getNews("th").items.find((entry) => entry.nid === nid);
  const body = view.body.length > 0 ? view.body : (thai?.body ?? []);
  const title = view.title || thai?.title || nid;
  const showThaiOnlyNotice = view.body.length === 0 && body.length > 0;

  // A reader who finishes an article should be able to keep reading without going back
  // to the list. The archive is ordered newest-first, so the entry before this one is
  // newer and the entry after it is older. A CMS item is not in that archive.
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
  // whatever the headline language on the English route. A CMS item is the exception: both
  // routes carry their own language.
  const articleUrl = `${SITE_URL}/${locale}/news/${nid}/`;
  const socialImage = view.image?.src ?? cms?.gallery[0]?.src;
  const published = publicationStamp(view.date, view.dateIso);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: view.title || title,
    datePublished: published?.datePublished,
    inLanguage: cms ? locale : "th",
    mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
    url: articleUrl,
    // Absolute through SITE_URL alone: it already carries the Pages basePath, so `asset()` here
    // doubled it and every article advertised an image that 404s. Same value as `og:image` above.
    image: socialImage ? [`${SITE_URL}${socialImage}`] : undefined,
    publisher: { "@type": "Organization", name: getContent(locale).header.orgFull },
  };

  return (
    <main id="main-content" tabIndex={-1}>
      <section className="bg-brand-700 py-12 text-white">
        <div className="mx-auto w-full max-w-4xl px-4">
          {view.type ? (
            <p className="text-sm text-neutral-200">
              {news.labels.type}: {view.type}
            </p>
          ) : null}
          <h1 className="mt-2 text-3xl font-bold leading-tight md:text-4xl">{title}</h1>
          {!view.title && news.labels.headlineThaiOnly && (
            <p className="mt-2 text-sm text-neutral-300">{news.labels.headlineThaiOnly}</p>
          )}
          {published ? (
            <p className="mt-3 text-neutral-200">
              {news.labels.published}: {published.date}
            </p>
          ) : null}
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
          {view.image && (
            <NewsImage
              alt={view.image.alt || title}
              className="aspect-[16/10] w-full rounded-lg object-cover shadow-sm"
              eager
              sizes="(min-width: 1024px) 56rem, 100vw"
              src={view.image.src}
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

          {view.gallery.length > 0 ? (
            <section aria-labelledby="article-gallery" className="mt-8">
              <h2 className="text-xl font-bold text-neutral-800" id="article-gallery">
                {news.labels.gallery}
              </h2>
              <div className="mt-4 grid gap-6 sm:grid-cols-2">
                {view.gallery.map((photo) => (
                  <figure key={photo.src}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- the gallery is a fixed two-column grid, so one file per photo is enough here */}
                    <img alt={photo.alt} className="w-full rounded-lg object-cover shadow-sm" src={asset(photo.src)} />
                    <figcaption className="mt-2 text-sm text-neutral-600">{photo.caption}</figcaption>
                  </figure>
                ))}
              </div>
            </section>
          ) : null}

          {!cms ? (
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
                <span className="rounded-md border border-dashed border-neutral-200 p-4 text-sm text-neutral-600">
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
                <span className="rounded-md border border-dashed border-neutral-200 p-4 text-sm text-neutral-600 sm:col-start-2 sm:text-right">
                  {news.labels.noOlder}
                </span>
              )}
            </nav>
          ) : null}

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
