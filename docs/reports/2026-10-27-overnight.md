# RAE Digital Platform — overnight session report

**Run date:** 2026-10-25 20:00 → 2026-10-26 05:30 (Asia/Bangkok)
**File name note:** the brief asked for `2026-10-27-overnight.md`; the session actually ran
on the night of 25→26 October 2026. The path is kept exactly as requested so the owner
finds it where they said to look.
**Mode:** autonomous, Agent Core identity `rae-digital-platform`, Ponytail full.
**Gates:** `RAE_OVERNIGHT_QA = PASS` · `RAE_OWNER_REVIEW_REQUIRED = YES`

---

## 1. Scheduler (verified, not assumed)

| Job | ID | State | Next run |
|---|---|---|---|
| Overnight finalize (one-shot, created this session) | `c3ff9a76441c` | **active / scheduled** | 2026-10-26 05:30 +07 |
| RAE nightly development (`0 1 * * *`) | `9ecc82d7adc4` | active — **already fired at 01:00 tonight**, produced PR #35 | 2026-10-27 01:00 +07 |
| RAE nightly report (`0 7 * * *`) | `ad2117136b3b` | active | 2026-10-26 07:00 +07 |

No duplicate development job was created: the recurring 01:00 job had already run in this
window, so a second one would have raced it on the same branch. The one-shot only
finalizes at 05:30 (QA, report refresh, Telegram), and never merges.

## 2. Completed work

Three draft PRs, all with green CI. Nothing was merged; protection was never lowered.

| PR | Branch | Scope |
|---|---|---|
| **#35** | `nightly/2026-10-26-landing-links` | *from the 01:00 job* — hero CTAs were crossed (label "เกี่ยวกับเรา" linked to `/services`), `moreHref` accepted but ignored. Verified against `main` before accepting. |
| **#34** | `feat/content-gate-and-ia` | content contract + `npm test` gate, document category routes with breadcrumbs, `/contact` + 7th nav item, breadcrumbs + `BreadcrumbList` on every interior page |
| **#36** | `feat/qa-gates` | gates wired into CI, `scripts/check-export.mjs`, and the English photo-parity bug it caught |

Merge order: **#35 → #34 → #36**. #35 and #34 were trial-merged locally: clean, no conflicts.

### 2.1 Content gate (`npm test` — 7 tests, no dependencies)

Enforces: equal content files per locale · every content URL is https · every `source`
block has `retrieved:` · homepage statistics keep their sample-data label · no content
value left as `TODO(translate)` · news items have unique ids, ISO dates and newest-first
order · English news derives its photo set from the Thai source.

### 2.2 Export integrity (`scripts/check-export.mjs`)

Walks `out/` and fails on: internal links that do not resolve, missing asset or `srcset`
candidates, `href="#"` / `href=""`, plain-http links, and any Thai route without an
English twin. Current state: **141 HTML files, 140 routes, 7,254 internal refs, 730
external links — OK**. Proven red by injecting one broken link (reported with file and
URL) and green after reverting.

### 2.3 Real defect the new gate caught

Four stories have no photo on the office's page (38587, 38586, 38585, 38197). Thai
content recorded `image: null`; English carried an image object for all 58 — so the
English news index and four English detail pages requested files that were never
downloaded. Fixed by deriving the photo set from `thNews.items`, with a unit test that
fails if it is hardcoded again.

### 2.4 Navigation and SEO

- Document categories: `/<locale>/documents/category/{administration,research,academic-services}` with `dynamicParams = false`
- `/contact` built only from already-verified copy — **no form** (needs SMTP + a PDPA basis)
- Contact is the 7th nav item, so header, footer, sitemap and search pick it up automatically
- Breadcrumbs + `BreadcrumbList` on **every interior page**; 68 of 69 exported Thai pages now carry one (the home page deliberately does not)
- The category page no longer emits a duplicate `BreadcrumbList`; the shared component builds the visible trail and the structured data from the same array

## 3. QA evidence (real output, this session)

```
npm test            → 7 tests, 7 pass, 0 fail
npm run lint        → 0 errors (9 warnings, all pre-existing research scripts)
npm run typecheck   → ✓ Types generated successfully, tsc clean
npm run build       → OK (server mode)
npm run build:export + check:export → OK (141 files / 140 routes / 7,254 internal refs)
npm audit           → found 0 vulnerabilities
secret scan         → no tokens, keys, .env or .pem tracked
```

Verified on a combined local build of #34 + #36 (temporary branch, deleted afterwards).

## 4. TH/EN coverage

| Surface | TH | EN |
|---|---|---|
| Pages (home, about, research, services, documents, news, contact, search) | 8 | 8 |
| Document categories | 3 | 3 |
| News stories | 58 | 58 |
| Headlines translated | — | **58 / 58** |
| Article bodies | Thai as published | Thai as published, with a stated Thai-only notice (never machine-translated — ADR-0005) |
| Routes in sitemap | 138 | 138 (each with hreflang th/en/x-default) |
| Breadcrumbs | 68/69 pages | same |

## 5. Outstanding defects

1. **`/news` payload is large** — 58 cards, ~200 KB of HTML plus lazily loaded photos. Fine on desktop, heavy on a slow phone. A paginated or "load more" index is the fix; it changes the URL shape, so it needs an owner decision.
2. **Four news items have no photo** — correctly render without one, but the cards look inconsistent next to the others.
3. **Search is substring-only and client-side** — no ranking, no fuzzy match, no cross-language. Adequate for 140 pages; wrong at 1,000.
4. **Warnings in `docs/research/tools/*.mjs`** (9 ESLint warnings) — research scripts from the Cursor handoff, out of scope but still noise.
5. **Breadcrumb on the home page is absent by design** — noted so nobody "fixes" it later.

## 6. Deferred scope (blocked, not forgotten)

| Item | Blocker |
|---|---|
| Homepage statistics as real KPIs | The office publishes no such figures; gate A-7 open |
| Service catalogue with fees | Not published as a page (only two PDFs on erp.mju.ac.th) |
| FAQ / knowledge articles | No approved copy exists |
| Event calendar | No approved event or holiday list |
| Facebook page as a news source | A post permalink is readable (full text + up to 5 photos, verified), but the page's post **list** is behind a login wall — needs a page token or an export |
| Contact form | Needs SMTP target + PDPA basis |
| More than 58 news items | Page 1 of 5 of the office list was captured; deeper pages need a cadence decision |
| Real domain | Owner parked it until the site is ~90% complete |
| CMS / SSO / database / admin | Deferred by ADR/BluePrint; no approval |

## 7. Next priorities (in order)

1. **Owner review + merge #35 → #34 → #36** (this unblocks everything else).
2. News index pagination or "load more" (needs the URL-shape decision).
3. FAQ / knowledge section once copy is approved.
4. Weekly news refresh (a cron that re-runs the harvest; same scripts, guarded by the gates).
5. Blueprint reconciliation: the module matrix still labels Phase 1 = foundation while the owner decision says public website — one document should yield to the other.

## 8. Owner decisions requested

1. Approve merging the three draft PRs, in the order above.
2. Decide the news index shape: keep one long page, or paginate (`/news/page/2`) / "load more".
3. Confirm that the CI workflow change in #36 (adding `npm test` + export integrity) is acceptable — it is the first workflow edit in this project.
4. Decide whether the four photo-less news items should get a generic office photo (needs an approved asset) or stay photo-less.
5. Say when to start on the real domain, so `SITE_URL` can be switched in one place.

---

`RAE_OVERNIGHT_QA = PASS`
`RAE_OWNER_REVIEW_REQUIRED = YES`
