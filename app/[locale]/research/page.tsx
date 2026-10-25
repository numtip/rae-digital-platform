import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CARD, ExternalLink, PageHero, SourceLine } from "@/components/page-shell";
import { getResearch, isLocale } from "@/lib/i18n";

// All copy comes from content/<locale>/research.ts, transcribed from the official
// "กองบริหารงานวิจัย" page. No claims beyond that page.

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const research = getResearch(locale);
  return {
    title: research.meta.title,
    description: research.meta.description,
    alternates: {
      canonical: `/${locale}/research/`,
      languages: { th: "/th/research/", en: "/en/research/", "x-default": "/th/research/" },
    },
  };
}

export default async function Research({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const research = getResearch(locale);

  return (
    <main id="main-content" tabIndex={-1}>
      <PageHero title={research.hero.title} lead={research.hero.lead} />

      <section className="bg-surface-50 py-16">
        <div className="mx-auto w-full max-w-7xl px-4">
          <div className={CARD}>
            <h2 className="text-2xl font-bold text-neutral-800">{research.intro.title}</h2>
            <p className="mt-3 max-w-4xl text-neutral-700">{research.intro.text}</p>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {research.units.map((unit) => (
              <div key={unit.title} className={CARD}>
                <h3 className="text-lg font-bold text-brand-600">{unit.title}</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-neutral-700">
                  {unit.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto w-full max-w-7xl px-4">
          <ExternalLink href={research.externalLink.url}>{research.externalLink.label}</ExternalLink>
          <div className="mt-10">
            <SourceLine {...research.source} />
          </div>
        </div>
      </section>
    </main>
  );
}
