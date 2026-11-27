# RAE Digital Platform — DAY_CLOSEOUT 2026-11-27

**Result:** `DAY_20261127_CLOSED` · `RAE_UNIFIED_PLATFORM_READY = YES` · `M03_PRODUCTION_READY = YES` · `M15_PRODUCTION_READY = YES` · `M15_NEWS_INTEGRATION_READY = YES` · `CMS_DARK_MODE_PASS = YES` · MJU SSO **LIVE (owner pilot)** — final state in §10 (the earlier session sections below are kept as written)

**Final: deployed = `35cb73653153` (release, runtime and both site builds). Earlier today: `8a61dfc`, then `623913e`. See §10.**

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

---

## 10. Later session, 07:00–09:00 UTC — shadcn desks, MJU SSO live, M15 media library (final state)

### 10.1 PRs merged after §1 (all CI green; `main` ends at `35cb736`)
| PR | Merge | What |
|---|---|---|
| #149 | `cc05a18` | shadcn/ui setup (`components.json`, `lib/utils.ts`, tokens that only alias brand colours, `[data-slot]` border reset) + toast and confirm dialogs in the documents desk |
| #150 | `54dc65f` | SSO production-config tests, live-pilot record, container DNS fix, rollback (`docs/ops/mju-sso-live-e2e.md`), STATUS |
| #151 | `6fca1e0` | toast + persistent inline error + confirm dialogs on **every** desk (`components/cms/desk-feedback.tsx`) |
| #152 | `c76a31f` | **M15 media library**: migration 018, `/v1/media-library`, `/v1/public/media`, desk panel, OpenAPI, MariaDB tests |
| #153 | `3ea3218` | admin desk readable under `prefers-color-scheme: dark` (text colour + form scheme pinned) |
| #154 | `a8dc8b2` | news ← library images (`POST /v1/news/{id}/media/from-library`) + picker in the news desk |
| #155 | `35cb736` | toast contrast (drop `richColors`); media codes never reused (max of rows and audit trail) |
Not merged, not ours to close: #144 (an earlier draft of this closeout, superseded by #145/#147), #115 and #98 (older docs PRs).

### 10.2 Migration
`018_media_library.sql` (table `media_assets`, additive, starts empty). Applied to production after a dump
(`~/rae/rae-cms-backups/pre-m15-*`: SQL + media tar + runtime.env); applied clean with migrations 001–018 on a disposable
`mariadb:10.6` first, and 018 re-applies idempotently. There is still no `schema_migrations` table (see §8).

### 10.3 Deployments (all through `release.sh`; measured switch gap 2.5–3.7 s)
`cc05a18e5c53` (shadcn + documents desk) → `c76a31fea41c` (M15; runtime moved too) → `a8dc8b2497bc` (news ← library, dark fix) →
**`35cb73653153`** (toast contrast, code non-reuse; runtime + web). Runtime and web are on the same SHA.

### 10.4 MJU SSO — live owner pilot (supersedes "PENDING_EXTERNAL_APPROVAL")
Adapter `@mju/sso-integration` v1.0.0-rc.6 (`2d30b35`, same as Attendance V2 PR #86), `citizenID` → application HMAC, C-14 for the
**CMS purpose** signed by the owner (the 2026-11-06 record covers attendance only), ADR-006 owner risk acceptance, one approved
link to the existing admin user. Real sign-in ×2 + sign-out passed. One real defect found and fixed: the runtime container resolved
`sso.mju.ac.th` to a public address this host cannot reach → `--add-host sso.mju.ac.th:10.1.254.54` in the systemd unit (TLS stays
verified). Details, results and rollback: `docs/ops/mju-sso-live-e2e.md`. Activation script: `~/rae/ops/mju-sso-activate.sh`.

### 10.5 Tests
- Repo suite 183 → **192** passing (0 failing; 12 skipped without a database/adapter). New: `cms-media-library` (4), production-config SSO (2), OpenAPI contract extended, contrast alias tests (5).
- Database-backed (disposable MariaDB 10.6, `RAE_CMS_DB_HOST`): `cms-media-library-db` (3), repeated 8× without a failure.
- Isolated SSO suite (`MJU_SSO_MODULE`): 7/7 — replay, revocation, token death after logout, CSRF, RBAC, C-14 flag off, no acceptance.
- Browser acceptance on production (headless Chromium + axe, UITEST data removed after each run): **24/24** desk checks (confirm → keep → confirm → toast on FAQ, events, announcements, departments, documents, media; officer-refused error stays as an inline Alert after the toast is gone) and **18/18** news/picker checks (publish and withdraw confirms, picker adds an image, thumbnail renders). axe WCAG A/AA on the logged-in desk, **light and dark, with a toast on screen: 0 violations**. The scripts were one-off (session scratchpad), not committed.
- Final production verification after the last deploy: SSO status enabled and `/sso/login` redirects to MJU; container reaches MJU with TLS verified; local login for all four UAT roles and the owner account; RBAC (viewer 403 on the library, officer 403 on SSO links, admin 200, officer cannot publish); site 200 on both hosts; media code non-reuse proven live (delete a row, the next code is higher).

### 10.6 Decisions of the day (owner)
SSO pilot accepted and kept on; no third-party reviewer as an internal gate; M15 on the existing CMS media volume with access control and the nightly backup (it already tars the whole volume), documents stay in SharePoint (ADR-0004); test tombstones removed from `withdrawn.json` (backup kept); M365 onboarding and Cloudflare Access deferred; media codes must never be reused.

### 10.7 Remaining issues (none blocks production)
1. Other modules (FAQ, events, announcements, …) still assign `MAX(code)+1`, so a deleted row frees its code. Same fix as the media library if wanted.
2. The personnel desk was not exercised in the browser (publishing a person needs a consent record); it is covered by API tests and the shared confirm component only. The other desks, the news desk and the picker were exercised in a real browser.
3. The desk's confirm/toast flows are not in CI: `check:contrast`/`check:a11y` read the static export, where the admin page is off. The CDP+axe run above is the only coverage; committing it as a script is a candidate task.
4. The public site does not render library images yet (API/desk only; news can use them).
5. Backups: `BACKUP_SCHEDULE_VERIFIED` is still PENDING (first checks 2026-11-28 02:45Z and 2026-11-29 04:30Z). `PERSONNEL_KEY` offline copy is the owner's task.
6. SSO: only one account is linked; revoking a link cannot be undone in the CMS (approve needs `pending`), so do not revoke the owner link without a recovery plan. If MJU renumbers `sso.mju.ac.th`, update the `--add-host` line.
7. Obsidian is unreachable from this host; two sync notes are staged for Hermes (below).

