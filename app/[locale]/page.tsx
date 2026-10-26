import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asset } from "@/lib/assets";
import { getContent, isLocale } from "@/lib/i18n";

// Nothing here is invented: every string comes from content/<locale>/site.ts,
// which is transcribed from the approved Stitch V2 reference.

const CARD = "rounded-lg border border-neutral-200 bg-white p-6 shadow-sm";

function SectionHead({
  id,
  title,
  subtitle,
  more,
  moreHref,
  notAvailable,
}: {
  id: string;
  title: string;
  subtitle?: string;
  more?: string;
  moreHref?: string;
  notAvailable: string;
}) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 id={id} className="text-2xl font-bold text-neutral-800 md:text-3xl">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-neutral-600">{subtitle}</p>}
      </div>
      {/* A section whose page exists links to it; the rest stay disabled text
          rather than an empty-hash dead control (issue #2 rule). brand-600 is
          9.9:1 on white, well above AA. */}
      {more &&
        (moreHref ? (
          <Link
            aria-label={`${more} — ${title}`}
            href={moreHref}
            className="text-sm font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            {more}
          </Link>
        ) : (
          <span aria-disabled="true" title={notAvailable} className="cursor-not-allowed text-sm text-neutral-600">
            {more}
          </span>
        ))}
    </div>
  );
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const content = getContent(locale);
  const { hero, sections, header } = content;

  return (
    <main id="main-content" tabIndex={-1}>
      {/* Hero photograph is the office's own building, taken from the official
          site (see public/README.md). brand-700 stays underneath so the text is
          readable even before the image loads. */}
      <section className="relative flex min-h-[600px] items-center bg-brand-700">
        <Image
          src={asset("/images/about/office-building.webp")}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-brand-700/80" />
        <div className="relative mx-auto w-full max-w-7xl px-4">
          <div className="text-white">
            <h1 className="mb-4 max-w-2xl text-4xl font-bold leading-tight md:text-5xl lg:max-w-4xl lg:text-6xl">
              {hero.title}
              <br />
              <span className="text-gold-500">{hero.titleAccent}</span>
            </h1>
            <p className="mb-8 max-w-2xl text-lg text-neutral-200 md:text-xl">{hero.description}</p>
            {/* Each label sits next to its own destination: "About us" →
                /about, "Our services" → /services. Both pages exist. Gold
                keeps dark text: white on gold-500 is 2.3:1 and would fail AA. */}
            <div className="flex flex-wrap gap-4">
              <Link
                href={`/${locale}/about`}
                className="rounded-md bg-brand-500 px-8 py-3 font-medium text-white shadow-lg hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
              >
                {hero.primaryCta}
              </Link>
              <Link
                href={`/${locale}/services`}
                className="rounded-md bg-gold-500 px-8 py-3 font-medium text-brand-700 shadow-lg hover:bg-gold-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                {hero.secondaryCta}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="services" className="bg-surface-50 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHead id="services" {...sections.services} moreHref={`/${locale}/services`} notAvailable={header.notAvailable} />
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sections.services.items.map((item) => (
              <li key={item.title} className={CARD}>
                <h3 className="mb-2 text-lg font-bold text-neutral-800">{item.title}</h3>
                <p className="text-sm leading-relaxed text-neutral-600">{item.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="stats" className="bg-cream-50 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHead id="stats" {...sections.stats} notAvailable={header.notAvailable} />
          <ul className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {sections.stats.items.map((item) => (
              <li key={item.label} className="text-center">
                <p className="text-4xl font-bold text-brand-600 md:text-5xl">{item.value}</p>
                <p className="mt-2 text-sm font-medium text-neutral-800">{item.label}</p>
                <p className="text-xs text-neutral-600">{item.unit}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="research" className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHead id="research" {...sections.research} moreHref={`/${locale}/research`} notAvailable={header.notAvailable} />
          <ul className="grid gap-6 md:grid-cols-3">
            {sections.research.items.map((item) => (
              <li key={item.title} className="overflow-hidden rounded-lg border border-neutral-200 shadow-sm">
                {/* TODO(issue #2): research photo per card (`public/` slot). */}
                <div aria-hidden="true" className="h-40 bg-brand-600/10" />
                <div className="p-5">
                  {/* brand-600, not gold: gold on white is 2.8:1 and fails AA. */}
                  <span className="text-xs font-medium tracking-wide text-brand-600">{item.tag}</span>
                  <h3 className="mt-2 text-lg font-bold leading-snug text-neutral-800">{item.title}</h3>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="news" className="bg-surface-50 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHead id="news" {...sections.news} moreHref={`/${locale}/news`} notAvailable={header.notAvailable} />
          <ul className="grid gap-4 md:grid-cols-2">
            {sections.news.items.map((item) => (
              <li key={item.title} className={`${CARD} flex flex-col gap-2`}>
                <p className="text-xs text-neutral-500">{item.date}</p>
                <h3 className="text-base font-semibold leading-snug text-neutral-800">{item.title}</h3>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="knowledge" className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHead id="knowledge" {...sections.knowledge} notAvailable={header.notAvailable} />
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sections.knowledge.items.map((item) => (
              <li key={item.title} className={CARD}>
                <h3 className="mb-2 text-lg font-bold text-neutral-800">{item.title}</h3>
                <p className="text-sm leading-relaxed text-neutral-600">{item.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
