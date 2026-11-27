"use client";

import { useCallback, useEffect, useState } from "react";

// M07 inbox: messages sent through the public contact form. Shown to editors and above; viewers/officers see nothing.
const COPY = {
  th: { heading: "ข้อความจากแบบฟอร์มติดต่อ", off: "แบบฟอร์มยังปิดอยู่ (รอประกาศความเป็นส่วนตัวและระยะเวลาเก็บข้อมูลจากเจ้าของระบบ)", none: "ยังไม่มีข้อความ", status: "สถานะ", from: "จาก",
    statuses: { new: "ใหม่", read: "อ่านแล้ว", replied: "ตอบแล้ว", archived: "เก็บถาวร" } },
  en: { heading: "Contact form messages", off: "The form is off (waiting for the owner's privacy notice and retention period).", none: "No messages", status: "Status", from: "From",
    statuses: { new: "New", read: "Read", replied: "Replied", archived: "Archived" } },
} as const;

type Msg = { code: string; name: string; email: string; subject: string; message: string; status: keyof (typeof COPY)["en"]["statuses"]; createdAt: number };

export function ContactDesk({ apiBase, token, locale }: { apiBase: string; token: string; locale: "th" | "en" }) {
  const copy = COPY[locale];
  const [data, setData] = useState<{ messages: Msg[]; enabled: boolean } | null>(null);
  const headers = { "content-type": "application/json", authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    const response = await fetch(`${apiBase}/v1/contact-messages`, { headers: { authorization: `Bearer ${token}` } }).catch(() => null);
    return response?.ok ? ((await response.json()) as { messages: Msg[]; enabled: boolean }) : null;
  }, [apiBase, token]);

  useEffect(() => {
    let live = true;
    void load().then((d) => live && setData(d));
    return () => {
      live = false;
    };
  }, [load]);

  if (data === null) return null;

  async function setStatus(code: string, status: string) {
    await fetch(`${apiBase}/v1/contact-messages/${code}`, { method: "PATCH", headers, body: JSON.stringify({ status }) }).catch(() => null);
    setData(await load());
  }

  return (
    <section aria-labelledby="contact-desk" className="mt-8 rounded-lg border border-neutral-200 bg-white p-6">
      <h2 className="text-xl font-bold" id="contact-desk">{copy.heading}</h2>
      {!data.enabled ? <p className="mt-1 text-sm text-neutral-700">{copy.off}</p> : null}
      <ul className="mt-4 divide-y divide-neutral-200">
        {data.messages.length === 0 ? <li className="py-2 text-sm text-neutral-600">{copy.none}</li> : null}
        {data.messages.map((m) => (
          <li className="flex flex-wrap items-start justify-between gap-3 py-3" key={m.code}>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium">{m.subject}</p>
              <p className="text-xs text-neutral-600">{m.code} · {copy.from} {m.name} &lt;{m.email}&gt; · {new Date(m.createdAt).toLocaleString(locale === "th" ? "th-TH" : "en-GB", { timeZone: "Asia/Bangkok" })}</p>
              <p className="mt-1 whitespace-pre-line text-neutral-700">{m.message}</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              {copy.status}
              <select className="h-10 rounded-md border border-neutral-300 px-2" onChange={(event) => void setStatus(m.code, event.target.value)} value={m.status}>
                {Object.entries(copy.statuses).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
