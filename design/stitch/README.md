# design/stitch — Google Stitch reference (ไม่ใช่ production code)

## สถานะ

| ของ | สถานะ | ใช้ทำอะไร |
|---|---|---|
| **Stitch Landing V2 (React port)** ใน `numtip/rae-nextjs-main` | ✅ **approved design baseline** | ต้นแบบ UI ที่จะ implement จริง |
| `stitch-landing-v2.reference.html` (ไฟล์ในโฟลเดอร์นี้) | 📐 enhancement reference | เทียบlayout/ระยะ/ลำดับ section; **ห้ามใช้เป็นโค้ด production** |
| Stitch Landing V6 (ใน repo เดียวกัน) | ⏸ frozen alternative | รอ gate A-2 |

## ไฟล์ในโฟลเดอร์นี้

`stitch-landing-v2.reference.html` คือ single-file prototype ที่สร้างด้วย **Google Stitch**
จาก brief ของ RAE — ต้นทางคือ `StitchCode.MD` ใน workspace งานวิจัย (คัดลอกตรงตามต้นฉบับ, เปลี่ยนชื่อ)
รูปแบบ: HTML + Tailwind ผ่าน CDN + `tailwind.config` inline + Google Fonts (Sarabun)

## ทำไมใช้เป็น production ไม่ได้

1. **Tailwind CDN** — โหลด compiler ทั้งก้อนในเบราว์เซอร์; production ต้อง build-time
2. **43 × `href="#"`** — ทุกเมนู/CTA/ลิงก์ social เป็น placeholder ไม่มี routing
3. **โลโก้อ้าง host ของ Google** (`lh3.googleusercontent.com/aida-public/…`) — URL ชั่วคราว
   ต้องแทนด้วย asset ของหน่วยงานที่ commit ใน `public/`
4. **ไม่มี state/logic** — search box ไม่มี `form`, ไม่มี handler; เมนูมือถือเป็น static
5. **ไม่มี metadata/SEO** — มี `<title>` เดียว, ไม่มี description/canonical/hreflang
6. **ค่าสี/ระยะ hardcode** — ไม่ผ่าน token; ต้อง map เข้า `DESIGN_SYSTEM_RECONCILIATION.md §4`
7. **hero สูงคงที่ 600 px** — เกิน budget ของ mobile; React port ใช้ค่าที่ปรับแล้ว

## ความต่างจาก React port (ต้องเลือก ไม่ใช่ merge)

| ประเด็น | prototype | React port | ข้อสรุป |
|---|---|---|---|
| Header | dark (`bg-brand-dark`) | ขาว + utility strip | **ขาว** — เข้าชุดกับเว็บมหาวิทยาลัยที่ใช้เป็น reference และ gold underline อ่านง่ายกว่า |
| จำนวน section | 7 | 8 (+ research/innovation) | **8** — งานวิจัยคือหัวใจของ RAE |
| Heading | โลโก้เป็น `<h1>`, headline เป็น `<h2>` | headline เป็น `<h1>` | **React port** (มี `h1` เดียวถูกต้อง) |

## สีที่ใช้ (ต้อง map ตาม ADR-0002)

- `brand.primary #005C3B`, `brand.dark #003F2A`, `brand.forest #014D35`
- `brand.gold #D8A01A`, `brand.goldhover #c79318` → **hover ใหม่คือ `#E3AF2F`** (2.34:1 → 5.98:1 กับตัวอักษรเข้ม)
- `brand.ivory #F7F3EA`, `brand.light #f8f9fa`
- **CTA สีทองต้องใช้ตัวอักษร `#003F2A`** ไม่ใช่สีขาว (ต้นฉบับใช้ขาว = 2.34:1 ไม่ผ่าน AA)

## ขั้นตอนเมื่อนำไป implement

1. ย้าย layout/ลำดับ section ตาม prototype แต่ใช้ component จาก Stitch V2 React port
2. แทนสีทุกตัวด้วย token (`--brand-700`, `--gold`, …) — ห้าม raw hex
3. เปลี่ยน `href="#"` เป็น typed route
4. แทนโลโก้ด้วยไฟล์ใน `public/images/` และใส่ `alt`
5. ตรวจ contrast ด้วย `docs/research/tools/contrast_stitch.py` ก่อน merge
