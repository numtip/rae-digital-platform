# Next session — RAE digital platform (2026-10-28, 02:30 +07)

`main` is `87f92d9`. PRs #57–#74 are merged. The public site on Pages is unchanged tonight, and the
editorial system is still **staging only** on VPS 190, bound to `127.0.0.1:3317`.

## Waiting for the owner (nothing merged, nothing deployed)

| PR | What it carries | State |
|---|---|---|
| [#75](https://github.com/numtip/rae-digital-platform/pull/75) | the language switcher keeps the search word (`/th/search/?q=…` → `/en/search/?q=…`) | draft, awaiting approval |
| `nightly/2026-10-28-b` | a CMS-published article shows its own photo on the news card; a news page's JSON-LD image is the same URL as `og:image` | draft, awaiting approval |

## What this night proved (real runs on this machine)

- `npm test` — 67 pass / 0 fail / 3 skipped (the three that need a database).
- typecheck clean; lint 0 errors (9 pre-existing warnings); `build:export` 156 routes; `check-export`
  OK — 157 files, 9,106 internal refs, 152 share cards.
- Live sweep of the Pages preview (`scripts/qa-live.mjs`) — 152/152 URLs, lang/canonical/hreflang/h1
  on all, 382 images, **0 problems**.
- The CMS card was rendered in `next dev` with a local fixture: before the change the card drew the
  grey bar and no `<img>`; after, it renders the article's own photo with the locale's alt text, and
  an archive card still emits its three-width `srcSet`.
- The structured-data defect was proven red before it was fixed: on **108** pages the JSON-LD image
  was `…/rae-digital-platform/rae-digital-platform/images/…` while `og:image` named the right URL.
  `check-export` now asserts the two agree; after the fix it reports 0.

## Still true from earlier nights

- Staging article `staging-real-20261027` (published, the owner's five photos of the 26 Oct 2026
  public hearing, bilingual captions and alt text): `ssh -L 13317:127.0.0.1:3317 vps190`.
- Guards on 190: `../../etc/passwd` as an id → 400, `passwd.jpg` → 404, a 13 MB upload → 413 with no
  file written, a draft's image → 404 without a token, `/v1/export` without a token → 401.
- Backups verify with `sha256sum -c`, and a restore into a disposable database yields the published
  article with its five media rows and five files.

## Deliberately not done

- **Nothing reaches GitHub Pages from the CMS.** Syndication is still an owner decision (scheduled
  import from `/v1/export`, or by hand). `scripts/cms-preview.mjs` remains the only bridge, and a
  production build refuses to run while `public/cms-published/` exists.
- The CMS card loads the uploaded photo at full size — no resized copy exists. Fine while this path
  stays local; it needs resizing the day syndication is approved.
- Reviewer nits left alone: `MEDIA_SRC` duplicates the runtime's `SAFE_MEDIA_FILE`, and
  `lib/cms/preview-site.ts` validates no media URL (a missing `altTh` throws a `TypeError`).
- M13/M15 (storage), M12 (PDPA), M17 (announcements) and the desk login path stay blocked on owner
  decisions — see `MODULE-COMPLETION-MATRIX.md`.

## Next useful steps, in order

1. Review and merge #75, then `nightly/2026-10-28-b`. `main` still requires the `build` check; the
   owner merges.
2. Decide the published-news syndication path (scheduled import or manual).
3. When the owner is done reviewing the staging article: delete `staging-real-20261027` and its
   media, then retire the four `test-*` accounts (keep the audit rows).
