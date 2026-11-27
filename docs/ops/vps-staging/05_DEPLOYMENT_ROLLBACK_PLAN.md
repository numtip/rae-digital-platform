# 5 — Deployment & Rollback Plan (Staging Only)

**Status:** Plan document — **no execution**  
**Owner approval required** before any step marked `[EXEC]`.

---

## 5.1 Preconditions

| # | Check |
|---|---|
| P-1 | GO decision in [06_GO_NO_GO.md](./06_GO_NO_GO.md) |
| P-2 | Directory `/opt/rae-digital-staging` owned by root or deploy user, not world-writable |
| P-3 | Basic auth credentials created offline |
| P-4 | Release artefact built from tagged commit on `main` |
| P-5 | Image pin / digest recorded (align with host `image-guard` policy if images pulled from registry) |

---

## 5.2 Initial install sequence

| Step | Action | Impact |
|---|---|---|
| 1 `[EXEC]` | Create compose project + networks + volumes under `/opt/rae-digital-staging` | New containers only |
| 2 `[EXEC]` | Build or pull `rae-digital-staging-app:<git-sha>` | Disk + CPU |
| 3 `[EXEC]` | Start `app` bound to `127.0.0.1:8090` | Loopback only |
| 4 `[EXEC]` | Verify `curl http://127.0.0.1:8090/` from host | None on prod routes |
| 5 `[EXEC]` | Add nginx `location ^~ /rae-digital-staging/` + reload nginx | **Production nginx** — maintenance window |
| 6 `[EXEC]` | External smoke via HTTPS + basic auth | — |

Phase 2 adds `db` service + `prisma migrate deploy` against staging DSN only.

---

## 5.3 Health checks

| Probe | Expected |
|---|---|
| Container | `HEALTHCHECK CMD curl -f http://localhost:3000/healthz` |
| Host | `curl -sf -o /dev/null -w '%{http_code}' http://127.0.0.1:8090/healthz` → 200 |
| Edge | `https://<vhost>/rae-digital-staging/healthz` → 200 + `noindex` |

Implement `/healthz` route in app before first VPS deploy (small PR — not in scope of this documentation PR).

---

## 5.4 Backup (staging scope)

| Asset | Method | Frequency |
|---|---|---|
| MariaDB staging | `mariadb-dump` to `/opt/rae-digital-staging/backups/` | nightly cron (staging-only) |
| Media volume | `tar` manifest + files | weekly |
| Release artefacts | keep last **5** SHA directories | on each deploy |

**Off-host copy:** rsync to owner-approved storage (gate A-1). Do **not** rely on attendance backup jobs (baseline A-06).

---

## 5.5 Rollback

| Scenario | Procedure | RTO target |
|---|---|---|
| Bad app release | `ln -sfn releases/<prev-sha> current && docker compose up -d app` | < 5 min |
| Bad nginx snippet | Restore previous vhost file from `.bak.<date>` + `nginx -t && systemctl reload nginx` | < 5 min |
| DB migration failure | Restore latest staging dump to `rae-digital-staging-db-data` volume (stop app first) | < 30 min |
| Full remove staging | `docker compose down -v` (staging volumes only) + remove nginx location | owner decision |

**Production attendance / V2:** rollback steps must **not** invoke `docker compose` in `/opt/rae-attendance*` trees.

---

## 5.6 CI/CD rollout stages

1. **Stage 0 (current):** Pages preview only — no VPS workflow enabled.  
2. **Stage 1:** Manual artefact upload + compose on VPS.  
3. **Stage 2:** `workflow_dispatch` upload via SSH/scp with environment protection rules.  
4. **Stage 3 (optional):** Automated promote from CI after e2e on staging — requires Playwright staging suite per roadmap.

---

## 5.7 Verification checklist (post-deploy)

- [ ] `/rae-digital-staging/` returns 200 with basic auth
- [ ] `X-Robots-Tag: noindex` present
- [ ] No new listeners on `0.0.0.0` except existing 80/443
- [ ] `docker ps` shows only `rae-digital-staging-*` as new names
- [ ] Attendance URLs unchanged (smoke `/attendance-v2/`, `/api/v1/health` if available)
- [ ] Staging backup job logged at least once successfully

---

## 5.8 BACKUP_ROLLBACK_READY interpretation

| Scope | Ready? |
|---|---|
| Staging-only rollback procedure | **Yes** (documented) |
| Staging DB backup automation | **Designed**, not installed |
| Host production DB backup (baseline A-39) | **No** — unchanged from baseline |

Owner may require production backup remediation before **first** VPS staging install even though staging is isolated.
