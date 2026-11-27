# 1 — Existing Audit Baseline

**Status:** `BASELINE_VERIFIED`  
**Primary source:** `RAE-Attendance-System-V2/docs/unified/06a_VPS_A_AUDIT_SUMMARY.md` (2026-10-15)  
**Full audit:** `06_VPS_A_HOST_AUDIT.md` (1,025 lines)  
**Baseline verdict (unchanged):** `ARCHITECTURE_VERIFIED` / `IMPLEMENTATION_BLOCKED`

---

## 1.1 Host identity (from baseline)

| Field | Baseline value (2026-10-15) |
|---|---|
| Hostname | `raeserver` |
| OS | Ubuntu 22.04.5 LTS, kernel `5.15.0-187-generic` |
| vCPU | 8 |
| RAM | 7.6 GiB total |
| Docker | 25 containers running |
| systemd | 35 services running |

---

## 1.2 Architecture constraints (load-bearing)

- **Single public ingress:** host nginx (`/etc/nginx/sites-enabled/raeservice.mju.ac.th.conf`, mtime 2026-10-01).
- **App ports:** published **loopback-only** (127.0.0.1) — baseline positive control.
- **Attendance routing order:** `/api/v1/` and `/attendance-v2/` **before** legacy `/api/` — must not reorder without review.
- **No Apache** on VPS-A; Cloudflare tunnel does **not** front attendance hostnames.
- **Coexisting stacks:** legacy attendance (:3000), V2 (:3210, :8088), MariaDB (:3306 loopback), Joomla/Learning Center, LiteLLM, Metabase, landing (`rae-landing` include), internal docker nginx (:8082/:8443).

---

## 1.3 Operational risks recorded in baseline (still relevant until delta closes them)

| ID | Summary | Baseline severity |
|---|---|---|
| A-34 | Legacy attendance DB dictionary corruption | Critical |
| A-39 / A-06 | No attendance DB backup; cron pointed at missing script | Critical |
| A-43–A-45 | Legacy API missing auth on operational routes | Critical |
| A-59 | Webmin exposed via cloudflared tunnel (ufw bypass on loopback) | High |
| A-60 | Host LAN IP auto-blocked in ufw (impact unconfirmed) | High / Unknown |
| A-18 / A-36 / A-37 | V2 deploy lag, incomplete migrations, empty V2 DB | Critical |

Post-baseline security work on the same host (2026-10-22, **outside** this audit file but cited for context): PHP RCE patch closed; image pinning `PINNING_PARTIAL`; MariaDB sandbox container `rae-mdb-sandbox` referenced in closeout docs on the host filesystem.

---

## 1.4 RAE Digital Platform (application baseline)

At baseline date, **`numtip/rae-digital-platform` was not deployed on VPS-A.** Architecture docs in that repo assume:

- Next.js modular monolith (ADR-0001), Node ≥20, MySQL 8 + Prisma (future phases).
- **Phase 1 (owner decision 2026-10-24):** public website only; production public surface = **GitHub Pages preview** (workflow `pages-preview.yml`), not VPS.
- VPS staging is a **future, owner-approved** step (architecture §9 lists unknowns as gate **A-1**).

**Cloned repo state on 2026-10-26:** `main` includes Next.js 16 + TypeScript + static export path for Pages (`next.config.ts`); no Docker/Compose for platform in repo yet.

---

## 1.5 Baseline backup / TLS / firewall (for delta comparison)

| Area | Baseline finding |
|---|---|
| Attendance backup | **0** verified backups; broken cron reference |
| TLS | Let's Encrypt on `raeservice.mju.ac.th` (host nginx) |
| ufw | Active, default deny; detailed rules verified in full audit § (B-7 closed) |
| fail2ban / sshd | Hardening documented in full audit |

---

## 1.6 What this baseline does **not** cover

- VPS-B (`10.1.254.237`) — explicitly out of scope per baseline.
- Production cutover for RAE Digital Platform — not started.
- Reference Windows stack (Blocker B-1) — still external to VPS-A.

**Conclusion:** Baseline document found and used; no synthetic baseline data added.
