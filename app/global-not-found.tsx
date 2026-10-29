import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { DEFAULT_LOCALE, LOCALES, getContent, type Locale } from "@/lib/i18n";
import { asset } from "@/lib/assets";
import "./globals.css";

// Unmatched URLs never enter app/[locale]/layout.tsx, so without this file Next serves a
// bare 404 with no <html lang> and no site chrome (WCAG 3.1.1). No params are available
// here, so the page is named and linked in every locale rather than guessing one.

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500";

// The document title is the only thing missing from a static export's 404.html; Next
// already emits <meta name="robots" content="noindex"> for the not-found document.
export const metadata: Metadata = {
  title: `${getContent(DEFAULT_LOCALE).notFound.title} — ${getContent(DEFAULT_LOCALE).meta.title}`,
};

function LocaleBlock({ locale }: { locale: Locale }) {
  const content = getContent(locale);
  return (
    <div lang={locale}>
      <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">{content.notFound.title}</h2>
      <p className="mt-2 text-neutral-600 dark:text-neutral-300">{content.notFound.body}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <Link
          className={`rounded-md bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700 ${FOCUS}`}
          href={`/${locale}`}
        >
          {content.notFound.back}
        </Link>
        <Link
          className={`rounded-md border border-brand-600 px-5 py-2.5 font-medium text-brand-700 dark:border-neutral-400 dark:text-neutral-100 hover:bg-brand-50 ${FOCUS}`}
          href={`/${locale}/search`}
        >
          {content.notFound.search}
        </Link>
      </div>
    </div>
  );
}

export default function GlobalNotFound() {
  const primary = getContent(DEFAULT_LOCALE);

  return (
    <html lang={DEFAULT_LOCALE}>
      <body className="bg-surface-50 text-neutral-900 antialiased">
        <main id="main-content" className="mx-auto max-w-3xl px-4 py-24 text-center">
          <Image
            alt=""
            className="mx-auto h-16 w-16"
            height={192}
            priority
            src={asset("/images/brand/mju-emblem-192.png")}
            width={192}
          />
          <p className="mt-6 text-sm font-semibold text-brand-600 dark:text-gold-500">404</p>
          <h1 className="mt-2 text-2xl font-bold text-neutral-800 dark:text-neutral-100 md:text-3xl">{primary.notFound.title}</h1>
          <p className="mt-3 text-neutral-600 dark:text-neutral-300">{primary.notFound.body}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              className={`rounded-md bg-brand-600 px-6 py-2.5 font-medium text-white hover:bg-brand-700 ${FOCUS}`}
              href={`/${DEFAULT_LOCALE}`}
            >
              {primary.notFound.back}
            </Link>
            <Link
              className={`rounded-md border border-brand-600 px-6 py-2.5 font-medium text-brand-700 dark:border-neutral-400 dark:text-neutral-100 hover:bg-brand-50 ${FOCUS}`}
              href={`/${DEFAULT_LOCALE}/search`}
            >
              {primary.notFound.search}
            </Link>
          </div>

          <hr className="mx-auto my-10 max-w-xs border-neutral-200" />

          {LOCALES.filter((locale) => locale !== DEFAULT_LOCALE).map((locale) => (
            <LocaleBlock key={locale} locale={locale} />
          ))}
        </main>
      </body>
    </html>
  );
}
