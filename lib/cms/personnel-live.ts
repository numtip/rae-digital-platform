import { cmsBase } from "./live.ts";

// Server-only reader for the M12 public directory (active, public, consented people; work contact only).
// Failure yields [] and the people page shows its empty state.
export type PublicPerson = {
  code: string;
  prefixTh: string;
  firstTh: string;
  lastTh: string;
  firstEn: string;
  lastEn: string;
  positionTh: string;
  positionEn: string;
  academicRank: string;
  workGroup: string;
  departmentCode: string | null;
  email: string;
  phoneOffice: string;
  expertise: string[];
};

export async function readPublicPersonnel(): Promise<PublicPerson[]> {
  if (process.env.NEXT_PAGES_PREVIEW === "1") return [];
  try {
    const response = await fetch(`${cmsBase()}/v1/public/personnel`, { next: { revalidate: 60, tags: ["cms-personnel"] }, signal: AbortSignal.timeout(4000) });
    if (!response.ok) return [];
    const body = (await response.json()) as { personnel?: PublicPerson[] };
    return Array.isArray(body.personnel) ? body.personnel : [];
  } catch {
    return [];
  }
}

export const personName = (p: PublicPerson, locale: "th" | "en") =>
  locale === "th" || !(p.firstEn || p.lastEn) ? `${p.prefixTh}${p.firstTh} ${p.lastTh}`.trim() : `${p.firstEn} ${p.lastEn}`.trim();
