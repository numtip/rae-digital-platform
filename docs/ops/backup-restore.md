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

**Status 2026-11-27:** corrected scripts are installed in `~/rae/rae-cms-backups/bin/`; a run under cron's minimal environment succeeded (dump + media + sha256, restore verified, 11 tables). Last cron-scheduled success before the fix: 2026-10-28T02:45Z (29 Oct–25 Nov dumps exist but were not checksummed — script bug); no run since 25 Nov (old path). The crontab itself could not be changed by the agent (permission guard). Owner, as `rae_admin`:
```
crontab ~/rae/ops/crontab.rae-admin.proposed      # previous one saved at ~/rae/ops/crontab.rae-admin.before-20261127
crontab -l | grep rae-cms                          # expect the two lines above
```
Verify the next morning: `tail -2 ~/rae/rae-cms-backups/backup.log` shows `backup ok` for 02:45Z, and on Sunday `tail -3 ~/rae/rae-cms-backups/restore-verify.log` shows `restore verification OK`.
