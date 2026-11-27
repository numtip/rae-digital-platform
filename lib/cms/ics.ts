import type { PublicEvent } from "./events-live.ts";

// M05 .ics export (RFC 5545). One VEVENT per event; a calendar of several for the feed. Pure and dependency-free.
// Times are written as UTC instants (no VTIMEZONE needed). A cancelled event is STATUS:CANCELLED with a higher
// SEQUENCE so calendar clients that already hold it mark it cancelled instead of silently keeping it.

const esc = (v: string) => v.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

/** RFC 5545 §3.1: lines are folded at 75 octets; a continuation starts with one space. Never splits a UTF-8 sequence. */
export function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (bytes + n > limit) {
      out.push(cur);
      cur = "";
      bytes = 0;
      limit = 74; // the leading space of a continuation line counts
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

export function eventLines(e: PublicEvent, locale: "th" | "en", host: string): string[] {
  const pick = (th: string, en: string) => (locale === "th" ? th : en);
  const description = pick(e.descriptionTh, e.descriptionEn);
  const location = pick(e.locationTh, e.locationEn);
  return [
    "BEGIN:VEVENT",
    `UID:${e.code}@${host}`,
    `DTSTAMP:${stamp(e.updatedAt)}`,
    `DTSTART:${stamp(e.startsAt)}`,
    ...(e.endsAt ? [`DTEND:${stamp(e.endsAt)}`] : []),
    `SUMMARY:${esc(pick(e.titleTh, e.titleEn))}`,
    ...(description ? [`DESCRIPTION:${esc(description)}`] : []),
    ...(location ? [`LOCATION:${esc(location)}`] : []),
    `STATUS:${e.cancelled ? "CANCELLED" : "CONFIRMED"}`,
    `SEQUENCE:${e.cancelled ? 1 : 0}`,
    "END:VEVENT",
  ];
}

export function buildCalendar(events: PublicEvent[], locale: "th" | "en", host: string, name: string): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//RAE MJU//Events//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${esc(name)}`, ...events.flatMap((e) => eventLines(e, locale, host)), "END:VCALENDAR"];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
