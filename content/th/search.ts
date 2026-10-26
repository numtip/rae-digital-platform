// Thai copy for /th/search/.
export const thSearch = {
  meta: {
    title: "ค้นหา — สำนักวิจัยและบริการวิชาการ",
    description: "ค้นหาข้อความในหน้าต่าง ๆ ของเว็บสำนักวิจัยและบริการวิชาการ",
  },
  hero: {
    title: "ค้นหา",
    lead: "ค้นหาข้อความในทุกหน้าของเว็บนี้ — ข้อมูลจากหน้าเว็บทางการของหน่วยงาน",
  },
  labels: {
    input: "คำที่ต้องการค้นหา",
    placeholder: "พิมพ์คำ เช่น วิจัย, แบบฟอร์ม, ข่าว",
    hint: "ค้นหาจากข้อความในหน้านี้เท่านั้น ไม่ได้ค้นในระบบของมหาวิทยาลัย",
    results: "ผลการค้นหา",
    // "{n}" is replaced by the component; a function cannot be passed to a
    // client component from a server component.
    countTemplate: "พบ {n} รายการ",
    countTemplateOne: "พบ {n} รายการ",
    noResults: "ไม่พบข้อความที่ตรงกับคำนี้ ลองใช้คำสั้นลง",
    empty: "พิมพ์คำเพื่อเริ่มค้นหา",

    kindPage: "หน้าเว็บ",
    kindItem: "เนื้อหาในหน้า",
    filterLabel: "กรองตามหมวด",
    showAll: "แสดงทุกหมวด",
    hiddenByFilter: "มีอีก {n} รายการที่ตรงกับคำนี้แต่ถูกซ่อนด้วยตัวกรองหมวด",
    categories: {
      all: "ทั้งหมด",
      home: "หน้าหลัก",
      about: "เกี่ยวกับเรา",
      research: "วิจัยและนวัตกรรม",
      services: "บริการวิชาการ",
      documents: "เอกสารเผยแพร่",
      news: "ข่าวสารและกิจกรรม",
      contact: "ติดต่อเรา",
      search: "ค้นหา",
    },
  },
};

export type SearchContent = typeof thSearch;
