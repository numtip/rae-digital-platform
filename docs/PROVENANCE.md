# PROVENANCE — ที่มา การตรวจสอบ และสิ่งที่ถูกตัดออก

ซิงก์ครั้งเดียว (one-time, owner-authorized) จาก workspace งานวิจัย `F:\projectAi\REAenroll`
เข้าสู่ repo นี้ เมื่อ **2026-10-24** บน branch `docs/initial-architecture`
workspace ต้นทาง **ไม่ถูกแก้ไข**

## 1. หลักการ

1. **ย้ายเอกสาร ไม่ย้าย repo** — ไม่ได้คัดลอกโค้ดจาก `numtip/rae-nextjs-main` หรือ `numtip/rae-nextjs`
   ทั้งก้อน; ใช้เป็น reference และบันทึกไว้ใน `docs/architecture/LEGACY_REUSE_ASSESSMENT.md`
2. **sanitized copy** — ไฟล์ที่นำเข้าถูกแทนที่ข้อความที่เปิดเผยระบบภายใน ตามตาราง §3
3. **ของที่วัดได้เท่านั้น** — raw HTML, screenshot, browser profile, cloned repo ไม่เข้า repo นี้
4. **ตรวจซ้ำได้** — เครื่องมือที่ใช้ตรวจอยู่ใน `docs/research/tools/` และตัวเลขทั้งหมดมีไฟล์ใน
   `docs/research/evidence/`

## 2. ไฟล์ที่เปลี่ยนแปลง (60 ไฟล์)

branch นี้เปลี่ยน **60 ไฟล์** เทียบกับ `main` — นับด้วย `git diff --name-status origin/main...HEAD`
(59 added + 1 modified) แล้วแยกที่มา:

| กลุ่ม | จำนวน | องค์ประกอบ |
|---|---|---|
| (a) นำเข้าจาก research workspace | **52** | `docs/architecture/` 7 · `docs/research/` 5 + `requirements/` 1 · `docs/research/evidence/` 21 · `docs/research/tools/` 17 · `design/stitch/stitch-landing-v2.reference.html` 1 |
| (b) เขียนใหม่ใน repo นี้ | **7** | `adr/ADR-0001…0004` (4) · `docs/README.md` · `docs/PROVENANCE.md` · `design/stitch/README.md` |
| (c) แก้ไขไฟล์เดิม | **1** | `README.md` — เขียนใหม่ทั้งไฟล์ (เจ้าของไฟล์คือ PR #5; branch นี้ **ไม่แตะ**) |
| **รวมที่เปลี่ยน** | **60** | 52 + 7 + 1 |

### 2.1 `docs/architecture/` (7 นำเข้า + 4 ADR เขียนใหม่)

| ไฟล์ปลายทาง | ต้นทาง | สถานะ |
|---|---|---|
| `RAE_PLATFORM_ARCHITECTURE.md` | `RAE_PLATFORM_ARCHITECTURE.md` | sanitized |
| `MODULE_REQUIREMENTS_MATRIX.md` | `MODULE_REQUIREMENTS_MATRIX.md` | sanitized |
| `DESIGN_SYSTEM_RECONCILIATION.md` | `DESIGN_SYSTEM_RECONCILIATION.md` | sanitized |
| `DATABASE_AND_API_BLUEPRINT.md` | `DATABASE_AND_API_BLUEPRINT.md` | sanitized |
| `DEVELOPMENT_ROADMAP.md` | `DEVELOPMENT_ROADMAP.md` | sanitized |
| `LEGACY_REUSE_ASSESSMENT.md` | `LEGACY_REUSE_ASSESSMENT.md` | sanitized (6 จุด) |
| `ARCHITECTURE_QA.md` | `ARCHITECTURE_QA.md` | sanitized (1 จุด) |
| `adr/ADR-0001…0004` | เขียนใหม่ใน repo นี้ | new |

### 2.2 `docs/research/` (5 + requirements 1 = 6 ไฟล์)

| ไฟล์ปลายทาง | ต้นทาง | สถานะ |
|---|---|---|
| `REFERENCE_AUDIT.md` | `REFERENCE_AUDIT.md` | sanitized (1 จุด) |
| `COMPARISON_MATRIX.md` | `COMPARISON_MATRIX.md` | ไม่ต้องแก้ |
| `RAE_REDESIGN_BLUEPRINT.md` | `RAE_REDESIGN_BLUEPRINT.md` | sanitized (1 จุด) |
| `TECHNICAL_OPTIONS.md` | `TECHNICAL_OPTIONS.md` | ไม่ต้องแก้ (มีหมายเหตุ supersede อยู่แล้ว) |
| `QA_REPORT.md` | `QA_REPORT.md` | sanitized (3 จุด) |
| `requirements/exitfull.txt` | `exitfull.txt` | ต้นฉบับ (ไม่มีข้อมูลลับ) |

### 2.3 `docs/research/evidence/` (21 ไฟล์) — ค่าที่วัดได้ ไม่ใช่ raw capture

`notes/` (12): `a11y_{rae,spu,utcc,dpu}_*.json` (5), `ad_hoc_measurements.json`, `layout_rae_412.json`,
`html_analysis.json`, `rae_subpage_probe.json`, `contrast_{tokens,stitch_tokens,reconciliation}.txt` (3)
`probe/` (8): `probe_{rae,spu,utcc,dpu}_{1440,412}.json`
`README.md` (1): ดัชนีของโฟลเดอร์นี้ (เขียนใน repo)

รวม 17 JSON + 3 TXT + 1 README.md = **21 ไฟล์**

ค่าที่อยู่ในไฟล์เหล่านี้คือ ขนาด, จำนวน, สี, ขนาดฟอนต์, เวลาโหลด, ค่า contrast, รายชื่อ host
ปลายทาง และ **ชื่อ** คุกกี้ (ไม่มีค่า) — ไม่มี credential

**ข้อมูลส่วนบุคคล:** ชื่อบุคคลจริง 1 ชื่อ (`ผศ.ดร.…`) ติดมากับ heading ของหน้าแรก RAE ใน 3 ไฟล์
ถูกแทนด้วย `[person name redacted]` แล้ว (ดู §3 แถวสุดท้าย)

สแกนซ้ำด้วย `grep -rnE 'ผศ\.|รศ\.|ดร\.|นาย|นาง|นางสาว' .` ทั้ง tree (2026-10-24) เหลือ **6 บรรทัด**:

- **0 บรรทัดใน `docs/research/evidence/`** — ไม่เหลือข้อมูลส่วนบุคคลในไฟล์หลักฐาน
- 3 บรรทัดเป็นชื่อนักวิจัย placeholder ใน `design/stitch/stitch-landing-v2.reference.html`
  ซึ่งเป็นข้อความ mockup ที่ Google Stitch สร้าง (ไม่ได้มาจากการเก็บข้อมูลหน้าเว็บ)
- 3 บรรทัดเป็นคำอธิบายในไฟล์นี้เอง (`PROVENANCE.md`) — รูปแบบ honorific + `…` ไม่มีชื่อบุคคล

### 2.4 `docs/research/tools/` (17 ไฟล์)

สคริปต์ที่ใช้ตรวจ (Python stdlib, Node CDP, PowerShell) — เป็นเครื่องมือของเราเอง
ไม่มี endpoint ภายใน ไม่มี token

- สคริปต์ CDP (`cdp_*.mjs`) และ probe ต่อ **`127.0.0.1` เท่านั้น** (Chrome DevTools local)
- `fetch_pages.ps1` และ `probe_rae_pages.py` ยิง **GET แบบ read-only ไปยังเว็บสาธารณะ**
  (`rae.mju.ac.th`, `www.spu.ac.th`, `www.utcc.ac.th`, `www.dpu.ac.th`) เพื่อเก็บ HTML ต้นฉบับ
- ⚠️ 5 สคริปต์อ่าน capture ที่ **ไม่ได้อยู่ใน repo นี้** (`EVIDENCE/raw_html/`, `EVIDENCE/probe/`)
  จึงรันจาก repo นี้ตามลำพังไม่ได้: `inspect_forms.py`, `inspect_utcc.py`, `verify_markup.py`,
  `digest.py`, `analyze_html.py` — แต่ละไฟล์มีหมายเหตุบรรทัดแรกกำกับไว้

### 2.5 `design/stitch/` (2 ไฟล์)

| ไฟล์ปลายทาง | ต้นทาง | หมายเหตุ |
|---|---|---|
| `stitch-landing-v2.reference.html` | `StitchCode.MD` | คัดลอกตรงตามต้นฉบับ, เปลี่ยนชื่อไฟล์ + เพิ่มหัว comment `REFERENCE ONLY` และ `<meta name="robots" content="noindex">` |
| `README.md` | เขียนใหม่ใน repo นี้ | ขอบเขตการใช้งาน + สถานะ approval |

## 3. ตาราง redaction

นับทุกครั้งที่ข้อความแทนที่ปรากฏในไฟล์ (ไม่นับตารางนี้เอง) — **19 จุด ใน 9 ไฟล์**

| ข้อความต้นทาง | ข้อความที่ใช้แทน (ตามที่ปรากฏจริงในไฟล์) | จุด | ไฟล์ | เหตุผล |
|---|---|:--:|---|---|
| Agent Core bridge hostname | `[Agent Core bridge host — internal, redacted]` | 1 | `QA_REPORT.md` | internal endpoint |
| project id ของอีกโครงการ | `a different, non-RAE project identity` | 4 | `LEGACY_REUSE_ASSESSMENT.md` (1), `ARCHITECTURE_QA.md` (1), `QA_REPORT.md` (2) | ไม่เกี่ยวกับ repo นี้ |
| ชุดตัวแปร env ของ SQL ภายใน | `environment variables (**names and host redacted**)` | 1 | `LEGACY_REUSE_ASSESSMENT.md` | internal DB contract |
| ชื่อ secret ใน CI | `a repository secret` (ใน `credentials from a repository secret in a scheduled snapshot workflow`) | 1 | `LEGACY_REUSE_ASSESSMENT.md` | secret name |
| ชื่อไฟล์ workflow ภายใน | `a scheduled snapshot workflow` | 2 | `LEGACY_REUSE_ASSESSMENT.md` | internal CI file |
| ชื่อ view/DB ภายใน | `an internal read-only view (name redacted)` | 1 | `LEGACY_REUSE_ASSESSMENT.md` | internal DB object |
| โดเมน third-party ที่ไม่ได้บริหาร | `two unmanaged third-party app domains (names withheld)` / `an unmanaged third-party app domain (name withheld)` / `redacted-unmanaged-app.example` | 6 | `REFERENCE_AUDIT.md`, `RAE_REDESIGN_BLUEPRINT.md`, `evidence/notes/ad_hoc_measurements.json`, `evidence/notes/html_analysis.json` | ความเสี่ยงด้านความปลอดภัย |
| **ชื่อบุคคลจริง** (`ผศ.ดร.…`) เก็บได้จาก heading ของหน้าแรก RAE | `[person name redacted]` | 3 | `evidence/probe/probe_rae_1440.json`, `evidence/probe/probe_rae_412.json`, `evidence/notes/html_analysis.json` | ข้อมูลส่วนบุคคล — repo เป็น public |
| **รวม** | | **19** | **9 ไฟล์** | |

ตรวจซ้ำได้ด้วย:

```bash
grep -rnoE '\[Agent Core bridge host — internal, redacted\]|a different, non-RAE project identity|environment variables \(\*\*names and host redacted\*\*\)|a repository secret|a scheduled snapshot workflow|an internal read-only view \(name redacted\)|names withheld|name withheld|redacted-unmanaged-app\.example|\[person name redacted\]' . --exclude-dir=.git --exclude=PROVENANCE.md
```

(ก่อนซิงก์มี 16 จุดใน 7 ไฟล์; การปิดข้อมูลส่วนบุคคลเพิ่ม 3 จุดใน 2 ไฟล์ใหม่ → 19 ใน 9)

## 4. สิ่งที่ **ไม่** นำเข้า (และเหตุผล)

| ต้นทาง | เหตุผล |
|---|---|
| `_sources/rae-nextjs-main`, `_sources/rae-nextjs` (clone 65 MB) | เป็น repo ของคนอื่น — ห้าม merge, อ้างอิงด้วย commit SHA แทน |
| `EVIDENCE/raw_html/**` (~11 MB, รวม UTCC 8.9 MB) | สำเนา HTML ของเว็บผู้อื่น + response headers; ลิขสิทธิ์และไม่จำเป็น |
| `EVIDENCE/screenshots/**`, `EVIDENCE/probe/*.png` (~35 MB) | raw browser capture; ภาพหน้าเว็บผู้อื่น |
| `EVIDENCE/rea/rae_home_inspect_raw.json` (376 KB) | raw observation envelope (DOM/สคริปต์/storage inventory) |
| `EVIDENCE/notes/rae_home_outline.txt` | ข้อความหน้าเว็บทั้งหมด (รวมชื่อบุคคลและเนื้อข่าว) |
| `EVIDENCE/notes/probe_digest.txt` | digest ที่มีข้อความจากหน้าเว็บปนอยู่ |
| `.browser/**` | browser profile / cache |
| `tools/` ที่เหลือ (สคริปต์เฉพาะกิจที่อ้าง path ภายใน) | ไม่จำเป็นต่อการทำซ้ำ และบางไฟล์ hardcode path เครื่อง |

## 5. License

- **repo ยังไม่มี `LICENSE`** และ GitHub รายงาน `license: null` → ตามค่าเริ่มต้นคือ "สงวนลิขสิทธิ์ทั้งหมด"
- เอกสารสถาปัตยกรรมเขียนขึ้นสำหรับ RAE จึงควรเป็นลิขสิทธิ์ของมหาวิทยาลัย/หน่วยงาน
- ⚠️ **ต้องตัดสินก่อนเปิดรับ contributor ภายนอก** ตัวเลือก: (ก) proprietary notice,
  (ข) MIT สำหรับ docs/tooling, (ค) CC BY 4.0 สำหรับเอกสาร + MIT สำหรับสคริปต์
  → บันทึกเป็น blocker **B-1** ในรายงาน PR
- `design/stitch/stitch-landing-v2.reference.html` สร้างด้วย Google Stitch จาก brief ของ RAE;
  ภาพ logo ในไฟล์อ้างถึง host ของ Google (`lh3.googleusercontent.com`) — **ห้ามใช้ใน production**
  ต้องแทนด้วย asset ของหน่วยงานเอง (ดู `design/stitch/README.md`)

## 6. หมายเหตุด้านลิขสิทธิ์ของเอกสารวิจัย

`REFERENCE_AUDIT.md` / `COMPARISON_MATRIX.md` เป็นการ **วัดและวิเคราะห์หน้าเว็บสาธารณะ**
ของมหาวิทยาลัยศรีปทุม, มหาวิทยาลัยหอการค้าไทย และมหาวิทยาลัยธุรกิจบัณฑิตย์
ไม่มีการคัดลอกโค้ด, CSS หรือ asset ของหน่วยงานเหล่านั้นเข้า repo นี้
ชื่อสถาบันปรากฏในฐานะแหล่งอ้างอิงเชิงเปรียบเทียบเท่านั้น

## 7. การตรวจสอบที่รันในซิงก์นี้

| การตรวจ | ผล |
|---|---|
| secret scan (pattern: token/key/password/private key/bearer/gh*_) | ผ่าน — ไม่พบ (ดูรายละเอียดใน PR) |
| IP address scan | ผ่าน — เหลือเฉพาะ `127.0.0.1` (CDP local, ตั้งใจ) |
| internal hostname scan | ผ่าน — ไม่พบหลัง redaction |
| markdown link check | ผ่าน — ทุกลิงก์ภายในชี้ไฟล์ที่มีจริง |
| JSON/TXT validity | ผ่าน — 21 ไฟล์ใน branch (17 `.json` + 4 `.txt`) parse/อ่านได้ทั้งหมด |
| ไฟล์ที่อ้างในเอกสารแต่ไม่มีใน repo | บันทึกไว้ใน `docs/research/evidence/README.md §4` |

**หมายเหตุ §7 (re-encoding):** `docs/research/evidence/notes/contrast_reconciliation.txt` และ
`contrast_stitch_tokens.txt` เดิมถูกบันทึกเป็น **UTF-16LE ไม่มี BOM** (ได้จาก workspace ต้นทาง)
จึงอ่านเป็นขยะและถูก `grep` ข้าม ทั้งสองไฟล์ถูก re-encode เป็น **UTF-8 ไม่มี BOM** โดยข้อความเหมือนเดิม
ทุกบรรทัด (80 และ 44 บรรทัด) — ปัจจุบัน `file` รายงานว่าเป็น ASCII text และ `grep` อ่านได้ตามปกติ
