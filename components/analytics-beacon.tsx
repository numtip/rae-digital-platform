"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// M08 first-party analytics beacon: one anonymous page-view count per navigation. Sends only the public
// path — no cookie, no storage, no identifier, no referrer — and nothing at all when the browser says
// Do-Not-Track or Global Privacy Control, when no endpoint was configured at build time, or on the desk.
// A simple cross-origin POST (text/plain, no-cors) so the canonical host needs no proxy rule for it.
const ENDPOINT = process.env.NEXT_PUBLIC_ANALYTICS_API ?? "";

export function AnalyticsBeacon() {
  const path = usePathname();
  useEffect(() => {
    if (!ENDPOINT || !path || /^\/(th|en)\/cms-admin/.test(path)) return;
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (nav.doNotTrack === "1" || nav.globalPrivacyControl === true) return;
    void fetch(`${ENDPOINT}/v1/public/analytics/hit`, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      credentials: "omit",
      referrerPolicy: "no-referrer",
      headers: { "content-type": "text/plain" },
      body: JSON.stringify({ path }),
    }).catch(() => {});
  }, [path]);
  return null;
}
