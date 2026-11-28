#!/usr/bin/env bash
# Proves a backup is restorable, and that what came back is the backup.
#
# It loads the dump into a DISPOSABLE MariaDB container (no network, no published port, removed on
# exit) and compares the result with the manifest that scripts/ops/backup-rae-cms.sh wrote at
# backup time — never with the live rae_cms. The live database is not read at all: a verification
# that compares against a moving target can pass a broken backup (rows written since the dump make
# every count disagree) and fail a good one.
#
# It FAILS (exit 1) on: a missing dump or manifest, a sha256 that does not match the manifest (or
# the sidecar when present), a corrupt stream (gzip), a restore error, a disposable server that
# never becomes ready, a table present in the manifest but missing after restore, an unexpected
# table, or any table whose row count differs from the manifest.
#
# Usage: verify-restore-rae-cms.sh [dump.sql.gz]        (default: the newest daily dump)
# Env:   RAE_HOME, DB_CONTAINER (default rae-cms-db, used only to pick the image), IMAGE, DB_NAME,
#        MANIFEST (default <dump>.manifest)
set -euo pipefail
umask 077

RAE_HOME="${RAE_HOME:-$HOME/rae}"
DIR="$RAE_HOME/rae-cms-backups"
DB_CONTAINER="${DB_CONTAINER:-rae-cms-db}"
DB_NAME="${DB_NAME:-rae_cms}"

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  sed -n '2,20p' "$0"
  exit 0
fi

fail() {
  echo "restore verification FAILED: $*" >&2
  exit 1
}

LINE="${1:-}"
if [ -n "$LINE" ]; then
  FILE="$LINE"
else
  FILE="$(ls -1 "$DIR"/daily/rae_cms-2*Z.sql.gz 2>/dev/null | tail -1 || true)"
  [ -n "$FILE" ] || fail "no daily dump found in $DIR/daily"
fi
MANIFEST="${MANIFEST:-$FILE.manifest}"

[ -f "$FILE" ] || fail "dump not found: $FILE"
# The manifest is required, not optional: without backup-time evidence the only thing left to
# compare against is a database that has changed since, which proves nothing.
[ -f "$MANIFEST" ] || fail "manifest not found: $MANIFEST — re-run scripts/ops/backup-rae-cms.sh (it writes one) or point MANIFEST at the right file"

manifest_get() { awk -F= -v k="$1" '$1==k{print $2; exit}' "$MANIFEST"; }

DUMP_NAME="$(manifest_get dump)"
DUMP_SHA_EXPECTED="$(manifest_get dump_sha256)"
TABLE_COUNT_EXPECTED="$(manifest_get table_count)"
[ -n "$DUMP_SHA_EXPECTED" ] || fail "manifest has no dump_sha256: $MANIFEST"
[ -n "$TABLE_COUNT_EXPECTED" ] || fail "manifest has no table_count: $MANIFEST"
if [ -n "$DUMP_NAME" ] && [ "$DUMP_NAME" != "$(basename "$FILE")" ]; then
  fail "manifest describes '$DUMP_NAME' but was asked to verify '$(basename "$FILE")'"
fi

# 1. Integrity against the backup-time hash.
DUMP_SHA_ACTUAL="$(sha256sum "$FILE" | awk '{print $1}')"
if [ "$DUMP_SHA_ACTUAL" != "$DUMP_SHA_EXPECTED" ]; then
  fail "sha256 mismatch for $(basename "$FILE"): manifest=$DUMP_SHA_EXPECTED actual=$DUMP_SHA_ACTUAL"
fi
echo "ok sha256 matches the manifest"

# 2. The sidecar, when it exists, must agree too (it is what a human checksums by hand).
if [ -f "$FILE.sha256" ]; then
  ( cd "$(dirname "$FILE")" && sha256sum -c --status "$(basename "$FILE").sha256" ) \
    || fail "sidecar checksum failed: $(basename "$FILE").sha256"
  echo "ok sidecar checksum"
fi

# 3. The stream must be intact before anything is loaded.
gzip -t "$FILE" || fail "gzip integrity check failed: $(basename "$FILE")"
echo "ok gzip integrity"

# 4. The table set the backup recorded.
mapfile -t M_TABLES < <(awk '$1=="table"{print $2}' "$MANIFEST")
[ "${#M_TABLES[@]}" -gt 0 ] || fail "manifest lists no tables: $MANIFEST"
if [ "$TABLE_COUNT_EXPECTED" != "${#M_TABLES[@]}" ]; then
  fail "manifest is self-inconsistent: table_count=$TABLE_COUNT_EXPECTED but ${#M_TABLES[@]} table lines"
fi

# 5. Restore into a disposable server.
IMAGE="${IMAGE:-$(docker inspect "$DB_CONTAINER" --format '{{.Config.Image}}' 2>/dev/null || true)}"
[ -n "$IMAGE" ] || fail "cannot determine the MariaDB image (docker inspect $DB_CONTAINER); set IMAGE=..."
NAME="rae-restore-test-$$"
PW="$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9')"
cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker run -d --name "$NAME" --network none -e MARIADB_ROOT_PASSWORD="$PW" "$IMAGE" >/dev/null \
  || fail "could not start the disposable MariaDB container from $IMAGE"

READY=0
for _ in $(seq 1 60); do
  # The image starts a temporary init server, then restarts: wait for the second "ready for connections".
  if [ "$(docker logs "$NAME" 2>&1 | grep -c 'ready for connections')" -ge 2 ] \
     && docker exec "$NAME" mariadb -uroot -p"$PW" -e 'select 1' >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 2
done
[ "$READY" = "1" ] || fail "the disposable MariaDB did not become ready within 120s"

zcat "$FILE" | docker exec -i "$NAME" mariadb -uroot -p"$PW" \
  || fail "loading $(basename "$FILE") into the disposable database failed"
echo "ok dump loaded into the disposable database"

# 6. Every table the backup recorded must exist after the restore — and nothing else.
mapfile -t R_TABLES < <(docker exec "$NAME" mariadb -uroot -p"$PW" -N -B \
  -e "SELECT table_name FROM information_schema.tables WHERE table_schema='$DB_NAME' ORDER BY table_name")
[ "${#R_TABLES[@]}" -gt 0 ] || fail "the restore produced no tables in $DB_NAME"

MISSING=()
for t in "${M_TABLES[@]}"; do
  if ! printf '%s\n' "${R_TABLES[@]}" | grep -qx "$t"; then MISSING+=("$t"); fi
done
[ "${#MISSING[@]}" -eq 0 ] || fail "table(s) missing after restore: ${MISSING[*]}"

EXTRA=()
for t in "${R_TABLES[@]}"; do
  if ! printf '%s\n' "${M_TABLES[@]}" | grep -qx "$t"; then EXTRA+=("$t"); fi
done
[ "${#EXTRA[@]}" -eq 0 ] || fail "table(s) present after restore but not in the backup manifest: ${EXTRA[*]}"
echo "ok table set matches the manifest (${#M_TABLES[@]} tables)"

# 7. Row counts against the backup-time numbers.
MISMATCH=0
for t in "${M_TABLES[@]}"; do
  WANT="$(awk -v t="$t" '$1=="table" && $2==t {print $3; exit}' "$MANIFEST")"
  GOT="$(docker exec "$NAME" mariadb -uroot -p"$PW" -N -B -e "SELECT COUNT(*) FROM \`$DB_NAME\`.\`$t\`")" \
    || fail "could not count rows in restored table $t"
  if [ "$WANT" != "$GOT" ]; then
    echo "MISMATCH $t backup=$WANT restored=$GOT" >&2
    MISMATCH=$((MISMATCH + 1))
  fi
done
[ "$MISMATCH" -eq 0 ] || fail "$MISMATCH table(s) differ from the backup-time manifest"

echo "restore verification OK: $(basename "$FILE") — ${#M_TABLES[@]} tables, every row count matches the backup-time manifest (disposable container removed)"
