// Thai source for /th/knowledge/ (Knowledge & Media, M04).
//
// Every destination below comes from the central registry content/links.ts, which was
// transcribed from https://rae.mju.ac.th/wtms_index.aspx?lang=th-TH on 2026-10-26 and
// only kept HTTPS URLs that answered in that read-only check. Nothing is mirrored.
//
// There is no approved article copy: the office publishes knowledge articles on its own
// systems (kb.mju.ac.th and the germplasm database) and no list of articles with titles
// and dates exists on the public site. The page therefore states that gap instead of
// inventing article text — same rule as TODO(translate).
export const thKnowledge = {
  meta: {
    title: "องค์ความรู้และสื่อ — สำนักวิจัยและบริการวิชาการ",
    description:
      "ฐานข้อมูลองค์ความรู้ ฐานข้อมูลพันธุ์พืชพันธุ์สัตว์ แม่โจ้ปริทัศน์ วารสาร และจดหมายข่าว ที่สำนักวิจัยและบริการวิชาการเผยแพร่",
  },
  hero: {
    title: "องค์ความรู้และสื่อ",
    lead: "แหล่งค้นคว้าและสื่อของสำนักฯ ที่เปิดให้เข้าถึงได้จริง — ทุกปลายทางอยู่บนระบบของมหาวิทยาลัย ตรวจสอบได้เมื่อวันที่ 26 ตุลาคม 2569",
  },
  databases: {
    title: "ฐานข้อมูลองค์ความรู้",
    subtitle: "ฐานข้อมูลที่ค้นต่อได้ทันทีจากระบบของมหาวิทยาลัย",
  },
  media: {
    title: "สื่อและจดหมายข่าว",
    subtitle: "วารสารออนไลน์ แม่โจ้ปริทัศน์ และจดหมายข่าวที่ยังเปิดอยู่",
  },
  gap: "บทความองค์ความรู้รายเรื่องและคลัง E-book ยังไม่มีข้อความที่หน่วยงานอนุมัติให้เผยแพร่ หน้านี้จึงรวมเฉพาะแหล่งค้นคว้าที่ตรวจสอบได้ ไม่ได้แต่งหัวข้อบทความขึ้นเอง",
  note: "ลิงก์ทั้งหมดเปิดระบบของมหาวิทยาลัยโดยตรง หน้านี้ไม่ได้สำเนาเนื้อหามาเก็บ",
  relatedLabel: "เอกสารและแบบฟอร์มดาวน์โหลด",
  source: {
    label: "ที่มาของข้อมูล",
    url: "https://rae.mju.ac.th/wtms_index.aspx?lang=th-TH",
    retrieved: "ดึงข้อมูลเมื่อ 26 ตุลาคม 2569",
  },
  labels: {
    "knowledge-base": "ฐานข้อมูลองค์ความรู้",
    germplasm: "ฐานข้อมูลพันธุ์พืชพันธุ์สัตว์",
    "maejo-vision": "แม่โจ้ปริทัศน์ ออนไลน์",
    journal: "วารสารวิจัยและส่งเสริมวิชาการเกษตร",
    newsletter: "จดหมายข่าววิจัยและบริการวิชาการ",
  },
};

export type KnowledgeContent = typeof thKnowledge;
