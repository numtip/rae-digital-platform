// M08 first-party analytics. Counts page views per (Bangkok day, path) and nothing else: no cookie, no IP,
// no user agent, no referrer. Off unless the owner sets ANALYTICS_ENABLED=true. Pure rules here.

export type AnalyticsConfig = { enabled: false } | { enabled: true; allowedOrigins: string[] };

export function readAnalyticsConfig(env: Record<string, string | undefined>): AnalyticsConfig {
  if (env.ANALYTICS_ENABLED !== "true") return { enabled: false };
  const allowedOrigins = (env.ANALYTICS_ALLOWED_ORIGINS ?? "").split(",").map((o) => o.trim()).filter((o) => /^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(o));
  return { enabled: true, allowedOrigins };
}

/** The site path of a page view, or null if it is not a public page path. Query/hash are dropped by the caller. */
export function normalizeAnalyticsPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 120) return null;
  // Public localized pages only; the desk and API are never counted.
  if (!/^\/(th|en)(\/[A-Za-z0-9._~-]+)*\/?$/.test(value)) return null;
  if (/^\/(th|en)\/cms-admin/.test(value)) return null;
  const trimmed = value.length > 1 ? value.replace(/\/+$/, "") : value;
  return trimmed.toLowerCase().replace(/\/rae-dc-\d+$/, "/rae-dc-*");
}

/** The calendar day in Asia/Bangkok (UTC+7, no DST) as YYYY-MM-DD. */
export const bangkokDay = (ms: number) => new Date(ms + 7 * 3600_000).toISOString().slice(0, 10);

/** One day may track this many distinct paths; the rest are counted under "/other" (bounds table growth). */
export const MAX_PATHS_PER_DAY = 3000;
