# RAE Digital Platform — overnight session report

**Run date:** 2026-10-25 20:00 → 2026-10-26 05:30 (Asia/Bangkok)
**File name note:** the brief asked for `2026-10-27-overnight.md`; the session actually ran
on the night of 25→26 October 2026. The path is kept exactly as requested so the owner
finds it where they said to look.
**Mode:** autonomous, Agent Core identity `rae-digital-platform`, Ponytail full.
**Last refreshed:** 2026-10-26 05:30 +07 by the one-shot finalize job — QA re-run on this
branch, PR list and gates re-verified.
**Gates:** `RAE_OVERNIGHT_QA = PASS` · `RAE_OWNER_REVIEW_REQUIRED = YES`

---

## 1. Scheduler (verified, not assumed)

| Job | ID | State | Next run |
|---|---|---|---|
| Overnight finalize (one-shot) | `c3ff9a76441c` | **fired 05:32 +07, one-shot consumed** (this report refresh) | — |
| RAE nightly development (`0 1 * * *`) | `9ecc82d7adc4` | active — **already fired at 01:00 tonight**, produced PR #35 | 2026-10-27 01:00 +07 |
| RAE nightly report (`0 7 * * *`) | `ad2117136b3b` | active | 2026-10-26 07:00 +07 (fires independently of this session) |

No duplicate development job was created: the recurring 01:00 job had already run in this
window, so a second one would have raced it on the same branch. The one-shot only
finalizes at 05:30 (QA, report refresh, Telegram), and never merges.

## 2. Completed work

Four draft PRs, all with green CI. Nothing was merged, no required review was reduced and
branch protection was not touched at any point this session.

**Per-PR evidence (numbers from each PR's own head, not inherited from its base):**

| PR | Diff (GitHub) | CI | Own gates | Merge state |
|---|---|---|---|---|
| #35 | 2 files, +28/−13 | build SUCCESS | export parity verified by the reviewer: 8 broken refs → 0 after this PR | MERGEABLE / BLOCKED on review |
| #34 | 24 files, +662/−26 | build SUCCESS | `npm test` 6/6, export OK | MERGEABLE / BLOCKED on review |
| #36 | 5 files, +160/−3 | build SUCCESS | `npm test` 7/7, `check-export` OK (141 files) | CLEAN |
| #37 | 9 files, +320/−83 | build SUCCESS | `npm test` 7/7, `check-export` OK (149 files) | CLEAN |

**Conflict simulation of the accepted order** (`main` + #35 + #34 + #36 + #37, merged
locally in one throwaway branch): **0 conflicts at every step**, then
`npm test` 7/7 · typecheck clean · lint 0 errors · `check-export` OK (149 files, 148
routes, 7,654 internal refs). The simulation branch was deleted afterwards.

| PR | Branch | Scope |
|---|---|---|
| **#35** | `nightly/2026-10-26-landing-links` | *from the 01:00 job* — hero CTAs were crossed (label "เกี่ยวกับเรา" linked to `/services`), `moreHref` accepted but ignored. Verified against `main` before accepting. |
| **#34** | `feat/content-gate-and-ia` | content contract + `npm test` gate, document category routes with breadcrumbs, `/contact` + 7th nav item, breadcrumbs + `BreadcrumbList` on every interior page |
| **#36** | `feat/qa-gates` | gates wired into CI, `scripts/check-export.mjs`, and the English photo-parity bug it caught |
| **#37** | `feat/news-pagination` | news index paginated at 12 per page, `/news/` is page 1, TH/EN — opened 02:40, build SUCCESS |

Merge order: **#35 → #34 → #36 → #37**. #35 and #34 were trial-merged locally: clean, no
conflicts. #37 was rebased onto #34 and goes last (it moves the breadcrumb into the shared
news index component).

### 2.1 Content gate (`npm test` — 6 tests here, 7 with #36, no dependencies)

Enforces: equal content files per locale · every content URL is https · every `source`
block has `retrieved:` · homepage statistics keep their sample-data label · no content
value left as `TODO(translate)` · news items have unique ids, ISO dates and newest-first
order · English news derives its photo set from the Thai source.

### 2.2 Export integrity (`scripts/check-export.mjs` — on #36)

Walks `out/` and fails on: internal links that do not resolve, missing asset or `srcset`
candidates, `href="#"` / `href=""`, plain-http links, and any Thai route without an
English twin. Numbers depend on how much of the stack is applied, so they are stated per
tree rather than as one figure:

| tree | result |
|---|---|
| #34 + #36 (no pagination) | 141 HTML files, 140 routes, 7,254 internal refs — OK |
| #34 + #36 + #37 (paginated) | **149 HTML files, 148 routes, 7,648 internal refs — OK** |
| all four in the accepted order | **149 HTML files, 148 routes, 7,654 internal refs — OK** |

Proven red by injecting one broken link (reported with file and URL) and green after
reverting.

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

## 3. QA evidence (real output)

Re-run at 05:30 on `feat/content-gate-and-ia` at commit `8612b43`, clean working tree,
one command at a time. These are the actual exit codes and counts.

| Command | Exit | Real output lines |
|---|---|---|
| `npm test` | **0** | `1..6` / `# tests 6` / `# pass 6` / `# fail 0` |
| `npm run lint` | **0** | `✖ 9 problems (0 errors, 9 warnings)` |
| `npm run typecheck` | **0** | `✓ Types generated successfully` (then `tsc --noEmit` silent) |
| `npm run build` | **0** | full route table for `/th`, `/en` and interior pages, `○ (Static)` + `● (SSG)` |

**Scope warning, do not misread this section.** The export integrity walk (141 files /
140 routes / 7,254 internal refs), `scripts/check-export.mjs`, `npm run build:export` and
`npm test` inside CI are **not** on this branch — they live on **#36** (`feat/qa-gates`).
This branch has only `tests/content.test.mjs` (6 tests) and no `scripts/` directory; its
CI runs lint, typecheck and build only. Those export numbers were measured earlier on a
combined #34 + #36 build and stay unproven until #36 lands.

Earlier in the session, on that combined branch: `npm audit` 0 vulnerabilities, secret
scan clean (no tokens, keys, `.env` or `.pem` tracked). Not re-run at 05:30.

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

## 4.5 Independent review (after the owner's 05:00 instruction)

A separate reviewer agent audited #35 and #34 read-only and returned **#35 APPROVE_WITH_NITS** and **#34 REQUEST_CHANGES**. Verdicts, and the four real defects it found in #34, are fixed in `c5b836b`:

| Severity | Defect | Fix |
|---|---|---|
| high | contact page emitted `tel:+66053873400` — undialable, and inconsistent with the footer's `tel:053873400` | `lib/phone.ts::telHref()` used by contact, about and footer |
| medium | `aria-label="breadcrumb"` was hardcoded English on every Thai page | content key `breadcrumbLabel` + `locale` prop |
| medium | contact page mixed three e-mail addresses and two address sources | meta and body both from `about.contact`; which address is monitored is an owner decision |
| medium | `lib/content.ts` was dead code pointing at a non-existent script | `SourceLine` now takes a `Provenance`; comment points at `tests/content.test.mjs` |

Docs and gate gaps it named (M04/M08 staleness, count-vs-name locale parity, first-block-only source check, Thai-only news test) were fixed in the same commit. The reviewer's most useful line: on #34's base the export has 8 broken refs, after merging #35 it is 0 of 4,513.

Also this session: #36 and #37 were rebased onto the updated #34 / #36 (the pagination PR conflicted with the breadcrumb work in `app/[locale]/news/page.tsx`; resolved by moving the breadcrumb into the shared `components/news-index.tsx`). Both re-pushed; CI green again.

## 4.6 Post-merge runbook (queued, not executed — merges are owner-only)

The owner's instruction forbids reducing required reviews, self-approval, auto-merge and
force-merge. So nothing below has been run: each step waits for the owner's own merge of
the PR before it. The steps are written down now so the sequence is auditable.

| After the owner merges | I will run | Proves |
|---|---|---|
| **#35** | `git checkout main && git pull`, verify the hero links in a real export, then `gh pr edit 36 --base main` (its base #34 is not merged yet, so only the base move is possible) | the fix is on main, not just on a branch |
| **#34** | `git checkout main && git pull`, `gh pr edit 37 --base main` once #36 lands | bases follow the merged history instead of dangling feature branches |
| **#36** | rebase #37 onto main, **delete the duplicate photo rule** in `content/en/news.ts` (`HAS_PHOTO`), point its comment at `getNews`, rerun every gate | the rule lives in exactly one layer instead of two |
| **#37** | rerun `npm test` + `build:export` + `check-export` on main, then confirm the Pages preview deploys | pagination works on the deployed site, not only in a branch build |

Two things I cannot do and will not attempt: approve a PR (GitHub does not let the author
approve their own) and merge without the owner's action or explicit instruction.

## 5. Outstanding defects

1. **`/news` payload is large** — 58 cards, ~200 KB of HTML plus lazily loaded photos. Fine on desktop, heavy on a slow phone. A paginated or "load more" index is the fix; it changes the URL shape, so it needs an owner decision.
2. **Four news items have no photo** — correctly render without one, but the cards look inconsistent next to the others.
3. **Search is substring-only and client-side** — no ranking, no fuzzy match, no cross-language. Adequate for 140 pages; wrong at 1,000.
4. **#35 nit** — three section links share the accessible name "ดูทั้งหมด / View all"; WCAG 2.4.4 passes in context but a per-section label would be better. Its branch is checked out in another worktree (the nightly job), so this is a post-merge follow-up, not a concurrent write.
5. **Duplicated rule** — #35 and #36 both fix the English photo set (in `lib/i18n.ts` and `content/en/news.ts`). #36's copy becomes redundant once #35 lands; remove it so the rule lives once.
6. **Which contact e-mail is monitored** — the page now shows the three addresses the office publishes on its about page; the owner has to say which is authoritative before launch.
7. **Warnings in `docs/research/tools/*.mjs`** (9 ESLint warnings) — research scripts from the Cursor handoff, out of scope but still noise.
8. **Breadcrumb on the home page is absent by design** — noted so nobody "fixes" it later.

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

1. **Owner review + merge #35 → #34 → #36 → #37** (this unblocks everything else).
2. News index pagination or "load more" (needs the URL-shape decision).
3. FAQ / knowledge section once copy is approved.
4. Weekly news refresh (a cron that re-runs the harvest; same scripts, guarded by the gates).
5. Blueprint reconciliation: the module matrix still labels Phase 1 = foundation while the owner decision says public website — one document should yield to the other.

## 8. Owner decisions requested

1. Approve merging the four draft PRs, in the order above.
2. Approve or reject #37's pagination shape (`/news/` = page 1, `/news/page/2`…) versus one
   long page with "load more" — the URL shape is hard to change after launch.
3. Confirm that the CI workflow change in #36 (adding `npm test` + export integrity) is acceptable — it is the first workflow edit in this project.
4. Decide whether the four photo-less news items should get a generic office photo (needs an approved asset) or stay photo-less.
5. Say when to start on the real domain, so `SITE_URL` can be switched in one place.

---

`RAE_OVERNIGHT_QA = PASS`
`RAE_OWNER_REVIEW_REQUIRED = YES`
