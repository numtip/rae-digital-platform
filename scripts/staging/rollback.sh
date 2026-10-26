#!/usr/bin/env bash
# Roll back static staging to the previous verified release (staging scope only).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=scripts/staging/lib/common.sh
source "${REPO_ROOT}/scripts/staging/lib/common.sh"

TARGET_RELEASE="${1:-}"

staging_load_env "${REPO_ROOT}"
STAGING_ROOT="${RAE_STAGING_ROOT:-${REPO_ROOT}/.staging-local}"
CURRENT_LINK="${STAGING_ROOT}/current"
PREVIOUS_FILE="${STAGING_ROOT}/previous-release"

staging_log "preflight"
staging_preflight_host "${REPO_ROOT}"

if [[ -z "${TARGET_RELEASE}" ]]; then
  [[ -f "${PREVIOUS_FILE}" ]] || staging_die "no previous-release file; pass release SHA explicitly"
  TARGET_RELEASE="$(tr -d '[:space:]' < "${PREVIOUS_FILE}")"
fi

RELEASE_DIR="${STAGING_ROOT}/releases/${TARGET_RELEASE}"
MANIFEST="${RELEASE_DIR}/manifest.json"
TARBALL="${RELEASE_DIR}/out.tar.gz"

[[ -d "${RELEASE_DIR}" ]] || staging_die "release not found: ${TARGET_RELEASE}"
[[ -f "${MANIFEST}" ]] || staging_die "missing manifest for ${TARGET_RELEASE}"
[[ -f "${TARBALL}" ]] || staging_die "missing tarball for ${TARGET_RELEASE}"

recorded="$(grep -o '"artefact_sha256"[[:space:]]*:[[:space:]]*"[^"]*"' "${MANIFEST}" | cut -d'"' -f4)"
actual="$(sha256sum "${TARBALL}" | awk '{print $1}')"
[[ "${recorded}" == "${actual}" ]] || staging_die "checksum mismatch — refusing rollback"

if [[ ! -d "${RELEASE_DIR}/out" ]]; then
  tar -C "${RELEASE_DIR}" -xzf "${TARBALL}"
fi

if [[ -L "${CURRENT_LINK}" ]]; then
  readlink -f "${CURRENT_LINK}" > "${PREVIOUS_FILE}" || true
fi

export RAE_STAGING_RELEASE="${TARGET_RELEASE}"
rsync -a --delete "${RELEASE_DIR}/out/" "${REPO_ROOT}/out/"

staging_compose "${REPO_ROOT}" build
staging_compose "${REPO_ROOT}" up -d --no-build
ln -sfn "${RELEASE_DIR}" "${CURRENT_LINK}"

curl -sf "http://127.0.0.1:8090/healthz" | grep -q '"status":"ok"' || staging_die "healthz failed after rollback"

staging_log "rollback complete: active release=${TARGET_RELEASE}"
