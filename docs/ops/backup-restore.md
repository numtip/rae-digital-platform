# M22 — CMS backup and restore verification

Scripts live in `scripts/ops/` and are installed to `~/rae/rae-cms-backups/bin/` (reuses the existing `rae-cms-db` dump, media tarball, retention and `daily/`/`weekly/` layout). Paths derive from `RAE_HOME` (default `~/rae`).

- `backup-rae-cms.sh` — nightly dump of `rae_cms` + media, `gzip -t`, table check (users, sessions, news_articles, audit_logs, documents), sha256. Retention 14 daily / ~26 weekly.
- `verify-restore-rae-cms.sh [dump]` — checks sha256, restores into a **throwaway MariaDB container with no network**, compares per-table row counts with live, removes the container. Live DB is read only.

Crontab (user `rae_admin`):
```
45 2 * * * /bin/bash $HOME/rae/rae-cms-backups/bin/backup-rae-cms.sh >> $HOME/rae/rae-cms-backups/backup.log 2>&1
30 4 * * 0 /bin/bash $HOME/rae/rae-cms-backups/bin/verify-restore-rae-cms.sh >> $HOME/rae/rae-cms-backups/restore-verify.log 2>&1
```
Fixed 2026-11-27: the old script's `zcat | grep -q` under `pipefail` aborted on dumps > a few KB (no checksum or media written 2026-10-29…11-25) and the cron path predated the move into `~/rae/`. Off-box copy is deferred.
