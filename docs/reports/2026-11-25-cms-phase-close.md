# CMS technical phase — closed 2026-11-25

**Production baseline: `06436d0`** (CMS runtime and both site builds). Rollback points: previous SHAs and unit/env copies in
`~/rae/rae-cms-backups/pre-sso-*`; static landing in `~/rae/rae-landing-static-backup/` (`apply-rae-landing-cutover.sh rollback`).

| Area | State |
|---|---|
| CMS news lifecycle (draft → review → publish → revise → unpublish) | live, verified on admin host and canonical site |
| Canonical site `https://raeservice.mju.ac.th/rae-landing/` | Next.js, CMS-backed (cutover done); admin stays on `rae-cms.raemanagemju.net` |
| Public auth endpoints | per-client rate limits (cf-connecting-ip), per-account lockout, emergency local login verified |
| **MJU SSO** | **PENDING_EXTERNAL_APPROVAL** — built, deployed, disabled (`MJU_SSO_ENABLED=false`) |

SSO pending items (nothing is assumed or signed on anyone's behalf): countersigned CMS C-14 form, MJU SSO administrator's
E2E authorisation with a test window. Already in place: CMS risk acceptance (installed in the runtime adapter directory,
owner-approved 2026-11-25), blank forms and the E2E checklist (`docs/ops/mju-sso-e2e-pack.md` once merged,
`~/rae/ops/forms/`). Enabling is a flag flip + restart; rollback is the reverse. Open owner item: Cloudflare Access on `/th|en/cms-admin/*`.
