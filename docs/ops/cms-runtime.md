# CMS runtime (not deployed as a public service)

The API in `cms-runtime/server.mjs` is an internal process bound to loopback. It is not part of
the static export, it publishes no public route, and nothing on the host starts it yet.

## Storage

Two repositories behind one shape: the isolated MariaDB database `rae_cms` (container
`rae-cms-db`, network `rae-cms-net`, no published ports) and, when no database is configured,
the in-memory maps the desk used before. `RAE_CMS_DB_HOST` selects MySQL at startup; see
`cms-runtime/.env.example` for the names only — real values live in a 0600 file outside Git
(`~/rae-cms-secrets/runtime.env` on the database host, `~/.config/rae-cms/db-env` on the
Hermes host).

Users, sessions, articles and audit rows all persist, so a restart keeps sessions and editorial
state. Authentication stores only a session hash. A session ends after 30 idle minutes or 8
hours in total, whichever comes first, and that check now runs against the database on every
request. Five failed logins lock that account for 15 minutes (sliding window,
`lib/cms/login-throttle.ts`).

## Workflow (approved publishing policy)

An officer creates, edits and submits their own draft. A reviewer approves it or returns it
with a reason, which puts it back to draft so the author can edit and resubmit. A publisher may
release their own item only when a different person approved it; a pinned item keeps three
distinct participants (author, reviewer, publisher). Draft, review and returned items never
appear in `/v1/export`.

## Startup and activation

The service must have a database: `startRuntime()` throws when `RAE_CMS_DB_HOST` is missing, so
an operator who forgets the environment gets an error instead of a desk that loses articles on
restart. `createCmsServer()` on its own still defaults to the in-memory repository, which is what
the tests use. The listener is always `127.0.0.1`.

Prepared on the database host (not activated): `~/rae-cms-runtime/prepare-app.sh` refreshes a
checkout and installs the one dependency the runtime needs, and
`~/.config/systemd/user/rae-cms-runtime.service` runs it in `node:22-bookworm-slim` on the
`rae-cms-net` network with the port published on loopback only. Activation requires the owner's
approval and the CMS code on `main`; the unit is installed but disabled.

## How published news reaches the static site

The public site stays a static export; the runtime is never reachable from it. The simplest
Blueprint-compatible path, and the one to build when the CMS opens for editorial use:

1. a nightly job on the host calls `GET /v1/export` over loopback with a dedicated account and
   writes the result to a JSON file inside the site checkout (`content/news.export.json`);
2. the Pages build imports that file and appends the items to the news content, so the index,
   the detail routes and the sitemap pick them up with the existing code;
3. drafts, review items and returned items never leave the database, because `/v1/export` only
   ever returns `status = published`;
4. nothing is served from the CMS at request time, so Pages keeps working when the runtime is
   down, and the static staging path keeps its Basic Auth and `noindex`.

## Migrations

`001_init.sql` then `002_runtime_alignment.sql`, applied to `rae_cms` only. `rollback.sql` drops
the four tables. Never apply any of these to the attendance database.

## Backups and restore

Nightly at 02:45 UTC from the user crontab (the RAE CMS job is separate from the other
application jobs on the host):

- script `~/rae-cms-backups/bin/backup-rae-cms.sh` (0700), logs to `~/rae-cms-backups/backup.log`
- dumps `~/rae-cms-backups/daily/rae_cms-<UTC stamp>.sql.gz` with a `.sha256` beside each file
- retention 14 daily + ~26 weekly (Sunday copies)
- each run verifies the gzip and that all four tables are present before it reports ok

Minimum restore, into a disposable database rather than over the live one:

```bash
ssh vps190
set -a; . ~/rae-cms-secrets/db-env; set +a
LATEST=$(ls -1t ~/rae-cms-backups/daily/rae_cms-*.sql.gz | head -1)
sha256sum -c "$LATEST.sha256"
docker exec -i rae-cms-db mysql -uroot -p"$MARIADB_ROOT_PASSWORD" \
  -e "DROP DATABASE IF EXISTS rae_cms_restore_test; CREATE DATABASE rae_cms_restore_test"
zcat "$LATEST" | sed 's/`rae_cms`/`rae_cms_restore_test`/g' \
  | docker exec -i rae-cms-db mysql -uroot -p"$MARIADB_ROOT_PASSWORD"
docker exec rae-cms-db mysql -uroot -p"$MARIADB_ROOT_PASSWORD" -e "SELECT COUNT(*) FROM rae_cms_restore_test.news_articles"
```

Restore into `rae_cms_restore_test` was verified on 2026-10-27: four tables, the expected rows,
and the merged `revision_reason`/`returned_by` columns all came back from the dump.
