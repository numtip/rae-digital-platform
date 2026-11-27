"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// M03 registry desk: register a link to a file that already lives in Microsoft 365 (ADR-0004),
// see the register, and move a record between draft / current / obsolete / archived. The CMS decides
// who may do what (officers draft; going live is a publisher's decision); a refusal is shown as is.
const COPY = {
  th: {
    heading: "ทะเบียนเอกสาร (Document Center)",
    hint: "วางลิงก์ไฟล์ SharePoint ของมหาวิทยาลัย ระบบไม่เก็บสำเนาไฟล์",
    category: "หมวด", titleTh: "ชื่อเอกสาร (ไทย)", titleEn: "ชื่อเอกสาร (อังกฤษ)", version: "ฉบับ", url: "ลิงก์ไฟล์ SharePoint", note: "หมายเหตุ",
    register: "ลงทะเบียนเป็นฉบับร่าง", saved: "ลงทะเบียนแล้ว", newVersion: "ไฟล์ฉบับใหม่", changeNote: "สิ่งที่เปลี่ยน", saveVersion: "บันทึกฉบับใหม่", checkLinks: "ตรวจลิงก์ทั้งหมดตอนนี้", checking: "กำลังตรวจลิงก์ในเบื้องหลัง ผลจะแสดงในรายการภายในไม่กี่นาที", link: { ok: "ลิงก์ใช้ได้", broken: "ลิงก์เสีย", unreachable: "ตรวจไม่ได้ (ลองใหม่)" }, unchecked: "ยังไม่ตรวจ", status: "สถานะ", none: "ยังไม่มีเอกสาร", opens: "เปิดแล้ว",
    errorTitle: "ทำรายการไม่สำเร็จ", statusChanged: "เปลี่ยนสถานะแล้ว", versionSaved: "บันทึกไฟล์ฉบับใหม่แล้ว", cancelBtn: "คงไว้ตามเดิม",
    confirmPublishTitle: "เผยแพร่เอกสารนี้?", confirmPublishBody: "เอกสารจะแสดงบนเว็บไซต์สาธารณะทันที", confirmPublishAction: "เผยแพร่",
    confirmObsoleteTitle: "ยกเลิกใช้เอกสารนี้?", confirmObsoleteBody: "เอกสารจะถูกทำเครื่องหมายว่ายกเลิกใช้ และผู้อ่านจะเห็นว่าไม่ใช้งานแล้ว", confirmObsoleteAction: "ยกเลิกใช้เอกสาร",
    cats: { administration: "บริหารจัดการ", research: "งานวิจัย", "academic-services": "งานบริการวิชาการ" },
    statuses: { draft: "ฉบับร่าง", current: "ใช้งานอยู่ (เผยแพร่)", obsolete: "ยกเลิกใช้", archived: "เก็บถาวร" },
  },
  en: {
    heading: "Document register (Document Center)",
    hint: "Paste the university SharePoint file link. The site keeps no copy of the file.",
    category: "Category", titleTh: "Title (Thai)", titleEn: "Title (English)", version: "Version", url: "SharePoint file link", note: "Note",
    register: "Register as draft", saved: "Registered", newVersion: "New file version", changeNote: "What changed", saveVersion: "Save new version", checkLinks: "Check all links now", checking: "Checking links in the background; results appear in the list within a few minutes.", link: { ok: "Link OK", broken: "Link broken", unreachable: "Could not check (retry)" }, unchecked: "Not checked yet", status: "Status", none: "No documents yet", opens: "Opened",
    errorTitle: "Could not complete the action", statusChanged: "Status changed", versionSaved: "New file version saved", cancelBtn: "Keep as is",
    confirmPublishTitle: "Publish this document?", confirmPublishBody: "The document goes live on the public website right away.", confirmPublishAction: "Publish",
    confirmObsoleteTitle: "Mark this document obsolete?", confirmObsoleteBody: "The document will be marked as no longer in use, and readers will see that.", confirmObsoleteAction: "Mark obsolete",
    cats: { administration: "Administration", research: "Research", "academic-services": "Academic services" },
    statuses: { draft: "Draft", current: "Current (published)", obsolete: "Obsolete", archived: "Archived" },
  },
} as const;

type Doc = { code: string; category: string; titleTh: string; titleEn: string; version: string; status: keyof (typeof COPY)["en"]["statuses"]; docType: string; downloadCount: number; linkStatus?: "ok" | "broken" | "unreachable" | null };
const FIELD = "h-11 w-full rounded-md border border-neutral-300 px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

export function DocumentsDesk({ apiBase, token, locale }: { apiBase: string; token: string; locale: "th" | "en" }) {
  const copy = COPY[locale];
  const [docs, setDocs] = useState<Doc[] | null>(null);
  // `error` is the persistent inline failure (cleared on the next action); `message` is a neutral note.
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<{ code: string; status: "current" | "obsolete" } | null>(null);

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

  function fail(payload: Record<string, unknown>, status: number) {
    const text = String(payload.message || payload.error || status);
    setError(text);
    toast.error(`${copy.errorTitle}: ${text}`);
  }

  async function onRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const result = await call("/v1/documents", "POST", {
      category: data.get("category"), titleTh: data.get("titleTh"), titleEn: data.get("titleEn"),
      version: data.get("version") || "1.0", storageUrl: data.get("storageUrl"), note: data.get("note"),
    });
    setError("");
    if (result.ok) {
      toast.success(copy.saved);
      form.reset();
      await refresh();
    } else fail(result.payload, result.status);
  }

  async function setStatus(code: string, status: string) {
    const result = await call(`/v1/documents/${code}`, "PATCH", { status });
    setError("");
    if (result.ok) toast.success(copy.statusChanged);
    else fail(result.payload, result.status);
    await refresh();
  }

  // Going live and retiring a document are the two moves readers notice, so they ask first.
  function onStatusChange(code: string, status: string) {
    if (status === "current" || status === "obsolete") setPending({ code, status });
    else void setStatus(code, status);
  }

  async function onNewVersion(event: FormEvent<HTMLFormElement>, code: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const result = await call(`/v1/documents/${code}`, "PATCH", { storageUrl: data.get("storageUrl"), version: data.get("version"), changeNote: data.get("changeNote") });
    setError("");
    if (result.ok) {
      toast.success(copy.versionSaved);
      form.reset();
      await refresh();
    } else fail(result.payload, result.status);
  }

  async function onCheckLinks() {
    const result = await call("/v1/documents/check-links", "POST");
    setError("");
    if (result.ok) {
      setMessage(copy.checking);
      toast.info(copy.checking);
    } else fail(result.payload, result.status);
    // The pass runs on the server; look again shortly, and once more after a longer wait.
    setTimeout(() => void refresh(), 5000);
    setTimeout(() => void refresh(), 30000);
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
      <button className="mt-3 h-10 rounded-md border px-4 text-sm" onClick={() => void onCheckLinks()} type="button">{copy.checkLinks}</button>
      <p className="mt-2 text-sm" role="status">{message}</p>
      {error ? (
        <Alert className="mt-2" variant="destructive">
          <AlertTitle>{copy.errorTitle}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <ul className="mt-4 divide-y divide-neutral-200">
        {docs.length === 0 ? <li className="py-2 text-sm text-neutral-600">{copy.none}</li> : null}
        {docs.map((doc) => (
          <li className="flex flex-wrap items-center justify-between gap-3 py-3" key={doc.code}>
            <div className="min-w-0 text-sm">
              <p className="font-medium">{locale === "th" ? doc.titleTh : doc.titleEn}</p>
              <p className="text-xs text-neutral-600">{doc.code} · {doc.docType.toUpperCase()} · v{doc.version} · {copy.opens} {doc.downloadCount} · {doc.linkStatus ? copy.link[doc.linkStatus] : copy.unchecked}</p>
              <details className="mt-1">
                <summary className="cursor-pointer text-xs text-neutral-700">{copy.newVersion}</summary>
                <form className="mt-2 grid gap-2" onSubmit={(event) => void onNewVersion(event, doc.code)}>
                  <input className={FIELD} name="storageUrl" placeholder="https://maejo365-my.sharepoint.com/…" required type="url" />
                  <input className={FIELD} name="version" placeholder={copy.version} required />
                  <input className={FIELD} name="changeNote" placeholder={copy.changeNote} />
                  <button className="h-10 rounded-md border px-4 text-sm" type="submit">{copy.saveVersion}</button>
                </form>
              </details>
            </div>
            <label className="flex items-center gap-2 text-sm">
              {copy.status}
              <select className="h-10 rounded-md border border-neutral-300 px-2" onChange={(event) => onStatusChange(doc.code, event.target.value)} value={doc.status}>
                {Object.entries(copy.statuses).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </li>
        ))}
      </ul>
      <AlertDialog onOpenChange={(open) => { if (!open) setPending(null); }} open={pending !== null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.status === "obsolete" ? copy.confirmObsoleteTitle : copy.confirmPublishTitle}</AlertDialogTitle>
            <AlertDialogDescription>{pending?.status === "obsolete" ? copy.confirmObsoleteBody : copy.confirmPublishBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.cancelBtn}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (pending) void setStatus(pending.code, pending.status); }}>
              {pending?.status === "obsolete" ? copy.confirmObsoleteAction : copy.confirmPublishAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
