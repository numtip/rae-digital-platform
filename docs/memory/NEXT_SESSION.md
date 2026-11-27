# Next session — RAE digital platform (closeout 2026-11-27) — Hermes handoff

**Deployed = `8a61dfc` (release tooling, symlink system). GitHub `main` = `cb64016` (+ docs PR #145).** Read `docs/STATUS.md`, then `docs/reports/2026-11-27-day-closeout.md`.

State: one VPS (VPS190), one CMS runtime, one DB `rae_cms`. Canonical site `https://raeservice.mju.ac.th/rae-landing/` = CMS-backed Next (3418); admin host `rae-cms.raemanagemju.net` (3417, noindex, Access still open). News + M03 Document Center + M04 Knowledge/FAQ + M05 Events/.ics + M06 ranking + M07 contact (dark) + M08 analytics (dark) + M13 departments + M17 announcements + M18 dashboard + M23 OpenAPI + M12 personnel directory — all **deployed**. sitemap **164 loc**. Deploy via symlink (`~/rae/current → releases/<sha>`), cutover 2.4 s.

Do not: enable MJU SSO (needs CMS C-14 + MJU admin E2E authorisation; nothing assumed or signed for anyone), edit `/etc/cloudflared/config.yml` (dashboard-managed), run nginx/sudo or merge PRs without operator approval, put private adapter/citizen id/secret in public repo, run `cms-runtime/rollback.sql` on `rae_cms`, deploy code-only changes automatically (docs-only merges do NOT redeploy).

## Pending next steps (in order)
1. **M365 onboarding** — get SharePoint link list → `scripts/import-m365-links.mjs` dry run → drafts → publisher review (unlocks M03 real documents)
2. **Clear withdrawn.json test data** — uat-withdraw-0 through -7 + news test ids残留 in `~/rae/rae-cms-data/withdrawn.json`
3. **Cloudflare Access** on `/th|en/cms-admin/*` (leave `/cms-api/*` open for SSO routes + local login)
4. **Backup schedule verification** — `BACKUP_CRON_INSTALLED=YES` (owner, 06:06Z, TZ UTC), `BACKUP_SCHEDULE_VERIFIED=PENDING`. Check `tail -2 ~/rae/rae-cms-backups/backup.log` after 2026-11-28 02:45Z (`backup ok`) and `tail -3 ~/rae/rae-cms-backups/restore-verify.log` after Sun 2026-11-29 04:30Z (`restore verification OK`); only then set VERIFIED=YES. Legacy dead cron entries (`backup_db.sh`, `kri_collect.sh`) are the owner's call. No cron changes by the agent.
5. **Owner approves M15 media library storage target** (ADR-0004 keeps master files in SharePoint)
6. **Phase 2 content completion** — more pages, search improvement, etc. per Blueprint

Agent Core identity = `rae-digital-platform`, advisory only. CRITICAL: `schema_migrations` table does NOT exist on production DB — track migrations by comparing file names vs actual tables only. Test audit rows intentionally kept for integrity.
