import { cmsBase } from "./live.ts";

// Server-only reader for M17. The CMS returns only announcements that are live right now (published and inside
// their window); the site refreshes every 30 s, so an expiry reaches readers within that window. Any failure
// (runtime down, the Pages preview build) yields [] and the site simply shows no announcement.
export const ANNOUNCEMENTS_WINDOW = 30;
export const ANNOUNCEMENTS_TAG = "cms-announcements";

export type PublicAnnouncement = {
  code: string;
  kind: "banner" | "popup" | "ticker";
  titleTh: string;
  titleEn: string;
  bodyTh: string;
  bodyEn: string;
  linkUrl: string;
  endsAt: string;
};

export async function readPublicAnnouncements(): Promise<PublicAnnouncement[]> {
  if (process.env.NEXT_PAGES_PREVIEW === "1") return [];
  try {
    const response = await fetch(`${cmsBase()}/v1/public/announcements`, {
      next: { revalidate: ANNOUNCEMENTS_WINDOW, tags: [ANNOUNCEMENTS_TAG] },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return [];
    const body = (await response.json()) as { announcements?: PublicAnnouncement[] };
    return Array.isArray(body.announcements) ? body.announcements : [];
  } catch {
    return [];
  }
}
