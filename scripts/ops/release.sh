#!/usr/bin/env bash
# SHA-tagged releases for the two Next.js renderers (admin host :3417, canonical /rae-landing :3418).
#
#   release.sh build  <git-ref>     export the ref, build BOTH outputs in an isolated release dir (the serving release is untouched)
#   release.sh check  <sha|current> start that release on spare ports and probe the routes; nothing is switched
#   release.sh switch <sha>         check, then point `current` at it and restart both units, then probe the real ports; roll back on failure
#   release.sh rollback [sha]       point `current` at the previous (or the named) release and restart
#   release.sh runtime <sha>        move the CMS runtime checkout to <sha> and restart it (previous sha is recorded)
#   release.sh status | prune
#
# Layout under $RAE_HOME (default ~/rae):  releases/<sha12>/ (exported tree + node_modules + .next + .next-landing),
# current -> releases/<sha12>, releases/.previous (name of the release before the last switch), shared/deps-<lockhash>/.
# The systemd units mount $RAE_HOME/current as /app. Downtime of a switch = the container restart only (printed).
set -euo pipefail

RAE_HOME="${RAE_HOME:-$HOME/rae}"
REPO="${RAE_REPO:-$RAE_HOME/rae-digital-platform}"
REL="$RAE_HOME/releases"
CUR="$RAE_HOME/current"
NODE_BIN="${NODE_BIN:-$HOME/.nvm/versions/node/v22.23.2/bin}"
SECRETS="$RAE_HOME/rae-cms-secrets"
RUNTIME_APP="$RAE_HOME/rae-cms-runtime/app"
UA="Mozilla/5.0 (release-check)"
export PATH="$NODE_BIN:$PATH"

log() { echo "[release $(date -u +%H:%M:%S)] $*" >&2; }
die() { echo "release: $*" >&2; exit 1; }

short() { git -C "$REPO" rev-parse --short=12 "$1^{commit}"; }

# Routes every release must answer 200 for before it may serve. Landing is under its base path.
ROOT_ROUTES=(/th/ /en/ /th/news/ /th/news/events/ /th/documents/ /th/knowledge/ /th/contact/ /th/about/ /th/search/ /th/cms-admin/ /sitemap.xml)
LANDING_ROUTES=(/rae-landing/th/ /rae-landing/en/ /rae-landing/th/news/ /rae-landing/th/news/events/ /rae-landing/th/news/events/calendar.ics /rae-landing/th/documents/ /rae-landing/th/knowledge/ /rae-landing/th/contact/ /rae-landing/th/about/ /rae-landing/th/search/ /rae-landing/sitemap.xml)

probe() { # probe <port> <routes...>  -> 0 if all 200
  local port="$1"; shift; local bad=0
  for r in "$@"; do
    local code; code="$(curl -s -o /dev/null -m 20 -A "$UA" -w '%{http_code}' "http://127.0.0.1:$port$r" || true)"
    if [ "$code" != "200" ]; then echo "  FAIL $port$r -> $code"; bad=1; fi
  done
  return $bad
}

wait_up() { # wait_up <port> <path> <seconds>
  for _ in $(seq 1 "$3"); do
    [ "$(curl -s -o /dev/null -m 3 -A "$UA" -w '%{http_code}' "http://127.0.0.1:$1$2" || true)" = "200" ] && return 0
    sleep 1
  done
  return 1
}

deps_dir() { # shared node_modules keyed by the lockfile hash
  local lock="$1"
  local d="$RAE_HOME/shared/deps-$lock"
  if [ ! -d "$d/node_modules" ]; then
    log "installing dependencies for lock $lock (once per lockfile)"
    mkdir -p "$d"
    git -C "$REPO" show "$SHA:package.json" > "$d/package.json"
    git -C "$REPO" show "$SHA:package-lock.json" > "$d/package-lock.json"
    (cd "$d" && npm ci --no-audit --no-fund >/dev/null)
  fi
  echo "$d"
}

cmd_build() {
  local ref="${1:?git ref}"
  SHA="$(short "$ref")"
  local dir="$REL/$SHA"
  [ -d "$dir/.next" ] && [ -d "$dir/.next-landing" ] && { log "release $SHA is already built"; return 0; }
  rm -rf "$dir.partial"; mkdir -p "$dir.partial"
  git -C "$REPO" archive "$SHA" | tar -x -C "$dir.partial"
  local lock; lock="$(git -C "$REPO" show "$SHA:package-lock.json" | sha256sum | cut -c1-16)"
  local deps; deps="$(deps_dir "$lock")"
  cp -a "$deps/node_modules" "$dir.partial/node_modules"
  echo "$SHA" > "$dir.partial/RELEASE_SHA"
  (
    cd "$dir.partial"
    set -a; . "$SECRETS/site.env"; set +a
    # Build-time data reads use the loopback runtime (the container hostname does not resolve on the host);
    # NEXT_CMS_API_PROXY keeps the container name that is baked into the rewrite.
    export RAE_CMS_API=http://127.0.0.1:3317
    log "building root output ($SHA)"
    npm run build >"$dir.partial/build-root.log" 2>&1 || { tail -20 "$dir.partial/build-root.log"; exit 1; }
    export NEXT_SERVER_BASE_PATH=/rae-landing NEXT_DIST_DIR=.next-landing NEXT_NOINDEX=0 NEXT_PUBLIC_SITE_URL=https://raeservice.mju.ac.th/rae-landing NEXT_PUBLIC_CMS_API=/rae-landing/cms-api
    log "building landing output ($SHA)"
    npm run build >"$dir.partial/build-landing.log" 2>&1 || { tail -20 "$dir.partial/build-landing.log"; exit 1; }
  )
  rm -rf "$dir"; mv "$dir.partial" "$dir"
  log "release $SHA built"
}

start_check_containers() { # start_check_containers <dir>
  local dir="$1"
  docker rm -f rae-check-next rae-check-landing >/dev/null 2>&1 || true
  docker run -d --rm --name rae-check-next --network rae-cms-net -p 127.0.0.1:3427:3417 --env-file "$SECRETS/site.env" \
    -e HOSTNAME=0.0.0.0 -e PORT=3417 -e RAE_CMS_DATA_DIR=/data -v "$dir":/app -v "$RAE_HOME/rae-cms-data":/data:ro -w /app \
    node:22-bookworm-slim node node_modules/next/dist/bin/next start --hostname 0.0.0.0 --port 3417 >/dev/null
  docker run -d --rm --name rae-check-landing --network rae-cms-net -p 127.0.0.1:3428:3418 --env-file "$SECRETS/site.env" \
    -e HOSTNAME=0.0.0.0 -e PORT=3418 -e RAE_CMS_DATA_DIR=/data -e NEXT_SERVER_BASE_PATH=/rae-landing -e NEXT_DIST_DIR=.next-landing -e NEXT_NOINDEX=0 \
    -e NEXT_PUBLIC_SITE_URL=https://raeservice.mju.ac.th/rae-landing -e NEXT_PUBLIC_CMS_API=/rae-landing/cms-api \
    -v "$dir":/app -v "$RAE_HOME/rae-cms-data":/data:ro -w /app \
    node:22-bookworm-slim node node_modules/next/dist/bin/next start --hostname 0.0.0.0 --port 3418 >/dev/null
}

cmd_check() {
  local ref="${1:?sha or current}"
  local dir
  if [ "$ref" = current ]; then dir="$(readlink "$CUR")"; else dir="$REL/$(short "$ref")"; fi
  [ -d "$dir/.next" ] || die "$dir is not built"
  log "checking $(basename "$dir") on spare ports 3427/3428 (the serving release is not touched)"
  start_check_containers "$dir"
  trap 'docker rm -f rae-check-next rae-check-landing >/dev/null 2>&1 || true' RETURN
  wait_up 3427 /th/ 60 || { docker logs --tail 15 rae-check-next 2>&1; return 1; }
  wait_up 3428 /rae-landing/th/ 60 || { docker logs --tail 15 rae-check-landing 2>&1; return 1; }
  local bad=0
  probe 3427 "${ROOT_ROUTES[@]}" || bad=1
  probe 3428 "${LANDING_ROUTES[@]}" || bad=1
  [ "$bad" = 0 ] && log "check passed for $(basename "$dir")" || return 1
}

point_current() { ln -sfn "$1" "$CUR.new" && mv -T "$CUR.new" "$CUR"; }

restart_units() {
  local t0; t0="$(date +%s.%N)"
  systemctl --user restart rae-digital-next-staging.service &
  systemctl --user restart rae-digital-landing-staging.service &
  wait
  wait_up 3417 /th/ 90 || return 1
  wait_up 3418 /rae-landing/th/ 90 || return 1
  local t1; t1="$(date +%s.%N)"
  awk -v a="$t0" -v b="$t1" 'BEGIN { printf "[release] measured gap from restart to both ports answering 200: %.1f s\n", b - a }'
}

cmd_switch() {
  local ref="${1:?sha}"; local sha; sha="$(short "$ref")"
  cmd_check "$sha" || die "pre-switch check failed; $(basename "$(readlink "$CUR")") keeps serving"
  local prev; prev="$(basename "$(readlink "$CUR")")"
  echo "$prev" > "$REL/.previous"
  point_current "$REL/$sha"
  log "switched current -> $sha (previous $prev); restarting units"
  if restart_units && probe 3417 "${ROOT_ROUTES[@]}" && probe 3418 "${LANDING_ROUTES[@]}"; then
    log "release $sha is serving"
  else
    log "post-switch probe FAILED — rolling back to $prev"
    point_current "$REL/$prev"; restart_units || true
    die "rolled back to $prev"
  fi
}

cmd_rollback() {
  local target="${1:-$(cat "$REL/.previous" 2>/dev/null || true)}"
  [ -n "$target" ] || die "no previous release recorded"
  target="$(basename "$REL/$target")"
  [ -d "$REL/$target/.next" ] || die "release $target is not built"
  local was; was="$(basename "$(readlink "$CUR")")"
  point_current "$REL/$target"
  echo "$was" > "$REL/.previous"
  log "rolling back $was -> $target"
  restart_units && probe 3417 "${ROOT_ROUTES[@]}" && probe 3418 "${LANDING_ROUTES[@]}" && log "rolled back; $target is serving"
}

cmd_runtime() {
  local sha; sha="$(short "${1:?sha}")"
  local prev; prev="$(git -C "$RUNTIME_APP" rev-parse HEAD)"
  echo "$prev" > "$REL/.runtime-previous"
  for attempt in 1 2 3 4; do git -C "$RUNTIME_APP" fetch -q origin main && break; [ "$attempt" = 4 ] && die "git fetch failed 4 times"; sleep 5; done # DNS to github.com is occasionally flaky
  git -C "$RUNTIME_APP" checkout -q --detach "$sha"
  log "runtime $prev -> $sha; restarting"
  systemctl --user restart rae-cms-runtime.service
  wait_up 3317 /v1/public/openapi.json 60 && log "runtime is serving $sha" || { log "runtime did not come up; restoring $prev"; git -C "$RUNTIME_APP" checkout -q --detach "$prev"; systemctl --user restart rae-cms-runtime.service; die "runtime rolled back"; }
}

cmd_status() {
  echo "serving : $(basename "$(readlink "$CUR")")"
  echo "previous: $(cat "$REL/.previous" 2>/dev/null || echo -)"
  echo "runtime : $(git -C "$RUNTIME_APP" rev-parse --short=12 HEAD)"
  ls -1 "$REL" | grep -v '^\.' | sed 's/^/release : /'
}

cmd_prune() {
  local keep=3 serving prev; serving="$(basename "$(readlink "$CUR")")"; prev="$(cat "$REL/.previous" 2>/dev/null || true)"
  # newest by mtime, never the serving or previous one
  for d in $(ls -1t "$REL" | grep -v '^\.' | tail -n +$((keep + 1))); do
    [ "$d" = "$serving" ] || [ "$d" = "$prev" ] && continue
    log "pruning $d"
    docker run --rm -v "$REL":/r node:22-bookworm-slim rm -rf "/r/$d" # files written by the root container
  done
}

mkdir -p "$REL"
case "${1:-}" in
  build) shift; cmd_build "$@" ;;
  check) shift; cmd_check "$@" ;;
  switch) shift; cmd_switch "$@" ;;
  rollback) shift; cmd_rollback "$@" ;;
  runtime) shift; cmd_runtime "$@" ;;
  status) cmd_status ;;
  prune) cmd_prune ;;
  *) sed -n 2,14p "$0"; exit 2 ;;
esac
