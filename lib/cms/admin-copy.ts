export const adminCopy = {
  th: {
    title: "แผงจัดการเนื้อหา",
    lead: "รันไทม์นี้ยังไม่เชื่อมฐานข้อมูล ฟอร์มด้านล่างตรวจความถูกต้องในเบราว์เซอร์เท่านั้น และไม่ได้บันทึกหรือเผยแพร่ข่าว",
    news: "ข่าว",
    titleTh: "หัวข้อภาษาไทย",
    titleEn: "หัวข้อภาษาอังกฤษ",
    source: "แหล่งอ้างอิง",
    check: "ตรวจความถูกต้อง",
    ok: "ผ่านการตรวจ และยังไม่ได้เผยแพร่",
    empty: "ยังไม่มีรายการที่บันทึก",
  },
  en: {
    title: "Content desk",
    lead: "This runtime is not connected to a database. The form only checks the browser and does not save or publish news.",
    news: "News",
    titleTh: "Thai title",
    titleEn: "English title",
    source: "Source",
    check: "Check",
    ok: "Valid, and not published",
    empty: "Nothing is stored",
  },
} as const;
