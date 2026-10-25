"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALE_LABEL, NAV, type Locale, type SiteContent } from "@/lib/i18n";

// Destinations that do not exist yet are rendered as disabled text, never as an
// empty hash anchor — that is a dead control (issue #2 rule). Real routes are
// added to NAV in lib/i18n.ts as pages land.

// Gold on brand-700 is 5.1:1, so the ring passes WCAG 1.4.11.
const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-500";

function NavLink({
  item,
  current,
  notAvailable,
}: {
  item: { label: string; href?: string };
  current: boolean;
  notAvailable: string;
}) {
  const base = "text-sm font-medium leading-none";
  if (!item.href) {
    return (
      <span aria-disabled="true" title={notAvailable} className={`${base} cursor-not-allowed opacity-60`}>
        {item.label}
      </span>
    );
  }
  return (
    <Link
      href={item.href}
      aria-current={current ? "page" : undefined}
      className={`${base} ${FOCUS_RING} ${current ? "text-gold-500" : "transition-colors hover:text-gold-500"}`}
    >
      {item.label}
    </Link>
  );
}

const SearchIcon = (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  </svg>
);

const MenuIcon = (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  </svg>
);

/** The same page in the other locale: `/th/about` → `/en/about`. */
function otherLocalePath(pathname: string, from: Locale, to: Locale): string {
  const rest = pathname.replace(new RegExp(`^/${from}(?=/|$)`), "");
  return `/${to}${rest === "/" ? "" : rest}`;
}

export function SiteHeader({ locale, content }: { locale: Locale; content: SiteContent }) {
  const pathname = usePathname();
  const other: Locale = locale === "th" ? "en" : "th";
  // usePathname() drops the trailing slash that trailingSlash puts on the URL,
  // so the current-page test has to normalize before comparing.
  const path = pathname.replace(/\/+$/, "");

  const navLinks = NAV.map(({ key, href }) => (
    <NavLink
      key={key}
      item={{ label: content.nav[key], href: href?.(locale) }}
      current={href?.(locale) === path}
      notAvailable={content.header.notAvailable}
    />
  ));

  return (
    <header className="sticky top-0 z-50 bg-brand-700 text-white shadow-md">
      <div className="border-b border-brand-600/50 py-1 text-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-4 px-4">
          <span aria-disabled="true" title={content.header.notAvailable} className="cursor-not-allowed opacity-60">
            {content.header.staffLogin}
          </span>
          <span className="text-neutral-400" aria-hidden="true">|</span>
          <Link
            href={otherLocalePath(pathname, locale, other)}
            hrefLang={other}
            lang={other}
            aria-label={`${content.header.languageLabel}: ${LOCALE_LABEL[other]}`}
            className={`${FOCUS_RING} hover:text-gold-500`}
          >
            {LOCALE_LABEL[other]}
          </Link>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3">
        {/* TODO(issue #2): real RAE logo asset. The reference logo is a Google
            hotlink; until RAE supplies the file this is the text mark only. */}
        <Link href={`/${locale}`} className={`flex items-center gap-3 ${FOCUS_RING}`}>
          <div
            aria-hidden="true"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white font-bold text-brand-500"
          >
            {content.header.orgShort}
          </div>
          <div>
            {/* The wordmark is not a heading: the page's h1 is its content headline. */}
            <p className="text-xl font-bold leading-tight">{content.header.orgShort}</p>
            <p className="text-xs leading-tight text-neutral-300">
              {content.header.orgFull}
              <br />
              {content.header.orgUniversity}
            </p>
          </div>
        </Link>

        <nav aria-label={content.header.navLabel} className="hidden items-center gap-6 lg:flex">
          {navLinks}
        </nav>

        {/* TODO(issue #2): search page not built yet — the slot is kept, the
            control is disabled so nothing looks clickable but does nothing. */}
        <div className="relative hidden md:block">
          <input
            disabled
            type="search"
            placeholder={content.header.searchPlaceholder}
            aria-label={content.header.searchLabel}
            className="w-48 rounded-full border-none bg-white py-1.5 pl-4 pr-10 text-sm text-neutral-800 placeholder:text-neutral-500 disabled:cursor-not-allowed"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">
            {SearchIcon}
          </span>
        </div>

        <details className="lg:hidden">
          <summary className={`cursor-pointer list-none p-2 [&::-webkit-details-marker]:hidden ${FOCUS_RING}`}>
            <span className="sr-only">{content.header.openMenu}</span>
            {MenuIcon}
          </summary>
          <nav
            aria-label={content.header.navLabelMobile}
            className="absolute inset-x-0 top-full flex flex-col gap-4 bg-brand-700 px-4 py-4 shadow-lg"
          >
            {navLinks}
          </nav>
        </details>
      </div>
    </header>
  );
}
