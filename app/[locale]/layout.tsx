import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LOCALES, SITE_URL, getContent, isLocale } from "@/lib/i18n";
import "../globals.css";

// Self-hosted at build time by next/font — no runtime request to Google.
const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sarabun",
  display: "swap",
});

// Only th/en exist: any other first segment 404s instead of rendering a
// half-translated page (issue #17).
export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const content = getContent(locale);
  return {
    metadataBase: new URL(SITE_URL),
    title: content.meta.title,
    description: content.meta.description,
    alternates: {
      canonical: `/${locale}/`,
      languages: { th: "/th/", en: "/en/", "x-default": "/th/" },
    },
    // Social previews use the same verified copy — no invented taglines.
    openGraph: {
      type: "website",
      siteName: content.header.orgFull,
      title: content.meta.title,
      description: content.meta.description,
      url: `/${locale}/`,
      locale: locale === "th" ? "th_TH" : "en_US",
      alternateLocale: locale === "th" ? ["en_US"] : ["th_TH"],
    },
    twitter: {
      card: "summary",
      title: content.meta.title,
      description: content.meta.description,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Props & { children: React.ReactNode }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const content = getContent(locale);

  // Organisation facts only — name, parent organisation, site URL. Nothing else
  // is asserted because nothing else is verified for this office.
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: content.header.orgFull,
    alternateName: content.header.orgShort,
    parentOrganization: { "@type": "CollegeOrUniversity", name: content.header.orgUniversity },
    url: `${SITE_URL}/${locale}/`,
  };

  return (
    <html lang={locale} className={sarabun.variable}>
      <body className="flex min-h-screen flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand-700 focus:px-4 focus:py-2 focus:text-white"
        >
          {content.a11y.skipToContent}
        </a>
        <SiteHeader locale={locale} content={content} />
        <div className="flex-1">{children}</div>
        <SiteFooter content={content} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </body>
    </html>
  );
}
