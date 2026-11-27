# M08 — first-party analytics and accessibility gate

**Analytics (off by default).** Counts one anonymous page view per navigation per (Bangkok day, public path). Stores no IP, cookie, user agent or referrer; record codes collapse (`/documents/rae-dc-*`), max 3000 paths/day (rest `/other`), 120 hits/min per client. The beacon sends nothing under Do-Not-Track or Global Privacy Control and never on the desk. Editors see totals and top pages in the desk ("Page views").

To switch on (owner decision): `ANALYTICS_ENABLED=true` and `ANALYTICS_ALLOWED_ORIGINS=https://raeservice.mju.ac.th` in `runtime.env` (restart the runtime), and build the landing site with `NEXT_PUBLIC_ANALYTICS_API=https://rae-cms.raemanagemju.net/cms-api` (the beacon posts cross-origin, a simple request, so nginx on the canonical host needs no change). Migration 014 (`analytics_daily`) is additive. Keep Cloudflare Access off `/cms-api/*`.

**Accessibility gate.** `npm run check:a11y` (part of `npm run qa`) reads the preview export: `<html lang>` = route locale, one `<h1>`, `<main id="main-content">` + skip link, `alt` on images, names on links/buttons, labels on form controls, unique ids, no heading jumps, no positive tabindex. Together with `check:contrast` (AA). Browser/axe and screen-reader passes stay manual.
