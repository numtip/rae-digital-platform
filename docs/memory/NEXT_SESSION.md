# Next session — after 2026-10-27 (VPS CMS run)

`main` is `9cb8c91`. PRs #57, #58 and #59 are merged and live on Pages. Three website PRs
(#61–#63) and the CMS alignment PR (#64) are open, green, and wait only on a review.

## Merged

| PR | Merge commit | What landed |
|---|---|---|
| [#57](https://github.com/numtip/rae-digital-platform/pull/57) | `3d25a54` | `/knowledge/` hub (M04) + `/news/events/` (M05), search in the utility bar, AA fix on news dates |
| [#58](https://github.com/numtip/rae-digital-platform/pull/58) | `7298c47` | CMS workflow: officer submits own draft, sessions 30 m idle / 8 h absolute, login throttle 5/15 m, return-for-revision |
| [#59](https://github.com/numtip/rae-digital-platform/pull/59) | `9cb8c91` | footer renders all 8 NAV sections; homepage quick links to both new pages |

`--admin` was used for the missing review only, on the owner's one-time authorisation for
#57–#60. Branch protection was never changed (`reviews=1`, `checks=[build]`, strict, no
force-push, no deletions).

## Open, green, needs a review (no admin authorised)

| PR | Files | What it adds |
|---|---|---|
| [#61](https://github.com/numtip/rae-digital-platform/pull/61) | about page + 2 content files | `/about/` organisation structure: the three division names the office publishes |
| [#62](https://github.com/numtip/rae-digital-platform/pull/62) | documents pages + 2 content files | Document Center categories state how many links they open (4 / 1 / 5) |
| [#63](https://github.com/numtip/rae-digital-platform/pull/63) | news detail page | `NewsArticle` JSON-LD carries `url` + `mainEntityOfPage` per locale |
| [#64](https://github.com/numtip/rae-digital-platform/pull/64) | 2 new files | 002 schema alignment + `cms-runtime/.env.example` (names only, no secrets) |

No two of them touch the same file, so they can merge in any order.

## CMS database on VPS 190 (provisioned)

- Container `rae-cms-db` (mariadb **10.6.24**), own network `rae-cms-net`, own volume
  `rae-cms-db-data`, **no published ports**, restart unless-stopped, labels
  `rae.project=rae-digital-platform`, `rae.purpose=cms-content-store`.
- Database `rae_cms`: four tables from `001_init.sql` plus `002_runtime_alignment.sql`.
- Account `rae_cms_app`: `SELECT, INSERT, UPDATE, DELETE` on `rae_cms` only. Isolation proven
  by the errors it gets: cannot create a database, cannot read `mysql.*`, cannot DDL its own
  tables, cannot read `learning_center.*`.
- CRUD + workflow round trip with disposable rows (draft → review → approved → published →
  returned with reason), the published-only query returned exactly the published row, then
  every test row was deleted. The database is empty: 4 tables, ~80 KB.
- Credentials: `~/.config/rae-cms/db-env` on 237 (0600) and `~/rae-cms-secrets/db-env` on 190
  (0600). Never in Git; `.env.example` carries names only.
- Pre/post health identical: attendance 200, RAE V2 200, learning-center 200, static staging
  200, raenew2026 301 (by design), rae-landing 403 (pre-existing), 27 → 28 containers, the
  only unhealthy container is the pre-existing `nginx`.

## Verified facts worth keeping

- Live sweep after the merges: 152/152 sitemap routes, `<html lang>` / canonical / hreflang /
  single `<h1>` / `#main-content` 152/152, `href="#"` 0, 380 images, 0 problems.
- `npm test` 32/32 on the CMS branch, 24–28/28 on the website branches; typecheck clean; lint
  0 errors / 9 pre-existing warnings; `check-export` OK everywhere.
- The five knowledge destinations answer 200: `kb.mju.ac.th`,
  `researchex.mju.ac.th/dbplant/`, `maejovision.mju.ac.th`, the ThaiJO journal, the newsletter.
- 54 published activities carry a `ข่าวกิจกรรม…` type and none has a future date, so the events
  page's upcoming section correctly does not render.
- CMS chain #51/#52/#54 was merged with **0 recorded approvals**; `reviewDecision` reads
  `REVIEW_REQUIRED` even on merged PRs, so it never proves a review happened.

## Do not do yet

- Do not merge #61–#64 without a review, do not lower the review requirement, no `--admin`
  beyond the owner's one-time authorisation for #57–#60.
- Do not start or deploy the CMS runtime, and do not touch DNS, Cloudflare, Nginx or SSO.
- Do not invent copy: the remaining gaps (homepage statistics, FAQ, PDPA and accessibility
  policy text, per-article knowledge copy, a forward event schedule) have no approved source.

## Next tasks, in order

1. Review/merge #61, #62, #63, #64 (any order).
2. News category filter on `/news/`, derived from the type strings the office already
   publishes — buildable now that #57 is in.
3. Repository layer so the CMS writes to `rae_cms`, ending the in-memory desk.
4. Still open for the owner: whether a publisher may publish an item they authored (today only
   pinned items need a second person).
