// Central registry of public destinations transcribed from
// https://rae.mju.ac.th/wtms_index.aspx?lang=th-TH on 2026-10-26.
// Only HTTPS URLs that answered in that read-only check are published.
// Labels live in content/<locale>/directory.ts (keyed by id). Do not duplicate hrefs in JSX.
//
// The Organic Agriculture Centre tile is deliberately absent: its only published address
// (researchex.mju.ac.th/organicmju, still linked from the office's own index) answers 404 as of
// 2026-10-29. Restore the tile when the office publishes a working address.

export type LinkGroup = "systems" | "units" | "media" | "director" | "internal" | "knowledge" | "rooms" | "other";

export type RegistryLink = {
  id: string;
  href: string;
  group: LinkGroup;
  featured?: boolean;
  retrieved: "2026-10-26";
  source: "https://rae.mju.ac.th/wtms_index.aspx?lang=th-TH";
};

export const LINKS: RegistryLink[] = [
  { id: "face-scan", href: "https://researchex.mju.ac.th/fscan/index.php", group: "systems", featured: true, retrieved: "2026-10-26", source: "https://rae.mju.ac.th/wtms_index.aspx?lang=th-TH" },
  { id: "research-db", href: "https://erp.mju.ac.th/researchIndex.aspx", group: "systems", featured: true, retrieved: "2026-10-26", source: "https://rae.mju.ac.th/wtms_index.aspx?lang=th-TH" },
  { id: "service-projects", href: "https://erp.mju.ac.th/projectPlanLst2.aspx?sys=26", group: "systems", featured: true, retrieved: "2026-10-26", source: "https://rae.mju.ac.th/wtms_index.aspx?lang=th-TH" },
  { id: "knowledge-base", href: "https://kb.mju.ac.th/", group: "systems", featured: true, retrieved: "2026-10-26", source: "https://rae.mju.ac.th/wtms_index.aspx?lang=th-TH" },
  { id: "germplasm", href: "https://researchex.mju.ac.th/dbplant/", group: "systems", featured: true, retrieved: "2026-10-26", source: "https://rae.mju.ac.th/wtms_index.aspx?lang=th-TH" },
  { id: "meeting-rooms", href: "https://rae.mju.ac.th/wtms_webpageDetail.aspx?wID=914", group: "systems", featured: true, retrieved: "2026-10-26", source: "https://rae.mju.ac.th/wtms_index.aspx?lang=th-TH" },
  { id: "green-office", href: "https://goffice.mju.ac.th", group: "systems", featured: true, retrieved: "2026-10-26", source: "https://rae.mju.ac.th/wtms_index.aspx?lang=th-TH" },
  { id: "rspg", href: "https://rspg.mju.ac.th", group: "units", retrieved: "2026-10-26", source: "https://rae.mju.ac.th/wtms_index.aspx?lang=th-TH" },
  { id: "irb", href: "https://irb.mju.ac.th/", group: "units", retrieved: "2026-10-26", source: "https://rae.mju.ac.th/wtms_index.aspx?lang=th-TH" },
  { id: "royal", href: "https://royal.mju.ac.th/wtms_index.aspx?lang=th-TH", group: "units", retrieved: "2026-10-26", source: "https://rae.mju.ac.th/wtms_index.aspx?lang=th-TH" },
  { id: "clinic", href: "https://www.facebook.com/clinic.MJU2022/", group: "units", retrieved: "2026-10-26", source: "https://rae.mju.ac.th/wtms_index.aspx?lang=th-TH" },
  { id: "maejo-vision", href: "https://maejovision.mju.ac.th/?cat=197", group: "media", retrieved: "2026-10-26", source: "https://rae.mju.ac.th/wtms_index.aspx?lang=th-TH" },
  { id: "journal", href: "https://li01.tci-thaijo.org/index.php/MJUJN/index", group: "media", retrieved: "2026-10-26", source: "https://rae.mju.ac.th/wtms_index.aspx?lang=th-TH" },
  { id: "newsletter", href: "https://kb.mju.ac.th/newsletterIndex.aspx", group: "media", retrieved: "2026-10-26", source: "https://rae.mju.ac.th/wtms_index.aspx?lang=th-TH" },
  { id: "director-line", href: "https://forms.gle/H7zmvneQ1wX47WkT8", group: "director", retrieved: "2026-10-26", source: "https://rae.mju.ac.th/wtms_index.aspx?lang=th-TH" },
  { id: "mju", href: "https://www.mju.ac.th/", group: "other", retrieved: "2026-10-26", source: "https://rae.mju.ac.th/wtms_index.aspx?lang=th-TH" },
  { id: "rae-facebook", href: "https://www.facebook.com/raemju.fanpage/", group: "other", retrieved: "2026-10-26", source: "https://rae.mju.ac.th/wtms_index.aspx?lang=th-TH" },
];

export function linksByGroup(group: LinkGroup): RegistryLink[] {
  return LINKS.filter((link) => link.group === group);
}

// The Knowledge & Media page (M04) groups these two databases under its own heading.
// They keep their "systems" group so the systems grid on the homepage and /directory
// keeps listing them too.
export const KNOWLEDGE_DATABASE_IDS = ["knowledge-base", "germplasm"] as const;

export function linksByIds(ids: readonly string[]): RegistryLink[] {
  return ids
    .map((id) => LINKS.find((link) => link.id === id))
    .filter((link): link is RegistryLink => Boolean(link));
}

export function featuredSystems(): RegistryLink[] {
  return LINKS.filter((link) => link.featured);
}
