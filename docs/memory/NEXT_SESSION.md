# Next session — RAE digital platform (2026-10-27, 03:00 +07)

`main` is `d2ebcf3`. PRs #57–#66 are merged; the static site on Pages is unchanged tonight. The
editorial system is **staging only**, on VPS 190, bound to `127.0.0.1:3317`.

## The open stack, in merge order

| PR | Head | Base | What it carries |
|---|---|---|---|
| [#67](https://github.com/numtip/rae-digital-platform/pull/67) | `7a278fa` | `main` | the runtime binds to the container interface (loopback publish still works) |
| [#69](https://github.com/numtip/rae-digital-platform/pull/69) | `c193fc6` | `fix/cms-runtime-bind` | ordered article images: `news_media`, upload API, protected preview, published-only export with image references, article bodies (`body_th`/`body_en`), 12 MB request cap, id and file-name validation, tests that no longer write into the repository |
| [#70](https://github.com/numtip/rae-digital-platform/pull/70) | `af95443` | `feat/cms-media` | usable desk (editable bodies, image upload with captions, authenticated thumbnails, preview link) and `scripts/cms-preview.mjs` |

All three are green but **#67 needs a review**; no `--admin` merge has been used and branch
protection is untouched (`reviews=1`, checks `[build]`, strict).

The runtime on 190 currently runs `af95443` (the #70 head). After the stack merges:
`~/rae-cms-runtime/prepare-app.sh main && systemctl --user restart rae-cms-runtime.service`.

## What is proven, and how

- `npm test` — 51 pass / 0 fail / 3 skipped (the skipped three need a database).
- typecheck clean, lint 0 errors (9 pre-existing warnings), build + `check-export` OK — 156 routes,
  9,106 internal references.
- Live staging run on 190: three roles log in, five images attach in order, reviewer returns with a
  reason, author edits and resubmits, **approval does not export**, publisher publishes, the export
  carries five image references with bilingual captions, all five images download, the preview
  renders five figures, and everything survives a service restart.
- Guards live on 190: `../../etc/passwd` as an id → 400, `passwd.jpg` → 404, a genuine 13 MB upload
  → 413 with no file written, a draft's image → 404 without a token, `/v1/export` without a token
  → 401.
- Backup/restore: `rae_cms-*.sql.gz` + `rae_cms-media-*.tar.gz`, both `sha256sum -c` clean; restoring
  into a disposable database yields 5 tables, the published article, 5 media rows, and 5 image files
  whose names match the live ones.
- Production health unchanged throughout: attendance 200, RAE V2 200, learning-center 200, static
  staging 200, raenew2026 301, rae-landing 403 (pre-existing), 29 containers, only `nginx`
  unhealthy (pre-existing).

## The staging article

`staging-real-20261027` — published, with the owner's five photos of the 26 October 2026 public
hearing, Thai and English titles and bodies, bilingual captions and alt text.

```
ssh -L 13317:127.0.0.1:3317 vps190
# http://127.0.0.1:13317/preview/staging-real-20261027?lang=th
```

`scripts/cms-preview.mjs` renders the published export into static files under `out-cms-preview/`
(git-ignored, never deployed) so a browser check needs no public publishing.

## Deliberately not done

- Nothing reaches GitHub Pages from the CMS. Syndication needs an owner decision: which module owns
  it, and whether published CMS news becomes static content on a schedule or by hand.
- M13/M15 stay blocked on the approved-storage decision (A-1 / ADR-0004) — tonight's media lives on
  the isolated staging volume on 190, not in the public media library.
- A-39 and A-06 remain open. The desk UI itself could not be exercised in a browser without an owner
  login, so it is covered by unit tests and API-level runs only.

## Next useful steps, in order

1. Review and merge #67 → #69 → #70, then sync the runtime to `main`.
2. Decide the published-news syndication path (scheduled import from `/v1/export`, or manual).
3. When the owner is done reviewing: delete `staging-real-20261027` and its media, then retire the
   four `test-*` accounts (keep the audit rows if the history matters).
