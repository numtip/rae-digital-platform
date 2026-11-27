# VPS190 maintenance tasks (owner-side, opened 2026-11-27)

Separate from the RAE platform. Found while verifying the backup crontab; **not modified**. Each is an independent task.

| ID | Item | Observation | Owner decision |
|---|---|---|---|
| VPS-M1 | `~/docker-raeserver/backup_db.sh` (cron 03:00Z daily) | script and its `backups/` dir do not exist | remove entry or restore script |
| VPS-M2 | `~/risk/kri_collect.sh` (cron every 10 min) | script does not exist; fails 144×/day | remove entry or restore script |
| VPS-M3 | `/opt/raenew2026` `backup.sh` (cron 02:15Z) | `/opt/raenew2026/logs/` is root-owned, so the `>> backup-cron.log` redirect cannot write | fix ownership or drop entry |

## Owner tasks carried over
- **PERSONNEL_KEY offline copy** (`~/rae/rae-cms-secrets/personnel.key`): the owner must keep an offline copy; DB dumps hold ciphertext only and a lost key is unrecoverable.
- **Backup schedule verification:** `BACKUP_CRON_INSTALLED=YES`, `BACKUP_SCHEDULE_VERIFIED=PENDING` until `backup ok` (2026-11-28 02:45Z) and `restore verification OK` (2026-11-29 04:30Z).
