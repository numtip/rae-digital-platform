"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Props = { code: string; title: string; body: string; link: string; endsAt: string; locale: "th" | "en" };
const COPY = {
  th: { dismiss: "ปิดประกาศ", more: "ดูรายละเอียด", pause: "หยุดข้อความเลื่อน", play: "เลื่อนข้อความต่อ", region: "ประกาศ" },
  en: { dismiss: "Dismiss announcement", more: "Read more", pause: "Pause scrolling text", play: "Resume scrolling text", region: "Announcement" },
} as const;
const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

// An announcement is expired the moment its end passes, even on a page rendered a few seconds earlier.
const expired = (endsAt: string) => Date.parse(endsAt) <= Date.now();
const isInternal = (link: string) => link.startsWith("/");

function More({ link, locale, className }: { link: string; locale: "th" | "en"; className: string }) {
  if (!link) return null;
  return isInternal(link) ? (
    <Link className={className} href={link}>{COPY[locale].more}</Link>
  ) : (
    <a className={className} href={link} rel="noopener noreferrer">{COPY[locale].more}</a>
  );
}

export function AnnouncementBanner({ title, body, link, endsAt, locale }: Props) {
  const [hidden, setHidden] = useState(false);
  const [late, setLate] = useState(() => expired(endsAt));
  useEffect(() => {
    const ms = Date.parse(endsAt) - Date.now();
    if (ms <= 0) return;
    const t = setTimeout(() => setLate(true), Math.min(ms, 2 ** 31 - 1));
    return () => clearTimeout(t);
  }, [endsAt]);
  if (hidden || late) return null;
  return (
    <section aria-label={`${COPY[locale].region}: ${title}`} className="border-b border-brand-700 bg-brand-700 text-white">
      <div className="mx-auto flex w-full max-w-7xl items-start gap-3 px-4 py-2 text-sm">
        <p className="flex-1">
          <strong>{title}</strong>
          {body ? <> — {body}</> : null} <More className={`font-medium underline underline-offset-2 ${FOCUS}`} link={link} locale={locale} />
        </p>
        <button aria-label={COPY[locale].dismiss} className={`min-h-8 min-w-8 rounded px-2 text-lg leading-none hover:bg-white/20 ${FOCUS}`} onClick={() => setHidden(true)} type="button">
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </section>
  );
}

export function AnnouncementTicker({ title, body, link, endsAt, locale }: Props) {
  const [paused, setPaused] = useState(false);
  const [late, setLate] = useState(() => expired(endsAt));
  useEffect(() => {
    const ms = Date.parse(endsAt) - Date.now();
    if (ms <= 0) return;
    const t = setTimeout(() => setLate(true), Math.min(ms, 2 ** 31 - 1));
    return () => clearTimeout(t);
  }, [endsAt]);
  if (late) return null;
  return (
    <section aria-label={`${COPY[locale].region}: ${title}`} className="border-b border-neutral-200 bg-surface-50 text-neutral-800">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-2 text-sm">
        <div className="rae-ticker min-w-0 flex-1 overflow-hidden whitespace-nowrap" data-paused={paused}>
          <span className="rae-ticker-track inline-block">
            <strong>{title}</strong>{body ? <> — {body}</> : null} <More className={`font-medium text-brand-700 underline underline-offset-2 ${FOCUS}`} link={link} locale={locale} />
          </span>
        </div>
        <button aria-pressed={paused} className={`min-h-8 rounded border border-neutral-300 px-2 text-xs ${FOCUS}`} onClick={() => setPaused((p) => !p)} type="button">
          {paused ? COPY[locale].play : COPY[locale].pause}
        </button>
      </div>
    </section>
  );
}

// Once per browser session per announcement (sessionStorage); a native <dialog> gives focus trapping, Esc to close
// and focus return for free. If storage is blocked the popup still shows once per page view, never in a loop.
export function AnnouncementPopup({ code, title, body, link, endsAt, locale }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || expired(endsAt)) return;
    const key = `rae-an-${code}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* storage blocked: show once for this page view */
    }
    if (!dialog.open) dialog.showModal();
  }, [code, endsAt]);
  return (
    <dialog aria-labelledby={`an-${code}-title`} className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg border border-neutral-300 bg-white p-0 text-neutral-800 shadow-xl backdrop:bg-black/50" ref={ref}>
      <div className="p-6">
        <h2 className="text-xl font-bold" id={`an-${code}-title`}>{title}</h2>
        <p className="mt-3 whitespace-pre-line">{body}</p>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <More className={`font-medium text-brand-700 underline underline-offset-2 ${FOCUS}`} link={link} locale={locale} />
          <button className={`h-11 rounded-md border border-brand-600 bg-brand-600 px-4 text-sm font-medium text-white ${FOCUS}`} onClick={() => ref.current?.close()} type="button">
            {COPY[locale].dismiss}
          </button>
        </div>
      </div>
    </dialog>
  );
}
