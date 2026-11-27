import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LinkTiles } from "@/components/legacy-modules";
import { Breadcrumb, PageHero, SourceLine } from "@/components/page-shell";
import { KNOWLEDGE_DATABASE_IDS, linksByIds, linksByGroup } from "@/content/links";
import { readPublicKnowledge } from "@/lib/cms/knowledge-live";
import { getContent, getKnowledge, isLocale } from "@/lib/i18n";
import { jsonLdScript } from "@/lib/json-ld";

// FAQ entries come from the CMS (M04) and are shown only once an editor has published some.
export const revalidate = 60;

const FAQ_COPY = {
  th: { title: "คำถามที่พบบ่อย", topic: "หัวข้อ" },
  en: { title: "Frequently asked questions", topic: "Topic" },
} as const;

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
  const faq = await readPublicKnowledge();
  const q = (e: (typeof faq)[number]) => (locale === "th" ? e.questionTh : e.questionEn);
  const a = (e: (typeof faq)[number]) => (locale === "th" ? e.answerTh : e.answerEn);

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

      {faq.length > 0 ? (
        <section aria-labelledby="faq-heading" className="py-12" id="faq">
          <div className="mx-auto w-full max-w-7xl px-4">
            <h2 className="text-2xl font-bold text-neutral-800" id="faq-heading">{FAQ_COPY[locale].title}</h2>
            <div className="mt-6 grid max-w-3xl gap-3">
              {faq.map((entry) => (
                <details className="rounded-lg border border-neutral-200 bg-white p-4" id={`faq-${entry.code}`} key={entry.code}>
                  <summary className="min-h-11 cursor-pointer font-medium text-neutral-800">{q(entry)}</summary>
                  {entry.topic ? <p className="mt-2 text-xs text-neutral-600">{FAQ_COPY[locale].topic}: {entry.topic}</p> : null}
                  <p className="mt-2 whitespace-pre-line text-neutral-700">{a(entry)}</p>
                </details>
              ))}
            </div>
          </div>
          <script
            dangerouslySetInnerHTML={{
              __html: jsonLdScript({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: faq.map((entry) => ({ "@type": "Question", name: q(entry), acceptedAnswer: { "@type": "Answer", text: a(entry) } })),
              }),
            }}
            type="application/ld+json"
          />
        </section>
      ) : null}

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
