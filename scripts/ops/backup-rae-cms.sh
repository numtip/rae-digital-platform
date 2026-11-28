#!/usr/bin/env bash
# Nightly backup of the isolated RAE CMS database (rae_cms) only.
#
# Nothing else on this host is touched: the dump is taken inside the rae-cms-db container, the
# files land in $RAE_HOME/rae-cms-backups (0700, 0600 per file), and the retention here applies to
# these files alone. Other applications keep their own jobs in the same crontab.
#
# Alongside the dump it writes a MANIFEST — the backup-time evidence that
# scripts/ops/verify-restore-rae-cms.sh checks a restore against. The manifest is what makes the
# weekly verification meaningful: it records the table set and the exact row count of every table
# as they were when the dump was taken, so a later restore is compared with the backup rather than
# with a production database that has moved on since.
set -euo pipefail
umask 077

RAE_HOME="${RAE_HOME:-$HOME/rae}"
DB_CONTAINER="${DB_CONTAINER:-rae-cms-db}"
DB_NAME="${DB_NAME:-rae_cms}"
SECRETS="$RAE_HOME/rae-cms-secrets"
DIR="$RAE_HOME/rae-cms-backups"
set -a
# shellcheck disable=SC1091
. "$SECRETS/db-env"
set +a

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$DIR/daily" "$DIR/weekly"
FILE="$DIR/daily/rae_cms-$STAMP.sql.gz"
MANIFEST="$FILE.manifest"

sql() {
  docker exec -e Q="$1" "$DB_CONTAINER" \
    sh -c 'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" -N -B -e "$Q"' 2>/dev/null
}

docker exec "$DB_CONTAINER" mysqldump \
  -uroot -p"$MARIADB_ROOT_PASSWORD" \
  --single-transaction --routines --events --databases "$DB_NAME" \
  | gzip -9 > "$FILE"

chmod 600 "$FILE"
gzip -t "$FILE"

# The table set and the per-table row counts, read once, immediately after the dump.
mapfile -t TABLES < <(sql "SELECT table_name FROM information_schema.tables WHERE table_schema='$DB_NAME' ORDER BY table_name")
if [ "${#TABLES[@]}" -eq 0 ]; then
  echo "backup FAILED: no tables found in $DB_NAME" >&2
  exit 1
fi

# A dump that cannot rebuild every table is not a backup.
# (grep -c reads the whole stream: `grep -q` closes the pipe early and pipefail then reports a false failure.)
# Driven by the table list rather than a hardcoded handful, so a module that adds a table cannot slip past.
for table in "${TABLES[@]}"; do
  if [ "$(zcat "$FILE" | grep -c "^CREATE TABLE \`$table\`")" = "0" ]; then
    echo "backup FAILED: $table missing from $FILE" >&2
    exit 1
  fi
done

DUMP_SHA="$(sha256sum "$FILE" | awk '{print $1}')"
DUMP_BYTES="$(stat -c %s "$FILE")"
{
  echo "# rae-cms backup manifest v1 — backup-time evidence for verify-restore-rae-cms.sh"
  echo "generated_at=$(date -u +%FT%TZ)"
  echo "database=$DB_NAME"
  echo "dump=$(basename "$FILE")"
  echo "dump_bytes=$DUMP_BYTES"
  echo "dump_sha256=$DUMP_SHA"
  echo "table_count=${#TABLES[@]}"
  for table in "${TABLES[@]}"; do
    echo "table $table $(sql "SELECT COUNT(*) FROM \`$DB_NAME\`.\`$table\`")"
  done
} > "$MANIFEST"
chmod 600 "$MANIFEST"

sha256sum "$FILE" > "$FILE.sha256"
chmod 600 "$FILE.sha256"

# One copy a week is enough for the long tail; Sundays only, so the weekly set stays small.
if [ "$(date -u +%u)" = "7" ]; then
  cp -p "$FILE" "$DIR/weekly/"
  cp -p "$FILE.sha256" "$DIR/weekly/"
  cp -p "$MANIFEST" "$DIR/weekly/"
fi

# Retention: 14 daily, ~26 weekly.
find "$DIR/daily" -name 'rae_cms-*.sql.gz*' -mtime +14 -delete
find "$DIR/daily" -name 'rae_cms-*.manifest' -mtime +14 -delete
find "$DIR/weekly" -name 'rae_cms-*.sql.gz*' -mtime +182 -delete
find "$DIR/weekly" -name 'rae_cms-*.manifest' -mtime +182 -delete

# The gallery files are not in the dump: they live on the media directory that the runtime
# mounts, so a backup that skips them restores an article without its pictures.
MEDIA="$RAE_HOME/rae-cms-media"
if [ -d "$MEDIA" ]; then
  MEDIA_FILE="$DIR/daily/rae_cms-media-$STAMP.tar.gz"
  tar -czf "$MEDIA_FILE" -C "$MEDIA" . 2>/dev/null || true
  chmod 600 "$MEDIA_FILE"
  gzip -t "$MEDIA_FILE"
  sha256sum "$MEDIA_FILE" > "$MEDIA_FILE.sha256"
  chmod 600 "$MEDIA_FILE.sha256"
  find "$DIR/daily" -name 'rae_cms-media-*.tar.gz*' -mtime +14 -delete
fi

echo "$(date -u +%FT%TZ) backup ok $(basename "$FILE") ${DUMP_BYTES} bytes, ${#TABLES[@]} tables in manifest$( [ -f "$DIR/daily/rae_cms-media-$STAMP.tar.gz" ] && echo " + media $(stat -c %s "$DIR/daily/rae_cms-media-$STAMP.tar.gz") bytes" )"
