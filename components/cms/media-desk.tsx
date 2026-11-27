"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { DeskError, FEEDBACK, StatusConfirm, needsConfirm, type ConfirmStatus } from "@/components/cms/desk-feedback";

// M15 media library desk: upload an image once, describe it in both languages, and let a publisher release it
// for reuse. Images only (png, jpeg, webp, up to 8 MB). Official documents are NOT kept here; they stay in
// SharePoint (ADR-0004). Drafts and archived images are seen only through the authenticated preview.
const COPY = {
  th: {
    heading: "คลังรูปภาพ (Media Library)",
    hint: "อัปโหลดรูปภาพ (png, jpeg, webp ไม่เกิน 8 MB) ใส่ชื่อและคำอธิบายภาพ 2 ภาษา ผู้เผยแพร่เป็นผู้ปล่อยให้ใช้งานสาธารณะ เอกสารทางการยังเก็บใน SharePoint",
    file: "ไฟล์รูปภาพ", titleTh: "ชื่อ (ไทย)", titleEn: "ชื่อ (อังกฤษ)", altTh: "คำอธิบายภาพสำหรับผู้อ่านหน้าจอ (ไทย)", altEn: "คำอธิบายภาพสำหรับผู้อ่านหน้าจอ (อังกฤษ)",
    captionTh: "คำบรรยาย (ไทย)", captionEn: "คำบรรยาย (อังกฤษ)", upload: "อัปโหลดเป็นฉบับร่าง", uploading: "กำลังอัปโหลด…", saved: "อัปโหลดแล้ว",
    status: "สถานะ", none: "ยังไม่มีรูปภาพ", edit: "แก้ไขรายละเอียด", save: "บันทึกรายละเอียด", publicUrl: "ลิงก์สาธารณะ", chooseFile: "เลือกไฟล์รูปภาพก่อน",
    tooLarge: "ไฟล์ใหญ่กว่า 8 MB", altNeeded: "ต้องมีคำอธิบายภาพทั้งสองภาษาก่อนเผยแพร่",
    statuses: { draft: "ฉบับร่าง", published: "เผยแพร่", archived: "เก็บถาวร" },
  },
  en: {
    heading: "Media library",
    hint: "Upload an image (png, jpeg, webp, up to 8 MB), give it a title and alt text in both languages. A publisher releases it for public use. Official documents stay in SharePoint.",
    file: "Image file", titleTh: "Title (Thai)", titleEn: "Title (English)", altTh: "Alt text for screen readers (Thai)", altEn: "Alt text for screen readers (English)",
    captionTh: "Caption (Thai)", captionEn: "Caption (English)", upload: "Upload as draft", uploading: "Uploading…", saved: "Uploaded",
    status: "Status", none: "No images yet", edit: "Edit details", save: "Save details", publicUrl: "Public link", chooseFile: "Choose an image file first",
    tooLarge: "The file is larger than 8 MB", altNeeded: "Alt text in both languages is required before publishing",
    statuses: { draft: "Draft", published: "Published", archived: "Archived" },
  },
} as const;

type Asset = {
  code: string; titleTh: string; titleEn: string; altTh: string; altEn: string; captionTh: string; captionEn: string;
  filename: string; mime: string; bytes: number; status: keyof (typeof COPY)["en"]["statuses"];
};
const FIELD = "w-full rounded-md border border-neutral-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";
const MAX_BYTES = 8 * 1024 * 1024;

function toBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

// Drafts need the bearer token, which an <img src> cannot send: fetch the bytes and show them from memory.
function Thumb({ apiBase, token, asset, alt }: { apiBase: string; token: string; asset: Asset; alt: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let live = true;
    let url = "";
    void fetch(`${apiBase}/v1/media-library/${asset.code}/${asset.filename}`, { headers: { authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (!blob || !live) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => {});
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [apiBase, token, asset.code, asset.filename]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img alt={alt} className="h-20 w-20 shrink-0 rounded-md border border-neutral-200 object-cover" height={80} src={src} width={80} /> : <div aria-hidden="true" className="h-20 w-20 shrink-0 rounded-md bg-neutral-100" />;
}

export function MediaDesk({ apiBase, token, locale }: { apiBase: string; token: string; locale: "th" | "en" }) {
  const copy = COPY[locale];
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
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
    const result = await call("/v1/media-library");
    setAssets(result.ok ? ((result.payload.assets as Asset[]) ?? []) : null);
  }, [call]);

  useEffect(() => {
    let live = true;
    (async () => {
      const result = await call("/v1/media-library");
      if (live) setAssets(result.ok ? ((result.payload.assets as Asset[]) ?? []) : null);
    })();
    return () => {
      live = false;
    };
  }, [call]);

  // A role without library access (a viewer) sees no panel at all.
  if (assets === null) return null;

  const fail = (r: { payload: Record<string, unknown>; status: number }) => {
    const text = String(r.payload.message || r.payload.error || r.status);
    setError(text);
    toast.error(`${FEEDBACK[locale].errorTitle}: ${text}`);
  };
  const fields = (data: FormData) => ({
    titleTh: data.get("titleTh"), titleEn: data.get("titleEn"), altTh: data.get("altTh"), altEn: data.get("altEn"),
    captionTh: data.get("captionTh"), captionEn: data.get("captionEn"),
  });

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) return fail({ payload: { message: copy.chooseFile }, status: 0 });
    if (file.size > MAX_BYTES) return fail({ payload: { message: copy.tooLarge }, status: 0 });
    setBusy(true);
    const result = await call("/v1/media-library", "POST", { ...fields(data), dataBase64: toBase64(await file.arrayBuffer()) });
    setBusy(false);
    if (result.ok) {
      setError("");
      toast.success(copy.saved);
      form.reset();
      await refresh();
    } else fail(result);
  }

  async function onSave(event: FormEvent<HTMLFormElement>, code: string) {
    event.preventDefault();
    const result = await call(`/v1/media-library/${code}`, "PATCH", fields(new FormData(event.currentTarget)));
    if (result.ok) {
      setError("");
      toast.success(FEEDBACK[locale].saved);
      await refresh();
    } else fail(result);
  }

  async function setStatus(code: string, status: string) {
    const result = await call(`/v1/media-library/${code}`, "PATCH", { status });
    if (result.ok) {
      setError("");
      toast.success(FEEDBACK[locale].statusChanged);
    } else fail(result);
    await refresh();
  }

  // Going live and archiving change what readers can fetch, so they ask first.
  function onStatusChange(code: string, status: string) {
    if (needsConfirm(status)) setPending({ code, status });
    else void setStatus(code, status);
  }

  return (
    <section aria-labelledby="media-desk" className="mt-8 rounded-lg border border-neutral-200 bg-white p-6">
      <h2 className="text-xl font-bold" id="media-desk">{copy.heading}</h2>
      <p className="mt-1 text-sm text-neutral-700">{copy.hint}</p>
      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={onUpload}>
        <label className="flex flex-col gap-1 text-sm font-medium md:col-span-2">{copy.file}<input accept="image/png,image/jpeg,image/webp" className={FIELD} name="file" required type="file" /></label>
        <label className="flex flex-col gap-1 text-sm font-medium">{copy.titleTh}<input className={FIELD} maxLength={200} name="titleTh" required /></label>
        <label className="flex flex-col gap-1 text-sm font-medium">{copy.titleEn}<input className={FIELD} maxLength={200} name="titleEn" required /></label>
        <label className="flex flex-col gap-1 text-sm font-medium">{copy.altTh}<input className={FIELD} maxLength={300} name="altTh" /></label>
        <label className="flex flex-col gap-1 text-sm font-medium">{copy.altEn}<input className={FIELD} maxLength={300} name="altEn" /></label>
        <label className="flex flex-col gap-1 text-sm font-medium">{copy.captionTh}<input className={FIELD} maxLength={500} name="captionTh" /></label>
        <label className="flex flex-col gap-1 text-sm font-medium">{copy.captionEn}<input className={FIELD} maxLength={500} name="captionEn" /></label>
        <button className="h-11 rounded-md border px-4 text-sm font-medium disabled:opacity-60 md:col-span-2" disabled={busy} type="submit">{busy ? copy.uploading : copy.upload}</button>
      </form>
      <DeskError locale={locale} message={error} />
      <ul className="mt-4 divide-y divide-neutral-200">
        {assets.length === 0 ? <li className="py-2 text-sm text-neutral-600">{copy.none}</li> : null}
        {assets.map((asset) => (
          <li className="flex flex-wrap items-start justify-between gap-3 py-3" key={asset.code}>
            <div className="flex min-w-0 flex-1 gap-3 text-sm">
              <Thumb alt={(locale === "th" ? asset.altTh : asset.altEn) || ""} apiBase={apiBase} asset={asset} token={token} />
              <div className="min-w-0">
                <p className="font-medium">{locale === "th" ? asset.titleTh : asset.titleEn}</p>
                <p className="text-xs text-neutral-600">{asset.code} · {asset.mime.replace("image/", "").toUpperCase()} · {Math.max(1, Math.round(asset.bytes / 1024))} KB</p>
                {asset.status === "published" ? <p className="break-all text-xs text-neutral-700">{copy.publicUrl}: <code>{`/cms-api/v1/public/media/${asset.code}/${asset.filename}`}</code></p> : null}
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs text-neutral-700">{copy.edit}</summary>
                  <form className="mt-2 grid gap-2" onSubmit={(event) => void onSave(event, asset.code)}>
                    <input aria-label={copy.titleTh} className={FIELD} defaultValue={asset.titleTh} maxLength={200} name="titleTh" required />
                    <input aria-label={copy.titleEn} className={FIELD} defaultValue={asset.titleEn} maxLength={200} name="titleEn" required />
                    <input aria-label={copy.altTh} className={FIELD} defaultValue={asset.altTh} maxLength={300} name="altTh" placeholder={copy.altTh} />
                    <input aria-label={copy.altEn} className={FIELD} defaultValue={asset.altEn} maxLength={300} name="altEn" placeholder={copy.altEn} />
                    <input aria-label={copy.captionTh} className={FIELD} defaultValue={asset.captionTh} maxLength={500} name="captionTh" placeholder={copy.captionTh} />
                    <input aria-label={copy.captionEn} className={FIELD} defaultValue={asset.captionEn} maxLength={500} name="captionEn" placeholder={copy.captionEn} />
                    <button className="h-10 rounded-md border px-4 text-sm" type="submit">{copy.save}</button>
                  </form>
                </details>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              {copy.status}
              <select className="h-10 rounded-md border border-neutral-300 px-2" onChange={(event) => onStatusChange(asset.code, event.target.value)} value={asset.status}>
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
