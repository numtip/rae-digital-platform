# Next session — RAE digital platform (2026-10-31, companion run 02:30 +07)

`main` is `2ad5f1a`. CI and the Pages deploy for that commit are green, and the live site
serves the #94 build (measured on the public origin: `/th/news/37912/` description 154 chars).

## Open on GitHub — the owner's call, nothing merged tonight

- **#86, #87, #88, #89 are superseded.** All four are still open drafts (#88, #87, #86 read
  `DIRTY`, #89 `CLEAN`), but #90 ("integration: fast CMS publication hardening") merged exactly
  those four branches into `main` on 30 Oct 00:08 UTC — its own body lists them in dependency
  order. Closing them is the honest end; rebasing them would replay work that already shipped,
  and the next run that reads "4 open CMS PRs" will otherwise plan around a phantom stack.
- After any runtime deploy that writes the lifecycle columns, apply
  `cms-runtime/migrations/007_editorial_lifecycle.sql` first.
- The desk still has no real staff accounts: one `officer` cannot walk draft → review →
  publish. Names and roles are an owner-supplied decision — never invent a roster.
- Syndication is unchanged and live: the 237 crontab runs `~/bin/rae-cms-sync-cron.sh` every 5
  minutes; `scripts/cms-sync-gh.sh` lands regenerated `public/cms-published/` data as the reused
  `cms/auto-sync` PR and merges it itself after polling `build`.

## What this run changed (#95)

A page that sets its own `openGraph` replaces the layout's object whole; Next does not merge the
two. The news detail page sets one, so **all 118 article pages shipped without `og:site_name`,
`og:locale` and `og:locale:alternate`** (116 from the archive, 2 published through the CMS)
while the homepage kept them — every shared article card named no site and no language.

- `lib/seo.ts` now owns `openGraphSite(orgFull, locale)`; the locale layout and the news detail
  page both spread it. The office name is passed in, so `lib/seo.ts` keeps only a type-only
  import and `tests/seo.test.mjs` still loads it under Node's type stripping.
- `scripts/check-export.mjs` now asserts, for every URL in the sitemap, that `og:site_name`,
  `og:locale` and `og:locale:alternate` each appear exactly once, that `og:locale` matches the
  route's own locale, that the alternate is the site's other locale (`th_TH` ⇄ `en_US`, not
  merely something different), and that a locale does not invent a second site name. It already
  runs in CI.

Measured on the export: **og:site_name 38/159 pages before → 156/159 after** (the three without
it are the 404 documents: `noindex`, built outside the locale layout). Article pages 0/118 →
118/118. The new gate reported 354 problems (118 × 3) against a rebuild of the unfixed tree and
passes on this one — it has been seen red, and the alternate-locale and duplicate-tag assertions
were each proven with a mutated export (`fr_FR`, a second `og:site_name`) before being trusted.

## Checks that passed on #95 (this host)

`npm test` 133 tests — 130 pass / 0 fail / 3 skipped (database-only) · typecheck clean · lint
0 errors (9 pre-existing warnings) · `build:export` 159 html files, 158 routes · `check:export`
OK — 9,232 internal refs, 926 external links, 154 share cards · `check:contrast` OK, 159 pages.

## Next useful steps, in order

1. Review and merge #95 (metadata only; a merge deploys the Pages preview, never the VPS runtime).
2. Close #86–#89 as superseded by #90.
3. Carried over, still unresolved: the old organisation name survives inside imported news bodies
   (TH 10 / EN 25 places) and the owner has not decided whether published text may be rewritten;
   `/en/contact/` keeps a 172-character description on purpose; news index pages 2–4 reuse page
   1's description because a different one needs new approved copy.
4. Outbound links rot silently and nothing in CI probes them — re-probe `content/links.ts` and
   `content/*/documents.ts` before repeating the "live destinations only" claim.
