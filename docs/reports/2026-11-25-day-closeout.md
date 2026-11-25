# RAE Digital Platform — DAY_CLOSEOUT 2026-11-25

**Result:** `DAY_20261125_CLOSED` · `RAE_UNIFIED_PLATFORM_READY = YES` · `M03_PRODUCTION_READY = YES` · MJU SSO `PENDING_EXTERNAL_APPROVAL`

**GitHub `main` and the deployed SHA are different things.** Production runs **`2d3a81b`** (PR #121). `main` is later only by documentation
(#122 `5e64192`, then this closeout); documentation-only changes are not redeployed.

## 1. What shipped (merged PRs, all CI-green)
| PR | What |
|---|---|
| #106 | Desk revise/unpublish; `AGENTS.md` licence test; staging handoff |
| #108 (+#107) | MJU SSO (disabled), approved identity links, handoff exchange, rotation, POST+CSRF logout; migration 008; ADR-0006 (MySQL repository, no Prisma) |
| #109–#111 | SSO production-state docs; CI runs SSO tests against the private adapter with a read-only deploy key; durable attempt store; CMS C-14 / risk-acceptance drafts |
| #112–#113 | One-rule cloudflared ingress script (superseded in practice: routing is dashboard-managed); SSO E2E preflight |
| #114 | People Hub-style split sign-in |
| #116 | `/rae-landing` sub-path build (`NEXT_SERVER_BASE_PATH`/`NEXT_DIST_DIR`), noindex admin host, multi-renderer revalidate; nginx cutover files |
| #117 | Per-client rate limits (local login 30/min, SSO login/callback 20, exchange 30), keyed on `cf-connecting-ip` only |
| #118–#122 | M03 Document Center: registry, counted open/redirect, versions, search, pagination, link health (background, single-flight), detail pages, sitemap, import tool, onboarding guide; migrations 009–010 |
Open and stale (not part of today's deploy): #115 (SSO approval pack, docs), #98 (2026-11-02 memory note).

## 2. Verified production topology
VPS190 only. `raeservice.mju.ac.th` → nginx → static landing **replaced** by `rae-digital-landing` (3418) at `/rae-landing/`; desk URLs there redirect to
`rae-cms.raemanagemju.net`; `/rae-landing/cms-api/` and the revalidate route return 404; only media and the counted document open route are proxied.
`rae-cms.raemanagemju.net` → Cloudflare Tunnel `b2bc13f9…` (route set in the dashboard — the tunnel is remotely managed, local `config.yml` edits do not take effect) → 3417.
`sso.raemanagemju.net` (reference consumer, 3330) and VPS237 (Agent Core) untouched. Registered SSO callback: `https://rae-cms.raemanagemju.net/cms-api/v1/sso/callback`.

## 3. Acceptance results
- **Canonical lifecycle (news):** draft hidden → publish → revise → republish → unpublish, with list, detail, search and sitemap correct on both renderers, immediately.
- **M03 on the canonical URL:** register, draft hidden, publish (TH/EN pages, category, sitemap, search), counted open 302 to SharePoint, counter, new version (history 2.5/2.0/1.0),
  obsolete (page, category, sitemap, open all gone), pagination (52 records → 50 + control), bad link refused; browser test of the new-version form passed.
- **Security checks:** per-reader and per-account limits verified in production; Cloudflare rejects forged `cf-connecting-ip` (403); redirect target comes only from the CMS record on the SharePoint host; emergency local login works.
- All disposable records, audit rows and tombstones were removed.

## 4. Backups and rollback points
`~/rae/rae-cms-backups/`: `pre-deploy-20261125T054232Z`, `pre-sso-20261125T064323Z`, `pre-m03-20261125T084143Z`, `pre-m03b-20261125T084907Z` (each: `rae_cms.sql.gz`, previous SHAs, unit/env copies where changed), plus nightly `daily/`.
Static landing: `~/rae/rae-landing-static-backup/` (tarball + original include). Canonical rollback: `sudo bash deploy/production/apply-rae-landing-cutover.sh rollback`.
SSO rollback: `MJU_SSO_ENABLED=false` + restart (it already is). Code rollback: check out the previous SHA in `~/rae/rae-cms-runtime/app` and rebuild both site builds (see `docs/reports/2026-11-25-cms-staging-handoff.md`); migrations 008–010 are additive and can stay.

## 5. Pending (external / owner)
1. **M365 onboarding** — need the list of existing SharePoint file links; `scripts/import-m365-links.mjs` + `docs/ops/m03-onboarding.md` ready (dry run, drafts only).
2. **MJU SSO** — countersigned CMS C-14 (sha256 only), MJU SSO administrator's E2E authorisation with window; CMS risk acceptance already installed (owner-approved 2026-11-25); forms at `~/rae/ops/forms/`. Then enable, owner E2E with CMS user `prinya` (admin); restricted-role E2E later.
3. **Cloudflare Access** on `/th|en/cms-admin/*`; leave `/cms-api/*` open (SSO routes, local login).
4. Not done by design: SSO enabled, per-document import of real documents, M06 personnel search.

## 6. Notes for the next engineer
- Builds: root build to `.next`, landing build to `.next-landing`; both must be rebuilt after a code change; stop the units first and clear `route-cache` (root-owned files from the container) via a throwaway container.
- First request after a restart may serve a stale ISR copy (sitemap/list); a second request is fresh. Open counts on cached pages lag up to 60 s.
- Cloudflare blocks default script user-agents (403); use a browser UA in tests.
- Merging and sudo were gated by the operator each time; do not assume standing approval.
