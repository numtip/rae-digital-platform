# Next session — RAE digital platform (closeout 2026-11-27) — Hermes handoff

**Deployed = `8a61dfc` (release tooling, symlink-based: `~/rae/current -> releases/<sha>`). GitHub `main` = `bfdae97` (+ docs only).** Read `docs/STATUS.md`, then `docs/reports/2026-11-27-day-closeout.md`.

State: one VPS (VPS190), one CMS runtime, one DB `rae_cms`. Canonical site `https://raeservice.mju.ac.th/rae-landing/` = CMS-backed Next (3418); admin host `rae-cms.raemanagemju.net` (3417, noindex, Access still open). News, M03 Document Center, M04 Knowledge/FAQ, M05 Events/.ics, M06 ranking, M07 contact (dark), M08 analytics (dark), M13 departments, M17 announcements, M18 dashboard, M23 OpenAPI — all **deployed via new symlink system**. sitemap **164 loc**.

Done 2026-11-27 (PRs #124–#140): M22 backup fix · M04 knowledge+FAQ · M05 events+pagination+.ics · M06 search ranking · M07 contact form (off until config) · M08 analytics (off until flag) + a11y gate · M17 announcements · M18 desk dashboard · M13 departments · M23 OpenAPI + contract test · a11y fixes · release tooling (symlink deployments). Skipped: M15 (ADR-0004), M12 (PDPA A-4).

Do not: enable MJU SSO (needs CMS C-14 + MJU admin E2E authorisation; nothing assumed or signed), edit `/etc/cloudflared/config.yml` (dashboard-managed), run nginx/sudo or merge PRs without operator approval, put private adapter/citizen id/secret in public repo, run `cms-runtime/rollback.sql` on `rae_cms`, deploy code-only changes automatically (docs-only merges do NOT redeploy).

Deploy system: **symlink releases** (`~/rae/releases/<sha> -> ~/rae/current`). Containers mount `~/rae/current:/app`. SHA verified with `readlink ~/rae/current`. Backups in `~/rae/rae-cms-backups/pre-*`. Static landing backup in `~/rae/rae-landing-static-backup/`.

Pending owner-side: (1) get SharePoint link list → `scripts/import-m365-links.mjs` dry run → drafts → publisher review; (2) receive two SSO approvals (CMS C-14 countersigned + MJU admin E2E window); (3) Cloudflare Access on admin pages (not /cms-api/*); (4) cleanup withdrawn.json test data; (5) verify backup cron path.

Deploy recipe: change symlink to target SHA, stop containers (systemctl --user disable rae-digital-{next,landing}-staging), update symlink, start containers. Rollback: symlink to previous SHA.

Agent Core identity = `rae-digital-platform`, advisory only. CRITICAL: schema_migrations table does NOT exist on production DB — track migrations by file names vs actual tables only. Test data残留 в withdrawn.json needs clearing.
