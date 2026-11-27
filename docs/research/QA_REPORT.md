# QA_REPORT.md
### Verification record for the RAE redesign blueprint package

> **Status update (later session, 2026-10-24):** the `AGENT_CORE_CONNECTED` gate claimed below was true for the identity that was configured at the time. A subsequent directive required a **dedicated RAE project identity**, and re-verification returned **`PROJECT_ENROLLMENT_REQUIRED`** — the only enrolled project is `a different, non-RAE project identity`, which is not an RAE identity. From that point this gate is **not satisfied** for RAE work, and the borrowed credential is not used. See `ARCHITECTURE_QA.md §1`. The audit findings in this file are unaffected: they came from REA/browser evidence, not from Agent Core routing.

**Date:** 2026-10-24 · **Scope:** `REFERENCE_AUDIT.md`, `COMPARISON_MATRIX.md`, `RAE_REDESIGN_BLUEPRINT.md`, `TECHNICAL_OPTIONS.md`, `EVIDENCE/`
**Gates at time of writing:** `AGENT_CORE_CONNECTED` ✅ (see status update) · `REA_ANALYSIS_VERIFIED` ✅ · `BLUEPRINT_READY_FOR_REVIEW` ✅

---

## 1. Gate evidence

| Gate | Evidence |
|---|---|
| `AGENT_CORE_CONNECTED` | `agent_core_health` → `status: ok`, `agent-core 0.7.0`, `api_versions [v1,v2]`, `auth_required: true`, bridge `[Agent Core bridge host — internal, redacted]` with credentials from process env. `agent_core_capabilities` → HTTP 200, scopes for `route`/`context` present. `agent_core_route` → `disposition: ROUTE`, `policy: ALLOW` (read-only analysis). |
| `REA_ANALYSIS_VERIFIED` | REA MCP `inspect_web_page` executed against a **literal loopback CDP endpoint** (`http://127.0.0.1:9444`, target `8C8EC8A4…`); evidence envelope `ev_6c6b67a2…` stored in `EVIDENCE/rea/rae_home_inspect_raw.json`; all four sites measured in a real browser with reproducible scripts under `tools/`. |
| `BLUEPRINT_READY_FOR_REVIEW` | Four deliverables + evidence index + this QA record; no production change, no implementation. |

**Project-identity note (transparency):** the Agent Core bridge is enrolled as project `a different, non-RAE project identity` — the only project configured in this environment (`configured_projects: 1`). The routing/context calls are read-only and were not used to access any other project's data. If a dedicated `REA-enroll` project identity is required for audit purposes, enrol it before the next run `[U]`.

---

## 2. Verification passes performed

| Pass | What was checked | Result |
|---|---|---|
| Automated re-probe | 8 probes (4 sites × 2 viewports), 4 accessibility probes, 4 full-page captures, 7 RAE sub-pages, 16 robots/sitemap probes | all captured, JSON retained |
| Fact-check (independent subagent) | ~120 numeric/boolean claims in the audit + comparison matrix against `EVIDENCE/probe/*`, `a11y_*.json`, `html_analysis.json`, `fetch_summary.json`, `robots_sitemap_summary.json` | 1 mismatch found → corrected (§3.1) |
| Consistency review (independent subagent) | contrast tokens vs `tools/contrast.py`, sitemap↔nav parity, defect-ID coverage, backlog coverage, wireframe above-the-fold maths, phase/duration parity, no false execution claims, file-path existence, WCAG acceptance | 17 findings → all fixed or explicitly re-scoped (§3.2) |
| Manual markup verification | `tools/verify_markup.py` + `cdp_eval` on RAE mobile menu, header link target, table/`th` counts, DPU heading tags | 3 earlier claims were wrong and were corrected (§3.3) |

---

## 3. Corrections made after verification

### 3.1 Fact-check corrections
1. **DPU headings** — "2 heading elements total" was ambiguous; the two `H2`s belong to the cookie-consent dialog (height 0), so page content has no headings. Reworded in `REFERENCE_AUDIT.md §5.3` and `COMPARISON_MATRIX.md` matrix D.
2. **RAE `wp-sitemap.xml`** — the probe recorded a connection error, not a 404. Corrected the wording in `REFERENCE_AUDIT.md §2.7`.
3. **UTCC article count** — clarified 2,637 nodes in the live DOM vs 2,617 in server HTML, 46 painted.
4. Added `EVIDENCE/notes/ad_hoc_measurements.json` so every number cited from one-off CDP evaluations (RAE hero 450 px / 7 slides, mobile modal, SPU 650 px hero, UTCC 46 visible, DPU 2 cookie headings) has a stored artefact.

### 3.2 Consistency corrections
5. `--green-600` contrast proof now reproducible: `#0A8F45` added to `tools/contrast.py` (4.18:1) and output saved to `EVIDENCE/notes/contrast_tokens.txt`.
6. `--ink` on `--amber-100` (14.76:1), `--line-strong` (3.09:1), `--ink` on `--green-100` (15.64:1), focus-on-dark (10.32:1) all added to the script.
7. Sitemap↔nav drift resolved: `/events/` moved to `/news/events/`; the tree now has exactly **7 root sections = 7 primary nav items**; `/en/` mirrors the same 7.
8. Above-the-fold claim corrected: hero fixed at 420 px desktop (max 480) with a 4:3 mobile crop, tiles 2-up on mobile; goal G1 and the acceptance test now state measured viewports instead of an impossible claim.
9. Priority actions re-derived from the §2 task ranking; the internal-only `จองห้องประชุม` was removed and the "analytics-derived" provenance softened to "to be validated after launch".
10. `--green-600` usage rule corrected to WCAG large-text thresholds (≥24 px regular / ≥18.66 px bold).
11. Performance budget "281 KB worst inner" replaced with the actual RAE figure (167 KB `/wtms_news.aspx`); 281,937 B is DPU's homepage.
12. Phase 0 exit gate re-scoped: closes `S1` defects that do not need the new platform (`D-01/03/04/05/07/19`, `D-06` partial); `D-02` search deferred to Phase 2.
13. Blueprint Phase 1 now includes the platform/content-model decision; Phase 2 lists all 7 sections; Phase 4 = English parity + governance in both documents.
14. `TECHNICAL_OPTIONS` Option A Phase 0 duration aligned to 2–3 weeks.
15. Weighted architecture scores recomputed with the stated weights: **A 3.10 · B 3.75 · C 3.35**.
16. `COMPARISON_MATRIX` section averages and per-site verdicts recomputed (SPU 3.6, UTCC 3.0, DPU 3.6, RAE 1.7) with the aggregation rule stated.
17. Accessibility acceptance criterion strengthened: 0 axe-core violations **of any severity** + a manual WCAG 2.2 AA checklist (incl. 2.4.11, 2.5.7).
18. P0/P1 labels changed from week ranges to release numbers to match the roadmap.
19. `D-19` (public admin link) raised to `S1` to match gap `G-4`.

### 3.3 Claims that were wrong and are now fixed
20. RAE mobile navigation — earlier draft said "no standard toggle found". Verification found a Bootstrap **modal** (`#siteMenu`, 17 links) behind an icon-only link with no accessible name. Audit, defect register (`D-21`) and blueprint remediation updated; the probe's selector list was the cause of the false negative.
21. RAE primary nav — "10 top-level labels" was wrong: **16 anchors over 4 top-level destinations**.
22. RAE tables — clarified as "9 `<table>` elements, none with `<th>`" rather than asserting all are layout tables.

---

## 4. Claim → evidence map (spot-check any number)

| Claim | Source file |
|---|---|
| RAE 0 `h1`, no meta description, 9 tables, 19 form inputs, 4 iframes | `EVIDENCE/raw_html/rae_home.html`, `EVIDENCE/notes/html_analysis.json`, `EVIDENCE/probe/probe_rae_1440.json` |
| RAE 14 contrast failures (worst 2.16) | `EVIDENCE/notes/a11y_rae_1440.json` → `contrast.worst` |
| RAE 2.78 MB / 7,585 ms / 4 iframes | `EVIDENCE/probe/probe_rae_1440.json` |
| RAE 11,953 px mobile / 129 px hero / modal nav | `EVIDENCE/probe/probe_rae_412.json`, `EVIDENCE/notes/layout_rae_412.json`, `EVIDENCE/notes/ad_hoc_measurements.json` |
| RAE 404 on `wtms_personStructure.aspx`, empty titles | `EVIDENCE/notes/rae_subpage_probe.json`, `EVIDENCE/raw_html/rae_about.html` |
| robots/sitemap status for all four | `EVIDENCE/raw_html/robots_sitemap_summary.json` |
| UTCC 8.96 MB, 2,637 articles / 46 visible | `EVIDENCE/raw_html/utcc_home.html`, `EVIDENCE/probe/probe_utcc_1440.json`, `EVIDENCE/notes/ad_hoc_measurements.json` |
| DPU 0 content headings, 46 menu links, SPA sitemap | `EVIDENCE/probe/probe_dpu_1440.json`, `EVIDENCE/notes/ad_hoc_measurements.json`, `EVIDENCE/raw_html/robots_sitemap_summary.json` |
| Design tokens contrast | `EVIDENCE/notes/contrast_tokens.txt` (`tools/contrast.py`) |
| REA inspection envelope | `EVIDENCE/rea/rae_home_inspect_raw.json` |

---

## 5. Residual limitations (unchanged, disclosed)

- No real-device or screen-reader testing; no axe-core/Lighthouse execution (the audit used its own deterministic probes plus WCAG contrast maths).
- Interactive states (menu open, tabs, carousel pause) were verified by markup, not by driving the UI.
- Authenticated areas, CMS admin, and any server-side search were not accessed.
- Latency numbers are lab measurements with a partly warm cache; byte counts and DOM facts are reliable.
- Content inventory inside WTMS (`wID`/`nID` counts, owners, attachments) is unknown `[U]`.

## 6. Next action

Blueprint is ready for owner review. **No implementation, deployment, DNS, Cloudflare, credential or repository change was made.** Await approval, and answer the seven decision-gate questions in `TECHNICAL_OPTIONS.md §10` before Phase 1.
