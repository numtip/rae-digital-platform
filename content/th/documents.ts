// Thai source for /th/documents/. Categories and link labels transcribed from
// the official page "ดาวน์โหลดแบบฟอร์มและเอกสาร"
// https://rae.mju.ac.th/wtms_webpageDetail.aspx?wID=1909 (retrieved 2026-10-25).
// The files themselves stay on the office's own systems — we link, never mirror.
export const thDocuments = {
  meta: {
    title: "เอกสารและแบบฟอร์มดาวน์โหลด — สำนักวิจัยและบริการวิชาการ",
    description:
      "รวมหมวดเอกสาร แบบฟอร์ม และระเบียบที่เกี่ยวข้องกับงานบริหาร งานวิจัย และงานบริการวิชาการ",
  },
  hero: {
    title: "เอกสารและแบบฟอร์มดาวน์โหลด",
    lead: "เอกสารและแบบฟอร์มแยกตามหมวดการใช้งาน เลือกหมวดเพื่อเปิดรายการจากระบบของมหาวิทยาลัย",
  },
  groups: [
    {
      title: "บริหารจัดการ",
      links: [
        { label: "งานบริหารและธุรการ", url: "https://rae.mju.ac.th/wtms_webpageDetail.aspx?wID=1920" },
        { label: "งานคลังและพัสดุ", url: "https://rae.mju.ac.th/wtms_webpageDetail.aspx?wID=1921" },
        { label: "งานนโยบาย แผนและประกันคุณภาพ", url: "https://rae.mju.ac.th/wtms_webpageDetail.aspx?wID=2076" },
        { label: "คู่มือปฏิบัติงาน", url: "https://researchex.mju.ac.th/handbook2/" },
      ],
    },
    {
      title: "งานวิจัย",
      links: [
        {
          label: "ระเบียบ / ประกาศ / ทุนวิจัย / แบบฟอร์ม / มาตรฐานการวิจัย",
          url: "https://rae.mju.ac.th/wtms_webpageDetail.aspx?wID=2064",
        },
      ],
    },
    {
      title: "งานบริการวิชาการ",
      links: [
        { label: "คู่มือ", url: "https://rae.mju.ac.th/wtms_webpageDetail.aspx?wID=1925" },
        { label: "แบบฟอร์มศูนย์ความเป็นเลิศ", url: "https://rae.mju.ac.th/wtms_webpageDetail.aspx?wID=2605" },
        { label: "แบบฟอร์มงานบริการวิชาการ", url: "https://rae.mju.ac.th/wtms_webpageAdminDetail.aspx?wID=2660" },
        { label: "แบบฟอร์มแหล่งทุนภายนอก", url: "https://rae.mju.ac.th/wtms_webpageDetail.aspx?wID=1930" },
        { label: "แบบฟอร์มงานคลินิคเทคโนโลยี", url: "https://rae.mju.ac.th/wtms_webpageDetail.aspx?wID=1931" },
      ],
    },
  ],
  note: "ไฟล์เอกสารอยู่บนระบบของมหาวิทยาลัย (rae.mju.ac.th / erp.mju.ac.th / researchex.mju.ac.th) — หน้านี้ลิงก์ไปที่ต้นทางโดยตรง ไม่ได้สำเนาไฟล์มาเก็บ",
  source: {
    label: "ที่มาของข้อมูล",
    url: "https://rae.mju.ac.th/wtms_webpageDetail.aspx?wID=1909",
    retrieved: "ดึงข้อมูลเมื่อ 25 ตุลาคม 2569",
  },
};

export type DocumentsContent = typeof thDocuments;
