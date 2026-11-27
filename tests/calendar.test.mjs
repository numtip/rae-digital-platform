import test from "node:test";
import assert from "node:assert/strict";
import { bangkokDate, currentMonth, daysOf, monthGrid, parseMonth, shiftMonth } from "../lib/calendar.ts";

test("month parsing and navigation across year ends", () => {
  assert.deepEqual(parseMonth("2026-12"), { year: 2026, month: 12 });
  for (const bad of ["2026-13", "2026-00", "1999-12", "2101-01", "26-12", "2026-1", "abcd-ef", "../etc"]) assert.equal(parseMonth(bad), null, bad);
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(shiftMonth("2026-03", 12), "2027-03");
});

test("grid: Sunday first, 7 columns, leading/trailing blanks, every day once", () => {
  const weeks = monthGrid("2026-02"); // 1 Feb 2026 is a Sunday; 28 days -> exactly 4 weeks
  assert.equal(weeks.length, 4);
  assert.equal(weeks[0][0], "2026-02-01");
  const dec = monthGrid("2026-12"); // 1 Dec 2026 is a Tuesday
  assert.equal(dec[0].indexOf("2026-12-01"), 2);
  assert.ok(dec.every((w) => w.length === 7));
  assert.equal(dec.flat().filter(Boolean).length, 31);
  assert.equal(new Set(dec.flat().filter(Boolean)).size, 31);
});

test("Bangkok days: an evening UTC instant is already the next Bangkok day; multi-day events span; capped", () => {
  assert.equal(bangkokDate(Date.parse("2026-12-01T17:30:00Z")), "2026-12-02");
  assert.equal(currentMonth(Date.parse("2026-11-30T18:00:00Z")), "2026-12");
  assert.deepEqual(daysOf("2026-12-01T02:00:00Z", null), ["2026-12-01"]);
  assert.deepEqual(daysOf("2026-12-01T02:00:00Z", "2026-12-03T02:00:00Z"), ["2026-12-01", "2026-12-02", "2026-12-03"]);
  assert.equal(daysOf("2026-01-01T00:00:00Z", "2030-01-01T00:00:00Z").length, 62, "a runaway range is capped");
});
