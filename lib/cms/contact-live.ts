import { cmsBase } from "./live.ts";

// Server-only reader: is the contact form switched on, and what is the owner-approved privacy notice?
// Any failure (runtime down, preview build) means "off" — the contact page then shows no form.
export type PublicContactConfig = { enabled: false } | { enabled: true; notice: { version: string; th: string; en: string } };

export async function readContactConfig(): Promise<PublicContactConfig> {
  if (process.env.NEXT_PAGES_PREVIEW === "1") return { enabled: false };
  try {
    const response = await fetch(`${cmsBase()}/v1/public/contact/config`, { next: { revalidate: 60, tags: ["cms-contact"] }, signal: AbortSignal.timeout(4000) });
    if (!response.ok) return { enabled: false };
    const body = (await response.json()) as PublicContactConfig;
    return body.enabled === true && body.notice?.version ? body : { enabled: false };
  } catch {
    return { enabled: false };
  }
}
