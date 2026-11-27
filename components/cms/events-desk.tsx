"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { DeskError, FEEDBACK, StatusConfirm, needsConfirm, type ConfirmStatus } from "@/components/cms/desk-feedback";

// M05 desk: write events (Thai + English), keep them as drafts, and let a publisher release, edit,
// cancel or archive them. Times are entered in Bangkok time (UTC+7) and sent with that offset.
const COPY = {
  th: {
    heading: "กิจกรรมและปฏิทิน (Events)",
    hint: "เวลาเป็นเวลาประเทศไทย เก็บเป็นฉบับร่างก่อน ผู้เผยแพร่เป็นผู้ปล่อยขึ้นหน้า กิจกรรมที่ยกเลิกจะยังแสดงพร้อมป้าย “ยกเลิก”",
    titleTh: "ชื่อกิจกรรม (ไทย)", titleEn: "ชื่อกิจกรรม (อังกฤษ)", descTh: "รายละเอียด (ไทย)", descEn: "รายละเอียด (อังกฤษ)", locTh: "สถานที่ (ไทย)", locEn: "สถานที่ (อังกฤษ)",
    starts: "เริ่ม", ends: "สิ้นสุด (ไม่บังคับ)", create: "บันทึกเป็นฉบับร่าง", saved: "บันทึกแล้ว", status: "สถานะ", none: "ยังไม่มีกิจกรรม", edit: "แก้ไข", save: "บันทึกการแก้ไข",
    statuses: { draft: "ฉบับร่าง", published: "เผยแพร่", cancelled: "ยกเลิก", archived: "เก็บถาวร" },
  },
  en: {
    heading: "Events and calendar",
    hint: "Times are Bangkok time (UTC+7). Events start as drafts; a publisher releases them. A cancelled event stays visible with a “Cancelled” badge.",
    titleTh: "Title (Thai)", titleEn: "Title (English)", descTh: "Description (Thai)", descEn: "Description (English)", locTh: "Location (Thai)", locEn: "Location (English)",
    starts: "Starts", ends: "Ends (optional)", create: "Save as draft", saved: "Saved", status: "Status", none: "No events yet", edit: "Edit", save: "Save changes",
    statuses: { draft: "Draft", published: "Published", cancelled: "Cancelled", archived: "Archived" },
  },
} as const;

type Ev = {
  code: string; titleTh: string; titleEn: string; descriptionTh: string; descriptionEn: string; locationTh: string; locationEn: string;
  startsAt: number; endsAt: number | null; status: keyof (typeof COPY)["en"]["statuses"];
};
const FIELD = "w-full rounded-md border border-neutral-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";
const BKK = 7 * 3600_000;
const toLocal = (ms: number | null) => (ms === null ? "" : new Date(ms + BKK).toISOString().slice(0, 16));
const toIso = (local: FormDataEntryValue | null) => (typeof local === "string" && local ? `${local}:00+07:00` : null);

export function EventsDesk({ apiBase, token, locale }: { apiBase: string; token: string; locale: "th" | "en" }) {
  const copy = COPY[locale];
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<{ code: string; status: ConfirmStatus } | null>(null);

  const call = useCallback(
    async (path: string, method = "GET", body?: unknown) => {
      const response = await fetch(`${apiBase}${path}`, {
        method,
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: body === undefined ? undefined : JSON.stringify(body),
      }).catch(() => null);
      const payload = response ? await response.json().catch(() => ({})) : {};
      return { ok: !!response?.ok, status: response?.status ?? 0, payload: payload as Record<string, unknown> };
    },
    [apiBase, token],
  );

  const refresh = useCallback(async () => {
    const result = await call("/v1/events");
    setEvents(result.ok ? ((result.payload.events as Ev[]) ?? []) : null);
  }, [call]);

  useEffect(() => {
    let live = true;
    (async () => {
      const result = await call("/v1/events");
      if (live) setEvents(result.ok ? ((result.payload.events as Ev[]) ?? []) : null);
    })();
    return () => {
      live = false;
    };
  }, [call]);

  if (events === null) return null;

  const fields = (data: FormData) => ({
    titleTh: data.get("titleTh"), titleEn: data.get("titleEn"), descriptionTh: data.get("descriptionTh"), descriptionEn: data.get("descriptionEn"),
    locationTh: data.get("locationTh"), locationEn: data.get("locationEn"), startsAt: toIso(data.get("startsAt")), endsAt: toIso(data.get("endsAt")),
  });
  const fail = (r: { payload: Record<string, unknown>; status: number }) => String(r.payload.message || r.payload.error || r.status);

  async function onSubmit(event: FormEvent<HTMLFormElement>, code?: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = fields(new FormData(form));
    const result = code ? await call(`/v1/events/${code}`, "PATCH", body) : await call("/v1/events", "POST", body);
    setError(result.ok ? "" : fail(result));
    if (result.ok) toast.success(copy.saved);
    else toast.error(`${FEEDBACK[locale].errorTitle}: ${fail(result)}`);
    if (result.ok) {
      if (!code) form.reset();
      await refresh();
    }
  }

  async function setStatus(code: string, status: string) {
    const result = await call(`/v1/events/${code}`, "PATCH", { status });
    setError(result.ok ? "" : fail(result));
    if (result.ok) toast.success(FEEDBACK[locale].statusChanged);
    else toast.error(`${FEEDBACK[locale].errorTitle}: ${fail(result)}`);
    await refresh();
  }

  // Going live, archiving and cancelling are the moves readers notice, so they ask first.
  function onStatusChange(code: string, status: string) {
    if (needsConfirm(status)) setPending({ code, status });
    else void setStatus(code, status);
  }

  const form = (ev?: Ev) => (
    <form className="mt-3 grid gap-3" onSubmit={(event) => void onSubmit(event, ev?.code)}>
      <label className="flex flex-col gap-1 text-sm font-medium">{copy.titleTh}<input className={FIELD} defaultValue={ev?.titleTh} maxLength={300} name="titleTh" required /></label>
      <label className="flex flex-col gap-1 text-sm font-medium">{copy.titleEn}<input className={FIELD} defaultValue={ev?.titleEn} maxLength={300} name="titleEn" required /></label>
      <label className="flex flex-col gap-1 text-sm font-medium">{copy.starts}<input className={FIELD} defaultValue={toLocal(ev?.startsAt ?? null)} name="startsAt" required type="datetime-local" /></label>
      <label className="flex flex-col gap-1 text-sm font-medium">{copy.ends}<input className={FIELD} defaultValue={toLocal(ev?.endsAt ?? null)} name="endsAt" type="datetime-local" /></label>
      <label className="flex flex-col gap-1 text-sm font-medium">{copy.locTh}<input className={FIELD} defaultValue={ev?.locationTh} maxLength={200} name="locationTh" /></label>
      <label className="flex flex-col gap-1 text-sm font-medium">{copy.locEn}<input className={FIELD} defaultValue={ev?.locationEn} maxLength={200} name="locationEn" /></label>
      <label className="flex flex-col gap-1 text-sm font-medium">{copy.descTh}<textarea className={FIELD} defaultValue={ev?.descriptionTh} maxLength={4000} name="descriptionTh" rows={3} /></label>
      <label className="flex flex-col gap-1 text-sm font-medium">{copy.descEn}<textarea className={FIELD} defaultValue={ev?.descriptionEn} maxLength={4000} name="descriptionEn" rows={3} /></label>
      <button className="h-11 rounded-md border px-4 text-sm font-medium" type="submit">{ev ? copy.save : copy.create}</button>
    </form>
  );

  return (
    <section aria-labelledby="events-desk" className="mt-8 rounded-lg border border-neutral-200 bg-white p-6">
      <h2 className="text-xl font-bold" id="events-desk">{copy.heading}</h2>
      <p className="mt-1 text-sm text-neutral-700">{copy.hint}</p>
      {form()}
      <DeskError locale={locale} message={error} />
      <ul className="mt-4 divide-y divide-neutral-200">
        {events.length === 0 ? <li className="py-2 text-sm text-neutral-600">{copy.none}</li> : null}
        {events.map((ev) => (
          <li className="flex flex-wrap items-start justify-between gap-3 py-3" key={ev.code}>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium">{locale === "th" ? ev.titleTh : ev.titleEn}</p>
              <p className="text-xs text-neutral-600">{ev.code} · {toLocal(ev.startsAt).replace("T", " ")}</p>
              <details className="mt-1">
                <summary className="cursor-pointer text-xs text-neutral-700">{copy.edit}</summary>
                {form(ev)}
              </details>
            </div>
            <label className="flex items-center gap-2 text-sm">
              {copy.status}
              <select className="h-10 rounded-md border border-neutral-300 px-2" onChange={(event) => onStatusChange(ev.code, event.target.value)} value={ev.status}>
                {Object.entries(copy.statuses).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
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
