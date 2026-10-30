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
