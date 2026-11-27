import { cmsBase } from "./live.ts";

// Server-only reader for M04 FAQ entries. No credential: the public endpoint returns published entries only.
// Any failure (runtime down, the Pages preview build) yields [] and the page hides the FAQ section.
export const KNOWLEDGE_WINDOW = 60;
export const KNOWLEDGE_TAG = "cms-knowledge";

export type PublicKnowledge = {
  code: string;
  topic: string;
  questionTh: string;
  questionEn: string;
  answerTh: string;
  answerEn: string;
  sortOrder: number;
  updatedAt: string;
};

export async function readPublicKnowledge(): Promise<PublicKnowledge[]> {
  if (process.env.NEXT_PAGES_PREVIEW === "1") return [];
  try {
    const response = await fetch(`${cmsBase()}/v1/public/knowledge`, {
      next: { revalidate: KNOWLEDGE_WINDOW, tags: [KNOWLEDGE_TAG] },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return [];
    const body = (await response.json()) as { entries?: PublicKnowledge[] };
    return Array.isArray(body.entries) ? body.entries : [];
  } catch {
    return [];
  }
}
