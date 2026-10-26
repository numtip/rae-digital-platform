#!/usr/bin/env bash
# Shared helpers for staging deploy/rollback (no secrets).

set -euo pipefail

staging_log() {
  printf '[rae-staging] %s\n' "$*" >&2
}

staging_die() {
  staging_log "ERROR: $*"
  exit 1
}

staging_require_cmd() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || staging_die "missing required command: ${cmd}"
}

staging_load_env() {
  local repo_root="$1"
  if [[ -f "${repo_root}/.env.staging" ]]; then
    # shellcheck disable=SC1091
    set -a
    source "${repo_root}/.env.staging"
    set +a
  elif [[ -f "${repo_root}/.env.staging.example" ]]; then
    staging_log "hint: copy .env.staging.example to .env.staging for non-default paths"
  fi
}

staging_compose() {
  local repo_root="$1"
  local file="${RAE_STAGING_COMPOSE:-docker-compose.staging.yml}"
  docker compose -f "${repo_root}/${file}" --project-name rae-digital-staging "$@"
}

staging_preflight_host() {
  local repo_root="$1"
  staging_require_cmd docker
  staging_require_cmd ss
  staging_require_cmd sha256sum
  staging_require_cmd rsync
  staging_require_cmd curl

  docker info >/dev/null 2>&1 || staging_die "docker daemon not reachable"

  if ss -tlnH 2>/dev/null | awk '{print $4}' | grep -qE ':8090$'; then
    # Allow our own container to hold the port during redeploy.
    if ! docker ps --format '{{.Names}}' | grep -qx 'rae-digital-staging-web'; then
      staging_die "port 8090 already in use by a non-staging process"
    fi
  fi

  if [[ -n "${RAE_STAGING_ROOT:-}" ]]; then
    if [[ ! -d "${RAE_STAGING_ROOT}" ]]; then
      staging_die "RAE_STAGING_ROOT does not exist: ${RAE_STAGING_ROOT}"
    fi
    if [[ -w "${RAE_STAGING_ROOT}" ]]; then
      :
    else
      staging_die "RAE_STAGING_ROOT is not writable: ${RAE_STAGING_ROOT}"
    fi
  fi

  staging_compose "${repo_root}" config >/dev/null 2>&1 || staging_die "docker compose config validation failed"
}

staging_git_sha() {
  git -C "$1" rev-parse HEAD
}

staging_write_root_redirect() {
  local out_dir="$1"
  local base_path="$2"
  local site_url="$3"
  local canonical="${site_url%/}${base_path}/th/"
  cat > "${out_dir}/index.html" <<HTML
<!doctype html>
<html lang="th">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>RAE — สำนักวิจัยและบริการวิชาการ (staging)</title>
    <link rel="canonical" href="${canonical}">
    <link rel="alternate" hreflang="th" href="${site_url%/}${base_path}/th/">
    <link rel="alternate" hreflang="en" href="${site_url%/}${base_path}/en/">
    <meta http-equiv="refresh" content="0; url=${base_path}/th/">
  </head>
  <body>
    <p>
      <a href="${base_path}/th/" lang="th">ไปที่หน้าหลัก (ภาษาไทย)</a> ·
      <a href="${base_path}/en/" lang="en" hreflang="en">Continue in English</a>
    </p>
  </body>
</html>
HTML
  touch "${out_dir}/.nojekyll"
}

staging_verify_out_tree() {
  local out_dir="$1"
  test -f "${out_dir}/th/index.html" || staging_die "missing ${out_dir}/th/index.html"
  test -f "${out_dir}/en/index.html" || staging_die "missing ${out_dir}/en/index.html"
  test -f "${out_dir}/index.html" || staging_die "missing ${out_dir}/index.html"
}

staging_write_manifest() {
  local manifest="$1"
  local sha="$2"
  local base_path="$3"
  local site_url="$4"
  local tarball="$5"
  local sum
  sum="$(sha256sum "${tarball}" | awk '{print $1}')"
  cat > "${manifest}" <<JSON
{
  "git_sha": "${sha}",
  "base_path": "${base_path}",
  "site_url": "${site_url}",
  "artefact_sha256": "${sum}",
  "built_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON
}
