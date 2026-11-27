# 3 — VPS Capacity & Risk Assessment

**Date:** 2026-10-26  
**Purpose:** Decide whether VPS-A can host an **isolated** RAE Digital Platform staging slice without jeopardizing existing services.

---

## 3.1 Capacity snapshot

| Resource | Observed | Staging budget (proposed) | Gate |
|---|---|---|---|
| vCPU | 8 | 1–2 CPUs cap for staging stack (compose `deploy.resources`) | PASS with limits |
| RAM available | ~3.8 GiB (momentary) | 768 MiB–1.25 GiB staging (app 512M + DB 256M + overhead) | **CONDITIONAL PASS** — swap 1.9 GiB used → burst risk |
| Disk free | ~225 GiB on `/` | 5 GiB reserved (images + DB + logs) | PASS |
| Docker networks | 17 existing | +1 isolated bridge | PASS |
| Loopback ports | 8087, 8090 free | 8090 app, 8091 reserved API preview | PASS |

**RESOURCE_CAPACITY_PASS:** **Conditional** — acceptable for a **single** small staging stack with hard memory limits and no colocation on production DB ports; not acceptable for unconstrained Node + full MySQL without caps.

---

## 3.2 Host Node.js gap

| Requirement | Repo (`package.json` engines) | Host |
|---|---|---|
| Node | `>=20.9.0` | **v12.22.9** |

**Risk:** Native systemd staging on host OS is **not viable** without installing Node 20+ (owner action). **Recommended:** run staging only inside official `node:22-bookworm-slim` (or `22-alpine`) container.

---

## 3.3 Collision matrix (existing vs staging)

| Port / path | Consumer today | Staging plan |
|---|---|---|
| 127.0.0.1:3000 | legacy attendance API | no reuse |
| 127.0.0.1:3210 / 8088 | V2 backend / frontend | no reuse |
| 127.0.0.1:8085 | `rae-landing` | keep; platform uses **different path prefix** |
| 127.0.0.1:8082 | docker nginx | do not chain staging through unhealthy container without fix |
| 127.0.0.1:8090 | free | **staging Next upstream (proposed)** |
| Host `/` nginx | production vhosts | new `location` only after approval |

---

## 3.4 Risk register (staging-relevant)

| ID | Risk | Severity | Mitigation in design |
|---|---|---|---|
| R-01 | Production DB backup gap (baseline A-39) | High | Staging uses **dedicated** MariaDB volume; no shared `mariadb` / `rae-v2-mariadb` |
| R-02 | Swap / memory contention | Medium | Compose mem limits; staging off during peak ops if needed |
| R-03 | Host Node 12 | High | Container-only runtime |
| R-04 | Docker nginx unhealthy | Medium | Stage via **host nginx → 127.0.0.1:8090**; fix docker nginx separately |
| R-05 | nginx location ordering errors | High | New locations under dedicated prefix `/rae-digital-staging/`; no edits to attendance `^~` blocks in same PR as deploy |
| R-06 | ufw / tunnel exposure (A-59) | High | Staging loopback-only + basic auth at nginx; no new public ports |
| R-07 | Incomplete platform app on `main` | Medium | Phase 1 staging serves **static export** or preview build until SSR/API approved |
| R-08 | Secrets in compose | Medium | `.env.staging` root-owned 0600, never in git; inject via owner |
| R-09 | Owner gate A-1 (engine, TLS owner) | Medium | Document decisions in 06_GO_NO_GO |

---

## 3.5 Capacity vs product phases

| Phase | Staging footprint |
|---|---|
| **Phase 1 (now)** | Static files or `next start` preview; optional **no DB**; GitHub Pages remains canonical public preview |
| **Phase 2+** | Add MariaDB 11 + Prisma migrate; worker container; object storage volume or MinIO sidecar |

---

## 3.6 Monitoring hooks (design)

- HTTP: `GET /rae-digital-staging/healthz` → 200 JSON `{ "status":"ok","env":"staging" }`
- Docker healthcheck: `curl -f http://127.0.0.1:8090/healthz` inside app network namespace
- Log driver: `json-file` with `max-size=10m`, `max-file=3` per staging container
- Separate log tags: `com.rae.service=rae-digital-staging`

No monitoring agents were installed in this task.
