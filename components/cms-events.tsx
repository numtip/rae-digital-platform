import type { PublicEvent } from "@/lib/cms/events-live";
import type { Locale } from "@/lib/i18n";
import { jsonLdScript } from "@/lib/json-ld";

// M05: events published through the CMS. Rendered only when there is at least one; the page it sits on
// keeps its archive-derived lists either way.
const COPY = {
  th: { upcoming: "กิจกรรมที่กำลังจะมาถึง (จากระบบ CMS)", past: "กิจกรรมที่ผ่านมา (จากระบบ CMS)", cancelled: "ยกเลิก", where: "สถานที่", until: "ถึง" },
  en: { upcoming: "Upcoming events (from the CMS)", past: "Past events (from the CMS)", cancelled: "Cancelled", where: "Location", until: "to" },
} as const;

const fmt = (iso: string, locale: Locale) =>
  new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(iso));

export function CmsEvents({ events, upcoming, past, locale }: { events: PublicEvent[]; upcoming: PublicEvent[]; past: PublicEvent[]; locale: Locale }) {
  if (events.length === 0) return null;
  const copy = COPY[locale];
  const pick = (th: string, en: string) => (locale === "th" ? th : en);

  const card = (e: PublicEvent) => (
    <article className="rounded-lg border border-neutral-200 bg-white p-4" id={`ev-${e.code}`} key={e.code}>
      <h3 className="text-lg font-semibold text-neutral-800">
        {pick(e.titleTh, e.titleEn)}
        {e.cancelled ? <span className="ml-2 rounded bg-neutral-200 px-2 py-0.5 text-sm font-medium text-neutral-800">{copy.cancelled}</span> : null}
      </h3>
      <p className="mt-1 text-sm text-neutral-700">
        <time dateTime={e.startsAt}>{fmt(e.startsAt, locale)}</time>
        {e.endsAt ? <> {copy.until} <time dateTime={e.endsAt}>{fmt(e.endsAt, locale)}</time></> : null}
      </p>
      {pick(e.locationTh, e.locationEn) ? <p className="mt-1 text-sm text-neutral-700">{copy.where}: {pick(e.locationTh, e.locationEn)}</p> : null}
      {pick(e.descriptionTh, e.descriptionEn) ? <p className="mt-2 whitespace-pre-line text-neutral-700">{pick(e.descriptionTh, e.descriptionEn)}</p> : null}
    </article>
  );

  return (
    <div className="mb-10 grid gap-8" id="cms-events">
      {upcoming.length > 0 ? (
        <div>
          <h2 className="mb-4 text-2xl font-bold text-neutral-800">{copy.upcoming}</h2>
          <div className="grid gap-3">{upcoming.map(card)}</div>
        </div>
      ) : null}
      {past.length > 0 ? (
        <div>
          <h2 className="mb-4 text-2xl font-bold text-neutral-800">{copy.past}</h2>
          <div className="grid gap-3">{past.map(card)}</div>
        </div>
      ) : null}
      <script
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            events.map((e) => ({
              "@context": "https://schema.org",
              "@type": "Event",
              name: pick(e.titleTh, e.titleEn),
              startDate: e.startsAt,
              ...(e.endsAt ? { endDate: e.endsAt } : {}),
              eventStatus: e.cancelled ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
              ...(pick(e.locationTh, e.locationEn) ? { location: { "@type": "Place", name: pick(e.locationTh, e.locationEn) } } : {}),
              ...(pick(e.descriptionTh, e.descriptionEn) ? { description: pick(e.descriptionTh, e.descriptionEn) } : {}),
            })),
          ),
        }}
        type="application/ld+json"
      />
    </div>
  );
}
