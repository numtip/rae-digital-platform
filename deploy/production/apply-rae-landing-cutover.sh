#!/usr/bin/env bash
# Canonical cutover: /rae-landing/ static alias -> Next.js on 127.0.0.1:3418. Needs root (nginx reload).
# Usage: sudo bash apply-rae-landing-cutover.sh [apply|rollback]
# Backups: ~/rae/rae-landing-static-backup (static tree tarball + original include). Rollback restores the include.
set -euo pipefail
INC=/home/rae_admin/rae-landing/nginx/rae-landing.conf
BK=/home/rae_admin/rae/rae-landing-static-backup
NEW="$(dirname "$(readlink -f "$0")")/rae-landing.nextjs.conf"
case "${1:-apply}" in
  apply)
    curl -fsS -o /dev/null http://127.0.0.1:3418/rae-landing/th/ || { echo "Next on :3418 is not answering; aborting"; exit 1; }
    cp -p "$INC" "$BK/rae-landing.conf.pre-cutover.$(date -u +%Y%m%dT%H%M%SZ)"
    install -m 664 -o rae_admin -g rae_admin "$NEW" "$INC"
    if nginx -t; then systemctl reload nginx; else cp -p "$BK/rae-landing.conf.orig" "$INC"; nginx -t; echo "nginx -t failed; original restored"; exit 1; fi
    curl -s -o /dev/null -w "canonical /rae-landing/th/ -> %{http_code}\n" https://raeservice.mju.ac.th/rae-landing/th/ ;;
  rollback)
    install -m 664 -o rae_admin -g rae_admin "$BK/rae-landing.conf.orig" "$INC"
    nginx -t && systemctl reload nginx
    curl -s -o /dev/null -w "static /rae-landing/th/ -> %{http_code}\n" https://raeservice.mju.ac.th/rae-landing/th/ ;;
  *) echo "usage: $0 [apply|rollback]"; exit 2 ;;
esac
