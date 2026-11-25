# Next session — RAE digital platform (2026-11-02 closeout, 16:25 +07)

`main` is `4cbf233` (last move 2026-10-31 14:47 +07). Today's only commit is `0dc4f54`,
and it is **not on `main`** — it sits on `feat/hero-fade-scrim` behind **PR #97, open,
CI `build` green, `mergeStateStatus` CLEAN, not merged, not deployed**. The Pages preview
still serves the #96 build, because nothing landed on `main` today.

## What PR #97 does

The landing hero washed a flat `bg-brand-700/75` over the office photograph. It hid most of the
building and still left the gold accent line below the 3:1 WCAG 2.2 AA threshold for large text.

- **Scrim** — flat wash becomes a directional gradient, and it is *responsive*:
  `from-brand-700/95 via-brand-700/90 to-brand-700/75 lg:to-brand-700/60 xl:to-brand-700/30 xl:via-70%`.
- **Reveal** — CSS-only opacity fade, 640 ms, staggered 0/80/160 ms across headline → lead → CTAs.
  No JS, no client component, no dependency.
- Files: `app/[locale]/page.tsx`, `app/globals.css`,
  `docs/architecture/DESIGN_SYSTEM_RECONCILIATION.md` (§4.5.1). +99 / −5, three files.

## Decision that mattered: the audited alpha was wrong for small viewports

The approved audit specified one gradient (`0.95 → 0.90 → 0.30`) and justified `0.30` on the
grounds that copy occupies the left ~70%. It does not, on a phone. Measured, the Thai headline at
390 px runs to **93%** of the band, where `0.30` yields **1.75:1** — worse than the flat `0.75` it
replaces. At 1280 EN the accent reaches 71% and `0.30` gives **2.70:1**. So the right end is held at
`0.75` until `lg`, `0.60` from `lg`, and opens to `0.30` only from `xl`, where the falloff also
starts at `70%` instead of `50%` so it begins after the text rather than through it.

A desktop-only check would have passed this and shipped a mobile regression. **Do not flatten the
scrim back to a single alpha** without re-running the measurement below.

## Measured evidence (10 combinations, all pass)

Worst pixel behind each glyph, compositing the real photograph and the real rendered gradient.
These are *not* from CI — the gate cannot see an alpha layer, see the next section.

| viewport | locale | gold (≥3:1) | white h1 (≥3:1) | lead (≥4.5:1) |
|---|---|---|---|---|
| 1440 | TH | 4.33 | 9.79 | 9.40 |
| 1440 | EN | 4.33 | 9.23 | 9.52 |
| 1280 | TH | 4.32 | 9.80 | 9.45 |
| 1280 | EN | 4.28 | 9.19 | 9.69 |
| 1024 | TH | 3.59 | 5.82 | 8.91 |
| 1024 | EN | **3.21** ← tightest | 5.58 | 8.84 |
| 768 | TH | 4.21 | 8.71 | 8.16 |
| 768 | EN | 3.53 | 7.52 | 8.10 |
| 390 | TH | 3.45 | 8.09 | 8.69 |
| 390 | EN | 4.04 | 7.19 | 8.32 |

Gold was 2.45:1 under the flat scrim. Minimum now **3.21:1 (EN, 1024)** — passing but thin, so any
copy change to the hero must be re-measured.

Performance, static export served the way Pages serves it: **LCP 124 ms**, element unchanged
(`IMG office-building.webp`, so the fade never delays it) · **CLS 0.0000**, zero shift entries ·
hero height 600 px desktop / 560 px mobile, unchanged · `overflow-x: 0` at every width.
`prefers-reduced-motion: reduce` → `animation-name: none`, all three nodes `opacity: 1`.

## Standing lesson: CI cannot grade an alpha overlay

`scripts/check-contrast.mjs` reads computed backgrounds. An overlay at alpha is invisible to it,
which is exactly how the 2.45:1 defect survived a "contrast gate OK" for weeks. Any change to a
scrim, tint or glass layer needs a **pixel sample of the composited result**, not a gate pass.
Recorded in §4.5.1. Making that sample a script is the obvious follow-up (below).

## Gates, this host, this PR

`npm test` 133 tests — 133 pass / 1 fail / 3 skipped. The failure is **pre-existing and
reproduced on pristine `main`**: `tests/content.test.mjs` builds paths with `/` and cannot resolve
`content/th` in a Windows worktree. Not caused by #97, and not fixed today.
Lint 0 errors (9 pre-existing warnings, `docs/research/tools`) · typecheck clean · build clean ·
`NEXT_PAGES_PREVIEW=1` export 159 html / 158 routes · `check:export` OK (9,232 internal refs) ·
`check:contrast` OK (9,006 nodes).

## Carried over, still unresolved — owner decisions

- The old organisation name survives inside imported news bodies (TH 10 / EN 25 places). Owner has
  not decided whether published text may be rewritten. Unverified this run.
- `/en/contact/` keeps a 172-character description on purpose; news index pages 2–4 reuse page 1's
  description because a different one needs new approved copy.
- Outbound links rot silently and nothing in CI probes them — re-probe `content/links.ts` and
  `content/*/documents.ts` before repeating the "live destinations only" claim.
- The Windows-only `tests/content.test.mjs` failure above: known, environment-specific, fixable
  with `path.join`/`path.sep`, not touched today (no code work in a closeout run).

Resolved since the 2026-10-31 handoff: #86–#89 are closed (superseded by #90), #94–#96 merged.

## Next useful steps, in order

1. Owner reviews and merges **#97**. A merge deploys the Pages *preview* only — never the VPS runtime.
2. Merge the docs PR carrying this file.
3. Turn the pixel measurement into `scripts/check-overlay-contrast.mjs` so the next hero change is
   graded automatically instead of relying on a hand-run CDP session.
4. Fix the Windows path failure in `tests/content.test.mjs` so a green suite means green everywhere.
5. Only then take the carried-over text/SEO decisions to the owner as one batch.
