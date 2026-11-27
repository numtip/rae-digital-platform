import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb, PageHero } from "@/components/page-shell";
import { currentMonth, daysOf, monthGrid, parseMonth, shiftMonth, todayBangkok } from "@/lib/calendar";
import { readPublicEvents } from "@/lib/cms/events-live";
import { staticExportOnly } from "@/lib/cms/live";
import { getActivityItems, getContent, getNews, isLocale, type Locale } from "@/lib/i18n";

// M05 month view: a real table of the month, one list of events per day. Sources: events published through the
// CMS and the archive's activity news (each by its own date). Month pages are unbounded (prev/next forever), so they
// are noindex and not in the sitemap; the upcoming list on /news/events/ stays the indexed page.
export const revalidate = 60;

type Props = { params: Promise<{ locale: string; ym: string }> };

const COPY = {
  th: { title: "ปฏิทินกิจกรรม", lead: "มุมมองรายเดือนของกิจกรรมที่เผยแพร่", prev: "เดือนก่อนหน้า", next: "เดือนถัดไป", today: "เดือนนี้", list: "ดูเป็นรายการ", cancelled: "ยกเลิก", none: "ไม่มีกิจกรรมในเดือนนี้", weekdays: ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"], short: ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"] },
  en: { title: "Events calendar", lead: "Month view of published events", prev: "Previous month", next: "Next month", today: "This month", list: "Back to the list", cancelled: "Cancelled", none: "No events this month", weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], short: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] },
} as const;

export function generateStaticParams() {
  // The Pages preview needs one baked path for a dynamic route; a server renders any month on demand.
  return staticExportOnly ? (["th", "en"] as const).map((locale) => ({ locale, ym: currentMonth() })) : [];
}

const monthName = (ym: string, locale: Locale) => {
  const { year, month } = parseMonth(ym)!;
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, ym } = await params;
  if (!isLocale(locale) || !parseMonth(ym)) notFound();
  return { title: `${COPY[locale].title} — ${monthName(ym, locale)}`, robots: { index: false, follow: true }, alternates: { canonical: `/${locale}/news/events/month/${ym}/` } };
}

export default async function EventsMonth({ params }: Props) {
  const { locale, ym } = await params;
  if (!isLocale(locale) || !parseMonth(ym)) notFound();
  const copy = COPY[locale];
  const site = getContent(locale);
  const news = getNews(locale);

  type Entry = { key: string; label: string; href: string; cancelled: boolean };
  const byDay = new Map<string, Entry[]>();
  const add = (day: string, e: Entry) => byDay.set(day, [...(byDay.get(day) ?? []), e]);
  for (const e of await readPublicEvents()) {
    for (const day of daysOf(e.startsAt, e.endsAt)) {
      if (day.startsWith(ym)) add(day, { key: e.code, label: locale === "th" ? e.titleTh : e.titleEn, href: `/${locale}/news/events#ev-${e.code}`, cancelled: e.cancelled });
    }
  }
  const thaiTitles = new Map(getNews("th").items.map((item) => [item.nid, item.title]));
  for (const item of getActivityItems(locale)) {
    if (item.dateIso.startsWith(ym)) add(item.dateIso, { key: item.nid, label: item.title || thaiTitles.get(item.nid) || item.nid, href: `/${locale}/news/${item.nid}`, cancelled: false });
  }
  const total = [...byDay.values()].reduce((n, l) => n + l.length, 0);
  const today = todayBangkok();
  const weeks = monthGrid(ym);
  const link = "text-sm font-medium text-brand-600 underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

  return (
    <main id="main-content" tabIndex={-1}>
      <PageHero title={copy.title} lead={copy.lead} />
      <section className="bg-surface-50 py-8">
        <div className="mx-auto w-full max-w-7xl px-4">
          <Breadcrumb locale={locale} trail={[{ label: site.nav.home, href: `/${locale}` }, { label: news.hero.title, href: `/${locale}/news` }, { label: news.events.hero.title, href: `/${locale}/news/events` }, { label: copy.title }]} />
        </div>
      </section>
      <section className="bg-white py-10">
        <div className="mx-auto w-full max-w-7xl px-4">
          <nav aria-label={copy.title} className="mb-4 flex flex-wrap items-center gap-4">
            <Link className={link} href={`/${locale}/news/events/month/${shiftMonth(ym, -1)}`} rel="prev">‹ {copy.prev}</Link>
            <Link className={link} href={`/${locale}/news/events/month/${currentMonth()}`}>{copy.today}</Link>
            <Link className={link} href={`/${locale}/news/events/month/${shiftMonth(ym, 1)}`} rel="next">{copy.next} ›</Link>
            <Link className={`${link} ml-auto`} href={`/${locale}/news/events`}>{copy.list}</Link>
          </nav>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] table-fixed border-collapse text-sm">
              <caption className="pb-2 text-left text-2xl font-bold text-neutral-800">{monthName(ym, locale)}</caption>
              <thead>
                <tr>
                  {copy.weekdays.map((d, i) => (
                    <th className="border border-neutral-300 bg-surface-50 px-2 py-1 text-left font-semibold text-neutral-800" key={d} scope="col">
                      <abbr title={d}>{copy.short[i]}</abbr>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((week, w) => (
                  <tr key={w}>
                    {week.map((day, i) => (
                      <td className={`h-24 border border-neutral-300 p-1 align-top ${day === today ? "outline outline-2 -outline-offset-2 outline-brand-600" : ""}`} key={i}>
                        {day ? (
                          <>
                            <p className={`font-semibold ${day === today ? "text-brand-700" : "text-neutral-800"}`}>
                              <time dateTime={day}>{Number(day.slice(8))}</time>
                              {day === today ? <span className="sr-only"> ({copy.today})</span> : null}
                            </p>
                            <ul className="mt-1 grid gap-1">
                              {(byDay.get(day) ?? []).map((e) => (
                                <li key={e.key}>
                                  <Link className="text-neutral-800 underline underline-offset-2 hover:text-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600" href={e.href}>
                                    {e.label}
                                  </Link>
                                  {e.cancelled ? <span className="ml-1 rounded bg-neutral-200 px-1 text-xs text-neutral-800">{copy.cancelled}</span> : null}
                                </li>
                              ))}
                            </ul>
                          </>
                        ) : null}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total === 0 ? <p className="mt-4 text-neutral-700">{copy.none}</p> : null}
        </div>
      </section>
    </main>
  );
}
