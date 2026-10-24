# rae-digital-platform

แพลตฟอร์มดิจิทัลของสำนักวิจัยและส่งเสริมวิชาการการเกษตร (RAE) — มหาวิทยาลัยแม่โจ้
_Digital platform for the Office of Agricultural Research and Extension (RAE), Maejo University._

Repo นี้เป็น **canonical development repository** สำหรับ Cursor และ Hermes: เอกสารสถาปัตยกรรม,
ข้อกำหนด, หลักฐานงานวิจัย และ design reference ทั้งหมดอยู่ในที่นี้

> **สถานะปัจจุบัน:** เอกสารเท่านั้น (docs-only) — ยังไม่มีโค้ดแอปพลิเคชันบน `main`
> PR แรกคือ `docs/initial-architecture` ซึ่งนำเข้าเอกสารสถาปัตยกรรมที่ผ่านการตรวจแล้ว
> โค้ด Phase 1 ถูก scaffold แยกบน branch `chore/phase1-scaffold`

---

## 1. ขอบเขตโครงการ (Scope)

แพลตฟอร์มเดียว 3 ชั้น (ดู `docs/architecture/RAE_PLATFORM_ARCHITECTURE.md`)

| Layer | ชื่อ | เนื้อหา |
|---|---|---|
| **A** | Public Website | หน้าแรก Stitch V2, เกี่ยวกับองค์กร, งานวิจัย, บริการวิชาการ, องค์ความรู้, ข่าว, ติดต่อ, ค้นหา, TH/EN, SEO |
| **B** | Administration & CMS | dashboard, ผู้ใช้/สิทธิ์, บุคลากร/หน่วยงาน, ข่าว/สื่อ/เอกสาร, workflow เผยแพร่, รายงาน, audit log |
| **C** | Modular Organization Systems | หนังสือรับ-ส่ง, ครุภัณฑ์, ยานพาหนะ, ห้องประชุม, ปฏิทิน, แบบฟอร์มออนไลน์, ข้อร้องเรียน, แจ้งเตือน, รายงาน, AI (deferred) |

**ไม่ใช่ขอบเขต:** เขียนทับ ERP/HR/IRB/research DB ของมหาวิทยาลัย, สร้างระบบจองที่มีอยู่แล้วซ้ำ,
แก้ไขหรือ migrate ฐานข้อมูล WTMS เดิม, mobile app

**ข้อกำหนดต้นทาง:** `docs/research/requirements/exitfull.txt` (functional inventory — ไม่ใช่ technology spec)

---

## 2. ลำดับความสำคัญ Phase 1 (Foundation)

Phase 1 คือ **6 สัปดาห์ foundation เท่านั้น** ยังไม่เปิดหน้าเว็บ public จริง

1. Repo + CI + design tokens + การบังคับใช้ token (ไม่มี raw hex, ไม่มี `href="#"`)
2. Prisma schema ฝั่ง identity/organisation + migration + seed
3. Authentication: local (Argon2id + TOTP) ก่อน, Entra ID OIDC ตามหลัง flag
4. Session แบบ opaque ใน DB + middleware guard + permission catalogue
5. Admin shell (dark mode), จัดการผู้ใช้/บทบาท, audit trail
6. หน่วยงาน + media library (derivative หลายขนาด, บังคับ alt)
7. Settings (SMTP, ชื่อองค์กร, maintenance mode) + job runner
8. Public shell ด้วย token จาก Stitch V2 + nav 7 เมนูจริง + `<html lang>` ถูกต้อง

**Gate ของ Phase 1:** ทุก endpoint ของ admin ต้องมี `requirePermission` (เทสต์ยืนยัน 403),
ทุก mutation เขียน audit row, axe = 0 บนหน้า login + users list, CI เขียว

Module ทั้ง 29 รายการพร้อมลำดับ phase: `docs/architecture/MODULE_REQUIREMENTS_MATRIX.md`

---

## 3. การตัดสินใจทางสถาปัตยกรรม (Architecture Decisions)

| ADR | เรื่อง | สรุป |
|---|---|---|
| [ADR-0001](docs/architecture/adr/ADR-0001-modular-monolith.md) | รูปแบบระบบ | Modular monolith บน Node runtime (Next.js App Router) — ไม่แยก static/admin |
| [ADR-0002](docs/architecture/adr/ADR-0002-design-baseline.md) | Design baseline | Stitch Landing V2 (React port) เป็น baseline; palette แกนเดียว `#005C3B` |
| [ADR-0003](docs/architecture/adr/ADR-0003-identity-and-access.md) | Identity & access | Entra ID OIDC + local fallback, opaque DB session, RBAC `resource:action` |
| [ADR-0004](docs/architecture/adr/ADR-0004-documents-stay-in-m365.md) | เอกสาร | Website เป็น registry — ไฟล์ต้นฉบับอยู่ใน M365/SharePoint, ไม่มี Graph dependency |

หลักการที่ตัดสินแล้วและไม่ต้องถกซ้ำ: ไม่ใช้ PHP/jQuery/AdminLTE, MySQL 8 + Prisma,
public อ่านอย่างเดียว (read-only projection), admin แยก route group + guard 4 ชั้น

---

## 4. โครงสร้าง repository

```
├─ README.md                     ← ไฟล์นี้
├─ docs/
│  ├─ README.md                  ← สารบัญเอกสารทั้งหมด
│  ├─ PROVENANCE.md              ← ที่มา/สัญญาอนุญาตของทุกไฟล์ + สิ่งที่ถูกตัดออก
│  ├─ architecture/              ← สถาปัตยกรรม, โมดูล, ฐานข้อมูล, roadmap, ADR
│  │  ├─ RAE_PLATFORM_ARCHITECTURE.md
│  │  ├─ MODULE_REQUIREMENTS_MATRIX.md
│  │  ├─ DESIGN_SYSTEM_RECONCILIATION.md
│  │  ├─ DATABASE_AND_API_BLUEPRINT.md
│  │  ├─ DEVELOPMENT_ROADMAP.md
│  │  ├─ LEGACY_REUSE_ASSESSMENT.md
│  │  ├─ ARCHITECTURE_QA.md
│  │  └─ adr/
│  └─ research/                  ← audit, comparison, blueprint, QA, requirements
│     ├─ REFERENCE_AUDIT.md
│     ├─ COMPARISON_MATRIX.md
│     ├─ RAE_REDESIGN_BLUEPRINT.md
│     ├─ TECHNICAL_OPTIONS.md
│     ├─ QA_REPORT.md
│     ├─ requirements/exitfull.txt
│     ├─ evidence/               ← ค่าที่วัดได้ (derived measurements)
│     └─ tools/                  ← สคริปต์ที่ใช้ตรวจ (รันซ้ำได้)
└─ design/stitch/                ← Google Stitch reference (ไม่ใช่ production code)
```

---

## 5. Hermes handoff

อ่านตามลำดับนี้ก่อนเริ่มงานใด ๆ (ประหยัด context):

1. `docs/architecture/RAE_PLATFORM_ARCHITECTURE.md` — ขอบเขต, ชั้นระบบ, security boundary
2. `docs/architecture/MODULE_REQUIREMENTS_MATRIX.md` — งานที่ต้องทำ + acceptance criteria + phase
3. `docs/architecture/DEVELOPMENT_ROADMAP.md` — ลำดับงาน, Definition of Done, gate
4. `docs/architecture/adr/` — การตัดสินใจที่ **ห้ามเปลี่ยนเอง**
5. เอกสารเฉพาะทางเมื่อแตะส่วนนั้น: `DESIGN_SYSTEM_RECONCILIATION.md` (UI), `DATABASE_AND_API_BLUEPRINT.md` (schema/API)

**กฎการทำงานของ agent**

- `main` คือ canonical — ห้าม push ตรงเข้า `main`; ทำงานบน branch → Draft PR → CI เขียว → Prinya อนุมัติจึง merge
- เอกสารใน `docs/architecture/` คือ **source of truth** ของ scope; ถ้าโค้ดขัดกับเอกสาร ให้หยุดและเปิด issue ไม่ใช่แก้เอกสารเอง
- ห้ามแก้: `.github/workflows/**`, branch protection, cron, VPS, DNS, Cloudflare, production — เป็นของเจ้าของ/Hermes security work
- ห้าม commit: credential/token/รหัส, ข้อมูลส่วนบุคคล, ที่อยู่ระบบภายใน (IP, DB host, project id, bridge URL)
- ห้ามนำเข้า: โค้ดจาก `numtip/rae-nextjs-main` หรือ `numtip/rae-nextjs` ทั้งก้อน — ใช้เป็น reference เท่านั้น (ดู `LEGACY_REUSE_ASSESSMENT.md`)
- ห้ามอ้าง QA PASS โดยไม่มีหลักฐาน — ต้องมี test output หรือ `docs/research/evidence/` รองรับ
- ถ้า Agent Core ยังไม่ enroll โครงการนี้ → รายงาน `PROJECT_ENROLLMENT_REQUIRED` แล้วหยุด
- งานที่แตะ security (auth, session, permission, upload, audit) ต้องมีเทสต์ปฏิเสธสิทธิ์ (403) ทุกครั้ง

**สถานะ gate ที่ยังเปิดอยู่**

| Gate | เรื่อง | สถานะ |
|---|---|---|
| A-0 | Agent Core project identity สำหรับ repo นี้ | ❌ ยังไม่มี (`PROJECT_ENROLLMENT_REQUIRED`) |
| A-1 | Hosting: Node runtime, MySQL version, TLS, backup | ⏳ รอ MJU IT |
| A-2 | ยืนยัน Stitch V2 เป็น baseline (repo เดิมมี V6) | ⏳ รอ owner |
| A-3 | Entra ID OIDC contract + test account | ⏳ รอ MJU IT |
| A-4 | PDPA basis สำหรับทำเนียบผู้เชี่ยวชาญ | ⏳ รอ RAE + legal |

---

## 6. กติกาการทำงาน

- เปลี่ยนโค้ดผ่าน branch → Pull Request → CI ผ่าน → **Prinya อนุมัติแล้วจึง merge**
- ไม่มี auto-merge และไม่มีการ deploy ขึ้น production อัตโนมัติ
- ไม่ commit ความลับ (key/token/รหัส) — เก็บในไฟล์สิทธิ์ 0600 บนโฮสต์เท่านั้น

## Nightly development

แผน: ทำงานอัตโนมัติช่วง 01:00 และสรุปรายงานทาง Telegram 07:00 (Asia/Bangkok)
— **ยังไม่เปิดใช้งาน** จนกว่าจะผ่าน security gate ครบ (branch protection, required checks,
Agent Core project enrollment) การ sync เอกสารครั้งนี้ **ไม่** เปิดใช้งาน nightly development

## License

ยังไม่มีไฟล์ `LICENSE` — repo เป็น public แต่เจ้าของยังไม่ได้เลือกสัญญาอนุญาต
ดูประเด็นและตัวเลือกใน `docs/PROVENANCE.md §5` (ต้องตัดสินก่อนเปิดให้ภายนอกมีส่วนร่วม)
