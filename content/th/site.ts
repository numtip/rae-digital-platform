// Thai source copy. Every Thai string on the public site comes from here — never
// from JSX (issue #17). Source of truth: design/stitch/stitch-landing-v2.reference.html
// and the RAE documents quoted in it. Do not add facts that are not in those.
export const th = {
  meta: {
    title: "สำนักวิจัยและบริการวิชาการ มหาวิทยาลัยแม่โจ้",
    description:
      "มุ่งมั่นด้านการวิจัย ส่งเสริมวิชาการ และบริการวิชาการด้านการเกษตร เพื่อพัฒนาเศรษฐกิจ สังคม และสิ่งแวดล้อมอย่างยั่งยืน",
  },
  a11y: {
    skipToContent: "ข้ามไปยังเนื้อหาหลัก",
  },
  breadcrumbLabel: "เส้นทางนำทาง",
  header: {
    staffLogin: "เข้าสู่ระบบสำหรับบุคลากร",
    orgShort: "RAE",
    orgFull: "สำนักวิจัยและบริการวิชาการ",
    orgUniversity: "มหาวิทยาลัยแม่โจ้",
    navLabel: "เมนูหลัก",
    navLabelMobile: "เมนูหลัก (มือถือ)",
    openMenu: "เปิดเมนูหลัก",
    searchPlaceholder: "ค้นหา...",
    searchLabel: "ค้นหา (ยังไม่เปิดใช้งาน)",
    notAvailable: "ยังไม่เปิดใช้งาน",
    languageLabel: "เปลี่ยนภาษา",
  },
  nav: {
    home: "หน้าหลัก",
    about: "เกี่ยวกับเรา",
    research: "วิจัยและนวัตกรรม",
    services: "บริการวิชาการ",
    documents: "เอกสารเผยแพร่",
    news: "ข่าวสารและกิจกรรม",
    contact: "ติดต่อเรา",
  },
  hero: {
    title: "สร้างองค์ความรู้ สู่นวัตกรรมเกษตร",
    titleAccent: "เพื่อชุมชน และสังคมที่ยั่งยืน",
    description:
      "มุ่งมั่นด้านการวิจัย ส่งเสริมวิชาการ และบริการวิชาการด้านการเกษตร เพื่อพัฒนาเศรษฐกิจ สังคม และสิ่งแวดล้อมอย่างยั่งยืน",
    primaryCta: "เกี่ยวกับเรา",
    secondaryCta: "บริการของเรา",
  },
  sections: {
    // Every item below is real and links to the page that explains it. The previous
    // version of this file carried mock copy from the Stitch reference (invented
    // service names, invented research project titles, invented news and four
    // sample statistics); those were removed on 2026-10-27 because a public site
    // must not present them as the office's own.
    services: {
      title: "บริการของเรา",
      subtitle: "ส่วนงานที่รับผิดชอบงานบริการวิชาการของสำนักฯ",
      more: "ดูหน้าบริการวิชาการ",
      items: [
        { title: "งานบริหารและประสานงานโครงการบริการวิชาการ" },
        { title: "งานปรับปรุงและขยายพันธุ์พืชและสัตว์" },
        { title: "งานสารสนเทศและเผยแพร่งานบริการวิชาการ" },
        { title: "งานสนับสนุนโครงการตามพระราชดำริและพัฒนาเชิงพื้นที่" },
      ],
    },
    research: {
      title: "งานวิจัยของสำนักฯ",
      subtitle: "หน่วยงานภายในที่ดูแลงานวิจัย และลิงก์ไปยังฐานข้อมูลงานวิจัยของมหาวิทยาลัย",
      more: "ดูหน้าด้านการวิจัย",
      items: [
        {
          title: "งานบริหารและส่งเสริมการวิจัย",
          description: "จัดทำและทบทวนยุทธศาสตร์ข้อบังคับ ระเบียบ ประกาศด้านการวิจัยของมหาวิทยาลัย",
        },
        {
          title: "งานบริหารเงินทุนวิจัย",
          description: "ประสานงานการจัดสรรงบประมาณโครงการที่สนองยุทธศาสตร์ด้านการวิจัยของมหาวิทยาลัย",
        },
        {
          title: "งานสารสนเทศและเผยแพร่งานวิจัย",
          description: "จัดทำและดูแลระบบฐานข้อมูลด้านการวิจัยของมหาวิทยาลัย",
        },
      ],
    },
    // Headlines for this band are taken from the real news archive at render time,
    // so they can never drift from /news/ again.
    news: {
      title: "ข่าวสารและกิจกรรม",
      subtitle: "ข่าวล่าสุดจากสำนักวิจัยและบริการวิชาการ",
      more: "ดูข่าวทั้งหมด",
      readLabel: "อ่านรายละเอียด",
    },
    resources: {
      title: "แหล่งข้อมูลและบริการด่วน",
      subtitle: "บริการและแหล่งข้อมูลที่ผู้มาติดต่อใช้บ่อย",
      items: [
        {
          title: "ฐานข้อมูลงานวิจัย",
          description: "สืบค้นงานวิจัยของมหาวิทยาลัยผ่านระบบ ERP",
          href: "https://erp.mju.ac.th/researchIndex.aspx",
          external: true,
        },
        {
          title: "เอกสารและแบบฟอร์ม",
          description: "ระเบียบ ประกาศ แบบฟอร์ม และคู่มือ แยกตามหมวดงาน",
          href: "/documents",
        },
        {
          title: "ข่าวสารและกิจกรรม",
          description: "ข่าวกิจกรรมและข่าวประชาสัมพันธ์ย้อนหลัง",
          href: "/news",
        },
        {
          title: "ค้นหาในเว็บไซต์",
          description: "ค้นข้อความในทุกหน้าของเว็บนี้",
          href: "/search",
        },
        {
          title: "ติดต่อสำนักฯ",
          description: "ที่อยู่ โทรศัพท์ และอีเมลทางการ",
          href: "/contact",
        },
      ],
    },
  },
  notFound: {
    title: "ไม่พบหน้าที่ต้องการ",
    body: "หน้าที่คุณเปิดอาจถูกย้ายหรือลบไปแล้ว",
    back: "กลับหน้าหลัก",
    search: "ค้นหาในเว็บไซต์",
  },
  footer: {
    contactLabel: "ติดต่อเรา",
    address: "63 หมู่ 4 ตำบลหนองหาร อำเภอสันทราย จังหวัดเชียงใหม่ 50290",
    phone: "0 5387 3400",
    email: "researchmju@mju.ac.th",
    rights: "สงวนลิขสิทธิ์",
  },
};

export type SiteContent = typeof th;
