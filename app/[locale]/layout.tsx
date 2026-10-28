import type { Metadata } from "next";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LOCALES, SITE_URL, getContent, isLocale } from "@/lib/i18n";
import "../globals.css";

// WOFF2 files committed under assets/fonts/sarabun (SIL OFL 1.1; provenance, conversion
// command and per-file sha256 in SOURCE.md beside them). Loading from disk instead of
// next/font/google keeps the build — and CI — working when Google cannot be reached, and the
// four weights are the ones the site actually renders (no unused 300 face to download).
const sarabun = localFont({
  src: [
    { path: "../../assets/fonts/sarabun/Sarabun-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../assets/fonts/sarabun/Sarabun-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../assets/fonts/sarabun/Sarabun-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../../assets/fonts/sarabun/Sarabun-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-sarabun",
  display: "swap",
});

// Only th/en exist: any other first segment 404s instead of rendering a
// half-translated page (issue #17). The guard is `isLocale` in this layout and in every page, not a
// closed param tuple: `dynamicParams = false` here also closed it for every page beneath, and the
// news detail route has to render an article id the build never saw.
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
    // Social previews use the same verified copy — no invented taglines. The card title,
    // description and URL must describe the page being shared, so this block carries only
    // what is true site-wide; Next takes og:title/og:description from each page's own
    // metadata, and a hard-coded url here made every subpage advertise the locale home.
    openGraph: {
      type: "website",
      siteName: content.header.orgFull,
      url: "./",
      locale: locale === "th" ? "th_TH" : "en_US",
      alternateLocale: locale === "th" ? ["en_US"] : ["th_TH"],
    },
    // Card title, description and image must follow the page too. Next fills them from
    // each page's openGraph (falling back to its title/description), so only the parts
    // that are true site-wide live here.
    twitter: { card: "summary" },
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

  // The site has a working search page, so the WebSite entry can advertise it. The
  // target must be the real query-string URL the page reads (?q=), and {search_term_string}
  // is the placeholder schema.org requires.
  const siteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: content.header.orgFull,
    url: `${SITE_URL}/${locale}/`,
    inLanguage: locale,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/${locale}/search/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
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
        <SiteFooter content={content} locale={locale} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
      </body>
    </html>
  );
}
