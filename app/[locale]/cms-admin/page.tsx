import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NewsDesk } from "@/components/cms/news-desk";
import { adminCopy } from "@/lib/cms/admin-copy";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (process.env.NEXT_PAGES_PREVIEW === "1") {
    return { title: "Not found", robots: { index: false, follow: false } };
  }
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return {
    title: adminCopy[locale].title,
    robots: { index: false, follow: false },
    alternates: { canonical: `/${locale}/cms-admin/` },
  };
}

export default async function CmsAdmin({ params }: Props) {
  if (process.env.NEXT_PAGES_PREVIEW === "1") notFound();
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = adminCopy[locale];

  return (
    <main className="bg-surface-50 py-10" id="main-content" tabIndex={-1}>
      <div className="mx-auto grid max-w-3xl gap-6 px-4">
        <header>
          <h1 className="text-3xl font-bold text-neutral-800">{copy.title}</h1>
          <p className="mt-2 text-neutral-700">{copy.lead}</p>
        </header>
        <section aria-labelledby="news-desk" className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="mb-4 text-xl font-bold" id="news-desk">
            {copy.news}
          </h2>
          <NewsDesk apiBase={process.env.NEXT_PUBLIC_CMS_API ?? "http://127.0.0.1:3317"} locale={locale} />
        </section>
      </div>
    </main>
  );
}
