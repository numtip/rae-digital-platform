// English copy for /en/news/ — typed against content/th/news.ts.
//
// Headlines are translated. Article bodies are NOT: ADR-0005 says a missing
// translation must be explicit and never machine-guessed, so `body` is empty here
// and the detail page shows the Thai text as published, with `thaiOnly` above it.
import type { NewsContent } from "../th/news";

const item = (nid: string, title: string, alt: string) => ({
  nid,
  title,
  date: "6 October 2026",
  dateIso: "2026-10-06",
  type: "Activities",
  body: [] as string[],
  image: { src: `/images/news/${nid}.webp`, alt },
});

export const enNews: NewsContent = {
  meta: {
    title: "News and activities — The Office of Research and Academic Services",
    description:
      "Activity news, press releases and announcements from The Office of Research and Academic Services, Maejo University.",
  },
  hero: {
    title: "News and activities",
    lead: "Activity news, press releases and announcements from the office.",
  },
  snapshotNote: "List as of 25 October 2026 — new items always appear on the office website first.",
  labels: {
    read: "Read the story",
    published: "Published",
    type: "News type",
    back: "Back to all news",
    thaiOnly: "This story is published in Thai only; the Thai text is shown below as published.",
    imageAlt: "Photo from the news story",
  },
  categories: {
    title: "News categories on the office website",
    items: ["Activities", "Press releases", "Announcements", "Research news", "Executive news", "Job vacancies"],
  },
  officialLink: {
    label: "See all news on the office website",
    url: "https://rae.mju.ac.th/wtms_news.aspx?lang=en-US",
  },
  source: {
    label: "Source",
    url: "https://rae.mju.ac.th/wtms_news.aspx?lang=th-TH",
    retrieved: "Retrieved 25 October 2026",
  },
  items: [
    item(
      "38764",
      "Welcoming students of the Faculty of Agricultural Production to learn organic plant standards and quality control",
      "Students attending the organic plant quality training",
    ),
    item(
      "38763",
      "Executives and staff joined the flag-raising and national-anthem activity",
      "Executives and staff at the flag-raising activity",
    ),
    item("38760", "Selecting Fundamental Fund research with commercial potential", "The Fundamental Fund selection activity"),
    item("38759", "Welcoming an AI Smart Farming expert delegation from Taiwan", "The delegation from Taiwan in the meeting room"),
    item("38758", "Retirement tribute ceremony for office staff, 2026", "The retirement tribute ceremony for office staff"),
    item(
      "38757",
      "MoU signing with Silver Zilla (Thailand) Co., Ltd. to upgrade the passion-fruit industry",
      "The memorandum of understanding signing ceremony",
    ),
    item(
      "38756",
      "Welcoming internal auditors and receiving recommendations on service and research projects",
      "The internal audit meeting",
    ),
    item(
      "38755",
      "Joining the sign-unveiling of the integrated forest management station",
      "The sign-unveiling of the integrated forest management station",
    ),
    item("38754", "Joining the Senate academic capacity-building and network project", "The Senate academic network project"),
    item("38753", "Joining Maejo University's 2026 retirement tribute ceremony", "Maejo University's retirement tribute ceremony"),
    item("38752", "Training on the ethics of animal use in science", "The animal-ethics training session"),
    item("38751", "Welcoming a Senate delegation studying research and innovation", "The Senate delegation visiting the research centre"),
  ],
};
