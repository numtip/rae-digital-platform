"use client";

import { useState, type FormEvent } from "react";

// M07 contact form. Rendered only when the CMS reports it enabled (owner-approved notice + retention set).
// Posts straight to the CMS public endpoint; nothing is stored in the browser. The notice shown is the
// owner-approved text, and its version travels with the consent so the record says what was agreed to.
const COPY = {
  th: {
    heading: "ส่งข้อความถึงสำนักวิจัยฯ", name: "ชื่อ-นามสกุล", email: "อีเมลสำหรับตอบกลับ", subject: "หัวข้อ", message: "ข้อความ",
    consent: "ข้าพเจ้ารับทราบประกาศความเป็นส่วนตัวข้างต้นและยินยอมให้ใช้ข้อมูลนี้เพื่อตอบข้อความ", send: "ส่งข้อความ", sending: "กำลังส่ง…",
    ok: "ส่งข้อความแล้ว เลขอ้างอิง", tooMany: "ส่งบ่อยเกินไป กรุณาลองใหม่ภายหลัง", fail: "ส่งไม่สำเร็จ กรุณาตรวจข้อมูลหรือลองใหม่", notice: "ประกาศความเป็นส่วนตัว",
  },
  en: {
    heading: "Send a message to the office", name: "Full name", email: "Email for the reply", subject: "Subject", message: "Message",
    consent: "I have read the privacy notice above and agree that this data is used to answer my message", send: "Send message", sending: "Sending…",
    ok: "Message sent. Reference", tooMany: "Too many messages; please try again later", fail: "Could not send. Check the form or try again", notice: "Privacy notice",
  },
} as const;

const FIELD = "w-full rounded-md border border-neutral-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

export function ContactForm({ apiBase, locale, notice }: { apiBase: string; locale: "th" | "en"; notice: { version: string; th: string; en: string } }) {
  const copy = COPY[locale];
  const [state, setState] = useState<"idle" | "sending" | "ok" | "tooMany" | "fail">("idle");
  const [reference, setReference] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setState("sending");
    const response = await fetch(`${apiBase}/v1/public/contact`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"), email: data.get("email"), subject: data.get("subject"), message: data.get("message"),
        website: data.get("website"), consent: data.get("consent") === "on", noticeVersion: notice.version, locale,
      }),
    }).catch(() => null);
    if (response?.ok) {
      const body = (await response.json().catch(() => ({}))) as { reference?: string };
      setReference(body.reference ?? "");
      setState("ok");
      form.reset();
    } else {
      setState(response?.status === 429 ? "tooMany" : "fail");
    }
  }

  return (
    <section aria-labelledby="contact-form-heading" className="mt-10 rounded-lg border border-neutral-200 bg-white p-6" id="contact-form">
      <h2 className="text-2xl font-bold text-neutral-800" id="contact-form-heading">{copy.heading}</h2>
      <div className="mt-4 rounded-md bg-surface-50 p-4 text-sm text-neutral-700">
        <p className="font-semibold text-neutral-800">{copy.notice} ({notice.version})</p>
        <p className="mt-1 whitespace-pre-line">{locale === "th" ? notice.th : notice.en}</p>
      </div>
      <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
        <label className="flex flex-col gap-1 text-sm font-medium">{copy.name}<input autoComplete="name" className={FIELD} maxLength={120} name="name" required /></label>
        <label className="flex flex-col gap-1 text-sm font-medium">{copy.email}<input autoComplete="email" className={FIELD} maxLength={254} name="email" required type="email" /></label>
        <label className="flex flex-col gap-1 text-sm font-medium">{copy.subject}<input className={FIELD} maxLength={200} name="subject" required /></label>
        <label className="flex flex-col gap-1 text-sm font-medium">{copy.message}<textarea className={FIELD} maxLength={4000} name="message" required rows={6} /></label>
        {/* Honeypot: hidden from people and assistive tech; a bot that fills it is silently dropped. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>Website<input autoComplete="off" name="website" tabIndex={-1} /></label>
        </div>
        <label className="flex items-start gap-2 text-sm"><input className="mt-1 h-4 w-4" name="consent" required type="checkbox" /><span>{copy.consent}</span></label>
        <button className="h-11 rounded-md border border-brand-600 bg-brand-600 px-4 text-sm font-medium text-white disabled:opacity-60" disabled={state === "sending"} type="submit">
          {state === "sending" ? copy.sending : copy.send}
        </button>
      </form>
      <p aria-live="polite" className="mt-3 text-sm" role="status">
        {state === "ok" ? `${copy.ok} ${reference}` : state === "tooMany" ? copy.tooMany : state === "fail" ? copy.fail : ""}
      </p>
    </section>
  );
}
