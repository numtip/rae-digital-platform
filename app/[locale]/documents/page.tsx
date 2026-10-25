import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CARD, PageHero, SourceLine } from "@/components/page-shell";
import { getDocuments, isLocale } from "@/lib/i18n";

// Categories and link labels come from content/<locale>/documents.ts, transcribed
// from the official download page. Files are linked at source, never mirrored.

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const documents = getDocuments(locale);
  return {
    title: documents.meta.title,
    description: documents.meta.description,
    alternates: {
      canonical: `/${locale}/documents/`,
      languages: { th: "/th/documents/", en: "/en/documents/", "x-default": "/th/documents/" },
    },
  };
}

export default async function Documents({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const documents = getDocuments(locale);

  return (
    <main id="main-content" tabIndex={-1}>
      <PageHero title={documents.hero.title} lead={documents.hero.lead} />

      <section className="bg-surface-50 py-16">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 md:grid-cols-3">
          {documents.groups.map((group) => (
            <div key={group.title} className={CARD}>
              <h2 className="text-lg font-bold text-brand-600">
                <Link className="underline underline-offset-2 hover:text-brand-700" href={`/${locale}/documents/category/${group.slug}`}>
                  {group.title}
                </Link>
              </h2>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.url}>
                    <a
                      className="text-neutral-700 underline underline-offset-2 hover:text-brand-600"
                      href={link.url}
                      rel="noreferrer noopener"
                      target="_blank"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto w-full max-w-7xl px-4">
          <p className="max-w-4xl text-neutral-700">{documents.note}</p>
          <div className="mt-10">
            <SourceLine {...documents.source} />
          </div>
        </div>
      </section>
    </main>
  );
}
