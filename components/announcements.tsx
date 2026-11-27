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
  // Landmark names must be unique on the page (axe: landmark-unique): kind word, a number when there are several
  // of the same kind, then the title — so two banners (or a banner and a ticker) with the same title still differ.
  const KIND = { th: { banner: "ประกาศ", ticker: "ข้อความเลื่อน" }, en: { banner: "Announcement", ticker: "News ticker" } } as const;
  const labelFor = (kind: "banner" | "ticker", index: number, count: number, title: string) =>
    `${KIND[locale][kind]}${count > 1 ? ` ${index + 1}` : ""}: ${title}`;
  const banners = all.filter((a) => a.kind === "banner");
  const tickers = all.filter((a) => a.kind === "ticker");
  return (
    <>
      {banners.map((a, i) => <AnnouncementBanner key={a.code} label={labelFor("banner", i, banners.length, pick(a).title)} locale={locale} {...pick(a)} />)}
      {tickers.map((a, i) => <AnnouncementTicker key={a.code} label={labelFor("ticker", i, tickers.length, pick(a).title)} locale={locale} {...pick(a)} />)}
      {popup ? <AnnouncementPopup locale={locale} {...pick(popup)} /> : null}
    </>
  );
}
