# Next session — RAE digital platform (closeout 2026-11-25) — Hermes handoff

**Deployed = `2d3a81b`. GitHub `main` = `5e64192` + closeout docs (docs only, not redeployed).** Read `docs/STATUS.md`, then `docs/reports/2026-11-25-day-closeout.md`.

State: one VPS (190), one CMS, one DB `rae_cms`. Canonical site `https://raeservice.mju.ac.th/rae-landing/` = CMS-backed Next (3418); admin/API host `https://rae-cms.raemanagemju.net` (3417, noindex). News + M03 Document Center verified live on both. RAE_UNIFIED_PLATFORM_READY=YES, M03_PRODUCTION_READY=YES.

Do not: enable MJU SSO (needs countersigned CMS C-14 + MJU admin E2E authorisation, nothing assumed or signed for anyone), edit `/etc/cloudflared/config.yml` for routing (dashboard-managed), run nginx/sudo or merge PRs without the operator's explicit say-so, put the private adapter or any citizen id/secret in the public repo, run `cms-runtime/rollback.sql` on `rae_cms`.

Next, in order: (1) get the SharePoint link list → `scripts/import-m365-links.mjs` dry run → drafts → publisher review; (2) on receipt of the two SSO approvals: set `NODE_ENV=production`, `MJU_SSO_ALLOW_UNVERIFIED_CONTRACT=true`, `MJU_SSO_OWNER_RISK_ACCEPTANCE=/opt/mju-sso/risk-acceptance.json`, `MJU_SSO_LAWFUL_BASIS_APPROVED=true`, `MJU_SSO_ENABLED=true` in `~/rae/rae-cms-secrets/runtime.env`, restart `rae-cms-runtime`, run `deploy/production/sso-e2e-preflight.sh`, support owner E2E (`prinya`, admin); (3) Cloudflare Access on the admin pages; (4) next Phase 2 modules.

Deploy recipe and rollback points: closeout report §4 and the staging handoff. Agent Core (`rae-digital-platform` identity) is advisory only.
