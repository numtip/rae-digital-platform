import type { Locale } from "./published-site.ts";
import { cmsBase } from "./live.ts";
import { MEDIA_CODE, MEDIA_FILE } from "./media-library.ts";

// Server-only reader for M15. No credential: /v1/public/media returns released assets only, and the library
// requires a bilingual title, alt text and caption before an asset can be released — so the copy on the page
// is the office's own, not this site's. Any failure (runtime down, the Pages preview build) yields [].
export const MEDIA_WINDOW = 60;
export const MEDIA_TAG = "cms-media";

/** One released asset as the runtime publishes it (`publicMediaView`). Only these fields are read. */
export type LibraryAsset = {
  code?: string;
  titleTh?: string;
  titleEn?: string;
  altTh?: string;
  altEn?: string;
  captionTh?: string;
  captionEn?: string;
  url?: string;
};

export type PublicMedia = { code: string; title: string; alt: string; caption: string; src: string };

export async function readPublicMedia(): Promise<LibraryAsset[]> {
  if (process.env.NEXT_PAGES_PREVIEW === "1") return [];
  try {
    const response = await fetch(`${cmsBase()}/v1/public/media`, {
      next: { revalidate: MEDIA_WINDOW, tags: [MEDIA_TAG] },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return [];
    const body = (await response.json()) as { assets?: LibraryAsset[] };
    return Array.isArray(body.assets) ? body.assets : [];
  } catch {
    return [];
  }
}

/**
 * The gallery as the page renders it: the library's own bilingual copy, and the bytes through this app's own
 * proxy (the browser cannot reach the loopback runtime). An asset whose URL is not the runtime's own shape is
 * dropped rather than turned into an <img src> — the same own-file rule the news gallery applies.
 */
export function mediaGallery(assets: readonly LibraryAsset[], locale: Locale): PublicMedia[] {
  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const pick = (th: unknown, en: unknown) => text(locale === "th" ? th : en) || text(th);
  return assets.flatMap((asset) => {
    const parts = /^\/v1\/public\/media\/([^/]+)\/([^/]+)$/.exec(text(asset.url));
    if (!parts || !MEDIA_CODE.test(parts[1]) || !MEDIA_FILE.test(parts[2]) || parts[1] !== text(asset.code)) return [];
    const title = pick(asset.titleTh, asset.titleEn) || parts[1];
    return [{
      code: parts[1],
      title,
      alt: pick(asset.altTh, asset.altEn) || title,
      caption: pick(asset.captionTh, asset.captionEn),
      src: `/api/media-library/${parts[1]}/${parts[2]}`,
    }];
  });
}

/** An empty library is a 404, not an empty page: nothing to render, index or link to. */
export const galleryVisible = (gallery: readonly unknown[]) => gallery.length > 0;
