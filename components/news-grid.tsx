import Link from "next/link";
import { NewsImage } from "@/components/news-image";
import type { Locale, NewsContent, NewsItem } from "@/lib/i18n";

// The card grid is shared by the news index and every paginated page, so the two
// cannot drift apart in markup, alt handling or fallback behaviour.

export function NewsGrid({
  items,
  locale,
  labels,
  thaiTitles,
  section = "news",
}: {
  items: NewsItem[];
  locale: Locale;
  labels: NewsContent["labels"];
  thaiTitles: Map<string, string>;
  /** The URL segment the cards link under; the live pilot lists the same cards at /news-live/. */
  section?: "news" | "news-live";
}) {
  return (
    <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const title = item.title || thaiTitles.get(item.nid) || item.nid;
        return (
          <li key={item.nid} className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
            <Link className="group block" href={`/${locale}/${section}/${item.nid}`}>
              {item.image ? (
                <NewsImage
                  alt={item.image.alt || title}
                  className="h-44 w-full object-cover"
                  sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                  src={item.image.src}
                />
              ) : (
                <div aria-hidden="true" className="h-2 bg-brand-600/20" />
              )}
              <div className="p-5">
                <p className="text-xs font-semibold text-brand-600">{item.date}</p>
                <h2 className="mt-2 text-lg font-bold leading-snug text-neutral-800 group-hover:text-brand-600">
                  {title}
                </h2>
                {!item.title && labels.headlineThaiOnly && (
                  <p className="mt-1 text-xs text-neutral-500">{labels.headlineThaiOnly}</p>
                )}
                <p className="mt-3 text-sm font-semibold text-brand-600 underline underline-offset-2">
                  {labels.read}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
