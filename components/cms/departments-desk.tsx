"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

// M13 desk: the organisation tree. Units are archived, never deleted. Publishing is a publisher's decision.
const COPY = {
  th: { heading: "โครงสร้างหน่วยงาน (Departments)", hint: "จัดเป็นโครงสร้างแม่–ลูก (ลึกได้ 4 ระดับ) หน่วยที่เก็บถาวรจะไม่ถูกลบ ผู้เผยแพร่เป็นผู้ปล่อยขึ้นหน้า “เกี่ยวกับหน่วยงาน”",
    parent: "หน่วยงานแม่", none: "(ระดับบนสุด)", nameTh: "ชื่อ (ไทย)", nameEn: "ชื่อ (อังกฤษ)", descTh: "คำอธิบาย (ไทย)", descEn: "คำอธิบาย (อังกฤษ)", order: "ลำดับ",
    create: "บันทึกเป็นฉบับร่าง", saved: "บันทึกแล้ว", status: "สถานะ", empty: "ยังไม่มีหน่วยงาน", edit: "แก้ไข", save: "บันทึกการแก้ไข", statuses: { draft: "ฉบับร่าง", published: "เผยแพร่", archived: "เก็บถาวร" } },
  en: { heading: "Organisation structure (Departments)", hint: "A parent/child tree (up to 4 levels). Units are archived, never deleted. A publisher releases them to the About page.",
    parent: "Parent unit", none: "(top level)", nameTh: "Name (Thai)", nameEn: "Name (English)", descTh: "Description (Thai)", descEn: "Description (English)", order: "Order",
    create: "Save as draft", saved: "Saved", status: "Status", empty: "No units yet", edit: "Edit", save: "Save changes", statuses: { draft: "Draft", published: "Published", archived: "Archived" } },
} as const;

type Dp = { code: string; parentCode: string | null; nameTh: string; nameEn: string; descriptionTh: string; descriptionEn: string; sortOrder: number; status: keyof (typeof COPY)["en"]["statuses"] };
const FIELD = "w-full rounded-md border border-neutral-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

export function DepartmentsDesk({ apiBase, token, locale }: { apiBase: string; token: string; locale: "th" | "en" }) {
  const copy = COPY[locale];
  const [items, setItems] = useState<Dp[] | null>(null);
  const [message, setMessage] = useState("");
  const call = useCallback(
    async (path: string, method = "GET", body?: unknown) => {
      const response = await fetch(`${apiBase}${path}`, { method, headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: body === undefined ? undefined : JSON.stringify(body) }).catch(() => null);
      const payload = response ? await response.json().catch(() => ({})) : {};
      return { ok: !!response?.ok, status: response?.status ?? 0, payload: payload as Record<string, unknown> };
    },
    [apiBase, token],
  );
  const refresh = useCallback(async () => {
    const r = await call("/v1/departments");
    setItems(r.ok ? ((r.payload.departments as Dp[]) ?? []) : null);
  }, [call]);
  useEffect(() => {
    let live = true;
    void call("/v1/departments").then((r) => live && setItems(r.ok ? ((r.payload.departments as Dp[]) ?? []) : null));
    return () => {
      live = false;
    };
  }, [call]);
  if (items === null) return null;

  const name = (d: Dp) => (locale === "th" ? d.nameTh : d.nameEn);
  const fields = (d: FormData) => ({ parentCode: d.get("parentCode") || null, nameTh: d.get("nameTh"), nameEn: d.get("nameEn"), descriptionTh: d.get("descriptionTh"), descriptionEn: d.get("descriptionEn"), sortOrder: Number(d.get("sortOrder") || 100) });
  const fail = (r: { payload: Record<string, unknown>; status: number }) => String(r.payload.message || r.payload.error || r.status);

  async function onSubmit(event: FormEvent<HTMLFormElement>, code?: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = fields(new FormData(form));
    const r = code ? await call(`/v1/departments/${code}`, "PATCH", body) : await call("/v1/departments", "POST", body);
    setMessage(r.ok ? copy.saved : fail(r));
    if (r.ok) {
      if (!code) form.reset();
      await refresh();
    }
  }
  async function setStatus(code: string, status: string) {
    const r = await call(`/v1/departments/${code}`, "PATCH", { status });
    setMessage(r.ok ? "" : fail(r));
    await refresh();
  }

  const form = (d?: Dp) => (
    <form className="mt-3 grid gap-3" onSubmit={(event) => void onSubmit(event, d?.code)}>
      <label className="flex flex-col gap-1 text-sm font-medium">{copy.parent}
        <select className={FIELD} defaultValue={d?.parentCode ?? ""} name="parentCode">
          <option value="">{copy.none}</option>
          {items.filter((o) => o.code !== d?.code && o.status !== "archived").map((o) => <option key={o.code} value={o.code}>{name(o)} ({o.code})</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">{copy.nameTh}<input className={FIELD} defaultValue={d?.nameTh} maxLength={200} name="nameTh" required /></label>
      <label className="flex flex-col gap-1 text-sm font-medium">{copy.nameEn}<input className={FIELD} defaultValue={d?.nameEn} maxLength={200} name="nameEn" required /></label>
      <label className="flex flex-col gap-1 text-sm font-medium">{copy.descTh}<textarea className={FIELD} defaultValue={d?.descriptionTh} maxLength={1000} name="descriptionTh" rows={2} /></label>
      <label className="flex flex-col gap-1 text-sm font-medium">{copy.descEn}<textarea className={FIELD} defaultValue={d?.descriptionEn} maxLength={1000} name="descriptionEn" rows={2} /></label>
      <label className="flex flex-col gap-1 text-sm font-medium">{copy.order}<input className={FIELD} defaultValue={d?.sortOrder ?? 100} max={100000} min={0} name="sortOrder" type="number" /></label>
      <button className="h-11 rounded-md border px-4 text-sm font-medium" type="submit">{d ? copy.save : copy.create}</button>
    </form>
  );

  return (
    <section aria-labelledby="departments-desk" className="mt-8 rounded-lg border border-neutral-200 bg-white p-6">
      <h2 className="text-xl font-bold" id="departments-desk">{copy.heading}</h2>
      <p className="mt-1 text-sm text-neutral-700">{copy.hint}</p>
      {form()}
      <p className="mt-2 text-sm" role="status">{message}</p>
      <ul className="mt-4 divide-y divide-neutral-200">
        {items.length === 0 ? <li className="py-2 text-sm text-neutral-600">{copy.empty}</li> : null}
        {items.map((d) => (
          <li className="flex flex-wrap items-start justify-between gap-3 py-3" key={d.code}>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium">{name(d)}</p>
              <p className="text-xs text-neutral-600">{d.code}{d.parentCode ? ` ↳ ${d.parentCode}` : ""}</p>
              <details className="mt-1"><summary className="cursor-pointer text-xs text-neutral-700">{copy.edit}</summary>{form(d)}</details>
            </div>
            <label className="flex items-center gap-2 text-sm">{copy.status}
              <select className="h-10 rounded-md border border-neutral-300 px-2" onChange={(event) => void setStatus(d.code, event.target.value)} value={d.status}>
                {Object.entries(copy.statuses).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
