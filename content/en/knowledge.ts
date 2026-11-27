// English copy for /en/knowledge/ — typed against content/th/knowledge.ts, so a missing
// or extra key fails `npm run typecheck`. Link labels are the names the university
// systems use; where only a Thai name exists it is transliterated, never invented.
import type { KnowledgeContent } from "../th/knowledge";

export const enKnowledge: KnowledgeContent = {
  meta: {
    title: "Knowledge and media — The Office of Research and Academic Services",
    description:
      "Knowledge databases, the plant and animal germplasm database, Maejo Vision, the research journal and the newsletter published by the office.",
  },
  hero: {
    title: "Knowledge and media",
    lead: "The office's research sources and media, all reachable — every destination lives on a university system and was checked on 26 October 2026",
  },
  databases: {
    title: "Knowledge databases",
    subtitle: "Databases you can search straight away on university systems",
  },
  media: {
    title: "Media and newsletter",
    subtitle: "The online journal, Maejo Vision and the newsletter that are still published",
  },
  gap: "Individual knowledge articles and the E-book library have no text the office has approved for publication, so this page lists only the sources that can be checked — no article titles are invented",
  note: "Every link opens a university system directly; nothing is copied onto this site",
  relatedLabel: "Documents and forms",
  source: {
    label: "Source",
    url: "https://rae.mju.ac.th/wtms_index.aspx?lang=th-TH",
    retrieved: "Retrieved 26 October 2026",
  },
  labels: {
    "knowledge-base": "Knowledge base",
    germplasm: "Plant and animal germplasm database",
    "maejo-vision": "Maejo Vision online",
    journal: "Journal of Agricultural Research and Extension",
    newsletter: "Research and academic services newsletter",
  },
};
