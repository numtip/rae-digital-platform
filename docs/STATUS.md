# RAE Digital Platform — STATUS (2026-11-27, DAY_20261127_CLOSED)

| | |
|---|---|
| **GitHub `main`** | `623913e624c3` + docs (docs only, not redeployed) |
| **Production runtime (deployed SHA)** | **`cc05a18e5c53`** — site builds (PR #149: shadcn setup, toast + confirm dialogs in the documents desk); CMS runtime unchanged at `623913e624c3`. Previous release `623913e624c3` kept for rollback |
| RAE_UNIFIED_PLATFORM_READY | **YES** |
| M03_PRODUCTION_READY | **YES** |
| BACKUP_CRON_INSTALLED | **YES** (owner, 2026-11-27 06:06Z; crontab == proposed file; server TZ UTC) |
| BACKUP_SCHEDULE_VERIFIED | **PENDING** — until 2026-11-28 02:45Z backup and 2026-11-29 04:30Z weekly restore both succeed (`docs/ops/backup-restore.md`) |
| MJU SSO | **LIVE (owner pilot, 2026-11-27)** — `MJU_SSO_ENABLED=true`, adapter rc.6, `citizenID` HMAC, one approved link (existing admin user); local login unchanged. Record, container-DNS fix and rollback: `docs/ops/mju-sso-live-e2e.md` |

**Architecture (verified):** one VPS (VPS190, 10.1.245.190), one CMS runtime (`rae-cms-runtime`, 127.0.0.1:3317), one database (`rae_cms` in
`rae-cms-db`). Two renderers of the same code: `rae-digital-next` (127.0.0.1:3417, root build, admin host `rae-cms.raemanagemju.net` via the
Cloudflare Tunnel, noindex) and `rae-digital-landing` (127.0.0.1:3418, `/rae-landing` build, canonical `https://raeservice.mju.ac.th/rae-landing/`
via host nginx). The CMS hook notifies both. Persistence is the hand-written MySQL repository (ADR-0006). Files stay in Microsoft 365 (ADR-0004).

**Deploy system:** symlink-based releases (`~/rae/releases/<sha> → ~/rae/current`). Containers mount `~/rae/current:/app`. Verified with `readlink ~/rae/current`, not `docker inspect` SHA. Backups: `~/rae/rae-cms-backups/pre-*` + nightly `daily/`. Static landing backup: `~/rae/rae-landing-static-backup/`.

**Migrations on `rae_cms`:** 001–005, 007, 008 (SSO links/handoffs), 009 (documents), 010 (link health), 011 (knowledge/FAQ), 012 (events), 013 (contact inbox), 014 (analytics), 015 (announcements), 016 (departments), 017 (personnel). DDL applied by hand with root inside DB container after backup. **No schema_migrations tracking table** — verify migrations by comparing file names vs actual table names in DB.

## 2026-11-27 Deploy Summary

All modules shipped today (PRs #124–#140): M22 backup fix + restore verification · M04 Knowledge/FAQ (CMS-backed, hidden while empty) · M05 Events/calendar (.ics export per event + feed RFC 5545, pagination 10/page) · M06 Search relevance ranking (title > body, exact codes first) · M07 Contact form (dark until CONTACT_* config set; SMTP not built) · M08 Analytics (cookieless, off unless ANALYTICS_ENABLED; check:a11y gate) · M17 Announcements (banner/popup/ticker, server-enforced expiration) · M18 Desk dashboard (counts per module, upcoming/live/broken, recent activity) · M13 Departments/org structure (parent/child tree max 4 levels) · M23 OpenAPI description + contract test (7 public GET endpoints) · a11y fixes (#138: duplicate landmarks, dark contrast) · release tooling (#140: isolated builds, spare-port probe, health-checked switch). cutover measured 2.4 s downtime (vs ~8 min before).

Known gaps: withdrawn.json contains test entries (uat-withdraw-0 through -7, news test ids) — should be cleared before production sign-off. sitemap 164 `<loc>` (up from 152 yesterday). Test audit rows intentionally kept for integrity. crontab guard prevented automated backup cron updates (operator must verify manually).

**2026-11-27 (PRs #124–#127):** M22 backup fixed + restore-verified; M04 FAQ (`/knowledge#faq`, hidden while empty); M05 CMS events on `/news/events` (section absent while none); M06 relevance ranking. All start empty — no content seeded. Tables are empty in production after acceptance tests (records and audit rows removed).
**2026-11-27 later (PRs #129–#131):** events archive 10/page; M07 contact form + CMS FAQ on `/contact` (form **off** until owner sets privacy notice + retention — `docs/ops/contact-form.md`; SMTP not built, no MJU details); M08 cookieless analytics (**off** until `ANALYTICS_ENABLED` — `docs/ops/analytics.md`) + `check:a11y`. Test audit rows are no longer deleted (audit integrity); earlier acceptance runs removed their own test audit rows under that day's scope.
**2026-11-27 evening (PRs #133–#138):** M05 `.ics` (per event + feed), M17 announcements, M18 desk dashboard, M13 departments, M23 OpenAPI (`/cms-api/v1/public/openapi.json`), axe browser runner (`scripts/axe-live.mjs`; 13 live pages × light/dark × desktop/phone = 0 violations; re-run with live CMS content found and fixed dark-mode contrast + duplicate landmark names). Skipped as externally blocked: M15 (no storage target, ADR-0004), M12 (PDPA basis A-4). Contact, analytics, SSO still off.
**Build note:** export builds (`npm run build:export`) must NOT run in this tree — they wipe `.next` (it broke the admin host for minutes); use a separate clone. Site builds now set `RAE_CMS_API=http://127.0.0.1:3317` at build time (the layout fetches announcements, host build otherwise times out on the container hostname).
**Backup cron:** installed by the owner 2026-11-27 06:06Z; schedule verification pending first scheduled runs (`docs/ops/backup-restore.md`).

**Owner decision 2026-11-27 — M12 Personnel APPROVED.** Gate A-4 (PDPA basis/retention) is removed as a development blocker; the owner assumes personnel-data governance, no third-party approval is required. Built: personnel directory + encrypted restricted data + RBAC + audit, M13 head-of-unit (`docs/ops/personnel.md`). Verified data only; nothing seeded. RBAC, public/private separation and audit integrity are tested.
**Stabilization 2026-11-27 (PRs #140–#146):** releases, M05 month view, M17 landmark names, M12 personnel + M13 head of unit. Live acceptance of M12 caught and fixed a real defect (duplicate national id overwrote another person's restricted row — PR #146, DB-backed regression test). Measured downtime per switch ≈ 2.4–4 s (container restart); with the runtime restart the visible window was 11–17 s. Rollback tested (switch back and forward, month route 404↔200). Axe: 0 violations on 24 runs (6 pages × light/dark × desktop/phone) with live records incl. identical announcement titles. Backup 04:56Z verified (17 tables restored). Backup cron since installed by the owner (see flags above).
**PERSONNEL_KEY:** `~/rae/rae-cms-secrets/personnel.key` (also in runtime.env). DB dumps hold ciphertext only — the owner must keep an offline copy of the key; a lost key cannot be recovered.
**Releases:** production now serves `~/rae/current` (SHA-tagged release dirs, isolated builds, spare-port probe, auto-rollback — `docs/ops/releases.md`). Measured cutover downtime 2.4 s (was ~8 min with in-place builds).

**Pending, owner-side:** M365 onboarding (no verified SharePoint link list exists yet; needs the list of existing SharePoint links; tool + guide ready); Cloudflare Access on `/th|en/cms-admin/*` (leave `/cms-api/*` open).
Full detail: `docs/reports/2026-11-25-day-closeout.md`. Handoff: `docs/memory/NEXT_SESSION.md`.
