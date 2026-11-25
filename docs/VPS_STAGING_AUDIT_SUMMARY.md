# สรุป Audit — VPS Staging

**วันที่:** 27 ตุลาคม 2026  
**โปรเจกต์:** `numtip/rae-digital-platform`  
**เครื่อง:** `raeserver` (VPS-A)  
**โฟลเดอร์:** `/home/rae_admin/rae-digital-platform`  
**ขอบเขต:** preflight รอบแรกหยุดเพราะ PR #72 ยังไม่ merge หลังจากนั้น PR #72 ถูก merge และได้ deploy `main` `87f92d9` ไป staging แยกแล้ว  
**รายละเอียดและหลักฐาน:** [VPS_STAGING_REPORT.md](./VPS_STAGING_REPORT.md)

## ผลการตรวจ

| เกต | ผล |
|---|---|
| `VPS_PREFLIGHT_PASS` | **PASS** |
| `RAE_MAIN_DEPLOYED_TO_STAGING` | **PASS** |
| `VPS_STAGING_QA_PASS` | **PASS** |
| `PRODUCTION_UNCHANGED` | **PASS** |

Staging ใหม่ฟังที่ `127.0.0.1:8091` เท่านั้น เข้าผ่าน SSH tunnel แล้วเปิด `http://127.0.0.1:8091/rae-digital-platform/th/` พอร์ต 8090, Nginx สาธารณะ และฐาน `rae_cms` ไม่ได้ถูกแก้ ข้อความด้านล่างเป็นบันทึก preflight ก่อน deploy

## สิ่งที่พบ

- `origin/main` อยู่ที่ `6aa10fac5a4fab9c39d3fe11a94b2ecca88a8cf1` (#71) CI และ Pages preview ของ commit นี้ผ่าน
- PR #71, #73, #74 merge แล้ว
- PR #72 ยังเปิดอยู่ และชนกับ `main` (`CONFLICTING` / `DIRTY`) CI ที่เขียวเป็นของ branch เดิม ไม่ใช่ของ `main`
- โฟลเดอร์นี้เป็น branch `feat/cms-news-ui` ที่ `50a6028` ไม่ใช่ `main` และเป็นไดเรกทอรีของ Compose ที่รัน staging อยู่แล้ว ห้าม build ทับจากที่นี่
- Staging ที่รันอยู่เป็น image เก่า `04256ed` ที่ `127.0.0.1:8090` สุขภาพดี
- Nginx ของเครื่อง proxy ไปที่พอร์ตนี้ผ่าน `/rae-digital-staging/` และมี basic auth ทดสอบโดยไม่ใส่รหัสได้ **401** พร้อม `noindex`
- CMS จริงคือ `rae-cms-runtime` (พอร์ต `127.0.0.1:3317`) และฐาน `rae_cms` ใน `rae-cms-db` ซึ่งไม่เปิดพอร์ตออกเครื่อง
- คอลัมน์ `published_at` มีอยู่แล้ว เป็น `datetime` และเป็นค่าว่างได้ มีบทความสถานะ `published` 1 รายการ ห้ามรัน migration 005 ซ้ำ
- ดิสก์ว่างประมาณ 223 GB แรมที่ใช้ได้ประมาณ 4 GB สลับถูกใช้อยู่ 2 GB จาก 4 GB
- Node บนเครื่องเป็น v12 ใช้ build ไม่ได้ ต้องใช้ Node 22 ในคอนเทนเนอร์
- บริการเดิม รวม attendance, learning-center, raenew2026 และ Nginx สาธารณะ ไม่ได้ถูกแก้

## สิ่งที่ไม่ได้ทำ

ไม่ได้ build, ไม่ได้ `docker compose up`, ไม่ได้ restart คอนเทนเนอร์, ไม่ได้แก้ Nginx หรือ firewall, ไม่ได้ migrate ฐานข้อมูล, ไม่ได้นำเข้าเนื้อหา, ไม่ได้ commit หรือ push

QA ของเวอร์ชันใหม่ทั้งภาษา เส้นทาง ข่าว เอกสาร ค้นหา มือถือ SEO และ CMS ยังเป็น **SKIP** เพราะยังไม่มี staging ของ `main` ชุดนี้

## ขั้นถัดไป

1. ให้ Hermes แก้ conflict แล้ว merge PR #72 จากนั้น CI บน `main` ใหม่ต้องผ่าน
2. ค่อย deploy จาก checkout ที่เป็น `main` จริง คนละโฟลเดอร์ คนละชื่อ Compose คนละพอร์ต loopback
3. อย่าใช้ฐาน `rae_cms` และอย่ารัน migration 005
4. อย่าเปิด staging สู่สาธารณะโดยไม่มี authentication
5. หลัง deploy จริง ค่อยทำ QA แล้วเปลี่ยนเกต `VPS_STAGING_QA_PASS` จากหลักฐานใหม่
