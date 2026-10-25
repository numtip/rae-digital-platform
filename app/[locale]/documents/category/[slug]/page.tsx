import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb, CARD, PageHero, SourceLine } from "@/components/page-shell";
import { SITE_URL, getContent, getDocuments, isLocale } from "@/lib/i18n";

// One page per document category. Slugs are stable and identical in both locales so
// a shared link keeps working when the reader switches language.

type Props = { params: Promise<{ locale: string; slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getDocuments("th").groups.map((group) => ({ slug: group.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const group = getDocuments(locale).groups.find((entry) => entry.slug === slug);
  if (!group) notFound();
  return {
    title: `${group.title} — ${getContent(locale).header.orgFull}`,
    description: `${group.title}: ${group.links.map((link) => link.label).join(", ")}`,
    alternates: {
      canonical: `/${locale}/documents/category/${slug}/`,
      languages: {
        th: `/th/documents/category/${slug}/`,
        en: `/en/documents/category/${slug}/`,
        "x-default": `/th/documents/category/${slug}/`,
      },
    },
  };
}

export default async function DocumentCategory({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const documents = getDocuments(locale);
  const group = documents.groups.find((entry) => entry.slug === slug);
  if (!group) notFound();

  return (
    <main id="main-content" tabIndex={-1}>
      <PageHero title={group.title} lead={documents.hero.lead} />

      <section className="bg-surface-50 py-16">
        <div className="mx-auto w-full max-w-4xl px-4">
          <Breadcrumb
            trail={[
              { label: getContent(locale).nav.home, href: `/${locale}` },
              { label: documents.hero.title, href: `/${locale}/documents` },
              { label: group.title },
            ]}
          />

          <div className={CARD}>
            <ul className="space-y-4">
              {group.links.map((link) => (
                <li key={link.url}>
                  <a
                    className="text-lg text-neutral-700 underline underline-offset-2 hover:text-brand-600"
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

          <p className="mt-6 text-neutral-700">{documents.note}</p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              className="rounded-md bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
              href={`/${locale}/documents`}
            >
              {documents.hero.title}
            </Link>
          </div>

          <div className="mt-10">
            <SourceLine {...documents.source} />
          </div>
        </div>
      </section>

    </main>
  );
}
