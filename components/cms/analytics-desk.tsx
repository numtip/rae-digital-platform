"use client";

import { useEffect, useState } from "react";

// M08: anonymous page-view totals for editors — totals per day and the most-viewed paths. Shows nothing for roles without access.
const COPY = {
  th: { heading: "สถิติการเข้าชม (ไม่ระบุตัวตน)", off: "ยังปิดอยู่ (ANALYTICS_ENABLED) — ไม่มีการเก็บสถิติ", none: "ยังไม่มีข้อมูล", total: "รวม 30 วัน", top: "หน้ายอดนิยม", day: "รายวัน", note: "นับเฉพาะเส้นทางหน้า ไม่เก็บ IP คุกกี้ หรือข้อมูลอุปกรณ์" },
  en: { heading: "Page views (anonymous)", off: "Off (ANALYTICS_ENABLED) — nothing is being counted", none: "No data yet", total: "Total, 30 days", top: "Most viewed", day: "By day", note: "Counts the page path only; no IP, cookie or device data." },
} as const;

type Row = { day: string; path: string; hits: number };

export function AnalyticsDesk({ apiBase, token, locale }: { apiBase: string; token: string; locale: "th" | "en" }) {
  const copy = COPY[locale];
  const [data, setData] = useState<{ enabled: boolean; rows: Row[] } | null>(null);
  useEffect(() => {
    let live = true;
    void fetch(`${apiBase}/v1/analytics?days=30`, { headers: { authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => live && setData(d))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [apiBase, token]);
  if (data === null) return null;

  const byDay = new Map<string, number>();
  const byPath = new Map<string, number>();
  for (const r of data.rows) {
    byDay.set(r.day, (byDay.get(r.day) ?? 0) + r.hits);
    byPath.set(r.path, (byPath.get(r.path) ?? 0) + r.hits);
  }
  const total = [...byDay.values()].reduce((a, b) => a + b, 0);
  const top = [...byPath.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  return (
    <section aria-labelledby="analytics-desk" className="mt-8 rounded-lg border border-neutral-200 bg-white p-6">
      <h2 className="text-xl font-bold" id="analytics-desk">{copy.heading}</h2>
      <p className="mt-1 text-sm text-neutral-700">{data.enabled ? copy.note : copy.off}</p>
      {data.enabled && data.rows.length === 0 ? <p className="mt-3 text-sm text-neutral-600">{copy.none}</p> : null}
      {data.rows.length > 0 ? (
        <div className="mt-3 grid gap-4 text-sm md:grid-cols-2">
          <div>
            <p className="font-medium">{copy.total}: {total}</p>
            <h3 className="mt-2 font-medium">{copy.top}</h3>
            <ol className="mt-1 list-decimal pl-5">{top.map(([path, hits]) => <li key={path}>{path} — {hits}</li>)}</ol>
          </div>
          <div>
            <h3 className="font-medium">{copy.day}</h3>
            <ul className="mt-1">{[...byDay.entries()].slice(0, 14).map(([day, hits]) => <li key={day}>{day} — {hits}</li>)}</ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
