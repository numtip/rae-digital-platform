# RAE Digital Platform — DAY_CLOSEOUT 2026-11-27

**Result:** `DAY_20261127_CLOSED` · `RAE_UNIFIED_PLATFORM_READY = YES` · `M03_PRODUCTION_READY = YES` · MJU SSO `PENDING_EXTERNAL_APPROVAL`

**Deployed = `8a61dfc` (release tooling). GitHub `main` = same + docs-only.**

## 1. PR ที่ merge วันนี้ (CI green ทั้งหมด)

| PR | Merge SHA | เนื้อหา |
|---|---|---|
| **#124** | `08ca7cb` | **M22** แก้ไข nightly backup CMS (pipefail false failure, RAE_HOME paths) + เพิ่ม verify restoration |
| **#125** | `c2b9816` | **M04** CMS Knowledge/FAQ — entries, desk panel, public section hidden while empty, FAQPage JSON-LD, revalidate hook |
| **#126** | `a9b8e00` | **M05** CMS Events/calendar — registry, desk panel (Bangkok time), section on /news/events, cancelled kept visible flagged, Event JSON-LD |
| **#127** | `3c300b0` | **M06** relevance ranking สำหรับ search — title outrank body, exact record codes first, stable ties (no personnel yet) |
| **#128** | `7668356` | docs status after M04/M05/M06/M22 deploy at `3c300b0` (เอกสารเท่านั้น) |
| **#129** | `6870232` | events archive แบ่งหน้า 10 ต่อหน้า (real URLs, canonical/hreflang/sitemap) |
| **#130** | `d44879f` | **M07** contact form + CMS FAQ บน /contact — form off จน owner ตั้ง notice+retention; consent+notice version stored; rate limit, honeypot, validation, retention purge, editor-only inbox audited; SMTP ยังไม่ทำ |
| **#131** | `c91ed4b` | **M08** analytics แบบ cookieless per-day/path counters (off until ANALYTICS_ENABLED); check:a11y gate; docs |
| **#132** | `210f1c7` | docs status after M07/M08 deploy at `c91ed4b` (เอกสารเท่านั้น) |
| **#133** | `40d9167` | **M05**.ics RFC 5545 per event + feed (calendar.ics); axe browser runner (scripts/axe-live.mjs): 13 live pages × light/dark × desktop/phone = 0 violations |
| **#134** | `e0e0678` | **M17** announcements — banner/popup/ticker; server-enforced schedule/expiration; native dialog popup (once/session, Esc/close/focus); ticker pausable/reduced-motion |
| **#135** | `788ca8b` | **M18** desk dashboard — counts per module, upcoming/live/broken links, recent activity (audit:read only) |
| **#136** | `de47e5b` | **M13** departments/org structure — parent/child tree max 4 levels, loop detection, archived parents can't be restored; hidden when parent hidden |
| **#137** | `21590ac` | **M23** OpenAPI description ของ public GET endpoints + contract test (fails if undocumented route leaks internal field) |
| **#138** | `f093f35` | fix(a11y): duplicate landmark names (banner+ticker, org section vs existing), dark-mode contrast |
| **#139** | `176b6d8` | docs status after M17/M18/M13/M23 deploy at `f093f35` (เอกสารเท่านั้น) |
| **#140** | `8a61dfc` | **ops** release tooling — isolated builds, spare-port probe, health-checked switch with auto-rollback, runtime step |

ค้างเก่า (ไม่ได้แก้): **#115** docs SSO approval pack · **#98** day closeout memory · **#141** fix(m17-landmarks-m05-month) · **#142** fix/release-script stderr logging

## 2. Verified Production — วัดสดวันนี้

```
VPS190 (10.1.245.190, raeserver, rae_admin)

Deploy system: symlink `~/rae/current -> ~/rae/releases/<sha>` → containers mount `~/rae/current:/app`
Production SHA: **`8a61dfc`** (deployed 2026-11-27 ~04:27Z)
GitHub main: `8a61dfc` + docs-only commits ahead = ไม่ต่างโค้ด

Containers: node:22-bookworm-slim
  rae-digital-next      127.0.0.1:3417  admin host (rae-cms.raemanagemju.net, noindex)
  rae-digital-landing   127.0.0.1:3418  canonical (/rae-landing, served by nginx proxy)
  rae-cms-runtime       127.0.0.1:3317  loopback CMS API (cloudflared tunnel)
  rae-cms-db            mariadb:10.6    ชื่อตารางจริง ≠ เอกสารบางที่เขียน (audit_logs ไม่ใช่ audit_log)

Migration: 001–005, 007–016 (15 ไฟล์, ไม่มี 006) — DB มี 15 ตารางตรงกัน
ข้อมูล: news 15 (draft 9/published 1/review 1/approved 1/withdrawn 3) · media 7 ไฟล์ · users 6 · audit_logs 106 · sessions 8,993 · documents/events/knowledge/departments/announcements/contact = 0 ทุกตัว
```

**Canonical URL probes (VERIFIED):**
- `raeservice.mju.ac.th/rae-landing/` → 301 → `/th/` → **200** ✓
- `/th/knowledge/` → **200** ✓ (FAQ section hidden while empty)
- `/th/news/events/` → **200** ✓ (pagination present)
- `/th/contact/` → **200** ✓ (form endpoint returns 404 until configured)
- `sitemap.xml` → **200** · **164 `<loc>`** (เพิ่มจาก 152 เมื่อวาน)
- `rae-cms.raemanagemju.net/th/cms-admin/` → **200** ✓ (Cloudflare Access ยังเปิดอยู่)
- `/cms-api/v1/public/openapi.json` → **200** · **7 public paths**: documents(x2), knowledge, events, departments, announcements, contact/config

## 3. Acceptance Results (REPORTED โดยผู้ปฏิบัติงาน — ผมตรวจผลบนหน้าและ API)

- **News lifecycle**: draft → review → publish → revise → republish → unpublish ทำงานทั้ง list/detail/search/sitemap สอง renderer ทันที
- **M03 Document Center**: registry, counted open/redirect, versions, search, pagination (50), link health background — verified on canonical URL
- **M04 Knowledge/FAQ**: FAQPage JSON-LD, search index, hidden while empty
- **M05 Events**: section absent while none · cancel shown flagged · 10/page · .ics per event + feed (RFC 5545)
- **M06 Search**: relevance ranking applied (title > body, exact codes priority)
- **M07 Contact Form**: endpoint exists but returns 404 until CONTACT_* config set · consent/notice recorded · rate limit/honeypot
- **M08 Analytics**: per-day/path anonymous counters · off unless ANALYTICS_ENABLED · DNT/GPC honoured
- **M13 Departments**: parent/child tree max 4 levels · loop protection · archived never deleted
- **M17 Announcements**: banner/popup/ticker · server-enforced expiration · focus trap · reduced-motion pause
- **M18 Desk Dashboard**: read-only counts per module · upcoming events · broken links · recent activity
- **M23 OpenAPI**: 7 public routes documented + contract test · 401 on non-public endpoints
- **A11y**: axe-runner finds issues → fixed in #138 (duplicate landmarks, dark contrast)
- **Security**: rate limits verified · Cloudflare blocks forged cf-connecting-ip (403)
- Test records removed except withdrawn.json still has test IDs (should be cleaned)

## 4. Blockers ปิดวันนี้

1. **canonical site เป็น static landing** → ตอนนี้เป็น Next ที่ต่อ CMS แล้ว ✅
2. **CMS news ไม่ถึง site** → publish hook post ผ่าน rae-revalidation secret ✅
3. **ช่องโหว่ repo audit 12 ข้อ** → ปิดครบแล้ว (#97 hero, #100 port/hooks/media/passwords/README/transaction, #101 lock, #102 Prisma delete) ✅
4. **SSO ไม่มีที่ยืน** → สร้างเสร็จ ผูก identity link ได้ แต่ยังปิด 🟡 รอ external approval
5. **fake cf-connecting-ip** → Cloudflare ปฏิเสธแล้ว ✅
6. **analytics ไม่เริ่มทำงาน** → migration 014 ติดแล้ว แต่ต้องตั้ง ANALYTICS_ENABLED ✅ (dark mode)
7. **backup cron ชี้ path เก่า** → ต้องแก้ไข crontab ด้วยตนเอง (agent ถูกปฏิเสธโดยอัตโนมัติ guard)

## 5. ค้าง (เจ้าของ/ภายนอก)

1. **M365 onboarding** — ยังไม่มีรายการลิงก์ SharePoint ที่ยืนยันได้ · `scripts/import-m365-links.mjs` พร้อม dry-run (drafts only)
2. **MJU SSO** — ต้องได้ CMS C-14 เซ็นกลับ + หนังสือ E2E จากผู้ดูแล SSO ของ MJU · risk acceptance ติดตั้งแล้ว · forms อยู่ `~/rae/ops/forms/` · เปิดเมื่อได้ครบ
3. **Cloudflare Access** บน `/th|en/cms-admin/*` — ตอนนี้เข้าถึงได้ 200 (ยังไม่เปิด Access) · ห้ามทับ `/cms-api/*`
4. ** withdrawn.json ล้างข้อมูลทดสอบ** — ยังมี `uat-withdraw-0` ถึง `-7` และ news test ids残留
5. **M15 (media library upload)** — ยังติด ADR-0004 (ห้าม Graph runtime ใน v1)
6. **M12 (personnel/PDPA)** — ยังติด gate A-4 (PDPA basis + retention)
7. **Backup cron path เก่า** — crontab ชี้ `$HOME/docker-raeserver/backup_db.sh` (MySQL) และ `$HOME/rae-cms-backups/bin/backup-rae-cms.sh` (CMS) แต่ agent ถูกปฏิเสธไม่ให้แก้ไข automatic guard

## 6. การตัดสินใจของเจ้าของที่ยังมีผล

- **ADR-0004 (Accepted)** — ไฟล์ต้นฉบับอยู่ใน Microsoft 365/SharePoint · แพลตฟอร์มเก็บ metadata + storage_url เท่านั้น · **ไม่มี Graph runtime ใน v1**
- **ADR-0005 (Implemented)** — `/th/` เป็นหลัก · `/` → 307 → `/th/` · copy อยู่นอก component · SEO recprocate · สถิติต้นแบบ = ตัวอย่าง ไม่ใช่ KPI
- **ADR-0006 (Implemented)** — persistence = MySQL repository เขียนมือ (`mysql2`) · **Prisma ถูกลบใน #102** · `createCmsServer({repository})` เลือก memory/MySQL จาก env
- **เจ้าของอนุมัติ M12 แล้ว** — ผู้ปฏิบัติงานระบุว่า "owner approved without third-party approval gates" · มุ่งไป Phase 2 modules
- **admin host เป็น noindex เสมอ** · CMS runtime ห้ามเปิด public hostname
- **merge/เอกสารเท่านั้นไม่ redeploy** — deploy เกิดเมื่อเจ้าของสั่ง
- **ห้ามใช้ `cms-runtime/rollback.sql` กับ `rae_cms`** · ห้ามแก้ `/etc/cloudflared/config.yml` (route ตั้งที่ dashboard)
- **contact form stays off** จน owner ตั้ง notice + retention (PDPA)
- **analytics stays off** จน owner ตั้ง `ANALYTICS_ENABLED=true`

## 7. Backup / Rollback

```
~/rae/rae-cms-backups/
  pre-deploy-20261125T054232Z/   pre-sso-20261125T064323Z/
  pre-m03-20261125T084143Z/      pre-m03b-20261125T084907Z/
  pre-events-paging-20261127T031917Z/
  pre-m07m08-20261127T033246Z/   pre-m17-m23-20261127T040311Z/
  daily/  weekly/  bin/  backup.log

Static landing: ~/rae/rae-landing-static-backup/
```

- ย้อนโค้ด: เปลี่ยน symlink `~/rae/current -> <prev-sha>` แล้ว restart containers
- ย้อน CMS data: restore จาก `pre-*` dump ลง temp database แล้ว import กลับ
- SSO rollback: `MJU_SSO_ENABLED=false` + restart (ตอนนี้เป็นค่นั้นอยู่แล้ว)

## 8. บทเรียน / กัดไว้

1. **ระบบ deploy เปลี่ยนรูป**: ตอนนี้ออกจาก systemd user units → **symlink releases + docker run --rm** mount `~/rae/current:/app` · ตรวจด้วย `readlink ~/rae/current` แทน `docker inspect`
2. **schema_migrations table ไม่มี** — DB ไม่ได้ track migrations ที่ apply แล้ว ต้องตรวจสอบความสมบูรณ์โดยการเทียบชื่อไฟล์ migration กับชื่อตารางจริง
3. **test data残留ใน withdrawn.json** — acceptance tests ลบ audit rows ออกแต่ลืมล้าง withdrawn list (uat-withdraw-0 through -7 ยังอยู่) ควรเคลียร์ก่อน production go-live
4. **sitemap ขยายเป็น 164 loc** — มากกว่า 152 มากเพราะ modules ใหม่เพิ่มหลายหน้า (knowledge, departments, events pagination, etc.)
5. **crontab guard ป้องกัน agent** — automated guard block การแก้ไข crontab เพื่อให้ operator ทำเอง — เป็น design decision ที่ถูกต้อง
6. **container ports ≠ image SHA** — digital platform ใช้ bind-mount code dir ไม่ใช่ tagged images · ตรวจ SHA จาก `readlink ~/rae/current` ไม่ใช่ `docker inspect`

## 9. Next Priorities (จาก Blueprint + Progress Note)

1. **M365 real-document onboarding** — รับรายการลิงก์ SharePoint → `import-m365-links.mjs` dry run → drafts → publisher review
2. **ล้าง test data ใน withdrawn.json** — ลบ uat-withdraw entries ออกจาก ~/rae/rae-cms-data/withdrawn.json + รัน CMS restart
3. **Cloudflare Access** บน `/th|en/cms-admin/*` (เปิดหลังจาก SSO approved)
4. **M12 Personnel & PDPA** — เริ่ม build หลังจาก owner approve
5. **Module Phases ตาม roadmap**: M05 events/.ics (done) · M04 knowledge/FAQ (done) · next: more content pages, search improvement
6. **Backup cron verification** — operator ตรวจสอบว่า crontab pointing ไปถูก path หลัง release
