#!/usr/bin/env bash
# Read-only readiness check for the MJU SSO human E2E window. Changes nothing, prints no secret values.
set -u
H=${RAE_CMS_HOST:-rae-cms.raemanagemju.net}
ENVF=${RAE_RUNTIME_ENV:-$HOME/rae/rae-cms-secrets/runtime.env}
ok=0; bad=0
chk() { if [ "$2" = "$3" ]; then echo "PASS $1 ($2)"; ok=$((ok+1)); else echo "FAIL $1 (got $2, want $3)"; bad=$((bad+1)); fi; }
code() { curl -s -m 15 -o /dev/null -w '%{http_code}' "$@"; }
chk "HTTPS site"                 "$(code https://$H/th/)" 200
chk "desk page"                  "$(code https://$H/th/cms-admin/)" 200
chk "API needs a token"          "$(code https://$H/cms-api/v1/news)" 401
v() { grep -E "^$1=" "$ENVF" | tail -1 | cut -d= -f2-; }
has() { [ -n "$(v "$1")" ] && echo set || echo missing; }
chk "client id configured"       "$(has MJU_CLIENT_ID)" set
chk "HMAC key configured"        "$(has MJU_SSO_HMAC_KEY)" set
chk "app id"                     "$(v MJU_SSO_APP_ID)" rae-cms
chk "subject claim"              "$(v MJU_SSO_SUBJECT_CLAIM)" citizenID
chk "durable store required"     "$(v MJU_SSO_STORE_REQUIRE_DURABLE)" true
chk "runtime.env mode"           "$(stat -c %a "$ENVF")" 600
echo "--- owner gates (informational) ---"
echo "C-14 CMS purpose countersigned : $( [ "$(v MJU_SSO_LAWFUL_BASIS_APPROVED)" = true ] && echo yes || echo NO )"
echo "risk acceptance installed      : $( [ -n "$(v MJU_SSO_OWNER_RISK_ACCEPTANCE)" ] && echo yes || echo NO )"
echo "SSO enabled                    : $( [ "$(v MJU_SSO_ENABLED)" = true ] && echo yes || echo no )"
echo "SSO routes while off return 404: $(code https://$H/cms-api/v1/sso/status)"
echo "result: $ok passed, $bad failed"; [ $bad -eq 0 ]
