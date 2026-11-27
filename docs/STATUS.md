# RAE Digital Platform — STATUS (2026-11-27)

| | |
|---|---|
| **GitHub `main`** | `c91ed4b` + docs (docs only, not redeployed) |
| **Production runtime (deployed SHA)** | **`c91ed4b`** — CMS runtime and both site builds |
| RAE_UNIFIED_PLATFORM_READY | **YES** |
| M03_PRODUCTION_READY | **YES** |
| MJU SSO | **PENDING_EXTERNAL_APPROVAL** — built, deployed, `MJU_SSO_ENABLED=false` |

**Architecture (verified):** one VPS (VPS190, 10.1.245.190), one CMS runtime (`rae-cms-runtime`, 127.0.0.1:3317), one database (`rae_cms` in
`rae-cms-db`). Two renderers of the same code: `rae-digital-next` (127.0.0.1:3417, root build, admin host `rae-cms.raemanagemju.net` via the
Cloudflare Tunnel, noindex) and `rae-digital-landing` (127.0.0.1:3418, `/rae-landing` build, canonical `https://raeservice.mju.ac.th/rae-landing/`
via host nginx). The CMS hook notifies both. Persistence is the hand-written MySQL repository (ADR-0006). Files stay in Microsoft 365 (ADR-0004).

**Migrations on `rae_cms`:** 001–005, 007, 008 (SSO links/handoffs), 009 (documents), 010 (link health), 011 (knowledge/FAQ), 012 (events), 013 (contact inbox), 014 (analytics). DDL is applied by hand with root inside the DB container after a backup.

**2026-11-27 (PRs #124–#127):** M22 backup fixed + restore-verified; M04 FAQ (`/knowledge#faq`, hidden while empty); M05 CMS events on `/news/events` (section absent while none); M06 relevance ranking. All start empty — no content seeded. Tables are empty in production after acceptance tests (records and audit rows removed).
**2026-11-27 later (PRs #129–#131):** events archive 10/page; M07 contact form + CMS FAQ on `/contact` (form **off** until owner sets privacy notice + retention — `docs/ops/contact-form.md`; SMTP not built, no MJU details); M08 cookieless analytics (**off** until `ANALYTICS_ENABLED` — `docs/ops/analytics.md`) + `check:a11y`. Test audit rows are no longer deleted (audit integrity); earlier acceptance runs removed their own test audit rows under that day's scope.
**Operator action pending (backup cron):** crontab still points at the old backup path — see `docs/ops/backup-restore.md` (the auto-mode guard refused the agent's crontab edit).

**Pending, owner-side:** M365 onboarding (no verified SharePoint link list exists yet; needs the list of existing SharePoint links; tool + guide ready); MJU SSO — countersigned CMS C-14,
MJU SSO administrator's E2E authorisation + window; Cloudflare Access on `/th|en/cms-admin/*` (leave `/cms-api/*` open).
Full detail: `docs/reports/2026-11-25-day-closeout.md`. Handoff: `docs/memory/NEXT_SESSION.md`.
