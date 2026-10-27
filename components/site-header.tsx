"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { asset } from "@/lib/assets";
import { LOCALE_LABEL, NAV, getSearch, type Locale, type SiteContent } from "@/lib/i18n";

// Destinations that do not exist yet are rendered as disabled text, never as an
// empty hash anchor — that is a dead control (issue #2 rule). Real routes are
// added to NAV in lib/i18n.ts as pages land.

// Gold on brand-700 is 5.1:1, so the ring passes WCAG 1.4.11.
const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-500";

// Every control in the header is at least 44x44, like the nav links already were. The
// utility-bar links were 28x16 and 38x16 at 375px and the menu button 40x40, so the two
// controls a phone reader actually taps sat below the target size the rest of the site uses.
const TAP_TARGET = "inline-flex min-h-11 min-w-11 items-center justify-center";

function NavLink({
  item,
  current,
  notAvailable,
}: {
  item: { label: string; href?: string };
  current: boolean;
  notAvailable: string;
}) {
  const base = "inline-flex min-h-11 items-center text-sm font-medium leading-none";
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
  const router = useRouter();
  const other: Locale = locale === "th" ? "en" : "th";
  const switchHref = otherLocalePath(pathname, locale, other);
  // usePathname() drops the trailing slash that trailingSlash puts on the URL,
  // so the current-page test has to normalize before comparing.
  const path = pathname.replace(/\/+$/, "");

  // The mobile menu is a <details>; without this it stays open across a client-side
  // route change and covers the page the reader just opened.
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (menu.current) menu.current.open = false;
  }, [pathname]);

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
          {/* The utility bar is where the blueprint puts search. The full input lives here
              because the main row has no room for it once the nav carries eight sections. */}
          <Link className={`${TAP_TARGET} ${FOCUS_RING} hover:text-gold-500 sm:hidden`} href={`/${locale}/search`}>
            {getSearch(locale).hero.title}
          </Link>
          <form action={asset(`/${locale}/search/`)} className="relative hidden sm:block" method="get" role="search">
            <input
              type="search"
              name="q"
              placeholder={content.header.searchPlaceholder}
              aria-label={content.header.searchLabel}
              className="w-40 rounded-full border-none bg-white py-1 pl-3 pr-8 text-xs text-neutral-800 placeholder:text-neutral-500"
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500">
              {SearchIcon}
            </span>
          </form>
          <span className="text-neutral-400" aria-hidden="true">|</span>
          <Link
            href={switchHref}
            hrefLang={other}
            lang={other}
            aria-label={`${content.header.languageLabel}: ${LOCALE_LABEL[other]}`}
            className={`${TAP_TARGET} ${FOCUS_RING} hover:text-gold-500`}
            // A search word lives in ?q=, which usePathname() cannot see, so the plain
            // href would open an empty search in the other locale. The href stays the
            // prerendered page; the click carries the query string the reader has now.
            onClick={(event) => {
              if (!window.location.search) return;
              event.preventDefault();
              router.push(switchHref + window.location.search);
            }}
          >
            {LOCALE_LABEL[other]}
          </Link>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3">
        <Link href={`/${locale}`} className={`flex min-h-11 items-center gap-3 ${FOCUS_RING}`}>
          {/* Decorative: the wordmark beside it already names the office, so the
              emblem carries an empty alt instead of repeating the name twice. The file is
              transparent PNG with the surrounding text masked out, so it sits straight on
              the dark header without a white disc. */}
          <Image
            src={asset("/images/brand/mju-emblem-192.png")}
            alt=""
            width={192}
            height={192}
            className="h-12 w-12 shrink-0"
            priority
          />
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

        <nav aria-label={content.header.navLabel} className="hidden items-center gap-3 lg:flex xl:gap-6">
          {navLinks}
        </nav>

        <details className="lg:hidden" ref={menu}>
          <summary className={`flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center [&::-webkit-details-marker]:hidden ${FOCUS_RING}`}>
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
