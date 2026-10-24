# rae-digital-platform

แพลตฟอร์มดิจิทัลของสำนักวิจัยและส่งเสริมวิชาการการเกษตร (RAE) — มหาวิทยาลัยแม่โจ้

## สถานะ

ยังไม่มีโค้ดแอปพลิเคชันโดยเจตนา — repo นี้ bootstrap สำหรับงานพัฒนาและ
automation เท่านั้น (README + .gitignore)

## กติกาการทำงาน

- เปลี่ยนโค้ดผ่าน branch → Pull Request → CI ผ่าน → **Prinya อนุมัติแล้วจึง merge**
- ไม่มี auto-merge และไม่มีการ deploy ขึ้น production อัตโนมัติ
- ไม่ commit ความลับ (key/token/รหัส) — เก็บในไฟล์สิทธิ์ 0600 บนโฮสต์เท่านั้น

## Nightly development

แผน: ทำงานอัตโนมัติช่วง 01:00 และสรุปรายงานทาง Telegram 07:00 (Asia/Bangkok)
— **ยังไม่เปิดใช้งาน** จนกว่าจะผ่าน security gate ครบ (branch protection,
required checks, Agent Core project enrollment)
