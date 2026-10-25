"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { SearchEntry } from "@/lib/search-index";
import type { SearchContent } from "@/lib/i18n";

// Filtering runs in the browser over the index the page passes in, so the search
// page works on the static GitHub Pages export without a server or a function.
// Substring matching is enough for Thai (no word spaces to split on).

export function ContentSearch({ entries, labels }: { entries: SearchEntry[]; labels: SearchContent["labels"] }) {
  // ?q= comes from the header search form; reading it here keeps the page a
  // static file while still honouring the submitted word.
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const needle = query.trim().toLowerCase();
  const results = needle
    ? entries.filter((entry) => `${entry.title} ${entry.text}`.toLowerCase().includes(needle))
    : [];

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

      <p aria-live="polite" className="mt-8 text-sm font-semibold text-neutral-700">
        {needle ? labels.countTemplate.replace("{n}", String(results.length)) : labels.empty}
      </p>

      {needle && results.length === 0 && <p className="mt-2 text-neutral-700">{labels.noResults}</p>}

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
