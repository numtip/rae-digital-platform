# Next session — RAE digital platform (2026-10-29, 02:30 +07)

`main` is `4c79b58`. The Pages site is clean at 152 URLs (`node scripts/qa-live.mjs` → 0 problems).
The committed `public/cms-published/` data carries one article, `quality-assurance-public-hearing-2026`;
the earlier `staging-real-20261027` record is retired.

## The open CMS stack, in merge order (all draft, all CLEAN, waiting on the owner)

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
  every 5 minutes (that wrapper is on the host, not in this repo). The in-repo
  `scripts/cms-sync-gh.sh` only lands regenerated `public/cms-published/` data as the reused
  `cms/auto-sync` PR; the wrapper polls `build` and squash-merges that PR, which is why #79 and
  #82 show `numtip` as the merger (#78, #81 changed the runner). `scripts/cms-preview.mjs` is now
  only a local eyeballing tool.
- Search: one index entry per document category, at its own page (this branch). Before, every
  category was also indexed against `/documents`: the same row appeared twice and its second copy
  left the reader on the documents hub instead of the category page, while the documents section
  counted 7 entries for 4 destinations. `งานวิจัย` returned 30 rows on the Pages build, 29 after;
  the index carries 79 entries per locale before, 76 after (both locales always agreed — an
  earlier count of 73/78 was an artefact of reading the flight payload as text).
- Share cards: `og:image` carries the basePath once (#80).

## Next useful steps, in order

1. Owner: review and merge the stack in the order above, #90 last.
2. After #88 lands: apply `cms-runtime/migrations/007_editorial_lifecycle.sql` before deploying a
   runtime that writes the new columns.
3. The desk still has no real staff accounts; one officer cannot walk draft → review → publish.
   The owner supplies names and roles — do not invent a roster.
4. Re-run `node scripts/qa-live.mjs` against the Pages origin after any merge that touches routes.
