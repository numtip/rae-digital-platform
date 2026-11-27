import Link from "next/link";
import { NAV, type Locale, type SiteContent } from "@/lib/i18n";
import { telHref } from "@/lib/phone";

// The footer carries the real section links (the same NAV list the header uses, so the two
// cannot drift) plus the office's contact details. The reference's other columns pointed at
// pages that do not exist and are still left out rather than shipped as dead text.
//
// The dial link is derived from the displayed number so the digits live in one place and the
// EN/TH forms each stay locally dialable.
const LINK =
  "w-fit hover:text-gold-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-500";

export function SiteFooter({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { footer, header } = content;

  return (
    <footer className="bg-brand-700 py-12 text-neutral-200">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 md:flex-row md:justify-between">
        <div>
          <p className="text-lg font-bold text-white">{header.orgFull}</p>
          <p className="text-sm">{header.orgUniversity}</p>
        </div>

        <nav aria-label={footer.sectionsLabel} className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-white">{footer.sectionsLabel}</span>
          {NAV.map(({ key, href }) =>
            href ? (
              <Link key={key} className={LINK} href={href(locale)}>
                {content.nav[key]}
              </Link>
            ) : null,
          )}
        </nav>

        <address className="flex flex-col gap-2 text-sm not-italic">
          <span className="font-medium text-white">{footer.contactLabel}</span>
          <span>{footer.address}</span>
          <a className={LINK} href={`tel:${telHref(footer.phone)}`}>
            {footer.phone}
          </a>
          <a className={LINK} href={`mailto:${footer.email}`}>
            {footer.email}
          </a>
        </address>
      </div>

      <div className="mx-auto mt-8 max-w-7xl border-t border-brand-600/50 px-4 pt-6 text-xs">
        © {new Date().getFullYear()} {header.orgFull}, {header.orgUniversity}. {footer.rights}
      </div>
    </footer>
  );
}
