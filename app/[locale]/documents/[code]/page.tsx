import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb, CARD, PageHero } from "@/components/page-shell";
import { readPublicDocument } from "@/lib/cms/documents-live";
import { staticExportOnly } from "@/lib/cms/live";
import { asset } from "@/lib/assets";
import { getContent, getDocuments, isLocale } from "@/lib/i18n";

// One page per registered document (M03). Live from the CMS, so it exists only on a server: the Pages
// preview bakes a single 404 placeholder. The file itself stays in Microsoft 365 (ADR-0004) and is
// reached through the counted open route.
type Props = { params: Promise<{ locale: string; code: string }> };

export const revalidate = 60;

export function generateStaticParams() {
  return staticExportOnly ? [{ code: "RAE-DC-0000" }] : [];
}

const COPY = {
  th: { open: "เปิดเอกสาร", version: "ฉบับ", updated: "ปรับปรุงล่าสุด", opens: "จำนวนครั้งที่เปิด", type: "ชนิดไฟล์", back: "กลับไปหมวดเอกสาร", note: "ไฟล์เก็บที่ Microsoft 365 ของมหาวิทยาลัย ระบบนี้ไม่เก็บสำเนา" },
  en: { open: "Open the document", version: "Version", updated: "Last updated", opens: "Times opened", type: "File type", back: "Back to the category", note: "The file is kept in the university's Microsoft 365; this site keeps no copy." },
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, code } = await params;
  if (!isLocale(locale)) notFound();
  const doc = await readPublicDocument(code);
  if (!doc) return { title: "404", robots: { index: false } };
  const title = locale === "th" ? doc.titleTh : doc.titleEn;
  return {
    title: `${title} (${doc.code})`,
    description: doc.note || `${title} — ${doc.code}`,
    alternates: {
      canonical: `/${locale}/documents/${code}/`,
      languages: { th: `/th/documents/${code}/`, en: `/en/documents/${code}/`, "x-default": `/th/documents/${code}/` },
    },
  };
}

export default async function DocumentDetail({ params }: Props) {
  const { locale, code } = await params;
  if (!isLocale(locale)) notFound();
  const doc = await readPublicDocument(code);
  if (!doc) notFound();
  const copy = COPY[locale];
  const documents = getDocuments(locale);
  const title = locale === "th" ? doc.titleTh : doc.titleEn;
  const group = documents.groups.find((entry) => entry.slug === doc.category);
  const date = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", { dateStyle: "long", timeZone: "Asia/Bangkok" }).format(new Date(doc.updatedAt));

  return (
    <main id="main-content" tabIndex={-1}>
      <PageHero title={title} lead={doc.code} />
      <section className="bg-surface-50 py-16">
        <div className="mx-auto w-full max-w-4xl px-4">
          <Breadcrumb
            locale={locale}
            trail={[
              { label: getContent(locale).nav.home, href: `/${locale}` },
              { label: documents.hero.title, href: `/${locale}/documents` },
              ...(group ? [{ label: group.title, href: `/${locale}/documents/category/${group.slug}` }] : []),
              { label: doc.code },
            ]}
          />
          <div className={CARD}>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div><dt className="text-sm text-neutral-600">{copy.type}</dt><dd className="font-medium">{doc.fileType.toUpperCase()}</dd></div>
              <div><dt className="text-sm text-neutral-600">{copy.version}</dt><dd className="font-medium">{doc.version}</dd></div>
              <div><dt className="text-sm text-neutral-600">{copy.updated}</dt><dd className="font-medium">{date}</dd></div>
              <div><dt className="text-sm text-neutral-600">{copy.opens}</dt><dd className="font-medium">{doc.downloadCount}</dd></div>
            </dl>
            {doc.note ? <p className="mt-4 text-neutral-700">{doc.note}</p> : null}
            <p className="mt-6">
              <a
                className="inline-block rounded-md bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                href={asset(`/api/documents/${doc.code}/open`)}
                rel="noreferrer noopener"
                target="_blank"
              >
                {copy.open}
              </a>
            </p>
            <p className="mt-4 text-sm text-neutral-600">{copy.note}</p>
          </div>
          {group ? (
            <p className="mt-8">
              <Link className="underline underline-offset-2 hover:text-brand-600" href={`/${locale}/documents/category/${group.slug}`}>{copy.back}</Link>
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
