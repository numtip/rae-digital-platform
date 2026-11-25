import { cmsBase } from "./live.ts";

// Server-only reader for the M03 registry. The public endpoint needs no login, so no credential is
// involved. Any failure (runtime down, the Pages preview build with no runtime at all) yields an
// empty list: the static link groups on the page stay, the registry section simply does not render.
export const DOCS_WINDOW = 60;
export const DOCS_TAG = "cms-docs";

export type PublicDocument = {
  code: string;
  category: string;
  titleTh: string;
  titleEn: string;
  fileType: string;
  version: string;
  note: string;
  updatedAt: string;
  downloadCount: number;
};

export async function readPublicDocuments(category?: string): Promise<PublicDocument[]> {
  if (process.env.NEXT_PAGES_PREVIEW === "1") return [];
  try {
    const query = category ? `?category=${encodeURIComponent(category)}` : "";
    const response = await fetch(`${cmsBase()}/v1/public/documents${query}`, {
      next: { revalidate: DOCS_WINDOW, tags: [DOCS_TAG] },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return [];
    const body = (await response.json()) as { documents?: PublicDocument[] };
    return Array.isArray(body.documents) ? body.documents : [];
  } catch {
    return [];
  }
}
