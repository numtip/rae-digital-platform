// Local asset paths must carry the Pages basePath. `next/image` does prefix
// `_next/*` automatically, but with `images.unoptimized` (static export) the
// `src` you pass is emitted verbatim — so a bare "/images/…" 404s on the
// preview. NEXT_PUBLIC_BASE_PATH is empty for a normal server build.
export const asset = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;

// The archive's own photos were exported at three widths beside the 900 px master
// (`<nid>.webp`, `<nid>-640.webp`, `<nid>-320.webp`). Anything else — a CMS gallery file, for
// example — is a single file, so offering derived names for it would 404 the card.
// shortcut: only `public/images/news/<digits>.webp` gets a srcset; a photo named otherwise still
// renders, just without one. Widen the pattern when the archive gains a second naming scheme.
const ARCHIVE_PHOTO = /^\/images\/news\/\d+\.webp$/;

export function photoSources(src: string): { src: string; candidates: { url: string; width: number }[] } {
  if (!ARCHIVE_PHOTO.test(src)) return { src, candidates: [] };
  const base = src.replace(/\.webp$/, "");
  return {
    src: `${base}-640.webp`,
    candidates: [
      { url: `${base}-320.webp`, width: 320 },
      { url: `${base}-640.webp`, width: 640 },
      { url: src, width: 900 },
    ],
  };
}
