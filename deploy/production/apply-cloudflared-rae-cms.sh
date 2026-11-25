#!/usr/bin/env bash
# Adds ONE ingress rule (rae-cms.raemanagemju.net -> http://127.0.0.1:3417) to the cloudflared
# instance on VPS190 (tunnel b2bc13f9-...). Needs root. Every other rule is left byte-identical.
# Rollback: the script prints the backup path; `sudo cp <backup> /etc/cloudflared/config.yml && sudo systemctl restart cloudflared`.
set -euo pipefail
CFG=/etc/cloudflared/config.yml
HOST=rae-cms.raemanagemju.net
grep -q "hostname: $HOST" "$CFG" && { echo "already present"; exit 0; }
BAK="$CFG.bak.$(date -u +%Y%m%dT%H%M%SZ)"
cp -p "$CFG" "$BAK"
TMP=$(mktemp)
awk -v h="$HOST" '/^  - service: http_status:404/ && !done {print "  - hostname: " h; print "    service: http://127.0.0.1:3417"; done=1} {print}' "$CFG" > "$TMP"
cloudflared tunnel --config "$TMP" ingress validate
install -m 644 "$TMP" "$CFG"; rm -f "$TMP"
systemctl restart cloudflared
echo "applied; backup: $BAK"
curl -s -o /dev/null -w "local origin /th/ -> %{http_code}\n" http://127.0.0.1:3417/th/
