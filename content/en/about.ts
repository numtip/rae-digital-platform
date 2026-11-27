// English copy for /en/about/ — a faithful translation of content/th/about.ts,
// which is the source of truth. No new facts are introduced here; numbers,
// dates, names and the address/phone/e-mail values are carried over unchanged.
import type { AboutContent } from "../th/about";

export const enAbout: AboutContent = {
  meta: {
    title: "About us — The Office of Research and Academic Services",
    description:
      "History, philosophy, vision, mission and contact details of The Office of Research and Academic Services, Maejo University.",
  },
  hero: {
    title: "About us",
    lead: "A faculty-equivalent office committed to research and academic services for society, built on an agricultural foundation and aiming at international standing.",
  },
  philosophy: {
    title: "Philosophy",
    text: "To develop and administer research and academic services for society, with agriculture as the foundation.",
  },
  vision: {
    title: "Vision",
    text: "To be the centre for the administration of research and academic services that drives the university to international standing.",
  },
  mission: {
    title: "Mission",
    items: [
      "Build and develop the research and academic-service administration system.",
      "Develop the capacity and potential of researchers and academic-service staff.",
      "Apply knowledge to solve problems, develop communities and generate income.",
    ],
  },
  history: {
    title: "History",
    items: [
      {
        year: "1975",
        title: "The office is founded",
        text: "Founded together with the Faculty of Agricultural Production and the Faculty of Business Administration in Agriculture, with three divisions: research, training and agricultural extension.",
      },
      {
        year: "1979",
        title: "Plant and animal propagation division established",
        text: "Responsible for producing and propagating plants and animals as a service to the community.",
      },
      {
        year: "1980",
        title: "Highland agriculture development division established",
        text: "Responsible for academic services to highland farmers in support of royal-initiated projects.",
      },
      {
        year: "2000",
        title: "Responsibility for the International Study and Training Centre",
        text: "Assigned by the university to manage the International Study and Training Centre.",
      },
      {
        year: "2014",
        title: "Organic agriculture strategy",
        text: "The university designated royal-initiated projects as a core strategy, aiming to become an Organic University.",
      },
      {
        year: "2019",
        title: "Organisational restructuring",
        text: "Divided into three divisions: the office administration division, the research administration division and the academic-service administration division.",
      },
    ],
  },
  // The three divisions are the names published in the 2562 history entry; no duties are
  // added because the office publishes none per division.
  structure: {
    title: "Organisation structure",
    lead: "Since 2019 the office has been administered as three divisions",
    items: [
      { title: "Office of the RAE director (กองบริหารงานสำนักวิจัยฯ)" },
      { title: "Research administration division (กองบริหารงานวิจัย)" },
      { title: "Academic services administration division (กองบริหารงานบริการวิชาการ)" },
    ],
    note: "The three division names are taken from the history text on the office website; this page does not list each division's duties, because the office has not published them as a list",
  },
  contact: {
    title: "Address and contact",
    addressLabel: "Address",
    addressLines: [
      "3rd floor, Chalerm Phrakiat Somdet Phra Thep Rattana Ratchasuda Building",
      "63 Moo 4, Nong Han, San Sai, Chiang Mai 50290, Thailand",
    ],
    phoneLabel: "Phone",
    phone: "(+66) 0 5387 3400",
    emailLabel: "E-mail",
    // Owner decision (2026-10-26): this is the official contact address. The office also
    // publishes raemju@gmail.com (Facebook) and rae@mju.ac.th (older material); neither is
    // the official contact, so the site shows one address rather than three.
    emails: ["researchmju@mju.ac.th"],
  },
  images: {
    building: {
      alt: "Office building of The Office of Research and Academic Services, Maejo University",
    },
    annex: {
      alt: "Second office building of The Office of Research and Academic Services",
    },
    logo: {
      // Maejo University's seal as the office uses it — not a bespoke office mark, so the
      // alternative text names what the image actually is.
      alt: "Seal of Maejo University",
    },
  },
  source: {
    label: "Source",
    url: "https://rae.mju.ac.th/wtms_about.aspx?lang=th-TH",
    retrieved: "Retrieved 25 October 2026",
  },
};
