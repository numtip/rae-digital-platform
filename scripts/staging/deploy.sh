#!/usr/bin/env bash
# Manual static staging deploy — owner-approved [EXEC] only.
# Does not modify host nginx, firewall, DNS, or attendance containers.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=scripts/staging/lib/common.sh
source "${REPO_ROOT}/scripts/staging/lib/common.sh"

SKIP_BUILD="${SKIP_BUILD:-0}"
SKIP_SMOKE="${SKIP_SMOKE:-0}"

staging_load_env "${REPO_ROOT}"

BASE_PATH="${NEXT_PREVIEW_BASE_PATH:-/rae-digital-staging}"
SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://raeservice.mju.ac.th/rae-digital-staging}"
STAGING_ROOT="${RAE_STAGING_ROOT:-${REPO_ROOT}/.staging-local}"
RELEASE_SHA="$(staging_git_sha "${REPO_ROOT}")"
export RAE_STAGING_RELEASE="${RAE_STAGING_RELEASE:-${RELEASE_SHA}}"

staging_log "preflight (fail-fast)"
staging_preflight_host "${REPO_ROOT}"
staging_require_cmd npm
staging_require_cmd node

node_major="$(node -p "process.versions.node.split('.')[0]")"
[[ "${node_major}" -ge 20 ]] || staging_die "Node >= 20 required for export (host Node 12 is not supported)"

mkdir -p "${STAGING_ROOT}/releases" "${STAGING_ROOT}/backups"
RELEASE_DIR="${STAGING_ROOT}/releases/${RAE_STAGING_RELEASE}"
MANIFEST="${RELEASE_DIR}/manifest.json"
TARBALL="${RELEASE_DIR}/out.tar.gz"

if [[ -d "${RELEASE_DIR}/out" && -f "${MANIFEST}" ]]; then
  staging_log "release ${RAE_STAGING_RELEASE} already present — verifying checksum"
  recorded="$(grep -o '"artefact_sha256"[[:space:]]*:[[:space:]]*"[^"]*"' "${MANIFEST}" | cut -d'"' -f4)"
  actual="$(sha256sum "${TARBALL}" | awk '{print $1}')"
  [[ "${recorded}" == "${actual}" ]] || staging_die "manifest checksum mismatch for ${RAE_STAGING_RELEASE}"
else
  if [[ "${SKIP_BUILD}" != "1" ]]; then
    staging_log "building static export (basePath=${BASE_PATH})"
    (
      cd "${REPO_ROOT}"
      export NEXT_PAGES_PREVIEW=1
      export NEXT_PREVIEW_BASE_PATH="${BASE_PATH}"
      export NEXT_PUBLIC_SITE_URL="${SITE_URL}"
      npm run build:export
      staging_write_root_redirect "${REPO_ROOT}/out" "${BASE_PATH}" "${SITE_URL}"
      staging_verify_out_tree "${REPO_ROOT}/out"
      BASE_PATH="${BASE_PATH}" npm run check:export
    )
  else
    staging_die "release missing and SKIP_BUILD=1"
  fi

  staging_log "packaging immutable release artefact"
  mkdir -p "${RELEASE_DIR}"
  tar -C "${REPO_ROOT}" -czf "${TARBALL}" out
  staging_write_manifest "${MANIFEST}" "${RAE_STAGING_RELEASE}" "${BASE_PATH}" "${SITE_URL}" "${TARBALL}"

  tar -C "${RELEASE_DIR}" -xzf "${TARBALL}"
fi

PREVIOUS_FILE="${STAGING_ROOT}/previous-release"
CURRENT_LINK="${STAGING_ROOT}/current"
if [[ -L "${CURRENT_LINK}" ]]; then
  readlink -f "${CURRENT_LINK}" > "${STAGING_ROOT}/backups/pre-deploy-$(date -u +%Y%m%dT%H%M%SZ).txt" || true
  readlink -f "${CURRENT_LINK}" > "${PREVIOUS_FILE}" || true
fi

staging_log "syncing out/ into docker build context"
rsync -a --delete "${RELEASE_DIR}/out/" "${REPO_ROOT}/out/"

staging_log "building image rae-digital-staging-static:${RAE_STAGING_RELEASE}"
staging_compose "${REPO_ROOT}" build --pull

staging_log "starting container (127.0.0.1:8090 only)"
staging_compose "${REPO_ROOT}" up -d --no-build

ln -sfn "${RELEASE_DIR}" "${CURRENT_LINK}"

if [[ "${SKIP_SMOKE}" != "1" ]]; then
  staging_log "smoke tests (loopback)"
  curl -sf "http://127.0.0.1:8090/healthz" | grep -q '"status":"ok"' || staging_die "healthz failed"
  curl -sf -o /dev/null -w '%{http_code}' "http://127.0.0.1:8090/th/" | grep -q '^200$' || staging_die "/th/ failed"
  curl -sf -o /dev/null -w '%{http_code}' "http://127.0.0.1:8090/en/" | grep -q '^200$' || staging_die "/en/ failed"
  code_404="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:8090/does-not-exist/")"
  [[ "${code_404}" == "404" ]] || staging_die "expected 404, got ${code_404}"
fi

staging_log "deploy complete: release=${RAE_STAGING_RELEASE} manifest=${MANIFEST}"
staging_log "production backup blockers A-39/A-06 remain — see docs/ops/vps-staging/06_GO_NO_GO.md"
