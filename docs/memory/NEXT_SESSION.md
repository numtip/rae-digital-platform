# Next session — RAE digital platform (closeout 2026-11-27, final) — Hermes handoff

**Deployed = `35cb73653153` (runtime + both site builds). GitHub `main` = `35cb736` + this closeout PR (docs only).** Read `docs/STATUS.md`, then
`docs/reports/2026-11-27-day-closeout.md` (§10 is the end-of-day state) and `docs/ops/mju-sso-live-e2e.md`, `docs/ops/media-library.md`.

State: one VPS (VPS190), one CMS runtime (`rae-cms-runtime`, 127.0.0.1:3317), one DB `rae_cms` (migrations 001–005, 007–018). Canonical site
`https://raeservice.mju.ac.th/rae-landing/` (3418); admin host `https://rae-cms.raemanagemju.net` (3417, noindex, Cloudflare Tunnel already maps it).
Shipped: news, M03 documents, M04 FAQ, M05 events/.ics, M06 ranking, M07 contact (off), M08 analytics (off), M12 personnel, M13 departments, M15 media
library (+ news picker), M17 announcements, M18 dashboard, M22 backup, M23 OpenAPI, shadcn/ui desks (toast + inline error + confirm), **MJU SSO live pilot**.

## Do not
- Switch SSO off or revoke the owner's link (a revoked link cannot be re-approved in the CMS; only `pending` can be approved). Rollback = `MJU_SSO_ENABLED=false` in `~/rae/rae-cms-secrets/runtime.env` + `systemctl --user restart rae-cms-runtime`.
- Remove `--add-host sso.mju.ac.th:10.1.254.54` from `~/.config/systemd/user/rae-cms-runtime.service` (the public address is unreachable from this host). Never disable TLS verification.
- Edit `/etc/cloudflared/config.yml` (dashboard-managed), run nginx/sudo, or edit cron (operator only).
- Build deploys anywhere but through `scripts/ops/release.sh` (the dev tree no longer serves, so `build:export` there is safe, but it is not a deploy).
- Put the private adapter, a citizen id, the C-14/D-5 form or any secret in the public repo. The signed form lives in `~/rae/rae-cms-secrets/` (sha in `c14-cms-countersign.sha256`).
- Merge a PR without the owner naming its number (the auto-mode guard blocks `gh pr merge` otherwise). Strict branch protection: update the branch first (`gh api -X PUT repos/numtip/rae-digital-platform/pulls/N/update-branch`).

## How to deploy (unchanged)
`scripts/ops/release.sh build <sha>` → (`runtime <sha>` if `cms-runtime/` or `lib/cms/` changed; apply new migrations first, after a dump to `~/rae/rae-cms-backups/pre-<name>-<ts>/`) → `switch <sha>`; `rollback`, `status`. Node 22 from `~/.nvm` (default `node` is v12). `check:export` needs `NEXT_PUBLIC_SITE_URL=https://numtip.github.io/rae-digital-platform`.

## Verify first thing
1. `~/rae/rae-cms-backups/backup.log` tail after **2026-11-28 02:45Z** (nightly) and the weekly restore verification after **2026-11-29 04:30Z** → then `BACKUP_SCHEDULE_VERIFIED = YES`.
2. `scripts/ops/release.sh status` shows serving = runtime = `35cb73653153`; `curl 127.0.0.1:3317/v1/sso/status` → `{"enabled":true,…}`.

## Priorities (in order)
1. **Owner-side, still deferred:** M365 onboarding (needs the SharePoint link list; `scripts/import-m365-links.mjs` is ready) and Cloudflare Access on `/th|en/cms-admin/*` (leave `/cms-api/*` open). `PERSONNEL_KEY` offline copy = owner task.
2. **Code-reuse for the other modules:** FAQ, events, announcements, departments, documents, personnel still assign `MAX(code)+1` (a deleted row frees its code). Apply the M15 rule (max of rows and audit trail) if the owner wants audit-proof codes everywhere.
3. **Commit the desk acceptance script** (headless Chromium + axe over CDP; today's was one-off in the session scratchpad: seed UITEST rows through the API, drive confirm/keep/confirm, assert toast + inline error, axe light/dark with a toast on screen, then SQL cleanup). CI cannot see the admin page, so this is the only guard for desk a11y.
4. **Show library images on public pages** (M15 is API/desk only; the public site does not render them yet) and personnel-desk browser test.
5. **Phase 2 content completion** per the Blueprint: homepage statistics (M02, labelled sample data until the owner supplies sourced figures), more pages, search improvements; M10 Entra OIDC/MFA only if the owner wants it (ADR-0003 still Proposed).

## Gotchas learned
- Browser/static checks are blind to the admin page; test it in a real browser (found the dark-mode contrast bug and the toast tint that way).
- `audit_logs.id` is a UUID — do not order by it. Test rows deleted by SQL leave audit rows; codes of modules other than M15 can then repeat.
- This host cannot resolve `rae-cms.raemanagemju.net` or reach the public MJU address; use `curl --resolve rae-cms.raemanagemju.net:443:172.67.192.188` and the internal SSO address.
- `schema_migrations` does not exist on the production DB; track migrations by file name vs tables. A disposable `mariadb:10.6` container with all migrations is the test bed for DB-backed tests (`RAE_CMS_DB_HOST=127.0.0.1 RAE_CMS_DB_PORT=13399 …`).
- Agent Core identity = `rae-digital-platform`, advisory only. Obsidian is unreachable from this host: sync notes are staged in `~/docs/ops/AI-OS/`.
