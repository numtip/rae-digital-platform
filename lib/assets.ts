// Local asset paths must carry the Pages basePath. `next/image` does prefix
// `_next/*` automatically, but with `images.unoptimized` (static export) the
// `src` you pass is emitted verbatim — so a bare "/images/…" 404s on the
// preview. NEXT_PUBLIC_BASE_PATH is empty for a normal server build.
export const asset = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;
