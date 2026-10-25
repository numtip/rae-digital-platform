import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
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
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Props & { children: React.ReactNode }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const content = getContent(locale);

  return (
    <html lang={locale} className={sarabun.variable}>
      <body>
        <SiteHeader locale={locale} content={content} />
        {children}
      </body>
    </html>
  );
}
