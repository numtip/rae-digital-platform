# RAE Digital Platform — DAY_CLOSEOUT 2026-11-02

**Mode:** closeout only — no feature development, no merge, no deployment, no production change.
**Repo:** `numtip/rae-digital-platform` · `main` = `4cbf233` (last moved 2026-10-31 14:47 +07).
**Today's commit:** `0dc4f54` on `feat/hero-fade-scrim`.
**Result:** `RAE_DAY_CLOSEOUT = PASS` · `RAE_OWNER_REVIEW_REQUIRED = YES`

---

## 1. Objective

Implement Option B of the approved Magic UI hero audit: replace the flat hero scrim with an audited
directional gradient, add a CSS-only 640 ms opacity reveal that respects `prefers-reduced-motion`,
and prove contrast/LCP/CLS rather than assert them. Keep the change minimal and open a PR with
before/after evidence — no merge, no deploy.

## 2. What completed

**PR #97 — `feat(hero): directional scrim + reduced-motion-safe reveal`**
<https://github.com/numtip/rae-digital-platform/pull/97> — OPEN, CI `build` SUCCESS,
`mergeStateStatus` CLEAN, 3 files, +99/−5. **Not merged, not deployed.**

- `app/[locale]/page.tsx` — flat `bg-brand-700/75` → responsive directional gradient; `hero-fade`
  classes on headline, lead and CTA row.
- `app/globals.css` — `--hero-fade-duration/-ease` plus keyframes *inside*
  `@media (prefers-reduced-motion: no-preference)`.
- `docs/architecture/DESIGN_SYSTEM_RECONCILIATION.md` §4.5.1 — canonical reduced-motion pattern.

No new dependency, no JS animation, no content change, no hero resize, no route change. Stitch V2
and ADR-0002 tokens untouched; no raw hex added outside `globals.css`.

## 3. Decisions

1. **The audited single alpha was rejected on measurement.** `0.95 → 0.90 → 0.30` assumed copy
   occupies the left ~70%. At 390 px the Thai headline reaches 93% of the band, where `0.30` gives
   **1.75:1** — worse than the flat `0.75` being replaced. At 1280 EN it reaches 71% and `0.30`
   gives **2.70:1**. The scrim is now responsive because the copy's width is: `0.75` until `lg`,
   `0.60` at `lg`, `0.30` only from `xl` where the falloff starts at `70%` instead of `50%`.
2. **Base state is the finished state.** The animation is added inside `no-preference`, so
   `reduce`, an unknown query or a failed stylesheet all leave the hero fully visible. Failure mode
   is "no animation", never "invisible text".
3. **Opacity only above the fold** — it cannot move layout, so the reveal contributes no CLS.

## 4. Results (measured)

**Contrast — 10 viewport × locale combinations, all pass** (worst pixel behind the glyphs,
compositing the real photograph with the real rendered gradient):

| viewport | TH gold | EN gold | tightest text |
|---|---|---|---|
| 1440 | 4.33 | 4.33 | h1 9.23 / lead 9.40 |
| 1280 | 4.32 | 4.28 | h1 9.19 / lead 9.45 |
| 1024 | 3.59 | **3.21** | h1 5.58 / lead 8.84 |
| 768 | 4.21 | 3.53 | h1 7.52 / lead 8.10 |
| 390 | 3.45 | 4.04 | h1 7.19 / lead 8.32 |

Minimum **3.21:1 (EN, 1024)** against a 3:1 requirement; gold was **2.45:1** before.

**Performance / motion:** LCP **124 ms**, element unchanged (`IMG office-building.webp`) ·
CLS **0.0000**, zero shift entries · hero 600/560 px unchanged · `overflow-x: 0` at every width ·
`reduce` → `animation-name: none`, all nodes `opacity: 1`.

**QA:** `npm test` 133 pass / 1 fail / 3 skipped; the failure is **pre-existing**, reproduced on
pristine `main` (`tests/content.test.mjs` uses `/` separators and cannot resolve `content/th` on
Windows). Lint 0 errors (9 pre-existing warnings) · typecheck clean · build clean ·
export 159 html / 158 routes · `check:export` OK · `check:contrast` OK, 9,006 nodes.

## 5. Issues and risks

| # | Item | Severity | Note |
|---|---|---|---|
| 1 | Contrast gate is blind to alpha layers | **High** | `check:contrast` reads computed backgrounds; the 2.45:1 scrim passed it for weeks. Any scrim/tint/glass change needs a pixel sample. |
| 2 | EN at 1024 = 3.21:1 | Medium | Passes, thin margin. Re-measure on any hero copy change. |
| 3 | Numbers are tied to `office-building.webp` | Medium | A brighter replacement photo invalidates them. |
| 4 | 1 pre-existing test failure on Windows | Low | Environment-specific, obscures real regressions in CI runs on Windows. |
| 5 | Cached LCP is local | Low | 124 ms is a localhost static export, not field data; the delta versus baseline is what matters, and the element did not change. |

## 6. Pending actions

1. Owner review and merge of **#97** (merge deploys the Pages preview only, never the VPS runtime).
2. Merge the docs PR carrying `docs/memory/NEXT_SESSION.md` and this report.
3. Convert the ad-hoc pixel measurement into `scripts/check-overlay-contrast.mjs`.
4. Fix the Windows path failure in `tests/content.test.mjs`.
5. Batch the carried-over owner decisions: old org name in imported bodies (TH 10 / EN 25),
   `/en/contact/` 172-char description, reused descriptions on news index pages 2–4, unprobed
   outbound links.

## 7. Governance

Nothing merged, nothing deployed, no production change, no feature work. PR #97 remains the owner's
decision. Evidence screenshots were deliberately **not** committed — this repo keeps
`EVIDENCE/screenshots` out of version control (`docs/README.md`).
