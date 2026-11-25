"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

// M03 registry desk: register a link to a file that already lives in Microsoft 365 (ADR-0004),
// see the register, and move a record between draft / current / obsolete / archived. The CMS decides
// who may do what (officers draft; going live is a publisher's decision); a refusal is shown as is.
const COPY = {
  th: {
    heading: "ทะเบียนเอกสาร (Document Center)",
    hint: "วางลิงก์ไฟล์ SharePoint ของมหาวิทยาลัย ระบบไม่เก็บสำเนาไฟล์",
    category: "หมวด", titleTh: "ชื่อเอกสาร (ไทย)", titleEn: "ชื่อเอกสาร (อังกฤษ)", version: "ฉบับ", url: "ลิงก์ไฟล์ SharePoint", note: "หมายเหตุ",
    register: "ลงทะเบียนเป็นฉบับร่าง", saved: "ลงทะเบียนแล้ว", status: "สถานะ", none: "ยังไม่มีเอกสาร", opens: "เปิดแล้ว",
    cats: { administration: "บริหารจัดการ", research: "งานวิจัย", "academic-services": "งานบริการวิชาการ" },
    statuses: { draft: "ฉบับร่าง", current: "ใช้งานอยู่ (เผยแพร่)", obsolete: "ยกเลิกใช้", archived: "เก็บถาวร" },
  },
  en: {
    heading: "Document register (Document Center)",
    hint: "Paste the university SharePoint file link. The site keeps no copy of the file.",
    category: "Category", titleTh: "Title (Thai)", titleEn: "Title (English)", version: "Version", url: "SharePoint file link", note: "Note",
    register: "Register as draft", saved: "Registered", status: "Status", none: "No documents yet", opens: "Opened",
    cats: { administration: "Administration", research: "Research", "academic-services": "Academic services" },
    statuses: { draft: "Draft", current: "Current (published)", obsolete: "Obsolete", archived: "Archived" },
  },
} as const;

type Doc = { code: string; category: string; titleTh: string; titleEn: string; version: string; status: keyof (typeof COPY)["en"]["statuses"]; docType: string; downloadCount: number };
const FIELD = "h-11 w-full rounded-md border border-neutral-300 px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

export function DocumentsDesk({ apiBase, token, locale }: { apiBase: string; token: string; locale: "th" | "en" }) {
  const copy = COPY[locale];
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [message, setMessage] = useState("");

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
    const result = await call("/v1/documents");
    setDocs(result.ok ? ((result.payload.documents as Doc[]) ?? []) : null);
  }, [call]);

  useEffect(() => {
    let live = true;
    (async () => {
      const result = await call("/v1/documents");
      if (live) setDocs(result.ok ? ((result.payload.documents as Doc[]) ?? []) : null);
    })();
    return () => {
      live = false;
    };
  }, [call]);

  // A role without document access (a viewer) sees no panel at all.
  if (docs === null) return null;

  async function onRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const result = await call("/v1/documents", "POST", {
      category: data.get("category"), titleTh: data.get("titleTh"), titleEn: data.get("titleEn"),
      version: data.get("version") || "1.0", storageUrl: data.get("storageUrl"), note: data.get("note"),
    });
    setMessage(result.ok ? copy.saved : String(result.payload.message || result.payload.error || result.status));
    if (result.ok) {
      form.reset();
      await refresh();
    }
  }

  async function setStatus(code: string, status: string) {
    const result = await call(`/v1/documents/${code}`, "PATCH", { status });
    setMessage(result.ok ? "" : String(result.payload.message || result.payload.error || result.status));
    await refresh();
  }

  return (
    <section aria-labelledby="documents-desk" className="mt-8 rounded-lg border border-neutral-200 bg-white p-6">
      <h2 className="text-xl font-bold" id="documents-desk">{copy.heading}</h2>
      <p className="mt-1 text-sm text-neutral-700">{copy.hint}</p>
      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={onRegister}>
        <label className="flex flex-col gap-1 text-sm font-medium">
          {copy.category}
          <select className={FIELD} name="category" required>
            {Object.entries(copy.cats).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">{copy.version}<input className={FIELD} defaultValue="1.0" name="version" /></label>
        <label className="flex flex-col gap-1 text-sm font-medium">{copy.titleTh}<input className={FIELD} name="titleTh" required /></label>
        <label className="flex flex-col gap-1 text-sm font-medium">{copy.titleEn}<input className={FIELD} name="titleEn" required /></label>
        <label className="flex flex-col gap-1 text-sm font-medium md:col-span-2">{copy.url}<input className={FIELD} name="storageUrl" placeholder="https://maejo365-my.sharepoint.com/…" required type="url" /></label>
        <label className="flex flex-col gap-1 text-sm font-medium md:col-span-2">{copy.note}<input className={FIELD} name="note" /></label>
        <button className="h-11 rounded-md border px-4 text-sm font-medium md:col-span-2" type="submit">{copy.register}</button>
      </form>
      <p className="mt-2 text-sm" role="status">{message}</p>
      <ul className="mt-4 divide-y divide-neutral-200">
        {docs.length === 0 ? <li className="py-2 text-sm text-neutral-600">{copy.none}</li> : null}
        {docs.map((doc) => (
          <li className="flex flex-wrap items-center justify-between gap-3 py-3" key={doc.code}>
            <div className="min-w-0 text-sm">
              <p className="font-medium">{locale === "th" ? doc.titleTh : doc.titleEn}</p>
              <p className="text-xs text-neutral-600">{doc.code} · {doc.docType.toUpperCase()} · v{doc.version} · {copy.opens} {doc.downloadCount}</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              {copy.status}
              <select className="h-10 rounded-md border border-neutral-300 px-2" onChange={(event) => void setStatus(doc.code, event.target.value)} value={doc.status}>
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
