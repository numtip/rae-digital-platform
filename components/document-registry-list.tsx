"use client";

import { useState } from "react";
import { asset } from "@/lib/assets";
import type { PublicDocument } from "@/lib/cms/documents-live";

// The registry's records for one place on the page. Files stay in Microsoft 365 (ADR-0004): every
// link goes through the counted open route, which records one download and sends the reader on.
const COPY = {
  th: { heading: "ทะเบียนเอกสาร", open: "เปิดเอกสาร", version: "ฉบับ", updated: "ปรับปรุง", opens: "เปิดแล้ว", times: "ครั้ง", pages: "หน้าของทะเบียนเอกสาร", prev: "ก่อนหน้า", next: "ถัดไป", page: "หน้า", items: "รายการ" },
  en: { heading: "Document register", open: "Open", version: "Version", updated: "Updated", opens: "Opened", times: "times", pages: "Document register pages", prev: "Previous", next: "Next", page: "Page", items: "items" },
} as const;

export const REGISTRY_PAGE_SIZE = 50;

export function DocumentRegistryList({ locale, documents }: { locale: "th" | "en"; documents: PublicDocument[] }) {
  const [page, setPage] = useState(0);
  if (documents.length === 0) return null;
  const copy = COPY[locale];
  const pages = Math.ceil(documents.length / REGISTRY_PAGE_SIZE);
  const shown = documents.slice(page * REGISTRY_PAGE_SIZE, (page + 1) * REGISTRY_PAGE_SIZE);
  const date = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", { dateStyle: "medium", timeZone: "Asia/Bangkok" });
  return (
    <section aria-label={copy.heading} className="mt-8">
      <h2 className="text-lg font-bold text-brand-600">{copy.heading}</h2>
      <ul className="mt-3 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {shown.map((doc) => (
          <li className="flex flex-wrap items-center justify-between gap-3 p-4" key={doc.code}>
            <div className="min-w-0">
              <a
                className="font-medium text-neutral-900 underline underline-offset-2 hover:text-brand-600"
                href={asset(`/api/documents/${doc.code}/open`)}
                rel="noreferrer noopener"
                target="_blank"
              >
                {locale === "th" ? doc.titleTh : doc.titleEn}
              </a>
              <p className="mt-1 text-xs text-neutral-600">
                {doc.code} · {doc.fileType.toUpperCase()} · {copy.version} {doc.version} · {copy.updated} {date.format(new Date(doc.updatedAt))} · {copy.opens} {doc.downloadCount} {copy.times}
              </p>
              {doc.note ? <p className="mt-1 text-sm text-neutral-700">{doc.note}</p> : null}
            </div>
          </li>
        ))}
      </ul>
      {pages > 1 ? (
        <nav aria-label={copy.pages} className="mt-4 flex items-center justify-between text-sm">
          <button className="h-10 rounded-md border px-4 disabled:opacity-50" disabled={page === 0} onClick={() => setPage(page - 1)} type="button">{copy.prev}</button>
          <span>{copy.page} {page + 1} / {pages} · {documents.length} {copy.items}</span>
          <button className="h-10 rounded-md border px-4 disabled:opacity-50" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} type="button">{copy.next}</button>
        </nav>
      ) : null}
    </section>
  );
}
