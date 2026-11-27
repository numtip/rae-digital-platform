import { cmsBase } from "./live.ts";

// Server-only reader for M13. Returns the public flat list (ordered; the page nests it by parentCode); any failure yields [] and the
// /about page shows no CMS structure section.
export type PublicDepartment = {
  code: string;
  parentCode: string | null;
  nameTh: string;
  nameEn: string;
  descriptionTh: string;
  descriptionEn: string;
  sortOrder: number;
  head: { code: string; prefixTh: string; firstTh: string; lastTh: string; firstEn: string; lastEn: string; positionTh: string; positionEn: string } | null;
};

export async function readPublicDepartments(): Promise<PublicDepartment[]> {
  if (process.env.NEXT_PAGES_PREVIEW === "1") return [];
  try {
    const response = await fetch(`${cmsBase()}/v1/public/departments`, { next: { revalidate: 60, tags: ["cms-departments"] }, signal: AbortSignal.timeout(4000) });
    if (!response.ok) return [];
    const body = (await response.json()) as { departments?: PublicDepartment[] };
    return Array.isArray(body.departments) ? body.departments : [];
  } catch {
    return [];
  }
}
