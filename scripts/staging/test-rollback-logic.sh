#!/usr/bin/env bash
# Offline rollback logic test — no Docker, no VPS production impact.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=scripts/staging/lib/common.sh
source "${REPO_ROOT}/scripts/staging/lib/common.sh"

TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT

export RAE_STAGING_ROOT="${TMP}/staging"
mkdir -p "${REPO_ROOT}/out/th" "${REPO_ROOT}/out/en"

make_release() {
  local id="$1"
  local dir="${RAE_STAGING_ROOT}/releases/${id}"
  mkdir -p "${dir}/out/th" "${dir}/out/en"
  echo "release-${id}" > "${dir}/out/th/index.html"
  echo "release-${id}" > "${dir}/out/en/index.html"
  echo "root-${id}" > "${dir}/out/index.html"
  tar -C "${dir}" -czf "${dir}/out.tar.gz" out
  staging_write_manifest "${dir}/manifest.json" "${id}" "/rae-digital-staging" "https://example.test" "${dir}/out.tar.gz"
}

make_release "aaa1111"
make_release "bbb2222"

ln -sfn "${RAE_STAGING_ROOT}/releases/aaa1111" "${RAE_STAGING_ROOT}/current"
echo "${RAE_STAGING_ROOT}/releases/aaa1111" > "${RAE_STAGING_ROOT}/previous-release"

# Simulate rollback selection without starting containers.
TARGET="$(tr -d '[:space:]' < "${RAE_STAGING_ROOT}/previous-release")"
[[ "${TARGET}" == *"aaa1111"* ]] || staging_die "previous-release pointer wrong"

RELEASE_DIR="${RAE_STAGING_ROOT}/releases/bbb2222"
MANIFEST="${RELEASE_DIR}/manifest.json"
TARBALL="${RELEASE_DIR}/out.tar.gz"
recorded="$(grep -o '"artefact_sha256"[[:space:]]*:[[:space:]]*"[^"]*"' "${MANIFEST}" | cut -d'"' -f4)"
actual="$(sha256sum "${TARBALL}" | awk '{print $1}')"
[[ "${recorded}" == "${actual}" ]] || staging_die "checksum verify failed"

ln -sfn "${RELEASE_DIR}" "${RAE_STAGING_ROOT}/current"
[[ "$(readlink -f "${RAE_STAGING_ROOT}/current")" == "${RELEASE_DIR}" ]] || staging_die "symlink flip failed"

staging_log "rollback logic test OK"
