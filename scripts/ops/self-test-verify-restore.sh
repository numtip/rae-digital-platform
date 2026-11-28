#!/usr/bin/env bash
# Proves BOTH directions of scripts/ops/verify-restore-rae-cms.sh.
#
# A verification script nobody has seen fail is decoration. This harness builds a throwaway
# database, takes a real backup with scripts/ops/backup-rae-cms.sh, then checks that:
#   1. the intact backup PASSES,
#   2. a table the manifest records but the restore lacks FAILS (missing table),
#   2b. a dump that will not load FAILS (restore error),
#   3. an edited row count FAILS (mismatch with the backup-time manifest),
#   4. a truncated dump FAILS (corrupt stream),
#   5. a dump edited without updating the manifest FAILS (sha256),
#   6. a missing manifest FAILS (no backup-time evidence).
#
# Everything runs in disposable containers and a temporary RAE_HOME. Nothing on this host is read
# or written outside the temp dir; no production database is touched.
#
# Usage: self-test-verify-restore.sh          Env: IMAGE (default mariadb:10.6)
set -euo pipefail

IMAGE="${IMAGE:-mariadb:10.6}"
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORK="$(mktemp -d)"
SRC="rae-selftest-src-$$"
PW="$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9')"
PASSES=0
FAILS=0

cleanup() {
  docker rm -f "$SRC" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

ok()   { PASSES=$((PASSES + 1)); echo "PASS  $*"; }
bad()  { FAILS=$((FAILS + 1)); echo "FAIL  $*"; }

echo "== building a throwaway source database ($IMAGE)"
docker run -d --name "$SRC" --network none -e MARIADB_ROOT_PASSWORD="$PW" "$IMAGE" >/dev/null
for _ in $(seq 1 60); do
  if [ "$(docker logs "$SRC" 2>&1 | grep -c 'ready for connections')" -ge 2 ] \
     && docker exec "$SRC" mariadb -uroot -p"$PW" -e 'select 1' >/dev/null 2>&1; then break; fi
  sleep 2
done
docker exec "$SRC" mariadb -uroot -p"$PW" -e 'select 1' >/dev/null || { echo "FATAL: source database did not start"; exit 1; }

# Three tables with known row counts; `sessions` is the one we delete in the negative cases.
docker exec -i "$SRC" mariadb -uroot -p"$PW" <<'SQL'
CREATE DATABASE rae_cms;
USE rae_cms;
CREATE TABLE users (id VARCHAR(64) PRIMARY KEY, role VARCHAR(16) NOT NULL);
CREATE TABLE sessions (token_hash CHAR(64) PRIMARY KEY, user_id VARCHAR(64) NOT NULL);
CREATE TABLE audit_logs (id VARCHAR(64) PRIMARY KEY, action VARCHAR(64) NOT NULL);
INSERT INTO users VALUES ('admin','admin'),('editor','officer');
INSERT INTO sessions VALUES (REPEAT('a',64),'admin'),(REPEAT('b',64),'admin'),(REPEAT('c',64),'editor');
INSERT INTO audit_logs VALUES ('a1','login'),('a2','publish');
SQL

mkdir -p "$WORK/rae-cms-secrets"
printf 'MARIADB_ROOT_PASSWORD=%s\n' "$PW" > "$WORK/rae-cms-secrets/db-env"
chmod 600 "$WORK/rae-cms-secrets/db-env"

echo "== taking a real backup through scripts/ops/backup-rae-cms.sh"
RAE_HOME="$WORK" DB_CONTAINER="$SRC" DB_NAME=rae_cms bash "$REPO_ROOT/scripts/ops/backup-rae-cms.sh"
DUMP="$(ls -1 "$WORK"/rae-cms-backups/daily/rae_cms-2*Z.sql.gz | tail -1)"
[ -f "$DUMP.manifest" ] || { echo "FATAL: backup wrote no manifest"; exit 1; }
echo "-- manifest:"; sed 's/^/   /' "$DUMP.manifest"

run_verify() { # run_verify <dump> [manifest] -> sets RC and MSG
  local file="$1" manifest="${2:-}"
  set +e
  MSG="$(MANIFEST="${manifest:-$file.manifest}" RAE_HOME="$WORK" DB_CONTAINER="$SRC" \
        bash "$REPO_ROOT/scripts/ops/verify-restore-rae-cms.sh" "$file" 2>&1)"
  RC=$?
  set -e
}

echo
echo "== 1. intact backup must pass"
run_verify "$DUMP"
if [ "$RC" -eq 0 ] && grep -q 'restore verification OK' <<<"$MSG"; then
  ok "intact backup verified ($(grep -o '[0-9]* tables' <<<"$MSG" | head -1))"
else
  bad "intact backup was rejected (rc=$RC)"; sed 's/^/   /' <<<"$MSG"
fi

echo
echo "== 2. a table the backup recorded but the restore lacks must fail"
D2="$WORK/case-dropped.sql.gz"; cp "$DUMP" "$D2"
sed "s/^dump=.*/dump=$(basename "$D2")/; s/^table_count=.*/table_count=4/" "$DUMP.manifest" > "$D2.manifest"
echo "table ghost_table 5" >> "$D2.manifest"
run_verify "$D2"
if [ "$RC" -ne 0 ] && grep -q 'missing after restore' <<<"$MSG"; then
  ok "missing table detected: $(grep -o 'missing after restore: .*' <<<"$MSG" | head -1)"
else
  bad "missing table NOT detected (rc=$RC)"; sed 's/^/   /' <<<"$MSG"
fi

echo
echo "== 2b. a dump that cannot be loaded must fail (restore error)"
D2B="$WORK/case-badsql.sql.gz"
{ zcat "$DUMP"; echo "THIS IS NOT SQL;"; } | gzip -9 > "$D2B"
sed "s/^dump_sha256=.*/dump_sha256=$(sha256sum "$D2B" | awk '{print $1}')/; s/^dump=.*/dump=$(basename "$D2B")/" "$DUMP.manifest" > "$D2B.manifest"
run_verify "$D2B"
if [ "$RC" -ne 0 ] && grep -q 'into the disposable database failed' <<<"$MSG"; then
  ok "restore error detected"
else
  bad "restore error NOT detected (rc=$RC)"; sed 's/^/   /' <<<"$MSG"
fi

echo
echo "== 3. an edited row count must fail"
D3="$WORK/case-count.sql.gz"; cp "$DUMP" "$D3"; cp "$DUMP.manifest" "$D3.manifest"
sed -i "s/^dump=.*/dump=$(basename "$D3")/; s/^table users .*/table users 99/" "$D3.manifest"
run_verify "$D3"
if [ "$RC" -ne 0 ] && grep -q 'MISMATCH users backup=99' <<<"$MSG"; then
  ok "row-count mismatch detected: $(grep -o 'MISMATCH users.*' <<<"$MSG" | head -1)"
else
  bad "row-count mismatch NOT detected (rc=$RC)"; sed 's/^/   /' <<<"$MSG"
fi

echo
echo "== 4. a truncated (corrupt) dump must fail"
D4="$WORK/case-truncated.sql.gz"
head -c 400 "$DUMP" > "$D4"
sed "s/^dump_sha256=.*/dump_sha256=$(sha256sum "$D4" | awk '{print $1}')/; s/^dump=.*/dump=$(basename "$D4")/" "$DUMP.manifest" > "$D4.manifest"
run_verify "$D4"
if [ "$RC" -ne 0 ] && grep -q 'gzip integrity check failed' <<<"$MSG"; then
  ok "corrupt stream detected"
else
  bad "corrupt stream NOT detected (rc=$RC)"; sed 's/^/   /' <<<"$MSG"
fi

echo
echo "== 5. a dump edited without updating the manifest must fail (sha256)"
D5="$WORK/case-tampered.sql.gz"
sed 's/login/tampered-login/' < <(zcat "$DUMP") | gzip -9 > "$D5"
sed "s/^dump=.*/dump=$(basename "$D5")/" "$DUMP.manifest" > "$D5.manifest"
run_verify "$D5"
if [ "$RC" -ne 0 ] && grep -q 'sha256 mismatch' <<<"$MSG"; then
  ok "sha256 mismatch detected"
else
  bad "sha256 mismatch NOT detected (rc=$RC)"; sed 's/^/   /' <<<"$MSG"
fi

echo
echo "== 6. a missing manifest must fail"
D6="$WORK/case-nomanifest.sql.gz"; cp "$DUMP" "$D6"
run_verify "$D6"
if [ "$RC" -ne 0 ] && grep -q 'manifest not found' <<<"$MSG"; then
  ok "missing manifest detected"
else
  bad "missing manifest NOT detected (rc=$RC)"; sed 's/^/   /' <<<"$MSG"
fi

echo
echo "== result: $PASSES passed, $FAILS failed"
[ "$FAILS" -eq 0 ] || exit 1
echo "self-test OK — the verifier accepts a good backup and rejects every damaged one"
