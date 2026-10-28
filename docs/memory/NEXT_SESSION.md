# Next session — RAE digital platform (2026-10-29, 02:30 +07)

`main` is `4c79b58`. The Pages site is clean at 152 URLs (`node scripts/qa-live.mjs` → 0 problems).
The committed `public/cms-published/` data carries one article, `quality-assurance-public-hearing-2026`;
the earlier `staging-real-20261027` record is retired.

## The open stack, in merge order (all draft, all CLEAN, waiting on the owner)

| PR | Branch | What it carries |
|---|---|---|
| #86 | `feat/cms-live-news-pilot` | render published news from the live API |
| #87 | `feat/cms-viewer-role` | a viewer role reads published news and nothing else |
| #88 | `feat/cms-editorial-lifecycle` | withdraw a published article, revise one without taking it down |
| #89 | `feat/cms-live-news-canonical` | `/news` becomes the canonical news route |
| #90 | `integration/preprod` | the four above merged into one tree, gated as one system |

No `--admin` merge has been used and branch protection is untouched. #86 and #89 are the pair that
opens the build-time tuple (`generateStaticParams` + `dynamicParams = false`, a `force-static`
sitemap, a build-time search index) — that pair is what makes a newly published story appear
without a rebuild.

## On main now

- The desk: the login card comes first, then the editor (#85); `/cms-api/*` is proxied on the
  desk's own origin (#83) with `skipTrailingSlashRedirect` gated on `NEXT_CMS_API_PROXY` (#84).
- Syndication is live, not a proposal: the user crontab on 237 runs `~/bin/rae-cms-sync-cron.sh`
  every 5 minutes, which lands regenerated `public/cms-published/` data as the reused
  `cms/auto-sync` PR and merges it itself (#78, #79, #82; the runner compares against
  `origin/main` and reuses a PR only while it is open — #81). `scripts/cms-preview.mjs` is now
  only a local eyeballing tool.
- Search: one index entry per document category, at its own page (this branch). Before, every
  category was also indexed against `/documents`, so a category search answered with a page that
  does not list it ("งานวิจัย" returned 30 rows, one of them a dead end) and the documents chip
  counted each category twice. Now 29 rows, chip 1.
- Share cards: `og:image` carries the basePath once (#80).

## Next useful steps, in order

1. Owner: review and merge the stack in the order above, #90 last.
2. After #88 lands: apply `cms-runtime/migrations/007_editorial_lifecycle.sql` before deploying a
   runtime that writes the new columns.
3. The desk still has no real staff accounts; one officer cannot walk draft → review → publish.
   The owner supplies names and roles — do not invent a roster.
4. `lib/cms/build-guard.ts` has no importer left since the published data was committed. Deleting
   it is safe once no open PR needs the module.
5. Re-run `node scripts/qa-live.mjs` against the Pages origin after any merge that touches routes.
