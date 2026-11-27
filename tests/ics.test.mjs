import test from "node:test";
import assert from "node:assert/strict";
import { buildCalendar, fold } from "../lib/cms/ics.ts";

const ev = { code: "RAE-EV-0001", titleTh: "ประชุม, ทดสอบ", titleEn: "Meeting; test, a\\b", descriptionTh: "", descriptionEn: "line1\nline2", locationTh: "", locationEn: "Room 1", startsAt: "2026-12-01T02:00:00.000Z", endsAt: "2026-12-01T05:00:00.000Z", cancelled: false, updatedAt: "2026-11-27T10:00:00.000Z" };

test("VEVENT: UTC instants, escaped text, CRLF, stable UID", () => {
  const ics = buildCalendar([ev], "en", "raeservice.mju.ac.th", "RAE");
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n") && ics.endsWith("END:VCALENDAR\r\n"));
  assert.match(ics, /UID:RAE-EV-0001@raeservice\.mju\.ac\.th\r\n/);
  assert.match(ics, /DTSTART:20261201T020000Z\r\n/);
  assert.match(ics, /DTEND:20261201T050000Z\r\n/);
  assert.match(ics, /DTSTAMP:20261127T100000Z\r\n/);
  assert.match(ics, /SUMMARY:Meeting\; test\\, a\\\\b\r\n/);
  assert.match(ics, /DESCRIPTION:line1\\nline2\r\n/);
  assert.match(ics, /LOCATION:Room 1\r\n/);
  assert.match(ics, /STATUS:CONFIRMED\r\n/);
  assert.ok(!/[^\r]\n/.test(ics), "every line ends CRLF");
});

test("cancelled is STATUS:CANCELLED with a higher SEQUENCE; empty description/location omitted; no DTEND without an end", () => {
  const ics = buildCalendar([{ ...ev, cancelled: true, endsAt: null }], "th", "h", "x");
  assert.match(ics, /STATUS:CANCELLED\r\nSEQUENCE:1\r\n/);
  assert.ok(!ics.includes("DTEND") && !ics.includes("DESCRIPTION:") && !ics.includes("LOCATION:"));
  assert.match(ics, /SUMMARY:ประชุม\\, ทดสอบ/);
});

test("folding at 75 octets never splits a Thai character and unfolds to the original", () => {
  const long = `SUMMARY:${"ก".repeat(60)}`;
  const folded = fold(long);
  const lines = folded.split("\r\n");
  assert.ok(lines.length > 1);
  for (const l of lines) assert.ok(new TextEncoder().encode(l).length <= 75, l);
  assert.equal(folded.replace(/\r\n /g, ""), long);
});
