import type { SiteContent } from "@/lib/i18n";
import { telHref } from "@/lib/phone";

// Contact details are the only real links in the footer: every footer menu item
// in the reference points at a page that does not exist yet, so those columns
// are left out rather than shipped as dead text (see the shift report).
//
// The dial link is derived from the displayed number (spaces dropped) so the
// digits live in one place and the EN/TH forms each stay locally dialable.
export function SiteFooter({ content }: { content: SiteContent }) {
  const { footer, header } = content;

  return (
    <footer className="bg-brand-700 py-12 text-neutral-200">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 md:flex-row md:justify-between">
        <div>
          <p className="text-lg font-bold text-white">{header.orgFull}</p>
          <p className="text-sm">{header.orgUniversity}</p>
        </div>

        <address className="flex flex-col gap-2 text-sm not-italic">
          <span className="font-medium text-white">{footer.contactLabel}</span>
          <span>{footer.address}</span>
          <a
            href={`tel:${telHref(footer.phone)}`}
            className="w-fit hover:text-gold-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-500"
          >
            {footer.phone}
          </a>
          <a
            href={`mailto:${footer.email}`}
            className="w-fit hover:text-gold-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-500"
          >
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
