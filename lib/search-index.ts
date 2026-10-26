import {
  getAbout,
  getContent,
  getDirectory,
  getDocuments,
  getKnowledge,
  getNews,
  getResearch,
  getServices,
  type Locale,
} from "@/lib/i18n";

// One flat, serialisable index over the copy that already exists in
// content/<locale>/*. Nothing is fetched and nothing is invented: if a page has
// no text, it contributes no entry. Built at build time and handed to the client
// search component, so searching works on a static export with no backend.

export type SearchEntry = {
  title: string;
  text: string;
  href: string;
  kind: "page" | "item";
};

// The category of an entry is read off its own URL rather than stored again on every
// entry, so the index and the navigation can never disagree about where a page lives.
const SECTIONS = [
  "home",
  "about",
  "research",
  "services",
  "documents",
  "knowledge",
  "news",
  "contact",
  "search",
  "directory",
] as const;

export type SearchSection = (typeof SECTIONS)[number];

export function sectionOf(href: string): SearchSection {
  const name = href.split("/").filter(Boolean)[1];
  return (SECTIONS as readonly string[]).includes(name) ? (name as SearchSection) : "home";
}

const join = (...parts: (string | string[] | undefined)[]) =>
  parts.flat().filter(Boolean).join(" · ");

export function buildSearchIndex(locale: Locale): SearchEntry[] {
  const base = `/${locale}`;
  const entries: SearchEntry[] = [];
  const page = (href: string, title: string, text: string) =>
    entries.push({ title, text, href, kind: "page" });
  const item = (href: string, title: string, text: string) =>
    entries.push({ title, text, href, kind: "item" });

  const site = getContent(locale);
  page(
    `${base}/`,
    site.hero.title,
    join(
      site.hero.titleAccent,
      site.hero.description,
      site.sections.services.items.map((i) => i.title),
      site.sections.research.items.map((i) => `${i.title} ${i.description}`),
      site.sections.resources.items.map((i) => `${i.title} ${i.description}`),
    ),
  );

  const directory = getDirectory(locale);
  page(
    `${base}/directory`,
    directory.hero.title,
    join(directory.hero.lead, Object.values(directory.labels)),
  );

  const about = getAbout(locale);
  page(
    `${base}/about`,
    about.hero.title,
    join(
      about.hero.lead,
      about.philosophy.text,
      about.vision.text,
      about.mission.items,
      about.history.items.map((h) => `${h.year} ${h.title} ${h.text}`),
      about.contact.addressLines,
    ),
  );

  const research = getResearch(locale);
  page(`${base}/research`, research.hero.title, join(research.hero.lead, research.intro.text));
  research.units.forEach((unit) => item(`${base}/research`, unit.title, join(unit.items)));

  const services = getServices(locale);
  page(
    `${base}/services`,
    services.hero.title,
    join(services.hero.lead, services.mission.text, services.contact.unit, services.contact.works, services.contact.phone),
  );
  item(`${base}/services`, services.units.title, join(services.units.items));

  const documents = getDocuments(locale);
  page(`${base}/documents`, documents.hero.title, join(documents.hero.lead, documents.note));
  documents.groups.forEach((group) =>
    page(`${base}/documents/category/${group.slug}`, group.title, join(group.links.map((link) => link.label))),
  );
  documents.groups.forEach((group) => {
    item(
      `${base}/documents`,
      group.title,
      join(group.links.map((link) => link.label)),
    );
  });

  const knowledge = getKnowledge(locale);
  page(
    `${base}/knowledge`,
    knowledge.hero.title,
    join(knowledge.hero.lead, knowledge.databases.title, knowledge.media.title, Object.values(knowledge.labels)),
  );

  const news = getNews(locale);
  page(`${base}/news`, news.hero.title, join(news.hero.lead, news.snapshotNote, news.categories.items));
  page(`${base}/news/events`, news.events.hero.title, join(news.events.hero.lead, news.events.snapshotNote));
  const thaiNews = new Map(getNews("th").items.map((entry) => [entry.nid, entry.title]));
  news.items.forEach((entry) =>
    item(`${base}/news/${entry.nid}`, entry.title || thaiNews.get(entry.nid) || entry.nid, join(entry.date, entry.type, entry.body)),
  );

  page(
    `${base}/contact`,
    site.nav.contact,
    join(about.contact.title, about.contact.addressLines, about.contact.phone, about.contact.emails),
  );

  return entries;
}
