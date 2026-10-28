import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb, CARD } from "@/components/page-shell";
import { asset } from "@/lib/assets";
import { liveNews } from "@/lib/cms/live";
import { publicationStamp, siteArticles } from "@/lib/cms/published-site";
import { SITE_URL, getContent, getNews, isLocale } from "@/lib/i18n";

// The live detail page: nothing about an id is known at build time, so a story published a minute
// ago renders on its first request (`dynamicParams` stays at its default, on, and the preview export
// has no on-demand rendering at all). `revalidate` is the safety net; the publish hook cuts it short.
export const revalidate = 30;

type Props = { params: Promise<{ locale: string; nid: string }> };

export function generateStaticParams() {
  // The stories the site already holds are prerendered either way (the Pages preview cannot render
  // on demand at all). On a server the list is not a closed set: an id that is not here still
  // renders on its first request.
  return siteArticles().map((article) => ({ nid: article.id }));
}

async function find(locale: "th" | "en", nid: string) {
  const { items } = await liveNews(locale);
  return items.find((item) => item.nid === nid) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, nid } = await params;
  if (!isLocale(locale)) notFound();
  const item = await find(locale, nid);
  if (!item) notFound();
  return {
    title: `${item.title} — ${getContent(locale).header.orgFull}`,
    description: item.body[0] ?? item.title,
    alternates: {
      canonical: `/${locale}/news-live/${nid}/`,
      languages: {
        th: `/th/news-live/${nid}/`,
        en: `/en/news-live/${nid}/`,
        "x-default": `/th/news-live/${nid}/`,
      },
    },
    openGraph: {
      title: item.title,
      type: "article",
      // Resolves to this article's canonical, not the locale home.
      url: "./",
      // metadataBase already carries the Pages basePath, so this stays the gallery's own path.
      images: item.image ? [{ url: item.image.src }] : [],
    },
  };
}

export default async function LiveNewsItem({ params }: Props) {
  const { locale, nid } = await params;
  if (!isLocale(locale)) notFound();
  const item = await find(locale, nid);
  if (!item) notFound();
  const news = getNews(locale);
  const published = publicationStamp(item.date, item.dateIso);

  // The body is the article's own language: a CMS item is published in both, so unlike the legacy
  // archive there is no Thai-only fallback notice here.
  const articleUrl = `${SITE_URL}/${locale}/news-live/${nid}/`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: item.title,
    datePublished: published?.datePublished,
    inLanguage: locale,
    mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
    url: articleUrl,
    // Absolute through SITE_URL alone, the same value og:image advertises.
    image: item.image ? [`${SITE_URL}${item.image.src}`] : undefined,
    publisher: { "@type": "Organization", name: getContent(locale).header.orgFull },
  };

  return (
    <main id="main-content" tabIndex={-1}>
      <section className="bg-brand-700 py-12 text-white">
        <div className="mx-auto w-full max-w-4xl px-4">
          <h1 className="text-3xl font-bold leading-tight md:text-4xl">{item.title}</h1>
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
              { label: news.hero.title, href: `/${locale}/news-live` },
              { label: item.title },
            ]}
          />

          <div className={`${CARD} mt-6`}>
            <div className="space-y-4 text-lg leading-relaxed text-neutral-800">
              {item.body.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>

          {item.gallery.length > 0 ? (
            <section aria-labelledby="article-gallery" className="mt-8">
              <h2 className="text-xl font-bold text-neutral-800" id="article-gallery">
                {news.labels.gallery}
              </h2>
              <div className="mt-4 grid gap-6 sm:grid-cols-2">
                {item.gallery.map((photo) => (
                  <figure key={photo.src}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- the gallery is a fixed two-column grid, so one file per photo is enough here */}
                    <img alt={photo.alt} className="w-full rounded-lg object-cover shadow-sm" src={asset(photo.src)} />
                    <figcaption className="mt-2 text-sm text-neutral-600">{photo.caption}</figcaption>
                  </figure>
                ))}
              </div>
            </section>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              className="rounded-md bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
              href={`/${locale}/news-live`}
            >
              {news.labels.back}
            </Link>
          </div>
        </div>
      </section>

      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} type="application/ld+json" />
    </main>
  );
}
