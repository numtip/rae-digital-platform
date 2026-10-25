import Link from "next/link";
import { DEFAULT_LOCALE, getContent } from "@/lib/i18n";
import "./globals.css";

// Unmatched URLs never enter app/[locale]/layout.tsx, so without this file Next
// serves a bare 404 with no <html lang> and no site chrome (WCAG 3.1.1).
// No params are available here, so the language is the default locale.
export default function GlobalNotFound() {
  const { notFound } = getContent(DEFAULT_LOCALE);

  return (
    <html lang={DEFAULT_LOCALE}>
      <body className="bg-surface-50 text-neutral-900 antialiased">
        <main className="mx-auto max-w-7xl px-4 py-24 text-center">
          <h1 className="text-2xl font-bold text-neutral-800 md:text-3xl">{notFound.title}</h1>
          <p className="mt-3 text-neutral-600">{notFound.body}</p>
          <Link
            href={`/${DEFAULT_LOCALE}`}
            className="mt-8 inline-block rounded-md bg-brand-600 px-6 py-2 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-500"
          >
            {notFound.back}
          </Link>
        </main>
      </body>
    </html>
  );
}
