"use client";

import { useEffect, useState } from "react";

// M18 dashboard: one glance at every module's state, for editors and above. Counts come from /v1/dashboard
// (read only). "Recent activity" appears only for roles allowed to read the audit trail.
type Counts = Record<string, number>;
type Dash = {
  news: Counts; documents: Counts; documentLinksBroken: number; knowledge: Counts; events: Counts; announcements: Counts;
  contact: { enabled: boolean; new: number; total: number }; views7d: number | null;
  recent?: { actorId: string; action: string; entityType: string; entityId: string; createdAt: string }[];
};
const COPY = {
  th: {
    heading: "ภาพรวมระบบ", news: "ข่าว", documents: "เอกสาร", knowledge: "คำถามที่พบบ่อย", events: "กิจกรรม", announcements: "ประกาศ", contact: "ข้อความติดต่อ", views: "การเข้าชม 7 วัน",
    published: "เผยแพร่", draft: "ฉบับร่าง", review: "รอตรวจ", current: "ใช้งานอยู่", upcoming: "กำลังจะมาถึง", liveNow: "แสดงอยู่ตอนนี้", new: "ใหม่", broken: "ลิงก์เสีย", off: "ปิดอยู่", recent: "กิจกรรมล่าสุด",
  },
  en: {
    heading: "Overview", news: "News", documents: "Documents", knowledge: "FAQ", events: "Events", announcements: "Announcements", contact: "Contact messages", views: "Page views, 7 days",
    published: "published", draft: "draft", review: "in review", current: "current", upcoming: "upcoming", liveNow: "live now", new: "new", broken: "broken links", off: "off", recent: "Recent activity",
  },
} as const;

export function DashboardDesk({ apiBase, token, locale }: { apiBase: string; token: string; locale: "th" | "en" }) {
  const copy = COPY[locale];
  const [d, setD] = useState<Dash | null>(null);
  useEffect(() => {
    let live = true;
    void fetch(`${apiBase}/v1/dashboard`, { headers: { authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((x) => live && setD(x))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [apiBase, token]);
  if (!d) return null;
  const n = (c: Counts, k: string) => c[k] ?? 0;
  const tile = (title: string, lines: string[]) => (
    <div className="rounded-md border border-neutral-200 p-3">
      <h3 className="text-sm font-semibold text-neutral-800">{title}</h3>
      <p className="mt-1 text-sm text-neutral-700">{lines.join(" · ")}</p>
    </div>
  );
  return (
    <section aria-labelledby="dashboard-desk" className="mt-8 rounded-lg border border-neutral-200 bg-white p-6">
      <h2 className="text-xl font-bold" id="dashboard-desk">{copy.heading}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tile(copy.news, [`${n(d.news, "published")} ${copy.published}`, `${n(d.news, "draft")} ${copy.draft}`, `${n(d.news, "review")} ${copy.review}`])}
        {tile(copy.documents, [`${n(d.documents, "current")} ${copy.current}`, `${n(d.documents, "draft")} ${copy.draft}`, `${d.documentLinksBroken} ${copy.broken}`])}
        {tile(copy.knowledge, [`${n(d.knowledge, "published")} ${copy.published}`, `${n(d.knowledge, "draft")} ${copy.draft}`])}
        {tile(copy.events, [`${d.events.upcoming ?? 0} ${copy.upcoming}`, `${n(d.events, "draft")} ${copy.draft}`])}
        {tile(copy.announcements, [`${d.announcements.liveNow ?? 0} ${copy.liveNow}`, `${n(d.announcements, "draft")} ${copy.draft}`])}
        {tile(copy.contact, d.contact.enabled ? [`${d.contact.new} ${copy.new}`, `${d.contact.total} total`] : [copy.off])}
        {d.views7d !== null ? tile(copy.views, [String(d.views7d)]) : null}
      </div>
      {d.recent && d.recent.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-neutral-800">{copy.recent}</h3>
          <ul className="mt-1 text-xs text-neutral-700">
            {d.recent.map((r, i) => (
              <li key={`${r.createdAt}-${i}`}>{new Date(r.createdAt).toLocaleString(locale === "th" ? "th-TH" : "en-GB", { timeZone: "Asia/Bangkok" })} · {r.actorId} · {r.action} · {r.entityId}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
