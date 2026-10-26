# Next session — after 2026-10-26 (night)

`main` is `98d8af7`. Six PRs are open and green; nothing was merged because each needs the
owner's approving review. This file replaces the handoff merged in #55.

## Open PRs (all `build` pass, none merged)

| PR | Branch | Base | Size | What it does |
|---|---|---|---|---|
| [#57](https://github.com/numtip/rae-digital-platform/pull/57) | `feat/knowledge-events` | `main` | 18 files, +531/−22 | `/knowledge/` hub (M04) + `/news/events/` from published activities (M05); search moves to the utility bar; news-card dates pass AA |
| [#58](https://github.com/numtip/rae-digital-platform/pull/58) | `fix/cms-workflow` | `main` | 10 files, +410/−25 | officer submits own draft, sessions idle 30 m / absolute 8 h, login throttle 5 / 15 m, reviewer returns with a reason |
| [#59](https://github.com/numtip/rae-digital-platform/pull/59) | `feat/surfacing` | **`feat/knowledge-events`** | 4 files, +48/−17 | footer renders the NAV sections; homepage quick links reach the two new pages |
| [#61](https://github.com/numtip/rae-digital-platform/pull/61) | `feat/about-structure` | `main` | 3 files, +46/−2 | `/about/` organisation structure (the three published division names); timeline year now passes AA |
| [#62](https://github.com/numtip/rae-digital-platform/pull/62) | `feat/documents-counts` | `main` | 4 files, +21/−2 | Document Center categories state how many links they open |
| [#63](https://github.com/numtip/rae-digital-platform/pull/63) | `feat/news-jsonld` | `main` | 1 file, +5/−0 | `NewsArticle` JSON-LD carries the article `url` + `mainEntityOfPage` per locale |
| [#60](https://github.com/numtip/rae-digital-platform/pull/60) | `docs/handoff-2026-10-26-night` | `main` | this file | canonical handoff |

**Merge order:** #57 (without `--delete-branch`) → retarget #59 to `main` and rebase → #59.
#58, #61, #62, #63 and #60 are independent of all of them. Branch protection on `main` is untouched: `reviews=1`,
`checks=[build]`, strict, no force-push, no deletions.

## Live state

Live preview is still `98d8af7` (PRs #55/#56 merged earlier on 2026-10-26): sweep of the live
site 148/148 routes, 0 problems. The two new pages exist on #57's branch and in its export
(156 routes); they reach the live preview only after #57 merges.

## Verified facts worth keeping

- Sweep of #57's export: 152/152 sitemap routes, `<html lang>` / canonical / hreflang / single
  `<h1>` / `#main-content` 152/152, `href="#"` 0, 380 images, 0 problems.
- #59's export: same checks plus 9,106 internal refs all resolving (the footer added 1,220).
- `npm test` 32/32 on #58, 28/28 elsewhere; typecheck clean; lint 0 errors / 9 pre-existing
  warnings; `check-export` OK on every branch.
- The five knowledge destinations answer 200 today: `kb.mju.ac.th`,
  `researchex.mju.ac.th/dbplant/`, `maejovision.mju.ac.th`, the ThaiJO journal, the newsletter.
- 54 published activities carry a `ข่าวกิจกรรม…` type and none has a future date, so the events
  page's upcoming section correctly does not render.
- CMS chain #51/#52/#54 was merged with **0 recorded approvals**; `reviewDecision` reads
  `REVIEW_REQUIRED` even on merged PRs, so it does not prove a review happened.

## Do not do yet

- Do not merge without the owner's approval, do not lower the review requirement, no `--admin`.
- Do not provision a database, start or deploy the CMS runtime, or touch VPS 190 / DNS /
  Cloudflare / Nginx / SSO.
- Do not invent copy: the remaining gaps (homepage statistics, FAQ, PDPA and accessibility
  policy text, per-article knowledge copy, an events schedule) have no approved source.

## Next, in order

1. Owner reviews and merges #57, then #59, and #58 / #61 / #62 / #63 / #60 on their own.
2. After #57 merges, the one website feature ready to build is a category filter on `/news/`
   derived from the type strings the office already publishes — it touches
   `components/news-index.tsx` and `content/th/news.ts`, both of which #57 edits, so it waits
   for that merge instead of fighting it. Everything else needs copy or the database decision.
3. Still open for the owner: whether a publisher may publish an item they authored (today only
   pinned items need a second person).
