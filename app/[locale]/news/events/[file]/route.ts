import { buildCalendar } from "@/lib/cms/ics";
import { readPublicEvents } from "@/lib/cms/events-live";
import { staticExportOnly } from "@/lib/cms/live";
import { SITE_URL, isLocale } from "@/lib/i18n";

// M05 .ics export: /{locale}/news/events/RAE-EV-0001.ics (one event) and /{locale}/news/events/calendar.ics
// (all published and cancelled events). Built from the same public CMS read as the page, so a draft or
// archived event is never in a file. The Pages preview has no server, so it bakes one placeholder only.
export const revalidate = 60;

export function generateStaticParams() {
  return staticExportOnly ? [{ locale: "th", file: "calendar.ics" }] : [];
}

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; file: string }> }) {
  const { locale, file } = await params;
  if (staticExportOnly || !isLocale(locale)) return new Response("Not found", { status: 404 });
  const single = /^(RAE-EV-\d{4,})\.ics$/.exec(file);
  if (!single && file !== "calendar.ics") return new Response("Not found", { status: 404 });
  const all = await readPublicEvents();
  const events = single ? all.filter((e) => e.code === single[1]) : all;
  if (single && events.length === 0) return new Response("Not found", { status: 404 });
  const host = new URL(SITE_URL).hostname;
  const name = locale === "th" ? "กิจกรรม สำนักวิจัยและบริการวิชาการ มจ." : "RAE MJU events";
  return new Response(buildCalendar(events, locale, host, name), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${single ? single[1] : "rae-events"}.ics"`,
      "cache-control": "public, max-age=60",
    },
  });
}
