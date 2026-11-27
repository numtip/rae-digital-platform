"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { DeskError, FEEDBACK, StatusConfirm, needsConfirm, type ConfirmStatus } from "@/components/cms/desk-feedback";

// M04 desk: write FAQ entries (Thai + English), keep them as drafts, and let a publisher release,
// edit or archive them. The CMS decides who may do what; a refusal is shown as is.
const COPY = {
  th: {
    heading: "คำถามที่พบบ่อย (Knowledge / FAQ)",
    hint: "เขียนคำถาม–คำตอบสองภาษา เก็บเป็นฉบับร่างก่อน ผู้เผยแพร่เป็นผู้ปล่อยขึ้นหน้าเว็บ หน้าเว็บจะไม่แสดงส่วนนี้ถ้ายังไม่มีรายการที่เผยแพร่",
    topic: "หัวข้อ (ไม่บังคับ)", questionTh: "คำถาม (ไทย)", questionEn: "คำถาม (อังกฤษ)", answerTh: "คำตอบ (ไทย)", answerEn: "คำตอบ (อังกฤษ)", order: "ลำดับ",
    create: "บันทึกเป็นฉบับร่าง", saved: "บันทึกแล้ว", status: "สถานะ", none: "ยังไม่มีรายการ", edit: "แก้ไข", save: "บันทึกการแก้ไข",
    statuses: { draft: "ฉบับร่าง", published: "เผยแพร่", archived: "เก็บถาวร" },
  },
  en: {
    heading: "Knowledge / FAQ",
    hint: "Write question–answer pairs in both languages. They start as drafts; a publisher releases them. The public page hides this section until something is published.",
    topic: "Topic (optional)", questionTh: "Question (Thai)", questionEn: "Question (English)", answerTh: "Answer (Thai)", answerEn: "Answer (English)", order: "Order",
    create: "Save as draft", saved: "Saved", status: "Status", none: "No entries yet", edit: "Edit", save: "Save changes",
    statuses: { draft: "Draft", published: "Published", archived: "Archived" },
  },
} as const;

type Entry = { code: string; topic: string; questionTh: string; questionEn: string; answerTh: string; answerEn: string; sortOrder: number; status: keyof (typeof COPY)["en"]["statuses"] };
const FIELD = "w-full rounded-md border border-neutral-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

export function KnowledgeDesk({ apiBase, token, locale }: { apiBase: string; token: string; locale: "th" | "en" }) {
  const copy = COPY[locale];
  const [entries, setEntries] = useState<Entry[] | null>(null);
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
    const result = await call("/v1/knowledge");
    setEntries(result.ok ? ((result.payload.entries as Entry[]) ?? []) : null);
  }, [call]);

  useEffect(() => {
    let live = true;
    (async () => {
      const result = await call("/v1/knowledge");
      if (live) setEntries(result.ok ? ((result.payload.entries as Entry[]) ?? []) : null);
    })();
    return () => {
      live = false;
    };
  }, [call]);

  if (entries === null) return null;

  const fields = (data: FormData) => ({
    topic: data.get("topic"), questionTh: data.get("questionTh"), questionEn: data.get("questionEn"),
    answerTh: data.get("answerTh"), answerEn: data.get("answerEn"), sortOrder: Number(data.get("sortOrder") || 100),
  });
  const fail = (r: { payload: Record<string, unknown>; status: number }) => String(r.payload.message || r.payload.error || r.status);

  async function onSubmit(event: FormEvent<HTMLFormElement>, code?: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const result = code
      ? await call(`/v1/knowledge/${code}`, "PATCH", fields(new FormData(form)))
      : await call("/v1/knowledge", "POST", fields(new FormData(form)));
    setError(result.ok ? "" : fail(result));
    if (result.ok) toast.success(copy.saved);
    else toast.error(`${FEEDBACK[locale].errorTitle}: ${fail(result)}`);
    if (result.ok) {
      if (!code) form.reset();
      await refresh();
    }
  }

  async function setStatus(code: string, status: string) {
    const result = await call(`/v1/knowledge/${code}`, "PATCH", { status });
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

  const form = (entry?: Entry) => (
    <form className="mt-3 grid gap-3" onSubmit={(event) => void onSubmit(event, entry?.code)}>
      <label className="flex flex-col gap-1 text-sm font-medium">{copy.topic}<input className={FIELD} defaultValue={entry?.topic} maxLength={80} name="topic" /></label>
      <label className="flex flex-col gap-1 text-sm font-medium">{copy.questionTh}<input className={FIELD} defaultValue={entry?.questionTh} maxLength={300} name="questionTh" required /></label>
      <label className="flex flex-col gap-1 text-sm font-medium">{copy.questionEn}<input className={FIELD} defaultValue={entry?.questionEn} maxLength={300} name="questionEn" required /></label>
      <label className="flex flex-col gap-1 text-sm font-medium">{copy.answerTh}<textarea className={FIELD} defaultValue={entry?.answerTh} maxLength={4000} name="answerTh" required rows={4} /></label>
      <label className="flex flex-col gap-1 text-sm font-medium">{copy.answerEn}<textarea className={FIELD} defaultValue={entry?.answerEn} maxLength={4000} name="answerEn" required rows={4} /></label>
      <label className="flex flex-col gap-1 text-sm font-medium">{copy.order}<input className={FIELD} defaultValue={entry?.sortOrder ?? 100} max={100000} min={0} name="sortOrder" type="number" /></label>
      <button className="h-11 rounded-md border px-4 text-sm font-medium" type="submit">{entry ? copy.save : copy.create}</button>
    </form>
  );

  return (
    <section aria-labelledby="knowledge-desk" className="mt-8 rounded-lg border border-neutral-200 bg-white p-6">
      <h2 className="text-xl font-bold" id="knowledge-desk">{copy.heading}</h2>
      <p className="mt-1 text-sm text-neutral-700">{copy.hint}</p>
      {form()}
      <DeskError locale={locale} message={error} />
      <ul className="mt-4 divide-y divide-neutral-200">
        {entries.length === 0 ? <li className="py-2 text-sm text-neutral-600">{copy.none}</li> : null}
        {entries.map((entry) => (
          <li className="flex flex-wrap items-start justify-between gap-3 py-3" key={entry.code}>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium">{locale === "th" ? entry.questionTh : entry.questionEn}</p>
              <p className="text-xs text-neutral-600">{entry.code}{entry.topic ? ` · ${entry.topic}` : ""}</p>
              <details className="mt-1">
                <summary className="cursor-pointer text-xs text-neutral-700">{copy.edit}</summary>
                {form(entry)}
              </details>
            </div>
            <label className="flex items-center gap-2 text-sm">
              {copy.status}
              <select className="h-10 rounded-md border border-neutral-300 px-2" onChange={(event) => onStatusChange(entry.code, event.target.value)} value={entry.status}>
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
