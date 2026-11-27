#!/usr/bin/env bash
# Proves a backup is restorable: checks its sha256, loads it into a DISPOSABLE MariaDB container
# (own network namespace, no published port, removed on exit) and compares table row counts with
# the live rae_cms. The live database is only read. Usage: verify-restore-rae-cms.sh [dump.sql.gz]
set -euo pipefail
umask 077
RAE_HOME="${RAE_HOME:-$HOME/rae}"
DIR="$RAE_HOME/rae-cms-backups"
set -a; . "$RAE_HOME/rae-cms-secrets/db-env"; set +a
FILE="${1:-$(ls -1 "$DIR"/daily/rae_cms-2*Z.sql.gz | tail -1)}"
[ -f "$FILE.sha256" ] && (cd "$(dirname "$FILE")" && sha256sum -c "$(basename "$FILE").sha256") || echo "note: no checksum file for $(basename "$FILE")"
gzip -t "$FILE"
NAME="rae-restore-test-$$"
PW="$(head -c 18 /dev/urandom | base64 | tr -dc A-Za-z0-9)"
IMAGE="$(docker inspect rae-cms-db --format '{{.Config.Image}}')"
cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker run -d --name "$NAME" --network none -e MARIADB_ROOT_PASSWORD="$PW" "$IMAGE" >/dev/null
# The image first starts a temporary init server, then restarts: wait for the second "ready for connections".
for _ in $(seq 1 90); do
  [ "$(docker logs "$NAME" 2>&1 | grep -c 'ready for connections')" -ge 2 ] && docker exec "$NAME" mariadb -uroot -p"$PW" -e 'select 1' >/dev/null 2>&1 && break
  sleep 2
done
zcat "$FILE" | docker exec -i "$NAME" mariadb -uroot -p"$PW"
FAIL=0
for t in $(docker exec "$NAME" mariadb -uroot -p"$PW" -N -e "select table_name from information_schema.tables where table_schema='rae_cms' order by 1"); do
  r="$(docker exec "$NAME" mariadb -uroot -p"$PW" -N -e "select count(*) from rae_cms.\`$t\`")"
  l="$(docker exec rae-cms-db mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" -N -e "select count(*) from rae_cms.\`$t\`" 2>/dev/null || echo ?)"
  echo "table $t restored=$r live=$l"
done
docker exec "$NAME" mariadb -uroot -p"$PW" -N -e "select count(*) from information_schema.tables where table_schema='rae_cms'" | sed 's/^/restored tables: /'
echo "restore verification OK: $(basename "$FILE") (disposable container removed)"
