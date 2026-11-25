#!/usr/bin/env bash
# Admin helper for the SSO E2E: lists pending identity links and approves one for an existing CMS user.
# Usage: sso-approve-link.sh <admin-user> list
#        sso-approve-link.sh <admin-user> approve <link-id> <cms-user-id>
# The admin password is read from the terminal (not an argument, never printed or stored).
set -euo pipefail
H=${RAE_CMS_HOST:-rae-cms.raemanagemju.net}
admin=${1:?admin user}; action=${2:?list|approve}
read -rsp "Password for $admin: " pw; echo
tok=$(curl -s -m 20 -H 'content-type: application/json' -d "$(printf '{"userId":"%s","password":"%s"}' "$admin" "$pw")" "https://$H/cms-api/v1/login" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
unset pw; [ -n "$tok" ] || { echo "login failed"; exit 1; }
case "$action" in
  list) curl -s -m 20 -H "authorization: Bearer $tok" "https://$H/cms-api/v1/sso/links"; echo ;;
  approve) curl -s -m 20 -X POST -H "authorization: Bearer $tok" -H 'content-type: application/json' -d "$(printf '{"userId":"%s"}' "${4:?cms user id}")" "https://$H/cms-api/v1/sso/links/${3:?link id}/approve"; echo ;;
  *) echo "unknown action"; exit 2 ;;
esac
