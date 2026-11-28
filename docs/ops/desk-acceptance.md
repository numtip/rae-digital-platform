# Desk acceptance (`npm run acceptance:desk`)

`scripts/desk-acceptance.mjs` is the only check that sees the CMS admin desk. It drives the real, logged-in desk
in headless Chromium over the DevTools protocol and runs axe-core against it, light and dark, with a toast on screen.

## Why the static gates cannot see the desk

`app/[locale]/cms-admin/page.tsx` returns `notFound()` when `NEXT_PAGES_PREVIEW === "1"`. The export build sets
that variable, so `build:export` renders the desk as a 404 and `check:a11y`, `check:contrast` and `check:export`
(after `npm run build:export`) only ever measure a "Not found" page. Nothing static can reach a surface that needs
a session: the desk's behaviour — the confirmation before a move readers notice, the toast, the persistent inline
error, the refusal a role gets — exists only after `/v1/login` has minted a token in the browser.

## Run it

```bash
# a desk and its runtime, both local
NEXT_PUBLIC_CMS_API=http://127.0.0.1:3317 npx next dev -p 3417
RAE_CMS_DB_HOST=127.0.0.1 RAE_CMS_DB_PORT=3306 … node cms-runtime/server.mjs

# then, with a publisher account:
RAE_CMS_USER=… RAE_CMS_PASSWORD=… npm run acceptance:desk
# optional: the second account the refusal check needs
RAE_CMS_OFFICER_USER=… RAE_CMS_OFFICER_PASSWORD=… npm run acceptance:desk
```

Output is one line per check plus a summary; the exit code is 1 when any check fails or a seeded row is left behind:

```
PASS  documents     the seeded row is on the desk
PASS  documents     confirm dialog before going current
PASS  documents     keep leaves the record unchanged
PASS  documents     confirming shows a success toast
…
PASS  axe           en/dark: WCAG A/AA with a toast on screen
FAIL  refusal       the inline error outlives the toast — the error cleared with the toast
cleanup: 8 seeded row(s), 1 media folder(s) removed; left behind 0 row(s); audit rows untouched
FAIL 27/28 (1 skipped)
```

`--dry-run` prints the plan (desks, checks, required variables) and touches nothing. `--base-url` points the run at
another desk (default `http://127.0.0.1:3417`); `RAE_CMS_API` (default `http://127.0.0.1:3317`) is the runtime the
run seeds through, and must be the same one the desk was built against.

## Required environment

| Name | What it is |
| --- | --- |
| `RAE_CMS_USER`, `RAE_CMS_PASSWORD` | A desk account with the `publisher` role. Absent: the script exits 2 with a message and does nothing. |
| `RAE_CMS_OFFICER_USER`, `RAE_CMS_OFFICER_PASSWORD` | Optional. An `officer` account. Absent: the refusal check is reported `SKIP`, not passed. |
| `RAE_CMS_API` | Runtime base URL for seeding and verification (default `http://127.0.0.1:3317`). |
| `RAE_CMS_DB_HOST` … `RAE_CMS_DB_PASSWORD`, `RAE_CMS_DB_NAME` | Optional. When set, cleanup deletes the seeded rows instead of archiving them. The same names `tests/cms-repository.test.mjs` uses. |
| `RAE_CMS_MEDIA_DIR` | Optional. The runtime's media root, so cleanup can also remove the uploaded image folder. |
| `CHROME` | Optional. Path to a Chromium binary (default `chromium-browser`). |

Credentials are read from the environment only. The script never writes a password to a file, and prints only the
user id, never the secret.

## What it seeds, and how it cleans up

Every row carries the `[acceptance]` title prefix. That is the marker cleanup looks for, so a run interrupted
half-way is still cleaned up by the next one.

| Desk | Row | Confirm-gated move |
| --- | --- | --- |
| documents | draft, SharePoint link to a file | `current` |
| knowledge | FAQ draft | `published` |
| events | draft event (Bangkok time) | `published` |
| announcements | banner draft inside its window | `published` |
| departments | top-level unit draft | `published` |
| media | uploaded 1×1 PNG asset, both alt texts | `published` |
| personnel | person with `consent: true`, public | none — status is active/inactive only, so its dialog checks are `SKIP` |

Cleanup then:

- lists each desk, collects every row whose title starts with `[acceptance]`, and deletes those rows by code —
  `documents`, `knowledge_entries`, `events`, `announcements`, `departments`, `personnel` (+ `personnel_private`),
  `media_assets`, plus the `media_assets` image folder under `RAE_CMS_MEDIA_DIR/library/<code>`;
- without database access it archives them through the API instead and says so on the cleanup line;
- re-lists the desks and reports anything still marked, so "left behind 0 row(s)" is a measurement, not a claim;
- never deletes `audit_logs`. Those rows are the point of the trail and stay.

## What a failure looks like

Each line names the desk and the check that broke. The common ones:

- `confirm dialog before going published` — the status select moved without a dialog; a destructive move is unguarded.
- `keep leaves the record unchanged` — "Keep as is" wrote to the record anyway.
- `confirming shows a success toast` — either no toast, or the record's status did not follow it.
- `en/dark: WCAG A/AA with a toast on screen` — axe found violations; each one is printed under the line with its
  rule id, impact and up to three offending selectors.
- `the inline error outlives the toast` — a refused action only produced a toast, so the reason is gone from the
  screen before the reader can act on it.

## Known limits

- It needs a running desk, a running runtime and a real account. There is no fixture mode: without a session there is
  no desk to measure, which is the whole reason this script exists.
- It is not part of `npm run qa` and not part of CI. CI has no database and no desk account, and the run writes rows.
- It walks the `en` desk. The `th` desk is only measured by axe, not walked: labels are matched by position (the
  first dialog button is "keep", the last is the action), so the flow does not depend on the copy, but the Thai
  wording itself is not exercised.
- The officer check needs a second account. A desk that only has a publisher cannot prove the refusal path, and the
  run says `SKIP` rather than passing it.
- Media seeding uploads a 1×1 PNG; nothing here checks image rendering, only that the row, the status move, the
  dialog and the toast behave.
