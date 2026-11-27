// M05 month view: pure date math in Asia/Bangkok (UTC+7, no DST). A day is "YYYY-MM-DD" in Bangkok time.
export const BKK_OFFSET_MS = 7 * 3600_000;

export const bangkokDate = (ms: number) => new Date(ms + BKK_OFFSET_MS).toISOString().slice(0, 10);
export const todayBangkok = (ms: number = Date.now()) => bangkokDate(ms);
export const currentMonth = (ms: number = Date.now()) => bangkokDate(ms).slice(0, 7);

/** "2026-12" -> {year, month} or null when malformed or outside 2000-01 … 2100-12. */
export function parseMonth(ym: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  return year >= 2000 && year <= 2100 && month >= 1 && month <= 12 ? { year, month } : null;
}

export const shiftMonth = (ym: string, delta: number) => {
  const p = parseMonth(ym)!;
  const idx = p.year * 12 + (p.month - 1) + delta;
  return `${String(Math.floor(idx / 12)).padStart(4, "0")}-${String((idx % 12) + 1).padStart(2, "0")}`;
};

/** Weeks (Sunday first) of the month; cells outside the month are null, others "YYYY-MM-DD". */
export function monthGrid(ym: string): (string | null)[][] {
  const { year, month } = parseMonth(ym)!;
  const first = new Date(Date.UTC(year, month - 1, 1));
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (string | null)[] = Array(first.getUTCDay()).fill(null);
  for (let d = 1; d <= days; d += 1) cells.push(`${ym}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Every Bangkok day an event touches (start..end inclusive), capped so a bad range cannot flood the grid. */
export function daysOf(startsAt: string, endsAt: string | null, cap = 62): string[] {
  const first = bangkokDate(Date.parse(startsAt));
  const last = endsAt ? bangkokDate(Date.parse(endsAt)) : first;
  const out: string[] = [];
  for (let t = Date.parse(`${first}T00:00:00Z`); out.length < cap && t <= Date.parse(`${last}T00:00:00Z`); t += 86400_000) out.push(new Date(t).toISOString().slice(0, 10));
  return out.length ? out : [first];
}
