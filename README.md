# rae-digital-platform

แพลตฟอร์มดิจิทัลของสำนักวิจัยและบริการวิชาการ (RAE) — มหาวิทยาลัยแม่โจ้
_Digital platform for the Office of Agricultural Research and Extension (RAE), Maejo University._

Repo นี้เป็น **canonical development repository** สำหรับ Cursor และ Hermes: เอกสารสถาปัตยกรรม,
ข้อกำหนด, หลักฐานงานวิจัย และ design reference ทั้งหมดอยู่ในที่นี้

> **สถานะปัจจุบัน (อัปเดต 2026-10-24):** `main` ยังเป็น docs-only — ยังไม่มีโค้ดแอปพลิเคชัน
> เรียงตามลำดับที่จะ merge: **PR #1** `chore/phase1-scaffold` (Next.js + TS + Tailwind + CI) ก่อน
> แล้วจึง **PR #3** `docs/initial-architecture` (เอกสารชุดนี้) และ PR ปรับ README นี้ให้ตรงขอบเขต Phase 1
>
> `main` ถูกป้องกันแล้ว: ต้องผ่าน PR + required check `build` + review 1 คน, ห้าม force-push/ลบ branch
> ไม่มี auto-merge และไม่มีการ deploy อัตโนมัติ

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

## 2. ลำดับความสำคัญ Phase 1 (public website เท่านั้น)

**การตัดสินใจของเจ้าของโครงการ (2026-10-24):** Phase 1 = **หน้าเว็บ public เท่านั้น**
ระบบภายใน, CMS backend และ AI module เลื่อนไปเป็น Phase ถัดไปที่ต้องอนุมัติแยก

ลำดับที่ใช้จริง:

1. Repo + CI (typecheck, build, secret scan) + branch protection + design tokens จาก Stitch V2
2. Public shell: `app/` (Next.js App Router) + nav 7 เมนู + `<html lang>` + SEO พื้นฐาน
3. หน้าเนื้อหาชุดแรกจาก design reference — ข้อความทุกจุดต้องมาจากเอกสาร RAE จริง ห้ามแต่ง
4. Accessibility + performance gate (axe = 0 บนหน้าที่ส่งมอบ, ไม่มี raw hex, ไม่มี `href="#"`)

**Gate ของ Phase 1 (public website):** CI เขียวทุก PR, required check `build` ต้องรายงานทุก PR
(ข้ามเฉพาะ step ที่ไม่เกี่ยว ไม่ข้าม workflow), axe = 0, ไม่มี credential/internal endpoint ใน repo

> **ข้อต่างที่ต้องรู้:** `docs/architecture/DEVELOPMENT_ROADMAP.md` และ
> `MODULE_REQUIREMENTS_MATRIX.md` ยังเขียน Phase 1 = foundation 6 สัปดาห์ (identity/DB/admin shell)
> ตามงานวิจัยรอบก่อน เอกสารเหล่านั้น **ไม่ถูกแก้ใน PR นี้** — ต้องมี PR แยกเพื่อจัดลำดับ phase
> ให้ตรงกับการตัดสินใจข้างบน ก่อนเริ่มงาน Phase 2 ระบบภายใน (identity, session, admin shell, Prisma schema,
> media library, settings) ถูกเก็บไว้เป็น **Phase 2** ตามลำดับเดิมในเอกสาร ไม่ได้ตัดทิ้ง

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

**สถานะ gate**

| Gate | เรื่อง | สถานะ |
|---|---|---|
| A-0 | Agent Core project identity สำหรับ repo นี้ | ✅ enrolled 2026-10-24 (identity แยกของ repo นี้, scope decision/route/context/qa/metrics) |
| A-1 | Hosting: Node runtime, MySQL version, TLS, backup | ⏳ รอ MJU IT |
| A-2 | ยืนยัน Stitch V2 เป็น baseline (repo เดิมมี V6) | ✅ อนุมัติโดยเจ้าของ 2026-10-24 (ADR-0002) |
| A-3 | Entra ID OIDC contract + test account | ⏳ รอ MJU IT |
| A-4 | PDPA basis สำหรับทำเนียบผู้เชี่ยวชาญ | ⏳ รอ RAE + legal |
| A-5 | Branch protection + required check `build` บน `main` | ✅ เปิดใช้แล้ว 2026-10-24 (ยังมี bypass ของ admin — รอ identity อัตโนมัติแยก) |
| A-6 | GitHub automation identity (least privilege, ไม่มี admin/bypass) | ⏳ **owner-only** — ต้องสร้างบัญชี/App เอง |
| A-7 | Issue ที่อนุมัติแล้ว (`agent-ready`) สำหรับ nightly | ⏳ ยังไม่มี |

---

## 6. กติกาการทำงาน

- เปลี่ยนโค้ดผ่าน branch → Pull Request → CI ผ่าน → **Prinya อนุมัติแล้วจึง merge**
- ไม่มี auto-merge และไม่มีการ deploy ขึ้น production อัตโนมัติ
- ไม่ commit ความลับ (key/token/รหัส) — เก็บในไฟล์สิทธิ์ 0600 บนโฮสต์เท่านั้น
- required check `build` ต้องรายงาน **ทุก** PR — PR ที่เป็นเอกสารล้วนให้ข้ามเฉพาะ step ของแอป ไม่ใช่ข้าม workflow

## CMS → เว็บสาธารณะ (auto-sync)

ข่าวที่เผยแพร่ใน CMS ขึ้นเว็บเองโดยไม่มีใครคัดลอกไฟล์ — CMS รันบน host เดียวกันแบบ loopback (127.0.0.1)
และ **ไม่ถูกเปิดสู่สาธารณะ**; สิ่งที่เข้า git มีเพียงไฟล์ข้อมูลที่สร้างออกมา

1. `node scripts/cms-sync.mjs` (หรือ `RAE_CMS_OUT=... node scripts/cms-sync.mjs`) — ดึง `GET /v1/export`,
   ตรวจทุกบทความด้วย gate ตัวเดียวกับ preview (`lib/cms/preview-site.ts`), ย่อรูปเป็น WebP 900px พร้อม
   ความกว้างการ์ด 320/640 แล้วเขียน `public/cms-published/` — **ข้อมูลและรูปถูก commit** เพราะ GitHub Pages
   เสิร์ฟไฟล์ static (ผู้ build จึงต้องมีไฟล์อยู่ก่อน CI รัน). payload ที่เป็น draft, แปลไม่ครบ หรือ id
   ไม่ปลอดภัย จะ exit ไม่เป็นศูนย์และไม่เขียนอะไรเลย
2. `scripts/cms-sync-gh.sh` — รัน sync ใน worktree ชั่วคราว, commit เฉพาะไฟล์ใต้ `public/cms-published/`,
   push branch `cms/auto-sync` (force-with-lease) และเปิด/อัปเดต PR ใบเดียวชื่อ
   `chore(cms): sync published articles` (branch protection ห้าม push เข้า `main`). ถ้าไม่มีอะไรเปลี่ยน
   จะ exit 0 โดยไม่ commit และไม่แตะ PR

token อ่านจาก `RAE_CMS_TOKEN_FILE` (path ของไฟล์สิทธิ์ 0600) หรือ `RAE_CMS_TOKEN` เท่านั้น — ห้าม commit
token หรือชื่อ host ลง repo. รูปย่อด้วย CLI ของเครื่อง (`magick`/`convert`/`ffmpeg`) ที่ตรวจตอนรัน;
ถ้าเครื่องไม่มี จะ commit รูปเต็มขนาดแทน (การ์ดยังทำงาน แต่หนักกว่า)

## Nightly development

แผน: ทำงานอัตโนมัติช่วง 01:00 และสรุปรายงานทาง Telegram 07:00 (Asia/Bangkok)
**ยังไม่เปิดใช้งาน** — เปิดได้เมื่อครบทุกข้อ:

1. automation identity แยกที่มี least privilege (ข้อ A-6) — ยังไม่มี จึงยังใช้สิทธิ์เจ้าของ
2. branch protection + required CI บังคับใช้โดยไม่มี bypass — เปิดแล้วบางส่วน (A-5)
3. PR #1 และ PR #3 integrate เสร็จและเจ้าของอนุมัติ
4. Agent Core อนุญาตให้เริ่มรัน (ปัจจุบันให้ **HOLD**)
5. มี issue ที่ติด label `agent-ready` และเจ้าของอนุมัติแล้ว

นโยบายเมื่อเปิด: 1 issue ที่อนุมัติ → Agent Core decision/route → subagent เมื่อคุ้ม → implement → QA →
Draft PR → รายงานเช้า ห้าม merge/deploy เอง ห้ามขยาย scope เกิน issue

## License

ยังไม่มีไฟล์ `LICENSE` — repo เป็น public แต่เจ้าของยังไม่ได้เลือกสัญญาอนุญาต
ดูประเด็นและตัวเลือกใน `docs/PROVENANCE.md §5` (ต้องตัดสินก่อนเปิดให้ภายนอกมีส่วนร่วม)
## Licence

**Owner-declared policy (2026-10-26).** Recorded in full in [NOTICE](NOTICE):

| Material | Status |
|---|---|
| Original application source code — `app/ components/ lib/ scripts/ tests/` and the root build/config files | **Apache-2.0** ([LICENSE](LICENSE), the unmodified Apache text), licensed by the developer Prinya (GitHub: numtip), subject to any ownership agreement and to Maejo University's IP regulations |
| University emblems and insignia, institutional branding, official documents, news, photographs, institutional content and media | **Excluded** — remain under Maejo University's or their rights holders' copyright |
| Third-party components (443 packages, CI actions) | **Unchanged** — their own notices and licences apply; nothing here relicenses them |
| Sarabun typeface — `assets/fonts/sarabun/*.woff2` | **SIL OFL 1.1** — third-party font, not covered by Apache-2.0; see [OFL.txt](assets/fonts/sarabun/OFL.txt) and [SOURCE.md](assets/fonts/sarabun/SOURCE.md) for origin, conversion and checksums |
| `docs/`, research references, blueprints, translations, design assets | **Excluded** unless separately authorised in writing |

**Declared vs verified.** [NOTICE](NOTICE) is deliberately split into three parts: **A** the
owner's declared policy, **B** facts independently checked against this repository (the
Apache text is byte-identical to apache.org; authorship is traceable to one person plus a
dependency bot; 443 third-party packages with no GPL/AGPL), and **C** authority that is
**unresolved** — under the Copyright Act B.E. 2537 s.9 the statutory default holder of
employment work is the author, and no assignment, commissioned-work agreement or university
IP regulation exists in this repository. The notice must not be read as university
endorsement or authorisation, and the institutional material is not licensed for reuse.

Per-asset origin, permission and licence status: [docs/governance/ASSET_RIGHTS.md](docs/governance/ASSET_RIGHTS.md).
The reasoning behind the choice of Apache-2.0 over MIT, and the full option comparison:
[docs/governance/LICENSE_RECOMMENDATION.md](docs/governance/LICENSE_RECOMMENDATION.md).
