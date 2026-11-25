# RAE Digital Platform — STATUS (2026-11-25, DAY_20261125_CLOSED)

| | |
|---|---|
| **GitHub `main`** | `5e64192` (docs-only after the last deploy; closeout docs land on top) |
| **Production runtime (deployed SHA)** | **`2d3a81b`** — CMS runtime and both site builds. Docs-only merges (#122 and the closeout) are deliberately **not** redeployed |
| RAE_UNIFIED_PLATFORM_READY | **YES** |
| M03_PRODUCTION_READY | **YES** |
| MJU SSO | **PENDING_EXTERNAL_APPROVAL** — built, deployed, `MJU_SSO_ENABLED=false` |

**Architecture (verified):** one VPS (VPS190, 10.1.245.190), one CMS runtime (`rae-cms-runtime`, 127.0.0.1:3317), one database (`rae_cms` in
`rae-cms-db`). Two renderers of the same code: `rae-digital-next` (127.0.0.1:3417, root build, admin host `rae-cms.raemanagemju.net` via the
Cloudflare Tunnel, noindex) and `rae-digital-landing` (127.0.0.1:3418, `/rae-landing` build, canonical `https://raeservice.mju.ac.th/rae-landing/`
via host nginx). The CMS hook notifies both. Persistence is the hand-written MySQL repository (ADR-0006). Files stay in Microsoft 365 (ADR-0004).

**Migrations on `rae_cms`:** 001–005, 007, 008 (SSO links/handoffs), 009 (documents), 010 (link health). DDL is applied by hand with root inside the DB container after a backup.

**Pending, owner-side:** M365 onboarding (needs the list of existing SharePoint links; tool + guide ready); MJU SSO — countersigned CMS C-14,
MJU SSO administrator's E2E authorisation + window; Cloudflare Access on `/th|en/cms-admin/*` (leave `/cms-api/*` open).
Full detail: `docs/reports/2026-11-25-day-closeout.md`. Handoff: `docs/memory/NEXT_SESSION.md`.
