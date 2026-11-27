# RAE Digital Platform — STATUS (2026-11-27)

| | |
|---|---|
| **GitHub `main`** | `f093f35` + docs (docs only, not redeployed) |
| **Production runtime (deployed SHA)** | **`f093f35`** — CMS runtime and both site builds |
| RAE_UNIFIED_PLATFORM_READY | **YES** |
| M03_PRODUCTION_READY | **YES** |
| MJU SSO | **PENDING_EXTERNAL_APPROVAL** — built, deployed, `MJU_SSO_ENABLED=false` |

**Architecture (verified):** one VPS (VPS190, 10.1.245.190), one CMS runtime (`rae-cms-runtime`, 127.0.0.1:3317), one database (`rae_cms` in
`rae-cms-db`). Two renderers of the same code: `rae-digital-next` (127.0.0.1:3417, root build, admin host `rae-cms.raemanagemju.net` via the
Cloudflare Tunnel, noindex) and `rae-digital-landing` (127.0.0.1:3418, `/rae-landing` build, canonical `https://raeservice.mju.ac.th/rae-landing/`
via host nginx). The CMS hook notifies both. Persistence is the hand-written MySQL repository (ADR-0006). Files stay in Microsoft 365 (ADR-0004).

**Migrations on `rae_cms`:** 001–005, 007, 008 (SSO links/handoffs), 009 (documents), 010 (link health), 011 (knowledge/FAQ), 012 (events), 013 (contact inbox), 014 (analytics), 015 (announcements), 016 (departments). DDL is applied by hand with root inside the DB container after a backup.

**2026-11-27 (PRs #124–#127):** M22 backup fixed + restore-verified; M04 FAQ (`/knowledge#faq`, hidden while empty); M05 CMS events on `/news/events` (section absent while none); M06 relevance ranking. All start empty — no content seeded. Tables are empty in production after acceptance tests (records and audit rows removed).
**2026-11-27 later (PRs #129–#131):** events archive 10/page; M07 contact form + CMS FAQ on `/contact` (form **off** until owner sets privacy notice + retention — `docs/ops/contact-form.md`; SMTP not built, no MJU details); M08 cookieless analytics (**off** until `ANALYTICS_ENABLED` — `docs/ops/analytics.md`) + `check:a11y`. Test audit rows are no longer deleted (audit integrity); earlier acceptance runs removed their own test audit rows under that day's scope.
**2026-11-27 evening (PRs #133–#138):** M05 `.ics` (per event + feed), M17 announcements, M18 desk dashboard, M13 departments, M23 OpenAPI (`/cms-api/v1/public/openapi.json`), axe browser runner (`scripts/axe-live.mjs`; 13 live pages × light/dark × desktop/phone = 0 violations; re-run with live CMS content found and fixed dark-mode contrast + duplicate landmark names). Skipped as externally blocked: M15 (no storage target, ADR-0004), M12 (PDPA basis A-4). Contact, analytics, SSO still off.
**Build note:** export builds (`npm run build:export`) must NOT run in this tree — they wipe `.next` (it broke the admin host for minutes); use a separate clone. Site builds now set `RAE_CMS_API=http://127.0.0.1:3317` at build time (the layout fetches announcements, host build otherwise times out on the container hostname).
**Operator action pending (backup cron):** crontab still points at the old backup path — see `docs/ops/backup-restore.md` (the auto-mode guard refused the agent's crontab edit).

**Owner decision 2026-11-27 — M12 Personnel APPROVED.** Gate A-4 (PDPA basis/retention) is removed as a development blocker; the owner assumes personnel-data governance, no third-party approval is required. Built: personnel directory + encrypted restricted data + RBAC + audit, M13 head-of-unit (`docs/ops/personnel.md`). Verified data only; nothing seeded. RBAC, public/private separation and audit integrity are tested.
**Releases:** production now serves `~/rae/current` (SHA-tagged release dirs, isolated builds, spare-port probe, auto-rollback — `docs/ops/releases.md`). Measured cutover downtime 2.4 s (was ~8 min with in-place builds).

**Pending, owner-side:** M365 onboarding (no verified SharePoint link list exists yet; needs the list of existing SharePoint links; tool + guide ready); MJU SSO — countersigned CMS C-14,
MJU SSO administrator's E2E authorisation + window; Cloudflare Access on `/th|en/cms-admin/*` (leave `/cms-api/*` open).
Full detail: `docs/reports/2026-11-25-day-closeout.md`. Handoff: `docs/memory/NEXT_SESSION.md`.
