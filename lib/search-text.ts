// One rule for both sides of the comparison in /search/, so a Thai word cannot miss the
// page it came from because of how the text happens to be encoded.
//
// SARA AM ("ำ") has two spellings: the content files carry it as the single code point
// U+0E33, but text copied from a PDF or a legacy TIS-620 export carries the older
// NIKHAHIT + SARA AA pair (U+0E4D U+0E32). NFC leaves both as they are, so the two never
// compare equal. NFKC unfolds U+0E33 to that same pair, which puts both spellings on
// identical code points; case folding rides along so English still matches either way.
export const foldForSearch = (text: string) => text.normalize("NFKC").toLowerCase();

// A typed query is a set of words, not one long string. Thai copy rarely carries a space
// between words, but a reader who types one still means "both words, in this page" — and
// matching the whole string as a phrase threw those queries away ("ทุนวิจัย แบบฟอร์ม"
// found nothing while both words sit on the same document category).
// shortcut: no Thai word segmentation, so an unspaced two-word query is still one token;
// upgrade only if a reader reports missing results a dictionary could have split.
export const matchesQuery = (text: string, query: string) => {
  const haystack = foldForSearch(text);
  const tokens = foldForSearch(query).split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => haystack.includes(token));
};

// Relevance for the results list (M06). Before this, results came back in index order, so a story whose
// body merely mentioned the word could sit above the page whose title is the word. Score per entry:
// every word in the title (+4), the title starts with the first word (+2), the first word is a
// whole-word hit in the title (+1), an exact match on a document/FAQ/event code (+8). Ties keep the original
// order (Array.prototype.sort is stable), so equal results never reshuffle between renders.
export function relevance(entry: { title: string; text: string }, query: string): number {
  const tokens = foldForSearch(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;
  const title = foldForSearch(entry.title);
  let score = 0;
  if (tokens.every((token) => title.includes(token))) score += 4;
  if (title.startsWith(tokens[0])) score += 2;
  if (new RegExp(`(^|[^\\p{L}\\p{N}])${tokens[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}\\p{N}])`, "u").test(title)) score += 1;
  if (/^rae-(dc|kb|ev)-\d+$/.test(tokens[0]) && foldForSearch(entry.text).split(/[\s·]+/).includes(tokens[0])) score += 8;
  return score;
}

export function rankResults<T extends { title: string; text: string }>(entries: T[], query: string): T[] {
  return entries
    .map((entry, index) => ({ entry, index, score: relevance(entry, query) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((item) => item.entry);
}
