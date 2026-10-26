import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NewsImage } from "@/components/news-image";
import { asset } from "@/lib/assets";
import { DirectorAndServices, MediaCards, SystemsGrid, UnitCards } from "@/components/legacy-modules";
import { getContent, getDirectory, getNews, isLocale } from "@/lib/i18n";

// Every string comes from content/<locale>/site.ts, and the news headlines are read
// from the real news archive at render time. The page carries no sample statistics
// and no mock research titles: a public homepage shows what the office can stand
// behind, and links to the page that explains it.

const CARD = "rounded-lg border border-neutral-200 bg-white p-6 shadow-sm";
const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

function SectionHead({
  id,
  title,
  subtitle,
  more,
  moreHref,
}: {
  id: string;
  title: string;
  subtitle?: string;
  more?: string;
  moreHref?: string;
}) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 id={id} className="text-2xl font-bold text-neutral-800 md:text-3xl">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-neutral-600">{subtitle}</p>}
      </div>
      {more && moreHref && (
        <Link
          aria-label={`${more} — ${title}`}
          className={`text-sm font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700 ${FOCUS}`}
          href={moreHref}
        >
          {more}
        </Link>
      )}
    </div>
  );
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const content = getContent(locale);
  const directory = getDirectory(locale);
  const { hero, sections } = content;

  // The three newest real stories, with their lead photo when there is one.
  const news = getNews(locale);
  const thaiTitles = new Map(getNews("th").items.map((entry) => [entry.nid, entry.title]));
  const headlines = news.items.slice(0, 3);

  const href = (path: string) => `/${locale}${path}`;

  return (
    <main id="main-content" tabIndex={-1}>
      {/* Hero photograph is the office's own building (see public/README.md).
          brand-700 stays underneath so the text is readable before the image loads. */}
      <section className="relative flex min-h-[560px] items-center bg-brand-700 md:min-h-[600px]">
        <Image
          src={asset("/images/about/office-building.webp")}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-brand-700/75" />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-16">
          <div className="text-white">
            <h1 className="mb-4 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl md:text-5xl lg:max-w-4xl lg:text-6xl">
              {hero.title}
              <br />
              <span className="text-gold-500">{hero.titleAccent}</span>
            </h1>
            <p className="mb-8 max-w-2xl text-base text-neutral-100 sm:text-lg md:text-xl">{hero.description}</p>
            <div className="flex flex-wrap gap-4">
              <Link
                className={`rounded-md bg-brand-500 px-6 py-3 font-medium text-white shadow-lg hover:bg-brand-600 sm:px-8 ${FOCUS}`}
                href={href("/about")}
              >
                {hero.primaryCta}
              </Link>
              <Link
                className={`rounded-md bg-gold-500 px-6 py-3 font-medium text-brand-700 shadow-lg hover:bg-gold-600 sm:px-8 ${FOCUS}`}
                href={href("/services")}
              >
                {hero.secondaryCta}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services — the office's four real service units, each card opening the page
          that explains them. */}
      <section aria-labelledby="services" className="bg-surface-50 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHead id="services" {...sections.services} moreHref={href("/services")} />
          <ul className="grid gap-6 sm:grid-cols-2">
            {sections.services.items.map((item) => (
              <li key={item.title}>
                <Link
                  className={`${CARD} flex h-full items-start justify-between gap-4 transition-colors hover:border-brand-500 ${FOCUS}`}
                  href={href("/services")}
                >
                  <h3 className="text-lg font-bold leading-snug text-neutral-800">{item.title}</h3>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* News — real headlines from content/<locale>/news.ts with their own dates and
          links, newest first. */}
      <section aria-labelledby="news" className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHead id="news" {...sections.news} moreHref={href("/news")} />
          <ul className="grid gap-6 md:grid-cols-3">
            {headlines.map((item) => {
              const title = item.title || thaiTitles.get(item.nid) || item.nid;
              return (
                <li key={item.nid} className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
                  <Link className={`group block ${FOCUS}`} href={href(`/news/${item.nid}`)}>
                    {item.image ? (
                      <NewsImage
                        alt={item.image.alt || title}
                        className="h-40 w-full object-cover"
                        sizes="(min-width: 768px) 33vw, 100vw"
                        src={item.image.src}
                      />
                    ) : (
                      <div aria-hidden="true" className="h-2 bg-brand-600/20" />
                    )}
                    <div className="p-5">
                      {/* brand-600, not gold: gold-600 on white is 2.76:1 and gold-500 is 2.34:1 — both fail AA for 12px text. */}
                      <p className="text-xs font-semibold text-brand-600">{item.date}</p>
                      <h3 className="mt-2 text-base font-bold leading-snug text-neutral-800 group-hover:text-brand-600">
                        {title}
                      </h3>
                      <p className="mt-3 text-sm font-semibold text-brand-600 underline underline-offset-2">
                        {sections.news.readLabel}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Research — the office's three real research units with one verbatim duty line
          each, linking to the research page. */}
      <section aria-labelledby="research" className="bg-surface-50 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHead id="research" {...sections.research} moreHref={href("/research")} />
          <ul className="grid gap-6 md:grid-cols-3">
            {sections.research.items.map((item) => (
              <li key={item.title}>
                <Link
                  className={`${CARD} flex h-full flex-col transition-colors hover:border-brand-500 ${FOCUS}`}
                  href={href("/research")}
                >
                  <h3 className="text-lg font-bold leading-snug text-neutral-800">{item.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-600">{item.description}</p>
                  <span aria-hidden="true" className="mt-4 text-brand-600">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <SystemsGrid copy={directory} moreHref={href("/directory")} />
      <UnitCards copy={directory} />
      <MediaCards copy={directory} />
      <DirectorAndServices copy={directory} />

      {/* Quick links — every card opens something that exists. This replaces the
          sample statistics band, which showed four figures the office does not publish. */}
      <section aria-labelledby="resources" className="bg-cream-50 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHead id="resources" {...sections.resources} />
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sections.resources.items.map((item) => {
              const body = (
                <>
                  <h3 className="text-lg font-bold leading-snug text-neutral-800">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">{item.description}</p>
                  <span aria-hidden="true" className="mt-4 block text-brand-600">
                    {item.external ? "↗" : "→"}
                  </span>
                </>
              );
              return (
                <li key={item.title}>
                  {item.external ? (
                    <a
                      className={`${CARD} flex h-full flex-col transition-colors hover:border-brand-500 ${FOCUS}`}
                      href={item.href}
                      rel="noreferrer noopener"
                      target="_blank"
                    >
                      {body}
                    </a>
                  ) : (
                    <Link
                      className={`${CARD} flex h-full flex-col transition-colors hover:border-brand-500 ${FOCUS}`}
                      href={href(item.href)}
                    >
                      {body}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </main>
  );
}
