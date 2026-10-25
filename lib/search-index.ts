import {
  getAbout,
  getContent,
  getDocuments,
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
    join(site.hero.titleAccent, site.hero.description, site.sections.services.items.map((i) => `${i.title} ${i.description}`)),
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
  documents.groups.forEach((group) => {
    item(
      `${base}/documents`,
      group.title,
      join(group.links.map((link) => link.label)),
    );
  });

  const news = getNews(locale);
  page(`${base}/news`, news.hero.title, join(news.hero.lead, news.snapshotNote, news.categories.items));
  const thaiNews = new Map(getNews("th").items.map((entry) => [entry.nid, entry.title]));
  news.items.forEach((entry) =>
    item(`${base}/news/${entry.nid}`, entry.title || thaiNews.get(entry.nid) || entry.nid, join(entry.date, entry.type, entry.body)),
  );

  return entries;
}
