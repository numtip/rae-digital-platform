import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LinkTiles } from "@/components/legacy-modules";
import { Breadcrumb, PageHero, SourceLine } from "@/components/page-shell";
import { KNOWLEDGE_DATABASE_IDS, linksByIds, linksByGroup } from "@/content/links";
import { getContent, getKnowledge, isLocale } from "@/lib/i18n";

// Knowledge & Media (M04). The page lists the office's own knowledge systems; it carries
// no article text because none is approved for republication, and it says so on the page
// rather than paraphrasing the source sites.

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const knowledge = getKnowledge(locale);
  return {
    title: knowledge.meta.title,
    description: knowledge.meta.description,
    alternates: {
      canonical: `/${locale}/knowledge/`,
      languages: {
        th: "/th/knowledge/",
        en: "/en/knowledge/",
        "x-default": "/th/knowledge/",
      },
    },
  };
}

export default async function Knowledge({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const knowledge = getKnowledge(locale);
  const site = getContent(locale);

  return (
    <main id="main-content" tabIndex={-1}>
      <PageHero title={knowledge.hero.title} lead={knowledge.hero.lead} />

      <section className="bg-surface-50 py-8">
        <div className="mx-auto w-full max-w-7xl px-4">
          <Breadcrumb
            locale={locale}
            trail={[
              { label: site.nav.home, href: `/${locale}` },
              { label: knowledge.hero.title },
            ]}
          />
        </div>
      </section>

      <LinkTiles
        id="knowledge-databases"
        labels={knowledge.labels}
        links={linksByIds(KNOWLEDGE_DATABASE_IDS)}
        subtitle={knowledge.databases.subtitle}
        title={knowledge.databases.title}
      />

      <LinkTiles
        id="knowledge-media"
        labels={knowledge.labels}
        links={linksByGroup("media")}
        subtitle={knowledge.media.subtitle}
        title={knowledge.media.title}
      />

      <section className="bg-surface-50 py-12">
        <div className="mx-auto w-full max-w-7xl px-4">
          <p className="max-w-3xl text-neutral-700">{knowledge.gap}</p>
          <p className="mt-4 max-w-3xl text-neutral-700">{knowledge.note}</p>
          <p className="mt-6">
            <Link
              className="min-h-11 text-sm font-medium text-brand-600 underline underline-offset-2"
              href={`/${locale}/documents`}
            >
              {knowledge.relatedLabel}
            </Link>
          </p>
          <div className="mt-10">
            <SourceLine {...knowledge.source} />
          </div>
        </div>
      </section>
    </main>
  );
}
