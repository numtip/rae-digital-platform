# Audit closeout — 2026-11-25

Follow-up to `docs/reports/2026-11-25-repo-audit.md`. All 12 findings are handled; every code change is on `main`.

## Pull requests

| PR | What | Findings | State |
|---|---|---|---|
| #97 | Hero scrim gradient (written earlier) | 5 | merged |
| #100 | Port, publish hook, viewer media, JSON-LD escaping, 5-image cap, Windows test, password rule, README, audit transaction | 1, 2, 3, 4, 6, 7, 8, 9, 10 | merged |
| #101 | Lock file around the withdrawn list | 12 | merged |
| #102 | Remove unconnected Prisma schema | 11 | merged |
| #99 | Dependabot: next 16.4.5, eslint 10.14, tailwindcss 4.3.4 and related | not in audit | merged |
| #98 | Day closeout docs (earlier work) | not in audit | **open, not touched** |

## What changed, by finding

1. **Wrong port.** `cmsBase()` in `lib/cms/live.ts` defaults to `http://127.0.0.1:3317`, the port the runtime listens on.
2. **Unpublish did not stick.** The CMS now POSTs the site hook after publish (empty body) and unpublish (`{withdrawn:[id]}`), through `notifySite` in `cms-runtime/server.mjs`. Needs `RAE_REVALIDATE_SECRET` (and optionally `RAE_SITE_REVALIDATE_URL`; both named in `cms-runtime/.env.example`). With no secret it logs an error and the site is not told. The publish request itself still answers 200, because the article is already saved.
3. **Viewer could read draft photos.** `GET /v1/news/<id>/media` and `GET /v1/media/<id>/<file>` return 404 unless the article is published or in revision, or the caller has `news:draft`.
4. **Title could break the script.** `lib/json-ld.ts` (`jsonLdScript`) escapes `<`; used in the root layout, the news article page and `components/page-shell.tsx`.
5. **Hero contrast.** Fixed by merging #97. The 3.21:1 figure is from the PR's own measurement; it was not re-measured after merge.
6. **Photos 6 to 10.** The desk accepts at most 5 images, matching the public page.
7. **Content gate on Windows.** `tests/content.test.mjs` splits paths on either separator.
8. **Publish plus audit.** New `saveArticleWithAudit` on the repository: one MySQL transaction (rollback on failure) and a matching undo in the memory repository. Every news transition uses it.
9. **Password rule.** `hashPassword` calls `assertLocalPassword`, so seeding a short password now throws.
10. **README.** Status block and licence block describe the current repo (Apache-2.0, app and CMS in tree, CMS not publicly deployed).
11. **Prisma.** `prisma/schema.prisma` deleted. `NOTICE`, the licence-coverage test and `docs/ops/cms-foundation.md` updated. Architecture and roadmap docs still describe Prisma as a Phase 2 plan; that is a design decision left open.
12. **Tombstone race.** `rememberWithdrawn` takes `withdrawn.json.lock` (`wx`; stale after 10 s; waits up to 5 s, then throws so the hook answers 500 and the CMS can retry) and re-reads the list inside the lock.

## New tests

- `tests/json-ld.test.mjs`: JSON-LD escaping, password rule, the site hook call (secret sent, missing secret, HTTP failure), audit-failure rollback then retry.
- `tests/cms-media.test.mjs`: viewer gets 404 on a draft's image list and bytes; the sixth image is refused.
- `tests/withdrawn-lock.test.mjs`: 8 processes withdrawing at once all land; a stale lock is taken over.

Last full run before the final merges: `npm test` 141 pass, 0 fail on the finding-12 branch; `tsc` clean. PR #99 was built separately (`next build`, 162 static pages) and `npm audit --omit=dev` found 0 vulnerabilities.

## Not verified

- The MySQL transaction in finding 8 was not run against a real database; the test uses the in-memory repository.
- The finding-12 concurrency test was not run with the lock removed, so it is not shown to fail without the fix.
- The site hook (finding 2) was tested with a stand-in `fetch`, not against a running site.
- Contrast after #97 was not re-measured.

## Still open

- **Warnings:** `npm ci` prints peer-dependency warnings because `eslint` 10 is newer than the range `eslint-config-next`'s plugins declare (up to v9). It predates #99 and lint still runs (0 errors, 9 warnings in `cdp_*.mjs`, two `page.tsx` files). Left as is by decision.
- **PR #98** is still open.
- **Prisma in design docs:** decide whether Phase 2 still plans Prisma; if not, update `docs/architecture/*` and `docs/ops/vps-staging/*`.
- **Smaller notes from the audit** (login lockout is in memory only, `scrypt` on the CMS thread, media proxy re-reads on every cache miss, `document:register` and `user:assign_role` have no route) were not part of this work.

## Local state

`main` matches `origin/main` at `ad8a90e`, with `npm ci` run. Merged local branches were deleted; `docs/day-closeout-2026-11-02` is kept for PR #98. Remote branches were not touched.
