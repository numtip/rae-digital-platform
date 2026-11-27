import { AnnouncementBanner, AnnouncementPopup, AnnouncementTicker } from "@/components/announcements-client";
import { readPublicAnnouncements } from "@/lib/cms/announcements-live";
import type { Locale } from "@/lib/i18n";

// M17: live announcements from the CMS, rendered in the page flow (banner and ticker take their space on first
// paint, so nothing shifts) or as a once-per-session dialog (popup, an overlay). Nothing renders while none is live.
export async function Announcements({ locale }: { locale: Locale }) {
  const all = await readPublicAnnouncements();
  if (all.length === 0) return null;
  const pick = (a: (typeof all)[number]) => ({
    code: a.code,
    title: locale === "th" ? a.titleTh : a.titleEn,
    body: locale === "th" ? a.bodyTh : a.bodyEn,
    link: a.linkUrl,
    endsAt: a.endsAt,
  });
  const popup = all.find((a) => a.kind === "popup");
  return (
    <>
      {all.filter((a) => a.kind === "banner").map((a) => <AnnouncementBanner key={a.code} locale={locale} {...pick(a)} />)}
      {all.filter((a) => a.kind === "ticker").map((a) => <AnnouncementTicker key={a.code} locale={locale} {...pick(a)} />)}
      {popup ? <AnnouncementPopup locale={locale} {...pick(popup)} /> : null}
    </>
  );
}
