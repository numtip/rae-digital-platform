"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { DeskError, FEEDBACK, StatusConfirm, needsConfirm, type ConfirmStatus } from "@/components/cms/desk-feedback";

// M17 desk: banner / popup / ticker with a mandatory window (every announcement expires). Times are Bangkok time (UTC+7).
const COPY = {
  th: {
    heading: "ประกาศและแบนเนอร์", hint: "แบนเนอร์ = แถบบนสุด · ป็อปอัป = หน้าต่างแสดงครั้งเดียวต่อเซสชัน · ข้อความเลื่อน = บรรทัดเลื่อน ทุกประกาศต้องมีเวลาเริ่มและหมดอายุ (เวลาประเทศไทย) ระบบแสดงเฉพาะรายการที่เผยแพร่และอยู่ในช่วงเวลา",
    kind: "ชนิด", kinds: { banner: "แบนเนอร์", popup: "ป็อปอัป", ticker: "ข้อความเลื่อน" }, titleTh: "หัวข้อ (ไทย)", titleEn: "หัวข้อ (อังกฤษ)", bodyTh: "ข้อความ (ไทย)", bodyEn: "ข้อความ (อังกฤษ)",
    link: "ลิงก์ (ไม่บังคับ: /th/… หรือ https://…)", starts: "เริ่มแสดง", ends: "หมดอายุ", create: "บันทึกเป็นฉบับร่าง", saved: "บันทึกแล้ว", status: "สถานะ", none: "ยังไม่มีประกาศ", edit: "แก้ไข", save: "บันทึกการแก้ไข",
    statuses: { draft: "ฉบับร่าง", published: "เผยแพร่", archived: "เก็บถาวร" },
  },
  en: {
    heading: "Announcements and banners", hint: "Banner = strip at the top · Popup = dialog shown once per session · Ticker = scrolling line. Every announcement needs a start and an expiry (Bangkok time). Only published items inside their window are shown.",
    kind: "Type", kinds: { banner: "Banner", popup: "Popup", ticker: "Ticker" }, titleTh: "Title (Thai)", titleEn: "Title (English)", bodyTh: "Text (Thai)", bodyEn: "Text (English)",
    link: "Link (optional: /th/… or https://…)", starts: "Starts", ends: "Expires", create: "Save as draft", saved: "Saved", status: "Status", none: "No announcements yet", edit: "Edit", save: "Save changes",
    statuses: { draft: "Draft", published: "Published", archived: "Archived" },
  },
} as const;

type An = { code: string; kind: "banner" | "popup" | "ticker"; titleTh: string; titleEn: string; bodyTh: string; bodyEn: string; linkUrl: string; startsAt: number; endsAt: number; status: keyof (typeof COPY)["en"]["statuses"] };
const FIELD = "w-full rounded-md border border-neutral-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";
const BKK = 7 * 3600_000;
const toLocal = (ms: number) => new Date(ms + BKK).toISOString().slice(0, 16);
const toIso = (v: FormDataEntryValue | null) => (typeof v === "string" && v ? `${v}:00+07:00` : null);

export function AnnouncementsDesk({ apiBase, token, locale }: { apiBase: string; token: string; locale: "th" | "en" }) {
  const copy = COPY[locale];
  const [items, setItems] = useState<An[] | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<{ code: string; status: ConfirmStatus } | null>(null);

  const call = useCallback(
    async (path: string, method = "GET", body?: unknown) => {
      const response = await fetch(`${apiBase}${path}`, { method, headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: body === undefined ? undefined : JSON.stringify(body) }).catch(() => null);
      const payload = response ? await response.json().catch(() => ({})) : {};
      return { ok: !!response?.ok, status: response?.status ?? 0, payload: payload as Record<string, unknown> };
    },
    [apiBase, token],
  );
  const refresh = useCallback(async () => {
    const r = await call("/v1/announcements");
    setItems(r.ok ? ((r.payload.announcements as An[]) ?? []) : null);
  }, [call]);
  useEffect(() => {
    let live = true;
    void call("/v1/announcements").then((r) => live && setItems(r.ok ? ((r.payload.announcements as An[]) ?? []) : null));
    return () => {
      live = false;
    };
  }, [call]);
  if (items === null) return null;

  const fields = (d: FormData) => ({ kind: d.get("kind"), titleTh: d.get("titleTh"), titleEn: d.get("titleEn"), bodyTh: d.get("bodyTh"), bodyEn: d.get("bodyEn"), linkUrl: d.get("linkUrl"), startsAt: toIso(d.get("startsAt")), endsAt: toIso(d.get("endsAt")) });
  const fail = (r: { payload: Record<string, unknown>; status: number }) => String(r.payload.message || r.payload.error || r.status);

  async function onSubmit(event: FormEvent<HTMLFormElement>, code?: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = fields(new FormData(form));
    const r = code ? await call(`/v1/announcements/${code}`, "PATCH", body) : await call("/v1/announcements", "POST", body);
    setError(r.ok ? "" : fail(r));
    if (r.ok) toast.success(copy.saved);
    else toast.error(`${FEEDBACK[locale].errorTitle}: ${fail(r)}`);
    if (r.ok) {
      if (!code) form.reset();
      await refresh();
    }
  }
  async function setStatus(code: string, status: string) {
    const r = await call(`/v1/announcements/${code}`, "PATCH", { status });
    setError(r.ok ? "" : fail(r));
    if (r.ok) toast.success(FEEDBACK[locale].statusChanged);
    else toast.error(`${FEEDBACK[locale].errorTitle}: ${fail(r)}`);
    await refresh();
  }

  // Going live, archiving and cancelling are the moves readers notice, so they ask first.
  function onStatusChange(code: string, status: string) {
    if (needsConfirm(status)) setPending({ code, status });
    else void setStatus(code, status);
  }

  const form = (a?: An) => (
    <form className="mt-3 grid gap-3" onSubmit={(event) => void onSubmit(event, a?.code)}>
      <label className="flex flex-col gap-1 text-sm font-medium">{copy.kind}
        <select className={FIELD} defaultValue={a?.kind ?? "banner"} name="kind">{Object.entries(copy.kinds).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">{copy.titleTh}<input className={FIELD} defaultValue={a?.titleTh} maxLength={200} name="titleTh" required /></label>
      <label className="flex flex-col gap-1 text-sm font-medium">{copy.titleEn}<input className={FIELD} defaultValue={a?.titleEn} maxLength={200} name="titleEn" required /></label>
      <label className="flex flex-col gap-1 text-sm font-medium">{copy.bodyTh}<textarea className={FIELD} defaultValue={a?.bodyTh} maxLength={600} name="bodyTh" rows={2} /></label>
      <label className="flex flex-col gap-1 text-sm font-medium">{copy.bodyEn}<textarea className={FIELD} defaultValue={a?.bodyEn} maxLength={600} name="bodyEn" rows={2} /></label>
      <label className="flex flex-col gap-1 text-sm font-medium">{copy.link}<input className={FIELD} defaultValue={a?.linkUrl} maxLength={500} name="linkUrl" /></label>
      <label className="flex flex-col gap-1 text-sm font-medium">{copy.starts}<input className={FIELD} defaultValue={a ? toLocal(a.startsAt) : ""} name="startsAt" required type="datetime-local" /></label>
      <label className="flex flex-col gap-1 text-sm font-medium">{copy.ends}<input className={FIELD} defaultValue={a ? toLocal(a.endsAt) : ""} name="endsAt" required type="datetime-local" /></label>
      <button className="h-11 rounded-md border px-4 text-sm font-medium" type="submit">{a ? copy.save : copy.create}</button>
    </form>
  );

  return (
    <section aria-labelledby="announcements-desk" className="mt-8 rounded-lg border border-neutral-200 bg-white p-6">
      <h2 className="text-xl font-bold" id="announcements-desk">{copy.heading}</h2>
      <p className="mt-1 text-sm text-neutral-700">{copy.hint}</p>
      {form()}
      <DeskError locale={locale} message={error} />
      <ul className="mt-4 divide-y divide-neutral-200">
        {items.length === 0 ? <li className="py-2 text-sm text-neutral-600">{copy.none}</li> : null}
        {items.map((a) => (
          <li className="flex flex-wrap items-start justify-between gap-3 py-3" key={a.code}>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium">{locale === "th" ? a.titleTh : a.titleEn}</p>
              <p className="text-xs text-neutral-600">{a.code} · {copy.kinds[a.kind]} · {toLocal(a.startsAt).replace("T", " ")} → {toLocal(a.endsAt).replace("T", " ")}</p>
              <details className="mt-1"><summary className="cursor-pointer text-xs text-neutral-700">{copy.edit}</summary>{form(a)}</details>
            </div>
            <label className="flex items-center gap-2 text-sm">{copy.status}
              <select className="h-10 rounded-md border border-neutral-300 px-2" onChange={(event) => onStatusChange(a.code, event.target.value)} value={a.status}>
                {Object.entries(copy.statuses).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </li>
        ))}
      </ul>
      <StatusConfirm
        locale={locale}
        onCancel={() => setPending(null)}
        onConfirm={(code, status) => { setPending(null); void setStatus(code, status); }}
        pending={pending}
      />
    </section>
  );
}
