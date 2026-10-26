"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { sectionOf, type SearchEntry, type SearchSection } from "@/lib/search-index";
import type { SearchContent } from "@/lib/i18n";

// Filtering runs in the browser over the index the page passes in, so the search
// page works on the static GitHub Pages export without a server or a function.
// Substring matching is enough for Thai (no word spaces to split on).

const CHIP =
  "rounded-full border px-4 py-1.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

type Categories = SearchContent["labels"]["categories"];

export function ContentSearch({ entries, labels }: { entries: SearchEntry[]; labels: SearchContent["labels"] }) {
  // ?q= comes from the header search form; reading it here keeps the page a
  // static file while still honouring the submitted word.
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [section, setSection] = useState<SearchSection | "all">("all");

  // Counts come from the same index the results come from, so a chip cannot advertise
  // a number the list is unable to produce.
  const counts = new Map<SearchSection, number>();
  for (const entry of entries) {
    const key = sectionOf(entry.href);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const needle = query.trim().toLowerCase();
  const matched = needle
    ? entries.filter((entry) => `${entry.title} ${entry.text}`.toLowerCase().includes(needle))
    : [];
  const results = section === "all" ? matched : matched.filter((entry) => sectionOf(entry.href) === section);
  const hiddenByFilter = matched.length - results.length;

  return (
    <div>
      <label className="block text-sm font-semibold text-neutral-800" htmlFor="search-input">
        {labels.input}
      </label>
      <input
        autoComplete="off"
        className="mt-2 w-full max-w-xl rounded-md border border-neutral-300 px-4 py-3 text-lg text-neutral-800 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        id="search-input"
        onChange={(event) => setQuery(event.target.value)}
        placeholder={labels.placeholder}
        type="search"
        value={query}
      />
      <p className="mt-2 text-sm text-neutral-600">{labels.hint}</p>

      {/* Category filter: the categories are the site's own sections, counted from the
          index, so nothing here can point at a page that does not exist. */}
      <div className="mt-6">
        <p className="text-sm font-semibold text-neutral-800" id="search-filter-label">
          {labels.filterLabel}
        </p>
        <div aria-labelledby="search-filter-label" className="mt-2 flex flex-wrap gap-2" role="group">
          <button
            aria-pressed={section === "all"}
            className={`${CHIP} ${section === "all" ? "border-brand-600 bg-brand-600 text-white" : "border-neutral-300 bg-white text-neutral-700 hover:border-brand-500"}`}
            onClick={() => setSection("all")}
            type="button"
          >
            {labels.categories.all} ({entries.length})
          </button>
          {(Object.keys(labels.categories) as (keyof Categories)[])
            .filter((key) => key !== "all" && (counts.get(key as SearchSection) ?? 0) > 0)
            .map((key) => (
              <button
                aria-pressed={section === key}
                className={`${CHIP} ${section === key ? "border-brand-600 bg-brand-600 text-white" : "border-neutral-300 bg-white text-neutral-700 hover:border-brand-500"}`}
                key={key}
                onClick={() => setSection(key as SearchSection)}
                type="button"
              >
                {labels.categories[key]} ({counts.get(key as SearchSection)})
              </button>
            ))}
        </div>
      </div>

      <p aria-live="polite" className="mt-8 text-sm font-semibold text-neutral-700">
        {needle ? labels.countTemplate.replace("{n}", String(results.length)) : labels.empty}
      </p>

      {needle && results.length === 0 && (
        <div className="mt-4 rounded-lg border-l-4 border-gold-500 bg-cream-50 p-4" role="status">
          <p className="text-neutral-800">{labels.noResults}</p>
          {hiddenByFilter > 0 && (
            <>
              <p className="mt-1 text-sm text-neutral-700">
                {labels.hiddenByFilter.replace("{n}", String(hiddenByFilter))}
              </p>
              <button
                className="mt-3 rounded-md border border-brand-600 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                onClick={() => setSection("all")}
                type="button"
              >
                {labels.showAll}
              </button>
            </>
          )}
        </div>
      )}

      <ul className="mt-4 space-y-3">
        {results.map((entry) => (
          <li key={`${entry.href}-${entry.title}`} className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-600">
              {entry.kind === "page" ? labels.kindPage : labels.kindItem}
            </p>
            <Link className="mt-1 block text-lg font-semibold text-brand-700 underline underline-offset-2" href={entry.href}>
              {entry.title}
            </Link>
            {entry.text && <p className="mt-2 line-clamp-3 text-sm text-neutral-600">{entry.text}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
