"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { DeskError, FEEDBACK } from "@/components/cms/desk-feedback";

// Add a released library image (M15) to the open news draft. The runtime copies the bytes into the article's own
// gallery, so the article is unaffected if the library entry is archived later.
const COPY = {
  th: { heading: "เพิ่มรูปจากคลังรูปภาพ", hint: "เลือกรูปที่ผู้เผยแพร่ปล่อยแล้ว ระบบคัดลอกเข้าแกลเลอรีของข่าวนี้ (ไม่เกิน 5 รูป)", pick: "รูปในคลัง", add: "เพิ่มเข้าข่าวนี้", none: "ยังไม่มีรูปที่เผยแพร่ในคลัง", added: "เพิ่มรูปแล้ว" },
  en: { heading: "Add an image from the library", hint: "Pick an image a publisher has released. It is copied into this story's own gallery (5 images at most).", pick: "Library image", add: "Add to this story", none: "No published images in the library yet", added: "Image added" },
} as const;

type LibraryAsset = { code: string; titleTh: string; titleEn: string; status: string };

export function NewsLibraryPicker({ apiBase, token, locale, articleId, onAdded }: { apiBase: string; token: string; locale: "th" | "en"; articleId: string; onAdded: () => void | Promise<void> }) {
  const copy = COPY[locale];
  const [assets, setAssets] = useState<LibraryAsset[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    void fetch(`${apiBase}/v1/media-library`, { headers: { authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { assets?: LibraryAsset[] } | null) => live && setAssets(body ? (body.assets ?? []).filter((a) => a.status === "published") : null))
      .catch(() => live && setAssets(null));
    return () => {
      live = false;
    };
  }, [apiBase, token]);

  // A role without library access sees nothing; the rest of the news desk is unchanged.
  if (assets === null) return null;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "");
    if (!code) return;
    const response = await fetch(`${apiBase}/v1/news/${articleId}/media/from-library`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ code }),
    }).catch(() => null);
    if (response?.ok) {
      setError("");
      toast.success(copy.added);
      await onAdded();
      return;
    }
    const payload = response ? ((await response.json().catch(() => ({}))) as { message?: string; error?: string }) : {};
    const text = String(payload.message || payload.error || response?.status || "network");
    setError(text);
    toast.error(`${FEEDBACK[locale].errorTitle}: ${text}`);
  }

  return (
    <form className="grid gap-3 rounded-md border border-neutral-200 p-4" onSubmit={onSubmit}>
      <h3 className="text-sm font-bold">{copy.heading}</h3>
      <p className="text-xs text-neutral-600">{copy.hint}</p>
      {assets.length === 0 ? (
        <p className="text-sm text-neutral-600">{copy.none}</p>
      ) : (
        <>
          <label className="flex flex-col gap-1 text-sm font-medium">
            {copy.pick}
            <select className="h-11 w-full rounded-md border border-neutral-300 px-3" name="code" required>
              {assets.map((a) => (
                <option key={a.code} value={a.code}>{`${a.code} · ${locale === "th" ? a.titleTh : a.titleEn}`}</option>
              ))}
            </select>
          </label>
          <button className="h-11 rounded-md border px-4 text-sm" type="submit">{copy.add}</button>
        </>
      )}
      <DeskError locale={locale} message={error} />
    </form>
  );
}
