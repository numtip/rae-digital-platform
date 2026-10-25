# ADR-0002 — Design baseline and colour authority

- **Status:** **Approved (2026-10-24)** — gate A-2 closed: the owner approved Stitch Landing V2 as the design baseline.
- **Date:** 2026-10-24
- **Context doc:** `../DESIGN_SYSTEM_RECONCILIATION.md`

## Context

Three design sources exist and disagree on brand:

| Source | Green | Gold | Header |
|---|---|---|---|
| `StitchCode.MD` (Google Stitch prototype) | `#005C3B` / `#003F2A` | `#D8A01A` (hover `#c79318`) | dark |
| `rae-nextjs-main` Stitch V2 (React port) | `#005C3B` / `#003F2A` / `#014D35` | `#D8A01A` | white |
| `rae-nextjs-main` `app/tokens.css` | `#005C3B`, gold `#FFDE00` | `#FFDE00` | — |
| Legacy WTMS site (audit evidence only) | `#017F3F` | — | green bar |

Additionally, two ACL failures exist in the baseline: white text on `#D8A01A` = **2.34:1**
(gold CTA) and the gold focus ring = **2.34:1** on white.

## Decision

1. **Stitch Landing V2 (the React port) is the approved visual baseline.** The Google Stitch
   HTML is an enhancement reference, not production code.
2. **Single colour authority:** `#005C3B` brand, `#003F2A` deep, `#014D35` forest,
   `#D8A01A` UI gold, `#E3AF2F` gold hover, `#F7F3EA` ivory.
3. **`#FFDE00` is restricted to text/marks on dark green only** (6.05–9.00:1); banned on white (1.34:1).
4. **`#017F3F` is retired** from the platform. It remains only as legacy audit evidence.
5. **Gold CTA label is `#003F2A`** (5.14:1), never white.
6. **Focus ring is `#0A7A52`** on light (5.36:1) and `#FFDE00` on dark.
7. **White header** for the public site (prototype used dark); the dark tone moves to hero bands.
8. **Sarabun** is the only body face; Inter is dropped from the critical path.

## Consequences

- `RAE_REDESIGN_BLUEPRINT.md §7` (earlier phase, proposing `#017F3F`) is **superseded** by
  `DESIGN_SYSTEM_RECONCILIATION.md §4`; the older file is kept for audit trail with a note.
- Any new colour must be added to the token table with a computed ratio, not chosen by eye.
- **Gate A-2:** repo docs state that Stitch V6 superseded V2. The owner must confirm V2 remains
  the baseline; if V6 wins, sections must be re-reconciled before Phase 2 UI work.
  → **Resolved 2026-10-24:** the owner approved Stitch Landing V2 as the design baseline; V6 is not adopted.

## Enforcement

- stylelint: no raw hex outside the token file
- unit test: token-pair contrast ratios (fails CI on regression)
- unit test: `href="#"` is forbidden in nav/CTA data
- zod schema: statistics require `source` + `as_of`
