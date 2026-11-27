# RAE Digital Platform — STATUS (2026-11-27)

| | |
|---|---|
| **GitHub `main`** | `bfdae97` (+ docs PR #142 closeout 2026-11-27) |
| **Production runtime (deployed SHA)** | **`8a61dfc`** — via symlink system (`~/rae/current → releases/<sha>`), CMS runtime + both site builds |
| RAE_UNIFIED_PLATFORM_READY | **YES** |
| M03_PRODUCTION_READY | **YES** |
| MJU SSO | **PENDING_EXTERNAL_APPROVAL** — built, deployed, `MJU_SSO_ENABLED=false` |

**Architecture (verified):** one VPS (VPS190, 10.1.245.190), one CMS runtime (`rae-cms-runtime`, 127.0.0.1:3317), one database (`rae_cms` in
`rae-cms-db`). Two renderers of the same code: `rae-digital-next` (127.0.0.1:3417, root build, admin host `rae-cms.raemanagemju.net` via the
Cloudflare Tunnel, noindex) and `rae-digital-landing` (127.0.0.1:3418, `/rae-landing` build, canonical `https://raeservice.mju.ac.th/rae-landing/`
via host nginx). The CMS hook notifies both. Persistence is the hand-written MySQL repository (ADR-0006). Files stay in Microsoft 365 (ADR-0004).

**Deploy system:** symlink-based releases (`~/rae/releases/<sha> → ~/rae/current`). Containers mount `~/rae/current:/app`. Verified with `readlink ~/rae/current`, not `docker inspect` SHA. Backups: `~/rae/rae-cms-backups/pre-*` + nightly `daily/`. Static landing backup: `~/rae/rae-landing-static-backup/`.

**Migrations on `rae_cms`:** 001–005, 007, 008 (SSO links/handoffs), 009 (documents), 010 (link health), 011 (knowledge/FAQ), 012 (events), 013 (contact inbox), 014 (analytics), 015 (announcements), 016 (departments). DDL applied by hand with root inside DB container after backup. **No schema_migrations tracking table** — verify migrations by comparing file names vs actual table names in DB.

## 2026-11-27 Deploy Summary

All modules shipped today (PRs #124–#140): M22 backup fix + restore verification · M04 Knowledge/FAQ (CMS-backed, hidden while empty) · M05 Events/calendar (.ics export per event + feed RFC 5545, pagination 10/page) · M06 Search relevance ranking (title > body, exact codes first) · M07 Contact form (dark until CONTACT_* config set; SMTP not built) · M08 Analytics (cookieless, off unless ANALYTICS_ENABLED; check:a11y gate) · M17 Announcements (banner/popup/ticker, server-enforced expiration) · M18 Desk dashboard (counts per module, upcoming/live/broken, recent activity) · M13 Departments/org structure (parent/child tree max 4 levels) · M23 OpenAPI description + contract test (7 public GET endpoints) · a11y fixes (#138: duplicate landmarks, dark contrast) · release tooling (#140: isolated builds, spare-port probe, health-checked switch).

**Sitemap:** 164 `<loc>` (up from 152 yesterday). All page URLs return 200. OpenAPI returns 200 with 7 public paths. Admin host returns 200 (Cloudflare Access still open). 

Known gap: withdrawn.json contains test entries (uat-withdraw-0 through -7, news test ids) — should be cleared before production sign-off. Test audit rows intentionally kept for integrity. crontab guard prevented automated backup cron updates (operator must verify manually).

**2026-11-27 (PRs #124–#127):** M22 backup fixed + restore-verified; M04 FAQ (`/knowledge#faq`, hidden while empty); M05 CMS events on `/news/events` (section absent while none); M06 relevance ranking. All start empty — no content seeded. Tables are empty in production after acceptance tests (records and audit rows removed).
**2026-11-27 later (PRs #129–#131):** events archive 10/page; M07 contact form + CMS FAQ on `/contact` (form **off** until owner sets privacy notice + retention — `docs/ops/contact-form.md`; SMTP not built, no MJU details); M08 cookieless analytics (**off** until `ANALYTICS_ENABLED` — `docs/ops/analytics.md`) + `check:a11y`. Test audit rows are no longer deleted (audit integrity); earlier acceptance runs removed their own test audit rows under that day's scope.
**2026-11-27 evening (PRs #133–#138):** M05 `.ics` (per event + feed), M17 announcements, M18 desk dashboard, M13 departments, M23 OpenAPI (`/cms-api/v1/public/openapi.json`), axe browser runner (`scripts/axe-live.mjs`; 13 live pages × light/dark × desktop/phone = 0 violations; re-run with live CMS content found and fixed dark-mode contrast + duplicate landmark names). Skipped as externally blocked: M15 (no storage target, ADR-0004), M12 (PDPA basis A-4). Contact, analytics, SSO still off.
**Build note:** export builds (`npm run build:export`) must NOT run in this tree — they wipe `.next` (it broke the admin host for minutes); use a separate clone. Site builds now set `RAE_CMS_API=http://127.0.0.1:3317` at build time (the layout fetches announcements, host build otherwise times out on the container hostname).
**Operator action pending (backup cron):** crontab still points at the old backup path — see `docs/ops/backup-restore.md` (the auto-mode guard refused the agent's crontab edit).

**Pending, owner-side:** M365 onboarding (no verified SharePoint link list exists yet; needs the list of existing SharePoint links; tool + guide ready); MJU SSO — countersigned CMS C-14,
MJU SSO administrator's E2E authorisation + window; Cloudflare Access on `/th|en/cms-admin/*` (leave `/cms-api/*` open).
Full detail: `docs/reports/2026-11-25-day-closeout.md`. Handoff: `docs/memory/NEXT_SESSION.md`.
