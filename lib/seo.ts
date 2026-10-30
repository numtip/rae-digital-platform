// Type-only: lib/seo.ts stays free of runtime imports so `tests/seo.test.mjs` can load it
// under Node's type stripping, without the Next alias resolver or a build.
import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n";

// A meta description is a snippet, not the article. A search engine shows roughly
// 155–160 characters and cuts the rest wherever it likes; these pages handed it the first
// body paragraph verbatim (up to 1,045 characters on the imported news), so what a reader
// saw in a search result was decided by the search engine rather than by us.
//
// Thai is written with spaces between phrases but not between words, so a cut at the last
// space is not enough: on the imported paragraphs it lands as early as character 131 —
// dropping 29 characters of a 160-character snippet. Cut at the limit instead, and back off
// to a space only when one sits near it (the English case).
//
// shortcut: the cut can still fall between two Thai words; a dictionary-based word break
// costs a dependency nobody approved, and a snippet cut mid-word is what search engines do
// anyway — upgrade only if the office ever supplies hand-written descriptions.
const LIMIT = 160;
const ELLIPSIS = "…";

// A Thai syllable is a base character plus its vowel and tone marks, and a leading vowel is
// written before the consonant it belongs to. Ending a snippet inside either renders a
// broken glyph, so both are trimmed off the end.
const THAI_BROKEN = /[\u0E31\u0E34-\u0E3A\u0E40-\u0E44\u0E47-\u0E4E]$/u;

export function metaDescription(text: string, fallback: string): string {
  // The title stands in for a body that has no text, and is bounded by the same rule: a
  // description longer than the limit is the defect this function exists to remove.
  const plain = (text.trim() ? text : fallback).replace(/\s+/g, " ").trim();
  if (plain.length <= LIMIT) return plain;
  let cut = plain.slice(0, LIMIT - ELLIPSIS.length);
  const space = cut.lastIndexOf(" ");
  if (space > cut.length - 30) cut = cut.slice(0, space);
  while (THAI_BROKEN.test(cut)) cut = cut.slice(0, -1);
  return cut.trimEnd().replace(/[,;:.·—-]+$/u, "") + ELLIPSIS;
}

// The parts of an `openGraph` block that are true of every page. A page that sets its own
// `openGraph` replaces the layout's object whole — Next does not merge the two — so the news
// detail page dropped og:site_name, og:locale and og:locale:alternate from all 118 article
// cards (116 from the archive, 2 published through the CMS). The defaults live here so the next
// page that sets its own block cannot lose them.
//
// `satisfies` is what makes a typo here a type error: spread into a metadata object, a
// misspelled key is silently dropped, which is the same failure this helper exists to end.
export function openGraphSite(orgFull: string, locale: Locale) {
  return {
    siteName: orgFull,
    locale: locale === "th" ? "th_TH" : "en_US",
    alternateLocale: locale === "th" ? ["en_US"] : ["th_TH"],
  } satisfies Pick<NonNullable<Metadata["openGraph"]>, "siteName" | "locale" | "alternateLocale">;
}
