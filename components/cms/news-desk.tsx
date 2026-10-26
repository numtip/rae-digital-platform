"use client";

import { useState, type FormEvent } from "react";
import { adminCopy } from "@/lib/cms/admin-copy";
import { ContentValidationError, assertBilingual } from "@/lib/cms/validation";

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

export function NewsDesk({ locale }: { locale: "th" | "en" }) {
  const copy = adminCopy[locale];
  const [message, setMessage] = useState<string>(copy.empty);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      assertBilingual({
        titleTh: String(data.get("titleTh") ?? ""),
        titleEn: String(data.get("titleEn") ?? ""),
        source: String(data.get("source") ?? ""),
      });
      setMessage(copy.ok);
    } catch (error) {
      const text = error instanceof ContentValidationError ? error.message : "invalid";
      setMessage(text);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <label className="grid gap-1 text-sm font-medium text-neutral-800" htmlFor="titleTh">
        {copy.titleTh}
        <input autoComplete="off" className={`min-h-11 rounded-md border border-neutral-300 px-3 ${FOCUS}`} id="titleTh" name="titleTh" />
      </label>
      <label className="grid gap-1 text-sm font-medium text-neutral-800" htmlFor="titleEn">
        {copy.titleEn}
        <input autoComplete="off" className={`min-h-11 rounded-md border border-neutral-300 px-3 ${FOCUS}`} id="titleEn" name="titleEn" />
      </label>
      <label className="grid gap-1 text-sm font-medium text-neutral-800" htmlFor="source">
        {copy.source}
        <input autoComplete="off" className={`min-h-11 rounded-md border border-neutral-300 px-3 ${FOCUS}`} id="source" name="source" type="url" />
      </label>
      <button className={`min-h-11 rounded-md bg-brand-600 px-4 text-sm font-medium text-white ${FOCUS}`} type="submit">
        {copy.check}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
