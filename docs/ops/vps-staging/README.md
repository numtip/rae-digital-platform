# RAE Digital Platform — VPS Staging Preparation (2026-10-26)

**Repository:** `numtip/rae-digital-platform`  
**Target host:** VPS-A (`raeserver`) — baseline host audit lives in the **`RAE-Attendance-System-V2`** repository (`docs/unified/06a_VPS_A_AUDIT_SUMMARY.md`, 2026-10-15). Internal IPs are not copied into this repo (governance).  
**Mode:** Audit baseline → read-only delta → design only — **no install, no nginx change, no DNS, no deploy.**

| # | Deliverable | File |
|---|---|---|
| 1 | Existing Audit Baseline | [01_EXISTING_AUDIT_BASELINE.md](./01_EXISTING_AUDIT_BASELINE.md) |
| 2 | Delta Assessment Report | [02_DELTA_ASSESSMENT.md](./02_DELTA_ASSESSMENT.md) |
| 3 | VPS Capacity & Risk Assessment | [03_CAPACITY_AND_RISK.md](./03_CAPACITY_AND_RISK.md) |
| 4 | Isolated Staging Architecture | [04_ISOLATED_STAGING_ARCHITECTURE.md](./04_ISOLATED_STAGING_ARCHITECTURE.md) |
| 5 | Deployment & Rollback Plan | [05_DEPLOYMENT_ROLLBACK_PLAN.md](./05_DEPLOYMENT_ROLLBACK_PLAN.md) |
| 6 | GO / NO-GO Recommendation | [06_GO_NO_GO.md](./06_GO_NO_GO.md) |

**Evidence (read-only captures):** [evidence/2026-10-26-delta-snapshot.txt](./evidence/2026-10-26-delta-snapshot.txt)

**Agent Core:** `user-context-mode` MCP namespace was not available in this session; work used Cursor on-host read-only inspection plus cloned `main`.
