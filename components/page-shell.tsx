import Link from "next/link";
import type { Provenance } from "@/lib/content";
import { SITE_URL, getContent, type Locale } from "@/lib/i18n";

// Shared shell for the interior content pages, so five pages do not each carry
// their own copy of the hero band, the card style and the source line.

export const CARD = "rounded-lg border border-neutral-200 bg-white p-6 shadow-sm";

export function PageHero({ title, lead }: { title: string; lead: string }) {
  return (
    <section className="bg-brand-700 py-16 text-white">
      <div className="mx-auto w-full max-w-7xl px-4">
        <h1 className="text-3xl font-bold leading-tight md:text-4xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-lg text-neutral-100">{lead}</p>
      </div>
    </section>
  );
}

// Every content page states where its text came from — nothing here is invented,
// so the reader can always check the original page.
// Typed by the content contract: every page that prints a source line has to supply
// a url and a retrieval note, so "where did this come from" cannot be forgotten.
export function SourceLine({ label, url, retrieved }: Provenance) {
  const host = url.replace(/^https?:\/\//, "").split("/")[0];
  return (
    <p className="border-t border-neutral-200 pt-4 text-sm text-neutral-600">
      {label}:{" "}
      <a className="underline" href={url} rel="noreferrer noopener" target="_blank">
        {host}
      </a>{" "}
      — {retrieved}
    </p>
  );
}

// Home › section › this page. The last crumb is plain text because a link to the
// page you are on is noise for both sighted and screen-reader users.
export function Breadcrumb({ locale, trail }: { locale: Locale; trail: { label: string; href?: string }[] }) {
  // The landmark name is translated content, not a hardcoded English string: a Thai
  // screen-reader user should hear the same language as the rest of the page.
  const navLabel = getContent(locale).breadcrumbLabel;
  // The visible trail and the BreadcrumbList carry the same items, built once, so they
  // cannot disagree. Absolute URLs come from SITE_URL for the structured data only.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.label,
      ...(crumb.href ? { item: `${SITE_URL}${crumb.href}/` } : {}),
    })),
  };
  return (
    <nav aria-label={navLabel} className="mb-6">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-neutral-600">
        {trail.map((crumb, index) => (
          <li key={`${crumb.label}-${index}`} className="flex items-center gap-2">
            {crumb.href ? (
              <>
                <Link className="underline underline-offset-2 hover:text-brand-600" href={crumb.href}>
                  {crumb.label}
                </Link>
                <span aria-hidden="true">›</span>
              </>
            ) : (
              <span aria-current="page" className="font-semibold text-neutral-800">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} type="application/ld+json" />
    </nav>
  );
}

export function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      className="inline-block rounded-md bg-brand-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
      href={href}
      rel="noreferrer noopener"
      target="_blank"
    >
      {children}
    </a>
  );
}
