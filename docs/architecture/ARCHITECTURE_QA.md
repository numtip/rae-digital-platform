# ARCHITECTURE_QA.md
### Verification, corrections and residual risk for the RAE Digital Platform architecture package

| | |
|---|---|
| **Date** | 2026-10-24 |
| **Gate requested** | `RAE_ARCHITECTURE_READY_FOR_REVIEW` |
| **Gate status** | **PASS WITH DECLARED BLOCKER** — `PROJECT_ENROLLMENT_REQUIRED` (A-0). Everything else is ready for owner review. |
| **Deliverables verified** | `LEGACY_REUSE_ASSESSMENT.md` · `RAE_PLATFORM_ARCHITECTURE.md` · `MODULE_REQUIREMENTS_MATRIX.md` · `DESIGN_SYSTEM_RECONCILIATION.md` · `DATABASE_AND_API_BLUEPRINT.md` · `DEVELOPMENT_ROADMAP.md` |

---

## 1. Gate status

| Gate | Status | Evidence |
|---|---|---|
| **A-0 — dedicated Agent Core identity** | ❌ **BLOCKED** | `agent_core_capabilities` with `project: "rae-nextjs-main"` returned: *“Project "rae-nextjs-main" has no configured Agent Core token. Configured: a different, non-RAE project identity.”* Only one identity exists, it belongs to another project, and it was **not** used. Reported as `PROJECT_ENROLLMENT_REQUIRED` as instructed. |
| **REA/browser evidence** | ✅ | The prior session's REA `inspect_web_page` envelope (`ev_6c6b67a2…`) and the measured probes remain in `EVIDENCE/`. This session added no new web observations — none were needed for an architecture decision. |
| **Repository inspection** | ✅ | Two shallow clones at pinned commits (`114b3b5d`, `805a1dea`); static reads only. |
| **No production impact** | ✅ | No deploy, no DNS, no Cloudflare, no VPS, no credential, no upstream write. |
| **`RAE_ARCHITECTURE_READY_FOR_REVIEW`** | ✅ with blocker | This document. |

**Consequence of A-0:** architecture decisions in this package rest on local code inspection and previously verified audit evidence, **not** on Agent Core routing or the knowledge fabric. Nothing here depends on a routed model choice, so the blocker does not invalidate the design — it invalidates only the *audit trail* for those calls. Enrol a dedicated project before implementation so decisions can be logged against the right identity.

---

## 2. What was actually executed

| Action | Detail | Evidence |
|---|---|---|
| Agent Core probe | `agent_core_capabilities` with an explicit project name | error string quoted above |
| Repository metadata | `gh repo view` on both repos | public, default `main`, pushed 2026-07-23 / 2026-05-19 |
| Shallow clones | `git clone --depth 1` → `_sources/` | commits `114b3b5d`, `805a1dea` |
| Static inspection | `package.json`, `next.config.ts`, route/component trees, tokens, SEO/i18n helpers, Document Center feature, API handlers, CI workflows, `docs/` | ~60 file reads + repo-wide searches |
| Design prototype | `StitchCode.MD` (single-file Stitch page) compared with the React port | header colour, section set, heading semantics, asset hosts |
| Contrast verification | `tools/contrast_stitch.py`, `tools/contrast_reconcile.py` | `EVIDENCE/notes/contrast_stitch_tokens.txt`, `contrast_reconciliation.txt` |
| Independent QA | Two review subagents: fact-check vs repo (14 claim groups) and cross-document consistency (12 checks) | findings summarised in §3 |
| Third design source | `StitchCode.MD` read and compared against the React port (header colour, section set, heading semantics, asset hosts) | `LEGACY_REUSE_ASSESSMENT §5.7`, `DESIGN_SYSTEM_RECONCILIATION` C-15…C-17 |

> `_sources/` holds two shallow clones (65 MB incl. `.git`) pinned at the audited commits. They exist so any claim in this package can be re-checked; they are **not** deliverables and may be deleted without affecting anything above.

**Not executed (and therefore not claimed):** `npm install`, `next build`, `next start`, any database DDL, any browser run against the clone, any deployment, any external network call from the cloned code, any MS Graph or SSO call.

The “static export vs API routes” contradiction was established from `next.config.ts`, the six `route.ts` files, `DEPLOYMENT.md`, `.github/workflows/pages.yml` and the repo’s own `docs/reports/PREVIEW_PLATFORM_REPORT.md:97` — **not** from attempting a build. A build may still fail for other reasons `[U]`.

---

## 3. QA findings and corrections

Two independent passes were run. **5 factual mismatches** and **24 consistency findings** were raised; all were addressed (some were errors, some were ambiguities that are now explicit).

### 3.1 Fact-check corrections (5)

| # | Finding | Correction |
|---|---|---|
| 1 | Claimed all 6 `api/research` handlers parse `request.url` | `filters/route.ts` returns static options only. Text now says “five of six parse `searchParams`” |
| 2 | §5 quoted `#374151` / `#4B5563` as if they were repo tokens | They are Tailwind **v3** palette values; the repo runs Tailwind 4.2.4. Row now says “Tailwind palette (resolves to ~`#364153` / ~`#4A5565`) — palette class, not a token” |
| 2b | `StitchCode.MD` was not in the first review pass (it appeared mid-session) | Added as a **third design source** in `DESIGN_SYSTEM_RECONCILIATION §1` with conflicts **C-15…C-17**: dark vs white header, 7 vs 8 sections, heading semantics. Decisions recorded rather than merged |
| 3 | Phase durations totalled “35–40 weeks” | Arithmetic gives **35–39**; corrected in the roadmap |
| 4 | `docs/contracts/*` counted as 6 | There are **7** contract files; corrected |
| 5 | “26 functional areas” for `exitfull.txt` | The file has **31 `⸻` separators / ~30 capability blocks**. Both documents now avoid a contested section count and point to the 30 traced rows in the matrix instead |

### 3.2 Consistency corrections (24)

| # | Issue | Resolution |
|---|---|---|
| 1 | Nav claimed “identical to the prior blueprint” but differed | Rewritten; the earlier `RAE_REDESIGN_BLUEPRINT §3.2` is explicitly **superseded** (systems/documents moved to the utility bar) |
| 2 | Layer C table listed 10 capabilities vs 7 modules | Table now carries **module IDs** and states that M05/M16/M19 are counted in layers A/B; the matrix is the authoritative partition |
| 3 | “26 modules” in risk R6 | → **29** |
| 4 | `exitfull.txt` count mismatch | → avoid a contested section count: “31 `⸻` separators / ~30 capability blocks”, with the 30 traced rows in the matrix as the canonical inventory |
| 5 | M07 depended on M36 (phase 3) while shipping in phase 2 | Dependency changed to **mail transport via M20 settings** |
| 6 | M19 depended on M30–M35 (later phases) | Dependency changed to “M14, M16, M35 — each module ships its own report” |
| 7 | M13 (phase 1) required a personnel FK from M12 (phase 2) | `head_personnel_id` is nullable until M12; deletion rule enforced once M12 is live |
| 8 | Phase 1 deliverable listed the backup job (M22, phase 2) | Phase 1 now delivers the **job runner**; the backup job stays in M22 |
| 9 | “All seven gates” vs A-0…A-7 | → **eight** |
| 10 | Phase 1 claimed independence from A-2 while shipping Stitch tokens | Reworded: tokens are Phase 1; **A-2 only affects Phase 2 section composition** |
| 11 | 96 pw vs 35–39 weeks looked inconsistent | Added the capacity calculation (≈3.6 FTE ≈ 126 pw against ≈115 pw of work) and the caveat for a single developer |
| 12 | “12 critical journeys” but 8 named | All **12** are now named |
| 13 | Gold hover `#C79318` in the inventory vs `#E3AF2F` in tokens | New conflict **C-13**: darkening the gold breaks AA (4.37:1), so hover **lightens** to `#E3AF2F` (5.98:1) |
| 14 | “One value per role” violated by `--text-muted` (two hexes) | Split into `--text-muted` (white) and `--text-muted-on-warm` (ivory), the single sanctioned per-surface override; `--brand` alias defined |
| 15 | Dark theme had no control border ≥ 3:1 | Added `--d-border-control: #5E7A6B` (3.64:1 on `#0F1F18`, 3.26:1 on `#16291F`) |
| 16 | Earlier blueprint still declared `#017F3F` | New conflict **C-14** states this document supersedes `RAE_REDESIGN_BLUEPRINT §7.1` |
| 17 | “5 news categories from the audit” had the wrong citation | Now cites `EVIDENCE/notes/rae_home_outline.txt` and says **4 categories + an “all” view** |
| 18 | Missing tables for work history, contact submissions, analytics, KPI stats, user photo | Added `personnel_work_history`, `contact_messages`, `analytics_events`, `kpi_stats`, `users.photo_media_id` → **58 tables** (was 54) |
| 19 | `correspondence.file_media_id` implied local file storage, against C5 | Replaced with `storage_url` + `external_ref` and a SharePoint-host constraint |
| 20 | Admin endpoints written `/admin/*` but the edge guard matched `/api/v1/admin/*` | All admin endpoints and Swagger normalised to `/api/v1/admin/*` |
| 21 | Matrix said “opaque bearer tokens” while the DB doc said JWT | One decision: **JWT access (15 min) + revocable refresh token**, opaque sessions for humans |
| 22 | CSP allowed `img-src https:` (any host) | Allow-list restricted to `'self'`, `data:`, and the media host; `object-src`, `form-action`, `frame-src` added |
| 23 | `super_admin` added silently; `director` implied private-HR access | Deviation recorded in the matrix §6; `director` explicitly excludes `personnel_private:*` and `audit:delete`; MFA list includes `super_admin` |
| 24 | M32 “no duplicate booking store” vs a `room_bookings` table | `room_bookings` is now documented as a **fallback mirror** that stays empty while the external system is authoritative |

### 3.3 Documented, not “fixed” (deliberate)

- **`REA_REDESIGN_BLUEPRINT.md §7.1` was left unedited** and marked superseded instead, so the audit trail of the earlier decision survives. Editing history to match a later decision would destroy the evidence.
- **`TECHNICAL_OPTIONS.md` Phase 0** (refactor the live WTMS theme) was left in place with a dated supersession note at the top, for the same reason.
- **`QA_REPORT.md`** carries a dated status update on the Agent Core gate rather than a silent rewrite.
- The **Layer C capability table** intentionally lists capabilities that are *counted* in other layers; a footnote makes the counting rule explicit.

---

## 4. Requirements traceability

`exitfull.txt` → module → phase. The authoritative mapping is `MODULE_REQUIREMENTS_MATRIX.md §5` (30/30 blocks assigned, 0 unowned). Summary:

| Requirement family | Modules | Phase | Class |
|---|---|---|---|
| Public website, SEO, search, documents, events, contact | M01–M08 | 1–2 | BUILD (Stitch V2 visual reused) |
| Identity, users, roles, departments, media, settings, audit | M10, M11, M13, M15, M20, M21 | 1 | BUILD (SSO hybrid) |
| Content CMS, personnel, announcements, dashboard, backup, API | M12, M14, M17, M18, M22, M23 | 2 | BUILD (personnel hybrid) |
| Correspondence, reports, vehicles, rooms, complaints, notifications | M16, M19, M31, M32, M35, M36 | 3 | BUILD + INTEGRATE |
| Assets, dynamic forms | M30, M34 | 4 | HYBRID / BUILD |
| AI assistance | M37 | 5 | DEFER |

Counts verified: **29 modules** = 23 BUILD + 2 INTEGRATE + 3 HYBRID + 1 DEFER; priorities **P0 14 / P1 11 / P2 4**; phases **7 / 13 / 6 / 2 / 1**.

---

## 5. Numbers a reviewer should be able to re-derive

| Quantity | Value | How to check |
|---|---|---|
| Modules | 29 | count M01–M08 + M10–M23 + M30/M31/M32/M34/M35/M36/M37 |
| Tables | 58 | 10 + 6 + 11 + 5 + 8 + 9 + 9 in `DATABASE_AND_API_BLUEPRINT §3` |
| Public components reconciled | 19 groups | `DESIGN_SYSTEM_RECONCILIATION §6.1` (Document Center = 1 group of 7) |
| Admin components new | 13 | `DESIGN_SYSTEM_RECONCILIATION §6.2` |
| Reusable assets ported | 12 | `LEGACY_REUSE_ASSESSMENT §6` |
| Effort | 96 pw → ≈115 with 20 % | `DEVELOPMENT_ROADMAP §3`, rows and columns both total 96 |
| Calendar | 35–39 weeks | 2–3 + 6 + 8 + 6 + 6 + 4–6 + 3–4 |
| Architecture scores | 4.45 / 3.65 / 3.35 | weights 25/20/20/15/10/10 = 100 |
| Contrast pairs | 26 computed | `EVIDENCE/notes/contrast_*.txt` |

---

## 6. Residual unknowns (must be closed before or during Phase 1)

| # | Unknown | Owner | Effect if unresolved |
|---|---|---|---|
| U-1 | Node runtime permitted publicly; CPU/RAM/disk | MJU IT | Option 1 invalid → fall back to Option 2 |
| U-2 | MySQL or MariaDB, exact version, ngram support | MJU IT | search strategy and migration syntax |
| U-3 | Entra ID OIDC contract, redirect URIs, group claims | MJU IT | SSO blocked → local-only accounts |
| U-4 | WTMS data-export cooperation (read-only manifests) | RAE + vendor | content migration becomes manual |
| U-5 | PDPA basis for the personnel directory; retention | RAE + legal | M12 cannot ship |
| U-6 | Which systems own assets / rooms / vehicles | RAE + IT | duplicated modules (R7) |
| U-7 | Photo/asset rights for heroes and staff images | RAE | launch blocker |
| U-8 | Budget envelope and procurement route | RAE director | scope, not architecture |
| U-9 | Backup target and TLS ownership | MJU IT | DR plan incomplete |
| U-10 | Agent Core project enrolment | platform owner | audit trail non-authoritative (A-0) |

---

## 7. What was explicitly **not** done

- No implementation, scaffolding, `package.json`, schema file, migration, seed or code of any kind was created in the platform sense. `tools/*.py` and `EVIDENCE/*` are analysis artefacts only.
- No dependency was installed; no build, test, lint or typecheck was run against either clone.
- No database was created or altered; the ER model is paper-only.
- No deployment, DNS, TLS, Cloudflare, VPS, credential or repository change.
- No upstream repository was modified, forked, pushed to, or opened as a PR.
- No Microsoft 365, SharePoint, Graph, SSO or ERP endpoint was called.
- No claim of accessibility conformance, performance achievement or security certification is made for a system that does not yet exist; the numbers are **targets**, and the contrast values are **design-token computations**.

---

## 8. Review checklist for the owner

1. Confirm **A-2** (Stitch V2 as baseline) — repo docs claim V6 supersedes V2.
2. Confirm **Option 1** (modular monolith) against hosting reality (A-1).
3. Approve the **7-section public IA** and the demotion of systems/documents to the utility bar.
4. Approve the **module classifications**, especially the five `INTEGRATE` decisions (rooms, vehicles, assets, HR directory, SSO) — the whole point is to avoid rebuilding what RAE already runs.
5. Approve the **58-table model** at the domain level; detailed columns can still change.
6. Approve the **Phase 1 scope** (foundation only, no public content yet).
7. Accept or reject the **`super_admin`** addition.
8. Note that the **legacy site stays untouched**; no WTMS Phase 0 refactor.

**Verdict: `RAE_ARCHITECTURE_READY_FOR_REVIEW` — with A-0 blocked and ten unknowns declared.**
