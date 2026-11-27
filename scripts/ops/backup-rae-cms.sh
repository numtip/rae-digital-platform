#!/usr/bin/env bash
# Nightly backup of the isolated RAE CMS database (rae_cms) only.
#
# Nothing else on this host is touched: the dump is taken inside the rae-cms-db container, the
# files land in $RAE_HOME/rae-cms-backups (0700, 0600 per file), and the retention here applies to
# these files alone. Other applications keep their own jobs in the same crontab.
set -euo pipefail
umask 077

RAE_HOME="${RAE_HOME:-$HOME/rae}"
SECRETS="$RAE_HOME/rae-cms-secrets"
DIR="$RAE_HOME/rae-cms-backups"
set -a
# shellcheck disable=SC1091
. "$SECRETS/db-env"
set +a

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$DIR/daily" "$DIR/weekly"
FILE="$DIR/daily/rae_cms-$STAMP.sql.gz"

docker exec rae-cms-db mysqldump \
  -uroot -p"$MARIADB_ROOT_PASSWORD" \
  --single-transaction --routines --events --databases rae_cms \
  | gzip -9 > "$FILE"

chmod 600 "$FILE"
gzip -t "$FILE"

# A dump that cannot rebuild every table is not a backup.
# (grep -c reads the whole stream: `grep -q` closes the pipe early and pipefail then reports a false failure.)
for table in users sessions news_articles audit_logs documents; do
  if [ "$(zcat "$FILE" | grep -c "^CREATE TABLE \`$table\`")" = "0" ]; then
    echo "backup FAILED: $table missing from $FILE" >&2
    exit 1
  fi
done

sha256sum "$FILE" > "$FILE.sha256"
chmod 600 "$FILE.sha256"

# One copy a week is enough for the long tail; Sundays only, so the weekly set stays small.
if [ "$(date -u +%u)" = "7" ]; then
  cp -p "$FILE" "$DIR/weekly/"
  cp -p "$FILE.sha256" "$DIR/weekly/"
fi

# Retention: 14 daily, ~26 weekly.
find "$DIR/daily" -name 'rae_cms-*.sql.gz*' -mtime +14 -delete
find "$DIR/weekly" -name 'rae_cms-*.sql.gz*' -mtime +182 -delete

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

echo "$(date -u +%FT%TZ) backup ok $(basename "$FILE") $(stat -c %s "$FILE") bytes$( [ -f "$DIR/daily/rae_cms-media-$STAMP.tar.gz" ] && echo " + media $(stat -c %s "$DIR/daily/rae_cms-media-$STAMP.tar.gz") bytes" )"
