# docs/ — สารบัญเอกสาร

ทุกไฟล์ในโฟลเดอร์นี้ถูกนำเข้าจาก workspace งานวิจัย (`F:\projectAi\REAenroll`) แบบ **sanitized**
และถือเป็น source of truth สำหรับ scope ของโปรเจกต์ ดูที่มาและสิ่งที่ถูกตัดออกใน [`PROVENANCE.md`](PROVENANCE.md)

## architecture/ — ใช้ตัดสินใจและลงมือทำ

| เอกสาร | ใช้เมื่อ |
|---|---|
| [`RAE_PLATFORM_ARCHITECTURE.md`](architecture/RAE_PLATFORM_ARCHITECTURE.md) | ต้องเข้าใจขอบเขต 3 ชั้น, public/admin boundary, integration, security |
| [`MODULE_REQUIREMENTS_MATRIX.md`](architecture/MODULE_REQUIREMENTS_MATRIX.md) | ต้องรู้ว่าอะไร BUILD/INTEGRATE/HYBRID/DEFER, priority, phase, acceptance criteria |
| [`DEVELOPMENT_ROADMAP.md`](architecture/DEVELOPMENT_ROADMAP.md) | ต้องรู้ลำดับงาน, Definition of Done, CI/CD, gate |
| [`DATABASE_AND_API_BLUEPRINT.md`](architecture/DATABASE_AND_API_BLUEPRINT.md) | แตะ schema (58 ตาราง), REST contract, OpenAPI, retention |
| [`DESIGN_SYSTEM_RECONCILIATION.md`](architecture/DESIGN_SYSTEM_RECONCILIATION.md) | แตะ UI/สี/ฟอนต์/component/accessibility |
| [`LEGACY_REUSE_ASSESSMENT.md`](architecture/LEGACY_REUSE_ASSESSMENT.md) | จะหยิบอะไรจาก repo เดิม (REUSE/ADAPT/REBUILD/EXCLUDE) |
| [`ARCHITECTURE_QA.md`](architecture/ARCHITECTURE_QA.md) | ต้องรู้ว่าอะไรตรวจแล้ว, อะไรยังเป็น blocker |
| [`adr/`](architecture/adr/) | ก่อนเปลี่ยนการตัดสินใจใด ๆ ที่ลงไว้แล้ว |

## research/ — หลักฐานและบริบท

| เอกสาร | เนื้อหา |
|---|---|
| [`REFERENCE_AUDIT.md`](research/REFERENCE_AUDIT.md) | ตรวจ 4 เว็บ (RAE + SPU/UTCC/DPU) พร้อมตัวเลขที่วัดได้ |
| [`COMPARISON_MATRIX.md`](research/COMPARISON_MATRIX.md) | ตารางเปรียบเทียบ, gap analysis, backlog P0/P1/P2 |
| [`RAE_REDESIGN_BLUEPRINT.md`](research/RAE_REDESIGN_BLUEPRINT.md) | blueprint รอบแรก: IA, wireframe, design system, SEO *(§7 ถูก supersede โดย ADR-0002)* |
| [`TECHNICAL_OPTIONS.md`](research/TECHNICAL_OPTIONS.md) | ทางเลือกเชิงเทคนิคของรอบแรก *(Phase 0 เดิมถูก supersede)* |
| [`QA_REPORT.md`](research/QA_REPORT.md) | บันทึกการตรวจสอบรอบแรก + สถานะ gate |
| [`requirements/exitfull.txt`](research/requirements/exitfull.txt) | functional inventory ต้นทาง (30 capability blocks) |
| [`evidence/`](research/evidence/) | ค่าที่วัดได้ (ไม่รวม raw capture) |
| [`tools/`](research/tools/) | สคริปต์ที่ใช้ตรวจ — รันซ้ำได้ |

## ลำดับการอ่านที่แนะนำ (สำหรับ agent)

1. `README.md` ที่ root (ขอบเขต + gate)
2. `architecture/RAE_PLATFORM_ARCHITECTURE.md`
3. `architecture/MODULE_REQUIREMENTS_MATRIX.md` (แถวของ module ที่จะแตะ)
4. `architecture/DEVELOPMENT_ROADMAP.md` §7 Definition of Done
5. `architecture/adr/` ทั้งหมด
6. เอกสารเฉพาะทางตามงาน

## กติกาเอกสาร

- เอกสารที่ supersede แล้ว **ไม่ลบ** — เติมหมายเหตุวันที่ไว้ด้านบน เพื่อรักษา audit trail
- ห้ามแก้ตัวเลขที่มาจากการวัดโดยไม่รัน `research/tools/` ใหม่
- ทุกข้อความที่ยังไม่ยืนยันต้องมี marker `[U]` (unverified) หรือ `[A]` (assumption)

## การแมป path ที่อ้างในเอกสาร

เอกสารถูกย้ายมาจาก workspace งานวิจัยโดยไม่ได้แก้ข้อความอ้างอิงภายใน (เพื่อรักษา audit trail)
path ที่อยู่ในเครื่องหมาย backtick มีความหมายดังนี้:

| เขียนในเอกสาร | ที่อยู่จริงใน repo นี้ |
|---|---|
| `EVIDENCE/...` | `docs/research/evidence/...` |
| `tools/...` | `docs/research/tools/...` |
| `REFERENCE_AUDIT.md`, `RAE_REDESIGN_BLUEPRINT.md`, … | `docs/research/…` |
| `RAE_PLATFORM_ARCHITECTURE.md`, `DEVELOPMENT_ROADMAP.md`, … | `docs/architecture/…` |
| ไฟล์ raw ที่ถูกตัดออก (`EVIDENCE/raw_html/`, `EVIDENCE/screenshots/`) | ไม่มีใน repo นี้ — ดู `PROVENANCE.md §4` |

`_sources/` (clone ของ `numtip/rae-nextjs-main` และ `numtip/rae-nextjs`) **ไม่มี** ใน repo นี้
การอ้างอิง repo เหล่านั้นใช้ commit SHA แทน: `114b3b5d` และ `805a1dea`
