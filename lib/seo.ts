// A meta description is a snippet, not the article. A search engine shows roughly
// 155–160 characters and cuts the rest wherever it likes; these pages handed it the first
// body paragraph verbatim (up to 1,064 characters on the imported news), so what a reader
// saw in a search result was decided by the search engine rather than by us.
//
// Thai is written without spaces between words, so cutting at the last space is not an
// option — the paragraph has none and the rule would discard almost the whole text. Cut at
// the limit, and back off to a space only when one sits near it (the English case).
//
// shortcut: the cut can still fall between two Thai words; a dictionary-based word break
// costs a dependency nobody approved, and a snippet cut mid-word is what search engines
// do anyway — upgrade only if the office ever supplies hand-written descriptions.
const LIMIT = 160;
const ELLIPSIS = "…";

// A Thai syllable is a base character plus its vowel and tone marks; ending a snippet in
// the middle of one renders a broken glyph, so trailing marks are trimmed.
const THAI_MARK = /[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]$/u;

export function metaDescription(text: string, fallback: string): string {
  const plain = text.replace(/\s+/g, " ").trim();
  if (!plain) return fallback;
  if (plain.length <= LIMIT) return plain;
  let cut = plain.slice(0, LIMIT - ELLIPSIS.length);
  const space = cut.lastIndexOf(" ");
  if (space > cut.length - 30) cut = cut.slice(0, space);
  while (THAI_MARK.test(cut)) cut = cut.slice(0, -1);
  return cut.trimEnd().replace(/[,;:.·—-]+$/u, "") + ELLIPSIS;
}
