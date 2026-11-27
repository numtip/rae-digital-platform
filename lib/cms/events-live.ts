import { cmsBase } from "./live.ts";

// Server-only reader for M05 events. No credential: the public endpoint returns published and cancelled events only.
// Any failure (runtime down, the Pages preview build) yields [] and the page shows its honest empty state.
export const EVENTS_WINDOW = 60;
export const EVENTS_TAG = "cms-events";

export type PublicEvent = {
  code: string;
  titleTh: string;
  titleEn: string;
  descriptionTh: string;
  descriptionEn: string;
  locationTh: string;
  locationEn: string;
  startsAt: string;
  endsAt: string | null;
  cancelled: boolean;
  updatedAt: string;
};

export async function readPublicEvents(): Promise<PublicEvent[]> {
  if (process.env.NEXT_PAGES_PREVIEW === "1") return [];
  try {
    const response = await fetch(`${cmsBase()}/v1/public/events`, {
      next: { revalidate: EVENTS_WINDOW, tags: [EVENTS_TAG] },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return [];
    const body = (await response.json()) as { events?: PublicEvent[] };
    return Array.isArray(body.events) ? body.events : [];
  } catch {
    return [];
  }
}

/** Upcoming (not yet ended, soonest first) and past (most recent first), judged at call time. */
export function splitPublicEvents(events: PublicEvent[], now: number = Date.now()) {
  const endOf = (e: PublicEvent) => Date.parse(e.endsAt ?? e.startsAt);
  return { upcoming: events.filter((e) => endOf(e) >= now), past: events.filter((e) => endOf(e) < now).reverse() };
}
