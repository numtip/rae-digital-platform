// English copy for /en/news/ — typed against content/th/news.ts.
//
// Headlines of the 12 newest stories are translated. The rest keep an empty title
// on purpose: ADR-0005 says a missing translation is explicit and never
// machine-guessed, so those items show the Thai headline with a stated notice, and
// article bodies are always the Thai text as published.
import { thNews, type NewsContent } from "../th/news";

// Whether a story has a photo is recorded once, in the Thai source of truth. Deriving
// it here keeps the two locales from disagreeing — four items have no photo, and the
// English pages used to point at files that were never downloaded.

const HAS_PHOTO = new Set(thNews.items.filter((entry) => entry.image).map((entry) => entry.nid));

const item = (nid: string, dateIso: string, title: string) => ({
  nid,
  title,
  date: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(dateIso)),
  dateIso,
  type: "Activities",
  body: [] as string[],
  image: HAS_PHOTO.has(nid) ? { src: `/images/news/${nid}.webp`, alt: "" } : null,
});

export const enNews: NewsContent = {
  meta: {
    title: "News and activities — The Office of Research and Academic Services",
    description:
      "Activity news, press releases and announcements from The Office of Research and Academic Services, Maejo University.",
  },
  hero: {
    title: "News and activities",
    lead: "Activity news, press releases and announcements from the office, newest first.",
  },
  // Count comes from the entries the index actually lists (see content/th/news.ts).
  snapshotNote: (count: number) =>
    `${count} items from 2026-07-13 to 2026-10-06, newest first — new items always appear on the office website first.`,
  labels: {
    read: "Read the story",
    published: "Published",
    type: "News type",
    back: "Back to all news",
    thaiOnly: "This story is published in Thai only; the Thai text is shown below as published.",
    headlineThaiOnly: "Headline shown in Thai — an English translation is not available yet.",
    imageAlt: "Photo from the news story",
    prevNewer: "Newer story",
    nextOlder: "Older story",
    noOlder: "This is the oldest story in the archive",
    noNewer: "This is the newest story",
    navLabel: "Article navigation",
    gallery: "Photos from this story",
    eventsLink: "See all events",
  },
  pagination: {
    label: "Pagination",
    previous: "Previous",
    next: "Next",
    page: (page: number, total: number) => `Page ${page} of ${total}`,
  },
  categories: {
    title: "News categories on the office website",
    items: ["Activities", "Press releases", "Announcements", "Research news", "Executive news", "Job vacancies"],
  },
  officialLink: {
    label: "See all news on the office website",
    url: "https://rae.mju.ac.th/wtms_news.aspx?lang=en-US",
  },
  // Activity-only list. Nothing on the office site announces a future date, so the
  // upcoming section is omitted rather than invented.
  events: {
    meta: {
      title: "Events — The Office of Research and Academic Services",
      description:
        "Activities the office has already published on its own website, newest first",
    },
    hero: {
      title: "Office events",
      lead: "Only activities already published by the office, newest first",
    },
    snapshotNote:
      "Counts only stories the office tags as activity news, so the list carries no forward schedule and no \"upcoming events\" section until the office announces real dates",
    upcomingTitle: "Upcoming events",
    pastTitle: "Past events",
    empty: "No published events yet",
    backToNews: "Back to news and activities",
  },
  source: {
    label: "Source",
    url: "https://rae.mju.ac.th/wtms_news.aspx?lang=th-TH",
    retrieved: "Retrieved 25 October 2026",
  },
  items: [
    item("38764", "2026-10-06", "Welcoming students of the Faculty of Agricultural Production to learn organic plant standards and quality control"),
    item("38763", "2026-10-06", "Executives and staff joined the flag-raising and national-anthem activity"),
    item("38760", "2026-10-06", "Selecting Fundamental Fund research with commercial potential"),
    item("38759", "2026-10-06", "Welcoming an AI Smart Farming expert delegation from Taiwan"),
    item("38758", "2026-10-06", "Retirement tribute ceremony for office staff, 2026"),
    item("38757", "2026-10-06", "MoU signing with Silver Zilla (Thailand) Co., Ltd. to upgrade the passion-fruit industry"),
    item("38756", "2026-10-06", "Welcoming internal auditors and receiving recommendations on service and research projects"),
    item("38755", "2026-10-06", "Joining the sign-unveiling of the integrated forest management station"),
    item("38754", "2026-10-06", "Joining the Senate academic capacity-building and network project"),
    item("38753", "2026-10-06", "Joining Maejo University's 2026 retirement tribute ceremony"),
    item("38752", "2026-10-06", "Training on the ethics of animal use in science"),
    item("38751", "2026-10-06", "Welcoming a Senate delegation studying research and innovation"),
    item("38750", "2026-10-06", "Presenting the draft outcome and impact assessment report of the Fundamental Fund budget"),
    item("38749", "2026-10-06", "Academic cooperation agreement signing ceremony with EnerGrow (Thailand) Co., Ltd."),
    item("38748", "2026-10-06", "Welcoming students from Songkhla and Yala Rajabhat Universities to learn about air-purifying plants and seedling production"),
    item("38747", "2026-10-06", "Welcoming students from Songkhla and Yala Rajabhat Universities to learn organic fertiliser and organic animal feed production"),
    item("38746", "2026-10-06", "Welcoming students from Songkhla and Yala Rajabhat Universities to learn New Theory Agriculture and the sufficiency economy approach"),
    item("38745", "2026-10-06", "Welcoming the Faculty of Veterinary Medicine on a study visit to the Green Office"),
    item("38744", "2026-10-06", "Joining the welcome and progress meeting for the Nong Hoi and Mae Sa Mai Royal Project development centres"),
    item("38743", "2026-10-06", "Exhibition booths from partner organisations at the Senate Forum 2026"),
    item("38742", "2026-10-06", "Joining the Senate Forum 2026 — connecting research and innovation to use and policy (9 September)"),
    item("38741", "2026-10-06", "Joining the Senate Forum 2026 — connecting research and innovation to use and policy (8 September)"),
    item("38740", "2026-10-06", "The Senate President visits the office's exhibition booth at the Senate Forum 2026"),
    item("38736", "2026-10-06", "Presenting certificates of honour to researchers who won national and international awards"),
    item("38735", "2026-10-06", "Organising committee meeting for the 8th International Symposium on Lychee, Longan and other Sapindaceae"),
    item("38733", "2026-10-06", "Discussion on research funding and cooperation with the Highland Research and Development Institute (HRDI)"),
    item("38732", "2026-10-06", "The office's exhibition booth at the regional National Science Week"),
    item("38731", "2026-10-06", "Joining the wreath-laying tribute to the Father of Thai Science and the opening of National Science Week"),
    item("38730", "2026-10-06", "The Chairman of the Maejo University Council visits the office's booth at National Science Week"),
    item("38729", "2026-10-06", "Presenting sundew tissue-culture work at National Science Week"),
    item("38728", "2026-10-06", "Knowledge-sharing on applying for human-research ethics certification under the new SOPs"),
    item("38727", "2026-10-06", "Staff engagement activity (executives meet staff)"),
    item("38726", "2026-10-06", "The Buppha Ladaphon exhibition: carrying the royal initiative into Thai orchid conservation"),
    item("38587", "2026-09-21", "Announcement of procurement winners, quarter 3 (April–June 2026)"),
    item("38586", "2026-09-21", "Announcement of procurement winners, quarter 2 (January–March 2026)"),
    item("38585", "2026-09-21", "Announcement of procurement winners, quarter 1 (October–December 2025)"),
    item("38541", "2026-09-15", "Auction of vehicle and transport assets"),
    item("38207", "2026-08-17", "MAEJO PGS training programme (2nd cohort)"),
    item("38206", "2026-08-17", "Maejo–Kasetsart discussion to strengthen academic and research networks"),
    item("38205", "2026-08-17", "Meeting on plant research at the Sa Ngo Royal Project development centre, Chiang Rai"),
    item("38204", "2026-08-17", "Training on unlocking Generative AI to improve research proposals"),
    item("38203", "2026-08-17", "Executives meet staff at the New Theory Agriculture demonstration plot"),
    item("38202", "2026-08-17", "Ceremony honouring His Majesty King Maha Vajiralongkorn"),
    item("38201", "2026-08-17", "Welcoming researchers from the Institute of Tropical Plant Sciences, Yunnan Province"),
    item("38200", "2026-08-17", "Welcoming a study visit to the hemp research and development centre"),
    item("38199", "2026-08-17", "Green Office activity: making compost from organic waste"),
    item("38198", "2026-08-17", "Executives meet staff, 3rd floor, Somdet Phra Theprattana Rachasuda Building"),
    item("38197", "2026-08-17", "Audit of the management of the Fundamental Fund budget for university researchers"),
    item("38196", "2026-08-17", "Training on writing an Impact Pathway and setting financial proxies"),
    item("38195", "2026-08-17", "Thai–Chinese cooperation on research and innovation development to raise research to the international level"),
    item("37916", "2026-07-13", "The Office of the Narcotics Control Board follows up the project developing a psychoactive mushroom production system for medical use"),
    item("37915", "2026-07-13", "Progress meeting with the Program Management Unit for Competitiveness (PMUC)"),
    item("37914", "2026-07-13", "Meeting to establish the Maejo University organic farming area group (PGS)"),
    item("37913", "2026-07-13", "Knowledge-sharing on improving routine work with Google AppSheet"),
    item("37912", "2026-07-13", "Research exchange with MSP Interfoods Co., Ltd. (Moo Inter)"),
    item("37911", "2026-07-13", "Merit-making and alms-offering dedicated to Her Royal Highness Princess Bajrakitiyabha"),
    item("37910", "2026-07-13", "Honourable mention at Thailand Research Expo 2026"),
    item("37909", "2026-07-13", "Thailand Research Expo 2026"),
  ],
};
