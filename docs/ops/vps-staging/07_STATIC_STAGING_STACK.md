# 7 — Static Staging Stack (Implementation)

**Status:** Ready for review — **not deployed**  
**Related PR:** (opened from `feat/static-staging-stack`)  
**Docs PR #48:** design baseline — merge independently when approved

---

## Artefacts

| File | Purpose |
|---|---|
| `Dockerfile.staging` | nginx-only image serving `out/` |
| `docker-compose.staging.yml` | Project `rae-digital-staging`, `127.0.0.1:8090`, 256M / 1 CPU |
| `deploy/staging/nginx/default.conf` | Static file routing + `/healthz` |
| `deploy/staging/host-nginx.reference.conf` | Basic Auth + HTTPS + `noindex` (**reference only**) |
| `.env.staging.example` | Non-secret build/deploy variables |
| `scripts/staging/deploy.sh` | Manual deploy with preflight + SHA manifest |
| `scripts/staging/rollback.sh` | Roll back to verified previous release |
| `scripts/staging/test-rollback-logic.sh` | Offline checksum/symlink test |

---

## Build base path

| Channel | `NEXT_PREVIEW_BASE_PATH` | Default |
|---|---|---|
| GitHub Pages | *(unset)* | `/rae-digital-platform` |
| VPS staging | `/rae-digital-staging` | set in `.env.staging` / deploy script |

GitHub Pages workflow is unchanged.

---

## Owner approval before `[EXEC]`

1. **P0 — A-39 / A-06:** production DB backup gap on co-hosted VPS (waive or remediate).  
2. **P1 — A-1:** staging URL, Basic Auth custodian, off-host backup target (future DB phases).  
3. **P1 — MJU IT:** install `host-nginx.reference.conf` snippet + htpasswd outside git.  
4. Create `/opt/rae-digital-staging` (not world-writable).  
5. Use Node **≥ 20** in CI or a builder container — **not** host Node 12.

---

## Manual deploy (after approval)

```bash
cp .env.staging.example .env.staging   # edit paths/URL; no secrets in git
chmod +x scripts/staging/*.sh
./scripts/staging/deploy.sh
```

Rollback:

```bash
./scripts/staging/rollback.sh          # previous release
./scripts/staging/rollback.sh <sha>    # explicit release id
```

---

## Security notes

- No `--privileged`, host network, or Docker socket mounts.  
- Container filesystem read-only with tmpfs for nginx caches.  
- Secrets: htpasswd and any future DB creds **only** on host under `/etc/nginx/secrets/` or `/opt/rae-digital-staging/secrets/`.  
- Immutable releases: `manifest.json` + `out.tar.gz` SHA-256 verified before activate/rollback.

---

## Smoke (loopback)

```bash
curl -sf http://127.0.0.1:8090/healthz
curl -sf -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8090/th/
curl -sf -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8090/en/
```

Edge (post host nginx):

```bash
curl -sf -u 'USER' -o /dev/null -w '%{http_code}\n' \
  'https://raeservice.mju.ac.th/rae-digital-staging/th/'
```

Expect `X-Robots-Tag: noindex, nofollow` on edge responses.
