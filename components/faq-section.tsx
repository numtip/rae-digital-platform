import type { PublicKnowledge } from "@/lib/cms/knowledge-live";
import type { Locale } from "@/lib/i18n";
import { jsonLdScript } from "@/lib/json-ld";

// M04/M07: the FAQ accordion + FAQPage JSON-LD, shared by /knowledge and /contact. Renders nothing while
// there are no published entries (and a page carries the JSON-LD at most once, so `jsonLd` is opt-out).
const COPY = {
  th: { title: "คำถามที่พบบ่อย", topic: "หัวข้อ" },
  en: { title: "Frequently asked questions", topic: "Topic" },
} as const;

export function FaqSection({ entries, locale, jsonLd = true, className = "bg-surface-50 py-12" }: { entries: PublicKnowledge[]; locale: Locale; jsonLd?: boolean; className?: string }) {
  if (entries.length === 0) return null;
  const q = (e: PublicKnowledge) => (locale === "th" ? e.questionTh : e.questionEn);
  const a = (e: PublicKnowledge) => (locale === "th" ? e.answerTh : e.answerEn);
  return (
    <section aria-labelledby="faq-heading" className={className} id="faq">
      <div className="mx-auto w-full max-w-7xl px-4">
        <h2 className="text-2xl font-bold text-neutral-800" id="faq-heading">{COPY[locale].title}</h2>
        <div className="mt-6 grid max-w-3xl gap-3">
          {entries.map((entry) => (
            <details className="rounded-lg border border-neutral-200 bg-white p-4" id={`faq-${entry.code}`} key={entry.code}>
              <summary className="min-h-11 cursor-pointer font-medium text-neutral-800">{q(entry)}</summary>
              {entry.topic ? <p className="mt-2 text-xs text-neutral-600">{COPY[locale].topic}: {entry.topic}</p> : null}
              <p className="mt-2 whitespace-pre-line text-neutral-700">{a(entry)}</p>
            </details>
          ))}
        </div>
      </div>
      {jsonLd ? (
        <script
          dangerouslySetInnerHTML={{
            __html: jsonLdScript({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: entries.map((entry) => ({ "@type": "Question", name: q(entry), acceptedAnswer: { "@type": "Answer", text: a(entry) } })),
            }),
          }}
          type="application/ld+json"
        />
      ) : null}
    </section>
  );
}
