import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ContentSearch } from "@/components/content-search";
import { Breadcrumb, PageHero } from "@/components/page-shell";
import { readPublicDocuments } from "@/lib/cms/documents-live";
import { readPublicDepartments } from "@/lib/cms/departments-live";
import { personName, readPublicPersonnel } from "@/lib/cms/personnel-live";
import { readPublicEvents } from "@/lib/cms/events-live";
import { readPublicKnowledge } from "@/lib/cms/knowledge-live";
import { liveNews } from "@/lib/cms/live";
import { getContent, getSearch, isLocale } from "@/lib/i18n";
import { buildSearchIndex } from "@/lib/search-index";

type Props = { params: Promise<{ locale: string }> };

// The archive index is built once and filtered in the browser, so search keeps working on the
// static export. The published set is appended here, on the server, from the same read the news
// pages use: one search box, one ranking, and a story published a minute ago is already findable.
// Next reads segment config by static analysis, so this is the literal: it is NEWS_WINDOW.
export const revalidate = 30;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const search = getSearch(locale);
  return {
    title: search.meta.title,
    description: search.meta.description,
    alternates: {
      canonical: `/${locale}/search/`,
      languages: { th: "/th/search/", en: "/en/search/", "x-default": "/th/search/" },
    },
  };
}

export default async function Search({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const search = getSearch(locale);
  const { items } = await liveNews(locale);
  const registry = await readPublicDocuments();
  const faqEntries = await readPublicKnowledge();
  const eventList = await readPublicEvents();
  const unitList = await readPublicDepartments();
  const peopleList = await readPublicPersonnel();
  // Same shape the index uses, so the client component and the category chips need no special
  // case: a published story is a "news" item like any archive story.
  const published = items.map((item) => ({
    kind: "item" as const,
    title: item.title,
    text: item.body.join(" · "),
    href: `/${locale}/news/${item.nid}`,
  }));

  // Registered documents (M03): found by title, code, type or note; the result lands on the category
  // document's own page, which carries the counted open link (files stay in Microsoft 365, ADR-0004).
  const documents = registry.map((doc) => ({
    kind: "item" as const,
    title: locale === "th" ? doc.titleTh : doc.titleEn,
    text: [doc.code, doc.fileType.toUpperCase(), doc.note, locale === "th" ? doc.titleEn : doc.titleTh].filter(Boolean).join(" · "),
    href: `/${locale}/documents/${doc.code}`,
  }));

  // FAQ entries (M04): found by question, answer or topic; the result opens the entry on the knowledge page.
  const faq = faqEntries.map((entry) => ({
    kind: "item" as const,
    title: locale === "th" ? entry.questionTh : entry.questionEn,
    text: [entry.code, locale === "th" ? entry.answerTh : entry.answerEn, entry.topic, locale === "th" ? entry.questionEn : entry.questionTh].filter(Boolean).join(" · "),
    href: `/${locale}/knowledge#faq-${entry.code}`,
  }));

  // Events (M05): found by title, place or description; the result opens the event on the news/events page.
  const events = eventList.map((e) => ({
    kind: "item" as const,
    title: locale === "th" ? e.titleTh : e.titleEn,
    text: [e.code, locale === "th" ? e.locationTh : e.locationEn, locale === "th" ? e.descriptionTh : e.descriptionEn, locale === "th" ? e.titleEn : e.titleTh].filter(Boolean).join(" · "),
    href: `/${locale}/news/events#ev-${e.code}`,
  }));

  // Organisation units (M13): found by name or description; the result opens the unit on the about page.
  const units = unitList.map((d) => ({
    kind: "item" as const,
    title: locale === "th" ? d.nameTh : d.nameEn,
    text: [d.code, locale === "th" ? d.descriptionTh : d.descriptionEn, locale === "th" ? d.nameEn : d.nameTh].filter(Boolean).join(" · "),
    href: `/${locale}/about#dp-${d.code}`,
  }));

  // People (M12): public directory entries only — found by name, position or expertise; the result opens the directory.
  const people = peopleList.map((p) => ({
    kind: "item" as const,
    title: personName(p, locale),
    text: [p.code, locale === "th" ? p.positionTh : p.positionEn || p.positionTh, p.academicRank, p.workGroup, ...p.expertise, personName(p, locale === "th" ? "en" : "th")].filter(Boolean).join(" · "),
    href: `/${locale}/people#ps-${p.code}`,
  }));

  return (
    <main id="main-content" tabIndex={-1}>
      <PageHero title={search.hero.title} lead={search.hero.lead} />
      <section className="bg-surface-50 py-16">
        <div className="mx-auto w-full max-w-7xl px-4">
          <Breadcrumb
            locale={locale}
            trail={[
              { label: getContent(locale).nav.home, href: `/${locale}` },
              { label: search.hero.title },
            ]}
          />
          <Suspense fallback={<p className="text-neutral-700">{search.labels.empty}</p>}>
            <ContentSearch entries={[...buildSearchIndex(locale), ...published, ...documents, ...faq, ...events, ...units, ...people]} labels={search.labels} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
