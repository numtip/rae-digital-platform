// Local asset paths must carry the Pages basePath. `next/image` does prefix
// `_next/*` automatically, but with `images.unoptimized` (static export) the
// `src` you pass is emitted verbatim — so a bare "/images/…" 404s on the
// preview. NEXT_PUBLIC_BASE_PATH is empty for a normal server build.
export const asset = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;

// The archive's own photos were exported at three widths beside the 900 px master
// (`<nid>.webp`, `<nid>-640.webp`, `<nid>-320.webp`), and `scripts/cms-sync.mjs` publishes a
// CMS article's photos the same way under `/cms-published/<id>/`. Anything else — an upload the
// sync could not resize, a brand mark — is a single file, so offering derived names would 404.
// shortcut: only these two naming schemes get a srcset; a photo named otherwise still renders,
// just without one. Widen the pattern when a third scheme appears.
const MULTI_WIDTH = /^(\/images\/news\/\d+|\/cms-published\/[a-z0-9][a-z0-9-]{1,63}\/\d{2}-[0-9a-f]{8})\.webp$/;

export function photoSources(src: string): { src: string; candidates: { url: string; width: number }[] } {
  if (!MULTI_WIDTH.test(src)) return { src, candidates: [] };
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
