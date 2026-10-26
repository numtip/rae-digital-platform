# 2 — Delta Assessment (Read-Only)

**Assessment date:** 2026-10-26  
**Method:** Commands run on VPS-A as `rae_admin` — no config edits, restarts, installs, or deploys.  
**Evidence:** [evidence/2026-10-26-delta-snapshot.txt](./evidence/2026-10-26-delta-snapshot.txt)  
**Status:** `DELTA_ASSESSMENT_COMPLETE`

Legend: **UNCHANGED** · **CHANGED** · **UNKNOWN** · **RISK**

---

## 2.1 Compute & memory

| Metric | Baseline (2026-10-15) | Current (2026-10-26) | Delta |
|---|---|---|---|
| vCPU | 8 | 8 | UNCHANGED |
| Load avg (1m) | 25.60 | 5.53 | CHANGED (lower) |
| RAM available | ~203 MiB | ~3.8 GiB | CHANGED (much higher) |
| Swap used | 1.8 / 4.0 GiB | 1.9 / 4.0 GiB | CHANGED (slight increase) |
| Uptime | 57 days | 68 days | CHANGED (expected) |
| Memory pressure (`/proc/pressure/memory`) | not captured | some/full avg10 ≈ 0.45–0.47 | UNKNOWN vs baseline |

**Note:** Baseline recorded severe RAM pressure; current snapshot shows more reclaimable cache and higher `available`. Swap remains heavily used → **RISK** for new memory-bound workloads without limits.

---

## 2.2 Disk

| Metric | Baseline | Current | Delta |
|---|---|---|---|
| Root FS use | 239 G / 490 G (51%) | 245 G / 490 G (53%) | CHANGED (+6 G, +2 pp) |

**Assessment:** Headroom adequate for isolated staging artefacts (+2–5 G planned); monitor shared Docker volumes.

---

## 2.3 Docker

| Metric | Baseline | Current | Delta |
|---|---|---|---|
| Running containers | 25 | 26 | CHANGED |
| Total containers (incl. stopped) | not in summary | 40 | UNKNOWN |

**New / notable vs baseline attendance-focused list:**

| Container | Status | Notes |
|---|---|---|
| `phpmyadmin` | Up 3 days | 127.0.0.1:8080 — post PHP hardening window |
| `rae-mdb-sandbox` | Up 3 days | MariaDB recovery sandbox (no host port) |
| `learning-center-*` | Up 4 days | Healthy stack on 127.0.0.1:8086 |
| `raenew2026-*` | Up 4 days | 127.0.0.1:8084 |
| `nginx` (docker) | Up 2 months, **unhealthy** | 127.0.0.1:8082, :8443 |

Attendance core (`attendance-api`, `rae-v2-*`, `mariadb`) still present with same loopback port pattern as baseline → **UNCHANGED** at routing level.

**Docker networks:** 17 bridge networks including `rae-attendance-v2_default`, `learning-center-net`, `raenew2026-net`, `docker-raeserver_*` — no `rae-digital-*` network yet → **UNCHANGED** (platform not deployed).

---

## 2.4 systemd

| Metric | Baseline | Current | Delta |
|---|---|---|---|
| Running services | 35 | 39 | CHANGED |

Key services confirmed active: `nginx`, `docker`, `cloudflared`, `fail2ban` → consistent with baseline architecture.

---

## 2.5 Nginx & ports

| Item | Baseline | Current | Delta |
|---|---|---|---|
| Host nginx | active, :443/:80 on 0.0.0.0 | active, same | UNCHANGED |
| `raeservice.mju.ac.th.conf` mtime | 2026-10-01 | 2026-10-01 | UNCHANGED |
| Loopback app ports | 3000, 3210, 8088, 8086, … | same set + 8080 phpMyAdmin | CHANGED (8080 in use) |
| Staging candidate ports 8087, 8089–8091, 3007, 3010, 3220 | not probed | **free** (ss, 2026-10-26) | UNCHANGED availability |

**RISK:** Docker `nginx` container health = `unhealthy` while host nginx serves TLS — investigate before adding another proxy layer (read-only note only; no action taken).

---

## 2.6 Database health (spot check)

| Check | Result | Delta |
|---|---|---|
| `docker exec mariadb mariadb-admin ping` | `mysqld is alive` | UNCHANGED (superficial) |
| Legacy A-34 dictionary corruption | not re-probed | UNKNOWN (baseline Critical still applies until lab re-verify) |
| V2 `rae-v2-mariadb` | running, no host port | UNCHANGED |

**RISK:** Baseline critical data-layer findings (A-34, A-39, empty V2 DB) were **not** re-validated in this pass to avoid production DB load; treat as **UNCHANGED / open**.

---

## 2.7 Backup & restore readiness

| Check | Result | Delta |
|---|---|---|---|
| User crontab | empty template only | UNCHANGED |
| `/etc/cron.d` | no attendance backup job visible to `rae_admin` | UNCHANGED |
| `attendance_backup.sh` / `backup_db.sh` in cron grep | no matches | UNCHANGED vs A-06 |
| Platform staging backups | N/A (not deployed) | UNCHANGED |

**Assessment:** **RISK** — host-wide backup posture for coexisting production DBs remains as baseline; staging must not depend on sharing production MariaDB instances.

---

## 2.8 Security, firewall, TLS

| Item | Baseline | Current | Delta |
|---|---|---|---|
| ufw rules | documented in full audit | **UNKNOWN** — `sudo` password required for `ufw status` | UNKNOWN |
| Public listeners | 22, 80, 443, 10000, … | same pattern | UNCHANGED |
| Host Node.js | not emphasized | **v12.22.9** | **RISK** — below app requirement `>=20.9.0` (package.json) |
| TLS cert expiry | not in summary | not readable without sudo | UNKNOWN |

Baseline findings A-59 (Webmin via tunnel), A-60 (ufw self-block) → **UNCHANGED** (not re-verified; still **RISK**).

---

## 2.9 RAE Digital Platform on host

| Check | Result |
|---|---|
| Platform containers / compose project | **None** |
| Git clone on host | `~/rae-digital-platform` (this assessment only) |
| Public site delivery | GitHub Pages workflow in repo — **no VPS vhost** for platform |

---

## 2.10 Summary table

| Area | Overall |
|---|---|
| Host identity & ingress model | UNCHANGED |
| Resource pressure | CHANGED (CPU load ↓, RAM available ↑, swap still high) |
| Coexisting production stacks | CHANGED (minor: phpMyAdmin, sandbox DB, LC/raenew2026 uptime) |
| Attendance data/security blockers | UNCHANGED / UNKNOWN (not re-probed) |
| Backup | UNCHANGED — **RISK** |
| Platform staging footprint | UNCHANGED (absent) |
| Host Node for native Next run | **RISK** |

No production configuration was modified during this assessment.
