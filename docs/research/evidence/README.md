# Evidence — ค่าที่วัดได้จากงานวิจัย

โฟลเดอร์นี้เก็บ **ผลการวัด** ที่เอกสารใน `docs/research/` และ `docs/architecture/` อ้างถึง
ไม่ใช่ raw capture ของหน้าเว็บ

## 1. มีอะไรบ้าง

| ไฟล์ | คืออะไร | ใช้ยืนยัน |
|---|---|---|
| `probe/probe_{site}_{1440,412}.json` | ผลวัดหน้าแรก 4 เว็บ × 2 viewport: จำนวน element, ขนาด HTML, เวลาโหลด, palette, ฟอนต์, breakpoint, tech markers, a11y summary | ตารางใน `REFERENCE_AUDIT.md §1` |
| `notes/a11y_{site}_*.json` | จำนวนข้อความที่ contrast ไม่ผ่าน AA + ค่าที่แย่ที่สุด, heading order, tap target, ลิงก์ไม่มีชื่อ | ตาราง accessibility + `D-04…D-07` |
| `notes/html_analysis.json` | ค่าจาก HTML ดิบ: title/description length, heading counts, tables, forms, iframes, JSON-LD, `hreflang`, canonical | ตาราง SEO ใน `REFERENCE_AUDIT.md §1` |
| `notes/rae_subpage_probe.json` | ผลตรวจหน้าย่อยของ RAE (404, title ว่าง, h1 ซ้ำ) | defect `D-01`, `D-08` |
| `notes/layout_rae_412.json` | โครง block ของ RAE บนมือถือ | `D-12`, `D-21` |
| `notes/ad_hoc_measurements.json` | ค่าที่วัดครั้งเดียว: hero 450/129 px, modal menu, จำนวนสไลด์, heading ของ DPU | ข้อความเชิงตัวเลขใน audit |
| `notes/contrast_tokens.txt` | ค่า contrast ของ design token ชุดที่เสนอ (รอบแรก) | `RAE_REDESIGN_BLUEPRINT §7` |
| `notes/contrast_stitch_tokens.txt` | ค่า contrast ของ palette Stitch V2 | `DESIGN_SYSTEM_RECONCILIATION §2` |
| `notes/contrast_reconciliation.txt` | ค่า contrast ของ token ที่ reconcile แล้ว | `DESIGN_SYSTEM_RECONCILIATION §4` |

## 2. วิธีวัด (สรุป)

- Browser: Chrome 156 headless ผ่าน CDP ที่ `127.0.0.1` — viewport 1440×1000 และ 412×915
- เก็บค่าเมื่อ `load` ผ่านและรอ JS 3.5 วินาที; วัด contrast ด้วยสูตร WCAG relative luminance
- ตัวเลขเวลาโหลดเป็น **lab measurement** และ cache บางส่วนอุ่น — ใช้เปรียบเทียบเชิงลำดับ ไม่ใช่ benchmark
- รายละเอียดเต็ม: `EVIDENCE/README.md` ใน workspace งานวิจัย (ไม่ได้นำเข้า) + สคริปต์ใน `../tools/`

## 3. ทำซ้ำ

```bash
# 1) เปิด Chrome แบบ CDP (เครื่องตัวเอง)
chrome --headless=new --remote-debugging-port=9444 --remote-allow-origins=* \
       --window-size=1440,1000 --user-data-dir=<temp>
# 2) วัด
node docs/research/tools/cdp_probe.mjs "https://rae.mju.ac.th/wtms_index.aspx?&lang=th-TH" \
     9444 rae 1440 1000 docs/research/evidence/probe
# 3) contrast
python docs/research/tools/contrast_stitch.py
```

## 4. สิ่งที่ **ไม่มี** ในโฟลเดอร์นี้ (โดยเจตนา)

repo นี้เป็น public จึงไม่เก็บ:

- raw HTML ของเว็บผู้อื่น (`raw_html/`) — ลิขสิทธิ์ + response headers
- screenshot ทุกชนิด — raw browser capture และภาพหน้าเว็บผู้อื่น
- REA observation envelope (DOM/สคริปต์/storage inventory)
- ข้อความหน้าเว็บแบบเต็ม (outline/digest) ซึ่งมีชื่อบุคคลและเนื้อข่าว

ผลที่ตามมา: ตัวเลขทุกตัวในเอกสาร **ตรวจย้อนได้จากไฟล์ในโฟลเดอร์นี้** แต่ถ้าต้องการภาพหรือ HTML ต้นฉบับ
ต้องรันซ้ำด้วยสคริปต์ §3 (ไม่ต้องพึ่งไฟล์ที่ไม่ได้ commit)

## 5. ข้อจำกัดที่ยังคงอยู่

- ไม่มี real-device test และไม่มี screen-reader test
- ไม่ได้รัน axe-core/Lighthouse — ใช้ probe ของเราเอง + สูตร WCAG
- สถานะ interactive (เปิดเมนู, tab, carousel) ตรวจจาก markup ไม่ได้กดใช้งานจริง
- ตัวเลข latency มาจาก link ของมหาวิทยาลัยและ cache บางส่วน
